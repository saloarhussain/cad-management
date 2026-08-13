'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useSidebar } from '@/components/SidebarContext';

export const SidebarNav: React.FC = () => {
  const pathname = usePathname();
  const { isDesigner, isAuthenticated } = useAuth();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!isAuthenticated) return null;

  const navItems = isDesigner ? [
    { label: 'Workstation', icon: 'dashboard', href: '/designer' },
    { label: 'Projects', icon: 'precision_manufacturing', href: '/projects' },
    { label: 'Explore', icon: 'explore', href: '/explore' },
    { label: 'Inbox', icon: 'mail', href: '/inbox' },
    { label: 'Transfers', icon: 'cloud_upload', href: '/transfer' },
    { label: 'Settings', icon: 'settings', href: '/settings' },
    { label: 'Render', icon: 'photo_camera', href: '/render' },
  ] : [
    { label: 'Home', icon: 'home', href: '/' },
    { label: 'Projects', icon: 'precision_manufacturing', href: '/projects' },
    { label: 'Explore', icon: 'explore', href: '/explore' },
    { label: 'Team', icon: 'groups', href: '/team' },
    { label: 'Clients', icon: 'badge', href: '/clients' },
    { label: 'Inbox', icon: 'mail', href: '/inbox' },
    { label: 'Transfers', icon: 'cloud_upload', href: '/transfer' },
    { label: 'Settings', icon: 'settings', href: '/settings' },
    { label: 'Render', icon: 'photo_camera', href: '/render' },
    { label: 'Portfolio', icon: 'folder_special', href: '/designer/portfolio' },
  ];

  return (
    <aside className={`hidden md:flex bg-surface-container-low flex-col border-r border-outline-variant/20 fixed left-0 top-0 h-screen z-[210] transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Sleek collapse/expand border toggle button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 size-6 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center hover:bg-white/10 hover:text-[#F59E0B] text-white/70 transition-all cursor-pointer z-50 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <span className="material-symbols-outlined text-[16px] font-black">
          {isCollapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      <div className={`flex flex-col gap-8 h-full ${isCollapsed ? 'p-4 items-center' : 'p-6'}`}>
        {/* Brand Logo */}
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="size-10 bg-[#F59E0B] rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(252,224,3,0.3)] shrink-0">
            <span className="material-symbols-outlined text-black font-black text-xl leading-none">architecture</span>
          </div>
          <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'}`}>
            <h1 className="font-headline font-black text-lg text-white tracking-tighter uppercase italic leading-none">
              CAD<span className="text-[#F59E0B]">ONCE</span>
            </h1>
            <p className="text-[#F59E0B] text-[9px] font-bold mt-0.5 drop-shadow-[0_0_100px_rgba(252,224,3,0.5)]">
              {isDesigner ? 'For Designers' : 'For Organizations'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className={`flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar w-full ${isCollapsed ? 'items-center' : ''}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center transition-all duration-300 group relative overflow-hidden ${
                  isCollapsed ? 'justify-center p-3 size-12 rounded-xl' : 'gap-3 px-4 py-3 rounded-xl w-full'
                } ${
                  isActive 
                    ? 'bg-white/5 text-[#F59E0B]' 
                    : 'text-on-surface-variant hover:bg-white/[0.02] hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 electric-gradient shadow-[0_0_10px_rgba(252,224,3,0.5)]" />
                )}
                <span className={`material-symbols-outlined transition-transform duration-500 group-hover:scale-110 ${isActive ? 'fill-1' : ''}`} style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {item.icon}
                </span>
                <span className={`font-bold text-sm tracking-tight transition-all duration-300 ${
                  isCollapsed ? 'opacity-0 w-0 h-0 overflow-hidden pointer-events-none' : isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                }`}>
                  {item.label}
                </span>
                {isActive && !isCollapsed && (
                  <div className="ml-auto w-1 h-1 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(252,224,3,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Actions Section - Only for Organization Owners */}
        {!isDesigner && (
          <div className={`pt-4 border-t border-outline-variant/10 flex flex-col gap-3 w-full ${isCollapsed ? 'items-center' : ''}`}>
            <Link 
              href="/projects/new"
              className={`electric-gradient text-black font-black rounded-xl flex items-center justify-center shadow-[0_4px_20px_rgba(252,224,3,0.2)] active:scale-95 transition-all hover:brightness-110 ${
                isCollapsed ? 'size-12 p-0' : 'py-3 px-4 gap-2 w-full'
              }`}
              title={isCollapsed ? "New Project" : undefined}
            >
              <span className="material-symbols-outlined text-xl">add</span>
              {!isCollapsed && <span className="text-xs uppercase tracking-widest">New Project</span>}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
};
