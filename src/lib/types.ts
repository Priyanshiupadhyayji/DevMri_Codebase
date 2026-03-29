// ═══════════════════════════════════════
// DevMRI — Complete Type Definitions
// ═══════════════════════════════════════

export interface RepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  defaultBranch: string;
  language: string | null;
  stars: number;
  openIssues: number;
  createdAt: string;
  lastPush: string;
  docStalenessFactor: number; // 0-100, higher means more stale vs code
}

// ═══════════════ CI/CD ═══════════════

export interface PipelineStage {
  name: string;
  avgDurationMinutes: number;
  maxDurationMinutes: number;
  successRate: number;
  percentage: number;
  status: 'healthy' | 'warning' | 'bottleneck';
}

export interface TrendPoint {
  runNumber: number;
  date: string;
  durationMinutes: number;
  conclusion: string;
}

export interface CICDResult {
  totalRuns: number;
  avgDurationMinutes: number;
  successRate: number;
  flakyRate: number;
  bottleneckStage: { name: string; avgMinutes: number; percentage: number };
  stages: PipelineStage[];
  buildTimeTrend: TrendPoint[];
  trendDirection: 'improving' | 'stable' | 'worsening';
  trendSlope: number;
  failureHeatmap: number[][];
  peakFailureHour: number;
  peakFailureDay: string;
  avgDailyRuns: number;
  workflowFiles: Record<string, string>; // Raw content of .github/workflows/*.yml
  jobLogInsights?: Array<{
    jobName: string;
    bottlenecks: Array<{
      stepName: string;
      duration: number;
      percentage: number;
      opportunity: string | null;
    }>;
    insights: string[];
    recommendations: Array<{
      title: string;
      description: string;
      estimatedSavings: number;
      difficulty: 'easy' | 'medium' | 'hard';
      example: string;
    }>;
  }>;
  flakyTestDetails?: {
    flakyCount: number;
    flakyPercentage: number;
    likelyProblems: string[];
  };
}

// ═══════════════ CODE REVIEW ═══════════════

export interface ReviewerStats {
  login: string;
  reviewCount: number;
  percentage: number;
  avgResponseTimeHours: number;
}

export interface StalePR {
  number: number;
  title: string;
  author: string;
  daysOpen: number;
  linesChanged: number;
}

export interface PRDataPoint {
  number: number;
  title: string;
  linesChanged: number;
  reviewTimeHours: number;
  size: 'S' | 'M' | 'L' | 'XL';
  author: string;
}

export interface ReviewResult {
  totalPRsAnalyzed: number;
  medianReviewTimeHours: number;
  medianMergeTimeHours: number;
  prSizeDistribution: { S: number; M: number; L: number; XL: number };
  xlPrPercentage: number;
  reviewerLoad: ReviewerStats[];
  giniCoefficient: number;
  loadBalance: 'even' | 'moderate' | 'uneven' | 'critical';
  stalePRs: StalePR[];
  stalePrRate: number;
  selfMergeRate: number;
  avgReviewDepth: number;
  reviewTimeline: { within2h: number; within8h: number; within24h: number; within48h: number; beyond48h: number };
  prData: PRDataPoint[];
}

// ═══════════════ DEPENDENCIES ═══════════════

export interface VulnSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface VulnDetail {
  package: string;
  version: string;
  vulnId: string;
  severity: string;
  summary: string;
  fixedIn: string | null;
}

export interface FreshnessItem {
  package: string;
  installed: string;
  latest: string;
  isOutdated: boolean;
  license: string;
}

export interface LicenseRisk {
  package: string;
  license: string;
  risk: 'high' | 'medium' | 'low';
}

export interface DependencyResult {
  ecosystem: string;
  totalDeps: number;
  totalDevDeps: number;
  vulnerabilities: VulnSummary;
  vulnDetails: VulnDetail[];
  outdatedCount: number;
  outdatedPercentage: number;
  freshness: FreshnessItem[];
  licenseRisks: LicenseRisk[];
  riskyLicenseCount: number;
}

// ═══════════════ DORA METRICS ═══════════════

export type DORAClass = 'ELITE' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DORAMetrics {
  deploymentFrequency: { value: number; unit: string; classification: DORAClass };
  leadTimeForChanges: { medianHours: number; classification: DORAClass };
  changeFailureRate: { percentage: number; classification: DORAClass };
  meanTimeToRecovery: { medianHours: number | null; classification: DORAClass };
  overallClassification: DORAClass;
}

// ═══════════════ BUS FACTOR ═══════════════

export interface KnowledgeSilo {
  directory: string;
  ownerlogin: string;
  ownershipPercentage: number;
  risk: 'high' | 'medium' | 'low';
}

export interface BusFactorResult {
  busFactor: number;
  riskLevel: 'critical' | 'moderate' | 'healthy';
  topContributors: { login: string; commits: number; percentage: number }[];
  knowledgeSilos: KnowledgeSilo[];
}

// ═══════════════ SECURITY POSTURE ═══════════════

export interface SecurityPosture {
  branchProtection: boolean;
  requireReviews: boolean;
  requireStatusChecks: boolean;
  hasLicense: boolean;
  hasCodeowners: boolean;
  hasSecurityPolicy: boolean;
  hasContributing: boolean;
  communityHealthPct: number;
  score: number;
}

// ═══════════════ COMMIT HYGIENE ═══════════════

export interface CommitHygieneResult {
  conventionalPct: number;
  avgMessageLength: number;
  shortMessagePct: number;
  prefixDistribution: Record<string, number>;
  score: number;
}

// ═══════════════ TRACK D: CODE QUALITY ═══════════════

export interface CodeQualityResult {
  avgLinesPerFile: number;
  totalFiles: number;
  filesOver300LOC: number;
  filesOver150LOC: number;
  avgComplexity: number;
  complexityDistribution: {
    low: number;      // complexity < 5
    medium: number;   // 5-15
    high: number;     // 15-30
    critical: number; // > 30
  };
  hasComplexityGates: boolean;
  hasLinterConfig: boolean;
  score: number;
  healthScore: number;
}

// ═══════════════ TRACK F: DEVELOPER FLOW ═══════════════

export interface DeveloperFlowResult {
  onboardingFrictionScore: number; // 0-100, higher = more friction
  hasDockerCompose: boolean;
  hasMakefile: boolean;
  hasDevConfig: boolean;
  setupTimeEstimateMinutes: number;
  prReviewSLA: number | null; // hours to first review
  asyncReviewSupport: boolean;
  autoAssignReviewers: boolean;
  prSizeLimits: boolean;
  medianReviewTimeHours: number;
  score: number;
}

// ═══════════════ TRACK H: ENVIRONMENT INTEGRITY ═══════════════

export interface EnvironmentIntegrityResult {
  hasNvmrc: boolean;
  hasNodeVersionFile: boolean;
  hasEnvExample: boolean;
  hasLockFile: boolean;
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  environmentDriftRisk: 'critical' | 'high' | 'medium' | 'low';
  reproducibilityScore: number; // 0-100
  requiredEnvVars: string[];
  envVarsDocumented: boolean;
  ciEnvironmentConsistent: boolean;
  recommendations: string[];
  score: number;
}

// ═══════════════ SCORES ═══════════════

export interface ModuleScores {
  [key: string]: number;
  cicd: number;
  reviews: number;
  deps: number;
  security: number;
  commitHygiene: number;
  busFactor: number;
  quality: number;    // Track D
  flow: number;       // Track F
  environment: number; // Track H
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// ═══════════════ FRICTION COST ═══════════════

export interface FrictionCostItem {
  cost: number;
  hoursWasted: number;
  description: string;
}

export interface FrictionCostBreakdown {
  total: number;
  annualProjection: number;
  ciBottleneck: FrictionCostItem;
  reviewDelay: FrictionCostItem;
  stalePRs: FrictionCostItem;
  vulnerabilities: FrictionCostItem & { riskExposure: number };
  outdatedDeps: FrictionCostItem;
  docStaleness: FrictionCostItem;
}

// ═══════════════ CORRELATIONS ═══════════════

export interface CorrelationInsight {
  type: 'reinforcing_loop' | 'causal' | 'correlation';
  signals: string[];
  description: string;
  breakPoint: string;
  compoundImpact: number;
  confidence: number;
}

// ═══════════════ SIMULATION ═══════════════

export interface SimulationResult {
  fixType: string;
  title: string;
  originalDxScore: number;
  projectedDxScore: number;
  scoreChange: number;
  originalGrade: Grade;
  projectedGrade: Grade;
  monthlySavings: number;
}

// ═══════════════ AI DIAGNOSIS ═══════════════

export interface Recommendation {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  codeExample: string | null;
  metric: string;
  currentValue: string;
  frictionCost: number;
  projectedScoreChange: number;
  verificationMetric: string;
}

export interface RecoveryPlan {
  currentScore: number;
  projectedScore: number;
  currentGrade: string;
  projectedGrade: string;
  totalMonthlySavings: number;
  implementationTimeline: string;
}

export interface FrictionLoop {
  description: string;
  signals: string[];
  breakPoint: string;
  compoundImpact: number;
}

export interface AIDiagnosis {
  recommendations: Recommendation[];
  recoveryPlan: RecoveryPlan;
  frictionLoops: FrictionLoop[];
}

// ═══════════════ FRICTION HEATMAP ═══════════════

export interface Hotspot {
  path: string;
  churn: number;
  complexity: number;
  cost: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  owner: string;
  isDeepScan?: boolean;
  healthScore?: number;
}

export interface FrictionHeatmap {
  hotspots: Hotspot[];
  totalChurn: number;
}

// ═══════════════ ORPHANED CODE / TISSUE NECROSIS (Feature #3) ═══════════════

export interface NecrosisFile {
  path: string;
  lastModified: string;
  daysSinceModified: number;
  size: number;
  importCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface NecrosisScan {
  orphanedFiles: NecrosisFile[];
  totalWastedSize: number;
  riskScore: number;
  impactDescription: string;
}

// ═══════════════ FULL SCAN RESULT ═══════════════

export interface FullScanResult {
  repo: RepoMetadata;
  cicd: CICDResult | null;
  reviews: ReviewResult | null;
  deps: DependencyResult | null;
  dora: DORAMetrics | null;
  busFactor: BusFactorResult | null;
  heatmap: FrictionHeatmap | null;
  necrosis: NecrosisScan | null;
  security: SecurityPosture | null;
  commitHygiene: CommitHygieneResult | null;
  quality: CodeQualityResult | null;     // Track D
  flow: DeveloperFlowResult | null;      // Track F
  environment: EnvironmentIntegrityResult | null; // Track H
  scores: ModuleScores;
  dxScore: number;
  grade: Grade;
  percentile: number;
  frictionCost: FrictionCostBreakdown;
  correlations: CorrelationInsight[];
  simulation: SimulationResult[];
  aiDiagnosis: AIDiagnosis | null;
  mlForecast: MLForecast | null;
  predictivePathology: PredictivePathology | null;
  flakyRate: number;
  mlSource: 'python' | 'js_fallback';
  scanDuration: number;
  timestamp: string;
}

// ═══════════════ SCAN PROGRESS (SSE) ═══════════════

export interface ScanProgress {
  module: 'cicd' | 'reviews' | 'deps' | 'dora' | 'busFactor' | 'security' | 'commitHygiene' | 'ai';
  status: 'scanning' | 'complete' | 'error';
  percent: number;
  message?: string;
  score?: number;
}

// ═══════════════ CHAT ═══════════════

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

// ═══════════════ ML SERVICE TYPES ═══════════════

export interface FlakyClassification {
  is_flaky: boolean;
  confidence: number;
  reason: string;
}

export interface ForecastPoint {
  date: string;
  predicted_score: number;
  lower: number;
  upper: number;
}

export interface MLForecast {
  forecast: ForecastPoint[];
  mae: number;
  days_until_grade_d: number;
}

// ═══════════════ PREDICTIVE PATHOLOGY ═══════════════

export interface AttritionRisk {
  maintainer: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  knowledgeLossPercentage: number;
  filesAtRisk: string[];
  ownershipPercentage: number;
  lastActive: string;
  daysSinceLastCommit: number;
  recommendation: string;
}

export interface HotspotPrediction {
  path: string;
  currentChurn: number;
  predictedChurn3Months: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  churnVelocity: number;
  complexityTrend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
}

export interface BottleneckForecast {
  stageName: string;
  currentAvgMinutes: number;
  predicted3Months: number;
  daysUntilThreshold: number;
  criticalThreshold: number;
  trendDirection: 'improving' | 'stable' | 'worsening';
  recommendation: string;
}

export interface DeliveryPrognosis {
  currentVelocity: number;
  predictedVelocity: number;
  sprintCompletionDate: string;
  onTrack: boolean;
  confidence: number;
  factors: { name: string; impact: 'positive' | 'negative' | 'neutral' }[];
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface PredictivePathology {
  attritionRisks: AttritionRisk[];
  hotspotPredictions: HotspotPrediction[];
  bottleneckForecasts: BottleneckForecast[];
  deliveryPrognosis: DeliveryPrognosis | null;
  healthScore12Months: number;
  projectedGrade12Months: Grade;
  generatedAt: string;
}

export interface CICDRunWithML extends PipelineRun {
  is_flaky?: boolean;
  flaky_confidence?: number;
  flaky_reason?: string;
}

// ═══════════════ UPDATED CICD RESULT ═══════════════

export interface PipelineRun {
  id: number;
  sha: string;
  branch: string;
  conclusion: string;
  status: string;
  created_at: string;
  updated_at: string;
  duration_minutes?: number;
}

// ═══════════════ BEFORE/AFTER COMPARISON ═══════════════

export interface ScoreSnapshot {
  timestamp: string;
  dxScore: number;
  grade: string;
  scores: Record<string, number>;
  frictionCost: number;
  recommendation: string;
}

export interface BeforeAfterComparison {
  repositoryName: string;
  currentSnapshot: ScoreSnapshot;
  projectedSnapshot: ScoreSnapshot;
  scoreDifference: number;
  gradeDifference: string;
  costSavings: number;
  appliedRecommendations: string[];
  timeToImplement: string;
}
