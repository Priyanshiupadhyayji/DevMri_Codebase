import { NextRequest, NextResponse } from 'next/server';
import { getNextGithubToken } from '@/lib/tokens';

/**
 * GitHub Search Proxy
 * Intercepts requests to /search/code and forwards them to api.github.com
 * using the DevMRI token rotation pool.
 * This fixes 403 Forbidden errors from mysterious search calls.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.toString();
  const token = getNextGithubToken();

  console.log(`[DevMRI] 🔎 Proxying Search API request: /search/code?${query}`);

  try {
    const response = await fetch(`https://api.github.com/search/code?${query}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DevMRI-App',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json();

    if (!response.ok) {
        console.error(`[DevMRI] ❌ Search Proxy failed (${response.status}):`, data.message || 'Unknown error');
        return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[DevMRI] ❌ Search Proxy error:', error.message);
    return NextResponse.json({ error: 'Search Proxy internal error', details: error.message }, { status: 500 });
  }
}
