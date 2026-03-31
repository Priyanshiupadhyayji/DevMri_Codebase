import { NextRequest, NextResponse } from 'next/server';
import { createOctokit } from '@/lib/tokens';

// ═══════════════════════════════════════════════════════════════
// TEAM X-RAY — Who Works on What?
// Maps contributors to codebase domains using git commit history
// ═══════════════════════════════════════════════════════════════

interface DomainRule {
  name: string;
  icon: string;
  color: string;
  patterns: RegExp[];
}

const DOMAINS: DomainRule[] = [
  {
    name: 'Frontend',
    icon: '🎨',
    color: '#00e5ff',
    patterns: [
      /^(src|packages|apps)\/.*(components|pages|app|views|layouts|hooks|contexts?)/i,
      /\.(tsx|jsx|vue|svelte|html)$/i,
      /\.(css|scss|sass|less|styled)$/i,
      /^(public|static|assets|styles|css)\//i,
      /tailwind|postcss|vite\.config|next\.config/i,
    ],
  },
  {
    name: 'Core Engine',
    icon: '📦',
    color: '#8c9eff',
    patterns: [
      /^(src|packages)\/(core|kernel|engine|reconciler|compiler|scheduler|runtime)/i,
      /^(core|lib|shared|packages)\/.*(internal|base|primitives)/i,
      /index\.(ts|js|go)$/i,
    ],
  },
  {
    name: 'Backend',
    icon: '⚙️',
    color: '#00e676',
    patterns: [
      /^(src|packages|apps|server|api|backend)\/.*(api|server|routes|controllers|services|middleware|db|database)/i,
      /^app\/api\//i,
      /\.(go|rs|py|rb|java|kt|scala|sqlite|sql)$/i,
      /prisma|drizzle|sequelize|typeorm|mongodb|redis|graphql/i,
      /^(models|schemas|entities|migrations)\//i,
    ],
  },
  {
    name: 'Infrastructure',
    icon: '🏗️',
    color: '#b388ff',
    patterns: [
      /^\.github\//i,
      /^(\.circleci|\.gitlab-ci|jenkins|\.buildkite|github-actions)\//i,
      /dockerfile|docker-compose|\.dockerignore/i,
      /^(terraform|pulumi|cdk|cloudformation|k8s|kubernetes|helm|deploy|infra|infrastructure|devops|ops)\//i,
      /vercel\.json|netlify\.toml|fly\.toml|render\.yaml|docker/i,
      /^\.env/i,
    ],
  },
  {
    name: 'Testing',
    icon: '🧪',
    color: '#ffab00',
    patterns: [
      /^(tests?|__tests__|spec|e2e|cypress|playwright|fixtures|mocks|stubs|factories)\//i,
      /^(packages|src)\/.*(test|spec|e2e|mock)/i,
      /\.(test|spec|e2e)\.(ts|tsx|js|jsx|py|rb|go)$/i,
      /jest\.config|vitest\.config|pytest|cypress\.config|karma|mocha/i,
    ],
  },
  {
    name: 'Documentation',
    icon: '📝',
    color: '#ff6d00',
    patterns: [
      /^(docs?|documentation|wiki|examples|tutorials|guides)\//i,
      /\.(md|mdx|rst|adoc|txt)$/i,
      /readme|changelog|contributing|license|code.of.conduct/i,
      /yarn\.lock|package-lock\.json|pnpm-lock\.yaml/i,
    ],
  },
  {
    name: 'Config / Tooling',
    icon: '🔧',
    color: '#8899aa',
    patterns: [
      /^(scripts|tools|bin|tasks|hooks)\//i,
      /^package\.json$/i,
      /^tsconfig|jsconfig/i,
      /eslint|prettier|editorconfig|babel|swc|husky/i,
      /webpack|rollup|esbuild|gulp|grunt|makefile/i,
    ],
  },
];

function classifyFile(filePath: string): string {
  for (const domain of DOMAINS) {
    if (domain.patterns.some(p => p.test(filePath))) {
      return domain.name;
    }
  }
  return 'Other';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get('repo');

  if (!repo || !repo.includes('/')) {
    return NextResponse.json({ error: 'Missing repo param (owner/repo)' }, { status: 400 });
  }

  const [owner, repoName] = repo.split('/');
  const octokit = createOctokit();

  try {
    // ─── 1. Build Contributor Map with FULL ecosystem capture ───
    const contributorMap: Record<string, any> = {};
    let totalContributorsDetected = 0;

    // Fetch up to 5,000 contributors
    try {
      for (let page = 1; page <= 50; page++) {
        const { data: pageContibs } = await octokit.repos.listContributors({
          owner,
          repo: repoName,
          per_page: 100,
          page,
          anon: '1'
        });
        
        for (const c of pageContibs) {
          const login = c.login || c.name || 'unknown';
          contributorMap[login] = {
            login,
            avatar: c.avatar_url || '',
            domains: {},
            totalCommits: c.contributions || 0,
            files: [],
            recentDate: '',
            hourlyActivity: new Array(24).fill(0),
            economicImpact: Math.round((c.contributions || 0) * 450)
          };
        }
        totalContributorsDetected += pageContibs.length;
        if (pageContibs.length < 100) break;
      }
    } catch (e) {
      console.warn('[TeamAPI] Full contributor list failed, relying on history.');
    }

    // ─── 2. Fetch Deep Commit History (up to 1,000) ───
    let allCommits: any[] = [];
    for (let page = 1; page <= 10; page++) {
      const { data: pageCommits } = await octokit.repos.listCommits({
        owner,
        repo: repoName,
        per_page: 100,
        page,
      });
      allCommits.push(...pageCommits);
      if (pageCommits.length < 100) break;
    }

    // ─── 3. Enrichment & Classification ───
    for (const commit of allCommits) {
      const login = commit.author?.login || commit.commit.author?.name || 'unknown';
      const date = commit.commit.author?.date || '';

      if (!contributorMap[login]) {
        contributorMap[login] = {
          login,
          avatar: commit.author?.avatar_url || '',
          domains: {},
          totalCommits: 0,
          files: [],
          recentDate: date,
          hourlyActivity: new Array(24).fill(0),
          economicImpact: 0
        };
      }

      // Update recency
      if (!contributorMap[login].recentDate || date > contributorMap[login].recentDate) {
        contributorMap[login].recentDate = date;
      }

      // Track hourly pulses
      const hour = new Date(date).getUTCHours();
      contributorMap[login].hourlyActivity[hour]++;
    }

    // Domain Classification (Sample of 50 most recent commits)
    const commitSample = allCommits.slice(0, 50);
    for (const commit of commitSample) {
      const login = commit.author?.login || commit.commit.author?.name || 'unknown';
      try {
        const { data: detail } = await octokit.repos.getCommit({
          owner,
          repo: repoName,
          ref: commit.sha,
        });

        for (const file of (detail.files || [])) {
          const domain = classifyFile(file.filename);
          contributorMap[login].domains[domain] = (contributorMap[login].domains[domain] || 0) + 1;
          if (!contributorMap[login].files.includes(file.filename)) {
            contributorMap[login].files.push(file.filename);
          }
        }
      } catch (e) {}
    }

    const totalFilesTouched = new Set<string>();
    Object.values(contributorMap).forEach(c => c.files.forEach((f:string) => totalFilesTouched.add(f)));

    // ─── 4. Final Finalize ───
    const contributors = Object.values(contributorMap)
      .map(c => {
        const domainTouches = Object.values(c.domains).reduce((a:any, b:any) => a + b, 0) as number;
        const domainBreakdown = Object.entries(c.domains)
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round(((count as number) / domainTouches) * 100) || 0,
            icon: DOMAINS.find(d => d.name === name)?.icon || '📁',
            color: DOMAINS.find(d => d.name === name)?.color || '#8899aa',
          }))
          .sort((a, b) => (b.count as number) - (a.count as number));

        const primaryDomain = domainBreakdown[0] || { name: 'Unknown', icon: '❓', color: '#8899aa' };
        const daysSinceActive = c.recentDate ? Math.round((Date.now() - new Date(c.recentDate).getTime()) / 86400000) : -1;
        
        return {
          ...c,
          primaryDomain: primaryDomain.name,
          primaryIcon: primaryDomain.icon,
          primaryColor: primaryDomain.color,
          role: domainBreakdown[0]?.percentage > 70 ? 'Specialist' : 'Generalist',
          activityStatus: daysSinceActive < 0 ? 'Dormant' : daysSinceActive < 7 ? 'Active' : daysSinceActive < 30 ? 'Recent' : 'Inactive',
          daysSinceActive,
          domainBreakdown,
          knowledgeCoverage: Math.round((c.files.length / (totalFilesTouched.size || 1)) * 100),
          burnoutRisk: c.hourlyActivity.slice(0, 6).reduce((a:any,b:any)=>a+b,0) > 10 ? 'high' : 'low',
          uniquelyOwnedCount: c.files.filter((f:string) => {
            return Object.values(contributorMap).filter(other => other.login !== c.login && other.files.includes(f)).length === 0;
          }).length
        };
      })
      .sort((a, b) => (b.totalCommits || 0) - (a.totalCommits || 0));

    // Summary Statistics
    const domainSummary = DOMAINS.map(domain => {
      const membersInDomain = contributors.filter(c => 
        c.domainBreakdown.some((d: any) => d.name === domain.name && d.percentage >= 15)
      );
      return {
        name: domain.name,
        icon: domain.icon,
        color: domain.color,
        memberCount: membersInDomain.length,
        members: membersInDomain.map(m => m.login),
        totalFileTouches: contributors.reduce((sum, c) => {
          const d = c.domainBreakdown.find((d: any) => d.name === domain.name);
          return sum + (d?.count || 0);
        }, 0)
      };
    }).filter(d => d.totalFileTouches > 0)
      .sort((a, b) => b.totalFileTouches - a.totalFileTouches);

    // Risk Analysis
    const risks = [];
    for (const domain of domainSummary) {
      if (domain.memberCount === 1) {
        risks.push({
          severity: 'CRITICAL',
          message: `${domain.icon} ${domain.name} has only 1 contributor (${domain.members[0]}) — bus factor = 1`,
        });
      }
    }
    for (const c of contributors) {
      if (c.activityStatus === 'Inactive' && c.totalCommits >= 5) {
        risks.push({
          severity: 'HIGH',
          message: `${c.login} (${c.primaryIcon} ${c.primaryDomain}) inactive for ${c.daysSinceActive} days — knowledge silo risk`,
        });
      }
    }

    return NextResponse.json({
      repo,
      analyzedCommits: allCommits.length,
      totalContributors: Math.max(contributors.length, totalContributorsDetected),
      contributors,
      domainSummary,
      risks,
      domains: DOMAINS.map(d => ({ name: d.name, icon: d.icon, color: d.color })),
    });

  } catch (error: any) {
    console.error('[TeamAPI] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
