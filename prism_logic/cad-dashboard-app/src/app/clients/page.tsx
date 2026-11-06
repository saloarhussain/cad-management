"use client";
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { getDb, saveFavoriteClients } from '@/app/actions';
import Avatar from '@/components/Avatar';
import AuthGuard from '@/components/AuthGuard';
import { utils, writeFile } from 'xlsx';

const countryMap: Record<string, { flag: string; code: string }> = {
  'United States': { flag: '🇺🇸', code: 'USA' },
  'United States of America': { flag: '🇺🇸', code: 'USA' },
  'US': { flag: '🇺🇸', code: 'USA' },
  'USA': { flag: '🇺🇸', code: 'USA' },
  'United Kingdom': { flag: '🇬🇧', code: 'GBR' },
  'UK': { flag: '🇬🇧', code: 'GBR' },
  'Great Britain': { flag: '🇬🇧', code: 'GBR' },
  'United Arab Emirates': { flag: '🇦🇪', code: 'UAE' },
  'UAE': { flag: '🇦🇪', code: 'UAE' },
  'India': { flag: '🇮🇳', code: 'IND' },
  'IN': { flag: '🇮🇳', code: 'IND' },
  'Belgium': { flag: '🇧🇪', code: 'BEL' },
  'France': { flag: '🇫🇷', code: 'FRA' },
  'Canada': { flag: '🇨🇦', code: 'CAN' },
  'Australia': { flag: '🇦🇺', code: 'AUS' },
  'Bangladesh': { flag: '🇧🇩', code: 'BGD' },
  'BD': { flag: '🇧🇩', code: 'BGD' },
  'Pakistan': { flag: '🇵🇰', code: 'PAK' },
  'PK': { flag: '🇵🇰', code: 'PAK' },
  'China': { flag: '🇨🇳', code: 'CHN' },
  'CN': { flag: '🇨🇳', code: 'CHN' },
  'Turkey': { flag: '🇹🇷', code: 'TUR' },
  'TR': { flag: '🇹🇷', code: 'TUR' },
  'Vietnam': { flag: '🇻🇳', code: 'VNM' },
  'VN': { flag: '🇻🇳', code: 'VNM' },
  'Europe': { flag: '🇪🇺', code: 'EUR' },
  'EU': { flag: '🇪🇺', code: 'EUR' },
  'Germany': { flag: '🇩🇪', code: 'DEU' },
  'DE': { flag: '🇩🇪', code: 'DEU' },
  'Spain': { flag: '🇪🇸', code: 'ESP' },
  'Italy': { flag: '🇮🇹', code: 'ITA' },
  'Japan': { flag: '🇯🇵', code: 'JPN' },
  'South Korea': { flag: '🇰🇷', code: 'KOR' },
  'Brazil': { flag: '🇧🇷', code: 'BRA' },
  'Mexico': { flag: '🇲🇽', code: 'MEX' },
  'Singapore': { flag: '🇸🇬', code: 'SGP' },
  'Monaco': { flag: '🇲🇨', code: 'MCO' },
  'MC': { flag: '🇲🇨', code: 'MCO' },
  'GLOBAL': { flag: '🌐', code: 'GLB' }
};

const months = [
  { value: 0, label: 'January', short: 'Jan' },
  { value: 1, label: 'February', short: 'Feb' },
  { value: 2, label: 'March', short: 'Mar' },
  { value: 3, label: 'April', short: 'Apr' },
  { value: 4, label: 'May', short: 'May' },
  { value: 5, label: 'June', short: 'Jun' },
  { value: 6, label: 'July', short: 'Jul' },
  { value: 7, label: 'August', short: 'Aug' },
  { value: 8, label: 'September', short: 'Sep' },
  { value: 9, label: 'October', short: 'Oct' },
  { value: 10, label: 'November', short: 'Nov' },
  { value: 11, label: 'December', short: 'Dec' },
];

function computeProjectRevenueUSD(p: any, countryCode: string, liveRates: Record<string, number>): number {
  let amount = parseFloat(p.revenue) || 0;
  let code = 'USD';
  
  if (p.revenueCurrency === '£' || p.revenueCurrency === 'GBP') code = 'GBP';
  else if (p.revenueCurrency === '€' || p.revenueCurrency === 'EUR') code = 'EUR';
  else if (p.revenueCurrency === '₹' || p.revenueCurrency === 'INR') code = 'INR';
  else if (p.revenueCurrency === 'A$' || p.revenueCurrency === 'AUD') code = 'AUD';
  else if (p.revenueCurrency === 'C$' || p.revenueCurrency === 'CAD') code = 'CAD';
  else if (p.revenueCurrency && p.revenueCurrency.length === 3 && p.revenueCurrency !== 'USD') {
    code = p.revenueCurrency.toUpperCase();
  } else if (!p.revenueCurrency || p.revenueCurrency === '$') {
    if (countryCode === 'GBR') code = 'GBP';
    else if (['FRA', 'DEU', 'ITA', 'ESP', 'BEL'].includes(countryCode)) code = 'EUR';
    else if (countryCode === 'IND') code = 'INR';
    else if (countryCode === 'AUS') code = 'AUD';
    else if (countryCode === 'CAN') code = 'CAD';
  }
  
  if (code !== 'USD') {
    if (liveRates[code]) {
      amount = amount / liveRates[code];
    } else {
      if (code === 'GBP') amount *= 1.27;
      else if (code === 'EUR') amount *= 1.08;
      else if (code === 'INR') amount *= 0.012;
    }
  }
  return amount;
}

const getClientDate = (c: any): Date | null => {
  const dStr = c.createdAt || c.created_at;
  if (dStr) {
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) return d;
  }
  if (c.id && !isNaN(Number(c.id)) && Number(c.id) > 1000000000000) {
    const d = new Date(Number(c.id));
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

const initialMockClients: any[] = [];

export default function ClientsPage() {
  const [realClients, setRealClients] = useState<any[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('none'); 
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [earningBracket, setEarningBracket] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Date filtering state: 'all' | 'month' | 'year' | 'custom'
  const [dateFilterMode, setDateFilterMode] = useState<'all' | 'month' | 'year' | 'custom'>('all');
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dateBasis, setDateBasis] = useState<'any' | 'joined' | 'activity'>('any');

  useEffect(() => {
    const savedFavs = localStorage.getItem('cadonce_favorite_clients');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {}
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, clientId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newFavs = favorites.includes(clientId) 
      ? favorites.filter(id => id !== clientId)
      : [...favorites, clientId];
      
    setFavorites(newFavs);
    localStorage.setItem('cadonce_favorite_clients', JSON.stringify(newFavs));
    
    saveFavoriteClients(newFavs).catch(err => {
      console.error('Failed to sync favorites to DB:', err);
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      let liveRates: Record<string, number> = {};
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates) liveRates = data.rates;
        }
      } catch (err) {
        console.error('Failed to fetch live exchange rates', err);
      }
      setExchangeRates(liveRates);

      const db = await getDb();
      if (db.clients) {
        const projects = db.projects || [];
        const formatted = db.clients.map((c: any) => {
          let rawCountry = c.country;
          if (!rawCountry && c.mobile?.startsWith('+91')) {
            rawCountry = 'India';
          }
          const countryKey = (rawCountry || 'GLOBAL').trim().toLowerCase();
          const matchedKey = Object.keys(countryMap).find(k => k.toLowerCase() === countryKey);
          const cInfo = matchedKey ? countryMap[matchedKey] : countryMap['GLOBAL'];
          
          // Data Correction: In the current database, it appears 'name' stores the company 
          // and 'companyName' stores the person's name for some entries.
          const personName = c.companyName || c.name;
          const companyLabel = c.companyName ? c.name : 'Independent Partner';

          // Calculate Real Project Stats
          const clientProjects = projects.filter((p: any) => 
            p.client === c.name || 
            p.client === c.companyName || 
            p.client === personName
          );

          const doneCount = clientProjects.filter((p: any) => ['Approved', 'Completed', 'Complete'].includes(p.status)).length;
          const liveCount = clientProjects.length - doneCount;
          const totalEarnings = clientProjects.reduce((sum: number, p: any) => {
            return sum + computeProjectRevenueUSD(p, cInfo.code, liveRates);
          }, 0);

          return {
            ...c,
            name: personName,
            contact: companyLabel,
            location: cInfo.code,
            flag: cInfo.flag,
            earningsValue: totalEarnings,
            earnings: `$${totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            done: doneCount,
            live: liveCount,
            allTimeEarningsValue: totalEarnings,
            allTimeEarnings: `$${totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            allTimeDone: doneCount,
            allTimeLive: liveCount,
            rawProjects: clientProjects,
            icon: 'person',
            color: 'text-primary-fixed',
            borderColor: 'border-white/5'
          };
        });
        setRealClients(formatted);
      }
      
      if (db.settings?.favorite_clients) {
        setFavorites(db.settings.favorite_clients);
        localStorage.setItem('cadonce_favorite_clients', JSON.stringify(db.settings.favorite_clients));
      }

      setIsLoading(false);
    };
    fetchData();
  }, []);

  const allClients = useMemo(() => [...initialMockClients, ...realClients], [realClients]);

  const countries = useMemo(() => ['All', ...new Set(allClients.map(c => c.location))], [allClients]);
  const earningsBrackets = ['All', '>$100k', '<$100k'];

  // Dynamically compute available years based on client join dates and project records
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsSet = new Set<number>([currentYear, currentYear - 1, currentYear - 2]);
    allClients.forEach(c => {
      const d = getClientDate(c);
      if (d) yearsSet.add(d.getFullYear());
      (c.rawProjects || []).forEach((p: any) => {
        const pd = p.createdAt || p.orderDate;
        if (pd) {
          const pDate = new Date(pd);
          if (!isNaN(pDate.getTime())) yearsSet.add(pDate.getFullYear());
        }
      });
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allClients]);

  // Date range boundaries
  const dateRangeBounds = useMemo(() => {
    if (dateFilterMode === 'all') return null;

    if (dateFilterMode === 'month') {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    if (dateFilterMode === 'year') {
      const year = selectedDate.getFullYear();
      const start = new Date(year, 0, 1, 0, 0, 0, 0);
      const end = new Date(year, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }

    if (dateFilterMode === 'custom') {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    return null;
  }, [dateFilterMode, selectedDate, startDate, endDate]);

  const getDateFilterLabel = () => {
    if (dateFilterMode === 'all') return 'All Time';
    if (dateFilterMode === 'month') {
      return selectedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    if (dateFilterMode === 'year') {
      return selectedDate.getFullYear().toString();
    }
    if (dateFilterMode === 'custom') {
      const s = new Date(startDate);
      const e = new Date(endDate);
      return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`;
    }
    return 'All Time';
  };

  const filteredClients = useMemo(() => {
    const processed = allClients.map(client => {
      if (!dateRangeBounds) {
        return {
          ...client,
          displayEarningsValue: client.earningsValue,
          displayEarnings: client.earnings,
          displayDone: client.done,
          displayLive: client.live,
          periodProjectsCount: (client.rawProjects || []).length,
          matchesDate: true
        };
      }

      const { start, end } = dateRangeBounds;
      
      const joinDate = getClientDate(client);
      const joinedInRange = joinDate ? (joinDate >= start && joinDate <= end) : false;

      const inRangeProjects = (client.rawProjects || []).filter((p: any) => {
        const pDateStr = p.createdAt || p.orderDate;
        if (!pDateStr) return false;
        const pd = new Date(pDateStr);
        if (isNaN(pd.getTime())) return false;
        return pd >= start && pd <= end;
      });

      const hasActivityInRange = inRangeProjects.length > 0;

      let matchesDate = false;
      if (dateBasis === 'joined') {
        matchesDate = joinedInRange;
      } else if (dateBasis === 'activity') {
        matchesDate = hasActivityInRange;
      } else {
        matchesDate = joinedInRange || hasActivityInRange;
      }

      const periodEarningsValue = inRangeProjects.reduce((sum: number, p: any) => {
        return sum + computeProjectRevenueUSD(p, client.location, exchangeRates);
      }, 0);

      const periodDone = inRangeProjects.filter((p: any) =>
        ['Approved', 'Completed', 'Complete'].includes(p.status)
      ).length;
      const periodLive = inRangeProjects.length - periodDone;

      return {
        ...client,
        displayEarningsValue: periodEarningsValue,
        displayEarnings: `$${periodEarningsValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        displayDone: periodDone,
        displayLive: periodLive,
        periodProjectsCount: inRangeProjects.length,
        joinedInRange,
        matchesDate
      };
    });

    let result = processed.filter(client => {
      if (!client.matchesDate) return false;

      const searchStr = `${client.name} ${client.contact}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      const matchesCountry = selectedCountry === 'All' || client.location === selectedCountry;
      const valToCompare = dateFilterMode === 'all' ? client.earningsValue : client.displayEarningsValue;
      const matchesEarnings = earningBracket === 'All' || 
                            (earningBracket === '>$100k' ? valToCompare >= 100000 : valToCompare < 100000);
      const matchesFavorites = showFavoritesOnly ? favorites.includes(client.id) : true;
      
      return matchesSearch && matchesCountry && matchesEarnings && matchesFavorites;
    });

    if (sortOrder === 'favorites') {
      result.sort((a, b) => {
        const aFav = favorites.includes(a.id) ? 1 : 0;
        const bFav = favorites.includes(b.id) ? 1 : 0;
        return bFav - aFav;
      });
    } else if (sortOrder === 'earnings') {
      result.sort((a, b) => b.displayEarningsValue - a.displayEarningsValue);
    } else if (sortOrder === 'projects') {
      result.sort((a, b) => (b.displayDone + b.displayLive) - (a.displayDone + a.displayLive));
    }

    return result;
  }, [allClients, dateRangeBounds, dateFilterMode, dateBasis, exchangeRates, searchQuery, selectedCountry, earningBracket, showFavoritesOnly, favorites, sortOrder]);

  const handleExport = () => {
    const dataToExport = filteredClients.map(client => ({
      'Customer Name': client.name,
      'Company/Contact': client.contact,
      'Email': client.email,
      'Mobile': client.mobile,
      'Location': client.location,
      ...(dateFilterMode !== 'all' ? {
        'Period Revenue': client.displayEarnings,
        'Period Tasks Done': client.displayDone,
        'Period Tasks Live': client.displayLive,
        'Filter Window': getDateFilterLabel(),
      } : {}),
      'Total Revenue (All Time)': client.allTimeEarnings || client.earnings,
      'Done Projects (All Time)': client.allTimeDone ?? client.done,
      'Live Projects (All Time)': client.allTimeLive ?? client.live,
      'Created At': client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'
    }));

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Clients");
    
    const wscols = [
      { wch: 25 },
      { wch: 25 },
      { wch: 30 },
      { wch: 20 },
      { wch: 10 },
      ...(dateFilterMode !== 'all' ? [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 20 }] : []),
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    const modeTag = dateFilterMode !== 'all' ? `_${dateFilterMode}` : '';
    writeFile(workbook, `CADONCE_Clients_Export${modeTag}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const isAnyFilterActive = selectedCountry !== 'All' || earningBracket !== 'All' || sortOrder !== 'none' || dateFilterMode !== 'all';

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      <AuthGuard>
        {isLoading ? (
          <div className="min-h-screen bg-[#161308] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-[0.3em] animate-pulse">Initializing Studio...</span>
            </div>
          </div>
        ) : (
          <>
            <main className="pb-32 px-4 sm:px-8 xl:px-12 w-full pt-20">
          {/* Enhanced Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
            <div>
              <h2 className="font-headline text-2xl font-black tracking-tight text-white uppercase italic">
                Client <span className="text-[#F59E0B]">Intelligence</span>
              </h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">High-value partner relationship management</p>
            </div>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto">
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">Total Partners</p>
                <p className="text-sm font-black text-white">{filteredClients.length}</p>
              </div>
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">
                  {dateFilterMode === 'all' ? 'Active Value' : 'Period Value'}
                </p>
                <p className="text-sm font-black text-[#F59E0B]">
                  ${filteredClients.reduce((acc, c) => acc + (dateFilterMode === 'all' ? c.earningsValue : c.displayEarningsValue), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="hidden sm:block px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl">
                <p className="text-[7px] font-black text-yellow-400 uppercase tracking-widest mb-0.5">
                  {dateFilterMode === 'all' ? 'Status' : 'Temporal Scope'}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[8px] font-black text-white uppercase truncate max-w-[120px]">
                    {dateFilterMode === 'all' ? 'Operational' : getDateFilterLabel()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Filters & Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-[#F59E0B] transition-colors">search</span>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white placeholder:text-neutral-600 focus:bg-white/10 focus:border-[#F59E0B]/50 outline-none transition-all" 
                placeholder="Search by company, name, or location..." 
                type="text"
              />
            </div>
            <div className="grid grid-cols-3 md:flex md:flex-row gap-2">
              <button 
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`w-full px-2 md:px-6 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 active:scale-95 ${showFavoritesOnly ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400 shadow-lg shadow-yellow-400/10' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                title="Show Favorites Only"
              >
                <span className={`material-symbols-outlined text-sm ${showFavoritesOnly ? 'fill-1' : ''}`} style={showFavoritesOnly ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Favs</span>
              </button>
              <button 
                onClick={() => setShowFilters(true)}
                className={`w-full px-2 md:px-6 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 active:scale-95 ${isAnyFilterActive ? 'bg-[#F59E0B] border-[#F59E0B] text-black font-black shadow-lg shadow-yellow-400/20' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span className="text-[10px] font-black uppercase tracking-widest truncate">
                  {dateFilterMode !== 'all' ? `Filters (${getDateFilterLabel()})` : 'Filters'}
                </span>
              </button>
              <button 
                onClick={handleExport}
                className="w-full px-2 md:px-6 py-3 rounded-2xl border border-white/10 bg-white/5 text-white/60 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
                title="Export to Excel"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Export</span>
              </button>
              <Link href="/clients/new" className="col-span-3 md:col-span-1 w-full electric-gradient text-black px-4 md:px-6 py-3 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 active:scale-95 shadow-xl uppercase tracking-widest shadow-yellow-400/20 hover:brightness-110 whitespace-nowrap">
                <span className="material-symbols-outlined text-sm">person_add</span>
                ADD CLIENT
              </Link>
            </div>
          </div>

          {/* Active Filter Chips Bar */}
          {(dateFilterMode !== 'all' || selectedCountry !== 'All' || sortOrder !== 'none' || showFavoritesOnly) && (
            <div className="flex items-center gap-2 mb-6 flex-wrap animate-in fade-in duration-200">
              <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Active Filters:</span>
              
              {dateFilterMode !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] rounded-full text-[9px] font-black uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                  {getDateFilterLabel()}
                  <button 
                    onClick={() => setDateFilterMode('all')} 
                    className="hover:text-white transition-colors ml-1 w-3.5 h-3.5 rounded-full bg-[#F59E0B]/20 inline-flex items-center justify-center text-[10px]"
                    title="Remove date filter"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedCountry !== 'All' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-400/15 border border-cyan-400/40 text-cyan-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[12px]">public</span>
                  {selectedCountry}
                  <button 
                    onClick={() => setSelectedCountry('All')} 
                    className="hover:text-white transition-colors ml-1 w-3.5 h-3.5 rounded-full bg-cyan-400/20 inline-flex items-center justify-center text-[10px]"
                    title="Remove country filter"
                  >
                    ×
                  </button>
                </span>
              )}

              {sortOrder !== 'none' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[12px]">sort</span>
                  Hierarchy: {sortOrder}
                  <button 
                    onClick={() => setSortOrder('none')} 
                    className="hover:text-white transition-colors ml-1 w-3.5 h-3.5 rounded-full bg-white/20 inline-flex items-center justify-center text-[10px]"
                    title="Reset sort"
                  >
                    ×
                  </button>
                </span>
              )}

              {showFavoritesOnly && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  Favorites Only
                  <button 
                    onClick={() => setShowFavoritesOnly(false)} 
                    className="hover:text-white transition-colors ml-1 w-3.5 h-3.5 rounded-full bg-yellow-400/20 inline-flex items-center justify-center text-[10px]"
                    title="Show all"
                  >
                    ×
                  </button>
                </span>
              )}

              <button
                onClick={() => {
                  setDateFilterMode('all');
                  setSelectedCountry('All');
                  setSortOrder('none');
                  setShowFavoritesOnly(false);
                }}
                className="text-[9px] font-black text-neutral-400 hover:text-white uppercase tracking-widest underline underline-offset-4 ml-1 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Strategic Client Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredClients.map((client, idx) => (
              <Link 
                key={client.id || idx} 
                href={`/clients/${client.id}`}
                className="group relative bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 hover:bg-white/[0.05] hover:border-[#F59E0B]/30 transition-all duration-500 overflow-hidden shadow-2xl block"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#F59E0B]/10 transition-colors" />

                <div className="flex justify-between items-start mb-6 relative z-20">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/10 group-hover:ring-[#F59E0B]/50 transition-all">
                      <Avatar
                        email={client.email}
                        name={client.name}
                        website={client.website}
                        size={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="font-headline font-black text-white text-lg leading-tight group-hover:text-[#F59E0B] transition-colors">{client.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest">{client.contact}</span>
                        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          <span className="text-[10px] leading-none">{client.flag}</span>
                          <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">{client.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => toggleFavorite(e, client.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${favorites.includes(client.id) ? 'bg-yellow-400/20 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 'bg-white/5 text-white/20 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                    >
                      <span className="material-symbols-outlined text-sm" style={favorites.includes(client.id) ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
                    </button>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-[#F59E0B] group-hover:bg-[#F59E0B]/10 transition-all">
                      <span className="material-symbols-outlined text-sm">arrow_outward</span>
                    </div>
                  </div>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-2 gap-3 mb-6 relative z-20">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:border-[#F59E0B]/10 transition-colors">
                    <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                      {dateFilterMode === 'all' ? 'Total Revenue' : 'Period Revenue'}
                    </p>
                    <p className="font-headline font-black text-white text-xl tracking-tight leading-none">{client.displayEarnings}</p>
                    {dateFilterMode !== 'all' && (
                      <p className="text-[8px] font-bold text-neutral-400 mt-1 uppercase tracking-wider truncate">
                        All-time: {client.allTimeEarnings}
                      </p>
                    )}
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:border-[#F59E0B]/10 transition-colors flex justify-between items-center">
                    <div>
                      <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">
                        {dateFilterMode === 'all' ? 'Task' : 'Period Tasks'}
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs font-black text-white leading-none">{client.displayDone}</p>
                          <p className="text-[6px] font-bold text-neutral-600 uppercase">Done</p>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="text-center">
                          <p className="text-xs font-black text-[#F59E0B] leading-none">{client.displayLive}</p>
                          <p className="text-[6px] font-bold text-neutral-600 uppercase">Live</p>
                        </div>
                      </div>
                      {dateFilterMode !== 'all' && (
                        <p className="text-[7px] font-bold text-neutral-400 mt-1 uppercase tracking-wider">
                          All-time: {client.allTimeDone + client.allTimeLive} tasks
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-20">
                   <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${client.live > 0 ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-neutral-600'}`} />
                        <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{client.live > 0 ? 'Active Workflow' : 'Dormant'}</span>
                      </div>
                      
                      {/* Mini Contact Icons */}
                      {(client.mobile || client.email) && (
                        <div className="flex items-center gap-3 border-l border-white/10 pl-3 h-4">
                          {client.mobile && (
                            <a href={`https://wa.me/${client.mobile.replace(/[^a-zA-Z0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:scale-125 hover:brightness-110 transition-all flex items-center" onClick={(e) => e.stopPropagation()} title="WhatsApp">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[16px] h-[16px]">
                                <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.146.561 4.237 1.626 6.079L.135 23.518l5.545-1.455c1.78.966 3.784 1.474 5.845 1.474v-.001h.005c6.645 0 12.031-5.385 12.031-12.031S18.675 0 12.031 0zm0 21.579c-1.815 0-3.593-.487-5.147-1.409l-.369-.219-3.826 1.004 1.025-3.73-.24-.382A9.957 9.957 0 0 1 1.954 12.03C1.954 6.471 6.471 1.954 12.03 1.954c2.688 0 5.215 1.047 7.115 2.948A9.969 9.969 0 0 1 22.093 12.03c0 5.559-4.517 10.076-10.062 10.076zm5.513-7.531c-.302-.151-1.789-.882-2.066-.983-.277-.101-.479-.151-.681.151-.202.302-.781.983-.958 1.184-.176.202-.353.227-.655.076-.302-.151-1.275-.47-2.431-1.5-.9-.798-1.506-1.784-1.683-2.086-.176-.302-.019-.465.132-.616.136-.136.302-.353.453-.529.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.529-.076-.151-.681-1.644-.932-2.253-.245-.592-.494-.512-.681-.521l-.58-.009c-.202 0-.529.076-.806.378-.277.302-1.058 1.033-1.058 2.52s1.083 2.923 1.234 3.125c.151.202 2.129 3.25 5.158 4.557.72.311 1.281.496 1.718.636.724.23 1.383.197 1.902.12.583-.086 1.789-.731 2.041-1.436.252-.705.252-1.31.176-1.436-.076-.126-.277-.202-.579-.353z"/>
                              </svg>
                            </a>
                          )}
                          {client.email && (
                            <a href={`mailto:${client.email}`} className="text-white/60 hover:text-white hover:scale-125 transition-all flex items-center" onClick={(e) => e.stopPropagation()} title="Email">
                              <span className="material-symbols-outlined text-[16px] leading-none">mail</span>
                            </a>
                          )}
                        </div>
                      )}
                   </div>
                   <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">ID: {client.id?.slice(-8).toUpperCase()}</span>
                </div>
              </Link>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="col-span-full py-32 text-center">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                  <span className="material-symbols-outlined text-4xl">person_search</span>
                </div>
                <p className="text-white/30 font-bold uppercase tracking-[0.3em] text-xs italic">No matching partner records found</p>
                {isAnyFilterActive && (
                  <button 
                    onClick={() => {
                      setDateFilterMode('all');
                      setSelectedCountry('All');
                      setSortOrder('none');
                      setShowFavoritesOnly(false);
                      setSearchQuery('');
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#F59E0B] text-[10px] font-black uppercase tracking-widest hover:bg-[#F59E0B] hover:text-black transition-all"
                  >
                    Reset All Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Filter Modal (Segment Data / Partner Optimization Protocol) */}
        {showFilters && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowFilters(false)} />
            <div className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
              <div className="p-6 sm:p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#F59E0B]/5 to-transparent shrink-0">
                <div>
                  <h3 className="text-white font-headline font-black text-xl italic uppercase tracking-tighter">Segment Data</h3>
                  <p className="text-neutral-500 text-[8px] uppercase tracking-[0.3em] font-bold">Partner Optimization Protocol</p>
                </div>
                <button onClick={() => setShowFilters(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto no-scrollbar flex-1">
                {/* 1. Sort Order */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block text-left">Hierarchy</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['none', 'favorites', 'earnings', 'projects'].map(opt => (
                      <button 
                        key={opt}
                        onClick={() => setSortOrder(opt)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${sortOrder === opt ? 'bg-[#F59E0B] border-[#F59E0B] text-black shadow-lg shadow-yellow-400/20' : 'bg-white/5 border-white/10 text-neutral-500 hover:text-white'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Temporal Horizon (Date Filter: Month, Year, Custom, All) */}
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Temporal Horizon</label>
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">
                      {dateFilterMode === 'all' ? 'All records' : getDateFilterLabel()}
                    </span>
                  </div>

                  {/* Mode Buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'month', label: 'Month' },
                      { id: 'year', label: 'Year' },
                      { id: 'custom', label: 'Custom' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setDateFilterMode(m.id as any)}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${dateFilterMode === m.id ? 'bg-[#F59E0B] border-[#F59E0B] text-black shadow-lg shadow-yellow-400/20' : 'bg-white/5 border-white/10 text-neutral-500 hover:text-white'}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Month Selection */}
                  {dateFilterMode === 'month' && (
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest">Select Cycle Month</span>
                        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                          {availableYears.map(y => (
                            <button
                              key={y}
                              type="button"
                              onClick={() => {
                                const d = new Date(selectedDate);
                                d.setFullYear(y);
                                setSelectedDate(d);
                              }}
                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${selectedDate.getFullYear() === y ? 'bg-[#F59E0B] text-black font-extrabold' : 'text-neutral-400 hover:text-white'}`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-1.5">
                        {months.map(m => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => {
                              const d = new Date(selectedDate);
                              d.setMonth(m.value);
                              setSelectedDate(d);
                            }}
                            className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${selectedDate.getMonth() === m.value ? 'bg-cyan-400 border-cyan-400 text-black font-extrabold shadow-md shadow-cyan-400/20' : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'}`}
                          >
                            {m.short}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Year Selection */}
                  {dateFilterMode === 'year' && (
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 animate-in fade-in duration-200">
                      <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Select Year Cycle</span>
                      <div className="grid grid-cols-4 gap-2">
                        {availableYears.map(y => (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              const d = new Date(selectedDate);
                              d.setFullYear(y);
                              setSelectedDate(d);
                            }}
                            className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${selectedDate.getFullYear() === y ? 'bg-cyan-400 border-cyan-400 text-black font-extrabold shadow-md shadow-cyan-400/20' : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'}`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Range Selection */}
                  {dateFilterMode === 'custom' && (
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 animate-in fade-in duration-200">
                      <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Custom Window</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block">From</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full bg-[#161308] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#F59E0B]/50 transition-all color-scheme-dark"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block">To</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full bg-[#161308] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#F59E0B]/50 transition-all color-scheme-dark"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date Criteria Filter (Joined Date / Project Activity / Both) */}
                  {dateFilterMode !== 'all' && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest block">Filter Target</label>
                        <span className="text-[7px] text-neutral-400 uppercase">
                          {dateBasis === 'any' ? 'Joined or Active' : dateBasis === 'joined' ? 'Onboarded Date' : 'Active Projects'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { key: 'any', label: 'All Activity' },
                          { key: 'joined', label: 'Joined Date' },
                          { key: 'activity', label: 'Projects Only' }
                        ].map(crit => (
                          <button
                            key={crit.key}
                            type="button"
                            onClick={() => setDateBasis(crit.key as any)}
                            className={`py-2 px-1 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all border ${dateBasis === crit.key ? 'bg-white/20 border-white/40 text-white shadow-sm' : 'bg-white/5 border-white/5 text-neutral-500 hover:text-white'}`}
                          >
                            {crit.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Country Filter */}
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Geographic Node</label>
                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">{selectedCountry}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {countries.map(c => (
                      <button 
                        key={c}
                        onClick={() => setSelectedCountry(c)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCountry === c ? 'bg-cyan-400 border-cyan-400 text-black shadow-md shadow-cyan-400/20' : 'bg-white/5 border-white/10 text-neutral-500 hover:text-white'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 sm:p-8 bg-white/2 border-t border-white/5 flex gap-3 items-center shrink-0">
                {isAnyFilterActive && (
                  <button 
                    onClick={() => {
                      setDateFilterMode('all');
                      setSelectedCountry('All');
                      setSortOrder('none');
                    }}
                    className="px-4 py-5 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Reset
                  </button>
                )}
                <button onClick={() => setShowFilters(false)} className="flex-1 electric-gradient py-5 rounded-2xl text-black font-black uppercase tracking-[0.2em] text-[11px] shadow-lg active:scale-[0.98] transition-transform">
                  Apply Configuration
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}
    </AuthGuard>
    </div>
  );
}
