import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from '@/components/ThemeProvider';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  metadataBase: new URL('https://devmri.vercel.app'),
  title: 'DevMRI — Developer Experience Diagnostic Platform',
  description: 'X-ray your GitHub repository. Expose hidden friction. Build the fix. Get your DX Score in 30 seconds.',
  keywords: ['developer experience', 'DX', 'GitHub', 'CI/CD', 'code review', 'diagnostics', 'productivity'],
  openGraph: {
    title: 'DevMRI — MRI for Your Codebase',
    description: 'Scan any GitHub repo for DX health. AI-powered diagnostics with auto-fix PRs.',
    type: 'website',
    url: 'https://devmri.vercel.app',
    images: [{ url: '/screenshot.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DevMRI — Developer Experience Diagnostic Platform',
    description: 'Scan any GitHub repo. Get DX Score, friction cost, and AI-powered fixes.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light-theme">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00e5ff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DevMRI" />
        <meta name="robots" content="index, follow" />
        {/* Plausible Analytics — only load in production to keep local logs clean */}
        {process.env.NODE_ENV === 'production' && (
          <script defer data-domain="devmri.vercel.app" src="https://plausible.io/js/script.js"></script>
        )}
        {/* Accessibility: focus-visible for keyboard navigation */}
        <style>{`
          *:focus-visible {
            outline: 2px solid #00e5ff;
            outline-offset: 2px;
            border-radius: 4px;
          }
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
          }
        `}</style>
        {/* Structured Data for SEO */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "DevMRI",
          "applicationCategory": "DeveloperApplication",
          "operatingSystem": "Web",
          "description": "AI-powered Developer Experience diagnostic platform. Scan any GitHub repo for DX health.",
          "url": "https://devmri.vercel.app",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
          "author": { "@type": "Organization", "name": "DevMRI Team" }
        })}} />
      </head>
      <body>
        <AuthProvider>
          <ThemeProvider>
            <div className="grid-bg" />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
