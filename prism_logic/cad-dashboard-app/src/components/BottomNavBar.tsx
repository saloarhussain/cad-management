'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export const BottomNavBar: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated, isDesigner, loading: authLoading, availableOrganizations, activeOrganizationId } = useAuth();
  const [role, setRole] = useState<'admin' | 'designer' | null>(null);
  const [roleVerified, setRoleVerified] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const checkRole = () => {
      if (authLoading) return;

      if (isAuthenticated && hasMounted) {
        setRole(isDesigner ? 'designer' : 'admin');
        setRoleVerified(true);
      } else if (!isAuthenticated && hasMounted) {
        setRoleVerified(true);
      }
    };
    checkRole();
  }, [isAuthenticated, isDesigner, authLoading, hasMounted]);

  // Realtime Chat Notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !hasMounted) return;

    const fetchUnreadCount = async () => {
      const { getUnreadCounts } = await import('@/app/actions');
      const counts = await getUnreadCounts(user.id);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      setUnreadCount(total);
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('navbar-unread-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, hasMounted]);

  const showNav = roleVerified && hasMounted && role !== null;

  const navItems: { label: string; icon: string; href?: string; onClick?: () => void; }[] = isDesigner ? [
    { label: 'Workstation', icon: 'dashboard', href: '/designer' },
    { label: 'Projects', icon: 'precision_manufacturing', href: '/projects' },
    { label: 'Explore', icon: 'explore', href: '/explore' },
    { label: 'Profile', icon: 'account_circle', href: '/designer/profile' },
    { label: 'Menu', icon: 'menu', onClick: () => setIsMobileMenuOpen(true) },
  ] : [
    { label: 'Home', icon: 'home', href: '/' },
    { label: 'Projects', icon: 'precision_manufacturing', href: '/projects' },
    { label: 'Explore', icon: 'explore', href: '/explore' },
    { label: 'Team', icon: 'groups', href: '/team' },
    { label: 'Menu', icon: 'menu', onClick: () => setIsMobileMenuOpen(true) },
  ];

  if (!isAuthenticated && pathname.startsWith('/auth')) return null;

  // Use opacity instead of conditional rendering to prevent hydration mismatches
  const isReady = roleVerified && hasMounted && role !== null && !authLoading;

  return (
    <>
      <nav className={`fixed bottom-0 w-full z-[200] flex justify-around items-center px-2 bg-[#1f1f21]/95 backdrop-blur-3xl border-t border-white/5 py-2.5 transition-opacity duration-300 md:hidden ${isReady ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {navItems.map((item) => {
          const isActive = 'href' in item && item.href ? (item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)) : false;
          const content = (
            <>
              <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              {item.label === 'Menu' && unreadCount > 0 && (
                <span className="absolute top-1.5 right-6 w-2.5 h-2.5 bg-red-500 rounded-full flex items-center justify-center border border-[#1f1f21] animate-in zoom-in duration-300">
                  <span className="text-[5px] font-black text-white">●</span>
                </span>
              )}
              <span className={`text-[9px] uppercase tracking-tighter ${isActive ? 'font-extrabold' : 'font-bold'}`}>
                {item.label}
              </span>
            </>
          );

          return 'onClick' in item ? (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-all active:scale-95 relative ${isActive ? 'text-[#F59E0B]' : 'text-neutral-500'}`}
            >
              {content}
            </button>
          ) : (
            <Link
              key={item.href!}
              href={item.href!}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-all active:scale-95 relative ${isActive
                  ? 'text-[#F59E0B]'
                  : 'text-neutral-500'
                }`}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Drawer Slide-over Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[300] md:hidden animate-in fade-in duration-300">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Side Drawer Panel */}
          <aside className="absolute right-0 top-0 w-72 h-full bg-[#1f1f21] border-l border-white/5 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between mb-8">
              <span className="font-headline font-black text-lg text-[#F59E0B] uppercase tracking-widest italic">Cadonce</span>
              <button 
                className="text-on-surface-variant hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {(isDesigner ? [
                { label: 'Workstation', icon: 'dashboard', href: '/designer' },
                { label: 'Projects', icon: 'precision_manufacturing', href: '/projects' },
                { label: 'Explore', icon: 'explore', href: '/explore' },
                { label: 'Inbox', icon: 'mail', href: '/inbox', count: unreadCount },
                { label: 'Transfers', icon: 'cloud_upload', href: '/transfer' },
                { label: 'Settings', icon: 'settings', href: '/settings' },
                { label: 'Render', icon: 'photo_camera', href: '/render' },
                { label: 'Profile', icon: 'account_circle', href: '/designer/profile' },
              ] : [
                { label: 'Home', icon: 'home', href: '/' },
                { label: 'Projects', icon: 'precision_manufacturing', href: '/projects' },
                { label: 'Explore', icon: 'explore', href: '/explore' },
                { label: 'Team', icon: 'groups', href: '/team' },
                { label: 'Clients', icon: 'badge', href: '/clients' },
                { label: 'Inbox', icon: 'mail', href: '/inbox', count: unreadCount },
                { label: 'Transfers', icon: 'cloud_upload', href: '/transfer' },
                { label: 'Settings', icon: 'settings', href: '/settings' },
                { label: 'Render', icon: 'photo_camera', href: '/render' },
                { label: 'Portfolio', icon: 'folder_special', href: '/designer/portfolio' },
              ]).map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 relative ${
                      isActive 
                        ? 'bg-[#F59E0B]/10 text-[#F59E0B]' 
                        : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                    {item.count ? item.count > 0 && (
                      <span className="ml-auto px-2 py-0.5 text-[8px] font-black bg-red-500 text-white rounded-full">
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            {!isDesigner && (
              <div className="mt-auto pt-8">
                <Link
                  href="/projects/new"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full bg-gradient-to-r from-[#2DD4BF] to-[#10B981] text-zinc-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/20 active:scale-95 transition-all text-xs uppercase tracking-wider animate-pulse"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  <span>NEW PROJECT</span>
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Modal Popup */}
      {isOrgModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
            onClick={() => setIsOrgModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-[#0c0a04]/95 border border-white/10 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-headline font-black text-sm text-white uppercase">Your Organizations</h3>
                <p className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                  Working with {availableOrganizations?.length} teams
                </p>
              </div>
              <button onClick={() => setIsOrgModalOpen(false)} className="text-white/40 hover:text-white">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
              {availableOrganizations?.map((org: any) => (
                <div
                  key={org.id}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <div>
                    <span className="text-[10px] font-bold text-white capitalize tracking-tight">{org.name?.toLowerCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
