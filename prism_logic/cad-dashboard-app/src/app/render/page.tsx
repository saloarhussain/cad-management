"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/AuthGuard';

// Dynamically import the RenderStudio to disable Server-Side Rendering (SSR).
// This is essential for Three.js and WebGL libraries since they require direct access 
// to browser-specific DOM elements, window objects, and canvas contexts.
const RenderStudio = dynamic(() => import('./RenderStudio'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0D0B04] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-[#fce003] text-2xl animate-spin">progress_activity</span>
        </div>
        <span className="text-[10px] font-black text-[#fce003] uppercase tracking-[0.3em] animate-pulse">
          Initializing Raytracer...
        </span>
      </div>
    </div>
  ),
});

export default function RenderPage() {
  return (
    <AuthGuard>
      <RenderStudio />
    </AuthGuard>
  );
}
