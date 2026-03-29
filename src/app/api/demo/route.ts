import { NextRequest } from 'next/server';

// Demo data for judges/users who don't have a GitHub token
const DEMO_DATA = {
  repo: {
    owner: 'demo',
    repo: 'playground',
    fullName: 'demo/playground',
    defaultBranch: 'main',
    description: 'DevMRI Demo Playground — Pre-loaded clinical data for exploration',
    stars: 12847,
    forks: 2310,
    openIssues: 89,
    language: 'TypeScript',
    topics: ['demo', 'devmri', 'playground'],
    createdAt: '2023-01-01T00:00:00Z',
    pushedAt: new Date().toISOString(),
  },
  dxScore: 62,
  grade: 'C',
  timestamp: new Date().toISOString(),
  scanDuration: 4.2,
  scores: { cicd: 58, reviews: 71, deps: 55, security: 80, necrosis: 65, heatmap: 48, doc: 72 },
  cicd: {
    totalRuns: 245,
    avgDurationMinutes: 12.4,
    successRate: 78.2,
    flakyRate: 14.5,
    bottleneckStage: { name: 'Integration Tests', avgMinutes: 6.2, percentage: 50 },
    stages: [
      { name: 'Checkout', avgDurationMinutes: 0.2, maxDurationMinutes: 0.5, successRate: 100, percentage: 2, status: 'healthy' },
      { name: 'Install Dependencies', avgDurationMinutes: 1.8, maxDurationMinutes: 3.2, successRate: 99, percentage: 15, status: 'healthy' },
      { name: 'Lint', avgDurationMinutes: 0.4, maxDurationMinutes: 0.8, successRate: 92, percentage: 3, status: 'healthy' },
      { name: 'Unit Tests', avgDurationMinutes: 2.1, maxDurationMinutes: 4.5, successRate: 88, percentage: 17, status: 'warning' },
      { name: 'Integration Tests', avgDurationMinutes: 6.2, maxDurationMinutes: 11.0, successRate: 74, percentage: 50, status: 'bottleneck' },
      { name: 'Build', avgDurationMinutes: 1.7, maxDurationMinutes: 2.5, successRate: 96, percentage: 13, status: 'healthy' },
    ],
    buildTimeTrend: Array.from({ length: 20 }, (_, i) => ({ runNumber: i + 1, durationMinutes: 10 + Math.sin(i * 0.3) * 4 + Math.random() * 2 })),
    trendDirection: 'worsening',
    trendSlope: 0.23,
    failureHeatmap: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 5))),
    peakFailureHour: 15,
    peakFailureDay: 'Wednesday',
    avgDailyRuns: 8.5,
  },
  reviews: {
    totalPRsAnalyzed: 87,
    medianReviewTimeHours: 11.3,
    medianMergeTimeHours: 14.8,
    xlPrPercentage: 22,
    giniCoefficient: 0.45,
    stalePRs: [
      { number: 142, title: 'Refactor authentication module', author: 'dev-alice', daysOpen: 21 },
      { number: 138, title: 'Add dark mode support', author: 'dev-bob', daysOpen: 14 },
      { number: 135, title: 'Database migration v2', author: 'dev-carol', daysOpen: 10 },
      { number: 131, title: 'API rate limiting', author: 'dev-alice', daysOpen: 8 },
    ],
    stalePrRate: 18,
    selfMergeRate: 15,
    prSizeDistribution: { S: 32, M: 35, L: 15, XL: 8 },
    reviewerLoad: [
      { login: 'alice', reviewCount: 42, percentage: 48 },
      { login: 'bob', reviewCount: 25, percentage: 29 },
      { login: 'carol', reviewCount: 15, percentage: 17 },
      { login: 'dave', reviewCount: 5, percentage: 6 },
    ],
    prData: Array.from({ length: 20 }, (_, i) => ({ number: 100 + i, linesChanged: Math.floor(Math.random() * 800) + 50, reviewTimeHours: Math.random() * 24 + 1 })),
    loadBalance: 'uneven',
  },
  deps: {
    ecosystem: 'npm',
    totalDeps: 42,
    totalDevDeps: 18,
    vulnerabilities: { critical: 1, high: 3, medium: 5, low: 2, total: 11 },
    vulnDetails: [
      { package: 'lodash', version: '4.17.15', vulnId: 'GHSA-35jh-r3h4-6jhm', severity: 'CRITICAL', title: 'Prototype Pollution in lodash', fixedIn: '4.17.21' },
      { package: 'express', version: '4.17.1', vulnId: 'GHSA-29mw-wpgm-hmr9', severity: 'HIGH', title: 'Express.js Open Redirect', fixedIn: '4.19.2' },
      { package: 'axios', version: '0.21.1', vulnId: 'GHSA-42xw-2xvc-qx8m', severity: 'HIGH', title: 'Server-Side Request Forgery', fixedIn: '0.21.2' },
      { package: 'node-fetch', version: '2.6.1', vulnId: 'GHSA-w7rc-rwvf-8q5r', severity: 'HIGH', title: 'Exposure of Sensitive Information', fixedIn: '2.6.7' },
    ],
    outdatedCount: 12,
    outdatedPercentage: 29,
    riskyLicenseCount: 0,
  },
  security: {
    score: 80,
    branchProtection: true,
    requiredReviews: 1,
    signedCommits: false,
    codeOwners: true,
    securityPolicy: false,
    dependabot: true,
  },
  aiDiagnosis: {
    recommendations: [
      { id: 'r1', title: 'Parallelize Integration Tests', description: 'Your integration test suite (6.2m avg) is the primary bottleneck at 50% of build time. Split into parallel shards.', severity: 'CRITICAL', metric: 'cicd', projectedScoreChange: 12, frictionCost: 1800, codeExample: 'strategy:\n  matrix:\n    shard: [1, 2, 3]\n  steps:\n    - run: npx jest --shard=${{ matrix.shard }}/3' },
      { id: 'r2', title: 'Upgrade Critical Dependency: lodash', description: 'lodash@4.17.15 has a critical prototype pollution vulnerability. Upgrade to 4.17.21+.', severity: 'CRITICAL', metric: 'deps', projectedScoreChange: 8, frictionCost: 2700, codeExample: 'npm install lodash@latest' },
      { id: 'r3', title: 'Reduce Review Bottleneck', description: 'Your Gini coefficient of 0.45 shows review load is concentrated. 48% of reviews are done by one person.', severity: 'HIGH', metric: 'reviews', projectedScoreChange: 6, frictionCost: 900, codeExample: '' },
      { id: 'r4', title: 'Add CODEOWNERS for Auto-Assignment', description: 'Configure CODEOWNERS to automatically assign reviewers and distribute the review load.', severity: 'MEDIUM', metric: 'reviews', projectedScoreChange: 4, frictionCost: 600, codeExample: '# .github/CODEOWNERS\n* @team-leads\n/src/api/ @backend-team\n/src/ui/ @frontend-team' },
    ],
    recoveryPlan: {
      implementationTimeline: '2-4 weeks',
      strategicGoals: [
        'Shift left security by automating dependency patches',
        'Halve CI/CD integration latency through parallelization',
        'Democratize review process to avoid single-contributor bottlenecks'
      ]
    }
  },
  friction: null,
  heatmap: {
    hotspots: [
      { path: 'src/api/auth.ts', complexity: 85, churn: 42, lines: 380, contributors: 2, status: 'inflamed' },
      { path: 'src/utils/helpers.ts', complexity: 72, churn: 35, lines: 220, contributors: 4, status: 'warning' },
      { path: 'src/db/queries.ts', complexity: 68, churn: 28, lines: 450, contributors: 1, status: 'warning' },
    ],
  },
  necrosis: {
    riskScore: 65,
    orphanedFiles: [
      { path: 'src/legacy/old-auth.ts', lastModified: '2024-01-15', lines: 180, reason: 'No imports found', severity: 'critical', recommendation: 'Safe to delete. No active references in codebase.' },
      { path: 'src/utils/deprecated.ts', lastModified: '2023-11-20', lines: 95, reason: 'Marked @deprecated, no active references', severity: 'medium', recommendation: 'Marked for deletion since Nov 2023.' },
    ],
    totalWastedSize: 28450,
    impactDescription: 'Dead code contributes to cognitive load and can mask hidden bugs. Removing these files will slightly improve build speed.',
  },
  contributors: [
    { login: 'alice', avatar_url: 'https://avatars.githubusercontent.com/u/1?s=40', contributions: 245 },
    { login: 'bob', avatar_url: 'https://avatars.githubusercontent.com/u/2?s=40', contributions: 189 },
    { login: 'carol', avatar_url: 'https://avatars.githubusercontent.com/u/3?s=40', contributions: 112 },
    { login: 'dave', avatar_url: 'https://avatars.githubusercontent.com/u/4?s=40', contributions: 67 },
    { login: 'eve', avatar_url: 'https://avatars.githubusercontent.com/u/5?s=40', contributions: 34 },
  ],
  simulation: [
    { fixType: 'parallel_ci', title: 'Parallelize CI', scoreChange: 12, monthlySavings: 1800 },
    { fixType: 'dep_upgrade', title: 'Patch Vulnerabilities', scoreChange: 8, monthlySavings: 2700 },
    { fixType: 'codeowners', title: 'Auto-Reviewers', scoreChange: 4, monthlySavings: 600 },
    { fixType: 'flaky_fix', title: 'Fix Flaky Tests', scoreChange: 7, monthlySavings: 1200 }
  ],
};

export async function GET(req: NextRequest) {
  // Simulate a small scan delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return Response.json(DEMO_DATA);
}
