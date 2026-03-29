import {
  CICDResult, ReviewResult, DependencyResult, ModuleScores, Grade,
  FrictionCostBreakdown, DORAMetrics, DORAClass,
  SecurityPosture, CommitHygieneResult, CorrelationInsight, SimulationResult,
  FullScanResult, CodeQualityResult, DeveloperFlowResult, EnvironmentIntegrityResult
} from './types';
import benchmarkData from './benchmark.json';

function getBenchmarkData() {
  return {
    statistics: {
      mean: benchmarkData.statistics?.mean ?? 65,
      stdDev: benchmarkData.statistics?.stdDev ?? 15,
      p25: benchmarkData.statistics?.p25 ?? 55,
      p50: benchmarkData.statistics?.p50 ?? 70,
      p75: benchmarkData.statistics?.p75 ?? 82,
      p90: benchmarkData.statistics?.p90 ?? 88,
    }
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ═══════════════════════════════════════
// MODULE SCORING
// ═══════════════════════════════════════

export function calculateCICDScore(data: CICDResult): number {
  const successScore = data.successRate;
  const speedScore = data.avgDurationMinutes < 5 ? 100 :
    data.avgDurationMinutes < 10 ? 80 :
    data.avgDurationMinutes < 15 ? 60 :
    data.avgDurationMinutes < 25 ? 40 : 20;
  const flakyInverse = clamp(100 - (data.flakyRate * 5), 0, 100);
  const bottleneckInverse = clamp(100 - (data.bottleneckStage.percentage * 1.5), 0, 100);

  return Math.round(
    (successScore * 0.35) + (speedScore * 0.30) +
    (flakyInverse * 0.20) + (bottleneckInverse * 0.15)
  );
}

export function calculateReviewScore(data: ReviewResult): number {
  const speedScore = data.medianReviewTimeHours < 2 ? 100 :
    data.medianReviewTimeHours < 4 ? 85 :
    data.medianReviewTimeHours < 8 ? 70 :
    data.medianReviewTimeHours < 24 ? 50 : 25;
  const prSizeScore = clamp(100 - (data.xlPrPercentage * 2), 0, 100);
  const loadBalance = clamp(100 - (data.giniCoefficient * 100), 0, 100);
  const staleInverse = clamp(100 - (data.stalePrRate * 2), 0, 100);
  const selfMergeInverse = clamp(100 - (data.selfMergeRate * 3), 0, 100);

  return Math.round(
    (speedScore * 0.30) + (prSizeScore * 0.25) + (loadBalance * 0.20) +
    (staleInverse * 0.15) + (selfMergeInverse * 0.10)
  );
}

export function calculateDepScore(data: DependencyResult): number {
  const critHigh = data.vulnerabilities.critical + data.vulnerabilities.high;
  const vulnScore = critHigh === 0 ? 100 : critHigh <= 2 ? 70 : critHigh <= 5 ? 40 : 10;
  const freshnessScore = clamp(100 - data.outdatedPercentage, 0, 100);
  const totalDeps = data.totalDeps + data.totalDevDeps;
  const bloatScore = totalDeps < 50 ? 100 : totalDeps < 100 ? 80 :
    totalDeps < 200 ? 60 : totalDeps < 500 ? 40 : 20;
  const licenseScore = data.riskyLicenseCount === 0 ? 100 :
    data.riskyLicenseCount <= 2 ? 70 : data.riskyLicenseCount <= 5 ? 40 : 10;

  return Math.round(
    (vulnScore * 0.40) + (freshnessScore * 0.30) +
    (bloatScore * 0.20) + (licenseScore * 0.10)
  );
}

export function calculateSecurityScore(data: SecurityPosture): number {
  let score = 0;
  if (data.branchProtection) score += 20;
  if (data.requireReviews) score += 20;
  if (data.requireStatusChecks) score += 15;
  if (data.hasLicense) score += 10;
  if (data.hasCodeowners) score += 15;
  if (data.hasSecurityPolicy) score += 10;
  if (data.hasContributing) score += 10;
  return score;
}

export function calculateCommitHygieneScore(data: CommitHygieneResult): number {
  const conventionalScore = clamp(data.conventionalPct, 0, 100);
  const lengthScore = data.avgMessageLength > 20 ? 100 :
    data.avgMessageLength > 10 ? 60 : 30;
  const shortPenalty = clamp(100 - (data.shortMessagePct * 3), 0, 100);
  return Math.round(conventionalScore * 0.5 + lengthScore * 0.25 + shortPenalty * 0.25);
}

export function calculateBusFactorScore(busFactor: number): number {
  if (busFactor >= 8) return 100;
  if (busFactor >= 5) return 80;
  if (busFactor >= 3) return 60;
  if (busFactor >= 2) return 40;
  return 20;
}

export function calculateDocStalenessScore(stalenessFactor: number): number {
  return clamp(100 - stalenessFactor, 0, 100);
}

export function calculateQualityScore(data: CodeQualityResult): number {
  return data.score; // Already pre-calculated in scanner logic
}

export function calculateFlowScore(data: DeveloperFlowResult): number {
  return data.score; // Already pre-calculated in scanner logic
}

export function calculateEnvironmentScore(data: EnvironmentIntegrityResult): number {
  return data.score; // Already pre-calculated in scanner logic
}

// ═══════════════════════════════════════
// DX SCORE
// ═══════════════════════════════════════

export function calculateDXScore(
  scores: ModuleScores, 
  docStalenessFactor: number = 0,
  weights?: { cicd: number; reviews: number; deps: number; docs: number; quality: number; flow: number; env: number }
): { score: number; grade: Grade; percentile: number } {
  const docScore = calculateDocStalenessScore(docStalenessFactor);
  
  // Rebalanced weights for 8 tracks (plus docs)
  const w = weights ? {
    cicd: weights.cicd / 100,
    reviews: weights.reviews / 100,
    deps: weights.deps / 100,
    docs: weights.docs / 100,
    quality: weights.quality / 100,
    flow: weights.flow / 100,
    env: weights.env / 100,
  } : {
    cicd: 0.15,
    reviews: 0.15,
    deps: 0.15,
    docs: 0.10,
    quality: 0.15,
    flow: 0.15,
    env: 0.15,
  };

  const score = Math.round(
    (scores.cicd * w.cicd) + 
    (scores.reviews * w.reviews) + 
    (scores.deps * w.deps) + 
    (docScore * w.docs) +
    (scores.quality * w.quality) +
    (scores.flow * w.flow) +
    (scores.environment * w.env)
  );
  
  const grade: Grade = score >= 80 ? 'A' : score >= 60 ? 'B' :
    score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';
    
  const benchmark = getBenchmarkData();
  
  let percentile: number;
  if (score >= benchmark.statistics.p90) {
    percentile = 90 + Math.round((score - benchmark.statistics.p90) / (100 - benchmark.statistics.p90) * 10);
  } else if (score >= benchmark.statistics.p75) {
    percentile = 75 + Math.round((score - benchmark.statistics.p75) / (benchmark.statistics.p90 - benchmark.statistics.p75) * 15);
  } else if (score >= benchmark.statistics.p50) {
    percentile = 50 + Math.round((score - benchmark.statistics.p50) / (benchmark.statistics.p75 - benchmark.statistics.p50) * 25);
  } else if (score >= benchmark.statistics.p25) {
    percentile = 25 + Math.round((score - benchmark.statistics.p25) / (benchmark.statistics.p50 - benchmark.statistics.p25) * 25);
  } else {
    percentile = Math.round((score / benchmark.statistics.p25) * 25);
  }
  percentile = Math.max(1, Math.min(99, percentile));
  
  return { score, grade, percentile };
}

export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case 'A': return '#00e676';
    case 'B': return '#00e5ff';
    case 'C': return '#ffab00';
    case 'D': return '#ff6d00';
    case 'F': return '#ff1744';
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return '#00e676'; // A
  if (score >= 60) return '#00e5ff'; // B
  if (score >= 40) return '#ffab00'; // C
  if (score >= 20) return '#ff6d00'; // D
  return '#ff1744'; // F
}

// ═══════════════════════════════════════
// DORA METRICS
// ═══════════════════════════════════════

export function calculateDORA(
  cicd: CICDResult | null,
  reviews: ReviewResult | null
): DORAMetrics {
  // Deployment Frequency
  const dfValue = cicd ? cicd.avgDailyRuns : 0;
  const dfClass: DORAClass = dfValue >= 1 ? 'ELITE' : dfValue >= 1 / 7 ? 'HIGH' :
    dfValue >= 1 / 30 ? 'MEDIUM' : 'LOW';

  // Lead Time for Changes
  const ltHours = reviews ? reviews.medianMergeTimeHours : 0;
  const ltClass: DORAClass = ltHours < 1 ? 'ELITE' : ltHours < 168 ? 'HIGH' :
    ltHours < 720 ? 'MEDIUM' : 'LOW';

  // Change Failure Rate
  const cfr = cicd ? (100 - cicd.successRate) : 0;
  const cfrClass: DORAClass = cfr < 5 ? 'ELITE' : cfr < 10 ? 'HIGH' :
    cfr < 15 ? 'MEDIUM' : 'LOW';

  // MTTR (estimated)
  const mttrHours = cicd && cicd.flakyRate > 0 ? 
    Math.max(0.5, cicd.avgDurationMinutes / 60 * 2) : null;
  const mttrClass: DORAClass = !mttrHours ? 'HIGH' :
    mttrHours < 1 ? 'ELITE' : mttrHours < 24 ? 'HIGH' :
    mttrHours < 168 ? 'MEDIUM' : 'LOW';

  const classScores = { ELITE: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const avg = [dfClass, ltClass, cfrClass, mttrClass]
    .reduce((sum, c) => sum + classScores[c], 0) / 4;
  const overall: DORAClass = avg >= 3.5 ? 'ELITE' : avg >= 2.5 ? 'HIGH' :
    avg >= 1.5 ? 'MEDIUM' : 'LOW';

  return {
    deploymentFrequency: { value: dfValue, unit: 'deploys/day', classification: dfClass },
    leadTimeForChanges: { medianHours: ltHours, classification: ltClass },
    changeFailureRate: { percentage: cfr, classification: cfrClass },
    meanTimeToRecovery: { medianHours: mttrHours, classification: mttrClass },
    overallClassification: overall,
  };
}

// ═══════════════════════════════════════
// FRICTION COST CALCULATOR
// ═══════════════════════════════════════

export function calculateFrictionCost(
  cicd: CICDResult | null,
  reviews: ReviewResult | null,
  deps: DependencyResult | null,
  hourlyRate: number = 75,
  teamSize?: number,
  docStalenessFactor: number = 0
): FrictionCostBreakdown {
  const WORK_DAYS = 22;
  const CONTEXT_SWITCH_MULT = 1.5;

  // CI bottleneck cost
  const excessMin = Math.max(0, (cicd?.avgDurationMinutes || 0) - 5);
  const dailyRuns = cicd?.avgDailyRuns || 10;
  const estTeam = teamSize || Math.max(3, Math.min(20, Math.round(dailyRuns / 3)));
  const ciHours = (excessMin / 60) * dailyRuns * WORK_DAYS * CONTEXT_SWITCH_MULT;
  const ciCost = Math.round(ciHours * hourlyRate);

  // Review delay cost
  const prsPerWeek = (reviews?.totalPRsAnalyzed || 0) / 13;
  const contextSwitchHours = prsPerWeek * 4 * (23 / 60);
  const reviewCost = Math.round(contextSwitchHours * hourlyRate);

  // Stale PR cost
  const staleCount = reviews?.stalePRs.length || 0;
  const staleCost = Math.round(staleCount * 3 * hourlyRate);

  // Vulnerability risk cost
  const vulns = deps?.vulnerabilities || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  const vulnCost = (vulns.critical * 2700) + (vulns.high * 900) + (vulns.medium * 300);

  // Outdated deps maintenance
  const outdatedCost = Math.round((deps?.outdatedCount || 0) * 0.5 * hourlyRate);

  // Doc staleness cost
  const docHours = Math.round((docStalenessFactor / 100) * 40); 
  const docCost = Math.round(docHours * hourlyRate);

  // Structural Pathology Cost (Complexity Drag)
  // We estimate that complexity > 10 adds 15m of overhead per file/month for maintenance/bugs
  const avgComplexity = (cicd as any)?.quality?.avgComplexity || 12; // Fallback or dynamic
  const totalFiles = (cicd as any)?.quality?.totalFiles || 0;
  const complexityFactor = Math.max(0, avgComplexity - 10);
  const structuralHours = Math.round(complexityFactor * totalFiles * 0.25);
  const structuralCost = structuralHours * hourlyRate;

  const total = ciCost + reviewCost + staleCost + vulnCost + outdatedCost + docCost + structuralCost;

  return {
    total,
    annualProjection: total * 12,
    ciBottleneck: {
      cost: ciCost,
      hoursWasted: Math.round(ciHours),
      description: `${excessMin.toFixed(1)}min excess × ${dailyRuns.toFixed(0)} runs/day × ${estTeam} devs`,
    },
    reviewDelay: {
      cost: reviewCost,
      hoursWasted: Math.round(contextSwitchHours),
      description: `${prsPerWeek.toFixed(0)} PRs/wk × 23min context switch`,
    },
    stalePRs: {
      cost: staleCost,
      hoursWasted: staleCount * 3,
      description: `${staleCount} stale PRs × 3h conflict resolution`,
    },
    vulnerabilities: {
      cost: vulnCost,
      hoursWasted: 0,
      riskExposure: vulns.critical + vulns.high,
      description: `${vulns.critical} critical + ${vulns.high} high severity`,
    },
    outdatedDeps: {
      cost: outdatedCost,
      hoursWasted: Math.round((deps?.outdatedCount || 0) * 0.5),
      description: `${deps?.outdatedCount || 0} packages behind latest`,
    },
    docStaleness: {
      cost: docCost,
      hoursWasted: docHours,
      description: docStalenessFactor > 0 ? `${docStalenessFactor}% stale docs → onboarding delays, wrong instructions` : 'Documentation is up to date',
    },
    structuralPathology: {
      cost: structuralCost,
      hoursWasted: structuralHours,
      description: `Avg Complexity ${avgComplexity.toFixed(1)} (>10) adds structural drag to ${totalFiles} files`,
    }
  } as any;
}


// ═══════════════════════════════════════
// CROSS-SIGNAL CORRELATIONS
// ═══════════════════════════════════════

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 5) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
  const num = (n * sumXY) - (sumX * sumY);
  const den = Math.sqrt(((n * sumX2) - sumX * sumX) * ((n * sumY2) - sumY * sumY));
  return den === 0 ? 0 : num / den;
}

export function detectCorrelations(
  cicd: CICDResult | null,
  reviews: ReviewResult | null
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];
  if (!reviews || !cicd) return insights;

  // PR Size ↔ Review Delay
  if (reviews.prData.length >= 5) {
    const prSizes = reviews.prData.map(p => p.linesChanged);
    const reviewTimes = reviews.prData.map(p => p.reviewTimeHours);
    const r = pearsonCorrelation(prSizes, reviewTimes);

    if (r > 0.4 && reviews.xlPrPercentage > 12) {
      insights.push({
        type: 'reinforcing_loop',
        signals: ['xl_prs', 'review_latency', 'stale_prs', 'ci_flakes'],
        description: `Large PRs correlate with slow reviews (r=${r.toFixed(2)}). ${reviews.xlPrPercentage.toFixed(0)}% of PRs are XL (>1000 lines). This creates a reinforcing loop: Large PRs → Slow Reviews → Stale PRs → Merge Conflicts → Even Larger PRs.`,
        breakPoint: 'Enforce PR size limits (< 500 LOC)',
        compoundImpact: Math.round(6 + r * 8),
        confidence: r,
      });
    }
  }

  // Reviewer bottleneck
  if (reviews.giniCoefficient > 0.4 && reviews.stalePrRate > 10) {
    insights.push({
      type: 'reinforcing_loop',
      signals: ['reviewer_concentration', 'review_delay', 'stale_prs'],
      description: `Uneven reviewer load (Gini=${reviews.giniCoefficient.toFixed(2)}). Top reviewer handles ${reviews.reviewerLoad[0]?.percentage.toFixed(0) || '?'}% of reviews. This bottleneck causes ${reviews.stalePRs.length} stale PRs.`,
      breakPoint: 'Add CODEOWNERS with round-robin assignment',
      compoundImpact: 10,
      confidence: 0.65,
    });
  }

  // CI flakes → reruns
  if (cicd.flakyRate > 8 && cicd.avgDurationMinutes > 10) {
    insights.push({
      type: 'reinforcing_loop',
      signals: ['flaky_tests', 'pipeline_duration', 'developer_trust'],
      description: `${cicd.flakyRate.toFixed(0)}% flaky rate inflates pipeline time. Developers rerun CI, further increasing average duration (${cicd.avgDurationMinutes.toFixed(1)}min).`,
      breakPoint: 'Quarantine flaky tests into non-blocking job',
      compoundImpact: 8,
      confidence: 0.7,
    });
  }

  return insights;
}

// ═══════════════════════════════════════
// WHAT-IF SIMULATION
// ═══════════════════════════════════════

export function simulateFixes(results: FullScanResult): SimulationResult[] {
  const simulations: SimulationResult[] = [];

  if (results.cicd && results.cicd.bottleneckStage.percentage > 40) {
    const modified = JSON.parse(JSON.stringify(results.cicd)) as CICDResult;
    modified.avgDurationMinutes *= 0.65;
    modified.bottleneckStage.percentage *= 0.5;
    const newCiScore = calculateCICDScore(modified);
    const newDx = calculateDXScore({ ...results.scores, cicd: newCiScore });
    const newCost = calculateFrictionCost(modified, results.reviews, results.deps);
    simulations.push({
      fixType: 'parallelize_ci',
      title: `Parallelise CI stages (fix ${results.cicd.bottleneckStage.name} bottleneck)`,
      originalDxScore: results.dxScore,
      projectedDxScore: newDx.score,
      scoreChange: newDx.score - results.dxScore,
      originalGrade: results.grade,
      projectedGrade: newDx.grade,
      monthlySavings: results.frictionCost.total - newCost.total,
    });
  }

  if (results.reviews && results.reviews.xlPrPercentage > 10) {
    const modified = JSON.parse(JSON.stringify(results.reviews)) as ReviewResult;
    modified.xlPrPercentage *= 0.3;
    modified.medianReviewTimeHours *= 0.6;
    const newRevScore = calculateReviewScore(modified);
    const newDx = calculateDXScore({ ...results.scores, reviews: newRevScore });
    const newCost = calculateFrictionCost(results.cicd, modified, results.deps);
    simulations.push({
      fixType: 'enforce_pr_size',
      title: 'Enforce PR size limit (< 500 LOC)',
      originalDxScore: results.dxScore,
      projectedDxScore: newDx.score,
      scoreChange: newDx.score - results.dxScore,
      originalGrade: results.grade,
      projectedGrade: newDx.grade,
      monthlySavings: results.frictionCost.total - newCost.total,
    });
  }

  if (results.deps && (results.deps.vulnerabilities.critical > 0 || results.deps.vulnerabilities.high > 0)) {
    const modified = JSON.parse(JSON.stringify(results.deps)) as DependencyResult;
    modified.vulnerabilities.critical = 0;
    modified.vulnerabilities.high = Math.max(0, modified.vulnerabilities.high - 2);
    modified.vulnerabilities.total = modified.vulnerabilities.medium + modified.vulnerabilities.low + modified.vulnerabilities.high;
    const newDepScore = calculateDepScore(modified);
    const newDx = calculateDXScore({ ...results.scores, deps: newDepScore });
    const newCost = calculateFrictionCost(results.cicd, results.reviews, modified);
    simulations.push({
      fixType: 'fix_critical_vulns',
      title: 'Update packages with critical/high vulnerabilities',
      originalDxScore: results.dxScore,
      projectedDxScore: newDx.score,
      scoreChange: newDx.score - results.dxScore,
      originalGrade: results.grade,
      projectedGrade: newDx.grade,
      monthlySavings: results.frictionCost.total - newCost.total,
    });
  }

  if (results.reviews && results.reviews.giniCoefficient > 0.35) {
    const modified = JSON.parse(JSON.stringify(results.reviews)) as ReviewResult;
    modified.giniCoefficient *= 0.5;
    const newRevScore = calculateReviewScore(modified);
    const newDx = calculateDXScore({ ...results.scores, reviews: newRevScore });
    simulations.push({
      fixType: 'rebalance_reviewers',
      title: 'Rebalance reviewer load with CODEOWNERS',
      originalDxScore: results.dxScore,
      projectedDxScore: newDx.score,
      scoreChange: newDx.score - results.dxScore,
      originalGrade: results.grade,
      projectedGrade: newDx.grade,
      monthlySavings: Math.round(results.frictionCost.reviewDelay.cost * 0.3),
    });
  }

  if (results.repo.docStalenessFactor > 30) {
    const newDx = calculateDXScore(results.scores, 0);
    simulations.push({
      fixType: 'update_stale_docs',
      title: 'Update stale documentation (README/Wiki)',
      originalDxScore: results.dxScore,
      projectedDxScore: newDx.score,
      scoreChange: newDx.score - results.dxScore,
      originalGrade: results.grade,
      projectedGrade: newDx.grade,
      monthlySavings: Math.round(results.repo.docStalenessFactor * 15),
    });
  }

  return simulations.sort((a, b) => b.monthlySavings - a.monthlySavings);
}
