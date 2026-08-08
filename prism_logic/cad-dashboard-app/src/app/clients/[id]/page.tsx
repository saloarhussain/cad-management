"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getDb } from '@/app/actions';
import Avatar from '@/components/Avatar';
import { CountrySearch } from '@/components/CountrySearch';
import { getTaxIdLabel } from '@/lib/tax';

export default function ClientDossierPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'projects'>('profile');
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    mobile: '',
    country: '',
    website: '',
    platform: '',
    taxId: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    const fetchClient = async () => {
      const db = await import('@/app/actions').then(mod => mod.getDb());
      const clients = db.clients || [];
      const found = clients.find((c: any) => c.id === params.id);
      
      if (found) {
        setClient(found);
        setFormData({
          name: found.name || '',
          companyName: found.companyName || '',
          email: found.email || '',
          mobile: found.mobile || '',
          country: found.country || '',
          website: found.website || '',
          platform: found.platform || '',
          taxId: found.taxId || '',
          address: found.address || '',
          city: found.city || '',
          state: found.state || '',
          pincode: found.pincode || ''
        });

        // Find projects for this client
        const personName = found.companyName || found.name;
        const clientProjects = (db.projects || []).filter((p: any) => 
          p.client === found.name || 
          p.client === found.companyName || 
          p.client === personName
        );
        setProjects(clientProjects);
      } else {
        setClient(null);
      }
      setLoading(false);
    };
    fetchClient();
  }, [params.id]);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this client record? This will permanently remove them from the Intelligence Matrix.')) {
      const { deleteClient } = await import('@/app/actions');
      const res = await deleteClient(params.id as string);
      if (res.success) {
        router.push('/clients');
      } else {
        alert('Failed to delete client record.');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { updateClient } = await import('@/app/actions');
    const result = await updateClient(params.id as string, formData);
    if (result.success) {
      setIsEditing(false);
      // Refresh local state
      setClient({ ...client, ...formData });

      // Refresh local projects list too
      const db = await import('@/app/actions').then(mod => mod.getDb());
      const personName = formData.companyName || formData.name;
      const clientProjects = (db.projects || []).filter((p: any) => 
        p.client === formData.name || 
        p.client === formData.companyName || 
        p.client === personName
      );
      setProjects(clientProjects);
    } else {
      alert('Failed to save changes');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-headline font-bold text-white mb-4">Client Not Found</h2>
        <Link href="/clients" className="text-primary-fixed-dim hover:underline">Return to Client Matrix</Link>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      
      <main className="max-w-6xl mx-auto px-6 pt-44 pb-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Visual Accent Header with Avatar */}
        <div className="space-y-2 text-left lg:col-span-4 lg:sticky lg:top-44">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-[#fce003]/20 rounded-3xl blur-2xl"></div>
              <Avatar
                email={client.email}
                name={client.companyName || client.name}
                website={client.website}
                size={80}
                className="relative w-20 h-20 rounded-3xl ring-2 ring-white/10 flex-shrink-0 object-cover shadow-2xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-[2px] w-10 bg-gradient-to-r from-[#fce003] to-orange-600"></div>
                <span className="font-label text-[9px] font-black tracking-[0.3em] text-[#fce003] uppercase">Customer Intelligence</span>
              </div>
              <h2 className="font-headline text-3xl font-black text-white tracking-tighter italic uppercase">{client.companyName || client.name}</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">{client.email}</p>
            </div>
          </div>
          <p className="text-white/60 text-sm max-w-lg text-left italic font-medium leading-relaxed">
            Comprehensive profile data for {formData.companyName || formData.name}. Tactical records are synced across the secure network.
          </p>

          {/* Quick Metrics Panel */}
          <div className="mt-8 pt-8 border-t border-white/10 space-y-6">
            <div>
              <span className="font-label text-[9px] font-black tracking-[0.2em] text-[#fce003]/60 uppercase">FINANCIAL SUMMARY</span>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-surface-container-low/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Total Budget</p>
                  <p className="text-lg font-black text-white">
                    ${projects.reduce((sum, p) => sum + (parseFloat(p.revenue) || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="bg-surface-container-low/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Active Projects</p>
                  <p className="text-lg font-black text-[#fce003]">
                    {projects.filter(p => p.status?.toLowerCase() !== 'completed' && p.status?.toLowerCase() !== 'cancelled').length}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <span className="font-label text-[9px] font-black tracking-[0.2em] text-[#fce003]/60 uppercase">RELATIONSHIP METADATA</span>
              <div className="bg-surface-container-low/30 rounded-xl border border-white/5 p-4 mt-3 space-y-3 font-body">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider text-[9px]">Source Node</span>
                  <span className="text-white font-semibold uppercase tracking-wider text-[9px] bg-white/5 px-2 py-0.5 rounded border border-white/10">{client.platform || 'Direct Referral'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500 font-bold uppercase tracking-wider text-[9px]">Registration Date</span>
                  <span className="text-white font-medium text-[10px]">
                    {client.createdAt ? new Date(client.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <span className="font-label text-[9px] font-black tracking-[0.2em] text-[#fce003]/60 uppercase">OPERATIONAL ACTIONS</span>
              <div className="mt-3 space-y-2">
                <button
                  onClick={() => {
                    const baseUrl = window.location.origin;
                    const link = `${baseUrl}/projects/request?clientId=${client.id}&clientName=${encodeURIComponent(client.companyName || client.name)}`;
                    navigator.clipboard.writeText(link);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 3000);
                  }}
                  className={`w-full py-3 rounded-lg border font-headline font-bold text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 transition-all ${
                    copied
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">{copied ? 'check_circle' : 'content_copy'}</span>
                  {copied ? 'Intake Link Copied' : 'Copy Intake Portal Link'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="lg:col-span-8 w-full">
          {/* Unified Dossier Container */}
          <div className="bg-surface-container-low p-8 rounded-xl relative overflow-hidden text-left shadow-2xl w-full min-h-[550px] flex flex-col">
            
            {/* Header Tabs & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/10 pb-6 relative z-30 mb-8 w-full">
              {/* Tab Selector */}
              <div className="flex gap-8">
                <button 
                  onClick={() => { if (!isEditing) setActiveTab('profile'); }}
                  disabled={isEditing}
                  className={`font-headline text-sm uppercase tracking-widest transition-all pb-4 relative group cursor-pointer ${isEditing ? 'opacity-50 cursor-not-allowed' : ''} ${
                    activeTab === 'profile' ? 'text-[#fce003] font-bold' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Dossier
                  {activeTab === 'profile' && (
                    <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#fce003] shadow-[0_0_8px_rgba(252,224,3,0.8)]"></span>
                  )}
                </button>
                <button 
                  onClick={() => { if (!isEditing) setActiveTab('projects'); }}
                  disabled={isEditing}
                  className={`font-headline text-sm uppercase tracking-widest transition-all pb-4 relative group cursor-pointer ${isEditing ? 'opacity-50 cursor-not-allowed' : ''} ${
                    activeTab === 'projects' ? 'text-[#fce003] font-bold' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Designs & Payments
                  {activeTab === 'projects' && (
                    <span className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#fce003] shadow-[0_0_8px_rgba(252,224,3,0.8)]"></span>
                  )}
                </button>
              </div>

              {/* Integrated Controls (Dynamically filtered by Active Tab) */}
              {!isEditing && (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {activeTab === 'profile' && (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 text-[#fce003] flex items-center justify-center hover:bg-[#fce003]/10 hover:border-[#fce003]/30 transition-all active:scale-90 shadow-xl"
                      title="Edit Dossier"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      const baseUrl = window.location.origin;
                      const link = `${baseUrl}/projects/request?clientId=${client.id}&clientName=${encodeURIComponent(client.companyName || client.name)}`;
                      navigator.clipboard.writeText(link);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    }} 
                    className={`flex-1 sm:flex-none h-12 sm:h-10 px-4 sm:px-6 rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl relative overflow-hidden group ${copied ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-[#fce003] border-[#fce003] text-black hover:brightness-110'}`}
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="material-symbols-outlined text-base relative z-10">{copied ? 'check_circle' : 'share'}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest relative z-10 whitespace-nowrap">
                      {copied ? 'COPIED' : 'SEND INTAKE'}
                    </span>
                  </button>
                  <button 
                    onClick={handleDelete} 
                    className="w-12 h-12 sm:w-10 sm:h-10 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/40 hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-90 transition-all flex items-center justify-center shadow-xl group"
                    title="Delete Client"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              )}
            </div>

            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#fce003]/5 blur-[80px] rounded-full pointer-events-none"></div>

            {/* Render Tab Contents */}
            {activeTab === 'profile' ? (
              /* TAB 1: PROFILE DOSSIER */
              <div className="space-y-6 relative z-10 w-full">
                {/* Customer Name */}
                <div className="group">
                  <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Customer Name</label>
                  <div className="relative">
                    <input 
                      disabled={!isEditing}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`} 
                      type="text" 
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined transition-colors ${isEditing ? 'text-[#fce003]' : 'text-neutral-600'}`}>person</span>
                  </div>
                </div>

                {/* Company Name */}
                <div className="group">
                  <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Company Name</label>
                  <div className="relative">
                    <input 
                      disabled={!isEditing}
                      value={formData.companyName}
                      onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                      className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`} 
                      type="text" 
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined transition-colors ${isEditing ? 'text-[#fce003]' : 'text-neutral-600'}`}>business</span>
                  </div>
                </div>

                {/* Brand Website URL */}
                <div className="group">
                  <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Brand Website URL</label>
                  <div className="relative">
                    <input 
                      disabled={!isEditing}
                      value={formData.website || ''}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`} 
                      type="url" 
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined transition-colors ${isEditing ? 'text-[#fce003]' : 'text-neutral-600'}`}>language</span>
                  </div>
                </div>

                {/* Contact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Email Address</label>
                    <div className="relative">
                      <input 
                        disabled={!isEditing}
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`} 
                        type="email" 
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined transition-colors ${isEditing ? 'text-[#fce003]' : 'text-neutral-600'}`}>mail</span>
                    </div>
                  </div>
                  <div className="group">
                    <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Mobile Number</label>
                    <div className="relative">
                      <input 
                        disabled={!isEditing}
                        value={formData.mobile}
                        onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`} 
                        type="tel" 
                      />
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined transition-colors ${isEditing ? 'text-[#fce003]' : 'text-neutral-600'}`}>smartphone</span>
                    </div>
                  </div>
                </div>

                {/* Localization & Source */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Country</label>
                    {isEditing ? (
                      <CountrySearch 
                        name="country" 
                        defaultValue={formData.country} 
                        required 
                        onChange={(val) => setFormData({...formData, country: val})}
                      />
                    ) : (
                      <div className="w-full bg-surface-container-lowest border border-white/5 rounded-lg py-4 px-5 text-on-surface flex items-center justify-between">
                        <span className="font-medium">{formData.country || 'Global'}</span>
                        <span className="material-symbols-outlined text-neutral-600">public</span>
                      </div>
                    )}
                  </div>
                  <div className="group">
                    <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Platform/Source</label>
                    <div className="relative">
                      <select 
                        disabled={!isEditing}
                        value={formData.platform}
                        onChange={(e) => setFormData({...formData, platform: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface appearance-none transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`}
                      >
                        <option value="Direct Referral">Direct Referral</option>
                        <option value="Upwork">Upwork</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Fiverr">Fiverr</option>
                      </select>
                      <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined pointer-events-none transition-colors ${isEditing ? 'text-[#fce003]' : 'text-neutral-600'}`}>hub</span>
                    </div>
                  </div>
                </div>

                {/* Billing & Address */}
                <div className="pt-6 mt-6 border-t border-white/10">
                  <h4 className="font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-6">Billing & Address Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="group">
                      <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">{getTaxIdLabel(formData.country).toUpperCase()}</label>
                      <input
                        disabled={!isEditing}
                        value={formData.taxId}
                        onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`}
                        placeholder={`Enter ${getTaxIdLabel(formData.country)}`}
                        type="text"
                      />
                    </div>
                    <div className="group md:col-span-2">
                      <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Address</label>
                      <input
                        disabled={!isEditing}
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`}
                        placeholder="Street Address"
                        type="text"
                      />
                    </div>
                    <div className="group">
                      <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">City</label>
                      <input
                        disabled={!isEditing}
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`}
                        placeholder="City"
                        type="text"
                      />
                    </div>
                    <div className="group">
                      <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">State / Province</label>
                      <input
                        disabled={!isEditing}
                        value={formData.state}
                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`}
                        placeholder="State"
                        type="text"
                      />
                    </div>
                    <div className="group">
                      <label className="block font-label text-xs font-bold text-on-secondary-container uppercase tracking-widest mb-3">Zip Code</label>
                      <input
                        disabled={!isEditing}
                        value={formData.pincode}
                        onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                        className={`w-full bg-surface-container-lowest border rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 outline-none ${isEditing ? 'border-[#fce003]/50 focus:border-[#fce003]' : 'border-white/5 cursor-default'}`}
                        placeholder="Zip Code"
                        type="text"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button (Edit Mode Only) */}
                {isEditing && (
                  <div className="pt-8 flex flex-col gap-4">
                    <button 
                      disabled={saving}
                      onClick={handleSave}
                      className="w-full bg-[#fce003] py-4 rounded-lg text-black font-headline font-bold uppercase tracking-widest text-sm shadow-lg active:scale-[0.98] transition-all hover:brightness-110 flex items-center justify-center gap-3"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">save</span>
                          SYNC DATA
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="w-full bg-white/5 py-4 rounded-lg text-white/40 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all"
                    >
                      CANCEL CHANGES
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: DESIGNS & PAYMENTS LEDGER */
              <div className="space-y-6 relative z-10 w-full flex-grow flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 bg-[#fce003] rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-black text-[#fce003] uppercase tracking-[0.3em]">Ledger Node: Active</span>
                    </div>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.3em]">Real-time transactional project history</p>
                  </div>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 self-stretch sm:self-auto justify-around sm:justify-start">
                    <div>
                      <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">Projects</p>
                      <p className="text-xs font-black text-white">{projects.length}</p>
                    </div>
                    <div className="h-6 w-[1px] bg-white/10"></div>
                    <div>
                      <p className="text-[7px] font-black text-neutral-500 uppercase tracking-widest mb-0.5">Total Value</p>
                      <p className="text-xs font-black text-[#fce003]">
                        ${projects.reduce((sum, p) => sum + (parseFloat(p.revenue) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full flex-grow">
                  {projects.length === 0 ? (
                    <div className="text-center py-16 bg-surface-container-lowest rounded-xl border border-white/5 h-full flex flex-col items-center justify-center min-h-[300px]">
                      <span className="material-symbols-outlined text-4xl text-white/10 mb-3 block">folder_open</span>
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest">No Projects Registered</p>
                      <p className="text-[10px] text-white/20 mt-1 max-w-xs uppercase tracking-widest leading-relaxed">This client does not have any design assignments logged.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-[600px] mt-4">
                          <thead>
                            <tr className="border-b border-white/5 font-label text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                              <th className="pb-3 pr-4">Design / Project Title</th>
                              <th className="pb-3 px-4">Date</th>
                              <th className="pb-3 px-4">Status</th>
                              <th className="pb-3 px-4 text-right">Budget</th>
                              <th className="pb-3 px-4 text-right">Paid</th>
                              <th className="pb-3 px-4 text-right">Balance</th>
                              <th className="pb-3 pl-4 text-center">Payment Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-body text-xs text-neutral-300">
                            {projects.map((project, idx) => {
                              const paymentStatus = project.paymentStatus || 'Unpaid';
                              const normStatus = paymentStatus.toLowerCase();
                              
                              const budget = parseFloat(project.revenue || '0');
                              // If payment status is marked fully paid, default the paid amount to the budget if database has it as 0
                              const isFullyPaid = normStatus === 'paid' || normStatus === 'funds released' || normStatus === 'escrow released';
                              const paid = isFullyPaid && parseFloat(project.paidAmount || '0') === 0
                                ? budget
                                : parseFloat(project.paidAmount || '0');
                              const balance = Math.max(0, budget - paid);
                              
                              let paymentBadgeClass = 'text-red-400 bg-red-400/10 border-red-400/20';
                              if (isFullyPaid) {
                                paymentBadgeClass = 'text-green-400 bg-green-400/10 border-green-400/20';
                              } else if (normStatus.includes('partial') || normStatus.includes('secured') || normStatus.includes('escrow') || normStatus.includes('advance')) {
                                paymentBadgeClass = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
                              }

                              const workStatus = project.status || 'Pending';
                              let statusBadgeClass = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
                              const lowerStatus = workStatus.toLowerCase();
                              if (lowerStatus.includes('completed') || lowerStatus.includes('done') || lowerStatus.includes('approved')) {
                                statusBadgeClass = 'text-green-400 bg-green-400/10 border-green-400/20';
                              } else if (lowerStatus.includes('urgent') || lowerStatus.includes('delay') || lowerStatus.includes('expired')) {
                                statusBadgeClass = 'text-red-500 bg-red-500/10 border-red-500/20';
                              } else if (lowerStatus.includes('progress') || lowerStatus.includes('active') || lowerStatus.includes('brief') || lowerStatus.includes('draft')) {
                                statusBadgeClass = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                              }

                              return (
                                <tr key={project.id || idx} className="hover:bg-white/[0.02] transition-colors group">
                                  <td className="py-4 pr-4 font-bold text-white group-hover:text-[#fce003] transition-colors">
                                    <Link href={`/projects/${project.id}`}>
                                      {project.title}
                                    </Link>
                                  </td>
                                  <td className="py-4 px-4 text-neutral-400 font-mono text-[11px]">
                                    {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '--/--/----'}
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`inline-block px-2 py-0.5 border text-[10px] font-black uppercase rounded ${statusBadgeClass}`}>
                                      {workStatus}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono font-bold text-neutral-200">
                                    ${budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono font-bold text-green-400/80">
                                    ${paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-4 px-4 text-right font-mono font-bold text-amber-500/80">
                                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-4 pl-4 text-center">
                                    <span className={`inline-block px-2 py-0.5 border text-[10px] font-black uppercase rounded ${paymentBadgeClass}`}>
                                      {paymentStatus}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards View */}
                      <div className="block md:hidden w-full space-y-4 mt-4">
                        {projects.map((project, idx) => {
                          const paymentStatus = project.paymentStatus || 'Unpaid';
                          const normStatus = paymentStatus.toLowerCase();
                          
                          const budget = parseFloat(project.revenue || '0');
                          // If payment status is marked fully paid, default the paid amount to the budget if database has it as 0
                          const isFullyPaid = normStatus === 'paid' || normStatus === 'funds released' || normStatus === 'escrow released';
                          const paid = isFullyPaid && parseFloat(project.paidAmount || '0') === 0
                            ? budget
                            : parseFloat(project.paidAmount || '0');
                          const balance = Math.max(0, budget - paid);
                          
                          let paymentBadgeClass = 'text-red-400 bg-red-400/10 border-red-400/20';
                          if (isFullyPaid) {
                            paymentBadgeClass = 'text-green-400 bg-green-400/10 border-green-400/20';
                          } else if (normStatus.includes('partial') || normStatus.includes('secured') || normStatus.includes('escrow') || normStatus.includes('advance')) {
                            paymentBadgeClass = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
                          }

                          const workStatus = project.status || 'Pending';
                          let statusBadgeClass = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
                          const lowerStatus = workStatus.toLowerCase();
                          if (lowerStatus.includes('completed') || lowerStatus.includes('done') || lowerStatus.includes('approved')) {
                            statusBadgeClass = 'text-green-400 bg-green-400/10 border-green-400/20';
                          } else if (lowerStatus.includes('urgent') || lowerStatus.includes('delay') || lowerStatus.includes('expired')) {
                            statusBadgeClass = 'text-red-500 bg-red-500/10 border-red-500/20';
                          } else if (lowerStatus.includes('progress') || lowerStatus.includes('active') || lowerStatus.includes('brief') || lowerStatus.includes('draft')) {
                            statusBadgeClass = 'text-blue-400 bg-blue-400/10 border-blue-400/20';
                          }

                          return (
                            <div key={project.id || idx} className="p-4 bg-surface-container-lowest rounded-xl border border-white/5 space-y-4 hover:border-[#fce003]/30 transition-all duration-300">
                              <div className="flex justify-between items-start gap-4">
                                <Link href={`/projects/${project.id}`} className="font-headline font-bold text-sm text-white hover:text-[#fce003] transition-colors text-left flex-grow">
                                  {project.title}
                                </Link>
                                <span className={`inline-block px-2 py-0.5 border text-[9px] font-black uppercase rounded flex-shrink-0 ${statusBadgeClass}`}>
                                  {workStatus}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2 items-center text-[10px]">
                                <span className="text-white/40 uppercase tracking-wider font-bold">Date:</span>
                                <span className="text-white/70 font-mono">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : '--/--/----'}</span>
                                <span className="text-white/20">•</span>
                                <span className={`inline-block px-2 py-0.5 border text-[9px] font-black uppercase rounded ${paymentBadgeClass}`}>
                                  {paymentStatus}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-left">
                                <div>
                                  <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Budget</span>
                                  <span className="font-mono font-bold text-white text-[11px]">
                                    ${budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Paid</span>
                                  <span className="font-mono font-bold text-green-400 text-[11px]">
                                    ${paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Balance</span>
                                  <span className="font-mono font-bold text-amber-500 text-[11px]">
                                    ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
