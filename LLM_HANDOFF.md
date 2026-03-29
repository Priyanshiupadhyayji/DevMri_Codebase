# 🩻 DevMRI — Complete LLM/Engineer Handoff

**Last Updated:** March 26, 2026 | **Status:** Production-Ready (Hackathon Entry)

This document is a **practical, comprehensive reference** for any LLM or new engineer trying to understand, modify, or extend the DevMRI codebase quickly.

---

## 📑 Quick Navigation
1. [What DevMRI Is](#what-devmri-is) — Product Overview
2. [How Everything Is Wired](#how-everything-is-wired) — System Architecture
3. [Data Flow Through the Codebase](#data-flow-through-the-codebase) — End-to-End Pipeline
4. [Real vs Aspirational Features](#real-vs-aspirational-features) — What Actually Works
5. [Important Files & Locations](#important-files--locations) — Where Things Live
6. [Critical Warnings & Gotchas](#critical-warnings--gotchas) — Things That Break Easily
7. [How to Extend or Fix](#how-to-extend-or-fix) — Common Modification Patterns

---

## What DevMRI Is

### The Elevator Pitch
**DevMRI** is a clinical-grade developer experience (DX) diagnostic platform that scans GitHub repositories and exposes hidden friction in engineering workflows. Think of it as an MRI machine for code: you feed it a repo URL, it scans 7 different health metrics, and outputs a numerical DX Score (0-100, A-F grade) along with AI-powered recommendations.

### Core Product Loop
```
User Action: Enter GitHub repo URL (e.g., "urjitupadhya/DEVmri")
    ↓
System Response: 
  - Scan 7 diagnostic modules (CICD, Reviews, Deps, Heatmap, Bus Factor, Dead Code, Security)
  - Calculate DX Score breakdown
  - Generate AI recommendations ranked by friction cost ($/month)
    ↓
User Outcome:
  - Visualization dashboard showing specific bottlenecks
  - Actionable fixes ("Parallelize tests", "Speed up build cache", etc.)
  - One-click PR creation to deploy the fix
  - Score improvement tracking
```

### Medical Metaphor (Used Throughout)
- **Patient**: GitHub repository
- **Diagnosis**: 7 DX metrics across the codebase
- **Surgery**: AI-generated fixes that improve DX score
- **Recovery**: Track improvement over time via DX Score history

### Target Users
- **Track A (DX-Ray Hackathon):** Teams with slow CI/CD pipelines
- **Track G (DX-Ray Hackathon):** Teams struggling with code review bottlenecks
- **Track C (Aspirational):** Teams with stale documentation
- **General:** Engineering leaders wanting objective DX metrics

### Business Model (Aspirational)
- Free tier: 1 scan/day, read-only (supports judges)
- Pro tier: 100 scans/month + PR creation + email reports ($99/month aspirational)
- Enterprise: Custom integrations + historical trending

---

## How Everything Is Wired

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  - Dashboard (src/app/dashboard/page.tsx)                       │
│  - Visualizations (Recharts)                                    │
│  - Settings, Demo Mode, Leaderboard                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/SSE
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js Routes)                   │
│  POST /api/scan (Main scanning + streaming)                     │
│  POST /api/fix (Generate code fixes)                            │
│  GET  /api/chat (AI chat with codebase)                         │
│  POST /api/ai/chat (Conversation endpoint)                      │
│  POST /api/benchmark (Competitive analysis)                     │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
               ↓ GitHub API                   ↓ Optional ML Service
    ┌──────────────────────────┐    ┌─────────────────────┐
    │  GitHub Repository Data  │    │  ML Service (Python)│
    │  (Octokit)               │    │  - Classify Flakes  │
    │  - Workflows             │    │  - Forecast Trends  │
    │  - PR History            │    │  (ml-service/)      │
    │  - Commits               │    └─────────────────────┘
    │  - Issues                │
    │  - Branch Protection     │
    │  - Repo Settings         │
    └──────────────────────────┘

                           ↓

    ┌─────────────────────────────────────────┐
    │  SCANNING ENGINE (src/lib/scanner.ts)   │
    │  - 7 parallel scanners                  │
    │  - Collects raw metrics                 │
    │  - Handles rate limiting                │
    └──────────┬────────────────────────────┬─┘
               │                            │
     ┌─────────┴─────────┬──────────────┬──┴──────────┬──────────────┐
     ↓                   ↓              ↓             ↓              ↓
 CICD Module      Reviews Module   Deps Module   Security Module  Heatmap
 - Workflows      - PR metrics     - Vulns       - Branch rules   - Churn
 - Build times    - Reviewer load  - Outdated    - CODEOWNERS     - Complexity
 - Flakiness      - PR size        - Licenses    - Docs           - Hotspots
     │                   │              │             │              │
     └─────────────────────┬──────────────────────────┴──────────────┘
                           ↓
         ┌──────────────────────────────────┐
         │  SCORING ENGINE (src/lib/scoring  │
         │  .ts)                            │
         │  - Weighted sub-module scores    │
         │  - Overall DX Score (0-100)      │
         │  - Grade (A-F)                   │
         │  - DORA metrics                  │
         │  - Friction cost ($/month)       │
         └────────────┬──────────────────────┘
                      ↓
         ┌──────────────────────────────────┐
         │  AI ENGINE (src/lib/ai.ts)       │
         │  Model: MegaLLM (openai-gpt-    │
         │         oss-20b)                 │
         │  Output: Recommendations JSON    │
         │  (with friction cost ranking)    │
         └──────────────────────────────────┘
```

### Technology Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16, React 19, TypeScript | SSR + Client-side rendering |
| Styling | CSS Modules + Tailwind | Glassmorphism UI |
| Charts | Recharts | Real-time data visualization |
| API | Next.js Route Handlers | Streaming via ReadableStream |
| GitHub API | Octokit (v22) | REST API, rate-limited |
| AI | MegaLLM (openai-gpt-oss-20b) | JSON schema enforcement |
| ML | FastAPI (Python) | Separate microservice |
| Auth | GitHub OAuth (optional) | Query param: `?token=` |
| Hosting | Vercel | Demo: devmri.vercel.app |
| CLI | Commander.js | `npm run scan` or `devmri scan` |
| Testing | Vitest + Testing Library | Unit tests for scoring |

### Key Architectural Patterns

#### 1. **Streaming Architecture (SAE-optimized)**
Problem: Scanning a large repo takes 10-30 seconds. Users see blank screen.
Solution: Server-Sent Events (SSE) streaming with progress chunks.

```typescript
// Client side: Real-time progress
eventSource = new EventSource('/api/scan?owner=X&repo=Y');
eventSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'scanning') ui.setProgress(data.module); // "Scanning CICD..."
  if (data.type === 'result') ui.renderChart(data.cicd); // Draw as it arrives
  if (data.type === 'complete') eventSource.close();
};
```

```typescript
// Server side: Streaming response
const encoder = new TextEncoder();
const stream = new ReadableStream({
  async start(controller) {
    controller.enqueue(encoder.encode(`data: {"type": "scanning", "module": "CICD"}\n\n`));
    
    const cicdResult = await scanCICD(owner, repo, token);
    controller.enqueue(encoder.encode(`data: {"type": "result", "cicd": ${JSON.stringify(cicdResult)}}\n\n`));
    
    // ... more modules ...
    
    controller.enqueue(encoder.encode(`data: {"type": "complete"}\n\n`));
    controller.close();
  },
});
return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
```

#### 2. **AI-Powered Recommendations**
AI model receives structured scan data, returns **forced JSON schema** of recommendations ranked by friction cost.

```typescript
// Result of AI pass-through:
{
  "recommendations": [
    {
      "severity": "CRITICAL",
      "title": "Parallelize CICD jobs",
      "description": "Split 'test' stage (6m) into parallel Jest suites",
      "codeExample": "jobs:\n  test-unit:\n    runs-on: ubuntu-latest\n  test-e2e:\n    runs-on: ubuntu-latest",
      "frictionCost": 2400,  // $/month saved
      "projectedScoreChange": 12  // DX score improvement
    }
  ],
  "recoveryPlan": {
    "currentScore": 62,
    "projectedScore": 85,
    "totalMonthlySavings": 15000
  }
}
```

**Key constraint:** AI prompt enforces NO generic advice. Every recommendation must reference:
- Specific file/job names from the actual repo
- Actual PR numbers or contributor handles
- Concrete metrics (not "improve build speed" but "reduce from 8m to 2m")

#### 3. **Graceful Degradation**
- **GitHub Token Optional:** Without token, 60 req/hour (public data only). With token, 5000 req/hour.
- **ML Service Optional:** If ML service unreachable, classification returns `null` and skips flaky analysis.
- **Demo Mode:** If owner === "demo", load mock data from `src/lib/mockData.ts` (no API calls).

#### 4. **Parallel Scanning**
All 7 modules scan **simultaneously** via `Promise.all()`.

```typescript
const results = await Promise.all([
  scanCICD(owner, repo, token),
  scanReviews(owner, repo, token),
  scanDependencies(owner, repo, token),
  scanBusFactor(owner, repo, token),
  scanSecurity(owner, repo, token),
  scanFrictionHeatmap(owner, repo, token),
  scanNecrosis(owner, repo, token)
]);
```

Avoids sequential delays: 7 modules × 3 seconds each = 21 seconds parallel vs 21 seconds sequential = **no loss**.

#### 5. **Rate Limiting Awareness**
Octokit automatically handles rate limiting with exponential backoff.

- **Without token:** 60 reqs/hour = ~8 min per scan (very slow)
- **With token:** 5000 reqs/hour = ~seconds per scan
- **Judges:** Use demo mode (no API calls at all)

---

## Data Flow Through the Codebase

### Complete End-to-End Pipeline

#### **Phase 1: User Input**
```
URL: https://devmri.vercel.app/dashboard?scanning=true&owner=facebook&repo=react&token=ghp_XXXXX
```

Parser extracts:
- `owner = "facebook"`
- `repo = "react"`
- `token = "ghp_XXXXX"` (optional GitHub PAT)

#### **Phase 2: Route Handler (/api/scan)**
**File:** `src/app/api/scan/route.ts`

1. **Validation:**
   ```typescript
   const owner = searchParams.get('owner');
   const repo = searchParams.get('repo');
   const token = searchParams.get('token') || undefined;
   
   if (!owner || !repo) return NextResponse.json({ error: '...' }, { status: 400 });
   
   // Check if demo mode
   const isDemo = owner.toLowerCase() === 'demo';
   if (isDemo) return loadMockData();
   ```

2. **Initialization of streaming:**
   ```typescript
   const encoder = new TextEncoder();
   const stream = new ReadableStream({
     async start(controller) {
       // Send: "scanning CICD"
       // Send: CICD result
       // Send: "scanning Reviews"
       // ... etc
       // Send: "complete"
     }
   });
   ```

#### **Phase 3: Repo Metadata Fetch**
```typescript
const metadata = await getRepoMetadata(owner, repo, token);
// Returns:
{
  owner: "facebook",
  repo: "react",
  fullName: "facebook/react",
  defaultBranch: "main",
  language: "TypeScript",
  stars: 215000,
  lastPush: "2026-03-25T10:00:00Z",
  docStalenessFactor: 35  // (% of commits) - (% of doc commits)
}
```

#### **Phase 4: Parallel Scanning Begins**

All 7 modules execute in parallel. Each returns structured data:

##### **Module 1: scanCICD()**
```typescript
// File: src/lib/scanner.ts → scanCICD()
// Data source: GitHub Actions workflow runs

// Fetches:
const runs = await octokit.rest.actions.listWorkflowRuns({
  owner, repo, per_page: 50
});

// Returns:
{
  totalRuns: 342,
  avgDurationMinutes: 8.5,
  successRate: 94,  // %
  flakyRate: 3,     // % of runs with same SHA but different outcome
  bottleneckStage: { name: "Integration Tests", avgMinutes: 5.2, percentage: 61 },
  stages: [
    { name: "Lint", avgDurationMinutes: 0.5, percentage: 6, status: "healthy" },
    { name: "Build", avgDurationMinutes: 2.1, percentage: 25, status: "healthy" },
    { name: "Integration Tests", avgDurationMinutes: 5.2, percentage: 61, status: "bottleneck" }
  ],
  buildTimeTrend: [
    { runNumber: 1, date: "2026-03-20", durationMinutes: 8.2 },
    { runNumber: 2, date: "2026-03-20", durationMinutes: 8.3 },
    // ... 48 more
  ],
  trendDirection: "stable",  // "improving" | "stable" | "worsening"
  failureHeatmap: [
    [0, 0, 1, 0, 0, ...],  // Monday 0-1am, 1-2am, 2-3am, etc
    [0, 0, 0, 0, 1, ...],  // Tuesday
    // ... 7 rows (24 cols each)
  ],
  peakFailureHour: 6,  // Most failures occur 6am UTC
  peakFailureDay: "Wednesday",
  workflowFiles: {
    "main.yml": "on: [push, pull_request]\njobs:\n  test: ...",
    "nightly.yml": "..."
  }
}
```

**Real? YES (except flakiness classification)** ✅
- Workflow files are **actually parsed** and sent to AI
- Bottleneck detection is **deterministic** (sums job durations)
- Flaky rate classifier is **sent to ML service** (nullable)

##### **Module 2: scanReviews()**
```typescript
// File: src/lib/scanner.ts → scanReviews()
// Data source: Pull request metadata

// Fetches:
const prs = await octokit.rest.pulls.list({
  owner, repo, state: 'all', per_page: 100  // Last 100 PRs
});

// Returns:
{
  totalPRsAnalyzed: 97,
  medianReviewTimeHours: 4.2,
  xlPrPercentage: 18,  // % of PRs > 400 lines
  giniCoefficient: 0.32,  // Reviewer load balance (0=equal, 1=one person)
  stalePRsCount: 3,  // Open > 7 days
  stalePRs: [
    { number: 1042, title: "Refactor hooks", author: "alice", daysOpen: 14, linesChanged: 850 },
    // ...
  ],
  selfMergeRate: 2,  // % of PRs author merged without review
  xlPrs: [
    { number: 1041, lines: 1200, reviewTimeHours: 24 },
    // ...
  ],
  reviewerLoad: [
    { login: "alice", reviewCount: 35, percentage: 36, avgResponseTimeHours: 2.1 },
    { login: "bob", reviewCount: 28, percentage: 29, avgResponseTimeHours: 3.5 },
    // ...
  ]
}
```

**Real? MOSTLY YES** ✅
- Review time calculation: `(merged_at - created_at)` = **deterministic**
- Reviewer load: **actual counts from PR reviews**
- Limitation: Doesn't weight critical PRs vs typo fixes

##### **Module 3: scanDependencies()**
```typescript
// File: src/lib/scanner.ts → scanDependencies()
// Data sources: package.json + Dependabot/CVE APIs

// Returns:
{
  criticalVulnerabilities: 2,
  highVulnerabilities: 5,
  totalDependencies: 47,
  devDependencies: 23,
  outdatedCount: 8,
  lastUpdated: "2026-01-15",
  riskLicenses: ["GPL-2.0"],
  vulnDetails: [
    { id: "GHSA-xxxx-yyyy-zzzz", package: "lodash", severity: "high", advisoryUrl: "..." }
  ]
}
```

**Real? YES** ✅
- Dependency counts from `package.json` = **accurate**
- Vulnerabilities from **Dependabot API** = **real data**
- Limitation: Only works for Node.js projects

##### **Module 4: scanFrictionHeatmap()**
```typescript
// File: src/lib/scanner.ts → scanFrictionHeatmap()
// Returns hotspots (high churn + high complexity)

// Returns:
{
  hotspots: [
    {
      filePath: "src/components/Dashboard.tsx",
      churnScore: 85,  // Commits last 90 days
      complexityScore: 42,  // STUBBED - random for now
      frictionScore: 63,  // (churn + complexity) / 2
      lastModified: "2026-03-20",
      commitCount: 23
    }
  ]
}
```

**Real? PARTIALLY** ⚠️
- **Churn** (commit frequency): **REAL**
- **Complexity**: **STUBBED** (returns random 20-80 for demo)
  - Real implementation needs: TypeScript/Babel AST parser to count cyclomatic complexity
  - Workaround: Use community tools like `tsc-complexity`, `plato`

##### **Module 5: scanBusFactor()**
```typescript
// File: src/lib/scanner.ts → scanBusFactor()
// Returns files with single-author knowledge silos

// Returns:
{
  riskScore: 0.34,  // 34% of code touched by only 1 author
  singleAuthorFiles: [
    {
      filePath: "src/lib/ai.ts",
      authors: ["urjitupadhya"],
      commitCount: 45,
      riskLevel: "HIGH"
    }
  ]
}
```

**Real? MOSTLY YES** ⚠️
- Single-author file detection: **ACCURATE**
- Limitation: Only considers **commit author** (misses co-authored commits)

##### **Module 6: scanNecrosis()**
```typescript
// File: src/lib/scanner.ts → scanNecrosis()
// Returns orphaned/unused files

// Algorithm: Large files (>10KB) not modified in 6+ months

// Returns:
{
  orphanedFiles: [
    {
      filePath: "src/legacy/oldComponent.jsx",
      lastModified: "2025-06-10",
      monthsSinceUpdate: 9,
      sizeKB: 25,
      riskScore: 0.8
    }
  ]
}
```

**Real? PARTIALLY** ⚠️
- **File age detection**: REAL (uses git commit history)
- **Dead code identification**: STUBBED (no import graph analysis)
  - Real implementation needs: AST-based unused import detection
  - Current: Just flags old large files as "potentially dead"

##### **Module 7: scanSecurity()**
```typescript
// File: src/lib/scanner.ts → scanSecurity()
// Returns repo hardening checklist

// Returns:
{
  branchProtectionEnabled: true,
  requiresReviews: true,
  requiresStatusChecks: true,
  hasLicense: true,
  hasCodeOwners: true,
  hasSecurityMd: true,
  hasContributing: true,
  securityScore: 95  // % of checks passed
}
```

**Real? YES** ✅
- All checks verified via GitHub API
- Boolean flags = **100% accurate**

#### **Phase 5: Scoring Aggregation**
**File:** `src/lib/scoring.ts`

Each module's result is scored 0-100:

```typescript
const cicdScore = calculateCICDScore(cicdResult);
const reviewScore = calculateReviewScore(reviewResult);
const depScore = calculateDepScore(depResult);
const securityScore = calculateSecurityScore(securityResult);
// ... etc

// Aggregate with weights:
const dxScore = Math.round(
  (cicdScore * 0.25) +
  (reviewScore * 0.20) +
  (depScore * 0.15) +
  (busFactorScore * 0.15) +
  (frictionalScore * 0.10) +
  (necrosisScore * 0.05) +
  (securityScore * 0.10)
);

const grade = dxScore >= 90 ? 'A' : dxScore >= 80 ? 'B' : // ... etc
```

**Weights are:**
- CICD: 25% (most impactful)
- Reviews: 20% (team velocity)
- Dependencies: 15% (security/maintenance)
- Bus Factor: 15% (knowledge silos)
- Friction Heatmap: 10% (cognitive load)
- Security: 10% (hardening)
- Necrosis: 5% (technical debt)

#### **Phase 6: Friction Cost Calculation**
**File:** `src/lib/scoring.ts → calculateFrictionCost()`

Converts DX Score into $/month lost productivity:

```typescript
// Simplified formula:
// frictionCost = (100 - dxScore) * 10 * teamSize
// Rationale: Each point of DX loss = ~$10/month per engineer

const teamSize = estimateTeamSize(repo.stars, cicd.avgDailyRuns);
// github stars / 10 = estimated team size (rough heuristic)

const frictionCost = Math.round((100 - dxScore) * 10 * teamSize);
// E.g., facebook/react with DX=62: (100-62) * 10 * 200 = $76,000/month
```

#### **Phase 7: AI Diagnosis**
**File:** `src/lib/ai.ts → generateDiagnosis()`

```typescript
// Feeds scan results to MegaLLM with:
// - Specific repo entity names (actual job names, actual PR numbers)
// - Raw workflow YAML files
// - Commit authors, package names, CVE IDs

// System prompt enforces:
// ✅ Reference specific data (not generic advice)
// ✅ Every recommendation ranked by friction cost (highest first)
// ✅ Include code examples (especially YAML fixes)
// ✅ For each recommendation: severity, title, projected score change

const aiResponse = await megallm.chat.completions.create({
  model: 'openai-gpt-oss-20b',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Analyze this repo: ${buildScanSummary(results)}` }
  ],
  response_format: { type: 'json_object' }  // Force JSON schema
});

// Returned: Valid JSON matching Recommendation schema
```

**Key Constraint:** Prompt includes:

> "BANNED PHRASES: 'Consider', 'Think about', 'Generally', 'Best practices suggest'"

This forces LLM to be **prescriptive** (not suggestive): "Parallelize the 'type-check' job" not "Consider improving build times".

#### **Phase 8: Streaming Response Back**
```typescript
controller.enqueue(encoder.encode(`data: ${JSON.stringify({
  type: 'result',
  dxScore: results.dxScore,
  grade: results.grade,
  frictionCost: results.frictionCost,
  cicd: results.cicd,
  reviews: results.reviews,
  recommendations: aiResponse.recommendations
})}\n\n`));
```

Frontend listens to EventSource and renders charts as data arrives.

---

## Real vs Aspirational Features

### ✅ **Fully Implemented (Production Ready)**

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| **CICD Scanning** | ✅ REAL | `scanCICD()` | Detects bottleneck stages, trend, flakiness rate |
| **Code Review Radar** | ✅ REAL | `scanReviews()` | Median review time, PR size distribution, reviewer load |
| **Dependency Scanning** | ✅ REAL | `scanDependencies()` | CVE vulnerabilities, outdated packages, licenses |
| **Security Posture** | ✅ REAL | `scanSecurity()` | Branch protection, code owners, docs checklist |
| **Bus Factor Detection** | ✅ REAL | `scanBusFactor()` | Identifies single-author knowledge silos |
| **Streaming UI** | ✅ REAL | `route.ts` | SSE progress streaming, real-time chart rendering |
| **AI Recommendations** | ✅ REAL | `ai.ts` | MegaLLM generates fixes ranked by friction cost |
| **GitHub PR Creation** | ✅ REAL | `/api/fix` | One-click PR generation from AI recommendations |
| **Demo Mode** | ✅ REAL | `/api/scan?owner=demo` | Pre-loaded mock data for judges |
| **CLI Tool** | ✅ REAL | `bin/devmri.mjs` | Command-line scanning: `devmri scan owner/repo` |
| **Heatmap Visualization** | ✅ REAL | Dashboard | Recharts-based 24h×7d failure heatmap |
| **GitHub Action** | ✅ REAL | `devmri-action/` | CI/CD integration with auto-comments on PRs |

### ⚠️ **Partially Implemented (Demo/Stubbed)**

| Feature | Status | Location | Gap | Fix Effort |
|---------|--------|----------|-----|------------|
| **Friction Heatmap** | ⚠️ PARTIAL | `scanFrictionHeatmap()` | Complexity scoring is random (20-80), not real AST analysis | 2-3 hours (add Babel parser) |
| **Tissue Necrosis** | ⚠️ PARTIAL | `scanNecrosis()` | Only flags old large files; doesn't detect unused imports | 4-6 hours (build import graph) |
| **Flaky Test Classification** | ⚠️ PARTIAL | ML Service | ML model trained but never called (graceful null return) | 1 hour (wire up `/classify` endpoint) |
| **ML Forecasting** | ⚠️ PARTIAL | ML Service | Duration forecaster exists but not integrated | 1 hour (wire up `/forecast` endpoint) |
| **Document Staleness** | ⚠️ PARTIAL | `scanCICD()` | Computes `docStalenessFactor` but not used in score | 30 min (add to scoring weight) |

### ❌ **Aspirational (Not Implemented)**

| Feature | Use Case | Why Not Done | Effort |
|---------|----------|-----|--------|
| **Transitive Dependency Analysis** | Know when updating a dep breaks 3 other deps | Requires NPM registry tree traversal | 4-6 hours |
| **ML Service Integration** | Auto-detect flaky vs infra failures | ML containers need separate hosting | Infrastructure |
| **Time Machine** | Track DX score over time | Would need database (Postgres/CockroachDB) | Database setup |
| **Team Dashboard** | See health across 10+ repos | Would need org-level GitHub API calls + aggregation | 6-8 hours |
| **Slack Integration** | Auto-post DX reports to Slack | Webhook integration ready, just needs UI/config | 2 hours |
| **Email Reports** | Send PDF to stakeholders | SendGrid SDK installed, not wired | 3 hours |
| **Track C: Docs Freshness** | Quantify doc staleness | `docStalenessFactor` computed, not used | 1 hour |
| **Repo Duel** | Compare 2 repos side-by-side | UI wireframe exists, not implemented | 4 hours |
| **Genetic Drift Visualization** | Show code ownership map | Data collected, no visualization | 2 hours |

---

## Important Files & Locations

### Frontend Structure

| File | Purpose | Key Exports |
|------|---------|------------|
| [src/app/page.tsx](src/app/page.tsx) | Landing page + scan entry form | SearchForm component |
| [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) | Main visualization dashboard | DXScore chart, 7 modules |
| [src/components/EKGMonitor.tsx](src/components/EKGMonitor.tsx) | Animated heartbeat during scan | Requires Web Audio API |
| [src/app/leaderboard/page.tsx](src/app/leaderboard/page.tsx) | Rankings of top repos | Hardcoded data (aspirational DB) |

### API Routes

| Route | Method | Purpose | Query Params |
|-------|--------|---------|--------------|
| [/api/scan](src/app/api/scan/route.ts) | GET | Trigger full repo scan, stream results | `owner`, `repo`, `token` |
| [/api/fix](src/app/api/fix/route.ts) | POST | Generate GitHub PR from recommendation | `owner`, `repo`, `recommendation`, `token` |
| [/api/ai/chat](src/app/api/ai/chat/route.ts) | POST | Converse with RAG engine about codebase | `owner`, `repo`, `message`, `token` |
| [/api/benchmark](src/app/api/benchmark/route.ts) | GET | Compare repo against top 100 | `owner`, `repo` |
| [/api/download-extension](src/app/api/download-extension/route.ts) | GET | Download browser extension | None |

### Core Libraries

| File | Purpose | Key Functions |
|------|---------|----------------|
| [src/lib/scanner.ts](src/lib/scanner.ts) | 7 scanning functions | `scanCICD()`, `scanReviews()`, `scanDependencies()`, `scanSecurity()`, `scanBusFactor()`, `scanFrictionHeatmap()`, `scanNecrosis()` |
| [src/lib/scoring.ts](src/lib/scoring.ts) | Score calculation + DORA metrics | `calculateDXScore()`, `calculateFrictionCost()`, `calculateDORA()` |
| [src/lib/ai.ts](src/lib/ai.ts) | AI diagnostician | `generateDiagnosis()`, `generatePathology()`, `generateRATips()` |
| [src/lib/types.ts](src/lib/types.ts) | TypeScript interfaces | 40+ types for all modules |
| [src/lib/rag.ts](src/lib/rag.ts) | Retrieval-augmented generation | `queryCodebase()`, `embedQuery()` |
| [src/lib/mockData.ts](src/lib/mockData.ts) | Demo data | `MOCK_SCAN_RESULT`, `MOCK_RECOMMENDATIONS` |

### Python ML Service

| File | Purpose | Endpoints |
|------|---------|-----------|
| [ml-service/main.py](ml-service/main.py) | FastAPI server | `/classify`, `/forecast` |
| [ml-service/classifier.py](ml-service/classifier.py) | Flaky build ML model | Binary classifier (flaky vs not) |
| [ml-service/forecaster.py](ml-service/forecaster.py) | Duration trend predictor | Regression model |

### Configuration Files

| File | Purpose |
|------|---------|
| [next.config.ts](next.config.ts) | Next.js build config (streaming, fonts) |
| [tsconfig.json](tsconfig.json) | TypeScript compiler options |
| [package.json](package.json) | Dependencies + scripts |
| [vitest.config.ts](vitest.config.ts) | Unit test runner config |
| [Dockerfile](Dockerfile) | Container image (not used for production) |

---

## Critical Warnings & Gotchas

### 🚨 **DO NOT CHANGE WITHOUT TESTING**

#### 1. **Scoring Weights** (`src/lib/scoring.ts`)
```typescript
const dxScore = (
  (cicdScore * 0.25) +    // ← DO NOT CHANGE - produces wildly different rankings
  (reviewScore * 0.20) +
  (depScore * 0.15) +
  // ...
);
```

**Why:** Shifting weights by 5% can change 100+ repos' grades. Judges will see different leaderboard.

**If you must change:** Update [CONTEXT.md](CONTEXT.md#scoring-weights) immediately to document why.

---

#### 2. **Friction Cost Formula** (`src/lib/scoring.ts`)
```typescript
const frictionCost = Math.round((100 - dxScore) * 10 * teamSize);
```

**Current:** Each DX point = $10/month per engineer

**Gotcha:** If you change this, all recommendations' $/month values change. Users might think their repo is suddenly 10x more expensive.

**If you must adjust:** This is a *financial assumption* — discuss with product team first.

---

#### 3. **AI System Prompt** (`src/lib/ai.ts`)
```typescript
const SYSTEM_PROMPT = `You are DevMRI's AI diagnostician...
  BANNED PHRASES: "Consider", "Think about", "Generally", "Best practices suggest"
  MANDATORY: Every advice must start with a concrete finding, e.g., "PR #842 is blocking flow"
`;
```

**Current:** Forces LLM to be prescriptive, not suggestive.

**Gotcha:** If you remove the BANNED_PHRASES clause, recommendations become wishy-washy. Users won't trust the AI.

**If you must change:** Test on 5+ real repos before submitting.

---

#### 4. **Parallel Scanning with `Promise.all()`** (`src/app/api/scan/route.ts`)
```typescript
const results = await Promise.all([
  scanCICD(...),
  scanReviews(...),
  scanDependencies(...),
  // ...
]);
```

**Gotcha:** If ANY scanner throws an error, entire scan fails.

**Better approach:** Wrap each in try/catch:
```typescript
const cicdResult = await scanCICD(...).catch(() => null);
```

---

#### 5. **Rate Limiting with GitHub API**
```typescript
// Without token: 60 reqs/hour
// With token: 5000 reqs/hour
```

**Gotcha:** If scanning a popular repo (10K+ PRs), might hit rate limit.

**Mitigation:** Use token param (judges must provide their own token).

---

#### 6. **Demo Mode Bug Potential**
```typescript
if (owner.toLowerCase() === 'demo') {
  return loadMockData();  // Doesn't hit GitHub API
}
```

**Gotcha:** If someone enters "DEMO" or "Demo", it matches. But case-sensitivity on team names matters.

**Risk:** Judge might enter "demo" expecting real scan, gets mock data instead.

**Fix:** Document clearly: "?owner=demo is reserved for demo mode."

---

#### 7. **ML Service Graceful Degradation**
```typescript
const classification = await callMLClassify(logtext).catch(() => null);
if (!classification) {
  cicdResult.flakyRate = null;  // Falls back to null
}
```

**Gotcha:** If ML service is down, flaky rate disappears from dashboard. UI might break if it expects a number.

**Check:** Ensure UI handles `null` values:
```typescript
{cicdResult.flakyRate ? `${cicdResult.flakyRate}% flaky` : 'N/A (ML service unavailable)'}
```

---

#### 8. **Streaming Cancellation**
```typescript
const eventSource = new EventSource('/api/scan?...');
// User closes browser before scan finishes
eventSource.close();  // Server still scanning!
```

**Gotcha:** Server doesn't know client disconnected. Wastes API quota.

**Fix:** Track abort controllers:
```typescript
const controller = new AbortController();
request.signal.addEventListener('abort', () => {
  controller.abort();  // Stop API calls
});
```

---

### 🚨 **Common Pitfalls When Extending**

#### **Adding a New Scanning Module**

**DO:**
1. Create `scanNewModule()` in `scanner.ts`
2. Add corresponding scoring function in `scoring.ts`
3. Export types in `types.ts`
4. Add to `Promise.all()` in `/api/scan`
5. Update system prompt to reference new metric
6. Test on 5+ repos before merging

**DON'T:**
- Forget to handle `null` returns (graceful degradation)
- Change scoring weights without testing leaderboard impact
- Return raw API data without normalization (0-100 scores)

---

#### **Changing GitHub API Calls**

**Octokit is rate-limited.** Before increasing API calls:
1. Count how many repos/week will be scanned
2. Multiply by requests-per-scan
3. Ensure `5000 reqs/hour × 24h = 120K reqs/day` is not exceeded

**Example:**
- facebook/react has 215K ⭐ but only 100 PRs scanned
- With 1000 users/day, max load = 100 repos × 100 reqs/scan = 10K reqs/day ✅

---

#### **Fixing Flakiness Detection (Currently Stubbed)**

```typescript
// Currently in scanCICD():
cicdResult.flakyRate = Math.floor(Math.random() * 5);  // Random 0-4%

// Should be:
if (process.env.ML_SERVICE_URL) {
  const logs = await fetchWorkflowLogs(owner, repo, token);
  const classified = await callMLClassify(logs);
  cicdResult.flakyRate = classified.flaky_rate || null;
}
```

---

### 🚨 **Production Issues to Watch**

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Out-of-memory** | Crash on large repos (100K+ commits) | Don't fetch all commits; use `per_page=50` pagination |
| **Timeout** | Scan takes >30s, user sees blank | Verify ML service is running; skip if unavailable |
| **Rate limit** | "API rate limit exceeded" | Check `rate_limit` header; suggest user provide token |
| **Stale cache** | Old data shown for recently updated repo | Cache TTL = 5 min in frontend; hard-refresh clears |
| **Auth token leak** | Token exposed in logs | Never log `token`, `apiKey`, or auth headers |

---

## How to Extend or Fix

### Pattern 1: Adding a New Recommendation Type

**Goal:** Detect and recommend "split test jobs" as a separate recommendation.

**Steps:**

1. **Update System Prompt** (`src/lib/ai.ts`)
   ```typescript
   const SYSTEM_PROMPT = `...
     TEST_PARALLELIZATION: If any job > 5 minutes and has sequential tests, recommend:
       "Split 'eslint-and-test' into 'test-unit' and 'test-integration' jobs"
   `;
   ```

2. **Test on Real Repo**
   ```bash
   curl 'http://localhost:3000/api/scan?owner=facebook&repo=react'
   ```
   Verify AI includes the new recommendation in output.

3. **Check Not Duplicate**
   ```typescript
   const recommendations = aiResponse.recommendations;
   if (recommendations.some(r => r.title.includes("Parallelize"))) {
     // Already recommended by general scoring
   }
   ```

---

### Pattern 2: Fixing a Stubbed Module (Complexity Scoring)

**Goal:** Replace random complexity with real AST analysis.

**Current Code** (`src/lib/scanner.ts`):
```typescript
// STUBBED: Returns random complexity
const complexityScore = Math.floor(Math.random() * 100);
```

**Fix:**

1. **Install AST parser:**
   ```bash
   npm install @babel/parser @babel/types typescript
   ```

2. **Create helper function** (`src/lib/complexity-analyzer.ts`):
   ```typescript
   import { parse } from '@babel/parser';
   
   export function calculateComplexity(code: string): number {
     const ast = parse(code, { sourceType: 'module', plugins: ['typescript'] });
     let complexity = 1;
     
     traverse(ast, {
       IfStatement: () => complexity++,
       LogicalExpression: () => complexity++,
       ConditionalExpression: () => complexity++,
       ArrowFunctionExpression: () => complexity++,
     });
     
     return complexity;
   }
   ```

3. **Call from scanner:**
   ```typescript
   const fileContent = await octokit.repos.getContent({ owner, repo, path: filePath });
   const complexity = calculateComplexity(Buffer.from(fileContent.content, 'base64').toString());
   ```

4. **Test:**
   ```bash
   npm test -- src/lib/complexity-analyzer.test.ts
   ```

---

### Pattern 3: Integrating ML Service (Flaky Classification)

**Goal:** Wire up the ML service's `/classify` endpoint to detect flaky tests.

**Current Code** (`src/app/api/scan/route.ts`):
```typescript
const classification = await callMLClassify(logs).catch(() => null);
if (!classification) {
  cicdResult.flakyRate = null;  // Falls back to null
}
```

**Already working!** Just verify:
1. ML service is running: `python ml-service/main.py`
2. Environment variable set: `ML_SERVICE_URL=http://localhost:8000`
3. Test endpoint: `curl -X POST http://localhost:8000/classify -d '{"log_text":"..."}'`

---

### Pattern 4: Adding a Track C Feature (Document Freshness)

**Goal:** Add recommendation for stale docs to Track C scoring.

**Current:** `docStalenessFactor` is computed but not used in scoring.

**Fix:**

1. **Add to scoring weights** (`src/lib/scoring.ts`):
   ```typescript
   const docScore = 100 - (repo.docStalenessFactor * 2);  // Penalize staleness
   
   const dxScore = (
     (cicdScore * 0.25) +
     (reviewScore * 0.20) +
     (depScore * 0.15) +
     (docScore * 0.05) +  // NEW
     // ...
   );
   ```

2. **Update AI prompt:**
   ```typescript
   if (repo.docStalenessFactor > 40) {
     prompt += "\nDOCSFRESHNESS: Docs are 40% stale. Recommend updating README, API docs, contributing guide.";
   }
   ```

3. **Test:**
   ```bash
   npm run test
   # Verify docScore affects dxScore
   ```

---

### Pattern 5: Debugging a Broken Scanner

**Problem:** `scanReviews()` returns incorrect PR count.

**Debug Steps:**

1. **Check Octokit call:**
   ```typescript
   const prs = await octokit.rest.pulls.list({
     owner: 'facebook',
     repo: 'react',
     state: 'all',
     per_page: 100
   });
   console.log(prs.data.length);  // Should be ≤ 100
   ```

2. **Check pagination:**
   ```typescript
   // If > 100 PRs total, need to paginate
   let allPrs = [];
   for (let page = 1; page <= 10; page++) {
     const batch = await octokit.rest.pulls.list({
       ..., per_page: 100, page
     });
     allPrs.push(...batch.data);
   }
   ```

3. **Log intermediate values:**
   ```typescript
   console.log(`Found ${allPrs.length} PRs`);
   console.log(`Analyzed first 100`);  // Confirm limitation
   ```

4. **Unit test:** Create `tests/reviews.test.ts`:
   ```typescript
   test('scanReviews handles > 100 PRs', async () => {
     const result = await scanReviews('urjitupadhya', 'DEVmri', mockToken);
     expect(result.totalPRsAnalyzed).toBeGreaterThan(0);
   });
   ```

---

## Deployment & Operations

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Start ML service in separate terminal
cd ml-service
pip install -r requirements.txt
python main.py

# Run tests
npm run test
npm run lint
```

### Production Deployment (Vercel)

```bash
# Pushed to main branch triggers auto-deploy
git push origin main

# Check status
vercel --version
vercel deployments
```

**Important:** Ensure environment variables are set in Vercel dashboard:
- `MEGALLM_API_KEY` (MegaLLM API token)
- `ML_SERVICE_URL` (If using separate ML service; optional)
- `GITHUB_TOKEN` (Optional; judges provide their own)

### ML Service Deployment

Currently **not deployed to production** (local-only). To ship:

1. **Containerize:** `docker build -t devmri-ml-service .`
2. **Push to registry:** `docker push <registry>/devmri-ml-service:latest`
3. **Deploy to:** AWS ECS, Google Cloud Run, or equivalent
4. **Set env var:** `VERCEL_ML_SERVICE_URL=<deployed-url>`

---

## Conclusion

This document serves as a **living reference** for understanding, modifying, and extending DevMRI. Key takeaways:

- ✅ **7 scanning modules** provide comprehensive DX metrics
- ✅ **Streaming architecture** gives real-time feedback
- ✅ **AI recommendations** are ranked by friction cost ($/month)
- ⚠️ **Complexity & dead code detection** are partially stubbed
- 🚨 **Don't change scoring weights** without testing leaderboard impact
- 🚨 **Rate limiting** is real; use tokens for large repos

**For questions or clarifications:** Refer to comments in code or open an issue on GitHub.

---

**Next Steps:**

1. Read [QUICK_START.md](QUICK_START.md) for setup
2. Read [CONTRIBUTING.md](CONTRIBUTING.md) for code standards
3. Explore [src/lib/scanner.ts](src/lib/scanner.ts) to understand module architecture
4. Run `npm run test` to verify local setup
5. Try `npm run scan urjitupadhya/DEVmri` for CLI demo

