'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sendDirectMessageAction } from '@/app/actions';
import { useAuth } from '@/components/AuthProvider';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  designer: {
    id?: string;
    userId?: string;
    fullName?: string;
    organizationName?: string;
    avatarUrl?: string;
    username?: string;
    email?: string;
  } | null;
  targetId: string;
}

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  onClose,
  designer,
  targetId
}) => {
  const { user } = useAuth();

  const [senderName, setSenderName] = useState(user?.user_metadata?.full_name || '');
  const [senderEmail, setSenderEmail] = useState(user?.email || '');
  const [senderPhone, setSenderPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{ threadId?: string; designerName?: string } | null>(null);

  if (!isOpen) return null;

  const designerDisplayName = designer?.fullName || designer?.organizationName || 'Designer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!senderName.trim()) {
      setErrorMsg('Please provide your name.');
      return;
    }
    if (!senderEmail.trim() || !senderEmail.includes('@')) {
      setErrorMsg('Please provide a valid contact email.');
      return;
    }
    if (!message.trim()) {
      setErrorMsg('Please enter your message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendDirectMessageAction({
        targetId: designer?.id || designer?.userId || designer?.username || targetId,
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim(),
        senderPhone: senderPhone.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim()
      });

      if (res.success) {
        setSuccessData({
          threadId: res.threadId,
          designerName: res.designerName || designerDisplayName
        });
      } else {
        setErrorMsg(res.error || 'Failed to send message. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'A network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#14161E] border border-[#282D3C] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 my-auto animate-in zoom-in-95 duration-200 text-left">
        
        {/* Header Ribbon */}
        <div className="px-6 py-5 border-b border-[#282D3C] bg-gradient-to-r from-[#0d1a24] via-[#14161E] to-[#14161E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <span className="material-symbols-outlined text-xl">mail</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
                  Direct Message
                </h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  STUDIO LINE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Send a private note to <span className="text-zinc-200 font-semibold">{designerDisplayName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Success View */}
        {successData ? (
          <div className="p-8 sm:p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-400 mb-5 shadow-[0_0_30px_rgba(56,189,248,0.3)] animate-in zoom-in duration-300">
              <span className="material-symbols-outlined text-3xl">mark_email_read</span>
            </div>

            <h3 className="text-xl font-extrabold text-white uppercase tracking-tight mb-2">
              Message Delivered!
            </h3>
            <p className="text-sm text-zinc-300 max-w-md leading-relaxed mb-6">
              <strong className="text-sky-400">{successData.designerName}</strong> has received your direct message, an in-app workspace notification, and an email alert.
            </p>

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <Link
                href="/inbox"
                className="flex-1 py-3 px-4 rounded-xl bg-sky-500 text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,189,248,0.3)]"
              >
                <span className="material-symbols-outlined text-base">forum</span>
                <span>Open Message Hub</span>
              </Link>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-zinc-500 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Close &amp; Keep Browsing
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sender Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Your Name <span className="text-sky-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Elena Vance"
                  className="w-full h-11 px-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Your Email <span className="text-sky-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="e.g. elena@company.com"
                  className="w-full h-11 px-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
                />
              </div>
            </div>

            {/* Phone & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="text"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-11 px-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. CAD collaboration inquiry"
                  className="w-full h-11 px-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 transition-all"
                />
              </div>
            </div>

            {/* Message Content */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Message <span className="text-sky-400">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your direct message to the designer..."
                className="w-full p-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="pt-3 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-[#1E222D] border border-[#282D3C] text-zinc-300 font-semibold text-xs hover:border-zinc-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-3 px-6 rounded-xl bg-sky-500 text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(56,189,248,0.35)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">send</span>
                    <span>Send Direct Message</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
