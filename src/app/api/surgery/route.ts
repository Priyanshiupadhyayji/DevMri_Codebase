import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const megallm = new OpenAI({
  baseURL: 'https://ai.megallm.io/v1',
  apiKey: process.env.MEGALLM_API_KEY || '',
});
const MEGALLM_MODEL = 'openai-gpt-oss-20b'; // ✅ Confirmed working on Free Tier

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { recommendation, scanResults, fixType } = body;

  if (!recommendation || !scanResults) {
    return new Response('Missing recommendation or scan results', { status: 400 });
  }

  const severity = recommendation.severity || 'MEDIUM';
  
  // Determine BPM based on severity
  const bpm = severity === 'CRITICAL' ? 140 : severity === 'HIGH' ? 110 : severity === 'MEDIUM' ? 80 : 60;

  const prompt = `You are DevMRI's Surgery AI. You are performing a LIVE surgical fix on a codebase.

CONTEXT:
- Repository: ${scanResults.repo?.fullName || 'unknown'}
- Fix Type: ${fixType}
- Severity: ${severity}
- Issue: ${recommendation.title}
- Description: ${recommendation.description}
- Current Metric: ${recommendation.metric} = ${recommendation.currentValue}
- Existing Code Example: ${recommendation.codeExample || 'none provided'}

TASK: Generate a COMPLETE, production-ready code fix for this issue.

RULES:
1. Generate REAL, working code — not pseudo-code
2. Include detailed inline comments explaining each fix
3. If it's a CI/CD fix, generate valid YAML for GitHub Actions
4. If it's a dependency fix, generate valid package.json changes or npm commands
5. If it's a code quality fix, generate the actual code refactor
6. If it's a security fix, generate secure code patterns
7. Start with a comment header block showing the surgery metadata
8. Include a "VERIFICATION" section at the end showing how to verify the fix

OUTPUT FORMAT: Generate the code fix directly. No markdown code blocks — just raw code.
Start with: # DevMRI Surgery Report
`;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Send surgery metadata
      send('surgery_start', {
        severity,
        bpm,
        fixType,
        title: recommendation.title,
        timestamp: new Date().toISOString(),
      });

      try {
        if (!process.env.MEGALLM_API_KEY) {
          // Fallback: generate a mock fix
          const mockLines = generateMockFix(recommendation, fixType, scanResults);
          for (const line of mockLines) {
            send('code_chunk', { content: line + '\n' });
            await new Promise(r => setTimeout(r, 30 + Math.random() * 70));
          }
        } else {
          // Use MegaLLM for surgery code generation
          const completion = await megallm.chat.completions.create({
            model: MEGALLM_MODEL,
            messages: [
              { role: 'system', content: 'You are DevMRI\'s Surgery AI. Generate production-ready code fixes. Output raw code only, no markdown fences.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 4096,
          });

          const fullText = completion.choices[0]?.message?.content || '// Surgery could not generate a fix.';

          // Stream character-by-character for dramatic "live surgery" effect
          let buffer = '';
          for (const char of fullText) {
            buffer += char;
            if (buffer.length >= 3 || char === '\n') {
              send('code_chunk', { content: buffer });
              buffer = '';
              await new Promise(r => setTimeout(r, 15 + Math.random() * 25));
            }
          }
          if (buffer) {
            send('code_chunk', { content: buffer });
          }
        }

        send('surgery_complete', {
          success: true,
          bpm,
          fixType,
          projectedScoreChange: recommendation.projectedScoreChange || 5,
        });
      } catch (error: any) {
        send('surgery_error', { message: error.message || 'Surgery failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

function generateMockFix(recommendation: any, fixType: string, scanResults: any): string[] {
  const repo = scanResults.repo?.fullName || 'owner/repo';
  const lines: string[] = [];

  lines.push(`# ═══════════════════════════════════════════════════════`);
  lines.push(`# DevMRI Surgery Report`);
  lines.push(`# ═══════════════════════════════════════════════════════`);
  lines.push(`# Repository: ${repo}`);
  lines.push(`# Severity: ${recommendation.severity}`);
  lines.push(`# Fix: ${recommendation.title}`);
  lines.push(`# Surgeon: Dr. Gemini AI`);
  lines.push(`# Date: ${new Date().toISOString()}`);
  lines.push(`# ═══════════════════════════════════════════════════════`);
  lines.push(``);

  if (fixType.includes('ci') || fixType.includes('parallel')) {
    lines.push(`# .github/workflows/optimized-ci.yml`);
    lines.push(`name: Optimized CI Pipeline`);
    lines.push(`on:`);
    lines.push(`  push:`);
    lines.push(`    branches: [main, develop]`);
    lines.push(`  pull_request:`);
    lines.push(`    branches: [main]`);
    lines.push(``);
    lines.push(`# SURGERY: Split sequential jobs into parallel matrix`);
    lines.push(`jobs:`);
    lines.push(`  lint-and-test:`);
    lines.push(`    runs-on: ubuntu-latest`);
    lines.push(`    strategy:`);
    lines.push(`      matrix:`);
    lines.push(`        task: [lint, test, typecheck]`);
    lines.push(`      fail-fast: false  # Don't cancel other jobs`);
    lines.push(`    steps:`);
    lines.push(`      - uses: actions/checkout@v4`);
    lines.push(`      - uses: actions/setup-node@v4`);
    lines.push(`        with:`);
    lines.push(`          node-version: 20`);
    lines.push(`          cache: 'npm'`);
    lines.push(`      - run: npm ci`);
    lines.push(`      - run: npm run \${{ matrix.task }}`);
    lines.push(``);
    lines.push(`  build:`);
    lines.push(`    needs: lint-and-test`);
    lines.push(`    runs-on: ubuntu-latest`);
    lines.push(`    steps:`);
    lines.push(`      - uses: actions/checkout@v4`);
    lines.push(`      - uses: actions/setup-node@v4`);
    lines.push(`        with:`);
    lines.push(`          node-version: 20`);
    lines.push(`          cache: 'npm'`);
    lines.push(`      - run: npm ci`);
    lines.push(`      - run: npm run build`);
    lines.push(``);
    lines.push(`# ───────────────────────────────────────`);
    lines.push(`# VERIFICATION: Run 'gh workflow list'`);
    lines.push(`# Expected: 35% reduction in build time`);
    lines.push(`# ───────────────────────────────────────`);
  } else if (fixType.includes('vuln') || fixType.includes('security')) {
    lines.push(`// security-fix.js — DevMRI Auto-Remediation`);
    lines.push(`// Fix critical vulnerabilities in dependencies`);
    lines.push(``);
    lines.push(`const { execSync } = require('child_process');`);
    lines.push(``);
    lines.push(`// Step 1: Audit current vulnerabilities`);
    lines.push(`console.log('🔍 Auditing dependencies...');`);
    lines.push(`const audit = execSync('npm audit --json').toString();`);
    lines.push(`const results = JSON.parse(audit);`);
    lines.push(``);
    lines.push(`// Step 2: Auto-fix where possible`);
    lines.push(`console.log('🔧 Applying automatic fixes...');`);
    lines.push(`execSync('npm audit fix', { stdio: 'inherit' });`);
    lines.push(``);
    lines.push(`// Step 3: Force-fix remaining criticals`);
    lines.push(`if (results.metadata.vulnerabilities.critical > 0) {`);
    lines.push(`  console.log('⚠️ Force-fixing critical vulnerabilities...');`);
    lines.push(`  execSync('npm audit fix --force', { stdio: 'inherit' });`);
    lines.push(`}`);
    lines.push(``);
    lines.push(`// Step 4: Generate lock file`);
    lines.push(`execSync('npm install --package-lock-only');`);
    lines.push(``);
    lines.push(`// VERIFICATION: Run 'npm audit' — expect 0 critical, 0 high`);
  } else {
    lines.push(`// ${fixType}-fix.ts — DevMRI Auto-Remediation`);
    lines.push(`// Generated fix for: ${recommendation.title}`);
    lines.push(``);
    lines.push(`/**`);
    lines.push(` * DIAGNOSIS: ${recommendation.description}`);
    lines.push(` * CURRENT: ${recommendation.metric} = ${recommendation.currentValue}`);
    lines.push(` * PROJECTED IMPROVEMENT: +${recommendation.projectedScoreChange} DX points`);
    lines.push(` */`);
    lines.push(``);
    lines.push(`// Configuration changes to address this issue:`);
    lines.push(`export const config = {`);
    lines.push(`  // Enforce maximum PR size`);
    lines.push(`  maxPRSize: 500,`);
    lines.push(`  // Require minimum reviewers`);
    lines.push(`  minReviewers: 2,`);
    lines.push(`  // Auto-assign reviewers using round-robin`);
    lines.push(`  autoAssign: true,`);
    lines.push(`  // Block merges without approval`);
    lines.push(`  requireApproval: true,`);
    lines.push(`};`);
    lines.push(``);
    lines.push(`// CODEOWNERS file to address reviewer imbalance:`);
    lines.push(`// * @team-frontend @team-backend`);
    lines.push(`// /src/api/ @backend-team`);
    lines.push(`// /src/components/ @frontend-team`);
    lines.push(``);
    lines.push(`// VERIFICATION: Check PR review time after 2 weeks`);
    lines.push(`// Expected: 40% reduction in median review time`);
  }

  return lines;
}
