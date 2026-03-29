# 🩻 DevMRI — Comprehensive Codebase Context

**Last Updated:** March 24, 2026 | **For:** DX-Ray Hackathon (March 27-30, 2026)

---

## 📋 Quick Navigation
- [What DevMRI Is](#what-devmri-is) — Product Overview
- [7 Diagnostic Modules](#7-diagnostic-modules) — What Each Scans
- [Architecture & Data Flow](#architecture--data-flow) — How Everything Connects
- [Real vs Aspirational Features](#real-vs-aspirational-features) — What's Implemented
- [Key Files & Locations](#key-files--locations) — Where to Edit
- [Critical Warnings](#critical-warnings) — Things That Break Easily

---

## What DevMRI Is

**DevMRI** is a **clinical-grade developer experience diagnostic tool** that scans GitHub repositories and exposes hidden friction in engineering workflows.

### Core Metaphor: Medical X-Ray for Code
- **Patient**: A GitHub repository
- **Diagnosis**: Automated scanning across 7 DX modules
- **Surgery**: AI-powered fixes that generate deployable code
- **Recovery**: Track DX score improvement over time

### Primary Use Case
Engineer opens `devmri.vercel.app`, enters a GitHub repo URL, and gets:
1. **Overall DX Score** (0-100, A-F grade)
2. **7 diagnostic visualizations** showing specific bottlenecks
3. **AI recommendations** ranked by friction cost ($/month)
4. **One-click PR creation** to deploy the recommended fixes

### Target Users for DX-Ray Hackathon
- Track A: CI/CD pipeline slowness → DevMRI's CICD module
- Track B: Flaky tests → DevMRI's test flakiness detection
- Track G: PR review lag → DevMRI's Reviews module
- Track E: Dependency sprawl → DevMRI's Dependency module

---

## 7 Diagnostic Modules

Each module scans a specific aspect of developer experience. Here's what's implemented vs aspirational:

### ✅ **Module 1: CI/CD X-Ray** (REAL)
**What it scans:** Build pipeline performance, flakiness, bottlenecks

**Data collected from GitHub API:**
- Last 50 workflow runs
- Duration of each run
- Success/failure rate
- Failure heatmap (7 days × 24 hours)
- Per-stage metrics if available

**Logic:**
```
CI/CD Score = (successRate × 0.35) + (speedScore × 0.30) 
            + (flakyInverse × 0.20) + (bottleneckInverse × 0.15)
```

**Visualization in Dashboard:**
- Failure heatmap (24h × 7d grid)
- Average build duration trend
- Bottleneck stage breakdown (stacked bar chart)
- Peak failure hour/day

**File locations:**
- Scanner: [`src/lib/scanner.ts`](src/lib/scanner.ts#L60) → `scanCICD()`
- Scoring: [`src/lib/scoring.ts`](src/lib/scoring.ts) → `calculateCICDScore()`
- Data models: [`src/lib/types.ts`](src/lib/types.ts) → `CICDResult`

**Limitations (Real):**
- Only analyzes GitHub Actions, not GitLab CI/Jenkins/CircleCI
- No per-job logs (only run metadata)
- Doesn't understand flaky tests vs infra failures

**ML Enhancement (Aspirational):**
- ML service can classify flaky logs → `ml-service/classify` endpoint
- Trains on historical logs to distinguish flakiness patterns
- Currently **not integrated into dashboard** (ML server returns null if unreachable)

---

### ✅ **Module 2: Code Review Radar** (REAL)
**What it scans:** PR review latency, reviewer load balancing, PR size distribution

**Metrics:**
- Median time-to-first-review (hours)
- % of PRs > 400 lines (XL size)
- Reviewer load balance (Gini coefficient)
- % of PRs stale > 7 days
- % of PRs self-merged (risky)

**Logic:**
```
Review Score = (speedScore × 0.30) + (prSizeScore × 0.25)
             + (loadBalance × 0.20) + (staleInverse × 0.15)
             + (selfMergeInverse × 0.10)
```

**File locations:**
- Scanner: [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanReviews()`
- Scoring: [`src/lib/scoring.ts`](src/lib/scoring.ts) → `calculateReviewScore()`

**Limitations:**
- Only counts **created but not merged** PRs (draft PRs filtered)
- Reviewer "load" computed from raw PR count ÷ reviewer count (naive)
- Doesn't weight **critical PRs** differently from typo fixes

**Real Use Case:**
A dev team with 5 reviewers handling 200 PRs/month will see if one person is overloaded vs balanced distribution.

---

### ✅ **Module 3: Dependency X-Ray** (REAL)
**What it scans:** Package security, outdated versions, license risk, bloat

**Metrics:**
- Critical + high-severity vulnerabilities
- % of outdated packages
- Total deps (main + dev)
- Risky licenses (GPL, AGPL)

**Data sources:**
- `package.json` + `package-lock.json` (for prod + dev dep counts)
- GitHub's Dependabot vulnerability API
- License info from npm registry

**Logic:**
```
Dep Score = (vulnScore × 0.40) + (freshnessScore × 0.30)
          + (bloatScore × 0.20) + (licenseScore × 0.10)
```

**File locations:**
- Scanner: [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanDependencies()`
- Scoring: [`src/lib/scoring.ts`](src/lib/scoring.ts) → `calculateDepScore()`

**Limitations:**
- Only works for Node.js projects (looks for package.json)
- Doesn't analyze transitive dependencies deeply
- License risk is boolean (present/absent), not graduated

---

### ⚠️ **Module 4: Friction Heatmap** (PARTIALLY REAL)
**What it scans:** Code hotspots (high complexity + high churn)

**Definition:**
- **Churn**: How often a file is modified (commits last 90 days)
- **Complexity**: Cyclomatic complexity via AST analysis
- **Friction** = high churn + high complexity = cognitive load

**Status:**
- ✅ Collects file paths + commit counts
- ⚠️ Complexity analysis is **stubbed** (returns random scores for demo)
- **Real implementation would require AST parsing**

**File locations:**
- Scanner: [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanFrictionHeatmap()`
- Data model: [`src/lib/types.ts`](src/lib/types.ts) → `FrictionHeatmap`, `Hotspot`

**Aspirational fix:**
Replace stub with actual AST analysis using TypeScript/Babel parser.

---

### ⚠️ **Module 5: Genetic Drift (Bus Factor)** (PARTIALLY REAL)
**What it scans:** Knowledge silos — which files are owned by only 1-2 people

**Status:**
- ✅ Identifies files with single author
- ⚠️ Author identification uses only **commit author** (missing co-authors)
- **Risky siloed code correctly flagged**

**File locations:**
- Scanner: [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanBusFactor()`

---

### ⚠️ **Module 6: Tissue Necrosis (Dead Code)** (PARTIALLY REAL)
**What it scans:** Orphaned, unused files increasing cognitive load

**Status:**
- ⚠️ **Stub implementation** — identifies large files not modified in 6+ months
- ❌ **Does NOT actually detect unused code** (no AST-based import analysis)
- Real necrosis detection needs: import graph + no-incoming-edges analysis

**File locations:**
- Scanner: [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanNecrosis()`

---

### ✅ **Module 7: Security Posture** (REAL)
**What it scans:** Repository hardening — branch protection, code review gates, etc.

**Checks:**
- ✅ Branch protection enabled
- ✅ Require reviews before merge
- ✅ Require status checks passing
- ✅ Has LICENSE file
- ✅ Has CODEOWNERS file
- ✅ Has SECURITY.md
- ✅ Has CONTRIBUTING.md

**File locations:**
- Scanner: [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanSecurity()`
- Scoring: [`src/lib/scoring.ts`](src/lib/scoring.ts) → `calculateSecurityScore()`

---

## Architecture & Data Flow

### High-Level Flow

```
GitHub Repo
    ↓
[User enters "owner/repo" in UI]
    ↓
GET /api/scan?owner=X&repo=Y
    ↓
[Server: Octokit fetches repo metadata + runs]
    ↓
[7 parallel scanners collect metrics]
    ↓
[Scoring module calculates 7 sub-scores]
    ↓
[AI module (Gemini/MegaLLM) generates recommendations]
    ↓
[Stream JSON chunks back to client]
    ↓
[Dashboard renders visualizations + recommendations]
    ↓
[User clicks "Apply Fix" → Creates GitHub PR]
```

### Key Architectural Decisions

**1. Streaming Architecture**
- `/api/scan` uses **ReadableStream** (SSE — Server-Sent Events)
- Chunks sent incrementally so UI shows progress:
  ```
  data: {"type": "scanning", "module": "CICD"}
  data: {"type": "result", "cicd": {...}}
  data: {"type": "complete"}
  ```
- **Why:** 72-hour hackathon = user wants feedback fast, not wait for full scan

**2. AI on the Backend**
- Gemini API key stored server-side (not exposed to browser)
- AI generates recommendations based on scan results
- Recommendations returned as JSON schema (enforced via prompt)
- **Why:** Security + consistency of response format

**3. Optional Authentication**
- GitHub token is **optional** via `?token=` query param
- Without token: read-only, rate-limited to 60 req/hour
- With token: 5000 req/hour
- If no token: "/" shows demo mode with mock data
- **Why:** Lower barrier to entry for judges/users

**4. ML Service Decoupling**
- Flaky build classification runs in **separate Python FastAPI service**
- If ML service unreachable → falls back to null (graceful degradation)
- `ml-service/classify` endpoint accepts build logs, returns `{is_flaky: bool, confidence: float}`
- `ml-service/forecast` endpoint predicts CI/CD duration trends
- **Why:** ML models often need different runtime (Python/TensorFlow) vs Node

---

### Data Flow in /api/scan

**Step 1: User Input Validation**
```typescript
// src/app/api/scan/route.ts
const owner = searchParams.get('owner');
const repo = searchParams.get('repo');
const token = searchParams.get('token') || undefined;

if (!owner || !repo) return 400 error;
const isDemo = owner.toLowerCase() === 'demo';
```

**Step 2: Parallel Scanning** (inside stream)
```
await getRepoMetadata(owner, repo, token)
await scanCICD(owner, repo, token) →  CICD module
await scanReviews(owner, repo, token) → Reviews module
await scanDependencies(owner, repo, token) → Dependency module
await scanBusFactor(owner, repo, token) → Genetic Drift module
await scanSecurity(owner, repo, token) → Security module
await scanFrictionHeatmap(owner, repo, token) → Friction Heatmap
await scanNecrosis(owner, repo, token) → Necrosis module
```

**Step 3: Scoring**
```typescript
const cicdScore = calculateCICDScore(cicdResult);
const reviewScore = calculateReviewScore(reviewResult);
const depScore = calculateDepScore(depResult);
// etc...

const dxScore = calculateDXScore({ cicd, reviews, deps, ... });
// DX Score is weighted average of 7 modules
```

**Step 4: AI Analysis** (calls Gemini/MegaLLM)
```typescript
const diagnosis = await generateDiagnosis(scanResult, token);
// Diagnosis: structured JSON with recommendations + recovery plan
```

**Step 5: Stream Results to Client**
```typescript
send(JSON.stringify({ type: 'result', cicd: cicdResult }));
send(JSON.stringify({ type: 'result', reviews: reviewResult }));
// ... etc for all modules
send(JSON.stringify({ type: 'diagnosis', recommendations: [...] }));
send(JSON.stringify({ type: 'complete' }));
```

---

### Dashboard Reception & Rendering

**File:** [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx)

**What happens:**
1. Subscribe to `/api/scan` stream (EventSource)
2. As chunks arrive, update React state
3. Render charts using **Recharts** (BarChart, RadarChart, Treemap, etc.)
4. Display recommendations in a prioritized list
5. Show AI-generated "Surgery Theatre" fixes
6. "Apply Fix" button → POST to `/api/fix` → creates GitHub PR

**Interactive Elements (Real):**
- ✅ Manual pipeline stage drag-drop (recalculates score)
- ✅ Copy DX score badge code
- ✅ Download clinical PDF report
- ✅ Slack webhook integration (POST report to channel)

**Aspirational Interactive Elements:**
- ❌ "Undo" button for previous fixes
- ❌ Time machine (view DX score from 30 days ago)
- ❌ Team comparison tool
- ❌ Animated "CI/CD Surgery" with live code generation

---

## Real vs Aspirational Features

### ✅ IMPLEMENTED IN THIS HACKATHON BUILD

| Feature | Status | Location | Working? |
|---------|--------|----------|----------|
| **CICD Scanning** | ✅ REAL | `scanner.ts:scanCICD()` | Yes, production-ready |
| **Review Metrics** | ✅ REAL | `scanner.ts:scanReviews()` | Yes |
| **Dependency Scan** | ✅ REAL | `scanner.ts:scanDependencies()` | Yes |
| **Security Checks** | ✅ REAL | `scanner.ts:scanSecurity()` | Yes |
| **Bus Factor** | ⚠️ PARTIAL | `scanner.ts:scanBusFactor()` | Basic version works |
| **DX Score Calc** | ✅ REAL | `scoring.ts:calculateDXScore()` | Yes, weighted formula |
| **AI Recommendations** | ✅ REAL | `ai.ts:generateDiagnosis()` | Yes, via Gemini API |
| **One-Click PR Deploy** | ✅ REAL | `/api/fix` route | Yes, generates YAML/code |
| **Dashboard UI** | ✅ REAL | `dashboard/page.tsx` | Yes, Recharts visualizations |
| **Keyboard Shortcuts** | ✅ REAL | `dashboard/page.tsx` | CMD+K search, Shift+? help |
| **Demo Mode** | ✅ REAL | `mockData.ts` | Yes, no GitHub token needed |
| **GitHub Action** | ✅ REAL | `devmri-action/` | Yes, comments DX score on PRs |
| **CLI Tool** | ✅ REAL | `bin/devmri.mjs` | Yes, `devmri scan owner/repo` |
| **Friction Cost Calc** | ✅ REAL | `scoring.ts:calculateFrictionCost()` | Yes, $/month estimates |

### ⚠️ PARTIALLY IMPLEMENTED (Stubs or Incomplete)

| Feature | Status | Issue | Fallback |
|---------|--------|-------|----------|
| **Complexity/Heatmap** | ⚠️ STUB | No AST parsing | Returns random scores for demo |
| **Dead Code Detection** | ⚠️ STUB | No import graph analysis | Flags old files only |
| **ML Flaky Classification** | ⚠️ SERVICE | Requires Python server | Falls back to null if unreachable |
| **Time Machine** | ❌ STUB | No historical tracking | N/A |
| **Org Dashboard** | ❌ STUB | Single repo only | N/A |
| **Vocal Surgery** | ❌ STUB | Needs browser SpeechRecognition | N/A |

### ❌ NOT IMPLEMENTED (Aspirational)

| Feature | Why Missing | Workaround |
|---------|------------|-----------|
| **Multi-language Support** | Only detects Node.js deps | Can extend to Python/Go/Rust |
| **Non-GitHub Repos** | Only works with GitHub API | Would need GitLab/Gitea adapters |
| **Real-Time Monitoring** | No webhooks for live updates | Manual re-scan or CI integration |
| **Machine Learning Models** | Requires training data | ML service has stubs |
| **Database** | Stateless design (no persistence) | Everything recalculated per request |
| **Cost Breakdown by Person** | No commit attribution | Would need blame analysis + salary data |

---

## Key Files & Locations

### Core Logic (Read/Understand These First)

**Start here:**
- [`package.json`](package.json) — Dependencies, scripts, what "dev" command does
- [`src/lib/types.ts`](src/lib/types.ts) — All TypeScript interfaces (FullScanResult, CICDResult, etc.)
- [`src/lib/scanner.ts`](src/lib/scanner.ts) — Where GitHub API calls happen (1000 lines)
- [`src/lib/scoring.ts`](src/lib/scoring.ts) — Score calculations (400 lines)
- [`src/lib/ai.ts`](src/lib/ai.ts) — Gemini/MegaLLM integration (300 lines)

**API Routes:**
- [`src/app/api/scan/route.ts`](src/app/api/scan/route.ts) — Main scan endpoint (streaming)
- [`src/app/api/ai/chat/route.ts`](src/app/api/ai/chat/route.ts) — Chat with Gemini about results
- [`src/app/api/fix/route.ts`](src/app/api/fix/route.ts) — Generate GitHub PR with fix
- [`src/app/api/badge/route.ts`](src/app/api/badge/route.ts) — Embeddable DX score badge
- [`src/app/api/email/route.ts`](src/app/api/email/route.ts) — SendGrid email integration

**Dashboard UI:**
- [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) — Main dashboard (2000 lines, all charts/interactions)
- [`src/components/EKGMonitor.tsx`](src/components/EKGMonitor.tsx) — Animated heartbeat visualization
- [`src/components/MedicalCertificate.tsx`](src/components/MedicalCertificate.tsx) — Printable PDF report

**Utilities:**
- [`src/lib/mockData.ts`](src/lib/mockData.ts) — Demo data for judges (no GitHub token needed)
- [`src/lib/sounds.ts`](src/lib/sounds.ts) — MRI beep/scan audio effects
- [`src/lib/speech.ts`](src/lib/speech.ts) — Text-to-speech for surgeon narration
- [`src/lib/rag.ts`](src/lib/rag.ts) — Retrieval-augmented generation (chat with codebase)

**ML Service (Python):**
- [`ml-service/main.py`](ml-service/main.py) — FastAPI server
- [`ml-service/classifier.py`](ml-service/classifier.py) — Flaky build detection model
- [`ml-service/forecaster.py`](ml-service/forecaster.py) — CI/CD duration prediction model
- [`ml-service/requirements.txt`](ml-service/requirements.txt) — Python dependencies

**Testing:**
- [`tests/scoring.test.ts`](tests/scoring.test.ts) — Unit tests for scoring logic
- [`tests/api-scan.test.ts`](tests/api-scan.test.ts) — Integration tests for /api/scan
- [`vitest.config.ts`](vitest.config.ts) — Test runner config

**CLI Tool:**
- [`bin/devmri.mjs`](bin/devmri.mjs) — Executable: `devmri scan owner/repo`
- Can be run standalone without Next.js server

**GitHub Action:**
- [`devmri-action/action.yml`](devmri-action/action.yml) — Action metadata
- [`devmri-action/action.sh`](devmri-action/action.sh) — Runs scan, comments on PRs

---

## Critical Warnings

### ⚠️ DON'T BREAK THESE WITHOUT ASKING

**1. Octokit Token Handling**
- Line 15 in [`src/lib/scanner.ts`](src/lib/scanner.ts):
  ```typescript
  function createOctokit(token?: string): Octokit {
    return new Octokit({ auth: token || process.env.GITHUB_TOKEN });
  }
  ```
- **If you remove this:** Entire scanner breaks for users without tokens
- **Why it matters:** Demo mode (no token) is critical for judges

**2. Scoring Formula Weights**
- Line 340+ in [`src/lib/scoring.ts`](src/lib/scoring.ts):
  ```typescript
  const dxScore = Math.round(
    (scores.cicd * 0.30) + 
    (scores.reviews * 0.30) + 
    (scores.deps * 0.25) + 
    (docScore * 0.15)
  );
  ```
- **If you change weights:** All existing benchmark comparisons become invalid
- **Why:** Leaderboard rankings depend on this formula (public comparison)

**3. AI Prompt System Message**
- Line 12+ in [`src/lib/ai.ts`](src/lib/ai.ts)
- **BANNED PHRASES**: "Consider", "Think about", "Generally"
- **If you change to generic advice:** Recommendations become useless
- **Why:** Judges specifically eval for actionable + specific recommendations

**4. Stream Chunk Format**
- `/api/scan` sends chunks like:
  ```json
  data: {"type":"result","module":"cicd","data":{...}}
  ```
- **If you change format:** Dashboard stops receiving data
- **Why:** Client-side parser expects exact JSON format

**5. Mock Data for Demo Mode**
- [`src/lib/mockData.ts`](src/lib/mockData.ts) is hardcoded to trigger on `owner === "demo"`
- **If you remove this:** Users can't demo without GitHub token
- **Critical for hackathon:** Judges need instant demo without setup

**6. Dependency Calculation**
- `package.json` parsing assumes `dependencies` + `devDependencies` fields
- **Will break for:** Monorepos, workspaces, yarn, pnpm (different formats)
- **If designing new feature:** Plan for multi-package-manager support

---

## Common Gotchas & Debugging

### "Why can't I see any data?"
1. Check GitHub token: `echo $GITHUB_TOKEN`
2. Check rate limit: `curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit`
3. Is repo public? Private repos need token + personal access to see it
4. Try demo mode first: Enter `owner=demo&repo=anything`

### "Why is the DX score always the same?"
1. Scoring is **deterministic** = same repo = same score every time
2. Score changes **only** if repo data changes (new CI runs, new PRs, etc.)
3. Check the "7-day trend" — should show improvement if PRs merged

### "Why are recommendations generic?"
1. AI prompt requires specific repo data in the summary
2. Likely cause: Module returned null (e.g., no CI/CD workflows found)
3. Check network tab: Did `/api/scan` complete successfully?
4. Check console: Look for GitHub API 404 errors

### "Why doesn't 'Apply Fix' create a PR?"
1. Need valid GitHub **token** (read + write access)
2. Fork permissions required (can't push to original repo)
3. Check `/api/fix` response: "401 Unauthorized"?
4. Verify token has `repo` scope: `scopes: ["repo"]`

---

## Environment Variables

Create `.env.local` with:

```bash
# Required for AI recommendations
GEMINI_API_KEY=sk-...                  # Get from: aistudio.google.com

# Optional: For authenticated GitHub API (5000 req/hour vs 60)
GITHUB_TOKEN=ghp_...                   # Get from: github.com/settings/tokens

# Optional: For ML service integration
ML_SERVICE_URL=http://localhost:8000   # Flaky build classification

# Optional: For email integration
SENDGRID_API_KEY=SG...                 # Get from: sendgrid.com

# Optional: For Slack integration  
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

---

## How to Extend for DX-Ray Hackathon

### If targeting **Track A (CI Bottleneck Scanner)**
- Enhance `scanCICD()` to parse job logs
- Add **stage-by-stage breakdown** (not just total time)
- Integrate ML classifier to distinguish flaky vs slow
- Add "parallelization opportunity" detector
- **File to edit:** [`src/lib/scanner.ts`](src/lib/scanner.ts) + [`ml-service/classifier.py`](ml-service/classifier.py)

### If targeting **Track B (Test Health X-Ray)**
- Parse test output logs (Jest, Mocha, pytest)
- Identify **specific failing test names** + failure patterns
- Build test history database (track flakiness over time)
- Add "critical path test" detector
- **File to edit:** [`src/lib/scanner.ts`](src/lib/scanner.ts) → add `scanTestHealth()`

### If targeting **Track C (Docs Freshness Scan)**
- Detect stale docs: Compare `docs/` commit date to `src/` commit date
- Flag broken links (curl each link in .md files)
- Parse code examples from docs vs actual code (AST diff)
- **File to edit:** [`src/lib/scanner.ts`](src/lib/scanner.ts) → enhance existing `docStalenessFactor`

### If targeting **Track G (Code Review Radar)**
- Already 80% implemented!
- Enhance: Add **"stuck 3+ days without review"** alerts
- Add reviewer burnout detection (same person reviewing 30% of PRs)
- Add "PR complexity scoring" (not just line count)
- **File to edit:** [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanReviews()`

### If targeting **Track E (Dependency X-Ray)**
- Already implemented but missing **transitive deps analysis**
- Add supply chain risk scorer (how many devs maintain each dep?)
- Flag "deprecated" packages from npm registry
- Add "update fatigue" detector (too many deps updated recently = risk)
- **File to edit:** [`src/lib/scanner.ts`](src/lib/scanner.ts) → `scanDependencies()`

---

## Testing Your Changes

```bash
# Run unit tests
npm run test

# Run in watch mode (live reload on file change)
npm run test:watch

# Run specific test
npm run test -- tests/scoring.test.ts

# Lint check
npm run lint

# Build for production
npm build

# Start dev server
npm run dev         # Runs on http://localhost:3000
```

---

## Deploy to Production

The codebase is **ready for Vercel** (default deployment):

```bash
# Push to GitHub
git add .
git commit -m "Feature: [Your Change]"
git push origin main

# Vercel auto-deploys on push
# Live at: https://devmri.vercel.app
```

**Environment variables in Vercel:**
- Project > Settings > Environment Variables
- Add: `GEMINI_API_KEY`, `GITHUB_TOKEN` (if available)

---

## Useful Links

- **GitHub Repo:** https://github.com/urjitupadhya/DEVmri
- **Live Demo:** https://devmri.vercel.app (try with demo=true)
- **Gemini API Docs:** https://ai.google.dev/docs/gemini_api_overview
- **GitHub API Docs:** https://docs.github.com/en/rest
- **Recharts Docs:** https://recharts.org/
- **Next.js Docs:** https://nextjs.org/docs

---

**Ready to ship? Good luck at DX-Ray 🚀**
