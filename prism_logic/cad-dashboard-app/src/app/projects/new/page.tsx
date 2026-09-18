"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { saveProject, getDb } from '@/app/actions';
import AuthGuard from '@/components/AuthGuard';
import { CloudinaryUpload } from '@/components/CloudinaryUpload';

const PRESET_SKILLS = [
  'High-Poly',
  'Ray-Tracing',
  'Pavé Setting',
  'Matrix Gold',
  'Rhino 3D',
  'SubD Modeling',
  'Enameling',
  'Bezel Setting',
  'Micro-Prong'
];

const DatePickerFacade = ({ label, isDeadline, name }: { label: string; isDeadline?: boolean; name?: string }) => {
  const [date, setDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch (e) {
        // Native fallback works because of absolute positioning over the icon
      }
    }
  };

  // Convert native YYYY-MM-DD to requested DD/MM/YYYY format
  const displayDate = date ? date.split('-').reverse().join('/') : "DD/MM/YYYY";

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center justify-between">
        <label className={`font-label text-[10px] font-bold uppercase tracking-wider ${isDeadline ? 'text-[#F59E0B]' : 'text-stone-400'}`}>
          {label}
        </label>
        {isDeadline && (
          <span className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Critical Target
          </span>
        )}
      </div>
      <div 
        onClick={handleClick}
        className={`w-full bg-black/40 border ${
          isDeadline 
            ? 'border-amber-500/30 hover:border-amber-500/50 focus-within:border-amber-500' 
            : 'border-white/10 hover:border-white/20 focus-within:border-[#F59E0B]/50'
        } rounded-xl p-3.5 focus-within:ring-1 focus-within:ring-[#F59E0B]/30 transition-all flex justify-between items-center cursor-pointer relative overflow-hidden group shadow-inner`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDeadline ? 'bg-amber-500/10 text-amber-400' : 'bg-white/5 text-stone-400'}`}>
            <span className="material-symbols-outlined text-base">calendar_month</span>
          </div>
          <span className={`text-sm font-semibold tracking-wide ${date ? "text-white" : "text-stone-500"}`}>
            {displayDate}
          </span>
        </div>
        <span className="material-symbols-outlined text-stone-500 text-sm group-hover:text-amber-400 transition-colors">edit_calendar</span>
        <input 
          ref={inputRef}
          type="date"
          name={name}
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="absolute right-0 top-0 w-full h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  );
};

export default function NewProjectPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [designers, setDesigners] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState<any[]>([]);
  const [selectedDesignerName, setSelectedDesignerName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  const [revenueInput, setRevenueInput] = useState("");
  const [expenseInput, setExpenseInput] = useState("");
  const [revCurr, setRevCurr] = useState("USD");
  const [expCurr, setExpCurr] = useState("INR");

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    router.prefetch('/projects');
    const fetchData = async () => {
      const db = await getDb();
      setDesigners(db.designers || []);
      setClients(db.clients || []);
    };
    fetchData();
    setMounted(true);
  }, [router]);

  const selectedDesigner = useMemo(() => {
    return designers.find(d => d.fullName === selectedDesignerName);
  }, [designers, selectedDesignerName]);

  const handleQuickAddSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills(prev => [...prev, skill]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAuthenticated || saving) return;
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    formData.append('tags', JSON.stringify(skills));

    const clientVal = (formData.get('client') as string) || '';
    const designerVal = (formData.get('designer') as string) || '';
    const titleVal = (formData.get('title') as string) || '';

    const tempProject = {
      id: Date.now().toString(),
      title: titleVal,
      orderId: (formData.get('orderId') as string) || 'Generating...',
      client: clientVal,
      clientCompany: clientVal,
      clientShortName: clientVal.slice(0, 2).toUpperCase(),
      designer: designerVal,
      revenue: (formData.get('revenue') as string) || '0',
      revenueCurrency: (formData.get('revenueCurrency') as string) || '$',
      expense: (formData.get('expense') as string) || '0',
      expenseCurrency: (formData.get('expenseCurrency') as string) || '₹',
      orderDate: (formData.get('orderDate') as string) || new Date().toISOString().split('T')[0],
      deadlineDate: (formData.get('deadlineDate') as string) || '',
      description: (formData.get('brief') as string) || '',
      images: (() => {
        const val = formData.get('images');
        if (!val) return [];
        try { return JSON.parse(val as string); } catch { return []; }
      })(),
      status: 'High Priority',
      paymentStatus: (formData.get('paymentStatus') as string) || 'Unpaid',
      paidAmount: (formData.get('paidAmount') as string) || '0',
      createdAt: new Date().toISOString(),
      tags: skills.length > 0 ? skills : ['High-Poly', 'Ray-Tracing', 'Nodes']
    };

    try {
      sessionStorage.setItem('optimistic_new_project', JSON.stringify(tempProject));
    } catch (err) {}

    // INSTANT 0ms NAVIGATION TO PROJECTS:
    router.push('/projects');

    // Run database write in parallel in background
    saveProject(formData).catch((err: any) => {
      console.error('Background save error:', err);
    });
  };

  return (
    <AuthGuard>
      <div className="bg-background text-on-surface font-body min-h-screen relative overflow-hidden pb-32 text-left selection:bg-[#F59E0B] selection:text-black">
        {/* Subtle ambient lighting glows */}
        <div className="fixed top-[15%] left-[5%] w-[45vw] h-[45vw] bg-amber-500/[0.03] blur-[140px] rounded-full pointer-events-none -z-10"></div>
        <div className="fixed bottom-[10%] right-[5%] w-[35vw] h-[35vw] bg-yellow-500/[0.03] blur-[140px] rounded-full pointer-events-none -z-10"></div>

        {/* Fluid Container matching CADONCE Project Studio standard */}
        <div className="pt-20 pb-32 px-4 sm:px-8 xl:px-12 w-full space-y-8 animate-in fade-in duration-500">
          
          {/* Top Command Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-400/5 shrink-0">
                  <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">Pipeline Initiation</span>
                    <span className="text-white/20 text-xs">•</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">New CAD Entry</span>
                  </div>
                  <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-white uppercase italic leading-none mt-1">
                    Initialize <span className="text-[#F59E0B]">Project</span>
                  </h1>
                </div>
              </div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                Configure project specifications, client assignments, CAD assets & financial billing logic
              </p>
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
              <button 
                type="button" 
                onClick={() => router.push('/projects')} 
                className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-black font-black uppercase italic tracking-wider text-xs shadow-lg shadow-amber-400/10 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <span>Initializing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base font-bold">bolt</span>
                    <span>Initialize Project</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Layout: 12-Column Responsive Enterprise Bento Architecture */}
          <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
            
            {/* Primary Column (8 Cols) - Core Details, Media Hub, Brief */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Project Identity & Assignment Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                      <span className="material-symbols-outlined text-xl">assignment</span>
                    </div>
                    <div>
                      <h3 className="font-headline text-base sm:text-lg font-black text-white uppercase tracking-tight">
                        Core Assignment & Identity
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        Project naming, client partnership and lead designer assignment
                      </p>
                    </div>
                  </div>
                  <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    Mandatory
                  </span>
                </div>

                <div className="space-y-6">
                  {/* Project Title Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                        Project Title / Model Name <span className="text-amber-400">*</span>
                      </label>
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Headline Descriptor</span>
                    </div>
                    <div className="relative">
                      <input 
                        name="title" 
                        required 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-base font-bold placeholder:text-stone-600 focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all outline-none shadow-inner" 
                        placeholder="e.g., Art Deco Emerald Diamond Engagement Ring" 
                        type="text" 
                      />
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-stone-600 text-lg pointer-events-none">diamond</span>
                    </div>
                  </div>

                  {/* Client & Designer Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Client Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                          Assigned Client <span className="text-amber-400">*</span>
                        </label>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Company</span>
                      </div>
                      <div className="relative group">
                        <select 
                          name="client" 
                          required 
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 pr-10 text-white font-medium text-sm focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all appearance-none cursor-pointer shadow-inner"
                        >
                          <option value="" className="bg-[#14120c] text-stone-400">Select Client Account...</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.companyName || c.name} className="bg-[#14120c] text-white">
                              {c.companyName || c.name}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 group-hover:text-amber-400 transition-colors">corporate_fare</span>
                      </div>
                    </div>

                    {/* Designer Selection */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                          Assigned CAD Designer <span className="text-amber-400">*</span>
                        </label>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase">Specialist</span>
                      </div>
                      <div className="relative group">
                        <select 
                          name="designer" 
                          required 
                          onChange={(e) => setSelectedDesignerName(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 pr-10 text-white font-medium text-sm focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all appearance-none cursor-pointer shadow-inner"
                        >
                          <option value="" className="bg-[#14120c] text-stone-400">Assign Workstation Designer...</option>
                          {designers.map((d) => (
                            <option key={d.id} value={d.fullName} className="bg-[#14120c] text-white">
                              {d.fullName} {d.specialty ? `(${d.specialty})` : ''} {d.employmentType ? `• ${d.employmentType}` : ''}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 group-hover:text-amber-400 transition-colors">badge</span>
                      </div>
                    </div>
                  </div>

                  {/* Order ID & Tag */}
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                      Tracking / Order ID
                    </label>
                    <div className="relative">
                      <input 
                        name="orderId" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 pl-10 text-white font-mono text-sm placeholder:text-stone-700 focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all outline-none shadow-inner" 
                        placeholder="e.g. #ORD-2026-9042 (Leave empty for auto-generation)" 
                        type="text" 
                      />
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 text-sm pointer-events-none">tag</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Gallery & CAD Media Hub Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                      <span className="material-symbols-outlined text-xl">perm_media</span>
                    </div>
                    <div>
                      <h3 className="font-headline text-base sm:text-lg font-black text-white uppercase tracking-tight">
                        Reference Media & 3D Assets Hub
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        CAD 3DM files, STL meshes, inspiration photos and render walkthroughs
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                      {gallery.length} {gallery.length === 1 ? 'Asset' : 'Assets'} Staged
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Cloudinary Media Hub Dropzone */}
                  <div className="bg-black/40 rounded-2xl p-6 sm:p-8 border border-white/5 shadow-inner hover:border-amber-400/20 transition-all">
                    <CloudinaryUpload 
                      onUpload={(url, type) => {
                        setGallery(prev => [...prev, { url, type, uploadedAt: new Date().toISOString() }]);
                      }} 
                    />
                  </div>

                  {/* Asset Format Tags Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 px-1">
                    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                      <span>Supported Formats:</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">.3DM</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">.STL</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">.OBJ</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">JPG / PNG</span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">MP4 (100MB)</span>
                    </div>
                    <p className="text-[9px] text-amber-400/70 font-bold uppercase tracking-widest">Encrypted Cloud Storage</p>
                  </div>

                  {/* Live Asset Preview Grid */}
                  {gallery.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-white/5">
                      {gallery.map((item: any, idx: number) => {
                        const isVideo = item.type === 'video' || item.url?.endsWith('.mp4') || item.url?.includes('/video/upload/');
                        return (
                          <div key={idx} className="group relative aspect-square rounded-xl bg-black/60 border border-white/10 overflow-hidden shadow-xl hover:border-amber-400/40 transition-all">
                            {isVideo ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
                                <span className="material-symbols-outlined text-amber-400 text-2xl">play_circle</span>
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest mt-1">Video</span>
                              </div>
                            ) : (
                              <img src={item.url} alt="Staged Asset" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            )}
                            <button 
                              type="button"
                              onClick={() => setGallery(prev => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors shadow-lg"
                              title="Remove Asset"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                              <span className="text-[8px] font-mono text-zinc-300 truncate block">Asset #{idx + 1}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Hidden Input for form submission */}
                  <input 
                    type="hidden" 
                    name="images" 
                    value={JSON.stringify(gallery)} 
                  />
                </div>
              </div>

              {/* CAD Specifications & Design Brief Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                      <span className="material-symbols-outlined text-xl">precision_manufacturing</span>
                    </div>
                    <div>
                      <h3 className="font-headline text-base sm:text-lg font-black text-white uppercase tracking-tight">
                        CAD Specifications & Technical Brief
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        Required design proficiencies, stone setting parameters and client instructions
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Skills & Tags Area */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                        Technical Skills & CAD Disciplines
                      </label>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Search / Add</span>
                    </div>
                    
                    {/* Active Selected Tags Display */}
                    <div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 bg-black/40 rounded-xl border border-white/10 shadow-inner items-center">
                      {skills.length === 0 ? (
                        <span className="text-[11px] text-stone-500 italic ml-2">No technical tags added. Click presets below or type custom skills.</span>
                      ) : (
                        skills.map((skill) => (
                          <span key={skill} className="flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/30 rounded-lg text-xs font-bold text-amber-400 uppercase tracking-wider shadow-sm">
                            {skill}
                            <button
                              type="button"
                              onClick={() => setSkills(skills.filter(s => s !== skill))}
                              className="w-4 h-4 rounded-full bg-amber-400/20 hover:bg-amber-400 hover:text-black flex items-center justify-center text-[9px] text-amber-300 font-bold transition-colors"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Skill Input Row */}
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input
                          type="text"
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = skillInput.trim();
                              if (val && !skills.includes(val)) {
                                setSkills([...skills, val]);
                                setSkillInput('');
                              }
                            }
                          }}
                          placeholder="Type custom skill tag and press Enter..."
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all shadow-inner"
                        />
                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-600 text-base pointer-events-none">keyboard</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const val = skillInput.trim();
                          if (val && !skills.includes(val)) {
                            setSkills([...skills, val]);
                            setSkillInput('');
                          }
                        }}
                        className="px-5 py-3 bg-white/10 border border-white/10 hover:bg-[#F59E0B] hover:text-black rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shrink-0 active:scale-95"
                      >
                        Add Tag
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mr-1">Quick Add:</span>
                      {PRESET_SKILLS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleQuickAddSkill(preset)}
                          disabled={skills.includes(preset)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                            skills.includes(preset)
                              ? 'bg-white/5 border-white/5 text-stone-600 cursor-not-allowed'
                              : 'bg-white/5 border-white/10 text-stone-300 hover:border-amber-400/40 hover:text-amber-400 hover:bg-amber-400/5'
                          }`}
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Design Brief Textarea */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                        Design Brief &amp; Technical Notes <span className="text-amber-400">*</span>
                      </label>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">Manufacturing Specs</span>
                    </div>
                    <textarea 
                      name="brief" 
                      required 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-stone-600 text-sm leading-relaxed resize-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B] transition-all outline-none shadow-inner" 
                      placeholder="Specify finger sizes, metal alloy target (e.g. 18K Yellow Gold / 950 Platinum), stone measurements, prong setting thickness, hollow interior tolerances, and CNC/wax casting requirements..." 
                      rows={5}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Column (4 Cols) - Timeline, Financials, Launch Dock */}
            <div className="lg:col-span-4 space-y-8">
              
              {/* Timeline & Delivery Schedule Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between pb-5 mb-5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                      <span className="material-symbols-outlined text-xl">schedule</span>
                    </div>
                    <div>
                      <h3 className="font-headline text-base font-black text-white uppercase tracking-tight">
                        Delivery Timeline
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        Queue scheduling & milestones
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <DatePickerFacade name="orderDate" label="Order Date" />
                  <DatePickerFacade name="deadlineDate" label="Target Delivery Deadline" isDeadline={true} />
                  
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-400 text-lg">alarm_on</span>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                      Automated milestone alerts are dispatched to the assigned designer 24h prior to deadline.
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Logic & Billing Protocol Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-xl relative overflow-hidden group">
                <div className="flex items-center justify-between pb-5 mb-5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                      <span className="material-symbols-outlined text-xl">payments</span>
                    </div>
                    <div>
                      <h3 className="font-headline text-base font-black text-white uppercase tracking-tight">
                        Financial Logic
                      </h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        Revenue, expense & settlement
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Revenue Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                        Client Revenue <span className="text-amber-400">*</span>
                      </label>
                      <span className="text-[9px] font-bold text-amber-400 uppercase">Receivable</span>
                    </div>
                    <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 transition-all overflow-hidden shadow-inner">
                      <div className="relative border-r border-white/10 bg-white/5">
                        <select 
                          name="revenueCurrency" 
                          value={revCurr}
                          onChange={(e) => setRevCurr(e.target.value)}
                          className="bg-transparent border-none py-3.5 pl-3 pr-8 text-amber-400 font-black text-xs focus:ring-0 appearance-none cursor-pointer outline-none"
                        >
                          <option value="USD" className="bg-[#14120c] text-white">$ (USD)</option>
                          <option value="EUR" className="bg-[#14120c] text-white">€ (EUR)</option>
                          <option value="GBP" className="bg-[#14120c] text-white">£ (GBP)</option>
                          <option value="JPY" className="bg-[#14120c] text-white">¥ (JPY)</option>
                          <option value="INR" className="bg-[#14120c] text-white">₹ (INR)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-amber-400 text-xs">expand_more</span>
                      </div>
                      <input 
                        name="revenue" 
                        required 
                        value={revenueInput}
                        onChange={(e) => setRevenueInput(e.target.value)}
                        className="w-full bg-transparent border-none p-3.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-0 placeholder:text-stone-700" 
                        placeholder="0.00" 
                        type="number" 
                        step="any"
                      />
                    </div>
                  </div>

                  {/* Expense Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                        Production Expense <span className="text-amber-400">*</span>
                      </label>
                      <span className="text-[9px] font-bold text-red-400 uppercase">Cost / Payout</span>
                    </div>
                    <div className="relative flex items-center bg-black/40 border border-white/10 rounded-xl focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400 transition-all overflow-hidden shadow-inner">
                      <div className="relative border-r border-white/10 bg-white/5">
                        <select 
                          name="expenseCurrency" 
                          value={expCurr}
                          onChange={(e) => setExpCurr(e.target.value)}
                          className="bg-transparent border-none py-3.5 pl-3 pr-8 text-red-400 font-black text-xs focus:ring-0 appearance-none cursor-pointer outline-none"
                        >
                          <option value="INR" className="bg-[#14120c] text-white">₹ (INR)</option>
                          <option value="USD" className="bg-[#14120c] text-white">$ (USD)</option>
                          <option value="EUR" className="bg-[#14120c] text-white">€ (EUR)</option>
                          <option value="GBP" className="bg-[#14120c] text-white">£ (GBP)</option>
                          <option value="JPY" className="bg-[#14120c] text-white">¥ (JPY)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-red-400 text-xs">expand_more</span>
                      </div>
                      <input 
                        name="expense" 
                        required 
                        value={expenseInput}
                        onChange={(e) => setExpenseInput(e.target.value)}
                        className="w-full bg-transparent border-none p-3.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-0 placeholder:text-stone-700" 
                        placeholder="0.00" 
                        type="number" 
                        step="any"
                      />
                    </div>
                  </div>

                  {/* Payment Status & Amount Paid */}
                  <div className="space-y-4 pt-3 border-t border-white/5">
                    <div className="space-y-2">
                      <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                        Initial Payment Status
                      </label>
                      <div className="relative group">
                        <select 
                          name="paymentStatus" 
                          className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 pr-10 text-white font-semibold text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all appearance-none cursor-pointer shadow-inner"
                        >
                          <option value="Unpaid" className="bg-[#14120c]">Unpaid</option>
                          <option value="50% Advance" className="bg-[#14120c]">50% Advance</option>
                          <option value="Partial Payment" className="bg-[#14120c]">Partial Payment</option>
                          <option value="Paid" className="bg-[#14120c]">Fully Paid</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500 group-hover:text-amber-400 transition-colors text-sm">
                          account_balance_wallet
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="font-label text-[10px] font-black uppercase tracking-wider text-stone-300 ml-1">
                        Amount Paid Upfront
                      </label>
                      <input 
                        name="paidAmount" 
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white font-mono text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all placeholder:text-stone-700 shadow-inner" 
                        placeholder="0.00" 
                        type="number" 
                        defaultValue="0" 
                        step="any"
                      />
                    </div>
                  </div>

                  {/* Conditional Escrow Option for Freelancers */}
                  {selectedDesigner?.employmentType === 'Freelancer' && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <span className="material-symbols-outlined text-lg">verified_user</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Freelancer Escrow Hold</p>
                            <p className="text-[9px] text-zinc-400 font-medium">Safeguard designer payout until final 3D file delivery</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" name="useEscrow" className="sr-only peer" />
                          <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pipeline Launch & Action Card */}
              <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden group space-y-4">
                <button 
                  disabled={saving} 
                  type="submit"
                  className="w-full electric-gradient text-[#383100] font-black py-4 px-6 rounded-xl shadow-[0_0_30px_rgba(252,224,3,0.25)] active:scale-[0.98] transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer hover:brightness-105 active:brightness-95 select-none" 
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#383100] border-t-transparent rounded-full animate-spin"></span>
                      <span>Saving &amp; Initializing...</span>
                    </>
                  ) : (
                    <>
                      <span>Initialize Project</span>
                      <span className="material-symbols-outlined font-black text-lg">bolt</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-[9px] text-zinc-500 uppercase font-bold tracking-wider px-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Instant 0ms Pipeline Sync
                  </span>
                  <span>CADONCE v2.4</span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}

