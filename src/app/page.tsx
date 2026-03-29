'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle, useTheme } from '@/components/ThemeProvider';

/* ═══════════════════════════════════════════
   SCROLL-DRIVEN STORY HOOK
   ═══════════════════════════════════════════ */
function useScrollReveal(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ═══════════════════════════════════════════
   ANIMATED INTRO — CINEMATIC BOOT
   ═══════════════════════════════════════════ */
function AnimatedIntro({ onComplete }: { onComplete: () => void }) {
  const { theme } = useTheme();
  const [phase, setPhase] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const bootText = 'INITIALIZING NEURAL CODE_BASE SCANNER...';

  const isLight = theme === 'light';

  useEffect(() => {
    const ci = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(ci);
  }, []);

  useEffect(() => {
    if (phase >= 2) {
      let i = 0;
      const ti = setInterval(() => {
        if (i < bootText.length) { setTypedText(bootText.slice(0, i + 1)); i++; }
        else clearInterval(ti);
      }, 35);
      return () => clearInterval(ti);
    }
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let w: number, h: number;
    let animationId: number;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    interface P { x: number; y: number; s: number; v: number; a: number; color: string; }
    const particles: P[] = [];
    const colorA = isLight ? 'rgba(0, 136, 204,' : 'rgba(0, 229, 255,';
    const colorB = isLight ? 'rgba(0, 168, 84,' : 'rgba(0, 230, 118,';

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        s: Math.random() * 2 + 0.5,
        v: Math.random() * 0.5 + 0.2,
        a: Math.random(),
        color: Math.random() > 0.5 ? colorA : colorB
      });
    }

    let t = 0;
    const animate = () => {
      t += 0.01;
      ctx.fillStyle = isLight ? `rgba(247, 249, 251, 0.2)` : `rgba(4, 6, 8, 0.2)`;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      const xOff = (t * 20) % gridSize;
      const yOff = (t * 10) % gridSize;
      
      for(let x = xOff; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for(let y = yOff; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      particles.forEach(p => {
        p.y -= p.v;
        if (p.y < 0) p.y = h;
        const opacity = (Math.sin(t + p.a * 10) * 0.5 + 0.5) * 0.4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${opacity})`;
        ctx.fill();
        
        if (p.a > 0.95) {
          ctx.beginPath();
          ctx.moveTo(p.x - 20, p.y);
          ctx.lineTo(p.x + 20, p.y);
          ctx.strokeStyle = `${p.color} ${opacity * 0.5})`;
          ctx.stroke();
        }
      });

      const cx = w / 2, cy = h / 2;
      const pulseR = (t * 200) % (w * 0.8);
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = isLight ? `rgba(0, 136, 204, ${Math.max(0, 0.1 - pulseR / (w * 0.8))})` : `rgba(0, 229, 255, ${Math.max(0, 0.15 - pulseR / (w * 0.8))})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      animationId = requestAnimationFrame(animate);
    };
    animate();

    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2800);
    const t4 = setTimeout(() => setPhase(4), 4200);
    const t5 = setTimeout(() => onComplete(), 5400);
    return () => { 
      cancelAnimationFrame(animationId); 
      window.removeEventListener('resize', resize);
      [t1, t2, t3, t4, t5].forEach(clearTimeout); 
    };
  }, [onComplete, isLight]);

  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      width: '100vw', height: '100vh',
      background: isLight ? 'var(--bg-primary)' : 'var(--bg-void)', 
      transition: 'background 0.8s ease',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }} />
      <div style={{ position: 'absolute', inset: 0, background: isLight ? 'radial-gradient(circle, transparent 40%, rgba(0, 136, 204, 0.03) 100%)' : 'radial-gradient(circle, transparent 40%, rgba(0, 0, 0, 0.4) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div style={{ 
          opacity: phase >= 1 ? 1 : 0, 
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)', 
          transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: isLight ? 'none' : 'drop-shadow(0 0 40px rgba(0,229,255,0.2))'
        }}>
          <div style={{ fontSize: 'clamp(4.5rem, 14vw, 9rem)', fontWeight: 950, letterSpacing: '-0.07em', lineHeight: 0.9 }}>
            <span style={{ color: 'var(--text-primary)' }}>Dev</span>
            <span style={{ background: 'linear-gradient(135deg, var(--scan-cyan), var(--health-green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', position: 'relative' }}>
              MRI
              {phase >= 1 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', transform: 'translateX(-100%) skewX(-20deg)', animation: 'shimmer 3s infinite linear', pointerEvents: 'none' }} />}
            </span>
          </div>
        </div>
        <div style={{ opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s', marginTop: 32 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.08em', background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)', padding: '8px 24px', borderRadius: 100, display: 'inline-block', border: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}` }}>
            <span style={{ color: 'var(--scan-cyan)', fontWeight: 800 }}>{'>'} </span>
            {typedText}
            <span style={{ opacity: showCursor ? 1 : 0, color: 'var(--scan-cyan)', fontWeight: 900 }}>█</span>
          </div>
        </div>
        <div style={{ opacity: phase >= 3 ? 1 : 0, transition: 'all 0.8s ease 0.4s', marginTop: 40, display: 'flex', gap: 12, justifyContent: 'center' }}>
          {['SYNAPTIC-SCAN', 'QUANTUM-DIAG', 'TISSUE-SYNC', 'NEURAL-FIX'].map((tag, i) => (
            <span key={tag} style={{ padding: '6px 14px', background: isLight ? 'rgba(0, 136, 204, 0.05)' : 'rgba(0, 229, 255, 0.08)', border: `1px solid ${isLight ? 'rgba(0, 136, 204, 0.15)' : 'rgba(0, 229, 255, 0.2)'}`, borderRadius: 6, color: 'var(--scan-cyan)', fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)', opacity: phase >= 3 ? 1 : 0, transform: phase >= 3 ? 'translateY(0)' : 'translateY(10px)', transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.5 + i * 0.1}s` }}>
              {tag}
            </span>
          ))}
        </div>
        <div style={{ opacity: phase >= 4 ? 1 : 0, transition: 'all 0.5s ease', marginTop: 48 }}>
          <div style={{ width: 200, height: 2, background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)', borderRadius: 4, margin: '0 auto', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--scan-cyan), var(--health-green))', borderRadius: 4, animation: 'bootBar 1.2s cubic-bezier(0.65, 0, 0.35, 1) forwards', transformOrigin: 'left' }} />
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes bootBar { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
        @keyframes shimmer { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(250%) skewX(-20deg); } }
        @keyframes float { 
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-scan-primary {
          padding: 18px 40px;
          background: var(--scan-cyan);
          color: #000;
          font-weight: 950;
          border: none;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,229,255,0.2);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }
        .btn-scan-primary:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 10px 30px rgba(0,229,255,0.4);
          background: #ffffff;
        }
        .btn-scan-primary:active {
          transform: translateY(-1px) scale(0.98);
        }
        .btn-scan-primary::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 20%;
          height: 200%;
          background: rgba(255,255,255,0.4);
          transform: rotate(30deg);
          transition: all 0.6s ease;
          opacity: 0;
        }
        .btn-scan-primary:hover::after {
          left: 140%;
          opacity: 1;
        }
        .hud-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(var(--scan-cyan-rgb), 0.1);
          border-radius: 32px;
          backdrop-filter: blur(20px);
          box-shadow: var(--card-shadow);
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHAPTER 1: THE PROBLEM
   ═══════════════════════════════════════════ */
function ChapterProblem() {
  const { ref, visible } = useScrollReveal(0.15);
  const floatingIcons = [
    { emoji: '❌', x: -200, y: -120, delay: 0, label: 'FAIL: Build #4821' },
    { emoji: '🐌', x: 180, y: -100, delay: 0.2, label: 'CI: 47min avg' },
    { emoji: '⚠️', x: -240, y: 60, delay: 0.4, label: '12 CVEs found' },
    { emoji: '💸', x: 200, y: 80, delay: 0.6, label: '$4,200/mo lost' },
    { emoji: '😤', x: -100, y: 160, delay: 0.8, label: '3hr review wait' },
    { emoji: '📉', x: 140, y: 150, delay: 1, label: 'DX Grade: D' },
  ];
  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(255,23,68,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
      {/* HUD Scan Lines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, var(--critical-red) 1px, var(--critical-red) 2px)', backgroundSize: '100% 4px' }} />
      
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 800 }}>
        <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.6s ease', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--critical-red)', letterSpacing: '0.15em', fontWeight: 700, border: '1px solid var(--critical-red)', padding: '4px 12px', borderRadius: 4 }}>CHAPTER 01 — THE PROBLEM</span>
        </div>
        <div style={{ position: 'relative', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,23,68,0.08)', border: '2px solid rgba(255,23,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', zIndex: 2, position: 'relative', opacity: visible ? 1 : 0, transition: 'all 0.8s ease', boxShadow: '0 0 60px rgba(255,23,68,0.2)' }}>
            👨‍💻
            <div style={{ position: 'absolute', inset: -10, border: '1px dashed var(--critical-red)', borderRadius: '50%', animation: 'spin 10s linear infinite' }} />
          </div>
          {floatingIcons.map((icon, i) => (
            <div key={i} style={{ 
              position: 'absolute', left: `calc(50% + ${icon.x}px)`, top: `calc(50% + ${icon.y}px)`, 
              transform: visible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0)', 
              opacity: visible ? 1 : 0, transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${icon.delay + 0.3}s`, 
              padding: '12px 20px', background: 'var(--card-bg)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: 12, 
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, animation: visible ? `float ${3 + i * 0.5}s ease-in-out infinite ${icon.delay}s` : 'none',
              boxShadow: 'var(--card-shadow)'
            }}>
              <span style={{ fontSize: '1.5rem' }}>{icon.emoji}</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#ff6d6d', whiteSpace: 'nowrap', fontWeight: 800 }}>{icon.label}</span>
                <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.1)', marginTop: 4, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: '70%', height: '100%', background: 'var(--critical-red)', animation: 'pulse 2s infinite' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 950, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 24, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s' }}>
          <span style={{ color: 'var(--text-primary)' }}>Your CI/CD pipeline is </span><br/>
          <span style={{ color: 'var(--critical-red)', textShadow: '0 0 30px rgba(255,23,68,0.3)' }}>bleeding money.</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: 1.6, maxWidth: 580, margin: '0 auto', opacity: visible ? 1 : 0, transition: 'all 0.8s ease 0.6s' }}>Technical necrosis doesn't heal itself. It spreads until your velocity reaches zero.</p>
      </div>
      <style jsx>{` @keyframes float { 0%, 100% { transform: translate(-50%, -50%) translateY(0px) scale(1); } 50% { transform: translate(-50%, -50%) translateY(-12px) scale(1.02); } } @keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } } `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CHAPTER 2: THE SCAN
   ═══════════════════════════════════════════ */
function ChapterScan() {
  const { ref, visible } = useScrollReveal(0.15);
  const modules = [
    { icon: '⚡', label: 'CI/CD', color: '#00e5ff', angle: 0 },
    { icon: '👁', label: 'Reviews', color: '#b388ff', angle: 51 },
    { icon: '📦', label: 'Deps', color: '#00e676', angle: 103 },
    { icon: '📊', label: 'DORA', color: '#00e5ff', angle: 154 },
    { icon: '💰', label: 'Friction', color: '#ffab00', angle: 206 },
    { icon: '🔒', label: 'Security', color: '#ff6d00', angle: 257 },
    { icon: '🧠', label: 'AI Dx', color: '#b388ff', angle: 309 },
  ];
  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 700, height: 700, background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ opacity: visible ? 1 : 0, transition: 'all 0.6s ease', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--scan-cyan)', letterSpacing: '0.15em', fontWeight: 700 }}>CHAPTER 02 — THE SCAN</span>
        </div>
        <div style={{ position: 'relative', width: 380, height: 380, margin: '0 auto 56px' }}>
          <div style={{ position: 'absolute', inset: 40, borderRadius: '50%', border: '1px solid rgba(0,229,255,0.08)', opacity: visible ? 1 : 0, transition: 'all 1s ease 0.3s', animation: visible ? 'orbitSpin 30s linear infinite' : 'none' }} />
          <div style={{ position: 'absolute', inset: 80, borderRadius: '50%', border: '1px dashed rgba(0,229,255,0.05)', opacity: visible ? 1 : 0, transition: 'all 1s ease 0.5s' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 80, height: 80, borderRadius: 20, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', zIndex: 2, opacity: visible ? 1 : 0, transition: 'all 0.8s ease 0.2s', boxShadow: '0 0 40px rgba(0,229,255,0.15)' }}>🩻</div>
          {modules.map((m, i) => {
            const r = 155;
            const rad = (m.angle * Math.PI) / 180;
            const x = Math.cos(rad) * r;
            const y = Math.sin(rad) * r;
            return (
              <div key={i} style={{ position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: visible ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0)', opacity: visible ? 1 : 0, transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + i * 0.1}s`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 14px', borderRadius: 12, background: 'var(--card-bg)', backdropFilter: 'blur(12px)', border: `1px solid ${m.color}22`, zIndex: 3 }}>
                <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: m.color, fontWeight: 700 }}>{m.label}</span>
              </div>
            );
          })}
          {visible && <>
            <div style={{ position: 'absolute', inset: '35%', borderRadius: '50%', border: '1px solid rgba(0,229,255,0.15)', animation: 'scanPulseRing 2s ease-out infinite' }} />
            <div style={{ position: 'absolute', inset: '35%', borderRadius: '50%', border: '1px solid rgba(0,229,255,0.1)', animation: 'scanPulseRing 2s ease-out infinite 0.7s' }} />
          </>}
        </div>
        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, opacity: visible ? 1 : 0, transition: 'all 0.8s ease 0.6s' }}>
          <span style={{ color: 'var(--text-primary)' }}>One scan. </span>
          <span style={{ background: 'linear-gradient(135deg, var(--scan-cyan), var(--health-green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Seven modules.</span>
        </h2>
      </div>
      <style jsx>{` @keyframes orbitSpin { to { transform: rotate(360deg); } } @keyframes scanPulseRing { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2.5); opacity: 0; } }`}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CHAPTER 3: THE SCORE
   ═══════════════════════════════════════════ */
function ChapterScore() {
  const { ref, visible } = useScrollReveal(0.2);
  const [animScore, setAnimScore] = useState(0);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const target = 78;
    const dur = 2000;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setAnimScore(start);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible]);
  const gradeColor = animScore >= 80 ? '#00e676' : 
                     animScore >= 60 ? '#00e5ff' : 
                     animScore >= 40 ? '#ffab00' : 
                     animScore >= 20 ? '#ff6d00' : '#ff1744';
  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, background: `radial-gradient(circle, ${gradeColor}0a 0%, transparent 60%)`, pointerEvents: 'none' }} />
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ opacity: visible ? 1 : 0, transition: 'all 0.6s ease', marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--warning-amber)', letterSpacing: '0.15em', fontWeight: 700 }}>CHAPTER 03 — THE SCORE</span>
        </div>
        <div style={{ position: 'relative', width: 260, height: 260, margin: '0 auto 48px', opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.8)', transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s' }}>
          <svg width="260" height="260" viewBox="0 0 260 260" style={{ position: 'absolute', inset: 0 }}>
            <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
            <circle cx="130" cy="130" r="110" fill="none" stroke={gradeColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(animScore / 100) * 691} 691`} transform="rotate(-90 130 130)" style={{ transition: 'stroke 0.3s', filter: `drop-shadow(0 0 8px ${gradeColor}66)` }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '5rem', fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{animScore}</div>
            <div style={{ fontSize: '0.7rem', color: '#556677', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>DX SCORE</div>
          </div>
        </div>
        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 16, opacity: visible ? 1 : 0, transition: 'all 0.8s ease 0.5s' }}>Meet your DX Score.</h2>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CHAPTER 4: THE SURGERY
   ═══════════════════════════════════════════ */
function ChapterSurgery() {
  const { ref, visible } = useScrollReveal(0.15);
  const [typedCode, setTypedCode] = useState('');
  const codeLines = ['# DevMRI Surgery', 'name: Optimize CI', '', 'on:', '  pull_request:', '    branches: [main]', '', 'jobs:', '  build:', '    runs-on: ubuntu-latest', '    steps:', '      - uses: actions/checkout@v4', '      - uses: actions/cache@v4', '        with:', '          path: node_modules', '          key: ${{ runner.os }}-node', '      - run: npm ci', '      - run: npm test'];
  const fullCode = codeLines.join('\n');
  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const ti = setInterval(() => { if (i < fullCode.length) { setTypedCode(fullCode.slice(0, i + 1)); i += 2; } else { clearInterval(ti); } }, 30);
    return () => clearInterval(ti);
  }, [visible, fullCode]);
  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1000, width: '100%', textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#00e676', letterSpacing: '0.15em', fontWeight: 700 }}>CHAPTER 04 — THE SURGERY</span>
        <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, marginTop: 24, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.8s ease 0.2s' }}>AI performs the surgery.</h2>
        <div style={{ background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid rgba(var(--scan-cyan-rgb), 0.1)', overflow: 'hidden', textAlign: 'left', marginTop: 40, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.8s ease 0.4s', boxShadow: 'var(--card-shadow)' }}>
          <pre style={{ padding: '20px', margin: 0, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--health-green)', minHeight: 280 }}>{typedCode}</pre>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CHAPTER 5: BUILT FOR EVERY ROLE (Missing Content Restored)
   ═══════════════════════════════════════════ */
function ChapterPersonas() {
  const { ref, visible } = useScrollReveal(0.15);
  const personas = [
    { emoji: '👔', title: 'The Engineering Lead', desc: 'Track DX health across your entire fleet. Identify which teams need support and quantify ROI.', tags: ['Fleet Scan', 'DORA Metrics'], color: '#00e5ff' },
    { emoji: '⚙️', title: 'The Platform Engineer', desc: 'Reduce CI/CD costs and eliminate technical necrosis. Get the exact YAML fix as a PR.', tags: ['SurgeryTheatre', 'CI/CD X-Ray'], color: '#00e676' },
    { emoji: '🌍', title: 'The OSS Maintainer', desc: 'Add a DX health badge to your README. Show contributors that your project is clinical-grade.', tags: ['DX Badge', 'Leaderboard'], color: '#b388ff' }
  ];

  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
           <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#b388ff', letterSpacing: '0.15em', fontWeight: 700, opacity: visible ? 1 : 0, transition: 'all 0.6s ease' }}>CHAPTER 05 — FOR EVERY ROLE</span>
           <h2 style={{ fontSize: '3rem', fontWeight: 900, marginTop: 16, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease 0.2s' }}>Built for every role.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {personas.map((p, i) => (
            <div key={i} style={{ 
              padding: '40px 32px', background: 'var(--card-bg)', borderRadius: 24, border: `1px solid ${p.color}25`, boxShadow: 'var(--card-shadow)',
              opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)', transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.3 + i * 0.15}s`
            }}>
               <div style={{ fontSize: '2.5rem', marginBottom: 20 }}>{p.emoji}</div>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{p.title}</h3>
               <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>{p.desc}</p>
               <div style={{ display: 'flex', gap: 8 }}>
                 {p.tags.map(tag => <span key={tag} style={{ padding: '4px 10px', background: `${p.color}10`, border: `1px solid ${p.color}20`, color: p.color, borderRadius: 6, fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>{tag}</span>)}
               </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CHAPTER 6: FULL SURGICAL SUITE (Missing Content Restored)
   ═══════════════════════════════════════════ */
function ChapterFeatures() {
  const { ref, visible } = useScrollReveal(0.15);
  const feats = [
    { title: '8-Track Diagnostic', desc: 'Full spectrum scan: CI/CD, Reviews, Deps, Quality, Flow, Security, Commit Hygiene, & Env.', icon: '🧬' },
    { title: 'X-Ray Vitals', desc: 'Real-time heartbeat of CI/CD performance and resource cost.', icon: '💓' },
    { title: 'Neural PR Surgery', desc: 'AI-generated TypeScript fixes for broken developer workflows.', icon: '🧠' },
    { title: 'Clinical Autopsy', desc: 'Flashback replays of CI failures to find the exact root cause.', icon: '💀' },
    { title: 'Friction Heatmaps', desc: 'Visualize hotspots of technical necrosis in your file tree.', icon: '🔥' },
    { title: 'DORA Engine', desc: 'Elite-grade DORA metrics captured from real GitHub telemetry.', icon: '📊' }
  ];

  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
           <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--scan-cyan)', letterSpacing: '0.15em', fontWeight: 700, opacity: visible ? 1 : 0, transition: 'all 0.6s ease' }}>CHAPTER 06 — SURGICAL SUITE</span>
           <h2 style={{ fontSize: '3rem', fontWeight: 900, marginTop: 16, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease 0.2s' }}>Full Surgical Suite.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {feats.map((f, i) => (
            <div key={i} style={{ 
              padding: '32px', background: 'var(--card-bg)', borderRadius: 20, border: '1px solid rgba(var(--scan-cyan-rgb), 0.08)', boxShadow: 'var(--card-shadow)',
              opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.95)', transition: `all 0.6s ease ${i * 0.1}s`
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 16 }}>{f.icon}</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>{f.title}</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   CHAPTER 7: CLINICAL PROOF (Missing Content Restored)
   ═══════════════════════════════════════════ */
function ChapterTestimonials() {
  const { ref, visible } = useScrollReveal(0.15);
  const reports = [
    { name: 'Sarah J.', role: 'Platform Lead @ TechCorp', quote: 'DevMRI cut our CI/CD spend by 40% in just two scans.', rating: 5 },
    { name: 'Michael K.', role: 'OSS Maintainer', quote: 'I put the DX Badge on all my repos now. It gives contributors confidence.', rating: 5 },
    { name: 'Dr. Elena R.', role: 'CTO @ AlphaCloud', quote: 'Clinical PDF reports quantify our DX investments to the board.', rating: 5 }
  ];

  return (
    <section ref={ref} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
           <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--health-green)', letterSpacing: '0.15em', fontWeight: 700, opacity: visible ? 1 : 0, transition: 'all 0.6s ease' }}>CHAPTER 07 — CLINICAL PROOF</span>
           <h2 style={{ fontSize: '3rem', fontWeight: 900, marginTop: 16, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.8s ease 0.2s' }}>Clinical Proof.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {reports.map((r, i) => (
            <div key={i} style={{ 
              padding: '40px', background: 'var(--card-bg)', borderRadius: 24, border: '1px solid rgba(var(--health-green-rgb), 0.15)', boxShadow: 'var(--card-shadow)',
              opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `all 0.8s ease ${i * 0.2}s`
            }}>
              <div style={{ color: 'var(--health-green)', fontSize: '1.5rem', marginBottom: 20 }}>{'★'.repeat(r.rating)}</div>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontStyle: 'italic', marginBottom: 24, lineHeight: 1.6 }}>"{r.quote}"</p>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{r.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.role}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onScan }: { onScan: () => void }) {
  const { ref, visible } = useScrollReveal(0.2);
  return (
    <section ref={ref} style={{ padding: '140px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(0, 229, 255, 0.08) 0%, transparent 60%)' }} />
      <div style={{ position: 'relative', zIndex: 1, opacity: visible ? 1 : 0, transform: visible ? 'scale(1)' : 'scale(0.95)', transition: 'all 0.8s ease' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 950, letterSpacing: '-0.04em', marginBottom: 24 }}>Ready to see your score?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>One scan. No sign-up. Results in under 30 seconds.</p>
        <button onClick={onScan} className="btn-scan-primary" style={{ padding: '20px 60px', fontSize: '1.2rem' }}>Start Free Scan →</button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ textAlign: 'center', padding: '64px 24px', borderTop: '1px solid rgba(var(--text-muted-rgb), 0.15)', color: 'var(--text-muted)' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center', gap: 32 }}>
        {['Docs', 'Leaderboard', 'Enterprise', 'GitHub'].map(l => <a key={l} href="#" style={{ color: 'inherit', textDecoration: 'none', fontSize: '0.85rem' }}>{l}</a>)}
      </div>
      <p style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)' }}>DevMRI — Developer Experience Diagnostic Platform · 2026</p>
    </footer>
  );
}

const DEMO_REPOS = ['facebook/react', 'vercel/next.js', 'microsoft/vscode', 'denoland/deno'];

export default function HomePage() {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    setTimeout(() => setShowIntro(false), 600);
  }, []);

  const handleScan = () => {
    let repo = repoInput.trim();
    if (!repo) { setError('Enter repo'); return; }
    
    // Sanitize full URLs to owner/repo
    if (repo.includes('github.com/')) {
      repo = repo.split('github.com/')[1].split('?')[0].split('#')[0];
      // remove trailing slash
      if (repo.endsWith('/')) repo = repo.slice(0, -1);
    }
    
    setLoading(true);
    router.push(`/scanning?repo=${repo}`);
  };

  const scrollToInput = () => heroInputRef.current?.focus();

  if (showIntro) return <AnimatedIntro onComplete={handleIntroComplete} />;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-void)', opacity: introComplete ? 1 : 0, transition: 'opacity 0.8s ease', overflowX: 'hidden' }}>
      {/* Grid Texture */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(rgba(var(--scan-cyan-rgb),0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--scan-cyan-rgb),0.06) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />
      
      {/* Global CRT Scanline Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))', backgroundSize: '100% 3px, 3px 100%', pointerEvents: 'none', zIndex: 1000, opacity: 0.1 }} />

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--nav-bg)', backdropFilter: 'blur(30px) saturate(180%)', zIndex: 100, borderBottom: '1px solid var(--nav-border)' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
           <div style={{ width: 32, height: 32, background: 'var(--scan-cyan)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '1rem' }}>M</div>
           Dev<span style={{ color: 'var(--scan-cyan)' }}>MRI</span>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <ThemeToggle />
          <button onClick={scrollToInput} style={{ padding: '8px 24px', background: 'var(--scan-cyan)', color: '#000', fontWeight: 800, border: 'none', borderRadius: 8, cursor: 'pointer' }}>Scan Now</button>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1 }}>
        <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '15%', right: '-5%', width: '45vw', maxWidth: 700, opacity: 0.1, pointerEvents: 'none', filter: 'blur(4px)' }}>
             <img src="/dxray_mascot_3d.png" style={{ width: '100%', animation: 'float 8s ease-in-out infinite' }} />
          </div>
          <div style={{ maxWidth: 1200, width: '100%', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 60, flexWrap: 'wrap' }}>
               <div style={{ flex: '1 1 600px', textAlign: 'left' }}>
                  <div style={{ marginBottom: 32, opacity: 0, animation: 'slideInUp 1s forwards' }}>
                    <span style={{ padding: '6px 16px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)', color: 'var(--scan-cyan)', borderRadius: 100, fontSize: '0.7rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>[DX_PROTOCOL_V4.2] ONLINE</span>
                  </div>
                  <h1 style={{ fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 950, color: 'var(--text-primary)', lineHeight: 0.9, marginBottom: 32, opacity: 0, animation: 'slideInUp 1s 0.2s forwards' }}>Surgery for your<br /><span style={{ background: 'linear-gradient(135deg, var(--scan-cyan), #00e676)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Codebase.</span></h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', maxWidth: 540, lineHeight: 1.6, marginBottom: 48, opacity: 0, animation: 'slideInUp 1s 0.4s forwards' }}>Treat developer friction like biological technical necrosis. Triage bottlenecks and perform AI-driven surgeries.</p>
                  
                  <div style={{ display: 'flex', gap: 12, opacity: 0, animation: 'slideInUp 1s 0.6s forwards' }}>
                    <input ref={heroInputRef} type="text" value={repoInput} onChange={e => setRepoInput(e.target.value)} placeholder="owner/repo (e.g. facebook/react)" style={{ padding: '18px 24px', borderRadius: 12, flex: 1, maxWidth: 400, background: 'var(--bg-secondary)', border: '1px solid rgba(var(--scan-cyan-rgb), 0.15)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', boxShadow: 'var(--card-shadow)' }} />
                    <button onClick={handleScan} className="btn-scan-primary">START SCAN</button>
                  </div>
               </div>
               <div style={{ flex: '0 1 400px', opacity: 0, animation: 'slideInUp 1s 0.8s forwards' }}>
                  <div className="hud-panel" style={{ padding: '48px 40px', textAlign: 'center' }}>
                     <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
                        <img src="/dxray_mascot_3d.png" style={{ width: 100, borderRadius: '50%', border: '2px solid var(--scan-cyan)', boxShadow: '0 0 20px rgba(0,229,255,0.2)' }} />
                        <div style={{ position: 'absolute', bottom: 5, right: 5, width: 16, height: 16, background: '#00e676', borderRadius: '50%', border: '3px solid var(--bg-void)' }} />
                     </div>
                     <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)' }}>AI Surgeon v2.1</h2>
                     <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 8, fontFamily: 'var(--font-mono)' }}>OPERATIONAL_STATUS: READY</p>
                     <button onClick={() => router.push('/dashboard?demo=true')} className="clinical-btn-outline" style={{ marginTop: 32, padding: '18px', width: '100%', fontSize: '0.9rem', fontWeight: 800 }}>🎮 ENTER SURGICS DEMO</button>
                  </div>
               </div>
            </div>
          </div>
        </section>
        
        <section style={{ padding: '160px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
           <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100vw', height: '2px', background: 'linear-gradient(90deg, transparent, var(--scan-cyan), transparent)', animation: 'scanLineMove 4s linear infinite' }} />
           </div>
           <div style={{ position: 'relative', zIndex: 1 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--scan-cyan)', letterSpacing: '0.2em', fontWeight: 800, display: 'block', marginBottom: 24 }}>[SYSTEM_TRIAGE_RUNNING]</span>
              <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 950, fontStyle: 'italic', letterSpacing: '-0.03em', lineHeight: 1 }}>"Software is <span style={{ color: 'var(--scan-cyan)', textShadow: '0 0 20px rgba(0,229,255,0.4)' }}>biological.</span>"</h2>
              <div style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 40 }}>
                 <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>DNA_SEQUENCE</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--scan-cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>ATCG-9921-X</div>
                 </div>
                 <div style={{ width: '1px', background: 'rgba(var(--text-muted-rgb), 0.2)' }} />
                 <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>CELLULAR_HEALTH</div>
                    <div style={{ fontSize: '0.9rem', color: '#ff1744', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>CRITICAL_NECROSIS</div>
                 </div>
              </div>
           </div>
        </section>

        <ChapterProblem />
        <ChapterScan />
        

        <ChapterScore />
        <ChapterSurgery />
        <ChapterPersonas />
        <ChapterFeatures />
        <ChapterTestimonials />
        <FinalCTA onScan={scrollToInput} />
        <Footer />
      </main>

      <style jsx>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes scanLineMove { 0% { top: 0%; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .hud-panel { background: var(--card-bg); backdrop-filter: blur(20px); border: 1px solid rgba(var(--scan-cyan-rgb), 0.2); border-left: 4px solid var(--scan-cyan); border-radius: 24px; box-shadow: var(--card-shadow); }
        .clinical-btn-outline { border: 2px solid #b388ff; color: #b388ff; background: transparent; border-radius: 12px; transition: all 0.3s ease; }
        .clinical-btn-outline:hover { background: rgba(179, 136, 255, 0.1); transform: translateY(-2px); box-shadow: 0 0 20px rgba(179, 136, 255, 0.2); }
      `}</style>
      <style jsx>{`
        .btn-scan-primary {
          padding: 18px 40px;
          background: var(--scan-cyan);
          color: #000;
          font-weight: 950;
          border: none;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,229,255,0.2);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .btn-scan-primary:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 10px 40px rgba(0,229,255,0.5);
          background: #ffffff;
        }
        .btn-scan-primary:active {
          transform: translateY(-1px) scale(0.98);
        }
        .btn-scan-primary::after {
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
        .btn-scan-primary:hover::after {
          left: 140%;
          opacity: 1;
        }
        .clinical-btn-outline {
          background: transparent;
          border: 1px solid rgba(var(--scan-cyan-rgb), 0.3);
          color: var(--scan-cyan);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: var(--font-mono);
        }
        .clinical-btn-outline:hover {
          background: rgba(0,229,255,0.08);
          border-color: var(--scan-cyan);
          transform: translateY(-2px);
          box-shadow: 0 0 20px rgba(0,229,255,0.1);
        }
        .hud-panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(var(--scan-cyan-rgb), 0.1);
          border-radius: 32px;
          backdrop-filter: blur(20px);
          box-shadow: var(--card-shadow);
        }
        @keyframes float { 
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
