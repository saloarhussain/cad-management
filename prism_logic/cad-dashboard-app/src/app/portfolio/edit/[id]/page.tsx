"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getPortfolioItem, getPublicDesignerProfile, getPublicPortfolioItems } from '@/app/actions';
import { useAuth } from '@/components/AuthProvider';
const SOFTWARE_META_MAP: Record<string, { name: string; logo: string; role: string }> = {
  rhino: { name: 'Rhinoceros 3D', logo: '/rhino-logo.png', role: 'NURBS & Computational CAD' },
  rhinoceros: { name: 'Rhinoceros 3D', logo: '/rhino-logo.png', role: 'NURBS & Computational CAD' },
  matrixgold: { name: 'MatrixGold', logo: '/matrixgold-logo.png', role: 'Parametric Jewelry Suite' },
  keyshot: { name: 'KeyShot', logo: '/keyshot-logo.jpg', role: 'Real-Time Ray-Tracing & Rendering' },
  zbrush: { name: 'ZBrush', logo: '/zbrush-logo.jpg', role: 'High-Poly Digital Sculpting' },
  solidworks: { name: 'SolidWorks', logo: '/solidworks-logo.png', role: 'Mechanical Parametric Design' },
  jewelcad: { name: 'JewelCAD', logo: '/jewelcad-logo.png', role: 'Jewelry CAD & Stone Settings' },
  blender: { name: 'Blender', logo: '/blender-logo.png', role: '3D Mesh & Shader Pipeline' },
};

const resolveSoftwareList = (rawSoftware: any, rawDescription?: string, defaultFallback = 'KeyShot') => {
  let items: string[] = [];
  if (Array.isArray(rawSoftware)) {
    items = rawSoftware.filter(Boolean);
  } else if (typeof rawSoftware === 'string' && rawSoftware.trim()) {
    items = rawSoftware.split(/[,/&+]+|\band\b/i).map((s: string) => s.trim()).filter(Boolean);
  }
  
  if (items.length === 0 && rawDescription && typeof rawDescription === 'string') {
    const descLower = rawDescription.toLowerCase();
    for (const [key, meta] of Object.entries(SOFTWARE_META_MAP)) {
      if (descLower.includes(key)) {
        if (!items.some(it => it.toLowerCase().includes(key))) {
          items.push(meta.name);
        }
      }
    }
  }

  if (items.length === 0) {
    items = [defaultFallback];
  }

  const seen = new Set<string>();
  const result: Array<{ name: string; logo: string | null; role: string; raw: string }> = [];

  for (const clean of items) {
    const lower = clean.toLowerCase();
    let matched = false;
    for (const [key, meta] of Object.entries(SOFTWARE_META_MAP)) {
      if (lower.includes(key)) {
        if (!seen.has(meta.name)) {
          seen.add(meta.name);
          result.push({
            name: meta.name,
            logo: meta.logo,
            role: meta.role,
            raw: clean
          });
        }
        matched = true;
        break;
      }
    }
    if (!matched && !seen.has(clean)) {
      seen.add(clean);
      result.push({
        name: clean,
        logo: null,
        role: 'CAD & 3D Modeling Suite',
        raw: clean
      });
    }
  }

  return result;
};

export default function PortfolioDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();

  const [item, setItem] = useState<any>(null);
  const [designer, setDesigner] = useState<any>(null);
  const [siblingItems, setSiblingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Viewport & Lightbox States
  const [selectedImgIdx, setSelectedImgIdx] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(3840);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [reviewInput, setReviewInput] = useState<string>('');
  const [comments, setComments] = useState<Array<{ id: string; author: string; text: string; time: string }>>([
    { id: '1', author: 'Henri Dufour', text: 'Micro-prong setting geometry is immaculate. Bench-ready casting fidelity.', time: '2d ago' },
    { id: '2', author: 'Elena Rostova', text: 'Wall tolerances are calculated for platinum shrinkage accurately.', time: '1d ago' }
  ]);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      try {
        const res = await getPortfolioItem(id);
        if (res.success && res.data) {
          setItem(res.data);
          const designerId = res.data.designer_id || res.data.user_id;
          if (designerId) {
            const [profRes, itemsRes] = await Promise.all([
              getPublicDesignerProfile(designerId),
              getPublicPortfolioItems(designerId)
            ]);
            if (profRes?.designer) {
              setDesigner(profRes.designer);
            }
            if (itemsRes?.items && itemsRes.items.length > 0) {
              setSiblingItems(itemsRes.items);
            }
          }
        }
      } catch (err) {
        console.error('Error loading portfolio item:', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      loadItem();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-[#d9ee3c] border-t-transparent rounded-full animate-spin"></div>
        <span className="mt-4 font-bold text-xs uppercase tracking-widest text-[#d9ee3c]">Loading Haute Atelier Dossier...</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#08090C] text-white flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-5xl text-zinc-600 mb-3">draft</span>
        <p className="text-base font-bold text-zinc-300">Portfolio Dossier Not Found</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">This piece may have been relocated or archived by the creator.</p>
        <Link href="/designer/profile" className="mt-5 px-4 py-2 rounded-lg bg-[#d9ee3c] text-[#1a1e00] text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all">
          Back to Atelier Profile
        </Link>
      </div>
    );
  }

  // Parse description fields
  const description = item.description || '';
  const categoryMatch = description.match(/\[CATEGORY\]\s*(.*?)(?=\n|\[|$)/i);
  const softwareMatch = description.match(/\[SOFTWARE\]\s*(.*?)(?=\n|\[|$)/i);
  const cadFileMatch = description.match(/\[CAD_FILE\]\s*(.*?)(?=\n|\[|$)/i);

  const category = categoryMatch ? categoryMatch[1]?.trim() : '3D CAD MODELING';
  const rawSoftware = softwareMatch ? softwareMatch[1]?.trim() : 'ZBrush, Rhino';
  const softwareTags = rawSoftware ? rawSoftware.split(/[,/]+/).map((s: string) => s.trim()).filter(Boolean) : ['ZBrush', 'MatrixGold'];
  const primaryToolchain = softwareTags[0] || 'ZBrush';
  const softwareList = resolveSoftwareList(rawSoftware, description);
  const cadFile = cadFileMatch ? cadFileMatch[1]?.trim() : (item.cad_file || '');

  // Extract clean narrative
  let narrative = description;
  ['[CATEGORY]', '[SOFTWARE]', '[CAD_FILE]'].forEach(tag => {
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
  narrative = narrative.trim();
  if (!narrative) {
    narrative = `${item.title} engineered with precision CAD modeling. Designed with calculated metal wall thickness, microscopic anatomical sculpt fidelity, and bench-ready lost-wax cast feasibility.`;
  }

  // Parse images
  let parsedImages: string[] = [];
  if (Array.isArray(item.images)) {
    parsedImages = item.images.filter((x: any) => typeof x === 'string');
  } else if (typeof item.images === 'string') {
    try {
      const p = JSON.parse(item.images);
      if (Array.isArray(p)) parsedImages = p.filter((x: any) => typeof x === 'string');
      else if (typeof p === 'string') parsedImages = [p];
    } catch {
      parsedImages = item.images.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  // Default fallback showcase images if none provided
  const defaultFallbackImages = [
    {
      url: 'https://lh3.googleusercontent.com/aida/AEtjO1Vd9IBP-NrMi_DcJFFABhUK2xpTO9lw12cKmriyj56K8vRCcWkK8HktLCJFzJA4TfzvabxnVkNkawDp745l4g7c-E7FHo58qkk_i8v0Wv5bTPOcOpcxkZiy5A003NXNxjBATqsJbYjNI-cjDwWfTuEhu7FkRS7j5AfPcHGuKQSZtP3kXXSB85wDsTMcDwcaPNTxK0yuDwyR-86Z9YA-ip4vT7d0TsA43YaRB2BJUAQ_A4EKCu9EmdGYPs1l',
      label: 'Persp 01'
    },
    {
      url: 'https://lh3.googleusercontent.com/aida/AEtjO1UPXDG38Rm13qrBweV3VNQZynlKcroh9xuMSoPzdbIZ1FzDcYVV_YhdQwNC2d0Cr46JRkP_-ORN9n5daEaPArTEVWpaasZgZA5SUwWjXNayCp7Yknbn5suPJVrZP3TiEOsXTwmUOXy82GH9Yd3d4jzZws8mFU2UbtiOIUlZTwI1rribnVJr3FGHUYzWGSPNakkPhQOkPlPPsOqXLWYezD_In4WlILDM-6jEjRfUfcOkvOkptZ1f7zWSaHd3',
      label: 'Wireframe'
    },
    {
      url: 'https://lh3.googleusercontent.com/aida/AEtjO1WcfOCcD4_FVjv-EgCR2ELgVGB8vlLXt0yB3dTZ9-UThOdunSc3y0Y2Eu8nSz40GXF-Diu38i4VuQ1ROzcQLsci9OL1w_w93YnYqjHjiFR4Xpzd2fCsxhh934jBovXAz1Isijar36dipiZe0LLOhEAmEAJruTSNQDXZ7_1gUvjOXYXlYLEv8XYMrI0vFAV818sqOjaAe56QG2kWa0g8HOkD-v922anUXudMdhQgXygUbW5jGZeIwoU3LEY3',
      label: 'Prongs'
    }
  ];

  const displayImages = parsedImages.length > 0 
    ? parsedImages.map((u, i) => ({ url: u, label: i === 0 ? 'Persp 01' : i === 1 ? 'Wireframe' : `View 0${i + 1}` }))
    : defaultFallbackImages;

  const currentImage = displayImages[selectedImgIdx]?.url || displayImages[0].url;

  // Sibling navigation
  const currentIdxInSiblings = siblingItems.findIndex(x => x.id === item.id);
  const handlePrev = () => {
    if (siblingItems.length <= 1) return;
    const prevIndex = currentIdxInSiblings > 0 ? currentIdxInSiblings - 1 : siblingItems.length - 1;
    router.push(`/portfolio/edit/${siblingItems[prevIndex].id}`);
  };

  const handleNext = () => {
    if (siblingItems.length <= 1) return;
    const nextIndex = currentIdxInSiblings < siblingItems.length - 1 ? currentIdxInSiblings + 1 : 0;
    router.push(`/portfolio/edit/${siblingItems[nextIndex].id}`);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setShowSuccessToast('Dossier link copied to clipboard!');
      setTimeout(() => {
        setCopiedLink(false);
        setShowSuccessToast(null);
      }, 2500);
    }
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewInput.trim()) return;
    const authorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atelier Visitor';
    setComments(prev => [
      ...prev,
      {
        id: String(Date.now()),
        author: authorName,
        text: reviewInput.trim(),
        time: 'Just now'
      }
    ]);
    setReviewInput('');
    setShowSuccessToast('Technical review posted successfully.');
    setTimeout(() => setShowSuccessToast(null), 2500);
  };

  const creatorName = designer?.fullName || designer?.organizationName || 'Saloar hussain';
  const creatorFirstName = creatorName.split(' ')[0] || 'Saloar';
  const creatorAvatar = designer?.avatarUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCHIqk87oggK5TPsjoUaYgF7PHHn4IuOD8iZUBOBBRsVsayp1WGVkMVJJG_8xH62jo3KfjCpf28Bs1yi-VkgwyXHY_8X7F5zJ_UCLdoPGDzuxVYIExhwLbsOKSkWSTCmI7eLql7RtNwooxqk0aJpu-h1oBmWYWhaHht_6QbmFot9WbDXJmKK4zXxLi470FjM4iAOmYJKOdmQN464OB8Ol2G7qXGtE444Bej5ZN4Wsid5Yfn1lboWNjx6A';
  const dossierId = `HJ-${String(item.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || '2025-09'}`;

  return (
    <div className="bg-[#08090C] text-[#e3e2e7] font-sans antialiased h-screen max-h-screen overflow-hidden flex flex-col selection:bg-[#d9ee3c] selection:text-[#1a1e00]">
        {/* Toast Alert */}
        {showSuccessToast && (
          <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#14161E] border border-[#d9ee3c]/50 text-white shadow-2xl animate-fade-in">
            <span className="material-symbols-outlined text-[#d9ee3c] text-base">check_circle</span>
            <span className="text-xs font-semibold">{showSuccessToast}</span>
          </div>
        )}

        {/* Global Fixed Luxury Navigation Header */}
        <header className="shrink-0 w-full z-40 bg-[#14161E]/95 backdrop-blur-xl border-b border-[#282D3C]">
          <div className="h-16 md:h-20 w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-6">
            <div className="flex items-center gap-6 shrink-0">
              <Link href="/explore" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded bg-[#d9ee3c] flex items-center justify-center shadow-[0_0_16px_rgba(217,238,60,0.35)] group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[#1a1e00] font-bold text-xl">diamond</span>
                </div>
                <span className="font-extrabold text-base sm:text-xl text-white tracking-tight uppercase">CADONCE</span>
              </Link>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E222D] border border-[#282D3C]">
                <span className="w-2 h-2 rounded-full bg-[#4ffeb9] shadow-[0_0_8px_rgba(79,254,185,0.8)] animate-pulse"></span>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Atelier Online</span>
              </div>
            </div>

            {/* Global Search */}
            <div className="hidden md:flex flex-1 max-w-md items-center">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">search</span>
                <input 
                  type="text" 
                  placeholder="Search High-Jewellery CAD, gemstone maps, ateliers..." 
                  className="w-full bg-[#0D0E12] border border-[#282D3C] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d9ee3c] focus:ring-1 focus:ring-[#d9ee3c] transition-all"
                />
              </div>
            </div>

            {/* Nav Links */}
            <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold">
              <Link href="/explore" className="text-zinc-400 hover:text-white transition-colors">Haute Ateliers</Link>
              <Link href="/portfolio" className="text-zinc-400 hover:text-white transition-colors">Jewellery CAD Vault</Link>
              <Link href="/team" className="text-zinc-400 hover:text-white transition-colors">Master Goldsmiths</Link>
              <Link href="/projects" className="text-zinc-400 hover:text-white transition-colors">Couture Awards</Link>
            </nav>

            {/* Action Bar */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button 
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#d9ee3c] text-[#1a1e00] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(217,238,60,0.45)]"
              >
                <span className="material-symbols-outlined text-base">{copiedLink ? 'check' : 'ios_share'}</span>
                <span className="hidden md:inline">{copiedLink ? 'Copied' : 'Share Dossier'}</span>
              </button>
              <Link 
                href="/designer/profile" 
                className="w-8 h-8 rounded-full bg-zinc-800 border border-[#282D3C] hover:border-[#d9ee3c] flex items-center justify-center transition-colors overflow-hidden"
                title="Your Atelier Profile"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-zinc-300 text-[18px]">person</span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="w-full flex-1 flex flex-col overflow-hidden min-h-0 relative bg-[#08090C]">
          {/* Breadcrumb / Sub-Header Bar */}
          <div className="w-full bg-[#0D0E12] border-b border-[#282D3C] px-4 sm:px-6 lg:px-10 py-2.5 sm:py-3 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
              <Link 
                href={designer?.id ? `/portfolio/${designer.id}` : "/designer/profile"} 
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-[#d9ee3c] font-semibold text-xs sm:text-sm transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                <span>Back to Dossiers</span>
              </Link>
              <span className="text-[#282D3C]">/</span>
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold hidden sm:inline">Haute Joaillerie CAD</span>
              <span className="text-[#282D3C] hidden sm:inline">/</span>
              <span className="text-white font-semibold text-xs sm:text-sm truncate max-w-[180px] sm:max-w-xs">{item.title}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1.5 text-zinc-400 text-[11px] font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-[#4ffeb9] shadow-[0_0_6px_rgba(79,254,185,0.8)]"></span>
                <span>PROJECT DOSSIER #{dossierId}</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handlePrev} 
                  disabled={siblingItems.length <= 1}
                  className="p-1.5 rounded-lg bg-[#14161E] text-zinc-400 hover:text-white hover:border-[#d9ee3c] border border-[#282D3C] disabled:opacity-40 disabled:hover:text-zinc-400 transition-colors" 
                  title="Previous Project"
                >
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <button 
                  onClick={handleNext} 
                  disabled={siblingItems.length <= 1}
                  className="p-1.5 rounded-lg bg-[#14161E] text-zinc-400 hover:text-white hover:border-[#d9ee3c] border border-[#282D3C] disabled:opacity-40 disabled:hover:text-zinc-400 transition-colors" 
                  title="Next Project"
                >
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2-Column Dossier Workspace */}
          <div className="w-full flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
            {/* LEFT COLUMN: CAD Interactive Viewport (~60%) */}
            <div className="relative w-full lg:w-[60%] flex flex-col bg-[#0D0E12] border-b lg:border-b-0 lg:border-r border-[#282D3C] select-none flex-none lg:h-full lg:min-h-0 lg:overflow-y-auto overscroll-contain">
              {/* Viewport Top Badges & Controls Header */}
              <div className="sticky top-0 left-0 right-0 z-20 flex items-center justify-between p-3 sm:p-4 bg-[#0D0E12]/95 backdrop-blur-md border-b border-[#282D3C]/60 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1A1C23]/90 border border-[#282D3C]">
                    <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                    <span className="text-[11px] font-bold tracking-wider text-white uppercase">{primaryToolchain}</span>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 rounded bg-[#1A1C23]/90 border border-[#282D3C]">
                    <span className="text-[11px] font-bold tracking-wider text-[#ffb955] uppercase">{category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {cadFile && (
                    <a 
                      href={cadFile} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#d9ee3c] text-[#1a1e00] text-xs font-bold hover:brightness-110 transition-all shadow-md"
                      title="Download Master CAD Asset"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span className="hidden sm:inline">CAD FILE</span>
                    </a>
                  )}
                  <button 
                    onClick={() => {
                      if (typeof document !== 'undefined') {
                        if (!document.fullscreenElement) {
                          document.documentElement.requestFullscreen?.();
                          setIsFullscreen(true);
                        } else {
                          document.exitFullscreen?.();
                          setIsFullscreen(false);
                        }
                      }
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1A1C23]/90 border border-[#282D3C] flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#d9ee3c] transition-all shadow-lg" 
                    title="Toggle Fullscreen CAD View"
                  >
                    <span className="material-symbols-outlined text-lg sm:text-xl">
                      {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Renders / Views Feed */}
              <div className="flex-1 flex flex-col gap-6 p-4 sm:p-6">
                {displayImages.map((img, idx) => (
                  <div 
                    key={idx} 
                    id={`designer-viewport-img-${idx}`}
                    className="relative w-full rounded-2xl bg-gradient-to-b from-[#08090C] to-[#14161E] border border-[#282D3C] flex items-center justify-center overflow-hidden p-2 sm:p-4 group shadow-xl min-h-[380px]"
                  >
                    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#282D3C_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>
                    <img 
                      src={img.url} 
                      alt={img.label} 
                      className="w-full h-auto max-h-[82vh] object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.01]" 
                    />
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-2 p-1.5 px-3 rounded-lg bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] shadow-lg pointer-events-none">
                      <span className="w-2 h-2 rounded-full bg-[#4ffeb9] shadow-[0_0_6px_rgba(79,254,185,0.9)]"></span>
                      <span className="text-[10px] text-zinc-300 tracking-wider uppercase font-bold">{img.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Viewport Bottom Carousel / Projection Angle Thumbnails */}
              {displayImages.length > 1 && (
                <div className="sticky bottom-0 h-16 w-full bg-[#14161E]/95 backdrop-blur-md border-t border-[#282D3C] px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-20 shrink-0">
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {displayImages.map((img, idx) => {
                      const isCurrent = idx === selectedImgIdx;
                      return (
                        <button 
                          key={idx}
                          onClick={() => {
                            setSelectedImgIdx(idx);
                            const el = document.getElementById(`designer-viewport-img-${idx}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }}
                          className={`relative w-14 sm:w-16 h-10 rounded overflow-hidden shrink-0 transition-all ${
                            isCurrent 
                              ? 'border-2 border-[#d9ee3c] shadow-[0_0_10px_rgba(217,238,60,0.3)]' 
                              : 'border border-[#282D3C] hover:border-zinc-400 opacity-75 hover:opacity-100'
                          }`}
                          title={img.label}
                        >
                          <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-[#08090C]/80 text-[8px] text-zinc-300 text-center truncate font-bold uppercase px-0.5">
                            {img.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d9ee3c]"></span>
                    <span>{displayImages.length} VIEWS</span>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Creator Header, Dossier Specs, Engagement & Sticky Commission CTA (~40%) */}
            <div className="flex-none lg:flex-1 lg:w-[40%] flex flex-col justify-between bg-[#14161E] lg:overflow-hidden lg:h-full lg:min-h-0">
                {/* Top Creator Profile Header Bar */}
                <div className="p-4 sm:p-5 border-b border-[#282D3C] flex items-center justify-between gap-3 bg-[#14161E]/90 backdrop-blur-sm shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full p-[1.5px] bg-[#282D3C] overflow-hidden border border-[#282D3C]">
                        <img 
                          src={creatorAvatar} 
                          alt={creatorName} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#4ffeb9] border-2 border-[#14161E] shadow-[0_0_6px_rgba(79,254,185,0.8)]"></span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base text-white font-bold truncate">{creatorName}</span>
                        <span className="material-symbols-outlined text-[#ffb955] text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }} title="Verified Master CAD Modeler">verified</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-400 truncate">
                        <span className="text-zinc-400 truncate">{designer?.specialty || 'Minecom Portfolio'}</span>
                        <span className="text-[#282D3C]">•</span>
                        <span className="text-zinc-500 truncate">{designer?.organizationName || 'Minecom Haute Joaillerie'}</span>
                        <span className="text-[#282D3C]">•</span>
                        <button 
                          onClick={() => setIsFollowing(!isFollowing)}
                          className={`font-bold ml-0.5 shrink-0 transition-colors ${
                            isFollowing ? 'text-[#4ffeb9]' : 'text-[#d9ee3c] hover:underline'
                          }`}
                        >
                          {isFollowing ? 'Following' : '+ Follow'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      onClick={handleShare}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1E222D] transition-colors" 
                      title="Share Project"
                    >
                      <span className="material-symbols-outlined text-xl">{copiedLink ? 'check' : 'share'}</span>
                    </button>
                  </div>
                </div>

                {/* Scrollable Dossier Content & Technical Specifications */}
                <div className="flex-none lg:flex-1 lg:overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 lg:min-h-0 overscroll-contain">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#ffb955] font-bold uppercase tracking-wider">{category}</span>
                      <span className="text-xs text-zinc-500">Maison Dossier 2025</span>
                    </div>
                    <h1 className="text-2xl text-white font-bold tracking-tight mt-0.5">{item.title}</h1>
                    <p className="text-sm text-zinc-300 leading-relaxed mt-1">{narrative}</p>
                  </div>

                  {/* Hashtags */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      `#${primaryToolchain.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
                      `#${category.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
                      '#MATRIXGOLD',
                      '#HIGHJEWELRY',
                      '#BENCHREADY',
                      '#GIACOMPLIANT'
                    ].map((tag, tIdx) => (
                      <span 
                        key={tIdx} 
                        className="px-2.5 py-1 rounded-md bg-[#1B1E28] border border-[#282D3C] text-zinc-400 text-[11px] font-semibold hover:text-[#d9ee3c] hover:border-[#d9ee3c] cursor-pointer transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Software Used to Achieve This Design */}
                  <div className="flex flex-col gap-2.5 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">
                        SOFTWARE USED TO ACHIEVE THIS DESIGN
                      </span>
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
                        Production Stack
                      </span>
                    </div>

                    <div className={`grid gap-2.5 ${softwareList.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {softwareList.map((sw, sIdx) => (
                        <div 
                          key={sIdx} 
                          className="p-3.5 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-[#3E4557] transition-all flex items-center gap-3.5"
                        >
                          <div className="w-11 h-11 rounded-lg bg-[#14161E] border border-[#282D3C] flex items-center justify-center overflow-hidden shrink-0 p-1.5 shadow-sm">
                            {sw.logo ? (
                              <img 
                                src={sw.logo} 
                                alt={sw.name} 
                                className="w-full h-full object-contain" 
                              />
                            ) : (
                              <span className="material-symbols-outlined text-xl text-[#d9ee3c]">deployed_code</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-bold text-white block truncate">{sw.name}</span>
                            <span className="text-[11px] text-zinc-400 block truncate mt-0.5">{sw.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>


                  {/* Recent Atelier Reviews */}
                  {comments.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2">
                      <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">TECHNICAL REVIEWS ({comments.length})</span>
                      <div className="space-y-2">
                        {comments.map(c => (
                          <div key={c.id} className="p-3 rounded-lg bg-[#1E222D]/60 border border-[#282D3C]/60 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white">{c.author}</span>
                              <span className="text-[10px] text-zinc-500">{c.time}</span>
                            </div>
                            <p className="text-xs text-zinc-300">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sticky Bottom Bar: Social Engagement + Review Input + High Impact Hire CTA */}
                <div className="p-4 sm:p-5 border-t border-[#282D3C] bg-[#14161E]/95 backdrop-blur-md flex flex-col gap-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      {/* Likes */}
                      <button 
                        onClick={() => {
                          setHasLiked(!hasLiked);
                          setLikesCount(prev => hasLiked ? prev - 1 : prev + 1);
                        }}
                        className={`flex items-center gap-1.5 transition-colors group ${
                          hasLiked ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                        }`} 
                        title="Like Project"
                      >
                        <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">
                          {hasLiked ? 'favorite' : 'favorite_border'}
                        </span>
                        <span className="text-sm text-white font-bold">{likesCount.toLocaleString()}</span>
                      </button>

                      {/* Comments count */}
                      <button 
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group" 
                        title="Comments"
                      >
                        <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">chat_bubble_outline</span>
                        <span className="text-sm text-white font-bold">{comments.length}</span>
                      </button>

                      {/* Share */}
                      <button 
                        onClick={handleShare}
                        className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group" 
                        title="Share Creation"
                      >
                        <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">share</span>
                      </button>
                    </div>

                    {/* Bookmark */}
                    <button 
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className={`transition-colors ${
                        isBookmarked ? 'text-[#d9ee3c]' : 'text-zinc-400 hover:text-[#d9ee3c]'
                      }`} 
                      title="Bookmark to Collection"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {isBookmarked ? 'bookmark' : 'bookmark_border'}
                      </span>
                    </button>
                  </div>

                  {/* Review Input */}
                  <form onSubmit={handlePostReview} className="relative w-full">
                    <input 
                      type="text" 
                      value={reviewInput}
                      onChange={(e) => setReviewInput(e.target.value)}
                      placeholder={`Add technical review or inquiry for ${creatorFirstName}...`} 
                      className="w-full bg-[#0D0E12] border border-[#282D3C] rounded-lg pl-3 pr-16 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d9ee3c] transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!reviewInput.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#d9ee3c] hover:underline font-bold px-2 py-1 disabled:opacity-40"
                    >
                      POST
                    </button>
                  </form>

                  {/* Commission Bespoke Piece CTA */}
                  <Link 
                    href={`/inbox?hire=${designer?.id || item.id}&title=${encodeURIComponent(item.title)}`}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#d9ee3c] text-[#1a1e00] text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(217,238,60,0.4)] active:translate-y-0"
                  >
                    <span className="material-symbols-outlined text-xl">mail</span>
                    <span>COMMISSION BESPOKE PIECE / HIRE {creatorFirstName.toUpperCase()}</span>
                  </Link>
                </div>
              </div>
            </div>
        </main>
      </div>
  );
}
