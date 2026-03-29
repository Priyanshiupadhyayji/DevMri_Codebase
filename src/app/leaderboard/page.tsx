'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    // Generate some mock historical data to make the leaderboard look active and competitive
    const defaultData = [
      { id: 1, repo: 'vercel/next.js', score: 92, grade: 'A', rank: 1, scans: 142, trend: '+3', avatar: 'https://github.com/vercel.png' },
      { id: 2, repo: 'facebook/react', score: 88, grade: 'A', rank: 2, scans: 89, trend: '-1', avatar: 'https://github.com/facebook.png' },
      { id: 3, repo: 'supabase/supabase', score: 85, grade: 'B', rank: 3, scans: 56, trend: '+5', avatar: 'https://github.com/supabase.png' },
      { id: 4, repo: 'tailwindlabs/tailwindcss', score: 82, grade: 'B', rank: 4, scans: 34, trend: '0', avatar: 'https://github.com/tailwindlabs.png' },
      { id: 5, repo: 'vitejs/vite', score: 79, grade: 'C', rank: 5, scans: 112, trend: '+8', avatar: 'https://github.com/vitejs.png' },
    ];

    // Load user's actual scans from local storage if they exist
    const saved = localStorage.getItem('devmri_scan_history');
    let mergedData = [...defaultData];
    
    if (saved) {
      try {
        const history = JSON.parse(saved);
        // Map history to leaderboard format
        history.forEach((h: any, i: number) => {
          if (!mergedData.find(m => m.repo === h.repo)) {
             mergedData.push({
               id: 10 + i,
               repo: h.repo,
               score: h.score,
               grade: h.grade,
               rank: 999, // Temp rank, will be sorted
               scans: 1,
               trend: 'NEW',
               avatar: `https://github.com/${h.repo.split('/')[0]}.png`
             });
          }
        });
      } catch (e) {}
    }

    // Sort by DX Score
    mergedData.sort((a, b) => b.score - a.score);
    // Assign real ranks
    mergedData.forEach((item, idx) => { item.rank = idx + 1; });

    setLeaderboard(mergedData);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-default)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header style={{ padding: '24px 40px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '1.5rem' }}>🩻</div>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>DevMRI</h1>
          </Link>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16, marginLeft: 8 }}>Global Leaderboard</span>
        </div>
        <div>
          <Link href="/" style={{ padding: '8px 24px', background: 'var(--scan-cyan)', color: '#000', borderRadius: 8, fontSize: '0.85rem', fontWeight: 800, textDecoration: 'none' }}>
            X-RAY YOUR REPO
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, padding: '60px 20px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: '3.5rem', fontWeight: 950, marginBottom: 16, background: 'linear-gradient(135deg, #fff, var(--scan-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
            DX Score Rankings
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
            Top repositories analyzed by DevMRI based on structural health, CI/CD friction, review latency, and security posture.
          </p>
        </div>

        {/* Global Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 60 }}>
          <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--scan-cyan)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Repos Scanned</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>9,248</p>
          </div>
          <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--health-green)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Global Avg DX Score</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--health-green)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>64</p>
          </div>
          <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--critical-red)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Industry Friction Cost</p>
            <p style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--critical-red)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>$4.2B</p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-subtle)' }}>
                <tr>
                  <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>Repository</th>
                  <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Grade</th>
                  <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>DX Score</th>
                  <th style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', textAlign: 'right' }}>Trend</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((item, index) => (
                  <tr 
                    key={item.id} 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.03)', 
                      background: index === 0 ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, transparent 100%)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    className="leaderboard-row"
                  >
                    <td style={{ padding: '24px 20px', fontWeight: 900, fontSize: '1.2rem', color: index < 3 ? 'var(--scan-cyan)' : 'var(--text-secondary)' }}>
                      #{item.rank}
                    </td>
                    <td style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <img src={item.avatar} alt="Avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-surface)' }} />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{item.repo}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          {item.scans} community scans
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '24px 20px', textAlign: 'center' }}>
                      <div style={{ 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 48, height: 48, borderRadius: 12, 
                        background: item.grade === 'A' ? 'rgba(0,230,118,0.1)' : item.grade === 'B' ? 'rgba(255,171,0,0.1)' : 'rgba(255,23,68,0.1)',
                        color: item.grade === 'A' ? 'var(--health-green)' : item.grade === 'B' ? 'var(--warning-amber)' : 'var(--critical-red)',
                        border: `1px solid ${item.grade === 'A' ? 'var(--health-green)' : item.grade === 'B' ? 'var(--warning-amber)' : 'var(--critical-red)'}30`,
                        fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--font-mono)'
                      }}>
                        {item.grade}
                      </div>
                    </td>
                    <td style={{ padding: '24px 20px', textAlign: 'right', fontWeight: 900, fontSize: '1.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {item.score}
                    </td>
                    <td style={{ padding: '24px 20px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: item.trend.startsWith('+') ? 'var(--health-green)' : item.trend === 'NEW' ? 'var(--scan-cyan)' : item.trend.startsWith('-') ? 'var(--critical-red)' : 'var(--text-muted)' }}>
                      {item.trend}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Call to action */}
        <div className="card" style={{ marginTop: 40, background: 'linear-gradient(135deg, rgba(0,229,255,0.05), rgba(255,23,68,0.05))', border: '1px solid rgba(0,229,255,0.2)', textAlign: 'center', padding: '40px' }}>
          <h3 style={{ fontSize: '1.8rem', marginBottom: 16 }}>Ready to claim your spot?</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>Analyze your repository to discover hidden friction, generate automated fixes, and see where your team ranks globally.</p>
          <Link href="/" style={{ padding: '12px 32px', background: '#fff', color: '#000', borderRadius: 8, fontSize: '0.9rem', fontWeight: 900, textDecoration: 'none', display: 'inline-block' }}>
            START DIAGNOSTIC SCAN
          </Link>
        </div>
      </main>

      <style jsx>{`
        .leaderboard-row:hover {
          background: rgba(255,255,255,0.02) !important;
        }
      `}</style>
    </div>
  );
}
