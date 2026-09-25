"use client";

import React from "react";

export default function ExplorePage() {
  return (
    <div className="bg-surface-canvas font-body-md text-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
<header className="fixed top-0 inset-x-0 z-50 bg-surface-canvas/80 backdrop-blur-xl border-b border-surface-border"><div className="h-16 w-full px-gutter flex items-center justify-between gap-space-lg"><div className="flex items-center gap-space-lg shrink-0"><a className="flex items-center gap-space-sm group" data-path="explore" href="#"><div className="w-9 h-9 rounded-lg bg-surface-card-elevated border border-surface-border flex items-center justify-center transition-all group-hover:border-primary-fixed"><span className="material-symbols-outlined text-primary-fixed text-[20px]">deployed_code</span></div><span className="font-headline-md text-headline-md tracking-tight font-extrabold text-text-primary uppercase">CAD<span className="text-primary-fixed">ONCE</span></span></a></div><div className="flex-1 max-w-xl hidden md:block"><div className="relative flex items-center"><span className="material-symbols-outlined absolute left-space-md text-text-muted pointer-events-none text-[18px]">search</span><input className="w-full h-10 pl-10 pr-14 bg-surface-card border border-surface-border rounded-lg font-body-sm text-body-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-fixed focus:ring-1 focus:ring-primary-fixed transition-all" placeholder="Search 3D models, CAD blueprints, artists..." type="text"/><kbd className="absolute right-space-sm px-1.5 py-0.5 rounded bg-surface-card-elevated border border-surface-border font-label-caps text-label-caps text-text-muted pointer-events-none">⌘K</kbd></div></div><div className="flex items-center gap-space-lg shrink-0"><nav className="hidden lg:flex items-center gap-space-md h-16" data-active-classes="text-text-primary border-b-2 border-primary-fixed"><a aria-current="page" className="h-full flex items-center px-space-xs font-label-md transition-colors text-text-primary border-b-2 border-primary-fixed" data-path="explore" href="#">Explore</a><a className="h-full flex items-center px-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" data-path="shop" href="#">Shop</a><a className="h-full flex items-center px-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" data-path="hire" href="#">Hire</a><a className="h-full flex items-center px-space-xs font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" data-path="find-a-job" href="#">Find a Job</a></nav><div className="flex items-center gap-space-md"><button aria-label="Notifications" className="relative p-2 rounded-lg bg-surface-card border border-surface-border text-on-surface-variant hover:text-on-surface hover:border-surface-card-elevated transition-colors" type="button"><span className="material-symbols-outlined text-[20px]">notifications</span><span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-card"></span></button><div className="relative flex items-center shrink-0"><img alt="Profile" className="w-8 h-8 rounded-full object-cover ring-1 ring-surface-border" src="https://lh3.googleusercontent.com/aida/AEtjO1VPp09o3ogCTkNQyUym2o0t0CN9A7xJ5b39ixiGpuC02ctfQRtDRE0i4Ysra1tdc-Pq5rqQMVrkvSBuecyYau8hMZnwXjM94x6pvkNT7B92QkrPVH9YHhsMlZpQRFTkphYi8G4oPJppqSCWkwmCveTdYf_XkClNTK0xYUWV--tYjexO_yfHcdXfDTv68hZsxOFuSx0I31in0Tv4gU6j2qeDczwhOnokOH2rOIbGvaTWV8TP0hUziJq1TbGE"/><span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary-fixed-dim ring-2 ring-surface-canvas"></span></div></div></div></div></header><main className="w-full pt-16 flex-1 bg-surface-canvas"><div className="flex flex-col w-full">
{/* Interactive Viewport Modal (Hidden by Default) */}
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-canvas/80 backdrop-blur-md opacity-0 pointer-events-none transition-opacity duration-300" id="quick-inspect-modal">
<div className="relative w-full max-w-4xl bg-surface-card rounded-xl p-space-lg shadow-2xl flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-sm">
<span className="w-2.5 h-2.5 rounded-full bg-primary-fixed animate-pulse"></span>
<span className="font-headline-sm text-headline-sm text-text-primary">3D Real-Time Topology Inspector</span>
<span className="px-2 py-0.5 rounded bg-surface-card-elevated font-label-caps text-label-caps text-primary-fixed uppercase">Rhino 7 / Mesh View</span>
</div>
<button className="p-1 rounded-lg bg-surface-card-elevated text-text-secondary hover:text-text-primary transition-colors" id="close-inspect-btn">
<span className="material-symbols-outlined text-[20px]">close</span>
</button>
</div>
<div className="relative w-full h-96 rounded-lg bg-surface-deep overflow-hidden flex items-center justify-center group">
<img className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" data-alt="High precision photorealistic close-up CAD wireframe render of an emerald halo luxury engagement ring with glowing cyan laser topology mesh lines overlaying pristine polished platinum and micro-pavé diamonds on pitch-black obsidian backdrop." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAYG4WOiZykngwBON3G5guC8DsGAMpQvgPnVRUROJ-oCUUO3IdRn0TAGPfiuFwwVBH8M5cKaKDlvNl9-EgPHResV3DWtQHS11zH7Mu2BBm4tFumK8OUmjf7giDwCLT9VGT-SYM3DhtMAca6jj4pVjKJCwO5fYYalkki1qvgJezRhv0w8ewRaqkBbyVBerD89Eyq3llKrS1JMnojQLVwjkmatuHRhacp31Dmx0jhLrhlU_TnodlBEDwX0w"/>
<div className="absolute inset-0 bg-gradient-to-t from-surface-deep via-transparent to-transparent opacity-80 pointer-events-none"></div>
<div className="absolute bottom-4 left-4 flex items-center gap-2">
<span className="px-2.5 py-1 rounded-md bg-surface-card/90 font-label-caps text-label-caps text-tertiary-fixed">Tol: ±0.005mm</span>
<span className="px-2.5 py-1 rounded-md bg-surface-card/90 font-label-caps text-label-caps text-text-secondary">Polys: 1,842,910</span>
<span className="px-2.5 py-1 rounded-md bg-surface-card/90 font-label-caps text-label-caps text-text-secondary">SubD Active</span>
</div>
<div className="absolute top-4 right-4 flex items-center gap-1.5 bg-surface-card/90 px-3 py-1.5 rounded-lg shadow-lg">
<span className="material-symbols-outlined text-primary-fixed text-[18px]">view_in_ar</span>
<span className="font-label-caps text-label-caps text-text-primary uppercase">Orthographic Orbit</span>
</div>
</div>
<div className="flex items-center justify-between pt-2">
<span className="font-body-sm text-body-sm text-text-muted">Export formats: .STP • .3DM • .OBJ • .STL (Ready for 5-Axis CNC & Wax Printing)</span>
<button className="px-space-md py-space-xs rounded bg-primary-fixed text-surface-deep font-headline-sm text-headline-sm font-bold shadow-md hover:brightness-110 transition-all">Download Mesh Specs</button>
</div>
</div>
</div>
{/* Sub-Header Filter Bar */}
<div className="sticky top-16 z-40 w-full bg-surface-card/90 backdrop-blur-xl">
<div className="px-gutter py-space-sm flex flex-col md:flex-row items-center justify-between gap-space-md">
{/* Category Pills Scrollable Row */}
<div className="w-full md:w-auto overflow-x-auto scrollbar-none flex items-center gap-space-xs">
<button className="px-3.5 py-1.5 rounded-full bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold whitespace-nowrap shadow-sm hover:brightness-110 transition-all">All 3D & CAD</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-card-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container font-label-md text-label-md whitespace-nowrap transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-[16px] text-tertiary-fixed">diamond</span>
          Jewellery & Luxury
        </button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-card-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container font-label-md text-label-md whitespace-nowrap transition-colors">Industrial Design</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-card-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container font-label-md text-label-md whitespace-nowrap transition-colors">Automotive & Aero</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-card-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container font-label-md text-label-md whitespace-nowrap transition-colors">Architectural Vis</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-card-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container font-label-md text-label-md whitespace-nowrap transition-colors">Characters & Sculpt</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-card-elevated text-text-secondary hover:text-text-primary hover:bg-surface-container font-label-md text-label-md whitespace-nowrap transition-colors">Game Assets</button>
<button className="px-3.5 py-1.5 rounded-full bg-surface-card-elevated text-secondary font-label-md text-label-md whitespace-nowrap hover:bg-surface-container transition-colors flex items-center gap-1">
<span className="material-symbols-outlined text-[16px]">redeem</span>
          Free Assets
        </button>
</div>
{/* Controls: Sort & Layout Toggle */}
<div className="flex items-center gap-space-sm shrink-0 self-end md:self-auto">
<div className="relative">
<select className="appearance-none bg-surface-card-elevated text-text-primary font-label-md text-label-md pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-fixed cursor-pointer">
<option>Trending Now</option>
<option>Latest Uploads</option>
<option>Top Rated (All Time)</option>
<option>Staff Picks Only</option>
<option>Bench-Ready Printables</option>
</select>
<span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-text-muted text-[16px]">expand_more</span>
</div>
<div className="flex items-center bg-surface-card-elevated p-1 rounded-lg gap-0.5">
<button className="p-1.5 rounded bg-surface-card text-primary-fixed shadow-sm" title="Masonry Grid">
<span className="material-symbols-outlined text-[18px]">grid_view</span>
</button>
<button className="p-1.5 rounded text-text-muted hover:text-text-primary transition-colors" title="Compact Flow">
<span className="material-symbols-outlined text-[18px]">view_comfy</span>
</button>
<button className="p-1.5 rounded text-text-muted hover:text-text-primary transition-colors" title="Detail Feed">
<span className="material-symbols-outlined text-[18px]">view_agenda</span>
</button>
</div>
</div>
</div>
</div>
<div className="px-gutter py-space-lg flex flex-col gap-space-xl">
{/* Hero / Trending Showcase Banner */}
<div className="relative w-full rounded-2xl overflow-hidden bg-surface-card shadow-2xl">
{/* Glow & Accent Mesh Grid */}
<div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent-glow blur-3xl pointer-events-none"></div>
<div className="absolute top-1/2 right-1/4 w-80 h-80 rounded-full bg-tertiary-container/10 blur-3xl pointer-events-none"></div>
<div className="relative grid grid-cols-1 lg:grid-cols-12 items-center">
{/* Visual Render Viewport (Left / Center) */}
<div className="lg:col-span-7 h-72 md:h-96 lg:h-[430px] relative overflow-hidden group">
<img className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" data-alt="Intricate photorealistic technical render of an emerald halo cocktail ring with micro-pave diamond split shank, featuring CAD coordinate wireframe callouts in cyan, laser measured dimensions, platinum prong setting details, dark dramatic studio lighting on black slate background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdfL-IobQ1JUkpQ59jdNt22sOwOy6JGDkXX4-LCGcF54Va3N26RbDdBr2Ol2L2K5sRyRAL8ZbqTxSkmGmOO4TLpQ8gYiTPujENPkpbbhVu0jYsvJ84yy92isYSNuC73aU9DZw1dZMw24qYqe1NAcjElxLlswe0H-JqYZV-8-YjpT0_OMpQjR9U5nyanko1qqhDMAjwjost50q0N0VhstUal5Xwq49_ymN4yGBvRKG4FF0dlNfno0h91g"/>
<div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface-card hidden lg:block"></div>
<div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent lg:hidden"></div>
{/* Badges Overlay */}
<div className="absolute top-space-md left-space-md flex flex-wrap gap-2">
<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card/90 backdrop-blur-md">
<span className="material-symbols-outlined text-secondary text-[16px]">verified</span>
<span className="font-label-caps text-label-caps text-text-primary uppercase tracking-wider">Staff Pick of the Week</span>
</div>
<div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-card/90 backdrop-blur-md">
<span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim animate-ping"></span>
<span className="font-label-caps text-label-caps text-tertiary-fixed-dim uppercase tracking-wider">3D Interactive</span>
</div>
</div>
<div className="absolute bottom-space-md left-space-md flex items-center gap-2">
<div className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-deep/80 backdrop-blur-md">
<span className="material-symbols-outlined text-[14px] text-text-secondary">straighten</span>
<span className="font-label-caps text-label-caps text-text-secondary">Bench Ready ±0.008mm</span>
</div>
<div className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-deep/80 backdrop-blur-md">
<span className="material-symbols-outlined text-[14px] text-primary-fixed">layers</span>
<span className="font-label-caps text-label-caps text-primary-fixed">Rhino 7 • MatrixGold</span>
</div>
</div>
</div>
{/* Meta Dossier & Actions (Right) */}
<div className="lg:col-span-5 p-space-lg lg:p-space-xl flex flex-col justify-between h-full z-10">
<div>
<div className="flex items-center gap-space-sm mb-space-sm">
<img className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-fixed/40" data-alt="Portrait photo of Master CAD Artist Elena Rostova, female jewellery engineer wearing spectacles, clean dramatic side lighting against obsidian studio backdrop." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDf5wL8IyidbHgtuKy-dosyoj6B71i5r04p9bamR0CF3q8AS9dCXZNsYYIObigij7Rr-TXdmL-Ez-AWQs2G1PgRdE-KDxW16PzOutd6XBPGQbYvNXFNduhQhmUyqt2b3rxEgsoIVyczGfbf_pw_8Z5LSTYVr1kQEcSl2xqsWjcHHM6RhEcGQwT3Uziv8e81Hn3TDRghAfloL-PyrywKHZYK6r1CmnwRy-8BoL7hZrIp10RqvwX8thL8TQ"/>
<div className="flex flex-col">
<span className="font-headline-sm text-headline-sm text-text-primary font-bold hover:text-primary-fixed cursor-pointer transition-colors">Elena Rostova, GG</span>
<span className="font-label-caps text-label-caps text-text-muted">Senior High-Jewelry CAD Director • Geneva</span>
</div>
</div>
<h2 className="font-headline-lg text-headline-lg text-text-primary font-extrabold tracking-tight mb-space-xs">
              Project Chrono-Pavé Emerald Celestial Ring
            </h2>
<p className="font-body-md text-body-md text-text-secondary mb-space-md line-clamp-3">
              Flawless 4.2ct octagon-cut emerald centerpiece cradled within double-tier micro-prongs. Engineered with CNC-optimized under-gallery open filigree to maximize gemstone luminescence and stone-seat tolerances for casting.
            </p>
<div className="grid grid-cols-3 gap-space-sm py-space-sm rounded-xl bg-surface-card-elevated/70 px-space-md mb-space-lg">
<div className="flex flex-col">
<span className="font-stat-counter text-stat-counter text-text-primary">12.8k</span>
<span className="font-label-caps text-label-caps text-text-muted uppercase">Impressions</span>
</div>
<div className="flex flex-col border-l border-surface-border pl-space-md">
<span className="font-stat-counter text-stat-counter text-primary-fixed">1,480</span>
<span className="font-label-caps text-label-caps text-text-muted uppercase">Appreciations</span>
</div>
<div className="flex flex-col border-l border-surface-border pl-space-md">
<span className="font-stat-counter text-stat-counter text-secondary">48</span>
<span className="font-label-caps text-label-caps text-text-muted uppercase">Downloads</span>
</div>
</div>
</div>
<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md">
<button className="flex-1 px-space-lg py-3 rounded-lg bg-primary-fixed text-surface-deep font-headline-sm text-headline-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary-fixed/20 hover:brightness-110 active:scale-[0.98] transition-all" id="open-inspect-btn">
<span className="material-symbols-outlined text-[20px]">view_in_ar</span>
              Inspect in 3D Viewport
            </button>
<a className="px-space-md py-3 rounded-lg bg-surface-card-elevated hover:bg-surface-container text-text-primary font-headline-sm text-headline-sm font-semibold flex items-center justify-center gap-1.5 transition-colors" href="#">
<span className="material-symbols-outlined text-[18px]">shopping_bag</span>
<span>Shop ($185)</span>
</a>
</div>
</div>
</div>
</div>
{/* Top Designers Section */}
<div className="flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-sm">
<span className="material-symbols-outlined text-secondary text-[22px]">stars</span>
<h3 className="font-headline-md text-headline-md text-text-primary font-bold">Top Verified CAD Engineers & Artists</h3>
</div>
<a className="font-label-md text-label-md text-primary-fixed hover:underline flex items-center gap-1" href="#">
          View All 1,420+ Creators
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
</a>
</div>
{/* Horizontal Scrollable Designers Stream */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-md">
{/* Designer 1 */}
<div className="relative bg-surface-card hover:bg-surface-card-elevated rounded-xl p-space-md transition-all duration-300 group flex flex-col justify-between shadow-lg">
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="relative">
<img className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-fixed" data-alt="Headshot of jewellery CAD designer Elena Rostova smiling with focused intense artistic gaze, set against dark minimalist ambient lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbkCAG80N-A2VMEvjqvVFefovuey7PKX2QHTLmOfuGti9wjX1jGBaRVrmvVKQy4VZr_j_A-IPnplso2Dz2PZ0KYgHk2sGMOPAAl1MPC9ZJNqNldMFHn7MbArU2yK9NX-MpWJWzGVoH6grfqotwN7CwzJl5EDIb-dSzNTR6sKaIGzkeqswQv0pOK4Eaup7F95uvjVrZxPxT8CGq2jYh3kDLchUEjJTOCJQsn953TUKT5AQO0OpgZqNvRQ"/>
<span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-tertiary-fixed-dim ring-2 ring-surface-card"></span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1">
<span className="font-headline-sm text-headline-sm text-text-primary font-bold truncate">Elena Rostova</span>
<span className="material-symbols-outlined text-[16px] text-tertiary-fixed shrink-0">verified</span>
</div>
<span className="font-label-caps text-label-caps text-primary-fixed truncate">Jewellery CAD • MatrixGold</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-text-secondary mb-space-md">42 Production Master Models • 19.4k Followers</p>
<div className="flex items-center gap-space-xs">
<button className="flex-1 py-1.5 rounded-lg bg-surface-deep hover:bg-surface-card text-text-primary font-label-md text-label-md transition-colors">Follow</button>
<button className="px-3 py-1.5 rounded-lg bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold hover:brightness-110 transition-all">Hire</button>
</div>
</div>
{/* Designer 2 */}
<div className="relative bg-surface-card hover:bg-surface-card-elevated rounded-xl p-space-md transition-all duration-300 group flex flex-col justify-between shadow-lg">
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="relative">
<img className="w-12 h-12 rounded-full object-cover ring-2 ring-tertiary-fixed" data-alt="Portrait of Saloar Hussain, male automotive surface modeler, studio portrait with sharp neon cyan backlighting on dark background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBopODeq7NiDyODsJuyKIE9q0BBGFY95sN8wrxzENUK_NtNjb9WZSp7bhEGnWV5Si-v_8wjRlHYMK4R9k-PB1XHCb3phYKk5Mn5Mtz936Z3rpmdZ1phUwkroYhkDukj6JhZm-0PInz_WpFnQUD9VtQVT1UXNXm-YjN2-TZjvQue3FvtFYtdzpiZzsDWNkyqoWFYiXgHYnZpQ_Vp-5xM62oMOM5jq00I_9byJ1qQKDSQ5L06ZN2QVKnenQ"/>
<span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-tertiary-fixed-dim ring-2 ring-surface-card"></span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1">
<span className="font-headline-sm text-headline-sm text-text-primary font-bold truncate">Saloar Hussain</span>
<span className="material-symbols-outlined text-[16px] text-tertiary-fixed shrink-0">verified</span>
</div>
<span className="font-label-caps text-label-caps text-tertiary-fixed truncate">Industrial & Hard Surface</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-text-secondary mb-space-md">88 Assemblies • 24.1k Followers</p>
<div className="flex items-center gap-space-xs">
<button className="flex-1 py-1.5 rounded-lg bg-surface-deep hover:bg-surface-card text-text-primary font-label-md text-label-md transition-colors">Follow</button>
<button className="px-3 py-1.5 rounded-lg bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold hover:brightness-110 transition-all">Hire</button>
</div>
</div>
{/* Designer 3 */}
<div className="relative bg-surface-card hover:bg-surface-card-elevated rounded-xl p-space-md transition-all duration-300 group flex flex-col justify-between shadow-lg">
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="relative">
<img className="w-12 h-12 rounded-full object-cover ring-2 ring-secondary" data-alt="Portrait of Kenji Sato, concept car CAD designer wearing sleek dark techwear in modern studio with amber side lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrwZdKMjtX_p-v2Bx--9cN76kfe0-bZUikaY8caUY1TPMsyYwR7-8grkjC_o9mox_bSeOtI-JubUod2GU0vcLzQqdSGMxe2xcdICQpQrQSdj1wNQ8SZwAP4ZUlaPI-sbEtQy9L3wPtIgBGFLleYe59mduzssJZD02eXJodnpYtLRM_5cLmDZZV0QAQBb0ESgcaAYIJ1pXVGNj_GA5P7d-7PhadmMGVh8WoIVj17exrPzeeyXg-VmVRMA"/>
<span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-surface-border ring-2 ring-surface-card"></span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1">
<span className="font-headline-sm text-headline-sm text-text-primary font-bold truncate">Kenji Sato</span>
<span className="material-symbols-outlined text-[16px] text-secondary shrink-0">verified</span>
</div>
<span className="font-label-caps text-label-caps text-secondary truncate">Automotive & Concept CAD</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-text-secondary mb-space-md">31 Vehicles • 15.6k Followers</p>
<div className="flex items-center gap-space-xs">
<button className="flex-1 py-1.5 rounded-lg bg-surface-deep hover:bg-surface-card text-text-primary font-label-md text-label-md transition-colors">Follow</button>
<button className="px-3 py-1.5 rounded-lg bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold hover:brightness-110 transition-all">Hire</button>
</div>
</div>
{/* Designer 4 */}
<div className="relative bg-surface-card hover:bg-surface-card-elevated rounded-xl p-space-md transition-all duration-300 group flex flex-col justify-between shadow-lg">
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="relative">
<img className="w-12 h-12 rounded-full object-cover ring-1 ring-surface-border" data-alt="Portrait of Maya Lin, female architectural 3D visualizer with confident expression against cinematic architectural render projection." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBUNiY0g_3D-3plWBuZUFicVH2HbZt33Z1-UhfzLMRI3dFhnoGGPSx2W-bhExN64Jy-Hk2Af5HbVQYa5PY5jpNEjKlzO_yRWVtTQuuLhD_qt4gqMoejAlqUwFIZnkYpB1pByIKaXGIAl16ByUSr7oPzNn7GRIobceCTsuv-LZYK9HSwDjEGWjjRidy54Nzzgotz7SGsydO6AJFQnxTrF4mwzNnipbnwaCn3_nVJJcY36hpyJnPVeLIGxA"/>
<span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-tertiary-fixed-dim ring-2 ring-surface-card"></span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1">
<span className="font-headline-sm text-headline-sm text-text-primary font-bold truncate">Maya Lin</span>
<span className="material-symbols-outlined text-[16px] text-tertiary-fixed shrink-0">verified</span>
</div>
<span className="font-label-caps text-label-caps text-text-muted truncate">ArchViz & Unreal Engine 5</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-text-secondary mb-space-md">114 Environments • 32.0k Followers</p>
<div className="flex items-center gap-space-xs">
<button className="flex-1 py-1.5 rounded-lg bg-surface-deep hover:bg-surface-card text-text-primary font-label-md text-label-md transition-colors">Follow</button>
<button className="px-3 py-1.5 rounded-lg bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold hover:brightness-110 transition-all">Hire</button>
</div>
</div>
{/* Designer 5 */}
<div className="relative bg-surface-card hover:bg-surface-card-elevated rounded-xl p-space-md transition-all duration-300 group flex flex-col justify-between shadow-lg">
<div className="flex items-center gap-space-sm mb-space-sm">
<div className="relative">
<img className="w-12 h-12 rounded-full object-cover ring-1 ring-surface-border" data-alt="Close-up portrait of David Vance, organic digital sculptor, focused expression in atmospheric low key lighting with green subtle rim light." src="https://lh3.googleusercontent.com/aida-public/AB6AXuApmJekmKgYHiYcOnof-yqYlsurG6idKnGc0t_Evej-8cNuPZ6IDrTrLzKQ4uGTcR1Tw0A1luoaq_oQg6Oj74so-AMJn0zuLCSRGc1dZ5pA7N13w5cvj3kWgvNbaVJetfVB90GBqQORNztE3oWJ3hwqXUWXpJkhoC7aiOs8TQLYM2PfOpnuOSiuoSjzuIFwasYUHswzJgJSoSqzIrPyVzzXaE59bz_LXfoep69PHzttze3A7t71sjifDA"/>
<span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-tertiary-fixed-dim ring-2 ring-surface-card"></span>
</div>
<div className="flex flex-col min-w-0">
<div className="flex items-center gap-1">
<span className="font-headline-sm text-headline-sm text-text-primary font-bold truncate">David Vance</span>
<span className="material-symbols-outlined text-[16px] text-tertiary-fixed shrink-0">verified</span>
</div>
<span className="font-label-caps text-label-caps text-primary-fixed truncate">Digital Sculpt • ZBrush</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-text-secondary mb-space-md">67 Collectibles • 11.2k Followers</p>
<div className="flex items-center gap-space-xs">
<button className="flex-1 py-1.5 rounded-lg bg-surface-deep hover:bg-surface-card text-text-primary font-label-md text-label-md transition-colors">Follow</button>
<button className="px-3 py-1.5 rounded-lg bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold hover:brightness-110 transition-all">Hire</button>
</div>
</div>
</div>
</div>
{/* Main Content - The Explore Grid (Masonry Aesthetics) */}
<div className="flex flex-col gap-space-md">
<div className="flex items-center justify-between">
<div className="flex items-center gap-space-sm">
<span className="material-symbols-outlined text-primary-fixed text-[24px]">view_quilt</span>
<h3 className="font-headline-md text-headline-md text-text-primary font-bold">Trending Creations & CAD Assemblies</h3>
</div>
<span className="font-body-sm text-body-sm text-text-muted">Showing 24 of 18,940 CAD models</span>
</div>
{/* High Density Media Masonry Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-space-md">
{/* Card 1: Luxury Jewelry Wireframe (Visual Focus Matching Prompt) */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Technical CAD wireframe rendering of a micro-pavé three-row diamond band platinum shank with green isocurve topology mesh lines overlaying the metallic polished diamond facets on black backdrop." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtrvawCqrvxzN3kswavhdbBoKOlJLuir8qVbskJ6uf5b_NeLBG9FQZrRHPxfQ3jkcH2DjG1nUTuTzclX7_FL4x4gB0wbx1yM9ZRo6ussbyZYJFBYb56wWl8eEqo1ecQDm9VF7Nq-wZqRUKxxizwYapNxR99PH1DsdfWnUCt5mx9x7Ee3qGV889tHk0LTf260SGn565S7_H9jilFNXKNBWRAqVoe50JUEm4GHlzBnGnhqgsuV-SRrYjBQ"/>
{/* Badges */}
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-tertiary-fixed">3D View</span>
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-primary-fixed">Rhino 7</span>
</div>
<div className="absolute top-3 right-3">
<span className="px-2 py-0.5 rounded bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold">$79</span>
</div>
{/* Quick View Hover Overlay */}
<div className="absolute inset-0 bg-surface-deep/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity duration-200 flex items-center justify-center gap-2">
<button className="p-2.5 rounded-full bg-primary-fixed text-surface-deep hover:scale-110 transition-transform shadow-lg" title="Orbit Model">
<span className="material-symbols-outlined text-[20px]">3d_rotation</span>
</button>
<button className="p-2.5 rounded-full bg-surface-card text-text-primary hover:text-secondary hover:scale-110 transition-transform shadow-lg" title="Bookmark">
<span className="material-symbols-outlined text-[20px]">bookmark</span>
</button>
</div>
</div>
{/* Card Info */}
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">Micro-Pavé Split-Shank Band Tolerances</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">Production STL • Wax ready</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of CAD engineer Elena Rostova" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBw6xKPs2DVUZ4VwVlFhT7mykaQsX_-t-bmKjC2rh6npJKUAb6UQv0gpZbN_ijonuOVpDn5yNvK38f-0-yKSC-oLktifOuWIs39xVD1TDzdkjHc3egQkmWMpdJj-v5SgSvMjnCWFOechDFXdts347uWqewgAlLwghCs7TvVqosVjmE5gGgbrDToK7POjTTXIqoNhJFKjfvxLCNdgPPFNQO1cW-RnM1G_a_iDVvxD0YFgSKYr7tGLZ193g"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">Elena R.</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 1.2k</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 6.8k</span>
</div>
</div>
</div>
</div>
{/* Card 2: Cybernetic Bionic Hand CAD */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Cinematic engineering 3D model of a robotic prosthetic bionic hand with exposed servo actuators, braided carbon fiber tendons, and precision titanium joints against matte dark background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDuLtVXhFW2USPQnJTXSzIVougC6sUeEBNZf5HZglBzNpU-Y_ZZ8PJi9PjckIc1lxM35bgVUukuqftg_ppDMVvQW-8_l4YKmEmjq_FCM8GZCmwveH7CukYGSOvSL5TawmLmqtAVkCSErXOL1767-ephhvv7Zp2b6H5RO63PXikIZdr6x4QOH_YZ5ojaGyYP1cYFkhmk8HcjYgGpdE1OXuPtyaRCfrme-_IKrWXZmQXxe06nloZnLEmog"/>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-secondary">Free STEP</span>
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-text-secondary">SolidWorks</span>
</div>
<div className="absolute inset-0 bg-surface-deep/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity duration-200 flex items-center justify-center gap-2">
<button className="p-2.5 rounded-full bg-primary-fixed text-surface-deep hover:scale-110 transition-transform shadow-lg" title="Orbit Model">
<span className="material-symbols-outlined text-[20px]">3d_rotation</span>
</button>
<button className="p-2.5 rounded-full bg-surface-card text-text-primary hover:text-secondary hover:scale-110 transition-transform shadow-lg" title="Bookmark">
<span className="material-symbols-outlined text-[20px]">bookmark</span>
</button>
</div>
</div>
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">Aether-VII Biomorphic Prosthetic Hand</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">Full kinematics assembly (STEP/IGES)</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of designer Saloar Hussain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAsM6axTJ0kQyeXf7g9GmDTnZD5iuq9TwR6pM0aKIS6_Bu24lQcmZNWNjVMAG95Fh-EN6INbznMflnNDXAOB516ajuCNmZA6JzOTtPaEDDEV4E5MC_ySoIwKfCJXzf-5k5BI30q-SXFGAM1c4XC_9bCKgr3izc3sSMKa83iElz0xn3xT0BHnOa5D5AfyjDn4T95FH8wLptp8psejkc0ydplQr-oP2xicLq9uFE2vRsWcnvE8G53VWvAkw"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">Saloar H.</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 3.4k</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 14.1k</span>
</div>
</div>
</div>
</div>
{/* Card 3: Automotive Aero Rim */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Turbofan aerodynamics forged monoblock alloy wheel 3D CAD model with directional carbon aero vanes and anodized gold center-lock nut, photographed in low-key studio lighting with neon rim edge highlights." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtLdm57zu8s1Qtc5-jESV2NRiiTEbZPiVs4fd422tMU1lberZUdWBhe1VE_5JLvIZH7TpTBMA-Xhr0ou0d2OmOWQCeLbe_d47QJX2qSZj1WxFDYaJ5TjpU7e4aWk0UBkc0b8OxJ-FCbwEwa-Udo7Eu-bbLitAO-JJKnIErB8ooxz6GgkbonK_DJpASIQqfee8cMugEWizKKZaiXUBhx13DZIo2q4m7J3KqNxOyfNXIAict6A03DGYAMw"/>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-tertiary-fixed">Portfolio</span>
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-text-secondary">Alias SubD</span>
</div>
<div className="absolute top-3 right-3">
<span className="px-2 py-0.5 rounded bg-surface-card-elevated font-label-md text-label-md text-text-secondary">Showcase</span>
</div>
<div className="absolute inset-0 bg-surface-deep/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity duration-200 flex items-center justify-center gap-2">
<button className="p-2.5 rounded-full bg-primary-fixed text-surface-deep hover:scale-110 transition-transform shadow-lg" title="Orbit Model">
<span className="material-symbols-outlined text-[20px]">3d_rotation</span>
</button>
<button className="p-2.5 rounded-full bg-surface-card text-text-primary hover:text-secondary hover:scale-110 transition-transform shadow-lg" title="Bookmark">
<span className="material-symbols-outlined text-[20px]">bookmark</span>
</button>
</div>
</div>
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">Vortex Formula Forged 21" Aero Wheel</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">CFD thermal venting optimized</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of designer Kenji Sato" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCOBEUacg5LVldzfcy8qh7QhNasDjvJMA7J3vcf8CmDO1x2WJkqpza5djcUKAoJTRFS2EXNaPpoRpNWXNHdBQrt1JwH13GhJmpOmdbvn2bnAPNjwSG0FbA4gbPelFrVjSPJdYRFFZFEJh-YtsycZi7X5_QvusIU1BwJ4SOIk8ds3NhKMLcWKSEf-EkIhWByPXHjvPXg51aDb2DTPrRC1ImT6xXDbxN5XP5PQMMGf9UoNKc_fGVoeY8_sw"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">Kenji S.</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 982</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 4.5k</span>
</div>
</div>
</div>
</div>
{/* Card 4: Mechanical Tourbillon Watch Movement */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Ultra high detail horology mechanical tourbillon escapement cage render showing balance wheel, rubies, escapement gear teeth and hand-beveled bridges under macro lens with cold cyan lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXiE0rEUwPtlzBSnRYXRQ-gk4LmLqtuC-mzS6GYutz1BG9aB4QXAkRQQHRpaD0FDLmGSPIh61gFwJ2WBoLg-tGbs7Y6FL77Zdc5o0iW4XpQ0pjrogrI5STR7I2IqocZMHrcPglbeJXXA-OzSBr0z7G7mcCebk5fDK8cbECSUllfnp6W8JGUw_SNAsJPIl0GM_42kkeBQRH2qypFVqcU8nC2RcunMNNk2P46Qkeu9RoGLzbRk7cPLjCPA"/>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-primary-fixed">Staff Pick</span>
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-tertiary-fixed">3D View</span>
</div>
<div className="absolute top-3 right-3">
<span className="px-2 py-0.5 rounded bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold">$149</span>
</div>
<div className="absolute inset-0 bg-surface-deep/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity duration-200 flex items-center justify-center gap-2">
<button className="p-2.5 rounded-full bg-primary-fixed text-surface-deep hover:scale-110 transition-transform shadow-lg" title="Orbit Model">
<span className="material-symbols-outlined text-[20px]">3d_rotation</span>
</button>
<button className="p-2.5 rounded-full bg-surface-card text-text-primary hover:text-secondary hover:scale-110 transition-transform shadow-lg" title="Bookmark">
<span className="material-symbols-outlined text-[20px]">bookmark</span>
</button>
</div>
</div>
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">Tri-Axial Gyro Tourbillon Calibre 01</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">387 Individual Parts • Micro-gears</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of Swiss watchmaker CAD specialist" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBa18eK44ukBnK91aZ06ds6JVYHtH_yqHGmkkoViU4zkTRMB0GpfQbmOtGET6FHGNfPf6r-yNx7UDuoYUX5cyo4cI5ab6ccgTrBv47xDW3z_m1hDqPsSnOUmYEuKnuKMjjjJ61kUb5mhq_xR-QqEXZGTyGdcqVIa5hVnsP70hKQnmhvUkawHHpA4fWT0AHLIbUpsHqN4TgxZbd1iFDxCV8XcQFli8_ExOqDmPU4HUpX9cJo6RivX_Oq4Q"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">Atelier V.</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 2.8k</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 18.2k</span>
</div>
</div>
</div>
</div>
{/* Card 5: Vintage Solitaire CAD Blueprint Render */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Art Deco vintage diamond engagement ring design screen view in Rhino CAD software showing cyan wireframe lines, millimeter measurement arrows, and cross section curves on dark textured grid." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjmLyP-rPrRULZNr6gHlwcGVoZ9zG99WlCKHqB04zhRCJASZsyfKS7SHPmKmAb_G5MEDTEfdM0PWtkZfuWcC2C1YLyNn75fPmQgDMPQuJRVFAFAsT-mcCYNHIjcrfvKKh5uY5_mHOvSG7vU1jVBE6WRseRrgpn6vNdcYUuDH9bbAVwbOM2AejJuU9z9rpqpLIQASJWj_VdxGZ31bhXogAwPB23KzqFuTh_Ldge1etCFTWNMT-XVhWBaw"/>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-primary-fixed">Blueprint</span>
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-text-secondary">MatrixGold</span>
</div>
<div className="absolute top-3 right-3">
<span className="px-2 py-0.5 rounded bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold">$49</span>
</div>
<div className="absolute inset-0 bg-surface-deep/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity duration-200 flex items-center justify-center gap-2">
<button className="p-2.5 rounded-full bg-primary-fixed text-surface-deep hover:scale-110 transition-transform shadow-lg">
<span className="material-symbols-outlined text-[20px]">3d_rotation</span>
</button>
</div>
</div>
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">Belle Époque Filigree Crown Solitaire</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">Prong settings calibrated for 2.0ct oval</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of jewelry artisan" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAODG5tJ669Wf2-rRsMcXUEQe3Vuj-JPIxjTzgo0EOThTkp2YZF9nEXfDQC3dNovNid6HKFC6VE3JcQrFnNszJrMJikv0BPcU5QJav_TYcYObtysaz1mZU6u03pL8sq9vc8a6zl4rdsoJLE358cuTFG4p0UbEg6bYI3CMY01VrubnQxhbp8OhY3mT1f3YjGDP4dB8pU_nXzQTSy5hItsC4sXnkKAE_QK-BOrY42A6K7CWyoZ1Jl5rSTFQ"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">Elena R.</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 840</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 3.1k</span>
</div>
</div>
</div>
</div>
{/* Card 6: Sci-Fi Drone Thruster Assembly */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Heavy industrial VTOL tilt-rotor drone thruster assembly CAD model showing exploded internal turbine blades and hydraulic swashplate rendered in dark graphite tones with orange hydraulic conduit hoses." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZD3oTSOezbkXyeqOTm6nFaww2Xyx3novg1OE3cP1bP2jCeRudWDnwAyYLw4nv1ZGQrL6B_AeNgSVhBcHyjDPc-gtixDGqokt24wmHzwjk1vCHCZMEFZt-0wr_51AJN4jwfJI1OaNY-9QD8P0ckpm9IkFcvwhfs7B4Dif1fT2k6_dSXlClb0MiOwutUt9SpoOdgm2zsEoJSgOVQVMTPunuwW-rEK-rX2RASBjyirCRoHeFv7kmDSC-Ew"/>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-tertiary-fixed">Fusion 360</span>
</div>
<div className="absolute top-3 right-3">
<span className="px-2 py-0.5 rounded bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold">$85</span>
</div>
</div>
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">T-44 Quad-Tilt Vectoring Thruster</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">Includes assembly hierarchy & joints</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of designer David Vance" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCCavpgBC_mS-0SfoY6jKz7QSEQj7Wi-XVN4NaBxAhGOOn7vfIHI2PV2mwsavavSdV5CAd1JnLC_kS0KtMY2kJ7mCQ-BHIWaf6Hjco-BF2GniggwfiSEHDd2aYw7FYf7j7ILTHNjcHk6ttOxfhyO0Gbv9VwNIMbdaFDhgdSZtv5g1LR8SDTdDmvcZVdy5_1NCjVIf25ogkCRUlf89tbOrTxr_WS81UPjX2wQySUNCXyeC5t7ZGnuiftQ"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">David V.</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 1.5k</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 7.9k</span>
</div>
</div>
</div>
</div>
{/* Card 7: Ergonomic Cyber Gaming Mouse */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Ergonomic skeletonized honeycomb gaming mouse with magnesium alloy chassis and optical switch mechanism exposed, rendered in deep black with neon yellow-green accent lighting." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIAtEdqwk0ggifef-Y2BrnMZWEyAEBojVg_Vq_6TjXDXS7d-Hpi2dQWT0Stdpk2FtF-SLWrn43QVbN66AXaB2AVYvBkXsI_dpbNVLq4ShHJEE8Rt0i7to7HqKVMAMQEeEcsTI3zEbIFn_iES6d1iFfQ2QByQa-FLn1Qyf_hmHtgHRxx1W8IwWHGLhS-jv-1ACH5nRJ7MVR9fAweO1mZFo5uq2NugTEkoZDJY6HH11MXpcoNKDYgUtSLA"/>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-secondary">Free STL</span>
</div>
</div>
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">ExoGrip Ultra-Light 48g Mouse Shell</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">3D SLA Resin printable casing</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of maker designer" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAH5ZMLAOqX53GlbS1KycjH2PFrmuMDVw7RZRZdptmis7SRMtRZE-v1S0Albwlkgbh6JK-CiBfOdRI1S2qzBpGyOpVlQpzDp0k8o36XUZQzxoAy1JwtNie5KNcGwN4Ge7sfjjg891QmeqYn9eBq7NP7BXH61mtNE5WsCbSgJ-VO8elXXm9wJsFXAG-ZPU4jCzPkWj5EzMDDKwzV2WLBJmhubLUXkQkvqUgc6nzdBCsC4xkjy8LNpFYKeQ"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">Nox Lab</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 4.1k</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 22k</span>
</div>
</div>
</div>
</div>
{/* Card 8: Cyberpunk High-Poly Mecha Helmet */}
<div className="group relative rounded-xl overflow-hidden bg-surface-card shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col">
<div className="relative w-full aspect-square bg-surface-deep overflow-hidden">
<img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" data-alt="Futuristic cybernetic pilot helmet sculpt in ZBrush with modular rebreather filters and iridescent optical visor, rendered in dramatic moody studio rim lighting on black obsidian background." src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1WcRsoUTVfrb6Np23aOKLqPL2WdZ3P1Po9qlQ3wDEdM9NxGvMn7nBMkC5w-R16iuDAXO4s44p-0x6B1Uipgwu2JJgQtoLoQPvxFkpcYS36Y4ZHYPwSMnv4Sg7f5klVQWUVeLMSwSvoUOMLGHzLzd5thEvvslhBitmJUH_-Do79W5mjfOYy3bGsJSbUNNXRFqXeP_1B4T4jFLYIgv51DVitJbjFrmEu9qV8ahom_8HtplukL-m6_g7Iw"/>
<div className="absolute top-3 left-3 flex items-center gap-1.5">
<span className="px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur font-label-caps text-label-caps text-tertiary-fixed">ZBrush</span>
</div>
<div className="absolute top-3 right-3">
<span className="px-2 py-0.5 rounded bg-primary-fixed text-surface-deep font-label-md text-label-md font-bold">$62</span>
</div>
</div>
<div className="p-space-md flex flex-col justify-between flex-1">
<div>
<h4 className="font-headline-sm text-headline-sm text-text-primary font-bold line-clamp-1 group-hover:text-primary-fixed transition-colors">Valkyrie Recon Pilot Helmet Sculpt</h4>
<p className="font-body-sm text-body-sm text-text-muted mt-0.5">High poly ZTL + Decimated 4K textures</p>
</div>
<div className="flex items-center justify-between pt-space-sm mt-space-sm border-t border-surface-border">
<div className="flex items-center gap-1.5">
<img className="w-6 h-6 rounded-full object-cover" data-alt="Avatar of Maya Lin" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAFqHfCX8CAYBDMsDVOYw9ZkI8F2kGD4EQgOLTedWSPALT6aVxPdyKaK-B0VG4XxaevzU5GSTq8waFlwjIMF6Lg_z2G-lk4EujAqBChJVBYSlAqXw8q21JwE_n3EZkOdET-lC8vVDM7NaUVwvEhAGUBOMjAwZKW5wwoByKKE3LkxIL_ftw1OJxTV2fU8kKHXGAkHuv4JLkxBw04zYTSwuoFLVok0LiYGyEKvEckL9YaBTtnGc1Cv-jZ2Q"/>
<span className="font-label-md text-label-md text-text-secondary truncate max-w-[100px]">Maya L.</span>
</div>
<div className="flex items-center gap-space-sm text-text-muted font-label-caps text-label-caps">
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> 1.9k</span>
<span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">visibility</span> 9.6k</span>
</div>
</div>
</div>
</div>
</div>
{/* Pagination / Endless Load Trigger */}
<div className="w-full py-space-xl flex flex-col items-center justify-center gap-space-md">
<button className="px-space-xl py-3 rounded-xl bg-surface-card hover:bg-surface-card-elevated text-text-primary font-headline-sm text-headline-sm font-bold flex items-center gap-2 shadow-lg transition-all group">
<span className="material-symbols-outlined text-[20px] text-primary-fixed group-hover:rotate-180 transition-transform duration-500">sync</span>
          Load 48 More Verified 3D Assets
        </button>
<span className="font-label-caps text-label-caps text-text-muted uppercase tracking-widest">End of cache • Real-time synchronization active</span>
</div>
</div>
</div>

</div></main><footer className="w-full bg-surface-deep border-t border-surface-border mt-auto"><div className="w-full px-gutter py-space-xl flex flex-col md:flex-row items-center justify-between gap-space-md"><div className="flex flex-col sm:flex-row items-center gap-space-md"><span className="font-headline-sm text-headline-sm font-bold tracking-tight text-text-primary uppercase">CAD<span className="text-primary-fixed">ONCE</span></span><span className="hidden sm:inline text-text-muted font-body-sm text-body-sm">|</span><p className="font-body-sm text-body-sm text-text-muted">© 2025 CADONCE Engine. Real-time 3D and CAD community ecosystem.</p></div><div className="flex items-center gap-space-lg flex-wrap justify-center"><a className="font-body-sm text-body-sm text-text-muted hover:text-text-primary transition-colors" href="#">Terms</a><a className="font-body-sm text-body-sm text-text-muted hover:text-text-primary transition-colors" href="#">Privacy</a><a className="font-body-sm text-body-sm text-text-muted hover:text-text-primary transition-colors" href="#">API Telemetry</a><div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-card border border-surface-border"><span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim animate-pulse"></span><span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Nodes Operational</span></div></div></div></footer>
    </div>
  );
}
