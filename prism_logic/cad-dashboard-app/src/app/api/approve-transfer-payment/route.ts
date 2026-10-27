import { NextRequest, NextResponse } from 'next/server';
import { resolveTransferPaymentAction } from '@/app/actions';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get('paymentId');
    const action = searchParams.get('action');

    if (!paymentId || !action) {
      return new NextResponse('Missing parameters: paymentId and action are required.', { status: 400 });
    }

    const isApprove = action === 'approve';
    const res = await resolveTransferPaymentAction(paymentId, isApprove);

    if (!res.success) {
      throw new Error(res.error || 'Failed to update payment status');
    }

    // Return a beautiful HTML confirmation page matching Cadonce aesthetics
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Verification | CADONCE</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">
      <style>
        body {
          font-family: 'Outfit', sans-serif;
          background-color: #0c0f0f;
          color: #e2e2e2;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-h: 100vh;
          height: 100vh;
          overflow: hidden;
        }
        .container {
          background: #1a1c1c;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 48px;
          text-align: center;
          max-width: 480px;
          width: 90%;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          position: relative;
        }
        .container::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, ${isApprove ? '#10b981, #059669' : '#ef4444, #b91c1c'});
          border-radius: 26px;
          z-index: -1;
          opacity: 0.15;
        }
        .icon-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${isApprove ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
          color: ${isApprove ? '#10b981' : '#ef4444'};
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .icon-circle span {
          font-size: 40px;
        }
        h1 {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.5px;
          text-transform: uppercase;
          margin: 0 0 12px 0;
          color: #fff;
        }
        p {
          font-size: 14px;
          color: #979177;
          line-height: 1.6;
          margin: 0 0 32px 0;
        }
        .close-btn {
          display: inline-block;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          padding: 16px 32px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.07);
          transform: translateY(-1px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon-circle">
          <span class="material-symbols-outlined">
            ${isApprove ? 'check_circle' : 'cancel'}
          </span>
        </div>
        <h1>Payment ${isApprove ? 'Approved' : 'Declined'}</h1>
        <p>
          The manual payment verification has been recorded successfully. 
          The buyer has been notified automatically via email to download their file watermark-free.
        </p>
        <button class="close-btn" onclick="window.close()">Close Window</button>
      </div>
    </body>
    </html>
    `;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return new NextResponse(`Error processing request: ${error.message || error}`, { status: 500 });
  }
}
