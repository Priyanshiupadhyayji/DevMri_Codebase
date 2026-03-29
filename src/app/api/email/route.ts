import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, repoName, dxScore, grade, frictionCost, senderApiKey, senderFrom } = body;
    const apiKey = senderApiKey || process.env.SENDGRID_API_KEY;
    const fromEmail = senderFrom || process.env.EMAIL_FROM || 'reports@devmri.app';

    if (!email || !repoName) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // DEBUG: Log the current sender settings
    console.log(`📡 [SENDGRID DEBUG] Attempting dispatch: From <${fromEmail}> to <${email}>`);

    if (!apiKey || apiKey === 're_your_api_key_here' || apiKey.includes('your_sendgrid_key')) {
      console.log(`⚠️ Email Dispatch [SENDGRID MOCK MODE]:
        From: ${fromEmail}
        To: ${email}
        Subject: DX Diagnostic Report for ${repoName}
      `);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      return Response.json({
        success: true,
        message: `[MOCK] Clinical report for ${repoName} dispatched to ${email}. To enable real emails, configure SENDGRID_API_KEY in your .env.local file.`,
        dispatchId: `MOCK-${Date.now()}`,
        isMock: true
      });
    }

    // REAL DISPATCH LOGIC (SendGrid Integration)
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(apiKey);

      const msg = {
        to: email,
        from: fromEmail,
        subject: `[DevMRI] DX Diagnostic Report: ${repoName}`,
        text: `Clinical report for ${repoName} is ready. DX Score: ${dxScore} (${grade}). Monthly Friction Cost: $${frictionCost}.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 30px; border-radius: 16px; background: #ffffff; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #00e5ff; margin: 0; font-size: 24px;">DevMRI</h1>
              <p style="color: #666; font-size: 14px; margin-top: 5px;">Repository Health Diagnostic Report</p>
            </div>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Clinical Analysis for</p>
              <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold; color: #111;">${repoName}</p>
            </div>

            <div style="display: table; width: 100%; margin-bottom: 30px;">
              <div style="display: table-cell; width: 50%; padding-right: 10px;">
                <div style="background: #e0faff; border: 1px solid #00e5ff; border-radius: 10px; padding: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #0097a7; font-weight: bold;">DX SCORE</p>
                  <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: 800; color: #0097a7;">${dxScore}</p>
                </div>
              </div>
              <div style="display: table-cell; width: 50%; padding-left: 10px;">
                <div style="background: #e0faff; border: 1px solid #00e5ff; border-radius: 10px; padding: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #0097a7; font-weight: bold;">GRADE</p>
                  <p style="margin: 5px 0 0 0; font-size: 32px; font-weight: 800; color: #0097a7;">${grade}</p>
                </div>
              </div>
            </div>

            <div style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 20px 0; margin-bottom: 30px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; color: #666;">Monthly Friction Cost</span>
                <span style="font-size: 18px; font-weight: bold; color: #ef5350;">$${frictionCost.toLocaleString()}</span>
              </div>
            </div>

            <p style="font-size: 14px; line-height: 1.6; color: #555;">
              The DevMRI engine has pinpointed critical DX bottlenecks in your development lifecycle. Scan high-velocity PRs and optimize CI build times to reduce this monthly friction.
            </p>

            <div style="text-align: center; margin-top: 40px;">
              <p style="font-size: 12px; color: #999; margin: 0;">This is an automated report generated for clinical development diagnostics.</p>
              <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">&copy; 2026 DevMRI Labs</p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`✅ [SENDGRID] REAL Dispatch successful to ${email}`);

      return Response.json({
        success: true,
        message: `Clinical report for ${repoName} dispatched successfully via SendGrid!`,
        dispatchId: `SG-${Date.now()}`,
      });
    } catch (sgError: any) {
      const errorDetails = sgError.response?.body || sgError.message;
      console.error('❌ [SENDGRID ERROR]:', JSON.stringify(errorDetails, null, 2));
      return Response.json({ 
        success: false, 
        error: sgError.response?.body?.errors?.[0]?.message || 'SendGrid failed to deliver. Ensure your SG Key is valid and Sender is verified.' 
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Email dispatch error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to dispatch report',
    }, { status: 500 });
  }
}
