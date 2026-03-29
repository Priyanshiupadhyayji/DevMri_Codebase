'use client';

import React, { useState, useEffect } from 'react';
import { Recommendation } from '@/lib/types';
import { useSounds } from '@/lib/sounds';
import { useSurgeonVoice } from '@/lib/speech';

interface PostOpTrackerProps {
  prNumber: number;
  prUrl: string;
  recommendation: Recommendation;
  onClose: () => void;
}

export function PostOpTracker({ prNumber, prUrl, recommendation, onClose }: PostOpTrackerProps) {
  const [phase, setPhase] = useState<'AWAITING_MERGE' | 'ANALYSING_IMPACT' | 'RECOVERY_VALIDATED'>('AWAITING_MERGE');
  const [liveScore, setLiveScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const { playScoreChime } = useSounds();
  const { speakText } = useSurgeonVoice();

  // Simulated live tracking of the PR
  useEffect(() => {
    // 1. Simulate waiting for GitHub Actions / Merge
    const mergeTimer = setTimeout(() => {
      setPhase('ANALYSING_IMPACT');
      speakText('PR merged. Analysing post-operative tissue recovery.', 'high');
      
      // 2. Simulate DX Score climbing back up
      let currentBoost = 0;
      const targetBoost = Math.floor(recommendation.frictionCost / 500) + 2; 
      
      const scoreInterval = setInterval(() => {
        currentBoost += 1;
        setLiveScore(currentBoost);
        if (currentBoost >= targetBoost) {
          clearInterval(scoreInterval);
          setPhase('RECOVERY_VALIDATED');
          playScoreChime();
          speakText('Recovery validated. DX Score has stabilized. Surgery successful.', 'high');
        }
      }, 800);

      return () => clearInterval(scoreInterval);
    }, 4000); // 4 seconds before "merge"

    // Timer for UI
    const tickInterval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);

    return () => {
      clearTimeout(mergeTimer);
      clearInterval(tickInterval);
    };
  }, [recommendation, speakText, playScoreChime]);

  return (
    <div className="animate-fade-in" style={{
      position: 'absolute', inset: 0, zIndex: 100,
      background: 'rgba(5, 8, 16, 0.95)', backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column',
      padding: '40px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, borderBottom: '1px solid rgba(0,229,255,0.1)', paddingBottom: 20 }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--scan-cyan)', fontWeight: 900, letterSpacing: '0.2em' }}>POST-OP RECOVERY TRACKER</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 8 }}>PR #{prNumber} Live Monitoring</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem' }}>
          CLOSE MONITOR
        </button>
      </div>

      <div style={{ display: 'flex', gap: 40, flex: 1 }}>
        {/* Left Side: Pipeline Status */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ background: 'rgba(0,0,0,0.4)', borderColor: phase === 'AWAITING_MERGE' ? 'var(--warning-amber)' : 'var(--health-green)' }}>
            <h4 style={{ marginBottom: 16 }}>Live Pipeline Status</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: 'var(--health-green)', fontSize: '1.2rem' }}>✓</span>
                <span style={{ color: 'var(--text-secondary)' }}>PR Initialized ({prUrl})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: phase !== 'AWAITING_MERGE' ? 'var(--health-green)' : 'var(--warning-amber)', fontSize: '1.2rem' }}>
                  {phase !== 'AWAITING_MERGE' ? '✓' : '⏳'}
                </span>
                <span style={{ color: phase !== 'AWAITING_MERGE' ? 'var(--text-secondary)' : '#fff' }}>
                  Code Review & CI Validation
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: phase === 'RECOVERY_VALIDATED' ? 'var(--health-green)' : 'rgba(255,255,255,0.1)', fontSize: '1.2rem' }}>
                  {phase === 'RECOVERY_VALIDATED' ? '✓' : '○'}
                </span>
                <span style={{ color: phase === 'RECOVERY_VALIDATED' ? '#fff' : 'var(--text-muted)' }}>
                  DX Score Re-Evaluation
                </span>
              </div>
            </div>
            
            <div style={{ marginTop: 30, fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              TIME ELAPSED: {timeElapsed}s
            </div>
          </div>
        </div>

        {/* Right Side: Recovery Telemetry */}
        <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ flex: 1, background: 'linear-gradient(135deg, rgba(0,230,118,0.02) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            {phase === 'AWAITING_MERGE' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: 20 }} className="animate-pulse">⏱️</div>
                <h3 style={{ color: 'var(--warning-amber)' }}>Awaiting CI/CD Resolution</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 300, fontSize: '0.85rem', marginTop: 10 }}>Monitoring webhook events for PR merge and successful deployment. DX metrics will be recalculated once code hits the main branch.</p>
              </>
            )}
            
            {phase === 'ANALYSING_IMPACT' && (
              <>
                <div className="surgery-scan-line" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'var(--scan-cyan)' }} />
                <h3 style={{ color: 'var(--scan-cyan)' }}>Evaluating Tissue Recovery</h3>
                <div style={{ fontSize: '5rem', fontWeight: 900, color: 'var(--health-green)', fontFamily: 'var(--font-mono)', margin: '20px 0' }}>
                  +{liveScore}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Recalculating AST complexity and friction burn rate...</p>
              </>
            )}

            {phase === 'RECOVERY_VALIDATED' && (
              <div className="animate-fade-in">
                <div style={{ fontSize: '4rem', marginBottom: 20 }}>🎉</div>
                <h2 style={{ color: 'var(--health-green)', fontWeight: 900, fontSize: '2rem' }}>Recovery Validated!</h2>
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 30 }}>
                  <div style={{ background: 'rgba(0,230,118,0.1)', padding: '16px 24px', borderRadius: 12, border: '1px solid var(--health-green)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>DX Score Boost</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--health-green)', fontFamily: 'var(--font-mono)' }}>+{liveScore} pts</div>
                  </div>
                  <div style={{ background: 'rgba(0,230,118,0.1)', padding: '16px 24px', borderRadius: 12, border: '1px solid var(--health-green)' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Cost Recovered</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--health-green)', fontFamily: 'var(--font-mono)' }}>+${recommendation.frictionCost}/mo</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
