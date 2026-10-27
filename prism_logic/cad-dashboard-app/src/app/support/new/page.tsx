'use client';
import React, { useState } from 'react';
import { createSupportTicket } from '../../actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewSupportTicketPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createSupportTicket(formData);

    if (result.success) {
      router.push('/support');
    } else {
      setError(result.error || 'Failed to submit ticket');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto">
        <Link href="/support" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-8">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Support
        </Link>

        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Open a Support Ticket</h1>
        <p className="text-zinc-500 font-medium tracking-wide text-sm uppercase mb-10">Describe your issue in detail and our team will get back to you.</p>

        <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-xl space-y-6">
          {error && (
            <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Subject</label>
            <input 
              name="subject"
              required
              className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
              placeholder="Brief summary of the issue..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Priority Level</label>
            <select 
              name="priority"
              defaultValue="medium"
              className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Description</label>
            <textarea 
              name="description"
              required
              rows={6}
              className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all resize-none"
              placeholder="Please provide as much detail as possible..."
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(250,204,21,0.3)] hover:shadow-[0_0_60px_-15px_rgba(250,204,21,0.5)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
