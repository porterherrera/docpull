// Vercel Serverless Function: POST /api/notify
// Sends email notification when extraction is complete
// Called internally from the extract endpoint

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, fileName, vendor, total, confidence } = req.body;

  if (!email || !fileName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Use Resend API if configured, otherwise skip silently
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(200).json({ sent: false, reason: 'RESEND_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: 'DocPull <notifications@documentpull.com>',
        to: [email],
        subject: `Extraction complete: ${fileName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 20px;">
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="display: inline-block; background: #2563EB; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px;">
                <span style="color: white; font-weight: 700; font-size: 16px;">DocPull</span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 6px;">Extraction Complete</h1>
              <p style="color: #6B7280; font-size: 14px; margin: 0;">Your document has been processed successfully.</p>
            </div>

            <div style="background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">File</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 14px;">${fileName}</td>
                </tr>
                ${vendor ? `<tr>
                  <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Vendor</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 14px;">${vendor}</td>
                </tr>` : ''}
                ${total != null ? `<tr>
                  <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Total</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 700; font-size: 18px; color: #2563EB;">$${Number(total).toFixed(2)}</td>
                </tr>` : ''}
                ${confidence != null ? `<tr>
                  <td style="padding: 6px 0; color: #6B7280; font-size: 13px;">Confidence</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 14px; color: #16A34A;">${confidence}%</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
              <a href="https://documentpull.com" style="display: inline-block; background: #2563EB; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                View & Export Data
              </a>
            </div>

            <p style="text-align: center; color: #9CA3AF; font-size: 12px; margin: 0;">
              You received this because you extracted a document on DocPull.
            </p>
          </div>
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Email send failed:', result);
      return res.status(200).json({ sent: false, reason: result.message });
    }

    return res.status(200).json({ sent: true, id: result.id });
  } catch (error) {
    console.error('Notify error:', error);
    return res.status(200).json({ sent: false, reason: error.message });
  }
}
