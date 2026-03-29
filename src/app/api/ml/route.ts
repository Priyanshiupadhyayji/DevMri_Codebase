import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════
// DevMRI — Native ML Clinical Advisor
// Replaces Python ml-service with Edge-safe JS logic
// ═══════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (type === 'classify_log') {
      return NextResponse.json(classifyLog(data.logText || ''));
    }

    if (type === 'forecast_duration') {
      return NextResponse.json(forecastDuration(data.runs || []));
    }

    return NextResponse.json({ error: 'Unknown diagnostic type' }, { status: 400 });
  } catch (error) {
    console.error('ML Advisor Error:', error);
    return NextResponse.json({ error: 'Clinical failure during prediction' }, { status: 500 });
  }
}

/**
 * 🔬 Flaky Build Classifier (Native JS Port)
 */
function classifyLog(logText: string) {
  const text = logText.toLowerCase();
  
  // Feature Engineering (Ported from classifier.py)
  const patterns = {
    timeout: /timeout|timed?\s*out|exceeded?\s*(?:the\s+)?(?:execution\s+)?time|too\s+long/i,
    oom: /out\s*of\s*memory|oom|memory\s+(?:error|exhausted|exceeded)|cannot\s+allocate\s+memory|killed\s+(?:due\s+to\s+)?memory/i,
    network: /network\s+(?:error|timeout|unavailable|refused)|connection\s+(?:refused|timeout|reset|failed)|dns\s+(?:error|lookup\s+failed)|econnrefused|etimedout|socket/i,
    flake: /flaky|intermittent|retry|random|sporadic/i
  };

  const findings = {
    hasTimeout: patterns.timeout.test(text),
    hasOOM: patterns.oom.test(text),
    hasNetwork: patterns.network.test(text),
    hasFlake: patterns.flake.test(text),
    stepCount: (text.match(/step|job|stage/g) || []).length,
    length: text.length
  };

  // Inference Logic (Lightweight weighted model)
  let confidence = 0.5;
  const reasons: string[] = [];

  if (findings.hasFlake) { confidence += 0.3; reasons.push("flaky/retry keywords detected"); }
  if (findings.hasTimeout) { confidence += 0.15; reasons.push("timeout pattern detected"); }
  if (findings.hasOOM) { confidence += 0.1; reasons.push("memory pressure (OOM) signature"); }
  if (findings.hasNetwork) { confidence += 0.1; reasons.push("volatile network behavior"); }
  
  const isFlaky = confidence > 0.65;
  
  return {
    is_flaky: isFlaky,
    confidence: Math.min(0.95, confidence),
    reason: reasons.length > 0 ? reasons.join('; ') : "Standard regression signature detected",
    metrics: findings
  };
}

/**
 * 📈 CI Duration Forecaster (Native JS Port)
 */
function forecastDuration(runs: any[]) {
  if (runs.length < 5) {
    return { error: 'Insufficient clinical history for forecasting' };
  }

  const durations = runs.map(r => parseFloat(r.duration_seconds || r.duration || 0)).filter(d => d > 0);
  const n = durations.length;
  
  // Linear Regression (y = mx + b)
  const x = Array.from({ length: n }, (_, i) => i);
  const xSum = x.reduce((a, b) => a + b, 0);
  const ySum = durations.reduce((a, b) => a + b, 0);
  const xySum = x.reduce((a, b, i) => a + b * durations[i], 0);
  const x2Sum = x.reduce((a, b) => a + b * b, 0);

  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;

  // Forecast 30 days out (assuming 1 run per day)
  const forecast = Array.from({ length: 30 }, (_, i) => {
    const predictedDuration = slope * (n + i) + intercept;
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    
    // Map to predicted DX Score (Ported from forecaster.py)
    const score = Math.max(0, 100 - (predictedDuration / 60) * 8);

    return {
      date: date.toISOString().split('T')[0],
      predicted_score: Math.round(score * 100) / 100,
      volatility: calculateVolatility(durations)
    };
  });

  // Calculate days until grade D (score < 40)
  let daysUntilD = 999;
  for (let i = 0; i < forecast.length; i++) {
    if (forecast[i].predicted_score < 40) {
      daysUntilD = i + 1;
      break;
    }
  }

  return {
    forecast,
    trend: slope > 0.5 ? 'worsening' : slope < -0.5 ? 'improving' : 'stable',
    slope: Math.round(slope * 100) / 100,
    mae: calculateMAE(durations, slope, intercept),
    days_until_grade_d: daysUntilD
  };
}

function calculateVolatility(durations: number[]) {
  const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
  const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
  return Math.round((Math.sqrt(variance) / mean) * 100);
}

function calculateMAE(durations: number[], slope: number, intercept: number) {
  const errors = durations.map((y, x) => Math.abs(y - (slope * x + intercept)));
  return Math.round((errors.reduce((a, b) => a + b, 0) / durations.length) / 60 * 100) / 100; // in minutes
}
