'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface AutopsyProps {
  dxScore: number;
  grade: string;
  frictionCost: { total: number; ciBottleneck: { cost: number }; reviewDelay: { cost: number }; vulnerabilities: { cost: number } };
  cicd?: any;
  reviews?: any;
  deps?: any;
  necrosis?: any;
  busFactor?: any;
  heatmap?: any;
  repoName: string;
}

export function CodeAutopsy({ dxScore, grade, frictionCost, cicd, reviews, deps, necrosis, busFactor, heatmap, repoName }: AutopsyProps) {
  const [revealStage, setRevealStage] = useState(0);
  const [typewriterIdx, setTypewriterIdx] = useState(0);
  const isDead = dxScore < 40;
  const isCritical = dxScore < 60;

  // Auto-reveal stages
  useEffect(() => {
    const delays = [500, 1200, 2000, 2800, 3600, 4400];
    const timers = delays.map((d, i) =>
      setTimeout(() => setRevealStage(i + 1), d)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Cause of Death items
  const causes = useMemo(() => {
    const items: { label: string; value: string; severity: 'critical' | 'high' | 'medium' | 'low' }[] = [];

    if (cicd) {
      if (cicd.successRate < 80) items.push({ label: 'CI Failure Rate', value: `${(100 - cicd.successRate).toFixed(1)}%`, severity: cicd.successRate < 60 ? 'critical' : 'high' });
      if (cicd.avgDurationMinutes > 15) items.push({ label: 'Build Time (avg)', value: `${cicd.avgDurationMinutes.toFixed(1)} min`, severity: cicd.avgDurationMinutes > 30 ? 'critical' : 'high' });
    }

    if (reviews) {
      if (reviews.medianReviewTimeHours > 48) items.push({ label: 'Review Delay', value: `${reviews.medianReviewTimeHours.toFixed(0)} hrs`, severity: reviews.medianReviewTimeHours > 96 ? 'critical' : 'high' });
      if (reviews.xlPrPercentage > 20) items.push({ label: 'XL Pull Requests', value: `${reviews.xlPrPercentage.toFixed(0)}%`, severity: 'high' });
      if (reviews.selfMergeRate > 30) items.push({ label: 'Self-Merge Rate', value: `${reviews.selfMergeRate.toFixed(0)}%`, severity: 'medium' });
    }

    if (deps) {
      if (deps.vulnerabilities.critical > 0) items.push({ label: 'Critical CVEs', value: `${deps.vulnerabilities.critical}`, severity: 'critical' });
      if (deps.outdatedPercentage > 30) items.push({ label: 'Outdated Deps', value: `${deps.outdatedPercentage.toFixed(0)}%`, severity: 'medium' });
    }

    if (necrosis && necrosis.orphanedFiles?.length > 0) {
      items.push({ label: 'Dead Code Files', value: `${necrosis.orphanedFiles.length}`, severity: necrosis.riskScore > 50 ? 'high' : 'medium' });
    }

    if (busFactor && busFactor.busFactor <= 1) {
      items.push({ label: 'Bus Factor', value: '1 (CRITICAL)', severity: 'critical' });
    }

    if (items.length === 0) {
      items.push({ label: 'Overall Health', value: 'Stable', severity: 'low' });
    }

    return items.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    }).slice(0, 6);
  }, [cicd, reviews, deps, necrosis, busFactor]);

  // Estimated time to death
  const monthsToGradeF = useMemo(() => {
    if (dxScore <= 20) return 0;
    const decayRate = (100 - dxScore) / 12; // rate of friction accumulation
    const pointsToF = dxScore - 19;
    return Math.max(1, Math.round(pointsToF / Math.max(decayRate, 3)));
  }, [dxScore]);

  const statusLabel = isDead ? 'DECEASED' : isCritical ? 'CRITICAL CONDITION' : dxScore < 80 ? 'SYMPTOMATIC' : 'HEALTHY';
  const statusColor = isDead ? '#ff1744' : isCritical ? '#ff6d00' : dxScore < 80 ? '#ffd600' : '#00e676';

  // Typewriter effect for the narrative
  const narrative = isDead
    ? `This repository died not from a single blow, but from a thousand cuts. Accumulated friction from ${causes.length} critical failure vectors eroded engineering velocity until productivity flatlined.`
    : isCritical
    ? `This repository is hemorrhaging. Without immediate intervention on ${causes.length} active pathologies, estimated time to complete degradation is ${monthsToGradeF} months.`
    : `This repository is showing early symptoms. ${causes.length} friction vectors detected. Prognosis: treatable with targeted surgery.`;

  useEffect(() => {
    if (revealStage >= 4 && typewriterIdx < narrative.length) {
      const timer = setTimeout(() => setTypewriterIdx(prev => prev + 2), 15);
      return () => clearTimeout(timer);
    }
  }, [revealStage, typewriterIdx, narrative.length]);

  const severityColor = (s: string) => s === 'critical' ? '#ff1744' : s === 'high' ? '#ff6d00' : s === 'medium' ? '#ffd600' : '#00e676';

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0a0008 0%, #120010 50%, #0a0008 100%)',
      borderRadius: 20,
      border: '1px solid rgba(255,23,68,0.15)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Scan line effect */}
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,23,68,0.3), transparent)',
        animation: 'autopsyScanLine 3s ease-in-out infinite',
        zIndex: 5,
      }} />

      {/* Header — stamped report style */}
      <div style={{
        padding: '32px 32px 24px',
        borderBottom: '1px solid rgba(255,23,68,0.1)',
        opacity: revealStage >= 1 ? 1 : 0,
        transform: revealStage >= 1 ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'all 0.6s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.3em', color: 'rgba(255,23,68,0.5)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 8 }}>
              ☠️ AUTOPSY REPORT — CONFIDENTIAL
            </div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              Code Autopsy Report
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: 4, fontFamily: 'monospace' }}>
              Subject: {repoName} · Report #{Math.floor(Date.now() / 1000).toString(36).toUpperCase()}
            </div>
          </div>
          <div style={{
            padding: '8px 20px', borderRadius: 8,
            background: `${statusColor}15`,
            border: `2px solid ${statusColor}`,
            color: statusColor,
            fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.15em',
            fontFamily: 'monospace',
            animation: isDead ? 'autopsyStamp 0.5s ease forwards' : 'none',
            animationDelay: '1.5s',
          }}>
            {statusLabel}
          </div>
        </div>
      </div>

      {/* Vital Signs Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        padding: '0 32px', gap: 0,
        borderBottom: '1px solid rgba(255,23,68,0.1)',
        opacity: revealStage >= 2 ? 1 : 0,
        transform: revealStage >= 2 ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.6s ease',
      }}>
        {[
          { label: 'DX SCORE', value: dxScore.toString(), sub: `Grade ${grade}` },
          { label: 'FRICTION COST', value: `$${frictionCost.total.toLocaleString()}`, sub: 'per month' },
          { label: isDead ? 'TIME OF DEATH' : 'EST. TIME TO GRADE F', value: isDead ? 'NOW' : `${monthsToGradeF} mo`, sub: isDead ? 'Confirmed' : 'Projected' },
        ].map((v, i) => (
          <div key={i} style={{
            padding: '20px 0',
            borderRight: i < 2 ? '1px solid rgba(255,23,68,0.08)' : 'none',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginBottom: 6 }}>{v.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', fontFamily: "'JetBrains Mono', monospace" }}>{v.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{v.sub}</div>
          </div>
        ))}
      </div>

      {/* Cause of Death */}
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid rgba(255,23,68,0.1)',
        opacity: revealStage >= 3 ? 1 : 0,
        transform: revealStage >= 3 ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.6s ease',
      }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: 'rgba(255,23,68,0.6)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 16 }}>
          {isDead ? '💀 CAUSE OF DEATH' : '🩺 ACTIVE PATHOLOGIES'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {causes.map((c, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderRadius: 10,
              background: `${severityColor(c.severity)}08`,
              borderLeft: `3px solid ${severityColor(c.severity)}`,
              animationDelay: `${3 + i * 0.3}s`,
              animation: 'autopsyRevealLine 0.4s ease forwards',
              opacity: revealStage >= 3 ? 1 : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: '0.55rem', fontWeight: 900, padding: '2px 8px', borderRadius: 4,
                  background: `${severityColor(c.severity)}20`, color: severityColor(c.severity),
                  fontFamily: 'monospace', letterSpacing: '0.05em',
                }}>{c.severity.toUpperCase()}</span>
                <span style={{ fontSize: '0.85rem', color: '#dfe2eb', fontWeight: 600 }}>{c.label}</span>
              </div>
              <span style={{ fontSize: '1rem', fontWeight: 900, color: severityColor(c.severity), fontFamily: "'JetBrains Mono', monospace" }}>
                {c.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Forensic Narrative */}
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid rgba(255,23,68,0.1)',
        opacity: revealStage >= 4 ? 1 : 0,
        transition: 'all 0.6s ease',
      }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: 'rgba(255,23,68,0.6)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 12 }}>
          📝 FORENSIC ANALYSIS
        </div>
        <p style={{
          fontSize: '0.85rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.6)',
          fontFamily: "'JetBrains Mono', monospace",
          margin: 0, borderLeft: '2px solid rgba(255,23,68,0.2)', paddingLeft: 16,
        }}>
          {narrative.substring(0, typewriterIdx)}
          {typewriterIdx < narrative.length && <span style={{ opacity: 0.5, animation: 'xray-blink 0.8s step-end infinite' }}>▋</span>}
        </p>
      </div>

      {/* Cost Breakdown */}
      <div style={{
        padding: '24px 32px 32px',
        opacity: revealStage >= 5 ? 1 : 0,
        transform: revealStage >= 5 ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.6s ease',
      }}>
        <div style={{ fontSize: '0.6rem', letterSpacing: '0.25em', color: 'rgba(255,23,68,0.6)', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 16 }}>
          💸 FINANCIAL DAMAGE ASSESSMENT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'CI Pipeline Waste', cost: frictionCost.ciBottleneck.cost, icon: '⚡' },
            { label: 'PR Review Delay', cost: frictionCost.reviewDelay.cost, icon: '👀' },
            { label: 'Security Exposure', cost: frictionCost.vulnerabilities.cost, icon: '🛡️' },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,23,68,0.04)', borderRadius: 12, padding: 16,
              border: '1px solid rgba(255,23,68,0.08)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ff3d60', fontFamily: "'JetBrains Mono', monospace" }}>
                ${item.cost.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16, textAlign: 'center', padding: '14px 0',
          background: 'rgba(255,23,68,0.06)', borderRadius: 12,
          border: '1px dashed rgba(255,23,68,0.15)',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>ANNUAL PROJECTED LOSS: </span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ff1744', fontFamily: "'JetBrains Mono', monospace" }}>
            ${(frictionCost.total * 12).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
