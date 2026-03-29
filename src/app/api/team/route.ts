import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

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
      /yarn\.lock|package-lock\.json|pnpm-lock\.yaml/i, // Locks as docs/meta
    ],
  },
  {
    name: 'Data / ML',
    icon: '🧠',
    color: '#ff1744',
    patterns: [
      /^(data|ml|ai|models|notebooks|pipelines|training|datasets)\//i,
      /\.(ipynb|pkl|h5|onnx|csv|json|yaml|yml)$/i,
      /tensorflow|pytorch|sklearn|pandas|numpy|keras|spark/i,
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
      /^\.husky\//i,
      /^\.(npm|yarn|pnpm)/i,
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
  const token = process.env.GITHUB_TOKEN;
  const octokit = new Octokit({ auth: token || undefined });

  try {
    // ─── 1. Get recent commits with file lists ───
    const { data: commits } = await octokit.repos.listCommits({
      owner,
      repo: repoName,
      per_page: 100,
    });

    // Map: contributor → { domain → commit count }
    const contributorMap: Record<string, {
      login: string;
      avatar: string;
      domains: Record<string, number>;
      totalCommits: number;
      files: string[];
      recentDate: string;
      hourlyActivity: number[]; // 0-23
    }> = {};

    // ─── 2. Analyze each commit's files ───
    const commitSample = commits.slice(0, 60); // Limit API calls
    
    for (const commit of commitSample) {
      const login = commit.author?.login || commit.commit.author?.name || 'unknown';
      const avatar = commit.author?.avatar_url || '';
      const date = commit.commit.author?.date || '';

      if (!contributorMap[login]) {
        contributorMap[login] = {
          login,
          avatar,
          domains: {},
          totalCommits: 0,
          files: [],
          recentDate: date,
          hourlyActivity: new Array(24).fill(0),
        };
      }

      const commitDate = new Date(date);
      const hour = commitDate.getUTCHours();
      contributorMap[login].hourlyActivity[hour]++;

      contributorMap[login].totalCommits++;
      if (date > contributorMap[login].recentDate) {
        contributorMap[login].recentDate = date;
      }

      // Get files changed in this commit
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
      } catch {
        // Skip commits we can't fetch details for
      }
    }

    const totalFiles = new Set<string>();
    Object.values(contributorMap).forEach(c => c.files.forEach(f => totalFiles.add(f)));

    // ─── 3. Build contributor profiles ───
    const contributors = Object.values(contributorMap)
      .filter(c => c.totalCommits >= 2)
      .map(c => {
        const totalFileTouches = Object.values(c.domains).reduce((a, b) => a + b, 0);
        
        // Uniquely owned = we need to check if others touched these files
        const uniquelyOwned = c.files.filter(f => {
          return Object.values(contributorMap).filter(other => other.login !== c.login && other.files.includes(f)).length === 0;
        });

        const knowledgeCoverage = Math.round((c.files.length / totalFiles.size) * 100) || 0;
        const economicImpact = Math.round(c.totalCommits * 450); // Mocked dollar value based on commit volume

        // Calculate domain percentages
        const domainBreakdown = Object.entries(c.domains)
          .map(([name, count]) => ({
            name,
            count,
            percentage: Math.round((count / totalFileTouches) * 100),
            icon: DOMAINS.find(d => d.name === name)?.icon || '📁',
            color: DOMAINS.find(d => d.name === name)?.color || '#8899aa',
          }))
          .sort((a, b) => b.count - a.count);

        // Primary role = domain with most file touches
        const primaryDomain = domainBreakdown[0] || { name: 'Unknown', icon: '❓', color: '#8899aa' };
        
        // Is this person a specialist or generalist?
        const topDomainPct = domainBreakdown[0]?.percentage || 0;
        const role = topDomainPct > 70 ? 'Specialist' : topDomainPct > 45 ? 'Focused' : 'Generalist';

        // Days since last commit
        const daysSinceActive = Math.round((Date.now() - new Date(c.recentDate).getTime()) / 86400000);
        const activityStatus = daysSinceActive <= 7 ? 'Active' : daysSinceActive <= 30 ? 'Recent' : daysSinceActive <= 90 ? 'Dormant' : 'Inactive';

        return {
          login: c.login,
          avatar: c.avatar,
          totalCommits: c.totalCommits,
          primaryDomain: primaryDomain.name,
          primaryIcon: primaryDomain.icon,
          primaryColor: primaryDomain.color,
          role,
          activityStatus,
          daysSinceActive,
          lastActive: c.recentDate,
          domainBreakdown,
          topFiles: c.files.slice(0, 10),
          hourlyActivity: c.hourlyActivity,
          burnoutRisk: c.hourlyActivity.slice(0, 6).reduce((a, b) => a + b, 0) > (c.totalCommits * 0.3) ? 'high' : 'low',
          knowledgeCoverage,
          uniquelyOwnedCount: uniquelyOwned.length,
          economicImpact,
        };
      })
      .sort((a, b) => b.totalCommits - a.totalCommits);

    // ─── 4. Build domain summary ───
    const domainSummary = DOMAINS.map(domain => {
      const membersInDomain = contributors.filter(c => 
        c.domainBreakdown.some(d => d.name === domain.name && d.percentage >= 15)
      );
      const totalTouches = contributors.reduce((sum, c) => {
        const d = c.domainBreakdown.find(d => d.name === domain.name);
        return sum + (d?.count || 0);
      }, 0);

      return {
        name: domain.name,
        icon: domain.icon,
        color: domain.color,
        memberCount: membersInDomain.length,
        members: membersInDomain.map(m => m.login),
        totalFileTouches: totalTouches,
      };
    }).filter(d => d.totalFileTouches > 0)
      .sort((a, b) => b.totalFileTouches - a.totalFileTouches);

    // ─── 5. Risk analysis ───
    const risks = [];
    
    // Bus factor per domain
    for (const domain of domainSummary) {
      if (domain.memberCount === 1) {
        risks.push({
          severity: 'CRITICAL',
          message: `${domain.icon} ${domain.name} has only 1 contributor (${domain.members[0]}) — bus factor = 1`,
        });
      }
    }

    // Dormant domains
    for (const c of contributors) {
      if (c.activityStatus === 'Inactive' && c.totalCommits >= 5) {
        risks.push({
          severity: 'HIGH',
          message: `${c.login} (${c.primaryIcon} ${c.primaryDomain}) inactive for ${c.daysSinceActive} days — knowledge silo risk`,
        });
      }
    }

    // No testing contributors
    const testingDomain = domainSummary.find(d => d.name === 'Testing');
    if (!testingDomain || testingDomain.memberCount === 0) {
      risks.push({
        severity: 'HIGH',
        message: '🧪 No dedicated testing contributors detected — QA coverage at risk',
      });
    }

    return NextResponse.json({
      repo,
      analyzedCommits: commitSample.length,
      totalContributors: contributors.length,
      contributors,
      domainSummary,
      risks,
      domains: DOMAINS.map(d => ({ name: d.name, icon: d.icon, color: d.color })),
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Failed to analyze team',
      status: error.status || 500,
    }, { status: error.status || 500 });
  }
}
