import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { createAdminClient } from '@/lib/supabaseServer';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

    // Verify Signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('Invalid Razorpay Webhook Signature');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const body = JSON.parse(rawBody);

    if (body.event === 'payment.captured') {
      const payment = body.payload.payment.entity;
      const notes = payment.notes || {};
      
      const { transferId, uploaderId } = notes;

      if (uploaderId && transferId) {
        const supabase = await createAdminClient();

        // 1. Fetch designer's razorpay account ID
        const { data: userData } = await supabase.auth.admin.getUserById(uploaderId);
        if (userData && userData.user) {
          const { data: designer } = await supabase
            .from('designers')
            .select('razorpay_account_id')
            .eq('email', userData.user.email)
            .single();

          if (designer && designer.razorpay_account_id) {
            // 2. Transfer funds using Razorpay Route
            // We transfer the entire amount minus the processing fee
            const transferAmount = payment.amount - (payment.fee || 0);
            
            try {
              await razorpay.transfers.create({
                source: payment.id,
                account: designer.razorpay_account_id,
                amount: transferAmount,
                currency: payment.currency
              } as any);
              console.log(`[Webhook] Successfully transferred funds to designer ${designer.razorpay_account_id} for transfer ${transferId}`);
            } catch (transferErr: any) {
              console.error(`[Webhook] Failed to transfer funds via Route:`, transferErr.message);
              // We don't throw here so we can still return 200 to Razorpay and avoid webhook retries.
              // A real system would queue this for retry or alert the admin.
            }
          } else {
             console.warn(`[Webhook] Uploader ${uploaderId} has no Razorpay Account ID linked. Funds are sitting in the platform account.`);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
