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

  // Hide on Auth pages or public landing pages
  const isAuthPage = pathname?.startsWith('/auth');
  const isPublicPage = pathname === '/pricing' || pathname?.startsWith('/transfer');

  // We only hide if definitely not authenticated OR on a special page
  if (isAuthPage || (!loading && !isAuthenticated) || (isPublicPage && !loading && !isAuthenticated)) return null;


  // Render navigation for both Organization owners and Designers
  // (Internal components handle their own role-based view isolation)

  // Only show for Organization owners
  return (
    <>
      <SidebarNav />
      {/* <TopAppBar /> */}
      <BottomNavBar />
    </>
  );
}
