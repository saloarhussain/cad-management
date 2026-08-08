import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@/lib/supabaseServer';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, contact, bankAccount } = body;

    // 1. Create a Customer in Razorpay (instead of Contact for standard SDK)
    const customerPayload = {
      name: name || user.user_metadata?.full_name,
      email: email || user.email,
      contact: contact || '',
    };

    const razorpayCustomer = await razorpay.customers.create(customerPayload as any);

    if (!razorpayCustomer || !razorpayCustomer.id) {
      throw new Error('Failed to create Razorpay Customer');
    }

    // 2. Create a Fund Account (Bank Account) for the Customer
    const fundAccountPayload = {
      customer_id: razorpayCustomer.id,
      account_type: 'bank_account',
      bank_account: {
        name: bankAccount.name,
        ifsc: bankAccount.ifsc,
        account_number: bankAccount.account_number,
      },
    };

    const fundAccount = await razorpay.fundAccount.create(fundAccountPayload as any);

    if (!fundAccount || !fundAccount.id) {
      throw new Error('Failed to create Razorpay Fund Account');
    }

    // 3. Save the fund account ID (razorpay_account_id) to the designer's profile in Supabase
    // We update the designers table where user_id = user.id
    const { error: dbError } = await supabase
      .from('designers')
      .update({ razorpay_account_id: fundAccount.id })
      .eq('email', user.email);

    if (dbError) {
      console.error('Error saving razorpay_account_id:', dbError);
      throw new Error('Saved in Razorpay, but failed to link to your profile.');
    }

    return NextResponse.json({ success: true, razorpay_account_id: fundAccount.id });
  } catch (error: any) {
    console.error('Razorpay Onboarding Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
