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
    console.error('Error refreshing Gmail token:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabaseServer.from('settings').select('*').eq('user_id', user.id).limit(1);
    const settings = data?.[0] || {};
    const accessToken = await getValidAccessToken(supabaseServer, settings, user.id);

    if (!accessToken) {
      return NextResponse.json({ connected: false, alerts: [] });
    }

    const { searchParams } = new URL(req.url);
    const defaultQuery = 'is:unread (from:fiverr.com OR from:upwork.com OR from:freelancer.com OR (from:binance.com "p2p") OR "new order" OR "placed an order" OR "sent you a message" OR "new inquiry")';
    let query = searchParams.get('q') || defaultQuery;
    if (!query.includes('newer_than:')) {
      query = `${query} newer_than:1d`;
    }
    const since = Number(searchParams.get('since') || '0');

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${encodeURIComponent(query)}`;
    const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!listRes.ok) return NextResponse.json({ connected: true, alerts: [] });

    const listData = await listRes.json();
    const messages = listData.messages || [];

    const alerts = await Promise.all(messages.map(async (m: any) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!detailRes.ok) return null;
        const detail = await detailRes.json();
        
        const messageTime = Number(detail.internalDate);
        if (since > 0 && !isNaN(messageTime) && messageTime < since - 300_000) {
          return null; // Exclude emails received before the poller was enabled (with a 5-minute grace period for clock skew)
        }
        
        const headers = detail.payload?.headers || [];
        const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
        const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
        
        return {
          id: m.id,
          from,
          subject,
          snippet: detail.snippet || '',
        };
      } catch {
        return null;
      }
    }));

    return NextResponse.json({
      connected: true,
      alerts: alerts.filter(Boolean),
    });
  } catch (err: any) {
    console.error('Check alerts error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
