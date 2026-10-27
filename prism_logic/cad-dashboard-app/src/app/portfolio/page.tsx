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
          
          {/* Bento Header & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16 relative z-10">
            
            {/* Big Welcome / Actions Card (Spans 8 cols) */}
            <div className="lg:col-span-8 bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col justify-between group">
              {/* Animated gradient background element */}
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#d9ee3c]/10 rounded-full blur-3xl group-hover:bg-[#d9ee3c]/20 transition-all duration-700 pointer-events-none"></div>
              
              <div className="relative z-10">
                <Link href={isDesigner ? "/designer" : "/"} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-[#d9ee3c] hover:bg-white/10 transition-colors mb-8">
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  Dashboard
                </Link>
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-white uppercase tracking-tight mb-4 leading-none drop-shadow-lg">
                  My Portfolio
                </h1>
                <p className="text-sm sm:text-base text-zinc-400 font-medium max-w-lg leading-relaxed">
                  Showcase your best parametric designs, track your platform history, and share your public profile with organizations and clients.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-12 relative z-10">
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
                  className="px-6 py-4 bg-white text-black rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-[#d9ee3c] active:scale-95 transition-all flex items-center gap-2 shadow-[0_10px_30px_rgba(255,255,255,0.15)] group/btn"
                >
                  <span className="material-symbols-outlined text-base group-hover/btn:rotate-12 transition-transform">share</span>
                  Share Profile
                </button>
                <Link href="/portfolio/new" className="px-6 py-4 bg-[#1E222D] border border-[#282D3C] text-white rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:border-zinc-400 hover:bg-[#2A2E3A] active:scale-95 transition-all flex items-center gap-2 group/btn">
                  <span className="material-symbols-outlined text-base group-hover/btn:scale-125 transition-transform">add</span>
                  Add New Item
                </Link>
              </div>
            </div>

            {/* Stats Column (Spans 4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              <div className="flex-1 bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[32px] p-8 hover:border-[#d9ee3c]/40 transition-all group relative overflow-hidden flex flex-col justify-center shadow-xl">
                <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl text-[#d9ee3c]/5 group-hover:text-[#d9ee3c]/10 transition-colors pointer-events-none transform -rotate-12">task_alt</span>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3 block relative z-10">Completed Projects</span>
                <div className="flex items-end gap-3 relative z-10">
                  <span className="text-6xl font-black text-white leading-none tracking-tighter">{projects.length}</span>
                  <span className="text-sm font-bold text-[#d9ee3c] mb-1.5 uppercase tracking-widest">Total</span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-6">
                <div className="bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[24px] p-6 sm:p-8 hover:border-[#4ffeb9]/40 transition-all group flex flex-col justify-center shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#4ffeb9]/5 rounded-bl-full blur-xl pointer-events-none group-hover:bg-[#4ffeb9]/10 transition-colors"></div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block line-clamp-1">Revisions</span>
                  <span className="text-4xl font-black text-white tracking-tighter">{totalRevisions}</span>
                </div>
                <div className="bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[24px] p-6 sm:p-8 hover:border-[#ffb955]/40 transition-all group flex flex-col justify-center shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffb955]/5 rounded-bl-full blur-xl pointer-events-none group-hover:bg-[#ffb955]/10 transition-colors"></div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2 block line-clamp-1">Rating</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-4xl font-black text-white tracking-tighter">4.8</span>
                    <span className="material-symbols-outlined text-lg text-[#ffb955] drop-shadow-[0_0_10px_rgba(255,185,85,0.4)]">star</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Custom Portfolio Items - Masonry Layout */}
          <section className="mb-24 relative z-10">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#282D3C]">
              <h2 className="text-lg font-extrabold text-white uppercase tracking-widest flex items-center gap-3">
                <span className="material-symbols-outlined text-[#d9ee3c] text-2xl drop-shadow-[0_0_15px_rgba(217,238,60,0.4)]">grid_view</span>
                Featured Work
              </h2>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="bg-[#14161E]/40 border border-[#282D3C] border-dashed rounded-[32px] p-16 text-center backdrop-blur-sm">
                <div className="w-20 h-20 bg-[#08090C] rounded-2xl border border-[#282D3C] flex items-center justify-center mx-auto mb-6 shadow-inner transform -rotate-6">
                  <span className="material-symbols-outlined text-zinc-500 text-4xl">image_not_supported</span>
                </div>
                <p className="text-sm font-extrabold text-white uppercase tracking-widest mb-2">No custom work uploaded</p>
                <p className="text-xs text-zinc-400 font-medium max-w-sm mx-auto leading-relaxed">Upload beautiful renders of your best designs to populate your public portfolio.</p>
                <Link href="/portfolio/new" className="inline-flex mt-8 px-6 py-3.5 bg-[#d9ee3c] text-[#1a1e00] rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-[#e4fa3c] active:scale-95 transition-all shadow-[0_0_25px_rgba(217,238,60,0.3)]">
                  Add First Item
                </Link>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {portfolioItems.map(item => (
                  <div key={item.id} className="break-inside-avoid relative group rounded-[24px] overflow-hidden bg-[#08090C] border border-[#282D3C] cursor-pointer shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:border-zinc-500 transition-all duration-500">
                    <img 
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&auto=format&fit=crop&q=60'} 
                      className="w-full h-auto object-cover group-hover:scale-105 group-hover:opacity-40 transition-all duration-700 ease-out" 
                      alt={item.title} 
                      loading="lazy"
                    />
                    
                    {/* Hover Reveal Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 bg-gradient-to-t from-[#08090C] via-[#08090C]/80 to-transparent pointer-events-none">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-md bg-[#d9ee3c]/20 border border-[#d9ee3c]/30 text-[#d9ee3c] text-[9px] font-extrabold uppercase tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(217,238,60,0.2)]">
                          {item.category || 'JEWELLERY CAD'}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-white uppercase tracking-tight leading-tight">{item.title}</h3>
                      {item.description && (
                        <p className="text-[11px] text-zinc-300 font-medium mt-2 line-clamp-3 leading-relaxed">{item.description}</p>
                      )}
                      
                      <div className="pointer-events-auto">
                        <Link href={`/portfolio/edit/${item.id}`} className="mt-5 px-5 py-3 bg-white text-black rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-[#d9ee3c] transition-colors w-fit flex items-center gap-2 shadow-lg">
                          Edit Item
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Platform History Timeline */}
          <section className="relative z-10">
            <div className="flex items-center justify-between mb-10 pb-4 border-b border-[#282D3C]">
              <h2 className="text-lg font-extrabold text-white uppercase tracking-widest flex items-center gap-3">
                <span className="material-symbols-outlined text-[#4ffeb9] text-2xl drop-shadow-[0_0_15px_rgba(79,254,185,0.4)]">history</span>
                Platform History
              </h2>
              <span className="px-4 py-1.5 rounded-full bg-[#1E222D] border border-[#282D3C] text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">{projects.length} Total</span>
            </div>

            {projects.length === 0 ? (
              <div className="py-16 text-center bg-[#14161E]/40 rounded-[32px] border border-[#282D3C] border-dashed backdrop-blur-sm">
                <span className="material-symbols-outlined text-zinc-600 text-4xl mb-4">history_toggle_off</span>
                <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">No completed projects on the platform yet</p>
              </div>
            ) : (
              <div className="relative pl-6 sm:pl-10 border-l-2 border-[#282D3C] space-y-12 pb-12 ml-2 sm:ml-4">
                {projects.map((project, index) => (
                  <div key={project.id} className="relative group">
                    {/* Timeline Node Glow */}
                    <div className="absolute -left-[32px] sm:-left-[49px] top-6 w-4 h-4 rounded-full bg-[#1E222D] border-2 border-[#0a0a0a] group-hover:bg-[#4ffeb9] group-hover:border-[#4ffeb9] group-hover:shadow-[0_0_20px_rgba(79,254,185,0.6)] transition-all duration-300 z-10"></div>
                    
                    <div className="bg-[#14161E]/80 backdrop-blur-md border border-[#282D3C] hover:border-[#4ffeb9]/40 rounded-[28px] p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)]">
                      
                      <div className="flex items-center gap-6 min-w-0 w-full sm:w-auto">
                        <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-[20px] bg-[#08090C] border border-[#282D3C] overflow-hidden flex-shrink-0 flex items-center justify-center p-2 sm:p-3 relative shadow-inner group-hover:border-zinc-500 transition-colors">
                          <img src={project.images?.split(',')[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-[11px] font-extrabold text-[#4ffeb9] uppercase tracking-widest mb-2 flex items-center gap-1.5 drop-shadow-[0_0_10px_rgba(79,254,185,0.3)]">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            Delivered
                          </p>
                          <p className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight truncate mb-2">{project.title}</p>
                          <p className="text-[10px] sm:text-[11px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">tag</span>
                            Order #{project.orderId}
                          </p>
                        </div>
                      </div>
                      
                      <div className="w-full sm:w-auto flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-[#282D3C] pt-5 sm:pt-0">
                        <div className="bg-[#1E222D] px-4 py-2 rounded-xl border border-[#282D3C] text-[10px] font-extrabold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">published_with_changes</span>
                          {project.revisions?.length || 0} Revisions
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
