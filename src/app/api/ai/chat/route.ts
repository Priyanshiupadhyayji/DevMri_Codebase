import { NextRequest } from 'next/server';
import { chatFollowUp } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { message, scanResults, history } = await req.json();
    
    if (!message || !scanResults) {
      return new Response(JSON.stringify({ error: 'Missing message or scanResults' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const send = (data: string) => {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

          send(JSON.stringify({ type: 'start', content: '' }));

          const response = await chatFollowUp(message, scanResults, history || []);

          const words = response.split(' ');
          let buffer = '';
          
          for (let i = 0; i < words.length; i++) {
            buffer += words[i] + (i < words.length - 1 ? ' ' : '');
            
            if (buffer.length > 20 || i === words.length - 1) {
              send(JSON.stringify({ type: 'chunk', content: buffer }));
              buffer = '';
              await new Promise(r => setTimeout(r, 30));
            }
          }

          send(JSON.stringify({ type: 'end', content: '' }));
        } catch (e: any) {
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Chat failed' }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
