"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createPortfolioProject } from '@/app/actions';
import { supabase } from '@/lib/supabase';

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

  const handleSoftwareChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({ ...formData, software: selectedOptions });
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
    <div className="bg-[#121414] text-[#e2e2e2] font-sans min-h-screen pb-32">
      {/* TopAppBar */}
      <header className="bg-[#1a1c1c] flex justify-between items-center px-4 h-16 w-full fixed top-0 z-50 border-b border-[#262626]">
        <div className="flex items-center gap-4">
          <Link href="/designer/profile" className="text-white hover:bg-[#37393a] transition-colors p-2 rounded-lg active:scale-90 transition-transform">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline text-lg tracking-tight font-bold text-white">Add Project</h1>
        </div>
        <button className="text-white hover:bg-[#37393a] transition-colors p-2 rounded-lg active:scale-90 transition-transform">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      <main className="pt-24 px-4 max-w-2xl mx-auto space-y-8">
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

                <div className="group relative">
                  <label className="block text-[10px] uppercase tracking-widest text-[#cec7ab] mb-2 ml-1">Software Used</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-[#0c0f0f] border border-[#4b4732] rounded-lg px-4 py-3 text-[#e2e2e2] transition-all min-h-[140px] focus:outline-none focus:border-[#F59E0B]" 
                      multiple
                      value={formData.software}
                      onChange={handleSoftwareChange}
                    >
                      <option className="py-2 px-2 flex items-center gap-2" value="rhino">🦏 Rhino 3D</option>
                      <option className="py-2 px-2 flex items-center gap-2" value="solidworks">⚙️ SolidWorks</option>
                      <option className="py-2 px-2 flex items-center gap-2" value="keyshot">💡 KeyShot</option>
                      <option className="py-2 px-2 flex items-center gap-2" value="zbrush">🎨 ZBrush</option>
                      <option className="py-2 px-2 flex items-center gap-2" value="jewelcad">💎 JewelCAD</option>
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none text-[#cec7ab]">
                      <span className="material-symbols-outlined text-sm">unfold_more</span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-[#cec7ab] italic">Hold Ctrl/Cmd to select multiple softwares</p>
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

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 py-3 bg-[#333535]/80 backdrop-blur-2xl z-50 shadow-[0_-4px_20px_rgba(252,224,3,0.12)] border-t border-[#4b4732]">
        <Link className="flex flex-col items-center justify-center text-[#cec7ab] opacity-70 hover:text-white transition-all active:scale-95 duration-200" href="/designer/portfolio">
          <span className="material-symbols-outlined">grid_view</span>
          <span className="text-[10px] uppercase tracking-widest mt-1">Portfolio</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#cec7ab] opacity-70 hover:text-white transition-all active:scale-95 duration-200" href="/projects">
          <span className="material-symbols-outlined">precision_manufacturing</span>
          <span className="text-[10px] uppercase tracking-widest mt-1">Projects</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-white font-bold scale-110 active:scale-95 duration-200" href="/designer/portfolio/new">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_box</span>
          <span className="text-[10px] uppercase tracking-widest mt-1">Add</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#cec7ab] opacity-70 hover:text-white transition-all active:scale-95 duration-200" href="/clients">
          <span className="material-symbols-outlined">group</span>
          <span className="text-[10px] uppercase tracking-widest mt-1">Clients</span>
        </Link>
        <Link className="flex flex-col items-center justify-center text-[#cec7ab] opacity-70 hover:text-white transition-all active:scale-95 duration-200" href="/designer/profile">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] uppercase tracking-widest mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

