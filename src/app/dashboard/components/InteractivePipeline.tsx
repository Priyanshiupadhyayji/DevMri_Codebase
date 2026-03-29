'use client';

import React, { useState } from 'react';

export interface PipelineStage {
  id: string;
  name: string;
  icon: string;
  duration: number;
  enabled: boolean;
  parallelizable: boolean;
}

export interface PipelineFailure {
  id: string;
  stage: string;
  file: string;
  line: string;
  author: string;
  time: string;
  logSnippet?: string;
}

export function InteractivePipeline({ 
  stages, 
  onStagesChange,
  onScoreUpdate,
  failures = [],
  onAutopsy
}: { 
  stages: PipelineStage[], 
  onStagesChange: (stages: PipelineStage[]) => void,
  onScoreUpdate: (score: number, savings: number) => void,
  failures?: PipelineFailure[],
  onAutopsy?: (failure: PipelineFailure) => void
}) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;
    setDragOverIdx(idx);
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    const newStages = [...stages];
    const [dragged] = newStages.splice(draggedIdx, 1);
    newStages.splice(targetIdx, 0, dragged);
    onStagesChange(newStages);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const toggleStage = (idx: number) => {
    const newStages = stages.map((s, i) => 
      i === idx ? { ...s, enabled: !s.enabled } : s
    );
    onStagesChange(newStages);
    
    const totalDuration = newStages.filter(s => s.enabled).reduce((sum: number, s) => sum + s.duration, 0);
    const originalDuration = stages.reduce((sum: number, s) => sum + s.duration, 0);
    const savings = originalDuration - totalDuration;
    const scoreBoost = Math.min(15, Math.round((savings / originalDuration) * 20));
    onScoreUpdate(scoreBoost, savings);
  };

  const totalDuration = stages.filter(s => s.enabled).reduce((sum: number, s) => sum + s.duration, 0);
  const originalTotal = stages.reduce((sum: number, st) => sum + st.duration, 0);
  const reductionPercent = originalTotal > 0 ? Math.round((1 - totalDuration / originalTotal) * 100) : 0;
  const isElite = reductionPercent >= 30;

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🎮</span> PIPELINE SURGEON CHALLENGE
          </h4>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Drag to reorder • Toggle stages • Goal: <span style={{ color: 'var(--health-green)' }}>Reach A-Grade (30% reduction)</span>
          </p>
        </div>
        
        {isElite && (
          <div className="badge-high animate-bounce" style={{ padding: '4px 12px', borderRadius: 20, fontWeight: 900 }}>
            🏆 ELITE OPTIMIZATION REACHED!
          </div>
        )}
      </div>
      
      <div className="what-if-pipeline">
        {stages.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div
              className={`pipeline-stage ${draggedIdx === idx ? 'dragging' : ''} ${!stage.enabled ? 'disabled' : ''} ${dragOverIdx === idx ? 'over' : ''}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(idx)}
              onClick={() => toggleStage(idx)}
              style={{
                borderColor: !stage.enabled ? 'rgba(255,23,68,0.2)' : dragOverIdx === idx ? 'var(--health-green)' : 'var(--border-subtle)',
                cursor: 'grab'
              }}
            >
              <div className="pipeline-stage-icon">{stage.icon}</div>
              <div className="pipeline-stage-name" style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>{stage.name}</div>
              <div className="pipeline-stage-time" style={{ color: !stage.enabled ? 'var(--critical-red)' : 'var(--health-green)', fontSize: '1rem', fontWeight: 900 }}>
                {stage.enabled ? `${stage.duration}m` : 'OFF'}
              </div>
            </div>
            {idx < stages.length - 1 && (
              <div className="pipeline-arrow" style={{ opacity: 0.3 }}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Pathological Failures Section */}
      {failures.length > 0 && (
        <div style={{ marginTop: 40, borderTop: '1px solid var(--nav-border)', paddingTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--critical-red)' }} />
                <div className="ping-red" style={{ position: 'absolute', inset: -4, border: '2px solid var(--critical-red)', borderRadius: '50%', opacity: 0.6 }} />
              </div>
              <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-primary)' }}>
                BIO-TECHNICAL PATHOLOGY LOG
              </h5>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>SYSTEM_UPTIME: 99.98%</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {failures.map(f => (
              <div key={f.id} style={{ 
                display: 'flex', alignItems: 'center', gap: 20, 
                padding: '16px 20px', 
                background: 'linear-gradient(90deg, rgba(255, 23, 68, 0.06), transparent)', 
                border: '1px solid rgba(255, 23, 68, 0.12)', 
                borderLeft: '4px solid var(--critical-red)',
                borderRadius: '0 16px 16px 0',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: onAutopsy ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="failure-card-premium"
              onClick={() => onAutopsy?.(f)}
              >
                {/* Micro-grid background */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.03, background: 'radial-gradient(var(--critical-red) 0.5px, transparent 0.5px)', backgroundSize: '10px 10px', pointerEvents: 'none' }} />
                
                <div style={{ 
                  width: 44, height: 44, borderRadius: 12, background: 'rgba(255, 23, 68, 0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  border: '1px solid rgba(255, 23, 68, 0.1)'
                }}>🦠</div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 950, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{f.stage} Stage Flatlined</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--critical-red)', fontWeight: 900, background: 'rgba(255,23,68,0.1)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>{f.time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>LOCATION:</span>
                      <code style={{ fontSize: '0.7rem', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                        {f.file} <span style={{ color: 'var(--critical-red)' }}>:L{f.line}</span>
                      </code>
                    </div>
                    <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>SOURCE:</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--scan-cyan)', fontWeight: 900 }}>@{f.author}</span>
                    </div>
                  </div>
                </div>

                <div className="autopsy-btn-container">
                  <button 
                    style={{ 
                      background: 'rgba(255, 23, 68, 0.1)', color: 'var(--critical-red)', border: '1px solid var(--critical-red)', 
                      padding: '10px 18px', borderRadius: 8, fontSize: '0.68rem', fontWeight: 950,
                      cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}
                  >
                    Initiate Autopsy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .failure-card-premium:hover {
          background: linear-gradient(90deg, rgba(255, 23, 68, 0.1), rgba(255, 23, 68, 0.02)) !important;
          border-color: rgba(255, 23, 68, 0.3) !important;
          transform: translateX(8px);
          box-shadow: -10px 0 30px rgba(255, 23, 68, 0.05);
        }
        .failure-card-premium:hover .autopsy-btn-container button {
          background: var(--critical-red) !important;
          color: #fff !important;
          box-shadow: 0 0 20px rgba(255, 23, 68, 0.4);
        }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .ping-red {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
