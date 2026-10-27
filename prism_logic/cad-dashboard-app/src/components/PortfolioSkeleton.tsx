'use client';

import React from 'react';

export function PortfolioCardSkeleton({ keyIndex, viewMode = 'grid' }: { keyIndex: number; viewMode?: 'grid' | 'agenda' }) {
  if (viewMode === 'agenda') {
    return (
      <div 
        key={keyIndex}
        className="rounded-2xl overflow-hidden border border-[#282D3C] bg-[#14161E] skeleton-card flex flex-col shadow-lg"
      >
        <div className="p-3 sm:p-4 flex items-center justify-between border-b border-[#1B1E28]">
          <div className="h-4 w-28 bg-white/10 rounded skeleton-shimmer" />
          <div className="h-4 w-16 bg-white/10 rounded skeleton-shimmer" />
        </div>
        <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-[#0A0B0E] skeleton-shimmer" />
        <div className="p-3 sm:p-4 flex items-center justify-between">
          <div className="h-4 w-36 bg-white/10 rounded skeleton-shimmer" />
          <div className="h-4 w-20 bg-white/10 rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <div 
      key={keyIndex}
      className="group relative rounded-xl overflow-hidden border border-[#282D3C] aspect-square bg-[#0D0E12] skeleton-card shadow-md"
    >
      {/* Top-left tag shimmer */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <div className="h-4 w-16 bg-white/10 rounded-md skeleton-shimmer" />
      </div>
      {/* Top-right icon shimmer */}
      <div className="absolute top-2.5 right-2.5 z-10 flex gap-1">
        <div className="w-6 h-6 rounded-md bg-white/10 skeleton-shimmer" />
      </div>

      {/* Central body shimmer */}
      <div className="w-full h-full bg-white/[0.04] skeleton-shimmer" />

      {/* Bottom-right 3D button placeholder */}
      <div className="absolute bottom-2.5 right-2.5 z-10">
        <div className="w-7 h-7 rounded-lg bg-white/10 skeleton-shimmer" />
      </div>

      {/* Bottom title & metadata placeholder */}
      <div className="absolute bottom-2.5 left-2.5 right-12 z-10 space-y-1.5">
        <div className="h-3.5 w-3/4 bg-white/10 rounded skeleton-shimmer" />
        <div className="h-2.5 w-1/2 bg-white/10 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

export function PortfolioGridSkeleton({ count = 6, viewMode = 'grid' }: { count?: number; viewMode?: 'grid' | 'agenda' }) {
  return (
    <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4" : "grid grid-cols-1 gap-4"}>
      {Array.from({ length: count }).map((_, idx) => (
        <PortfolioCardSkeleton key={idx} keyIndex={idx} viewMode={viewMode} />
      ))}
    </div>
  );
}

export function PortfolioTabsSkeleton() {
  return (
    <div className="bg-[#14161E]/90 backdrop-blur-md rounded-xl border border-[#282D3C] p-2 sm:p-2.5 skeleton-card">
      <div className="flex items-center justify-between border-b border-[#1B1E28] pb-1.5 sm:pb-2 px-1 sm:px-2 gap-2">
        <div className="flex items-center gap-3 sm:gap-6 overflow-hidden">
          <div className="h-7 w-28 bg-white/10 rounded-lg skeleton-shimmer shrink-0" />
          <div className="h-7 w-20 bg-white/10 rounded-lg skeleton-shimmer shrink-0" />
          <div className="h-7 w-16 bg-white/10 rounded-lg skeleton-shimmer shrink-0" />
          <div className="h-7 w-20 bg-white/10 rounded-lg skeleton-shimmer shrink-0" />
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-white/10 skeleton-shimmer" />
          <div className="w-7 h-7 rounded-lg bg-white/10 skeleton-shimmer" />
        </div>
      </div>
      <div className="pt-2 sm:pt-2.5 pb-0.5 px-1 flex items-center gap-1.5 sm:gap-2 overflow-hidden">
        <div className="h-6 w-16 rounded-full bg-white/10 skeleton-shimmer shrink-0" />
        <div className="h-6 w-24 rounded-full bg-white/10 skeleton-shimmer shrink-0" />
        <div className="h-6 w-20 rounded-full bg-white/10 skeleton-shimmer shrink-0" />
        <div className="h-6 w-20 rounded-full bg-white/10 skeleton-shimmer shrink-0" />
        <div className="h-6 w-24 rounded-full bg-white/10 skeleton-shimmer shrink-0" />
        <div className="h-6 w-20 rounded-full bg-white/10 skeleton-shimmer shrink-0" />
      </div>
    </div>
  );
}

export function PortfolioMobileHeroSkeleton() {
  return (
    <div className="xl:hidden rounded-2xl border border-[#282D3C] bg-[#14161E]/95 backdrop-blur-xl p-4 sm:p-6 shadow-xl relative overflow-hidden flex flex-col gap-4 skeleton-card">
      <div className="flex items-center gap-3.5 relative z-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 skeleton-shimmer shrink-0 border border-white/5" />
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="h-5 w-36 bg-white/10 rounded-md skeleton-shimmer" />
          <div className="h-3 w-28 bg-white/10 rounded skeleton-shimmer" />
          <div className="h-2.5 w-24 bg-white/10 rounded skeleton-shimmer" />
        </div>
      </div>

      <div className="h-6 w-44 rounded-full bg-white/10 skeleton-shimmer" />

      <div className="space-y-1.5">
        <div className="h-3 w-full bg-white/10 rounded skeleton-shimmer" />
        <div className="h-3 w-5/6 bg-white/10 rounded skeleton-shimmer" />
      </div>

      <div className="w-full grid grid-cols-4 gap-1.5 py-3 px-2 rounded-xl bg-[#0D0E12]/90 border border-[#1B1E28]">
        {[
          { label: 'PORTFOLIO' },
          { label: 'JOBS' },
          { label: 'RATING' },
          { label: 'ON-TIME' },
        ].map((m, i) => (
          <div key={i} className={`flex flex-col items-center gap-1 ${i > 0 ? 'border-l border-[#1B1E28]' : ''}`}>
            <div className="h-5 w-8 bg-white/10 rounded skeleton-shimmer" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">{m.label}</span>
          </div>
        ))}
      </div>

      <div className="w-full flex flex-col sm:flex-row gap-2">
        <div className="h-10 flex-1 bg-[#d9ee3c]/20 rounded-xl skeleton-shimmer border border-[#d9ee3c]/30" />
        <div className="flex gap-2 flex-1">
          <div className="h-10 flex-1 bg-white/10 rounded-xl skeleton-shimmer border border-[#282D3C]" />
          <div className="h-10 flex-1 bg-white/10 rounded-xl skeleton-shimmer border border-[#282D3C]" />
        </div>
      </div>
    </div>
  );
}

export function PortfolioSidebarSkeleton() {
  return (
    <aside className="xl:col-span-4 flex flex-col gap-6 xl:sticky xl:top-24">
      {/* Primary Profile Dossier Card */}
      <div className="hidden xl:flex relative rounded-2xl border border-[#282D3C] bg-[#14161E]/95 backdrop-blur-xl p-6 sm:p-7 flex-col items-center text-center shadow-2xl overflow-hidden skeleton-card">
        {/* Glowing circular avatar placeholder */}
        <div className="relative mt-2 mb-4">
          <div className="w-28 h-28 rounded-full bg-white/10 skeleton-shimmer border border-white/5" />
          <div className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-[#08090C] flex items-center justify-center p-0.5">
            <div className="w-full h-full rounded-full bg-[#4ffeb9]/40 skeleton-shimmer" />
          </div>
        </div>

        {/* Identity Headings */}
        <div className="h-6 w-40 bg-white/10 rounded-md skeleton-shimmer mb-2" />
        <div className="h-3.5 w-28 bg-white/10 rounded skeleton-shimmer mb-2" />
        <div className="h-4 w-48 bg-white/10 rounded-full skeleton-shimmer mb-4" />

        {/* Pro Badge Pill */}
        <div className="h-6 w-48 rounded-full bg-white/10 skeleton-shimmer mb-5" />

        {/* Bio Narrative */}
        <div className="w-full space-y-2 mb-6">
          <div className="h-3 w-full bg-white/10 rounded skeleton-shimmer" />
          <div className="h-3 w-5/6 mx-auto bg-white/10 rounded skeleton-shimmer" />
          <div className="h-3 w-4/6 mx-auto bg-white/10 rounded skeleton-shimmer" />
        </div>

        {/* Metrics Quad Grid */}
        <div className="w-full grid grid-cols-4 gap-2 py-4 px-3 rounded-xl bg-[#0D0E12]/90 border border-[#1B1E28] mb-6">
          {[
            { label: 'PORTFOLIO' },
            { label: 'JOBS' },
            { label: 'RATING' },
            { label: 'ON-TIME' },
          ].map((m, i) => (
            <div key={i} className={`flex flex-col items-center gap-1.5 ${i > 0 ? 'border-l border-[#1B1E28]' : ''}`}>
              <div className="h-6 w-10 bg-white/10 rounded skeleton-shimmer" />
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Primary CTAs */}
        <div className="w-full flex flex-col gap-2.5">
          <div className="h-11 w-full bg-[#d9ee3c]/20 rounded-xl skeleton-shimmer border border-[#d9ee3c]/30" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-9 w-full bg-white/10 rounded-xl skeleton-shimmer border border-[#282D3C]" />
            <div className="h-9 w-full bg-white/10 rounded-xl skeleton-shimmer border border-[#282D3C]" />
          </div>
        </div>

        {/* Studio Meta Specs */}
        <div className="w-full pt-4 mt-4 border-t border-[#1B1E28] flex items-center justify-between">
          <div className="h-3 w-28 bg-white/10 rounded skeleton-shimmer" />
          <div className="h-3 w-24 bg-white/10 rounded skeleton-shimmer" />
        </div>
      </div>

      {/* Skills & Toolchain Panel */}
      <div className="rounded-xl border border-[#282D3C] bg-[#14161E]/90 backdrop-blur-md p-5 flex flex-col gap-4 shadow-lg skeleton-card">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-white/10 rounded skeleton-shimmer" />
          <div className="h-3 w-20 bg-white/10 rounded skeleton-shimmer" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['w-28', 'w-24', 'w-32', 'w-28', 'w-24', 'w-30'].map((w, i) => (
            <div key={i} className={`h-7 ${w} bg-white/10 rounded-lg skeleton-shimmer`} />
          ))}
        </div>
      </div>

      {/* Verified Reviews */}
      <div className="rounded-xl border border-[#282D3C] bg-[#14161E]/90 backdrop-blur-md p-5 flex flex-col gap-3 shadow-lg skeleton-card">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 bg-white/10 rounded skeleton-shimmer" />
          <div className="h-4 w-20 bg-white/10 rounded skeleton-shimmer" />
        </div>
        <div className="p-3.5 rounded-lg bg-[#0D0E12] border border-[#1B1E28] space-y-2">
          <div className="h-3 w-full bg-white/10 rounded skeleton-shimmer" />
          <div className="h-3 w-4/5 bg-white/10 rounded skeleton-shimmer" />
        </div>
      </div>
    </aside>
  );
}

export function DesignerPortfolioSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased pb-32 relative overflow-x-hidden animate-in fade-in duration-300">
      <main className="w-full px-4 sm:px-8 xl:px-12 pt-24 max-w-[1720px] mx-auto">
        {/* Bento Header & Stats Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-16 relative z-10">
          {/* Big Card */}
          <div className="lg:col-span-8 bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col justify-between skeleton-card">
            <div className="space-y-4">
              <div className="h-7 w-28 bg-white/10 rounded-full skeleton-shimmer mb-6" />
              <div className="h-12 w-64 bg-white/10 rounded-xl skeleton-shimmer mb-4" />
              <div className="h-4 w-96 max-w-full bg-white/10 rounded skeleton-shimmer" />
              <div className="h-4 w-72 max-w-full bg-white/10 rounded skeleton-shimmer" />
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-12">
              <div className="h-12 w-36 bg-white/10 rounded-2xl skeleton-shimmer" />
              <div className="h-12 w-36 bg-white/10 rounded-2xl skeleton-shimmer" />
            </div>
          </div>

          {/* Stats Column */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex-1 bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[32px] p-8 skeleton-card flex flex-col justify-center">
              <div className="h-3 w-32 bg-white/10 rounded skeleton-shimmer mb-3" />
              <div className="h-14 w-20 bg-white/10 rounded-lg skeleton-shimmer" />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-6">
              <div className="bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[24px] p-6 sm:p-8 skeleton-card flex flex-col justify-center">
                <div className="h-3 w-20 bg-white/10 rounded skeleton-shimmer mb-2" />
                <div className="h-9 w-12 bg-white/10 rounded-lg skeleton-shimmer" />
              </div>
              <div className="bg-[#14161E]/90 backdrop-blur-md border border-[#282D3C] rounded-[24px] p-6 sm:p-8 skeleton-card flex flex-col justify-center">
                <div className="h-3 w-20 bg-white/10 rounded skeleton-shimmer mb-2" />
                <div className="h-9 w-12 bg-white/10 rounded-lg skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>

        {/* Featured Work Masonry Skeleton */}
        <section className="mb-24 relative z-10">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#282D3C]">
            <div className="h-6 w-44 bg-white/10 rounded skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
              <div key={idx} className="rounded-[24px] overflow-hidden bg-[#08090C] border border-[#282D3C] aspect-[3/4] skeleton-card relative">
                <div className="w-full h-full bg-white/[0.04] skeleton-shimmer" />
                <div className="absolute bottom-6 left-6 right-6 space-y-2">
                  <div className="h-4 w-24 bg-white/10 rounded skeleton-shimmer" />
                  <div className="h-6 w-40 bg-white/10 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
