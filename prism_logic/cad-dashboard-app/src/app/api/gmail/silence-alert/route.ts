import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

async function getValidAccessToken(supabaseServer: any, settings: any, userId: string): Promise<string | null> {
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

    await supabaseServer.from('settings').update({
      gmailAccessToken: tokens.access_token,
      gmailTokenExpiry: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    }).eq('user_id', userId);
    
    return tokens.access_token;
  } catch (err) {
    console.error('Error refreshing token:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { messageId } = await req.json();
    if (!messageId) {
      return NextResponse.json({ error: 'Missing messageId' }, { status: 400 });
    }

    const { data } = await supabaseServer.from('settings').select('*').eq('user_id', user.id).limit(1);
    const settings = data?.[0] || {};
    const accessToken = await getValidAccessToken(supabaseServer, settings, user.id);

    if (!accessToken) {
      return NextResponse.json({ error: 'Not connected to Gmail' }, { status: 400 });
    }

    // Mark as read: POST https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}/modify
    const modifyUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`;
    const modifyRes = await fetch(modifyUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeLabelIds: ['UNREAD'],
      }),
    });

    if (!modifyRes.ok) {
      const errBody = await modifyRes.json().catch(() => ({}));
      console.error('Gmail modify failed:', errBody);
      return NextResponse.json({ error: 'Failed to modify Gmail labels' }, { status: modifyRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Silence alert error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
