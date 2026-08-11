"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getDb } from '@/app/actions';
import Avatar from '@/components/Avatar';
import { CountrySearch } from '@/components/CountrySearch';

export default function DesignerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [designer, setDesigner] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [currentSkill, setCurrentSkill] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'payments'>('profile');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const parseManualPayment = (description: string) => {
    if (!description) return null;
    const lines = description.split('\n');
    let inManualPaymentBlock = false;
    const info: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '[MANUAL_PAYMENT]') {
        inManualPaymentBlock = true;
      } else if (inManualPaymentBlock && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        info[key.trim()] = valueParts.join(':').trim();
      } else if (trimmed && inManualPaymentBlock) {
        if (trimmed.startsWith('[')) {
          inManualPaymentBlock = false;
        }
      }
    }
    return Object.keys(info).length > 0 ? info : null;
  };

  useEffect(() => {
    const fetchDesigner = async () => {
      const db = await getDb();
      const designers = db.designers || [];
      const found = designers.find((d: any) => d.id === params.id);
      
      if (found) {
        setDesigner(found);
        setEditData(found);
        
        // Filter projects assigned to this designer
        const designerProjects = (db.projects || []).filter((p: any) => 
          p.designer && found.fullName && p.designer.toLowerCase().trim() === found.fullName.toLowerCase().trim()
        );
        setProjects(designerProjects);
      } else {
        setDesigner(null);
        setProjects([]);
      }
      setLoading(false);
    };
    fetchDesigner();
  }, [params.id]);

  const addSkill = () => {
    const trimmedSkill = currentSkill.trim();
    if (trimmedSkill) {
      const currentSkills = Array.isArray(editData.skills) ? editData.skills : [];
      if (!currentSkills.includes(trimmedSkill)) {
        setEditData({
          ...editData,
          skills: [...currentSkills, trimmedSkill]
        });
        setCurrentSkill('');
      }
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setEditData({
      ...editData,
      skills: editData.skills.filter((s: string) => s !== skillToRemove)
    });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this designer? This will remove them from the team matrix.')) {
      const { deleteDesigner } = await import('@/app/actions');
      const res = await deleteDesigner(params.id as string);
      if (res.success) {
        router.push('/team');
      } else {
        alert(res.error || 'Failed to delete designer.');
      }
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { updateDesigner } = await import('@/app/actions');
      const res = await updateDesigner(params.id as string, editData);
      if (res.success) {
        setDesigner(editData);
        setIsEditing(false);
      } else {
        alert(res.error || 'Failed to update designer.');
      }
    } catch (err) {
      alert('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const formatEarnings = (getPaid: boolean) => {
    let usdTotal = 0;
    let inrTotal = 0;
    
    projects.forEach((p: any) => {
      const amt = parseFloat(p.expense || '0');
      const hasManualRecord = p.description && p.description.includes('[MANUAL_PAYMENT]');
      const isPaid = p.payoutStatus?.toLowerCase() === 'paid' || hasManualRecord;
      
      if ((getPaid && isPaid) || (!getPaid && !isPaid)) {
        if (p.expenseCurrency === '$') {
          usdTotal += amt;
        } else {
          inrTotal += amt;
        }
      }
    });

    const parts = [];
    if (usdTotal > 0 || (usdTotal === 0 && inrTotal === 0)) {
      parts.push(`$${usdTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
    }
    if (inrTotal > 0) {
      parts.push(`₹${inrTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    
    return parts.join(' + ');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!designer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-headline font-bold text-white mb-4">Designer Not Found</h2>
        <Link href="/team" className="text-primary-fixed-dim hover:underline">Return to Team Matrix</Link>
      </div>
    );
  }  return (
    <div className="bg-surface-base font-body-md text-text-primary antialiased selection:bg-accent-lime selection:text-black min-h-screen">
      {/* Main Dossier Content */}
      <main className={`${isEditing ? 'pt-32' : 'pt-24'} pb-32`}>
        {!isEditing ? (
          <div className="flex-1 p-4 sm:p-8 lg:p-margin-desktop grid grid-cols-1 xl:grid-cols-12 gap-gutter max-w-[1600px] mx-auto w-full">
            
            {/* Left Column: Profile Card */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col items-center relative overflow-hidden h-full border border-stroke-glass">
                {/* Subtle background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-accent-lime/10 blur-[50px] rounded-full pointer-events-none"></div>
                
                <div className="relative mb-6 mt-4">
                  <div className="w-32 h-32 rounded-full border border-stroke-glass bg-surface-base flex items-center justify-center shadow-lg relative z-10 overflow-hidden">
                    <Avatar
                      email={designer.email}
                      name={designer.fullName}
                      size={128}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <div className="absolute bottom-1 right-1 bg-surface-base rounded-full p-1 z-20 border border-stroke-glass flex items-center justify-center">
                    <span className={`material-symbols-outlined text-xl ${designer.hasPortalAccess ? 'text-green-400' : 'text-neutral-500'}`} style={{ fontVariationSettings: '"FILL" 1' }}>
                      {designer.hasPortalAccess ? 'verified' : 'lock'}
                    </span>
                  </div>
                </div>

                <h2 className="font-headline text-2xl font-extrabold tracking-tight mb-1 uppercase text-white">{designer.fullName}</h2>
                <p className="font-label-sm text-label-sm text-accent-lime tracking-widest uppercase mb-12">{designer.specialty || 'CAD Designer'}</p>
                
                <div className="w-full mt-auto">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-label-sm text-[10px] text-text-secondary uppercase tracking-widest">Performance Protocol</span>
                    <span className="font-label-sm text-label-sm text-accent-lime font-bold">{designer.performance}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-base rounded-full overflow-hidden border border-stroke-glass">
                    <div 
                      className="h-full bg-accent-lime rounded-full relative"
                      style={{ width: `${designer.performance}%` }}
                    >
                      <div className="absolute right-0 top-0 h-full w-4 bg-white/50 blur-[2px]"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-xl p-6 flex justify-between items-center border border-stroke-glass">
                <div>
                  <p className="font-label-sm text-[10px] text-text-secondary uppercase tracking-widest mb-1">Access Tier</p>
                  <p className={`font-label-sm text-label-sm font-bold uppercase ${designer.hasPortalAccess ? 'text-accent-lime' : 'text-neutral-400'}`}>
                    {designer.hasPortalAccess ? 'ACTIVE WORKSTATION' : 'RESTRICTED ACCESS'}
                  </p>
                </div>
                {designer.hasPortalAccess && (
                  <button 
                    onClick={async () => {
                      const { resendDesignerInvite } = await import('@/app/actions');
                      const res = await resendDesignerInvite(params.id as string);
                      if (res.success) {
                        if (res.warning) {
                          alert(res.warning);
                        } else {
                          alert('Invitation resent successfully!');
                        }
                      } else {
                        alert(res.error || 'Failed to resend invitation');
                      }
                    }}
                    className="w-10 h-10 rounded-lg bg-surface-variant/50 border border-stroke-glass flex items-center justify-center text-text-secondary hover:text-accent-lime hover:border-accent-lime/50 transition-all cursor-pointer active:scale-95"
                    title="Resend invitation"
                  >
                    <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Ledger */}
            <div className="xl:col-span-8 glass-panel rounded-2xl p-4 sm:p-6 md:p-8 border border-stroke-glass flex flex-col relative overflow-hidden">
              
              {/* Header / Tabs */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6 border-b border-stroke-glass/50 pb-4">
                <div className="flex gap-8">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`font-label-sm text-label-sm uppercase tracking-widest transition-colors pb-4 relative group cursor-pointer ${
                      activeTab === 'profile' ? 'text-accent-lime font-bold' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Profile
                    {activeTab === 'profile' && (
                      <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-accent-lime shadow-[0_0_8px_rgba(252,224,3,0.8)]"></span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('payments')}
                    className={`font-label-sm text-label-sm uppercase tracking-widest transition-colors pb-4 relative group cursor-pointer ${
                      activeTab === 'payments' ? 'text-accent-lime font-bold' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Payment
                    {activeTab === 'payments' && (
                      <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-accent-lime shadow-[0_0_8px_rgba(252,224,3,0.8)]"></span>
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    <span className="font-label-sm text-[10px] text-text-secondary uppercase tracking-widest">
                      {activeTab === 'profile' ? 'Personnel Node: Secure' : 'Financial Ledger: Secured'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="w-8 h-8 rounded-lg bg-surface-variant/50 border border-stroke-glass flex items-center justify-center text-text-secondary hover:text-accent-lime transition-colors cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button 
                      onClick={handleDelete} 
                      className="w-8 h-8 rounded-lg bg-error-container/20 border border-error/20 flex items-center justify-center text-error hover:bg-error-container/40 transition-colors cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tab Contents */}
              {activeTab === 'profile' ? (
                /* PROFILE TAB */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-1">
                    <p className="font-label-sm text-[10px] text-accent-lime uppercase tracking-widest mb-1">Contact Vector</p>
                    <p className="text-text-primary font-bold text-sm">{designer.email}</p>
                    <p className="text-text-secondary/70 text-[10px] font-medium mt-1">{designer.mobile}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-label-sm text-[10px] text-accent-lime uppercase tracking-widest mb-1">Geographic Node</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{designer.country?.toLowerCase() === 'us' ? '🇺🇸' : designer.country?.toLowerCase() === 'uk' ? '🇬🇧' : designer.country?.toLowerCase() === 'in' ? '🇮🇳' : designer.country?.toLowerCase() === 'bd' ? '🇧🇩' : designer.country?.toLowerCase() === 'pk' ? '🇵🇰' : designer.country?.toLowerCase() === 'tr' ? '🇹🇷' : designer.country?.toLowerCase() === 'vn' ? '🇻🇳' : '🌍'}</span>
                      <p className="text-text-primary font-bold text-sm uppercase tracking-widest">
                        {designer.country === 'in' ? 'India' : designer.country === 'us' ? 'USA' : designer.country === 'uk' ? 'UK' : designer.country}
                      </p>
                    </div>
                    <p className="text-text-secondary/70 text-[10px] font-medium mt-1">Satellite Deployment</p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-label-sm text-[10px] text-accent-lime uppercase tracking-widest mb-1">Staffing Classification</p>
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${designer.employmentType === 'In-House' ? 'text-white/40' : 'text-accent-lime'}`}>{designer.employmentType === 'In-House' ? 'domain' : 'public'}</span>
                      <p className={`font-bold text-sm uppercase tracking-widest ${designer.employmentType === 'In-House' ? 'text-text-primary/60' : 'text-text-primary'}`}>
                        {designer.employmentType || 'Freelancer'}
                      </p>
                    </div>
                    <p className="text-text-secondary/70 text-[10px] font-medium mt-1">Employment Model</p>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <p className="font-label-sm text-[10px] text-accent-lime uppercase tracking-widest mb-1">Talent Bio & Experience</p>
                    <p className="text-text-primary/80 font-medium text-sm leading-relaxed max-w-lg italic">
                      Certified {designer.specialty} with {designer.experience || 'extensive production'} history. Integrated within the CADONCE global delivery matrix.
                    </p>
                  </div>

                  <div className="space-y-4 md:col-span-2">
                    <p className="font-label-sm text-[10px] text-accent-lime uppercase tracking-widest mb-1">Skill Matrix</p>
                    <div className="flex flex-wrap gap-2">
                      {designer.skills?.map((skill: string) => (
                        <span key={skill} className="px-4 py-2 bg-surface-base border border-stroke-glass rounded-xl text-[9px] font-black text-text-primary/60 uppercase tracking-widest hover:border-accent-lime/50 hover:text-accent-lime transition-all cursor-default">
                          {skill}
                        </span>
                      )) || <p className="text-text-secondary/50 text-xs italic">Skill matrix pending initialization...</p>}
                    </div>
                  </div>
                </div>
              ) : (
                /* PAYMENTS TAB */
                <div className="flex flex-col gap-10">
                  
                  {/* Summary Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="bg-surface-base/50 rounded-xl p-5 border border-stroke-glass hover:border-stroke-glass/80 transition-colors">
                      <p className="font-label-sm text-[10px] text-text-secondary uppercase tracking-widest mb-2">Total Assignments</p>
                      <p className="font-headline-md text-headline-md font-bold text-text-primary">{projects.length} {projects.length === 1 ? 'Project' : 'Projects'}</p>
                    </div>
                    <div className="bg-surface-base/50 rounded-xl p-5 border border-stroke-glass hover:border-stroke-glass/80 transition-colors relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                      <p className="font-label-sm text-[10px] text-green-400 uppercase tracking-widest mb-2">Disbursed Payout</p>
                      <p className="font-headline-md text-headline-md font-bold text-green-400">{formatEarnings(true)}</p>
                    </div>
                    <div className="bg-surface-base/50 rounded-xl p-5 border border-stroke-glass hover:border-stroke-glass/80 transition-colors">
                      <p className="font-label-sm text-[10px] text-accent-lime uppercase tracking-widest mb-2">Escrowed / Pending</p>
                      <p className="font-headline-md text-headline-md font-bold text-accent-lime">{formatEarnings(false)}</p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="w-full">
                    {projects.length === 0 ? (
                      <div className="py-8 text-center bg-surface-base/30 border border-dashed border-stroke-glass rounded-2xl">
                        <span className="material-symbols-outlined text-text-secondary/40 text-3xl mb-2">payments</span>
                        <p className="text-text-secondary/50 text-xs italic">No project payment records found for this designer.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {/* Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 pb-3 border-b border-stroke-glass mb-4 px-2">
                          <div className="col-span-4 font-label-sm text-[10px] text-text-secondary uppercase tracking-widest">Project / ID</div>
                          <div className="col-span-2 font-label-sm text-[10px] text-text-secondary uppercase tracking-widest">Date</div>
                          <div className="col-span-3 font-label-sm text-[10px] text-text-secondary uppercase tracking-widest text-right">Payout</div>
                          <div className="col-span-3 font-label-sm text-[10px] text-text-secondary uppercase tracking-widest text-right">Status</div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {projects.map((p) => {
                            const hasManualRecord = p.description && p.description.includes('[MANUAL_PAYMENT]');
                            const manualPayment = parseManualPayment(p.description);
                            const isPayoutPaid = p.payoutStatus?.toLowerCase() === 'paid' || hasManualRecord;
                            const isEscrow = p.paymentStatus?.toLowerCase() === 'escrow secured';
                            const isAdvance = p.paymentStatus?.toLowerCase() === '50% advance';
                            
                            return (
                              <React.Fragment key={p.id}>
                                {/* Desktop Row Layout */}
                                <div 
                                  onClick={() => {
                                    if (hasManualRecord) {
                                      setExpandedProjectId(expandedProjectId === p.id ? null : p.id);
                                    } else {
                                      router.push(`/projects/${p.id}`);
                                    }
                                  }}
                                  className="hidden md:grid md:grid-cols-12 gap-4 py-4 px-3 hover:bg-surface-variant/20 rounded-xl transition-colors group border-t border-stroke-glass/30 first:border-t-0 cursor-pointer"
                                  title={hasManualRecord ? "Click to view payment record details" : "Click to view project details"}
                                >
                                  <div className="md:col-span-4 flex flex-col">
                                    <p className="font-label-md text-label-md font-semibold text-text-primary group-hover:text-accent-lime transition-colors flex items-center gap-1.5">
                                      {p.title}
                                    </p>
                                    <p className="font-label-sm text-[10px] text-text-secondary mt-1 font-mono opacity-60">ID: {p.orderId || p.id}</p>
                                  </div>
                                  <div className="md:col-span-2 text-xs md:text-[13px] text-text-secondary font-body-md flex items-center">
                                    {hasManualRecord && manualPayment && manualPayment.Date 
                                      ? formatDate(manualPayment.Date) 
                                      : (p.orderDate ? formatDate(p.orderDate) : formatDate(p.createdAt))}
                                  </div>
                                  <div className="md:col-span-3 text-sm md:text-label-md font-medium text-text-primary md:text-right flex items-center justify-end">
                                    {p.expenseCurrency || '₹'}{parseFloat(p.expense || '0').toLocaleString()}
                                  </div>
                                  <div className="md:col-span-3 flex items-center justify-end gap-3">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
                                      isPayoutPaid 
                                        ? 'border-green-500/30 bg-green-500/10 text-green-400' 
                                        : isEscrow 
                                          ? 'border-accent-lime/30 bg-accent-lime/10 text-accent-lime'
                                          : isAdvance
                                            ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                                            : 'border-red-500/30 bg-red-500/10 text-red-400'
                                    }`}>
                                      <span className="material-symbols-outlined text-[14px]">
                                        {isPayoutPaid ? 'check_circle' : isEscrow ? 'shield' : isAdvance ? 'payments' : 'pending'}
                                      </span>
                                      <span className="font-label-sm text-[10px] font-bold tracking-wider">
                                        {isPayoutPaid ? 'PAID' : isEscrow ? 'ESCROW' : isAdvance ? 'ADVANCE' : 'PENDING'}
                                      </span>
                                    </div>
                                    <button className="text-text-secondary hover:text-accent-lime transition-colors cursor-pointer flex items-center justify-center">
                                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Mobile Card Layout */}
                                <div 
                                  onClick={() => {
                                    if (hasManualRecord) {
                                      setExpandedProjectId(expandedProjectId === p.id ? null : p.id);
                                    } else {
                                      router.push(`/projects/${p.id}`);
                                    }
                                  }}
                                  className="md:hidden flex flex-col gap-3 py-4 px-4 hover:bg-surface-variant/20 rounded-xl transition-colors group border border-stroke-glass/50 bg-surface-base/30 cursor-pointer"
                                  title={hasManualRecord ? "Click to view payment record details" : "Click to view project details"}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex flex-col gap-1">
                                      <p className="font-label-md text-label-md font-semibold text-text-primary group-hover:text-accent-lime transition-colors flex items-center gap-1.5">
                                        {p.title}
                                      </p>
                                      <p className="font-label-sm text-[9px] text-text-secondary font-mono opacity-60">ID: {p.orderId || p.id}</p>
                                    </div>
                                    <button className="text-text-secondary hover:text-accent-lime transition-colors cursor-pointer flex items-center justify-center pt-0.5">
                                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                                    </button>
                                  </div>
                                  
                                  <div className="h-[1px] bg-stroke-glass/30 w-full" />
                                  
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-text-secondary/50 uppercase tracking-wider font-bold mb-1">Date</span>
                                      <span className="text-text-secondary font-medium truncate">
                                        {hasManualRecord && manualPayment && manualPayment.Date 
                                          ? formatDate(manualPayment.Date) 
                                          : (p.orderDate ? formatDate(p.orderDate) : formatDate(p.createdAt))}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[9px] text-text-secondary/50 uppercase tracking-wider font-bold mb-1">Payout</span>
                                      <span className="text-text-primary font-bold truncate">
                                        {p.expenseCurrency || '₹'}{parseFloat(p.expense || '0').toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-start">
                                      <span className="text-[9px] text-text-secondary/50 uppercase tracking-wider font-bold mb-1">Status</span>
                                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                                        isPayoutPaid 
                                          ? 'border-green-500/30 bg-green-500/10 text-green-400' 
                                          : isEscrow 
                                            ? 'border-accent-lime/30 bg-accent-lime/10 text-accent-lime'
                                            : isAdvance
                                              ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
                                              : 'border-red-500/30 bg-red-500/10 text-red-400'
                                      }`}>
                                        <span className="material-symbols-outlined text-[10px]">
                                          {isPayoutPaid ? 'check_circle' : isEscrow ? 'shield' : isAdvance ? 'payments' : 'pending'}
                                        </span>
                                        <span className="text-[9px] font-bold tracking-wider">
                                          {isPayoutPaid ? 'PAID' : isEscrow ? 'ESCROW' : isAdvance ? 'ADVANCE' : 'PENDING'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {hasManualRecord && expandedProjectId === p.id && manualPayment && (
                                  <div className="col-span-12 py-3 px-4 bg-white/[0.01] border-b border-white/5">
                                    <div className="p-4 rounded-2xl bg-surface-base border border-stroke-glass space-y-3">
                                      <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xs text-accent-cyan">receipt_long</span>
                                        <span className="text-[9px] font-black text-accent-cyan uppercase tracking-widest">Extracted Payment Invoice/Receipt Details</span>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
                                        <div>
                                          <p className="text-[8px] text-text-secondary uppercase font-black tracking-wider mb-0.5">Platform</p>
                                          <p className="font-bold text-text-primary">{manualPayment.Platform || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] text-text-secondary uppercase font-black tracking-wider mb-0.5">Transaction ID</p>
                                          <p className="font-mono font-bold text-text-primary truncate" title={manualPayment['Transaction ID']}>{manualPayment['Transaction ID'] || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] text-text-secondary uppercase font-black tracking-wider mb-0.5">Recipient Name</p>
                                          <p className="font-bold text-text-primary">{manualPayment['Recipient Name'] || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] text-text-secondary uppercase font-black tracking-wider mb-0.5">Paid Date & Time</p>
                                          <p className="font-bold text-text-primary">{manualPayment.Date || 'N/A'} {manualPayment.Time || ''}</p>
                                        </div>
                                        <div>
                                          <p className="text-[8px] text-text-secondary uppercase font-black tracking-wider mb-0.5">Amount Recorded</p>
                                          <p className="font-bold text-green-400 font-mono">₹{parseFloat(manualPayment['Amount Paid'] || '0').toLocaleString()}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          /* EDIT MODE: Cinematic Onboarding Layout */
          <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-8 glass-panel border border-stroke-glass p-4 sm:p-6 md:p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="font-label text-[10px] uppercase font-bold tracking-[0.2em] text-accent-lime mb-2">Designer Editor</p>
                <h2 className="font-headline text-3xl font-extrabold tracking-tighter text-white">Modify Professional Data</h2>
                <div className="h-1 w-12 bg-accent-lime mt-4 rounded-full"></div>
              </div>
              <button 
                onClick={() => setIsEditing(false)}
                className="w-10 h-10 rounded-xl bg-surface-variant/50 border border-stroke-glass text-white flex items-center justify-center hover:text-accent-lime hover:border-accent-lime/50 transition-all cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="group">
              <label className="block font-label text-xs font-medium tracking-wide text-text-secondary mb-2 uppercase">Full Name</label>
              <div className="relative bg-surface-base/50 rounded-lg focus-within:shadow-[0_0_15px_rgba(252,224,3,0.25)] focus-within:border-accent-lime border border-stroke-glass transition-all duration-300">
                <input 
                  value={editData.fullName}
                  onChange={(e) => setEditData({...editData, fullName: e.target.value})}
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-3 outline-none" 
                  type="text"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/50 group-focus-within:text-accent-lime transition-colors">
                  <span className="material-symbols-outlined text-sm">person</span>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block font-label text-xs font-medium tracking-wide text-text-secondary mb-2 uppercase">Professional Skills</label>
              <div className="relative bg-surface-base/50 rounded-lg focus-within:shadow-[0_0_15px_rgba(252,224,3,0.25)] focus-within:border-accent-lime border border-stroke-glass transition-all duration-300">
                <input 
                  value={currentSkill}
                  onChange={(e) => setCurrentSkill(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                  className="w-full bg-transparent border-none focus:ring-0 text-white pl-4 pr-20 py-3 placeholder:text-text-secondary/30 outline-none" 
                  placeholder="Add skills..." 
                  type="text"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={addSkill}
                    className="bg-accent-lime w-8 h-8 rounded flex items-center justify-center text-black shadow-lg active:scale-95 transition-transform cursor-pointer font-bold"
                  >
                    <span className="material-symbols-outlined font-bold text-lg">add</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {(Array.isArray(editData.skills) ? editData.skills : [])?.map((skill: string) => (
                  <span key={skill} className="flex items-center gap-2 px-3 py-1 bg-accent-lime/10 border border-accent-lime/20 rounded-full text-[10px] font-bold text-accent-lime uppercase tracking-wider">
                    {skill}
                    <button type="button" onClick={() => removeSkill(skill)} className="hover:text-white transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[10px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="group">
              <label className="block font-label text-xs font-medium tracking-wide text-text-secondary mb-2 uppercase">Experience Level</label>
              <div className="relative bg-surface-base/50 rounded-lg focus-within:shadow-[0_0_15px_rgba(252,224,3,0.25)] focus-within:border-accent-lime border border-stroke-glass transition-all duration-300">
                <input 
                  value={editData.experience || ''}
                  onChange={(e) => setEditData({...editData, experience: e.target.value})}
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-3 outline-none" 
                  type="text"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/50 group-focus-within:text-accent-lime transition-colors">
                  <span className="material-symbols-outlined text-sm">history_edu</span>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block font-label text-xs font-medium tracking-wide text-text-secondary mb-2 uppercase">Email Address</label>
              <div className="relative bg-surface-base/50 rounded-lg focus-within:shadow-[0_0_15px_rgba(252,224,3,0.25)] focus-within:border-accent-lime border border-stroke-glass transition-all duration-300">
                <input 
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({...editData, email: e.target.value})}
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-3 outline-none" 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/50 group-focus-within:text-accent-lime transition-colors">
                  <span className="material-symbols-outlined text-sm">mail</span>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block font-label text-xs font-medium tracking-wide text-text-secondary mb-2 uppercase">Mobile Number</label>
              <div className="relative bg-surface-base/50 rounded-lg focus-within:shadow-[0_0_15px_rgba(252,224,3,0.25)] focus-within:border-accent-lime border border-stroke-glass transition-all duration-300">
                <input 
                  type="tel"
                  value={editData.mobile}
                  onChange={(e) => setEditData({...editData, mobile: e.target.value})}
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-3 outline-none" 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/50 group-focus-within:text-accent-lime transition-colors">
                  <span className="material-symbols-outlined text-sm">call</span>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block font-label text-xs font-medium tracking-wide text-text-secondary mb-2 uppercase">Employment Type</label>
              <div className="relative bg-surface-base/50 rounded-lg focus-within:shadow-[0_0_15px_rgba(252,224,3,0.25)] focus-within:border-accent-lime border border-stroke-glass transition-all duration-300">
                <select 
                  value={editData.employmentType || 'Freelancer'}
                  onChange={(e) => setEditData({...editData, employmentType: e.target.value})}
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-4 py-3 appearance-none cursor-pointer outline-none"
                >
                  <option className="bg-neutral-900" value="In-House">🏢 In-House</option>
                  <option className="bg-neutral-900" value="Freelancer">🌐 Freelancer</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-text-secondary/50 group-focus-within:text-accent-lime">
                  <span className="material-symbols-outlined text-sm transition-colors">expand_more</span>
                </div>
              </div>
            </div>

            <div className="group">
              <label className="block font-label text-xs font-medium tracking-wide text-text-secondary mb-2 uppercase">Country</label>
              <CountrySearch 
                name="country" 
                defaultValue={editData.country || ''} 
                onChange={(val) => setEditData({...editData, country: val})} 
              />
            </div>

            <div className="group">
              <div className="flex justify-between items-center mb-3">
                <label className="block font-label text-xs font-medium tracking-wide text-text-secondary uppercase">Current Performance</label>
                <span className="text-accent-lime font-black text-sm">{editData.performance}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={editData.performance}
                onChange={(e) => setEditData({...editData, performance: parseInt(e.target.value)})}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent-lime"
              />
            </div>

            <div className="p-4 rounded-xl bg-accent-lime/5 border border-accent-lime/10">
               <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-black text-accent-lime uppercase tracking-widest">Portal Access</span>
                     <span className="text-[9px] text-text-secondary/50 font-medium">Toggle 3D Workstation Entry</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={editData.hasPortalAccess}
                      onChange={(e) => setEditData({...editData, hasPortalAccess: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-lime"></div>
                  </label>
               </div>
            </div>

             <div className="pt-10 space-y-4">
                <button 
                  disabled={saving}
                  onClick={handleUpdate}
                  className="w-full py-4 rounded-lg flex items-center justify-center gap-3 active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(252,224,3,0.3)] bg-gradient-to-r from-accent-lime to-accent-cyan disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="font-headline font-black tracking-widest text-black text-sm uppercase">{saving ? 'SAVING...' : 'SYNC INTELLIGENCE DATA'}</span>
                  <span className="material-symbols-outlined text-black" style={{ fontVariationSettings: "'FILL' 1" }}>{saving ? 'hourglass_top' : 'send'}</span>
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-full py-3 text-text-secondary/40 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors cursor-pointer"
                >
                  Discard Changes
                </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
