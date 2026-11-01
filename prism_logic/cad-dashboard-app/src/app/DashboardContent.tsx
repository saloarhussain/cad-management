import React, { useState, useEffect, useMemo, useRef } from 'react';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import { searchProducts, Product, Platform } from '@/lib/productSearchMock';
import CountdownTimer from '@/components/CountdownTimer';
import { useAuth } from '@/components/AuthProvider';
import { PLATFORM_CONFIG, getCurrencySymbol, GLOBAL_CURRENCIES } from '@/lib/config';

interface DashboardContentProps {
  loading?: boolean;
  dataReady?: boolean;
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
  allRates?: Record<string, number>;
}

export default function DashboardContent({
  loading = false,
  dataReady,
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
  setEndDate,
  allRates
}: DashboardContentProps) {
  const isFiguresLoading = loading || (dataReady !== undefined && !dataReady);
  const { user } = useAuth();
  const isFounder = user?.email === PLATFORM_CONFIG.FOUNDER_EMAIL;

  const activeProjectsList = (allProjects || []).filter((p: any) => {
    const s = p.status?.toLowerCase() || '';
    return !s.includes('complete') && !s.includes('done') && !s.includes('delivered');
  });

  const activeClientsCount = new Set(
    activeProjectsList
      .map((p: any) => p.client)
      .filter((c: any) => c && c.trim() !== '')
  ).size;

  const activeDesignersCount = new Set(
    activeProjectsList
      .map((p: any) => p.designer)
      .filter((d: any) => d && d.trim() !== '')
  ).size;

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isPendingJobsExpanded, setIsPendingJobsExpanded] = useState(false);
  const [isDeadlinesExpanded, setIsDeadlinesExpanded] = useState(false);

  // --- DYNAMIC EARNINGS OVERVIEW STATE & REAL DATA CALCULATIONS ---
  const [earningsViewMode, setEarningsViewMode] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [selectedEarningsYear, setSelectedEarningsYear] = useState<number>(() => new Date().getFullYear());
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setIsYearDropdownOpen(false);
      }
    };
    if (isYearDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isYearDropdownOpen]);

  // Safely extract date from project
  const getProjectCreationDate = (p: any): Date => {
    if (p.createdAt) {
      const d = new Date(p.createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    if (p.orderDate) {
      const d = new Date(p.orderDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (p.id && !isNaN(Number(p.id)) && Number(p.id) > 1000000000000) {
      const d = new Date(Number(p.id));
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Convert project currency to current display currency
  const convertToDisplayCurrency = (amount: number, fromCurrencyStr?: string) => {
    if (!amount || isNaN(amount)) return 0;
    const targetSymbol = stats.currency || '₹';
    const fromCode = GLOBAL_CURRENCIES.find(c => c.symbol === fromCurrencyStr || c.code === fromCurrencyStr)?.code || (fromCurrencyStr === '₹' ? 'INR' : 'USD');
    const targetCode = GLOBAL_CURRENCIES.find(c => c.symbol === targetSymbol || c.code === targetSymbol)?.code || (targetSymbol === '₹' ? 'INR' : 'USD');

    if (fromCode === targetCode) return Math.round(amount);
    const rateFrom = (allRates && allRates[fromCode]) || (fromCode === 'INR' ? 83.5 : 1);
    const rateTarget = (allRates && allRates[targetCode]) || (targetCode === 'INR' ? 83.5 : 1);
    return Math.round((amount / rateFrom) * rateTarget);
  };

  // Available years from project history
  const availableEarningsYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const curYear = new Date().getFullYear();
    yearsSet.add(curYear);
    yearsSet.add(curYear - 1);
    (allProjects || []).forEach(p => {
      const d = getProjectCreationDate(p);
      yearsSet.add(d.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allProjects]);

  const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Monthly dataset for selected year
  const monthlyEarningsData = useMemo(() => {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth();

    const months = MONTH_NAMES_SHORT.map((name, idx) => ({
      label: name,
      fullLabel: `${name} ${selectedEarningsYear}`,
      index: idx,
      value: 0,
      projectCount: 0,
      isFuture: selectedEarningsYear === curYear ? idx > curMonth : selectedEarningsYear > curYear,
    }));

    (allProjects || []).forEach(p => {
      const d = getProjectCreationDate(p);
      if (d.getFullYear() === selectedEarningsYear) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          const rev = parseFloat(p.revenue || p.paidAmount || '0');
          if (!isNaN(rev) && rev > 0) {
            months[m].value += convertToDisplayCurrency(rev, p.revenueCurrency || '$');
            months[m].projectCount += 1;
          }
        }
      }
    });

    return months;
  }, [allProjects, selectedEarningsYear, stats.currency, allRates]);

  // Yearly dataset for last 5 years
  const yearlyEarningsData = useMemo(() => {
    const curYear = new Date().getFullYear();
    const latestYear = Math.max(curYear, ...availableEarningsYears);
    const years = [latestYear - 4, latestYear - 3, latestYear - 2, latestYear - 1, latestYear];

    return years.map((yr, idx) => {
      let value = 0;
      let projectCount = 0;
      (allProjects || []).forEach(p => {
        const d = getProjectCreationDate(p);
        if (d.getFullYear() === yr) {
          const rev = parseFloat(p.revenue || p.paidAmount || '0');
          if (!isNaN(rev) && rev > 0) {
            value += convertToDisplayCurrency(rev, p.revenueCurrency || '$');
            projectCount += 1;
          }
        }
      });

      return {
        label: yr.toString(),
        fullLabel: yr.toString(),
        index: idx,
        value,
        projectCount,
        isFuture: yr > curYear,
      };
    });
  }, [allProjects, availableEarningsYears, stats.currency, allRates]);

  // Active dataset
  const activeEarningsData = earningsViewMode === 'MONTHLY' ? monthlyEarningsData : yearlyEarningsData;

  // Total earned in current view
  const totalEarnedAmount = useMemo(() => {
    return activeEarningsData.reduce((sum, d) => sum + d.value, 0);
  }, [activeEarningsData]);

  // Growth percentage compared to prior period
  const earningsGrowthPercent = useMemo(() => {
    if (earningsViewMode === 'MONTHLY') {
      let prevTotal = 0;
      (allProjects || []).forEach(p => {
        const d = getProjectCreationDate(p);
        if (d.getFullYear() === selectedEarningsYear - 1) {
          const rev = parseFloat(p.revenue || p.paidAmount || '0');
          if (!isNaN(rev) && rev > 0) {
            prevTotal += convertToDisplayCurrency(rev, p.revenueCurrency || '$');
          }
        }
      });
      if (prevTotal > 0) {
        return ((totalEarnedAmount - prevTotal) / prevTotal) * 100;
      }
      return totalEarnedAmount > 0 ? 100 : 0;
    } else {
      if (yearlyEarningsData.length >= 2) {
        const last = yearlyEarningsData[yearlyEarningsData.length - 1].value;
        const prev = yearlyEarningsData[yearlyEarningsData.length - 2].value;
        if (prev > 0) return ((last - prev) / prev) * 100;
        return last > 0 ? 100 : 0;
      }
      return 0;
    }
  }, [earningsViewMode, selectedEarningsYear, totalEarnedAmount, allProjects, yearlyEarningsData, stats.currency, allRates]);

  // Best performing period
  const bestEarningsPeriod = useMemo(() => {
    let best = activeEarningsData[0] || { label: '—', value: 0 };
    activeEarningsData.forEach(d => {
      if (d.value > best.value) best = d;
    });
    return best;
  }, [activeEarningsData]);

  // Average per period
  const averagePeriodValue = useMemo(() => {
    if (earningsViewMode === 'MONTHLY') {
      const isCurYear = selectedEarningsYear === new Date().getFullYear();
      const elapsedMonths = isCurYear ? (new Date().getMonth() + 1) : 12;
      return elapsedMonths > 0 ? Math.round(totalEarnedAmount / elapsedMonths) : 0;
    } else {
      return activeEarningsData.length > 0 ? Math.round(totalEarnedAmount / activeEarningsData.length) : 0;
    }
  }, [earningsViewMode, selectedEarningsYear, totalEarnedAmount, activeEarningsData]);

  // Projected earnings
  const projectedEarningsValue = useMemo(() => {
    if (earningsViewMode === 'MONTHLY') {
      const isCurYear = selectedEarningsYear === new Date().getFullYear();
      if (isCurYear) {
        const elapsed = new Date().getMonth() + 1;
        const remaining = 12 - elapsed;
        return totalEarnedAmount + (averagePeriodValue * remaining);
      } else if (selectedEarningsYear > new Date().getFullYear()) {
        return averagePeriodValue * 12;
      }
      return totalEarnedAmount;
    } else {
      return Math.round(averagePeriodValue * 1.15);
    }
  }, [earningsViewMode, selectedEarningsYear, totalEarnedAmount, averagePeriodValue]);

  // Dynamic Y ceiling for scaling
  const dynamicYCeiling = useMemo(() => {
    const rawMax = Math.max(...activeEarningsData.map(d => d.value), 0);
    if (rawMax <= 0) return 30000;
    const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const rounded = Math.ceil(rawMax / mag) * mag;
    return Math.max(rounded, 1000);
  }, [activeEarningsData]);

  // Format tick numbers (e.g. 30k, 20k, 10k, 0)
  const formatChartTick = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return val.toString();
  };

  // SVG Coordinates calculation (500x90)
  const computedChartPoints = useMemo(() => {
    const count = activeEarningsData.length;
    return activeEarningsData.map((d, i) => {
      const x = count > 1 ? (i / (count - 1)) * 500 : 250;
      const ratio = Math.min(1, Math.max(0, d.value / dynamicYCeiling));
      const y = 78 - (ratio * 66); // y=78 is zero line, y=12 is peak
      return { ...d, x, y };
    });
  }, [activeEarningsData, dynamicYCeiling]);

  // Default active index (current month if current year, or peak month)
  const defaultHighlightIndex = useMemo(() => {
    if (earningsViewMode === 'MONTHLY') {
      const curYear = new Date().getFullYear();
      if (selectedEarningsYear === curYear) {
        return Math.min(new Date().getMonth(), computedChartPoints.length - 1);
      } else if (selectedEarningsYear < curYear) {
        let bestIdx = 0;
        computedChartPoints.forEach((p, i) => {
          if (p.value > computedChartPoints[bestIdx].value) bestIdx = i;
        });
        return bestIdx;
      } else {
        return 0;
      }
    } else {
      return computedChartPoints.length - 1;
    }
  }, [earningsViewMode, selectedEarningsYear, computedChartPoints]);

  const activeHighlightIndex = hoveredPointIdx !== null ? hoveredPointIdx : defaultHighlightIndex;
  const activeChartPoint = computedChartPoints[activeHighlightIndex] || computedChartPoints[0];

  // SVG Paths generation with smooth cubic bezier curves
  const { areaSvgPath, lineSvgPath, projectedSvgPath } = useMemo(() => {
    if (computedChartPoints.length === 0) return { areaSvgPath: '', lineSvgPath: '', projectedSvgPath: '' };

    const generateBezierCurve = (pts: { x: number; y: number }[]) => {
      if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}` : '';
      let str = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const midX = ((p0.x + p1.x) / 2).toFixed(1);
        str += ` C ${midX},${p0.y.toFixed(1)} ${midX},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
      }
      return str;
    };

    // Actual line up to defaultHighlightIndex
    const actualPoints = computedChartPoints.slice(0, defaultHighlightIndex + 1);
    const linePath = generateBezierCurve(actualPoints);

    let areaPath = '';
    if (actualPoints.length > 0) {
      const lastActual = actualPoints[actualPoints.length - 1];
      areaPath = `${linePath} L ${lastActual.x.toFixed(1)},90 L 0,90 Z`;
    }

    // Projected future line (from defaultHighlightIndex to end)
    const futurePoints = computedChartPoints.slice(defaultHighlightIndex);
    const projectedPath = futurePoints.length > 1 ? generateBezierCurve(futurePoints) : '';

    return { areaSvgPath: areaPath, lineSvgPath: linePath, projectedSvgPath: projectedPath };
  }, [computedChartPoints, defaultHighlightIndex]);

  // Tooltip horizontal percentage
  const tooltipHorizontalPercent = useMemo(() => {
    if (!activeChartPoint) return 50;
    const ratio = activeChartPoint.x / 500;
    return Math.min(88, Math.max(12, ratio * 100));
  }, [activeChartPoint]);


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
        InvoiceNo: p.orderId || `M${p.id ? p.id.toString().slice(0, 5).padStart(5, '0') : '10001'}`,
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
        { wch: 18 }, // InvoiceNo
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
                <h4 className="text-[11px] font-bold text-white tracking-wider">Payouts Outstanding</h4>
                <p className="text-[11px] font-bold text-red-400/80 tracking-wider">You have {stats.payoutsDueCount} completed projects pending designer payment</p>
              </div>
            </div>
            <Link href="/projects" className="w-full sm:w-auto text-center px-4 py-2.5 bg-red-500 text-white text-[11px] font-bold tracking-wider rounded-lg hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/20">
              Pay Now
            </Link>
          </div>
        )}

        {/* Welcome Section */}
        <section className="mt-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-headline text-[20px] sm:text-[24px] font-extrabold tracking-tight text-on-surface leading-none">Data Overview</h1>
              <p className="text-[11px] font-bold text-on-surface-variant tracking-wider mt-1.5">Strategic Dashboard</p>
            </div>

            {/* Quick Stats Chips (Desktop View only, shown inline with title) */}
            <div className="hidden md:flex items-center gap-3">
              <div className="bg-surface-container rounded-full px-4 py-2 flex items-center justify-center gap-1.5 border border-white/5 min-w-0">
                <span className="material-symbols-outlined text-[#F59E0B] text-[16px] sm:text-[18px] shrink-0">person</span>
                {isFiguresLoading ? (
                  <span className="inline-block w-24 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
                ) : (
                  <span className="text-[11px] font-bold text-on-surface tracking-wide truncate animate-in fade-in duration-300">
                    {stats.totalClients} Clients <span className="text-[#F59E0B]">({activeClientsCount} Active)</span>
                  </span>
                )}
              </div>
              <div className="bg-surface-container rounded-full px-4 py-2 flex items-center justify-center gap-1.5 border border-white/5 min-w-0">
                <span className="material-symbols-outlined text-[#2DD4BF] text-[16px] sm:text-[18px] shrink-0">groups</span>
                {isFiguresLoading ? (
                  <span className="inline-block w-24 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
                ) : (
                  <span className="text-[11px] font-bold text-on-surface tracking-wide truncate animate-in fade-in duration-300">
                    {stats.totalDesigners} Team <span className="text-[#2DD4BF]">({activeDesignersCount} Active)</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Chips (Mobile View only, shown stacked below title) */}
          <div className="grid grid-cols-2 gap-2 w-full md:hidden">
            <div className="bg-surface-container rounded-full px-3 py-2 flex items-center justify-center gap-1.5 border border-white/5 w-full min-w-0">
              <span className="material-symbols-outlined text-[#F59E0B] text-[16px] sm:text-[18px] shrink-0">person</span>
              {isFiguresLoading ? (
                <span className="inline-block w-20 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
              ) : (
                <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-bold text-on-surface tracking-wide truncate animate-in fade-in duration-300">
                  {stats.totalClients} Clients <span className="text-[#F59E0B]">({activeClientsCount} Active)</span>
                </span>
              )}
            </div>
            <div className="bg-surface-container rounded-full px-3 py-2 flex items-center justify-center gap-1.5 border border-white/5 w-full min-w-0">
              <span className="material-symbols-outlined text-[#2DD4BF] text-[16px] sm:text-[18px] shrink-0">groups</span>
              {isFiguresLoading ? (
                <span className="inline-block w-20 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
              ) : (
                <span className="text-[9px] xs:text-[10px] sm:text-[11px] font-bold text-on-surface tracking-wide truncate animate-in fade-in duration-300">
                  {stats.totalDesigners} Team <span className="text-[#2DD4BF]">({activeDesignersCount} Active)</span>
                </span>
              )}
            </div>
          </div>

          {/* Actions & Filters */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
              <p className="text-[11px] font-bold text-on-surface-variant tracking-wider">
                Viewing: <span className="text-on-surface">{formatSelectedDate()}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Date Filter Dropdown */}
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-lg border border-white/5 text-on-surface-variant hover:text-on-surface transition-colors active:scale-95 text-[10px] font-bold tracking-wider"
              >
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                <span className="uppercase">{filterMode === 'day' ? 'DAILY' : filterMode === 'month' ? 'MONTHLY' : filterMode === 'year' ? 'YEARLY' : 'CUSTOM'}</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="w-8 h-8 flex items-center justify-center bg-surface-container rounded-lg border border-white/5 text-on-surface-variant hover:text-[#F59E0B] transition-colors active:scale-95"
                title="Export to Excel"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
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
                      className={`flex-1 min-w-[60px] py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === mode ? 'bg-[#F59E0B] text-zinc-950 shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
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
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#F59E0B]/50 transition-all color-scheme-dark"
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
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#F59E0B]/50 transition-all"
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
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#F59E0B]/50 transition-all"
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
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#F59E0B]/50 transition-all"
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
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#F59E0B]/50 transition-all color-scheme-dark"
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
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-[#F59E0B]/50 transition-all color-scheme-dark"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-full py-4 rounded-xl electric-gradient text-zinc-950 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-[#F59E0B]/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
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
                    <Link key={p.id} href={`/projects/${p.id}`} className="p-3 bg-zinc-900 border border-white/5 rounded-xl flex flex-col gap-2 hover:border-[#F59E0B]/50 hover:bg-zinc-800/50 transition-all cursor-pointer group">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <p className="text-[4.5px] font-black text-on-surface-variant tracking-widest opacity-60">Order ID: {p.id}</p>
                          <p className="text-[8px] font-bold text-on-surface-variant tracking-widest opacity-60">
                            {selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? 'Expense' : 'Revenue'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-headline font-extrabold text-on-surface text-sm leading-tight truncate group-hover:text-[#F59E0B] transition-colors" title={p.title}>
                              {p.title}
                            </h4>
                            <p className="text-[10px] text-on-surface-variant font-medium mt-1 truncate">
                              <span className="opacity-50">{selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? 'Designer: ' : 'Client: '}</span>
                              <span className="font-bold text-on-surface-variant">{selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? (p.designer || 'Unassigned') : p.client}</span>
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <div className={`font-headline font-extrabold px-2.5 py-1 rounded border text-xs ${
                              selectedMetric === 'Expenses' || selectedMetric === 'Payouts Due' ? 'border-zinc-500 text-white' : 'border-[#F59E0B] text-[#F59E0B]'
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
          <div onClick={() => !isFiguresLoading && handleCardClick('Total Revenue')} className="col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-transparent shadow-2xl group active:scale-[0.98] transition-all cursor-pointer">
            {isFiguresLoading ? (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 lg:p-6 border border-white/5 relative overflow-hidden skeleton-card">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-2.5 w-24 bg-white/10 rounded-md skeleton-shimmer"></div>
                  <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="h-8 w-32 sm:w-36 bg-white/10 rounded-lg skeleton-shimmer"></div>
                  <div className="h-6 w-14 bg-white/10 rounded-full skeleton-shimmer flex-shrink-0"></div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 skeleton-shimmer"></div>
                  <div className="h-2.5 w-28 bg-white/10 rounded skeleton-shimmer"></div>
                </div>
              </div>
            ) : (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 lg:p-6 border border-white/5 relative overflow-hidden animate-in fade-in duration-300">
                {/* Info Tooltip */}
                <div 
                  className="absolute top-3 right-3 z-30 group/tooltip"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-white/30 hover:text-[#F59E0B] text-sm cursor-help transition-colors select-none">
                    info
                  </span>
                  <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                    <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                      Total revenue earned from projects created in this period (both paid and unpaid by clients).
                    </p>
                  </div>
                </div>
                <div className="relative z-10">
                  <p className="text-[11px] font-bold text-on-surface-variant tracking-wider mb-2">Total Revenue</p>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-2xl sm:text-3xl lg:text-2xl font-headline font-black text-white tracking-tighter leading-none truncate">
                      {stats.currency}{stats.totalRevenue.toLocaleString()}
                    </h3>
                    <div className="px-2 py-1 bg-[#F59E0B]/10 rounded-full border border-[#F59E0B]/20 flex-shrink-0">
                      <span className="text-[11px] font-bold text-[#F59E0B]">+{margin}%</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                    <p className="text-[11px] font-bold text-on-surface-variant tracking-wider opacity-60">Performance: {filterMode.charAt(0).toUpperCase() + filterMode.slice(1)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pending Card */}
          <div onClick={() => !isFiguresLoading && handleCardClick('Pending')} className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent shadow-xl group active:scale-[0.98] transition-all cursor-pointer">
            {isFiguresLoading ? (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden skeleton-card">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-2.5 w-16 bg-white/10 rounded-md skeleton-shimmer"></div>
                  <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
                </div>
                <div className="h-7 w-24 bg-white/10 rounded-lg skeleton-shimmer mb-3"></div>
                <div className="h-2 w-14 bg-white/10 rounded skeleton-shimmer"></div>
              </div>
            ) : (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden animate-in fade-in duration-300">
                {/* Info Tooltip */}
                <div 
                  className="absolute top-3 right-3 z-30 group/tooltip"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-white/30 hover:text-[#F59E0B] text-sm cursor-help transition-colors select-none">
                    info
                  </span>
                  <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                    <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                      Total revenue from active, in-progress projects (representing your upcoming pipeline).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className="text-[11px] font-bold text-on-surface-variant tracking-wider">Pending</p>
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                </div>
                <h3 className="text-lg sm:text-xl font-headline font-black text-[#F59E0B] tracking-tight truncate">
                  {stats.currency}{stats.pendingRevenue.toLocaleString()}
                </h3>
                <p className="text-[11px] font-bold text-orange-500 tracking-wider mt-2">Pipeline</p>
              </div>
            )}
          </div>

          {/* Costs Card */}
          <div onClick={() => !isFiguresLoading && handleCardClick('Expenses')} className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-zinc-500/20 to-transparent shadow-xl group active:scale-[0.98] transition-all cursor-pointer">
            {isFiguresLoading ? (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden skeleton-card">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-2.5 w-16 bg-white/10 rounded-md skeleton-shimmer"></div>
                  <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
                </div>
                <div className="h-7 w-20 bg-white/10 rounded-lg skeleton-shimmer mb-3"></div>
                <div className="h-2 w-20 bg-white/10 rounded skeleton-shimmer"></div>
              </div>
            ) : (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden animate-in fade-in duration-300">
                {/* Info Tooltip */}
                <div 
                  className="absolute top-3 right-3 z-30 group/tooltip"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-white/30 hover:text-[#F59E0B] text-sm cursor-help transition-colors select-none">
                    info
                  </span>
                  <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                    <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                      Total designer payouts for projects in this period (both paid and pending/unpaid).
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-on-surface-variant tracking-wider mb-1">Expenses</p>
                <h3 className="text-lg sm:text-xl font-headline font-black text-white tracking-tight truncate">
                  {stats.currency}{stats.totalExpense.toLocaleString()}
                </h3>
                <p className="text-[11px] font-bold text-on-surface-variant tracking-wider mt-2 opacity-60">Designer Payouts</p>
              </div>
            )}
          </div>

          {/* Payouts Due Card */}
          <div onClick={() => !isFiguresLoading && handleCardClick('Payouts Due')} className={`col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br ${stats.payoutsDue > 0 ? 'from-red-500/30 to-transparent' : 'from-zinc-700/20 to-transparent'} shadow-2xl group active:scale-[0.98] transition-all cursor-pointer`}>
            {isFiguresLoading ? (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden skeleton-card">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-2.5 w-20 bg-white/10 rounded-md skeleton-shimmer"></div>
                  <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="h-7 w-24 bg-white/10 rounded-lg skeleton-shimmer"></div>
                  <div className="h-6 w-20 bg-white/10 rounded-xl skeleton-shimmer flex-shrink-0"></div>
                </div>
                <div className="h-2 w-24 bg-white/10 rounded skeleton-shimmer mt-3"></div>
              </div>
            ) : (
              <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden animate-in fade-in duration-300">
                {/* Info Tooltip */}
                <div 
                  className="absolute top-3 right-3 z-30 group/tooltip"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="material-symbols-outlined text-white/30 hover:text-[#F59E0B] text-sm cursor-help transition-colors select-none">
                    info
                  </span>
                  <div className="absolute right-0 top-full mt-1.5 w-52 p-3 rounded-xl bg-zinc-950/95 border border-white/10 shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 pointer-events-none z-40 backdrop-blur-md">
                    <p className="text-[10px] leading-relaxed text-zinc-300 font-medium normal-case tracking-normal text-left font-sans">
                      Total outstanding payouts due to designers for all completed/delivered projects.
                    </p>
                  </div>
                </div>
                <div className="relative z-10">
                  <p className="text-[11px] font-bold text-on-surface-variant tracking-wider mb-1">Payouts Due</p>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-lg sm:text-xl font-headline font-black tracking-tight ${stats.payoutsDue > 0 ? 'text-red-500' : 'text-white'} truncate`}>
                      {stats.currency}{stats.payoutsDue.toLocaleString()}
                    </h3>
                    <div className="flex-shrink-0">
                      <div className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl border ${stats.payoutsDue > 0 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-white/5 border-white/10 text-on-surface-variant'}`}>
                        <span className="text-[11px] font-bold tracking-wider">{stats.payoutsDueCount} {stats.payoutsDueCount === 1 ? 'Pending' : 'Pending'}</span>
                        {stats.payoutsDue > 0 && <span className="flex h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-on-surface-variant tracking-wider mt-2 opacity-60">Outstanding Payouts</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Grid: Pending Jobs, Deadlines & Earn CADONCE Points */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Column 1: Pending Jobs Count Card */}
          <section className="space-y-4">
            <div className="flex justify-between items-center px-2 shrink-0">
              <h3 className="font-headline font-bold text-lg tracking-tight">Pending Jobs</h3>
            </div>
            
            <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 overflow-hidden transition-all duration-300">
              {isFiguresLoading ? (
                <div className="p-6 flex items-center justify-between w-full skeleton-card">
                  <div className="space-y-2">
                    <div className="h-7 w-20 bg-white/10 rounded-lg skeleton-shimmer"></div>
                    <div className="h-2 w-14 bg-white/10 rounded skeleton-shimmer"></div>
                  </div>
                  <div className="h-8 w-28 bg-white/10 rounded-lg skeleton-shimmer"></div>
                </div>
              ) : (
                <div className="p-6 flex items-center justify-between w-full animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-headline font-black text-[#F59E0B] tracking-tight leading-none">
                      {stats.activeProjects} {stats.activeProjects === 1 ? 'Job' : 'Jobs'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsPendingJobsExpanded(!isPendingJobsExpanded)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#F59E0B]/30 rounded-lg text-[11px] font-bold text-[#F59E0B] tracking-wider hover:bg-[#F59E0B]/10 transition-colors active:scale-95 duration-150 focus:outline-none"
                  >
                    <span>{isPendingJobsExpanded ? 'Hide Details' : 'Show Details'}</span>
                    <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isPendingJobsExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                </div>
              )}

              {/* Collapsible Panel */}
              {!isFiguresLoading && isPendingJobsExpanded && (
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
                                    <span className="material-symbols-outlined text-[#F59E0B] text-xl">precision_manufacturing</span>
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
                                className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B] rounded-lg text-[9px] font-black text-white uppercase tracking-widest transition-all duration-200"
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
              {isFiguresLoading ? (
                <div className="p-6 flex items-center justify-between w-full skeleton-card">
                  <div className="space-y-2">
                    <div className="h-7 w-24 bg-white/10 rounded-lg skeleton-shimmer"></div>
                    <div className="h-2 w-16 bg-white/10 rounded skeleton-shimmer"></div>
                  </div>
                  <div className="h-8 w-28 bg-white/10 rounded-lg skeleton-shimmer"></div>
                </div>
              ) : (
                <div className="p-6 flex items-center justify-between w-full animate-in fade-in duration-300">
                  <div>
                    <h3 className="text-xl font-headline font-black text-[#F59E0B] tracking-tight leading-none">
                      {upcomingDeadlines.length} {upcomingDeadlines.length === 1 ? 'Deadline' : 'Deadlines'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsDeadlinesExpanded(!isDeadlinesExpanded)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-[#F59E0B]/30 rounded-lg text-[11px] font-bold text-[#F59E0B] tracking-wider hover:bg-[#F59E0B]/10 transition-colors active:scale-95 duration-150 focus:outline-none"
                  >
                    <span>{isDeadlinesExpanded ? 'Hide Details' : 'Show Details'}</span>
                    <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isDeadlinesExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                </div>
              )}

              {/* Collapsible Panel */}
              {!isFiguresLoading && isDeadlinesExpanded && (
                <div className="border-t border-white/5 bg-black/10 px-6 py-4 space-y-3 animate-in slide-in-from-top-4 duration-300 w-full">
                  {upcomingDeadlines.length === 0 ? (
                    <div className="text-center py-4 text-[11px] font-bold text-white/20 tracking-wider w-full">
                      No immediate deadlines
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar w-full">
                      {upcomingDeadlines.map((p: any, idx: number) => {
                        const colors = ['from-[#F59E0B] to-[#FF8A00]', 'bg-outline-variant', 'bg-secondary'];
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
                              className="px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[#F59E0B]/30 hover:bg-[#F59E0B]/10 hover:text-[#F59E0B] rounded-lg text-[9px] font-black text-white uppercase tracking-widest transition-all duration-200"
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
                  className="text-[11px] font-bold text-[#F59E0B] tracking-wider px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg hover:border-[#F59E0B]/30 transition-all focus:outline-none"
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
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-3 pr-20 py-2.5 text-[10px] text-white font-bold placeholder:text-white/20 focus:outline-none focus:border-[#F59E0B]/50 transition-all"
                    />
                    <button
                      onClick={handleAddByLink}
                      disabled={isFetchingLink}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#F59E0B] text-zinc-950 text-[11px] font-bold tracking-wider rounded-lg disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isFetchingLink ? 'Fetching...' : 'Fetch'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 min-h-[160px] w-full flex-1">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center w-full py-10 opacity-30 animate-pulse">
                    <span className="text-[11px] font-bold tracking-wider">Synchronizing...</span>
                  </div>
                ) : products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center w-full py-10 rounded-xl text-center">
                    <span className="material-symbols-outlined text-[#F59E0B] text-2xl mb-2 opacity-50">shopping_basket</span>
                    <span className="text-[11px] font-bold text-white/40 tracking-wider">No Products Curated</span>
                    {isFounder && <p className="text-[11px] font-bold text-white/20 mt-1">Add products to begin</p>}
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
                        className="flex flex-col flex-shrink-0 w-32 rounded-xl bg-surface-container border border-outline-variant/10 shadow-lg overflow-hidden transition-all hover:border-[#F59E0B]/30 hover:scale-[1.02] active:scale-95 cursor-pointer block"
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
                            <p className="text-xs font-headline font-extrabold text-[#F59E0B]">
                              {new Intl.NumberFormat(product.countryCode === 'IN' ? 'en-IN' : 'en-US', {
                                style: 'currency',
                                currency: product.currency || (product.countryCode === 'IN' ? 'INR' : 'USD'),
                                maximumFractionDigits: product.currency === 'INR' ? 0 : 2
                              }).format(product.price)}
                            </p>
                          </div>
                          <div className="flex flex-nowrap gap-1">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-[#F59E0B]/30 text-[7px] font-black text-[#F59E0B] uppercase tracking-tighter truncate">+{estimatedPoints} Pts</span>
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

        {/* Earnings Overview Section */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-bold text-lg tracking-tight text-white">Earnings Overview</h3>
              <span className="material-symbols-outlined text-[#F59E0B] text-[18px]">trending_up</span>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-white/5 w-fit">
              <button 
                onClick={() => setEarningsViewMode('MONTHLY')}
                className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider transition-all ${earningsViewMode === 'MONTHLY' ? 'bg-[#F59E0B] text-zinc-950 font-bold shadow-sm' : 'text-on-surface-variant hover:text-white'}`}
              >
                MONTHLY
              </button>
              <button 
                onClick={() => setEarningsViewMode('YEARLY')}
                className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider transition-all ${earningsViewMode === 'YEARLY' ? 'bg-[#F59E0B] text-zinc-950 font-bold shadow-sm' : 'text-on-surface-variant hover:text-white'}`}
              >
                YEARLY
              </button>
              
              {earningsViewMode === 'MONTHLY' && (
                <>
                  <div className="h-3 w-px bg-white/10 mx-1" />
                  <div className="relative" ref={yearDropdownRef}>
                    <button 
                      onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                      className="flex items-center gap-0.5 px-2 py-1 rounded text-[10px] font-bold tracking-wider text-[#F59E0B] hover:bg-white/5 transition-all"
                    >
                      <span>{selectedEarningsYear}</span>
                      <span className={`material-symbols-outlined text-[13px] transition-transform duration-200 ${isYearDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>

                    {isYearDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-24 bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {availableEarningsYears.map(yr => (
                          <button
                            key={yr}
                            onClick={() => {
                              setSelectedEarningsYear(yr);
                              setIsYearDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${selectedEarningsYear === yr ? 'text-[#F59E0B] bg-[#F59E0B]/10' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 p-6 relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 relative z-10">
              <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-headline font-black text-white tracking-tight">
                    {stats.currency}{totalEarnedAmount.toLocaleString()}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 ${earningsGrowthPercent >= 0 ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                    <span className="material-symbols-outlined text-[12px]">
                      {earningsGrowthPercent >= 0 ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                    {earningsGrowthPercent >= 0 ? '+' : ''}{earningsGrowthPercent.toFixed(1)}%
                  </span>
                </div>
                <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider mt-1">
                  {earningsViewMode === 'MONTHLY' 
                    ? `Total Earned • Jan - ${MONTH_NAMES_SHORT[defaultHighlightIndex]} ${selectedEarningsYear}`
                    : `Total Earned • ${yearlyEarningsData[0]?.label || ''} - ${yearlyEarningsData[yearlyEarningsData.length - 1]?.label || ''}`
                  }
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-white/5 w-fit">
                <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                <span className="text-[10px] text-[#F59E0B] uppercase tracking-wider font-bold">
                  {totalEarnedAmount > 0 ? 'Active Cycle' : 'Live Tracking'}
                </span>
              </div>
            </div>

            <div className="relative w-full h-44 my-2 select-none">
              {/* Y-axis Ticks */}
              <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] font-mono text-on-surface-variant/50 leading-none py-0.5">
                <span>{formatChartTick(dynamicYCeiling)}</span>
                <span>{formatChartTick(Math.round(dynamicYCeiling * 2 / 3))}</span>
                <span>{formatChartTick(Math.round(dynamicYCeiling / 3))}</span>
                <span>0</span>
              </div>

              {/* Background Grid Lines */}
              <div className="absolute left-9 right-0 top-1 bottom-6 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-b border-dashed border-white/5" />
                <div className="w-full border-b border-dashed border-white/5" />
                <div className="w-full border-b border-dashed border-white/5" />
                <div className="w-full border-b border-white/10" />
              </div>

              {/* Interactive Slices for Hover */}
              <div className="absolute left-9 right-0 top-0 bottom-6 flex z-30">
                {computedChartPoints.map((pt, idx) => (
                  <div
                    key={pt.label}
                    onMouseEnter={() => setHoveredPointIdx(idx)}
                    onMouseLeave={() => setHoveredPointIdx(null)}
                    className="flex-1 h-full cursor-pointer relative group flex justify-center"
                  >
                    <div className={`w-px h-full bg-[#F59E0B]/25 transition-opacity duration-150 ${hoveredPointIdx === idx ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                ))}
              </div>

              {/* SVG Curve & Gradients */}
              <svg className="absolute left-9 right-0 top-1 h-[120px] w-[calc(100%-36px)] overflow-visible pointer-events-none" preserveAspectRatio="none" viewBox="0 0 500 90">
                <defs>
                  <linearGradient id="earningsGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                    <stop offset="70%" stopColor="#F59E0B" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor="#2DD4BF" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                  <filter height="140%" id="glow" width="140%" x="-20%" y="-20%">
                    <feDropShadow dx="0" dy="2" floodColor="#F59E0B" floodOpacity="0.4" stdDeviation="3" />
                  </filter>
                </defs>

                {/* Shaded Area under actual curve */}
                {areaSvgPath && (
                  <path d={areaSvgPath} fill="url(#earningsGrad)" />
                )}

                {/* Glowing Solid Line for Actuals */}
                {lineSvgPath && (
                  <path d={lineSvgPath} fill="none" filter="url(#glow)" stroke="url(#lineGrad)" strokeLinecap="round" strokeWidth="2.5" />
                )}

                {/* Projected Line for Future Months */}
                {projectedSvgPath && (
                  <path d={projectedSvgPath} fill="none" opacity="0.5" stroke="#909097" strokeDasharray="3,3" strokeLinecap="round" strokeWidth="1.5" />
                )}

                {/* Active / Hovered Point Marker */}
                {activeChartPoint && (
                  <>
                    <circle cx={activeChartPoint.x} cy={activeChartPoint.y} fill="#F59E0B" r="5" stroke="#131315" strokeWidth="2" />
                    <circle cx={activeChartPoint.x} cy={activeChartPoint.y} fill="#FFFFFF" r="2" />
                  </>
                )}
              </svg>

              {/* Dynamic Floating Tooltip */}
              {activeChartPoint && (
                <div 
                  className="absolute top-0 -translate-y-2 bg-zinc-900/95 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#F59E0B]/40 shadow-lg shadow-black/40 flex items-center gap-1.5 z-20 pointer-events-none transition-all duration-150"
                  style={{ 
                    left: `calc(36px + ${tooltipHorizontalPercent * 0.01 * (100 - 6)}%)`, 
                    transform: 'translateX(-50%)' 
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[10px] text-[#F59E0B] font-bold tracking-tight whitespace-nowrap">
                    {activeChartPoint.label}: {stats.currency}{activeChartPoint.value.toLocaleString()}
                    {activeChartPoint.projectCount > 0 && ` (${activeChartPoint.projectCount} ${activeChartPoint.projectCount === 1 ? 'proj' : 'projs'})`}
                  </span>
                </div>
              )}

              {/* X-axis Labels */}
              <div className="absolute left-9 right-0 bottom-0 flex justify-between text-[10px] font-bold text-on-surface-variant/60 uppercase pt-1">
                {computedChartPoints.map((pt, idx) => {
                  const isCurrent = idx === defaultHighlightIndex;
                  const isHovered = idx === hoveredPointIdx;
                  return (
                    <span
                      key={pt.label}
                      onClick={() => setHoveredPointIdx(idx)}
                      className={`cursor-pointer transition-colors ${isHovered || isCurrent ? 'text-[#F59E0B] font-black' : pt.isFuture ? 'opacity-40 hover:opacity-80' : 'hover:text-white'}`}
                    >
                      {pt.label}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Bottom 3 Summary Stats Cards */}
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-4 relative z-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
                  {earningsViewMode === 'MONTHLY' ? 'Monthly Avg' : 'Annual Avg'}
                </span>
                <span className="text-sm font-bold text-white mt-1">
                  {stats.currency}{averagePeriodValue.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col border-x border-white/5 px-4">
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
                  {earningsViewMode === 'MONTHLY' ? 'Best Month' : 'Best Year'}
                </span>
                <span className="text-sm font-bold text-[#F59E0B] mt-1">
                  {stats.currency}{bestEarningsPeriod.value.toLocaleString()}{' '}
                  <span className="text-[10px] font-normal text-on-surface-variant">
                    ({bestEarningsPeriod.label})
                  </span>
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
                  Projected
                </span>
                <span className="text-sm font-bold text-emerald-400 mt-1">
                  {stats.currency}{projectedEarningsValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}

