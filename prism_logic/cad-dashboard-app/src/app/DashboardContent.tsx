import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import { searchProducts, Product, Platform } from '@/lib/productSearchMock';
import CountdownTimer from '@/components/CountdownTimer';
import { useAuth } from '@/components/AuthProvider';
import { PLATFORM_CONFIG, getCurrencySymbol } from '@/lib/config';

interface DashboardContentProps {
  stats: any;
  recentProjects: any[];
  upcomingDeadlines: any[];
  filteredProjects: any[];
  allProjects: any[];
  planName: string;
  planColor: string;
  filterMode: 'day' | 'month' | 'year' | 'custom';
  setFilterMode: (mode: 'day' | 'month' | 'year' | 'custom') => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  startDate: Date;
  setStartDate: (date: Date) => void;
  endDate: Date;
  setEndDate: (date: Date) => void;
}

export default function DashboardContent({
  stats,
  recentProjects,
  filteredProjects,
  allProjects,
  upcomingDeadlines,
  planName,
  planColor,
  filterMode,
  setFilterMode,
  selectedDate,
  setSelectedDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate
}: DashboardContentProps) {
  const { user } = useAuth();
  const isFounder = user?.email === PLATFORM_CONFIG.FOUNDER_EMAIL;

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isPendingJobsExpanded, setIsPendingJobsExpanded] = useState(false);
  const [isDeadlinesExpanded, setIsDeadlinesExpanded] = useState(false);

  const handleCardClick = (metric: string) => {
    setSelectedMetric(metric);
    setIsProjectsModalOpen(true);
  };

  const getProjectsForMetric = () => {
    if (!selectedMetric) return [];
    
    if (selectedMetric === 'Total Revenue') {
      return filteredProjects;
    }

    if (selectedMetric === 'Expenses') {
      return filteredProjects.filter((p: any) => p.designer && p.designer.trim() !== '');
    }
    
    if (selectedMetric === 'Pending') {
      return (allProjects || []).filter((p: any) => {
        const s = p.status?.toLowerCase() || '';
        return !s.includes('complete') && !s.includes('done') && !s.includes('delivered');
      });
    }
    
    if (selectedMetric === 'Payouts Due') {
      return (allProjects || []).filter((p: any) => {
        const s = p.status?.toLowerCase() || '';
        const isComplete = s.includes('complete') || s.includes('done') || s.includes('delivered');
        return isComplete && (!p.payoutStatus || p.payoutStatus.toLowerCase() !== 'paid');
      });
    }
    
    return [];
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [userCountry, setUserCountry] = useState<string>('IN'); // Default to IN
  const [selectedPlatform] = useState<Platform>('amazon');
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Fetch user country by IP
  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.country_code) {
          setUserCountry(data.country_code);
        }
      } catch (e) {
        console.warn('IP-based country detection failed, defaulting to IN');
      }
    };
    fetchCountry();
  }, []);

  // Load initial products (Static display as search is hidden)
  useEffect(() => {
    const loadInitial = async () => {
      setIsLoadingProducts(true);
      try {
        const { getAffiliateProducts } = await import('./actions');
        const saved = await getAffiliateProducts();

        const mock = await searchProducts('', selectedPlatform);
        const combined = [...saved, ...mock.filter(m => !saved.some((s: any) => s.asin === m.asin))];

        // REFINED FILTERING:
        // 1. Founder sees EVERYTHING.
        // 2. If we don't know the user's country, show everything.
        // 3. Otherwise, show products matching the country OR products with no country assigned.
        const filtered = combined.filter((p: any) => {
          if (isFounder) return true;
          if (!userCountry) return true;
          if (!p.countryCode) return true;
          return p.countryCode === userCountry;
        });

        setProducts(filtered);
      } catch (err) {
        console.error('Failed to load initial products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadInitial();
  }, [selectedPlatform, userCountry, isFounder]);

  const handleAddByLink = async () => {
    if (!isFounder) {
      alert('Only the platform founder is authorized to manage affiliate assets.');
      return;
    }
    if (!linkInput.trim()) return;
    setIsFetchingLink(true);
    try {
      const { fetchAmazonProduct, saveAffiliateProduct } = await import('./actions');
      const res = await fetchAmazonProduct(linkInput);

      if (res.success && res.product) {
        // Persist to DB FIRST to ensure data integrity
        const saveRes = await saveAffiliateProduct(res.product);

        if (saveRes.success) {
          // Update UI state only after successful DB persistence
          setProducts(prev => {
            const exists = prev.some(p => p.asin === res.product!.asin);
            if (exists) return prev;
            return [res.product!, ...prev];
          });
          setLinkInput('');
          setShowLinkInput(false);
          alert(`Successfully curated: ${res.product.title}`);
        } else {
          alert(`Persistence Error: ${saveRes.error || 'Failed to save product to cloud.'}`);
        }
      } else {
        alert(res.error || 'Failed to fetch product details. Please verify the link.');
      }
    } catch (e) {
      console.error('Add by link error:', e);
      alert('A technical error occurred while processing the link.');
    } finally {
      setIsFetchingLink(false);
    }
  };

  const margin = stats.totalRevenue > 0
    ? (((stats.totalRevenue - stats.totalExpense) / stats.totalRevenue) * 100).toFixed(1)
    : '0.0';

  const formatSelectedDate = () => {
    if (isNaN(selectedDate.getTime())) return "Select Range";
    if (filterMode === 'day') return selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    if (filterMode === 'month') return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (filterMode === 'year') return selectedDate.getFullYear().toString();
    if (filterMode === 'custom') {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return "Select Range";
  };

  const safeISO = (date: Date) => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDeleteProduct = async (product: any) => {
    if (!isFounder) return;
    if (!confirm('Remove this affiliate product?')) return;

    const identifier = product.asin || product.id;
    if (!identifier) return;

    try {
      const { deleteAffiliateProduct } = await import('./actions');
      const res = await deleteAffiliateProduct(identifier);
      if (res.success) {
        setProducts(prev => prev.filter(p => p.asin !== identifier && p.id !== identifier));
      } else {
        alert('Failed to delete product.');
      }
    } catch (e) {
      alert('Error deleting product.');
    }
  };

  const handleExport = async () => {
    try {
      if (!filteredProjects || filteredProjects.length === 0) {
        alert("No data available to export for the selected range.");
        return;
      }

      // Dynamic import to keep initial bundle small and speed up dev compilation
      const XLSX = await import('xlsx');

      // Prepare data for Excel
      const dataToExport = filteredProjects.map(p => ({
        Title: p.title,
        Client: p.client,
        Designer: p.designer || 'Unassigned',
        Status: p.status,
        Revenue: `${getCurrencySymbol(p.revenueCurrency || 'USD')}${p.revenue}`,
        Expense: `${getCurrencySymbol(p.expenseCurrency || 'INR')}${p.expense}`,
        PaymentStatus: p.paymentStatus || 'Unpaid',
        PayoutStatus: p.payoutStatus || 'Pending',
        CreatedAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A',
        Deadline: p.deadlineDate || 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Project Data");

      // Set column widths
      const wscols = [
        { wch: 30 }, // Title
        { wch: 20 }, // Client
        { wch: 20 }, // Designer
        { wch: 15 }, // Status
        { wch: 12 }, // Revenue
        { wch: 12 }, // Expense
        { wch: 15 }, // PaymentStatus
        { wch: 15 }, // PayoutStatus
        { wch: 15 }, // CreatedAt
        { wch: 15 }  // Deadline
      ];
      ws['!cols'] = wscols;

      const filename = `CADONCE_Export_${filterMode}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data. Please try again.");
    }
  };

  return (
    <AuthGuard>
      <div className="pt-20 px-6 space-y-6 pb-10 relative">
        {/* Payout Alert Notification */}
        {stats.payoutsDue > 0 && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-3 group animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex-shrink-0 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Payouts Outstanding</h4>
                <p className="text-[8px] font-bold text-red-400/80 uppercase tracking-tight">You have {stats.payoutsDueCount} completed projects pending designer payment</p>
              </div>
            </div>
            <Link href="/projects" className="w-full sm:w-auto text-center px-4 py-2.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20">
              Pay Now
            </Link>
          </div>
        )}

        {/* Welcome Section */}
        <section className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div>
                <h1 className="font-headline text-[20px] sm:text-[24px] font-extrabold tracking-tight text-on-surface leading-none">Data Overview</h1>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1.5 opacity-60">Strategic Dashboard</p>
              </div>
              {/* Clients and Team Counts */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 bg-surface-container-low rounded-xl border border-white/5 shadow-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-[#fce003]">person</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-white">
                    {stats.totalClients} <span className="text-on-surface-variant opacity-60">Clients</span>
                  </span>
                </div>
                <div className="px-3 py-2 bg-surface-container-low rounded-xl border border-white/5 shadow-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs text-[#00fbfe]">groups</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-white">
                    {stats.totalDesigners} <span className="text-on-surface-variant opacity-60">Team</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto h-10">
              {/* Export Button */}
              <button
                onClick={handleExport}
                className="flex-1 sm:flex-none h-full flex items-center justify-center gap-2 px-4 bg-surface-container rounded-xl border border-outline-variant/30 hover:border-[#fce003]/50 transition-all group shadow-sm active:scale-95"
                title="Export to Excel"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant group-hover:text-[#fce003]">Export</span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-[#fce003]">download_for_offline</span>
              </button>

              {/* Date Filter Button */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="flex-1 sm:flex-none h-full flex items-center justify-center gap-2 px-2 bg-surface-container rounded-xl border border-outline-variant/30 hover:border-[#fce003]/50 transition-all group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-2 h-full">
                  <div className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all bg-[#fce003] text-zinc-950 shadow-sm flex items-center justify-center h-[70%]`}>
                    {filterMode === 'day' ? 'Daily' : filterMode === 'month' ? 'Monthly' : filterMode === 'year' ? 'Yearly' : 'Custom'}
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-on-surface pr-1">calendar_month</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fce003] animate-pulse"></span>
            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-80">
              Viewing: <span className="text-on-surface">{formatSelectedDate()}</span>
            </span>
          </div>
        </section>

        {/* Date Filter Modal */}
        {isCalendarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
              onClick={() => setIsCalendarOpen(false)}
            />
            <div className="relative w-full max-w-sm bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline font-black text-lg text-on-surface">Select Range</h3>
                <button onClick={() => setIsCalendarOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Mode Selector */}
                <div className="flex p-1 bg-zinc-900 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                  {(['day', 'month', 'year', 'custom'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setFilterMode(mode)}
                      className={`flex-1 min-w-[60px] py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === mode ? 'bg-[#fce003] text-zinc-950 shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Date Input Area */}
                <div className="space-y-4">
                  {filterMode === 'day' && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Pick a Day</label>
                      <input
                        type="date"
                        value={safeISO(selectedDate)}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value);
                          if (!isNaN(newDate.getTime())) {
                            setSelectedDate(newDate);
                          }
                        }}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#fce003]/50 transition-all color-scheme-dark"
                      />
                    </div>
                  )}

                  {filterMode === 'month' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Month</label>
                        <select
                          value={selectedDate.getMonth()}
                          onChange={(e) => {
                            const d = new Date(selectedDate);
                            d.setMonth(parseInt(e.target.value));
                            setSelectedDate(d);
                          }}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#fce003]/50 transition-all"
                        >
                          {Array.from({ length: 12 }).map((_, i) => (
                            <option key={i} value={i}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Year</label>
                        <select
                          value={selectedDate.getFullYear()}
                          onChange={(e) => {
                            const d = new Date(selectedDate);
                            d.setFullYear(parseInt(e.target.value));
                            setSelectedDate(d);
                          }}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#fce003]/50 transition-all"
                        >
                          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {filterMode === 'year' && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest ml-1">Select Year</label>
                      <select
                        value={selectedDate.getFullYear()}
                        onChange={(e) => {
                          const d = new Date(selectedDate);
                          d.setFullYear(parseInt(e.target.value));
                          setSelectedDate(d);
                        }}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#fce003]/50 transition-all"
                      >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  )}

                  {filterMode === 'custom' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest ml-1">From</label>
                        <input
                          type="date"
                          value={safeISO(startDate)}
                          onChange={(e) => {
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) setStartDate(d);
                          }}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#fce003]/50 transition-all color-scheme-dark"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest ml-1">To</label>
                        <input
                          type="date"
                          value={safeISO(endDate)}
                          onChange={(e) => {
                            const d = new Date(e.target.value);
                            if (!isNaN(d.getTime())) setEndDate(d);
                          }}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#fce003]/50 transition-all color-scheme-dark"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-full py-4 rounded-xl electric-gradient text-zinc-950 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-[#fce003]/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Modal */}
        {isProjectsModalOpen && selectedMetric && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
              onClick={() => setIsProjectsModalOpen(false)}
            />
            <div className="relative w-full max-w-2xl bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                  <h3 className="font-headline font-black text-lg text-on-surface">{selectedMetric} Projects</h3>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1 opacity-60">
                    {getProjectsForMetric().length} Projects
                  </p>
                </div>
                <button onClick={() => setIsProjectsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto no-scrollbar flex-1">
                {getProjectsForMetric().length > 0 ? (
                  getProjectsForMetric().map((p: any) => (
                    <Link key={p.id} href={`/projects/${p.id}`} className="p-3 bg-zinc-900 border border-white/5 rounded-xl flex flex-col gap-2 hover:border-[#fce003]/50 hover:bg-zinc-800/50 transition-all cursor-pointer group">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <p className="text-[4.5px] font-black text-on-surface-variant tracking-widest opacity-60">Order ID: {p.id}</p>
                          <p className="text-[8px] font-bold text-on-surface-variant tracking-widest opacity-60">
                            {selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? 'Expense' : 'Revenue'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-headline font-extrabold text-on-surface text-sm leading-tight truncate group-hover:text-[#fce003] transition-colors" title={p.title}>
                              {p.title}
                            </h4>
                            <p className="text-[10px] text-on-surface-variant font-medium mt-1 truncate">
                              <span className="opacity-50">{selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? 'Designer: ' : 'Client: '}</span>
                              <span className="font-bold text-on-surface-variant">{selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? (p.designer || 'Unassigned') : p.client}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <div className={`font-headline font-extrabold px-2.5 py-1 rounded border text-xs ${
                              selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? 'border-zinc-500 text-white' : 'border-[#fce003] text-[#fce003]'
                            }`}>
                              {selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? getCurrencySymbol(p.expenseCurrency || 'INR') : getCurrencySymbol(p.revenueCurrency || 'USD')}
                              {parseFloat(selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? (p.expense || '0') : (p.revenue || '0')).toLocaleString()}
                            </div>
                            {(selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due') && (
                              <span className={`text-[8px] font-black py-0.5 px-2 rounded tracking-wider shadow-sm inline-block ${
                                p.payoutStatus?.toLowerCase() === 'paid' ? 'bg-emerald-500 text-white' : 
                                'bg-zinc-700 text-white'
                              }`}>
                                {p.payoutStatus?.toLowerCase() === 'paid' ? 'Paid' : 'Pending'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {selectedMetric !== 'Expenses' && selectedMetric !== 'Payouts Due' && (
                        <div className="flex justify-between items-center pt-2 border-t border-white/5 gap-4">
                          <div className="flex-1 bg-zinc-950/40 p-2 rounded-lg border border-white/5 flex flex-col gap-1 sm:bg-transparent sm:p-0 sm:border-none sm:text-left">
                            <span className="text-[8px] font-bold text-on-surface-variant tracking-widest opacity-60">Client Status</span>
                            <div className="sm:flex sm:justify-start">
                              <span className={`text-[8px] sm:text-[9px] font-black py-0.5 px-2 rounded tracking-wider inline-block text-center w-full sm:w-auto shadow-sm ${
                                p.paymentStatus?.toLowerCase() === 'paid' ? 'bg-emerald-500 text-white' : 
                                p.paymentStatus?.toLowerCase().includes('advance') ? 'bg-sky-500 text-white' : 
                                'bg-[#e9e2cf] text-zinc-950'
                              }`}>
                                {p.paymentStatus?.toLowerCase() === 'paid' ? 'Paid' : 
                                 p.paymentStatus?.toLowerCase() === 'unpaid' ? 'Unpaid' : 
                                 p.paymentStatus?.toLowerCase() === 'pending' ? 'Pending' : 
                                 (p.paymentStatus || 'Unpaid')}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 bg-zinc-950/40 p-2 rounded-lg border border-white/5 flex flex-col gap-1 sm:bg-transparent sm:p-0 sm:border-none sm:text-right">
                            <span className="text-[8px] font-bold text-on-surface-variant tracking-widest opacity-60">
                              {selectedMetric === 'Pending' ? 'Project Progress' : 'Designer Payout'}
                            </span>
                            <div className="sm:flex sm:justify-end">
                              {selectedMetric === 'Pending' ? (
                                <span className={`text-[8px] sm:text-[9px] font-black py-0.5 px-2 rounded tracking-wider inline-block text-center w-full sm:w-auto shadow-sm border ${
                                  p.status?.toLowerCase().includes('urgent') || p.status?.toLowerCase().includes('high') ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                  p.status?.toLowerCase().includes('complete') || p.status?.toLowerCase().includes('approve') || p.status?.toLowerCase().includes('done') || p.status?.toLowerCase().includes('delivered') ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                  p.status?.toLowerCase().includes('pending') || p.status?.toLowerCase().includes('review') || p.status?.toLowerCase().includes('await') ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                  'bg-sky-500/20 text-sky-400 border-sky-500/30'
                                }`}>
                                  {p.status || 'In Progress'}
                                </span>
                              ) : (
                                <span className={`text-[8px] sm:text-[9px] font-black py-0.5 px-2 rounded tracking-wider inline-block text-center w-full sm:w-auto shadow-sm ${
                                  p.payoutStatus?.toLowerCase() === 'paid' ? 'bg-emerald-500 text-white' : 
                                  'bg-zinc-700 text-white'
                                }`}>
                                  {p.payoutStatus?.toLowerCase() === 'paid' ? 'Paid' : 'Pending'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-50">
                    <span className="text-[10px] font-black uppercase tracking-widest">No projects found for this metric.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bento Grid: Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {/* Revenue Card */}
          <div onClick={() => handleCardClick('Total Revenue')} className="col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-[#fce003]/20 to-transparent shadow-2xl group active:scale-[0.98] transition-all cursor-pointer">
            <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 lg:p-6 border border-white/5 relative overflow-hidden">
              {/* Info Tooltip */}
              <div 
                className="absolute top-3 right-3 z-30 group/tooltip"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined text-white/30 hover:text-[#fce003] text-sm cursor-help transition-colors select-none">
                  info
                </span>
                <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                  <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                    Total revenue earned from projects created in this period (both paid and unpaid by clients).
                  </p>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 opacity-60">Total Revenue</p>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-2xl sm:text-3xl lg:text-2xl font-headline font-black text-white tracking-tighter leading-none truncate">
                    {stats.currency}{stats.totalRevenue.toLocaleString()}
                  </h3>
                  <div className="px-2 py-1 bg-[#fce003]/10 rounded-full border border-[#fce003]/20 flex-shrink-0">
                    <span className="text-[10px] font-black text-[#fce003]">+{margin}%</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#fce003]"></span>
                  <p className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-40">Performance: {filterMode}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Card */}
          <div onClick={() => handleCardClick('Pending')} className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent shadow-xl group active:scale-[0.98] transition-all cursor-pointer">
            <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden">
              {/* Info Tooltip */}
              <div 
                className="absolute top-3 right-3 z-30 group/tooltip"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined text-white/30 hover:text-[#fce003] text-sm cursor-help transition-colors select-none">
                  info
                </span>
                <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                  <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                    Total revenue from active, in-progress projects (representing your upcoming pipeline).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-1 opacity-60">
                <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Pending</p>
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
              </div>
              <h3 className="text-lg sm:text-xl font-headline font-black text-[#fce003] tracking-tight truncate">
                {stats.currency}{stats.pendingRevenue.toLocaleString()}
              </h3>
              <p className="text-[7px] font-black uppercase tracking-widest text-orange-500 mt-2 opacity-80">Pipeline</p>
            </div>
          </div>

          {/* Costs Card */}
          <div onClick={() => handleCardClick('Expenses')} className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-zinc-500/20 to-transparent shadow-xl group active:scale-[0.98] transition-all cursor-pointer">
            <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden">
              {/* Info Tooltip */}
              <div 
                className="absolute top-3 right-3 z-30 group/tooltip"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined text-white/30 hover:text-[#fce003] text-sm cursor-help transition-colors select-none">
                  info
                </span>
                <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                  <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                    Total designer payouts for projects in this period (both paid and pending/unpaid).
                  </p>
                </div>
              </div>
              <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-60">Expenses</p>
              <h3 className="text-lg sm:text-xl font-headline font-black text-white tracking-tight truncate">
                {stats.currency}{stats.totalExpense.toLocaleString()}
              </h3>
              <p className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant mt-2 opacity-40">Designer Payouts</p>
            </div>
          </div>

          {/* Payouts Due Card */}
          <div onClick={() => handleCardClick('Payouts Due')} className={`col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br ${stats.payoutsDue > 0 ? 'from-red-500/30 to-transparent' : 'from-zinc-700/20 to-transparent'} shadow-2xl group active:scale-[0.98] transition-all cursor-pointer`}>
            <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden">
              {/* Info Tooltip */}
              <div 
                className="absolute top-3 right-3 z-30 group/tooltip"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="material-symbols-outlined text-white/30 hover:text-[#fce003] text-sm cursor-help transition-colors select-none">
                  info
                </span>
                <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                  <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                    Total outstanding payouts due to designers for all completed/delivered projects.
                  </p>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1 opacity-60">Payouts Due</p>
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-lg sm:text-xl font-headline font-black tracking-tight ${stats.payoutsDue > 0 ? 'text-red-500' : 'text-white'} truncate`}>
                    {stats.currency}{stats.payoutsDue.toLocaleString()}
                  </h3>
                  <div className="flex-shrink-0">
                    <div className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border ${stats.payoutsDue > 0 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/10 text-on-surface-variant'}`}>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{stats.payoutsDueCount} {stats.payoutsDueCount === 1 ? 'Pending' : 'Pending'}</span>
                      {stats.payoutsDue > 0 && <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                    </div>
                  </div>
                </div>
                <p className="text-[7px] font-black uppercase tracking-widest text-on-surface-variant mt-2 opacity-40">Outstanding Payouts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Pending Jobs, Deadlines & Earn CADONCE Points */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Pending Jobs Count Card */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-2 shrink-0">
              <h3 className="font-headline font-bold text-lg tracking-tight">Pending Jobs</h3>
              <Link href="/projects" className="text-[10px] font-bold text-[#fce003] uppercase tracking-widest cursor-pointer">View All</Link>
            </div>
            
            <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 overflow-hidden transition-all duration-300">
              <div className="p-6 flex items-center justify-between w-full">
                <div>
                  <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1.5 opacity-60">Jobs Still Pending</p>
                  <h3 className="text-xl font-headline font-black text-[#fce003] tracking-tight leading-none">
                    {stats.activeProjects} {stats.activeProjects === 1 ? 'Job' : 'Jobs'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsPendingJobsExpanded(!isPendingJobsExpanded)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[#fce003]/30 rounded-lg text-[10px] font-black text-[#fce003] uppercase tracking-widest hover:bg-[#fce003]/10 transition-colors active:scale-95 duration-150 focus:outline-none"
                >
                  <span>{isPendingJobsExpanded ? 'Hide Details' : 'Show Details'}</span>
                  <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isPendingJobsExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
              </div>

              {/* Collapsible Panel */}
              {isPendingJobsExpanded && (
                <div className="border-t border-white/5 bg-black/10 px-6 py-4 space-y-3 animate-in slide-in-from-top-4 duration-300 w-full">
                  {(() => {
                    const pendingProjects = (allProjects || []).filter((p: any) => {
                      const s = p.status?.toLowerCase() || '';
                      return !s.includes('complete') && !s.includes('done') && !s.includes('delivered');
                    });
                    
                    if (pendingProjects.length === 0) {
                      return (
                        <div className="text-center py-4 text-[10px] font-black text-[#cec7ab] uppercase tracking-widest w-full">
                          No pending jobs found
                        </div>
                      );
                    }
                    
                    return (
                      <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar w-full">
                        {pendingProjects.map((p: any) => {
                          const projectImage = p.images?.split(',')[0] || p.imageUrl;
                          return (
                            <div key={p.id} className="py-3 flex items-center justify-between gap-4 group w-full">
                              <div className="flex items-center gap-4 min-w-0">
                                {/* Thumbnail or Icon */}
                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  {projectImage ? (
                                    <img src={projectImage} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <span className="material-symbols-outlined text-[#fce003] text-xl">precision_manufacturing</span>
                                  )}
                                </div>
                                
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-white uppercase truncate tracking-tight">{p.title}</h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-wider">#{p.orderId || 'N/A'}</span>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-[8px] font-black text-[#00fbfe] uppercase tracking-wider">{p.status || 'Pending'}</span>
                                  </div>
                                </div>
                              </div>

                              <Link 
                                href={`/projects/${p.id}`}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[#fce003]/30 hover:bg-[#fce003]/10 hover:text-[#fce003] rounded-lg text-[9px] font-black text-white uppercase tracking-widest transition-all duration-200"
                              >
                                Workspace
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </section>

          {/* Column 2: Upcoming Deadlines */}
          <section className="space-y-4">
            <h3 className="font-headline font-bold text-lg tracking-tight px-2 shrink-0">Deadlines</h3>
            <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 overflow-hidden transition-all duration-300">
              <div className="p-6 flex items-center justify-between w-full">
                <div>
                  <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1.5 opacity-60">Active Deadlines</p>
                  <h3 className="text-xl font-headline font-black text-[#fce003] tracking-tight leading-none">
                    {upcomingDeadlines.length} {upcomingDeadlines.length === 1 ? 'Deadline' : 'Deadlines'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsDeadlinesExpanded(!isDeadlinesExpanded)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[#fce003]/30 rounded-lg text-[10px] font-black text-[#fce003] uppercase tracking-widest hover:bg-[#fce003]/10 transition-colors active:scale-95 duration-150 focus:outline-none"
                >
                  <span>{isDeadlinesExpanded ? 'Hide Details' : 'Show Details'}</span>
                  <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isDeadlinesExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
              </div>

              {/* Collapsible Panel */}
              {isDeadlinesExpanded && (
                <div className="border-t border-white/5 bg-black/10 px-6 py-4 space-y-3 animate-in slide-in-from-top-4 duration-300 w-full">
                  {upcomingDeadlines.length === 0 ? (
                    <div className="text-center py-4 text-[10px] font-black text-white/20 uppercase tracking-widest w-full">
                      No immediate deadlines
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar w-full">
                      {upcomingDeadlines.map((p: any, idx: number) => {
                        const colors = ['from-[#fce003] to-[#FF8A00]', 'bg-outline-variant', 'bg-secondary'];
                        const colorClass = colors[idx % colors.length];
                        return (
                          <div key={p.id} className="py-3 flex items-center justify-between gap-4 group w-full">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-1 h-8 rounded-full shrink-0 ${colorClass.startsWith('bg-') ? colorClass : `bg-gradient-to-b ${colorClass}`}`}></div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black uppercase text-white truncate">{p.title}</h4>
                                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{p.deadlineDate}</p>
                              </div>
                            </div>
                            <Link 
                              href={`/projects/${p.id}`}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[#fce003]/30 hover:bg-[#fce003]/10 hover:text-[#fce003] rounded-lg text-[9px] font-black text-white uppercase tracking-widest transition-all duration-200"
                            >
                              Workspace
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Column 3: Earn CADONCE Points */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-2 shrink-0">
              <h3 className="font-headline font-bold text-lg tracking-tight">Earn Points</h3>
              {isFounder && (
                <button
                  onClick={() => setShowLinkInput(!showLinkInput)}
                  className="text-[8px] font-black text-[#fce003] uppercase tracking-[0.2em] px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg hover:border-[#fce003]/30 transition-all focus:outline-none"
                >
                  {showLinkInput ? 'Cancel' : 'Add Link'}
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 p-5 space-y-4 overflow-hidden">
              {showLinkInput && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 w-full shrink-0">
                  <div className="relative">
                    <input
                      type="text"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="Paste Amazon link..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-3 pr-20 py-2.5 text-[10px] text-white font-bold placeholder:text-white/20 focus:outline-none focus:border-[#fce003]/50 transition-all"
                    />
                    <button
                      onClick={handleAddByLink}
                      disabled={isFetchingLink}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#fce003] text-zinc-950 text-[8px] font-black uppercase tracking-widest rounded-lg disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isFetchingLink ? 'Fetching...' : 'Fetch'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 min-h-[160px] w-full flex-1">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center w-full py-10 opacity-30 animate-pulse">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center w-full py-10 rounded-xl text-center">
                    <span className="material-symbols-outlined text-[#fce003] text-2xl mb-2 opacity-50">shopping_basket</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-white/40">No Products Curated</span>
                    {isFounder && <p className="text-[7px] font-bold text-white/20 mt-1 uppercase">Add products to begin</p>}
                  </div>
                ) : (
                  products.map((product) => {
                    const estimatedPoints = product.points ?? Math.round(product.price * 0.0175);
                    return (
                      <a
                        key={product.id}
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col flex-shrink-0 w-32 rounded-xl bg-surface-container border border-outline-variant/10 shadow-lg overflow-hidden transition-all hover:border-[#fce003]/30 hover:scale-[1.02] active:scale-95 cursor-pointer block"
                      >
                        <div className="w-full aspect-square overflow-hidden relative bg-zinc-900">
                          <img alt={product.title} className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" src={product.imageUrl} />
                          {isFounder && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteProduct(product);
                              }}
                              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-500/80 text-white backdrop-blur-md border border-white/10 hover:bg-red-600 transition-all z-10"
                            >
                              <span className="material-symbols-outlined text-xs">delete</span>
                            </button>
                          )}
                        </div>
                        <div className="p-2 space-y-1">
                          <h4 className="text-[9px] font-bold text-on-surface truncate leading-tight opacity-95">{product.title}</h4>
                          <div className="flex flex-col">
                            <p className="text-xs font-headline font-extrabold text-[#fce003]">
                              {new Intl.NumberFormat(product.countryCode === 'IN' ? 'en-IN' : 'en-US', {
                                style: 'currency',
                                currency: product.currency || (product.countryCode === 'IN' ? 'INR' : 'USD'),
                                maximumFractionDigits: product.currency === 'INR' ? 0 : 2
                              }).format(product.price)}
                            </p>
                          </div>
                          <div className="flex flex-nowrap gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-[#fce003]/30 text-[7px] font-black text-[#fce003] uppercase tracking-tighter truncate">+{estimatedPoints} Pts</span>
                          </div>
                        </div>
                      </a>
                    );
                  })
                )}
              </div>
            </div>
          </section>

        </div>
        {/* Rendering Indicator Floating Pill */}
        <div className="fixed left-6 bottom-24 z-[150] px-4 py-2 rounded-full glass-panel border border-white/5 shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-500">
          <span className="w-2 h-2 rounded-full bg-[#e9e2cf] animate-pulse shadow-[0_0_10px_rgba(233,226,207,0.5)]"></span>
          <span className="text-[10px] font-black text-on-surface uppercase tracking-widest opacity-80">Rendering...</span>
        </div>
      </div>
    </AuthGuard>
  );
}
