import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transferId, method } = body;

    const supabase = await createAdminClient();

    // 1. Fetch the Transfer Record
    const { data: transfer, error } = await supabase
      .from('file_transfers')
      .select('price, uploader_id, file_name')
      .eq('id', transferId)
      .single();

    if (error || !transfer) {
      return NextResponse.json({ success: false, error: 'Transfer not found' }, { status: 404 });
    }

    if (!transfer.price || transfer.price <= 0) {
      return NextResponse.json({ success: false, error: 'Transfer is free' }, { status: 400 });
    }

    // 2. Fetch the Uploader's Custom Payment Configuration
    const { data: uploaderSettings } = await supabase
      .from('settings')
      .select('payment_methods')
      .eq('user_id', transfer.uploader_id)
      .maybeSingle();

    const paymentMethods = uploaderSettings?.payment_methods || [];

    const amountInCents = Math.round(transfer.price * 100);

    // ==========================================
    // 3A. RAZORPAY GATEWAY (Individualized Keys)
    // ==========================================
    if (method === 'razorpay') {
      // Find Razorpay credentials from uploader's settings
      const rzpMethod = paymentMethods.find((m: any) => m.type === 'Razorpay');
      
      const keyId = rzpMethod?.key_id || process.env.RAZORPAY_KEY_ID;
      const keySecret = rzpMethod?.key_secret || process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return NextResponse.json({ 
          success: false, 
          error: 'Uploader has not configured Razorpay payment credentials.' 
        }, { status: 400 });
      }

      // Initialize Razorpay with UPLOADER'S specific credentials
      const razorpayInstance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const order = await razorpayInstance.orders.create({
        amount: amountInCents,
        currency: 'USD', // Razorpay accepts international currency orders
        receipt: `receipt_transfer_${transferId}`,
        notes: {
          transferId: transferId,
          uploaderId: transfer.uploader_id,
        }
      });

      return NextResponse.json({ 
        success: true, 
        order,
        key_id: keyId // Pass uploader's public key back for dynamic checkout loading
      });
    }

    // ==========================================
    // 3B. STRIPE GATEWAY (Individualized Keys)
    // ==========================================
    if (method === 'stripe') {
      // Find Stripe credentials from uploader's settings
      const stripeMethod = paymentMethods.find((m: any) => m.type === 'Stripe');
      
      const secretKey = stripeMethod?.secret_key || process.env.STRIPE_SECRET_KEY;
      
      if (!secretKey) {
        return NextResponse.json({ 
          success: false, 
          error: 'Uploader has not configured Stripe payment credentials.' 
        }, { status: 400 });
      }

      // Initialize Stripe with UPLOADER'S secret key
      const stripeInstance = new Stripe(secretKey);

      // Create a secure Checkout Session targeting the uploader's account directly
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `CAD Download: ${transfer.file_name}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.nextUrl.origin}/transfer/${transferId}?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.nextUrl.origin}/transfer/${transferId}?canceled=true`,
        metadata: {
          transferId: transferId,
          uploaderId: transfer.uploader_id,
        }
      });

      return NextResponse.json({ 
        success: true, 
        sessionUrl: session.url 
      });
    }

    // ==========================================
    // 3C. PAYPAL GATEWAY (Individualized Keys or Direct Routing)
    // ==========================================
    if (method === 'paypal') {
      const paypalMethod = paymentMethods.find((m: any) => m.type === 'PayPal');

      // Use uploader-specific credentials if available, otherwise fallback to platform credentials
      const uploaderClientId = paypalMethod?.client_id;
      const uploaderClientSecret = paypalMethod?.client_secret;
      
      const platformClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
      const platformClientSecret = process.env.PAYPAL_CLIENT_SECRET;

      const clientId = uploaderClientId || platformClientId || 'dummy_client_id';
      const clientSecret = uploaderClientSecret || platformClientSecret || 'dummy_client_secret';
      const payeeEmail = paypalMethod?.email;

      // Defensive check for missing credentials
      if (clientId === 'dummy_client_id' || clientSecret === 'dummy_client_secret') {
        return NextResponse.json({ 
          success: false, 
          error: 'PayPal is not configured. Either the platform administrator must set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables, or the uploader must enter their own PayPal Client ID and Client Secret in Settings.' 
        }, { status: 400 });
      }

      // Determine PayPal Sandbox vs Production
      // Auto-detect live mode if custom credentials are provided, otherwise respect PAYPAL_MODE for platform defaults
      const isCustomCredentials = !!uploaderClientId;
      const isSandbox = clientId.startsWith('sb') || 
                        clientId.includes('sandbox') || 
                        (!isCustomCredentials && process.env.PAYPAL_MODE !== 'live');

      const paypalBaseUrl = isSandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

      // 1. Obtain OAuth Access Token from PayPal
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('PayPal OAuth Error:', errorText);
        throw new Error('Failed to authenticate with PayPal gateway');
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // 2. Build purchase unit with custom payee email to route funds directly to uploader's PayPal
      const purchaseUnit: any = {
        amount: {
          currency_code: 'USD',
          value: transfer.price.toFixed(2)
        },
        description: `Download lock: ${transfer.file_name}`,
        custom_id: transferId
      };

      // Direct fund routing to uploader's PayPal account email if defined
      if (payeeEmail) {
        purchaseUnit.payee = {
          email_address: payeeEmail
        };
      }

      // 3. Create Checkout Order
      const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [purchaseUnit],
          application_context: {
            brand_name: 'CADONCE File Transfer',
            user_action: 'PAY_NOW',
            return_url: `${req.nextUrl.origin}/transfer/${transferId}?success=true`,
            cancel_url: `${req.nextUrl.origin}/transfer/${transferId}?canceled=true`
          }
        })
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('PayPal Order Creation Error:', errorText);
        throw new Error('Failed to initialize PayPal transaction order');
      }

      const orderData = await orderResponse.json();
      const approvalUrl = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

      return NextResponse.json({ 
        success: true, 
        orderId: orderData.id,
        clientId: clientId,
        approvalUrl: approvalUrl
      });
    }

    return NextResponse.json({ success: false, error: 'Unsupported payment method' }, { status: 400 });

  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
