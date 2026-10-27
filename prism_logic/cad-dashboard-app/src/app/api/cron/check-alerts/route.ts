import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import twilio from 'twilio';

// Force node runtime for IMAP tcp connections
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute max

export async function GET(req: Request) {
  // Optional: Verify Vercel Cron header for security
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminSupabase = await createAdminClient();

    // 1. Fetch all users who have configured freelance integrations
    const { data: usersSettings, error } = await adminSupabase
      .from('settings')
      .select('*');

    if (error) throw error;

    let processedCount = 0;
    let callTriggeredCount = 0;

    for (const userConfig of usersSettings) {
      if (!userConfig.payment_methods) continue;

      // Extract system_config
      const config = userConfig.payment_methods.find((m: any) => m.id === 'system_config');
      if (!config) continue;

      const {
        freelanceEmail,
        freelanceAppPassword,
        twilioPhoneTo,
      } = config;

      // Ensure they have credentials
      if (!freelanceEmail || !freelanceAppPassword || !twilioPhoneTo) continue;

      processedCount++;

      // 2. Connect to IMAP
      const imapConfig = {
        imap: {
          user: freelanceEmail,
          password: freelanceAppPassword,
          host: 'imap.gmail.com', // Defaulting to Gmail as it's standard for App Passwords
          port: 993,
          tls: true,
          authTimeout: 10000,
          tlsOptions: { rejectUnauthorized: false }
        }
      };

      try {
        const connection = await imaps.connect(imapConfig);
        await connection.openBox('INBOX');

        // Search for UNSEEN emails from Fiverr or Upwork
        // The search criteria: UNSEEN and FROM either fiverr or upwork
        const searchCriteria = [
          'UNSEEN',
          ['OR', ['FROM', 'fiverr.com'], ['FROM', 'upwork.com']],
          ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000).toUTCString()]
        ];

        const fetchOptions = {
          bodies: ['HEADER', 'TEXT'],
          markSeen: true // Critical: Mark as read so we don't trigger again
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
          // Additional JS filtering to ensure it's strictly within the last 24 hours
          // because IMAP SINCE is sometimes limited to day resolution
          const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
          
          let validRecentAlerts = 0;
          for (const msg of messages) {
            const headerPart = msg.parts.find((part: any) => part.which === 'HEADER');
            if (headerPart && headerPart.body && headerPart.body.date) {
              const emailDate = new Date(headerPart.body.date[0]).getTime();
              if (emailDate >= twentyFourHoursAgo) {
                validRecentAlerts++;
              }
            } else {
              // Fallback if no date header, count it as valid
              validRecentAlerts++;
            }
          }

          if (validRecentAlerts > 0) {
            console.log(`[Alerts] Found ${validRecentAlerts} recent unread alerts for ${freelanceEmail}`);

            // 3. Trigger Twilio Call
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            
            try {
              await client.calls.create({
                twiml: '<Response><Say voice="Polly.Matthew-Neural">Hello! You have a new freelance notification on Cadonce. Please check your inbox immediately.</Say></Response>',
                to: twilioPhoneTo,
                from: process.env.TWILIO_PHONE_NUMBER
              });
              callTriggeredCount++;
              console.log(`[Alerts] Successfully triggered call to ${twilioPhoneTo}`);
            } catch (twilioErr: any) {
              console.error(`[Alerts] Twilio Call Failed for ${twilioPhoneTo}:`, twilioErr.message);
            }
          } else {
            console.warn('[Alerts] Twilio Environment Variables are missing.');
          }
        }
        } // Closed if (messages.length > 0)

        connection.end();
      } catch (imapErr: any) {
        console.error(`[Alerts] IMAP Connection Failed for ${freelanceEmail}:`, imapErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      processedUsers: processedCount,
      callsTriggered: callTriggeredCount,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('[Alerts] Engine Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
