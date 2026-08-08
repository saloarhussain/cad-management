"use client";
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { saveProject, getDb } from '@/app/actions';
import AuthGuard from '@/components/AuthGuard';
import { CloudinaryUpload } from '@/components/CloudinaryUpload';

const DatePickerFacade = ({ label, isDeadline, name }: { label: string, isDeadline?: boolean, name?: string }) => {
  const [date, setDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch (e) {
        // Native fallback works because of absolute positioning over the icon
      }
    }
  };

  // Convert native YYYY-MM-DD to requested DD/MM/YYYY format
  const displayDate = date ? date.split('-').reverse().join('/') : "DD/MM/YYYY";

  return (
    <div className="space-y-2 relative">
      <label className={`font-label text-[10px] font-bold uppercase tracking-wider ${isDeadline ? 'text-[#fce003]' : 'text-stone-400'}`}>
        {label}
      </label>
      <div 
        onClick={handleClick}
        className={`w-full bg-surface-container-lowest border ${isDeadline ? 'border-[#fce003]/20' : 'border-transparent'} rounded p-3 focus-within:ring-2 focus-within:ring-[#fce003] transition-all flex justify-between items-center cursor-pointer relative overflow-hidden group`}
      >
        <span className={date ? "text-white" : "text-stone-700"}>
          {displayDate}
        </span>
        <span className="material-symbols-outlined text-white pointer-events-none group-focus-within:text-[#fce003] transition-colors">calendar_month</span>
        <input 
          ref={inputRef}
          type="date"
          name={name}
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="absolute right-0 top-0 w-12 h-full opacity-0 cursor-pointer" 
        />
      </div>
    </div>
  );
};

export default function NewProjectPage() {
  const { isAuthenticated } = useAuth();
  const [designers, setDesigners] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState<any[]>([]);
  const [selectedDesignerName, setSelectedDesignerName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const db = await getDb();
      setDesigners(db.designers || []);
      setClients(db.clients || []);
    };
    fetchData();
    setMounted(true);
  }, []);



  const handleSubmit = async (formData: FormData) => {
    if (!isAuthenticated) return;
    setSaving(true);
    try {
      formData.append('tags', JSON.stringify(skills));
      const result = await saveProject(formData);
      if (result.success) {
        window.location.href = '/projects';
      } else {
        alert(result.error || 'Failed to save project. Please try again.');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      alert(err.message || 'An unexpected error occurred. Please ensure you are logged in.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="bg-background text-on-surface font-body min-h-screen relative overflow-hidden pb-32 text-left">
        {/* Visual Element: Background Glow */}
        <div className="fixed top-[20%] left-[-10%] w-[40vw] h-[40vw] bg-[#fce003]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="fixed bottom-[10%] right-[-10%] w-[30vw] h-[30vw] bg-[#FEA500]/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

        <main className="pt-24 px-6 md:px-10 max-w-7xl mx-auto w-full">
          {/* Header Section */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="font-label text-[10px] font-bold uppercase tracking-widest text-[#fce003] mb-1 block">New Entry</span>
              <h2 className="font-headline text-4xl font-extrabold tracking-tight text-white">Initialize Project</h2>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => window.history.back()} className="px-4 py-2 text-sm font-bold text-stone-400 hover:bg-white/5 rounded transition-all">DISCARD</button>
            </div>
          </div>

          {/* Form Layout: Bento Style */}
          <form action={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Main Content Area */}
            <div className="md:col-span-8 space-y-6">
              {/* Basic Info Card */}
              <div className="bg-surface-container p-6 rounded-2xl border border-white/5 shadow-sm hover:shadow-[0_0_30px_rgba(252,224,3,0.08)] hover:border-[#fce003]/10 focus-within:shadow-[0_0_30px_rgba(252,224,3,0.08)] focus-within:border-[#fce003]/10 transition-all duration-300">
                <h3 className="font-headline text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#fce003]">info</span> Core Details
                </h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Assigned Client</label>
                      <div className="relative group">
                        <select name="client" required className="w-full bg-surface-container-lowest border border-white/5 rounded-xl p-3 text-on-surface focus:border-[#fce003]/30 focus:ring-1 focus:ring-[#fce003]/30 transition-all appearance-none cursor-pointer text-white">
                          <option value="">Select Client...</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.companyName || c.name}>
                              {c.companyName || c.name}
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-stone-500">expand_more</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Assigned Designer</label>
                      <div className="relative group">
                        <select 
                          name="designer" 
                          required 
                          onChange={(e) => setSelectedDesignerName(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-white/5 rounded-xl p-3 text-on-surface focus:border-[#fce003]/30 focus:ring-1 focus:ring-[#fce003]/30 transition-all appearance-none cursor-pointer text-white"
                        >
                          <option value="">Select Designer...</option>
                          {designers.map((d) => (
                            <option key={d.id} value={d.fullName}>
                              {d.fullName} ({d.specialty})
                            </option>
                          ))}
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-stone-500">expand_more</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 mt-5">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Order ID</label>
                    <input name="orderId" className="w-full bg-surface-container-lowest border border-white/5 rounded-xl p-3 text-on-surface focus:border-[#fce003]/30 focus:ring-1 focus:ring-[#fce003]/30 transition-all placeholder:text-stone-700 text-sm text-white" placeholder="e.g. #ORD-1234" type="text" />
                  </div>
                  <div className="space-y-4">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Reference Gallery</label>
                    
                    {/* Cloudinary Media Hub */}
                    <div className="bg-stone-950/40 rounded-2xl p-6 border border-white/[0.03] shadow-inner">
                      <CloudinaryUpload 
                        onUpload={(url, type) => {
                          setGallery(prev => [...prev, { url, type, uploadedAt: new Date().toISOString() }]);
                        }} 
                      />
                    </div>

                    {/* Live Asset Preview */}
                    {gallery.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
                        {gallery.map((item: any, idx: number) => {
                          const isVideo = item.type === 'video' || item.url?.endsWith('.mp4') || item.url?.includes('/video/upload/');
                          return (
                            <div key={idx} className="group relative aspect-square rounded-xl bg-stone-900 border border-white/5 overflow-hidden shadow-xl">
                              {isVideo ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                  <span className="material-symbols-outlined text-primary text-xl">play_circle</span>
                                  <span className="text-[6px] font-black text-outline uppercase tracking-widest mt-1">Video</span>
                                </div>
                              ) : (
                                <img src={item.url} alt="Asset" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              )}
                              <button 
                                type="button"
                                onClick={() => setGallery(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                              >
                                <span className="material-symbols-outlined text-[10px] text-white">close</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Hidden Input for form submission */}
                    <input 
                      type="hidden" 
                      name="images" 
                      value={JSON.stringify(gallery)} 
                    />
                    <p className="text-[8px] text-outline font-bold uppercase tracking-widest text-center mt-2 opacity-50">Assets are staged for project initialization</p>
                  </div>
                </div>
              </div>

              {/* Financials Card */}
              <div className="bg-surface-container p-6 rounded-2xl border border-white/5 shadow-sm hover:shadow-[0_0_30px_rgba(252,224,3,0.08)] hover:border-[#fce003]/10 focus-within:shadow-[0_0_30px_rgba(252,224,3,0.08)] focus-within:border-[#fce003]/10 transition-all duration-300">
                <h3 className="font-headline text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#fce003]">payments</span> Financial Logic
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Revenue</label>
                    <div className="relative flex items-center bg-surface-container-lowest border border-white/5 rounded-xl focus-within:border-[#fce003]/30 focus-within:ring-1 focus-within:ring-[#fce003]/30 transition-all overflow-hidden">
                      <div className="relative">
                        <select 
                          name="revenueCurrency" 
                          defaultValue="USD"
                          className="bg-transparent border-none py-3 pl-3 pr-8 text-[#fce003] font-bold text-sm focus:ring-0 appearance-none cursor-pointer"
                        >
                          <option value="USD" className="text-stone-900 bg-white">$ (USD)</option>
                          <option value="EUR" className="text-stone-900 bg-white">€ (EUR)</option>
                          <option value="GBP" className="text-stone-900 bg-white">£ (GBP)</option>
                          <option value="JPY" className="text-stone-900 bg-white">¥ (JPY)</option>
                          <option value="INR" className="text-stone-900 bg-white">₹ (INR)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[#fce003] scale-75">expand_more</span>
                      </div>
                      <input name="revenue" required className="w-full bg-transparent border-none p-3 text-on-surface focus:outline-none focus:ring-0 placeholder:text-stone-700 text-white" placeholder="0.00" type="number" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Expense</label>
                    <div className="relative flex items-center bg-surface-container-lowest border border-white/5 rounded-xl focus-within:border-[#fce003]/30 focus-within:ring-1 focus-within:ring-[#fce003]/30 transition-all overflow-hidden">
                      <div className="relative">
                        <select 
                          name="expenseCurrency" 
                          defaultValue="INR"
                          className="bg-transparent border-none py-3 pl-3 pr-8 text-error font-bold text-sm focus:ring-0 appearance-none cursor-pointer"
                        >
                          <option value="USD" className="text-stone-900 bg-white">$ (USD)</option>
                          <option value="EUR" className="text-stone-900 bg-white">€ (EUR)</option>
                          <option value="GBP" className="text-stone-900 bg-white">£ (GBP)</option>
                          <option value="JPY" className="text-stone-900 bg-white">¥ (JPY)</option>
                          <option value="INR" className="text-stone-900 bg-white">₹ (INR)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-error scale-75">expand_more</span>
                      </div>
                      <input name="expense" required className="w-full bg-transparent border-none p-3 text-on-surface focus:outline-none focus:ring-0 placeholder:text-stone-700 text-white" placeholder="0.00" type="number" />
                    </div>
                  </div>
                </div>
 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 pt-5 border-t border-white/5">
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Payment Status</label>
                    <div className="relative group">
                      <select name="paymentStatus" className="w-full bg-surface-container-lowest border border-white/5 rounded-xl p-3 text-on-surface focus:border-[#fce003]/30 focus:ring-1 focus:ring-[#fce003]/30 transition-all appearance-none cursor-pointer text-white">
                        <option value="Unpaid">Unpaid</option>
                        <option value="50% Advance">50% Advance</option>
                        <option value="Partial Payment">Partial Payment</option>
                        <option value="Paid">Fully Paid</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-stone-500">account_balance_wallet</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400">Amount Paid</label>
                    <input name="paidAmount" className="w-full bg-surface-container-lowest border border-white/5 rounded-xl p-3 text-on-surface focus:border-[#fce003]/30 focus:ring-1 focus:ring-[#fce003]/30 transition-all placeholder:text-stone-700 text-sm text-white" placeholder="0.00" type="number" defaultValue="0" />
                  </div>
                </div>

                {/* Conditional Escrow Option for Freelancers */}
                {designers.find(d => d.fullName === selectedDesignerName)?.employmentType === 'Freelancer' && (
                  <div className="mt-6 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-orange-500 text-lg">verified_user</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Secure Escrow Protocol</p>
                          <p className="text-[9px] text-stone-500 font-medium max-w-[200px]">Optional: Hold funds until project delivery for external talent.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="useEscrow" className="sr-only peer" />
                        <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="md:col-span-4 space-y-6">
              {/* Timeline Card */}
              <div className="bg-surface-container-high p-6 rounded-2xl shadow-[0_0_15px_rgba(252,224,3,0.02)] border border-white/5">
                <h3 className="font-headline text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#fce003]">calendar_today</span> Timeline
                </h3>
                <div className="space-y-5">
                  <DatePickerFacade name="orderDate" label="Order Date" />
                  <DatePickerFacade name="deadlineDate" label="Deadline Date" isDeadline={true} />
                </div>
              </div>

              {/* Project Details Card */}
              <div className="bg-surface-container p-6 rounded-2xl border border-white/5 shadow-sm hover:shadow-[0_0_30px_rgba(252,224,3,0.08)] hover:border-[#fce003]/10 focus-within:shadow-[0_0_30px_rgba(252,224,3,0.08)] focus-within:border-[#fce003]/10 transition-all duration-300">
                <h3 className="font-headline text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <span className="material-symbols-outlined text-sm text-[#fce003]">precision_manufacturing</span> Project Specifications
                </h3>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Project Title</label>
                    <input name="title" required className="w-full bg-surface-container-lowest border border-white/5 rounded-xl p-3 text-on-surface focus:border-[#fce003]/30 focus:ring-1 focus:ring-[#fce003]/30 transition-all placeholder:text-stone-600 text-white" placeholder="e.g., Art Deco Diamond Ring" type="text" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Skills Needed</label>
                    
                    {/* Active Tags Display */}
                    <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-stone-950/20 rounded-xl border border-white/5">
                      {skills.length === 0 ? (
                        <span className="text-[10px] text-stone-600 italic ml-1 self-center">No skills added yet. Add custom skills below.</span>
                      ) : (
                        skills.map((skill) => (
                          <span key={skill} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#fce003]/10 border border-[#fce003]/20 rounded-lg text-[10px] font-bold text-[#fce003] uppercase">
                            {skill}
                            <button
                              type="button"
                              onClick={() => setSkills(skills.filter(s => s !== skill))}
                              className="w-3.5 h-3.5 rounded-full bg-[#fce003]/10 hover:bg-[#fce003]/20 flex items-center justify-center text-[8px] text-[#fce003] font-bold"
                            >
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Input Area */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = skillInput.trim();
                            if (val && !skills.includes(val)) {
                              setSkills([...skills, val]);
                              setSkillInput('');
                            }
                          }
                        }}
                        placeholder="Type skill & press Enter..."
                        className="flex-grow bg-surface-container-lowest border border-white/5 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-[#fce003]/30"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = skillInput.trim();
                          if (val && !skills.includes(val)) {
                            setSkills([...skills, val]);
                            setSkillInput('');
                          }
                        }}
                        className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-label text-[10px] font-bold uppercase tracking-wider text-stone-400 ml-1">Design Brief &amp; Notes</label>
                    <textarea name="brief" required className="w-full bg-surface-container-lowest border border-white/5 rounded-xl p-3 text-on-surface focus:border-[#fce003]/30 focus:ring-1 focus:ring-[#fce003]/30 transition-all placeholder:text-stone-600 text-sm resize-none text-white" placeholder="Specify stone sizes, setting styles, and intricate CAD requirements..." rows={4}></textarea>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4">
                <button disabled={saving} className="w-full electric-gradient text-[#383100] font-black py-4 rounded-xl shadow-[0_0_20px_rgba(252,224,3,0.3)] active:scale-95 transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed" type="submit">
                  <span>{saving ? 'Saving...' : 'Save Project'}</span>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{saving ? 'hourglass_top' : 'bolt'}</span>
                </button>
                <p className="text-center text-[10px] text-stone-500 mt-4 font-label uppercase tracking-tighter">Automatic sync enabled</p>
              </div>
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
