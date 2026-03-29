#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════
// DevMRI CLI — Developer Experience Diagnostic Tool
// ═══════════════════════════════════════

const VERSION = '1.0.0';
const CYAN = chalk.hex('#00e5ff');
const GREEN = chalk.hex('#00e676');
const AMBER = chalk.hex('#ffab00');
const RED = chalk.hex('#ff1744');
const ORANGE = chalk.hex('#ff6d00');
const DIM = chalk.hex('#556677');
const PURPLE = chalk.hex('#b388ff');

function banner() {
  console.log('');
  console.log(CYAN('  ╔══════════════════════════════════════════════════════╗'));
  console.log(CYAN('  ║') + chalk.white.bold('  🩻  Dev') + CYAN.bold('MRI') + chalk.white.bold('  — Clinical-Grade Codebase Diagnostics') + CYAN('   ║'));
  console.log(CYAN('  ╠══════════════════════════════════════════════════════╣'));
  console.log(CYAN('  ║') + DIM('  Scan · Diagnose · Operate · Deploy               ') + CYAN('║'));
  console.log(CYAN('  ║') + DIM(`  v${VERSION}  ·  github.com/urjitupadhya/DEVmri      `) + CYAN('║'));
  console.log(CYAN('  ╚══════════════════════════════════════════════════════╝'));
  console.log('');
}

function ekg(label, value, color, width = 30) {
  const filled = Math.round((value / 100) * width);
  const bar = color('█'.repeat(filled)) + DIM('░'.repeat(width - filled));
  return `  ${DIM(label.padEnd(16))} ${bar} ${color.bold(String(value).padStart(3))}`;
}

function getScoreColor(score) {
  if (score >= 90) return GREEN;
  if (score >= 75) return CYAN;
  if (score >= 60) return AMBER;
  if (score >= 40) return ORANGE;
  return RED;
}

function getGrade(score) {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  if (score >= 20) return 'D';
  return 'F';
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function scanDocumentation(octokit, owner, repo) {
  try {
    const { data: mainCommits } = await octokit.repos.listCommits({ owner, repo, path: 'src', per_page: 1 });
    const { data: docCommits } = await octokit.repos.listCommits({ owner, repo, path: 'README.md', per_page: 1 });
    
    if (mainCommits.length > 0 && docCommits.length > 0) {
      const codeDate = new Date(mainCommits[0].commit.committer.date).getTime();
      const docDate = new Date(docCommits[0].commit.committer.date).getTime();
      const diffDays = Math.max(0, (codeDate - docDate) / (1000 * 60 * 60 * 24));
      const staleness = Math.min(100, Math.round(diffDays / 30 * 15));
      return clamp(100 - staleness, 0, 100);
    }
  } catch { /* Silent fail */ }
  return 95;
}

function calculatePercentile(score) {
  const z = (score - 65) / 15;
  return Math.round((1 / (1 + Math.exp(-1.7 * z))) * 100);
}

function calculateDXScore(scores, docScore = 100) {
  return Math.round(
    (scores.cicd * 0.30) + 
    (scores.reviews * 0.30) + 
    (scores.deps * 0.25) + 
    (docScore * 0.15)
  );
}

// ═══════════════════════════════════════
// SCANNERS
// ═══════════════════════════════════════

async function scanCICD(octokit, owner, repo) {
  try {
    const { data: workflows } = await octokit.actions.listRepoWorkflows({ owner, repo });
    if (workflows.total_count === 0) return null;

    const wf = workflows.workflows[0];
    const { data: runs } = await octokit.actions.listWorkflowRuns({
      owner, repo, workflow_id: wf.id, per_page: 50, status: 'completed',
    });
    if (runs.total_count === 0) return null;

    const durations = [];
    const conclusions = [];
    const stageMap = {};
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const run of runs.workflow_runs) {
      const start = new Date(run.run_started_at || run.created_at);
      const end = new Date(run.updated_at);
      const durationMin = Math.round((end.getTime() - start.getTime()) / 60000 * 10) / 10;
      if (durationMin > 0 && durationMin < 180) {
        durations.push(durationMin);
        conclusions.push(run.conclusion);
        if (run.conclusion === 'failure') {
          heatmap[start.getDay()][start.getHours()]++;
        }
      }
    }

    try {
      const { data: jobs } = await octokit.actions.listJobsForWorkflowRun({
        owner, repo, run_id: runs.workflow_runs[0].id,
      });
      for (const job of jobs.jobs) {
        for (const step of (job.steps || [])) {
          if (step.started_at && step.completed_at) {
            const dur = (new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 60000;
            if (!stageMap[step.name]) stageMap[step.name] = { durations: [], conclusions: [] };
            stageMap[step.name].durations.push(dur);
            stageMap[step.name].conclusions.push(step.conclusion || 'success');
          }
        }
      }
    } catch { /* Jobs API may fail */ }

    if (durations.length === 0) return null;

    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10;
    const successCount = conclusions.filter(c => c === 'success').length;
    const successRate = Math.round((successCount / conclusions.length) * 1000) / 10;

    let flakyCount = 0;
    for (let i = 1; i < conclusions.length; i++) {
      if (conclusions[i] !== conclusions[i - 1]) flakyCount++;
    }
    const flakyRate = Math.round((flakyCount / Math.max(1, conclusions.length - 1)) * 1000) / 10;

    const totalDuration = Object.values(stageMap).reduce((sum, s) => sum + s.durations.reduce((a, b) => a + b, 0) / s.durations.length, 0) || avgDuration;
    const stages = Object.entries(stageMap).map(([name, data]) => {
      const avg = data.durations.reduce((a, b) => a + b, 0) / data.durations.length;
      const pct = Math.round((avg / totalDuration) * 100);
      return {
        name, avgDurationMinutes: Math.round(avg * 10) / 10,
        maxDurationMinutes: Math.round(Math.max(...data.durations) * 10) / 10,
        successRate: Math.round(data.conclusions.filter(c => c === 'success').length / data.conclusions.length * 100),
        percentage: pct,
        status: pct > 40 ? 'bottleneck' : pct > 25 ? 'warning' : 'healthy'
      };
    }).sort((a, b) => b.avgDurationMinutes - a.avgDurationMinutes);

    const bottleneck = stages.length > 0 ? stages[0] : { name: wf.name, avgMinutes: avgDuration, percentage: 100 };

    const trendDurations = durations.slice(0, 20);
    const n = trendDurations.length;
    let slope = 0;
    if (n > 3) {
      const xs = trendDurations.map((_, i) => i);
      const xMean = xs.reduce((a, b) => a + b, 0) / n;
      const yMean = trendDurations.reduce((a, b) => a + b, 0) / n;
      const num = xs.reduce((acc, x, i) => acc + (x - xMean) * (trendDurations[i] - yMean), 0);
      const den = xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0);
      slope = den !== 0 ? num / den : 0;
    }
    const trendDirection = slope < -0.1 ? 'improving' : slope > 0.1 ? 'worsening' : 'stable';

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let peakDay = 0, peakHour = 0, peakVal = 0;
    heatmap.forEach((row, d) => row.forEach((v, h) => { if (v > peakVal) { peakVal = v; peakDay = d; peakHour = h; } }));

    const dailyRuns = durations.length > 0 ? Math.round((durations.length / 14) * 10) / 10 : 0;

    return {
      totalRuns: durations.length,
      avgDurationMinutes: avgDuration,
      successRate,
      flakyRate,
      bottleneckStage: { name: bottleneck.name, avgMinutes: bottleneck.avgDurationMinutes || avgDuration, percentage: bottleneck.percentage || 100 },
      stages,
      buildTimeTrend: durations.slice(0, 20).map((d, i) => ({ runNumber: i + 1, durationMinutes: d })),
      trendDirection,
      trendSlope: slope,
      failureHeatmap: heatmap,
      peakFailureHour: peakHour,
      peakFailureDay: dayNames[peakDay],
      avgDailyRuns: dailyRuns,
    };
  } catch (e) {
    return null;
  }
}

async function scanReviews(octokit, owner, repo) {
  try {
    const { data: pulls } = await octokit.pulls.list({
      owner, repo, state: 'closed', sort: 'updated', direction: 'desc', per_page: 100,
    });
    const merged = pulls.filter(p => p.merged_at);
    if (merged.length === 0) return null;

    const mergeTimes = [];
    const prData = [];
    let selfMerges = 0;
    const reviewerMap = {};
    const sample = merged.slice(0, 30);

    for (const pr of sample) {
      const lines = ((pr).additions || 0) + ((pr).deletions || 0);
      const mergeH = (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / 3600000;
      mergeTimes.push(mergeH);

      if (pr.user?.login === pr.merged_by?.login) selfMerges++;

      try {
        const { data: reviews } = await octokit.pulls.listReviews({ owner, repo, pull_number: pr.number });
        let firstReviewH = mergeH;
        for (const review of reviews) {
          const rH = (new Date(review.submitted_at).getTime() - new Date(pr.created_at).getTime()) / 3600000;
          if (rH < firstReviewH && rH > 0) firstReviewH = rH;
          const login = review.user?.login || 'unknown';
          if (!reviewerMap[login]) reviewerMap[login] = 0;
          reviewerMap[login]++;
        }
        prData.push({ number: pr.number, linesChanged: lines, reviewTimeHours: Math.round(firstReviewH * 10) / 10 });
      } catch {
        prData.push({ number: pr.number, linesChanged: lines, reviewTimeHours: Math.round(mergeH * 10) / 10 });
      }
    }

    const medianReview = Math.round(median(mergeTimes) * 10) / 10;
    const medianMerge = Math.round(median(mergeTimes) * 10) / 10;

    const classify = (lines) => lines < 100 ? 'S' : lines < 500 ? 'M' : lines < 1000 ? 'L' : 'XL';
    const dist = { S: 0, M: 0, L: 0, XL: 0 };
    merged.forEach(pr => {
      const lines = ((pr).additions || 0) + ((pr).deletions || 0);
      dist[classify(lines)]++;
    });
    const xlPct = Math.round((dist.XL / merged.length) * 1000) / 10;

    const reviewCounts = Object.values(reviewerMap).sort((a, b) => a - b);
    let gini = 0;
    if (reviewCounts.length > 1) {
      const totalReviews = reviewCounts.reduce((a, b) => a + b, 0);
      const n = reviewCounts.length;
      let numerator = 0;
      reviewCounts.forEach((val, i) => { numerator += (2 * (i + 1) - n - 1) * val; });
      gini = Math.round((numerator / (n * totalReviews)) * 100) / 100;
    }

    const totalReviews = Object.values(reviewerMap).reduce((a, b) => a + b, 0) || 1;
    const reviewerLoad = Object.entries(reviewerMap)
      .map(([login, count]) => ({ login, reviewCount: count, percentage: Math.round((count / totalReviews) * 100) }))
      .sort((a, b) => b.reviewCount - a.reviewCount);

    const { data: openPRs } = await octokit.pulls.list({ owner, repo, state: 'open', per_page: 50 });
    const now = Date.now();
    const stalePRs = openPRs
      .map(pr => ({ number: pr.number, title: pr.title.substring(0, 60), author: pr.user?.login || 'unknown', daysOpen: Math.round((now - new Date(pr.created_at).getTime()) / 86400000) }))
      .filter(pr => pr.daysOpen > 7);

    const loadBalance = gini > 0.5 ? 'critical' : gini > 0.3 ? 'uneven' : 'balanced';

    return {
      totalPRsAnalyzed: merged.length,
      medianReviewTimeHours: medianReview,
      medianMergeTimeHours: medianMerge,
      xlPrPercentage: xlPct,
      giniCoefficient: gini,
      stalePRs,
      stalePrRate: openPRs.length > 0 ? Math.round((stalePRs.length / openPRs.length) * 100) : 0,
      selfMergeRate: Math.round((selfMerges / sample.length) * 100),
      prSizeDistribution: dist,
      reviewerLoad,
      prData,
      loadBalance,
    };
  } catch (e) {
    return null;
  }
}

async function scanDependencies(octokit, owner, repo) {
  try {
    let depFile, ecosystem;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: 'package.json' });
      depFile = JSON.parse(Buffer.from(data.content, 'base64').toString());
      ecosystem = 'npm';
    } catch {
      try {
        const { data } = await octokit.repos.getContent({ owner, repo, path: 'requirements.txt' });
        const content = Buffer.from(data.content, 'base64').toString();
        depFile = { requirements: content };
        ecosystem = 'pip';
      } catch {
        return null;
      }
    }

    let deps = [], devDeps = [];
    if (ecosystem === 'npm') {
      deps = Object.entries(depFile.dependencies || {}).map(([name, ver]) => ({ name, version: String(ver).replace(/[\^~>=<]/g, '') }));
      devDeps = Object.entries(depFile.devDependencies || {}).map(([name, ver]) => ({ name, version: String(ver).replace(/[\^~>=<]/g, '') }));
    } else {
      deps = depFile.requirements.split('\n').filter(l => l.trim() && !l.startsWith('#'))
        .map(l => { const [name, ver] = l.split('=='); return { name: name?.trim(), version: ver?.trim() || '0.0.0' }; })
        .filter(d => d.name);
    }

    const vulns = { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    const vulnDetails = [];
    const allDeps = [...deps, ...devDeps];
    const batchSize = 10;

    for (let i = 0; i < Math.min(allDeps.length, 30); i += batchSize) {
      const batch = allDeps.slice(i, i + batchSize);
      const queries = batch.map(d => ({
        package: { name: d.name, ecosystem: ecosystem === 'npm' ? 'npm' : 'PyPI' },
        version: d.version,
      }));

      try {
        const res = await fetch('https://api.osv.dev/v1/querybatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queries }),
        });
        const data = await res.json();

        (data.results || []).forEach((result, idx) => {
          const pkg = batch[idx];
          for (const vuln of (result.vulns || [])) {
            const severity = vuln.database_specific?.severity || 'MEDIUM';
            const sev = severity.toUpperCase();
            if (sev === 'CRITICAL') vulns.critical++;
            else if (sev === 'HIGH') vulns.high++;
            else if (sev === 'MEDIUM') vulns.medium++;
            else vulns.low++;
            vulns.total++;

            const fixedIn = vuln.affected?.[0]?.ranges?.[0]?.events?.find(e => e.fixed)?.fixed;
            vulnDetails.push({
              package: pkg.name,
              version: pkg.version,
              vulnId: vuln.id || 'Unknown',
              severity: sev,
              title: vuln.summary || vuln.details?.substring(0, 80) || 'Unknown vulnerability',
              fixedIn: fixedIn || null,
            });
          }
        });
      } catch { /* OSV batch may fail */ }
    }

    let outdatedCount = 0;
    if (ecosystem === 'npm') {
      for (const dep of deps.slice(0, 15)) {
        try {
          const res = await fetch(`https://registry.npmjs.org/${dep.name}/latest`, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const data = await res.json();
            const latest = data.version;
            if (latest && dep.version && latest !== dep.version) outdatedCount++;
          }
        } catch { /* skip */ }
      }
    }

    const outdatedPct = deps.length > 0 ? Math.round((outdatedCount / deps.length) * 100) : 0;
    const riskyLicenses = ['GPL-3.0', 'AGPL-3.0', 'GPL-2.0', 'SSPL-1.0'];
    let riskyCount = 0;

    return {
      ecosystem,
      totalDeps: deps.length,
      totalDevDeps: devDeps.length,
      vulnerabilities: vulns,
      vulnDetails: vulnDetails.sort((a, b) => {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a.severity] || 3) - (order[b.severity] || 3);
      }),
      outdatedCount,
      outdatedPercentage: outdatedPct,
      riskyLicenseCount: riskyCount,
    };
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════
// SCORING
// ═══════════════════════════════════════

function calculateCICDScore(data) {
  const successScore = data.successRate;
  const speedScore = data.avgDurationMinutes < 5 ? 100 : data.avgDurationMinutes < 10 ? 80 : data.avgDurationMinutes < 15 ? 60 : data.avgDurationMinutes < 25 ? 40 : 20;
  const flakyInverse = clamp(100 - (data.flakyRate * 5), 0, 100);
  const bottleneckInverse = clamp(100 - (data.bottleneckStage.percentage * 1.5), 0, 100);
  return Math.round((successScore * 0.35) + (speedScore * 0.30) + (flakyInverse * 0.20) + (bottleneckInverse * 0.15));
}

function calculateReviewScore(data) {
  const speedScore = data.medianReviewTimeHours < 2 ? 100 : data.medianReviewTimeHours < 4 ? 85 : data.medianReviewTimeHours < 8 ? 70 : data.medianReviewTimeHours < 24 ? 50 : 25;
  const prSizeScore = clamp(100 - (data.xlPrPercentage * 2), 0, 100);
  const loadBalance = clamp(100 - (data.giniCoefficient * 100), 0, 100);
  const staleInverse = clamp(100 - (data.stalePrRate * 2), 0, 100);
  const selfMergeInverse = clamp(100 - (data.selfMergeRate * 3), 0, 100);
  return Math.round((speedScore * 0.30) + (prSizeScore * 0.25) + (loadBalance * 0.20) + (staleInverse * 0.15) + (selfMergeInverse * 0.10));
}

function calculateDepScore(data) {
  const critHigh = data.vulnerabilities.critical + data.vulnerabilities.high;
  const vulnScore = critHigh === 0 ? 100 : critHigh <= 2 ? 70 : critHigh <= 5 ? 40 : 10;
  const freshnessScore = clamp(100 - data.outdatedPercentage, 0, 100);
  const totalDeps = data.totalDeps + data.totalDevDeps;
  const bloatScore = totalDeps < 50 ? 100 : totalDeps < 100 ? 80 : totalDeps < 200 ? 60 : totalDeps < 500 ? 40 : 20;
  const licenseScore = data.riskyLicenseCount === 0 ? 100 : data.riskyLicenseCount <= 2 ? 70 : data.riskyLicenseCount <= 5 ? 40 : 10;
  return Math.round((vulnScore * 0.40) + (freshnessScore * 0.30) + (bloatScore * 0.20) + (licenseScore * 0.10));
}

function calculateFrictionCost(cicd, reviews, deps, hourlyRate = 75) {
  const WORK_DAYS = 22;
  const CONTEXT_SWITCH_MULT = 1.5;

  const excessMin = Math.max(0, (cicd?.avgDurationMinutes || 0) - 5);
  const dailyRuns = cicd?.avgDailyRuns || 10;
  const estTeam = Math.max(3, Math.min(20, Math.round(dailyRuns / 3)));
  const ciHours = (excessMin / 60) * dailyRuns * WORK_DAYS * CONTEXT_SWITCH_MULT;
  const ciCost = Math.round(ciHours * hourlyRate);

  const prsPerWeek = (reviews?.totalPRsAnalyzed || 0) / 13;
  const contextSwitchHours = prsPerWeek * 4 * (23 / 60);
  const reviewCost = Math.round(contextSwitchHours * hourlyRate);

  const staleCount = reviews?.stalePRs?.length || 0;
  const staleCost = Math.round(staleCount * 3 * hourlyRate);

  const vulns = deps?.vulnerabilities || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  const vulnCost = (vulns.critical * 2700) + (vulns.high * 900) + (vulns.medium * 300);

  const outdatedCost = Math.round((deps?.outdatedCount || 0) * 0.5 * hourlyRate);

  const total = ciCost + reviewCost + staleCost + vulnCost + outdatedCost;

  return {
    total,
    annual: total * 12,
    ciCost, reviewCost, staleCost, vulnCost, outdatedCost,
    ciHours: Math.round(ciHours),
    reviewHours: Math.round(contextSwitchHours),
    staleHours: staleCount * 3,
  };
}

// ═══════════════════════════════════════
// DISPLAY HELPERS
// ═══════════════════════════════════════

function renderScoreCard(dxScore, grade, percentile, frictionCost, scores) {
  const color = getScoreColor(dxScore);
  const topPct = 100 - percentile;
  
  console.log(DIM('  ┌────────────────────────────────────────────────────┐'));
  console.log(DIM('  │') + '  ' + DIM('CLINICAL DIAGNOSTIC RESULT') + '                           ' + DIM('│'));
  console.log(DIM('  ├────────────────────────────────────────────────────┤'));
  console.log(DIM('  │') + '                                                    ' + DIM('│'));
  console.log(DIM('  │') + `   DX SCORE:  ${color.bold(String(dxScore).padStart(3))} / 100   GRADE: ${color.bold(grade)}   ${GREEN(`Top ${topPct}%`)}     ` + DIM('│'));
  console.log(DIM('  │') + '                                                    ' + DIM('│'));
  console.log(DIM('  │') + `   FRICTION:  ${AMBER.bold('$' + frictionCost.total.toLocaleString() + '/mo')}  (${DIM('$' + frictionCost.annual.toLocaleString() + '/yr')})`);
  console.log(DIM('  │') + '                                                    ' + DIM('│'));
  console.log(DIM('  ├────────────────────────────────────────────────────┤'));
  console.log(ekg('CI/CD', scores.cicd, getScoreColor(scores.cicd)));
  console.log(ekg('Code Reviews', scores.reviews, getScoreColor(scores.reviews)));
  console.log(ekg('Dependencies', scores.deps, getScoreColor(scores.deps)));
  console.log(ekg('Documentation', scores.doc, getScoreColor(scores.doc)));
  console.log(DIM('  └────────────────────────────────────────────────────┘'));
}

function renderFindings(cicd, reviews, deps) {
  const findings = [];
  
  if (cicd?.bottleneckStage) {
    const sev = cicd.bottleneckStage.percentage > 50 ? RED : AMBER;
    findings.push({ icon: sev('●'), msg: `CI bottleneck: ${chalk.white(cicd.bottleneckStage.name)} (${cicd.bottleneckStage.avgMinutes?.toFixed?.(1) || cicd.avgDurationMinutes}m, ${cicd.bottleneckStage.percentage}% of build)` });
  }
  if (cicd?.flakyRate > 10) {
    findings.push({ icon: RED('●'), msg: `Flaky pipeline: ${chalk.white(cicd.flakyRate + '%')} failure toggle rate` });
  }
  if (cicd?.trendDirection === 'worsening') {
    findings.push({ icon: AMBER('●'), msg: `Build times ${chalk.white('worsening')} — slope: ${cicd.trendSlope.toFixed(2)}m/run` });
  }
  if (reviews?.medianReviewTimeHours > 8) {
    findings.push({ icon: AMBER('●'), msg: `PR review delay: ${chalk.white(reviews.medianReviewTimeHours + 'h')} median wait` });
  }
  if (reviews?.stalePRs?.length > 3) {
    findings.push({ icon: AMBER('●'), msg: `Stale PRs: ${chalk.white(String(reviews.stalePRs.length))} PRs waiting > 7 days` });
  }
  if (reviews?.selfMergeRate > 30) {
    findings.push({ icon: AMBER('●'), msg: `Self-merge rate: ${chalk.white(reviews.selfMergeRate + '%')} — peer review bypassed` });
  }
  if (deps?.vulnerabilities?.critical > 0) {
    findings.push({ icon: RED('●'), msg: `Critical CVEs: ${chalk.white(String(deps.vulnerabilities.critical))} critical vulnerabilities` });
  }
  if (deps?.vulnerabilities?.high > 0) {
    findings.push({ icon: ORANGE('●'), msg: `High CVEs: ${chalk.white(String(deps.vulnerabilities.high))} high-severity issues` });
  }
  if (deps?.outdatedPercentage > 30) {
    findings.push({ icon: AMBER('●'), msg: `Outdated deps: ${chalk.white(deps.outdatedPercentage + '%')} of packages behind` });
  }

  if (findings.length > 0) {
    console.log('');
    console.log(DIM('  ┌── KEY FINDINGS ──'));
    findings.forEach(f => console.log(`  ${DIM('│')} ${f.icon}  ${f.msg}`));
    console.log(DIM('  └──'));
  }
}

function renderVulnTable(deps) {
  if (!deps?.vulnDetails?.length) return;
  console.log('');
  console.log(DIM('  ┌── VULNERABILITY REPORT ──'));
  const top = deps.vulnDetails.slice(0, 8);
  for (const v of top) {
    const sevColor = v.severity === 'CRITICAL' ? RED : v.severity === 'HIGH' ? ORANGE : v.severity === 'MEDIUM' ? AMBER : GREEN;
    const fix = v.fixedIn ? GREEN(`→ ${v.fixedIn}`) : DIM('no fix');
    console.log(`  ${DIM('│')} ${sevColor(v.severity.padEnd(8))} ${chalk.white((v.package + '@' + v.version).padEnd(30))} ${fix}`);
  }
  if (deps.vulnDetails.length > 8) {
    console.log(`  ${DIM('│')} ${DIM(`... and ${deps.vulnDetails.length - 8} more`)}`);
  }
  console.log(DIM('  └──'));
}

// ═══════════════════════════════════════
// HTML REPORT GENERATOR (unchanged)
// ═══════════════════════════════════════

function generateHTMLReport(data) {
  const { repoName, dxScore, grade, percentile, cicd, reviews, deps, scores, frictionCost } = data;
  const scoreColor = dxScore >= 90 ? '#00e676' : dxScore >= 75 ? '#00e5ff' : dxScore >= 60 ? '#ffab00' : dxScore >= 40 ? '#ff6d00' : '#ff1744';
  const topPct = 100 - percentile;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DevMRI Report — ${repoName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#040608;color:#e8edf4;font-family:'Inter',sans-serif;line-height:1.6;padding:32px;max-width:900px;margin:0 auto}
.mono{font-family:'JetBrains Mono',monospace}
h1{font-size:2.5rem;font-weight:900;margin-bottom:8px}
h2{font-size:1.5rem;margin:32px 0 16px;color:#00e5ff}
.card{background:rgba(10,14,20,0.7);border:1px solid rgba(0,229,255,0.08);border-radius:16px;padding:24px;margin-bottom:16px}
.score{font-size:5rem;font-weight:900;font-family:'JetBrains Mono',monospace;color:${scoreColor};line-height:1}
.grade{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:12px;font-size:1.5rem;font-weight:900;border:2px solid ${scoreColor};color:${scoreColor};background:${scoreColor}22}
.cost{font-size:2.5rem;font-weight:700;font-family:'JetBrains Mono',monospace;background:linear-gradient(135deg,#ffab00,#ff1744);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.metric{text-align:center;padding:16px;background:rgba(10,14,20,0.7);border:1px solid rgba(0,229,255,0.08);border-radius:12px}
.metric-value{font-size:1.8rem;font-weight:700;font-family:'JetBrains Mono',monospace}
.metric-label{font-size:0.7rem;color:#8899aa;text-transform:uppercase;letter-spacing:0.1em}
.bar{height:8px;background:#111822;border-radius:4px;overflow:hidden;margin:4px 0}
.bar-fill{height:100%;border-radius:4px}
.dim{color:#556677}
.footer{text-align:center;margin-top:48px;padding:24px;border-top:1px solid rgba(0,229,255,0.06);color:#334455;font-size:0.75rem}
table{width:100%;border-collapse:collapse;margin:8px 0}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid rgba(0,229,255,0.06);font-size:0.85rem}
th{color:#8899aa;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.1em}
@media(max-width:768px){.grid{grid-template-columns:1fr}.score{font-size:3rem}}
</style>
</head>
<body>
<div style="margin-bottom:32px">
<h1>🩻 Dev<span style="color:#00e5ff">MRI</span> Report</h1>
<p class="dim mono" style="font-size:0.85rem">${repoName} · Generated ${new Date().toLocaleDateString()}</p>
</div>

<div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
<div>
<p class="dim" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em">DX Score</p>
<div class="score">${dxScore}</div>
<div style="display:flex;align-items:center;gap:12px;margin-top:8px">
  <div class="grade">${grade}</div>
  <p style="font-size:0.85rem;color:#00e676;font-weight:600">Top ${topPct}% of Engineering Teams</p>
</div>
</div>
<div style="text-align:right">
<p class="dim" style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em">Monthly Friction Cost</p>
<div class="cost">$${frictionCost.total.toLocaleString()}/mo</div>
<p class="dim mono" style="font-size:0.85rem">$${frictionCost.annual.toLocaleString()}/year</p>
</div>
</div>

<h2>Module Scores</h2>
<div class="grid">
${[
  { label: '⚡ CI/CD', score: scores.cicd, cost: frictionCost.ciCost },
  { label: '📝 Documentation', score: scores.doc, cost: 0 },
  { label: '👀 Reviews', score: scores.reviews, cost: frictionCost.reviewCost + frictionCost.staleCost },
  { label: '📦 Dependencies', score: scores.deps, cost: frictionCost.vulnCost + frictionCost.outdatedCost },
].map(m => `
<div class="metric">
<p class="metric-label">${m.label}</p>
<p class="metric-value" style="color:${m.score >= 75 ? '#00e5ff' : m.score >= 60 ? '#ffab00' : '#ff1744'}">${m.score}</p>
<div class="bar"><div class="bar-fill" style="width:${m.score}%;background:${m.score >= 75 ? '#00e5ff' : m.score >= 60 ? '#ffab00' : '#ff1744'}"></div></div>
<p class="mono dim" style="font-size:0.8rem">$${m.cost.toLocaleString()}/mo</p>
</div>
`).join('')}
</div>

<div class="footer">
<p>🩻 DevMRI — Developer Experience Diagnostic Platform</p>
<p style="margin-top:4px">Generated by <a href="https://github.com/urjitupadhya/DEVmri" style="color:#00e5ff">DevMRI</a></p>
</div>
</body></html>`;
}


// ═══════════════════════════════════════
// CORE SCAN LOGIC
// ═══════════════════════════════════════

async function runScan(repoArg, opts) {
  const [owner, repo] = repoArg.replace('https://github.com/', '').replace(/\/$/, '').split('/');
  if (!owner || !repo) {
    console.error(RED('  ✗ Invalid repository. Use format: owner/repo'));
    process.exit(1);
  }

  const token = opts.token || process.env.GITHUB_TOKEN || process.env.DEVMRI_TOKEN;
  const hourlyRate = parseInt(opts.rate || '75');
  const threshold = parseInt(opts.threshold || '0');

  banner();
  console.log(`  ${DIM('Target:')} ${CYAN.bold(repoArg)}`);
  console.log(`  ${DIM('Rate:')} $${hourlyRate}/hr  ${DIM('Threshold:')} ${threshold > 0 ? threshold : 'none'}`);
  console.log('');

  const octokit = new Octokit({ auth: token || undefined });
  const startTime = Date.now();

  // 1. CI/CD
  const s1 = ora({ text: DIM('  Scanning CI/CD pipelines...'), color: 'cyan', indent: 2 }).start();
  const cicd = await scanCICD(octokit, owner, repo);
  const cicdScore = cicd ? calculateCICDScore(cicd) : 50;
  s1.succeed(cicd
    ? `  ${CYAN('⚡')} CI/CD ${DIM('—')} ${cicd.totalRuns} runs, ${cicd.avgDurationMinutes}m avg, ${cicd.successRate}% success`
    : DIM('  ⚡ CI/CD — No Actions data found')
  );

  // 2. Code Review
  const s2 = ora({ text: DIM('  Scanning code reviews...'), color: 'yellow', indent: 2 }).start();
  const reviews = await scanReviews(octokit, owner, repo);
  const reviewScore = reviews ? calculateReviewScore(reviews) : 50;
  s2.succeed(reviews
    ? `  ${AMBER('👀')} Reviews ${DIM('—')} ${reviews.totalPRsAnalyzed} PRs, ${reviews.medianReviewTimeHours}h median, ${reviews.stalePRs.length} stale`
    : DIM('  👀 Reviews — No PR data found')
  );

  // 3. Dependencies
  const s3 = ora({ text: DIM('  Scanning dependency vulnerabilities...'), color: 'green', indent: 2 }).start();
  const deps = await scanDependencies(octokit, owner, repo);
  const depScore = deps ? calculateDepScore(deps) : 50;
  s3.succeed(deps
    ? `  ${GREEN('📦')} Dependencies ${DIM('—')} ${deps.totalDeps + deps.totalDevDeps} packages, ${deps.vulnerabilities.total} vulns`
    : DIM('  📦 Dependencies — No dependency files found')
  );

  // 4. Documentation
  const s4 = ora({ text: DIM('  Scanning documentation health...'), color: 'magenta', indent: 2 }).start();
  const docScore = await scanDocumentation(octokit, owner, repo);
  s4.succeed(`  ${PURPLE('📝')} Documentation ${DIM('—')} Health: ${getScoreColor(docScore)(docScore + '/100')}`);

  // 5. Calculate
  const scores = { cicd: cicdScore, reviews: reviewScore, deps: depScore, doc: docScore };
  const dxScore = calculateDXScore(scores, docScore);
  const grade = getGrade(dxScore);
  const percentile = calculatePercentile(dxScore);
  const frictionCost = calculateFrictionCost(cicd, reviews, deps, hourlyRate);
  const scanDuration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  renderScoreCard(dxScore, grade, percentile, frictionCost, scores);
  renderFindings(cicd, reviews, deps);
  renderVulnTable(deps);

  console.log('');
  console.log(DIM(`  Scanned in ${scanDuration}s`));

  // JSON output
  if (opts.json) {
    const result = { repoName: `${owner}/${repo}`, dxScore, grade, scores, frictionCost, cicd, reviews, deps, scanDuration };
    console.log(JSON.stringify(result, null, 2));
  }

  // HTML report
  if (opts.report !== false) {
    const outputDir = opts.output || './devmri-report';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const reportPath = path.join(outputDir, 'index.html');
    const html = generateHTMLReport({ 
      repoName: `${owner}/${repo}`, dxScore, grade, percentile, cicd, reviews, deps, scores, frictionCost,
      mlForecast: null, flakyRate: 0, aiRecommendations: []
    });
    fs.writeFileSync(reportPath, html);
    console.log(`  ${GREEN('✓')}  Report saved: ${CYAN(reportPath)}`);
  }

  console.log('');

  // Threshold check
  if (threshold > 0 && dxScore < threshold) {
    console.log(RED(`  ✗ DX Score ${dxScore} is below threshold ${threshold}`));
    process.exit(2);
  }

  return { repoName: `${owner}/${repo}`, dxScore, grade, scores, frictionCost, scanDuration };
}


// ═══════════════════════════════════════
// CLI PROGRAM
// ═══════════════════════════════════════

const program = new Command();

program
  .name('devmri')
  .description('🩻 DevMRI — Clinical-Grade Developer Experience Diagnostics')
  .version(VERSION);

program
  .command('scan')
  .description('Scan a GitHub repository for developer experience health')
  .argument('<repo>', 'GitHub repository (owner/repo)')
  .option('-t, --token <token>', 'GitHub personal access token')
  .option('-r, --rate <rate>', 'Hourly developer rate in dollars', '75')
  .option('-o, --output <dir>', 'Output directory for HTML report', './devmri-report')
  .option('--threshold <score>', 'Exit with code 2 if DX Score is below this', '0')
  .option('--json', 'Output raw JSON result')
  .option('--no-report', 'Skip HTML report generation')
  .action(runScan);

program
  .command('compare')
  .description('Compare two repositories side-by-side (Repo Duel)')
  .argument('<repoA>', 'First GitHub repository (owner/repo)')
  .argument('<repoB>', 'Second GitHub repository (owner/repo)')
  .option('-t, --token <token>', 'GitHub personal access token')
  .option('-r, --rate <rate>', 'Hourly developer rate', '75')
  .action(async (repoA, repoB, opts) => {
    banner();
    console.log(CYAN.bold('  ⚔️  REPO DUEL — Head-to-Head Comparison'));
    console.log(DIM(`  ${repoA}  vs  ${repoB}`));
    console.log('');

    const optsCopy = { ...opts, report: false };
    
    console.log(CYAN('  ━━━ Patient A ━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    const resultA = await runScan(repoA, { ...optsCopy, json: false });
    
    console.log('');
    console.log(CYAN('  ━━━ Patient B ━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    const resultB = await runScan(repoB, { ...optsCopy, json: false });

    // Comparison summary
    console.log('');
    console.log(CYAN.bold('  ════════════════════════════════════════════'));
    console.log(CYAN.bold('  ⚔️  DUEL VERDICT'));
    console.log(CYAN.bold('  ════════════════════════════════════════════'));
    console.log('');

    const delta = resultA.dxScore - resultB.dxScore;
    const winner = delta > 0 ? repoA : delta < 0 ? repoB : 'TIE';
    const winnerColor = delta > 0 ? GREEN : delta < 0 ? RED : AMBER;

    console.log(`  ${chalk.white(repoA.padEnd(30))} ${getScoreColor(resultA.dxScore).bold(String(resultA.dxScore))}  ${DIM('vs')}  ${getScoreColor(resultB.dxScore).bold(String(resultB.dxScore))} ${chalk.white(repoB)}`);
    console.log(`  ${DIM('Friction:')} ${AMBER('$' + resultA.frictionCost.total.toLocaleString() + '/mo')}  ${DIM('vs')}  ${AMBER('$' + resultB.frictionCost.total.toLocaleString() + '/mo')}`);
    console.log('');
    console.log(`  ${DIM('Winner:')} ${winnerColor.bold(winner)} ${delta !== 0 ? `(+${Math.abs(delta)} points)` : ''}`);
    console.log('');
  });

program
  .command('badge')
  .description('Generate a README badge for your DX Score')
  .argument('<repo>', 'GitHub repository (owner/repo)')
  .option('-t, --token <token>', 'GitHub personal access token')
  .action(async (repoArg, opts) => {
    const [owner, repo] = repoArg.replace('https://github.com/', '').split('/');
    const token = opts.token || process.env.GITHUB_TOKEN;
    const octokit = new Octokit({ auth: token || undefined });
    
    console.log('');
    const s = ora({ text: 'Quick scanning for badge...', color: 'cyan' }).start();
    
    const cicd = await scanCICD(octokit, owner, repo);
    const reviews = await scanReviews(octokit, owner, repo);
    const deps = await scanDependencies(octokit, owner, repo);
    const docScore = await scanDocumentation(octokit, owner, repo);
    
    const scores = {
      cicd: cicd ? calculateCICDScore(cicd) : 50,
      reviews: reviews ? calculateReviewScore(reviews) : 50, 
      deps: deps ? calculateDepScore(deps) : 50,
      doc: docScore
    };
    const dxScore = calculateDXScore(scores, docScore);
    const grade = getGrade(dxScore);
    s.succeed(`DX Score: ${getScoreColor(dxScore).bold(String(dxScore))} (Grade ${grade})`);

    const badgeColor = dxScore >= 80 ? '00e676' : dxScore >= 60 ? 'ffab00' : dxScore >= 40 ? 'ff6d00' : 'ff1744';
    
    console.log('');
    console.log(CYAN.bold('  Markdown:'));
    console.log(chalk.white(`  [![DX Score](https://img.shields.io/badge/DX_Score-${dxScore}%2F${grade}-${badgeColor}?style=for-the-badge&labelColor=0a0e14)](https://github.com/urjitupadhya/DEVmri)`));
    console.log('');
    console.log(CYAN.bold('  HTML:'));
    console.log(chalk.white(`  <img src="https://img.shields.io/badge/DX_Score-${dxScore}%2F${grade}-${badgeColor}?style=for-the-badge&labelColor=0a0e14" alt="DX Score" />`));
    console.log('');
  });

program
  .command('doctor')
  .description('Check DevMRI environment setup and configuration')
  .action(async () => {
    banner();
    console.log(CYAN.bold('  🩺 Environment Check'));
    console.log('');

    // Node version
    const nodeVer = process.version;
    const nodeMajor = parseInt(nodeVer.replace('v', ''));
    console.log(`  ${nodeMajor >= 18 ? GREEN('✓') : RED('✗')}  Node.js ${chalk.white(nodeVer)} ${nodeMajor >= 18 ? '' : RED('(requires 18+)')}`);

    // GitHub token
    const token = process.env.GITHUB_TOKEN || process.env.DEVMRI_TOKEN;
    console.log(`  ${token ? GREEN('✓') : AMBER('△')}  GitHub Token ${token ? GREEN('configured') : AMBER('not set (limited to 60 req/hr)')}`);

    // Gemini API key
    const gemini = process.env.GEMINI_API_KEY;
    console.log(`  ${gemini ? GREEN('✓') : DIM('○')}  Gemini API Key ${gemini ? GREEN('configured') : DIM('not set (AI Surgery disabled)')}`);

    // Rate limit check
    if (token) {
      try {
        const octokit = new Octokit({ auth: token });
        const { data } = await octokit.rateLimit.get();
        const remaining = data.rate.remaining;
        const limit = data.rate.limit;
        const pct = Math.round((remaining / limit) * 100);
        console.log(`  ${pct > 20 ? GREEN('✓') : RED('✗')}  API Rate Limit ${chalk.white(`${remaining}/${limit}`)} ${pct > 20 ? '' : RED('(low)')}`);
      } catch {
        console.log(`  ${AMBER('△')}  API Rate Limit ${AMBER('could not check')}`);
      }
    }

    console.log('');
    console.log(DIM('  Set GITHUB_TOKEN env var for higher rate limits.'));
    console.log(DIM('  Set GEMINI_API_KEY for AI-powered Surgery Theatre.'));
    console.log('');
  });

program.parse();
