"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

interface Stats {
  totalUsers: number;
  organizationCount: number;
  designerCount: number;
  otherCount: number;
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  totalPortfolioItems: number;
  totalDesignersOnboarded: number;
  totalSupportTickets: number;
  totalEstimatedValue: number;
  statusCounts: Record<string, number>;
}

interface UserItem {
  id: string;
  email: string;
  role: string;
  organizationName: string | null;
  fullName: string;
  whatsapp: string | null;
  country: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
}

interface ProjectItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  estimated_price?: string | number;
}

export default function FounderAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "organization" | "designer">("all");
  const [activeTab, setActiveTab] = useState<"users" | "projects" | "ux_guide">("users");

  const isFounder =
    user?.email === "saloarhussain@gmail.com" ||
    user?.user_metadata?.role === "admin";

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setUsers(data.recentUsers || []);
        setProjects(data.recentProjects || []);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error("[Founder Analytics] Failed to load:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchAnalytics();
    }
  }, [authLoading]);

  // If user is not logged in or not founder
  if (!authLoading && !isFounder) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white">
            Founder Access Only
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This executive platform dashboard is restricted exclusively to Cadonce founder authority.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Return to Workspace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.organizationName && u.organizationName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.fullName && u.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole =
      roleFilter === "all" ? true : u.role.toLowerCase() === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-yellow-400 selection:text-black pb-24">
      {/* Top Founder Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-8 xl:px-12 py-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black flex items-center justify-center shadow-lg shadow-yellow-500/20 font-black">
            <span className="material-symbols-outlined text-xl">query_stats</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black uppercase tracking-widest text-white leading-none">
                Cadonce <span className="text-yellow-400">Founder OS</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Cloud Sync
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              Platform Intelligence • User Cohorts & Growth Metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {lastRefreshed && (
            <span className="text-[10px] font-mono text-zinc-500 hidden md:inline-block">
              Updated: {lastRefreshed}
            </span>
          )}
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="px-3.5 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 text-zinc-200"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              sync
            </span>
            Refresh
          </button>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-yellow-400/10"
          >
            <span className="material-symbols-outlined text-sm">dashboard</span>
            Workspace
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1720px] mx-auto px-4 sm:px-8 xl:px-12 pt-8 space-y-8">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Registered Users */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden group hover:border-yellow-400/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Registered Users</span>
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">group</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                {stats?.totalUsers ?? "..."}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Active Registry
              </span>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/80 text-[10px] font-semibold text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                {stats?.organizationCount ?? 0} Studios/Orgs
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                {stats?.designerCount ?? 0} Designers
              </span>
            </div>
          </div>

          {/* Card 2: CAD Projects */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden group hover:border-yellow-400/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Platform CAD Jobs</span>
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">layers</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                {stats?.totalProjects ?? "..."}
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                Created
              </span>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/80 text-[10px] font-semibold text-zinc-400">
              <span className="text-emerald-400 font-bold">
                {stats?.completedProjects ?? 0} Completed
              </span>
              <span>•</span>
              <span className="text-amber-400 font-bold">
                {stats?.activeProjects ?? 0} In Progress
              </span>
            </div>
          </div>

          {/* Card 3: 3D Portfolios Published */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden group hover:border-yellow-400/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Published Portfolios</span>
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">diamond</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                {stats?.totalPortfolioItems ?? "..."}
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                3D CAD Works
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 text-[10px] font-semibold text-zinc-400">
              <span>Publicly showcased in Cadonce</span>
            </div>
          </div>

          {/* Card 4: Talent Onboarded */}
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden group hover:border-yellow-400/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Listed CAD Talent</span>
              <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">badge</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                {stats?.totalDesignersOnboarded ?? "..."}
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                Designers
              </span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80 text-[10px] font-semibold text-zinc-400">
              <span>Available for 3D hire & contracts</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          {[
            { id: "users", label: "Registered Users & Studios", icon: "people", count: users.length },
            { id: "projects", label: "CAD Project Submissions", icon: "folder_managed", count: projects.length },
            { id: "ux_guide", label: "UI & UX Optimization Guide", icon: "insights" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? "bg-yellow-400 text-black shadow-lg shadow-yellow-400/20 font-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
              {typeof tab.count === "number" && (
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  activeTab === tab.id ? "bg-black/20 text-black font-bold" : "bg-zinc-800 text-zinc-300"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB 1: Registered Users Table */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined text-zinc-500 text-base absolute left-3.5 top-1/2 -translate-y-1/2">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, studio name, or full name..."
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400/60 transition-all font-medium"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">Role:</span>
                {(["all", "organization", "designer"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      roleFilter === r
                        ? "bg-zinc-700 text-white border border-zinc-600"
                        : "text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <tr>
                      <th className="px-5 py-3.5">User / Studio</th>
                      <th className="px-5 py-3.5">Account Role</th>
                      <th className="px-5 py-3.5">WhatsApp / Contact</th>
                      <th className="px-5 py-3.5">Joined Date</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Quick Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-zinc-500">
                          No users found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-5 py-4">
                            <div>
                              <p className="font-bold text-white group-hover:text-yellow-400 transition-colors">
                                {u.organizationName || u.fullName}
                              </p>
                              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                {u.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === "organization"
                                ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
                                : u.role === "designer"
                                ? "bg-blue-400/10 text-blue-400 border border-blue-400/20"
                                : "bg-zinc-800 text-zinc-400"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-zinc-300">
                            {u.whatsapp ? (
                              <span className="font-mono">{u.whatsapp}</span>
                            ) : (
                              <span className="text-zinc-600 italic">Not set</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-zinc-400">
                            {new Date(u.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                          <td className="px-5 py-4">
                            {u.emailConfirmed ? (
                              <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Verified
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[10px] font-medium">Pending verification</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/portfolio/${u.id}`}
                              target="_blank"
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-yellow-400 hover:text-black rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1 text-zinc-300"
                            >
                              <span>Portfolio</span>
                              <span className="material-symbols-outlined text-xs">launch</span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Projects Submissions */}
        {activeTab === "projects" && (
          <div className="space-y-4">
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <tr>
                      <th className="px-5 py-3.5">Project Title</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Created At</th>
                      <th className="px-5 py-3.5 text-right">Project ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {projects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-500">
                          No projects recorded yet.
                        </td>
                      </tr>
                    ) : (
                      projects.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-bold text-white">{p.title || "Untitled CAD Project"}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                              {p.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-zinc-400">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-[11px] text-zinc-500">
                            {p.id.substring(0, 8)}...
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: UX & UI Optimization Guide */}
        {activeTab === "ux_guide" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">visibility</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">How to Observe User Behavior & Fix UI Friction</h3>
                  <p className="text-xs text-zinc-400">Actionable steps to turn analytics into UI/UX improvements</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed pt-2">
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-1.5">
                  <p className="font-bold text-yellow-400 uppercase tracking-wider text-[11px]">1. Session Recordings (Microsoft Clarity / PostHog)</p>
                  <p className="text-zinc-400">
                    Watching 10 random user sessions per week reveals where users hesitate, where they rage-click on non-interactive elements, and where they abandon forms.
                  </p>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-1.5">
                  <p className="font-bold text-yellow-400 uppercase tracking-wider text-[11px]">2. 3D Viewport Interaction Drop-off</p>
                  <p className="text-zinc-400">
                    If clients view a 3D model on mobile and leave within 3 seconds, it means the loading indicator or camera controls (orbit/zoom) are non-intuitive on touch screens.
                  </p>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 space-y-1.5">
                  <p className="font-bold text-yellow-400 uppercase tracking-wider text-[11px]">3. Portfolio Share Link Conversion</p>
                  <p className="text-zinc-400">
                    Monitor how many visitors click the "Hire Me" button on your public shareable link. If visitor traffic is high but clicks are low, move the "Hire Me" button higher on mobile view.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400">Recommended Next Step</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Add Microsoft Clarity (100% free) to your root layout. It will give you live heatmaps and session recordings without slowing down your app.
              </p>
              <div className="p-3 bg-black/60 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-300">
                clarity.microsoft.com
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
