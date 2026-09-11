'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const INDUSTRIES = [
  {
    id: 'jewelry',
    name: 'Jewelry CAD',
    icon: 'diamond',
    title: 'High-Fidelity Jewelry Modeling & Production',
    subtitle: 'Micro-pave settings, prong tolerances, wax 3D printing prep, and client approvals in a unified flow.',
    image: '/jewelry_clean.png',
    features: [
      'Pinpoint stone layout & prong tolerance inspection',
      'Direct Rhino .3dm, STL & OBJ viewing in browser',
      'Weight & metal calculation metadata tracking',
      'Zero commission on client design fees'
    ],
    stats: [
      { label: 'TOLERANCE', value: '0.01mm' },
      { label: 'PLATFORM CUT', value: '0%' },
      { label: 'EXPORT FORMATS', value: '3DM / STL / STEP' }
    ]
  },
  {
    id: 'mechanical',
    name: 'Mechanical & Tooling',
    icon: 'precision_manufacturing',
    title: 'Precision Mechanical & Industrial Engineering',
    subtitle: 'Coordinate complex assemblies, technical tolerances, and manufacturing-ready deliverables.',
    image: '/mechanical_hybrid.png',
    features: [
      '3D assembly inspection with orbital camera controls',
      'Revision history tracking with visual change notes',
      'Dedicated engineering briefs with dimension specs',
      'Automated milestone payouts for master modelers'
    ],
    stats: [
      { label: 'ASSEMBLY ACCURACY', value: '1:1' },
      { label: 'FILE TRANSFERS', value: 'ENCRYPTED PIN' },
      { label: 'SYNC LATENCY', value: '<50ms' }
    ]
  },
  {
    id: 'civil',
    name: 'Civil & Architecture',
    icon: 'apartment',
    title: 'Structural Drafting & BIM Coordination',
    subtitle: 'Seamlessly link structural engineers, architects, and drafting teams on major development projects.',
    image: '/civil_hybrid.png',
    features: [
      'Multi-drawing project bundling with structured versioning',
      'Secure PIN-protected large file transfers for clients',
      'Client CRM directory with complete historical archives',
      'Real-time deadline countdowns & priority queuing'
    ],
    stats: [
      { label: 'MAX FILE SIZE', value: 'UNLIMITED' },
      { label: 'CLIENT CRM', value: 'BUILT-IN' },
      { label: 'PROFIT MARGIN', value: '100%' }
    ]
  },
  {
    id: 'interior',
    name: 'Interior Design',
    icon: 'chair',
    title: 'Interior Architecture & Custom Millwork',
    subtitle: 'Review bespoke millwork, spatial layouts, lighting schedules, and 3D realistic client renders.',
    image: '/interior_hybrid.png',
    features: [
      'Contextual 3D visual review before fabrication',
      'Direct client presentation portal and feedback loops',
      'Integrated team messaging and revision requests',
      'Multi-currency support (INR ₹, USD $, EUR €, GBP £)'
    ],
    stats: [
      { label: 'REVISION CYCLE', value: '2X FASTER' },
      { label: 'COLLABORATION', value: 'REAL-TIME' },
      { label: 'MEMBERSHIP', value: 'COMMISSION-FREE' }
    ]
  }
];

const PLATFORM_PILLARS = [
  {
    icon: 'view_in_ar',
    tag: '3D VIEWPORT ENGINE',
    title: 'Interactive 3D CAD Inspection',
    description: 'Inspect complex 3D CAD geometries (Rhino .3dm, OBJ, glTF) directly inside your web browser. Orbit, pan, zoom, inspect wireframes, and pin revision notes onto exact coordinates without desktop CAD software.'
  },
  {
    icon: 'corporate_fare',
    tag: 'COMMAND CENTER',
    title: 'Organization Studio Operations',
    description: 'Full oversight of your engineering business. Track project pipelines, deadlines, client accounts, designer allocations, and financial margins with automated multi-currency conversion.'
  },
  {
    icon: 'badge',
    tag: 'DESIGNER WORKSTATION',
    title: 'Master Designer Workstation',
    description: 'A focused, distraction-free environment engineered for professional CAD modelers. Manage assigned queues, download technical briefs, track active hours, and monitor earned income.'
  },
  {
    icon: 'cloud_upload',
    tag: 'SECURE TRANSFERS',
    title: 'PIN-Protected High-Speed Transfers',
    description: 'Share multi-gigabyte CAD files, technical blueprints, and high-res renders securely. Set expiration dates, download passwords, and client access limits with instant verification.'
  },
  {
    icon: 'account_balance_wallet',
    tag: '0% COMMISSION',
    title: 'Zero Platform Take Rate',
    description: 'Stop giving away 20% to traditional freelance portals. CADONCE charges 0% commission on your projects. Studios and designers keep 100% of their hard-earned revenue.'
  },
  {
    icon: 'forum',
    tag: 'UNIFIED COMMUNICATIONS',
    title: 'Integrated Project CRM & Chat',
    description: 'Keep all project conversations, technical revisions, file versions, and client feedback cleanly threaded inside the project workspace. Say goodbye to scattered WhatsApp chats and lost emails.'
  }
];

const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Create Project Brief',
    description: 'Upload 2D sketches, reference images, dimensional specs, deadlines, and budget in a structured digital brief.',
    icon: 'post_add'
  },
  {
    number: '02',
    title: 'Assign Master Designer',
    description: 'Dispatch the task to your in-house team or vetted specialist designers with clear milestone deliverables.',
    icon: 'person_add'
  },
  {
    number: '03',
    title: 'Inspect in 3D Viewport',
    description: 'Review interactive 3D CAD models in real-time. Pin comments directly onto surfaces to clarify revisions.',
    icon: 'visibility'
  },
  {
    number: '04',
    title: 'Deliver & Automate Payout',
    description: 'Deliver final production files via secure PIN link and release designer payouts with zero commission deductions.',
    icon: 'verified'
  }
];

export default function HomePage() {
  const { isAuthenticated, isDesigner } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectedIndustry = INDUSTRIES[activeTab];

  return (
    <div className="min-h-screen bg-[#0c0a04] text-white selection:bg-[#F59E0B] selection:text-black">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0c0a04]/80 backdrop-blur-2xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="size-10 bg-[#F59E0B] rounded-xl flex items-center justify-center text-black shadow-[0_0_25px_rgba(245,158,11,0.35)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-black font-black text-2xl leading-none">architecture</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-black text-xl text-white tracking-tighter uppercase italic leading-none">
                CAD<span className="text-[#F59E0B]">ONCE</span>
              </span>
              <span className="text-[9px] font-bold text-[#F59E0B] tracking-[0.25em] uppercase mt-0.5 opacity-90">
                Precision CAD Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#industries" className="hover:text-white transition-colors">Industries</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <Link href="/pricing" className="hover:text-[#F59E0B] transition-colors">Pricing</Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden sm:flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                href={isDesigner ? '/designer' : '/'}
                className="electric-gradient text-black font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 transition-all flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <span className="material-symbols-outlined text-base">dashboard</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-xs font-black uppercase tracking-widest text-white/80 hover:text-white px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="electric-gradient text-black font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-105 transition-all flex items-center gap-1.5"
                >
                  <span>Sign Up</span>
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-white/80 hover:text-white"
            aria-label="Toggle Menu"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-[#131109] border-b border-white/10 px-6 py-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-3 text-xs font-black uppercase tracking-widest text-neutral-300">
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-white">Features</a>
              <a href="#industries" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-white">Industries</a>
              <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-white">Workflow</a>
              <Link href="/pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 text-[#F59E0B]">Pricing</Link>
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link
                  href={isDesigner ? '/designer' : '/'}
                  className="w-full electric-gradient text-black text-center font-black text-xs uppercase tracking-widest py-3.5 rounded-xl"
                >
                  Enter Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="w-full text-center text-xs font-black uppercase tracking-widest text-white py-3 rounded-xl border border-white/10"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="w-full electric-gradient text-black text-center font-black text-xs uppercase tracking-widest py-3.5 rounded-xl shadow-lg shadow-[#F59E0B]/20"
                  >
                    Create Free Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-36 md:pt-44 pb-20 md:pb-32 px-6 overflow-hidden">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-[#F59E0B]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-[#00f2ff]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-[#F59E0B]/30 mb-8 backdrop-blur-md animate-in fade-in zoom-in duration-700">
            <span className="size-2 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.25em] text-[#F59E0B]">
              The High-Voltage CAD Management Platform
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-headline font-black tracking-tighter uppercase italic leading-[0.95] md:leading-[0.92] text-white">
            Scale Your <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe30c] via-[#F59E0B] to-[#00f2ff]">
              CAD Studio
            </span>
            <br />
            With 1:1 Precision
          </h1>

          {/* Subtitle explaining what platform does */}
          <p className="mt-8 md:mt-10 text-base sm:text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto font-medium leading-relaxed">
            CADONCE unites engineering organizations, design studios, and master 3D CAD modelers.
            Inspect 3D models with interactive browser viewports, manage client revisions, track project milestones,
            and automate designer payouts—<strong>with 0% platform commission</strong>.
          </p>

          {/* Primary Action Buttons (Sign In & Sign Up) */}
          <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto electric-gradient text-black font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <span>Get Started Free</span>
              <span className="material-symbols-outlined text-xl">rocket_launch</span>
            </Link>

            <Link
              href="/auth/login"
              className="w-full sm:w-auto bg-white/[0.04] hover:bg-white/[0.08] text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl border border-white/10 hover:border-white/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In to Workstation</span>
              <span className="material-symbols-outlined text-xl">login</span>
            </Link>
          </div>

          {/* Trust Highlights Strip */}
          <div className="mt-14 pt-8 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-left sm:text-center">
            <div className="flex flex-col items-center sm:items-center">
              <span className="text-2xl md:text-3xl font-headline font-black text-[#F59E0B] italic">0%</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Platform Commission</span>
            </div>
            <div className="flex flex-col items-center sm:items-center">
              <span className="text-2xl md:text-3xl font-headline font-black text-white italic">Rhino .3DM</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">3D Browser Viewport</span>
            </div>
            <div className="flex flex-col items-center sm:items-center">
              <span className="text-2xl md:text-3xl font-headline font-black text-[#00f2ff] italic">PIN Secure</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">High-Speed File Transfers</span>
            </div>
            <div className="flex flex-col items-center sm:items-center">
              <span className="text-2xl md:text-3xl font-headline font-black text-white italic">100%</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Direct Profit Margin</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Industry CAD Showcase */}
      <section id="industries" className="py-20 md:py-28 px-6 bg-[#0a0803] border-y border-white/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <span className="text-[#F59E0B] text-xs font-black uppercase tracking-[0.25em] block mb-3">
              MULTI-DISCIPLINE CAPABILITY
            </span>
            <h2 className="text-3xl sm:text-5xl font-headline font-black uppercase tracking-tight text-white italic">
              Engineered For High-Precision Industries
            </h2>
            <p className="mt-4 text-neutral-400 text-sm md:text-base">
              From microscopic jewelry tolerances to massive architectural drafting, CADONCE provides the specialized tools your discipline demands.
            </p>
          </div>

          {/* Industry Selection Tabs */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
            {INDUSTRIES.map((ind, idx) => (
              <button
                key={ind.id}
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === idx
                    ? 'bg-[#F59E0B] text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105'
                    : 'bg-white/[0.03] text-neutral-400 hover:bg-white/[0.07] hover:text-white border border-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{ind.icon}</span>
                <span>{ind.name}</span>
              </button>
            ))}
          </div>

          {/* Interactive Feature Card for Selected Industry */}
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 sm:p-10 md:p-14 relative overflow-hidden backdrop-blur-xl">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              {/* Left Column: Details */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-black uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm">{selectedIndustry.icon}</span>
                  <span>{selectedIndustry.name} Solution</span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-headline font-black uppercase tracking-tight text-white italic">
                  {selectedIndustry.title}
                </h3>

                <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                  {selectedIndustry.subtitle}
                </p>

                {/* Feature Checklist */}
                <div className="space-y-3 pt-2">
                  {selectedIndustry.features.map((feat) => (
                    <div key={feat} className="flex items-start gap-3">
                      <div className="size-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      </div>
                      <span className="text-sm text-neutral-200 font-medium">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Metric Strip */}
                <div className="pt-6 border-t border-white/10 grid grid-cols-3 gap-4">
                  {selectedIndustry.stats.map((s) => (
                    <div key={s.label}>
                      <span className="text-lg sm:text-xl font-headline font-black text-[#F59E0B] italic block">
                        {s.value}
                      </span>
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Direct CTA */}
                <div className="pt-4 flex flex-wrap gap-4">
                  <Link
                    href="/auth/signup"
                    className="electric-gradient text-black font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <span>Launch in {selectedIndustry.name}</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: High-Res Masterpiece CAD Render */}
              <div className="lg:col-span-6 relative flex items-center justify-center">
                <div className="relative w-full aspect-square max-w-[500px] flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#F59E0B]/10 to-transparent rounded-3xl blur-2xl pointer-events-none" />
                  <img
                    src={selectedIndustry.image}
                    alt={`${selectedIndustry.name} CAD Preview`}
                    className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_0_60px_rgba(245,158,11,0.2)] hover:scale-105 transition-transform duration-700"
                  />
                  {/* Overlay Watermark Tag */}
                  <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 z-20">
                    <span className="size-2 rounded-full bg-green-400 animate-ping" />
                    <span className="text-[10px] font-mono font-bold text-neutral-300 uppercase tracking-wider">
                      CADONCE Viewport Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Pillars: What This Platform Does */}
      <section id="features" className="py-20 md:py-32 px-6 max-w-7xl mx-auto relative">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <span className="text-[#00f2ff] text-xs font-black uppercase tracking-[0.25em] block mb-3">
            COMPREHENSIVE CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-5xl font-headline font-black uppercase tracking-tight text-white italic">
            Everything You Need To Run A Professional CAD Operation
          </h2>
          <p className="mt-4 text-neutral-400 text-sm md:text-base">
            Replace fragmented tools, messy email chains, and disconnected cloud drives with an integrated engineering workstation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {PLATFORM_PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-[#F59E0B]/30 rounded-3xl p-8 transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="size-14 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#F59E0B] group-hover:text-black transition-all">
                  <span className="material-symbols-outlined text-2xl font-black">{pillar.icon}</span>
                </div>
                <span className="text-[10px] font-black tracking-[0.2em] text-[#F59E0B] uppercase block mb-2">
                  {pillar.tag}
                </span>
                <h3 className="text-xl font-headline font-black text-white uppercase italic tracking-tight mb-3">
                  {pillar.title}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works: 4-Step Workflow */}
      <section id="workflow" className="py-20 md:py-28 px-6 bg-[#0a0803] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
            <span className="text-[#F59E0B] text-xs font-black uppercase tracking-[0.25em] block mb-3">
              OPERATIONAL LIFECYCLE
            </span>
            <h2 className="text-3xl sm:text-5xl font-headline font-black uppercase tracking-tight text-white italic">
              From Initial Brief To Final Delivery
            </h2>
            <p className="mt-4 text-neutral-400 text-sm md:text-base">
              A streamlined, high-speed 4-step workflow that keeps studios, clients, and master designers in perfect sync.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {WORKFLOW_STEPS.map((step) => (
              <div
                key={step.number}
                className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 relative flex flex-col justify-between group hover:border-white/20 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-3xl font-headline font-black text-[#F59E0B] italic">
                      {step.number}
                    </span>
                    <div className="size-10 rounded-xl bg-white/5 text-white/70 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">{step.icon}</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-headline font-black text-white uppercase italic tracking-tight mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Zero Commission Highlight Section */}
      <section className="py-20 md:py-24 px-6 max-w-6xl mx-auto">
        <div className="bg-gradient-to-br from-[#1b170a] via-[#120f06] to-[#0c0a04] border border-[#F59E0B]/30 rounded-[2.5rem] p-8 sm:p-12 md:p-16 relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-8 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-[10px] font-black uppercase tracking-widest">
                FAIR & TRANSPARENT ECONOMICS
              </span>
              <h2 className="text-3xl sm:text-5xl font-headline font-black uppercase tracking-tight text-white italic">
                Keep 100% Of What You Charge.
              </h2>
              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed max-w-2xl">
                Traditional freelance platforms penalize your success by extracting 15% to 20% on every milestone.
                CADONCE provides an enterprise workspace with <strong>zero transaction cut</strong>.
                Your client pays you directly, your designers are paid directly, and your margins remain intact.
              </p>
            </div>
            <div className="md:col-span-4 flex flex-col items-center justify-center bg-black/40 border border-white/5 p-8 rounded-2xl text-center">
              <span className="text-5xl sm:text-6xl font-headline font-black text-[#F59E0B] italic">
                0%
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-white mt-2">
                Platform Cut
              </span>
              <span className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">
                Full margin retention
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ready To Scale CTA Section */}
      <section className="py-20 md:py-28 px-6 text-center relative overflow-hidden border-t border-white/5 bg-[#0a0803]">
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          <span className="text-[#F59E0B] text-xs font-black uppercase tracking-[0.25em]">
            START IN MINUTES
          </span>
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-headline font-black uppercase italic tracking-tighter text-white">
            Modernize Your <br />
            <span className="text-[#F59E0B]">CAD Workflows</span> Today
          </h2>
          <p className="text-neutral-300 text-sm sm:text-lg max-w-xl mx-auto">
            Whether you are an engineering studio owner managing dozens of client projects or a master CAD designer ready for elite contracts.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto electric-gradient text-black font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.35)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Create Free Account</span>
              <span className="material-symbols-outlined text-lg">rocket_launch</span>
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto bg-white/[0.04] hover:bg-white/[0.08] text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl border border-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
              <span className="material-symbols-outlined text-lg">login</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-white/10 bg-[#080702] py-14 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo & Info */}
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#F59E0B] rounded-lg flex items-center justify-center text-black shadow-md">
              <span className="material-symbols-outlined text-black font-black text-lg leading-none">architecture</span>
            </div>
            <div>
              <span className="font-headline font-black text-lg text-white tracking-tighter uppercase italic leading-none">
                CAD<span className="text-[#F59E0B]">ONCE</span>
              </span>
              <p className="text-[9px] text-neutral-500 uppercase tracking-widest mt-0.5">
                Precision Management for Professional CAD Organizations
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="hover:text-white transition-colors">Sign Up</Link>
            <a href="mailto:support@cadonce.com" className="hover:text-[#F59E0B] transition-colors">Support</a>
          </div>

          {/* Copyright */}
          <div className="text-[11px] text-neutral-600 font-medium">
            © {new Date().getFullYear()} CADONCE. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
