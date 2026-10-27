import React from 'react';
import { getUserSupportTickets } from '../actions';
import Link from 'next/link';

export default async function SupportPage() {
  const { tickets, success, error } = await getUserSupportTickets();

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans selection:bg-yellow-500/30">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 flex items-center gap-4">
            Support Center
            <span className="text-xs font-bold px-3 py-1 bg-yellow-400 text-black rounded-full tracking-widest">HELP</span>
          </h1>
          <p className="text-zinc-500 font-medium tracking-wide text-sm uppercase">Track and manage your support tickets</p>
        </div>
        <Link href="/support/new" className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-widest text-sm rounded-xl transition-all shadow-[0_0_40px_-10px_rgba(250,204,21,0.3)] hover:shadow-[0_0_60px_-15px_rgba(250,204,21,0.5)] flex items-center gap-2 w-fit">
          <span className="material-symbols-outlined text-lg">add</span>
          New Ticket
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-yellow-500">confirmation_number</span>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Your Active Tickets</h2>
          </div>

          {!success ? (
            <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm font-semibold">
              Error loading tickets: {error}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {tickets.map((ticket: any) => (
                <Link href={`/support/${ticket.id}`} key={ticket.id}>
                  <div className="group bg-black/40 border border-zinc-800 rounded-2xl p-6 hover:border-yellow-500/50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
                          ticket.status === 'open' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          ticket.status === 'answered' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {ticket.status}
                        </span>
                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
                          ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          ticket.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {ticket.priority} Priority
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">{ticket.subject}</h3>
                      <p className="text-xs text-zinc-500 font-medium tracking-wide">Opened on {new Date(ticket.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 group-hover:text-yellow-400 transition-colors">
                      <span className="text-xs font-bold uppercase tracking-widest">View Thread</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 px-4 bg-black/20 rounded-2xl border border-dashed border-zinc-800">
              <span className="material-symbols-outlined text-4xl text-zinc-600 mb-4 block">inbox</span>
              <h3 className="text-zinc-400 font-bold tracking-widest uppercase text-sm mb-2">No Tickets Found</h3>
              <p className="text-zinc-600 text-xs font-medium uppercase tracking-widest">You haven't opened any support requests yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
