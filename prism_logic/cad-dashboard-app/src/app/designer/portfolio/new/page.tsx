"use client";

import React, { useState } from 'react';
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
    id: 'Rhino 3D', 
    name: 'Rhino 3D', 
    logo: '/rhino-logo.png',
    description: 'NURBS & Computational CAD'
  },
  { 
    id: 'SolidWorks', 
    name: 'SolidWorks', 
    icon: 'settings', 
    description: 'Mechanical Parametric Design'
  },
  { 
    id: 'KeyShot', 
    name: 'KeyShot', 
    icon: 'lightbulb', 
    description: 'Real-Time Ray-Tracing'
  },
  { 
    id: 'ZBrush', 
    name: 'ZBrush', 
    icon: 'brush', 
    description: 'High-Poly Digital Sculpting'
  },
  { 
    id: 'JewelCAD', 
    name: 'JewelCAD', 
    icon: 'diamond', 
    description: 'Jewelry CAD & Stone Settings'
  },
  { 
    id: 'MatrixGold', 
    name: 'MatrixGold', 
    icon: 'token', 
    description: 'Parametric Jewelry Suite'
  },
  { 
    id: 'Blender', 
    name: 'Blender', 
    icon: 'deployed_code', 
    description: '3D Mesh & Shader Pipeline'
  }
];

export default function AddPortfolioPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    category: '3D CAD Modeling',
    software: [] as string[],
    narrative: '',
    renders: [] as File[],
    cadFile: null as File | null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
        return {
          ...prev,
          software: [...prev.software, swId]
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
    <div className="bg-[#121414] text-[#e2e2e2] font-sans min-h-screen pb-20">
      <main className="pt-24 px-4 max-w-2xl mx-auto space-y-8">
        {/* Page Heading & Back Action */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Link 
              href="/designer/profile" 
              className="p-2 -ml-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Back to profile"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-headline text-2xl font-black text-white tracking-tight">Add Portfolio Project</h1>
              <p className="text-xs text-[#cec7ab]/70 mt-0.5">Showcase your high-fidelity CAD renders, 3D assets, and specifications.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Form Section: Project Identity */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 bg-gradient-to-r from-[#F59E0B] to-[#00fbfe] rounded-full"></div>
              <h2 className="font-headline text-sm font-extrabold uppercase tracking-widest text-[#F59E0B]">Project Identity</h2>
            </div>
            
            <div className="space-y-4">
              <div className="group">
                <label className="block text-[10px] uppercase tracking-widest text-[#cec7ab] mb-2 ml-1">Project Title</label>
                <input 
                  className="w-full bg-[#0c0f0f] border border-[#4b4732] rounded-lg px-4 py-3 text-[#e2e2e2] placeholder:opacity-30 focus:outline-none focus:border-[#F59E0B] transition-all" 
                  placeholder="e.g. Geometric Diamond Solitaire" 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="group">
                  <label className="block text-[10px] uppercase tracking-widest text-[#cec7ab] mb-2 ml-1">Service Category</label>
                  <select 
                    className="w-full bg-[#0c0f0f] border border-[#4b4732] rounded-lg px-4 py-3 text-[#e2e2e2] focus:outline-none focus:border-[#F59E0B] transition-all"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option>3D CAD Modeling</option>
                    <option>High-Detail Rendering</option>
                    <option>Digital Sculpting</option>
                    <option>Parametric Design</option>
                  </select>
                </div>

                {/* Software Used with official Rhino logo and CAD options */}
                <div className="group space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] uppercase tracking-widest text-[#cec7ab] ml-1">
                      Software Used <span className="text-[#F59E0B]">*</span>
                    </label>
                    <span className="text-[9px] text-[#cec7ab]/60">Click software to toggle</span>
                  </div>

                  <div className="bg-[#0c0f0f] border border-[#4b4732] rounded-xl p-2.5 space-y-1.5 max-h-64 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#F59E0B_transparent]">
                    {AVAILABLE_SOFTWARES.map((sw) => {
                      const selected = isSoftwareSelected(sw.id);
                      return (
                        <button
                          key={sw.id}
                          type="button"
                          onClick={() => toggleSoftware(sw.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left group ${
                            selected 
                              ? 'bg-[#F59E0B]/10 border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.15)] text-white' 
                              : 'bg-[#141717] border-white/5 text-stone-300 hover:border-[#4b4732] hover:bg-[#1a1d1d] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {sw.logo ? (
                              <div className="w-7 h-7 rounded-md bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform p-0.5 shadow-sm">
                                <img src={sw.logo} alt={sw.name} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                selected 
                                  ? 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]' 
                                  : 'bg-white/5 border-white/10 text-stone-400 group-hover:text-amber-400 group-hover:border-amber-400/30'
                              }`}>
                                <span className="material-symbols-outlined text-base">{sw.icon}</span>
                              </div>
                            )}
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold tracking-wide">{sw.name}</span>
                                {sw.id === 'Rhino 3D' && (
                                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                                    Rhinoceros
                                  </span>
                                )}
                              </div>
                              {sw.description && (
                                <p className="text-[10px] text-stone-400 truncate mt-0.5">{sw.description}</p>
                              )}
                            </div>
                          </div>

                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ml-3 ${
                            selected 
                              ? 'bg-[#F59E0B] border-[#F59E0B] text-black shadow-sm' 
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
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#cec7ab] mr-1">Active:</span>
                      {formData.software.map((s, idx) => {
                        const isRhino = s.toLowerCase().includes('rhino');
                        return (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B]"
                          >
                            {isRhino && (
                              <img src="/rhino-logo.png" alt="Rhino" className="w-3.5 h-3.5 object-contain rounded-sm" />
                            )}
                            <span>{s}</span>
                            <button 
                              type="button" 
                              onClick={() => toggleSoftware(s)}
                              className="hover:text-white transition-colors ml-0.5 text-xs leading-none"
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
              </div>

              <div className="group">
                <label className="block text-[10px] uppercase tracking-widest text-[#cec7ab] mb-2 ml-1">Project Narrative</label>
                <textarea 
                  className="w-full bg-[#0c0f0f] border border-[#4b4732] rounded-lg px-4 py-3 text-[#e2e2e2] placeholder:opacity-30 focus:outline-none focus:border-[#F59E0B] transition-all resize-none" 
                  placeholder="Describe the technical challenges and design inspiration..." 
                  rows={4}
                  value={formData.narrative}
                  onChange={(e) => setFormData({...formData, narrative: e.target.value})}
                ></textarea>
              </div>
            </div>
          </section>

          {/* Asset Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-1 w-8 bg-gradient-to-r from-[#F59E0B] to-[#00fbfe] rounded-full"></div>
              <h2 className="font-headline text-sm font-extrabold uppercase tracking-widest text-[#00fbfe]">Asset Injection</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Renders Upload */}
              <div className="relative group cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  onChange={(e) => handleFileChange(e, 'renders')}
                />
                <div className="absolute inset-0 bg-[#F59E0B]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                <div className="border-2 border-dashed border-[#4b4732] group-hover:border-[#F59E0B] transition-all rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-3 bg-[#1e2020]/50">
                  <span className="material-symbols-outlined text-4xl text-[#F59E0B]">photo_library</span>
                  <div>
                    <p className="font-headline font-bold text-white">Upload High-Fidelity Renders</p>
                    <p className="text-xs text-[#cec7ab] mt-1">PNG, JPG or TIFF (Max 20MB)</p>
                  </div>
                </div>
              </div>
              
              {/* Display selected renders */}
              {formData.renders.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {formData.renders.map((file, idx) => (
                    <div key={idx} className="w-16 h-16 rounded overflow-hidden border border-[#4b4732] relative group">
                      <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setFormData({...formData, renders: formData.renders.filter((_, i) => i !== idx)})}
                        className="absolute top-0 right-0 bg-black/70 text-white text-xs w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* CAD Data Upload */}
              <div className="relative group cursor-pointer">
                <input 
                  type="file" 
                  accept=".obj" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                  onChange={(e) => handleFileChange(e, 'cadFile')}
                />
                <div className="absolute inset-0 bg-[#00fbfe]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
                <div className="border-2 border-dashed border-[#4b4732] group-hover:border-[#00fbfe] transition-all rounded-lg p-8 flex flex-col items-center justify-center text-center space-y-3 bg-[#1e2020]/50">
                  <span className="material-symbols-outlined text-4xl text-[#00fbfe]">deployed_code</span>
                  <div>
                    <p className="font-headline font-bold text-white">Inject CAD Data</p>
                    <p className="text-xs text-[#cec7ab] mt-1">Only allow to upload .OBJ file under 30mb</p>
                  </div>
                </div>
              </div>
              
              {/* Display selected CAD file */}
              {formData.cadFile && (
                <div className="text-xs text-[#00fbfe] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Selected: {formData.cadFile.name} ({(formData.cadFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          </section>

          {/* Primary Action */}
          <div className="pt-8 pb-12">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full bg-gradient-to-r from-[#F59E0B] to-[#00fbfe] text-black font-headline font-black text-sm uppercase tracking-[0.2em] py-5 rounded-lg shadow-[0_0_30px_rgba(252,224,3,0.3)] hover:shadow-[0_0_40px_rgba(252,224,3,0.5)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <span>{isSubmitting ? 'Publishing...' : 'Publish to Portfolio'}</span>
              <span className="material-symbols-outlined font-bold">rocket_launch</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

