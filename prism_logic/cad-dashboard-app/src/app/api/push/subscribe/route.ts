import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subscription } = await req.json();
    if (!subscription) {
      return NextResponse.json({ error: 'Missing subscription payload' }, { status: 400 });
    }

    const adminSupabase = await createAdminClient();

    // Fetch existing settings
    const { data: settings } = await adminSupabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings) {
      return NextResponse.json({ error: 'Settings record not found' }, { status: 404 });
    }

    const paymentMethods = settings.payment_methods || [];
    let systemConfig = paymentMethods.find((m: any) => m.id === 'system_config') || {
      id: 'system_config',
      type: 'INTERNAL_CONFIG',
    };

    // Store push subscription in the system config virtual block
    systemConfig.pushSubscription = subscription;

    const enrichedMethods = [
      ...paymentMethods.filter((m: any) => m.id !== 'system_config'),
      systemConfig
    ];

    const { error: updateError } = await adminSupabase
      .from('settings')
      .update({ payment_methods: enrichedMethods })
      .eq('id', settings.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Push subscription save error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = await createAdminClient();

    // Fetch existing settings
    const { data: settings } = await adminSupabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings) {
      return NextResponse.json({ error: 'Settings record not found' }, { status: 404 });
    }

    const paymentMethods = settings.payment_methods || [];
    let systemConfig = paymentMethods.find((m: any) => m.id === 'system_config');

    if (systemConfig) {
      delete systemConfig.pushSubscription;
    }

    const enrichedMethods = [
      ...paymentMethods.filter((m: any) => m.id !== 'system_config'),
      ...(systemConfig ? [systemConfig] : [])
    ];

    const { error: updateError } = await adminSupabase
      .from('settings')
      .update({ payment_methods: enrichedMethods })
      .eq('id', settings.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Push subscription delete error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
