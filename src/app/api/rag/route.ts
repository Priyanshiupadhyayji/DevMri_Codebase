import { NextRequest } from 'next/server';
import { indexRepository, queryCodebase, getIndexStatus } from '@/lib/rag';

// POST /api/rag — Index a repo or query the codebase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'index') {
      // ─── INDEX REPOSITORY ─────────────────────────────
      const { owner, repo, token } = body;
      if (!owner || !repo) {
        return Response.json({ error: 'Missing owner or repo' }, { status: 400 });
      }

      // Stream progress via SSE
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            const store = await indexRepository(owner, repo, token, (message, percent) => {
              send({ type: 'progress', message, percent });
            });

            send({
              type: 'complete',
              fileCount: store.fileCount,
              chunkCount: store.totalChunks,
              indexedAt: store.indexedAt,
            });
          } catch (e: any) {
            send({ type: 'error', message: e.message });
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

    } else if (action === 'query') {
      // ─── QUERY CODEBASE ───────────────────────────────
      const { repoKey, question, history } = body;
      if (!repoKey || !question) {
        return Response.json({ error: 'Missing repoKey or question' }, { status: 400 });
      }

      // Stream the response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (data: unknown) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          try {
            send({ type: 'searching', message: 'Searching codebase...' });

            const result = await queryCodebase(repoKey, question, history || []);

            // Send sources first
            send({ type: 'sources', sources: result.sources });

            // Stream the answer word by word for dramatic effect
            const words = result.answer.split(' ');
            let buffer = '';
            for (let i = 0; i < words.length; i++) {
              buffer += words[i] + (i < words.length - 1 ? ' ' : '');
              if (buffer.length > 30 || i === words.length - 1) {
                send({ type: 'chunk', content: buffer });
                buffer = '';
                await new Promise(r => setTimeout(r, 20));
              }
            }

            send({ type: 'end' });
          } catch (e: any) {
            send({ type: 'error', message: e.message });
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

    } else if (action === 'status') {
      // ─── CHECK INDEX STATUS ───────────────────────────
      const { repoKey } = body;
      const status = getIndexStatus(repoKey);
      return Response.json(status);

    } else {
      return Response.json({ error: 'Invalid action. Use: index, query, or status' }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json({ error: error.message || 'RAG operation failed' }, { status: 500 });
  }
}
