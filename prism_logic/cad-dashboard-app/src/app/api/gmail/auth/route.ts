import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://cad-dashboard-app.vercel.app';

  if (!user) {
    return NextResponse.redirect(`${appUrl}/auth/login`);
  }

  // Read Client ID from Supabase settings for this logged-in user
  const { data } = await supabase
    .from('settings')
    .select('gmailClientId, payment_methods')
    .eq('user_id', user.id)
    .maybeSingle();

  let clientId = data?.gmailClientId;

  // Fallback to payment_methods JSONB system_config if root column is not populated yet
  if (!clientId && data?.payment_methods) {
    const config = data.payment_methods.find((m: any) => m.id === 'system_config');
    if (config) {
      clientId = config.gmailClientId;
    }
  }

  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/inbox?error=no_client_id`);
  }

  const redirectUri = `${appUrl}/api/gmail/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}
