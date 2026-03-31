'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FullScanResult, Recommendation } from '@/lib/types';
import { EKGMonitor, EKGMonitorMini } from '@/components/EKGMonitor';
import { useSounds } from '@/lib/sounds';
import { useSurgeonVoice } from '@/lib/speech';
import { PostOpTracker } from '../components/PostOpTracker';

interface SurgeryTabProps {
  result: FullScanResult;
  aiDiagnosis: any;
  fixStatus: Record<string, any>;
  handleApplyFix: (rec: Recommendation) => void;
  fixingRec: string | null;
  fixPrLoading?: string | null;
  prCreated?: { url: string; number: number; note?: string } | null;
  createFixPR: (metric: string, title: string, description: string, path: string, code: string) => void;
  triggerVocalSurgery: () => void;
  isVocalListening: boolean;
  pendingSurgery?: { title: string; severity: string; initialCode?: string } | null;
  onSurgeryTriggered?: () => void;
}


export function SurgeryTab({
  result,
  aiDiagnosis,
  fixStatus,
  handleApplyFix,
  fixingRec,
  fixPrLoading,
  prCreated,
  createFixPR,
  triggerVocalSurgery,
  isVocalListening,
  pendingSurgery,
  onSurgeryTriggered
}: SurgeryTabProps) {
  const [surgeryCode, setSurgeryCode] = useState('');
  const [surgeryActive, setSurgeryActive] = useState(false);
  const [surgeryComplete, setSurgeryComplete] = useState(false);
  const [surgeryBpm, setSurgeryBpm] = useState(72);
  const [surgerySeverity, setSurgerySeverity] = useState('LOW');
  const [surgeryTitle, setSurgeryTitle] = useState('');
  const [selectedRecForSurgery, setSelectedRecForSurgery] = useState<Recommendation | null>(null);
  const [trackingPostOp, setTrackingPostOp] = useState<Recommendation | null>(null);
  // Prevents double-clicking DEPLOY FIX within the same surgery session
  const [deployFired, setDeployFired] = useState(false);

  // --- Prognosis Simulator State (SystemSketch-Inspired) ---
  const [simRunners, setSimRunners] = useState(1);
  const [simReviewSpeed, setSimReviewSpeed] = useState(1);
  const [simPredictedScore, setSimPredictedScore] = useState(result.dxScore);
  const [simTimeSaved, setSimTimeSaved] = useState(0);

  useEffect(() => {
    // Seed weight based on real repo activity: ~80 runs/mo or 40 reviews/mo averages
    const runWeight = Math.min(2.5, (result.cicd?.totalRuns || 10) / 40);
    const reviewWeight = Math.min(3.0, (result.reviews?.totalPRsAnalyzed || 5) / 10);

    // Dynamic improvement logic based on ACTUAL repo scale
    let scoreGain = (simRunners - 1) * (4.5 * runWeight) + (simReviewSpeed - 1) * (8.2 * reviewWeight);
    let newScore = Math.min(99, result.dxScore + scoreGain);
    setSimPredictedScore(newScore);

    // Time savings calculated from actual volume: ~15min per run saved, ~2h per review cycle saved
    const runSavings = (simRunners - 1) * (result.cicd?.totalRuns || 20) * 0.25; 
    const reviewSavings = (simReviewSpeed - 1) * (result.reviews?.totalPRsAnalyzed || 8) * 2.5; 
    
    setSimTimeSaved(Math.round(runSavings + reviewSavings));
  }, [simRunners, simReviewSpeed, result.dxScore, result.cicd, result.reviews]);
  // --- End Simulator Logic ---

  // Handle auto-starting surgery from external trigger (like Heatmap)
  useEffect(() => {
    if (pendingSurgery && !surgeryActive) {
      setSurgeryTitle(pendingSurgery.title);
      setSurgerySeverity(pendingSurgery.severity);
      setSelectedRecForSurgery({
        title: pendingSurgery.title,
        severity: pendingSurgery.severity as any,
        description: 'Initiating external repair protocol...',
        metric: 'General Fix',
        frictionCost: 0,
      } as any);

      setSurgeryCode(pendingSurgery.initialCode || '');
      setSurgeryActive(true);
      if (onSurgeryTriggered) onSurgeryTriggered();
    }
  }, [pendingSurgery, surgeryActive, onSurgeryTriggered]);
  
  const deployPanelRef = useRef<HTMLDivElement>(null);
  const surgeryRef = useRef<HTMLPreElement>(null);
  const { playHeartbeat, playSurgeryChime } = useSounds();
  const { speakSurgeryProgress } = useSurgeonVoice();
  const heartbeatIntervalRef = useRef<any>(null);

  // Heartbeat sound effect
  useEffect(() => {
    if (surgeryActive && surgeryBpm > 0) {
      const intervalMs = (60 / surgeryBpm) * 1000;
      playHeartbeat();
      heartbeatIntervalRef.current = setInterval(() => {
        playHeartbeat();
      }, intervalMs);
    }
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [surgeryActive, surgeryBpm, playHeartbeat]);

  // Completion sound and voice
  useEffect(() => {
    if (surgeryComplete) {
      playSurgeryChime();
      speakSurgeryProgress('complete');
    }
  }, [surgeryComplete, playSurgeryChime, speakSurgeryProgress]);

  // Start voice
  useEffect(() => {
    if (surgeryActive && !surgeryComplete) {
      speakSurgeryProgress('generating');
    }
  }, [surgeryActive, surgeryComplete, speakSurgeryProgress]);

  // Auto-scroll surgery console
  useEffect(() => {
    if (surgeryRef.current && surgeryActive) {
      surgeryRef.current.scrollTop = surgeryRef.current.scrollHeight;
    }
  }, [surgeryCode, surgeryActive]);

  // Auto-scroll to deploy panel when surgery completes
  useEffect(() => {
    if (surgeryComplete && deployPanelRef.current) {
      deployPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [surgeryComplete]);

  const commenceSurgery = async () => {
    if (!selectedRecForSurgery) return;
    setSurgeryActive(true);
    setSurgeryCode('');
    setSurgeryComplete(false);
    setDeployFired(false); // reset deploy lock for new surgery
    setSurgeryTitle(selectedRecForSurgery.title);
    
    const sev = selectedRecForSurgery.severity;
    const bpm = sev === 'CRITICAL' ? 135 : sev === 'HIGH' ? 105 : 82;
    setSurgeryBpm(bpm);
    setSurgerySeverity(sev);

    try {
      const res = await fetch('/api/surgery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recommendation: selectedRecForSurgery, 
          scanResults: result, 
          fixType: selectedRecForSurgery.metric 
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      if (reader) {
        let streamHadCompleteEvent = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const blocks = buf.split('\n\n');
          buf = blocks.pop() || '';
          
          for (const block of blocks) {
            const em = block.match(/^event: (\w+)/m);
            const dm = block.match(/^data: (.+)$/m);
            if (!em || !dm) continue;
            
            const ev = em[1];
            const d = JSON.parse(dm[1]);
            
            if (ev === 'code_chunk') {
              setSurgeryCode(prev => prev + d.content);
            } else if (ev === 'surgery_complete') {
              streamHadCompleteEvent = true;
              setSurgeryComplete(true);
              setSurgeryActive(false);
              setSurgeryBpm(68);
            } else if (ev === 'surgery_start') {
              setSurgeryBpm(d.bpm);
            }
          }
        }
        // Fallback: if stream ended but surgery_complete event was never received
        if (!streamHadCompleteEvent) {
          setSurgeryComplete(true);
          setSurgeryActive(false);
          setSurgeryBpm(68);
        }
      }
    } catch (err) {
      console.error('Surgery failed:', err);
      setSurgeryActive(false);
      setSurgeryComplete(false);
    }
  };

  const dxScore = result.dxScore;

  return (
    <div className="animate-fade-in surgery-theatre">
      {/* Animated grid background */}
      <div className="surgery-grid-bg" />

      {/* Scan Status Strip */}
      <div className="surgery-scan-status">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className={`surgery-status-dot ${surgeryActive ? 'active' : surgeryComplete ? 'complete' : 'idle'}`} />
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: surgeryActive ? '#00e5ff' : surgeryComplete ? '#00e676' : 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {surgeryActive ? 'Scanning Repository…' : surgeryComplete ? 'Scan Complete' : selectedRecForSurgery ? 'Case Selected — Ready' : 'Awaiting Case Selection'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            ISSUES: <span style={{ color: '#00e5ff', fontWeight: 800 }}>{aiDiagnosis?.recommendations.length || 0}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            DX SCORE: <span style={{ color: dxScore >= 70 ? '#00e676' : dxScore >= 40 ? '#ffab00' : '#ff1744', fontWeight: 800 }}>{dxScore}</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            BPM: <span style={{ color: surgeryBpm > 110 ? '#ff1744' : '#00e676', fontWeight: 800 }}>{surgeryActive || surgeryComplete ? surgeryBpm : '--'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 0, position: 'relative', zIndex: 1 }}>
        
        {/* LEFT: Case File Cards */}
        <div style={{ borderRight: '1px solid rgba(0,229,255,0.06)', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 680, overflowY: 'auto' }} className="custom-scrollbar">
          
          {/* Prognosis Simulator (Feature Transplant from SystemSketch) */}
          <div className="simulation-hud" style={{ padding: 20, background: 'rgba(0,229,255,0.04)', borderRadius: 12, border: '1px solid rgba(0,229,255,0.1)', marginBottom: 20 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--scan-cyan)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>
              ▸ PROGNOSIS_SIMULATOR (V2.1)
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.65rem', color: '#a0aec0', fontWeight: 800 }}>PIPELINE CAPACITY (RUNNERS)</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--scan-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>{simRunners}x</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" 
                    value={simRunners} 
                    onChange={(e) => setSimRunners(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--scan-cyan)' }}
                  />
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.65rem', color: '#a0aec0', fontWeight: 800 }}>REVIEW VELOCITY (BOOST)</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--scan-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 900 }}>{simReviewSpeed}x</span>
                  </div>
                  <input 
                    type="range" min="1" max="5" 
                    value={simReviewSpeed} 
                    onChange={(e) => setSimReviewSpeed(parseInt(e.target.value))} 
                    style={{ width: '100%', accentColor: 'var(--scan-cyan)' }}
                  />
                </div>
                
                <div style={{ marginTop: 8, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(0,229,255,0.1)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>PREDICTED_DX_GAIN</span>
                      <span style={{ fontSize: '0.75rem', color: '#00e676', fontWeight: 900 }}>+{Math.round(simPredictedScore - result.dxScore)}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>EST_TIME_SAVED / MO</span>
                      <span style={{ fontSize: '0.7rem', color: '#00e676', fontWeight: 900 }}>{simTimeSaved}h</span>
                   </div>
                </div>
            </div>
          </div>
          
          <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--scan-cyan)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.15em', padding: '0 4px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
            ▸ Surgical Intake / Case Files
          </div>

          {(!aiDiagnosis?.recommendations || aiDiagnosis.recommendations.length === 0) ? (
            <>
              {[
                { severity: 'CRITICAL', title: 'Pipeline Parallelization', description: 'CI jobs are running sequentially. Parallelizing stages can reduce build time by 40-60%.', metric: 'CI/CD', frictionCost: 4200 },
                { severity: 'HIGH', title: 'Review Bottleneck Detection', description: 'PR review latency exceeds 48h for 35% of pull requests. Adding review SLAs and auto-assignment can accelerate flow.', metric: 'Reviews', frictionCost: 3100 },
                { severity: 'HIGH', title: 'Dependency Vulnerability Sweep', description: 'Outdated packages with known CVEs detected. Upgrading critical dependencies reduces supply-chain risk.', metric: 'Dependencies', frictionCost: 2800 },
                { severity: 'MEDIUM', title: 'Dead Code Excision', description: 'Unused modules and orphaned imports inflate cognitive load. Removing them improves onboarding speed.', metric: 'Code Health', frictionCost: 1500 },
                { severity: 'MEDIUM', title: 'Branch Hygiene Protocol', description: 'Stale branches and unprotected main increase merge conflict risk. Enabling branch protection rules stabilizes the trunk.', metric: 'Security', frictionCost: 1200 },
              ].map((rec, i) => {
                const isSelected = selectedRecForSurgery?.title === rec.title;
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedRecForSurgery(rec as any)}
                    className={`surgery-case-card ${isSelected ? 'selected' : ''}`}
                  >
                    {isSelected && <div className="active-bar" />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className={`surgery-severity-badge ${rec.severity.toLowerCase()}`}>{rec.severity}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>CASE #{(i + 1024).toString(16).toUpperCase()}</span>
                    </div>
                    <div style={{ padding: '4px 0', display: 'block', visibility: 'visible' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 900, color: isSelected ? 'var(--scan-cyan)' : '#ffffff', marginBottom: 8, display: 'block' }}>{rec.title}</div>
                      <div style={{ fontSize: '0.78rem', color: isSelected ? '#ffffff' : '#a0aec0', lineHeight: 1.6, fontWeight: 500, display: 'block' }}>{rec.description}</div>
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.7rem', color: isSelected ? '#00e676' : 'var(--scan-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>${rec.frictionCost}/mo</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`surgery-hotspot ${rec.severity === 'CRITICAL' ? 'critical' : rec.severity === 'HIGH' ? 'warning' : 'info'}`} />
                        <span style={{ fontSize: '0.6rem', color: '#8899aa', fontWeight: 600 }}>{rec.metric}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
          aiDiagnosis.recommendations.map((rec: Recommendation, i: number) => {
            const isSelected = selectedRecForSurgery === rec;
            const isFixed = fixStatus[rec.title]?.success;
            const isDimmed = surgeryActive && !isSelected;
            
            return (
              <div
                key={i}
                onClick={() => !surgeryActive && setSelectedRecForSurgery(rec)}
                className={`surgery-case-card ${isSelected ? 'selected' : ''} ${isFixed ? 'completed' : ''} ${isDimmed ? 'dimmed' : ''}`}
              >
                {isSelected && <div className="active-bar" />}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span className={`surgery-severity-badge ${rec.severity.toLowerCase()}`}>
                    {isFixed ? '✓ FIXED' : rec.severity}
                  </span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    CASE #{(i + 1024).toString(16).toUpperCase()}
                  </span>
                </div>
                
                <div style={{ padding: '4px 0', display: 'block', visibility: 'visible' }}>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 900, 
                    color: isSelected ? 'var(--scan-cyan)' : '#ffffff', 
                    marginBottom: 8, 
                    display: 'block',
                    textShadow: isSelected ? '0 0 10px rgba(0, 229, 255, 0.2)' : 'none'
                  }}>
                    {rec.title || 'UNSPECIFIED_PATHOLOGY'}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.78rem', 
                    color: isSelected ? '#ffffff' : '#a0aec0', 
                    lineHeight: 1.6, 
                    fontWeight: 500, 
                    display: 'block',
                    opacity: isDimmed ? 0.6 : 1
                  }}>
                    {rec.description || 'Clinical description missing from diagnostic scan…'}
                  </div>
                </div>
                
                <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: isSelected ? '#00e676' : 'var(--scan-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    ${rec.frictionCost}/mo
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={`surgery-hotspot ${rec.severity === 'CRITICAL' ? 'critical' : rec.severity === 'HIGH' ? 'warning' : 'info'}`} />
                    <span style={{ fontSize: '0.6rem', color: '#8899aa', fontWeight: 600 }}>{rec.metric}</span>
                  </div>
                </div>
              </div>
            );
          })
          )}

          {/* ══ DEPLOY PANEL — shown ABOVE case list after surgery ══ */}
          {surgeryComplete && (
            <div
              ref={deployPanelRef}
              style={{
                marginBottom: 16,
                borderRadius: 14,
                overflow: 'hidden',
                border: '2px solid #00e676',
                background: 'linear-gradient(160deg, rgba(0,230,118,0.10) 0%, rgba(0,15,8,0.85) 100%)',
                boxShadow: '0 0 40px rgba(0,230,118,0.20), inset 0 0 30px rgba(0,230,118,0.03)',
                animation: 'surgeryDeployReveal 0.45s cubic-bezier(0.16,1,0.3,1) both',
              }}
            >
              {/* Status header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,230,118,0.2)',
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(0,230,118,0.06)',
              }}>
                <span style={{ fontSize: '1.1rem' }}>✅</span>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#00e676', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Surgery Complete</div>
                  <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                    {surgeryCode.split('\n').length} lines generated · ready to deploy
                  </div>
                </div>
              </div>

              {/* Buttons / PR result */}
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                {/* ── PR SUCCESS CARD ── shown after deploy */}
                {prCreated ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Clickable PR link */}
                    <a
                      href={prCreated.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, rgba(0,230,118,0.15) 0%, rgba(0,200,100,0.08) 100%)',
                        border: '1.5px solid rgba(0,230,118,0.5)',
                        borderRadius: 10,
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 0 20px rgba(0,230,118,0.15)',
                        animation: 'surgeryDeployReveal 0.4s cubic-bezier(0.16,1,0.3,1) both',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(135deg, rgba(0,230,118,0.25) 0%, rgba(0,200,100,0.15) 100%)';
                        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 32px rgba(0,230,118,0.3)';
                        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLAnchorElement).style.background = 'linear-gradient(135deg, rgba(0,230,118,0.15) 0%, rgba(0,200,100,0.08) 100%)';
                        (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 20px rgba(0,230,118,0.15)';
                        (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.2rem' }}>🎉</span>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#00e676', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            PR #{prCreated.number} Live!
                          </div>
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                            Click to view on GitHub ↗
                          </div>
                        </div>
                      </div>
                      <div style={{
                        padding: '6px 12px', borderRadius: 6,
                        background: '#00e676', color: '#001a0a',
                        fontSize: '0.65rem', fontWeight: 900,
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                      }}>VIEW PR ↗</div>
                    </a>

                    {/* Note if fork / demo */}
                    {prCreated.note && (
                      <div style={{
                        padding: '8px 12px',
                        background: 'rgba(255,171,0,0.07)',
                        border: '1px solid rgba(255,171,0,0.2)',
                        borderRadius: 8,
                        fontSize: '0.6rem',
                        color: 'rgba(255,200,100,0.8)',
                        fontFamily: 'var(--font-mono)',
                        lineHeight: 1.5,
                      }}>
                        ℹ️ {prCreated.note}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Primary: DEPLOY FIX button */
                  <button
                    disabled={!!fixPrLoading || deployFired}
                    onClick={() => {
                      if (selectedRecForSurgery && !deployFired) {
                        setDeployFired(true); // lock immediately to prevent double-click
                        createFixPR(
                          selectedRecForSurgery.metric,
                          `Surgery: ${selectedRecForSurgery.title}`,
                          selectedRecForSurgery.description,
                          `.devmri/surgery-fix.yml`,
                          surgeryCode
                        );
                      }
                    }}
                    style={{
                      width: '100%', padding: '12px 16px',
                      fontSize: '0.8rem', fontWeight: 900,
                      background: fixPrLoading ? 'rgba(0,230,118,0.3)' : 'linear-gradient(135deg, #00e676, #00c853)',
                      color: fixPrLoading ? '#00e676' : '#001a0a',
                      border: fixPrLoading ? '1px solid #00e676' : 'none',
                      borderRadius: 10, cursor: fixPrLoading ? 'wait' : 'pointer',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
                      boxShadow: fixPrLoading ? 'none' : '0 4px 20px rgba(0,230,118,0.45)',
                      transition: 'all 0.25s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    {fixPrLoading ? '⏳ CREATING PR…' : '🚀 DEPLOY FIX'}
                  </button>
                )}

                {/* Secondary row */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(surgeryCode)}
                    style={{
                      flex: 1, padding: '9px 12px', fontSize: '0.65rem', fontWeight: 800,
                      background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.25)',
                      color: 'var(--scan-cyan)', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >📋 COPY</button>
                  <button
                    onClick={() => { setSurgeryComplete(false); setSurgeryCode(''); setSelectedRecForSurgery(null); }}
                    style={{
                      flex: 1, padding: '9px 12px', fontSize: '0.65rem', fontWeight: 700,
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.5)', borderRadius: 8, cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >↺ RESET</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ SURGICAL ACTIONS BAR ══ */}
          {!surgeryActive && !surgeryComplete && selectedRecForSurgery && (
            <div style={{ marginTop: 8 }}>
              {/* Section label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.12)' }} />
                <span style={{
                  fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.14em',
                  color: 'rgba(0,229,255,0.38)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                }}>SURGICAL ACTIONS</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.12)' }} />
              </div>

              {/* Button row */}
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>

                {/* FIX IT — primary CTA */}
                <button
                  onClick={commenceSurgery}
                  style={{
                    flexShrink: 0, padding: '0 16px', height: 40,
                    background: 'linear-gradient(135deg, #00e5ff 0%, #00b8d9 100%)',
                    color: '#002a33', border: 'none', borderRadius: 999,
                    cursor: 'pointer', fontSize: '0.71rem', fontWeight: 900,
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 0 18px rgba(0,229,255,0.35), 0 2px 8px rgba(0,0,0,0.4)',
                    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 28px rgba(0,229,255,0.55), 0 4px 16px rgba(0,0,0,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 18px rgba(0,229,255,0.35), 0 2px 8px rgba(0,0,0,0.4)'; }}
                >
                  <span style={{ fontSize: '0.88rem' }}>⚡</span> FIX IT
                </button>

                {/* APPLY FIX — 3-state (normal / loading / success) */}
                {(() => {
                  const st = fixStatus[selectedRecForSurgery.title];
                  const isLoading = fixingRec === selectedRecForSurgery.title;
                  if (st?.success) {
                    return (
                      <button
                        onClick={() => { if (st?.url) window.open(st.url, '_blank'); }}
                        style={{
                          flex: 1, height: 40, padding: '0 12px',
                          background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
                          color: '#001a0a', border: 'none', borderRadius: 999,
                          cursor: 'pointer', fontSize: '0.65rem', fontWeight: 900,
                          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          boxShadow: '0 0 20px rgba(0,230,118,0.45)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 32px rgba(0,230,118,0.65)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.45)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <span>✅</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>PR #{st?.number} CREATED (VIEW ↗)</span>
                      </button>
                    );
                  }
                  return (
                    <button
                      disabled={isLoading || !!fixingRec || surgeryActive}
                      onClick={() => handleApplyFix(selectedRecForSurgery)}
                      style={{
                        flex: 1, height: 40, padding: '0 12px',
                        background: isLoading ? 'rgba(0,229,255,0.06)' : 'rgba(0,229,255,0.04)',
                        color: isLoading ? '#00e5ff' : 'rgba(0,229,255,0.8)',
                        border: `1.5px solid ${isLoading ? '#00e5ff' : 'rgba(0,229,255,0.28)'}`,
                        borderRadius: 999, cursor: isLoading ? 'wait' : 'pointer',
                        fontSize: '0.67rem', fontWeight: 800,
                        fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        boxShadow: isLoading ? '0 0 16px rgba(0,229,255,0.25), inset 0 0 12px rgba(0,229,255,0.05)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all 0.25s',
                      }}
                      onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.background = 'rgba(0,229,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.55)'; e.currentTarget.style.boxShadow = '0 0 14px rgba(0,229,255,0.2)'; } }}
                      onMouseLeave={e => { if (!isLoading) { e.currentTarget.style.background = 'rgba(0,229,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.28)'; e.currentTarget.style.boxShadow = 'none'; } }}
                    >
                      {isLoading
                        ? <><span style={{ fontSize: '0.8rem' }}>⏳</span> PR&hellip;</>
                        : <><span style={{ fontSize: '0.85rem' }}>🩹</span> APPLY FIX</>}
                    </button>
                  );
                })()}

                {/* TRACK RECOVERY — shown after PR success */}
                {fixStatus[selectedRecForSurgery.title]?.success && (
                  <button
                    onClick={() => setTrackingPostOp(selectedRecForSurgery)}
                    style={{
                      flexShrink: 0, height: 40, padding: '0 14px',
                      background: 'rgba(0,230,118,0.06)', color: '#00e676',
                      border: '1.5px solid rgba(0,230,118,0.38)', borderRadius: 999,
                      cursor: 'pointer', fontSize: '0.64rem', fontWeight: 800,
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.07em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 0 12px rgba(0,230,118,0.12)',
                      display: 'flex', alignItems: 'center', gap: 6,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,230,118,0.14)'; e.currentTarget.style.borderColor = 'rgba(0,230,118,0.65)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,230,118,0.28)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,230,118,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,230,118,0.38)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,230,118,0.12)'; }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>📡</span> TRACK RECOVERY
                  </button>
                )}

                {/* MIC button */}
                <button
                  onClick={triggerVocalSurgery}
                  style={{
                    flexShrink: 0, width: 40, height: 40,
                    background: isVocalListening ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${isVocalListening ? '#00e5ff' : 'rgba(255,255,255,0.11)'}`,
                    borderRadius: 999, cursor: 'pointer', fontSize: '1rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isVocalListening ? '0 0 20px rgba(0,229,255,0.4), inset 0 0 10px rgba(0,229,255,0.1)' : 'none',
                    position: 'relative', transition: 'all 0.2s',
                  }}
                >
                  {isVocalListening ? '🗣️' : '🎙️'}
                  {isVocalListening && (
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' }}>
                      <div className="audio-wave">
                        <div className="audio-bar" style={{ animationDelay: '0.0s' }}></div>
                        <div className="audio-bar" style={{ animationDelay: '0.1s' }}></div>
                        <div className="audio-bar" style={{ animationDelay: '0.2s' }}></div>
                        <div className="audio-bar" style={{ animationDelay: '0.3s' }}></div>
                        <div className="audio-bar" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  )}
                </button>

              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Scan Console (Hero Area) */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

          {/* Console Header + EKG */}
          <div className="surgery-console-workstation" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,229,255,0.01)', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: 12, 
                background: surgeryActive ? 'rgba(0,229,255,0.08)' : 'var(--bg-frost)', 
                border: `1px solid ${surgeryActive ? 'rgba(0,229,255,0.3)' : 'var(--border-subtle)'}`, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                boxShadow: surgeryActive ? '0 0 20px rgba(0,229,255,0.15)' : 'none',
                transition: 'all 0.3s'
              }}>
                {surgeryActive ? '⚡' : surgeryComplete ? '✅' : '🏥'}
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: surgeryActive ? 'var(--scan-cyan)' : 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {surgeryActive ? 'OPERATIVE LIVE' : surgeryComplete ? 'SURGERY COMPLETE' : selectedRecForSurgery ? 'CASE LOADED' : 'STANDBY'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: 2, letterSpacing: '0.05em' }}>
                  {surgeryActive ? `Repairing: ${surgeryTitle}` : surgeryComplete ? 'Fix validated — ready to deploy' : selectedRecForSurgery ? selectedRecForSurgery.title.substring(0, 50) : 'Select a case to begin'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <EKGMonitorMini bpm={surgeryBpm} isActive={surgeryActive || surgeryComplete} severity={surgerySeverity as any} />
            </div>
          </div>

          {/* MAIN SCAN AREA — The Hero */}
          <div className="surgery-scan-console" style={{ flex: 1, borderRadius: 0, border: 'none', minHeight: 480 }}>
            {/* Scan line animation */}
            <div className="surgery-scan-line" />
            {/* Grid overlay */}
            <div className="surgery-scan-grid" />
            {/* Waveform radial */}
            <div className="surgery-waveform-bg" />

            {/* Terminal header with dots */}
            <div className="surgery-console-header">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                  DEVMRI_SURGICAL_ENV — {selectedRecForSurgery?.metric || 'idle'}
                </span>
              </div>
              {surgeryComplete && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.6rem', color: '#00e676', fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.06em' }}>✓ FIX_VALIDATED</span>
                </div>
              )}
            </div>

            {/* Code output area */}
            <div style={{ position: 'relative' }}>
              {/* Line number gutter */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 44, borderRight: '1px solid rgba(0,229,255,0.03)', background: 'rgba(0,0,0,0.25)', pointerEvents: 'none', zIndex: 2 }} />
              
              <pre
                ref={surgeryRef}
                className="custom-scrollbar"
                style={{
                  padding: '20px 24px 20px 56px', margin: 0, fontSize: '0.82rem',
                  fontFamily: 'var(--font-mono)', color: '#00e676',
                  background: 'transparent', minHeight: 380, maxHeight: 500,
                  overflowY: 'auto', lineHeight: 1.8, position: 'relative', zIndex: 1
                }}
              >
                {surgeryCode || (
                  <div style={{ color: 'rgba(0,229,255,0.15)', fontStyle: 'italic' }}>
                    {`// ─────────────────────────────────────────\n// DevMRI Surgical Console v2.0\n// ─────────────────────────────────────────\n//\n// Select a case file to begin diagnosis.\n// The scan area will display generated fix code.\n//\n// Supported operations:\n//   ⚡ COMMENCE  → AI-generated code repair\n//   🩹 APPLY FIX → Create GitHub Pull Request\n//   🎙️ VOICE     → Vocal surgical commands\n//\n// Waiting for surgical initiation…`}
                  </div>
                )}
                {surgeryActive && <span style={{ animation: 'scanPulse 0.8s infinite', color: '#00e5ff', fontWeight: 900 }}>█</span>}
              </pre>
            </div>

            {/* Status footer */}
            <div className="surgery-console-footer">
              <div style={{ display: 'flex', gap: 20 }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
                  STATUS: <span style={{ color: surgeryActive ? '#00e5ff' : surgeryComplete ? '#00e676' : 'rgba(255,255,255,0.15)' }}>
                    {surgeryActive ? 'REWRITING_TISSUE' : surgeryComplete ? 'FIX_VALIDATED' : 'IDLE'}
                  </span>
                </span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
                  LINES: {surgeryCode.split('\n').length}
                </span>
              </div>
              <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.15)', fontWeight: 800, letterSpacing: '0.05em' }}>
                DEVMRI_SURGICAL_OS_V2
              </span>
            </div>
          </div>

          {/* Deploy banner moved to left sidebar — nothing here */}

          {/* Background EKG wave fallback */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none', zIndex: 0 }}>
            <EKGMonitor bpm={surgeryBpm} isActive={surgeryActive} severity="LOW" />
          </div>

        </div>
      </div>

      {trackingPostOp && (
        <PostOpTracker 
          prNumber={fixStatus[trackingPostOp.title]?.number || 999}
          prUrl={fixStatus[trackingPostOp.title]?.url || '#'}
          recommendation={trackingPostOp}
          onClose={() => setTrackingPostOp(null)}
        />
      )}
    </div>
  );
}
