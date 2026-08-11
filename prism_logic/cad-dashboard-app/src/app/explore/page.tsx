"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getExploreItems } from '@/app/actions';
import dynamic from 'next/dynamic';

const ViewportCanvas = dynamic(() => import('@/components/viewport/ViewportCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-[#0c0a04] text-[#fce003] rounded-2xl border border-white/5">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#fce003] font-headline font-black text-[10px] tracking-widest uppercase animate-pulse">
          Initializing 3D Viewport...
        </div>
      </div>
    </div>
  )
});

export default function ExplorePage() {
  const { user, isDesigner, isAuthenticated } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [activeMediaTab, setActiveMediaTab] = useState<'render' | '3d'>('render');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const res = await getExploreItems();
      if (res.success && res.data) {
        setItems(res.data);
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  // Filter items based on search and category selection
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 1. Category Filter
      const categoryMatch = selectedCategory === 'All' || 
        (item.description && item.description.includes(`[CATEGORY] ${selectedCategory}`)) ||
        item.category === selectedCategory; // Fallback if schema maps it directly

      // 2. Search Query Filter
      const lowerQuery = searchQuery.toLowerCase();
      const titleMatch = item.title && item.title.toLowerCase().includes(lowerQuery);
      const descMatch = item.description && item.description.toLowerCase().includes(lowerQuery);
      const designerMatch = item.designer && item.designer.fullName && item.designer.fullName.toLowerCase().includes(lowerQuery);
      
      return categoryMatch && (titleMatch || descMatch || designerMatch);
    });
  }, [items, searchQuery, selectedCategory]);

  const categories = ['All', '3D CAD Modeling', 'High-Detail Rendering', 'Digital Sculpting', 'Parametric Design'];

  // Parse custom metadata out of the description block
  const parseDescription = (descStr: string) => {
    if (!descStr) return { category: '', software: '', cadFile: '', narrative: '' };
    
    const categoryMatch = descStr.match(/\[CATEGORY\]\s*(.*?)(?=\n|\[|$)/);
    const softwareMatch = descStr.match(/\[SOFTWARE\]\s*(.*?)(?=\n|\[|$)/);
    const cadFileMatch = descStr.match(/\[CAD_FILE\]\s*(.*?)(?=\n|\[|$)/);
    
    // The narrative is everything after the tags
    let narrative = descStr;
    const cleanTags = ['[CATEGORY]', '[SOFTWARE]', '[CAD_FILE]'];
    cleanTags.forEach(tag => {
      const idx = narrative.indexOf(tag);
      if (idx !== -1) {
        const nextLineIdx = narrative.indexOf('\n', idx);
        if (nextLineIdx !== -1) {
          narrative = narrative.slice(nextLineIdx + 1);
        } else {
          narrative = '';
        }
      }
    });

    return {
      category: categoryMatch?.[1]?.trim() || '',
      software: softwareMatch?.[1]?.trim() || '',
      cadFile: cadFileMatch?.[1]?.trim() || '',
      narrative: narrative.trim()
    };
  };

  const handleCardClick = (item: any) => {
    setSelectedItem(item);
    setActiveImageIdx(0);
    setActiveMediaTab('render');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0a04] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0a04] text-white font-body pb-32">
      {/* Explore Page Header */}
      <header className="max-w-6xl mx-auto px-6 pt-24 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-[#fce003] text-3xl">explore</span>
            Explore Designs
          </h1>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
            Discover outstanding CAD models, digital renders, and talent inside our community
          </p>
        </div>

        {isDesigner && (
          <Link
            href="/designer/portfolio/new"
            className="px-5 py-3 bg-[#fce003] text-black font-headline font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-[#fce003]/10 active:scale-95 transition-all flex items-center gap-2 hover:brightness-110"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            Share Your Talent
          </Link>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Toolbar: Search & Categories */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Categories Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all whitespace-nowrap ${
                  selectedCategory === cat 
                    ? 'bg-[#fce003] border-[#fce003] text-black shadow-lg shadow-[#fce003]/10' 
                    : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80 group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg group-focus-within:text-[#fce003] transition-colors">
              search
            </span>
            <input
              type="text"
              placeholder="Search designs, software, designers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-full pl-11 pr-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#fce003] transition-all"
            />
          </div>
        </div>

        {/* Designs Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white/5 border border-white/5 border-dashed rounded-3xl p-16 text-center">
            <span className="material-symbols-outlined text-white/20 text-5xl mb-4">art_track</span>
            <p className="text-[11px] font-black text-white/40 uppercase tracking-widest">No showcase designs found</p>
            <p className="text-[10px] text-white/20 mt-1">Try updating your search queries or category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map(item => {
              const parsed = parseDescription(item.description);
              const previewImage = item.images?.[0] || 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&auto=format&fit=crop&q=60';
              return (
                <div 
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden group hover:border-[#fce003]/20 hover:bg-white/[0.05] transition-all duration-300 cursor-pointer shadow-xl"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-black/40 overflow-hidden relative">
                    <img 
                      src={previewImage} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt={item.title} 
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 bg-white/10 text-white font-mono text-[8px] uppercase tracking-wider rounded-md border border-white/10">
                          {parsed.category || item.category || 'Portfolio'}
                        </span>
                        <p className="text-white text-sm font-headline font-black uppercase tracking-tight pt-1.5">{item.title}</p>
                      </div>
                    </div>

                    {/* CAD Badge if OBJ exists */}
                    {parsed.cadFile && (
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-[#00fbfe] border border-[#00fbfe]/20 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">deployed_code</span>
                        3D Viewable
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-[#fce003]/10 border border-[#fce003]/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.designer?.avatarUrl ? (
                          <img src={item.designer.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-[#fce003]">
                            {item.designer?.fullName?.charAt(0).toUpperCase() || 'D'}
                          </span>
                        )}
                      </div>
                      
                      <div className="min-w-0">
                        <h3 className="text-[11px] font-black text-white uppercase truncate">{item.title}</h3>
                        <p className="text-[9px] text-[#fce003] font-bold uppercase tracking-tight truncate">
                          {item.designer?.fullName || 'Anonymous Designer'}
                        </p>
                      </div>
                    </div>

                    <span className="material-symbols-outlined text-white/20 group-hover:text-[#fce003] transition-colors shrink-0 text-lg">
                      arrow_forward_ios
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Artstation Detail Modal */}
      {selectedItem && (() => {
        const parsed = parseDescription(selectedItem.description);
        const imagesList = selectedItem.images || [];
        const hasCad = !!parsed.cadFile;
        return (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
              onClick={() => setSelectedItem(null)}
            ></div>

            {/* Modal Box */}
            <div className="relative w-full max-w-5xl h-[85vh] bg-[#0c0a04] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
              
              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-6 right-6 z-50 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center border border-white/10 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              {/* Left Column: Media Preview */}
              <div className="flex-1 bg-black/30 border-r border-white/5 relative flex flex-col">
                {/* 3D Tab Switcher if CAD file is attached */}
                {hasCad && (
                  <div className="absolute left-6 top-6 z-40 bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-1 flex gap-1">
                    <button
                      onClick={() => setActiveMediaTab('render')}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        activeMediaTab === 'render' ? 'bg-[#fce003] text-black' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[10px]">photo_library</span>
                      Renders
                    </button>
                    <button
                      onClick={() => setActiveMediaTab('3d')}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                        activeMediaTab === '3d' ? 'bg-[#00fbfe] text-black' : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[10px]">deployed_code</span>
                      Interactive 3D
                    </button>
                  </div>
                )}

                {/* Display Media based on active tab */}
                <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                  {activeMediaTab === '3d' && hasCad ? (
                    <div className="w-full h-full p-6 pt-16">
                      <ViewportCanvas 
                        fileUrl={parsed.cadFile} 
                        metalType="gold"
                        isAutoRotate={true}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center relative bg-black/40">
                      {imagesList.length > 0 ? (
                        <>
                          <img 
                            src={imagesList[activeImageIdx]} 
                            className="max-w-full max-h-[80%] object-contain" 
                            alt={selectedItem.title} 
                          />
                          {/* Left / Right arrows if multiple images */}
                          {imagesList.length > 1 && (
                            <>
                              <button
                                onClick={() => setActiveImageIdx(prev => (prev === 0 ? imagesList.length - 1 : prev - 1))}
                                className="absolute left-6 w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center border border-white/5 active:scale-95 transition-all"
                              >
                                <span className="material-symbols-outlined">chevron_left</span>
                              </button>
                              <button
                                onClick={() => setActiveImageIdx(prev => (prev === imagesList.length - 1 ? 0 : prev + 1))}
                                className="absolute right-6 w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center border border-white/5 active:scale-95 transition-all"
                              >
                                <span className="material-symbols-outlined">chevron_right</span>
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-white/20 flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-5xl">image</span>
                          <span className="text-xs uppercase font-black">No images available</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Image thumbnails for render tab */}
                {activeMediaTab === 'render' && imagesList.length > 1 && (
                  <div className="h-20 bg-black/60 border-t border-white/5 flex items-center justify-center gap-2 overflow-x-auto p-4">
                    {imagesList.map((imgUrl: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIdx(idx)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border transition-all ${
                          activeImageIdx === idx ? 'border-[#fce003] scale-105' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img src={imgUrl} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Details Sidebar */}
              <div className="w-full md:w-80 bg-[#161308] overflow-y-auto p-8 flex flex-col gap-6 shrink-0 text-left">
                {/* Title */}
                <div>
                  <span className="text-[8px] font-black text-[#fce003] uppercase tracking-widest border border-[#fce003]/20 bg-[#fce003]/5 px-2 py-0.5 rounded">
                    {parsed.category || selectedItem.category || 'CAD Design'}
                  </span>
                  <h2 className="text-xl font-headline font-black text-white uppercase tracking-tight mt-2.5">
                    {selectedItem.title}
                  </h2>
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-wide mt-1">
                    Published: {new Date(selectedItem.created_at || selectedItem.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>

                {/* Designer Card */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#fce003]/10 border border-[#fce003]/20 flex items-center justify-center overflow-hidden">
                      {selectedItem.designer?.avatarUrl ? (
                        <img src={selectedItem.designer.avatarUrl} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black text-[#fce003]">
                          {selectedItem.designer?.fullName?.charAt(0).toUpperCase() || 'D'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white uppercase truncate">
                        {selectedItem.designer?.fullName || 'Anonymous Designer'}
                      </p>
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-0.5 truncate">
                        {selectedItem.designer?.specialty || 'CAD Designer'}
                      </p>
                    </div>
                  </div>

                  {selectedItem.designer?.email && (
                    <Link
                      href={`/inbox/compose?to=${selectedItem.designer.email}&subject=Inquiry about: ${encodeURIComponent(selectedItem.title)}`}
                      className="w-full bg-[#fce003] text-black font-headline font-black text-[9px] uppercase tracking-widest py-3 rounded-xl hover:brightness-110 active:scale-95 transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-[#fce003]/10"
                    >
                      <span className="material-symbols-outlined text-sm">mail</span>
                      Contact Designer
                    </Link>
                  )}
                </div>

                {/* Software Used Tags */}
                {parsed.software && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Software Used</h4>
                    <div className="flex gap-1.5 flex-wrap">
                      {parsed.software.split(',').map((sw: string) => (
                        <span 
                          key={sw}
                          className="px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-white/80 uppercase tracking-tight"
                        >
                          {sw.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Narrative */}
                <div className="space-y-2 flex-1">
                  <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Project Narrative</h4>
                  <div className="text-xs text-white/70 leading-relaxed max-h-[25vh] overflow-y-auto pr-1 no-scrollbar whitespace-pre-wrap">
                    {parsed.narrative || selectedItem.description || 'No narrative provided.'}
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
