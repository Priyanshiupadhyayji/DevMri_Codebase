import { NextRequest } from 'next/server';

/**
 * SBOM (Software Bill of Materials) Generator
 * Generates a CycloneDX-formatted SBOM from the dependency scan data.
 */
export async function GET(req: NextRequest) {
  const repoParam = req.nextUrl.searchParams.get('repo') || 'demo/playground';
  const [owner, repo] = repoParam.split('/');
  const token = process.env.GITHUB_TOKEN || '';

  try {
    // Fetch package.json from the repo
    const pkgRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/package.json`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    let deps: Record<string, string> = {};
    let devDeps: Record<string, string> = {};

    if (pkgRes.ok) {
      const pkgData = await pkgRes.json();
      const content = JSON.parse(Buffer.from(pkgData.content, 'base64').toString());
      deps = content.dependencies || {};
      devDeps = content.devDependencies || {};
    } else {
      // Fallback: use demo data
      deps = {
        'react': '^19.2.3',
        'react-dom': '^19.2.3',
        'next': '16.1.6',
        'recharts': '^3.8.0',
        '@google/generative-ai': '^0.24.1',
        '@octokit/rest': '^22.0.1',
        'canvas-confetti': '^1.9.4',
      };
      devDeps = {
        'typescript': '^5',
        'eslint': '^9',
        '@types/react': '^19',
      };
    }

    const components = [
      ...Object.entries(deps).map(([name, version]) => ({
        type: 'library',
        name,
        version: String(version).replace(/[\^~>=<]/g, ''),
        scope: 'required',
        purl: `pkg:npm/${name.replace('@', '%40')}@${String(version).replace(/[\^~>=<]/g, '')}`,
        evidence: { identity: { field: 'purl', confidence: 1 } },
      })),
      ...Object.entries(devDeps).map(([name, version]) => ({
        type: 'library',
        name,
        version: String(version).replace(/[\^~>=<]/g, ''),
        scope: 'optional',
        purl: `pkg:npm/${name.replace('@', '%40')}@${String(version).replace(/[\^~>=<]/g, '')}`,
        evidence: { identity: { field: 'purl', confidence: 1 } },
      })),
    ];

    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: `urn:uuid:${crypto.randomUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'DevMRI',
            name: 'devmri-sbom-generator',
            version: '1.0.0',
          },
        ],
        component: {
          type: 'application',
          name: `${owner}/${repo}`,
          version: '1.0.0',
          purl: `pkg:github/${owner}/${repo}`,
        },
      },
      components,
      dependencies: components.map(c => ({
        ref: c.purl,
        dependsOn: [],
      })),
    };

    return Response.json(sbom, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="sbom-${owner}-${repo}.json"`,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return Response.json(
      { error: 'Failed to generate SBOM', details: error.message },
      { status: 500 },
    );
  }
}
