'use client';

import React from 'react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="animate-fade-in" style={{ background: '#0a0e14', minHeight: '100vh', color: '#e8edf4' }}>
      {/* Navigation */}
      <nav className="docs-nav">
        <div className="docs-nav-inner">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem' }}>🔬</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.02em' }}>DevMRI</span>
          </Link>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link href="/" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Back to Product</Link>
          </div>
        </div>
      </nav>

      <main className="docs-container">
        {/* Hero Section */}
        <header className="docs-hero">
          <span className="docs-subtitle">Clinical Documentation v1.0</span>
          <h1 className="docs-title">The MRI for Modern<br />Engineering Teams</h1>
          <p className="docs-desc">
            DevMRI diagnoses developer experience (DX) friction with clinical precision. 
            Stop guessing why your team is slow—start seeing the hidden bottlenecks.
          </p>
        </header>

        {/* Introduction Section */}
        <section className="docs-section">
          <h2 className="docs-section-title">🩺 The Clinical Model</h2>
          <div className="docs-quote">
            <p>"If you can't measure it, you can't improve it. But if you measure the wrong thing, you create necrosis."</p>
            <cite>— The DevMRI Philosophy</cite>
          </div>
          <p className="docs-card-text" style={{ fontSize: '1.1rem', marginBottom: 32 }}>
            DevMRI uses a <b>100-point DX Scale</b> to grade repository health. Unlike simple dashboards, 
            we analyze the interaction between code, humans, and infrastructure.
          </p>
          
          <div className="docs-grid">
            <div className="docs-module-card" style={{ borderLeft: '4px solid #00e676' }}>
              <span className="docs-card-title">Grade A (80-100)</span>
              <p className="docs-card-text">Elite. High flow state, minimal technical debt, and optimized CI/CD loops.</p>
            </div>
            <div className="docs-module-card" style={{ borderLeft: '4px solid #ffab00' }}>
              <span className="docs-card-title">Grade C (40-59)</span>
              <p className="docs-card-text">Symptomatic. Significant friction in reviews or builds causing developer fatigue.</p>
            </div>
            <div className="docs-module-card" style={{ borderLeft: '4px solid #ff1744' }}>
              <span className="docs-card-title">Grade F (0-19)</span>
              <p className="docs-card-text">Critical. Deep systemic failure in the engineering lifecycle.</p>
            </div>
          </div>
        </section>

        {/* The 7 Diagnostic Slices */}
        <section className="docs-section">
          <h2 className="docs-section-title">🎞️ The 7 Diagnostic Slices</h2>
          <div className="docs-grid">
            <div className="docs-module-card">
              <span className="docs-card-icon">⚡</span>
              <h3 className="docs-card-title">CI/CD X-Ray</h3>
              <p className="docs-card-text">Identifies pipeline bottlenecks, success rates, and the true cost of "waiting for CI."</p>
              <span className="docs-clinical-note">Scan: Workflow history analysis</span>
            </div>
            <div className="docs-module-card">
              <span className="docs-card-icon">👀</span>
              <h3 className="docs-card-title">PR Radar</h3>
              <p className="docs-card-text">Analyzes review latency and load distribution. Detects uneven reviewer pressure.</p>
              <span className="docs-clinical-note">Scan: Pull Request cycles</span>
            </div>
            <div className="docs-module-card">
              <span className="docs-card-icon">📦</span>
              <h3 className="docs-card-title">Dependency MRI</h3>
              <p className="docs-card-text">Maps out security vulnerabilities, license risks, and outdated package drift.</p>
              <span className="docs-clinical-note">Scan: lockfiles & OSV DB</span>
            </div>
            <div className="docs-module-card">
              <span className="docs-card-icon">🔥</span>
              <h3 className="docs-card-title">Friction Heatmap</h3>
              <p className="docs-card-text">Finds code hotspots where complexity and churn meet. High-risk areas for bugs.</p>
              <span className="docs-clinical-note">Scan: Git log + AST complexity</span>
            </div>
            <div className="docs-module-card">
              <span className="docs-card-icon">💀</span>
              <h3 className="docs-card-title">Tissue Necrosis</h3>
              <p className="docs-card-text">Locates orphaned and dead code that increases cognitive load without adding value.</p>
              <span className="docs-clinical-note">Scan: File activity analysis</span>
            </div>
            <div className="docs-module-card">
              <span className="docs-card-icon">🧬</span>
              <h3 className="docs-card-title">Genetic Drift</h3>
              <p className="docs-card-text">Visualizes code ownership. Detects knowledge silos and critical bus-factor risks.</p>
              <span className="docs-clinical-note">Scan: Contribution distribution</span>
            </div>
            <div className="docs-module-card">
              <span className="docs-card-icon">🛡️</span>
              <h3 className="docs-card-title">Security Posture</h3>
              <p className="docs-card-text">Verifies branch protection, required reviews, and community hygiene standards.</p>
              <span className="docs-clinical-note">Scan: Repo configuration</span>
            </div>
          </div>
        </section>

        {/* Surgery Theatre */}
        <section className="docs-section">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, alignItems: 'center' }}>
            <div>
              <h2 className="docs-section-title">🏥 Surgery Theatre</h2>
              <p className="docs-card-text" style={{ fontSize: '1.1rem', marginBottom: 24 }}>
                Diagnosis is useless without a cure. DevMRI's <b>Surgery Theatre</b> uses Google Gemini AI to 
                generate precise, one-click Pull Requests to heal your repository.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '12px 20px', background: 'rgba(0,229,255,0.05)', borderRadius: 12, borderLeft: '3px solid #00e5ff' }}>
                  <span style={{ fontWeight: 600 }}>Real-time Code Gen</span>: AI types the fix live in the UI.
                </div>
                <div style={{ padding: '12px 20px', background: 'rgba(0,229,255,0.05)', borderRadius: 12, borderLeft: '3px solid #00e5ff' }}>
                  <span style={{ fontWeight: 600 }}>Friction Economics</span>: Every fix shows projected monthly savings.
                </div>
              </div>
            </div>
            <div className="docs-module-card" style={{ padding: 40, textAlign: 'center', border: '2px solid rgba(0,229,255,0.2)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 20 }}>🦾</div>
              <h3 style={{ marginBottom: 12 }}>AI-Powered Healing</h3>
              <p style={{ fontSize: '0.85rem', color: '#556677' }}>
                DevMRI doesn't just tell you there's a problem; it hands you the scalpel and performs the operation.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section className="docs-section">
          <h2 className="docs-section-title">🚀 Quick Start Protocol</h2>
          <div style={{ maxWidth: 700 }}>
            <div className="docs-step">
              <div className="docs-step-number">01</div>
              <div>
                <h3 className="docs-card-title">Enter Repository</h3>
                <p className="docs-card-text">Input any public GitHub URL or authenticate to scan your private org-wide fleet.</p>
              </div>
            </div>
            <div className="docs-step">
              <div className="docs-step-number">02</div>
              <div>
                <h3 className="docs-card-title">Observe MRI</h3>
                <p className="docs-card-text">Watch the real-time sensory scanning loop as we profile your engineering culture.</p>
              </div>
            </div>
            <div className="docs-step">
              <div className="docs-step-number">03</div>
              <div>
                <h3 className="docs-card-title">Perform Surgery</h3>
                <p className="docs-card-text">Navigate to the Surgery Theatre to apply AI-generated fixes and boost your DX Score.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Enterprise CTA */}
        <section className="docs-cta-banner">
          <h2 style={{ fontSize: '2.5rem', marginBottom: 16 }}>Ready for a team-wide scan?</h2>
          <p style={{ color: '#8899aa', marginBottom: 32, fontSize: '1.1rem' }}>
            Bring clinical rigor to your engineering department. Optimize for flow.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <Link href="/" className="btn btn-primary" style={{ padding: '16px 32px' }}>Start First Scan</Link>
            <Link href="/docs/api" className="btn btn-secondary" style={{ padding: '16px 32px' }}>API Reference</Link>
            <Link href="/leaderboard" className="btn btn-secondary" style={{ padding: '16px 32px' }}>View Leaderboard</Link>
          </div>
        </section>

        <footer style={{ marginTop: 100, padding: '40px 0', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
          <p style={{ color: '#556677', fontSize: '0.85rem' }}>
            © 2026 DevMRI Clinical Labs. Built with 🔬 for the engineering elite.
          </p>
        </footer>
      </main>
    </div>
  );
}
