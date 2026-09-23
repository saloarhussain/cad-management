"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import AuthGuard from '@/components/AuthGuard';
import { getDesignerPortfolio } from '@/app/actions';

export default function DesignerPortfolio() {
  const [projects, setProjects] = useState<any[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, isDesigner } = useAuth();
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await getDesignerPortfolio();
        setProjects(res.projects || []);
        setPortfolioItems(res.portfolioItems || []);
        setUsername(res.username || null);
      } catch (err) {
        console.error('Failed to load portfolio data', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const totalRevisions = useMemo(() => {
    return projects.reduce((sum, p) => sum + (p.revisions?.length || 0), 0);
  }, [projects]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a04] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased pb-32 relative overflow-x-hidden">
        {/* Ambient Glow Orbs */}
        <div className="pointer-events-none absolute -top-40 right-1/4 w-96 h-96 bg-[#d9ee3c]/5 rounded-full blur-3xl"></div>
        <div className="pointer-events-none absolute top-1/2 left-10 w-80 h-80 bg-[#ffb955]/5 rounded-full blur-3xl"></div>

        {/* Global Notification */}
        {notification && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 backdrop-blur-md ${
            notification.type === 'success' ? 'bg-[#14161E]/95 border-[#4ffeb9]/30 text-[#4ffeb9]' : 'bg-[#14161E]/95 border-red-500/30 text-red-400'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="text-[10px] font-black uppercase tracking-widest">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        )}

        <main className="w-full px-4 sm:px-8 xl:px-12 pt-24 max-w-[1720px] mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div>
              <Link href={isDesigner ? "/designer" : "/"} className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1 hover:text-[#d9ee3c] transition-colors mb-3">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to Dashboard
              </Link>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-tight">My Portfolio</h1>
              <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Showcase your work and performance</p>
            </div>
            
            <button
              onClick={async () => {
                try {
                  const publicUrl = `${window.location.origin}/portfolio/${username || user?.id}`;
                  await navigator.clipboard.writeText(publicUrl);
                  setNotification({ message: 'Portfolio link copied to clipboard! 🔗', type: 'success' });
                } catch {
                  setNotification({ message: 'Failed to copy link.', type: 'error' });
                }
                setTimeout(() => setNotification(null), 5000);
              }}
              className="px-5 py-2.5 bg-[#14161E] border border-[#282D3C] rounded-xl text-[10px] font-bold text-white uppercase tracking-widest hover:border-zinc-400 active:scale-95 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl group"
            >
              <span className="material-symbols-outlined text-sm group-hover:text-[#d9ee3c] transition-colors">share</span>
              Share Profile
            </button>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
            <div className="bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-2xl p-6 hover:border-[#d9ee3c]/40 transition-all group shadow-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Completed Projects</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-white">{projects.length}</span>
                <span className="material-symbols-outlined text-[#d9ee3c] opacity-50 group-hover:opacity-100 transition-opacity">task_alt</span>
              </div>
            </div>
            
            <div className="bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-2xl p-6 hover:border-[#4ffeb9]/40 transition-all group shadow-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Total Revisions Handled</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-white">{totalRevisions}</span>
                <span className="material-symbols-outlined text-[#4ffeb9] opacity-50 group-hover:opacity-100 transition-opacity">published_with_changes</span>
              </div>
            </div>

            <div className="bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-2xl p-6 hover:border-[#ffb955]/40 transition-all group shadow-xl">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block">Avg. Client Rating</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-white">4.8</span>
                <span className="material-symbols-outlined text-[#ffb955] opacity-50 group-hover:opacity-100 transition-opacity">star</span>
              </div>
            </div>
          </div>

          {/* Custom Portfolio Items */}
          <section className="mb-12 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d9ee3c]">imagesmode</span>
                Featured Work
              </h2>
              <Link href="/portfolio/edit/new" className="px-4 py-2 bg-[#d9ee3c] text-[#1a1e00] font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-[0_0_15px_rgba(217,238,60,0.3)] hover:shadow-[0_0_20px_rgba(217,238,60,0.5)] active:scale-95 transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">add</span>
                Add Item
              </Link>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="bg-[#14161E]/50 border border-[#282D3C] border-dashed rounded-3xl p-12 text-center backdrop-blur-sm">
                <span className="material-symbols-outlined text-zinc-600 text-4xl mb-4">image_not_supported</span>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">No custom work uploaded yet</p>
                <p className="text-[10px] text-zinc-500 mt-2 font-medium">Upload renders of your best designs to impress clients and organizations.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {portfolioItems.map(item => (
                  <div key={item.id} className="bg-[#14161E] border border-[#282D3C] rounded-2xl overflow-hidden group hover:border-zinc-500 transition-all shadow-lg hover:shadow-2xl flex flex-col cursor-pointer">
                    <div className="aspect-square bg-[#08090C] overflow-hidden relative border-b border-[#282D3C]">
                      <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&auto=format&fit=crop&q=60'} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out" alt={item.title} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#08090C]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <span className="px-2 py-1 rounded bg-[#d9ee3c] text-[#1a1e00] text-[9px] font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(217,238,60,0.4)]">
                          View details
                        </span>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-white uppercase tracking-tight line-clamp-1">{item.title}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="px-1.5 py-0.5 rounded-sm bg-[#1E222D] border border-[#282D3C] text-zinc-400 text-[8px] font-bold uppercase tracking-widest shrink-0">
                            [CATEGORY] {item.category || 'JEWELLERY CAD'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Past Platform Projects */}
          <section className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4ffeb9]">history</span>
                Platform History
              </h2>
              <span className="text-[10px] font-bold text-zinc-500 uppercase">{projects.length} Projects</span>
            </div>

            <div className="bg-[#14161E] border border-[#282D3C] rounded-2xl overflow-hidden shadow-xl">
              {projects.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No completed projects on the platform yet</p>
                </div>
              ) : (
                <div className="divide-y divide-[#282D3C]">
                  {projects.map(project => (
                    <div key={project.id} className="p-4 sm:p-5 hover:bg-[#1E222D] transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#08090C] border border-[#282D3C] overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                          <img src={project.images?.split(',')[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-white uppercase tracking-tight truncate">{project.title}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">#{project.orderId}</p>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-bold text-zinc-300">{project.revisions?.length || 0} Revisions</p>
                        <p className="text-[9px] font-extrabold text-[#4ffeb9] uppercase mt-1">Completed</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
