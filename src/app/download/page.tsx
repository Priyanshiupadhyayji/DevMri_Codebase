'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ExtensionFile {
  name: string;
  isDirectory: boolean;
}

export default function DownloadPage() {
  const [files, setFiles] = useState<ExtensionFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/download-extension')
      .then(res => res.json())
      .then(data => {
        if (data.files) setFiles(data.files);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const copyPath = () => {
    navigator.clipboard.writeText('devmri-extension');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const installInstructions = [
    'Download the extension files',
    'Open Chrome and navigate to chrome://extensions/',
    'Enable "Developer mode" in the top right',
    'Click "Load unpacked" and select the extension folder',
    'Pin the DevMRI extension to your browser toolbar'
  ];

  return (
    <div style={{ 
      background: '#0a0e14', 
      minHeight: '100vh', 
      color: '#e8edf4',
      padding: '40px 24px'
    }}>
      <nav style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 60,
        maxWidth: 1000,
        margin: '0 auto 60px'
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <span style={{ fontSize: '1.5rem' }}>🔬</span>
          <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.02em' }}>DevMRI</span>
        </Link>
        <Link href="/" className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Back to Product</Link>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{
            display: 'inline-block',
            padding: '6px 16px',
            background: 'rgba(0, 230, 118, 0.06)',
            border: '1px solid rgba(0, 230, 118, 0.12)',
            borderRadius: 4,
            marginBottom: 24,
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.1em',
            color: '#00e676',
          }}>
            BROWSER EXTENSION
          </span>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginBottom: 16,
          }}>
            Install DevMRI <span style={{ color: '#00e5ff' }}>Extension</span>
          </h1>
          <p style={{ color: '#8899aa', fontSize: '1.1rem', maxWidth: 500, margin: '0 auto', lineHeight: 1.7 }}>
            Scan any GitHub repository directly from your browser. Get instant DX scores without leaving the page.
          </p>
        </div>

        <div style={{
          background: 'rgba(25, 28, 31, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.04)',
          padding: 32,
          marginBottom: 32,
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            📁 Extension Files
          </h3>
          
          {loading ? (
            <div style={{ color: '#556677' }}>Loading files...</div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: 8 
            }}>
              {files.map((file) => (
                <div key={file.name} style={{
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.04)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span style={{ color: file.isDirectory ? '#ffab00' : '#00e5ff' }}>
                    {file.isDirectory ? '📁' : '📄'}
                  </span>
                  {file.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(25, 28, 31, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.04)',
          padding: 32,
          marginBottom: 32,
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>
            ⚡ Installation Instructions
          </h3>
          <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {installInstructions.map((step, i) => (
              <li key={i} style={{ color: '#8899aa', lineHeight: 1.6 }}>
                <span style={{ color: '#00e5ff', fontWeight: 600, marginRight: 8 }}>{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div style={{
          background: 'rgba(0, 229, 255, 0.05)',
          borderRadius: 16,
          border: '1px solid rgba(0, 229, 255, 0.15)',
          padding: 24,
          textAlign: 'center',
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: '#00e5ff' }}>
            Quick Access
          </h4>
          <p style={{ color: '#8899aa', fontSize: '0.9rem', marginBottom: 16 }}>
            The extension folder is located at the root of the project: <code style={{ 
              background: 'rgba(0,0,0,0.3)', 
              padding: '4px 8px', 
              borderRadius: 4,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: '#00e5ff',
              cursor: 'pointer'
            }} onClick={copyPath}>
              {copied ? '✓ Copied!' : 'devmri-extension'}
            </code>
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="https://github.com/new?template_name=devmri-extension&template_owner="
              target="_blank"
              style={{
                padding: '12px 24px',
                background: '#00e5ff',
                color: '#000',
                fontWeight: 700,
                fontSize: '0.9rem',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              📦 Download as ZIP
            </a>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: '#00e5ff',
                fontWeight: 600,
                fontSize: '0.9rem',
                borderRadius: 8,
                border: '1px solid rgba(0, 229, 255, 0.3)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              🌐 Chrome Web Store (Coming Soon)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
