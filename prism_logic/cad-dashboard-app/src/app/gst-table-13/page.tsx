"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDb } from '@/app/actions';
import AuthGuard from '@/components/AuthGuard';
import { getIndianFinancialYear, parseGstInvoiceNumber, formatGstInvoiceNumber } from '@/lib/invoiceSeries';

export default function GstTable13Page() {
  return (
    <AuthGuard>
      <GstTable13Content />
    </AuthGuard>
  );
}

function GstTable13Content() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  // Period filter mode: 'month' | 'quarter' | 'fy' | 'custom'
  const [periodPreset, setPeriodPreset] = useState<'this_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'full_fy' | 'custom'>('full_fy');
  const [selectedFy, setSelectedFy] = useState<string>('26-27');

  const [customStartDate, setCustomStartDate] = useState<string>('2026-04-01');
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Fetch projects on load
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const db = await getDb();
        setProjects(db.projects || []);
      } catch (err) {
        console.error('Failed to load projects for GST Table 13:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Compute date range based on preset
  const dateRange = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const [fyStartYY] = selectedFy.split('-').map(Number);
    const fyFullStartYear = 2000 + fyStartYY; // e.g. 2026

    let start = new Date(fyFullStartYear, 3, 1, 0, 0, 0, 0); // April 1
    let end = new Date(fyFullStartYear + 1, 2, 31, 23, 59, 59, 999); // March 31

    if (periodPreset === 'this_month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodPreset === 'last_month') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    } else if (periodPreset === 'q1') {
      start = new Date(fyFullStartYear, 3, 1, 0, 0, 0, 0); // Apr 1
      end = new Date(fyFullStartYear, 5, 30, 23, 59, 59, 999); // Jun 30
    } else if (periodPreset === 'q2') {
      start = new Date(fyFullStartYear, 6, 1, 0, 0, 0, 0); // Jul 1
      end = new Date(fyFullStartYear, 8, 30, 23, 59, 59, 999); // Sep 30
    } else if (periodPreset === 'q3') {
      start = new Date(fyFullStartYear, 9, 1, 0, 0, 0, 0); // Oct 1
      end = new Date(fyFullStartYear, 11, 31, 23, 59, 59, 999); // Dec 31
    } else if (periodPreset === 'q4') {
      start = new Date(fyFullStartYear + 1, 0, 1, 0, 0, 0, 0); // Jan 1
      end = new Date(fyFullStartYear + 1, 2, 31, 23, 59, 59, 999); // Mar 31
    } else if (periodPreset === 'custom') {
      start = new Date(customStartDate + 'T00:00:00');
      end = new Date(customEndDate + 'T23:59:59');
    }

    return { start, end };
  }, [periodPreset, selectedFy, customStartDate, customEndDate]);

  // Helpers to inspect records
  const isCancelled = (p: any) => {
    const s = (p.status || '').toLowerCase();
    return s === 'cancelled' || Boolean(p.cancelled_at) || (Array.isArray(p.tags) && p.tags.includes('STATUS:CANCELLED'));
  };

  const getSource = (p: any): string => {
    if (p.source) return p.source;
    if (Array.isArray(p.tags)) {
      const tag = p.tags.find((t: string) => t.startsWith('SOURCE:'));
      if (tag) return tag.replace('SOURCE:', '');
    }
    if (p.orderId && (p.orderId.startsWith('FO') || p.orderId.startsWith('#FO'))) return 'Fiverr';
    return 'Direct';
  };

  const getSourceRef = (p: any): string => {
    if (p.source_ref) return String(p.source_ref).trim();
    if (Array.isArray(p.tags)) {
      const tag = p.tags.find((t: string) => t.startsWith('REF:'));
      if (tag) return tag.replace('REF:', '').trim();
    }
    if (p.orderId && (p.orderId.startsWith('FO') || p.orderId.startsWith('#FO'))) {
      return p.orderId.replace(/^#/, '').trim();
    }
    return '';
  };

  // Filter projects in the date range
  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      const dateStr = p.orderDate || p.createdAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [projects, dateRange]);

  // Filter invoices strictly belonging to continuous GST series: MC/<FY>/<serial>
  const gstInvoices = useMemo(() => {
    const items = filteredProjects
      .map((p: any) => {
        const orderId = String(p.orderId || '').trim();
        const parsed = parseGstInvoiceNumber(orderId);
        return {
          ...p,
          parsedSerial: parsed?.serial ?? null,
          parsedFy: parsed?.fy ?? null,
          isGstSeries: Boolean(parsed),
          invoiceNo: orderId,
          source: getSource(p),
          sourceRef: getSourceRef(p),
          isCancelled: isCancelled(p),
        };
      })
      .filter((p) => p.isGstSeries);

    // Sort by serial number ascending
    items.sort((a, b) => (a.parsedSerial || 0) - (b.parsedSerial || 0));
    return items;
  }, [filteredProjects]);

  // Compute Table 13 Metrics: From, To, Total, Cancelled, Net Issued, Gaps
  const table13Summary = useMemo(() => {
    if (gstInvoices.length === 0) {
      return {
        from: 'N/A',
        to: 'N/A',
        total: 0,
        cancelledCount: 0,
        netIssued: 0,
        gaps: [] as string[],
        hasGaps: false,
      };
    }

    const serials = gstInvoices.map((i) => i.parsedSerial as number);
    const minSerial = Math.min(...serials);
    const maxSerial = Math.max(...serials);
    const fy = gstInvoices[0].parsedFy || selectedFy;

    const fromInvoice = formatGstInvoiceNumber(fy, minSerial);
    const toInvoice = formatGstInvoiceNumber(fy, maxSerial);
    const totalCount = maxSerial - minSerial + 1;

    const cancelledCount = gstInvoices.filter((i) => i.isCancelled).length;
    const netIssued = totalCount - cancelledCount;

    // Detect missing numbers in the serial range
    const serialSet = new Set(serials);
    const gaps: string[] = [];
    for (let s = minSerial; s <= maxSerial; s++) {
      if (!serialSet.has(s)) {
        gaps.push(formatGstInvoiceNumber(fy, s));
      }
    }

    return {
      from: fromInvoice,
      to: toInvoice,
      total: totalCount,
      cancelledCount,
      netIssued,
      gaps,
      hasGaps: gaps.length > 0,
    };
  }, [gstInvoices, selectedFy]);

  // Export CSV Handler
  const handleExportCsv = () => {
    if (gstInvoices.length === 0) {
      alert('No GST invoices found in the selected period to export.');
      return;
    }

    const headers = [
      'GST Invoice No',
      'Date',
      'Source',
      'Source Ref',
      'Client',
      'Amount (USD)',
      'Amount (INR)',
      'Status',
      'Cancelled',
    ];

    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = gstInvoices.map((inv) => {
      const dateStr = inv.orderDate ? inv.orderDate.split('T')[0] : (inv.createdAt ? inv.createdAt.split('T')[0] : '');
      const revCurr = (inv.revenueCurrency || 'USD').toUpperCase();
      const revVal = parseFloat(inv.revenue || '0');
      const usdAmount = revCurr === 'USD' || revCurr === '$' ? revVal.toFixed(2) : '';
      const inrAmount = revCurr === 'INR' || revCurr === '₹' ? revVal.toFixed(2) : '';

      return [
        escapeCsv(inv.invoiceNo),
        escapeCsv(dateStr),
        escapeCsv(inv.source),
        escapeCsv(inv.sourceRef),
        escapeCsv(inv.client || 'Client'),
        escapeCsv(usdAmount),
        escapeCsv(inrAmount),
        escapeCsv(inv.status || 'Active'),
        escapeCsv(inv.isCancelled ? 'YES' : 'NO'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `GST_Table13_${selectedFy}_${periodPreset}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 xl:p-12">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/" className="text-stone-400 hover:text-white text-xs font-bold transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Dashboard
              </Link>
              <span className="text-stone-600 text-xs">/</span>
              <span className="text-[#F59E0B] text-xs font-bold uppercase tracking-wider">Statutory Tax Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-headline tracking-tight uppercase">
              GST Table 13: Documents Issued
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Continuous outward supply invoice series verification, gap detection, and statutory GST return summary.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCsv}
              disabled={gstInvoices.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-amber-400 text-black font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Period Selector Card */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F59E0B] text-xl">calendar_month</span>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">Filing Period Selection</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Financial Year:</span>
              <select
                value={selectedFy}
                onChange={(e) => setSelectedFy(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-[#F59E0B] focus:border-[#F59E0B] outline-none"
              >
                <option value="26-27">FY 2026-27</option>
                <option value="27-28">FY 2027-28</option>
                <option value="25-26">FY 2025-26</option>
              </select>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { id: 'full_fy', label: 'Full FY' },
              { id: 'this_month', label: 'Current Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'q1', label: 'Q1 (Apr–Jun)' },
              { id: 'q2', label: 'Q2 (Jul–Sep)' },
              { id: 'q3', label: 'Q3 (Oct–Dec)' },
              { id: 'q4', label: 'Q4 (Jan–Mar)' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setPeriodPreset(preset.id as any)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  periodPreset === preset.id
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#F59E0B] shadow-sm'
                    : 'bg-black/40 border-white/5 text-stone-400 hover:text-white hover:border-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Picker */}
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-stone-400">
            <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Active Window:</span>
            <span className="font-mono text-white bg-white/5 px-2.5 py-1 rounded border border-white/5">
              {dateRange.start.toLocaleDateString('en-GB')} — {dateRange.end.toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>

        {/* GST Table 13 Statutory Summary Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Tile 1: From */}
          <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#F59E0B]/30 transition-all shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">From (Serial Start)</span>
            <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1.5 truncate">
              {table13Summary.from}
            </p>
            <p className="text-[10px] text-stone-500 mt-1 font-medium">First outward invoice number in period</p>
          </div>

          {/* Tile 2: To */}
          <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#F59E0B]/30 transition-all shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">To (Serial End)</span>
            <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1.5 truncate">
              {table13Summary.to}
            </p>
            <p className="text-[10px] text-stone-500 mt-1 font-medium">Last outward invoice number in period</p>
          </div>

          {/* Tile 3: Total Number */}
          <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-[#F59E0B]/30 transition-all shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Total Number</span>
            <p className="text-xl sm:text-2xl font-black font-mono text-[#F59E0B] mt-1.5">
              {table13Summary.total}
            </p>
            <p className="text-[10px] text-stone-500 mt-1 font-medium">Formula: (To - From + 1)</p>
          </div>

          {/* Tile 4: Cancelled */}
          <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-red-500/30 transition-all shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Cancelled</span>
            <p className="text-xl sm:text-2xl font-black font-mono text-red-400 mt-1.5">
              {table13Summary.cancelledCount}
            </p>
            <p className="text-[10px] text-stone-500 mt-1 font-medium">Retained in continuous sequence</p>
          </div>

          {/* Tile 5: Net Issued */}
          <div className="bg-zinc-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Net Issued</span>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1.5">
              {table13Summary.netIssued}
            </p>
            <p className="text-[10px] text-stone-500 mt-1 font-medium">Formula: (Total - Cancelled)</p>
          </div>
        </div>

        {/* Gap Detection Alert Banner */}
        {table13Summary.hasGaps ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 shadow-lg">
            <span className="material-symbols-outlined text-amber-400 text-2xl shrink-0">warning</span>
            <div>
              <h3 className="text-sm font-black text-amber-300 uppercase tracking-wide">
                Invoice Sequence Gaps Detected ({table13Summary.gaps.length} missing numbers)
              </h3>
              <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                Statutory GST rules require continuous numbering with zero skipped serial numbers. The following numbers appear in the range but have no recorded invoice:
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {table13Summary.gaps.map((gap) => (
                  <span key={gap} className="px-2 py-0.5 rounded bg-black/60 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300 font-bold shadow-sm">
            <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
            Continuous Sequence Intact: Zero gaps detected in this filing period.
          </div>
        )}

        {/* Invoices Table View */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F59E0B]">receipt_long</span>
              <h3 className="font-headline font-black text-sm sm:text-base text-white uppercase tracking-tight">
                Outward Invoices in Selected Period ({gstInvoices.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              GST MC Series Only
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/60 text-stone-400 font-label text-[10px] uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">GST Invoice No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Source Ref</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-500 font-medium">
                      Loading statutory GST records...
                    </td>
                  </tr>
                ) : gstInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-500 font-medium">
                      No continuous GST invoices found in the selected date window.
                    </td>
                  </tr>
                ) : (
                  gstInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        inv.isCancelled ? 'opacity-60 bg-red-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap">
                        <span className="text-[#F59E0B]">{inv.invoiceNo}</span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-400 whitespace-nowrap">
                        {inv.orderDate ? inv.orderDate.split('T')[0] : (inv.createdAt ? inv.createdAt.split('T')[0] : 'N/A')}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {inv.source === 'Fiverr' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1dbf73]/15 border border-[#1dbf73]/30 text-[#1dbf73] font-bold text-[9px] uppercase tracking-wider">
                            Fiverr
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-stone-300 font-bold text-[9px] uppercase tracking-wider">
                            Direct
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-400 whitespace-nowrap">
                        {inv.sourceRef ? (
                          <span className="text-[10px] text-zinc-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {inv.sourceRef}
                          </span>
                        ) : (
                          <span className="text-stone-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-white font-bold truncate max-w-[150px]">
                        {inv.client || 'Client'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-right text-stone-200 whitespace-nowrap">
                        {inv.revenueCurrency === 'INR' || inv.revenueCurrency === '₹' ? '₹' : '$'}
                        {parseFloat(inv.revenue || '0').toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {inv.isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                            Issued
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => window.open(`/api/projects/${inv.id}/invoice?print=true`, '_blank')}
                          title="Print / View Invoice"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-[#F59E0B]/20 text-stone-400 hover:text-[#F59E0B] transition-all text-[10px] font-bold"
                        >
                          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
