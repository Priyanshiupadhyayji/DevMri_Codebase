'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

interface ReplayProps {
  dxScore: number;
  grade: string;
  frictionCost: { total: number };
  cicd?: any;
  reviews?: any;
  necrosis?: any;
  heatmap?: any;
  repoName: string;
}

// Generate mock historical data showing degradation
function generateTimeline(currentScore: number, months: number = 12): { month: string; score: number; grade: string; friction: number; hotspots: number; deadFiles: number; ciRate: number }[] {
  const data: any[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  
  // Start from a healthy state and degrade toward current
  const startScore = Math.min(95, currentScore + 30 + Math.random() * 15);
  const scoreDecay = (startScore - currentScore) / months;
  
  for (let i = 0; i < months; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const progress = i / (months - 1);
    const noise = (Math.random() - 0.5) * 6;
    const score = Math.max(5, Math.min(100, Math.round(startScore - (scoreDecay * i) + noise)));
    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';
    
    data.push({
      month: `${monthNames[monthDate.getMonth()]} '${monthDate.getFullYear().toString().slice(-2)}`,
      score,
      grade,
      friction: Math.round(200 + progress * (800 + Math.random() * 400)),
      hotspots: Math.round(1 + progress * (8 + Math.random() * 4)),
      deadFiles: Math.round(progress * (15 + Math.random() * 10)),
      ciRate: Math.max(50, Math.round(98 - progress * (30 + Math.random() * 15) + (Math.random() - 0.5) * 5)),
    });
  }
  
  // Ensure last month matches current state
  data[data.length - 1].score = currentScore;
  
  return data;
}

export function FailureReplay({ dxScore, grade, frictionCost, cicd, reviews, necrosis, heatmap, repoName }: ReplayProps) {
  const timeline = useMemo(() => generateTimeline(dxScore), [dxScore]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);

  // Auto-play
  useEffect(() => {
    if (!isPlaying) return;
    if (currentIdx >= timeline.length - 1) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentIdx(prev => prev + 1);
    }, 800 / playSpeed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentIdx, timeline.length, playSpeed]);

  const current = timeline[currentIdx];
  const prev = currentIdx > 0 ? timeline[currentIdx - 1] : current;
  const scoreDelta = current.score - prev.score;
  
  const gradeColor = (g: string) => g === 'A' ? '#00e676' : g === 'B' ? '#00e5ff' : g === 'C' ? '#ffd600' : g === 'D' ? '#ff6d00' : '#ff1744';
  const scoreColor = gradeColor(current.grade);

  // Heatmap grid — visual representation of degradation
  const heatCells = useMemo(() => {
    const cells = [];
    const total = 64; // 8x8 grid
    const hotCount = Math.round((current.hotspots / 12) * total);
    const deadCount = Math.round((current.deadFiles / 25) * total);
    
    for (let i = 0; i < total; i++) {
      let type: 'healthy' | 'warm' | 'hot' | 'dead' = 'healthy';
      if (i < deadCount) type = 'dead';
      else if (i < deadCount + hotCount) type = 'hot';
      else if (i < deadCount + hotCount + Math.round(hotCount * 0.5)) type = 'warm';
      cells.push(type);
    }
    // Shuffle for visual interest
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
  }, [current.hotspots, current.deadFiles]);

  const handlePlay = useCallback(() => {
    if (currentIdx >= timeline.length - 1) setCurrentIdx(0);
    setIsPlaying(true);
  }, [currentIdx, timeline.length]);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #040810 0%, #0a0e18 100%)',
      borderRadius: 20,
      border: '1px solid rgba(0,229,255,0.1)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid rgba(0,229,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>
              🔥 LIVE FAILURE REPLAY
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              How {repoName.split('/')[1] || repoName} Degraded
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
              "This repo didn&apos;t fail overnight… it decayed."
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setPlaySpeed(playSpeed === 1 ? 2 : playSpeed === 2 ? 4 : 1)} style={{
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 8, padding: '6px 12px', color: '#00e5ff', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace',
            }}>
              {playSpeed}x
            </button>
            <button onClick={() => isPlaying ? setIsPlaying(false) : handlePlay()} style={{
              background: isPlaying ? 'rgba(255,23,68,0.15)' : 'rgba(0,229,255,0.15)',
              border: `1px solid ${isPlaying ? 'rgba(255,23,68,0.3)' : 'rgba(0,229,255,0.3)'}`,
              borderRadius: 8, padding: '6px 16px',
              color: isPlaying ? '#ff3d60' : '#00e5ff', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              {isPlaying ? '⏸ Pause' : currentIdx >= timeline.length - 1 ? '🔄 Replay' : '▶ Play'}
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Slider */}
      <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(0,229,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(0,229,255,0.5)', fontFamily: 'monospace', minWidth: 50 }}>
            {timeline[0].month}
          </span>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="range"
              min={0}
              max={timeline.length - 1}
              value={currentIdx}
              onChange={(e) => { setCurrentIdx(parseInt(e.target.value)); setIsPlaying(false); }}
              style={{
                width: '100%', appearance: 'none', height: 6,
                background: `linear-gradient(90deg, #00e676 0%, #ffd600 40%, #ff6d00 70%, #ff1744 100%)`,
                borderRadius: 3, outline: 'none', cursor: 'pointer',
              }}
            />
            {/* Month marker */}
            <div style={{
              position: 'absolute', top: -28,
              left: `${(currentIdx / (timeline.length - 1)) * 100}%`,
              transform: 'translateX(-50%)',
              background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: 6, padding: '2px 10px',
              fontSize: '0.65rem', fontWeight: 700, color: '#00e5ff',
              fontFamily: 'monospace', whiteSpace: 'nowrap',
              transition: 'left 0.3s ease',
            }}>
              {current.month}
            </div>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,23,68,0.7)', fontFamily: 'monospace', minWidth: 50, textAlign: 'right' }}>
            {timeline[timeline.length - 1].month}
          </span>
        </div>
      </div>

      {/* Main display grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: 0 }}>
        
        {/* Left: DX Score + Grade */}
        <div style={{ padding: 28, borderRight: '1px solid rgba(0,229,255,0.06)', textAlign: 'center' }}>
          <div style={{
            width: 140, height: 140, borderRadius: '50%', margin: '0 auto 16px',
            border: `4px solid ${scoreColor}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 30px ${scoreColor}30, inset 0 0 20px ${scoreColor}10`,
            transition: 'all 0.4s ease',
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: scoreColor, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, transition: 'color 0.4s ease' }}>
              {current.score}
            </div>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>DX SCORE</div>
          </div>
          <div style={{
            display: 'inline-block', padding: '4px 20px', borderRadius: 20,
            background: `${scoreColor}20`, color: scoreColor,
            fontSize: '1rem', fontWeight: 900, letterSpacing: '0.1em',
            transition: 'all 0.4s ease',
          }}>
            Grade {current.grade}
          </div>
          {scoreDelta !== 0 && (
            <div style={{ marginTop: 8, fontSize: '0.8rem', fontWeight: 700, color: scoreDelta > 0 ? '#00e676' : '#ff3d60', fontFamily: 'monospace' }}>
              {scoreDelta > 0 ? '▲' : '▼'} {Math.abs(scoreDelta)} pts
            </div>
          )}
        </div>

        {/* Center: Stats panel */}
        <div style={{ padding: 28, borderRight: '1px solid rgba(0,229,255,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '💰', label: 'Friction Cost', value: `$${current.friction}/mo`, color: current.friction > 600 ? '#ff3d60' : '#ffd600' },
              { icon: '🔥', label: 'Hotspot Files', value: current.hotspots.toString(), color: current.hotspots > 6 ? '#ff3d60' : current.hotspots > 3 ? '#ff6d00' : '#00e676' },
              { icon: '💀', label: 'Dead Code Files', value: current.deadFiles.toString(), color: current.deadFiles > 10 ? '#ff3d60' : current.deadFiles > 5 ? '#ff6d00' : '#00e676' },
              { icon: '⚡', label: 'CI Success Rate', value: `${current.ciRate}%`, color: current.ciRate < 70 ? '#ff3d60' : current.ciRate < 85 ? '#ffd600' : '#00e676' },
            ].map((stat, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1rem' }}>{stat.icon}</span>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{stat.label}</span>
                </div>
                <span style={{
                  fontSize: '1rem', fontWeight: 900, color: stat.color,
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: 'color 0.4s ease',
                }}>
                  {stat.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Mini heatmap grid */}
        <div style={{ padding: '20px 16px' }}>
          <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10, textAlign: 'center' }}>
            CODEBASE HEALTH
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3,
          }}>
            {heatCells.map((type, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 3,
                background: type === 'dead' ? '#ff174440' : type === 'hot' ? '#ff6d0035' : type === 'warm' ? '#ffd60020' : '#00e67615',
                border: `1px solid ${type === 'dead' ? '#ff174430' : type === 'hot' ? '#ff6d0025' : type === 'warm' ? '#ffd60015' : '#00e67610'}`,
                transition: 'all 0.3s ease',
                animation: type === 'hot' ? 'xray-bleed-pulse 2s infinite' : 'none',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)' }}>
            <span>🟢 Healthy</span>
            <span>🔴 Inflamed</span>
          </div>
        </div>
      </div>

      {/* Score timeline mini-chart */}
      <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(0,229,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 50 }}>
          {timeline.map((t, i) => {
            const h = (t.score / 100) * 100;
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={i} style={{
                flex: 1, height: `${h}%`,
                background: isActive ? gradeColor(t.grade) : 'rgba(255,255,255,0.05)',
                borderRadius: '2px 2px 0 0',
                opacity: isActive ? (isCurrent ? 1 : 0.6) : 0.2,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                border: isCurrent ? `1px solid ${gradeColor(t.grade)}` : '1px solid transparent',
                boxShadow: isCurrent ? `0 0 8px ${gradeColor(t.grade)}40` : 'none',
              }}
              onClick={() => { setCurrentIdx(i); setIsPlaying(false); }}
              title={`${t.month}: Score ${t.score}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
