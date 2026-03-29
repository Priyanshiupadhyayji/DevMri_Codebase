import { NextRequest } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { runs } = body;

    if (!runs || !Array.isArray(runs) || runs.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing or invalid runs array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formattedRuns = runs.map((run: any) => ({
      timestamp: run.created_at || run.timestamp || new Date().toISOString(),
      duration_seconds: run.duration_minutes ? run.duration_minutes * 60 : (run.duration_seconds || 0),
      status: run.conclusion || run.status || 'completed'
    }));

    const mlRes = await fetch(`${ML_SERVICE_URL}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runs: formattedRuns })
    });

    if (!mlRes.ok) {
      const error = await mlRes.text();
      return new Response(JSON.stringify({ error: `ML service error: ${error}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await mlRes.json();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
