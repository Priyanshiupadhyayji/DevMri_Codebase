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
  createFixPR: (metric: string, title: string, description: string, path: string, code: string) => void;
  triggerVocalSurgery: () => void;
  isVocalListening: boolean;
  pendingSurgery?: { title: string; severity: string; initialCode?: string } | null;
  onSurgeryTriggered?: () => void; // Callback to clear pending state in parent
}


export function SurgeryTab({
  result,
  aiDiagnosis,
  fixStatus,
  handleApplyFix,
  fixingRec,
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

  const commenceSurgery = async () => {
    if (!selectedRecForSurgery) return;
    setSurgeryActive(true);
    setSurgeryCode('');
    setSurgeryComplete(false);
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
              setSurgeryComplete(true);
              setSurgeryActive(false);
              setSurgeryBpm(68);
            } else if (ev === 'surgery_start') {
              setSurgeryBpm(d.bpm);
            }
          }
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

          {aiDiagnosis?.recommendations.map((rec: Recommendation, i: number) => {
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
          })}

          {/* Action Buttons */}
          {!surgeryActive && !surgeryComplete && selectedRecForSurgery && (
            <div className="surgery-actions">
              <button
                className="surgery-btn-commence"
                onClick={commenceSurgery}
              >
                <div className="surgery-btn-commence-inner">
                  ⚡ FIX IT
                </div>
              </button>
              <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                <button
                  className="surgery-btn-fix"
                  disabled={!!fixingRec || surgeryActive}
                  onClick={() => handleApplyFix(selectedRecForSurgery)}
                  style={{ flex: 1 }}
                >
                  {fixingRec === selectedRecForSurgery?.title ? '⏳ PR…' : '🩹 APPLY FIX'}
                  {selectedRecForSurgery && fixStatus[selectedRecForSurgery.title]?.success && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        const status = fixStatus[selectedRecForSurgery.title];
                        if (status?.url) window.open(status.url, '_blank');
                      }}
                      style={{ 
                        position: 'absolute', inset: 0, 
                        background: 'linear-gradient(135deg, #00e676, #00c853)',
                        color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '0.7rem', fontWeight: 900, borderRadius: 12,
                        cursor: 'pointer'
                      }}
                    >
                      ✅ PR #{fixStatus[selectedRecForSurgery.title]?.number} CREATED (VIEW ↗)
                    </div>
                  )}
                </button>
                {selectedRecForSurgery && fixStatus[selectedRecForSurgery.title]?.success && (
                  <button
                    onClick={() => setTrackingPostOp(selectedRecForSurgery)}
                    style={{ 
                      flex: 1, 
                      background: 'rgba(0, 230, 118, 0.15)',
                      color: 'var(--health-green)',
                      border: '1px solid var(--health-green)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    📡 TRACK RECOVERY
                  </button>
                )}
              </div>
              <button
                className={`surgery-btn-mic ${isVocalListening ? 'listening' : ''}`}
                onClick={triggerVocalSurgery}
                style={{ position: 'relative' }}
              >
                {isVocalListening ? '🗣️' : '🎙️'}
                {isVocalListening && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 12 }}>
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => navigator.clipboard.writeText(surgeryCode)} style={{ fontSize: '0.65rem', padding: '4px 10px', background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 6 }}>COPY</button>
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      if (selectedRecForSurgery) {
                        createFixPR(
                          selectedRecForSurgery.metric,
                          `Surgery: ${selectedRecForSurgery.title}`,
                          selectedRecForSurgery.description,
                          `.devmri/surgery-fix.yml`,
                          surgeryCode
                        );
                      }
                    }}
                    style={{ padding: '4px 12px', fontSize: '0.65rem', borderRadius: 6 }}
                  >
                    DEPLOY FIX
                  </button>
                  <button className="btn btn-ghost" onClick={() => { setSurgeryComplete(false); setSurgeryCode(''); setSelectedRecForSurgery(null); }} style={{ fontSize: '0.65rem', padding: '4px 10px', borderRadius: 6 }}>EXIT</button>
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
