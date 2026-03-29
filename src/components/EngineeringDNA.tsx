'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface DNAProps {
  repoName: string;
  commits: number;
  contributors: number;
  files: number;
  dxScore: number;
  grade: string;
  cicd?: any;
  reviews?: any;
  necrosis?: any;
  heatmap?: any;
}

// Generate DNA base pairs from repo data
function generateBasePairs(files: number, commits: number, dxScore: number): { left: string; right: string; type: 'stable' | 'mutated' | 'dead'; label: string }[] {
  const bases = ['A', 'T', 'G', 'C'];
  const pairs: { [key: string]: string } = { A: 'T', T: 'A', G: 'C', C: 'G' };
  const count = Math.min(30, Math.max(16, Math.floor(files / 5)));
  const mutationRate = Math.max(0.05, (100 - dxScore) / 200); // higher friction = more mutations
  const necrosisRate = Math.max(0, (100 - dxScore) / 400);
  
  const result = [];
  const fileNames = ['index.ts', 'app.tsx', 'utils.ts', 'api.ts', 'auth.ts', 'db.ts', 'config.ts', 'router.ts', 'hooks.ts', 'types.ts', 'middleware.ts', 'schema.ts', 'store.ts', 'layout.tsx', 'page.tsx', 'service.ts', 'handler.ts', 'model.ts', 'controller.ts', 'test.ts', 'setup.ts', 'env.ts', 'logger.ts', 'cache.ts', 'queue.ts', 'worker.ts', 'migration.ts', 'seed.ts', 'validator.ts', 'helper.ts'];
  
  for (let i = 0; i < count; i++) {
    const rand = Math.random();
    const leftBase = bases[Math.floor(Math.random() * 4)];
    let rightBase = pairs[leftBase];
    let type: 'stable' | 'mutated' | 'dead' = 'stable';
    
    if (rand < necrosisRate) {
      type = 'dead';
      rightBase = '✕';
    } else if (rand < necrosisRate + mutationRate) {
      type = 'mutated';
      // Mismatched base pair = mutation
      const wrongBases = bases.filter(b => b !== pairs[leftBase]);
      rightBase = wrongBases[Math.floor(Math.random() * wrongBases.length)];
    }
    
    result.push({ left: leftBase, right: rightBase, type, label: fileNames[i % fileNames.length] });
  }
  return result;
}

// Generate contributor "genes"
function generateGenes(contributors: number): { name: string; strength: number; color: string }[] {
  const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu'];
  const colors = ['#00e5ff', '#00e676', '#ffd600', '#ff6d00', '#ff1744', '#aa00ff', '#2979ff', '#00bfa5', '#ff4081', '#76ff03', '#f50057', '#651fff'];
  const count = Math.min(12, contributors);
  
  return Array.from({ length: count }, (_, i) => ({
    name: names[i % names.length],
    strength: 30 + Math.random() * 70,
    color: colors[i % colors.length],
  }));
}

export function EngineeringDNA({ repoName, commits, contributors, files, dxScore, grade, cicd, reviews, necrosis, heatmap }: DNAProps) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hoveredPair, setHoveredPair] = useState<number | null>(null);
  const [isRotating, setIsRotating] = useState(true);
  
  const basePairs = useMemo(() => generateBasePairs(files, commits, dxScore), [files, commits, dxScore]);
  const genes = useMemo(() => generateGenes(contributors), [contributors]);
  
  const stability = useMemo(() => {
    const mutated = basePairs.filter(b => b.type === 'mutated').length;
    const dead = basePairs.filter(b => b.type === 'dead').length;
    return Math.round(((basePairs.length - mutated - dead * 2) / basePairs.length) * 100);
  }, [basePairs]);

  // Auto-rotate animation
  useEffect(() => {
    if (!isRotating) return;
    const timer = setInterval(() => {
      setScrollOffset(prev => (prev + 0.5) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, [isRotating]);

  const baseColor = (type: string) => type === 'dead' ? '#ff1744' : type === 'mutated' ? '#ff6d00' : '#00e5ff';
  const gradeColor = grade === 'A' ? '#00e676' : grade === 'B' ? '#00e5ff' : grade === 'C' ? '#ffd600' : grade === 'D' ? '#ff6d00' : '#ff1744';

  return (
    <div style={{
      background: 'linear-gradient(180deg, #020408 0%, #0a0e18 50%, #020408 100%)',
      borderRadius: 20,
      border: '1px solid rgba(0,229,255,0.08)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(0,229,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 6 }}>
              🧬 ENGINEERING DNA SIGNATURE
            </div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
              {repoName.split('/')[1] || repoName}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
              Genetic profile — {basePairs.length} base pairs · {genes.length} gene contributors · {basePairs.filter(b => b.type === 'mutated').length} mutations
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={() => setIsRotating(!isRotating)} style={{
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 8, padding: '6px 14px', color: '#00e5ff', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700,
            }}>
              {isRotating ? '⏸ Pause' : '▶ Rotate'}
            </button>
            <div style={{
              padding: '6px 16px', borderRadius: 20,
              background: `${gradeColor}15`, border: `1px solid ${gradeColor}40`,
              color: gradeColor, fontSize: '0.75rem', fontWeight: 900,
            }}>
              Stability: {stability}%
            </div>
          </div>
        </div>
      </div>

      {/* Main DNA Visualization */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0 }}>
        
        {/* Left: Double Helix */}
        <div style={{ padding: '24px 20px', borderRight: '1px solid rgba(0,229,255,0.06)', minHeight: 500, position: 'relative', overflow: 'hidden' }}>
          {/* Background grid lines */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(0,229,255,0.5) 30px)', backgroundSize: '30px 30px' }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            {basePairs.map((pair, i) => {
              const phase = ((i * 24 + scrollOffset) % 360) * (Math.PI / 180);
              const amplitude = 80;
              const leftX = 50 + Math.sin(phase) * amplitude;
              const rightX = 50 - Math.sin(phase) * amplitude;
              const depth = Math.cos(phase);
              const opacity = 0.4 + (depth + 1) * 0.3;
              const scale = 0.7 + (depth + 1) * 0.15;
              const isHovered = hoveredPair === i;
              
              return (
                <div key={i} 
                  style={{ 
                    position: 'relative', height: 18, marginBottom: 2,
                    opacity: isHovered ? 1 : opacity,
                    transform: `scale(${isHovered ? 1.05 : scale})`,
                    transition: 'all 0.2s ease',
                    zIndex: isHovered ? 10 : Math.round(depth * 5 + 5),
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setHoveredPair(i)}
                  onMouseLeave={() => setHoveredPair(null)}
                >
                  {/* Left backbone */}
                  <div style={{
                    position: 'absolute', left: `${leftX - 8}%`, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16, borderRadius: '50%',
                    background: `radial-gradient(circle, ${baseColor(pair.type)}, ${baseColor(pair.type)}60)`,
                    boxShadow: `0 0 ${isHovered ? 15 : 8}px ${baseColor(pair.type)}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.5rem', fontWeight: 900, color: '#000', fontFamily: 'monospace',
                  }}>
                    {pair.left}
                  </div>
                  
                  {/* Hydrogen bond (bridge) */}
                  <div style={{
                    position: 'absolute',
                    left: `${Math.min(leftX, rightX)}%`,
                    width: `${Math.abs(leftX - rightX)}%`,
                    top: '50%', height: 1,
                    background: pair.type === 'dead' 
                      ? 'repeating-linear-gradient(90deg, #ff174440, #ff174440 3px, transparent 3px, transparent 6px)'
                      : pair.type === 'mutated'
                      ? `linear-gradient(90deg, ${baseColor(pair.type)}60, ${baseColor(pair.type)}20, ${baseColor(pair.type)}60)`
                      : `linear-gradient(90deg, ${baseColor(pair.type)}40, ${baseColor(pair.type)}10, ${baseColor(pair.type)}40)`,
                  }} />
                  
                  {/* Right backbone */}
                  <div style={{
                    position: 'absolute', left: `${rightX - 8}%`, top: '50%', transform: 'translateY(-50%)',
                    width: 16, height: 16, borderRadius: '50%',
                    background: pair.type === 'dead' 
                      ? 'radial-gradient(circle, #ff174480, #ff174430)' 
                      : `radial-gradient(circle, ${baseColor(pair.type)}, ${baseColor(pair.type)}60)`,
                    boxShadow: `0 0 ${isHovered ? 15 : 8}px ${baseColor(pair.type)}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.5rem', fontWeight: 900, color: pair.type === 'dead' ? '#ff1744' : '#000', fontFamily: 'monospace',
                  }}>
                    {pair.right}
                  </div>
                  
                  {/* Hover tooltip */}
                  {isHovered && (
                    <div style={{
                      position: 'absolute', left: '50%', top: -28, transform: 'translateX(-50%)',
                      background: 'rgba(0,10,20,0.95)', border: '1px solid rgba(0,229,255,0.3)',
                      borderRadius: 6, padding: '4px 12px', whiteSpace: 'nowrap',
                      fontSize: '0.6rem', color: '#00e5ff', fontFamily: 'monospace', zIndex: 20,
                    }}>
                      {pair.label} · {pair.type === 'dead' ? '💀 NECROTIC' : pair.type === 'mutated' ? '⚠️ MUTATED' : '✅ STABLE'} · {pair.left}—{pair.right}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: DNA Profile Stats */}
        <div style={{ padding: '20px 24px' }}>
          {/* Genetic Summary */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 12 }}>
              GENETIC PROFILE
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: '🧬', label: 'Base Pairs', value: basePairs.length.toString(), sub: 'files mapped' },
                { icon: '🔬', label: 'Mutations', value: basePairs.filter(b => b.type === 'mutated').length.toString(), sub: 'friction points' },
                { icon: '💀', label: 'Necrotic', value: basePairs.filter(b => b.type === 'dead').length.toString(), sub: 'dead code' },
                { icon: '🧪', label: 'Commits', value: commits > 1000 ? `${(commits/1000).toFixed(1)}k` : commits.toString(), sub: 'mutations total' },
              ].map((stat, i) => (
                <div key={i} style={{
                  background: 'rgba(0,229,255,0.03)', borderRadius: 10, padding: '12px',
                  border: '1px solid rgba(0,229,255,0.06)',
                }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>{stat.icon}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{stat.value}</div>
                  <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Gene Contributors */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 12 }}>
              GENE MAP — TOP CONTRIBUTORS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {genes.slice(0, 8).map((gene, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', background: gene.color,
                    boxShadow: `0 0 6px ${gene.color}60`,
                  }} />
                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', minWidth: 60 }}>
                    Gene-{gene.name}
                  </span>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${gene.strength}%`, height: '100%', borderRadius: 2,
                      background: `linear-gradient(90deg, ${gene.color}80, ${gene.color})`,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.6rem', color: gene.color, fontWeight: 700, fontFamily: 'monospace', minWidth: 30, textAlign: 'right' }}>
                    {Math.round(gene.strength)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* DNA Health Legend */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>
              PAIR TYPES
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { color: '#00e5ff', label: 'Stable Pair (A-T, G-C)', desc: 'Healthy, well-tested code' },
                { color: '#ff6d00', label: 'Mutated Pair (mismatch)', desc: 'High churn, unstable code' },
                { color: '#ff1744', label: 'Necrotic Pair (broken)', desc: 'Dead code, orphaned files' },
              ].map((leg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: leg.color, boxShadow: `0 0 6px ${leg.color}40`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.65rem', color: leg.color, fontWeight: 700 }}>{leg.label}</div>
                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.3)' }}>{leg.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stability Gauge */}
          <div style={{
            background: 'rgba(0,229,255,0.03)', borderRadius: 12, padding: 16,
            border: '1px solid rgba(0,229,255,0.08)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.15em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 8 }}>
              GENOME STABILITY INDEX
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px',
              border: `3px solid ${gradeColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${gradeColor}30, inset 0 0 15px ${gradeColor}10`,
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: gradeColor, fontFamily: "'JetBrains Mono', monospace" }}>
                {stability}
              </span>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
              {stability >= 80 ? '🟢 Genetically Stable' : stability >= 50 ? '🟡 Minor Mutations' : '🔴 Unstable Genome'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Mutation Timeline */}
      <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(0,229,255,0.06)' }}>
        <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(0,229,255,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 10 }}>
          MUTATION DENSITY MAP
        </div>
        <div style={{ display: 'flex', gap: 2, height: 30 }}>
          {basePairs.map((pair, i) => (
            <div key={i} style={{
              flex: 1,
              background: pair.type === 'dead' ? '#ff174460' : pair.type === 'mutated' ? '#ff6d0050' : '#00e5ff20',
              borderRadius: 2,
              border: `1px solid ${baseColor(pair.type)}20`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: hoveredPair === i ? 'scaleY(1.5)' : 'scaleY(1)',
            }}
            onMouseEnter={() => setHoveredPair(i)}
            onMouseLeave={() => setHoveredPair(null)}
            title={`${pair.label}: ${pair.type}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>
          <span>← Core modules</span>
          <span>Peripheral code →</span>
        </div>
      </div>
    </div>
  );
}
