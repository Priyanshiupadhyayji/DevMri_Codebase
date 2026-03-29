# ⚡ DevMRI Quick Reference — 5 Min Onboarding

**TL;DR:** DevMRI scans GitHub repos and exposes hidden developer experience friction. You're competing in **Track A (CI/CD bottlenecks)** at DX-Ray.

---

## What This Project Does (30 seconds)

1. User enters: `github.com/facebook/react`
2. DevMRI scans 7 DX modules (CICD, Reviews, Dependencies, etc.)
3. Calculates a DX Score (0-100, A-F grade)
4. Shows visualizations + AI recommendations
5. One-click PR creation to deploy recommendations

**Visual:** GitHub Repo → Automated Scan → AI Analysis → Dashboard → PR

---

## Project Layout (One Minute)

```
devmri-app/
├── src/
│   ├── app/
│   │   ├── dashboard/page.tsx      ← Main UI (all charts here)
│   │   ├── api/
│   │   │   ├── scan/route.ts       ← Main API endpoint (streaming)
│   │   │   ├── ai/chat/route.ts    ← Chat with Gemini
│   │   │   ├── fix/route.ts        ← Create GitHub PR
│   │   │   └── [other routes]
│   │   └── globals.css
│   ├── lib/
│   │   ├── scanner.ts             ← GitHub API calls (1000 lines)
│   │   ├── scoring.ts             ← Score calculations (400 lines)
│   │   ├── ai.ts                  ← Gemini integration (300 lines)
│   │   ├── types.ts               ← All TypeScript interfaces
│   │   ├── mockData.ts            ← Demo mode data
│   │   └── [utils]
│   └── components/
│       ├── EKGMonitor.tsx         ← Heartbeat animation
│       └── MedicalCertificate.tsx ← PDF report
├── ml-service/                    ← Python FastAPI server
│   ├── classifier.py              ← Flaky build detection
│   ├── forecaster.py              ← Time trend prediction
│   └── main.py
├── bin/devmri.mjs                 ← CLI tool
├── tests/                         ← Unit + integration tests
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## Get It Running (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment (optional for demo)
cp .env.local.example .env.local
# Add GEMINI_API_KEY if you have one

# 3. Start dev server
npm run dev

# 4. Open browser
# http://localhost:3000/dashboard?demo=true
# (demo=true loads mock data, no GitHub token needed)
```

**Works?** You should see a dashboard with 7 colorful charts.

---

## Core Concepts (3 minutes)

### 7 Diagnostic Modules

| Module | Measures | Status |
|--------|----------|--------|
| **CICD** | Build speed, flakiness, bottleneck stage | ✅ Ready |
| **Reviews** | PR review time, PR size, reviewer load | ✅ Ready |
| **Dependencies** | Vulnerabilities, outdated pkgs, license risk | ✅ Ready |
| **Security** | Branch protection, code review gates, etc. | ✅ Ready |
| **Bus Factor** | Knowledge silos (single-author files) | ⚠️ Basic |
| **Necrosis** | Dead/orphaned code | ⚠️ Stub |
| **Friction Heatmap** | High-churn + high-complexity files | ⚠️ Stub |

**Score Formula:**
```
DX Score = (CICD × 0.30) + (Reviews × 0.30) + (Deps × 0.25) + (Security × 0.15)
```

### Hack Targets

- **Track A:** Improve CICD detection (you're already strong here)
- **Track G:** Improve Reviews detection (add burnout detection)
- **Track E:** Improve Dependencies (transitive analysis)

---

## Key Files to Edit

### If fixing CICD stuff:
`src/lib/scanner.ts` → `scanCICD()` function

### If fixing Reviews stuff:
`src/lib/scanner.ts` → `scanReviews()` function

### If fixing AI recommendations:
`src/lib/ai.ts` → `generateDiagnosis()` function

### If fixing dashboard UI:
`src/app/dashboard/page.tsx` → React component (2000 lines)

### If adding new API endpoint:
Create file: `src/app/api/my-feature/route.ts`

---

## Common Commands

```bash
# Run tests
npm run test

# Watch mode (re-run on file change)
npm run test:watch

# Run tests for one file
npm run test -- tests/scoring.test.ts

# Lint check
npm run lint

# Build for production
npm run build

# CLI tool locally
node ./bin/devmri.mjs scan facebook/react --json

# Debug mode with verbose output
DEBUG=* npm run dev
```

---

## How Data Flows

**Super Simple Version:**

```
1. User clicks "Scan"
2. Dashboard calls: GET /api/scan?owner=X&repo=Y
3. Backend calls GitHub API (via Octokit library)
4. Scanner extracts metrics (CI time, PR reviews, etc.)
5. Scoring module calculates 7 sub-scores
6. AI module (Gemini) generates recommendations
7. Results streamed back to dashboard (as JSON chunks)
8. Dashboard renders charts + text
```

**Advanced Version:**
- See `CONTEXT.md` section: "Architecture & Data Flow"

---

## Must-Know Gotchas

### 1. Token Handling
- No GitHub token? → Demo mode works (mock data)
- Have token? → Pass as `?token=ghp_...` (5000 req/hour limit)
- Token required for: Private repos, higher rate limits

### 2. Only GitHub Actions Supported
- Your repo must have `.github/workflows/*.yml` files
- If no workflows → CICD module returns null (handled gracefully)

### 3. Scoring Is Deterministic
- Same repo = same score (unless data changed)
- If score doesn't change: Repo didn't get new data (no new CI runs)

### 4. Recommendations Are AI-Generated
- Depends on Gemini API key (optional)
- Without key → Dashboard still works, just no AI recommendations

### 5. Demo Mode Works Offline
- `/dashboard?demo=true` uses hardcoded mock data
- Perfect for judges (no network needed)
- Don't remove `mockData.ts`

---

## How to Add a Feature (Quick Start)

### Example: Add "Bot Activity Detection" to Reviews

1. **Add data type** → `src/lib/types.ts`
   ```typescript
   export interface BotStats {
     botPRCount: number;
     botPercentage: number;
   }
   ```

2. **Add scanner logic** → `src/lib/scanner.ts`
   ```typescript
   export async function scanBotActivity(...): Promise<BotStats> {
     // Extract bots from GitHub PR authors (names ending in [bot])
     return { botPRCount: 5, botPercentage: 2.5 };
   }
   ```

3. **Call from scan endpoint** → `src/app/api/scan/route.ts`
   ```typescript
   const botStats = await scanBotActivity(owner, repo, token);
   ```

4. **Add to dashboard** → `src/app/dashboard/page.tsx`
   ```typescript
   <div className="card">
     <p>Bot PRs: {scanResults.botStats.botPercentage}%</p>
   </div>
   ```

That's it! Test it: `npm run test` → `npm run dev`

---

## Testing Checklist

Before you submit:

```
□ npm install works
□ npm run dev works (http://localhost:3000)
□ /dashboard?demo=true loads
□ Scan works on at least 1 real repo (tried facebook/react?)
□ No console errors in DevTools
□ npm run test passes
□ npm run lint passes
□ One-click "Apply Fix" creates a GitHub PR
□ 5-minute demo script is rehearsed
□ README clearly explains: "Track A: Build & CI Scanner"
```

---

## Where to Get Help

| Question | Answer |
|----------|--------|
| How do I get a GitHub token? | https://github.com/settings/tokens → "Generate new token (classic)" → Check "repo" scope |
| How do I get a Gemini API key? | https://aistudio.google.com → "Get API Key" → Free tier available |
| I see "401 Unauthorized" | Your GitHub token expired or has wrong scope. Get a new one. |
| Deploy fails on Vercel | Check: Environment variables set? Node version 18+? |
| Tests won't run | Try: `rm -rf node_modules` then `npm install` again |

---

## Files You Probably Won't Need to Touch

- `eslint.config.mjs` — Linting config (don't change unless required)
- `tsconfig.json` — TypeScript config (don't change)
- `vitest.config.ts` — Test runner config (don't change)
- `next.config.ts` — Next.js config (minimal, don't break it)

---

## Useful Links

- **Live Demo:** https://devmri.vercel.app
- **GitHub Repo:** https://github.com/urjitupadhya/DEVmri
- **GitHub API Docs:** https://docs.github.com/en/rest
- **Gemini Docs:** https://ai.google.dev/docs/gemini_api_overview
- **Next.js Docs:** https://nextjs.org/docs
- **Full Context:** Read `CONTEXT.md` in this repo
- **Hackathon Strategy:** Read `HACKATHON_STRATEGY.md`

---

## Next Steps

1. **Run it locally:** `npm run dev`
2. **Try demo:** http://localhost:3000/dashboard?demo=true
3. **Read CONTEXT.md** for deep dives
4. **Read HACKATHON_STRATEGY.md** for what to build in 72 hours
5. **Pick your feature** and start hacking!

---

**Questions?** Check `CONTEXT.md` section "Common Gotchas & Debugging"

**Ready to ship?** Follow `HACKATHON_STRATEGY.md` timeline.

Good luck! 🚀
