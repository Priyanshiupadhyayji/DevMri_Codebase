import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo') || 'owner/repo';
  const score = searchParams.get('score') || '0';
  const grade = searchParams.get('grade') || '?';
  const theme = searchParams.get('theme') || 'dark';
  const origin = req.headers.get('origin') || req.nextUrl.origin;

  const isDark = theme === 'dark';
  const bg = isDark ? '#0a0e14' : '#ffffff';
  const text = isDark ? '#e8edf4' : '#1a1a2e';
  const muted = isDark ? '#6b7280' : '#9ca3af';
  const border = isDark ? 'rgba(0,229,255,0.15)' : 'rgba(0,0,0,0.08)';
  const cyan = '#00e5ff';

  const gradeColors: Record<string, string> = {
    A: '#00e676', B: '#00bcd4', C: '#ffab00', D: '#ff6d00', F: '#ff1744',
  };
  const gc = gradeColors[grade] || muted;

  const js = `
(function() {
  var container = document.getElementById('devmri-widget');
  if (!container) {
    container = document.currentScript.parentElement;
  }
  
  var shadow = container.attachShadow ? container.attachShadow({mode: 'open'}) : container;
  
  shadow.innerHTML = \`
    <style>
      :host { display: block; }
      .devmri-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
        background: ${bg};
        border: 1px solid ${border};
        border-radius: 16px;
        padding: 20px 24px;
        max-width: 320px;
        box-shadow: 0 4px 24px rgba(0,0,0,${isDark ? '0.4' : '0.08'});
        text-decoration: none;
        display: block;
        color: ${text};
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
      }
      .devmri-widget:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(0,229,255,0.15);
      }
      .devmri-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-size: 11px;
        color: ${muted};
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 700;
      }
      .devmri-scan-line {
        width: 16px; height: 2px; background: ${cyan}; border-radius: 1px;
        animation: pulse 2s infinite;
      }
      @keyframes pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      .devmri-body {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .devmri-repo {
        font-size: 14px;
        font-weight: 700;
        color: ${text};
        margin-bottom: 4px;
      }
      .devmri-score-label {
        font-size: 11px;
        color: ${muted};
      }
      .devmri-right {
        text-align: right;
      }
      .devmri-score {
        font-size: 32px;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: ${gc};
        line-height: 1;
      }
      .devmri-grade {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px; height: 28px;
        border-radius: 8px;
        font-weight: 900;
        font-size: 14px;
        background: ${gc}22;
        color: ${gc};
        border: 1px solid ${gc};
        margin-top: 4px;
      }
      .devmri-footer {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid ${border};
        font-size: 10px;
        color: ${muted};
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    </style>
    <a href="${origin}/scanning?repo=${repo}" target="_blank" class="devmri-widget" rel="noopener">
      <div class="devmri-header">
        <div class="devmri-scan-line"></div>
        DevMRI DX Scan
      </div>
      <div class="devmri-body">
        <div>
          <div class="devmri-repo">${repo}</div>
          <div class="devmri-score-label">Developer Experience Score</div>
        </div>
        <div class="devmri-right">
          <div class="devmri-score">${score}</div>
          <div class="devmri-grade">${grade}</div>
        </div>
      </div>
      <div class="devmri-footer">
        <span>Scanned by DevMRI</span>
        <span>View full report →</span>
      </div>
    </a>
  \`;
})();
`;

  return new Response(js, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
