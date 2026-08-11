import React from 'react';
import { getAllSupportTickets } from '../../actions';
import Link from 'next/link';

export default async function AdminSupportPage() {
  const { tickets, success, error } = await getAllSupportTickets();

  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-12 font-sans selection:bg-yellow-500/30">
      <div className="max-w-6xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 flex items-center gap-4 text-yellow-400">
          <span className="material-symbols-outlined text-4xl">shield</span>
          Admin Support Portal
        </h1>
        <p className="text-zinc-500 font-medium tracking-wide text-sm uppercase">God-Mode: View and manage all platform tickets</p>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Global Support Queue</h2>
          </div>

          {!success ? (
            <div className="text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-400/20 text-sm font-semibold">
              Error loading tickets: {error}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {tickets.map((ticket: any) => (
                <Link href={`/admin/support/${ticket.id}`} key={ticket.id}>
                  <div className="group bg-black/40 border border-zinc-800 rounded-2xl p-6 hover:border-yellow-500/50 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
                          ticket.status === 'open' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          ticket.status === 'answered' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {ticket.status === 'open' ? 'Needs Reply' : ticket.status}
                        </span>
                        <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md ${
                          ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          ticket.priority === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">{ticket.subject}</h3>
                      <p className="text-xs text-zinc-500 font-medium tracking-wide">
                        From: <span className="text-zinc-300">User {ticket.user_id?.substring(0, 8)}</span> • {new Date(ticket.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 group-hover:text-yellow-400 transition-colors">
                      <span className="text-xs font-bold uppercase tracking-widest">Manage Ticket</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 px-4 bg-black/20 rounded-2xl border border-dashed border-zinc-800">
              <span className="material-symbols-outlined text-4xl text-zinc-600 mb-4 block">celebration</span>
              <h3 className="text-zinc-400 font-bold tracking-widest uppercase text-sm mb-2">Inbox Zero</h3>
              <p className="text-zinc-600 text-xs font-medium uppercase tracking-widest">There are no support tickets across the platform.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
