'use client';

import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="pt-20 px-6 space-y-6 pb-10 relative animate-in fade-in duration-300">
      {/* Welcome Section Header */}
      <section className="mt-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-headline text-[20px] sm:text-[24px] font-extrabold tracking-tight text-on-surface leading-none">
              Data Overview
            </h1>
            <p className="text-[11px] font-bold text-on-surface-variant tracking-wider mt-1.5">
              Strategic Dashboard
            </p>
          </div>

          {/* Quick Stats Chips Placeholders (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-surface-container rounded-full px-4 py-2 flex items-center justify-center gap-1.5 border border-white/5 min-w-0">
              <span className="material-symbols-outlined text-[#F59E0B] text-[16px] sm:text-[18px] shrink-0">person</span>
              <span className="inline-block w-24 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
            </div>
            <div className="bg-surface-container rounded-full px-4 py-2 flex items-center justify-center gap-1.5 border border-white/5 min-w-0">
              <span className="material-symbols-outlined text-[#2DD4BF] text-[16px] sm:text-[18px] shrink-0">groups</span>
              <span className="inline-block w-24 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
            </div>
          </div>
        </div>

        {/* Quick Stats Chips Placeholders (Mobile) */}
        <div className="grid grid-cols-2 gap-2 w-full md:hidden">
          <div className="bg-surface-container rounded-full px-3 py-2 flex items-center justify-center gap-1.5 border border-white/5 w-full min-w-0">
            <span className="material-symbols-outlined text-[#F59E0B] text-[16px] sm:text-[18px] shrink-0">person</span>
            <span className="inline-block w-20 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
          </div>
          <div className="bg-surface-container rounded-full px-3 py-2 flex items-center justify-center gap-1.5 border border-white/5 w-full min-w-0">
            <span className="material-symbols-outlined text-[#2DD4BF] text-[16px] sm:text-[18px] shrink-0">groups</span>
            <span className="inline-block w-20 h-2.5 rounded bg-white/10 skeleton-shimmer align-middle" />
          </div>
        </div>

        {/* Actions & Filters Placeholder */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
            <div className="h-3 w-32 bg-white/10 rounded skeleton-shimmer"></div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-surface-container rounded-lg border border-white/5 skeleton-shimmer"></div>
            <div className="w-8 h-8 bg-surface-container rounded-lg border border-white/5 skeleton-shimmer"></div>
          </div>
        </div>
      </section>

      {/* Bento Grid: 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {/* 1. Total Revenue Skeleton Card */}
        <div className="col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-[#F59E0B]/20 to-transparent shadow-2xl">
          <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 lg:p-6 border border-white/5 relative overflow-hidden skeleton-card">
            <div className="flex justify-between items-start mb-2">
              <div className="h-2.5 w-24 bg-white/10 rounded-md skeleton-shimmer"></div>
              <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="h-8 w-32 sm:w-36 bg-white/10 rounded-lg skeleton-shimmer"></div>
              <div className="h-6 w-14 bg-white/10 rounded-full skeleton-shimmer flex-shrink-0"></div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/10 skeleton-shimmer"></div>
              <div className="h-2.5 w-28 bg-white/10 rounded skeleton-shimmer"></div>
            </div>
          </div>
        </div>

        {/* 2. Pending Skeleton Card */}
        <div className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-orange-500/20 to-transparent shadow-xl">
          <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden skeleton-card">
            <div className="flex justify-between items-start mb-2">
              <div className="h-2.5 w-16 bg-white/10 rounded-md skeleton-shimmer"></div>
              <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
            </div>
            <div className="h-7 w-24 bg-white/10 rounded-lg skeleton-shimmer mb-3"></div>
            <div className="h-2 w-14 bg-white/10 rounded skeleton-shimmer"></div>
          </div>
        </div>

        {/* 3. Expenses Skeleton Card */}
        <div className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-zinc-500/20 to-transparent shadow-xl">
          <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden skeleton-card">
            <div className="flex justify-between items-start mb-2">
              <div className="h-2.5 w-16 bg-white/10 rounded-md skeleton-shimmer"></div>
              <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
            </div>
            <div className="h-7 w-20 bg-white/10 rounded-lg skeleton-shimmer mb-3"></div>
            <div className="h-2 w-20 bg-white/10 rounded skeleton-shimmer"></div>
          </div>
        </div>

        {/* 4. Payouts Due Skeleton Card */}
        <div className="col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-zinc-700/20 to-transparent shadow-2xl">
          <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden skeleton-card">
            <div className="flex justify-between items-start mb-2">
              <div className="h-2.5 w-20 bg-white/10 rounded-md skeleton-shimmer"></div>
              <div className="w-4 h-4 rounded-full bg-white/10 skeleton-shimmer"></div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="h-7 w-24 bg-white/10 rounded-lg skeleton-shimmer"></div>
              <div className="h-6 w-20 bg-white/10 rounded-xl skeleton-shimmer flex-shrink-0"></div>
            </div>
            <div className="h-2 w-24 bg-white/10 rounded skeleton-shimmer mt-3"></div>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Jobs & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* 5. Pending Jobs Skeleton Card */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2 shrink-0">
            <h3 className="font-headline font-bold text-lg tracking-tight">Pending Jobs</h3>
          </div>
          <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 overflow-hidden">
            <div className="p-6 flex items-center justify-between w-full skeleton-card">
              <div className="space-y-2">
                <div className="h-7 w-20 bg-white/10 rounded-lg skeleton-shimmer"></div>
                <div className="h-2 w-14 bg-white/10 rounded skeleton-shimmer"></div>
              </div>
              <div className="h-8 w-28 bg-white/10 rounded-lg skeleton-shimmer"></div>
            </div>
          </div>
        </section>

        {/* 6. Upcoming Deadlines Skeleton Card */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2 shrink-0">
            <h3 className="font-headline font-bold text-lg tracking-tight">Deadlines</h3>
          </div>
          <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 overflow-hidden">
            <div className="p-6 flex items-center justify-between w-full skeleton-card">
              <div className="space-y-2">
                <div className="h-7 w-24 bg-white/10 rounded-lg skeleton-shimmer"></div>
                <div className="h-2 w-16 bg-white/10 rounded skeleton-shimmer"></div>
              </div>
              <div className="h-8 w-28 bg-white/10 rounded-lg skeleton-shimmer"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
