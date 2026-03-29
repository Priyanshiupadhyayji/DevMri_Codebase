import { NextRequest } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { log_text } = body;

    if (!log_text) {
      return new Response(JSON.stringify({ error: 'Missing log_text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const mlRes = await fetch(`${ML_SERVICE_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_text })
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
