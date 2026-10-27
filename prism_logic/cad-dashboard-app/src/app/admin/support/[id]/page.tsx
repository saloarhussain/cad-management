import React from 'react';
import { getSupportTicketDetails, addSupportReply, closeSupportTicket } from '../../../actions';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AdminTicketDetailsPage({ params }: { params: { id: string } }) {
  const { ticket, replies, success } = await getSupportTicketDetails(params.id);

  if (!success || !ticket) {
    redirect('/admin/support');
  }

  // Define the close action with bound ticket ID
  const closeAction = async () => {
    "use server";
    await closeSupportTicket(ticket.id);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans selection:bg-yellow-500/30">
      <div className="max-w-4xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin/support" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Global Queue
          </Link>
          <div className="flex items-center gap-3">
            {ticket.status !== 'closed' && (
              <form action={closeAction}>
                <button type="submit" className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-black uppercase tracking-widest rounded-lg border border-red-500/20 transition-colors">
                  Close Ticket
                </button>
              </form>
            )}
            <span className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg ${
              ticket.status === 'open' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
              ticket.status === 'answered' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
              'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}>
              STATUS: {ticket.status === 'open' ? 'NEEDS REPLY' : ticket.status}
            </span>
          </div>
        </div>

        {/* Original Ticket Description */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-xl mb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-black text-white">{ticket.subject}</h1>
            <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
              ticket.priority === 'urgent' ? 'bg-red-500 text-white' :
              ticket.priority === 'high' ? 'bg-orange-500 text-white' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              {ticket.priority}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-6 text-xs text-zinc-500 font-bold uppercase tracking-widest">
            <span>Opened by <span className="text-zinc-300">User {ticket.user_id?.substring(0, 8)}</span> on {new Date(ticket.created_at).toLocaleString()}</span>
          </div>
          <div className="text-zinc-300 whitespace-pre-wrap text-sm leading-relaxed font-medium">
            {ticket.description}
          </div>
        </div>

        {/* Replies Timeline */}
        <div className="space-y-6 mb-8">
          {replies?.map((reply: any) => (
            <div key={reply.id} className={`flex ${reply.is_admin_reply ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-6 border ${
                reply.is_admin_reply 
                  ? 'bg-yellow-400/5 border-yellow-400/20 rounded-tr-sm' 
                  : 'bg-zinc-900 border-zinc-800 rounded-tl-sm'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-black uppercase tracking-widest ${reply.is_admin_reply ? 'text-yellow-400' : 'text-zinc-500'}`}>
                    {reply.is_admin_reply ? 'You (Admin)' : 'User'}
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
          <form action={async (formData) => { "use server"; await addSupportReply(formData); }} className="bg-black/40 border border-yellow-500/30 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_30px_-10px_rgba(250,204,21,0.1)]">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="isAdminReply" value="true" />
            <div className="flex items-center gap-2 mb-4 text-yellow-500">
              <span className="material-symbols-outlined text-sm">shield</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Admin Reply Mode</span>
            </div>
            <textarea 
              name="message"
              required
              rows={4}
              className="w-full bg-transparent text-white font-semibold text-sm outline-none resize-none mb-4"
              placeholder="Type your official reply to the user..."
            />
            <div className="flex justify-end border-t border-zinc-800/50 pt-4">
              <button 
                type="submit"
                className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(250,204,21,0.4)]"
              >
                Send Admin Reply
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-8 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <span className="material-symbols-outlined text-3xl text-zinc-600 mb-2 block">lock</span>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Ticket Closed</p>
          </div>
        )}
      </div>
    </div>
  );
}
