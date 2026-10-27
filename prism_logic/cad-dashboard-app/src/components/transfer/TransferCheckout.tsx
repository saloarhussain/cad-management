'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { submitTransferManualPaymentAction, parsePaymentScreenshot } from '@/app/actions';

interface TransferCheckoutProps {
  transferId: string;
  fileName: string;
  price: number;
  uploaderMethods?: any[];
}

export default function TransferCheckout({ transferId, fileName, price, uploaderMethods = [] }: TransferCheckoutProps) {
  // Only display payment methods that are active in the payment receiver (uploader) account
  const activeMethods = uploaderMethods.filter(m => m.type && (m.value || m.email || m.routing));

  const [selectedMethodId, setSelectedMethodId] = useState<string>(() => {
    return activeMethods[0]?.id || '';
  });

  const [showModal, setShowModal] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  
  // OCR Form States
  const [isScanning, setIsScanning] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(price);
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentTime, setPaymentTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const selectedMethod = activeMethods.find(m => m.id === selectedMethodId);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Triggered when file is uploaded, calling Gemini OCR to scan details
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScreenshotFile(file);
    setIsScanning(true);
    setErrorMsg('');

    try {
      const base64 = await fileToBase64(file);
      const res = await parsePaymentScreenshot(base64, file.type);
      if (res && res.success && res.data) {
        const d = res.data;
        if (d.transactionId) setTransactionId(d.transactionId);
        if (d.recipientName) setSenderName(d.recipientName);
        if (d.amountPaid) {
          const parsedAmt = typeof d.amountPaid === 'string' ? parseFloat(d.amountPaid.replace(/[^\d.]/g, '')) : d.amountPaid;
          if (!isNaN(parsedAmt)) setAmountPaid(parsedAmt);
        }
        if (d.date) setPaymentDate(d.date);
        if (d.time) setPaymentTime(d.time);
      }
    } catch (err: any) {
      console.warn('Gemini OCR scan failed:', err);
      // Fail silently, user can still input details manually
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!screenshotFile) {
      alert('Please upload a payment receipt screenshot.');
      return;
    }
    if (!buyerEmail || !buyerEmail.includes('@')) {
      alert('Please enter a valid email address so we can send you the unlocked download link.');
      return;
    }
    if (!selectedMethod) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const base64 = await fileToBase64(screenshotFile);
      const res = await submitTransferManualPaymentAction(
        transferId,
        buyerEmail.trim().toLowerCase(),
        selectedMethod.type,
        amountPaid,
        transactionId,
        base64,
        screenshotFile.type
      );
      if (res.success) {
        setIsSubmitted(true);
      } else {
        throw new Error(res.error || 'Failed to submit manual payment verification.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const renderMethodLogo = (type: string, active: boolean) => {
    const sizeClass = "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-white/5";
    switch (type) {
      case 'PayPal':
        return (
          <div className={`${sizeClass} bg-[#FFC439]`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-[#003087]" viewBox="0 0 16 16">
              <path d="M14.06 3.713c.12-1.071-.093-1.832-.702-2.526C12.628.356 11.312 0 9.626 0H4.734a.7.7 0 0 0-.691.59L2.005 13.509a.42.42 0 0 0 .415.486h2.756l-.202 1.28a.628.628 0 0 0 .62.726H8.14c.429 0 .793-.31.862-.731l.025-.13.48-3.043.03-.164.001-.007a.35.35 0 0 1 .348-.297h.38c1.266 0 2.425-.256 3.345-.91q.57-.403.993-1.005a4.94 4.94 0 0 0 .88-2.195c.242-1.246.13-2.356-.57-3.154a2.7 2.7 0 0 0-.76-.59l-.094-.061ZM6.543 8.82a.7.7 0 0 1 .321-.079H8.3c2.82 0 5.027-1.144 5.672-4.456l.003-.016q.326.186.548.438c.546.623.679 1.535.45 2.71-.272 1.397-.866 2.307-1.663 2.874-.802.57-1.842.815-3.043.815h-.38a.87.87 0 0 0-.863.734l-.03.164-.48 3.043-.024.13-.001.004a.35.35 0 0 1-.348.296H5.595a.106.106 0 0 1-.105-.123l.208-1.32z"/>
            </svg>
          </div>
        );
      case 'Binance':
        return (
          <div className={`${sizeClass} bg-black`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-[#F3BA2F]" viewBox="0 0 24 24">
              <path d="M11.99 0l7.35 7.35-2.72 2.72-4.63-4.64-4.64 4.64-2.71-2.72L11.99 0zm0 14.65l4.64 4.64 2.71-2.72 2.72 2.72-7.35 7.35-7.35-7.35 2.72-2.72 2.71 2.72 4.64-4.64zm-9.27-2.65l2.71 2.72L5.41 12l-2.71-2.71-2.71-2.72L0 12l2.72 0zm18.56 0l-2.72-2.71L18.56 12l-2.71 2.72 2.72 2.71L24 12l-2.72-2.65zM12 9.27l2.72 2.72L12 14.71l-2.72-2.72L12 9.27z"/>
            </svg>
          </div>
        );
      case 'Wise':
        return (
          <div className={`${sizeClass} bg-[#1e2020]`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 fill-[#9FE870]" viewBox="0 0 24 24">
              <path d="M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z"/>
            </svg>
          </div>
        );
      case 'Stripe':
        return (
          <div className={`${sizeClass} bg-[#635BFF] text-white font-black tracking-tighter text-[9px] italic uppercase`}>
            stripe
          </div>
        );
      case 'Razorpay':
        return (
          <div className={`${sizeClass} bg-blue-600 text-white font-black tracking-tighter text-[10px] italic`}>
            RZP
          </div>
        );
      case 'UPI (India)':
        return (
          <div className={`${sizeClass} bg-zinc-900 text-yellow-400`}>
            <span className="material-symbols-outlined text-lg">bolt</span>
          </div>
        );
      case 'Bank Account':
        return (
          <div className={`${sizeClass} bg-zinc-900 text-blue-400`}>
            <span className="material-symbols-outlined text-lg">account_balance</span>
          </div>
        );
      default:
        return (
          <div className={`${sizeClass} bg-zinc-900 text-[#979177]`}>
            <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
          </div>
        );
    }
  };

  const getMethodSubtitle = (type: string) => {
    switch (type) {
      case 'PayPal':
        return 'Send manually to PayPal email';
      case 'Binance':
        return 'Send manually to Binance ID / Address';
      case 'Wise':
        return 'Send manually to Wise account';
      case 'Stripe':
        return 'Transfer manually to Stripe link / ID';
      case 'Razorpay':
        return 'Send manually to Razorpay key / VPA';
      case 'UPI (India)':
        return 'BHIM, GPay, PhonePe, Paytm UPI ID';
      case 'Bank Account':
        return 'Direct bank wire or transfer';
      default:
        return 'Direct manual account settlement';
    }
  };

  return (
    <div className="w-full text-left">
      <div className="bg-[#1a1c1c] border border-[#4b4732]/30 rounded-2xl p-6 shadow-2xl mt-4">
        <h4 className="text-white font-black text-lg uppercase tracking-tight mb-1">Unlock Download</h4>
        <p className="text-[#979177] text-xs font-bold uppercase tracking-widest mb-6">Select your payment method</p>

        <div className="space-y-3 mb-6">
          {activeMethods.length === 0 ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wide text-center">
              No active payment protocols configured by uploader.
            </div>
          ) : (
            activeMethods.map((m) => {
              const isSelected = m.id === selectedMethodId;
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#ffe311]/10 border-[#ffe311] text-[#ffe311]'
                      : 'bg-[#0c0a04] border-[#4b4732]/50 text-white hover:border-[#4b4732]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={isSelected}
                    onChange={() => setSelectedMethodId(m.id)}
                    className="hidden"
                  />
                  {renderMethodLogo(m.type, isSelected)}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-left">{m.type}</div>
                    <div className="text-[10px] opacity-70 uppercase tracking-widest truncate text-left">
                      {getMethodSubtitle(m.type)}
                    </div>
                  </div>
                  {isSelected && <span className="material-symbols-outlined text-[#ffe311]">check_circle</span>}
                </label>
              );
            })
          )}
        </div>

        <button
          onClick={() => setShowModal(true)}
          disabled={activeMethods.length === 0}
          className="w-full bg-gradient-to-r from-[#ffe311] to-[#00fbfe] text-black py-4 rounded-xl text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[0_10px_30px_rgba(252,224,3,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          PAY ${price.toFixed(2)}
          <span className="material-symbols-outlined text-lg">lock_open</span>
        </button>
      </div>

      {/* Manual Payment Verification Modal */}
      {showModal && selectedMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-sm"
            onClick={() => {
              if (!submitting && !isScanning) setShowModal(false);
            }}
          ></div>

          <div className="bg-[#1a1c1c] border border-[#ffe311]/20 rounded-3xl w-full max-w-lg overflow-hidden relative z-10 shadow-2xl max-h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white uppercase tracking-wider">Manual Payment Protocol</h2>
                <p className="text-[10px] text-[#979177] font-bold uppercase tracking-widest mt-1">
                  Send directly to the uploader below
                </p>
              </div>
              <button
                type="button"
                disabled={submitting || isScanning}
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-all"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-left flex-1">
              {isSubmitted ? (
                // SUCCESS SCREEN (Pending Approval)
                <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(252,224,3,0.15)] animate-pulse">
                    <span className="material-symbols-outlined text-3xl font-black">schedule</span>
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Verification Pending</h3>
                  <p className="text-xs text-[#979177] leading-relaxed max-w-xs mx-auto">
                    Your manual payment proof has been successfully logged. 
                    The file owner has been notified via email and in-app alerts to verify the transfer.
                  </p>
                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[11px] max-w-xs mx-auto text-zinc-400">
                    We will automatically send the watermark-free download link to you at <span className="text-white font-bold">{buyerEmail}</span> once approved.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-8 py-3.5 bg-zinc-900 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                // STANDARD UPLOAD AND PREVIEW FORM
                <>
                  {/* Payment Info Card */}
                  <div className="bg-[#0c0a04] border border-[#4b4732]/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <span className="text-[10px] font-black text-[#979177] uppercase tracking-wider">
                        Total Amount Due
                      </span>
                      <span className="text-lg font-black text-white font-mono">${price.toFixed(2)} USD</span>
                    </div>

                    {/* Bank Account Specific Rendering */}
                    {selectedMethod.type === 'Bank Account' ? (
                      <div className="space-y-3.5 text-xs">
                        {selectedMethod.bankName && (
                          <div>
                            <span className="text-[9px] text-[#979177] uppercase font-black block mb-0.5">Bank Name</span>
                            <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                              <span className="text-white font-bold">{selectedMethod.bankName}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(selectedMethod.bankName, 'bankName')}
                                className="text-[#ffe311] text-[10px] hover:underline"
                              >
                                {copiedField === 'bankName' ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedMethod.holder && (
                          <div>
                            <span className="text-[9px] text-[#979177] uppercase font-black block mb-0.5">Account Holder</span>
                            <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                              <span className="text-white font-bold">{selectedMethod.holder}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(selectedMethod.holder, 'holder')}
                                className="text-[#ffe311] text-[10px] hover:underline"
                              >
                                {copiedField === 'holder' ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedMethod.value && (
                          <div>
                            <span className="text-[9px] text-[#979177] uppercase font-black block mb-0.5">Account Number</span>
                            <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                              <span className="text-white font-mono font-bold">{selectedMethod.value}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(selectedMethod.value, 'accountNumber')}
                                className="text-[#ffe311] text-[10px] hover:underline"
                              >
                                {copiedField === 'accountNumber' ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedMethod.routing && (
                          <div>
                            <span className="text-[9px] text-[#979177] uppercase font-black block mb-0.5">
                              IFSC / routing / SWIFT Code
                            </span>
                            <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg">
                              <span className="text-white font-mono font-bold">{selectedMethod.routing}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(selectedMethod.routing, 'routing')}
                                className="text-[#ffe311] text-[10px] hover:underline"
                              >
                                {copiedField === 'routing' ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Generic Single-Field Methods (PayPal, Binance, Wise, UPI, Airtm, etc.)
                      <div className="space-y-3.5 text-xs">
                        <div>
                          <span className="text-[9px] text-[#979177] uppercase font-black block mb-0.5">
                            {selectedMethod.type === 'PayPal'
                              ? 'PayPal Email'
                              : selectedMethod.type === 'Wise'
                              ? 'Wise Email/ID'
                              : selectedMethod.type === 'Binance'
                              ? 'Binance Pay ID / Address'
                              : selectedMethod.type === 'UPI (India)'
                              ? 'UPI ID'
                              : `${selectedMethod.type} ID / Address`}
                          </span>
                      <div className="flex justify-between items-center bg-white/5 px-3 py-2.5 rounded-lg">
                            <span className="text-white font-bold font-mono break-all pr-2">
                              {selectedMethod.email || selectedMethod.value}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(selectedMethod.email || selectedMethod.value, 'genericVal')}
                              className="text-[#ffe311] text-[10px] shrink-0 hover:underline"
                            >
                              {copiedField === 'genericVal' ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="p-4 bg-[#ffe311]/5 border border-[#ffe311]/10 rounded-xl">
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Please initiate a transfer of <strong className="text-white">${price.toFixed(2)} USD</strong> to the details provided above. Once done, upload your receipt screenshot below.
                    </p>
                  </div>

                  {/* Screenshot Upload Zone */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-zinc-400 uppercase tracking-widest font-black block">
                      Upload PayPal Screenshot / Receipt
                    </label>
                    <div
                      onClick={() => {
                        if (!submitting && !isScanning) fileInputRef.current?.click();
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 min-h-[140px] relative ${
                        isScanning
                          ? 'border-yellow-400/30 bg-yellow-400/5'
                          : screenshotFile
                          ? 'border-green-500/30 bg-green-500/5'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={submitting || isScanning}
                      />
                      {isScanning ? (
                        <>
                          <span className="animate-spin material-symbols-outlined text-3xl text-yellow-400">progress_activity</span>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">Scanning Receipt via Gemini AI...</p>
                            <p className="text-[9px] text-zinc-500 mt-1">Extracting invoice data...</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className={`material-symbols-outlined text-3xl ${screenshotFile ? 'text-green-400' : 'text-zinc-600'}`}>
                            {screenshotFile ? 'task_alt' : 'cloud_upload'}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {screenshotFile ? screenshotFile.name : 'Select or drag payment receipt image'}
                            </p>
                            <p className="text-[10px] text-zinc-500 mt-1">
                              {screenshotFile ? `${(screenshotFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Supported: PNG, JPG, JPEG (Max 10MB)'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* PREVIEW DETAILS (Only shown if screenshot uploaded / scanned) */}
                  {screenshotFile && !isScanning && (
                    <div className="space-y-4 p-5 bg-white/5 border border-white/5 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-white/5 text-[#00fbfe]">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <h4 className="text-[10px] font-black uppercase tracking-wider">Preview Extracted details</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] text-[#979177] uppercase font-black">Account / Sender Name</span>
                          <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            disabled={submitting}
                            placeholder="Sender Full Name"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ffe311] outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-[#979177] uppercase font-black">Transaction ID</span>
                          <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            disabled={submitting}
                            placeholder="Transaction ID / Ref"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ffe311] outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-[#979177] uppercase font-black">Amount Verified</span>
                          <input
                            type="number"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                            disabled={submitting}
                            step="0.01"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ffe311] outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-[#979177] uppercase font-black">Date &amp; Time</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={paymentDate}
                              onChange={(e) => setPaymentDate(e.target.value)}
                              disabled={submitting}
                              placeholder="YYYY-MM-DD"
                              className="flex-1 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ffe311] outline-none font-mono"
                            />
                            <input
                              type="text"
                              value={paymentTime}
                              onChange={(e) => setPaymentTime(e.target.value)}
                              disabled={submitting}
                              placeholder="HH:MM"
                              className="w-20 bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ffe311] outline-none font-mono text-center"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Required Email Input */}
                      <div className="space-y-1 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-[#ffe311] uppercase font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">mail</span>
                          Your Email Address (Required for link delivery)
                        </span>
                        <input
                          type="email"
                          value={buyerEmail}
                          onChange={(e) => setBuyerEmail(e.target.value)}
                          disabled={submitting}
                          placeholder="enter your email address..."
                          required
                          className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-[#ffe311] outline-none"
                        />
                        <p className="text-[8px] text-zinc-500 font-semibold uppercase tracking-wider pl-1 mt-1">
                          An automated mail with the watermark-free download link will be dispatched immediately once the receiver approves.
                        </p>
                      </div>
                    </div>
                  )}

                  {errorMsg && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold text-center">
                      {errorMsg}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Action Buttons */}
            {!isSubmitted && (
              <div className="p-6 border-t border-white/5 bg-[#121414] flex gap-3">
                <button
                  type="button"
                  disabled={submitting || isScanning}
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-zinc-900 border border-white/10 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || isScanning || !screenshotFile || !buyerEmail}
                  onClick={handleSubmitProof}
                  className="flex-grow-[2] py-4 bg-gradient-to-r from-[#ffe311] to-[#00fbfe] text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Confirm &amp; Unlock Download
                      <span className="material-symbols-outlined text-sm">cloud_done</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
