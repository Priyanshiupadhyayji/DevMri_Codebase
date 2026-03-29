import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl, repoName, dxScore, grade, frictionCost, cicdScore, reviewScore, depsScore } = body;

    if (!webhookUrl || !repoName) {
      return Response.json({ success: false, error: 'Missing webhook URL or repo name' }, { status: 400 });
    }

    const gradeEmoji = grade === 'A' ? '🟢' : grade === 'B' ? '🔵' : grade === 'C' ? '🟡' : grade === 'D' ? '🟠' : '🔴';

    const slackPayload = {
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🩻 DevMRI DX Report — ${repoName}`, emoji: true }
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*DX Score*\n${gradeEmoji} *${dxScore}* / 100 (Grade *${grade}*)` },
            { type: 'mrkdwn', text: `*Friction Cost*\n💰 *$${frictionCost?.toLocaleString?.() || frictionCost}/mo*` },
          ]
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*CI/CD*\n⚡ ${cicdScore || '—'}/100` },
            { type: 'mrkdwn', text: `*Reviews*\n👀 ${reviewScore || '—'}/100` },
            { type: 'mrkdwn', text: `*Dependencies*\n📦 ${depsScore || '—'}/100` },
          ]
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '🩻 _Scanned by DevMRI — Developer Experience Diagnostic Platform_' }
          ]
        }
      ]
    };

    const slackRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!slackRes.ok) {
      return Response.json({ success: false, error: 'Slack webhook returned an error' }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Report sent to Slack' });
  } catch (error: any) {
    console.error('Slack dispatch error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to send to Slack',
    }, { status: 500 });
  }
}
