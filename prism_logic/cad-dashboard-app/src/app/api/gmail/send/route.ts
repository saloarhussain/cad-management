import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

/** Returns a valid access token, refreshing it if expired */
async function getValidAccessToken(settings: any, userId: string, supabase: any): Promise<string | null> {
  const { gmailAccessToken, gmailRefreshToken, gmailTokenExpiry, gmailClientId, gmailClientSecret } = settings;

  if (!gmailAccessToken) return null;

  const isExpired = gmailTokenExpiry && Date.now() > gmailTokenExpiry - 300_000;
  if (!isExpired) return gmailAccessToken;
  if (!gmailRefreshToken || !gmailClientId || !gmailClientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: gmailRefreshToken,
        client_id: gmailClientId,
        client_secret: gmailClientSecret,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await res.json();
    if (!tokens.access_token) return null;

    await supabase.from('settings').upsert({
      user_id: userId,
      gmailAccessToken: tokens.access_token,
      gmailTokenExpiry: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    }, { onConflict: 'user_id' });

    return tokens.access_token;
  } catch (err) {
    console.error('Failed to refresh Gmail token', err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { toEmail, toName, shareLink, fileName, requirePayment, price } = body;

    if (!toEmail || !shareLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: settingsData } = await supabase.from('settings').select('*').eq('user_id', user.id).limit(1);
    const settings = settingsData?.[0] || {};
    
    const accessToken = await getValidAccessToken(settings, user.id, supabase);
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Gmail not connected', code: 'NO_GMAIL' });
    }

    const senderEmail = settings.gmailUser || user.email;

    // Construct beautiful HTML email matching CADONCE aesthetic
    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0c0a04; color: #ffffff; padding: 40px 20px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #1a1c1c; border: 1px solid rgba(75, 71, 50, 0.5); border-radius: 16px; padding: 40px 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          
          <h1 style="color: #ffe311; font-weight: 900; letter-spacing: 2px; margin-top: 0;">CADONCE</h1>
          <p style="color: #979177; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px;">Secure File Transfer</p>

          <h2 style="font-size: 22px; color: #ffffff; margin-bottom: 10px;">A file has been securely shared with you.</h2>
          
          ${toName ? `<p style="color: #cccccc; font-size: 16px;">Hello ${toName},</p>` : ''}
          <p style="color: #cccccc; font-size: 16px; line-height: 1.5;">
            You have received a secure file transfer containing:
            <br/><strong style="color: #ffffff;">${fileName || 'Shared Media'}</strong>
          </p>

          ${requirePayment && price ? `
            <div style="background-color: rgba(255, 227, 17, 0.1); border: 1px solid rgba(255, 227, 17, 0.2); border-radius: 8px; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; color: #ffe311; font-weight: bold; font-size: 14px;">This file requires a secure payment of $${price} to unlock.</p>
            </div>
          ` : ''}

          <a href="${shareLink}" style="display: inline-block; background-color: #ffe311; color: #383100; font-weight: 800; font-size: 16px; text-decoration: none; padding: 18px 40px; border-radius: 8px; margin: 30px 0; text-transform: uppercase; letter-spacing: 1px;">
            Access File Now
          </a>

          <hr style="border: 0; border-top: 1px solid rgba(75, 71, 50, 0.3); margin: 30px 0;" />
          
          <p style="color: #666666; font-size: 12px; margin: 0;">
            This link is secure and will expire in 7 days.<br/>
            Sent via CADONCE Secure Transfer.
          </p>
        </div>
      </div>
    `;

    // Construct raw MIME email
    const subject = `Secure Transfer: ${fileName || 'Shared Media'}`;
    const rawEmail = [
      `To: ${toEmail}`,
      `Subject: ${subject}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      htmlBody
    ].join('\r\n');

    // Base64Url encode
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Gmail API Error:', responseData);
      return NextResponse.json({ success: false, error: 'Failed to send email via Gmail API' }, { status: response.status });
    }

    return NextResponse.json({ success: true, messageId: responseData.id });

  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
