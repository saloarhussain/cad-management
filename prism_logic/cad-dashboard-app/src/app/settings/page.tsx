"use client";
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  saveSettings,
  getDb,
  getMySettings,
  getDesignerDb,
  getPointsLedger,
  getMyEscrows,
  uploadProfileImage,
  saveAlarmConfig
} from '@/app/actions';
import AuthGuard from '@/components/AuthGuard';
import { CountrySearch } from '@/components/CountrySearch';
import { GLOBAL_CURRENCIES } from '@/lib/config';

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/jpeg', 0.8);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export default function SettingsPage() {
  const { isAuthenticated, user, organizationName, logout, loading, isDesigner } = useAuth();
  const [dataLoading, setDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [gmailUser, setGmailUser] = useState('');
  const [gmailAppPassword, setGmailAppPassword] = useState('');
  const [senderName, setSenderName] = useState('');
  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');
  const [organizationTitle, setOrganizationTitle] = useState('');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpSecure, setSmtpSecure] = useState(true);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [countryCode, setCountryCode] = useState('US'); // Default
  const [activeTab, setActiveTab] = useState<'user' | 'email' | 'payment' | 'wallet'>('user');
  const [designerData, setDesignerData] = useState<any>(null);
  const [designerFullName, setDesignerFullName] = useState('');
  const [designerSpecialty, setDesignerSpecialty] = useState('');
  const [designerCountry, setDesignerCountry] = useState('');
  const [designerSkills, setDesignerSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // New Identity State
  const [ownerName, setOwnerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);

  // Live Opportunity Alarm Protocol states
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmQuery, setAlarmQuery] = useState('is:unread (from:fiverr.com OR from:upwork.com OR from:freelancer.com OR (from:binance.com "p2p") OR "new order" OR "placed an order" OR "sent you a message" OR "new inquiry")');
  const [alarmVolume, setAlarmVolume] = useState(80);
  const [alarmStyle, setAlarmStyle] = useState('telephone');

  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'email' || tab === 'user' || tab === 'payment' || tab === 'wallet') {
        setActiveTab(tab as any);
      }

      const enabled = localStorage.getItem('cad_gmail_alarm_enabled') === 'true';
      const query = localStorage.getItem('cad_gmail_alarm_query') || 'is:unread (from:fiverr.com OR from:upwork.com OR from:freelancer.com OR (from:binance.com "p2p") OR "new order" OR "placed an order" OR "sent you a message" OR "new inquiry")';
      const vol = Number(localStorage.getItem('cad_alarm_volume') || '80');
      const style = localStorage.getItem('cad_alarm_style') || 'telephone';
      setAlarmEnabled(enabled);
      setAlarmQuery(query);
      setAlarmVolume(vol);
      setAlarmStyle(style);

      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []);

  const handleToggleAlarm = async (enabled: boolean) => {
    setAlarmEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cad_gmail_alarm_enabled', enabled ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('cad-alarm-settings-changed'));
    }
    try {
      const res = await saveAlarmConfig({ enabled });
      if (!res.success) {
        setNotification({ message: res.error || 'Failed to sync alarm state to cloud.', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Error syncing alarm state.', type: 'error' });
    }
  };

  const handleChangeVolume = async (vol: number) => {
    setAlarmVolume(vol);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cad_alarm_volume', vol.toString());
      window.dispatchEvent(new CustomEvent('cad-alarm-settings-changed'));
    }
    try {
      await saveAlarmConfig({ volume: vol });
    } catch (err) {}
  };

  const handleChangeStyle = async (style: string) => {
    setAlarmStyle(style);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cad_alarm_style', style);
      window.dispatchEvent(new CustomEvent('cad-alarm-settings-changed'));
    }
    try {
      await saveAlarmConfig({ style });
    } catch (err) {}
  };

  const handleSaveQueryToDb = async () => {
    try {
      const res = await saveAlarmConfig({ query: alarmQuery });
      if (res.success) {
        setNotification({ message: 'Filter query synchronized to cloud.', type: 'success' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {}
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotification({ message: 'Notifications are not supported in this browser.', type: 'error' });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotification({ message: 'Notification permission granted! OS-level background alerts are now active.', type: 'success' });
        // Trigger a test notification
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('🚨 Cadonce Notification Active', {
              body: 'Native background alerting is active and synchronized.',
              icon: '/favicon.ico',
              tag: 'system-test'
            });
          });
        } else {
          new Notification('🚨 Cadonce Notification Active', {
            body: 'Native background alerting is active and synchronized.',
            icon: '/favicon.ico',
            tag: 'system-test'
          });
        }
      } else {
        setNotification({ message: 'Notification permission denied. Custom alarms might not play in background.', type: 'error' });
      }
    } catch (err) {
      console.error('Failed to request notification permission:', err);
    }
  };

  const handleChangeQuery = (query: string) => {
    setAlarmQuery(query);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cad_gmail_alarm_query', query);
    }
  };

  const triggerTestAlarm = () => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('cad-trigger-test-alarm');
      window.dispatchEvent(event);
      setNotification({ message: 'Mock Opportunity Alarm Triggered!', type: 'success' });
    }
  };

  // Wallet State
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [isProcessingWallet, setIsProcessingWallet] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [organizationEscrows, setOrganizationEscrows] = useState<any[]>([]);
  const [designerEscrows, setDesignerEscrows] = useState<any[]>([]);

  // Transfer Payments Approvals Ledger State
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);

  const loadTransferPayments = async () => {
    try {
      const { getPendingTransferPaymentsAction } = await import('@/app/actions');
      const res = await getPendingTransferPaymentsAction();
      if (res.success) {
        setPendingTransfers(res.payments || []);
      }
    } catch (err) {
      console.error('Failed to load transfer payments:', err);
    }
  };

  const handleResolveTransferPayment = async (paymentId: string, approve: boolean) => {
    try {
      const { resolveTransferPaymentAction } = await import('@/app/actions');
      const res = await resolveTransferPaymentAction(paymentId, approve);
      if (res.success) {
        setNotification({
          message: `Payment ${approve ? 'approved' : 'rejected'} successfully!`,
          type: 'success'
        });
        loadTransferPayments();
      } else {
        throw new Error(res.error || 'Action failed');
      }
    } catch (err: any) {
      setNotification({ message: err.message, type: 'error' });
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'payment') {
      loadTransferPayments();
    }
  }, [isAuthenticated, activeTab]);

  // Currency State
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showGatewayDropdown, setShowGatewayDropdown] = useState(false);
  const currentCurrency = typeof window !== 'undefined' ? localStorage.getItem('cadonce_dashboard_currency') || '₹' : '₹';




  const masterGateways = [
    { type: 'Stripe', regions: ['US', 'IN', 'GB', 'EU', 'CA', 'AU'], recommended: ['US', 'CA', 'GB'] },
    { type: 'Razorpay', regions: ['IN'], recommended: ['IN'] },
    { type: 'Wise', regions: ['GB', 'EU', 'AU', 'SG'], recommended: ['GB', 'EU'] },
    { type: 'Payoneer', regions: ['GLOBAL'], recommended: ['GLOBAL'] },
    { type: 'Binance', regions: ['GLOBAL'], recommended: ['GLOBAL'] },
    { type: 'PayPal', regions: ['GLOBAL'], recommended: ['US', 'EU'] },
    { type: 'Airtm', regions: ['LATAM', 'GLOBAL'], recommended: ['LATAM'] },
    { type: 'Bank Account', regions: ['GLOBAL'], recommended: ['GLOBAL'] },
    { type: 'UPI (India)', regions: ['IN'], recommended: ['IN'] }
  ];

  useEffect(() => {
    // Basic Geolocation Detection
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_code) setCountryCode(data.country_code);
      })
      .catch(() => console.log("Geolocation fallback to US"));
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !dataLoading) return;

    const loadAllData = async () => {
      try {
        // Parallelize all data fetching to eliminate sequential bottlenecks
        const [settingsRes, designerRes, ledgerRes, escrowRes] = await Promise.all([
          getMySettings(),
          isDesigner ? getDesignerDb() : Promise.resolve({ designer: null }),
          getPointsLedger(),
          getMyEscrows()
        ]);

        // 1. Process Basic Settings
        const s = (settingsRes.success && settingsRes.settings) ? settingsRes.settings : {} as any;
        const paymentData = s.payment_methods || [];
        const systemConfig = paymentData.find((m: any) => m.id === 'system_config') || {};

        setGmailUser(s.gmailUser || '');
        setGmailAppPassword(s.gmailAppPassword || '');
        setSenderName(s.senderName || organizationName || user?.user_metadata?.organization_name || '');
        setGmailClientId(s.gmailClientId || '');
        setGmailClientSecret(s.gmailClientSecret || '');
        setOrganizationTitle(s.organizationName || organizationName || user?.user_metadata?.organization_name || '');
        setOwnerName(s.ownerName || user?.user_metadata?.full_name || '');
        setSmtpHost(systemConfig.smtpHost || s.smtpHost || 'smtp.gmail.com');
        setSmtpPort(systemConfig.smtpPort?.toString() || s.smtpPort?.toString() || '465');
        setSmtpSecure(systemConfig.smtpSecure !== undefined ? systemConfig.smtpSecure : (s.smtpSecure !== undefined ? s.smtpSecure : true));
        setPaymentMethods(paymentData.filter((m: any) => m.id !== 'system_config'));

        // Synchronize alarm configs from db virtual schema to client state & localStorage
        const dbAlarmEnabled = s.alarmEnabled === true || s.alarmEnabled === 'true';
        const dbAlarmQuery = s.alarmQuery || 'is:unread (from:fiverr.com OR from:upwork.com OR from:freelancer.com OR (from:binance.com "p2p") OR "new order" OR "placed an order" OR "sent you a message" OR "new inquiry")';
        const dbAlarmVolume = s.alarmVolume !== undefined ? Number(s.alarmVolume) : 80;
        const dbAlarmStyle = s.alarmStyle || 'telephone';

        setAlarmEnabled(dbAlarmEnabled);
        setAlarmQuery(dbAlarmQuery);
        setAlarmVolume(dbAlarmVolume);
        setAlarmStyle(dbAlarmStyle);

        if (typeof window !== 'undefined') {
          localStorage.setItem('cad_gmail_alarm_enabled', dbAlarmEnabled ? 'true' : 'false');
          localStorage.setItem('cad_gmail_alarm_query', dbAlarmQuery);
          localStorage.setItem('cad_alarm_volume', dbAlarmVolume.toString());
          localStorage.setItem('cad_alarm_style', dbAlarmStyle);
          window.dispatchEvent(new CustomEvent('cad-alarm-settings-changed'));
        }

        // 2. Process Designer Profile if applicable
        if (isDesigner && designerRes.designer) {
          const d = designerRes.designer;
          setDesignerData(d);
          setDesignerFullName(d.fullName || '');
          setDesignerSpecialty(d.specialty || '');
          // Robust Fallback for Country: Check Record -> Metadata -> System Config
          const persistentCountry = d.country || user?.user_metadata?.country || s.country || '';
          setDesignerCountry(persistentCountry);
          setDesignerSkills(d.skills || []);
          setWhatsapp(d.whatsapp || d.mobile || '');
          setAvatarUrl(d.avatarUrl || user?.user_metadata?.avatar_url || '');
          setPointsBalance(d.pointsBalance || 0);
        } else {
          // Client/Organization fallback or data missing
          setWhatsapp(s.whatsapp || user?.user_metadata?.whatsapp || user?.user_metadata?.mobile || '');
          setAvatarUrl(s.avatarUrl || user?.user_metadata?.avatar_url || '');
          setPointsBalance(s.pointsBalance || 0);
        }

        // 3. Process Ledger and Escrows
        if (ledgerRes.success) setLedger(ledgerRes.ledger || []);
        if (escrowRes.success) {
          setOrganizationEscrows(escrowRes.organizationEscrows || []);
          setDesignerEscrows(escrowRes.designerEscrows || []);
        }
      } catch (err) {
        console.error("Critical data load failed", err);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadAllData();
  }, [isAuthenticated, isDesigner, organizationName]);

  const addPaymentMethod = (type: string) => {
    const newMethod = {
      id: Date.now().toString(),
      type,
      value: '',
      note: type === 'PayPal' ? 'Extra 6% fees included' : ''
    };
    setPaymentMethods([...paymentMethods, newMethod]);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(paymentMethods.filter(m => m.id !== id));
  };

  const updateMethodValue = (id: string, value: string) => {
    setPaymentMethods(paymentMethods.map(m => m.id === id ? { ...m, value } : m));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isDesigner && designerData?.id) {
        // Designer Profile Update
        const { updateDesigner } = await import('@/app/actions');
        const res = await updateDesigner(designerData.id, {
          fullName: designerFullName,
          specialty: designerSpecialty,
          country: designerCountry,
          skills: designerSkills,
          mobile: whatsapp,
          avatarUrl: avatarUrl
        });

        // Add Razorpay Route Sync for Designers
        const bankMethod = paymentMethods.find((m: any) => m.type.toLowerCase().includes('bank account') || m.type.toLowerCase().includes('upi'));
        if (bankMethod && (bankMethod.value || bankMethod.routing)) {
          try {
            const onboardRes = await fetch('/api/onboard-designer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: designerFullName,
                contact: whatsapp,
                bankAccount: {
                  name: bankMethod.holder || designerFullName,
                  ifsc: bankMethod.routing || '',
                  account_number: bankMethod.value || '',
                }
              })
            });
            const data = await onboardRes.json();
            if (data.success) {
               console.log('Successfully linked Razorpay Account ID:', data.razorpay_account_id);
            } else {
               console.error('Razorpay Linking Failed:', data.error);
            }
          } catch (e) {
            console.error('Failed to onboard designer with Razorpay', e);
          }
        }

        // Also save generic settings (like paymentMethods) for Designers
        const { saveAllSettings } = await import('@/app/actions');
        const formData = new FormData();
        formData.append('whatsapp', whatsapp);
        formData.append('avatarUrl', avatarUrl);
        formData.append('country', designerCountry);
        formData.append('pointsBalance', pointsBalance.toString());
        await saveAllSettings(formData, paymentMethods);

        if (res.success) {
          setNotification({ message: 'Profile updated successfully!', type: 'success' });
        } else {
          setNotification({ message: res.error || 'Failed to update profile.', type: 'error' });
        }
      } else {
        // Organization Settings Update
        const { saveAllSettings } = await import('@/app/actions');

        const formData = new FormData();
        formData.append('gmailUser', gmailUser);
        formData.append('gmailAppPassword', gmailAppPassword);
        formData.append('senderName', senderName);
        formData.append('gmailClientId', gmailClientId);
        formData.append('gmailClientSecret', gmailClientSecret);
        formData.append('smtpHost', smtpHost);
        formData.append('smtpPort', smtpPort);
        formData.append('smtpSecure', smtpSecure.toString());
        formData.append('organizationName', organizationTitle);
        formData.append('ownerName', ownerName);
        formData.append('whatsapp', whatsapp);
        formData.append('avatarUrl', avatarUrl);
        formData.append('country', designerCountry);
        formData.append('pointsBalance', pointsBalance.toString());

        const res = await saveAllSettings(formData, paymentMethods);

        if (res.success) {
          setNotification({ message: 'Configuration saved successfully!', type: 'success' });
        } else {
          setNotification({ message: res.error || 'Failed to save settings.', type: 'error' });
        }
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Error saving settings', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete my account') {
      setNotification({ message: 'Please type the confirmation text correctly', type: 'error' });
      return;
    }

    setIsDeleting(true);
    try {
      const { deleteMyAccount } = await import('@/app/actions');
      const res = await deleteMyAccount();
      if (res.success) {
        logout();
      } else {
        setNotification({ message: res.error || 'Failed to delete account', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Error deleting account', type: 'error' });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Smart Filtering Logic
  const filteredGateways = masterGateways
    .filter(g =>
      g.type.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !paymentMethods.some(pm => pm.type === g.type)
    )
    .sort((a, b) => {
      const aRec = a.recommended.includes(countryCode) || a.recommended.includes('GLOBAL');
      const bRec = b.recommended.includes(countryCode) || b.recommended.includes('GLOBAL');
      return aRec === bRec ? 0 : aRec ? -1 : 1;
    });

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#0c0a04] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
           <div className="w-16 h-16 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin shadow-[0_0_30px_rgba(252,224,3,0.2)]"></div>
           <div className="absolute inset-0 flex items-center justify-center">
             <span className="material-symbols-outlined text-yellow-400 text-xl animate-pulse">settings</span>
           </div>
        </div>
        <h2 className="text-white font-headline font-black text-xl uppercase italic tracking-tighter mb-2 animate-in fade-in slide-in-from-bottom-2 duration-700">Initializing Workstation</h2>
        <p className="text-neutral-500 text-[9px] font-black uppercase tracking-[0.3em]">Synchronizing API Protocols & Encrypted Identity</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="bg-background text-on-surface font-body min-h-screen pb-24 selection:bg-primary-fixed-dim selection:text-on-primary-fixed animate-in fade-in duration-700">
        {/* Notification Toast */}
        {notification && (
          <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 transition-all duration-300 ${notification.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-red-500/20 border-red-500/30 text-red-400'
            }`}>
            <span className="material-symbols-outlined text-sm">
              {notification.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="text-xs font-bold uppercase tracking-tight">{notification.message}</span>
          </div>
        )}

        {/* Top Header */}
        <header className="fixed top-0 z-50 w-full bg-background/95 backdrop-blur-xl flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-3">
            {/* Spacing for universal back button in TopAppBar */}
            <div className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-black text-white uppercase">{organizationName || 'CAD Organization'}</div>
              <div className="text-[10px] text-neutral-500">{user?.email}</div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-24 px-6 md:px-8 max-w-7xl mx-auto pb-32">
          <div className="flex flex-col lg:flex-row gap-12 text-left">
            {/* Sidebar / Left Column */}
            <div className="w-full lg:w-1/4 shrink-0 space-y-8 lg:sticky lg:top-32 h-fit">
              <section className="space-y-2">
                <h2 className="text-[28px] font-black uppercase tracking-tighter leading-tight text-white">
                  {loading ? '...' : (isDesigner ? 'Designer\nProfile' : 'Organization\nDashboard')}
                </h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">
                  {isDesigner ? 'Personal Workstation Credentials' : 'Command Center & API Protocol'}
                </p>
              </section>

              {/* Tab Navigation */}
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 space-y-6">
                {[
                  { id: 'user', label: 'User Setting', icon: 'person', desc: 'Profile & Global Preferences' },
                  { id: 'email', label: 'Opportunity Alarm', icon: 'notifications_active', desc: 'Gmail Poller & Custom Alarm' },
                  { id: 'payment', label: 'Payment Method', icon: 'payments', desc: 'Billing Gateways & Addresses' },
                  { id: 'wallet', label: 'Wallet & Rewards', icon: 'wallet', desc: 'Ledger, Escrow & Withdrawals' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all group ${activeTab === tab.id
                        ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10'
                        : 'text-zinc-500 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded flex items-center justify-center border ${activeTab === tab.id ? 'bg-black/10 border-transparent' : 'border-zinc-800 group-hover:border-zinc-700'}`}>
                        <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-tight leading-none mb-1">{tab.label}</p>
                        <p className={`text-[8px] font-bold ${activeTab === tab.id ? 'text-black/60' : 'text-zinc-600'}`}>{tab.desc}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Content Column */}
            <div className="flex-1 space-y-8">
              <form onSubmit={handleSubmit} className="space-y-8 relative">
            {activeTab === 'user' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Account Profile Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 md:p-10 relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#242424 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  <div className="relative z-10 flex flex-col md:flex-row gap-10">
                    {/* Premium Profile Image Uploader */}
                    <div className="w-32 h-32 shrink-0 mx-auto md:mx-0">
                      <div className="w-32 h-32 rounded-full border border-zinc-800 p-1 bg-zinc-900/50 relative overflow-hidden group/avatar">
                        <div className="w-full h-full rounded-full bg-zinc-800/40 flex items-center justify-center overflow-hidden relative">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover grayscale group-hover/avatar:grayscale-0 transition-all duration-500" />
                          ) : (
                            <span className="material-symbols-outlined text-4xl text-zinc-600">person</span>
                          )}

                          {uploadingImage && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                              <span className="animate-spin material-symbols-outlined text-white">progress_activity</span>
                            </div>
                          )}
                        </div>

                        <label className="absolute inset-0 cursor-pointer flex items-center justify-center rounded-full bg-black/0 hover:bg-black/40 transition-all opacity-0 hover:opacity-100 group-hover/avatar:opacity-100 z-20">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingImage(true);
                                try {
                                  const resizedBlob = await resizeImage(file, 200, 200);
                                  const resizedFile = new File([resizedBlob], 'profile.jpg', { type: 'image/jpeg' });
                                  const { uploadProfileImage } = await import('@/app/actions');
                                  const formData = new FormData();
                                  formData.append('file', resizedFile);
                                  const res = await uploadProfileImage(formData);
                                  if (res.success && res.url) {
                                    const freshUrl = `${res.url}?t=${Date.now()}`;
                                    setAvatarUrl(freshUrl);
                                    const { supabase } = await import('@/lib/supabase');
                                    await supabase.auth.updateUser({ data: { avatar_url: freshUrl } });
                                    setNotification({ message: 'Profile image optimized and saved!', type: 'success' });
                                  } else {
                                    throw new Error(res.error || 'Upload rejected by server');
                                  }
                                } catch (err: any) {
                                  console.error('Resize/Upload failed:', err);
                                  setNotification({ message: `Optimization failed: ${err.message}`, type: 'error' });
                                } finally {
                                  setUploadingImage(false);
                                }
                              }
                            }}
                          />
                          <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                      {isDesigner ? (
                        <div className="md:col-span-2 space-y-1.5">
                          <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Professional Identity</label>
                          <input
                            value={designerFullName}
                            onChange={(e) => setDesignerFullName(e.target.value)}
                            className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                            placeholder="Your Full Name"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Organization Name</label>
                            <input
                              value={organizationTitle}
                              onChange={(e) => setOrganizationTitle(e.target.value)}
                              className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                              placeholder="Organization"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Owner Name</label>
                            <input
                              value={ownerName}
                              onChange={(e) => setOwnerName(e.target.value)}
                              className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                              placeholder="Legal Name"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Official WhatsApp</label>
                        <input
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                          placeholder="+91 00000 00000"
                        />
                      </div>
                      <div className="space-y-1.5 opacity-60">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Registered Email</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                            <span className="material-symbols-outlined text-sm">lock</span>
                          </div>
                          <input
                            className="w-full bg-zinc-900/20 border border-zinc-800/50 rounded-lg py-3 pl-12 pr-4 text-sm font-medium text-zinc-500 cursor-not-allowed"
                            readOnly
                            value={user?.email || ''}
                          />
                        </div>
                      </div>
                      
                      {/* Log Out Button inside User Profile Account Card */}
                      <div className="md:col-span-2 pt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => logout()}
                          className="px-6 py-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all shadow-[0_4px_15px_rgba(239,68,68,0.1)]"
                        >
                          <span className="material-symbols-outlined text-sm">logout</span>
                          Sign Out of Workstation
                        </button>
                      </div>
                    </div>
                  </div>

                  {isDesigner && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest mb-3">Skills & Expertise</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {designerSkills.map((skill: string) => (
                          <div key={skill} className="group/skill relative">
                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold text-white uppercase tracking-tighter flex items-center gap-2">
                              {skill}
                              <button
                                type="button"
                                onClick={() => setDesignerSkills(designerSkills.filter(s => s !== skill))}
                                className="opacity-40 hover:opacity-100 hover:text-red-400 transition-all"
                              >
                                <span className="material-symbols-outlined text-[12px]">close</span>
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newSkill.trim() && !designerSkills.includes(newSkill.trim())) {
                                setDesignerSkills([...designerSkills, newSkill.trim()]);
                                setNewSkill('');
                              }
                            }
                          }}
                          placeholder="Add Skill (Press Enter)"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white focus:ring-1 focus:ring-yellow-400 outline-none transition-all uppercase tracking-widest"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newSkill.trim() && !designerSkills.includes(newSkill.trim())) {
                              setDesignerSkills([...designerSkills, newSkill.trim()]);
                              setNewSkill('');
                            }
                          }}
                          className="p-2 bg-yellow-400 text-black rounded-xl hover:scale-105 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* DASHBOARD DISPLAY CARD */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 relative">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Dashboard Display</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Configure financial metric conversion and visibility</p>
                    </div>
                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800/30">
                      <span className="material-symbols-outlined text-yellow-400">trending_up</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-6">
                    <div className="mb-4">
                      <p className="text-[10px] text-zinc-300 font-black uppercase">Primary Currency</p>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Used for all global totals</p>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                        className="w-full flex items-center justify-between px-5 py-3 bg-black border border-zinc-800 hover:border-yellow-400/30 rounded-lg transition-all"
                      >
                        <span className="text-sm font-bold text-white">
                          {GLOBAL_CURRENCIES.find(c => c.symbol === currentCurrency)?.code || 'CURRENCY'} ({currentCurrency}) - {GLOBAL_CURRENCIES.find(c => c.symbol === currentCurrency)?.label}
                        </span>
                        <span className="material-symbols-outlined text-yellow-400">expand_more</span>
                      </button>

                      {showCurrencyDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden p-3 backdrop-blur-3xl animate-in zoom-in-95 duration-200">
                          <div className="relative mb-3">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-500 text-sm">search</span>
                            <input
                              type="text"
                              placeholder="Search global currencies..."
                              value={currencySearchQuery}
                              onChange={(e) => setCurrencySearchQuery(e.target.value)}
                              className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400/50 transition-all font-mono"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                            {GLOBAL_CURRENCIES.filter(c => 
                              c.label.toLowerCase().includes(currencySearchQuery.toLowerCase()) || 
                              c.code.toLowerCase().includes(currencySearchQuery.toLowerCase()) ||
                              c.symbol.includes(currencySearchQuery)
                            ).map((curr) => (
                              <button
                                key={curr.code}
                                type="button"
                                onClick={() => {
                                  localStorage.setItem('cadonce_dashboard_currency', curr.symbol);
                                  setNotification({ message: `Protocol Updated: Dashboard synchronized to ${curr.code}`, type: 'success' });
                                  setTimeout(() => window.location.reload(), 1000);
                                }}
                                className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center justify-between group ${currentCurrency === curr.symbol ? 'bg-yellow-400 text-black' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs font-black ${currentCurrency === curr.symbol ? 'text-black' : 'text-yellow-400'}`}>{curr.symbol}</span>
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-tight">{curr.code}</p>
                                    <p className={`text-[8px] font-bold ${currentCurrency === curr.symbol ? 'text-black/60' : 'text-zinc-600'}`}>{curr.label}</p>
                                  </div>
                                </div>
                                {currentCurrency === curr.symbol && <span className="material-symbols-outlined text-sm">check_circle</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* Designer Payout Information Section - Only for Designers */}
                {isDesigner && (
                  <div className="group relative mt-8 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 hover:border-yellow-400/20 transition-all duration-500 overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity z-10 text-yellow-400">
                      <span className="material-symbols-outlined text-7xl">payments</span>
                    </div>

                    <div className="relative z-20">
                      <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Payout Settlement</h3>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Where you receive your earnings</p>
                      
                      <div className="mt-8 p-6 bg-yellow-400/5 rounded-xl border border-yellow-400/10 mb-8">
                        <p className="text-[10px] text-yellow-400/80 font-black leading-relaxed uppercase tracking-widest flex items-center gap-3">
                          <span className="material-symbols-outlined text-sm">info</span>
                          Manage your settlement protocols in the "Payment Method" tab to ensure synchronized global payouts.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('payment')}
                        className="w-full py-4 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] font-black text-white uppercase tracking-widest hover:border-yellow-400/50 transition-all flex items-center justify-center gap-3"
                      >
                        <span className="material-symbols-outlined text-sm">settings_suggest</span>
                        Configure Receiving Protocols
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Opportunity Alarm Protocol Settings Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity z-10 text-yellow-400">
                    <span className="material-symbols-outlined text-8xl">notifications_active</span>
                  </div>

                  <div className="relative z-20">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Live Opportunity Alarm</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Configure high-priority digital ringtone alarm alerts</p>

                    <div className="mt-8 space-y-6">
                      {/* Alarm Toggle */}
                      <div className="flex items-center justify-between p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                        <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-wider mb-1">Enable High-Priority Phone Ringtone</p>
                          <p className="text-[9px] text-zinc-500 leading-normal max-w-md font-medium">
                            If enabled, when a new unread email matching your filter query lands in your Gmail, a loud, looping digital phone ringtone will play until you silence it.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={alarmEnabled}
                            onChange={(e) => handleToggleAlarm(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400 peer-checked:after:bg-black peer-checked:after:border-transparent"></div>
                        </label>
                      </div>

                      {/* Test Button */}
                      <div className="flex items-center justify-between p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                        <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-wider mb-1">Test Live Sound Synthesizers</p>
                          <p className="text-[9px] text-zinc-500 leading-normal max-w-md font-medium">
                            Verifies that Web Audio API synthesizer oscillators can bypass autoplay restrictions and play properly in your browser environment.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={triggerTestAlarm}
                          className="px-5 py-3 bg-zinc-900 border border-zinc-800 hover:border-yellow-400/50 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm text-yellow-400">ring_volume</span>
                          Test Alarms
                        </button>
                      </div>

                      {/* Alarm Volume Slider */}
                      <div className="flex flex-col p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-wider mb-1">Alarm Tone Volume</p>
                            <p className="text-[9px] text-zinc-500 leading-normal max-w-md font-medium">
                              Adjust the digital amplitude gain output of the sound oscillators (scaled up to 100% full scale digital sound).
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-yellow-400 text-sm">
                              {alarmVolume === 0 ? 'volume_off' : alarmVolume < 33 ? 'volume_mute' : alarmVolume < 66 ? 'volume_down' : 'volume_up'}
                            </span>
                            <span className="text-white text-xs font-mono font-black">{alarmVolume}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[9px] font-black text-zinc-600 uppercase">Mute</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={alarmVolume}
                            onChange={(e) => handleChangeVolume(Number(e.target.value))}
                            className="flex-1 accent-yellow-400 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none outline-none focus:ring-1 focus:ring-yellow-400/30"
                          />
                          <span className="text-[9px] font-black text-yellow-400 uppercase">Max Volume</span>
                        </div>
                      </div>

                      {/* Sound Style Selector */}
                      <div className="flex flex-col p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl gap-4">
                        <div>
                          <p className="text-[11px] font-black text-white uppercase tracking-wider mb-1">Alarm Alert Sound Style</p>
                          <p className="text-[9px] text-zinc-500 leading-normal max-w-md font-medium">
                            Choose between different wave formats. Triangles and Sawtooths are naturally much louder, sharper, and piercing—ensuring you hear them anywhere.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'telephone', label: 'Classic Phone', desc: 'Mild beating sine waves' },
                            { id: 'buzzer', label: 'Digital Buzzer', desc: 'Loud alarm clock triangle' },
                            { id: 'siren', label: 'Industrial Siren', desc: 'Extremely loud sweeping sweep' }
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleChangeStyle(item.id)}
                              className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left group ${
                                alarmStyle === item.id 
                                  ? 'bg-yellow-400 text-black border-transparent shadow-lg shadow-yellow-400/10' 
                                  : 'bg-black/40 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white'
                              }`}
                            >
                              <p className="text-[10px] font-black uppercase tracking-tight mb-1">{item.label}</p>
                              <p className={`text-[8px] font-bold ${alarmStyle === item.id ? 'text-black/60' : 'text-zinc-500'}`}>{item.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gmail Query Syntax Field */}
                      <div className="space-y-2">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Gmail Search Syntax Filter Query</label>
                        <textarea
                          value={alarmQuery}
                          onChange={(e) => handleChangeQuery(e.target.value)}
                          onBlur={handleSaveQueryToDb}
                          rows={3}
                          className="w-full bg-black/60 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono text-[11px] focus:border-yellow-400 outline-none transition-all leading-relaxed resize-y"
                          placeholder="is:unread (from:fiverr.com OR from:upwork.com)"
                        />
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider leading-relaxed">
                          ⚡ Matches unread emails from Fiverr, Upwork, and generic Freelancer order keywords. Customize to track specific clients or platforms.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Background Alerts & Screen Keep-Alive Protocol */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity z-10 text-yellow-400">
                    <span className="material-symbols-outlined text-8xl">sensors_krx</span>
                  </div>

                  <div className="relative z-20">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Background Alerting & Wake-Lock Protocol</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Ensure alarms work when phone is idle, screen is off, or using other apps</p>

                    <div className="mt-8 space-y-6">
                      {/* Notification Permissions Checker */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-white uppercase tracking-wider">HTML5 Native System Notifications</p>
                          <p className="text-[9px] text-zinc-500 leading-normal max-w-md font-medium">
                            Allows Cadonce to pop up system banner alerts, vibrate your phone, and trigger standard system sounds even if minimized or inside another application.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[8px] font-black uppercase text-zinc-400">Status:</span>
                            {notificationPermission === 'granted' ? (
                              <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-green-400"></span> Granted
                              </span>
                            ) : notificationPermission === 'denied' ? (
                              <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-red-500"></span> Blocked / Denied
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-[8px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-yellow-400 animate-pulse"></span> Action Required
                              </span>
                            )}
                          </div>
                        </div>

                        {notificationPermission !== 'granted' && (
                          <button
                            type="button"
                            onClick={handleRequestNotificationPermission}
                            className="px-5 py-3 bg-yellow-400 hover:brightness-110 text-black rounded-lg font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shrink-0"
                          >
                            Grant Permission
                          </button>
                        )}
                      </div>

                      {/* Screen Keep-Alive (Wake Lock) Indicator */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl gap-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-white uppercase tracking-wider">Screen Keep-Alive (Wake Lock)</p>
                          <p className="text-[9px] text-zinc-500 leading-normal max-w-md font-medium">
                            Automatically prevents your phone or PC from turning the screen off or entering deep sleep while the Opportunity Alarm is enabled. Keeps the browser alive for instant monitoring.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[8px] font-black uppercase text-zinc-400">Status:</span>
                            {alarmEnabled ? (
                              typeof window !== 'undefined' && 'wakeLock' in navigator ? (
                                <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                                  <span className="size-1.5 rounded-full bg-green-400 animate-ping"></span> Active Keep-Alive
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[8px] font-black rounded uppercase tracking-wider">
                                  Unsupported by Browser
                                </span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 text-[8px] font-black rounded uppercase tracking-wider">
                                Inactive (Enable Alarm to Activate)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Reliability & Native Setup Guide */}
                      <div className="p-6 bg-zinc-950/40 border border-zinc-800/50 rounded-xl space-y-4">
                        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                          <span className="material-symbols-outlined text-yellow-400 text-sm">settings_phone</span>
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Mobile Device Native Optimization Protocol</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-300 uppercase">1. Install as Standalone Native-Style Web App (PWA)</p>
                            <p className="text-[8px] text-zinc-500 leading-relaxed font-semibold uppercase tracking-wider pl-3">
                              Android/iOS: Tap the browser menu (or share button) and select <span className="text-white">"Add to Home Screen"</span> or <span className="text-white">"Install App"</span>. Running Cadonce from your home screen grants it persistent, isolated native operating system scheduling.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-300 uppercase">2. Disable OS Battery Optimization / Throttling</p>
                            <p className="text-[8px] text-zinc-500 leading-relaxed font-semibold uppercase tracking-wider pl-3">
                              Android: Long press the installed Cadonce (or Chrome) app icon, go to <span className="text-white">App Info &rarr; Battery</span>, and set to <span className="text-white">"Unrestricted"</span>. This prevents Android from stopping our poller when your phone is locked.
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-zinc-300 uppercase">3. Allow Background Activity & Sound</p>
                            <p className="text-[8px] text-zinc-500 leading-relaxed font-semibold uppercase tracking-wider pl-3">
                              Ensure your phone is NOT set to "Silent" or "Do Not Disturb" (or add Cadonce as an exception) so that both our synthesizer audio and native system notification sound ring successfully.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Google Cloud API / OAuth Settings Card */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity z-10 text-yellow-400">
                    <span className="material-symbols-outlined text-8xl">api</span>
                  </div>

                  <div className="relative z-20">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">Gmail OAuth Integration</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Link your personal Google Cloud API credentials</p>

                    <div className="mt-8 space-y-6">
                      {/* Connection status display */}
                      {gmailUser ? (
                        <div className="p-5 bg-green-500/5 border border-green-500/10 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3.5">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <div>
                              <p className="text-[10px] font-black uppercase text-white leading-none mb-1">Gmail API Connected</p>
                              <p className="text-[9px] font-mono text-zinc-500">{gmailUser}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setGmailUser('');
                              setNotification({ message: 'Gmail disconnected. Save changes to commit.', type: 'success' });
                            }}
                            className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:underline"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <div className="p-5 bg-yellow-400/5 border border-yellow-400/10 rounded-xl space-y-4">
                          <div className="flex gap-3">
                            <span className="material-symbols-outlined text-yellow-400 text-lg shrink-0 mt-0.5">info</span>
                            <p className="text-[9px] text-zinc-400 uppercase leading-relaxed font-bold">
                              Google OAuth API Integration is required. Enter your Google Client credentials below, click "Commit Changes" at the bottom, then click "Connect Gmail Account".
                            </p>
                          </div>
                          {gmailClientId && gmailClientSecret && (
                            <Link
                              href="/api/gmail/auth"
                              className="inline-flex items-center gap-2 px-5 py-3 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-95 transition-all shadow-md shadow-yellow-400/10"
                            >
                              <span className="material-symbols-outlined text-xs">login</span>
                              Connect Gmail Account
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Google Credentials */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Gmail Client ID</label>
                          <input
                            value={gmailClientId}
                            onChange={(e) => setGmailClientId(e.target.value)}
                            className="w-full bg-black/60 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono text-xs focus:border-yellow-400 outline-none transition-all"
                            placeholder="your-client-id.apps.googleusercontent.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Gmail Client Secret</label>
                          <input
                            type="password"
                            value={gmailClientSecret}
                            onChange={(e) => setGmailClientSecret(e.target.value)}
                            className="w-full bg-black/60 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono text-xs focus:border-yellow-400 outline-none transition-all"
                            placeholder="••••••••••••••••••••••••••••••••"
                          />
                        </div>
                      </div>

                      {/* Google Cloud Console Instructions alert snippet */}
                      <div className="p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-3">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Configuration Protocol & Setup Guide</h4>
                        <ol className="text-[9px] text-zinc-500 leading-relaxed font-semibold uppercase tracking-wider space-y-1.5 list-decimal list-inside">
                          <li>Create a new project at <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-yellow-400 underline">Google Cloud Console</a>.</li>
                          <li>Enable the <span className="text-white font-bold">Gmail API</span> in the API Library.</li>
                          <li>Go to <span className="text-white font-bold">OAuth Consent Screen</span>, set User Type to <span className="text-white font-bold">External</span>, and add test users.</li>
                          <li>Add scope: <span className="text-yellow-400">.../auth/gmail.readonly</span>.</li>
                          <li>Create credentials of type <span className="text-white font-bold">OAuth Client ID</span> for a Web Application.</li>
                          <li>Add Authorized Redirect URI: <span className="text-yellow-400 font-mono lower-case">https://www.cadonce.com/api/gmail/callback</span> (or your local host address).</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Unified Payment Protocols Header */}
                <section className="space-y-4">
                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-8 relative group shadow-xl">
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-yellow-400 shadow-lg">
                          <span className="material-symbols-outlined">payments</span>
                        </div>
                        <div>
                          <h2 className="text-xl font-black tracking-tight text-white uppercase">Payment Protocols</h2>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Select & Configure Gateways</p>
                        </div>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowGatewayDropdown(!showGatewayDropdown)}
                          className="flex items-center gap-3 px-6 py-3 bg-yellow-400 text-black rounded-lg font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Add Protocol
                        </button>

                        {showGatewayDropdown && (
                          <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden p-3 backdrop-blur-3xl animate-in zoom-in-95 duration-200">
                            <div className="relative mb-3">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-500 text-sm">search</span>
                              <input
                                type="text"
                                placeholder="Search Protocols..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400/50 transition-all font-mono"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                              {/* Unified Search Results */}
                              {isDesigner ? (
                                // Designer Specific Methods
                                [
                                  { type: 'UPI (India)', icon: 'bolt', recommended: true },
                                  { type: 'Bank Account', icon: 'account_balance', recommended: true }
                                ]
                                  .filter(g =>
                                    g.type.toLowerCase().includes(searchQuery.toLowerCase()) &&
                                    !paymentMethods.some(pm => pm.type === g.type)
                                  )
                                  .map((g: any) => (
                                    <button
                                      key={g.type}
                                      type="button"
                                      onClick={() => addPaymentMethod(g.type)}
                                      className="w-full text-left px-4 py-3 hover:bg-yellow-400 hover:text-black rounded-lg transition-all flex items-center justify-between group"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-lg">{g.icon}</span>
                                        <p className="text-[10px] font-black uppercase tracking-tight">{g.type}</p>
                                      </div>
                                      <span className="text-[6px] font-black opacity-60 uppercase tracking-widest group-hover:text-black/60">Recommended</span>
                                    </button>
                                  ))
                              ) : (
                                // Organization Standard Methods
                                [
                                  { type: 'Binance', icon: 'currency_bitcoin', recommended: true },
                                  { type: 'Payoneer', icon: 'language', recommended: true },
                                  { type: 'PayPal', icon: 'payments', recommended: true },
                                  { type: 'Airtm', icon: 'cloud', recommended: true },
                                  { type: 'Bank Account', icon: 'account_balance', recommended: false },
                                  ...masterGateways.filter(g => !['Binance', 'Payoneer', 'PayPal', 'Airtm', 'Bank Account'].includes(g.type))
                                ]
                                  .filter(g =>
                                    g.type.toLowerCase().includes(searchQuery.toLowerCase()) &&
                                    !paymentMethods.some(pm => pm.type === g.type)
                                  )
                                  .map((g: any) => {
                                    const isRec = g.recommended === true || (g.recommended && (g.recommended.includes(countryCode) || g.recommended.includes('GLOBAL')));
                                    return (
                                      <button
                                        key={g.type}
                                        type="button"
                                        onClick={() => addPaymentMethod(g.type)}
                                        className="w-full text-left px-4 py-3 hover:bg-yellow-400 hover:text-black rounded-lg transition-all flex items-center justify-between group"
                                      >
                                        <div className="flex items-center gap-3">
                                           {g.type === 'PayPal' ? (
                                             <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px] fill-current" viewBox="0 0 16 16">
                                               <path d="M14.06 3.713c.12-1.071-.093-1.832-.702-2.526C12.628.356 11.312 0 9.626 0H4.734a.7.7 0 0 0-.691.59L2.005 13.509a.42.42 0 0 0 .415.486h2.756l-.202 1.28a.628.628 0 0 0 .62.726H8.14c.429 0 .793-.31.862-.731l.025-.13.48-3.043.03-.164.001-.007a.35.35 0 0 1 .348-.297h.38c1.266 0 2.425-.256 3.345-.91q.57-.403.993-1.005a4.94 4.94 0 0 0 .88-2.195c.242-1.246.13-2.356-.57-3.154a2.7 2.7 0 0 0-.76-.59l-.094-.061ZM6.543 8.82a.7.7 0 0 1 .321-.079H8.3c2.82 0 5.027-1.144 5.672-4.456l.003-.016q.326.186.548.438c.546.623.679 1.535.45 2.71-.272 1.397-.866 2.307-1.663 2.874-.802.57-1.842.815-3.043.815h-.38a.87.87 0 0 0-.863.734l-.03.164-.48 3.043-.024.13-.001.004a.35.35 0 0 1-.348.296H5.595a.106.106 0 0 1-.105-.123l.208-1.32z"/>
                                             </svg>
                                           ) : g.type === 'Binance' ? (
                                             <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                                               <path d="M11.99 0l7.35 7.35-2.72 2.72-4.63-4.64-4.64 4.64-2.71-2.72L11.99 0zm0 14.65l4.64 4.64 2.71-2.72 2.72 2.72-7.35 7.35-7.35-7.35 2.72-2.72 2.71 2.72 4.64-4.64zm-9.27-2.65l2.71 2.72L5.41 12l-2.71-2.71-2.71-2.72L0 12l2.72 0zm18.56 0l-2.72-2.71L18.56 12l-2.71 2.72 2.72 2.71L24 12l-2.72-2.65zM12 9.27l2.72 2.72L12 14.71l-2.72-2.72L12 9.27z"/>
                                             </svg>
                                           ) : g.type === 'Wise' ? (
                                             <svg xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24">
                                               <path d="M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z"/>
                                             </svg>
                                           ) : (
                                             <span className="material-symbols-outlined text-lg">
                                               {g.icon || (g.type === 'Stripe' ? 'credit_card' : 'account_balance_wallet')}
                                             </span>
                                           )}
                                          <p className="text-[10px] font-black uppercase tracking-tight">{g.type}</p>
                                        </div>
                                        {isRec && <span className="text-[6px] font-black opacity-60 uppercase tracking-widest group-hover:text-black/60">Recommended</span>}
                                      </button>
                                    );
                                  })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active Methods List */}
                  <div className="grid grid-cols-1 gap-6">
                    {paymentMethods.length === 0 && (
                      <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
                        <span className="material-symbols-outlined text-zinc-700 text-5xl mb-4">account_balance_wallet</span>
                        <p className="text-[12px] font-bold text-zinc-500 uppercase tracking-[0.2em]">No Active Gateways</p>
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mt-2">Add a gateway above to begin configuration</p>
                      </div>
                    )}
                    {paymentMethods.map((method) => {
                      const isBank = method.type.toLowerCase().includes('bank account');

                      return (
                        <div key={method.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-8 relative group hover:border-yellow-400/20 transition-all">
                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removePaymentMethod(method.id)}
                            className="absolute top-6 right-6 w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all z-20 shadow-lg"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>

                          <div className="flex flex-col md:flex-row gap-8">
                            <div className="w-16 h-16 bg-black border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-yellow-400 transition-colors shrink-0">
                              {method.type === 'PayPal' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current" viewBox="0 0 16 16">
                                  <path d="M14.06 3.713c.12-1.071-.093-1.832-.702-2.526C12.628.356 11.312 0 9.626 0H4.734a.7.7 0 0 0-.691.59L2.005 13.509a.42.42 0 0 0 .415.486h2.756l-.202 1.28a.628.628 0 0 0 .62.726H8.14c.429 0 .793-.31.862-.731l.025-.13.48-3.043.03-.164.001-.007a.35.35 0 0 1 .348-.297h.38c1.266 0 2.425-.256 3.345-.91q.57-.403.993-1.005a4.94 4.94 0 0 0 .88-2.195c.242-1.246.13-2.356-.57-3.154a2.7 2.7 0 0 0-.76-.59l-.094-.061ZM6.543 8.82a.7.7 0 0 1 .321-.079H8.3c2.82 0 5.027-1.144 5.672-4.456l.003-.016q.326.186.548.438c.546.623.679 1.535.45 2.71-.272 1.397-.866 2.307-1.663 2.874-.802.57-1.842.815-3.043.815h-.38a.87.87 0 0 0-.863.734l-.03.164-.48 3.043-.024.13-.001.004a.35.35 0 0 1-.348.296H5.595a.106.106 0 0 1-.105-.123l.208-1.32z"/>
                                </svg>
                              ) : method.type === 'Binance' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current text-[#F3BA2F]" viewBox="0 0 24 24">
                                  <path d="M11.99 0l7.35 7.35-2.72 2.72-4.63-4.64-4.64 4.64-2.71-2.72L11.99 0zm0 14.65l4.64 4.64 2.71-2.72 2.72 2.72-7.35 7.35-7.35-7.35 2.72-2.72 2.71 2.72 4.64-4.64zm-9.27-2.65l2.71 2.72L5.41 12l-2.71-2.71-2.71-2.72L0 12l2.72 0zm18.56 0l-2.72-2.71L18.56 12l-2.71 2.72 2.72 2.71L24 12l-2.72-2.65zM12 9.27l2.72 2.72L12 14.71l-2.72-2.72L12 9.27z"/>
                                </svg>
                              ) : method.type === 'Wise' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 fill-current text-[#9FE870]" viewBox="0 0 24 24">
                                  <path d="M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z"/>
                                </svg>
                              ) : (
                                <span className="material-symbols-outlined text-3xl">
                                  {method.type === 'Payoneer' ? 'language' :
                                    method.type.includes('UPI') ? 'bolt' :
                                      isBank ? 'account_balance' : 'account_balance_wallet'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 space-y-6">
                              <div>
                                <label className="text-[10px] font-black text-white tracking-[0.2em] uppercase block mb-1">{method.type}</label>
                                <div className="flex gap-2">
                                  {method.type === 'PayPal' && <span className="text-[8px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded uppercase">Protocol Fee: +6%</span>}
                                  {method.type === 'Binance' && <span className="text-[8px] font-black bg-green-500/10 text-green-400 px-2 py-0.5 rounded uppercase">Protocol Fee: 0%</span>}
                                </div>
                              </div>

                              {isBank ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Account Holder</p>
                                    <input
                                      value={method.holder || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, holder: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="Full Name"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Account Number</p>
                                    <input
                                      value={method.value || ''}
                                      onChange={(e) => updateMethodValue(method.id, e.target.value)}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="Account #"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">
                                      {method.type.includes('USA') ? 'Routing Number' :
                                        method.type.includes('UK') ? 'Sort Code / IBAN' :
                                          method.type.includes('Australia') ? 'BSB Code' :
                                            (method.type.includes('India') || isDesigner) ? 'IFSC Code' : 'Transit / Swift'}
                                    </p>
                                    <input
                                      value={method.routing || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, routing: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder={(method.type.includes('India') || isDesigner) ? 'IFSC Code (e.g. SBIN0...)' : 'Code'}
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Bank Name</p>
                                    <input
                                      value={method.bankName || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, bankName: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="Bank Name"
                                    />
                                  </div>
                                </div>
                               ) : method.type === 'Razorpay' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Razorpay Key ID</p>
                                    <input
                                      value={method.key_id || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, key_id: e.target.value, value: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="rzp_live_..."
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Razorpay Key Secret</p>
                                    <input
                                      type="password"
                                      value={method.key_secret || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, key_secret: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="••••••••••••••••"
                                    />
                                  </div>
                                </div>
                              ) : method.type === 'Stripe' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Stripe Publishable Key</p>
                                    <input
                                      value={method.publishable_key || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, publishable_key: e.target.value, value: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="pk_live_..."
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Stripe Secret Key</p>
                                    <input
                                      type="password"
                                      value={method.secret_key || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, secret_key: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="sk_live_..."
                                    />
                                  </div>
                                </div>
                              ) : method.type === 'PayPal' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">PayPal Email</p>
                                    <input
                                      value={method.email || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, email: e.target.value, value: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="paypal@example.com"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">PayPal Client ID</p>
                                    <input
                                      value={method.client_id || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, client_id: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="Client ID (Optional)"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">PayPal Client Secret</p>
                                    <input
                                      type="password"
                                      value={method.client_secret || ''}
                                      onChange={(e) => setPaymentMethods(paymentMethods.map(m => m.id === method.id ? { ...m, client_secret: e.target.value } : m))}
                                      className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                      placeholder="Client Secret (Optional)"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Settlement Address</p>
                                  <input
                                    value={method.value}
                                    onChange={(e) => updateMethodValue(method.id, e.target.value)}
                                    className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400/20 outline-none transition-all"
                                    placeholder={method.type.includes('UPI') ? 'Enter UPI ID (e.g. name@bank)' : `Enter ${method.type} address...`}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Transfer Payments Approvals Ledger */}
                <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-8 relative overflow-hidden group shadow-xl">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity z-10 text-yellow-400">
                    <span className="material-symbols-outlined text-7xl">pending_actions</span>
                  </div>

                  <div className="relative z-20">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">Transfer Payout Approvals Ledger</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-6">Verify manual receipts submitted by clients to unlock downloads</p>

                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-zinc-950">
                          <tr>
                            <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">File Details</th>
                            <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Buyer Identity</th>
                            <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Payout Protocol</th>
                            <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Amount</th>
                            <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Receipt Proof</th>
                            <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Status / Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800 text-[11px]">
                          {pendingTransfers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-6 py-10 text-center text-zinc-500 uppercase font-black tracking-widest">
                                No payment logs received yet.
                              </td>
                            </tr>
                          ) : (
                            pendingTransfers.map((p) => {
                              const isPending = p.status === 'pending';
                              const formattedDate = new Date(p.created_at).toLocaleDateString();

                              return (
                                <tr key={p.id} className="hover:bg-zinc-900/20 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-white max-w-[150px] truncate" title={p.file_transfers?.file_name}>
                                      {p.file_transfers?.file_name || 'N/A'}
                                    </div>
                                    <div className="text-[9px] text-zinc-500 font-mono mt-0.5">Submitted: {formattedDate}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-semibold text-white">{p.buyer_email}</div>
                                    {p.transaction_id && (
                                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">TXID: {p.transaction_id}</div>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 font-bold uppercase text-[9px] text-zinc-400">
                                      {p.payment_method}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono font-black text-white">
                                    ${parseFloat(p.amount).toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {p.screenshot_url ? (
                                      <a
                                        href={p.screenshot_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400 hover:text-black transition-all font-bold text-[9px] uppercase tracking-wider"
                                      >
                                        <span className="material-symbols-outlined text-[10px]">receipt</span>
                                        View Image
                                      </a>
                                    ) : (
                                      <span className="text-zinc-600 font-semibold italic">No Image</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {isPending ? (
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleResolveTransferPayment(p.id, true)}
                                          className="px-3 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500 hover:text-white transition-all font-bold text-[9px] uppercase tracking-widest"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleResolveTransferPayment(p.id, false)}
                                          className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all font-bold text-[9px] uppercase tracking-widest"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <span
                                        className={`inline-flex px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                                          p.status === 'approved'
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}
                                      >
                                        {p.status}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Wallet & Rewards Tab */}
            {activeTab === 'wallet' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Points Mastercard */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity text-yellow-400">
                    <span className="material-symbols-outlined text-8xl">toll</span>
                  </div>

                  <div className="relative">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2">Global Rewards Balance</p>
                    <h2 className="text-5xl font-black text-white flex items-baseline gap-3 tabular-nums uppercase tracking-tighter">
                      {pointsBalance.toLocaleString()}
                      <span className="text-xl text-yellow-400 font-bold tracking-tight">Points</span>
                    </h2>
                    <div className="mt-8 flex gap-4">
                      <div className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]" />
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Protocol Active</span>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs text-yellow-400">shield</span>
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Secure Ledger</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Transfer Station */}
                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                        <span className="material-symbols-outlined">send</span>
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Transfer Station</h4>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Pay others with Cadonce points</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Recipient Identity (Email)</label>
                        <input
                          value={transferEmail}
                          onChange={(e) => setTransferEmail(e.target.value)}
                          className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 transition-all"
                          placeholder="user@example.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Transfer Amount</label>
                        <input
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(e.target.value)}
                          className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 transition-all"
                          placeholder="0.00"
                          type="number"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isProcessingWallet || !transferEmail || !transferAmount}
                        onClick={async () => {
                          setIsProcessingWallet(true);
                          try {
                            const { transferPoints } = await import('@/app/actions');
                            const res = await transferPoints(transferEmail, parseInt(transferAmount));
                            if (res.success) {
                              setPointsBalance(res.newBalance || 0);
                              setNotification({ message: 'Points transferred successfully!', type: 'success' });
                              setTransferEmail('');
                              setTransferAmount('');
                            } else {
                              setNotification({ message: res.error || 'Transfer failed', type: 'error' });
                            }
                          } catch (err: any) {
                            setNotification({ message: err.message, type: 'error' });
                          } finally {
                            setIsProcessingWallet(false);
                          }
                        }}
                        className="w-full py-4 rounded-lg bg-yellow-400 text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                      >
                        Initiate P2P Transfer
                      </button>
                    </div>
                  </div>

                  {/* Withdrawal Terminal */}
                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-green-400">
                        <span className="material-symbols-outlined">account_balance</span>
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Withdrawal Terminal</h4>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Convert points to cash</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Withdrawal Amount</label>
                        <input
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 transition-all"
                          placeholder="0.00"
                          type="number"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold ml-1">Settlement Details (Bank/UPI)</label>
                        <textarea
                          value={bankDetails}
                          onChange={(e) => setBankDetails(e.target.value)}
                          className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-3 text-white font-semibold text-sm focus:border-yellow-400 transition-all resize-none h-24"
                          placeholder="Enter Bank details or UPI ID..."
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isProcessingWallet || !withdrawAmount || !bankDetails}
                        onClick={async () => {
                          setIsProcessingWallet(true);
                          try {
                            const { requestWithdrawal } = await import('@/app/actions');
                            const res = await requestWithdrawal(parseInt(withdrawAmount), { bankDetails });
                            if (res.success) {
                              setPointsBalance(res.newBalance || 0);
                              setNotification({ message: 'Withdrawal protocol initiated!', type: 'success' });
                              setWithdrawAmount('');
                              setBankDetails('');
                            } else {
                              setNotification({ message: res.error || 'Withdrawal failed', type: 'error' });
                            }
                          } catch (err: any) {
                            setNotification({ message: err.message, type: 'error' });
                          } finally {
                            setIsProcessingWallet(false);
                          }
                        }}
                        className="w-full py-4 rounded-lg bg-yellow-400 text-black font-black text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                      >
                        Request Cash Conversion
                      </button>
                    </div>
                  </div>
                </div>

                {/* PROJECT ESCROW TERMINAL */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-400">
                        <span className="material-symbols-outlined">lock</span>
                      </div>
                      <div>
                        <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Project Escrow Terminal</h4>
                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Project funds currently held in platform trust</p>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-lg bg-orange-400/10 border border-orange-400/20 text-[10px] font-black text-orange-400 uppercase tracking-widest">
                      {[...(organizationEscrows || []), ...(designerEscrows || [])].length} SECURED PROJECTS
                    </span>
                  </div>

                  <div className="space-y-4">
                    {[...(organizationEscrows || []), ...(designerEscrows || [])].length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">No Active Escrows</p>
                      </div>
                    ) : (
                      [...(organizationEscrows || []), ...(designerEscrows || [])].map((escrow: any) => (
                        <div key={escrow.id} className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/30 flex items-center justify-between group hover:border-orange-400/30 transition-all duration-300">
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-lg bg-black border border-zinc-800 flex items-center justify-center text-orange-400">
                              <span className="material-symbols-outlined">lock</span>
                            </div>
                            <div>
                              <div className="text-[12px] font-black text-white uppercase tracking-tight">Project #{escrow.project_id.slice(-6)}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${escrow.status === 'released' ? 'bg-green-400' : 'bg-orange-400 shadow-[0_0_10px_#fb923c]'}`} />
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{escrow.status === 'released' ? 'Funds Released' : 'Held in Escrow'}</div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-white">
                              {escrow.currency}{parseFloat(escrow.amount).toLocaleString()}
                            </div>
                            <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{new Date(escrow.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* TRANSACTION LEDGER */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-10 space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                    <div>
                      <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Rewards Ledger</h4>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Historical audit of your CADONCE points</p>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {ledger.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-zinc-800 rounded-2xl">
                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em]">No Transactions Logged</p>
                      </div>
                    ) : (
                      ledger.map((entry) => (
                        <div key={entry.id} className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800/30 flex items-center justify-between group hover:border-purple-500/30 transition-all duration-300">
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-all ${entry.amount > 0 ? 'bg-green-500/5 border-green-500/10 text-green-400' : 'bg-red-500/5 border-red-500/10 text-red-400'}`}>
                              <span className="material-symbols-outlined text-lg">
                                {entry.type === 'earn' ? 'auto_awesome' : entry.type === 'transfer' ? 'send' : 'payments'}
                              </span>
                            </div>
                            <div>
                              <div className="text-[12px] font-black text-white uppercase tracking-tight">{entry.description}</div>
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">{entry.type}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-black ${entry.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}
                            </div>
                            <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{new Date(entry.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* Danger Zone */}
            <div className="pt-12 mt-12 border-t border-red-500/10">
              <div className="bg-red-500/5 rounded-3xl p-8 border border-red-500/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-6xl text-red-500">dangerous</span>
                </div>

                <h3 className="text-xl font-headline font-black text-red-400 uppercase tracking-tight mb-2">Danger Zone</h3>
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mb-6">Irreversible Action: Permanently terminate your workstation access and purge all project data.</p>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full py-4 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">delete_forever</span>
                  Permanently Delete Account
                </button>
              </div>
            </div>
            {/* Global Save Action */}
            <div className="pt-8 pb-12 flex justify-end border-t border-zinc-800/30">
              <button
                type="submit"
                disabled={isSaving}
                className={`px-8 py-3 font-black uppercase italic tracking-tighter text-sm rounded shadow-lg transition-all ${isSaving
                    ? 'bg-yellow-400/20 text-yellow-400/40 cursor-wait'
                    : 'bg-yellow-400 text-black hover:brightness-110 active:scale-[0.98] shadow-yellow-400/20'
                  }`}
              >
                {isSaving ? 'Synchronizing...' : 'Commit Changes'}
              </button>
            </div>
          </form>
          </div>
          </div>
        </main>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowDeleteModal(false)} />
            <div className="relative w-full max-w-md bg-[#0c0a04] border border-red-500/30 rounded-[2.5rem] p-8 shadow-[0_0_100px_rgba(239,68,68,0.15)] animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 mb-6 mx-auto">
                <span className="material-symbols-outlined text-4xl">warning</span>
              </div>

              <h2 className="text-2xl font-headline font-black text-white text-center uppercase tracking-tight mb-2">Are you absolutely sure?</h2>
              <p className="text-[10px] text-neutral-500 font-bold text-center uppercase tracking-widest mb-8 leading-relaxed">
                This will permanently delete your account and ALL associated data (projects, clients, and workstation settings). This action cannot be undone.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1">Type "DELETE MY ACCOUNT" to confirm</label>
                  <input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE MY ACCOUNT"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white font-mono focus:ring-1 focus:ring-red-500 outline-none transition-all uppercase"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText.toLowerCase() !== 'delete my account'}
                    className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isDeleting || deleteConfirmText.toLowerCase() !== 'delete my account'
                        ? 'bg-red-500/20 text-red-500/40 cursor-not-allowed'
                        : 'bg-red-500 text-white shadow-lg shadow-red-500/20 active:scale-95'
                      }`}
                  >
                    {isDeleting ? <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span> : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
