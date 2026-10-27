import React from 'react';
import { getSupportTicketDetails, addSupportReply, closeSupportTicket } from '../../actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function TicketDetailsPage({ params }: { params: { id: string } }) {
  const { ticket, replies, success } = await getSupportTicketDetails(params.id);

  if (!success || !ticket) {
    redirect('/support');
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans selection:bg-yellow-500/30">
      <div className="max-w-4xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/support" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Tickets
          </Link>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg ${
              ticket.status === 'open' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
              ticket.status === 'answered' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
              'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              STATUS: {ticket.status}
            </span>
          </div>
        </div>

        {/* Original Ticket Description */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-xl mb-6">
          <h1 className="text-2xl font-black text-white mb-2">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mb-6 text-xs text-zinc-500 font-bold uppercase tracking-widest">
            <span>Opened by You on {new Date(ticket.created_at).toLocaleString()}</span>
          </div>
          <div className="text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed font-medium">
            {ticket.description}
          </div>
        </div>

        {/* Replies Timeline */}
        <div className="space-y-6 mb-8">
          {replies?.map((reply: any) => (
            <div key={reply.id} className={`flex ${reply.is_admin_reply ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl p-6 border ${
                reply.is_admin_reply 
                  ? 'bg-yellow-400/5 border-yellow-400/20 rounded-tl-sm' 
                  : 'bg-zinc-900 border-zinc-800 rounded-tr-sm'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-black uppercase tracking-widest ${reply.is_admin_reply ? 'text-yellow-400' : 'text-zinc-500'}`}>
                    {reply.is_admin_reply ? 'Cadonce Support' : 'You'}
                  </span>
                  <span className="text-[10px] text-zinc-600 font-bold">{new Date(reply.created_at).toLocaleString()}</span>
                </div>
                <div className="text-zinc-300 whitespace-pre-wrap text-sm font-medium">
                  {reply.message}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply Box */}
        {ticket.status !== 'closed' ? (
          <form action={async (formData) => { "use server"; await addSupportReply(formData); }} className="bg-black/40 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="isAdminReply" value="false" />
            <textarea 
              name="message"
              required
              rows={4}
              className="w-full bg-transparent text-white font-semibold text-sm outline-none resize-none mb-4"
              placeholder="Type your reply here..."
            />
            <div className="flex justify-end border-t border-zinc-800/50 pt-4">
              <button 
                type="submit"
                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all"
              >
                Send Reply
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <span className="material-symbols-outlined text-3xl text-zinc-600 mb-2 block">lock</span>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">This ticket is closed and cannot be replied to.</p>
          </div>
        )}
      </div>
    </div>
  );
}
