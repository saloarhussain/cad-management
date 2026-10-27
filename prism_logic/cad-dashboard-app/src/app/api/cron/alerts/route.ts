import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:founder@cadonce.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function getValidAccessToken(adminSupabase: any, settings: any, userId: string): Promise<string | null> {
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

    await adminSupabase.from('settings').update({
      gmailAccessToken: tokens.access_token,
      gmailTokenExpiry: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    }).eq('user_id', userId);
    
    return tokens.access_token;
  } catch (err) {
    console.error('Error refreshing token for user:', userId, err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  // Optional security token check
  const authHeader = req.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized CRON request' }, { status: 401 });
  }

  try {
    const adminSupabase = await createAdminClient();
    const { data: allSettings, error: fetchError } = await adminSupabase
      .from('settings')
      .select('*');

    if (fetchError) {
      throw fetchError;
    }

    const results = [];

    for (const settingRecord of (allSettings || [])) {
      const paymentMethods = settingRecord.payment_methods || [];
      const systemConfig = paymentMethods.find((m: any) => m.id === 'system_config') || {};

      const alarmEnabled = systemConfig.alarmEnabled === true || systemConfig.alarmEnabled === 'true';
      const subscription = systemConfig.pushSubscription;

      if (!alarmEnabled || !subscription) {
        continue;
      }

      // Check Gmail alerts for this user!
      try {
        const accessToken = await getValidAccessToken(adminSupabase, settingRecord, settingRecord.user_id);
        if (!accessToken) {
          results.push({ userId: settingRecord.user_id, status: 'error', error: 'No valid Gmail access token' });
          continue;
        }

        let query = systemConfig.alarmQuery || 'is:unread (from:fiverr.com OR from:upwork.com OR from:freelancer.com OR (from:binance.com "p2p") OR "new order" OR "placed an order" OR "sent you a message" OR "new inquiry")';
        if (!query.includes('newer_than:')) {
          query = `${query} newer_than:1d`;
        }
        
        // Fetch unread messages
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=${encodeURIComponent(query)}`;
        const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!listRes.ok) {
          results.push({ userId: settingRecord.user_id, status: 'error', error: 'Failed to list Gmail messages' });
          continue;
        }

        const listData = await listRes.json();
        const messages = listData.messages || [];

        const lastCallTimes = systemConfig.lastCallTimes || {};
        let triggeredCount = 0;

        for (const m of messages) {
          const lastCalledAt = lastCallTimes[m.id];
          
          // Call every 2 minutes (using a robust 110,000 ms threshold to accommodate slight minute-cron drifts) as long as it remains unread in Gmail
          if (lastCalledAt && Date.now() - lastCalledAt < 110_000) {
            continue;
          }

          // Fetch message detail
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (!detailRes.ok) continue;
          const detail = await detailRes.json();

          const headers = detail.payload?.headers || [];
          const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
          const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
          const snippet = detail.snippet || '';

          // Trigger push notification!
          const payload = JSON.stringify({
            title: subject,
            body: `${from}: ${snippet}`,
            link: '/settings?tab=email',
            messageId: m.id,
            userId: settingRecord.user_id
          });

          try {
            await webpush.sendNotification(subscription, payload);
          } catch (pushErr) {
            console.error('[WebPush] Error sending background push notification:', pushErr);
          }
          
          lastCallTimes[m.id] = Date.now();
          triggeredCount++;
        }

        // Save updated notified IDs and timestamps to database if any new alerts were triggered
        if (triggeredCount > 0) {
          // Cap size of lastCallTimes to prevent unbounded growth (keep last 50 keys)
          const keys = Object.keys(lastCallTimes);
          if (keys.length > 50) {
            const keysToRemove = keys.slice(0, keys.length - 50);
            for (const k of keysToRemove) {
              delete lastCallTimes[k];
            }
          }
          
          systemConfig.lastCallTimes = lastCallTimes;
          systemConfig.notifiedEmailIds = Object.keys(lastCallTimes);

          const updatedMethods = [
            ...paymentMethods.filter((m: any) => m.id !== 'system_config'),
            systemConfig
          ];

          await adminSupabase
            .from('settings')
            .update({ payment_methods: updatedMethods })
            .eq('id', settingRecord.id);

          // 📞 Trigger Twilio Voice Call alert if keys are configured and recipient phone is set
          const twilioSid = process.env.TWILIO_ACCOUNT_SID;
          const twilioToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
          const recipientPhone = systemConfig.whatsapp || systemConfig.phone;

          if (twilioSid && twilioToken && twilioFrom && recipientPhone) {
            try {
              const authString = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
              const twiml = `
                <Response>
                  <Say voice="alice" language="en-US">
                    Alert! You have received a new high-priority message from a client on your Cad-once dashboard. Please check it immediately.
                  </Say>
                  <Pause length="1"/>
                  <Say voice="alice" language="en-US">
                    I repeat: you have a new client inquiry on Cad-once.
                  </Say>
                </Response>
              `.trim();

              const callParams = new URLSearchParams({
                To: recipientPhone,
                From: twilioFrom,
                Twiml: twiml
              });

              const callRes = await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  body: callParams.toString()
                }
              );

              if (callRes.ok) {
                console.log(`[Twilio Call] Successfully placed voice call alert to ${recipientPhone}`);
              } else {
                const errText = await callRes.text();
                console.error(`[Twilio Call] Failed to place call to ${recipientPhone}:`, errText);
              }
            } catch (callErr) {
              console.error('[Twilio Call] Exception during call initiation:', callErr);
            }
          }
        }

        results.push({ userId: settingRecord.user_id, status: 'success', triggeredCount });
      } catch (err: any) {
        console.error(`Error sweeping alerts for user ${settingRecord.user_id}:`, err);
        results.push({ userId: settingRecord.user_id, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (err: any) {
    console.error('Cron job global failure:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
