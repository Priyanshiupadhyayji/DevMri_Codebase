import { NextRequest } from 'next/server';

// Badge color mapping
function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#00e676';
    case 'B': return '#00bcd4';
    case 'C': return '#ffab00';
    case 'D': return '#ff6d00';
    case 'F': return '#ff1744';
    default: return '#8899aa';
  }
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function generateBadgeSVG(score: number, grade: string, repoName?: string): string {
  const color = getGradeColor(grade);
  const label = 'DX Score';
  const value = `${score} (${grade})`;
  const labelWidth = 70;
  const valueWidth = 80;
  const totalWidth = labelWidth + valueWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#555"/>
      <stop offset="1" stop-color="#333"/>
    </linearGradient>
    <linearGradient id="val" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${color}"/>
      <stop offset="1" stop-color="${color}dd"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="1" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${labelWidth}" height="28" rx="4" fill="url(#bg)"/>
  <rect x="${labelWidth}" width="${valueWidth}" height="28" rx="4" fill="url(#val)"/>
  <rect x="${labelWidth}" width="4" height="28" fill="url(#val)"/>
  <!-- MRI scan line effect -->
  <rect x="0" y="13" width="${totalWidth}" height="1" fill="rgba(255,255,255,0.1)"/>
  <g fill="#fff" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="18" text-anchor="middle" fill="#fff" font-weight="600">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="18" text-anchor="middle" fill="#000" font-weight="700" filter="url(#glow)">${value}</text>
  </g>
  ${repoName ? `<title>DevMRI DX Score for ${repoName}: ${score}/100 (Grade ${grade})</title>` : ''}
</svg>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo');
  const scoreParam = searchParams.get('score');
  const format = searchParams.get('format') || 'svg';

  // If a score is provided directly (for cached/precomputed badges)
  if (scoreParam) {
    const score = parseInt(scoreParam, 10);
    const grade = getGrade(score);
    const svg = generateBadgeSVG(score, grade, repo || undefined);

    if (format === 'json') {
      return Response.json({
        schemaVersion: 1,
        label: 'DX Score',
        message: `${score} (${grade})`,
        color: getGradeColor(grade),
        repo,
      });
    }

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // If a repo is provided, do a quick scan to get the score
  if (repo) {
    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      return new Response('Invalid repo format. Use owner/repo', { status: 400 });
    }

    // For demo purposes, generate a deterministic score based on repo name hash
    let hash = 0;
    for (let i = 0; i < repo.length; i++) {
      hash = ((hash << 5) - hash) + repo.charCodeAt(i);
      hash |= 0;
    }
    const score = Math.abs(hash % 60) + 40; // 40-99 range
    const grade = getGrade(score);

    const svg = generateBadgeSVG(score, grade, repo);

    if (format === 'json') {
      return Response.json({
        repo,
        score,
        grade,
        color: getGradeColor(grade),
        label: 'DX Score',
        status: score >= 60 ? 'Healthy' : 'Symptomatic',
        interpretation: score >= 80 ? 'Elite' : score >= 60 ? 'Strong' : 'At Risk'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=1800',
        }
      });
    }

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=1800',
        's-maxage': '1800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Default: DevMRI branding badge
  const svg = generateBadgeSVG(0, '?', undefined);
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
