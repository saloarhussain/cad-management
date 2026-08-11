"use client";
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { getDb } from '@/app/actions';
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
  'GLOBAL': { flag: '🌐', code: 'GLB' }
};

const initialMockDesigners: any[] = [];

export default function TeamPage() {
  const [realDesigners, setRealDesigners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('none'); 
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedSkill, setSelectedSkill] = useState('All');
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const db = await getDb();
        if (db.designers) {
          // Map DB fields to component fields
          const formatted = db.designers.map((d: any) => {
            const countryKey = (d.country || 'GLOBAL').trim().toLowerCase();
            const matchedKey = Object.keys(countryMap).find(k => k.toLowerCase() === countryKey);
            const cInfo = matchedKey ? countryMap[matchedKey] : countryMap['GLOBAL'];

            return {
              ...d,
              name: d.fullName || 'Anonymous Designer',
              role: d.specialty || 'Professional Designer',
              experience: d.experience || (Math.floor(Math.random() * 5) + 3) + ' Years Exp',
              lastJob: db.projects?.find((p: any) => 
                d.fullName && (p.designer === d.fullName || p.designer === d.fullName.split(' ')[0])
              ),
              performance: d.performance || 90, 
              tags: d.skills || [d.specialty || 'CAD', 'Designer'],
              avatar: d.avatar || d.avatar_url || null,
              flag: cInfo.flag,
              location: cInfo.code
            };
          });
          setRealDesigners(formatted);
        }
      } catch (err) {
        console.error('Error fetching team data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const allDesigners = useMemo(() => [...initialMockDesigners, ...realDesigners], [realDesigners]);

  const countries = useMemo(() => ['All', ...new Set(allDesigners.map(d => d.location))], [allDesigners]);
  const skills = useMemo(() => ['All', ...new Set(allDesigners.flatMap(d => d.tags))], [allDesigners]);

  const filteredDesigners = useMemo(() => {
    let result = allDesigners.filter(designer => {
      const matchesSearch = designer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          designer.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCountry = selectedCountry === 'All' || designer.location === selectedCountry;
      const matchesSkill = selectedSkill === 'All' || designer.tags.includes(selectedSkill);
      const matchesEmployment = employmentFilter === 'all' || (designer.employmentType || 'Freelancer') === employmentFilter;
      
      return matchesSearch && matchesCountry && matchesSkill && matchesEmployment;
    });

    if (sortOrder === 'performance') {
      result.sort((a, b) => b.performance - a.performance);
    } else if (sortOrder === 'role') {
      result.sort((a, b) => (a.role || '').localeCompare(b.role || ''));
    }

    return result;
  }, [allDesigners, searchQuery, sortOrder, selectedCountry, selectedSkill, employmentFilter]);

  const handleExport = () => {
    const dataToExport = filteredDesigners.map(designer => ({
      'Full Name': designer.name,
      'Specialty': designer.role,
      'Email': designer.email,
      'Mobile': designer.mobile,
      'Country': designer.location,
      'Experience': designer.experience,
      'Employment Type': designer.employmentType || 'Freelancer',
      'Performance (%)': designer.performance,
      'Skills': designer.tags?.join(', ') || 'N/A',
      'Created At': designer.createdAt ? new Date(designer.createdAt).toLocaleDateString() : 'N/A'
    }));

    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Team");
    
    // Set column widths
    const wscols = [
      { wch: 25 }, // Name
      { wch: 25 }, // Specialty
      { wch: 30 }, // Email
      { wch: 20 }, // Mobile
      { wch: 15 }, // Country
      { wch: 15 }, // Experience
      { wch: 15 }, // Type
      { wch: 15 }, // Performance
      { wch: 40 }, // Skills
      { wch: 15 }  // Date
    ];
    worksheet['!cols'] = wscols;

    writeFile(workbook, `CADONCE_Team_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
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
          <main className="pb-32 px-6 max-w-7xl mx-auto pt-20">
        {/* Enhanced Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
          <div>
            <h2 className="font-headline text-2xl font-black tracking-tight text-white uppercase italic">
              Team <span className="text-[#F59E0B]">Intelligence</span>
            </h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">Global workforce deployment & productivity</p>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto">
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">Active Talent</p>
              <p className="text-sm font-black text-white">{allDesigners.length}</p>
            </div>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">Avg Performance</p>
              <p className="text-sm font-black text-[#F59E0B]">
                {Math.round(allDesigners.reduce((acc, d) => acc + (d.performance || 0), 0) / (allDesigners.length || 1))}%
              </p>
            </div>
            <div className="hidden sm:block px-4 py-2 bg-yellow-400/10 border border-yellow-400/20 rounded-xl">
              <p className="text-[7px] font-black text-yellow-400 uppercase tracking-widest mb-0.5">Deployment</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-[8px] font-black text-white uppercase">Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-[#F59E0B] transition-colors">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white placeholder:text-neutral-600 focus:bg-white/10 focus:border-[#F59E0B]/50 outline-none transition-all" 
              placeholder="Search by name, role, or skill..." 
              type="text"
            />
          </div>
          <div className="grid grid-cols-2 md:flex md:flex-row gap-2">
            <button 
              onClick={() => setShowFilters(true)}
              className={`w-full px-2 md:px-6 py-4 rounded-2xl border transition-all flex items-center justify-center gap-2 active:scale-95 ${selectedCountry !== 'All' || selectedSkill !== 'All' || sortOrder !== 'none' ? 'bg-[#F59E0B] border-[#F59E0B] text-black' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-sm">tune</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
            </button>
            <button 
              onClick={handleExport}
              className="w-full px-2 md:px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white/60 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
              title="Export to Excel"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Export</span>
            </button>
            <Link href="/team/new" className="col-span-2 md:col-span-1 w-full electric-gradient text-black px-4 md:px-6 py-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 active:scale-95 shadow-xl uppercase tracking-widest shadow-yellow-400/20 hover:brightness-110">
              <span className="material-symbols-outlined text-sm">person_add</span>
              ADD DESIGNER
            </Link>
          </div>
        </div>

        {/* Strategic Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDesigners.map((designer, idx) => (
            <div key={designer.id || idx} className="group relative bg-white/[0.02] border border-white/5 rounded-[2rem] p-5 hover:bg-white/[0.05] hover:border-[#F59E0B]/30 transition-all duration-500 overflow-hidden shadow-2xl">
              <Link href={`/team/${designer.id}`} className="absolute inset-0 z-10"></Link>
              
              {/* Visual Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#F59E0B]/10 transition-colors" />

              <div className="flex justify-between items-start mb-4 relative z-20">
                <div className="flex gap-3 sm:gap-4 items-center sm:items-start">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full overflow-hidden ring-1 ring-white/10 group-hover:ring-[#F59E0B]/50 transition-all">
                    <Avatar
                      src={designer.avatar}
                      email={designer.email}
                      name={designer.name}
                      size={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-headline font-black text-white text-base sm:text-lg leading-tight group-hover:text-[#F59E0B] transition-colors truncate">{designer.name}</h3>
                      <div className="flex shrink-0 items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        <span className="text-[10px] leading-none">{designer.flag}</span>
                        <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">{designer.location}</span>
                      </div>
                    </div>
                    <p className="text-[#F59E0B]/60 text-[8px] font-black capitalize tracking-[0.2em] mt-1.5 truncate">{designer.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-white/20 text-[7px] font-bold capitalize tracking-widest shrink-0">{designer.experience}</p>
                      <span className="w-1 h-1 bg-white/10 rounded-full shrink-0" />
                      <span className={`text-[7px] font-black capitalize tracking-widest truncate ${designer.employmentType === 'In-House' ? 'text-white/40' : 'text-[#F59E0B]'}`}>
                        {designer.employmentType || 'Freelancer'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 shrink-0 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-[#F59E0B] group-hover:bg-[#F59E0B]/10 transition-all ml-2">
                  <span className="material-symbols-outlined text-sm">badge</span>
                </div>
              </div>

              {/* Performance Indicator */}
              <div className="mb-4 relative z-20">
                <div className="flex justify-between items-end mb-2">
                   <p className="text-[8px] font-black text-neutral-500 capitalize tracking-widest">Performance Protocol</p>
                   <p className="text-xs font-black text-[#F59E0B]">{designer.performance}%</p>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                   <div 
                     className="h-full bg-gradient-to-r from-orange-600 to-[#F59E0B] rounded-full shadow-[0_0_15px_rgba(252,224,3,0.3)] transition-all duration-1000"
                     style={{ width: `${designer.performance}%` }}
                   />
                </div>
              </div>

              {/* Specialization Tags */}
              <div className="flex flex-wrap gap-2 mb-4 relative z-20">
                {designer.tags?.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-white/5 rounded-lg text-[7px] font-black text-white/40 capitalize tracking-widest border border-white/5 group-hover:border-[#F59E0B]/20 transition-colors">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-20">
                 <div className="flex items-center gap-3">
                   {/* Mini Contact Icons */}
                   {(designer.mobile || designer.email) && (
                     <div className="flex items-center gap-3 h-4">
                       {designer.mobile && (
                         <a href={`https://wa.me/${designer.mobile.replace(/[^a-zA-Z0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:scale-125 hover:brightness-110 transition-all flex items-center" onClick={(e) => e.stopPropagation()} title="WhatsApp">
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[16px] h-[16px]">
                             <path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.146.561 4.237 1.626 6.079L.135 23.518l5.545-1.455c1.78.966 3.784 1.474 5.845 1.474v-.001h.005c6.645 0 12.031-5.385 12.031-12.031S18.675 0 12.031 0zm0 21.579c-1.815 0-3.593-.487-5.147-1.409l-.369-.219-3.826 1.004 1.025-3.73-.24-.382A9.957 9.957 0 0 1 1.954 12.03C1.954 6.471 6.471 1.954 12.03 1.954c2.688 0 5.215 1.047 7.115 2.948A9.969 9.969 0 0 1 22.093 12.03c0 5.559-4.517 10.076-10.062 10.076zm5.513-7.531c-.302-.151-1.789-.882-2.066-.983-.277-.101-.479-.151-.681.151-.202.302-.781.983-.958 1.184-.176.202-.353.227-.655.076-.302-.151-1.275-.47-2.431-1.5-.9-.798-1.506-1.784-1.683-2.086-.176-.302-.019-.465.132-.616.136-.136.302-.353.453-.529.151-.176.202-.302.302-.504.101-.202.05-.378-.025-.529-.076-.151-.681-1.644-.932-2.253-.245-.592-.494-.512-.681-.521l-.58-.009c-.202 0-.529.076-.806.378-.277.302-1.058 1.033-1.058 2.52s1.083 2.923 1.234 3.125c.151.202 2.129 3.25 5.158 4.557.72.311 1.281.496 1.718.636.724.23 1.383.197 1.902.12.583-.086 1.789-.731 2.041-1.436.252-.705.252-1.31.176-1.436-.076-.126-.277-.202-.579-.353z"/>
                           </svg>
                         </a>
                       )}
                       {designer.email && (
                         <a href={`mailto:${designer.email}`} className="text-white/60 hover:text-white hover:scale-125 transition-all flex items-center" onClick={(e) => e.stopPropagation()} title="Email">
                           <span className="material-symbols-outlined text-[16px] leading-none">mail</span>
                         </a>
                       )}
                     </div>
                   )}
                 </div>
                 <Link href={`/team/${designer.id}`} className="text-[#F59E0B] text-[8px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline">
                    Dossier
                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                 </Link>
              </div>
            </div>
          ))}
          
          {filteredDesigners.length === 0 && (
            <div className="col-span-full py-32 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 opacity-20">
                <span className="material-symbols-outlined text-4xl">person_search</span>
              </div>
              <p className="text-white/30 font-bold uppercase tracking-[0.3em] text-xs italic">No matching talent found</p>
            </div>
          )}
        </div>
      </main>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowFilters(false)} />
          <div className="relative w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#F59E0B]/5 to-transparent">
              <div>
                <h3 className="text-white font-headline font-black text-xl italic uppercase tracking-tighter">Segment Talent</h3>
                <p className="text-neutral-500 text-[8px] uppercase tracking-[0.3em] font-bold">Designer Allocation Protocol</p>
              </div>
              <button onClick={() => setShowFilters(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block text-left">Classification</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Type', icon: 'hub' },
                    { id: 'In-House', label: 'In-House', icon: 'domain' },
                    { id: 'Freelancer', label: 'Freelance', icon: 'public' }
                  ].map(opt => (
                    <button 
                      key={opt.id}
                      onClick={() => setEmploymentFilter(opt.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${employmentFilter === opt.id ? 'bg-[#F59E0B] border-[#F59E0B] text-stone-900 shadow-lg shadow-yellow-400/20' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                    >
                      <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                      <span className="text-[8px] font-black uppercase">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block text-left">Hierarchy</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: 'Default', icon: 'groups' },
                    { id: 'performance', label: 'Top Perf', icon: 'trending_up' },
                    { id: 'role', label: 'By Role', icon: 'badge' }
                  ].map(opt => (
                    <button 
                      key={opt.id}
                      onClick={() => setSortOrder(opt.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${sortOrder === opt.id ? 'bg-[#F59E0B] border-[#F59E0B] text-stone-900 shadow-lg shadow-yellow-400/20' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                    >
                      <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                      <span className="text-[8px] font-black uppercase">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 text-left">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Geographic Node</label>
                <div className="flex flex-wrap gap-2">
                  {countries.map(c => (
                    <button 
                      key={c}
                      onClick={() => setSelectedCountry(c)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedCountry === c ? 'bg-[#F59E0B] border-[#F59E0B] text-black' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 text-left">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Specialization</label>
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <button 
                      key={s}
                      onClick={() => setSelectedSkill(s)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedSkill === s ? 'bg-[#F59E0B]/30 border-[#F59E0B]/50 text-[#F59E0B]' : 'bg-white/5 border-white/10 text-neutral-500'}`}
                    >
                      {s}
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
  );
}

