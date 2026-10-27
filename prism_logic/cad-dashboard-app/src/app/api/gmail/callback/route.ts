import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cad-dashboard-app.vercel.app';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/auth/login`);
  }

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/inbox?error=gmail_auth_failed`);
  }

  // Read credentials from THIS user's settings
  const { data } = await supabase
    .from('settings')
    .select('gmailClientId, gmailClientSecret, payment_methods')
    .eq('user_id', user.id)
    .maybeSingle();

  let clientId = data?.gmailClientId;
  let clientSecret = data?.gmailClientSecret;

  // Fallback to payment_methods JSONB system_config if root columns are empty
  if ((!clientId || !clientSecret) && data?.payment_methods) {
    const config = data.payment_methods.find((m: any) => m.id === 'system_config');
    if (config) {
      if (!clientId) clientId = config.gmailClientId;
      if (!clientSecret) clientSecret = config.gmailClientSecret;
    }
  }

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${APP_URL}/inbox?error=missing_credentials`);
  }

  const redirectUri = `${APP_URL}/api/gmail/callback`;

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    console.error('Token exchange failed:', tokens);
    return NextResponse.redirect(`${APP_URL}/inbox?error=token_exchange_failed`);
  }

  // Fetch Gmail user info to get connected email
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json();

  // Store tokens in user-specific settings
  const { data: existingSettings } = await supabase
    .from('settings')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let upsertError;

  const tokenPayload = {
    user_id: user.id,
    gmailAccessToken: tokens.access_token,
    gmailRefreshToken: tokens.refresh_token || null,
    gmailTokenExpiry: tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : null,
    gmailUser: userInfo.email || undefined,
  };

  if (existingSettings) {
    // Update existing row using primary key ID
    console.log('[Callback] Updating existing settings row ID:', existingSettings.id);
    const { error } = await supabase
      .from('settings')
      .update(tokenPayload)
      .eq('id', existingSettings.id);
    upsertError = error;
  } else {
    // Insert new row (fallback manual sequence increment)
    console.log('[Callback] Creating new settings row for user:', user.id);
    const { data: maxRow } = await supabase
      .from('settings')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);
    
    const nextId = (maxRow?.[0]?.id || 0) + 1;
    const { error } = await supabase
      .from('settings')
      .insert({ ...tokenPayload, id: nextId });
    upsertError = error;
  }

  if (upsertError) {
    console.error('Failed to store tokens:', upsertError);
    return NextResponse.redirect(`${APP_URL}/inbox?error=storage_failed`);
  }

  return NextResponse.redirect(`${APP_URL}/inbox?connected=true`);
}
