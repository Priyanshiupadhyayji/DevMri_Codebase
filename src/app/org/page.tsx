'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeProvider';

interface RepoResult {
  name: string;
  fullName: string;
  language: string | null;
  stars: number;
  dxScore: number;
  grade: string;
  frictionCost: number;
  hasCI: boolean;
  ciSuccessRate: number;
  openIssues: number;
  daysSincePush: number;
  avgPRAge: number;
  health: 'healthy' | 'warning' | 'necrosis';
}

interface FleetResult {
  org: string;
  totalRepos: number;
  avgDxScore: number;
  orgGrade: string;
  totalFrictionCost: number;
  annualFrictionCost: number;
  healthyCount: number;
  warningCount: number;
  necrosisCount: number;
  leaderboard: RepoResult[];
  topPerformers: RepoResult[];
  worstPerformers: RepoResult[];
}

const GRADE_COLORS: Record<string, string> = {
  A: 'var(--health-green)', B: 'var(--scan-cyan)', C: 'var(--warning-amber)', D: 'var(--warning-orange)', F: 'var(--critical-red)',
};

const HEALTH_ICONS: Record<string, string> = {
  healthy: '💚', warning: '🟡', necrosis: '💀',
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f7df1e', Python: '#3776ab',
  Go: '#00add8', Rust: '#dea584', Java: '#b07219', Ruby: '#701516',
  Shell: '#89e051', C: '#555555', 'C++': '#f34b7d', 'C#': '#178600',
};

export default function OrgFleetPage() {
  const router = useRouter();
  const [orgInput, setOrgInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ message: '', percent: 0 });
  const [scannedRepos, setScannedRepos] = useState<RepoResult[]>([]);
  const [fleetResult, setFleetResult] = useState<FleetResult | null>(null);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'dxScore' | 'frictionCost' | 'stars'>('dxScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterHealth, setFilterHealth] = useState<'all' | 'healthy' | 'warning' | 'necrosis'>('all');
  const [animatedCost, setAnimatedCost] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  const [activeView, setActiveView] = useState<'table' | 'ward'>('table');

  const downloadFleetReport = () => {
    if (!fleetResult) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const reportId = `FLEET-MRI-${new Date().getTime().toString().slice(-8)}`;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    printWindow.document.write(`
      <html>
        <head>
          <title>Fleet Clinical Report - ${fleetResult.org}</title>
          <style>
            body { font-family: 'JetBrains Mono', monospace; padding: 40px; color: #1a1a1a; }
            .header { border-bottom: 3px solid #00e5ff; padding-bottom: 20px; margin-bottom: 30px; }
            .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .stat-box { padding: 20px; border: 1px solid #eee; border-radius: 8px; text-align: center; }
            .table { width: 100%; border-collapse: collapse; }
            .table th { text-align: left; padding: 12px; border-bottom: 2px solid #eee; color: #666; font-size: 12px; }
            .table td { padding: 12px; border-bottom: 1px solid #f5f5f5; font-size: 13px; }
            .grade { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DevMRI Fleet Diagnostic Report</h1>
            <p><strong>Organization:</strong> ${fleetResult.org} · <strong>Report ID:</strong> ${reportId} · <strong>Date:</strong> ${date}</p>
          </div>
          <div class="stats">
            <div class="stat-box"><h3>AVG DX SCORE</h3><span style="font-size: 32px; font-weight: 900; color: #00e5ff;">${fleetResult.avgDxScore}</span></div>
            <div class="stat-box"><h3>ANNUAL FRICTION</h3><span style="font-size: 32px; font-weight: 900; color: #ff1744;">$${(fleetResult.annualFrictionCost / 1000).toFixed(0)}K</span></div>
            <div class="stat-box"><h3>HEALTH RANGE</h3><span style="font-size: 18px; font-weight: 700;">${fleetResult.healthyCount}H / ${fleetResult.warningCount}W / ${fleetResult.necrosisCount}N</span></div>
          </div>
          <table class="table">
            <thead>
              <tr><th>Repository</th><th>Score</th><th>Grade</th><th>Monthly Friction</th><th>Health</th></tr>
            </thead>
            <tbody>
              ${fleetResult.leaderboard.map(r => `
                <tr>
                  <td><strong>${r.name}</strong><br/><small style="color: #999;">${r.language || 'N/A'}</small></td>
                  <td>${r.dxScore}</td>
                  <td><span class="grade" style="background: ${GRADE_COLORS[r.grade]}22; color: ${GRADE_COLORS[r.grade]};">${r.grade}</span></td>
                  <td>$${r.frictionCost.toLocaleString()}</td>
                  <td>${r.health === 'healthy' ? '💚 Healthy' : r.health === 'warning' ? '🟡 Warning' : '💀 Necrosis'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Animate total friction cost
  useEffect(() => {
    if (!fleetResult) return;
    const target = fleetResult.annualFrictionCost;
    const duration = 2000;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedCost(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [fleetResult]);

  const startFleetScan = async () => {
    const org = orgInput.trim().replace(/^@/, '').replace(/\s+/g, '');
    if (!org) { setError('Enter an organization name'); return; }
    if (org.includes('@') || org.includes('.')) { setError('Enter a GitHub organization name (e.g. "vercel"), not an email address'); return; }
    if (org.includes('/')) { setError('Enter just the organization name (e.g. "facebook"), not a full repo path'); return; }
    setError('');
    setIsScanning(true);
    setScannedRepos([]);
    setFleetResult(null);
    setTerminalLogs([`[FLEET] Initiating org-wide scan for ${org}...`]);

    try {
      const params = new URLSearchParams({ org });
      if (tokenInput) params.set('token', tokenInput);

      const res = await fetch(`/api/org?${params.toString()}`);

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error');
        throw new Error(`API error ${res.status}: ${text}`);
      }

      if (!res.body) {
        throw new Error('No response stream received from server');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const block of lines) {
          const eventMatch = block.match(/^event: (\w+)/);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          let data;
          try {
            data = JSON.parse(dataMatch[1]);
          } catch {
            continue; // skip malformed JSON
          }

          switch (event) {
            case 'progress':
              setProgress({ message: data.message, percent: data.percent });
              setTerminalLogs(prev => [...prev, `[${data.phase?.toUpperCase() || 'SCAN'}] ${data.message}`]);
              break;
            case 'repo_scanned':
              setScannedRepos(prev => [...prev, data]);
              setTerminalLogs(prev => [...prev, `[OK] ${data.fullName} — DX: ${data.dxScore} (${data.grade}) — $${data.frictionCost}/mo`]);
              break;
            case 'repo_error':
              setTerminalLogs(prev => [...prev, `[ERR] ${data.repo}: ${data.error}`]);
              break;
            case 'fleet_complete':
              setFleetResult(data);
              setTerminalLogs(prev => [...prev, `[COMPLETE] Fleet scan finished — ${data.totalRepos} repos analyzed`]);
              break;
            case 'error':
              setError(data.message || 'Fleet scan failed');
              setTerminalLogs(prev => [...prev, `[FATAL] ${data.message}`]);
              break;
          }
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Fleet scan failed';
      setError(msg);
      setTerminalLogs(prev => [...prev, `[FATAL] ${msg}`]);
    }
    setIsScanning(false);
  };

  const sortedRepos = [...(fleetResult?.leaderboard || scannedRepos)]
    .filter(r => filterHealth === 'all' || r.health === filterHealth)
    .sort((a, b) => {
      const mult = sortDir === 'desc' ? -1 : 1;
      return mult * (a[sortBy] - b[sortBy]);
    });

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', overflow: 'hidden', background: 'var(--bg-void)' }}>
      <div className="grid-bg" />

      <main style={{ position: 'relative', zIndex: 1, padding: '32px 24px 64px' }}>
        <div className="container">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div>
                <button className="btn btn-ghost" onClick={() => router.push('/')} style={{ marginBottom: 8, fontSize: '0.8rem' }}>← Back to Scanner</button>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                  Enterprise <span style={{ color: 'var(--scan-cyan)' }}>Fleet Scan</span>
                </h1>
                <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: 4 }}>
                  Scan an entire GitHub organization. Rank team health. Quantify total friction debt.
                </p>
              </div>
              <ThemeToggle />
            </div>
            {fleetResult && (
              <div className="card" style={{ padding: '16px 24px', textAlign: 'center', border: `2px solid ${GRADE_COLORS[fleetResult.orgGrade]}` }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Org Grade</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: GRADE_COLORS[fleetResult.orgGrade] }}>{fleetResult.orgGrade}</div>
              </div>
            )}
          </div>

          {/* Input Section */}
          {!fleetResult && (
            <div className="card card-glow animate-fade-in" style={{ maxWidth: 600, margin: '0 auto 32px', padding: 32 }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>
                GitHub Organization
              </label>
              <input
                className="input input-lg"
                placeholder="vercel, facebook, microsoft..."
                value={orgInput}
                onChange={e => { setOrgInput(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && startFleetScan()}
                disabled={isScanning}
              />
              <div style={{ marginTop: 12 }}>
                <label style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>GitHub Token (recommended for org scans)</label>
                <input
                  className="input"
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  disabled={isScanning}
                  style={{ marginTop: 4 }}
                />
              </div>
              {error && <p style={{ color: 'var(--critical-red)', marginTop: 12, fontSize: '0.85rem' }}>{error}</p>}
              <button
                className="btn btn-primary"
                onClick={startFleetScan}
                disabled={isScanning || !orgInput.trim()}
                style={{ width: '100%', marginTop: 20, padding: '14px 24px', fontSize: '1.05rem', fontWeight: 700 }}
              >
                {isScanning ? (
                  <><span className="heartbeat" style={{ width: 8, height: 8 }} /> Scanning Fleet...</>
                ) : (
                  <>🏢 Launch Fleet Scan</>
                )}
              </button>

              {/* Quick presets */}
              <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['vercel', 'facebook', 'google', 'microsoft', 'netflix'].map(o => (
                  <button key={o} className="btn btn-ghost" onClick={() => { setOrgInput(o); }} style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress & Terminal */}
          {isScanning && (
            <div className="animate-fade-in" style={{ marginBottom: 32 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{progress.message}</span>
                  <span style={{ color: 'var(--scan-cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{progress.percent}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress.percent}%`, background: 'linear-gradient(90deg, var(--scan-cyan), var(--health-green))', borderRadius: 3, transition: 'width 0.3s ease' }} />
                </div>
              </div>
              <div ref={terminalRef} className="terminal" style={{ maxHeight: 200 }}>
                {terminalLogs.map((log, i) => (
                  <div key={i} className="terminal-line">
                    <span className="terminal-prefix">$</span>
                    <span style={{ color: log.includes('[ERR]') ? 'var(--critical-red)' : log.includes('[OK]') ? 'var(--health-green)' : log.includes('[COMPLETE]') ? 'var(--scan-cyan)' : 'var(--text-muted)' }}>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fleet Results */}
          {fleetResult && (
            <div className="animate-fade-in">
              {/* Org-Wide KPIs */}
              <div className="grid-4" style={{ marginBottom: 32 }}>
                <div className="card card-glow" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${GRADE_COLORS[fleetResult.orgGrade]}, transparent)` }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avg DX Score</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 900, color: GRADE_COLORS[fleetResult.orgGrade] }}>{fleetResult.avgDxScore}</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Annual Friction Debt</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 900, color: 'var(--critical-red)' }}>
                    ${animatedCost >= 1000000 ? `${(animatedCost / 1000000).toFixed(1)}M` : `${(animatedCost / 1000).toFixed(0)}K`}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>lost in developer wait-times</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Repos Scanned</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>{fleetResult.totalRepos}</p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
                    <div>
                      <div style={{ fontSize: '1.5rem' }}>💚</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--health-green)' }}>{fleetResult.healthyCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem' }}>🟡</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--warning-amber)' }}>{fleetResult.warningCount}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem' }}>💀</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--critical-red)' }}>{fleetResult.necrosisCount}</div>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>Health Distribution</p>
                </div>
              </div>

              {/* Org Health Bar */}
              <div className="card" style={{ marginBottom: 24, padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <h4 style={{ margin: 0 }}>Organizational Health Distribution</h4>
                </div>
                <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', gap: 2 }}>
                  {fleetResult.healthyCount > 0 && (
                    <div style={{ flex: fleetResult.healthyCount, background: 'var(--health-green)', transition: 'flex 1s ease' }} title={`${fleetResult.healthyCount} healthy`} />
                  )}
                  {fleetResult.warningCount > 0 && (
                    <div style={{ flex: fleetResult.warningCount, background: 'var(--warning-amber)', transition: 'flex 1s ease' }} title={`${fleetResult.warningCount} warning`} />
                  )}
                  {fleetResult.necrosisCount > 0 && (
                    <div style={{ flex: fleetResult.necrosisCount, background: 'var(--critical-red)', transition: 'flex 1s ease' }} title={`${fleetResult.necrosisCount} necrosis`} />
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  <span>💚 Healthy: {Math.round(fleetResult.healthyCount / fleetResult.totalRepos * 100)}%</span>
                  <span>🟡 Warning: {Math.round(fleetResult.warningCount / fleetResult.totalRepos * 100)}%</span>
                  <span>💀 Necrosis: {Math.round(fleetResult.necrosisCount / fleetResult.totalRepos * 100)}%</span>
                </div>
              </div>

              {/* Leaderboard Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <h3>🏆 Fleet Leaderboard</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['all', 'healthy', 'warning', 'necrosis'].map(f => (
                    <button
                      key={f}
                      className={`btn ${filterHealth === f ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFilterHealth(f as any)}
                      style={{ fontSize: '0.7rem', padding: '4px 12px' }}
                    >
                      {f === 'all' ? '📋 All' : f === 'healthy' ? '💚 Healthy' : f === 'warning' ? '🟡 Warning' : '💀 Necrosis'}
                    </button>
                  ))}
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '4px 12px', fontSize: '0.75rem' }}
                  >
                    <option value="dxScore">Sort: DX Score</option>
                    <option value="frictionCost">Sort: Friction Cost</option>
                    <option value="stars">Sort: Stars</option>
                  </select>
                  <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: 4, gap: 4 }}>
                    <button
                      onClick={() => setActiveView('table')}
                      style={{ padding: '6px 12px', border: 'none', background: activeView === 'table' ? 'rgba(0,229,255,0.1)' : 'transparent', color: activeView === 'table' ? 'var(--scan-cyan)' : 'var(--text-muted)', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      LIST
                    </button>
                    <button
                      onClick={() => setActiveView('ward')}
                      style={{ padding: '6px 12px', border: 'none', background: activeView === 'ward' ? 'rgba(0,229,255,0.1)' : 'transparent', color: activeView === 'ward' ? 'var(--scan-cyan)' : 'var(--text-muted)', borderRadius: 6, fontSize: '0.7rem', cursor: 'pointer', fontWeight: 700 }}
                    >
                      WARD
                    </button>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={downloadFleetReport}
                    style={{ fontSize: '0.7rem', padding: '10px 16px', border: '1px solid rgba(0,229,255,0.2)' }}
                  >
                    📋 Export Report
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  >
                    {sortDir === 'desc' ? '↓' : '↑'}
                  </button>
                </div>
              </div>

              {/* Leaderboard Rendering */}
              {activeView === 'ward' ? (
                 <div className="grid-4" style={{ gap: 20, marginBottom: 32 }}>
                    {sortedRepos.map((repo) => (
                      <div 
                        key={repo.fullName} 
                        className="card microscope-tile" 
                        onClick={() => router.push(`/scanning?repo=${repo.fullName}`)}
                        style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', border: `1px solid ${GRADE_COLORS[repo.grade]}33`, position: 'relative', minHeight: 160 }}
                      >
                         <div style={{ position: 'absolute', top: 12, right: 12, fontSize: '1.2rem' }}>{HEALTH_ICONS[repo.health]}</div>
                         <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>BED#{Math.floor(Math.random()*1000)+100}</div>
                         <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 12, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{repo.name}</div>
                         <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                            <div className="ekg-score-pulse" style={{ fontSize: '1.6rem', fontWeight: 900, color: GRADE_COLORS[repo.grade], fontFamily: 'var(--font-mono)' }}>{repo.dxScore}</div>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${GRADE_COLORS[repo.grade]}22`, color: GRADE_COLORS[repo.grade], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: `1px solid ${GRADE_COLORS[repo.grade]}44` }}>{repo.grade}</div>
                         </div>
                         <div style={{ marginTop: 16, fontSize: '0.65rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 10 }}>FRICTION: ${repo.frictionCost}/mo</div>
                      </div>
                    ))}
                 </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(var(--scan-cyan-rgb),0.03)' }}>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, width: 50 }}>#</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Repository</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>DX Score</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Grade</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Friction $/mo</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>CI</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Health</th>
                        <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                    {sortedRepos.map((repo, i) => (
                      <tr
                        key={repo.fullName}
                        style={{
                          borderBottom: '1px solid rgba(0,229,255,0.04)',
                          transition: 'background 0.2s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', color: i < 3 ? 'var(--health-green)' : 'var(--text-dim)', fontWeight: i < 3 ? 700 : 400 }}>
                          {i + 1}{i === 0 ? ' 🥇' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : ''}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{repo.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', gap: 8, marginTop: 2 }}>
                            {repo.language && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: LANGUAGE_COLORS[repo.language] || 'var(--text-muted)', display: 'inline-block' }} />
                                {repo.language}
                              </span>
                            )}
                            <span>⭐ {repo.stars}</span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: GRADE_COLORS[repo.grade] }}>{repo.dxScore}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 8, fontWeight: 900,
                            background: `${GRADE_COLORS[repo.grade]}22`, color: GRADE_COLORS[repo.grade],
                            border: `1px solid ${GRADE_COLORS[repo.grade]}44`,
                          }}>
                            {repo.grade}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: repo.frictionCost > 2000 ? '#ff1744' : '#e8edf4' }}>
                          ${repo.frictionCost.toLocaleString()}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          {repo.hasCI ? (
                            <span style={{ color: repo.ciSuccessRate > 80 ? 'var(--health-green)' : 'var(--warning-amber)' }}>{repo.ciSuccessRate}%</span>
                          ) : (
                            <span style={{ color: 'var(--critical-red)', fontSize: '0.75rem' }}>No CI</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '1.2rem' }}>
                          {HEALTH_ICONS[repo.health]}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button
                            className="btn btn-ghost"
                            onClick={(e) => { e.stopPropagation(); router.push(`/scanning?repo=${repo.fullName}`); }}
                            style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                          >
                            Deep Scan →
                          </button>
                        </td>
                      </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Enterprise Value Proposition */}
              <div className="module-card" style={{
                marginTop: 32,
                background: 'linear-gradient(135deg, rgba(255,23,68,0.05), rgba(255,109,0,0.03))',
                border: '1px solid rgba(255,23,68,0.2)',
                padding: 32,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <span style={{ fontSize: '2rem' }}>💸</span>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--critical-red)' }}>Total Friction Debt</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      This organization is losing an estimated
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '4rem', fontWeight: 900,
                    background: 'linear-gradient(135deg, var(--critical-red), var(--warning-orange))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>
                    ${animatedCost >= 1000000 ? `${(animatedCost / 1000000).toFixed(1)}M` : `${(animatedCost / 1000).toFixed(0)}K`}
                    <span style={{ fontSize: '1.5rem', WebkitTextFillColor: 'var(--text-muted)' }}>/year</span>
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: 4 }}>in developer wait-times across {fleetResult.totalRepos} repositories</p>
                </div>
                <div className="grid-3" style={{ gap: 12 }}>
                  <div style={{ padding: 16, background: 'rgba(var(--bg-void-rgb),0.3)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Monthly Burndown</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning-orange)' }}>
                      ${fleetResult.totalFrictionCost.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ padding: 16, background: 'rgba(var(--bg-void-rgb),0.3)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Engineer Hours Lost/Month</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning-amber)' }}>
                      {Math.round(fleetResult.totalFrictionCost / 75)}h
                    </div>
                  </div>
                  <div style={{ padding: 16, background: 'rgba(var(--bg-void-rgb),0.3)', borderRadius: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>FTE Equivalent</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--critical-red)' }}>
                      {(fleetResult.totalFrictionCost / (75 * 160)).toFixed(1)} engineers
                    </div>
                  </div>
                </div>
              </div>

              {/* New Scan Button */}
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => { setFleetResult(null); setScannedRepos([]); setOrgInput(''); }}
                  style={{ padding: '14px 40px' }}
                >
                  🏢 Scan Another Organization
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
