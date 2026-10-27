'use client';

import React, { useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';

interface TransferCheckoutProps {
  transferId: string;
  fileName: string;
  price: number;
  uploaderMethods?: any[];
}

export default function TransferCheckout({ transferId, fileName, price, uploaderMethods = [] }: TransferCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const hasRazorpay = uploaderMethods.some(m => m.type === 'Razorpay');
  const hasStripe = uploaderMethods.some(m => m.type === 'Stripe');
  const hasPayPal = uploaderMethods.some(m => m.type === 'PayPal');

  const [method, setMethod] = useState<'razorpay' | 'stripe' | 'paypal' | 'cadonce'>(() => {
    if (hasRazorpay) return 'razorpay';
    if (hasStripe) return 'stripe';
    if (hasPayPal) return 'paypal';
    return 'cadonce';
  });
  const router = useRouter();

  const handleCheckout = async () => {
    setLoading(true);
    try {
      if (method === 'razorpay') {
        // Create Razorpay Order
        const res = await fetch('/api/checkout-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferId, method: 'razorpay' }),
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.error || 'Failed to initialize Razorpay checkout');

        const options = {
          key: data.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use uploader's dynamic Key ID
          amount: data.order.amount,
          currency: data.order.currency,
          name: 'CADONCE',
          description: `Download: ${fileName}`,
          order_id: data.order.id,
          handler: function (response: any) {
            // On success, redirect with success=true
            router.push(`/transfer/${transferId}?success=true&payment_id=${response.razorpay_payment_id}`);
          },
          theme: {
            color: '#ffe311',
          },
        };
        const rzp1 = new (window as any).Razorpay(options);
        rzp1.open();
      } else if (method === 'stripe') {
        // Create Stripe Checkout Session
        const res = await fetch('/api/checkout-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferId, method: 'stripe' }),
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.error || 'Failed to initialize Stripe checkout');

        // Redirect buyer to Stripe's secure hosted payment page
        if (data.sessionUrl) {
          window.location.href = data.sessionUrl;
        } else {
          throw new Error('Stripe gateway did not return checkout session link.');
        }
      } else if (method === 'paypal') {
        // Create PayPal Checkout Order
        const res = await fetch('/api/checkout-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferId, method: 'paypal' }),
        });
        const data = await res.json();
        
        if (!data.success) throw new Error(data.error || 'Failed to initialize PayPal checkout');

        // Redirect buyer to PayPal's secure approval page
        if (data.approvalUrl) {
          window.location.href = data.approvalUrl;
        } else {
          throw new Error('PayPal gateway did not return approval link.');
        }
      } else if (method === 'cadonce') {
        alert('Cadonce Credits checkout coming soon!');
      }
    } catch (err: any) {
      alert('Checkout failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div className="bg-[#1a1c1c] border border-[#4b4732]/30 rounded-2xl p-6 shadow-2xl mt-4">
        <h4 className="text-white font-black text-lg uppercase tracking-tight mb-1">Unlock Download</h4>
        <p className="text-[#979177] text-xs font-bold uppercase tracking-widest mb-6">Select your payment method</p>

        <div className="space-y-3 mb-6">
          {!hasRazorpay && !hasStripe && !hasPayPal && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wide text-center">
              No active payment protocols configured by uploader.
            </div>
          )}

          {/* Razorpay Option */}
          {hasRazorpay && (
            <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${method === 'razorpay' ? 'bg-[#ffe311]/10 border-[#ffe311] text-[#ffe311]' : 'bg-[#0c0a04] border-[#4b4732]/50 text-white hover:border-[#4b4732]'}`}>
              <input type="radio" name="payment" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} className="hidden" />
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
                <span className="text-blue-600 font-black tracking-tighter text-sm italic">RZP</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">Razorpay</div>
                <div className="text-[10px] opacity-70 uppercase tracking-widest truncate">UPI, Cards, Netbanking (Best for India)</div>
              </div>
              {method === 'razorpay' && <span className="material-symbols-outlined text-[#ffe311]">check_circle</span>}
            </label>
          )}

          {/* Stripe Option */}
          {hasStripe && (
            <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${method === 'stripe' ? 'bg-[#ffe311]/10 border-[#ffe311] text-[#ffe311]' : 'bg-[#0c0a04] border-[#4b4732]/50 text-white hover:border-[#4b4732]'}`}>
              <input type="radio" name="payment" checked={method === 'stripe'} onChange={() => setMethod('stripe')} className="hidden" />
              <div className="w-10 h-10 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-black tracking-tighter text-sm italic shrink-0">
                stripe
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">Stripe</div>
                <div className="text-[10px] opacity-70 uppercase tracking-widest truncate">International Cards, Apple Pay</div>
              </div>
              {method === 'stripe' && <span className="material-symbols-outlined text-[#ffe311]">check_circle</span>}
            </label>
          )}

          {/* PayPal Option */}
          {hasPayPal && (
            <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${method === 'paypal' ? 'bg-[#ffe311]/10 border-[#ffe311] text-[#ffe311]' : 'bg-[#0c0a04] border-[#4b4732]/50 text-white hover:border-[#4b4732]'}`}>
              <input type="radio" name="payment" checked={method === 'paypal'} onChange={() => setMethod('paypal')} className="hidden" />
              <div className="w-10 h-10 rounded-lg bg-[#FFC439] flex items-center justify-center text-[#003087] font-black tracking-tighter text-xs italic shrink-0">
                PayPal
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">PayPal</div>
                <div className="text-[10px] opacity-70 uppercase tracking-widest truncate">Global Express checkout & Cards</div>
              </div>
              {method === 'paypal' && <span className="material-symbols-outlined text-[#ffe311]">check_circle</span>}
            </label>
          )}

          {/* Credits Option */}
          <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${method === 'cadonce' ? 'bg-[#ffe311]/10 border-[#ffe311] text-[#ffe311]' : 'bg-[#0c0a04] border-[#4b4732]/50 text-white hover:border-[#4b4732]'}`}>
            <input type="radio" name="payment" checked={method === 'cadonce'} onChange={() => setMethod('cadonce')} className="hidden" />
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ffe311] to-[#00fbfe] flex items-center justify-center text-black shrink-0">
              <span className="material-symbols-outlined text-xl">toll</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">Cadonce Credits</div>
              <div className="text-[10px] opacity-70 uppercase tracking-widest truncate">Zero Protocol Fees</div>
            </div>
            {method === 'cadonce' && <span className="material-symbols-outlined text-[#ffe311]">check_circle</span>}
          </label>
        </div>

        <button 
          onClick={handleCheckout}
          disabled={loading || (!hasRazorpay && !hasStripe && !hasPayPal && method !== 'cadonce')}
          className="w-full bg-gradient-to-r from-[#ffe311] to-[#00fbfe] text-black py-4 rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[0_10px_30px_rgba(252,224,3,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-spin material-symbols-outlined">progress_activity</span>
          ) : (
            <>
              PAY ${price.toFixed(2)}
              <span className="material-symbols-outlined text-lg">lock_open</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
