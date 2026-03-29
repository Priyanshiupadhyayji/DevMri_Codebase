'use client';
import { useEffect, useState } from 'react';
import { ThemeToggle, useTheme } from '@/components/ThemeProvider';

interface PathOperation {
  summary: string;
  description: string;
  operationId: string;
  tags: string[];
  parameters?: any[];
  requestBody?: any;
  responses: Record<string, any>;
}

interface ApiSpec {
  info: { title: string; version: string; description: string };
  servers: { url: string; description: string }[];
  paths: Record<string, Record<string, PathOperation>>;
  tags: { name: string; description: string }[];
}

const METHOD_COLORS: Record<string, string> = {
  get: '#00e676',
  post: '#00e5ff',
  put: '#ffab00',
  delete: '#ff1744',
  patch: '#b388ff',
};

export default function ApiReferencePage() {
  const { theme } = useTheme();
  const [spec, setSpec] = useState<ApiSpec | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>('All');
  const isLight = theme === 'light';

  useEffect(() => {
    fetch('/api/openapi')
      .then(r => r.json())
      .then(setSpec)
      .catch(console.error);
  }, []);

  if (!spec) {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="heartbeat" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading API specification...</p>
        </div>
      </main>
    );
  }

  const allPaths = Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, op]) => ({
      path,
      method,
      operation: op as PathOperation,
      key: `${method}-${path}`,
    }))
  );

  const filteredPaths = activeTag === 'All'
    ? allPaths
    : allPaths.filter(p => (p.operation.tags as string[])?.includes(activeTag));

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-void)', color: 'var(--text-primary)', transition: 'background 0.3s ease', position: 'relative', zIndex: 1 }}>
      {/* Header */}
      <div style={{ padding: '24px 40px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ fontSize: '1.25rem', fontWeight: 950, textDecoration: 'none', color: isLight ? '#000' : '#fff', letterSpacing: '-0.02em' }}>
            Dev<span style={{ color: 'var(--scan-cyan)' }}>MRI</span>
          </a>
          <div style={{ height: 20, width: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--scan-cyan)', fontWeight: 800, letterSpacing: '0.1em' }}>DOCS</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>SPEC v{spec.info.version}</span>
          <ThemeToggle />
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Title Section */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 950, marginBottom: 12, letterSpacing: '-0.04em', color: isLight ? '#000' : 'var(--text-primary)' }}>{spec.info.title}</h1>
          <p style={{ color: isLight ? '#333' : 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 850 }}>{spec.info.description}</p>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 40 }}>
          <div style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border-subtle)', borderRadius: 16, boxShadow: 'var(--card-shadow)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--scan-cyan)', lineHeight: 1 }}>{allPaths.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginTop: 8 }}>API Endpoints</div>
          </div>
          {spec.servers.map((s: any, i: number) => (
            <div key={i} style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--border-subtle)', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--card-shadow)' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: i === 0 ? 'var(--health-green)' : 'var(--warning-amber)', boxShadow: i === 0 ? '0 0 10px rgba(0,230,118,0.4)' : 'none' }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{s.description}</div>
                <code style={{ fontSize: '0.75rem', color: 'var(--scan-cyan)', wordBreak: 'break-all' }}>{s.url}</code>
              </div>
            </div>
          ))}
        </div>

        {/* Tag Selection */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: '0.8rem', color: isLight ? '#444' : 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Filter by Group</h3>
          <div role="tablist" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['All', ...(spec.tags || []).map((t: any) => t.name)].map((tag: string) => (
              <button
                key={tag}
                role="tab"
                aria-selected={activeTag === tag}
                onClick={() => setActiveTag(tag)}
                style={{
                  padding: '10px 20px', fontSize: '0.8rem', fontWeight: 900,
                  background: activeTag === tag ? 'var(--scan-cyan)' : isLight ? '#fff' : 'var(--card-bg)',
                  border: `1px solid ${activeTag === tag ? 'var(--scan-cyan)' : 'var(--border-subtle)'}`,
                  color: activeTag === tag ? '#fff' : 'var(--text-secondary)',
                  borderRadius: 30, cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: activeTag === tag ? '0 4px 15px rgba(0, 136, 204, 0.35)' : 'none'
                }}
                onMouseEnter={e => { if(activeTag !== tag) e.currentTarget.style.borderColor = 'var(--scan-cyan)'; }}
                onMouseLeave={e => { if(activeTag !== tag) e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Operations List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredPaths.map(({ path, method, operation, key }) => (
            <div 
              key={key} 
              style={{ 
                background: isLight ? '#fff' : 'var(--card-bg)', 
                border: `1px solid ${expandedPath === key ? 'var(--scan-cyan)' : 'var(--border-subtle)'}`, 
                borderRadius: 16, 
                overflow: 'hidden', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: expandedPath === key ? '0 12px 40px rgba(0, 136, 204, 0.2)' : 'var(--card-shadow)'
              }}
            >
              <div 
                onClick={() => setExpandedPath(expandedPath === key ? null : key)} 
                style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', cursor: 'pointer' }}
              >
                <span style={{ 
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 950, 
                  textTransform: 'uppercase', background: `${METHOD_COLORS[method]}`, color: '#fff', 
                  fontFamily: 'var(--font-mono)', minWidth: 70, textAlign: 'center',
                  boxShadow: `0 4px 10px ${METHOD_COLORS[method]}55`
                }}>
                  {method}
                </span>
                <code style={{ fontSize: '1rem', color: isLight ? '#000' : 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 750 }}>{path}</code>
                <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: isLight ? '#444' : 'var(--text-muted)', fontWeight: 600 }}>{operation.summary}</span>
                <span style={{ transform: expandedPath === key ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>▼</span>
              </div>

              {expandedPath === key && (
                <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--border-subtle)', background: isLight ? 'rgba(0,0,0,0.01)' : 'rgba(255,255,255,0.01)' }}>
                  <div style={{ marginTop: 20 }}>
                    <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 800, marginBottom: 8 }}>Description</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{operation.description}</p>
                  </div>

                  {operation.parameters && operation.parameters.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                      <h4 style={{ fontSize: '0.75rem', color: 'var(--scan-cyan)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Request Parameters</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {operation.parameters.map((p: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                            <code style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem' }}>{p.name}</code>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>{p.in}</span>
                            {p.required && <span style={{ color: 'var(--critical-red)', fontSize: '0.65rem', fontWeight: 900, background: 'rgba(255,23,68,0.1)', padding: '2px 8px', borderRadius: 4 }}>REQUIRED</span>}
                            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.75rem', color: 'var(--scan-cyan)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>Expected Responses</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {Object.entries(operation.responses).map(([code, resp]: [string, any]) => (
                        <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isLight ? '#f8f9fa' : 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
                          <span style={{ 
                            color: code.startsWith('2') ? '#00c853' : '#ff1744', 
                            fontWeight: 950, 
                            fontFamily: 'var(--font-mono)', 
                            fontSize: '0.9rem',
                            minWidth: 40
                          }}>{code}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{resp.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* JSON Link */}
        <div style={{ marginTop: 64, textAlign: 'center', opacity: 0.6 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            DevMRI Open API Spec v{spec.info.version} • <a href="/api/openapi" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--scan-cyan)', fontWeight: 700, textDecoration: 'none' }}>Download Full Specification (JSON)</a>
          </p>
        </div>
      </div>
    </main>
  );
}
