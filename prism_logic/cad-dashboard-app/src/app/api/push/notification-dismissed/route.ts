import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { messageId, userId } = await req.json();
    if (!messageId || !userId) {
      return NextResponse.json({ error: 'Missing messageId or userId' }, { status: 400 });
    }

    const adminSupabase = await createAdminClient();
    
    // Fetch settings for this user
    const { data: settings, error: fetchError } = await adminSupabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError || !settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    const paymentMethods = settings.payment_methods || [];
    const systemConfig = paymentMethods.find((m: any) => m.id === 'system_config') || {};

    let notifiedEmailIds = systemConfig.notifiedEmailIds || [];
    
    // Remove the messageId from the notified list so the poller cron can alert it again
    if (notifiedEmailIds.includes(messageId)) {
      notifiedEmailIds = notifiedEmailIds.filter((id: string) => id !== messageId);
      systemConfig.notifiedEmailIds = notifiedEmailIds;
      
      if (systemConfig.lastCallTimes) {
        delete systemConfig.lastCallTimes[messageId];
      }

      const updatedMethods = [
        ...paymentMethods.filter((m: any) => m.id !== 'system_config'),
        systemConfig
      ];

      const { error: updateError } = await adminSupabase
        .from('settings')
        .update({ payment_methods: updatedMethods })
        .eq('id', settings.id);

      if (updateError) {
        throw updateError;
      }
      
      console.log(`[Dismissal] Successfully removed message ${messageId} from notified list for user ${userId}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Notification dismissed route error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
