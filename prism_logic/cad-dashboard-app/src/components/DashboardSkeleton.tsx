'use client';

import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="pt-20 px-6 space-y-6 pb-10 relative animate-in fade-in duration-300">
      {/* Welcome Section Header */}
      <section className="mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
          <div>
            <h1 className="font-headline text-[20px] sm:text-[24px] font-extrabold tracking-tight text-on-surface leading-none">
              Data Overview
            </h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1.5 opacity-60">
              Strategic Dashboard
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto h-10">
            {/* Quick Stat Placeholders */}
            <div className="hidden xl:flex items-center gap-2">
              <div className="h-10 w-36 bg-surface-container rounded-xl border border-white/5 skeleton-shimmer"></div>
              <div className="h-10 w-36 bg-surface-container rounded-xl border border-white/5 skeleton-shimmer"></div>
            </div>

            {/* Export Button Placeholder */}
            <div className="flex-1 sm:flex-none h-full w-24 bg-surface-container rounded-xl border border-white/5 skeleton-shimmer"></div>

            {/* Date Filter Button Placeholder */}
            <div className="flex-1 sm:flex-none h-full w-28 bg-surface-container rounded-xl border border-white/5 skeleton-shimmer"></div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fce003] animate-pulse"></span>
          <div className="h-2.5 w-32 bg-white/10 rounded skeleton-shimmer"></div>
        </div>
      </section>

      {/* Bento Grid: 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {/* 1. Total Revenue Skeleton Card */}
        <div className="col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-[#fce003]/10 to-transparent shadow-2xl">
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
        <div className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent shadow-xl">
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
        <div className="col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-zinc-500/10 to-transparent shadow-xl">
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
        <div className="col-span-2 lg:col-span-1 p-0.5 rounded-2xl bg-gradient-to-br from-zinc-700/10 to-transparent shadow-2xl">
          <div className="h-full bg-surface-container-low rounded-[0.9rem] p-5 border border-white/5 relative overflow-hidden flex items-center justify-between skeleton-card">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-20 bg-white/10 rounded-md skeleton-shimmer"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-white/10 skeleton-shimmer"></div>
              </div>
              <div className="h-7 w-24 bg-white/10 rounded-lg skeleton-shimmer"></div>
              <div className="h-2 w-24 bg-white/10 rounded skeleton-shimmer"></div>
            </div>
            <div className="h-8 w-24 bg-white/10 rounded-xl skeleton-shimmer flex-shrink-0"></div>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Jobs & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 5. Pending Jobs Skeleton Card */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-2">
            <div className="h-5 w-28 bg-white/10 rounded-md skeleton-shimmer"></div>
            <div className="h-3 w-14 bg-white/10 rounded skeleton-shimmer"></div>
          </div>
          <div className="rounded-2xl bg-surface-container-low shadow-2xl border border-white/5 p-6 flex items-center justify-between skeleton-card">
            <div className="space-y-2.5">
              <div className="h-2.5 w-28 bg-white/10 rounded-md skeleton-shimmer"></div>
              <div className="h-8 w-28 bg-white/10 rounded-lg skeleton-shimmer"></div>
            </div>
            <div className="h-9 w-24 bg-white/10 rounded-lg skeleton-shimmer"></div>
          </div>
        </section>

        {/* 6. Upcoming Deadlines Skeleton Card */}
        <section className="space-y-4">
          <div className="h-5 w-24 bg-white/10 rounded-md skeleton-shimmer px-2"></div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-surface-container-low border border-white/5 skeleton-card">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 rounded-full bg-white/15 skeleton-shimmer"></div>
                  <div className="space-y-2">
                    <div className="h-3.5 w-32 bg-white/10 rounded skeleton-shimmer"></div>
                    <div className="h-2.5 w-20 bg-white/10 rounded skeleton-shimmer"></div>
                  </div>
                </div>
                <div className="w-4 h-4 rounded bg-white/10 skeleton-shimmer"></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Products Pick Section Skeleton */}
      <section className="space-y-4 pb-12">
        <div className="flex justify-between items-center px-2">
          <div className="h-4 w-36 bg-white/10 rounded skeleton-shimmer"></div>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 min-h-[160px]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-40 h-44 rounded-2xl bg-surface-container border border-white/5 skeleton-shimmer flex-shrink-0"></div>
          ))}
        </div>
      </section>
    </div>
  );
}
