'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FullScanResult, ScanProgress } from '@/lib/types';
import { getScoreColor } from '@/lib/scoring';
import { useSounds } from '@/lib/sounds';
import { useSurgeonVoice } from '@/lib/speech';
import { ThemeToggle } from '@/components/ThemeProvider';
import confetti from 'canvas-confetti';

interface FolderNode {
  name: string;
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  churn: number;
  complexity: number;
  status: 'waiting' | 'scanning' | 'scanned' | 'inflamed';
}

interface ModuleState {
  percent: number;
  status: 'waiting' | 'scanning' | 'complete' | 'error';
  score: number;
  message: string;
}

const MODULE_CONFIG = [
  { key: 'cicd', label: 'CI/CD Pipeline X-Ray', icon: '🔴', color: 'var(--critical-red)' },
  { key: 'reviews', label: 'Code Review Radar', icon: '🟡', color: 'var(--warning-amber)' },
  { key: 'heatmap', label: 'Friction Heatmap', icon: '🔥', color: 'var(--warning-orange)' },
  { key: 'deps', label: 'Dependency Scanner', icon: '🟢', color: 'var(--health-green)' },
  { key: 'sub', label: 'Sub-Modules Analysis', icon: '🔵', color: 'var(--scan-blue)' },
  { key: 'ai', label: 'AI Diagnosis Engine', icon: '🤖', color: 'var(--purple)' },
] as const;

const CLINICAL_LOGS = {
  cicd: [
    '🩺 [AUTOPSY] Initiating tissue sampling of CI/CD infrastructure...',
    '🔬 [SCAN] Analyzing src/app/api — Pathological complexity detected.',
    '📡 [RESONANCE] Measuring CI flow resistance: 14ms latency detected.',
    '🧪 [BIOPSY] Detecting build-node inflammation — Testing cycles unstable.',
    '⚡ [SIGNAL] Capturing neural dump of deployment pipelines...',
    '✅ [FLOW] Flow recovered. CI/CD tissue: STABLE.',
  ],
  reviews: [
    '👁️ [OPTIC] Activating reviewer PR radar — Scanning retina...',
    '🧬 [DNA] Sequencing developer collaboration patterns...',
    '👤 [MRI] Mapping knowledge silos — Vital signs: 72 BPM.',
    '📏 [DIMENSION] Measuring PR volumetric sprawl — Inflammatory response found.',
    '⏳ [PULSE] Detecting review-cycle staleness — Administering flow-booster.',
    '✅ [VISION] PR radar clear. Collaboration tissue: HEALTHY.',
  ],
  deps: [
    '📦 [CELLULAR] Scanning third-party dependency cellular structure...',
    '🔍 [SEQUENCING] DNA Sequencing: Matching graph against CVE database...',
    '⚠️ [TOXICOLOGY] Alert: Outdated package necrosis detected in deps-tree.',
    '📜 [ETHICS] Verifying open-source license compatibility...',
    '🛡️ [IMMUNITY] Mapping immunity profile against vulnerability exploits...',
    '✅ [SYSTEM] Immune system optimized. Dependency tissue: HEALTHY.',
  ],
  heatmap: [
    '🔥 [THERMAL] Generating thermal friction heatmap of codebase...',
    '🗺️ [TOPOGRAPHY] Mapping churn zones — High turbulence detected in /lib.',
    '📍 [PATHOLOGY] Necrosis Tagging: 12 instances of dead code tagged in /legacy.',
    '🎯 [SURGERY] Targeting anomaly clusters for surgical extraction...',
    '🧮 [COST] Computing monthly friction cost — Vitals: CRITICAL.',
    '✅ [TISSUE] Thermal scan complete. Necrosis zones tagged.',
  ],
  ai: [
    '🤖 [NEURAL] Activating Surgeon-AI neural diagnosis engine...',
    '🧠 [SYNAPSE] Processing 4,000+ diagnostic health vectors...',
    '💡 [PROTOCOL] Synthesizing recovery plan — 98% confidence reached.',
    '📝 [PRESCRIPTION] Writing surgical prescription for tech-debt removal...',
    '🎬 [VIRTUAL] Simulating recovery outcomes — Prognosis: EXCELLENT.',
    '✨ [FINAL] AI diagnosis finalized. Preparing surgical report.',
  ],
};

function generateClinicalLog(module: string, progress: number): string[] {
  const logs = CLINICAL_LOGS[module as keyof typeof CLINICAL_LOGS] || [];
  const idx = Math.floor((progress / 100) * (logs.length - 1));
  return [logs[idx] || logs[0]];
}

function generateRandomClinicalLog(): string {
  const logTypes = [
    { prefix: '🩺', message: 'Pathological biopsy complete.' },
    { prefix: '📡', message: 'Neural uplink established with GitHub API.' },
    { prefix: '🔬', message: 'Cellular complexity scan under 40x zoom.' },
    { prefix: '💉', message: 'Injecting diagnostic probes into /src/lib...' },
    { prefix: '🧬', message: 'DNA sequence: ACGT-REPO-HEALTH...' },
    { prefix: '📊', message: 'Computing DORA-vital metrics...' },
    { prefix: '🎯', message: 'Targeting anomaly cluster in node_modules...' },
    { prefix: '⚡', message: 'Synapse synchronization active.' },
    { prefix: '🧹', message: 'Sanitizing necrotic code tissue...' },
    { prefix: '💾', message: 'Archiving biopsy results to audit-log...' },
  ];
  const log = logTypes[Math.floor(Math.random() * logTypes.length)];
  return `${log.prefix} ${log.message}`;
}

function generateMockFolderTree(): FolderNode[] {
  const folders: FolderNode[] = [
    { name: 'src', path: 'src', x: 15, y: 10, width: 120, height: 80, churn: 85, complexity: 90, status: 'waiting' },
    { name: 'components', path: 'src/components', x: 20, y: 25, width: 50, height: 40, churn: 70, complexity: 75, status: 'waiting' },
    { name: 'lib', path: 'src/lib', x: 80, y: 25, width: 45, height: 35, churn: 60, complexity: 65, status: 'waiting' },
    { name: 'pages', path: 'src/pages', x: 20, y: 75, width: 55, height: 45, churn: 55, complexity: 50, status: 'waiting' },
    { name: 'utils', path: 'src/utils', x: 85, y: 70, width: 40, height: 30, churn: 40, complexity: 35, status: 'waiting' },
    { name: 'tests', path: 'tests', x: 55, y: 10, width: 60, height: 50, churn: 45, complexity: 40, status: 'waiting' },
    { name: 'docs', path: 'docs', x: 70, y: 55, width: 35, height: 30, churn: 20, complexity: 15, status: 'waiting' },
    { name: 'config', path: 'config', x: 40, y: 55, width: 25, height: 25, churn: 30, complexity: 25, status: 'waiting' },
  ];
  return folders;
}

/* ═══════════════════════════════════════════════════════════════
   BOOT SEQUENCE 2.0 — Matrix-style Live Data Stream
   ═══════════════════════════════════════════════════════════════ */
function MatrixRain({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    const columns = Math.floor(width / 20);
    const drops: number[] = new Array(columns).fill(1).map(() => Math.random() * -100);
    const chars = "0123456789ABCDEFHIJKLMNOPQRSTUVWXYZ$%&*+-<>=/";

    let animationFrame: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(4, 6, 8, 0.15)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.fillStyle = '#00e5ff';
      ctx.font = '12px var(--font-mono)';
      
      for(let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 20;
        const y = drops[i] * 20;
        
        ctx.globalAlpha = 0.5;
        ctx.fillText(text, x, y);
        
        if(y > height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      animationFrame = requestAnimationFrame(draw);
    };

    draw();
    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, [active]);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15, pointerEvents: 'none' }} />;
}

function MRISliceVisualization({ folders, scanProgress, currentModule }: { folders: FolderNode[], scanProgress: number, currentModule: string }) {
  const [scanLineY, setScanLineY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanLineY(prev => {
        const next = prev + 2;
        return next > 100 ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const getFolderColor = (folder: FolderNode, isScanned: boolean) => {
    if (folder.status === 'inflamed') return 'var(--critical-red)';
    if (folder.complexity > 60) return 'var(--warning-orange)';
    if (folder.complexity > 40) return 'var(--warning-amber)';
    return 'var(--health-green)';
  };

  const isInScanZone = (folderY: number, folderHeight: number) => {
    const folderCenter = folderY + folderHeight / 2;
    const scanY = scanProgress;
    return Math.abs(folderCenter - scanY) < 8;
  };

  return (
    <div className="mri-slice-container" ref={containerRef} style={{ position: 'relative' }}>
      <MatrixRain active={scanProgress < 100} />
      <div className="mri-slice-grid" />
      
      {/* Folder nodes */}
      {folders.map((folder, idx) => {
        const isScanned = scanProgress > folder.y + folder.height;
        const isInZone = isInScanZone(folder.y, folder.height);
        const isInflamed = folder.complexity > 70 && isScanned;
        
        return (
          <div
            key={idx}
            className={`mri-slice-folder ${isInflamed ? 'inflamed' : isScanned ? 'scanned' : isInZone ? 'scanning' : ''}`}
            style={{
              left: `${folder.x}%`,
              top: `${folder.y}%`,
              width: `${folder.width}px`,
              height: `${folder.height}px`,
            }}
          >
            <div 
              className="mri-slice-folder-icon"
              style={{ color: getFolderColor(folder, isScanned) }}
            >
              {folder.complexity > 70 ? '🔥' : folder.complexity > 40 ? '📁' : '📂'}
            </div>
            <div className="mri-slice-folder-name">{folder.name}</div>
          </div>
        );
      })}

      {/* Scan line */}
      <div 
        className="mri-slice-scan-line"
        style={{ top: `${scanProgress}%` }}
      />

      {/* Depth indicator */}
      <div className="mri-slice-depth-indicator">
        <span>DEPTH</span>
        <div className="mri-slice-depth-bar">
          <div 
            className="mri-slice-depth-progress"
            style={{ height: `${scanProgress}%` }}
          />
        </div>
        <span>{Math.round(scanProgress)}%</span>
      </div>

      {/* Legend */}
      <div className="mri-slice-legend">
        <div className="mri-slice-legend-item">
          <div className="mri-slice-legend-dot healthy" />
          <span>Healthy</span>
        </div>
        <div className="mri-slice-legend-item">
          <div className="mri-slice-legend-dot inflamed" />
          <span>Inflammation</span>
        </div>
        <div className="mri-slice-legend-item">
          <div className="mri-slice-legend-dot scanning" />
          <span>Scanning</span>
        </div>
      </div>

      {/* Crosshair */}
      <div className="mri-slice-crosshair" style={{ top: `${scanProgress}%` }}>
        <div className="mri-slice-crosshair-h" />
      </div>
    </div>
  );
}

function ScanningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const repoParam = searchParams.get('repo') || '';
  const vsParam = searchParams.get('vs') || '';
  const token = searchParams.get('token') || '';
  const [owner, repo] = repoParam.split('/');
  const [vsOwner, vsRepo] = vsParam.split('/');
  const { startMRIHum, stopMRIHum, playScoreChime } = useSounds();
  const { speakDiagnosis, speakGreeting } = useSurgeonVoice();
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const [modules, setModules] = useState<Record<string, ModuleState>>({
    cicd: { percent: 0, status: 'waiting', score: 0, message: '' },
    reviews: { percent: 0, status: 'waiting', score: 0, message: '' },
    heatmap: { percent: 0, status: 'waiting', score: 0, message: '' },
    deps: { percent: 0, status: 'waiting', score: 0, message: '' },
    sub: { percent: 0, status: 'waiting', score: 0, message: '' },
    ai: { percent: 0, status: 'waiting', score: 0, message: '' },
  });
  const [folders, setFolders] = useState<FolderNode[]>(generateMockFolderTree());
  const [logs, setLogs] = useState<string[]>([]);
  const [overallPercent, setOverallPercent] = useState(0);
  const [error, setError] = useState('');
  const [scanComplete, setScanComplete] = useState(false);
  const [dxScore, setDxScore] = useState<number | null>(null);
  const [dxGrade, setDxGrade] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Timer
  useEffect(() => {
    if (scanComplete || error) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [scanComplete, error]);

  // Animate DX score counter when scan completes
  useEffect(() => {
    if (dxScore === null) return;
    const duration = 1500;
    const startTime = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setAnimatedScore(Math.round(easeOut(progress) * dxScore));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Trigger confetti on A or B grade
    if (dxGrade === 'A' || dxGrade === 'B') {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: [dxGrade === 'A' ? '#00e676' : '#ffab00', '#ffffff', '#00e5ff']
        });
      }, 1000);
    }
  }, [dxScore, dxGrade]);

  useEffect(() => {
    if (!owner || !repo) {
      router.push('/');
      return;
    }

    if (soundsEnabled) {
      startMRIHum();
    }

    const performScan = async (o: string, r: string, isVs: boolean = false) => {
      const p = new URLSearchParams({ owner: o, repo: r });
      if (token) p.set('token', token);
      const eventSource = new EventSource(`/api/scan?${p.toString()}`);
      
      return new Promise<FullScanResult>((resolve, reject) => {
        eventSource.addEventListener('progress', (e) => {
          const data = JSON.parse(e.data) as ScanProgress;
          if (!isVs) {
            setOverallPercent(data.percent);
            
            // Add clinical log messages
            const modKey = data.module as string;
            if (modKey && modKey !== 'meta') {
              const clinicalLogs = generateClinicalLog(modKey, data.percent);
              if (clinicalLogs[0]) {
                setLogs(prev => [...prev, clinicalLogs[0]]);
              }
            } else if (data.message) {
              setLogs(prev => [...prev, `[${r}] › ${data.message}`]);
            }
            
            // Add random clinical log for more engagement
            if (Math.random() > 0.7) {
              setLogs(prev => [...prev, generateRandomClinicalLog()]);
            }
            
            if (modKey in modules) {
              setModules(prev => ({
                ...prev,
                [modKey]: { ...prev[modKey], percent: data.percent, status: data.status as ModuleState['status'], message: data.message || '' },
              }));
            }
          } else {
             if (data.message) setLogs(prev => [...prev, `[${r}] › ${data.message}`]);
          }
        });

        eventSource.addEventListener('module_complete', (e) => {
          if (isVs) return;
          const data = JSON.parse(e.data);
          const modKey = data.module as string;
          if (modKey in modules) {
            setModules(prev => ({
              ...prev,
              [modKey]: { percent: 100, status: 'complete', score: data.score || 0, message: data.message || '' },
            }));
          }
        });

        eventSource.addEventListener('scan_complete', (e) => {
          const result = JSON.parse(e.data) as FullScanResult;
          eventSource.close();
          resolve(result);
        });

        eventSource.addEventListener('error', (e) => {
          try {
            const data = JSON.parse((e as any).data || '{}');
            setError(data.message || 'Scan failed');
          } catch {
            setError('Connection lost. Please try again.');
          }
          eventSource.close();
          reject(new Error('Scan failed'));
        });

        eventSource.onerror = (e) => {
          if (!error && eventSource.readyState === EventSource.CLOSED) {
            setError('Connection lost or repository restricted. Please check your network and repo visibility.');
          }
          eventSource.close();
          reject(new Error('SSE Error'));
        };
      });
    };

    const startAll = async () => {
      try {
        if (voiceEnabled) {
          speakGreeting(`${owner}/${repo}`);
        }
        const result1 = await performScan(owner, repo);
        
        if (vsOwner && vsRepo) {
          setDxScore(result1.dxScore);
          setDxGrade(result1.grade);
          setLogs(prev => [...prev, `⚖️ Parallelizing Duel MRI: Analyzing ${vsOwner}/${vsRepo}...`]);
          const result2 = await performScan(vsOwner, vsRepo, true);
          sessionStorage.setItem('devmri_result', JSON.stringify(result1));
          sessionStorage.setItem('devmri_vs_result', JSON.stringify(result2));
          setLogs(prev => [...prev, `✓ Duel complete! Calculating comparison...`]);
          
          // Save to history
          const history = JSON.parse(localStorage.getItem('devmri_history') || '[]');
          const newEntry = { repo: `${owner}/${repo} vs ${vsOwner}/${vsRepo}`, score: result1.dxScore, grade: result1.grade, date: new Date().toISOString() };
          localStorage.setItem('devmri_history', JSON.stringify([newEntry, ...history.filter((h: any) => h.repo !== newEntry.repo)].slice(0, 10)));
        } else {
          setDxScore(result1.dxScore);
          setDxGrade(result1.grade);
          sessionStorage.setItem('devmri_result', JSON.stringify(result1));
          
          // Save to history
          const history = JSON.parse(localStorage.getItem('devmri_history') || '[]');
          const newEntry = { repo: `${owner}/${repo}`, score: result1.dxScore, grade: result1.grade, date: new Date().toISOString() };
          localStorage.setItem('devmri_history', JSON.stringify([newEntry, ...history.filter((h: any) => h.repo !== newEntry.repo)].slice(0, 10)));
        }
        
        setScanComplete(true);
        stopMRIHum();
        if (soundsEnabled) {
          playScoreChime();
        }
        if (voiceEnabled && dxScore !== null && dxGrade !== null) {
          const severity = dxScore >= 80 ? 'LOW' : dxScore >= 60 ? 'MEDIUM' : dxScore >= 40 ? 'HIGH' : 'CRITICAL';
          speakDiagnosis(dxScore, dxGrade, severity, `${owner}/${repo}`);
        }
        setTimeout(() => router.push('/dashboard'), 4500);
      } catch (e: any) {
        if (!error) setError(e.message || 'Diagnostic sequence interrupted.');
      }
    };

    startAll();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo, vsOwner, vsRepo, router]);

  // Auto-scroll terminal
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // Update folders as scan progresses
  useEffect(() => {
    if (overallPercent === 0) return;
    setFolders(prev => prev.map(folder => {
      const folderThreshold = folder.y + folder.height;
      if (overallPercent >= folderThreshold) {
        return { ...folder, status: folder.complexity > 70 ? 'inflamed' : 'scanned' };
      }
      if (overallPercent >= folder.y && overallPercent < folderThreshold) {
        return { ...folder, status: 'scanning' };
      }
      return folder;
    }));
  }, [overallPercent]);

  const scoreColor = dxScore !== null ? getScoreColor(dxScore) : 'var(--scan-cyan)';

  // UI Components
  const StatusPill = ({ status }: { status: string }) => {
    const colors = {
      waiting: { bg: 'rgba(var(--text-muted-rgb), 0.1)', text: 'var(--text-muted)' },
      scanning: { bg: 'rgba(var(--scan-cyan-rgb), 0.1)', text: 'var(--scan-cyan)' },
      complete: { bg: 'rgba(var(--health-green-rgb), 0.1)', text: 'var(--health-green)' },
      error: { bg: 'rgba(var(--critical-red-rgb), 0.1)', text: 'var(--critical-red)' },
    };
    const c = colors[status as keyof typeof colors] || colors.waiting;
    return (
      <span style={{ 
        padding: '2px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
        background: c.bg, color: c.text, textTransform: 'uppercase', letterSpacing: '0.05em'
      }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ 
      position: 'relative', minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Background Genetic Grid */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.05, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 2px 2px, var(--scan-cyan) 1px, transparent 0)',
        backgroundSize: '32px 32px'
      }} />

      {/* Header bar */}
      <div style={{ 
        padding: '16px 40px', borderBottom: '1px solid rgba(var(--scan-cyan-rgb),0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--nav-bg)',
        backdropFilter: 'blur(10px)', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em', cursor: 'pointer' }} onClick={() => router.push('/')}>
            Dev<span style={{ color: 'var(--scan-cyan)' }}>MRI</span>
          </div>
          <div style={{ height: 20, width: 1, background: 'var(--border-subtle)' }} />
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            AUTOPSY_MODE_ACTIVE // PID_{Math.random().toString(10).slice(-4)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Biopsy Subject</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--scan-cyan)', fontWeight: 600 }}>{owner}/{repo}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 80 }}>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Elapsed</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{elapsedTime}s</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              onClick={() => setSoundsEnabled(!soundsEnabled)} 
              style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              {soundsEnabled ? '🔊' : '🔇'}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', zIndex: 5 }}>
        {/* LEFT: Genetic Sidebar */}
        <div style={{ 
          width: '240px', borderRight: '1px solid rgba(var(--scan-cyan-rgb),0.08)', background: 'rgba(var(--bg-void-rgb),0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(var(--scan-cyan-rgb),0.05)' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em' }}>DNA_SEQUENCING</div>
          </div>
          <div style={{ flex: 1, overflowY: 'hidden', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} style={{ 
                padding: '2px 20px', fontSize: '0.6rem', fontFamily: 'var(--font-mono)',
                display: 'flex', alignItems: 'center', gap: 10, opacity: 0.2 + (Math.random() * 0.4)
              }}>
                <span style={{ color: 'var(--scan-cyan)' }}>{['G','A','T','C'][Math.floor(Math.random()*4)]}{['G','A','T','C'][Math.floor(Math.random()*4)]}</span>
                <span style={{ color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}>0x{Math.random().toString(16).slice(2, 8).toUpperCase()}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--health-green)', fontSize: '0.55rem' }}>{Math.floor(Math.random() * 100)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Main Autopsy View */}
        <div style={{ flex: 1, padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 32, overflowY: 'auto' }}>
          
          <div style={{ display: 'flex', gap: 32 }}>
            <div style={{ flex: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--scan-cyan)', animation: 'pulse 1.5s infinite' }} />
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>LIVE TISSUE SCAN: <span style={{ color: 'var(--scan-cyan)' }}>{repo.toUpperCase()}</span></h3>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>SLICE_ID_{Math.round(overallPercent)}</div>
              </div>
              <MRISliceVisualization folders={folders} scanProgress={overallPercent} currentModule="total" />
            </div>

            {/* Overall Score Prediction */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ 
                flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
                background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>AUTOPHAGY_PROGRESS</div>
                <div style={{ fontSize: '4.5rem', fontWeight: 900, color: 'var(--scan-cyan)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                  {overallPercent}%
                </div>
                <div style={{ marginTop: 20, width: '100%', height: 4, background: 'var(--bg-void)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${overallPercent}%`, height: '100%', background: 'linear-gradient(90deg, var(--scan-cyan), var(--health-green))', transition: 'width 0.5s ease' }} />
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 12 }}>{overallPercent < 100 ? 'Sequencing data points — Uplink stable.' : 'Sequencing complete — Preparing output.'}</p>
              </div>

              <div style={{ 
                padding: '20px', background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 16 }}>Subsystem Telemetry</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {MODULE_CONFIG.map(m => (
                    <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.8rem', opacity: modules[m.key]?.status === 'complete' ? 1 : 0.5 }}>{m.icon}</span>
                        <span style={{ fontSize: '0.7rem', color: modules[m.key]?.status === 'complete' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{m.label.split(' ')[0]}</span>
                      </div>
                      <StatusPill status={modules[m.key]?.status || 'waiting'} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM: Clinical Telemetry Log */}
          <div style={{ 
            background: 'var(--card-bg)', borderRadius: 16, border: '1px solid var(--border-subtle)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '12px 20px', background: 'rgba(var(--bg-void-rgb),0.3)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--scan-cyan)', fontWeight: 800, letterSpacing: '0.1em' }}>LIVE_AUTOPSY_LOGS</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>UPLINK_STATUS: CONNECTED</div>
            </div>
            <div 
              ref={logRef}
              className="custom-scrollbar"
              style={{ padding: '16px 20px', height: '160px', overflowY: 'auto', background: 'var(--bg-void)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}
            >
              {[...logs].reverse().map((msg, idx) => (
                <div key={idx} style={{ 
                  color: idx === 0 ? 'var(--health-green)' : 'var(--text-muted)', 
                  marginBottom: 6, 
                  opacity: Math.max(0.4, 1 - idx * 0.1),
                  display: 'flex', gap: 12
                }}>
                  <span style={{ opacity: 0.3 }}>[{new Date().toLocaleTimeString()}]</span>
                  <span>{msg}</span>
                </div>
              ))}
              {logs.length === 0 && <div style={{ color: '#334455' }}>Initializing tissue sampling...</div>}
            </div>
          </div>
        </div>
      </div>

      {scanComplete && (
        <div style={{ 
          position: 'fixed', inset: 0, background: 'var(--bg-void)', zIndex: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400, position: 'relative', zIndex: 10 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 32 }}>Scan Finalized</div>
            <div className="score-reveal" style={{ fontSize: '7rem', fontWeight: 900, color: scoreColor, lineHeight: 1, fontFamily: 'var(--font-mono)', marginBottom: 8, textShadow: `0 0 40px ${scoreColor}44` }}>
              {animatedScore || 0}
            </div>
            <div className="grade-drop" style={{ fontSize: '1.4rem', color: scoreColor, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 48, background: 'rgba(255,255,255,0.05)', padding: '8px 24px', borderRadius: 24, display: 'inline-block', border: `1px solid ${scoreColor}55` }}>GRADE: {dxGrade}</div>
            <br />
            <button 
              className="btn btn-primary"
              onClick={() => router.push(`/dashboard`)} // User can skip the timeout
              style={{ 
                padding: '16px 56px', fontSize: '1.05rem', fontWeight: 700,
                background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}dd)`,
                color: '#000', border: 'none', borderRadius: 32, cursor: 'pointer',
                boxShadow: `0 8px 32px ${scoreColor}33`
              }}
            >
              Enter Surgery Theatre →
            </button>
          </div>
          {/* Laser Sweep Effect */}
          <div className="laser-sweep" style={{ position: 'absolute', top: 0, bottom: 0, width: '4px', background: scoreColor, boxShadow: `0 0 40px 10px ${scoreColor}`, zIndex: 5 }} />
        </div>
      )}

      {error && (
        <div role="alert" style={{ 
          position: 'fixed', inset: 0, background: 'rgba(var(--bg-void-rgb),0.95)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 24, animation: 'shake 0.5s ease-in-out' }}>
              {error.includes('PRIVATE_REPO') ? '🔒' : error.includes('RATE_LIMIT') ? '⏳' : '☢️'}
            </div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--critical-red)', marginBottom: 12 }}>
              {error.includes('PRIVATE_REPO') ? 'Private Repository' : error.includes('RATE_LIMIT') ? 'Rate Limited' : 'Diagnostic Failure'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 32 }}>
              {error.replace('PRIVATE_REPO: ', '').replace('RATE_LIMIT: ', '')}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => router.push('/')}
                style={{ padding: '12px 32px' }}
              >
                Return to Clinic
              </button>
              {(error.includes('PRIVATE_REPO') || error.includes('RATE_LIMIT') || error.includes('rate') || error.includes('429')) && (
                <button 
                  className="btn" 
                  onClick={() => {
                    const token = window.prompt('Please enter your GitHub Personal Access Token:');
                    if (token) {
                      router.push(`/scanning?owner=${owner}&repo=${repo}${vsOwner ? `&vsOwner=${vsOwner}&vsRepo=${vsRepo}` : ''}&token=${token}`);
                      router.refresh();
                    }
                  }}
                  style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #00e5ff, #00b8d4)', color: '#001f24', border: 'none', fontWeight: 700 }}
                >
                  Apply GitHub Token
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.15); border-radius: 4px; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(1.05); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scoreReveal {
          from { opacity: 0; transform: translateY(20px); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .score-reveal { animation: scoreReveal 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes laserSweep {
          0% { left: -10vw; opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { left: 110vw; opacity: 0; }
        }
        .laser-sweep { animation: laserSweep 2.5s cubic-bezier(0.25, 0.8, 0.25, 1) infinite; }
        
        @keyframes gradeDrop {
          0% { transform: scale(3); opacity: 0; }
          50% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .grade-drop { animation: gradeDrop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.8s backwards; }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } }
        
        .btn-primary {
          padding: 16px 56px;
          background: var(--scan-cyan);
          color: #000;
          font-weight: 950;
          border: none;
          border-radius: 32px;
          box-shadow: 0 0 20px rgba(0,229,255,0.2);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .btn-primary:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 10px 40px rgba(0,229,255,0.5);
          background: #ffffff;
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 20%;
          height: 200%;
          background: rgba(255,255,255,0.6);
          transform: rotate(30deg);
          transition: all 0.6s ease;
          opacity: 0;
        }
        .btn-primary:hover::after {
          left: 140%;
          opacity: 1;
        }
        
        .btn-secondary {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: var(--text-muted);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
          border-color: rgba(255,255,255,0.3);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}

export default function ScanningPage() {
  return (
    <Suspense fallback={
      <main style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-void)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="heartbeat" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Initializing scan...</p>
        </div>
      </main>
    }>
      <ScanningContent />
    </Suspense>
  );
}
