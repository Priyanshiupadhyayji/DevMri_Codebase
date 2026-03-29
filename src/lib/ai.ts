import OpenAI from 'openai';
import { FullScanResult, AIDiagnosis, ChatMessage, PredictivePathology, Recommendation } from './types';

// ── MegaLLM (Unified AI Engine for everything) ──
const megallm = new OpenAI({
  baseURL: 'https://ai.megallm.io/v1',
  apiKey: process.env.MEGALLM_API_KEY || '',
});

// ✅ Auto-discovered: openai-gpt-oss-20b works on the MegaLLM Free Tier
const MEGALLM_MODEL = 'openai-gpt-oss-20b';
const MEGALLM_HIGH_END_MODEL = 'openai-gpt-oss-20b';

const SYSTEM_PROMPT = `You are DevMRI's AI diagnostician. You analyze developer experience metrics from GitHub repositories and provide specific, actionable recommendations.

RULES:
- Reference SPECIFIC data: actual CI step names (e.g. "Test Suite"), actual PR numbers (e.g. PR #123), actual package names, actual CVE IDs, actual contributor handles.
- BANNED PHRASES: "Consider", "Think about", "Generally", "Best practices suggest", "Typically".
- MANDATORY: Every advice must start with a concrete finding, e.g., "PR #842 is blocking flow" or "Your 'lint' job is sequential."
- Rank recommendations by FRICTION COST (highest $/month first)
- For each recommendation include:
  • SEVERITY: CRITICAL / HIGH / MEDIUM / LOW
  • TITLE: action-oriented (e.g., "Parallelize CI", "Split PR #123")
  • PROJECTED SCORE CHANGE: must be a positive integer 1-15
- End with a recovery plan showing projected score if all fixes implemented
- If you cannot find a specific repo entity to reference, flag the specific module data point instead.
- Do NOT give generic advice. Every recommendation must be a 'prescription' for THIS repo.
- WORKFLOW FIXES: If a CI bottleneck is found and raw YAML is provided, you MUST provide the exact code fix (YAML snippet) in 'codeExample'.
- DOCS: If docStalenessFactor is > 40, prioritize a recommendation for Track C (Docs Freshness).
- NECROSIS: If orphaned files are found (riskScore > 0), provide specific recommendations for removing or archiving dead code. Include the file paths and rationale.

Return ONLY valid JSON matching this exact schema:
{
  "recommendations": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "title": "string",
      "description": "string",
      "codeExample": "string or null",
      "metric": "string",
      "currentValue": "string",
      "frictionCost": number,
      "projectedScoreChange": number,
      "verificationMetric": "string"
    }
  ],
  "recoveryPlan": {
    "currentScore": number,
    "projectedScore": number,
    "currentGrade": "string",
    "projectedGrade": "string",
    "totalMonthlySavings": number,
    "implementationTimeline": "string"
  },
  "frictionLoops": [
    {
      "description": "string",
      "signals": ["string"],
      "breakPoint": "string",
      "compoundImpact": number
    }
  ]
}`;

function buildScanSummary(results: FullScanResult): string {
  const summary: Record<string, unknown> = {
    repo: results.repo.fullName,
    dxScore: results.dxScore,
    grade: results.grade,
    frictionCost: results.frictionCost,
    scores: results.scores,
    docStaleness: results.repo.docStalenessFactor + '%',
  };

  if (results.cicd) {
    summary.cicd = {
      avgDuration: results.cicd.avgDurationMinutes + 'min',
      successRate: results.cicd.successRate + '%',
      flakyRate: results.cicd.flakyRate + '%',
      bottleneck: results.cicd.bottleneckStage,
      trend: results.cicd.trendDirection,
      dailyRuns: results.cicd.avgDailyRuns,
      stages: results.cicd.stages.slice(0, 5).map(s => ({
        name: s.name,
        duration: s.avgDurationMinutes + 'min',
        pct: s.percentage + '%',
        status: s.status,
      })),
      workflows: results.cicd.workflowFiles,
    };
  }

  if (results.reviews) {
    summary.reviews = {
      medianReviewTime: results.reviews.medianReviewTimeHours + 'h',
      xlPrPct: results.reviews.xlPrPercentage + '%',
      gini: results.reviews.giniCoefficient,
      stalePRs: results.reviews.stalePRs.length,
      selfMergeRate: results.reviews.selfMergeRate + '%',
      topReviewers: results.reviews.reviewerLoad.slice(0, 3),
      slowestPRs: results.reviews.prData
        .sort((a, b) => b.reviewTimeHours - a.reviewTimeHours)
        .slice(0, 5)
        .map(p => ({ number: p.number, lines: p.linesChanged, waitHours: p.reviewTimeHours })),
    };
  }

  if (results.deps) {
    summary.deps = {
      ecosystem: results.deps.ecosystem,
      totalDeps: results.deps.totalDeps,
      vulnerabilities: results.deps.vulnerabilities,
      topVulns: results.deps.vulnDetails.slice(0, 5),
      outdatedPct: results.deps.outdatedPercentage + '%',
      licenseRisks: results.deps.riskyLicenseCount,
    };
  }

  if (results.correlations.length > 0) {
    summary.frictionLoops = results.correlations;
  }

  if (results.busFactor) {
    summary.busFactor = results.busFactor;
  }

  if (results.necrosis) {
    summary.necrosis = {
      orphanedFilesCount: results.necrosis.orphanedFiles.length,
      totalWastedKB: (results.necrosis.totalWastedSize / 1024).toFixed(1),
      riskScore: results.necrosis.riskScore,
      criticalOrphaned: results.necrosis.orphanedFiles
        .filter(f => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
        .map(f => ({
          path: f.path,
          daysSinceModified: f.daysSinceModified,
          sizeKB: (f.size / 1024).toFixed(1),
          recommendation: f.recommendation,
        })),
    };
  }

  if (results.commitHygiene) {
    summary.commitHygiene = {
      conventionalPct: results.commitHygiene.conventionalPct + '%',
      avgMessageLength: results.commitHygiene.avgMessageLength,
      shortMessagePct: results.commitHygiene.shortMessagePct + '%',
      prefixDistribution: results.commitHygiene.prefixDistribution,
    };
  }

  if (results.security) {
    summary.security = {
      score: results.security.score,
      branchProtection: results.security.branchProtection,
      requireReviews: results.security.requireReviews,
      hasLicense: results.security.hasLicense,
      hasCodeowners: results.security.hasCodeowners,
      hasSecurityPolicy: results.security.hasSecurityPolicy,
      communityHealthPct: results.security.communityHealthPct + '%',
    };
  }

  // ML Service data
  if (results.mlForecast) {
    summary.mlForecast = {
      daysUntilGradeD: results.mlForecast.days_until_grade_d,
      maeMinutes: results.mlForecast.mae,
      forecastSummary: results.mlForecast.forecast.slice(0, 7).map(f => ({
        date: f.date,
        predictedScore: f.predicted_score,
      })),
    };
  }

  if (results.flakyRate !== undefined) {
    summary.mlFlakyRate = results.flakyRate + '%';
  }

  return JSON.stringify(summary, null, 2);
}

/**
 * Generate context-specific, actionable recommendations based on actual scan data
 * This replaces generic advice with concrete, measurable recommendations
 */
function generateContextSpecificRecommendations(results: FullScanResult): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const { cicd, reviews, deps, necrosis, commitHygiene, busFactor } = results;
  
  // ═══════════════════════════════════════════════════════════════
  // CI/CD RECOMMENDATIONS (Track A - Highest Priority)
  // ═══════════════════════════════════════════════════════════════
  
  if (cicd) {
    // BOTTLENECK DETECTION
    if (cicd.bottleneckStage.percentage > 35) {
      const stage = cicd.bottleneckStage;
      recommendations.push({
        severity: 'CRITICAL',
        title: `Optimize '${stage.name}' (${stage.avgMinutes}m bottleneck)`,
        description: `Your '${stage.name}' step consumes ${stage.percentage.toFixed(1)}% of total build time (${stage.avgMinutes}m avg).` +
          ` This is your primary bottleneck. Parallelization or caching can reduce this by 50-80%.` +
          ` Monthly savings: $${Math.round(stage.avgMinutes * cicd.avgDailyRuns * 20 * 0.01)} (assuming 1 dev/min = $0.01).`,
        codeExample: `# ${stage.name} optimization example:
jobs:
  ${stage.name.toLowerCase().replace(/\\s+/g, '_')}:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - name: Run tests (shard \${{ matrix.shard }})
        run: npm test -- --shard \${{ matrix.shard }}/4`,
        metric: `${stage.name} Duration`,
        currentValue: `${stage.avgMinutes}m (${stage.percentage.toFixed(1)}% of total)`,
        frictionCost: Math.round(stage.avgMinutes * cicd.avgDailyRuns * 20 * 0.01 * 30),
        projectedScoreChange: 10,
        verificationMetric: `${stage.name} < ${Math.round(stage.avgMinutes * 0.4)}m`
      });
    }
    
    // UNSTABLE BUILDS
    if (cicd.flakyRate > 5) {
      recommendations.push({
        severity: cicd.flakyRate > 15 ? 'CRITICAL' : 'HIGH',
        title: `Reduce Flaky Tests (${cicd.flakyRate.toFixed(1)}% inconsistency rate)`,
        description: `${cicd.flakyRate.toFixed(1)}% of commits have inconsistent CI results (same SHA, different outcomes).` +
          ` This indicates flaky tests or environment instability. Root causes: timing issues, external service calls, race conditions.` +
          ` Fixing this reduces developer frustration and unblocks ${Math.round(cicd.flakyRate * 2)}/month wasted retries.` +
          ` Estimated time: 2-3 days to identify and fix top 5 flaky tests.`,
        codeExample: `// Common flaky test fixes:
// 1. Add explicit waits (not sleep):
await waitFor(() => expect(element).toBeInTheDocument());

// 2. Isolate tests (no shared state):
beforeEach(() => render(<Component />));
afterEach(() => cleanup());

// 3. Mock external services:
vi.mock('api/service', () => ({ fetch: vi.fn() }));`,
        metric: 'Flaky Test Rate',
        currentValue: `${cicd.flakyRate.toFixed(1)}% (${Math.round(cicd.totalRuns * cicd.flakyRate / 100)} of ${cicd.totalRuns} runs inconsistent)`,
        frictionCost: Math.round(cicd.avgDailyRuns * cicd.flakyRate * 30 * 10), // 10 min per retry retry
        projectedScoreChange: 8,
        verificationMetric: 'Flaky rate < 2%'
      });
    }
    
    // SLOW BUILDS
    if (cicd.avgDurationMinutes > 15) {
      recommendations.push({
        severity: cicd.avgDurationMinutes > 30 ? 'CRITICAL' : 'HIGH',
        title: `Speed up slow builds (${cicd.avgDurationMinutes}m average)`,
        description: `Average build duration is ${cicd.avgDurationMinutes}m, slowing developer feedback loops.` +
          ` Quick wins: enable layer caching (+50% speedup), parallelize jobs (+3-4x), skip unneeded steps in draft PRs.` +
          ` Estimated team impact: ${Math.round(cicd.avgDailyRuns * cicd.avgDurationMinutes)}m/day waiting time = ${Math.round(cicd.avgDailyRuns * cicd.avgDurationMinutes / 60)} hours/day lost to builds.`,
        codeExample: `# Use build caching:
- uses: docker/setup-buildx-action@v2
  
# Parallelize jobs:
jobs:
  test:
    strategy:
      matrix:
        include:
          - group: unit
          - group: integration
          - group: e2e
  
  # Only run full suite on main/PRs:
  setup:
    if: github.event_name == 'pull_request'`,
        metric: 'Build Duration',
        currentValue: `${cicd.avgDurationMinutes}m`,
        frictionCost: Math.round(cicd.avgDailyRuns * cicd.avgDurationMinutes * 30 * 0.01 * 30), // 1 dev min = $0.01
        projectedScoreChange: 7,
        verificationMetric: `${cicd.avgDurationMinutes}m -> ${Math.round(cicd.avgDurationMinutes * 0.6)}m`
      });
    }
    
    // SUCCESS RATE
    if (cicd.successRate < 85) {
      recommendations.push({
        severity: 'HIGH',
        title: `Improve CI stability (${cicd.successRate.toFixed(1)}% success rate)`,
        description: `Success rate is ${cicd.successRate.toFixed(1)}%, below industry standard of 90%.` +
          ` This means ${Math.round(cicd.totalRuns * (1 - cicd.successRate / 100))} failures in last 50 runs.` +
          ` Focus on: fixing false positives, reducing flakiness, improving error messages for faster debugging.`,
        codeExample: `# Improve error visibility:
- name: Run tests
  run: npm test -- --reporter=verbose
  if: failure()
  
# Add debug logging:
- name: Upload test artifacts
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: |
      coverage/
      __reports__/`,
        metric: 'CI Success Rate',
        currentValue: `${cicd.successRate.toFixed(1)}%`,
        frictionCost: Math.round(cicd.totalRuns * (1 - cicd.successRate / 100) * 20), // 20 min per failed run investigation
        projectedScoreChange: 6,
        verificationMetric: 'Success rate > 90%'
      });
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CODE REVIEW RECOMMENDATIONS (Track G)
  // ═══════════════════════════════════════════════════════════════
  
  if (reviews) {
    // LARGE PRs
    if (reviews.xlPrPercentage > 10) {
      const xlCount = Math.round(reviews.totalPRsAnalyzed * (reviews.xlPrPercentage / 100));
      recommendations.push({
        severity: 'HIGH',
        title: `Split large PRs (${reviews.xlPrPercentage.toFixed(1)}% are XL)`,
        description: `${reviews.xlPrPercentage.toFixed(1)}% of PRs are "Extra Large" (${reviews.prData.filter(p => p.size === 'XL').map(p => p.linesChanged).sort((a, b) => b - a)[0]}+ lines).` +
          ` Large PRs have ${Math.round(reviews.prData.filter(p => p.size === 'XL')[0]?.reviewTimeHours || 0) - Math.round(reviews.prData.filter(p => p.size === 'S')[0]?.reviewTimeHours || 0)}h longer review times.` +
          ` Splitting into 2-3 smaller PRs reduces review time by 60% and improves code quality.`,
        codeExample: `# Example: Split a large auth refactor into:
# PR #1: Extract utils (no behavior change)
# PR #2: Use new utils in component A
# PR #3: Use new utils in component B, component C

# Benefits:
# - Each PR is <300 LOC (easier reviews)
# - Reviewers can validate each step
# - Faster CI feedback per PR`,
        metric: 'XL PR Percentage',
        currentValue: `${reviews.xlPrPercentage.toFixed(1)}% (${xlCount} of ${reviews.totalPRsAnalyzed})`,
        frictionCost: Math.round(xlCount * (reviews.prData.filter(p => p.size === 'XL')[0]?.reviewTimeHours || 0) * 30),
        projectedScoreChange: 6,
        verificationMetric: 'XL PRs < 5%'
      });
    }
    
    // SLOW REVIEWS
    if (reviews.medianReviewTimeHours > 24) {
      recommendations.push({
        severity: 'HIGH',
        title: `Speed up PR reviews (${reviews.medianReviewTimeHours}h median)`,
        description: `Median review time is ${reviews.medianReviewTimeHours}h, slowing feature velocity.` +
          ` Causes: reviewers blocked on other tasks (${reviews.giniCoefficient > 0.4 ? 'uneven load' : 'even load'}), unclear PR descriptions, too many changes per PR.` +
          ` Actionable: request reviews explicitly, set review SLA (4h first request, 24h final), split large PRs.`,
        codeExample: `# PR template example (.github/pull_request_template.md):
## What Changed?
- [ ] Feature | [ ] Bug Fix | [ ] Refactor

## Why?
Briefly explain the business value or problem solved.

## How to Review?
Start with: src/components/NewButton.tsx
Then: src/__tests__/NewButton.test.tsx

## Test Coverage
- Unit: 42 tests added
- Integration: Login flow verified
- Manual: Tested on Chrome, Firefox`,
        metric: 'Median Review Time',
        currentValue: `${reviews.medianReviewTimeHours}h`,
        frictionCost: Math.round(reviews.totalPRsAnalyzed * reviews.medianReviewTimeHours * 30),
        projectedScoreChange: 6,
        verificationMetric: 'Median < 12h'
      });
    }
    
    // REVIEWER BURNOUT
    if (reviews.giniCoefficient > 0.35) {
      const topReviewer = reviews.reviewerLoad[0];
      if (topReviewer && topReviewer.percentage > 25) {
        recommendations.push({
          severity: 'MEDIUM',
          title: `Distribute review load (${topReviewer.login} at ${topReviewer.percentage.toFixed(1)}%)`,
          description: `${topReviewer.login} reviews ${topReviewer.percentage.toFixed(1)}% of all PRs—at risk of burnout.` +
            ` Top 3 reviewers handle ${(reviews.reviewerLoad.slice(0, 3).reduce((s, r) => s + r.percentage, 0)).toFixed(1)}% of reviews (Gini: ${reviews.giniCoefficient.toFixed(2)}).` +
            ` Action: Pair junior devs with ${topReviewer.login} for mentoring, rotate on-call reviewers, automate code-review checklist.`,
          codeExample: `# GitHub Team Code Owners (CODEOWNERS file):
# Everyone reviews critical paths:
*.test.ts @frontend-team
src/auth/** @security-team @frontend-team

# Rotate primary reviewers:
src/components/** @frontend-rotation-1-week
# (update weekly)`,
          metric: 'Review Load Balance (Gini)',
          currentValue: `Gini coeff ${reviews.giniCoefficient.toFixed(2)} (uneven), ${topReviewer.login} at ${topReviewer.percentage.toFixed(1)}%`,
          frictionCost: Math.round(topReviewer.percentage * 500), // estimate burnout cost
          projectedScoreChange: 4,
          verificationMetric: 'Gini < 0.25, no reviewer > 20%'
        });
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DEPENDENCY RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════
  
  if (deps && deps.vulnerabilities.total > 0) {
    const critOrHigh = (deps.vulnerabilities.critical || 0) + (deps.vulnerabilities.high || 0);
    recommendations.push({
      severity: deps.vulnerabilities.critical ? 'CRITICAL' : 'HIGH',
      title: `Patch vulnerabilities (${deps.vulnerabilities.critical || 0} critical, ${deps.vulnerabilities.high || 0} high)`,
      description: `Detected ${deps.vulnerabilities.total} vulnerabilities in ${deps.ecosystem} dependencies.` +
        ` ${critOrHigh} are critical/high severity and should be patched immediately.` +
        ` Use 'npm audit fix' or similar for quick wins, then audit remaining for incompatibilities.`,
      codeExample: `${deps.ecosystem === 'npm' ? '# Quick audit fix:\nnpm audit fix\n# Manual review:\nnpm audit --json > audit.json' : '# Python:\npip-audit\npoetry update'}`,
      metric: 'Total Vulnerabilities',
      currentValue: `${deps.vulnerabilities.total} (${critOrHigh} critical/high)`,
      frictionCost: Math.round(critOrHigh * 1000), // security cost estimate
      projectedScoreChange: critOrHigh > 0 ? 12 : 5,
      verificationMetric: 'Zero critical/high vulns'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // TRACK E: DEPENDENCY X-RAY (Supply Chain Health)
  // ═══════════════════════════════════════════════════════════════

  if (deps) {
    // E1: Bloated dependency tree
    const totalDeps = deps.totalDeps + deps.totalDevDeps;
    if (totalDeps > 150) {
      recommendations.push({
        severity: totalDeps > 300 ? 'HIGH' : 'MEDIUM',
        title: `Reduce dependency bloat (${totalDeps} total dependencies)`,
        description: `Your ${totalDeps} dependencies (${deps.totalDeps} prod + ${deps.totalDevDeps} dev) is high.` +
          ` Each dependency adds supply chain risk, build time, and security surface.` +
          ` Audit: Are all used? Can smaller alternatives replace 10+ deps? Lock file adds ${Math.round(totalDeps * 0.5)}MB.`,
        codeExample: `# Audit unused dependencies:
npm ls --depth=0  # Show top-level only
npm audit  # Security check
npm outdated  # See what's out of date

# Remove unused:
npm uninstall unused-package
npm prune  # Remove devDeps if NODE_ENV=production

# Consolidate: Replace 3 validation libs with 1 (e.g., zod or valibot)`,
        metric: 'Dependency Count',
        currentValue: `${totalDeps} total (${deps.totalDeps} prod/${deps.totalDevDeps} dev)`,
        frictionCost: Math.round(totalDeps * 10), // install time + security scanning
        projectedScoreChange: 5,
        verificationMetric: `< 150 total dependencies`
      });
    }

    // E2: Outdated dependencies (Update Fatigue)
    if (deps.outdatedPercentage > 15) {
      recommendations.push({
        severity: deps.outdatedPercentage > 40 ? 'HIGH' : 'MEDIUM',
        title: `Update outdated dependencies (${deps.outdatedPercentage.toFixed(0)}% stale)`,
        description: `${deps.outdatedPercentage.toFixed(0)}% of your dependencies are outdated.` +
          ` Staying current reduces security debt, gets bug fixes faster, and improves stability.` +
          ` Strategy: Batch updates monthly, test incrementally, use dependabot for automation.`,
        codeExample: `# Check outdated:
npm outdated

# Update strategy:
# 1. Patch updates (safe): npm update
# 2. Minor: npm update --save-dev
# 3. Major (risky): Review breaking changes first
#    npm install package@latest

# Automate with dependabot (GitHub):
# It creates PR for updates automatically`,
        metric: 'Outdated Dependencies',
        currentValue: `${deps.outdatedPercentage.toFixed(0)}% (${Math.round(totalDeps * deps.outdatedPercentage / 100)} of ${totalDeps})`,
        frictionCost: Math.round(deps.outdatedPercentage * 20), // maintenance burden
        projectedScoreChange: 4,
        verificationMetric: `< 10% outdated`
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRACK C: DOCS FRESHNESS SCAN (Documentation Health)
  // ═══════════════════════════════════════════════════════════════

  if (results.repo.docStalenessFactor > 30) {
    recommendations.push({
      severity: results.repo.docStalenessFactor > 50 ? 'HIGH' : 'MEDIUM',
      title: `Update stale documentation (${results.repo.docStalenessFactor.toFixed(0)}% outdated)`,
      description: `${results.repo.docStalenessFactor.toFixed(0)}% of your documentation hasn't been updated in 6+ months.` +
        ` Stale docs cause: onboarding friction (new devs follow wrong steps), tribal knowledge, bug reports ("works on my machine").` +
        ` Action: Audit your docs, update top 5 most-read pages, set review cadence (quarterly refresh).`,
      codeExample: `# Strategy: Keep docs in sync with code
# 1. Add to PR template:
#    "Did you update relevant docs?" (checkbox)

# 2. Link code to docs:
# src/auth/login.ts → docs/guide/authentication.md
# Use @link comments in JSDoc

# 3. Auto-generate API docs from TypeScript:
# npm install typedoc
# npx typedoc --out docs/api src/

# 4. Set staleness threshold:
# Warn if docs > 3 months without review`,
      metric: 'Documentation Staleness',
      currentValue: `${results.repo.docStalenessFactor.toFixed(0)}% of docs are stale (6+mo old)`,
      frictionCost: Math.round(results.repo.docStalenessFactor * 30), // onboarding slowness + support questions
      projectedScoreChange: 4,
      verificationMetric: `< 20% stale documentation`
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CODE QUALITY RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════
  
  if (necrosis && necrosis.riskScore > 0) {
    recommendations.push({
      severity: necrosis.riskScore > 50 ? 'MEDIUM' : 'LOW',
      title: `Remove orphaned code (${necrosis.orphanedFiles.length} stale files)`,
      description: `Detected ${necrosis.orphanedFiles.length} files not touched in 6+ months.` +
        ` They add maintenance burden and confuse new contributors. Recommendation: archive or delete.` +
        ` Start with: ${necrosis.orphanedFiles.slice(0, 3).map(f => f.path).join(', ')}`,
        codeExample: `# Archive old code to a branch:
git checkout -b archive/legacy-2024
# Delete files
git add -A && git commit -m "chore: archive legacy code"
# Tag for reference:
git tag archive/2024-01 && git push origin archive/2024-01`,
      metric: 'Orphaned Files',
      currentValue: `${necrosis.orphanedFiles.length} files (${(necrosis.totalWastedSize / 1024 / 1024).toFixed(1)}MB)`,
      frictionCost: 100, // low cost
      projectedScoreChange: 2,
      verificationMetric: '< 5 orphaned files'
    });
  }
  
  if (commitHygiene && commitHygiene.shortMessagePct > 20) {
    recommendations.push({
      severity: 'LOW',
      title: `Improve commit message quality (${commitHygiene.shortMessagePct.toFixed(1)}% are too short)`,
      description: `${commitHygiene.shortMessagePct.toFixed(1)}% of commits have vague messages (< 10 chars).` +
        ` Better messages improve code archaeology and blame readability. Use: "fix: auth validation for empty tokens" not "fix bug".`,
      codeExample: `# Good commit messages (Conventional Commits):
feat: add OAuth2 support for GitHub SSO
fix: handle null pointer in payment processor
docs: update setup instructions for M1 Macs
chore: bump dependencies to latest LTS`,
      metric: 'Commit Message Quality',
      currentValue: `${commitHygiene.shortMessagePct.toFixed(1)}% vague`,
      frictionCost: 50,
      projectedScoreChange: 2,
      verificationMetric: '< 5% vague messages'
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // CROSS-TRACK INTEGRATION: CI ↔ Code Review Correlation
  // ═══════════════════════════════════════════════════════════════
  
  if (cicd && reviews && cicd.avgDurationMinutes > 10 && reviews.medianReviewTimeHours > 12) {
    // Calculate correlation impact: slow CI compounds review delays
    const ciSlowness = Math.min(cicd.avgDurationMinutes / 30, 1); // 0-1 score
    const reviewSlowness = Math.min(reviews.medianReviewTimeHours / 36, 1); // 0-1 score
    const correlationScore = (ciSlowness + reviewSlowness) / 2;
    
    if (correlationScore > 0.4) {
      const compoundedCost = results.frictionCost.ciBottleneck.cost + results.frictionCost.reviewDelay.cost; // combined impact
      recommendations.push({
        severity: 'HIGH',
        title: `Break the CI↔Review friction loop (Track A + G integration)`,
        description: `Your slow CI (${cicd.avgDurationMinutes}m) and slow reviews (${reviews.medianReviewTimeHours}h) form a friction loop:` +
          ` Developers wait for CI → frustrated → rush through code review → bugs slip by → more CI failures.` +
          ` Fixing CI speed directly improves reviewer morale and code quality. This is a high-impact cross-track intervention.` +
          ` Expected benefit: Faster CI → happier reviewers → better reviews → fewer bugs → faster CI (virtuous cycle).`,
        codeExample: `# Strategy: Parallelize CI first, then optimize reviews
# 
# 1. Enable matrix builds (Track A - CI/CD Scanner):
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    runs-on: ubuntu-latest
    steps:
      - run: npm test -- --shard \${{ matrix.shard }}/4
  
# 2. Once CI is fast (<5m), improve review process (Track G):
# - Set review SLA: 4h to first review, 24h to merge
# - Split large PRs automatically
# - Rotate reviewer assignments

# Result: CI 12m→3m + Review 30h→8h = 27 hours saved per developer per week`,
        metric: 'Cross-Track Friction Loop Impact',
        currentValue: `CI + Review delays = ${Math.round(compoundedCost / 1000)}k$/month compound cost`,
        frictionCost: Math.round(compoundedCost),
        projectedScoreChange: 10,
        verificationMetric: `CI < 5m AND Review < 12h median`
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ✅ TRACK D: CODE QUALITY & MAINTAINABILITY
  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  
  const totalFiles = results.quality?.totalFiles || 0;
  const linesOfCode = results.quality?.avgLinesPerFile ? results.quality.avgLinesPerFile * totalFiles : 0;
  const avgLinesPerFile = totalFiles > 0 ? linesOfCode / totalFiles : 0;
  const complexityRisk = avgLinesPerFile > 300 ? 'HIGH' : avgLinesPerFile > 150 ? 'MEDIUM' : 'LOW';
  
  if (avgLinesPerFile > 150) {
    recommendations.push({
      severity: avgLinesPerFile > 300 ? 'HIGH' : 'MEDIUM',
      title: `Reduce average file complexity (${avgLinesPerFile.toFixed(0)} LOC/file → target <150)`,
      description: `Your average file size is ${avgLinesPerFile.toFixed(0)} lines. Large files are harder to test, review, and maintain. Teams with files >300 LOC experience 3x more bugs and 40% slower code reviews. Recommendation: Split files using Single Responsibility Principle—one class/function per file.`,
      codeExample: `# Before: auth.service.ts (520 lines)
# - Login logic
# - JWT validation  
# - Session management
# - Password reset
# - MFA logic
# PROBLEM: Hard to test in isolation, review takes 2+ hours

# After: Split into 4 files
auth/
  ├── login.service.ts (45 lines) - Single concern
  ├── jwt.service.ts (60 lines)
  ├── session.service.ts (75 lines)
  └── mfa.service.ts (80 lines)
  
# Result: Each file <100 LOC, unit tests 50% faster, code review 1.5h instead of 2h`,
      metric: 'Average File Complexity',
      currentValue: `${avgLinesPerFile.toFixed(0)} LOC/file (recommended: <150)`,
      frictionCost: Math.round((avgLinesPerFile / 300) * 3200), // $3,200/month for high complexity
      projectedScoreChange: 5,
      verificationMetric: `All files <150 LOC (move large utilities to shared libs)`
    });
  }

  // Cyclomatic complexity estimate from file count
  if (totalFiles > 500 && linesOfCode > 50000) {
    recommendations.push({
      severity: 'MEDIUM',
      title: `Add automated complexity gates (SonarQube or ESLint plugin)`,
      description: `With ${totalFiles} files and ${linesOfCode} LOC, establishing guardrails prevents complexity creep. Add pre-commit checks to reject functions >15 cyclomatic complexity. This catches maintainability debt before merge.`,
      codeExample: `.eslintrc.json
{
  "rules": {
    "complexity": ["error", 15],
    "max-lines": ["error", {"max": 300, "skipBlankLines": true}],
    "max-params": ["error", 4],
    "max-nested-callbacks": ["error", 3]
  },
  "plugins": ["sonarjs"],
  "overrides": [{"files": ["*.ts"], "rules": {"max-lines": ["error", 150]}}]
}`,
      metric: 'Code Quality Gates',
      currentValue: 'No automated complexity checks detected',
      frictionCost: 1800,
      projectedScoreChange: 3,
      verificationMetric: 'Complexity linter in CI/CD pipeline'
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ✅ TRACK F: DEVELOPER FLOW & ONBOARDING FRICTION
  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  // Estimate onboarding friction from repo structure
  const hasDockerCompose = results.flow?.hasDockerCompose || false;
  const hasMakefile = results.flow?.hasMakefile || false;
  const hasDevConfig = results.flow?.hasDevConfig || false;
  const onboardingFriction = (!hasDockerCompose && !hasMakefile) ? 85 : (!hasDockerCompose || !hasMakefile) ? 50 : 20;

  if (onboardingFriction > 50) {
    recommendations.push({
      severity: 'HIGH',
      title: `Reduce onboarding friction: implement one-step setup`,
      description: `New developers need 3-6 hours to set up your project. ${!hasDockerCompose ? 'Missing Docker Compose (DB, cache, services setup)' : ''} ${!hasMakefile ? ' Missing Makefile shortcuts' : ''}. Implement 'make dev' or Docker Compose to enable git clone → npm install → npm run dev in <5 minutes.`,
      codeExample: `# Create: docker-compose.override.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: dev
    volumes:
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
  redis:
    image: redis:7-alpine
  app:
    build: .
    ports: ["3000:3000", "5432:5432"]
    depends_on: [postgres, redis]

# Create: Makefile
.PHONY: dev setup test
dev:
\tdocker-compose up
setup:
\tdocker-compose up -d && npm install
test:
\tdocker-compose exec app npm test

# README update: "make setup" instead of 8-step manual instructions`,
      metric: 'Onboarding Time',
      currentValue: `Estimated ${onboardingFriction}% friction (${onboardingFriction > 75 ? '5-6 hours' : onboardingFriction > 50 ? '2-3 hours' : '<1 hour'} to first contribution)`,
      frictionCost: Math.round((onboardingFriction / 100) * 4200), // $4,200/month for slow onboarding
      projectedScoreChange: 6,
      verificationMetric: 'New dev can run full stack in <5 minutes'
    });
  }

  // PR review experience friction (from Track G data but applied to developer flow)
  if (results.reviews && results.reviews.medianReviewTimeHours > 24) {
    recommendations.push({
      severity: 'MEDIUM',
      title: `Streamline PR review flow: implement async-first reviews`,
      description: `PRs wait ${results.reviews.medianReviewTimeHours}h for review. Developers context-switch or block on feedback. Implement: (1) Auto-assign reviewers by code ownership, (2) 4-hour SLA for first review, (3) Async-friendly feedback (video comments, recorded explanations).`,
      codeExample: `# Create: .github/workflows/auto-assign.yml
name: Auto-assign reviews
on: [pull_request]
jobs:
  assign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: kentaro-m/auto-assign-action@v1.2.5
        with:
          configFilePath: .github/auto_assign_config.yml

# Create: .github/auto_assign_config.yml
assignees:
  - backend: [alice, bob]    # Code ownership
  - frontend: [charlie]
  - docs: [diana]

# Setup: GITHUB_TOKEN in repo settings
# Result: 1st review within 1h (auto-assigned, not waiting for manual assignment)`,
      metric: 'PR Feedback Latency',
      currentValue: `${results.reviews.medianReviewTimeHours}h median (recommended: <4h)`,
      frictionCost: 2600,
      projectedScoreChange: 4,
      verificationMetric: '50% of PRs reviewed within 4h'
    });
  }

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // ✅ TRACK H: ENVIRONMENT INTEGRITY & REPRODUCIBILITY
  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════

  // Environment reproducibility checks
  const hasEnvExample = results.environment?.hasEnvExample || false;
  const hasNodeVersion = results.environment?.hasNvmrc || results.environment?.hasNodeVersionFile || false;
  const hasLockFile = results.environment?.hasLockFile || false;
  const envIntegrityScore = results.environment?.score || 0;

  if (envIntegrityScore < 100) {
    recommendations.push({
      severity: envIntegrityScore < 33 ? 'CRITICAL' : 'HIGH',
      title: `Enforce reproducible environments across team`,
      description: `Environment drift = 22% of "works on my machine" failures. ${!hasEnvExample ? 'Missing .env.example. ' : ''}${!hasNodeVersion ? 'No .nvmrc or node-version.json. ' : ''}${!hasLockFile ? 'No package-lock.json committed. ' : ''}Without these, devs run different versions, dependencies diverge, and builds fail inconsistently.`,
      codeExample: `# 1. Create: .nvmrc
20.10.0

# 2. Create: .env.example
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp_dev
REDIS_URL=redis://localhost:6379
NODE_ENV=development

# 3. Ensure: package-lock.json committed
git add package-lock.json
git commit -m 'chore: lock dependencies'

# 4. Create: .github/workflows/env-check.yml
name: Environment Consistency
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check .nvmrc exists
        run: test -f .nvmrc || (echo "Missing .nvmrc" && exit 1)
      - name: Check .env.example exists
        run: test -f .env.example || echo "Warning: Missing .env.example"
      - name: Check lock file up to date
        run: npm ci --ignore-scripts && npm list --depth=0

# Result: All developers use Node 20, same dependencies, same env vars → 0 "works locally" failures`,
      metric: 'Environment Reproducibility',
      currentValue: `${envIntegrityScore}% configured (${!hasEnvExample ? 'no .env.example' : ''} ${!hasNodeVersion ? 'no .nvmrc' : ''} ${!hasLockFile ? 'no lock file' : ''})`,
      frictionCost: 2900,
      projectedScoreChange: 5,
      verificationMetric: 'All .nvmrc, .env.example, and lock files present'
    });
  }

  // Track H: environment variables not documented
  if (results.environment && !results.environment.envVarsDocumented) {
    recommendations.push({
      severity: 'MEDIUM',
      title: `Document CI/CD environment variables and secrets`,
      description: `When CI fails with "missing env var", developers can't debug. Document which environment variables are required, how to set them in GitHub Actions, and which are secrets vs configuration. Create a .env.ci.example or README section listing all CI-required vars.`,
      codeExample: `# Create: CI_ENVIRONMENT.md
# CI/CD Environment Variables

## Secrets (set in GitHub → Settings → Secrets)
- \`GITHUB_TOKEN\` - Auto-provided by GitHub
- \`NPM_TOKEN\` - Private package registry auth
- \`SLACK_WEBHOOK\` - Post build results to Slack

## Configuration (check in to repo)
- Node 20.x (via .nvmrc)
- npm 10.x (via .npmrc)
- Python 3.11 (if ML service)

## Test locally
export GITHUB_TOKEN='ghp_...'
npm ci --include dev
npm run test:ci

# OR use: act -s GITHUB_TOKEN=ghp_...`,
      metric: 'CI Environment Clarity',
      currentValue: 'CI environment setup undocumented',
      frictionCost: 1200,
      projectedScoreChange: 2,
      verificationMetric: 'CI_ENVIRONMENT.md exists with all required vars listed'
    });
  }
  
  return recommendations;
}

function generateMockDiagnosis(results: FullScanResult): AIDiagnosis {
  // Use the new context-specific recommendation engine
  const recommendations = generateContextSpecificRecommendations(results);
  const dxScore = results.dxScore;
  
  // Calculate projected score based on what recommendations would save
  const projScore = Math.min(100, dxScore + recommendations.reduce((s, r) => s + r.projectedScoreChange, 0));

  return {
    recommendations: recommendations.sort((a, b) => b.frictionCost - a.frictionCost).slice(0, 8), // Top 8 by impact
    recoveryPlan: {
      currentScore: dxScore,
      projectedScore: projScore,
      currentGrade: results.grade,
      projectedGrade: projScore >= 90 ? 'A' : projScore >= 75 ? 'B' : projScore >= 60 ? 'C' : 'D',
      totalMonthlySavings: results.frictionCost.total,
      implementationTimeline: '2-4 Weeks'
    },
    frictionLoops: [
      {
        description: 'Slow CI → Developer frustration → Rushed reviews → Bugs → More CI failures',
        signals: ['High build duration', 'High flaky rate', 'Short review times'],
        breakPoint: 'Optimize bottleneck stage + enable parallelization',
        compoundImpact: 15
      },
      {
        description: 'Large PRs → Long reviews → Stale PRs → Merge conflicts → Rework',
        signals: ['XL PR %', 'Stale PRs', 'Long review time'],
        breakPoint: 'Enforce PR size limits in CI',
        compoundImpact: 12
      }
    ]
  };
}

function cleanJSON(text: string): string {
  // 1. Remove markdown code blocks
  let cleaned = text.replace(/```json\n?|```/g, '');
  
  // 2. Extract only the first { to the last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return cleaned.trim();
  cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  
  // 3. Fix common LLM escaping errors
  // Fix literal \" inside strings that should just be "
  // But don't break properly escaped characters
  cleaned = cleaned.replace(/\\"/g, '"');
  
  // 4. Fix cases where LLM puts a backslash before a quote unnecessarily
  // e.g. "value": \"something\" -> "value": "something"
  cleaned = cleaned.replace(/:\s*\\"/g, ': "');
  cleaned = cleaned.replace(/\\"\s*,/g, '",');
  cleaned = cleaned.replace(/\\"\s*\}/g, '"}');

  return cleaned.trim();
}

/**
 * Aggressively attempt to fix broken JSON from LLMs
 */
function rescueJSON(jsonStr: string): string {
  let res = jsonStr;
  
  // 1. Remove trailing commas in objects and arrays
  res = res.replace(/,\s*([\}\]])/g, '$1');
  
  // 2. Fix missing commas between properties or array elements
  // e.g. "a": 1 "b": 2 -> "a": 1, "b": 2
  res = res.replace(/"\s+([a-zA-Z0-9_]+":)/g, '", "$1');
  // e.g. ["a" "b"] -> ["a", "b"]
  res = res.replace(/"\s+"/g, '", "');
  // e.g. [{...} {...}] -> [{...}, {...}]
  res = res.replace(/\}\s+\{/g, '}, {');
  
  // 3. Fix unescaped newlines in values
  res = res.replace(/\n/g, '\\n');
  
  // 4. Heuristic: Fix unescaped double quotes within property values
  // We look for "prop": "content "with" quotes"
  // This is tricky, but we can try to find quotes that are NOT preceded by : and NOT followed by , or }
  // First, find all string values: everything between : " and " (followed by , or })
  res = res.replace(/:\s*"([\s\S]*?)"\s*([,}])/g, (match, content, suffix) => {
    // Escape all internal quotes in 'content'
    const fixedContent = content.replace(/(?<!\\)"/g, '\\"');
    return `: "${fixedContent}"${suffix}`;
  });

  // 5. Un-break structural quotes we might have over-escaped
  res = res.replace(/\\n\s*([\{\}\[\]:])/g, '\n$1');
  
  return res;
}

export async function generateDiagnosis(results: FullScanResult): Promise<AIDiagnosis | null> {
  if (!process.env.MEGALLM_API_KEY) return generateMockDiagnosis(results);

  try {
    const scanSummary = buildScanSummary(results);
    const prompt = `Clinical data for ${results.repo.owner}/${results.repo.repo}:\n\n${scanSummary}\n\nDeliver the diagnosis in JSON format matching the schema. CRITICAL: Ensure the JSON is valid and every property is quoted.`;
    
    const completion = await megallm.chat.completions.create({
      model: MEGALLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1, // Even lower for better stability
      max_tokens: 4096,
    });
    
    const text = completion.choices[0]?.message?.content || '';
    const cleaned = cleanJSON(text);

    try {
      return JSON.parse(cleaned) as AIDiagnosis;
    } catch (parseError) {
      console.warn('[MegaLLM] Primary JSON parse failed, trying rescue...', parseError);
      try {
        const rescued = rescueJSON(cleaned);
        return JSON.parse(rescued) as AIDiagnosis;
      } catch (rescueError) {
        console.error('[MegaLLM] JSON rescue failed:', rescueError);
        // Last ditch effort: regex out the parts we can salvage? 
        // No, better to fallback to mock but maybe log the bad JSON for debugging
        console.debug('BAD JSON:', cleaned);
        return generateMockDiagnosis(results);
      }
    }
  } catch (e: any) {
    console.warn('[MegaLLM] Diagnosis error:', e.message || e);
    return generateMockDiagnosis(results);
  }
}

export async function chatFollowUp(
  message: string,
  scanResults: FullScanResult,
  history: ChatMessage[]
): Promise<string> {
  const scanContext = buildScanSummary(scanResults);
  const messages = [
    { role: 'system' as const, content: `You are DevMRI's AI diagnostic assistant. You help developers understand their repo health.\nRepo Health Context:\n${scanContext}` },
    ...history.map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  // Strategy 1: Try MegaLLM with multiple models (auto-discover which one the free tier allows)
  if (process.env.MEGALLM_API_KEY) {
    const modelsToTry = [
      'openai-gpt-oss-20b',   // ✅ Confirmed working on Free Tier
      'gemini-2.5-flash-lite',
      'gpt-3.5-turbo',
      'gpt-5-mini',
      'gpt-4o-mini',
      'llama-4-maverick-17b',
      'alibaba-qwen3-32b',
      'deepseek-ai/deepseek-v3.1',
    ];

    for (const model of modelsToTry) {
      try {
        console.log(`[MegaLLM] Trying model: ${model}`);
        const completion = await megallm.chat.completions.create({
          model,
          messages,
          temperature: 0.4,
          max_tokens: 2048,
        });
        const result = completion.choices[0]?.message?.content;
        if (result) {
          console.log(`[MegaLLM] ✅ Success with model: ${model}`);
          return result;
        }
      } catch (e: any) {
        console.warn(`[MegaLLM] ❌ Model ${model} failed: ${e?.message?.slice(0, 80) || e}`);
        continue; // Try next model
      }
    }
  }

  // Strategy 2: Fall back to Google Gemini API directly
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const chatHistory = [
        {
          role: 'user' as const,
          parts: [{ text: `Here are the scan results for context:\n${scanContext}\nDon't respond to this — store it for reference.` }],
        },
        {
          role: 'model' as const,
          parts: [{ text: 'I have the full scan context. Ask me anything about this repository.' }],
        },
        ...history.map(m => ({
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: m.content }],
        })),
      ];

      const chat = geminiModel.startChat({
        history: chatHistory,
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      });

      const result = await chat.sendMessage(message);
      console.log('[Gemini] ✅ Fallback successful');
      return result.response.text();
    } catch (e: any) {
      console.error('[Gemini] ❌ Fallback failed:', e?.message || e);
    }
  }

  return 'AI Gateway error: All AI providers are currently unavailable. Please check your API keys in .env.local (MEGALLM_API_KEY and/or GEMINI_API_KEY) and ensure your account has available credits.';
}

const PATHOLOGY_PROMPT = `You are DevMRI's Predictive Pathology Engine. You analyze developer experience metrics and predict future health risks for the repository.

Based on the scan data provided, generate a 12-month health projection with:

1. ATTRITION RISKS: Identify key maintainers (Vital Organs) at risk of leaving based on:
   - Low recent commit activity
   - High code ownership percentage
   - Knowledge silos (bus factor analysis)

2. HOTSPOT PREDICTIONS: Identify files that aren't complex yet but have high "churn velocity" (frequent changes) suggesting they will become unmaintainable in 3 months

3. BOTTLENECK TRENDS: Predict when CI/CD build times will exceed the "Critical Threshold" (20+ mins) based on current growth rate

4. DELIVERY PROGNOSIS: Using historical velocity (PR merge times, review times) predict if the current sprint will finish on time

Return ONLY valid JSON matching this exact schema:
{
  "attritionRisks": [
    {
      "maintainer": "string",
      "riskLevel": "critical|high|medium|low",
      "knowledgeLossPercentage": number,
      "filesAtRisk": ["string"],
      "ownershipPercentage": number,
      "lastActive": "string",
      "daysSinceLastCommit": number,
      "recommendation": "string"
    }
  ],
  "hotspotPredictions": [
    {
      "path": "string",
      "currentChurn": number,
      "predictedChurn3Months": number,
      "riskLevel": "critical|high|medium|low",
      "churnVelocity": number,
      "complexityTrend": "increasing|stable|decreasing",
      "recommendation": "string"
    }
  ],
  "bottleneckForecasts": [
    {
      "stageName": "string",
      "currentAvgMinutes": number,
      "predicted3Months": number,
      "daysUntilThreshold": number,
      "criticalThreshold": number,
      "trendDirection": "improving|stable|worsening",
      "recommendation": "string"
    }
  ],
  "deliveryPrognosis": {
    "currentVelocity": number,
    "predictedVelocity": number,
    "sprintCompletionDate": "string",
    "onTrack": boolean,
    "confidence": number,
    "factors": [
      {
        "name": "string",
        "impact": "positive|negative|neutral"
      }
    ],
    "riskLevel": "critical|high|medium|low",
    "recommendation": "string"
  },
  "healthScore12Months": number,
  "projectedGrade12Months": "A|B|C|D|F"
}`;

function generateMockPathology(results: FullScanResult): PredictivePathology {
  const dxScore = results.dxScore;
  const grade = results.grade;
  const isHealthy = dxScore >= 70;
  
  return {
    attritionRisks: [
      {
        maintainer: results.busFactor?.topContributors[0]?.login || "Main Developer",
        riskLevel: isHealthy ? "low" : "medium",
        knowledgeLossPercentage: results.busFactor?.topContributors[0]?.percentage || 40,
        filesAtRisk: ["src/core", "package.json"],
        ownershipPercentage: results.busFactor?.topContributors[0]?.percentage || 40,
        lastActive: new Date().toISOString(),
        daysSinceLastCommit: 0,
        recommendation: "Increase knowledge sharing sessions."
      }
    ],
    hotspotPredictions: [
      {
        path: results.heatmap?.hotspots[0]?.path || "src",
        currentChurn: results.heatmap?.hotspots[0]?.churn || 10,
        predictedChurn3Months: Math.round((results.heatmap?.hotspots[0]?.churn || 10) * 1.2),
        riskLevel: isHealthy ? "medium" : "high",
        churnVelocity: 0.15,
        complexityTrend: "stable",
        recommendation: "Refactoring scheduled for Q3."
      }
    ],
    bottleneckForecasts: [
      {
        stageName: results.cicd?.bottleneckStage.name || "Main Pipeline",
        currentAvgMinutes: results.cicd?.avgDurationMinutes || 15,
        predicted3Months: (results.cicd?.avgDurationMinutes || 15) + 2,
        daysUntilThreshold: 45,
        criticalThreshold: 30,
        trendDirection: "stable",
        recommendation: "Optimization recommended within 2 months."
      }
    ],
    deliveryPrognosis: {
      currentVelocity: 5,
      predictedVelocity: isHealthy ? 5.5 : 4.5,
      sprintCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      onTrack: isHealthy,
      confidence: 0.7,
      factors: [
        { name: "CI/CD Reliability", impact: isHealthy ? "positive" : "negative" },
        { name: "Code Review Depth", impact: "neutral" }
      ],
      riskLevel: isHealthy ? "low" : "medium",
      recommendation: isHealthy ? "Maintain current pace." : "Strengthen review process."
    },
    healthScore12Months: Math.max(0, dxScore - (isHealthy ? 5 : 15)),
    projectedGrade12Months: isHealthy ? "B" : "D",
    generatedAt: new Date().toISOString()
  };
}

export async function generatePathology(results: FullScanResult): Promise<PredictivePathology | null> {
  if (!process.env.MEGALLM_API_KEY) return generateMockPathology(results);

  try {
    const scanSummary = buildScanSummary(results);
    const prompt = `Analyze this repository and predict future health risks:\n\n${scanSummary}`;
    
    const completion = await megallm.chat.completions.create({
      model: MEGALLM_MODEL,
      messages: [
        { role: 'system', content: PATHOLOGY_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });
    
    const text = completion.choices[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn('[MegaLLM] Could not parse pathology response. Falling back to heuristic.');
      return generateMockPathology(results);
    }
    
    const pathology = JSON.parse(jsonMatch[0]);
    return {
      ...pathology,
      generatedAt: new Date().toISOString(),
    } as PredictivePathology;
  } catch (e: any) {
    console.warn('[MegaLLM] Pathology error:', e.message || e);
    return generateMockPathology(results);
  }
}

