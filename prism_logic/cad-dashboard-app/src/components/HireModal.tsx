'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { submitHireProposal } from '@/app/actions';
import { useAuth } from '@/components/AuthProvider';

interface HireModalProps {
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
  initialItem?: {
    id?: string | number;
    title?: string;
  } | null;
  targetId: string;
}

export const HireModal: React.FC<HireModalProps> = ({
  isOpen,
  onClose,
  designer,
  initialItem,
  targetId
}) => {
  const { user } = useAuth();

  const [title, setTitle] = useState(
    initialItem?.title ? `Bespoke CAD: ${initialItem.title}` : ''
  );
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('500');
  const [currency, setCurrency] = useState('$');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [clientName, setClientName] = useState(user?.user_metadata?.full_name || '');
  const [clientEmail, setClientEmail] = useState(user?.email || '');
  const [clientPhone, setClientPhone] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{ projectId?: string; designerName?: string } | null>(null);

  if (!isOpen) return null;

  const designerDisplayName = designer?.fullName || designer?.organizationName || 'Designer';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please specify a project title or concept.');
      return;
    }
    if (!description.trim() && !message.trim()) {
      setErrorMsg('Please describe your design requirements or project brief.');
      return;
    }
    if (!clientName.trim()) {
      setErrorMsg('Please provide your name.');
      return;
    }
    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      setErrorMsg('Please provide a valid contact email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitHireProposal({
        targetId: designer?.id || designer?.userId || designer?.username || targetId,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
        title: title.trim(),
        description: (description.trim() || message.trim()),
        budget: budget.trim() || '0',
        currency,
        deadlineDate: deadlineDate || undefined,
        message: message.trim() || undefined,
        portfolioItemId: initialItem?.id ? String(initialItem.id) : undefined,
        portfolioItemTitle: initialItem?.title || undefined
      });

      if (res.success) {
        setSuccessData({
          projectId: res.projectId,
          designerName: res.designerName || designerDisplayName
        });
      } else {
        setErrorMsg(res.error || 'Failed to submit proposal. Please try again.');
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
      <div className="relative w-full max-w-xl bg-[#14161E] border border-[#282D3C] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-10 my-auto animate-in zoom-in-95 duration-200 text-left">
        
        {/* Header Ribbon */}
        <div className="px-6 py-5 border-b border-[#282D3C] bg-gradient-to-r from-[#1E2314] via-[#14161E] to-[#14161E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d9ee3c]/20 border border-[#d9ee3c]/40 flex items-center justify-center text-[#d9ee3c] shrink-0">
              <span className="material-symbols-outlined text-xl">bolt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider">
                  Commission &amp; Hire Proposal
                </h2>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#d9ee3c] text-[#1a1e00]">
                  DIRECT
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Propose a CAD project to <span className="text-zinc-200 font-semibold">{designerDisplayName}</span>
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
            <div className="w-16 h-16 rounded-2xl bg-[#d9ee3c]/20 border border-[#d9ee3c]/50 flex items-center justify-center text-[#d9ee3c] mb-5 shadow-[0_0_30px_rgba(217,238,60,0.3)] animate-in zoom-in duration-300">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>

            <h3 className="text-xl font-extrabold text-white uppercase tracking-tight mb-2">
              Proposal &amp; Direct Message Sent!
            </h3>
            <p className="text-sm text-zinc-300 max-w-md leading-relaxed mb-6">
              <strong className="text-[#d9ee3c]">{successData.designerName}</strong> has been notified via real-time alert and email, and received your direct workspace message.
            </p>

            <div className="w-full bg-[#1A1E28] border border-[#282D3C] rounded-xl p-4 text-xs text-zinc-400 mb-6 space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Project</span>
                <span className="text-white font-semibold truncate max-w-[200px]">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Budget</span>
                <span className="text-[#d9ee3c] font-bold">{currency} {budget}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Status</span>
                <span className="text-emerald-400 font-bold uppercase text-[10px]">Delivered to Designer</span>
              </div>
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <Link
                href="/inbox"
                className="flex-1 py-3 px-4 rounded-xl bg-[#d9ee3c] text-[#1a1e00] font-bold text-xs uppercase tracking-wider transition-all duration-200 hover:brightness-110 flex items-center justify-center gap-2"
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

            {initialItem?.title && (
              <div className="p-3 rounded-xl bg-[#1A1E28] border border-[#282D3C] flex items-center justify-between text-xs">
                <span className="text-zinc-400">Referencing Showcase Item:</span>
                <span className="text-[#d9ee3c] font-bold">{initialItem.title}</span>
              </div>
            )}

            {/* Project Title */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Project Title / Concept <span className="text-[#d9ee3c]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Custom Platinum Emerald Ring CAD"
                className="w-full h-11 px-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d9ee3c] focus:ring-1 focus:ring-[#d9ee3c] transition-all"
              />
            </div>

            {/* Budget & Timeline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Target Budget
                </label>
                <div className="flex gap-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-20 h-11 px-2.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white focus:outline-none focus:border-[#d9ee3c]"
                  >
                    <option value="$">$ (USD)</option>
                    <option value="€">€ (EUR)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="₹">₹ (INR)</option>
                    <option value="CHF">CHF</option>
                    <option value="A$">A$ (AUD)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="500"
                    className="flex-1 h-11 px-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d9ee3c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Target Delivery Date
                </label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-sm text-white focus:outline-none focus:border-[#d9ee3c] [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Project Specifications / Brief */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Technical Brief / Specifications <span className="text-[#d9ee3c]">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify dimensions, tolerances, gemstone layout, metal type, output format (.3dm, .stl, .step), or manufacturing constraints..."
                className="w-full p-3.5 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-xs sm:text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d9ee3c] focus:ring-1 focus:ring-[#d9ee3c] transition-all resize-none"
              />
            </div>

            {/* Direct Note to Designer */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Direct Message Note (Optional)
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personalized greeting, reference links, or questions directly to the designer..."
                className="w-full p-3 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d9ee3c] transition-all resize-none"
              />
            </div>

            {/* Contact Details */}
            <div className="pt-2 border-t border-[#282D3C]/60 space-y-3">
              <span className="block text-[10px] font-black uppercase tracking-wider text-[#d9ee3c]">
                Your Contact Information (for direct reply)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Your Name <span className="text-[#d9ee3c]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. David Miller"
                    className="w-full h-10 px-3 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d9ee3c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                    Your Email <span className="text-[#d9ee3c]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="e.g. client@studio.com"
                    className="w-full h-10 px-3 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d9ee3c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  Phone / WhatsApp (Optional)
                </label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-10 px-3 bg-[#0D0E12] border border-[#282D3C] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#d9ee3c]"
                />
              </div>
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
                className="flex-2 py-3 px-6 rounded-xl bg-[#d9ee3c] text-[#1a1e00] font-extrabold text-xs uppercase tracking-wider hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(217,238,60,0.35)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#1a1e00] border-t-transparent rounded-full animate-spin" />
                    <span>Notifying Designer...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">bolt</span>
                    <span>Submit Proposal &amp; Direct Message</span>
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
