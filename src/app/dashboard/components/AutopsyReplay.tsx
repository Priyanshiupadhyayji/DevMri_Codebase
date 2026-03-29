'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSurgeonVoice } from '@/lib/speech';
import { useSounds } from '@/lib/sounds';

interface AutopsyReplayProps {
  runId: string;
  repoName: string;
  errorLine: string;
  errorFile: string;
  logSnippet: string;
  author?: string;
  onClose: () => void;
}

export function AutopsyReplay({
  runId,
  repoName,
  errorLine,
  errorFile,
  logSnippet,
  author,
  onClose
}: AutopsyReplayProps) {
  const [step, setStep] = useState(0);
  const [typedLog, setTypedLog] = useState('');
  const [isCrashed, setIsCrashed] = useState(false);
  const { speakDiagnosis } = useSurgeonVoice(); // Reuse for narration
  const { playSurgeryChime } = useSounds();
  const logRef = useRef<HTMLDivElement>(null);

  const steps = [
    { title: 'INITIALIZING AUTOPSY', text: `Replaying build failure in ${repoName} (Run #${runId})...`, duration: 3000 },
    { title: 'TRACING EXECUTION PATH', text: 'Analyzing stack trace for necrotic tissue...', duration: 4000 },
    { title: 'ISOLATING FAILURE POINT', text: `Located acute failure in ${errorFile} at L${errorLine}.`, duration: 4000 },
    { title: 'BIOPSY COMPLETE', text: 'Diagnostic confirmed. Build was killed by unhandled rejection in CI environment.', duration: 3000 }
  ];

  useEffect(() => {
    playSurgeryChime();
    
    // Start Narration
    const narration = [
      `Initializing autopsy on build #${runId}. Stand by for execution replay.`,
      `Scanning log stack for necrotic tissue. Multiple breakpoints detected in the CI environment.`,
      `Target identified. Failure located in ${errorFile.replace(/[\/\.]/g, ' ')} at line ${errorLine}.`,
      `Autopsy complete. The build has flatlined due to asynchronous corruption. End of diagnostic.`
    ];

    const utter = (idx: number) => {
      if (idx >= narration.length) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(narration[idx]);
      u.rate = 0.9;
      u.pitch = 0.85;
      window.speechSynthesis.speak(u);
    };

    utter(0);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setStep(currentStep);
        utter(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => setIsCrashed(true), 1000);
      }
    }, 4000);

    // Typing effect for the log
    let charIdx = 0;
    const typing = setInterval(() => {
      if (charIdx < logSnippet.length) {
        setTypedLog(prev => prev + logSnippet[charIdx]);
        charIdx++;
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      } else {
        clearInterval(typing);
      }
    }, 15);

    return () => {
      clearInterval(interval);
      clearInterval(typing);
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'var(--font-mono)', overflow: 'hidden'
    }}>
      {/* HUD Scanline */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', zIndex: 1, pointerEvents: 'none', backgroundSize: '100% 2px, 3px 100%' }} />

      {/* Main Autopsy UI */}
      <div style={{ width: '80%', maxWidth: 1000, zIndex: 10, position: 'relative' }}>
        
        {/* Progress Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ color: 'var(--critical-red)', fontWeight: 900, letterSpacing: '0.2em', fontSize: '1.2rem' }}>
             AUTOPSY_REPLAY_BETA_V1
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid var(--critical-red)', color: 'var(--critical-red)', padding: '5px 15px', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem' }}
          >
            EXIT_EXPERIMENT
          </button>
        </div>

        {/* Cinematic Viewport */}
        <div style={{ 
          height: 500, background: '#050505', border: '1px solid rgba(255,50,50,0.3)', 
          borderRadius: 12, position: 'relative', overflow: 'hidden',
          boxShadow: isCrashed ? '0 0 100px rgba(255,0,0,0.2)' : '0 0 50px rgba(0,229,255,0.05)'
        }}>
          
          {/* Internal Grid */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          {/* Status Overlay */}
          <div style={{ position: 'absolute', top: 30, right: 30, textAlign: 'right' }}>
            <div style={{ fontSize: '0.6rem', color: '#888' }}>PHASE: {steps[step].title}</div>
            <div style={{ fontSize: '1rem', color: 'var(--critical-red)', fontWeight: 900 }}>{isCrashed ? 'TOTAL_FLATLINE' : 'MONITORING_VITALS'}</div>
          </div>

          {/* Terminal Output */}
          <div 
            ref={logRef}
            style={{ 
              position: 'absolute', inset: '60px 40px', background: 'rgba(0,0,0,0.8)',
              padding: 24, borderRadius: 8, fontSize: '0.85rem', color: '#33ff33',
              lineHeight: 1.6, overflowY: 'auto', border: '1px solid rgba(0,255,0,0.1)',
              display: isCrashed ? 'none' : 'block'
            }}
          >
            <div style={{ color: '#fff', marginBottom: 15 }}>// SYSTEM_LOG_EXTRACT</div>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{typedLog}</pre>
            <div className="surgery-cursor" />
          </div>

          {/* Crash Visualization (The "Biopsy" result) */}
          {isCrashed && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,0,0,0.9)' }} className="animate-fade-in">
              <div style={{ fontSize: '5rem', marginBottom: 20 }}>⚠️</div>
              <h2 style={{ color: 'var(--critical-red)', fontWeight: 950 }}>FATAL PATHOLOGY DETECTED</h2>
              <div style={{ color: 'var(--text-secondary)', maxWidth: 500, textAlign: 'center', lineHeight: 1.6 }}>
                Build failed due to unhandled promise rejection in <strong>{errorFile}</strong>. 
                This signature suggests an "Async Race Condition" usually found when data dependencies collide during build-time SSR.
              </div>
              
              <div style={{ marginTop: 24, padding: '10px 20px', background: 'rgba(255,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(255,23,68,0.2)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Operator of Failure:</span>
                <span style={{ marginLeft: 10, color: '#fff', fontWeight: 900 }}>@{author || 'Unknown Contributor'}</span>
              </div>
              <div style={{ marginTop: 30, display: 'flex', gap: 20 }}>
                <button 
                  onClick={onClose}
                  style={{ background: 'var(--critical-red)', color: '#fff', padding: '12px 30px', border: 'none', borderRadius: 8, fontWeight: 900, cursor: 'pointer' }}
                >
                  DISMISS AUTOPSY
                </button>
              </div>
            </div>
          )}

          {/* Scanning Line */}
          {!isCrashed && (
            <div style={{ 
              position: 'absolute', left: 0, right: 0, height: 2, background: 'rgba(255,0,0,0.5)',
              boxShadow: '0 0 15px rgba(255,0,0,0.8)', zIndex: 5,
              animation: 'scanline 2s linear infinite', top: '20%'
            }} />
          )}
        </div>

        {/* Current Narrator Text */}
        <div style={{ marginTop: 30, textAlign: 'center' }}>
          <div style={{ color: 'var(--scan-cyan)', fontSize: '0.75rem', letterSpacing: '0.1em', marginBottom: 8 }}>SURGEON_VOICE_STREAMING</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontStyle: 'italic' }}>
            "{steps[step].text}"
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes scanline {
          0% { top: 0% }
          100% { top: 100% }
        }
      `}</style>
    </div>
  );
}
