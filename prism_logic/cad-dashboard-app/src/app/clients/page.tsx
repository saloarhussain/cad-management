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

const initialMockClients: any[] = [];

export default function ClientsPage() {
  const [realClients, setRealClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('none'); 
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [earningBracket, setEarningBracket] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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
              // Infer currency based on client country if not explicitly set to USD
              if (cInfo.code === 'GBR') code = 'GBP';
              else if (['FRA', 'DEU', 'ITA', 'ESP', 'BEL'].includes(cInfo.code)) code = 'EUR';
              else if (cInfo.code === 'IND') code = 'INR';
              else if (cInfo.code === 'AUS') code = 'AUD';
              else if (cInfo.code === 'CAN') code = 'CAD';
            }
            
            if (code !== 'USD') {
              if (liveRates[code]) {
                amount = amount / liveRates[code]; // Rates are relative to USD (e.g., 1 USD = 0.79 GBP)
              } else {
                // Fallbacks if API fails
                if (code === 'GBP') amount *= 1.27;
                else if (code === 'EUR') amount *= 1.08;
                else if (code === 'INR') amount *= 0.012;
              }
            }
            return sum + amount;
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

  const filteredClients = useMemo(() => {
    let result = allClients.filter(client => {
      const searchStr = `${client.name} ${client.contact}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      const matchesCountry = selectedCountry === 'All' || client.location === selectedCountry;
      const matchesEarnings = earningBracket === 'All' || 
                            (earningBracket === '>$100k' ? client.earningsValue >= 100000 : client.earningsValue < 100000);
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
      result.sort((a, b) => b.earningsValue - a.earningsValue);
    } else if (sortOrder === 'projects') {
      result.sort((a, b) => (b.done + b.live) - (a.done + a.live));
    }

    return result;
  }, [allClients, searchQuery, sortOrder, selectedCountry, earningBracket, favorites, showFavoritesOnly]);

  const handleExport = () => {
    const dataToExport = filteredClients.map(client => ({
      'Customer Name': client.name,
      'Company/Contact': client.contact,
      'Email': client.email,
      'Mobile': client.mobile,
      'Location': client.location,
      'Total Revenue': client.earnings,
      'Done Projects': client.done,
      'Live Projects': client.live,
      'Created At': client.createdAt ? new Date(client.createdAt).toLocaleDateString() : 'N/A'
    }));

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Clients");
    
    // Set column widths
    const wscols = [
      { wch: 25 }, // Name
      { wch: 25 }, // Company
      { wch: 30 }, // Email
      { wch: 20 }, // Mobile
      { wch: 10 }, // Location
      { wch: 15 }, // Revenue
      { wch: 10 }, // Done
      { wch: 10 }, // Live
      { wch: 15 }  // Date
    ];
    worksheet['!cols'] = wscols;

    writeFile(workbook, `CADONCE_Clients_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">


      <AuthGuard>
        {isLoading ? (
          <div className="min-h-screen bg-[#161308] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-[#fce003] uppercase tracking-[0.3em] animate-pulse">Initializing Studio...</span>
            </div>
          </div>
        ) : (
          <>
            <main className="pb-32 px-6 max-w-7xl mx-auto pt-20">
          {/* Enhanced Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
            <div>
              <h2 className="font-headline text-2xl font-black tracking-tight text-white uppercase italic">
                Client <span className="text-[#fce003]">Intelligence</span>
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
                <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">Active Value</p>
                <p className="text-sm font-black text-[#fce003]">${filteredClients.reduce((acc, c) => acc + c.earningsValue, 0).toLocaleString()}</p>
              </div>
              <div className="hidden sm:block px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl">
                <p className="text-[7px] font-black text-yellow-400 uppercase tracking-widest mb-0.5">Status</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[8px] font-black text-white uppercase">Operational</span>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Filters & Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="flex-1 relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-[#fce003] transition-colors">search</span>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold text-white placeholder:text-neutral-600 focus:bg-white/10 focus:border-[#fce003]/50 outline-none transition-all" 
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
                className={`w-full px-2 md:px-6 py-3 rounded-2xl border transition-all flex items-center justify-center gap-2 active:scale-95 ${selectedCountry !== 'All' || earningBracket !== 'All' || sortOrder !== 'none' ? 'bg-[#fce003] border-[#fce003] text-black' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
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

          {/* Strategic Client Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client, idx) => (
              <Link 
                key={client.id || idx} 
                href={`/clients/${client.id}`}
                className="group relative bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 hover:bg-white/[0.05] hover:border-[#fce003]/30 transition-all duration-500 overflow-hidden shadow-2xl block"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#fce003]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#fce003]/10 transition-colors" />

                <div className="flex justify-between items-start mb-6 relative z-20">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/10 group-hover:ring-[#fce003]/50 transition-all">
                      <Avatar
                        email={client.email}
                        name={client.name}
                        website={client.website}
                        size={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="font-headline font-black text-white text-lg leading-tight group-hover:text-[#fce003] transition-colors">{client.name}</h3>
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
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-[#fce003] group-hover:bg-[#fce003]/10 transition-all">
                      <span className="material-symbols-outlined text-sm">arrow_outward</span>
                    </div>
                  </div>
                </div>

                {/* KPI Section */}
                <div className="grid grid-cols-2 gap-3 mb-6 relative z-20">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:border-[#fce003]/10 transition-colors">
                    <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Total Revenue</p>
                    <p className="font-headline font-black text-white text-xl tracking-tight leading-none">{client.earnings}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:border-[#fce003]/10 transition-colors flex justify-between items-center">
                    <div>
                      <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Task</p>
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="text-xs font-black text-white leading-none">{client.done}</p>
                          <p className="text-[6px] font-bold text-neutral-600 uppercase">Done</p>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="text-center">
                          <p className="text-xs font-black text-[#fce003] leading-none">{client.live}</p>
                          <p className="text-[6px] font-bold text-neutral-600 uppercase">Live</p>
                        </div>
                      </div>
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
              </div>
            )}
          </div>
        </main>

        {/* Filter Modal */}
        {showFilters && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowFilters(false)} />
            <div className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#fce003]/5 to-transparent">
                <div>
                  <h3 className="text-white font-headline font-black text-xl italic uppercase tracking-tighter">Segment Data</h3>
                  <p className="text-neutral-500 text-[8px] uppercase tracking-[0.3em] font-bold">Partner Optimization Protocol</p>
                </div>
                <button onClick={() => setShowFilters(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Sort Order */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block text-left">Hierarchy</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['none', 'favorites', 'earnings', 'projects'].map(opt => (
                      <button 
                        key={opt}
                        onClick={() => setSortOrder(opt)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${sortOrder === opt ? 'bg-[#fce003] border-[#fce003] text-black shadow-lg shadow-yellow-400/20' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country Filter */}
                <div className="space-y-4 text-left">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Geographic Node</label>
                  <div className="flex flex-wrap gap-2">
                    {countries.map(c => (
                      <button 
                        key={c}
                        onClick={() => setSelectedCountry(c)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCountry === c ? 'bg-cyan-400 border-cyan-400 text-black' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-white/2 border-t border-white/5">
                <button onClick={() => setShowFilters(false)} className="w-full electric-gradient py-5 rounded-2xl text-black font-black uppercase tracking-[0.2em] text-[11px] shadow-lg active:scale-[0.98] transition-transform">
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
