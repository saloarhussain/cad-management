"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import ViewportCanvas from '@/components/viewport/ViewportCanvas';
import { getPublicPortfolioItems, getPublicDesignerStatus, getPublicDesignerProfile } from '@/app/actions';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = error => reject(error);
  });
};

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  images: string[];
  cadFiles: { name: string; size: number; url?: string; data?: ArrayBuffer }[];
  productType?: string;
  ringSize?: string;
  mainGems?: string;
  sideGems?: string;
  metalWeight?: string;
  metalWeightImage?: string | null;
  braceletSize?: string;
  customLabel?: string;
  customValue?: string;
  materialArchitecture?: {
    metalType: string;
    estWeight: string;
    surfaceFinish: string;
  };
  gemstoneInventory?: {
    centerStone: string;
    sideAccents: string;
  };
}

const getCadFileUrl = (item: any): string | null => {
  if (!item) return null;
  if (item.cad_file && typeof item.cad_file === 'string' && item.cad_file.trim().length > 5) return item.cad_file.trim();
  if (item.cad_file_url && typeof item.cad_file_url === 'string' && item.cad_file_url.trim().length > 5) return item.cad_file_url.trim();
  if (item.cadFileUrl && typeof item.cadFileUrl === 'string' && item.cadFileUrl.trim().length > 5) return item.cadFileUrl.trim();
  if (item.model_url && typeof item.model_url === 'string' && item.model_url.trim().length > 5) return item.model_url.trim();
  if (item.modelUrl && typeof item.modelUrl === 'string' && item.modelUrl.trim().length > 5) return item.modelUrl.trim();

  const checkCadFiles = (files: any): string | null => {
    if (!files) return null;
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (!f) continue;
        if (typeof f === 'string' && /\.(glb|gltf|stl|obj|3dm|step|stp|fbx|iges|igs|sldprt|dwg|dxf)($|\?)/i.test(f)) return f;
        if (typeof f === 'object' && f.url && /\.(glb|gltf|stl|obj|3dm|step|stp|fbx|iges|igs|sldprt|dwg|dxf)($|\?)/i.test(f.url || f.name)) return f.url;
      }
    }
    if (typeof files === 'string') {
      try {
        const parsed = JSON.parse(files);
        return checkCadFiles(parsed);
      } catch {
        if (/\.(glb|gltf|stl|obj|3dm|step|stp|fbx|iges|igs|sldprt|dwg|dxf)($|\?)/i.test(files)) return files;
      }
    }
    return null;
  };

  const foundInCadFiles = checkCadFiles(item.cad_files) || checkCadFiles(item.cadFiles) || checkCadFiles(item.files);
  if (foundInCadFiles) return foundInCadFiles;

  if (typeof item.description === 'string') {
    const cadMatch = item.description.match(/\[CAD_FILE\]\s*([^\s\n\r]+)/i);
    if (cadMatch && cadMatch[1]) {
      const cadVal = cadMatch[1].trim();
      if (cadVal && cadVal !== 'undefined' && cadVal !== 'null' && cadVal !== 'none' && cadVal.length > 5) {
        return cadVal;
      }
    }
  }

  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === 'string' && /\.(glb|gltf|stl|obj|3dm|step|stp)($|\?)/i.test(img)) return img;
    }
  }

  return null;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <span className="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
          <p className="text-sm font-bold text-gray-400">Failed to load 3D model.</p>
          <p className="text-xs text-gray-600 mt-1">Please check the file or try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

const parseItemDescription = (desc: any) => {
  if (!desc || typeof desc !== 'string') return { category: '', software: '', cadFile: '', narrative: '' };
  const descStr = desc.trim();
  const categoryMatch = descStr.match(/\[CATEGORY\]\s*(.*?)(?=\n|\[|$)/i);
  const softwareMatch = descStr.match(/\[SOFTWARE\]\s*(.*?)(?=\n|\[|$)/i);
  const cadFileMatch = descStr.match(/\[CAD_FILE\]\s*(.*?)(?=\n|\[|$)/i);
  
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

const getModalImages = (item: any): string[] => {
  if (!item) return [];
  let imgs: string[] = [];
  if (Array.isArray(item.images)) {
    imgs = item.images.filter((x: any) => typeof x === 'string' && !/\.(glb|gltf|stl|obj|3dm|step|stp)($|\?)/i.test(x));
  } else if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images);
      if (Array.isArray(parsed)) {
        imgs = parsed.filter((x: any) => typeof x === 'string' && !/\.(glb|gltf|stl|obj|3dm|step|stp)($|\?)/i.test(x));
      } else if (typeof parsed === 'string') {
        imgs = [parsed];
      }
    } catch {
      imgs = item.images.split(',').map((s: string) => s.trim()).filter((s: string) => s && !/\.(glb|gltf|stl|obj|3dm|step|stp)($|\?)/i.test(s));
    }
  }
  if (item.image && typeof item.image === 'string' && !imgs.includes(item.image) && !/\.(glb|gltf|stl|obj|3dm|step|stp)($|\?)/i.test(item.image)) {
    imgs.unshift(item.image);
  }
  return imgs.length > 0 ? imgs : ['https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&auto=format&fit=crop&q=80'];
};

export default function PublicPortfolio({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [orgCount, setOrgCount] = useState(0);
  const [jobsCount, setJobsCount] = useState(0);
  const [projects, setProjects] = useState<any[]>([]);
  const [designer, setDesigner] = useState<any>(null);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditingProductId, setCurrentEditingProductId] = useState<number | null>(null);
  const [selectedProductForView, setSelectedProductForView] = useState<any>(null);
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: '', 
    productType: 'Ring',
    image: '', 
    mainImage: null as File | null,
    galleryImages: [] as File[],
    cadFiles: [] as File[],
    metalWeightImage: null as File | null,
    ringSize: '',
    mainGems: '',
    sideGems: '',
    metalWeight: '',
    braceletSize: '',
    customLabel: '',
    customValue: ''
  });

  useEffect(() => {
    const loadData = async () => {
      // Robust ID extraction: extract valid UUID from params, pathname, or logged-in user
      let targetId = params.id;
      if (typeof window !== 'undefined') {
        const match = window.location.pathname.match(/[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}/);
        if (match) {
          targetId = match[0];
        } else {
          const rawClean = window.location.pathname.replace(/^\/portfolio\/?/i, '').replace(/[^0-9a-fA-F-]/g, '');
          if (rawClean.length >= 30) {
            targetId = rawClean;
          }
        }
      }

      if ((!targetId || targetId.length < 20) && user?.id) {
        targetId = user.id;
      }

      if (targetId) {
        // Fetch designer profile + portfolio items via API route (reliable, no env var issues)
        try {
          const res = await fetch(`/api/portfolio/${targetId}`);
          const data = await res.json();
          if (data.designer) setDesigner(data.designer);
          if (data.items && data.items.length > 0) setPortfolioItems(data.items);
          if (typeof data.completedJobsCount === 'number') setJobsCount(data.completedJobsCount);
        } catch (e) {
          console.error('[portfolio] API fetch failed:', e);
        }

        // Load shop products via readDb
        try {
          const { readDb } = await import('@/lib/db');
          const db = await readDb(targetId);
          if (db.products && db.products.length > 0) {
            setProducts(db.products.map((p: any) => ({
              ...p,
              cadFiles: p.cad_files || p.cadFiles,
              productType: p.product_type || p.productType,
              ringSize: p.ring_size || p.ringSize,
              mainGems: p.main_gems || p.mainGems,
              sideGems: p.side_gems || p.sideGems,
              metalWeight: p.metal_weight || p.metalWeight,
              metalWeightImage: p.metal_weight_image || p.metalWeightImage,
              braceletSize: p.bracelet_size || p.braceletSize,
              customLabel: p.custom_label || p.customLabel,
              customValue: p.custom_value || p.customValue,
            })));
          }
          if (db.projects && db.projects.length > 0) setProjects(db.projects);
        } catch (e) {
          console.error('[portfolio] readDb failed:', e);
        }
      }
    };
    loadData();
  }, [params.id]);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'saved' | 'collabs' | 'shop'>('portfolio');
  const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<any | null>(null);

  // Lightbox Modal Extended States
  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [modalLikes, setModalLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [modalSaved, setModalSaved] = useState<Record<string, boolean>>({});
  const [modalComments, setModalComments] = useState<Record<string, Array<{ id: string; author: string; role: string; time: string; text: string; likes: number; avatar?: string; isAuthor?: boolean }>>>({});
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isDesignerFollowed, setIsDesignerFollowed] = useState<boolean>(false);
  const [copiedModalLink, setCopiedModalLink] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedPortfolioItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPortfolioItem(null);
      if (e.key === 'ArrowLeft' && portfolioItems.length > 1) {
        const idx = portfolioItems.findIndex((it: any) => it.id === selectedPortfolioItem.id);
        const prevIdx = idx > 0 ? idx - 1 : portfolioItems.length - 1;
        setSelectedPortfolioItem(portfolioItems[prevIdx]);
        setSelectedImageIdx(0);
      }
      if (e.key === 'ArrowRight' && portfolioItems.length > 1) {
        const idx = portfolioItems.findIndex((it: any) => it.id === selectedPortfolioItem.id);
        const nextIdx = idx < portfolioItems.length - 1 ? idx + 1 : 0;
        setSelectedPortfolioItem(portfolioItems[nextIdx]);
        setSelectedImageIdx(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPortfolioItem, portfolioItems]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (designer?.email) {
        const status = await getPublicDesignerStatus(designer.email);
        setOrgCount(status.organizations?.length || 0);
      }
    };
    fetchStatus();
  }, [designer?.email]);

  const handleShare = async () => {
    let cleanId = params.id;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/[0-9a-fA-F]{8}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{4}-?[0-9a-fA-F]{12}/);
      if (match) cleanId = match[0];
    }
    if ((!cleanId || cleanId.length < 20) && user?.id) {
      cleanId = user.id;
    }
    const cleanUrl = typeof window !== 'undefined' ? `${window.location.origin}/portfolio/${cleanId}` : '';

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(cleanUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
        return;
      } catch (err) {
        console.log('Clipboard copy failed, trying share', err);
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${designer?.organizationName || designer?.fullName || 'CADONCE'} Portfolio`,
          text: `Check out ${designer?.organizationName || designer?.fullName || 'CADONCE'}'s 3D CAD portfolio dossier!`,
          url: cleanUrl,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased pb-20">
        <style>{`
          @keyframes bonfire {
            0%, 100% { transform: scale(1) rotate(0deg); border-radius: 50%; opacity: 0.8; }
            25% { transform: scale(1.08, 1.05) rotate(3deg); border-radius: 40% 60% 50% 50%; opacity: 1; }
            50% { transform: scale(0.95, 1.1) rotate(-3deg); border-radius: 60% 40% 45% 55%; opacity: 0.9; }
            75% { transform: scale(1.05, 0.95) rotate(1deg); border-radius: 50% 50% 40% 60%; opacity: 1; }
          }
          .animate-bonfire {
            animation: bonfire 1.5s ease-in-out infinite;
          }
          .no-scrollbar::-webkit-scrollbar {
            display: none !important;
          }
          .no-scrollbar {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `}</style>
        {/* MainContainer - Expansive modern widescreen container eliminating empty side margins */}
        <div className="w-full max-w-[1720px] mx-auto min-h-screen flex flex-col relative overflow-x-hidden">
          {/* Ambient Glow Orbs behind main content */}
          <div className="pointer-events-none absolute -top-40 right-1/4 w-96 h-96 bg-[#d9ee3c]/10 rounded-full blur-3xl"></div>
          <div className="pointer-events-none absolute top-1/2 left-10 w-80 h-80 bg-[#ffb955]/10 rounded-full blur-3xl"></div>

          <div className="w-full px-3 sm:px-8 xl:px-12 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
            {/* Top Navigation Bar: Cadonce Logo & Share Portfolio Button */}
            <div className="flex items-center justify-between gap-2 sm:gap-4 border-b border-[#282D3C]/80 pb-3.5 sm:pb-4">
              <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
                <div className="size-8 sm:size-9 bg-[#F59E0B] rounded-xl flex items-center justify-center text-black shadow-[0_0_16px_rgba(245,158,11,0.35)] shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-black font-black text-lg sm:text-xl leading-none">architecture</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline font-black text-base sm:text-lg text-white tracking-tighter uppercase italic leading-none">
                    CAD<span className="text-[#F59E0B]">ONCE</span>
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                    Studio Archive
                  </span>
                </div>
              </Link>
              
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                {!user && (
                  <Link 
                    href="/auth/login"
                    className="inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white border border-[#282D3C] hover:border-zinc-500 bg-[#14161E] transition-all"
                  >
                    <span>Sign In</span>
                  </Link>
                )}
                <button 
                  onClick={handleShare}
                  className="inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-[#d9ee3c] hover:bg-[#cbe02d] text-[#1a1e00] font-semibold text-xs transition-all duration-200 hover:shadow-[0_0_12px_rgba(217,238,60,0.3)] shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px] font-bold">
                    {copiedLink ? 'check' : 'share'}
                  </span>
                  <span>{copiedLink ? 'Copied!' : (<><span className="hidden sm:inline">Share Portfolio</span><span className="sm:hidden">Share</span></>)}</span>
                </button>
              </div>
            </div>

            {/* Mobile / Tablet Designer Identity Hero (Visible < xl, hidden on desktop xl+) */}
            <div className="xl:hidden rounded-2xl border border-[#282D3C] bg-[#14161E]/95 backdrop-blur-xl p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-4">
              {/* Atmospheric Glow */}
              <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-b from-[#ffb955]/20 via-[#d9ee3c]/15 to-transparent rounded-full blur-2xl"></div>

              {/* Profile Top Row: Avatar & Basic Info */}
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="relative group shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#ffb955] via-[#d9ee3c] to-[#4ffeb9] opacity-80 blur-sm"></div>
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-[#08090C]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#1E222D]">
                      <img 
                        className="w-full h-full object-cover object-top" 
                        src={designer?.avatarUrl || "https://lh3.googleusercontent.com/aida/ADBb0uhfZwChFLIygiDSRSW5IbKILEBGWomOnXd7KijnsSHlt69qiSAys1otcP_-KpA9-XSBOdvlYx47LAUlgPeLRMsDzDjpmd_PI1WjRVqGmCcWRaAijR0TkOE3XCfa4YSD99XaqFnjJ-xME9nylcGT-7rTyNVLBa2RxHxMq-WztXR34Lz9wSRZgFWzgvj5ECR8lY9ppOS91UIRkwA2nAuvBbj-Us0I80EJkrBSMraL1brRUT4cpjUyxZZ_WsB-14jxk7wPlrLGPjGOLw"}
                        alt={designer?.fullName || designer?.organizationName || 'Designer'}
                      />
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#08090C] flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-[#4ffeb9] shadow-[0_0_8px_rgba(79,254,185,1)]"></div>
                  </div>
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base sm:text-xl text-white font-extrabold tracking-tight truncate">
                      {designer?.organizationName || designer?.fullName || 'Alexander Sterling'}
                    </h2>
                    <span className="material-symbols-outlined text-[#ffb955] text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                  </div>
                  {designer?.fullName && designer?.organizationName && (
                    <p className="text-[11px] text-white/50 truncate -mt-0.5">{designer.fullName}</p>
                  )}
                  <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1 truncate">
                    <span className="truncate">Studio: {designer?.organizationName || 'Minecom Dynamics'}</span>
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-[#4ffeb9] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ffeb9] inline-block animate-pulse shrink-0"></span>
                    <span>Available for Contract</span>
                  </div>
                </div>
              </div>

              {/* Pro Badge Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1E222D] border border-[#282D3C] w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d9ee3c]"></span>
                <span className="text-[10px] uppercase text-[#d9ee3c] font-bold tracking-wider">
                  {designer?.organizationName ? 'STUDIO & ORGANIZATION' : 'PROFESSIONAL CAD DESIGNER'}
                </span>
              </div>

              {/* Bio Narrative */}
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed text-left">
                {designer?.specialty || designer?.bio || "Senior Industrial CAD Specialist & Mechanical Systems Architect with 8+ years designing high-tolerance hardware, aerospace robotics, and consumer electronics ready for production."}
              </p>

              {/* Metrics Quad Grid */}
              <div className="w-full grid grid-cols-4 gap-1.5 py-3 px-2 rounded-xl bg-[#0D0E12]/90 border border-[#1B1E28]">
                <div className="flex flex-col items-center">
                  <span className="text-base sm:text-xl text-white font-extrabold">{portfolioItems.length}</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">PORTFOLIO</span>
                </div>
                <div className="flex flex-col items-center border-l border-[#1B1E28]">
                  <span className="text-base sm:text-xl text-white font-extrabold">{jobsCount || 48}</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">JOBS</span>
                </div>
                <div className="flex flex-col items-center border-l border-[#1B1E28]">
                  <span className="text-base sm:text-xl text-[#ffb955] font-extrabold">4.9</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">RATING</span>
                </div>
                <div className="flex flex-col items-center border-l border-[#1B1E28]">
                  <span className="text-base sm:text-xl text-[#4ffeb9] font-extrabold">99%</span>
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">ON-TIME</span>
                </div>
              </div>

              {/* Primary CTAs */}
              <div className="w-full flex flex-col sm:flex-row gap-2">
                <Link 
                  href={`/inbox?hire=${params.id}`} 
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#d9ee3c] text-[#1a1e00] font-bold tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(217,238,60,0.5)] flex items-center justify-center gap-1.5 text-xs sm:text-sm"
                >
                  <span className="material-symbols-outlined text-base">bolt</span>
                  <span>Hire {designer?.fullName?.split(' ')[0] || designer?.organizationName || 'Alexander'}</span>
                </Link>
                <div className="flex gap-2 flex-1">
                  <Link 
                    href={`/inbox?to=${params.id}`} 
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-[#d9ee3c] text-zinc-200 hover:text-[#d9ee3c] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">mail</span>
                    <span>Message</span>
                  </Link>
                  {user && user.id === params.id ? (
                    <Link 
                      href="/settings"
                      className="py-2.5 px-3 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-[#d9ee3c] text-zinc-200 hover:text-[#d9ee3c] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">settings</span>
                      <span className="hidden xs:inline">Settings</span>
                    </Link>
                  ) : (
                    <button 
                      onClick={handleShare}
                      className="py-2.5 px-3 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-[#d9ee3c] text-zinc-200 hover:text-[#d9ee3c] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-base">download</span>
                      <span className="hidden xs:inline">Spec Sheet</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Studio Meta Specs */}
              <div className="w-full pt-3 border-t border-[#1B1E28] flex items-center justify-between text-zinc-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  Zurich, Switzerland
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">schedule</span>
                  UTC+1 (CET)
                </span>
              </div>
            </div>

            {/* Core Portfolio Layout: Asymmetric 12-Column Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Left 8 Columns: Navigation, Filter Matrix & CAD Showcase */}
              <div className="xl:col-span-8 flex flex-col gap-4 sm:gap-6 min-w-0">
                {/* Instagram-style Tab Navigation Bar */}
                <div className="bg-[#14161E]/90 backdrop-blur-md rounded-xl border border-[#282D3C] p-2 sm:p-2.5">
                  <div className="flex items-center justify-between border-b border-[#1B1E28] pb-1.5 sm:pb-2 px-1 sm:px-2 gap-2">
                    <nav 
                      className="flex items-center gap-3 sm:gap-6 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap shrink min-w-0"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      <button 
                        onClick={() => setActiveTab('portfolio')}
                        className={`relative shrink-0 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 tracking-wider uppercase transition-colors whitespace-nowrap ${
                          activeTab === 'portfolio' 
                            ? 'border-b-2 border-[#d9ee3c] text-[#d9ee3c]' 
                            : 'text-zinc-400 hover:text-white border-b-2 border-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base">grid_on</span>
                        <span>PROJECTS</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-[#d9ee3c]/20 text-[#d9ee3c] text-[9px] sm:text-[10px]">
                          {portfolioItems.length}
                        </span>
                      </button>


                      <button 
                        onClick={() => setActiveTab('shop')}
                        className={`shrink-0 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 tracking-wider uppercase transition-colors whitespace-nowrap ${
                          activeTab === 'shop' 
                            ? 'border-b-2 border-[#d9ee3c] text-[#d9ee3c]' 
                            : 'text-zinc-400 hover:text-white border-b-2 border-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base">storefront</span>
                        <span>SHOP</span>
                        {products.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#ffb955]/20 text-[#ffb955] text-[9px] sm:text-[10px]">
                            {products.length}
                          </span>
                        )}
                      </button>

                      <button 
                        onClick={() => setActiveTab('saved')}
                        className={`shrink-0 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 tracking-wider uppercase transition-colors whitespace-nowrap ${
                          activeTab === 'saved' 
                            ? 'border-b-2 border-[#d9ee3c] text-[#d9ee3c]' 
                            : 'text-zinc-400 hover:text-white border-b-2 border-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base">bookmark</span>
                        <span>SAVED</span>
                      </button>

                      <button 
                        onClick={() => setActiveTab('collabs')}
                        className={`shrink-0 py-2 sm:py-2.5 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 tracking-wider uppercase transition-colors whitespace-nowrap ${
                          activeTab === 'collabs' 
                            ? 'border-b-2 border-[#d9ee3c] text-[#d9ee3c]' 
                            : 'text-zinc-400 hover:text-white border-b-2 border-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base">assignment_ind</span>
                        <span>COLLABS</span>
                      </button>
                    </nav>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-1 sm:p-1.5 rounded-lg border transition-colors ${viewMode === 'grid' ? 'bg-[#1E222D] text-white border-[#282D3C] shadow-sm' : 'text-zinc-500 hover:text-zinc-300 border-transparent'}`}
                        title="Grid View"
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base">grid_view</span>
                      </button>
                      <button 
                        onClick={() => setViewMode('agenda')}
                        className={`p-1 sm:p-1.5 rounded-lg border transition-colors ${viewMode === 'agenda' ? 'bg-[#1E222D] text-white border-[#282D3C] shadow-sm' : 'text-zinc-500 hover:text-zinc-300 border-transparent'}`}
                        title="Feed View"
                      >
                        <span className="material-symbols-outlined text-sm sm:text-base">view_agenda</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Category Filter Pills */}
                  <div 
                    className="pt-2 sm:pt-2.5 pb-0.5 px-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {(() => {
                      const itemCategories = Array.from(new Set(portfolioItems.map((item: any) => (item.category || '').trim().toUpperCase()).filter(Boolean)));
                      const allCategories = ['ALL', ...(itemCategories.length > 0 ? itemCategories : ['AUTOMOTIVE', 'ROBOTICS', 'HOROLOGY', 'AEROSPACE', 'JEWELRY'])];
                      return allCategories.map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`shrink-0 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition-all whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#d9ee3c] text-[#1a1e00] shadow-[0_0_12px_rgba(217,238,60,0.3)] hover:scale-105'
                                : 'bg-[#1E222D] border border-[#282D3C] text-zinc-400 hover:text-white hover:border-[#d9ee3c]/40'
                            }`}
                          >
                            {cat} {cat === 'ALL' ? `(${portfolioItems.length})` : ''}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Main Showcase Content: Portfolio Grid OR Shop Table */}
                {activeTab === 'shop' ? (
                  <div className="p-5 bg-[#14161E]/90 rounded-xl border border-[#282D3C]" data-purpose="shop-showcase">
                    {/* Header with Add Product Button */}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#d9ee3c]">Shop Catalog</h3>
                      {user && user.id === params.id && (
                        <button 
                          onClick={() => {
                            setIsEditing(false);
                            setCurrentEditingProductId(null);
                            setNewProduct({ name: '', price: '', productType: 'Ring', image: '', mainImage: null, galleryImages: [], cadFiles: [], metalWeightImage: null, ringSize: '', mainGems: '', sideGems: '', metalWeight: '', braceletSize: '', customLabel: '', customValue: '' });
                            setIsModalOpen(true);
                          }}
                          className="bg-[#d9ee3c] hover:brightness-110 text-black px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Add Product
                        </button>
                      )}
                    </div>

                    {/* Products Table */}
                    <div className="bg-[#0D0E12] rounded-xl border border-[#282D3C] overflow-x-auto no-scrollbar">
                      <table className="w-full text-sm text-left text-gray-400">
                        <thead className="text-xs text-gray-500 uppercase bg-[#14161E] border-b border-[#282D3C]">
                          <tr>
                            <th className="px-4 py-3">Product</th>
                            <th className="px-4 py-3">Price</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-zinc-500 text-xs">
                                No shop products listed yet.
                              </td>
                            </tr>
                          ) : (
                            products.map(product => (
                              <tr key={product.id} className="border-b border-[#1B1E28] hover:bg-[#1E222D]/50">
                                <td className="px-4 py-3 flex items-center gap-3">
                                  <div className="w-10 h-10 rounded overflow-hidden bg-[#0a0a0a] border border-[#282D3C] flex-shrink-0">
                                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <div className="font-bold text-white cursor-pointer hover:text-[#d9ee3c]" onClick={() => window.location.href = `/products/${product.id}`}>{product.name}</div>
                                    <div className="flex gap-1 mt-0.5">
                                      {product.images && product.images.length > 0 && (
                                        <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                          <span className="material-symbols-outlined text-[10px]">image</span>
                                          {product.images.length}
                                        </span>
                                      )}
                                      {product.cadFiles && product.cadFiles.length > 0 && (
                                        <span className="text-[10px] text-[#d9ee3c] flex items-center gap-0.5">
                                          <span className="material-symbols-outlined text-[10px]">deployed_code</span>
                                          {product.cadFiles.length}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-[#d9ee3c] font-bold">{product.price}</td>
                                <td className="px-4 py-3 text-white">{(product as any).productType || 'N/A'}</td>
                                <td className="px-4 py-3 text-xs space-y-0.5">
                                  {(product as any).ringSize && <div><span className="text-gray-500">Size:</span> {(product as any).ringSize}</div>}
                                  {(product as any).mainGems && <div><span className="text-gray-500">Gems:</span> {(product as any).mainGems}</div>}
                                  {(product as any).metalWeight && <div><span className="text-gray-500">Weight:</span> {(product as any).metalWeight}</div>}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2">
                                    {user && user.id === params.id && (
                                      <button 
                                        onClick={() => {
                                          setIsEditing(true);
                                          setCurrentEditingProductId(product.id);
                                          setNewProduct({
                                            name: product.name,
                                            price: product.price,
                                            image: product.image,
                                            metalWeightImage: null,
                                            mainImage: null,
                                            galleryImages: [],
                                            cadFiles: [],
                                            productType: (product as any).productType || 'Ring',
                                            ringSize: (product as any).ringSize || '',
                                            mainGems: (product as any).mainGems || '',
                                            sideGems: (product as any).sideGems || '',
                                            metalWeight: (product as any).metalWeight || '',
                                            braceletSize: (product as any).braceletSize || '',
                                            customLabel: (product as any).customLabel || '',
                                            customValue: (product as any).customValue || ''
                                          });
                                          setIsModalOpen(true);
                                        }}
                                        className="bg-[#d9ee3c] hover:brightness-110 text-black px-2.5 py-1 rounded text-xs font-bold transition-colors"
                                      >
                                        Edit
                                      </button>
                                    )}
                                    {product.cadFiles && product.cadFiles.length > 0 && (
                                      <button 
                                        onClick={() => setSelectedProductForView(product)}
                                        className="bg-[#1a1a1a] border border-[#282D3C] hover:bg-[#282D3C] text-white px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-0.5"
                                      >
                                        <span className="material-symbols-outlined text-sm">view_in_ar</span>
                                        View 3D
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Responsive Media Grid or Feed View */
                  <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4" : "grid grid-cols-1 gap-4"}>
                    {(() => {
                      const displayedItems = selectedCategory === 'ALL'
                        ? portfolioItems
                        : portfolioItems.filter((item: any) => (item.category || '').toUpperCase() === selectedCategory);

                      if (displayedItems.length === 0) {
                        return (
                          <div className="col-span-full py-16 sm:py-24 text-center bg-[#14161E]/80 border border-[#282D3C] rounded-2xl p-6 sm:p-8">
                            <span className="material-symbols-outlined text-zinc-500 text-4xl sm:text-5xl block mb-3">image_not_supported</span>
                            <p className="text-xs font-extrabold text-zinc-300 uppercase tracking-widest">No portfolio items found</p>
                            <p className="text-[11px] text-zinc-500 mt-1">
                              {selectedCategory !== 'ALL' 
                                ? `No works under ${selectedCategory}. Switch filter to view all models.`
                                : 'Upload CAD showcase models from your designer dashboard to highlight your studio.'}
                            </p>
                          </div>
                        );
                      }

                      return displayedItems.map((item: any, i: number) => {
                        let itemImages: string[] = [];
                        if (Array.isArray(item.images)) {
                          itemImages = item.images;
                        } else if (typeof item.images === 'string') {
                          try {
                            const parsed = JSON.parse(item.images);
                            itemImages = Array.isArray(parsed) ? parsed : [item.images];
                          } catch {
                            itemImages = item.images.split(',').map((s: string) => s.trim()).filter(Boolean);
                          }
                        }
                        
                        const mainImage = itemImages[0] || 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&auto=format&fit=crop&q=60';
                        const isFeatured = i === 0;
                        const software = item.software || (i % 3 === 0 ? 'SolidWorks 2024' : i % 3 === 1 ? 'Rhino + MatrixGold' : 'CATIA V5');
                        const categoryTag = item.category || (i % 3 === 0 ? 'Micro-Mechanics' : i % 3 === 1 ? 'Generative CFD' : 'Precision CAD');
                        const likes = `${(1.2 + (i * 0.4)).toFixed(1)}k`;
                        const comments = `${24 + (i * 11)}`;
                        const has3D = Boolean(getCadFileUrl(item) || item.has3d || item.has3D);

                        if (viewMode === 'agenda') {
                          return (
                            <div 
                              key={item.id || `pi-${i}`}
                              onClick={() => {
                                setSelectedPortfolioItem(item);
                                setSelectedImageIdx(0);
                              }}
                              className="group rounded-2xl overflow-hidden border border-[#282D3C] bg-[#14161E] hover:border-[#d9ee3c]/60 transition-all cursor-pointer shadow-lg flex flex-col"
                            >
                              <div className="p-3 sm:p-4 flex items-center justify-between border-b border-[#1B1E28]">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-[#1E222D] border border-[#282D3C] text-[#d9ee3c] text-[10px] font-bold uppercase">
                                    {software}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-bold uppercase">{categoryTag}</span>
                                </div>
                                {isFeatured && (
                                  <span className="px-2 py-0.5 rounded bg-[#d9ee3c] text-[#1a1e00] font-extrabold text-[9px] tracking-wider uppercase">
                                    FEATURED
                                  </span>
                                )}
                              </div>
                              <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-[#0A0B0E] overflow-hidden">
                                <img alt={item.title || 'CAD Showcase'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={mainImage} />
                                {has3D && (
                                  <div 
                                    className="absolute bottom-3 right-3 z-20"
                                    onClick={(e) => {
                                      const cadUrl = getCadFileUrl(item);
                                      if (cadUrl) {
                                        e.stopPropagation();
                                        setSelectedProductForView({
                                          id: item.id,
                                          name: item.title || '3D Model',
                                          cadFiles: [{ name: item.title || '3D Model', size: 0, url: cadUrl }]
                                        });
                                      }
                                    }}
                                  >
                                    <span className="p-2 rounded-xl bg-[#0D0E12]/90 backdrop-blur-md text-[#d9ee3c] border border-[#282D3C] shadow-lg flex items-center gap-1.5 hover:bg-[#d9ee3c] hover:text-black transition-all">
                                      <span className="material-symbols-outlined text-sm font-bold">view_in_ar</span>
                                      <span className="text-[10px] font-bold uppercase">View 3D</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="p-3 sm:p-4 flex items-center justify-between">
                                <h4 className="font-bold text-sm sm:text-base text-white truncate mr-2">
                                  {item.title || 'Parametric Prototype'}
                                </h4>
                                <div className="flex items-center gap-3 text-xs font-bold text-zinc-400 shrink-0">
                                  <span className="flex items-center gap-1 text-[#ffb955]">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                                    {likes}
                                  </span>
                                  <span className="flex items-center gap-1 text-[#4ffeb9]">
                                    <span className="material-symbols-outlined text-sm">chat_bubble</span>
                                    {comments}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={item.id || `pi-${i}`}
                            onClick={() => {
                              setSelectedPortfolioItem(item);
                              setSelectedImageIdx(0);
                            }}
                            className="group relative rounded-xl overflow-hidden border border-[#282D3C] hover:border-[#d9ee3c]/80 transition-all duration-300 aspect-square bg-[#0D0E12] cursor-pointer shadow-md hover:shadow-[0_0_24px_rgba(217,238,60,0.25)]"
                          >
                            <img 
                              alt={item.title || 'CAD Showcase'} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                              src={mainImage} 
                            />
                            
                            {/* Instagram Post Type Indicator Badges (Top-Right) */}
                            <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex items-center gap-1 sm:gap-1.5 z-10">
                              {isFeatured && (
                                <span className="p-0.5 sm:p-1 rounded bg-[#0D0E12]/85 backdrop-blur-md text-[#d9ee3c] border border-[#282D3C] shadow-sm flex items-center justify-center" title="Pinned Showcase">
                                  <span className="material-symbols-outlined text-xs sm:text-sm">push_pin</span>
                                </span>
                              )}
                              {itemImages.length > 1 && (
                                <span className="p-0.5 sm:p-1 rounded bg-[#0D0E12]/85 backdrop-blur-md text-white border border-[#282D3C] shadow-sm flex items-center justify-center" title="Multi-Part Assembly">
                                  <span className="material-symbols-outlined text-xs sm:text-sm">collections</span>
                                </span>
                              )}
                            </div>

                            {isFeatured && (
                              <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10">
                                <span className="px-1.5 sm:px-2 py-0.5 rounded bg-[#d9ee3c] text-[#1a1e00] font-extrabold text-[8px] sm:text-[10px] tracking-wider shadow-sm uppercase">
                                  FEATURED
                                </span>
                              </div>
                            )}

                            {/* 3D View Icon: Show ONLY if 3D file is uploaded, at bottom right corner */}
                            {has3D && (
                              <div 
                                className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 z-20"
                                onClick={(e) => {
                                  const cadUrl = getCadFileUrl(item);
                                  if (cadUrl) {
                                    e.stopPropagation();
                                    setSelectedProductForView({
                                      id: item.id,
                                      name: item.title || '3D Model',
                                      cadFiles: [{ name: item.title || '3D Model', size: 0, url: cadUrl }]
                                    });
                                  }
                                }}
                              >
                                <span 
                                  className="p-1 sm:p-1.5 rounded-lg bg-[#0D0E12]/90 backdrop-blur-md text-[#d9ee3c] border border-[#282D3C] shadow-lg flex items-center justify-center hover:bg-[#d9ee3c] hover:text-black hover:scale-110 transition-all cursor-pointer" 
                                  title="View in 3D Viewport"
                                >
                                  <span className="material-symbols-outlined text-xs sm:text-sm font-bold">view_in_ar</span>
                                </span>
                              </div>
                            )}

                            {/* Instagram Hover Overlay with Metrics and Title */}
                            <div className="absolute inset-0 bg-[#08090C]/85 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2.5 sm:p-4 text-center">
                              <div className="flex justify-end">
                                <span className="px-1.5 sm:px-2 py-0.5 rounded bg-[#1E222D] border border-[#282D3C] text-[#d9ee3c] text-[9px] sm:text-[10px] font-semibold truncate max-w-full">
                                  {software}
                                </span>
                              </div>
                              <div className="flex flex-col items-center gap-1 sm:gap-2">
                                <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-2 px-1">
                                  {item.title || 'Parametric Prototype'}
                                </h4>
                                <div className="flex items-center justify-center gap-3 sm:gap-4 text-white text-[11px] sm:text-xs font-bold">
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm sm:text-base text-[#ffb955]" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span> 
                                    {likes}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm sm:text-base text-[#4ffeb9]">chat_bubble</span> 
                                    {comments}
                                  </span>
                                </div>
                              </div>
                              <div className="text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-wider font-semibold truncate">
                                {categoryTag}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Instagram-Style Pagination / Grid Status Strip */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-[#14161E] border border-[#282D3C] rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 text-[11px] sm:text-xs font-medium">
                    <span>Showing</span>
                    <span className="font-bold text-white">
                      {selectedCategory === 'ALL' 
                        ? portfolioItems.length 
                        : portfolioItems.filter((it: any) => (it.category || '').toUpperCase() === selectedCategory).length}
                    </span>
                    <span>of</span>
                    <span className="font-bold text-white">{portfolioItems.length} Posts</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button 
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#282D3C] bg-[#1E222D] text-zinc-500 cursor-not-allowed text-[11px] sm:text-xs font-bold uppercase tracking-wider" 
                      disabled
                    >
                      Previous
                    </button>
                    <button className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#d9ee3c] text-[#1a1e00] text-xs font-bold flex items-center justify-center shadow-[0_0_8px_rgba(217,238,60,0.4)]">
                      1
                    </button>
                    <button 
                      className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-[#282D3C] bg-[#1E222D] text-zinc-500 cursor-not-allowed text-[11px] sm:text-xs font-bold uppercase tracking-wider" 
                      disabled
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns: Sticky Designer Identity & Studio Dossier */}
              <aside className="xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-24">
                {/* Primary Profile Dossier Card */}
                <div className="hidden xl:flex relative rounded-2xl border border-[#282D3C] bg-[#14161E]/95 backdrop-blur-xl p-6 sm:p-7 flex-col items-center text-center shadow-2xl overflow-hidden">
                  {/* Atmospheric Radiant Glow Behind Avatar */}
                  <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-b from-[#ffb955]/25 via-[#d9ee3c]/20 to-transparent rounded-full blur-2xl"></div>

                  {/* Glowing Cyber Avatar */}
                  <div className="relative mt-2 mb-4 group cursor-pointer">
                    {/* Animated Ring Glow */}
                    <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-[#ffb955] via-[#d9ee3c] to-[#4ffeb9] opacity-80 blur-sm group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative w-28 h-28 rounded-full p-1 bg-[#08090C]">
                      <div className="w-full h-full rounded-full overflow-hidden bg-[#1E222D] relative">
                        <img 
                          className="w-full h-full object-cover object-top" 
                          src={designer?.avatarUrl || "https://lh3.googleusercontent.com/aida/ADBb0uhfZwChFLIygiDSRSW5IbKILEBGWomOnXd7KijnsSHlt69qiSAys1otcP_-KpA9-XSBOdvlYx47LAUlgPeLRMsDzDjpmd_PI1WjRVqGmCcWRaAijR0TkOE3XCfa4YSD99XaqFnjJ-xME9nylcGT-7rTyNVLBa2RxHxMq-WztXR34Lz9wSRZgFWzgvj5ECR8lY9ppOS91UIRkwA2nAuvBbj-Us0I80EJkrBSMraL1brRUT4cpjUyxZZ_WsB-14jxk7wPlrLGPjGOLw"}
                          alt={designer?.fullName || designer?.organizationName || 'Designer'}
                        />
                      </div>
                    </div>
                    {/* Online Pulse Badge */}
                    <div className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-[#08090C] flex items-center justify-center p-0.5">
                      <div className="w-full h-full rounded-full bg-[#4ffeb9] shadow-[0_0_8px_rgba(79,254,185,1)]"></div>
                    </div>
                  </div>

                  {/* Identity Headings */}
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h2 className="text-2xl text-white font-extrabold tracking-tight">
                      {designer?.organizationName || designer?.fullName || 'Alexander Sterling'}
                    </h2>
                    <span className="material-symbols-outlined text-[#ffb955] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                  </div>
                  {designer?.fullName && designer?.organizationName && (
                    <p className="text-xs text-white/50 -mt-0.5 mb-1">{designer.fullName}</p>
                  )}
                  <p className="text-xs text-zinc-400 mb-3 flex items-center justify-center gap-1.5">
                    <span>Studio: {designer?.organizationName || 'Minecom Dynamics'}</span>
                    <span>•</span>
                    <span className="text-[#4ffeb9] flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ffeb9] inline-block animate-pulse"></span>
                      Available for Contract
                    </span>
                  </p>

                  {/* Pro Badge Pill */}
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#1E222D] border border-[#282D3C] mb-4">
                    <span className="w-2 h-2 rounded-full bg-[#d9ee3c]"></span>
                    <span className="text-[11px] uppercase text-[#d9ee3c] font-bold tracking-wider">
                      {designer?.organizationName ? 'STUDIO & ORGANIZATION' : 'PROFESSIONAL CAD DESIGNER'}
                    </span>
                  </div>

                  {/* Bio Narrative */}
                  <p className="text-sm text-zinc-300 mb-6 text-left leading-relaxed">
                    {designer?.specialty || designer?.bio || "Senior Industrial CAD Specialist & Mechanical Systems Architect with 8+ years designing high-tolerance hardware, aerospace robotics, and consumer electronics ready for production."}
                  </p>

                  {/* Metrics Quad Grid */}
                  <div className="w-full grid grid-cols-4 gap-2 py-4 px-3 rounded-xl bg-[#0D0E12]/90 border border-[#1B1E28] mb-6">
                    <div className="flex flex-col items-center">
                      <span className="text-xl sm:text-2xl text-white font-extrabold">{portfolioItems.length}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">PORTFOLIO</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-[#1B1E28]">
                      <span className="text-xl sm:text-2xl text-white font-extrabold">{jobsCount || 48}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">JOBS</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-[#1B1E28]">
                      <span className="text-xl sm:text-2xl text-[#ffb955] font-extrabold">4.9</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">RATING</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-[#1B1E28]">
                      <span className="text-xl sm:text-2xl text-[#4ffeb9] font-extrabold">99%</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">ON-TIME</span>
                    </div>
                  </div>

                  {/* Primary CTAs */}
                  <div className="w-full flex flex-col gap-2.5">
                    <Link 
                      href={`/inbox?hire=${params.id}`} 
                      className="w-full py-3 px-4 rounded-xl bg-[#d9ee3c] text-[#1a1e00] font-bold tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(217,238,60,0.5)] flex items-center justify-center gap-2 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">bolt</span>
                      <span>Hire {designer?.fullName?.split(' ')[0] || designer?.organizationName || 'Alexander'}</span>
                    </Link>
                    <div className="grid grid-cols-2 gap-2">
                      <Link 
                        href={`/inbox?to=${params.id}`} 
                        className="py-2.5 px-3 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-[#d9ee3c] text-zinc-200 hover:text-[#d9ee3c] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">mail</span>
                        <span>Direct Message</span>
                      </Link>
                      {user && user.id === params.id ? (
                        <Link 
                          href="/settings"
                          className="py-2.5 px-3 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-[#d9ee3c] text-zinc-200 hover:text-[#d9ee3c] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">settings</span>
                          <span>Edit Profile</span>
                        </Link>
                      ) : (
                        <button 
                          onClick={handleShare}
                          className="py-2.5 px-3 rounded-xl bg-[#1E222D] border border-[#282D3C] hover:border-[#d9ee3c] text-zinc-200 hover:text-[#d9ee3c] font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                          <span>CV &amp; Spec Sheet</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Studio Meta Specs Footnote */}
                  <div className="w-full pt-4 mt-4 border-t border-[#1B1E28] flex items-center justify-between text-zinc-400 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      Zurich, Switzerland
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      UTC+1 (CET)
                    </span>
                  </div>
                </div>

                {/* Skills & Toolchain Panel */}
                <div className="rounded-xl border border-[#282D3C] bg-[#14161E]/90 backdrop-blur-md p-5 flex flex-col gap-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ffb955] text-lg">build</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        SKILLS &amp; TOOLCHAIN
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-[#d9ee3c] tracking-wider uppercase">
                      {(designer?.skills?.length || 8)} VERIFIED
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const skillsList = designer?.skills && designer.skills.length > 0
                        ? designer.skills
                        : ["SolidWorks 2024", "CATIA V5", "Autodesk Fusion 360", "Rhino 3D + Grasshopper", "Siemens NX", "GD&T ASME Y14.5", "ANSYS FEA Analysis", "Additive DFM / CNC 5-Axis"];
                      return skillsList.map((skill: string, sIdx: number) => {
                        const dotColor = sIdx % 3 === 0 ? 'bg-[#d9ee3c]' : sIdx % 3 === 1 ? 'bg-[#ffb955]' : 'bg-[#4ffeb9]';
                        return (
                          <span 
                            key={sIdx}
                            className="px-3 py-1 rounded-lg bg-[#1E222D] border border-[#282D3C] text-zinc-200 text-xs font-semibold flex items-center gap-1.5 hover:border-[#d9ee3c] transition-colors cursor-default"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                            {skill}
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Client Review Endorsement Card */}
                <div className="rounded-xl border border-[#282D3C] bg-[#14161E]/90 backdrop-blur-md p-5 flex flex-col gap-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#ffb955] text-lg">rate_review</span>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        VERIFIED REVIEWS
                      </h3>
                    </div>
                    <div className="flex items-center text-[#ffb955]">
                      {[...Array(5)].map((_, starIdx) => (
                        <span key={starIdx} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                  {/* Spotlight Quote */}
                  <div className="p-3.5 rounded-lg bg-[#0D0E12] border border-[#1B1E28] flex flex-col gap-2">
                    <p className="text-xs text-zinc-300 italic leading-relaxed">
                      “{designer?.organizationName || designer?.fullName || 'Alexander'} delivered military-grade precision CAD models ahead of schedule. The GD&amp;T tolerance sheets passed our CNC tooling inspection on first pass without a single collision.”
                    </p>
                    <div className="flex items-center justify-between pt-1 border-t border-[#1B1E28]">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#1E222D] border border-[#282D3C] flex items-center justify-center font-bold text-xs text-white">
                          M
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-white font-bold">Marcus Vance</span>
                          <span className="text-[10px] text-zinc-500">CTO, Apex Robotics Corp</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-500">14d ago</span>
                    </div>
                  </div>
                  <a 
                    href="#reviews" 
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center justify-between text-[#d9ee3c] hover:text-white text-xs font-semibold pt-1 transition-colors group"
                  >
                    <span>View all 18 client endorsements</span>
                    <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
                  </a>
                </div>
              </aside>
            </div>
          </div>

          {/* Lightbox / Modal for Viewing Selected Portfolio Item */}
          {selectedPortfolioItem && (() => {
            const activeImages = getModalImages(selectedPortfolioItem);
            const currentImg = activeImages[selectedImageIdx] || activeImages[0];
            const currentItemIndex = portfolioItems.findIndex((it: any) => it.id === selectedPortfolioItem.id);
            const parsed = parseItemDescription(selectedPortfolioItem.description);
            const cadUrl = getCadFileUrl(selectedPortfolioItem) || (parsed.cadFile && parsed.cadFile !== 'none' && parsed.cadFile !== 'null' ? parsed.cadFile : null);
            const has3D = Boolean(cadUrl);
            const itemId = String(selectedPortfolioItem.id || 'default');
            const likeData = modalLikes[itemId] || { count: 3840, liked: false };
            const isSaved = Boolean(modalSaved[itemId]);
            const commentsList = modalComments[itemId] || [
              {
                id: 'rev-1',
                author: 'Henri Dufour',
                role: 'Master Setter • Place Vendôme',
                time: '2d ago',
                text: 'The setting and geometry on this piece show impressive craftsmanship. Clean tolerances and balanced proportions.',
                likes: 44,
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
              },
              {
                id: 'rev-2',
                author: designer?.fullName || designer?.organizationName || 'Elena Rostova',
                role: 'Author',
                isAuthor: true,
                time: '1d ago',
                text: 'Thank you Henri! Modeled with precision clearances specifically for high-end casting and hand finishing.',
                likes: 18,
                avatar: designer?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              }
            ];

            const creatorName = designer?.fullName || designer?.organizationName || 'Elena Rostova, GG (GIA)';
            const creatorFirst = creatorName.split(',')[0].trim().split(' ')[0] || 'Elena';
            const softwareName = (parsed.software || selectedPortfolioItem.software || 'RHINOCEROS / MATRIXGOLD').toUpperCase();
            const categoryName = (parsed.category || selectedPortfolioItem.category || 'JEWELLERY CAD').toUpperCase();
            const narrativeText = parsed.narrative || selectedPortfolioItem.narrative || (
              typeof selectedPortfolioItem.description === 'string' && !selectedPortfolioItem.description.includes('[CATEGORY]')
                ? selectedPortfolioItem.description 
                : `${selectedPortfolioItem.title || 'Portfolio Work'} engineered with precision CAD modeling.`
            );
            const softwareList = resolveSoftwareList(parsed.software || selectedPortfolioItem.software, selectedPortfolioItem.description);

            const handlePrevItem = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (portfolioItems.length <= 1) return;
              const prevIdx = currentItemIndex > 0 ? currentItemIndex - 1 : portfolioItems.length - 1;
              setSelectedPortfolioItem(portfolioItems[prevIdx]);
              setSelectedImageIdx(0);
            };

            const handleNextItem = (e: React.MouseEvent) => {
              e.stopPropagation();
              if (portfolioItems.length <= 1) return;
              const nextIdx = currentItemIndex < portfolioItems.length - 1 ? currentItemIndex + 1 : 0;
              setSelectedPortfolioItem(portfolioItems[nextIdx]);
              setSelectedImageIdx(0);
            };

            const toggleLike = () => {
              setModalLikes(prev => ({
                ...prev,
                [itemId]: {
                  count: likeData.liked ? likeData.count - 1 : likeData.count + 1,
                  liked: !likeData.liked
                }
              }));
            };

            const toggleSave = () => {
              setModalSaved(prev => ({
                ...prev,
                [itemId]: !isSaved
              }));
            };

            const handleShareDossier = () => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(window.location.href);
                setCopiedModalLink(true);
                setTimeout(() => setCopiedModalLink(false), 2000);
              }
            };

            const handlePostComment = () => {
              if (!newCommentText.trim()) return;
              const commentObj = {
                id: `rev-${Date.now()}`,
                author: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Atelier Visitor',
                role: 'CAD Specialist',
                time: 'Just now',
                text: newCommentText.trim(),
                likes: 0,
                avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              };
              setModalComments(prev => ({
                ...prev,
                [itemId]: [...commentsList, commentObj]
              }));
              setNewCommentText('');
            };

            const dossierId = `HJ-${String(selectedPortfolioItem.id || '2025').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase() || '2025-09'}`;

            return (
              <div 
                className="fixed inset-0 z-50 bg-[#08090C] text-[#e3e2e7] font-sans antialiased overflow-hidden flex flex-col h-screen max-h-screen selection:bg-[#d9ee3c] selection:text-[#1a1e00]"
              >
                {/* Global Luxury Navigation Header */}
                <header className="shrink-0 w-full z-40 bg-[#14161E]/95 backdrop-blur-xl border-b border-[#282D3C]">
                  <div className="h-16 md:h-20 w-full px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6 shrink-0">
                      <button 
                        onClick={() => setSelectedPortfolioItem(null)} 
                        className="flex items-center gap-2 group cursor-pointer text-left"
                      >
                        <div className="w-8 h-8 rounded bg-[#d9ee3c] flex items-center justify-center shadow-[0_0_16px_rgba(217,238,60,0.35)] group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[#1a1e00] font-bold text-xl">diamond</span>
                        </div>
                        <span className="font-extrabold text-base sm:text-xl text-white tracking-tight uppercase">CADONCE</span>
                      </button>
                      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E222D] border border-[#282D3C]">
                        <span className="w-2 h-2 rounded-full bg-[#4ffeb9] shadow-[0_0_8px_rgba(79,254,185,0.8)] animate-pulse"></span>
                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Atelier Online</span>
                      </div>
                    </div>

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

                    <nav className="hidden xl:flex items-center gap-6 text-xs font-semibold">
                      <Link href="/explore" className="text-zinc-400 hover:text-white transition-colors">Haute Ateliers</Link>
                      <Link href="/designer/portfolio" className="text-zinc-400 hover:text-white transition-colors">Jewellery CAD Vault</Link>
                      <Link href="/team" className="text-zinc-400 hover:text-white transition-colors">Master Goldsmiths</Link>
                      <Link href="/projects" className="text-zinc-400 hover:text-white transition-colors">Couture Awards</Link>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <button 
                        onClick={handleShareDossier}
                        className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-[#d9ee3c] text-[#1a1e00] text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(217,238,60,0.45)]"
                      >
                        <span className="material-symbols-outlined text-base">{copiedModalLink ? 'check' : 'ios_share'}</span>
                        <span className="hidden md:inline">{copiedModalLink ? 'Copied' : 'Share Dossier'}</span>
                      </button>
                      <button 
                        onClick={() => setSelectedPortfolioItem(null)}
                        className="w-8 h-8 rounded-full bg-zinc-800 border border-[#282D3C] hover:border-[#d9ee3c] flex items-center justify-center transition-colors"
                        title="Back to Dossiers"
                      >
                        <span className="material-symbols-outlined text-zinc-300 text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                </header>

                {/* Main Content Area */}
                <main className="w-full flex-1 flex flex-col overflow-hidden min-h-0 relative bg-[#08090C]">
                  {/* Full-Screen Project Sub-Header / Breadcrumb Bar */}
                  <div className="w-full bg-[#0D0E12] border-b border-[#282D3C] px-4 sm:px-6 lg:px-10 py-2.5 sm:py-3 flex items-center justify-between shrink-0 z-30">
                    <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                      <button 
                        onClick={() => setSelectedPortfolioItem(null)} 
                        className="inline-flex items-center gap-1 text-zinc-400 hover:text-[#d9ee3c] font-semibold text-xs sm:text-sm transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        <span>Back to Dossiers</span>
                      </button>
                      <span className="text-[#282D3C]">/</span>
                      <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold hidden sm:inline">Haute Joaillerie CAD</span>
                      <span className="text-[#282D3C] hidden sm:inline">/</span>
                      <span className="text-white font-semibold text-xs sm:text-sm truncate max-w-[180px] sm:max-w-xs">
                        {selectedPortfolioItem.title || 'Parametric Showcase'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex items-center gap-1.5 text-zinc-400 text-[11px] font-bold tracking-wider uppercase">
                        <span className="w-2 h-2 rounded-full bg-[#4ffeb9] shadow-[0_0_6px_rgba(79,254,185,0.8)]"></span>
                        <span>PROJECT DOSSIER #{dossierId}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={handlePrevItem}
                          disabled={portfolioItems.length <= 1}
                          className="p-1.5 rounded-lg bg-[#14161E] text-zinc-400 hover:text-white hover:border-[#d9ee3c] border border-[#282D3C] disabled:opacity-40 transition-colors" 
                          title="Previous Project"
                        >
                          <span className="material-symbols-outlined text-base">chevron_left</span>
                        </button>
                        <button 
                          onClick={handleNextItem}
                          disabled={portfolioItems.length <= 1}
                          className="p-1.5 rounded-lg bg-[#14161E] text-zinc-400 hover:text-white hover:border-[#d9ee3c] border border-[#282D3C] disabled:opacity-40 transition-colors" 
                          title="Next Project"
                        >
                          <span className="material-symbols-outlined text-base">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Full-Screen 2-Column Split: Viewport & Details */}
                  <div className="w-full flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                    {/* LEFT COLUMN: CAD Interactive Viewport & High-Res Renders (~60%) */}
                    <div className="relative w-full lg:w-[60%] flex flex-col bg-[#0D0E12] border-b lg:border-b-0 lg:border-r border-[#282D3C] select-none h-full min-h-0 overflow-y-auto overscroll-contain">
                      {/* Viewport Top Header Bar */}
                      <div className="sticky top-0 left-0 right-0 z-20 flex items-center justify-between p-3 sm:p-4 bg-[#0D0E12]/95 backdrop-blur-md border-b border-[#282D3C]/60 shrink-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#1A1C23]/90 border border-[#282D3C]">
                            <span className="w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                            <span className="text-[11px] font-bold text-white tracking-wider uppercase">{softwareName}</span>
                          </div>
                          <div className="inline-flex items-center px-3 py-1 rounded bg-[#1A1C23]/90 border border-[#282D3C]">
                            <span className="text-[11px] font-bold text-[#ffb955] uppercase tracking-wider">{categoryName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {has3D && (
                            <button 
                              onClick={() => {
                                setSelectedProductForView({
                                  id: selectedPortfolioItem.id,
                                  name: selectedPortfolioItem.title || '3D Model',
                                  cadFiles: [{ name: selectedPortfolioItem.title || '3D Model', size: 0, url: cadUrl }]
                                });
                              }}
                              className="px-3 py-1 rounded-lg bg-[#d9ee3c] text-[#1a1e00] hover:brightness-110 text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(217,238,60,0.3)]"
                              title="Interactive 3D WebGL Viewport"
                            >
                              <span className="material-symbols-outlined text-base">view_in_ar</span>
                              <span className="text-[11px] font-bold uppercase tracking-wider">VIEW 3D</span>
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if (typeof document !== 'undefined') {
                                if (!document.fullscreenElement) {
                                  document.documentElement.requestFullscreen?.();
                                } else {
                                  document.exitFullscreen?.();
                                }
                              }
                            }}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#1A1C23]/90 border border-[#282D3C] flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#d9ee3c] transition-all shadow-lg" 
                            title="Toggle Fullscreen CAD View"
                          >
                            <span className="material-symbols-outlined text-lg sm:text-xl">fullscreen</span>
                          </button>
                        </div>
                      </div>

                      {/* Renders / Views Feed */}
                      <div className="flex-1 flex flex-col gap-6 p-4 sm:p-6">
                        {activeImages.map((imgUrl, idx) => (
                          <div 
                            key={idx} 
                            id={`modal-viewport-img-${idx}`}
                            className="relative w-full rounded-2xl bg-gradient-to-b from-[#08090C] to-[#14161E] border border-[#282D3C] flex items-center justify-center overflow-hidden p-2 sm:p-4 group shadow-xl min-h-[380px]"
                          >
                            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#282D3C_1px,transparent_1px)] [background-size:24px_24px] opacity-25"></div>
                            <img 
                              src={imgUrl} 
                              alt={`${selectedPortfolioItem.title || 'Portfolio Work'} - Angle ${idx + 1}`} 
                              className="w-full h-auto max-h-[82vh] object-contain rounded-xl transition-transform duration-500 ease-out group-hover:scale-[1.01]" 
                            />
                            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-2 p-1.5 px-3 rounded-lg bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] shadow-lg pointer-events-none">
                              <span className="w-2 h-2 rounded-full bg-[#4ffeb9] shadow-[0_0_6px_rgba(79,254,185,0.9)]"></span>
                              <span className="text-[10px] text-zinc-300 tracking-wider uppercase font-bold">
                                {idx === 0 ? 'Perspective View' : idx === 1 ? 'Wireframe / Technical' : `Angle 0${idx + 1}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Viewport Bottom Carousel / Projection Angle Thumbnails */}
                      {activeImages.length > 1 && (
                        <div className="sticky bottom-0 h-16 w-full bg-[#14161E]/95 backdrop-blur-md border-t border-[#282D3C] px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-20 shrink-0">
                          <div className="flex items-center gap-2 overflow-x-auto py-1">
                            {activeImages.map((imgUrl, idx) => {
                              const isActive = idx === selectedImageIdx;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setSelectedImageIdx(idx);
                                    const el = document.getElementById(`modal-viewport-img-${idx}`);
                                    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                  }}
                                  className={`relative w-14 sm:w-16 h-10 rounded overflow-hidden shrink-0 transition-all ${
                                    isActive 
                                      ? 'border-2 border-[#d9ee3c] shadow-[0_0_10px_rgba(217,238,60,0.3)]' 
                                      : 'border border-[#282D3C] hover:border-zinc-400 opacity-75 hover:opacity-100'
                                  }`}
                                  title={`Perspective 0${idx + 1}`}
                                >
                                  <img className="w-full h-full object-cover" alt={`Angle 0${idx + 1}`} src={imgUrl} />
                                  <span className="absolute inset-x-0 bottom-0 bg-[#08090C]/80 text-[8px] text-zinc-300 text-center truncate font-bold uppercase px-0.5">
                                    {idx === 0 ? 'Persp 01' : idx === 1 ? 'Wireframe' : `Angle 0${idx + 1}`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#d9ee3c]"></span>
                            <span>{activeImages.length} VIEWS</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: Creator Header, Dossier Specs, Engagement & Sticky Commission CTA (~40%) */}
                    <div className="flex-1 lg:w-[40%] flex flex-col justify-between bg-[#14161E] overflow-hidden h-full min-h-0">
                      {/* Top Creator Profile Header Bar */}
                      <div className="p-4 sm:p-5 border-b border-[#282D3C] flex items-center justify-between gap-3 bg-[#14161E]/90 backdrop-blur-sm shrink-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <div className="w-11 h-11 rounded-full p-[1.5px] bg-[#282D3C] overflow-hidden border border-[#282D3C]">
                                <img 
                                  className="w-full h-full rounded-full object-cover" 
                                  alt={creatorName} 
                                  src={designer?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuCHIqk87oggK5TPsjoUaYgF7PHHn4IuOD8iZUBOBBRsVsayp1WGVkMVJJG_8xH62jo3KfjCpf28Bs1yi-VkgwyXHY_8X7F5zJ_UCLdoPGDzuxVYIExhwLbsOKSkWSTCmI7eLql7RtNwooxqk0aJpu-h1oBmWYWhaHht_6QbmFot9WbDXJmKK4zXxLi470FjM4iAOmYJKOdmQN464OB8Ol2G7qXGtE444Bej5ZN4Wsid5Yfn1lboWNjx6A"}
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
                                  onClick={() => setIsDesignerFollowed(!isDesignerFollowed)}
                                  className={`font-bold ml-0.5 shrink-0 transition-colors ${
                                    isDesignerFollowed ? 'text-[#4ffeb9]' : 'text-[#d9ee3c] hover:underline'
                                  }`}
                                >
                                  {isDesignerFollowed ? 'Following' : '+ Follow'}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button 
                              onClick={handleShareDossier}
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#1E222D] transition-colors" 
                              title="Share Project"
                            >
                              <span className="material-symbols-outlined text-xl">{copiedModalLink ? 'check' : 'share'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Scrollable Dossier Content & Technical Specifications */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 min-h-0 overscroll-contain">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] text-[#ffb955] font-bold uppercase tracking-wider">{categoryName}</span>
                              <span className="text-xs text-zinc-500">Maison Dossier 2025</span>
                            </div>
                            <h1 className="text-2xl text-white font-bold tracking-tight mt-0.5">
                              {selectedPortfolioItem.title || 'Parametric Design Showcase'}
                            </h1>
                            <p className="text-sm text-zinc-300 leading-relaxed mt-1">
                              {narrativeText}
                            </p>
                          </div>

                          {/* Hashtags */}
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              `#${(softwareName.split('/')[0] || 'ZBRUSH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
                              `#${categoryName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`,
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


                          {/* Comments List */}
                          {commentsList.length > 0 && (
                            <div className="flex flex-col gap-2 pt-2">
                              <span className="text-[11px] text-zinc-400 uppercase tracking-widest font-bold">TECHNICAL REVIEWS ({commentsList.length})</span>
                              <div className="space-y-2">
                                {commentsList.map(c => (
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
                              <button 
                                onClick={toggleLike}
                                className={`flex items-center gap-1.5 transition-colors group ${
                                  likeData.liked ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                                }`} 
                                title="Like Project"
                              >
                                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">
                                  {likeData.liked ? 'favorite' : 'favorite_border'}
                                </span>
                                <span className="text-sm text-white font-bold">{likeData.count.toLocaleString()}</span>
                              </button>

                              <button 
                                className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group" 
                                title="Comments"
                              >
                                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">chat_bubble_outline</span>
                                <span className="text-sm text-white font-bold">{commentsList.length}</span>
                              </button>

                              <button 
                                onClick={handleShareDossier}
                                className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group" 
                                title="Share Creation"
                              >
                                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">share</span>
                              </button>
                            </div>

                            <button 
                              onClick={toggleSave}
                              className={`transition-colors ${
                                isSaved ? 'text-[#d9ee3c]' : 'text-zinc-400 hover:text-[#d9ee3c]'
                              }`} 
                              title="Bookmark to Collection"
                            >
                              <span className="material-symbols-outlined text-xl">
                                {isSaved ? 'bookmark' : 'bookmark_border'}
                              </span>
                            </button>
                          </div>

                          {/* Quick Comment Input Field */}
                          <div className="relative w-full">
                            <input 
                              type="text" 
                              value={newCommentText}
                              onChange={(e) => setNewCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handlePostComment();
                                }
                              }}
                              className="w-full bg-[#0D0E12] border border-[#282D3C] rounded-lg pl-3 pr-16 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#d9ee3c] transition-all" 
                              placeholder={`Add technical review or inquiry for ${creatorFirst}...`}
                            />
                            <button 
                              onClick={handlePostComment}
                              disabled={!newCommentText.trim()}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#d9ee3c] hover:underline px-2 py-1 disabled:opacity-40"
                            >
                              POST
                            </button>
                          </div>

                          {/* Commission Bespoke Piece CTA */}
                          <Link 
                            href={`/inbox?hire=${selectedPortfolioItem.id || 'bespoke'}&title=${encodeURIComponent(selectedPortfolioItem.title || 'Bespoke CAD')}`}
                            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#d9ee3c] text-[#1a1e00] text-sm font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(217,238,60,0.4)] active:translate-y-0"
                          >
                            <span className="material-symbols-outlined text-xl">mail</span>
                            <span>COMMISSION BESPOKE PIECE / HIRE {creatorFirst.toUpperCase()}</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                </main>
              </div>
            );
          })()}
        
        {/* Modal for Adding Product */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#121212] rounded-xl border border-[#262626] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{isEditing ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Product Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                    placeholder="Enter product name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Price</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                    placeholder="e.g. $500"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  />
                </div>

                {/* Product Specifications */}
                <div className="pt-2 border-t border-[#262626]">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#ffe30c] mb-2">Product Specifications</h4>
                  
                  {/* Product Type Dropdown */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-400 block mb-1">Product Type</label>
                    <select 
                      className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c] text-white"
                      value={newProduct.productType}
                      onChange={(e) => setNewProduct({...newProduct, productType: e.target.value})}
                    >
                      <option value="Ring">Ring</option>
                      <option value="Pendant">Pendant</option>
                      <option value="Earring">Earring</option>
                      <option value="Bracelet">Bracelet</option>
                    </select>
                  </div>

                  {/* Conditional Fields based on Product Type */}
                  {newProduct.productType === 'Ring' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Ring Size</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. US 7"
                          value={newProduct.ringSize}
                          onChange={(e) => setNewProduct({...newProduct, ringSize: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Main Gems</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. 1.2ct Radiant"
                          value={newProduct.mainGems}
                          onChange={(e) => setNewProduct({...newProduct, mainGems: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Side Gems</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. 42x Round"
                          value={newProduct.sideGems}
                          onChange={(e) => setNewProduct({...newProduct, sideGems: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Metal Weight</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. 12.45g"
                          value={newProduct.metalWeight}
                          onChange={(e) => setNewProduct({...newProduct, metalWeight: e.target.value})}
                        />
                        <div className="mt-2">
                          <label className="text-xs text-gray-400 block mb-1">Metal Weight Image (Optional)</label>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                            onChange={(e) => setNewProduct({...newProduct, metalWeightImage: e.target.files?.[0] || null})}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {newProduct.productType === 'Bracelet' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Bracelet Size</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. 7 inches"
                          value={newProduct.braceletSize}
                          onChange={(e) => setNewProduct({...newProduct, braceletSize: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Main Gems</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. 5ct Tennis"
                          value={newProduct.mainGems}
                          onChange={(e) => setNewProduct({...newProduct, mainGems: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {(newProduct.productType === 'Pendant' || newProduct.productType === 'Earring') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Main Gems</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. 1ct Diamond"
                          value={newProduct.mainGems}
                          onChange={(e) => setNewProduct({...newProduct, mainGems: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Metal Weight</label>
                        <input 
                          type="text" 
                          className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                          placeholder="e.g. 5g"
                          value={newProduct.metalWeight}
                          onChange={(e) => setNewProduct({...newProduct, metalWeight: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom Field (Always shown for flexibility) */}
                  <div className="mt-4 pt-4 border-t border-[#1a1a1a]">
                    <label className="text-xs text-gray-400 block mb-1">Custom Field (Label: Value)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                        placeholder="Label (e.g. Chain Length)"
                        value={newProduct.customLabel}
                        onChange={(e) => setNewProduct({...newProduct, customLabel: e.target.value})}
                      />
                      <input 
                        type="text" 
                        className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                        placeholder="Value (e.g. 18 inches)"
                        value={newProduct.customValue}
                        onChange={(e) => setNewProduct({...newProduct, customValue: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Main Image</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewProduct({...newProduct, mainImage: file});
                      }
                    }}
                  />
                  {newProduct.mainImage ? (
                    <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-[#262626]">
                      <img 
                        src={URL.createObjectURL(newProduct.mainImage)} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : isEditing && newProduct.image ? (
                    <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-[#262626]">
                      <img 
                        src={newProduct.image} 
                        alt="Existing" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Gallery Images</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    multiple
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewProduct({...newProduct, galleryImages: [...newProduct.galleryImages, ...files]});
                    }}
                  />
                  {newProduct.galleryImages.length > 0 ? (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {newProduct.galleryImages.map((file, idx) => (
                        <div key={idx} className="w-10 h-10 rounded overflow-hidden border border-[#262626] relative group">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                          <button 
                            onClick={() => setNewProduct({...newProduct, galleryImages: newProduct.galleryImages.filter((_, i) => i !== idx)})} 
                            className="absolute top-0 right-0 bg-black/70 text-white text-xs w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : isEditing && (products.find(p => p.id === currentEditingProductId)?.images?.length ?? 0) > 0 ? (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {products.find(p => p.id === currentEditingProductId)?.images?.map((img: string, idx: number) => (
                        <div key={idx} className="w-10 h-10 rounded overflow-hidden border border-[#262626]">
                          <img 
                            src={img} 
                            alt="Existing" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">CAD Files (.3dm, .obj, .stl)</label>
                  <input 
                    type="file" 
                    accept=".3dm,.obj,.stl"
                    multiple
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg p-2.5 text-sm focus:outline-none focus:border-[#ffe30c]" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewProduct({...newProduct, cadFiles: [...newProduct.cadFiles, ...files]});
                    }}
                  />
                  {newProduct.cadFiles.length > 0 ? (
                    <div className="flex flex-col gap-1 mt-2">
                      {newProduct.cadFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-[#1a1a1a] p-1.5 rounded text-xs text-gray-300">
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <button 
                            onClick={() => setNewProduct({...newProduct, cadFiles: newProduct.cadFiles.filter((_, i) => i !== idx)})} 
                            className="text-gray-500 hover:text-white"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : isEditing && (products.find(p => p.id === currentEditingProductId)?.cadFiles?.length ?? 0) > 0 ? (
                    <div className="flex flex-col gap-1 mt-2">
                      {products.find(p => p.id === currentEditingProductId)?.cadFiles?.map((file: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-[#1a1a1a] p-1.5 rounded text-xs text-gray-300">
                          <span className="truncate max-w-[200px]">{file.name}</span>
                          <span className="text-gray-500 text-xs">(Already Uploaded)</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button 
                  onClick={async () => {
                    if (!newProduct.name || !newProduct.price || (!isEditing && !newProduct.mainImage)) {
                      alert('Please fill Name, Price, and select a Main Image!');
                      return;
                    }
                    
                    let mainImageUrl = newProduct.image;
                    if (newProduct.mainImage) {
                      try {
                        mainImageUrl = await fileToBase64(newProduct.mainImage);
                      } catch (err) {
                        console.error('Failed to convert image:', err);
                        alert('Failed to process image file.');
                        return;
                      }
                    }

                    try {
                      if (isEditing && currentEditingProductId) {
                        const updatedProducts = await Promise.all(products.map(async p => {
                          if (p.id === currentEditingProductId) {
                            const newCadFiles = newProduct.cadFiles.length > 0 
                              ? await Promise.all(newProduct.cadFiles.map(async f => ({ name: f.name, size: f.size, data: await fileToArrayBuffer(f) })))
                              : p.cadFiles;
                              
                            const newGalleryImages = newProduct.galleryImages.length > 0
                              ? await Promise.all(newProduct.galleryImages.map(f => fileToBase64(f)))
                              : p.images;

                             return {
                               ...p,
                               name: newProduct.name,
                               price: newProduct.price,
                               image: mainImageUrl,
                               images: newGalleryImages,
                               cadFiles: newCadFiles,
                               productType: newProduct.productType,
                               ringSize: newProduct.ringSize,
                               mainGems: newProduct.mainGems,
                               sideGems: newProduct.sideGems,
                               metalWeight: newProduct.metalWeight,
                               metalWeightImage: newProduct.metalWeightImage ? await fileToBase64(newProduct.metalWeightImage) : (p as any).metalWeightImage,
                               braceletSize: newProduct.braceletSize,
                               customLabel: newProduct.customLabel,
                               customValue: newProduct.customValue
                             };
                          }
                          return p;
                        }));
                        
                        setProducts(updatedProducts);

                        if (user?.id) {
                          const { updateRecord } = await import('@/lib/db');
                          const updatedProduct = updatedProducts.find(p => p.id === currentEditingProductId);
                          if (updatedProduct) {
                            const { id } = updatedProduct;
                            const dataToUpdate = {
                              name: updatedProduct.name,
                              price: updatedProduct.price,
                              image: updatedProduct.image,
                              images: updatedProduct.images,
                              cad_files: updatedProduct.cadFiles,
                              product_type: updatedProduct.productType,
                              ring_size: updatedProduct.ringSize,
                              main_gems: updatedProduct.mainGems,
                              side_gems: updatedProduct.sideGems,
                              metal_weight: updatedProduct.metalWeight,
                              metal_weight_image: updatedProduct.metalWeightImage,
                              bracelet_size: updatedProduct.braceletSize,
                              custom_label: updatedProduct.customLabel,
                              custom_value: updatedProduct.customValue
                            };
                            await updateRecord('products', String(id), dataToUpdate, user.id);
                          }
                        }
                      } else {
                        const newProd = {
                          id: Date.now(),
                          name: newProduct.name,
                          price: newProduct.price,
                          image: mainImageUrl,
                          images: await Promise.all(newProduct.galleryImages.map(f => fileToBase64(f))),
                          cadFiles: await Promise.all(newProduct.cadFiles.map(async f => ({ name: f.name, size: f.size, data: await fileToArrayBuffer(f) }))),
                          productType: newProduct.productType,
                          ringSize: newProduct.ringSize,
                          mainGems: newProduct.mainGems,
                          sideGems: newProduct.sideGems,
                          metalWeight: newProduct.metalWeight,
                          metalWeightImage: newProduct.metalWeightImage ? await fileToBase64(newProduct.metalWeightImage) : null,
                          braceletSize: newProduct.braceletSize,
                          customLabel: newProduct.customLabel,
                          customValue: newProduct.customValue
                        };
                        setProducts([...products, newProd]);

                        if (user?.id) {
                          const { supabase } = await import('@/lib/supabase');
                          const { data, error } = await supabase
                            .from('products')
                            .insert({
                              user_id: user.id,
                              name: newProd.name,
                              price: newProd.price,
                              image: newProd.image,
                              images: newProd.images,
                              cad_files: newProd.cadFiles,
                              product_type: newProd.productType,
                              ring_size: newProd.ringSize,
                              main_gems: newProd.mainGems,
                              side_gems: newProd.sideGems,
                              metal_weight: newProd.metalWeight,
                              metal_weight_image: newProd.metalWeightImage,
                              bracelet_size: newProd.braceletSize,
                              custom_label: newProd.customLabel,
                              custom_value: newProd.customValue
                            })
                            .select();
                            
                          if (error) throw error;
                          if (data?.[0]) {
                            setProducts(prev => prev.map(p => p.id === newProd.id ? { ...p, id: data[0].id } : p));
                          }
                        }
                      }

                      setNewProduct({ name: '', price: '', productType: 'Ring', image: '', mainImage: null, galleryImages: [], cadFiles: [], metalWeightImage: null, ringSize: '', mainGems: '', sideGems: '', metalWeight: '', braceletSize: '', customLabel: '', customValue: '' });
                      setIsEditing(false);
                      setCurrentEditingProductId(null);
                      setIsModalOpen(false);
                    } catch (err) {
                      console.error('Failed to save product:', err);
                      alert('Failed to save product: ' + (err as any).message);
                    }
                  }}
                  className="w-full bg-[#ffe30c] hover:bg-[#e6cc00] text-black py-2.5 rounded-lg text-sm font-bold transition-colors mt-6"
                >
                  {isEditing ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Modal */}
        {selectedProductForView && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-[#121212] rounded-xl border border-[#262626] w-full max-w-2xl relative h-[80vh] sm:h-[600px] max-h-[640px] overflow-hidden">
              <div className="absolute inset-0">
                {selectedProductForView.cadFiles && selectedProductForView.cadFiles.length > 0 ? (
                  <ErrorBoundary>
                    {(() => {
                      const supportedFile = selectedProductForView.cadFiles.find((f: any) => 
                        f.name.toLowerCase().endsWith('.stl') || 
                        f.name.toLowerCase().endsWith('.obj')
                      ) || selectedProductForView.cadFiles[0];
                      
                      return (
                        <ViewportCanvas 
                          fileUrl={supportedFile.url} 
                          fileName={supportedFile.name}
                          fileData={supportedFile.data}
                          metalType="gold" 
                          isAutoRotate={true}
                        />
                      );
                    })()}
                  </ErrorBoundary>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-2">view_in_ar</span>
                    <p className="text-sm font-bold text-gray-400">No CAD files available for preview.</p>
                  </div>
                )}
              </div>
              
              <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-center z-10 bg-black/60 backdrop-blur-md p-3 sm:p-4 rounded-xl border border-white/5">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">{selectedProductForView.name}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-400">3D Viewport Preview</p>
                </div>
                <button onClick={() => setSelectedProductForView(null)} className="text-gray-400 hover:text-white">
                  <span className="material-symbols-outlined text-lg sm:text-xl">close</span>
                </button>
              </div>
              
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10">
                <button 
                  onClick={() => setSelectedProductForView(null)}
                  className="bg-[#ffe30c] hover:bg-[#e6cc00] text-black py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-bold transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
  );
}
