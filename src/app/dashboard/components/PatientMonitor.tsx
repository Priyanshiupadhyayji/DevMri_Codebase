'use client';

import React, { useState, useEffect } from 'react';

interface PatientMonitorProps {
  dxScore: number;
  grade: string;
  frictionCost: number;
  repoName: string;
  activeSurgery?: string | null;
}

export function PatientMonitor({ 
  dxScore, 
  grade, 
  frictionCost, 
  repoName,
  activeSurgery 
}: PatientMonitorProps) {
  const [pulse, setPulse] = useState(false);
  const [ecgPath, setEcgPath] = useState('');
  
  const bpm = Math.max(60, 140 - dxScore);
  const statusColor = dxScore >= 80 ? '#00e676' : // A
                      dxScore >= 60 ? '#00e5ff' : // B
                      dxScore >= 40 ? '#ffab00' : // C
                      dxScore >= 20 ? '#ff6d00' : '#ff1744'; // D/F

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
    }, (60 / bpm) * 1000);
    return () => clearInterval(interval);
  }, [bpm]);

  // Generate a random-ish ECG path for the aesthetic
  useEffect(() => {
    const points = [];
    for (let i = 0; i < 20; i++) {
      const y = i % 8 === 0 ? (Math.random() * -30 - 10) : (Math.random() * 10 - 5);
      points.push(`${i * 10},${y + 20}`);
    }
    setEcgPath(`M 0,20 L ${points.join(' L ')}`);
  }, [pulse]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'var(--card-bg, rgba(2, 6, 12, 0.9))',
      backdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--nav-border, rgba(0, 229, 255, 0.2))',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      height: 72,
      boxShadow: 'var(--card-shadow, 0 10px 30px rgba(0,0,0,0.5))',
      overflow: 'hidden'
    }} className="clinical-hud">
      {/* HUD Scanner Decor */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, var(--scan-cyan), transparent)', opacity: 0.3 }} />
      
      {/* Left Compartment: Subject Registry */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ 
            padding: '4px 12px', background: 'var(--bg-secondary, rgba(255,255,255,0.03))', 
            border: '1px solid var(--nav-border)', borderRadius: 4,
            fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace',
            letterSpacing: '0.2em'
          }}>PATIENT_ID</div>
          <div style={{ 
            fontSize: '1.1rem', fontWeight: 950, color: 'var(--text-primary)', 
            marginTop: 4, letterSpacing: '-0.02em', textTransform: 'uppercase' 
          }}>
            {repoName.split('/')[1]}
          </div>
        </div>
        
        <div style={{ height: 32, width: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Middle Compartment: Cardiac Telemetry */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 32, paddingLeft: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
           <div style={{ 
             fontSize: '1.8rem', 
             filter: pulse ? `drop-shadow(0 0 12px ${statusColor})` : 'none',
             transform: pulse ? 'scale(1.2)' : 'scale(1)',
             transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
           }}>🫀</div>
           
           <div>
             <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Cardiac Health (DX)</div>
             <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
               <span style={{ fontSize: '1.8rem', fontWeight: 950, color: statusColor, lineHeight: 1 }}>{dxScore}</span>
               <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>% EFFICIENCY</span>
             </div>
           </div>
        </div>

        {/* Real-time ECG Visual */}
        <div style={{ flex: 1, maxWidth: 300, position: 'relative', height: 40 }}>
           <svg width="100%" height="40" style={{ opacity: 0.4 }}>
             <path d={ecgPath} fill="none" stroke={statusColor} strokeWidth="2" strokeLinecap="round" />
           </svg>
           <div style={{ 
             position: 'absolute', right: 0, top: 0, 
             fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'monospace' 
           }}>{bpm} BPM</div>
        </div>

        {activeSurgery && (
          <div style={{ 
            padding: '6px 14px', background: `${statusColor}15`, 
            border: `1px solid ${statusColor}30`, borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'pulse 2s infinite'
          }}>
             <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
             <span style={{ fontSize: '0.65rem', fontWeight: 900, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Surgery in Progress</span>
          </div>
        )}
      </div>

      {/* Right Compartment: Financial Hemorrhage Index */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Clinical Hemorrhage Index</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
             <div style={{ fontSize: '1.5rem', fontWeight: 950, color: frictionCost > 5000 ? '#ff1744' : 'var(--scan-cyan)', fontFamily: 'monospace' }}>
               ${frictionCost.toLocaleString()}
             </div>
             <div style={{ fontSize: '0.6rem', color: '#ff1744', fontWeight: 800 }}>BLEED/MO</div>
           </div>
        </div>

        <div style={{ 
          width: 54, height: 54, borderRadius: 12, 
          background: 'rgba(255,255,255,0.03)', 
          border: '1px solid rgba(0,229,255,0.4)',
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
           <div style={{ position: 'absolute', inset: 0, background: 'var(--scan-cyan)', opacity: 0.05 }} />
           <span style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--scan-cyan)', textShadow: '0 0 10px rgba(0,229,255,0.5)' }}>{grade}</span>
        </div>
      </div>
    </div>
  );
}
