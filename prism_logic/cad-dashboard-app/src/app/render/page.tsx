"use client";

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/components/AuthProvider';
import * as THREE from 'three';

// Dynamically import RenderViewer to avoid SSR issues with Three.js
const RenderViewer = dynamic(() => import('@/components/RenderViewer'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-white border border-neutral-200">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs">Loading WebGL Engine...</p>
      </div>
    </div>
  )
});

// Environment items (Unlocking all of them!)
const ENVIRONMENTS = [
  { id: 'studio', label: 'Studio Light', type: 'image', img: 'radial-gradient(circle, #ffffff, #e2e8f0)', preset: 'studio' },
  { id: 'apartment', label: 'Sunset Apartment', type: 'image', img: 'radial-gradient(circle at top right, #ffedd5, #fdba74)', preset: 'apartment' },
  { id: 'city', label: 'Urban Cityscape', type: 'image', img: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', preset: 'city' },
  { id: 'dawn', label: 'Soft Dawn Sky', type: 'image', img: 'conic-gradient(from 180deg, #fef08a, #fed7aa, #fef08a)', preset: 'dawn' },
  { id: 'lobby', label: 'Hotel Lobby', type: 'image', img: 'conic-gradient(from 90deg, #cbd5e1, #f8fafc, #cbd5e1)', preset: 'lobby' },
  { id: 'warehouse', label: 'Industrial Warehouse', type: 'image', img: 'linear-gradient(to bottom, #ffffff, #cbd5e1)', preset: 'warehouse' },
];

export default function RenderStudioPage() {
  const { isAuthenticated } = useAuth();
  
  // Left Panel Tabs Controls State
  const [activeTab, setActiveTab] = useState('hdr');
  const [metalColor, setMetalColor] = useState('Yellow Gold');
  const [gemColor, setGemColor] = useState('Diamond');
  const [environment, setEnvironment] = useState('studio');
  const [autoRotate, setAutoRotate] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [customHdris, setCustomHdris] = useState<{ id: string; name: string; url: string }[]>([]);
  const [selectedCustomHdri, setSelectedCustomHdri] = useState<string | null>(null);

  // Advanced material & render settings sliders
  const [caratWeight, setCaratWeight] = useState(1.25);
  const [gemCut, setGemCut] = useState('Round');
  const [roughness, setRoughness] = useState(0.15);
  const [metalness, setMetalness] = useState(1.0);
  const [rtSamples, setRtSamples] = useState(256);
  const [denoiseActive, setDenoiseActive] = useState(true);
  const [bloomActive, setBloomActive] = useState(true);
  const [fov, setFov] = useState(45);
  const [gridActive, setGridActive] = useState(false);
  const [bgColorPreset, setBgColorPreset] = useState('#ffffff');
  const [exportRes, setExportRes] = useState('1080p');

  // Interactive annotations (Tags) state
  const [tags, setTags] = useState<{ id: string; label: string; x: number; y: number }[]>([
    { id: 'tag1', label: '1.25ct Emerald cut VVS1', x: 45, y: 35 },
    { id: 'tag2', label: '18K Yellow Gold Shank', x: 50, y: 65 }
  ]);
  const [newTagText, setNewTagText] = useState('');

  // Right Accordion State
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    hierarchy: true,
    materials: true,
    diamonds: false,
    transforms: false,
    picker: true,
  });

  // Reference to the WebGL context
  const glRef = useRef<THREE.WebGLRenderer | null>(null);

  const toggleAccordion = (section: string) => {
    setExpandedAccordions(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (modelUrl) {
        URL.revokeObjectURL(modelUrl);
      }
      const url = URL.createObjectURL(file);
      setModelUrl(url);
    }
  };

  const handleHdriUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newHdri = {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        url: url
      };
      setCustomHdris(prev => [...prev, newHdri]);
      setSelectedCustomHdri(url);
      setEnvironment('custom');
    }
  };

  const handleRemoveHdri = (id: string) => {
    const target = customHdris.find(h => h.id === id);
    if (target) {
      URL.revokeObjectURL(target.url);
      if (selectedCustomHdri === target.url) {
        setSelectedCustomHdri(null);
        setEnvironment('studio');
      }
    }
    setCustomHdris(prev => prev.filter(h => h.id !== id));
  };

  const triggerCapture = () => {
    if (!glRef.current) return;
    const canvas = glRef.current.domElement;
    const dataUrl = canvas.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `ijewel-3d-render-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <AuthGuard>
      {/* Main Container - Light Theme, styled exactly like ijewel Playground */}
      <div className={`h-screen bg-white text-neutral-900 font-body flex overflow-hidden w-full select-none ${isAuthenticated ? 'pt-16' : ''}`}>
        
        {/* ========================================================
             LEFT CONFIGURATION PANEL (Tabs + Settings panel)
             ======================================================== */}
        <div className="flex h-full bg-[#f4f4f5] border-r border-neutral-200 z-10 shrink-0">
          
          {/* Vertical Icon Toolbar */}
          <div className="w-16 flex flex-col items-center py-6 gap-6 overflow-y-auto border-r border-neutral-200/50">
            
            {/* Tab: HDR */}
            <button onClick={() => setActiveTab('hdr')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'hdr' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">hdr_strong</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">HDR</span>
            </button>

            {/* Tab: Gemstone */}
            <button onClick={() => setActiveTab('gem')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'gem' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">diamond</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">GEM</span>
            </button>

            {/* Tab: Metal */}
            <button onClick={() => setActiveTab('metal')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'metal' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">texture</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">METAL</span>
            </button>

            {/* Tab: Effects */}
            <button onClick={() => setActiveTab('effects')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'effects' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">EFFECTS</span>
            </button>

            {/* Tab: Backdrop Background */}
            <button onClick={() => setActiveTab('bg')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'bg' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">image</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">BACKDROP</span>
            </button>

            {/* Tab: Viewport Grid */}
            <button onClick={() => setActiveTab('viewport')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'viewport' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">visibility</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">CAMERA</span>
            </button>

            {/* Tab: Annotation tags */}
            <button onClick={() => setActiveTab('tags')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'tags' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">local_offer</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">TAGS</span>
            </button>

            {/* Tab: Upload models */}
            <button onClick={() => setActiveTab('upload')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'upload' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">publish</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">IMPORT</span>
            </button>

            {/* Tab: Settings / Render Export */}
            <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 group focus:outline-none`}>
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${activeTab === 'settings' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-neutral-350 hover:bg-neutral-100 text-neutral-600'}`}>
                <span className="material-symbols-outlined text-[18px]">tune</span>
              </div>
              <span className="text-[8px] font-extrabold uppercase tracking-wide mt-0.5">EXPORT</span>
            </button>

            <div className="flex-1"></div>

            {/* Home Back Arrow */}
            <Link href="/projects" className="flex flex-col items-center gap-1 text-neutral-500 hover:text-black mb-4">
              <span className="material-symbols-outlined text-[20px]">keyboard_double_arrow_left</span>
            </Link>
          </div>

          {/* Active Tab Panel Content (Dynamic Settings fields) */}
          <div className="w-[280px] flex flex-col p-6 overflow-y-auto bg-[#f4f4f5] border-r border-neutral-200">
            
            {/* Panel: Environment HDR Selection (All Unlocked) */}
            {activeTab === 'hdr' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Environments</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Preset studio lighting maps</p>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {ENVIRONMENTS.map((env) => (
                    <button
                      key={env.id}
                      onClick={() => setEnvironment(env.preset)}
                      className={`relative aspect-square rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 border-2 ${environment === env.preset ? 'border-blue-600 scale-105 shadow-md shadow-blue-500/10' : 'border-neutral-200/50'}`}
                      style={{ background: env.img }}
                      title={env.label}
                    >
                      {environment === env.preset && (
                        <div className="absolute inset-0 rounded-full bg-black/10 flex items-center justify-center text-white">
                          <span className="material-symbols-outlined text-white drop-shadow-md">check</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Panel: Gemstone Config */}
            {activeTab === 'gem' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Gemstone</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Define gemstone cut &amp; color</p>
                </div>

                <div className="space-y-4">
                  {/* Colors Grid */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Gemstone Color</span>
                    <div className="grid grid-cols-2 gap-2">
                      {['Diamond', 'Emerald', 'Ruby', 'Sapphire'].map((gem) => (
                        <button
                          key={gem}
                          onClick={() => setGemColor(gem)}
                          className={`py-2 px-3 border rounded-xl font-extrabold text-[10px] uppercase flex items-center gap-2 transition-all ${gemColor === gem ? 'border-blue-600 bg-white shadow-sm text-neutral-900' : 'border-neutral-200 bg-transparent text-neutral-600 hover:bg-neutral-200'}`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${gem === 'Diamond' ? 'bg-cyan-100 border border-neutral-300' : gem === 'Emerald' ? 'bg-emerald-500' : gem === 'Ruby' ? 'bg-red-500' : 'bg-blue-600'}`} />
                          <span>{gem}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cut dropdown */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Gemstone Cut</label>
                    <select
                      value={gemCut}
                      onChange={(e) => setGemCut(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-700 outline-none"
                    >
                      <option value="Round">Round Brilliant</option>
                      <option value="Emerald">Emerald Cut</option>
                      <option value="Marquise">Marquise</option>
                      <option value="Cushion">Cushion</option>
                      <option value="Oval">Oval</option>
                    </select>
                  </div>

                  {/* Carat weight */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                      <span>Carat Weight</span>
                      <span className="text-neutral-900 font-mono">{caratWeight.toFixed(2)} CT</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.05"
                      value={caratWeight}
                      onChange={(e) => setCaratWeight(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-1 bg-neutral-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Panel: Metal Config */}
            {activeTab === 'metal' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Metal settings</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Configure metallic surface physics</p>
                </div>

                <div className="space-y-4">
                  {/* Metals select */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Alloy Template</span>
                    <div className="grid grid-cols-2 gap-2">
                      {['Yellow Gold', 'Rose Gold', 'White Gold', 'Platinum'].map((metal) => (
                        <button
                          key={metal}
                          onClick={() => setMetalColor(metal)}
                          className={`py-2 px-3 border rounded-xl font-extrabold text-[10px] uppercase flex items-center gap-2 transition-all ${metalColor === metal ? 'border-blue-600 bg-white shadow-sm text-neutral-900' : 'border-neutral-200 bg-transparent text-neutral-600 hover:bg-neutral-200'}`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full ${metal === 'Yellow Gold' ? 'bg-[#ffcc66]' : metal === 'Rose Gold' ? 'bg-[#e8a39d]' : metal === 'White Gold' ? 'bg-[#f2f5f8] border border-neutral-300' : 'bg-[#e5e4e2]'}`} />
                          <span>{metal.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Roughness slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                      <span>Polished Roughness</span>
                      <span className="text-neutral-900 font-mono">{Math.round(roughness * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={roughness}
                      onChange={(e) => setRoughness(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-1 bg-neutral-300 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Metalness slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                      <span>Metallic Level</span>
                      <span className="text-neutral-900 font-mono">{Math.round(metalness * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.01"
                      value={metalness}
                      onChange={(e) => setMetalness(parseFloat(e.target.value))}
                      className="w-full accent-blue-600 h-1 bg-neutral-300 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Panel: Render Effects */}
            {activeTab === 'effects' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Camera Effects</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">WebGL and Ray Tracing configurations</p>
                </div>

                <div className="space-y-4">
                  {/* Sparkle Bloom */}
                  <label className="flex items-center justify-between p-3 border border-neutral-250 bg-white/40 rounded-xl cursor-pointer">
                    <span className="text-xs font-bold text-neutral-700">Sparkle/Bloom Glow</span>
                    <input
                      type="checkbox"
                      checked={bloomActive}
                      onChange={(e) => setBloomActive(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  {/* Anti-aliased tracing */}
                  <label className="flex items-center justify-between p-3 border border-neutral-250 bg-white/40 rounded-xl cursor-pointer">
                    <span className="text-xs font-bold text-neutral-700">Denoising filters</span>
                    <input
                      type="checkbox"
                      checked={denoiseActive}
                      onChange={(e) => setDenoiseActive(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  {/* Ray Tracing Samples */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Ray Tracing Samples</label>
                    <div className="grid grid-cols-3 gap-1 bg-white border border-neutral-200 p-0.5 rounded-xl text-center">
                      {[128, 256, 512].map((s) => (
                        <button
                          key={s}
                          onClick={() => setRtSamples(s)}
                          className={`py-1.5 rounded-lg text-[9px] font-black tracking-wide transition-all ${rtSamples === s ? 'bg-blue-600 text-white shadow' : 'text-neutral-500 hover:text-black'}`}
                        >
                          {s} SP
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel: Backdrop settings */}
            {activeTab === 'bg' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Studio Backdrop</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Customize environment background colors</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Color Swatches</span>
                    <div className="grid grid-cols-4 gap-2">
                      {['#ffffff', '#f4f4f5', '#27272a', '#090d16'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setBgColorPreset(color)}
                          className={`aspect-square rounded-xl border border-neutral-300/50 flex items-center justify-center transition-all ${bgColorPreset === color ? 'ring-2 ring-blue-600' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Backdrop Image File Input */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Background Image</label>
                    <label className="flex items-center justify-center gap-2 p-3 bg-white border border-neutral-200 border-dashed rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                      <span className="material-symbols-outlined text-neutral-500 text-sm">image</span>
                      <span className="text-[10px] font-extrabold text-neutral-600 uppercase tracking-wide">Upload Image</span>
                      <input type="file" accept="image/*" className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Panel: Viewport / Camera settings */}
            {activeTab === 'viewport' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Camera controls</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Control camera optics and motion</p>
                </div>

                <div className="space-y-4">
                  {/* Auto rotate */}
                  <label className="flex items-center justify-between p-3 border border-neutral-250 bg-white/40 rounded-xl cursor-pointer">
                    <span className="text-xs font-bold text-neutral-700">Auto-Rotate Orbit</span>
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  {/* Camera FOV */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                      <span>Field of view (FOV)</span>
                      <span className="text-neutral-900 font-mono">{fov}°</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="75"
                      step="1"
                      value={fov}
                      onChange={(e) => setFov(parseInt(e.target.value))}
                      className="w-full accent-blue-600 h-1 bg-neutral-300 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Grid layout */}
                  <label className="flex items-center justify-between p-3 border border-neutral-250 bg-white/40 rounded-xl cursor-pointer">
                    <span className="text-xs font-bold text-neutral-700">Show Helper Grid</span>
                    <input
                      type="checkbox"
                      checked={gridActive}
                      onChange={(e) => setGridActive(e.target.checked)}
                      className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Panel: Annotation tags */}
            {activeTab === 'tags' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Interactive Tags</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Attach labels on the WebGL model</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {tags.map((tag) => (
                      <div key={tag.id} className="flex justify-between items-center bg-white border border-neutral-200 p-2.5 rounded-xl">
                        <span className="text-[10px] font-bold text-neutral-700 leading-tight truncate w-36">{tag.label}</span>
                        <button 
                          onClick={() => setTags(tags.filter(t => t.id !== tag.id))}
                          className="text-[9px] font-black text-red-500 uppercase hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-neutral-200/50">
                    <input
                      type="text"
                      placeholder="Add tag comment..."
                      value={newTagText}
                      onChange={(e) => setNewTagText(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-700 outline-none"
                    />
                    <button
                      onClick={() => {
                        if (newTagText.trim()) {
                          setTags([...tags, { id: Math.random().toString(36).substr(2, 9), label: newTagText, x: 50, y: 50 }]);
                          setNewTagText('');
                        }
                      }}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md"
                    >
                      Place Tag
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Panel: Custom Model Import */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Import Custom Assets</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Load your own GLB models or HDRI lighting maps</p>
                </div>
                
                <div className="space-y-4">
                  {/* GLB File Upload */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">3D Geometry</span>
                    <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-neutral-350 rounded-xl bg-white hover:bg-neutral-50 transition-colors cursor-pointer group">
                      <span className="material-symbols-outlined text-xl text-blue-550 mb-1 group-hover:scale-110 transition-transform">cloud_upload</span>
                      <span className="text-[9px] font-black text-neutral-600 uppercase tracking-wider">Upload .GLB File</span>
                      <input type="file" accept=".glb,.gltf" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>

                  {/* HDRI File Upload */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Lighting Environment (HDRI)</span>
                    <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-neutral-350 rounded-xl bg-white hover:bg-neutral-50 transition-colors cursor-pointer group">
                      <span className="material-symbols-outlined text-xl text-emerald-600 mb-1 group-hover:scale-110 transition-transform">hdr_strong</span>
                      <span className="text-[9px] font-black text-neutral-600 uppercase tracking-wider">Upload .HDR Map</span>
                      <input type="file" accept=".hdr" className="hidden" onChange={handleHdriUpload} />
                    </label>
                  </div>

                  {/* Custom HDRI List */}
                  {customHdris.length > 0 && (
                    <div className="space-y-2 pt-4 border-t border-neutral-200">
                      <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Uploaded Environments</span>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {customHdris.map((hdri) => (
                          <div 
                            key={hdri.id} 
                            onClick={() => {
                              setSelectedCustomHdri(hdri.url);
                              setEnvironment('custom');
                            }}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${selectedCustomHdri === hdri.url && environment === 'custom' ? 'border-blue-600 bg-white shadow-sm' : 'border-neutral-200 bg-white/40 hover:bg-white'}`}
                          >
                            <div className="w-7 h-7 rounded-full border border-neutral-300 bg-gradient-to-tr from-sky-400 via-white to-indigo-500 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-neutral-500 text-[10px]">language</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black uppercase text-neutral-700 truncate leading-none">{hdri.name}</p>
                              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                                {selectedCustomHdri === hdri.url && environment === 'custom' ? 'Active' : 'Click to Apply'}
                              </p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveHdri(hdri.id);
                              }}
                              className="text-[9px] font-black text-red-500 uppercase hover:underline shrink-0 px-2"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel: Export Output */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[14px] font-black text-neutral-900 uppercase tracking-tight">Render Export</h2>
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-0.5">Generate and save high-resolution screenshots</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">Output Resolution</label>
                    <select
                      value={exportRes}
                      onChange={(e) => setExportRes(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-700 outline-none"
                    >
                      <option value="1080p">1080p Full HD (1920x1080)</option>
                      <option value="2K">2K Quad HD (2560x1440)</option>
                      <option value="4K">4K Ultra HD (3840x2160)</option>
                    </select>
                  </div>

                  <button
                    onClick={triggerCapture}
                    className="w-full py-3 bg-[#F59E0B] hover:bg-[#ebd003] text-black font-extrabold text-[10px] uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.95]"
                  >
                    Save Photo Render
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ========================================================
             CENTER WEBGL RENDER CANVAS
             ======================================================== */}
        <div className="flex-1 relative h-full flex items-center justify-center p-8" style={{ backgroundColor: bgColorPreset }}>
          
          <div className="w-full h-full relative border border-neutral-200/50 rounded-2xl overflow-hidden shadow-sm">
            <RenderViewer 
              metalColor={metalColor}
              gemColor={gemColor}
              environment={environment}
              autoRotate={autoRotate}
              modelUrl={modelUrl}
              onCanvasCreated={(gl) => { glRef.current = gl; }}
              roughness={roughness}
              metalness={metalness}
              bloomActive={bloomActive}
              dispersion={7.5}
              customHdriUrl={selectedCustomHdri}
            />

            {/* Interactive Tags overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {tags.map((tag) => (
                <div 
                  key={tag.id} 
                  className="absolute pointer-events-auto bg-white/95 border border-neutral-200 shadow-xl rounded-xl py-1 px-3 flex items-center gap-1.5 animate-in zoom-in-95 duration-200"
                  style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span className="text-[9px] font-extrabold text-neutral-800 uppercase tracking-tight">{tag.label}</span>
                </div>
              ))}
            </div>

            {/* Floating Top Panel Actions */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button 
                onClick={triggerCapture}
                className="bg-white hover:bg-neutral-50 border border-neutral-200 shadow rounded-xl p-2 flex items-center justify-center text-neutral-600 hover:text-black transition-all active:scale-95"
                title="Save Snapshot"
              >
                <span className="material-symbols-outlined text-lg leading-none">save</span>
              </button>
              <button 
                onClick={() => {
                  setMetalColor('Yellow Gold');
                  setGemColor('Diamond');
                  setEnvironment('studio');
                  setRoughness(0.15);
                  setMetalness(1.0);
                  setAutoRotate(true);
                  setTags([]);
                }}
                className="bg-white hover:bg-neutral-50 border border-neutral-200 shadow rounded-xl p-2 flex items-center justify-center text-neutral-600 hover:text-black transition-all active:scale-95"
                title="Reset Viewport"
              >
                <span className="material-symbols-outlined text-lg leading-none">undo</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
             RIGHT ACCORDION PARAMETERS PANEL (ijewel 3D side controls)
             ======================================================== */}
        <div className="w-80 h-full bg-[#f4f4f5] border-l border-neutral-200 overflow-y-auto custom-scrollbar p-6 space-y-3 z-10 shrink-0">
          
          <div className="mb-4">
            <h2 className="text-[13px] font-black text-neutral-900 uppercase tracking-wider">Picking &amp; Parameters</h2>
            <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">Configure hierarchy attributes</p>
          </div>

          {/* Accordion: Hierarchy */}
          <div className="border border-neutral-250 rounded-2xl overflow-hidden bg-white/40 shadow-sm">
            <button 
              onClick={() => toggleAccordion('hierarchy')}
              className="w-full px-4 py-3 bg-white/60 hover:bg-white flex items-center justify-between font-extrabold text-[10px] uppercase tracking-wider text-neutral-700 transition-colors focus:outline-none"
            >
              <span>Hierarchy</span>
              <span className="material-symbols-outlined text-neutral-500">{expandedAccordions.hierarchy ? 'expand_less' : 'expand_more'}</span>
            </button>
            {expandedAccordions.hierarchy && (
              <div className="p-4 border-t border-neutral-200/50 space-y-2 text-[10px] font-bold text-neutral-600">
                <div className="flex justify-between items-center py-1 border-b border-neutral-100/50">
                  <span className="text-neutral-800">Scene Root</span>
                  <span className="text-neutral-400">group</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-100/50 pl-2">
                  <span className="text-neutral-800">💍 Active Band Mesh</span>
                  <span className="text-neutral-400">mesh</span>
                </div>
                <div className="flex justify-between items-center py-1 pl-2">
                  <span className="text-neutral-800">💎 Center Diamond Setting</span>
                  <span className="text-neutral-400">mesh</span>
                </div>
              </div>
            )}
          </div>

          {/* Accordion: Material Library */}
          <div className="border border-neutral-250 rounded-2xl overflow-hidden bg-white/40 shadow-sm">
            <button 
              onClick={() => toggleAccordion('materials')}
              className="w-full px-4 py-3 bg-white/60 hover:bg-white flex items-center justify-between font-extrabold text-[10px] uppercase tracking-wider text-neutral-700 transition-colors focus:outline-none"
            >
              <span>Material Library</span>
              <span className="material-symbols-outlined text-neutral-500">{expandedAccordions.materials ? 'expand_less' : 'expand_more'}</span>
            </button>
            {expandedAccordions.materials && (
              <div className="p-4 border-t border-neutral-200/50 space-y-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Active Metallic Standard</span>
                  <div className="p-2.5 bg-white border border-neutral-200 rounded-xl flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ffcc66] border border-white shadow-sm" />
                    <span className="text-[10px] font-black uppercase text-neutral-700">{metalColor} Material</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-neutral-400 uppercase tracking-widest block">Refractive Physical Material</span>
                  <div className="p-2.5 bg-white border border-neutral-200 rounded-xl flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-cyan-100 border border-white shadow-sm" />
                    <span className="text-[10px] font-black uppercase text-neutral-700">{gemColor} Material</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Accordion: Diamonds Config */}
          <div className="border border-neutral-250 rounded-2xl overflow-hidden bg-white/40 shadow-sm">
            <button 
              onClick={() => toggleAccordion('diamonds')}
              className="w-full px-4 py-3 bg-white/60 hover:bg-white flex items-center justify-between font-extrabold text-[10px] uppercase tracking-wider text-neutral-700 transition-colors focus:outline-none"
            >
              <span>Diamonds Parameter</span>
              <span className="material-symbols-outlined text-neutral-500">{expandedAccordions.diamonds ? 'expand_less' : 'expand_more'}</span>
            </button>
            {expandedAccordions.diamonds && (
              <div className="p-4 border-t border-neutral-200/50 space-y-3 text-[10px] font-bold text-neutral-600">
                <div className="flex justify-between items-center py-1 border-b border-neutral-100/50">
                  <span className="text-neutral-500">Clarity:</span>
                  <span className="text-neutral-900 font-mono">VVS1</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-neutral-100/50">
                  <span className="text-neutral-500">Color Grade:</span>
                  <span className="text-neutral-900 font-mono">D / Colorless</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-neutral-500">Fluorescence:</span>
                  <span className="text-[#00fbfe] uppercase">None</span>
                </div>
              </div>
            )}
          </div>

          {/* Accordion: Transforms Controls */}
          <div className="border border-neutral-250 rounded-2xl overflow-hidden bg-white/40 shadow-sm">
            <button 
              onClick={() => toggleAccordion('transforms')}
              className="w-full px-4 py-3 bg-white/60 hover:bg-white flex items-center justify-between font-extrabold text-[10px] uppercase tracking-wider text-neutral-700 transition-colors focus:outline-none"
            >
              <span>Transform Controls</span>
              <span className="material-symbols-outlined text-neutral-500">{expandedAccordions.transforms ? 'expand_less' : 'expand_more'}</span>
            </button>
            {expandedAccordions.transforms && (
              <div className="p-4 border-t border-neutral-200/50 space-y-3 text-[10px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>Translate X</span>
                    <span className="font-mono text-neutral-800">0.00</span>
                  </div>
                  <input type="range" min="-5" max="5" step="0.1" defaultValue="0" className="w-full accent-blue-600 h-1 bg-neutral-300 rounded-lg cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-500">
                    <span>Rotate Y</span>
                    <span className="font-mono text-neutral-800">0°</span>
                  </div>
                  <input type="range" min="-180" max="180" step="1" defaultValue="0" className="w-full accent-blue-600 h-1 bg-neutral-300 rounded-lg cursor-pointer" />
                </div>
              </div>
            )}
          </div>

          {/* Accordion: Picker Config */}
          <div className="border border-neutral-250 rounded-2xl overflow-hidden bg-white/40 shadow-sm">
            <button 
              onClick={() => toggleAccordion('picker')}
              className="w-full px-4 py-3 bg-white/60 hover:bg-white flex items-center justify-between font-extrabold text-[10px] uppercase tracking-wider text-neutral-700 transition-colors focus:outline-none"
            >
              <span>Picker Settings</span>
              <span className="material-symbols-outlined text-neutral-500">{expandedAccordions.picker ? 'expand_less' : 'expand_more'}</span>
            </button>
            {expandedAccordions.picker && (
              <div className="p-4 border-t border-neutral-200/50 space-y-3 text-[10px] font-bold text-neutral-600">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Enabled</span>
                  <input type="checkbox" defaultChecked className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>AutoFocus</span>
                  <input type="checkbox" className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Multi-Select</span>
                  <input type="checkbox" defaultChecked className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </label>
              </div>
            )}
          </div>

        </div>

      </div>
    </AuthGuard>
  );
}

