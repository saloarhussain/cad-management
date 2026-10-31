'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/components/AuthProvider';
import { getDesignerDb, getDb, getUnreadCounts, getProjectById } from '@/app/actions';
import { ProjectChat } from '@/components/ProjectChat';
import { HireModal } from '@/components/HireModal';
import { DirectMessageModal } from '@/components/DirectMessageModal';

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0c0a04] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#d9ee3c] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const { user, isDesigner } = useAuth();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<'gmail' | 'internal' | 'whatsapp'>('internal');
  const [internalProjects, setInternalProjects] = useState<any[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState<string | null>(null);

  // External modal integration when landing on /inbox?hire=... or /inbox?to=...
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isDirectMessageModalOpen, setIsDirectMessageModalOpen] = useState(false);
  const [targetDesigner, setTargetDesigner] = useState<any>(null);
  const [targetIdParam, setTargetIdParam] = useState<string>('');
  const [initialHireItem, setInitialHireItem] = useState<{ id?: string; title?: string } | null>(null);

  const fetchInternalProjects = useCallback(async (silent = false) => {
    if (!silent) setInternalLoading(true);
    try {
      let projects: any[] = [];
      if (isDesigner) {
        const res = await getDesignerDb();
        projects = res.projects || [];
      } else {
        const db = await getDb();
        projects = db.projects || [];
      }

      const counts = await getUnreadCounts(user?.id || '');
      setUnreadCounts(counts || {});

      // Ensure any unread project is synced into projects list
      const unreadProjectIds = Object.keys(counts || {});
      const existingIds = new Set(projects.map(p => p.id));
      
      for (const id of unreadProjectIds) {
        if (!existingIds.has(id)) {
          const extraProject = await getProjectById(id);
          if (extraProject) {
            projects.push(extraProject);
          }
        }
      }

      // Sort by newest
      projects.sort((a, b) => {
        const da = new Date(a.createdAt || a.orderDate || 0).getTime();
        const db = new Date(b.createdAt || b.orderDate || 0).getTime();
        return db - da;
      });

      setInternalProjects(projects);
      
      // Auto-select preferred project from searchParams or first project
      const urlProjectId = searchParams.get('project');
      if (urlProjectId) {
        const found = projects.find(p => p.id === urlProjectId);
        if (found) {
          setSelectedProjectId(found.id);
          setSelectedProjectTitle(found.title);
          return;
        }
      }

      if (!selectedProjectId && projects.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
        setSelectedProjectId(projects[0].id);
        setSelectedProjectTitle(projects[0].title);
      }
    } catch (err) {
      console.error('Failed to fetch internal projects', err);
    } finally {
      if (!silent) setInternalLoading(false);
    }
  }, [user, isDesigner, selectedProjectId, searchParams]);

  useEffect(() => {
    if (user) {
      fetchInternalProjects(false);
      const interval = setInterval(() => fetchInternalProjects(true), 5000);
      return () => clearInterval(interval);
    }
  }, [user, fetchInternalProjects]);

  // Handle URL query parameters for Hire or Direct Message
  useEffect(() => {
    const hireTarget = searchParams.get('hire');
    const toTarget = searchParams.get('to');
    const itemTitle = searchParams.get('title');

    const target = hireTarget || toTarget;
    if (target) {
      setTargetIdParam(target);
      if (itemTitle) {
        setInitialHireItem({ title: decodeURIComponent(itemTitle) });
      }

      // Fetch target designer profile
      fetch(`/api/portfolio/${target}`)
        .then(res => res.json())
        .then(data => {
          if (data?.designer) {
            setTargetDesigner({ ...data.designer, id: data.authUserId || target });
          } else {
            setTargetDesigner({ fullName: target, username: target });
          }
          if (hireTarget) {
            setIsHireModalOpen(true);
          } else if (toTarget) {
            setIsDirectMessageModalOpen(true);
          }
        })
        .catch(err => {
          console.error('Failed to load target designer for modal:', err);
          setTargetDesigner({ fullName: target, username: target });
          if (hireTarget) setIsHireModalOpen(true);
          else if (toTarget) setIsDirectMessageModalOpen(true);
        });
    }
  }, [searchParams]);

  const totalInternalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <AuthGuard>
      <div className="pt-16 h-[calc(100vh)] md:h-screen flex flex-col md:flex-row overflow-hidden bg-background text-left">
        {/* Left Column: Project List */}
        <div className="w-full md:w-[420px] flex flex-col border-r border-white/5 h-full overflow-hidden bg-[#14161E]/80 backdrop-blur-sm">
          {/* Header */}
          <header className="p-6 pt-10 md:pt-6 text-left shrink-0 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <span>Inbox</span>
                  {totalInternalUnread > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-extrabold">
                      {totalInternalUnread} new
                    </span>
                  )}
                </h1>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.25em] mt-0.5">
                  Direct Messages &amp; Client Inquiries
                </p>
              </div>

              <Link
                href="/inbox/compose"
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-[#d9ee3c] text-white hover:text-black border border-white/10 flex items-center justify-center transition-all"
                title="Compose Email"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </Link>
            </div>
          </header>

          {/* Mode Switcher */}
          <div className="px-4 py-3 shrink-0">
            <div className="flex bg-[#0E1017] rounded-xl p-1 gap-1 border border-white/5 shadow-inner">
              <button 
                onClick={() => setMode('internal')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg relative ${mode === 'internal' ? 'bg-[#d9ee3c] text-[#1a1e00] font-black shadow-lg shadow-yellow-400/10' : 'text-neutral-400 hover:text-white'}`}
              >
                DIRECT CHAT
                {totalInternalUnread > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {totalInternalUnread}
                  </span>
                )}
              </button>
              <button 
                onClick={() => setMode('gmail')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${mode === 'gmail' ? 'bg-white/10 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}`}
              >
                GMAIL
              </button>
              <button 
                onClick={() => setMode('whatsapp')}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${mode === 'whatsapp' ? 'bg-white/10 text-white shadow-lg' : 'text-neutral-400 hover:text-white'}`}
              >
                WHATSAPP
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-24 md:pb-6 space-y-2.5 scrollbar-thin scrollbar-thumb-white/5">
            {mode === 'internal' ? (
              <>
                {internalLoading && internalProjects.length === 0 && (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-[#d9ee3c] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {!internalLoading && internalProjects.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                    <span className="material-symbols-outlined text-4xl mb-2 text-zinc-500">forum</span>
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">No active conversations</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Client hire proposals and direct messages will appear here.</p>
                  </div>
                )}

                {internalProjects.map(project => {
                  const isSelected = selectedProjectId === project.id;
                  const isHireRequest = project.status === 'Hire Request' || project.orderStatus === 'Hire Request' || (project.title || '').toLowerCase().includes('hire proposal');
                  const isDirectMessage = project.status === 'Direct Message' || (project.title || '').toLowerCase().includes('direct message');

                  return (
                    <div 
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setSelectedProjectTitle(project.title);
                        if (window.innerWidth < 768) {
                          window.location.href = `/projects/${project.id}?tab=chat`;
                        }
                      }}
                      className={`block rounded-2xl p-4 border transition-all cursor-pointer group relative overflow-hidden ${
                        isSelected 
                          ? 'bg-white/5 border-[#d9ee3c]/50 shadow-[0_0_24px_rgba(217,238,60,0.08)]' 
                          : 'bg-[#181B24]/70 border-white/5 hover:border-white/15 hover:bg-white/[0.03]'
                      }`}
                    >
                      {unreadCounts[project.id] > 0 && (
                        <div className="absolute top-0 right-0 w-7 h-7 flex items-center justify-center bg-red-500 rounded-bl-xl z-10 shadow-lg">
                          <span className="text-[10px] font-black text-white">{unreadCounts[project.id]}</span>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-3.5">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isHireRequest 
                            ? 'bg-[#d9ee3c]/15 border border-[#d9ee3c]/40 text-[#d9ee3c]'
                            : isDirectMessage
                            ? 'bg-sky-500/15 border border-sky-500/40 text-sky-400'
                            : isSelected 
                            ? 'bg-[#d9ee3c]/20 border border-[#d9ee3c]/30 text-[#d9ee3c]' 
                            : 'bg-white/5 border border-white/10 text-neutral-400 group-hover:text-white'
                        }`}>
                          <span className="material-symbols-outlined text-base">
                            {isHireRequest ? 'bolt' : isDirectMessage ? 'mail' : 'deployed_code'}
                          </span>
                        </div>

                        {/* Text info */}
                        <div className="flex-1 min-w-0">
                          {/* Badges row */}
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            {isHireRequest && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#d9ee3c]/20 text-[#d9ee3c] border border-[#d9ee3c]/30">
                                ⚡ HIRE PROPOSAL
                              </span>
                            )}
                            {isDirectMessage && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                ✉ DIRECT MESSAGE
                              </span>
                            )}
                            {project.revenue && project.revenue !== '0' && (
                              <span className="text-[8px] font-extrabold text-[#d9ee3c] ml-auto">
                                {project.revenueCurrency || '$'} {project.revenue}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h3 className={`text-xs font-black uppercase truncate ${isSelected ? 'text-[#d9ee3c]' : 'text-white'}`}>
                              {project.title}
                            </h3>
                          </div>

                          <p className="text-[10px] text-zinc-400 truncate font-medium">
                            {project.client ? (
                              <span className="text-zinc-300 font-semibold">{project.client} &bull; </span>
                            ) : null}
                            <span className="italic">Workspace Conversation</span>
                          </p>
                        </div>

                        <span className={`material-symbols-outlined text-sm mt-1 transition-transform ${isSelected ? 'text-[#d9ee3c] translate-x-1' : 'text-white/20 group-hover:text-white/40'}`}>
                          chevron_right
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="py-20 text-center opacity-30">
                <span className="material-symbols-outlined text-4xl mb-2 text-zinc-500">cloud_off</span>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{mode.toUpperCase()} NOT CONNECTED</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation */}
        <div className="hidden md:flex flex-1 flex-col bg-black/30 h-full overflow-hidden relative">
          {selectedProjectId ? (
            <ProjectChat 
              key={selectedProjectId} 
              projectId={selectedProjectId} 
              projectTitle={selectedProjectTitle || ''} 
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl text-zinc-400">forum</span>
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white mb-2">
                Live Workstation Chat
              </h2>
              <p className="text-xs font-medium text-zinc-400 max-w-sm">
                Select a conversation or inquiry from the left pane to collaborate directly with the client.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Render modals if opened via /inbox?hire=... or /inbox?to=... */}
      <HireModal
        isOpen={isHireModalOpen}
        onClose={() => setIsHireModalOpen(false)}
        designer={targetDesigner}
        initialItem={initialHireItem}
        targetId={targetIdParam}
      />

      <DirectMessageModal
        isOpen={isDirectMessageModalOpen}
        onClose={() => setIsDirectMessageModalOpen(false)}
        designer={targetDesigner}
        targetId={targetIdParam}
      />
    </AuthGuard>
  );
}
