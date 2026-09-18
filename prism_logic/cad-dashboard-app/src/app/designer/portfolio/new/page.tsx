"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createPortfolioProject } from '@/app/actions';
import { supabase } from '@/lib/supabase';

interface SoftwareOption {
  id: string;
  name: string;
  logo?: string;
  icon?: string;
  description?: string;
}

const AVAILABLE_SOFTWARES: SoftwareOption[] = [
  { 
    id: 'Rhinoceros', 
    name: 'Rhinoceros', 
    logo: '/rhino-logo.png',
    description: 'NURBS & Computational CAD'
  },
  { 
    id: 'SolidWorks', 
    name: 'SolidWorks', 
    logo: '/solidworks-logo.png',
    description: 'Mechanical Parametric Design'
  },
  { 
    id: 'KeyShot', 
    name: 'KeyShot', 
    logo: '/keyshot-logo.jpg',
    description: 'Real-Time Ray-Tracing'
  },
  { 
    id: 'ZBrush', 
    name: 'ZBrush', 
    logo: '/zbrush-logo.jpg',
    description: 'High-Poly Digital Sculpting'
  },
  { 
    id: 'JewelCAD', 
    name: 'JewelCAD', 
    logo: '/jewelcad-logo.webp',
    description: 'Jewelry CAD & Stone Settings'
  },
  { 
    id: 'MatrixGold', 
    name: 'MatrixGold', 
    logo: '/matrixgold-logo.png',
    description: 'Parametric Jewelry Suite'
  },
  { 
    id: 'Blender', 
    name: 'Blender', 
    logo: '/blender-logo.png',
    description: '3D Mesh & Shader Pipeline'
  }
];

export default function AddPortfolioPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    category: '3D CAD Modeling',
    software: ['Rhinoceros'] as string[],
    narrative: '',
    renders: [] as File[],
    cadFile: null as File | null
  });

  const [renderPreviews, setRenderPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync render previews cleanly with proper revocation
  useEffect(() => {
    const urls = formData.renders.map(f => URL.createObjectURL(f));
    setRenderPreviews(urls);
    return () => {
      urls.forEach(u => URL.revokeObjectURL(u));
    };
  }, [formData.renders]);

  const toggleSoftware = (swId: string) => {
    setFormData(prev => {
      const isRhino = swId.toLowerCase().includes('rhino');
      const exists = prev.software.some(s => 
        s.toLowerCase() === swId.toLowerCase() || (isRhino && s.toLowerCase().includes('rhino'))
      );
      if (exists) {
        return {
          ...prev,
          software: prev.software.filter(s => 
            s.toLowerCase() !== swId.toLowerCase() && !(isRhino && s.toLowerCase().includes('rhino'))
          )
        };
      } else {
        const canonical = isRhino ? 'Rhinoceros' : swId;
        return {
          ...prev,
          software: [...prev.software, canonical]
        };
      }
    });
  };

  const isSoftwareSelected = (swId: string) => {
    const isRhino = swId.toLowerCase().includes('rhino');
    return formData.software.some(s => 
      s.toLowerCase() === swId.toLowerCase() || (isRhino && s.toLowerCase().includes('rhino'))
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'renders' | 'cadFile') => {
    const files = e.target.files;
    if (!files) return;

    if (field === 'renders') {
      setFormData({ ...formData, renders: [...formData.renders, ...Array.from(files)] });
    } else {
      const file = files[0];
      if (file && !file.name.toLowerCase().endsWith('.obj')) {
        alert('Only .OBJ files are allowed for CAD data.');
        return;
      }
      if (file && file.size > 30 * 1024 * 1024) {
        alert('File size must be under 30MB.');
        return;
      }
      setFormData({ ...formData, cadFile: file });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const imageUrls: string[] = [];
      
      // Upload renders
      for (const file of formData.renders) {
        if (file.size > 0) {
          const path = `portfolio/${user?.id}/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from('project-assets').upload(path, file, { upsert: true });
          if (error) throw error;
          
          const { data: { publicUrl } } = supabase.storage.from('project-assets').getPublicUrl(path);
          imageUrls.push(publicUrl);
        }
      }
      
      // Upload CAD file
      let cadFileUrl = '';
      if (formData.cadFile && formData.cadFile.size > 0) {
        const path = `portfolio/${user?.id}/${Date.now()}-${formData.cadFile.name}`;
        const { error } = await supabase.storage.from('project-assets').upload(path, formData.cadFile, { upsert: true });
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('project-assets').getPublicUrl(path);
        cadFileUrl = publicUrl;
      }
      
      // Call server action with URLs
      const res = await createPortfolioProject({
        title: formData.title,
        category: formData.category,
        software: formData.software,
        narrative: formData.narrative,
        imageUrls,
        cadFileUrl
      });
      
      if (res.success) {
        alert('Portfolio project published successfully!');
        router.push('/designer/profile');
      } else {
        alert('Failed to publish project: ' + res.error);
      }
    } catch (error: any) {
      console.error('Error submitting portfolio:', error);
      alert('Failed to publish project: ' + (error.message || error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0c0a04] text-[#e2e2e2] font-sans min-h-screen pb-24 relative overflow-hidden">
      {/* Subtle background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 right-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/3 -left-40 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <main className="relative z-10 pt-20 px-4 sm:px-6 lg:px-8 xl:px-10 w-full space-y-8">
        {/* Header with Breadcrumbs & Action Deck */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="space-y-1.5">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-stone-500">
              <Link href="/designer/profile" className="hover:text-amber-400 transition-colors">Designer Studio</Link>
              <span className="text-stone-700">/</span>
              <Link href="/designer/portfolio" className="hover:text-amber-400 transition-colors">Portfolio</Link>
              <span className="text-stone-700">/</span>
              <span className="text-amber-400">Add Project</span>
            </div>

            <div className="flex items-center gap-3">
              <Link 
                href="/designer/portfolio" 
                className="p-2.5 -ml-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/5 transition-all active:scale-95"
                title="Back to portfolio"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </Link>
              <div>
                <h1 className="font-headline text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  Add Portfolio Project
                  <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400">
                    Live Forge
                  </span>
                </h1>
                <p className="text-xs text-stone-400 mt-1">
                  Publish high-fidelity CAD renders, computational 3D models, and technical specifications to your showcase.
                </p>
              </div>
            </div>
          </div>

          {/* Quick status & discard */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/designer/portfolio"
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-400 hover:text-white hover:bg-white/5 border border-white/10 transition-all"
            >
              Discard
            </Link>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-lg shadow-amber-400/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base font-bold">rocket_launch</span>
                  <span>Publish Project</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Master 2-Column Responsive Layout */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Project Identity, Category, Software Stack & Narrative (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-8 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
                  <h2 className="font-headline text-sm font-black uppercase tracking-widest text-white">
                    Project Identity
                  </h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                  Required Specs
                </span>
              </div>

              <div className="space-y-5">
                {/* Project Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-300 ml-1">
                      Project Title <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[9px] text-stone-500">Masterpiece or model name</span>
                  </div>
                  <input 
                    className="w-full bg-[#0c0a04] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 transition-all font-medium" 
                    placeholder="e.g. Geometric Diamond Solitaire Ring" 
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>

                {/* Service Category */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-stone-300 ml-1">
                    Service Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['3D CAD Modeling', 'High-Detail Rendering', 'Digital Sculpting', 'Parametric Design'].map((cat) => {
                      const active = formData.category === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({...formData, category: cat})}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                            active
                              ? 'bg-amber-400/10 border-amber-400/60 text-amber-400 shadow-sm'
                              : 'bg-[#0c0a04] border-zinc-800 text-stone-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Software Used with official Rhinoceros logo in responsive 2-column grid */}
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-300 ml-1">
                      Software Stack <span className="text-amber-400">*</span>
                    </label>
                    <span className="text-[9px] text-stone-500">Toggle all softwares utilized</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {AVAILABLE_SOFTWARES.map((sw) => {
                      const selected = isSoftwareSelected(sw.id);
                      return (
                        <button
                          key={sw.id}
                          type="button"
                          onClick={() => toggleSoftware(sw.id)}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group cursor-pointer ${
                            selected 
                              ? 'bg-amber-400/10 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] text-white' 
                              : 'bg-[#0c0a04] border-zinc-800/90 text-stone-300 hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {sw.logo ? (
                              <div className="w-8 h-8 rounded-lg bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform p-0.5 shadow-sm">
                                <img src={sw.logo} alt={sw.name} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                selected 
                                  ? 'bg-amber-400/20 border-amber-400/40 text-amber-400' 
                                  : 'bg-white/5 border-white/10 text-stone-400 group-hover:text-amber-400 group-hover:border-amber-400/30'
                              }`}>
                                <span className="material-symbols-outlined text-base">{sw.icon}</span>
                              </div>
                            )}
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold tracking-wide">{sw.name}</span>
                                {sw.id === 'Rhinoceros' && (
                                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400">
                                    Official
                                  </span>
                                )}
                              </div>
                              {sw.description && (
                                <p className="text-[10px] text-stone-500 truncate mt-0.5 font-medium">{sw.description}</p>
                              )}
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ml-2 ${
                            selected 
                              ? 'bg-amber-400 border-amber-400 text-black shadow-sm' 
                              : 'border-white/20 group-hover:border-white/40'
                          }`}>
                            {selected && <span className="material-symbols-outlined text-xs font-black">check</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active selection pills */}
                  {formData.software.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-stone-500 mr-1">Active Stack:</span>
                      {formData.software.map((s, idx) => {
                        const isRhino = s.toLowerCase().includes('rhino');
                        const swData = AVAILABLE_SOFTWARES.find(sw => sw.id === s);
                        return (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-400/15 border border-amber-400/40 text-amber-400 animate-in zoom-in-95 duration-150"
                          >
                            {swData?.logo && (
                              <img src={swData.logo} alt={swData.name} className="w-3.5 h-3.5 object-contain rounded-sm" />
                            )}
                            <span>{isRhino ? 'Rhinoceros' : s}</span>
                            <button 
                              type="button" 
                              onClick={() => toggleSoftware(s)}
                              className="hover:text-white transition-colors ml-0.5 text-xs leading-none cursor-pointer"
                              title="Remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Project Narrative */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-stone-300 ml-1">
                      Project Narrative &amp; Technical Notes
                    </label>
                    <span className="text-[9px] text-stone-500">{formData.narrative.length} characters</span>
                  </div>
                  <textarea 
                    className="w-full bg-[#0c0a04] border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 transition-all resize-none font-medium leading-relaxed" 
                    placeholder="Describe the technical challenges, prong tolerances, metal weights, NURBS surfaces, rendering engine, and design inspiration..." 
                    rows={5}
                    value={formData.narrative}
                    onChange={(e) => setFormData({...formData, narrative: e.target.value})}
                  />
                  <p className="text-[10px] text-stone-500 italic ml-1">
                    Tip: Comprehensive descriptions boost your visibility score when organizations search for specialized CAD talent.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Asset Injection, Live Card Preview & Action Dock (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 2: Asset Injection Studio */}
            <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-8 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full" />
                  <h2 className="font-headline text-sm font-black uppercase tracking-widest text-white">
                    Asset Injection
                  </h2>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400/80 bg-cyan-400/10 px-2.5 py-1 rounded-md border border-cyan-400/20">
                  Renders &amp; 3D Data
                </span>
              </div>

              {/* Renders Upload Box */}
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-300 ml-1">
                  High-Fidelity Renders
                </label>
                <div className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={(e) => handleFileChange(e, 'renders')}
                  />
                  <div className="border-2 border-dashed border-zinc-800 group-hover:border-amber-400/60 transition-all rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-2.5 bg-[#0c0a04]/60 group-hover:bg-amber-400/[0.02]">
                    <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-2xl">photo_library</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Upload Renders &amp; Screenshots</p>
                      <p className="text-[10px] text-stone-500 mt-0.5">PNG, JPG, TIFF (Max 20MB per asset)</p>
                    </div>
                  </div>
                </div>

                {/* Gallery of Uploaded Renders */}
                {formData.renders.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span className="font-bold">{formData.renders.length} Renders Attached</span>
                      <span className="text-amber-400/80 font-semibold">★ First is Primary Cover</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {formData.renders.map((file, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 group bg-black/40">
                          <img 
                            src={renderPreviews[idx] || URL.createObjectURL(file)} 
                            alt={`Preview ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 text-[7px] font-black uppercase tracking-wider bg-amber-400 text-black px-1.5 py-0.5 rounded shadow font-sans">
                              Cover
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData, 
                                renders: formData.renders.filter((_, i) => i !== idx)
                              });
                            }}
                            className="absolute top-1 right-1 bg-black/80 hover:bg-red-500 text-white text-xs w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="Delete render"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CAD 3D File Upload Box */}
              <div className="space-y-3 pt-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-stone-300 ml-1">
                  Inject CAD Data (.OBJ)
                </label>
                <div className="relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept=".obj" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    onChange={(e) => handleFileChange(e, 'cadFile')}
                  />
                  <div className={`border-2 border-dashed rounded-xl p-5 flex items-center gap-4 transition-all bg-[#0c0a04]/60 ${
                    formData.cadFile 
                      ? 'border-cyan-400/60 bg-cyan-400/[0.03]' 
                      : 'border-zinc-800 group-hover:border-cyan-400/40'
                  }`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      formData.cadFile 
                        ? 'bg-cyan-400/20 text-cyan-400' 
                        : 'bg-white/5 border border-white/10 text-stone-400 group-hover:text-cyan-400'
                    }`}>
                      <span className="material-symbols-outlined text-2xl">deployed_code</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {formData.cadFile ? (
                        <>
                          <p className="text-xs font-bold text-cyan-400 truncate flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                            {formData.cadFile.name}
                          </p>
                          <p className="text-[10px] text-stone-500 mt-0.5">
                            {(formData.cadFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for 3D Viewport
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-white">Attach 3D Geometry</p>
                          <p className="text-[10px] text-stone-500 mt-0.5">Wavefront .OBJ (Max 30MB)</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Card 3: Real-Time Live Portfolio Card Preview */}
            <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="font-headline text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Portfolio Preview
                </h3>
                <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider">Public Card</span>
              </div>

              {/* Mockup Card */}
              <div className="bg-[#0c0a04] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all group">
                <div className="aspect-video bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                  {renderPreviews.length > 0 ? (
                    <img 
                      src={renderPreviews[0]} 
                      alt="Card Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-6 text-stone-600">
                      <span className="material-symbols-outlined text-4xl mb-2 text-stone-700">view_in_ar</span>
                      <p className="text-[10px] font-bold uppercase tracking-wider">Upload a render to preview cover</p>
                    </div>
                  )}

                  {/* Floating category badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider text-amber-400">
                    {formData.category}
                  </span>

                  {formData.cadFile && (
                    <span className="absolute top-3 right-3 px-2 py-0.5 bg-cyan-400/20 backdrop-blur-md border border-cyan-400/40 rounded text-[9px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[10px]">3d_rotation</span>
                      3D OBJ
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-2.5">
                  <h4 className="font-headline text-sm font-black text-white truncate">
                    {formData.title || 'Untitled CAD Project'}
                  </h4>

                  {/* Software used in card preview */}
                  <div className="flex items-center gap-1.5 flex-wrap min-h-[22px]">
                    {formData.software.length > 0 ? (
                      formData.software.slice(0, 3).map((sw, idx) => {
                        const isRhino = sw.toLowerCase().includes('rhino');
                        return (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-bold text-stone-300">
                            {isRhino && (
                              <img src="/rhino-logo.png" alt="Rhinoceros" className="w-3 h-3 object-contain" />
                            )}
                            {isRhino ? 'Rhinoceros' : sw}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[9px] text-stone-600 italic">No software tags selected</span>
                    )}
                    {formData.software.length > 3 && (
                      <span className="text-[8px] font-bold text-amber-400">+{formData.software.length - 3} more</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Card 4: Primary Action Dock */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full bg-gradient-to-r from-amber-400 via-amber-500 to-cyan-400 text-black font-headline font-black text-sm uppercase tracking-[0.18em] py-4 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] transition-all transform active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Publishing Project...</span>
                  </>
                ) : (
                  <>
                    <span>Publish to Portfolio</span>
                    <span className="material-symbols-outlined font-black">rocket_launch</span>
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-stone-500 mt-3 font-medium">
                Encrypted CDN storage • Instant sync across CADONCE Explorer
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

