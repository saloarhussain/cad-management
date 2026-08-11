"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import AuthGuard from '@/components/AuthGuard';
import { getDesignerDb, sendPayoutReminder } from '@/app/actions';

export default function DesignerDashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  // const [designer, setDesigner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  // const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [hasMounted, setHasMounted] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(83.5);
  const [displayCurrency, setDisplayCurrency] = useState<'₹' | '$'>('₹');
  const { user, loading: authLoading, activeOrganizationId, availableOrganizations, organizationName } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    setHasMounted(true);

    // Load preferred currency from local storage
    const saved = localStorage.getItem('cadonce_dashboard_currency');
    if (saved === '$' || saved === '₹') {
      setDisplayCurrency(saved as '₹' | '$');
    }

    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data.rates && data.rates.INR) {
          setExchangeRate(data.rates.INR);
        }
      } catch (err) {
        console.error("Failed to fetch exchange rate", err);
      }
    };
    fetchRate();
  }, []);

  useEffect(() => {
    if (searchParams.get('joined') === 'true' && availableOrganizations.length > 0 && activeOrganizationId) {
      const activeOrg = availableOrganizations.find(o => o.id === activeOrganizationId);
      const orgName = activeOrg?.name || organizationName || 'THE ORGANIZATION';
      setNotification({
        message: `WELCOME TO ${orgName.toUpperCase()}`,
        type: 'success'
      });
      // Clear the URL param without refreshing
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, availableOrganizations, activeOrganizationId, organizationName]);

  // const toggleExpand = (id: string) => {
  //   setExpandedProjects(prev => {
  //     const next = new Set(prev);
  //     if (next.has(id)) next.delete(id);
  //     else next.add(id);
  //     return next;
  //   });
  // };

  // const formatRevisionNote = (note: string) => {
  //   if (!note) return '';
  //   return note.split('\n')
  //     .map(line => {
  //       // Remove common prefixes and clean up surrounding characters
  //       let clean = line.replace(/3D VIEWPORT FEEDBACK:/gi, '').trim();
  //       if (!clean) return null;
  //       
  //       // Match old format: "Pin #1: message (Pos: ...)"
  //       const oldMatch = clean.match(/Pin #(\d+): (.*?) \(Pos:/i);
  //       if (oldMatch) return `Pin #${oldMatch[1]} - ${oldMatch[2].trim()}`;
  //       
  //       // Match current format with parentheses: "(Pin #1 - message)"
  //       const parenMatch = clean.match(/^\(Pin #(\d+) - (.*?)\)$/i);
  //       if (parenMatch) return `Pin #${parenMatch[1]} - ${parenMatch[2].trim()}`;
  //       
  //       return clean;
  //     })
  //     .filter(Boolean)
  //     .join('\n');
  // };

  useEffect(() => {
    const loadDesignerData = async () => {
      if (!activeOrganizationId) return;
      
      setLoading(true);
      const safetyTimeout = setTimeout(() => {
        setLoading(false);
        console.warn('Designer data fetch safety timeout triggered');
      }, 5000);

      try {
        const res = await getDesignerDb(activeOrganizationId);
        console.log('Designer Projects:', res.projects);
        setProjects(res.projects || []);
        // setDesigner(res.designer);
      } catch (err) {
        console.error('Failed to load designer data', err);
      } finally {
        clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };

    if (hasMounted && activeOrganizationId) {
      loadDesignerData();
    } else if (hasMounted && !authLoading && availableOrganizations.length === 0) {
      // If auth finished and we definitely have no organizations, stop loading
      setLoading(false);
    }
  }, [activeOrganizationId, hasMounted, authLoading, availableOrganizations]);

  // const pendingRevisions = projects.filter(p => 
  //   p.status === 'Revision Requested' || 
  //   p.revisions?.some((r: any) => r.status === 'Pending')
  // );

  const activeProjects = projects.filter(p => p.status !== 'Approved' && p.status !== 'Complete');

  const unpaidProjects = projects.filter(p => 
    (p.status === 'Approved' || p.status === 'Complete' || p.status === 'Completed') && 
    p.paymentStatus !== 'Paid'
  );

  // Helper to convert to display currency
  // const convert = (amount: number, fromCurrency: string) => {
  //   if (fromCurrency === displayCurrency) return amount;
  //   if (displayCurrency === '$') {
  //     return amount / exchangeRate;
  //   } else {
  //     return amount * exchangeRate;
  //   }
  // };

  // const unpaidBalance = unpaidProjects.reduce((sum, p) => 
  //   sum + convert(parseFloat(p.expense || '0'), p.expenseCurrency || '₹'), 0);

  const unpaidINR = unpaidProjects.reduce((sum, p) => {
    const amt = parseFloat(p.expense || '0');
    return sum + (p.expenseCurrency === '₹' ? amt : amt * exchangeRate);
  }, 0);

  const unpaidUSD = unpaidProjects.reduce((sum, p) => {
    const amt = parseFloat(p.expense || '0');
    return sum + (p.expenseCurrency === '$' ? amt : amt / exchangeRate);
  }, 0);

  // --- Real-time Metrics Calculation ---
  const avgTurnaround = useMemo(() => {
    const completed = projects.filter(p => 
      p.status === 'Completed' || p.status === 'Approved' || p.status === 'Complete'
    );
    if (completed.length === 0) return '0.0h';
    
    const totalMs = completed.reduce((sum, p) => {
      const start = new Date(p.created_at).getTime();
      const end = new Date(p.updated_at).getTime();
      // Ensure we have a valid duration, fallback to 0 if data is messy
      const duration = Math.max(0, end - start);
      return sum + duration;
    }, 0);
    
    const avgMs = totalMs / completed.length;
    const avgHours = avgMs / (1000 * 60 * 60);
    
    if (avgHours < 24) {
      return `${avgHours.toFixed(1)}h`;
    } else {
      const avgDays = avgHours / 24;
      return `${avgDays.toFixed(1)}d`;
    }
  }, [projects]);

  // const turnaroundColor = useMemo(() => {
  //   if (avgTurnaround === '0.0h') return 'text-cyan-400/40';
  //   const val = parseFloat(avgTurnaround);
  //   const isDays = avgTurnaround.includes('d');
  //   
  //   if (isDays) return 'text-red-400';
  //   if (val < 6) return 'text-cyan-400';
  //   if (val < 24) return 'text-yellow-400';
  //   return 'text-red-400';
  // }, [avgTurnaround]);

  const handleRemind = async (projectId: string) => {
    if (!activeOrganizationId) return;
    setRemindingId(projectId);
    try {
      const res = await sendPayoutReminder(projectId, activeOrganizationId);
      if (res.success) {
        setNotification({ type: 'success', message: 'Reminder sent to organization!' });
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to send reminder.' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setRemindingId(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a04] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#121414] text-[#e2e2e2] font-body pb-32">
        {/* Success Modal for Joining Organization */}
        {notification && notification.type === 'success' && notification.message.startsWith('WELCOME TO') && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="max-w-md w-full bg-[#111111] border border-green-500/30 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(34,197,94,0.15)] relative overflow-hidden group">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-green-500/10 blur-[60px] rounded-full pointer-events-none"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 animate-bounce duration-1000">
                  <span className="material-symbols-outlined text-green-400 text-5xl">check_circle</span>
                </div>
                <h2 className="text-white font-headline font-black text-3xl uppercase italic tracking-tighter mb-4">Access Authorized</h2>
                <p className="text-neutral-400 text-sm font-medium mb-2 uppercase tracking-widest text-[10px]">Strategic Partnership Confirmed</p>
                <div className="h-[1px] w-12 bg-green-500/50 mx-auto mb-6"></div>
                <p className="text-white font-bold text-lg leading-relaxed mb-10">
                  You have successfully joined <br/>
                  <span className="text-green-400 text-2xl font-black block mt-2 uppercase">{notification.message.replace('WELCOME TO ', '')}</span>
                </p>
                <button 
                  onClick={() => setNotification(null)}
                  className="w-full py-5 bg-green-500 text-black font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-95"
                >
                  Enter Workstation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Notification */}
        {notification && !(notification.type === 'success' && notification.message.startsWith('WELCOME TO')) && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
            notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <span className="material-symbols-outlined text-lg">
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <p className="text-[10px] font-black uppercase tracking-widest">{notification.message}</p>
          </div>
        )}

        {/* Header Navigation Shell */}
        <header className="fixed top-0 w-full z-50 bg-[#37393a] flex justify-between items-center px-6 h-16 w-full max-w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#333535] flex items-center justify-center border border-[#4b4732]/30 overflow-hidden">
              <img alt={user?.user_metadata?.fullName || 'Designer'} className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBSxHNAi3lO0iv34ml7AI6y25zJ58tWsIjKITC7XFdQ1lEC-k9fFCQxesbThH3MZXowAORIriJ1tLSOt872IlxliXlIDLuxQ8Mo5f4_-CfRuyCuit4QhZ1xp0bOOnvuaz_olk1XQPGynEc9hEiszFE2e-hQXg7KmhC3XT1BAPO_3NSuOpn6Amb7KaV6h3DpBHU6x6aLL8p-Gaw_QhwFnZoUsyQutv0HzKOasMZq7nNItQcIbRtvx-DlyuZECjH-l1W7VVWEOW2Iv7Q"/>
            </div>
            <div>
              <h1 className="font-headline font-black text-white italic tracking-tighter uppercase text-lg leading-none">KINETIC CAD</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold tracking-widest text-[#e0c700] uppercase">{user?.user_metadata?.fullName || 'Designer'}</span>
                <span className="w-1 h-1 bg-[#ffe311] rounded-full"></span>
                <span className="text-[9px] font-bold text-[#ffe311] bg-[#ffe311]/10 px-1 rounded">ELITE TIER</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#0c0f0f] px-3 py-1.5 rounded-lg border border-[#4b4732]/10">
              <div className="w-2 h-2 rounded-full bg-[#ffe311] pulse-dot"></div>
              <span className="text-[10px] font-bold tracking-tighter text-[#e2e2e2] uppercase">Render Node Active</span>
            </div>
            <Link href="/designer/portfolio" className="flex items-center gap-1 text-[#ffe30c] hover:text-white transition-colors">
              <span className="material-symbols-outlined text-sm">folder_special</span>
              <span className="text-[9px] font-black uppercase tracking-widest">Portfolio</span>
            </Link>
            <span className="material-symbols-outlined text-white hover:text-[#ffe30c] transition-colors scale-95 duration-150 cursor-pointer" style={{ fontVariationSettings: "'FILL' 0" }}>settings_input_component</span>
          </div>
        </header>

        <main className="pt-24 pb-32 px-4 max-w-lg mx-auto space-y-6">
          {/* Dual Channel Financial Section */}
          <section className="bg-[#1e2020] rounded-xl border border-[#4b4732]/15 shadow-[0_0_50px_-12px_rgba(252,224,3,0.15)] overflow-hidden">
            <div className="flex">
              {/* Escrow Side */}
              <div className="flex-1 p-5 relative overflow-hidden border-r border-[#4b4732]/10">
                <div className="absolute -top-1 -right-1 opacity-[0.03]">
                  <span className="material-symbols-outlined text-6xl">shield</span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[14px] text-[#e0c700]">shield</span>
                  <p className="text-[#cec7ab] font-label text-[9px] tracking-[0.15em] uppercase">Escrow Secured</p>
                </div>
                <h2 className="text-2xl font-headline font-black text-[#ffe311] tracking-tighter">
                  ${unpaidUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </h2>
                <p className="text-[9px] text-[#cec7ab]/50 uppercase mt-1">Held by Cadonce Platform</p>
              </div>
              {/* Manual Side */}
              <div className="flex-1 p-5 relative overflow-hidden">
                <div className="absolute -top-1 -right-1 opacity-[0.03]">
                  <span className="material-symbols-outlined text-6xl">account_balance</span>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[14px] text-[#cfca6c]">account_balance</span>
                  <p className="text-[#cec7ab] font-label text-[9px] tracking-[0.15em] uppercase">Direct/Manual</p>
                </div>
                <h2 className="text-2xl font-headline font-black text-[#cfca6c] tracking-tighter">
                  ₹{unpaidINR.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </h2>
                <p className="text-[9px] text-[#cec7ab]/50 uppercase mt-1">Awaiting Bank Verification</p>
              </div>
            </div>
            {/* Bottom Actions */}
            <div className="bg-[#282a2b]/40 px-5 py-4 border-t border-[#4b4732]/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button className="primary-gradient-btn text-[#726500] font-black px-5 py-2 rounded-lg text-[10px] uppercase tracking-tighter shadow-lg shadow-white/20 transition-transform active:scale-95">
                  Withdraw
                </button>
                <a className="text-[9px] font-bold text-[#e0c700] hover:text-[#ffe311] uppercase tracking-widest transition-colors" href="#">Manage Bank Details</a>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-[#cec7ab]/40 uppercase font-bold">Total Lifetime</p>
                <p className="text-[11px] font-mono font-bold text-[#e2e2e2]">$14,280.00</p>
              </div>
            </div>
          </section>

          {/* Payment Verification Component */}
          {unpaidProjects.length > 0 && (
            <section className="bg-[#ff5540]/10 border border-[#ff5540]/30 rounded-xl p-4 flex gap-4 items-start shadow-[0_10px_20px_-10px_rgba(255,85,64,0.1)]">
              <div className="w-10 h-10 rounded-lg bg-[#ff5540] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#5c0000]">payments</span>
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <h3 className="text-[10px] font-black text-[#ffb4a8] uppercase tracking-[0.2em] mb-1">Manual Payment Pending</h3>
                  <span className="text-[8px] text-[#ffb4a8]/60 font-mono">Just now</span>
                </div>
                <p className="text-xs text-[#e2e2e2] leading-tight font-medium mb-3">
                  Project: <span className="text-white font-bold italic">{unpaidProjects[0].title}</span> is completed. Awaiting payout of <span className="text-[#cfca6c] font-bold">{unpaidProjects[0].expenseCurrency}{unpaidProjects[0].expense}</span>.
                </p>
                <div className="flex gap-3 items-center">
                  <button 
                    onClick={() => handleRemind(unpaidProjects[0].id)}
                    disabled={remindingId === unpaidProjects[0].id}
                    className="px-3 py-1.5 rounded border border-[#ffe311] text-[9px] font-black uppercase text-[#ffe311] hover:bg-[#ffe311]/5 transition-colors disabled:opacity-50"
                  >
                    {remindingId === unpaidProjects[0].id ? 'Sending...' : 'Send Reminder'}
                  </button>
                  <button className="text-[9px] font-bold uppercase text-[#cec7ab]/40 hover:text-[#cec7ab] transition-colors">
                    Report Issue
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Performance Grid */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1c1c] rounded-xl p-4 border border-[#4b4732]/10">
              <div className="flex justify-between items-start mb-3">
                <span className="material-symbols-outlined text-[#ffe311]" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
                <span className="text-[10px] text-[#ffe311] bg-[#ffe311]/5 px-2 py-0.5 rounded-full border border-[#ffe311]/20">Hot</span>
              </div>
              <p className="text-[#cec7ab] text-[10px] uppercase tracking-widest font-bold">Quality Streak</p>
              <p className="text-xl font-headline font-extrabold mt-1">12 Projects</p>
              <p className="text-[10px] text-[#cfca6c] font-medium mt-0.5">(0 Errors detected)</p>
            </div>
            <div className="bg-[#1a1c1c] rounded-xl p-4 border border-[#4b4732]/10">
              <div className="flex justify-between items-start mb-3">
                <span className="material-symbols-outlined text-[#cfca6c]">speed</span>
              </div>
              <p className="text-[#cec7ab] text-[10px] uppercase tracking-widest font-bold">Avg. Turnaround</p>
              <p className="text-xl font-headline font-extrabold mt-1">{avgTurnaround}</p>
              <p className="text-[10px] text-[#cec7ab]/40 font-medium mt-0.5">Top 3% Platform Speed</p>
            </div>
          </section>

          {/* Tier Progress */}
          <section className="bg-[#1a1c1c] rounded-xl p-5 border border-[#4b4732]/10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[#cec7ab] text-[10px] uppercase tracking-[0.15em] font-bold">Tier Progress</p>
                <p className="text-sm font-headline font-bold text-[#e2e2e2]">Master Artisan <span className="text-[#cec7ab]/40 font-normal mx-1">→</span> Elite</p>
              </div>
              <p className="text-2xl font-headline font-black text-[#ffe311] italic tracking-tighter">82%</p>
            </div>
            <div className="h-2 w-full bg-[#333535] rounded-full overflow-hidden">
              <div className="h-full w-[82%] primary-gradient-btn rounded-full relative">
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-[#cec7ab]/60 leading-relaxed">Complete <span className="text-[#ffe311] font-bold">4 more high-fidelity renders</span> to unlock global priority routing.</p>
          </section>

          {/* Active Queue */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-headline font-extrabold text-xs uppercase tracking-widest text-[#cec7ab]">Active Queue ({activeProjects.length})</h3>
              <span className="text-[10px] font-bold text-[#e0c700] uppercase tracking-tighter flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">sort</span>
                Priority View
              </span>
            </div>

            {activeProjects.map(project => (
              <div key={project.id} className="group bg-[#282a2b] rounded-xl p-3 flex gap-4 items-center border border-[#4b4732]/5 transition-all hover:bg-[#333535]">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-black flex-shrink-0 relative">
                  <img alt={project.title} className="w-full h-full object-cover opacity-80" src={project.images?.split(',')[0] || 'https://via.placeholder.com/150'} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                </div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-headline font-bold text-sm text-[#e2e2e2] leading-none">{project.title}</h4>
                        {project.status === 'High Priority' && (
                          <span className="text-[8px] font-black bg-[#ffe311] text-[#201c00] px-1 rounded tag-pulse">[🔥 HIGH]</span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-[#cec7ab]/60 mt-1 uppercase">ID: {project.orderId || project.id.slice(0, 8)}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      project.status === 'High Priority' ? 'text-[#ffb4a8] bg-[#ffb4a8]/10' : 'text-[#ffe311] bg-[#ffe311]/10'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Link href={`/projects/${project.id}`} className="bg-[#ffe311] text-[#201c00] font-black text-[9px] uppercase px-3 py-1.5 rounded-md tracking-tighter hover:scale-105 transition-transform">
                      Manage
                    </Link>
                    {project.status === 'Revision Requested' && (
                      <Link href={`/projects/${project.id}/viewport`} className="bg-white/10 text-white font-black text-[9px] uppercase px-3 py-1.5 rounded-md tracking-tighter hover:scale-105 transition-transform">
                        View Revisions
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {activeProjects.length === 0 && (
              <div className="text-center p-10 bg-[#1a1c1c] rounded-xl border border-[#4b4732]/10">
                <p className="text-[10px] font-black text-[#cec7ab]/40 uppercase tracking-widest">No active projects in queue</p>
              </div>
            )}
          </section>
        </main>

        {/* Sticky Bottom Status & Nav Shell */}
        <div className="fixed bottom-0 left-0 w-full z-50">
          {/* System Status Bar */}
          <div className="bg-[#0c0f0f]/90 backdrop-blur-md border-t border-[#4b4732]/10 px-6 py-2 flex justify-between items-center">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-[#cec7ab] uppercase tracking-tighter">CPU</span>
                  <span className="text-[10px] font-mono font-bold text-[#ffe311]">14%</span>
                </div>
                <div className="w-12 h-3 bg-[#333535] mt-0.5 rounded-sm overflow-hidden sparkline-mask">
                  <div className="w-full h-full bg-gradient-to-r from-[#ffe311] to-[#cfca6c]" style={{ clipPath: "polygon(0 80%, 20% 40%, 40% 60%, 60% 20%, 80% 90%, 100% 10%)" }}></div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-[#cec7ab] uppercase tracking-tighter">GPU</span>
                  <span className="text-[10px] font-mono font-bold text-[#cfca6c]">42%</span>
                </div>
                <div className="w-12 h-3 bg-[#333535] mt-0.5 rounded-sm overflow-hidden sparkline-mask">
                  <div className="w-full h-full bg-gradient-to-r from-[#cfca6c] to-[#ffe311]" style={{ clipPath: "polygon(0 50%, 25% 80%, 50% 20%, 75% 40%, 100% 60%)" }}></div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-[#cec7ab] uppercase tracking-tighter">MEM</span>
                  <span className="text-[10px] font-mono font-bold text-[#e2e2e2]">8.2GB</span>
                </div>
                <div className="w-12 h-3 bg-[#333535] mt-0.5 rounded-sm overflow-hidden sparkline-mask">
                  <div className="w-full h-full bg-[#cec7ab]" style={{ clipPath: "polygon(0 90%, 30% 85%, 60% 80%, 90% 75%, 100% 70%)" }}></div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#cec7ab]/40">
              <span className="material-symbols-outlined text-[12px]">cloud_done</span>
              <span className="text-[8px] font-mono uppercase">Sync: OK</span>
            </div>
          </div>
          {/* Bottom Navigation Shell */}
          <nav className="bg-[#0c0f0f]/80 backdrop-blur-xl border-t border-[#4b4732]/15 flex justify-around items-center px-4 py-3 pb-safe shadow-[0_-10px_25px_rgba(252,224,3,0.1)]">
            <Link className="flex flex-col items-center justify-center text-[#ffe311] bg-white/10 rounded-xl px-3 py-1 active:scale-90 transition-transform" href="/designer">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              <span className="font-label text-[10px] tracking-widest uppercase mt-1">Dashboard</span>
            </Link>
            <Link className="flex flex-col items-center justify-center text-[#cec7ab]/60 hover:text-[#cfca6c] transition-all active:scale-90" href="/designer?tab=queue">
              <span className="material-symbols-outlined">pending_actions</span>
              <span className="font-label text-[10px] tracking-widest uppercase mt-1">Queue</span>
            </Link>
            <Link className="flex flex-col items-center justify-center text-[#cec7ab]/60 hover:text-[#cfca6c] transition-all active:scale-90" href="/designer?tab=nodes">
              <span className="material-symbols-outlined">dns</span>
              <span className="font-label text-[10px] tracking-widest uppercase mt-1">Nodes</span>
            </Link>
            <Link className="flex flex-col items-center justify-center text-[#cec7ab]/60 hover:text-[#cfca6c] transition-all active:scale-90" href="/designer?tab=telemetry">
              <span className="material-symbols-outlined">developer_board</span>
              <span className="font-label text-[10px] tracking-widest uppercase mt-1">Telemetry</span>
            </Link>
          </nav>
        </div>
      </div>
    </AuthGuard>
  );
}
