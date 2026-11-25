"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getDb, getDesignerStatus } from '@/app/actions';
import nextDynamic from 'next/dynamic';
import {
  resolveCurrencyCode,
  getEffectiveExpense,
  isProjectCancelled,
  isProjectCompleted,
  isProjectPaidOut,
  parseProjectDate,
  getProjectDate,
} from '@/lib/config';

import HomePage from '@/components/HomePage';
import DashboardSkeleton from '@/components/DashboardSkeleton';

const DashboardContent = nextDynamic(() => import('./DashboardContent'), { 
  ssr: false,
  loading: () => <DashboardSkeleton /> 
});

export default function DashboardPage() {
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'year' | 'custom'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    pendingRevenue: 0,
    activeProjects: 0,
    totalClients: 0,
    totalDesigners: 0,
    payoutsDue: 0,
    payoutsDueCount: 0,
    currency: '₹'
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const router = useRouter();
  const { isAuthenticated, user, isDesigner, loading: authLoading } = useAuth();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    // If authenticated designer, route to designer workstation
    if (hasMounted && !authLoading) {
      if (isAuthenticated && isDesigner) {
        router.replace('/designer');
      }
    }
  }, [isAuthenticated, isDesigner, authLoading, hasMounted, router]);

  const [allRates, setAllRates] = useState<Record<string, number>>({ USD: 1, INR: 83.5 });
  const [displayCurrency, setDisplayCurrency] = useState('₹');

  useEffect(() => {
    // Load preferred currency from local storage
    const saved = localStorage.getItem('cadonce_dashboard_currency');
    if (saved) {
      setDisplayCurrency(saved);
    }

    const fetchRates = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data.rates) {
          setAllRates(data.rates);
        }
      } catch (err) {
        console.error("Failed to fetch exchange rates", err);
      }
    };
    fetchRates();
  }, []);

  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated || authLoading || isDesigner || !hasMounted) {
      return;
    }

    let isSubscribed = true;

    const fetchData = async () => {
      setLoading(true);
      
      try {
        let db = await getDb(user?.id);
        if (!isSubscribed) return;

        // Fallback: If server returned no projects or clients, try reading with browser Supabase client
        if ((!db || !db.projects || db.projects.length === 0) && user?.id) {
          try {
            const { readDb } = await import('@/lib/db');
            const clientDb = await readDb(user.id);
            if (clientDb && clientDb.projects && clientDb.projects.length > 0) {
              db = clientDb;
            }
          } catch (fallbackErr) {
            console.warn('[Dashboard] Fallback to client-side DB failed:', fallbackErr);
          }
        }

        const projects = db.projects || [];
        const clients = db.clients || [];
        const designers = db.designers || [];

        const convert = (amount: number, fromSymbol?: string, fallbackCode: string = 'USD') => {
          if (!amount || isNaN(amount)) return 0;
          const fromCurrency = resolveCurrencyCode(fromSymbol, fallbackCode);
          const targetCurrency = resolveCurrencyCode(displayCurrency, 'INR');

          if (fromCurrency === targetCurrency) return Math.round(amount);
          
          const rateFrom = allRates[fromCurrency] || (fromCurrency === 'INR' ? 83.5 : 1);
          const rateTarget = allRates[targetCurrency] || (targetCurrency === 'INR' ? 83.5 : 1);

          // Convert source to USD first, then to target
          return Math.round((amount / rateFrom) * rateTarget);
        };

        const filtered = projects.filter((p: any) => {
          const pDate = getProjectDate(p);
          if (!pDate) return false;
          
          if (filterMode === 'day') {
            return pDate.toDateString() === selectedDate.toDateString();
          }
          if (filterMode === 'month') {
            return pDate.getMonth() === selectedDate.getMonth() && pDate.getFullYear() === selectedDate.getFullYear();
          }
          if (filterMode === 'year') {
            return pDate.getFullYear() === selectedDate.getFullYear();
          }
          if (filterMode === 'custom') {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            return pDate >= start && pDate <= end;
          }
          return false;
        });

        // Financial stats with proper conversion (Statutory GST rule: Cancelled invoices are strictly excluded from totals)
        const totalRevenue = filtered
          .filter((p: any) => !isProjectCancelled(p))
          .reduce((sum: number, p: any) => 
            sum + convert(parseFloat(p.revenue || '0') || 0, p.revenueCurrency, 'USD'), 0);
        
        const totalExpense = filtered
          .filter((p: any) => !isProjectCancelled(p) && p.designer && p.designer.trim() !== '')
          .reduce((sum: number, p: any) => 
            sum + convert(getEffectiveExpense(p), p.expenseCurrency, 'INR'), 0);
        
        const pendingRevenue = projects
          .filter((p: any) => !isProjectCancelled(p) && !isProjectCompleted(p))
          .reduce((sum: number, p: any) => 
            sum + convert(parseFloat(p.revenue || '0') || 0, p.revenueCurrency, 'USD'), 0);

        const activeProjectsCount = projects.filter((p: any) => 
          !isProjectCancelled(p) && !isProjectCompleted(p)
        ).length;

        const payoutsDueProjects = projects.filter((p: any) => 
          !isProjectCancelled(p) && isProjectCompleted(p) && !isProjectPaidOut(p)
        );

        const payoutsDue = payoutsDueProjects.reduce((sum: number, p: any) => 
          sum + convert(getEffectiveExpense(p), p.expenseCurrency, 'INR'), 0);

        const withDeadlines = projects
          .filter((p: any) => {
            if (isProjectCancelled(p) || isProjectCompleted(p)) return false;
            const dl = parseProjectDate(p.deadlineDate);
            if (!dl) return false;
            const endOfDeadline = new Date(dl);
            endOfDeadline.setHours(23, 59, 59, 999);
            return endOfDeadline.getTime() >= Date.now();
          })
          .sort((a: any, b: any) => {
            const da = parseProjectDate(a.deadlineDate)?.getTime() || 0;
            const dbTime = parseProjectDate(b.deadlineDate)?.getTime() || 0;
            return da - dbTime;
          })
          .slice(0, 4);

        // Update all data synchronously together before turning loading off
        setFilteredProjects(filtered);
        setStats({
          totalRevenue,
          totalExpense,
          pendingRevenue,
          activeProjects: activeProjectsCount,
          totalClients: clients.length,
          totalDesigners: designers.length,
          payoutsDue,
          payoutsDueCount: payoutsDueProjects.length,
          currency: displayCurrency
        });
        setRecentProjects(projects.slice(0, 3));
        setAllProjects(projects);
        setUpcomingDeadlines(withDeadlines);
        setDataReady(true);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticated, authLoading, isDesigner, hasMounted, filterMode, selectedDate, startDate, endDate, displayCurrency, allRates, user?.id]);


  if (!hasMounted || authLoading) {
    return (
      <div className="min-h-screen bg-[#0c0a04] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-[#F59E0B] uppercase tracking-[0.3em] animate-pulse">Initializing CADONCE...</span>
        </div>
      </div>
    );
  }

  // If visitor is not authenticated, show the CADONCE Homepage!
  if (!isAuthenticated) {
    return <HomePage />;
  }

  // If authenticated as designer, redirect to designer workstation
  if (isDesigner) return null;

  return (
    <DashboardContent 
      loading={!dataReady || loading || isInitialLoad}
      dataReady={dataReady}
      stats={stats}
      recentProjects={recentProjects}
      filteredProjects={filteredProjects}
      allProjects={allProjects}
      upcomingDeadlines={upcomingDeadlines}
      planName={stats.totalRevenue > 5000 ? 'Pro' : 'Free'}
      planColor={stats.totalRevenue > 5000 ? 'text-yellow-400' : 'text-neutral-500'}
      filterMode={filterMode}
      setFilterMode={setFilterMode}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      startDate={startDate}
      setStartDate={setStartDate}
      endDate={endDate}
      setEndDate={setEndDate}
      allRates={allRates}
    />
  );

}

