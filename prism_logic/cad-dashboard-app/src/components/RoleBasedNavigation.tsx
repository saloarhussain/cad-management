"use client";
import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { TopAppBar } from './TopAppBar';
import { BottomNavBar } from './BottomNavBar';
import { SidebarNav } from './SidebarNav';

export function RoleBasedNavigation() {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  // Hide on Auth pages, public landing pages, or public AI standalone tools
  const isAuthPage = pathname?.startsWith('/auth');
  const isPublicPage = pathname === '/pricing' || pathname?.startsWith('/transfer/') || pathname?.startsWith('/ai') || pathname === '/home';

  // We only hide if definitely not authenticated OR on a special page
  if (isAuthPage || (!loading && !isAuthenticated) || (pathname?.startsWith('/transfer/')) || (isPublicPage && !loading && !isAuthenticated)) return null;


  // Render navigation for both Organization owners and Designers
  // (Internal components handle their own role-based view isolation)

  // Only show for Organization owners
  return (
    <>
      <SidebarNav />
      <TopAppBar />
      <BottomNavBar />
    </>
  );
}
