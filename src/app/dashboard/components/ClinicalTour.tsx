'use client';

import React, { useState, useEffect } from 'react';

export interface TourStep {
  targetSelector: string;
  title: string;
  text: string;
  icon: string;
  voiceLine: string;
  tabSwitch?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '.score-reveal',
    title: 'The Heart of the System',
    text: "This is your DX Score — the primary vital sign of your engineering health. A high score means a healthy codebase with low developer friction.",
    icon: '🧠',
    voiceLine: 'Good morning, Doctor. I am your lead clinical consultant. Let me walk you through the diagnostics. First, observe the DX Score — the heartbeat of this repository.'
  },
  {
    targetSelector: '.card-glow',
    title: 'Financial Hemorrhage',
    text: "We calculate exactly how much money is lost every month due to technical debt, slow CI pipelines, and review bottlenecks. This is the financial cost of friction.",
    icon: '💵',
    voiceLine: 'This is the friction cost analysis. Every dollar shown here represents wasted engineering hours — a hemorrhage we must stop.'
  },
  {
    targetSelector: '.tabs-container',
    title: 'Diagnostic Array',
    text: "Each tab is a different diagnostic module — CI/CD X-Ray, PR Radar, Dependency MRI, Tissue Necrosis detection, and more. Together, they form a complete picture.",
    icon: '🔬',
    voiceLine: 'These diagnostic modules scan every layer of the codebase. Each tab reveals a different dimension of engineering health.'
  },
  {
    targetSelector: '.no-print',
    title: 'Surgical Instruments',
    text: "Toggle X-Ray mode to see the skeletal structure. Activate Night Shift for high-contrast diagnostics. Export clinical reports or dispatch summaries to Slack.",
    icon: '⚒️',
    voiceLine: 'Your surgical instruments are here. X-Ray mode, Night Shift, clinical reports, and direct dispatch to your engineering team via Slack.'
  },
  {
    targetSelector: '.tabs-container button:nth-child(2)',
    title: 'The Operating Theatre',
    text: "The Surgery Theatre lets you perform live AI-powered code fixes. Select a diagnosis, and watch as the AI surgeon generates the remediation code in real-time.",
    icon: '🏥',
    voiceLine: 'And finally — the operating theatre. This is where the healing happens. AI-powered code surgery, performed live.',
    tabSwitch: 'surgery'
  }
];

export function ClinicalTour({ step, onNext, onClose, onSwitchTab }: { 
  step: number; 
  onNext: () => void; 
  onClose: () => void;
  onSwitchTab: (tab: string) => void;
}) {
  const [highlightRect, setHighlightRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const currentStep = step < TOUR_STEPS.length ? TOUR_STEPS[step] : null;

  useEffect(() => {
    if (!currentStep) return;

    // Switch tab if needed
    if (currentStep.tabSwitch) {
      onSwitchTab(currentStep.tabSwitch);
    }

    // Find and highlight target element
    const findElement = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setHighlightRect({
            x: rect.left,
            y: rect.top,
            w: rect.width,
            h: rect.height
          });
        }, 400);
      }
    };

    // Small delay to let tab switch render
    const timeout = setTimeout(findElement, currentStep.tabSwitch ? 300 : 50);

    // Voice narration
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentStep.voiceLine);
      utterance.rate = 0.92;
      utterance.pitch = 0.85;
      utterance.volume = 1;
      
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.name.includes('Google UK English Male')) 
        || voices.find(v => v.name.includes('Daniel'))
        || voices.find(v => v.lang === 'en-GB')
        || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      
      setTimeout(() => window.speechSynthesis.speak(utterance), 600);
    }

    return () => {
      clearTimeout(timeout);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeaking(false);
    };
  }, [step, currentStep, onSwitchTab]);

  useEffect(() => {
    if (!currentStep) return;
    const updateRect = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
      }
    };
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [step, currentStep]);

  if (!currentStep) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 420, textAlign: 'center', padding: 48, background: 'rgba(10,14,20,0.95)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: 24, boxShadow: '0 0 80px rgba(0,229,255,0.15)' }}>
          <div style={{ fontSize: '5rem', marginBottom: 24, filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.5))' }}>🏥</div>
          <h2 style={{ color: 'var(--scan-cyan)', fontSize: '2rem', marginBottom: 12, fontWeight: 900 }}>INDUCTION COMPLETE</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6, fontSize: '0.95rem' }}>You are now qualified to perform deep codebase surgery. The diagnostic theatre is yours, Doctor.</p>
          <button 
            onClick={onClose}
            style={{ width: '100%', padding: '16px 24px', fontSize: '1.1rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--scan-cyan), var(--health-green))', color: '#000', border: 'none', borderRadius: 12, cursor: 'pointer', letterSpacing: '0.05em' }}
          >
            ENTER THEATRE →
          </button>
        </div>
      </div>
    );
  }

  const pad = 12;
  const cx = highlightRect ? highlightRect.x + highlightRect.w / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);
  const cy = highlightRect ? highlightRect.y + highlightRect.h / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 500);
  const radius = highlightRect ? Math.max(highlightRect.w, highlightRect.h) / 2 + pad + 30 : 100;

  const tooltipTop = highlightRect 
    ? (highlightRect.y + highlightRect.h + 24 + 280 > (typeof window !== 'undefined' ? window.innerHeight : 1000)
       ? Math.max(20, highlightRect.y - 280) 
       : highlightRect.y + highlightRect.h + 24)
    : (typeof window !== 'undefined' ? window.innerHeight / 2 - 140 : 500);
  const tooltipLeft = typeof window !== 'undefined' ? Math.min(
    window.innerWidth - 380,
    Math.max(20, cx - 175)
  ) : 20;

  return (
    <>
      <svg style={{ position: 'fixed', inset: 0, zIndex: 9998, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            <ellipse 
              cx={cx} cy={cy} 
              rx={radius} ry={radius * 0.7} 
              fill="black" 
              style={{ transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)' }}
            />
          </mask>
        </defs>
        <rect 
          width="100%" height="100%" 
          fill="rgba(0,0,0,0.82)" 
          mask="url(#tour-spotlight)" 
        />
        <ellipse 
          cx={cx} cy={cy} 
          rx={radius + 4} ry={(radius * 0.7) + 4} 
          fill="none" stroke="rgba(0,229,255,0.4)" strokeWidth="2"
          style={{ transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)', filter: 'blur(3px)' }}
        />
      </svg>

      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => {}} />

      <div style={{
        position: 'fixed',
        left: tooltipLeft,
        top: tooltipTop,
        width: 350,
        zIndex: 9999,
        transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
      }}>
        <div style={{ 
          background: 'rgba(10,14,20,0.95)', 
          backdropFilter: 'blur(24px)', 
          border: '1px solid rgba(0,229,255,0.3)', 
          borderRadius: 16, 
          padding: '24px',
          boxShadow: '0 0 60px rgba(0,229,255,0.15), 0 20px 60px rgba(0,0,0,0.5)' 
        }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ 
              fontSize: '2rem', 
              background: 'rgba(0,229,255,0.1)', 
              width: 56, height: 56, 
              borderRadius: 14, 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(0,229,255,0.2)',
              flexShrink: 0
            }}>
              {currentStep.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--scan-cyan)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700 }}>Phase 0{step + 1} / 0{TOUR_STEPS.length}</div>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', color: 'var(--text-primary)' }}>{currentStep.title}</h3>
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 20 }}>
            {currentStep.text}
          </p>

          {speaking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'rgba(0,229,255,0.05)', borderRadius: 8, border: '1px solid rgba(0,229,255,0.1)' }}>
              <span>🎙️</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--scan-cyan)', fontWeight: 600 }}>SURGEON NARRATING...</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} style={{ 
                width: i === step ? 24 : 8, height: 8, borderRadius: 4, 
                background: i === step ? 'var(--scan-cyan)' : i < step ? 'var(--health-green)' : 'rgba(255,255,255,0.1)',
                transition: 'all 0.3s',
                boxShadow: i === step ? '0 0 10px rgba(0,229,255,0.5)' : 'none'
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              onClick={() => { if (typeof window !== 'undefined') window.speechSynthesis.cancel(); onClose(); }}
              style={{ flex: 1, padding: '10px', fontSize: '0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
            >
              End Tour
            </button>
            <button 
              onClick={() => { if (typeof window !== 'undefined') window.speechSynthesis.cancel(); onNext(); }}
              style={{ flex: 2, padding: '10px', fontSize: '0.85rem', background: 'linear-gradient(135deg, var(--scan-cyan), var(--health-green))', color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, letterSpacing: '0.03em' }}
            >
              {step < TOUR_STEPS.length - 1 ? 'Next Probe →' : 'Complete Induction →'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
