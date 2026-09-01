"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { saveClient } from '@/app/actions';
import AuthGuard from '@/components/AuthGuard';
import { CountrySearch } from '@/components/CountrySearch';
import { getTaxIdLabel } from '@/lib/tax';

export default function NewClientPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [country, setCountry] = React.useState('');

  useEffect(() => {
    router.prefetch('/clients');
  }, [router]);

  const handleSubmit = async (formData: FormData) => {
    if (!isAuthenticated || saving) return;
    setSaving(true);
    try {
      const result = await saveClient(formData);
      if (result.success) {
        if (result.warning) {
          alert(result.warning);
        }
        router.push('/clients');
      } else {
        alert(result.error || 'Failed to save client. Please try again.');
        setSaving(false);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      alert(err.message || 'An unexpected error occurred. Please ensure you are logged in.');
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col items-center min-h-screen bg-background pb-32">
        {/* ... */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#7b7767]/80 backdrop-blur-xl shadow-[0_0_15px_rgba(252,224,3,0.12)]">
          <div className="flex justify-between items-center w-full px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/clients" className="text-[#F59E0B] active:scale-95 duration-200 hover:bg-[#F59E0B]/10 p-2 rounded-lg">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
              <h1 className="font-headline font-bold tracking-tight text-xl text-[#F59E0B]">Add New Client</h1>
            </div>
          </div>
        </header>

        <main className="w-full max-md px-6 pt-24 flex-grow">
          <div className="space-y-2 mb-10">
            <div className="flex items-center gap-3">
              <div className="h-[2px] w-12 electric-gradient"></div>
              <span className="font-body text-[10px] font-bold tracking-[0.2em] text-primary-fixed-dim uppercase">Customer Intelligence</span>
            </div>
            <h2 className="font-headline text-3xl font-extrabold text-white tracking-tighter">Onboard New <span className="text-tertiary-container text-cyan-400">Partner</span></h2>
            <p className="text-on-surface-variant text-sm max-w-md mt-2">Initialize a new client profile within the CADONCE ecosystem. All data is encrypted and synced across CAD nodes.</p>
          </div>

          <form action={handleSubmit} className="bg-surface-container-low p-8 rounded-xl space-y-8 relative overflow-hidden border border-white/5">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-400/5 blur-[80px] rounded-full"></div>
            
            <div className="space-y-6 text-left">
              <div className="group">
                <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Customer Name</label>
                <div className="relative">
                  <input 
                    name="name"
                    required
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white" 
                    placeholder="e.g. Alexander Sterling" 
                    type="text"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-500 group-focus-within:text-yellow-400 transition-colors">person</span>
                </div>
              </div>

              <div className="group">
                <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Company Name</label>
                <div className="relative">
                  <input 
                    name="companyName"
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white" 
                    placeholder="e.g. Sterling Industries" 
                    type="text"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-500 group-focus-within:text-yellow-400 transition-colors">business</span>
                </div>
              </div>

              <div className="group">
                <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Brand Website URL</label>
                <div className="relative">
                  <input 
                    name="website"
                    className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white" 
                    placeholder="https://www.example.com" 
                    type="url"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-500 group-focus-within:text-yellow-400 transition-colors">language</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Email Address</label>
                  <div className="relative">
                    <input 
                      name="email"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white" 
                      placeholder="client@studio.com" 
                      type="email"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-500 group-focus-within:text-yellow-400 transition-colors">mail</span>
                  </div>
                </div>

                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Mobile Number</label>
                  <div className="relative">
                    <input 
                      name="mobile"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white" 
                      placeholder="+1 (555) 000-0000" 
                      type="tel"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-500 group-focus-within:text-yellow-400 transition-colors">smartphone</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Country</label>
                  <CountrySearch name="country" required onChange={(val) => setCountry(val)} />
                </div>

                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Platform/Source</label>
                  <div className="relative">
                    <select name="platform" required className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface appearance-none transition-all duration-300 group-hover:border-outline text-white cursor-pointer">
                      <option value="">Select Platform...</option>
                      <option>Upwork</option>
                      <option>Direct Referral</option>
                      <option>LinkedIn</option>
                      <option>Instagram</option>
                      <option>Fiverr</option>
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-neutral-500 pointer-events-none">hub</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing & Address */}
            <div className="pt-6 mt-6 border-t border-white/10 text-left">
              <h4 className="font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-6">Billing & Address Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">{getTaxIdLabel(country).toUpperCase()}</label>
                  <div className="relative">
                    <input
                      name="taxId"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white"
                      placeholder={`Enter ${getTaxIdLabel(country)}`}
                      type="text"
                    />
                  </div>
                </div>
                <div className="group md:col-span-2">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Address</label>
                  <div className="relative">
                    <input
                      name="address"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white"
                      placeholder="Street Address"
                      type="text"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">City</label>
                  <div className="relative">
                    <input
                      name="city"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white"
                      placeholder="City"
                      type="text"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">State / Province</label>
                  <div className="relative">
                    <input
                      name="state"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white"
                      placeholder="State"
                      type="text"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block font-body text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Zip Code</label>
                  <div className="relative">
                    <input
                      name="pincode"
                      className="w-full bg-surface-container-lowest border border-outline-variant focus:border-yellow-400 focus:ring-0 rounded-lg py-4 px-5 text-on-surface placeholder:text-neutral-500 transition-all duration-300 group-hover:border-outline text-white"
                      placeholder="Zip Code"
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-yellow-400/5 border border-yellow-400/10 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1 text-left">
                  <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Client Portal Invitation</span>
                  <span className="text-[9px] text-neutral-500 font-medium max-w-[220px]">Automatically send a secure invitation email to this client.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="sendInvite" value="true" className="sr-only peer" />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
                </label>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={saving} className="w-full electric-gradient text-black font-headline font-bold text-lg py-5 rounded-xl flex items-center justify-center gap-3 hover:shadow-[0_0_25px_rgba(252,224,3,0.4)] active:scale-[0.98] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed">
                <span className="uppercase">{saving ? 'SAVING...' : 'SAVE & INVITE'}</span>
                <span className="material-symbols-outlined">{saving ? 'hourglass_top' : 'bolt'}</span>
              </button>
              <p className="text-center mt-4 font-body text-[10px] text-neutral-500 tracking-widest uppercase">Encryption: AES-256 Enabled</p>
            </div>
          </form>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-surface-container p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden border border-white/5 text-left">
              <span className="material-symbols-outlined text-cyan-400 text-xl">verified_user</span>
              <div>
                <div className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase">Validation</div>
                <div className="text-white font-headline font-bold">Secure Entry</div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-cyan-400/5 rounded-full blur-xl"></div>
            </div>
            <div className="bg-surface-container p-4 rounded-xl flex flex-col justify-between h-32 relative overflow-hidden border border-white/5 text-left">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Active Node</span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase">Sync Status</div>
                <div className="text-white font-headline font-bold">Cloud-Linked</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

