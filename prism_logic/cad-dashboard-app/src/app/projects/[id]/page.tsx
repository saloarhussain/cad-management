"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getDb } from '@/app/actions';
import { useAuth } from '@/components/AuthProvider';
import { PLATFORM_CONFIG, GLOBAL_CURRENCIES, getCurrencySymbol } from '@/lib/config';
import { ProjectChat } from '@/components/ProjectChat';
import { CloudinaryUpload } from '@/components/CloudinaryUpload';
import dynamic from 'next/dynamic';

const ViewportCanvas = dynamic(() => import('@/components/viewport/ViewportCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-[#0c0a04] text-[#fce003]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-[#fce003] font-headline font-black text-xs tracking-widest uppercase animate-pulse">
          Initializing 3D Render Engine...
        </div>
      </div>
    </div>
  )
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '--/--/----';
  if (dateStr.includes('/')) return dateStr;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const FormattedDescription = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed text-on-surface">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        
        // Bold headers
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return <strong key={i} className="block text-white text-[15px] mt-5 mb-2 tracking-wide">{trimmed.slice(2, -2)}</strong>;
        }
        
        // Bullet points
        if (trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 items-start ml-2">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>{trimmed.slice(2)}</span>
            </div>
          );
        }
        
        // Checkmarks
        if (trimmed.startsWith('✅')) {
          return (
            <div key={i} className="flex gap-2 items-start ml-2">
              <span className="text-green-400">✅</span>
              <span>{trimmed.slice(1).trim()}</span>
            </div>
          );
        }
        
        // URLs
        if (trimmed.includes('http://') || trimmed.includes('https://')) {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          const parts = line.split(urlRegex);
          return (
            <p key={i} className="break-words mt-2">
              {parts.map((part, j) => 
                urlRegex.test(part) ? (
                  <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline break-all">
                    {part}
                  </a>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </p>
          );
        }
        
        // Empty lines
        if (!trimmed) {
          return <div key={i} className="h-2"></div>;
        }

        // Regular text
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
};
export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user, isDesigner } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(83.5);
  const [allRates, setAllRates] = useState<Record<string, number>>({ USD: 1, INR: 83.5 });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [isReceiptParsed, setIsReceiptParsed] = useState(false);
  const [manualPaymentForm, setManualPaymentForm] = useState({
    platform: '',
    transactionId: '',
    recipientName: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    amountPaid: ''
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [razorpayKey, setRazorpayKey] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [timeLogs, setTimeLogs] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const searchParams = useSearchParams();

  // 3D Render Tab States
  const [cadFileUrl, setCadFileUrl] = useState<string | null>(null);
  const [cadFileLoading, setCadFileLoading] = useState(false);
  const [cadFileError, setCadFileError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await res.json();
        if (data.rates) {
          setAllRates(data.rates);
          if (data.rates.INR) {
            setExchangeRate(data.rates.INR);
            console.log("Real-time INR Rate:", data.rates.INR);
          }
        }
      } catch (err) {
        console.error("Failed to fetch exchange rate", err);
      }
    };
    fetchRate();
  }, []);
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Lock body scroll when Chat is active to create a "Workstation" feel
  useEffect(() => {
    if (activeTab === 'chat') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeTab]);

  // Load CAD File Url when Render Tab is clicked
  useEffect(() => {
    async function loadCadUrl() {
      if (!params.id) return;
      setCadFileLoading(true);
      setCadFileError(null);
      try {
        const { getCadFileUrl } = await import('@/app/actions');
        const res = await getCadFileUrl(params.id as string);
        if (res.success && res.signedUrl) {
          setCadFileUrl(res.signedUrl);
        } else {
          setCadFileError(res.error || 'Could not fetch CAD file signed URL.');
        }
      } catch (err: any) {
        setCadFileError(err.message);
      } finally {
        setCadFileLoading(false);
      }
    }
    
    if (activeTab === 'render' && !cadFileUrl && !cadFileLoading) {
      loadCadUrl();
    }
  }, [activeTab, params.id, cadFileUrl, cadFileLoading]);

  useEffect(() => {
    const fetchData = async () => {
      const { getDesignerProjectDetail, getDb } = await import('@/app/actions');

      if (isDesigner) {
        const res = await getDesignerProjectDetail(params.id as string);
        if (res.project) {
          setProject(res.project);
        }
      } else {
        const db = await getDb();
        const projects = db.projects || [];
        const foundProject = projects.find((p: any) => p.id === params.id);

        if (foundProject) {
          setProject(foundProject);
          if (db.clients) {
            const foundClient = db.clients.find((c: any) => c.name === foundProject.client || c.companyName === foundProject.client);
            setClient(foundClient || null);
          }
          
          // Fetch Escrow (Note: Table might be missing, so we primarily rely on project.paymentStatus)
          const { getMyEscrows, getEscrowPaymentData, getProjectTimeLogs } = await import('@/app/actions');
          const escrowRes = await getMyEscrows();
          
          // Fetch Time Logs
          const logsRes = await getProjectTimeLogs(params.id as string);
          if (logsRes.success) {
            setTimeLogs(logsRes.logs || []);
            setScreenshots(logsRes.screenshots || []);
          }
          if (escrowRes.success) {
            const foundEscrow = [...(escrowRes.organizationEscrows || []), ...(escrowRes.designerEscrows || [])].find(e => e.project_id === params.id && e.status === 'active');
            setEscrow(foundEscrow || null);
          }

          // Fetch Wallet & Razorpay Data
          const payData = await getEscrowPaymentData();
          if (payData.success) {
            setWalletBalance(payData.balance || 0);
            setRazorpayKey(payData.razorpayKey || "");
          }
        }
      }
      
      // Fetch Feedback
      const { getProjectFeedback } = await import('@/app/actions');
      const feedbackRes = await getProjectFeedback(params.id as string);
      if (feedbackRes.success) {
        setFeedback(feedbackRes.feedback);
      }

      setLoading(false);
    };
    if (isAuthenticated) fetchData();
  }, [params.id, isAuthenticated, isDesigner]);
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      const { deleteProject } = await import('@/app/actions');
      const result = await deleteProject(params.id as string);
      if (result.success) {
        router.push('/projects');
      } else {
        alert('Failed to delete project');
      }
    }
  };
  const handleSendInvoice = async () => {
    if (isSendingInvoice) return;
    setIsSendingInvoice(true);
    try {
      const { sendInvoice } = await import('@/app/actions');
      const result = await sendInvoice(params.id as string);

      if (result.success) {
        setNotification({ message: result.message || 'Invoice sent successfully!', type: 'success' });
      } else {
        setNotification({ message: result.error || 'Failed to send invoice.', type: 'error' });
      }
    } catch (error) {
      setNotification({ message: 'An unexpected error occurred.', type: 'error' });
    } finally {
      setIsSendingInvoice(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleUpdateRevisionStatus = async (revId: string, status: string) => {
    try {
      const { updateRevisionStatus } = await import('@/app/actions');
      const result = await updateRevisionStatus(params.id as string, revId, status);

      if (result.success) {
        setNotification({ message: `Revision marked as ${status}!`, type: 'success' });
        // Refresh local project data to show updated status immediately
        const db = await getDb();
        const foundProject = db.projects?.find((p: any) => p.id === params.id);
        if (foundProject) setProject(foundProject);
      } else {
        setNotification({ message: result.error || 'Failed to update status.', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'An unexpected error occurred.', type: 'error' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingReceipt(true);
    setNotification({ message: 'Analyzing receipt with AI...', type: 'success' });

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success && data.data) {
        setManualPaymentForm(prev => ({
          ...prev,
          platform: data.data.platform || prev.platform,
          transactionId: data.data.transactionId || prev.transactionId,
          recipientName: data.data.recipientName || prev.recipientName,
          date: data.data.date || prev.date,
          time: data.data.time || prev.time,
          amountPaid: data.data.amountPaid || prev.amountPaid,
        }));
        setIsReceiptParsed(true);
        setNotification({ message: 'Receipt parsed successfully!', type: 'success' });
      } else {
        setNotification({ message: data.error || 'Could not parse receipt.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Failed to upload receipt.', type: 'error' });
    } finally {
      setIsParsingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-headline font-bold text-white mb-4">Project Not Found</h2>
        <Link href="/projects" className="text-primary-fixed-dim hover:underline">Return to Project Studio</Link>
      </div>
    );
  }

  const handleSetMainImage = async (url: string) => {
    try {
      const { updateProject } = await import('@/app/actions');
      const result = await updateProject(params.id as string, { thumbnailUrl: url });

      if (result.success) {
        setNotification({ message: 'Main image updated! ⭐', type: 'success' });
        setProject((prev: any) => ({ ...prev, thumbnailUrl: url }));
      } else {
        setNotification({ message: result.error || 'Failed to update thumbnail.', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'An unexpected error occurred.', type: 'error' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteMedia = async (url: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
      const { deleteProjectMedia, getDb } = await import('@/app/actions');
      const result = await deleteProjectMedia(params.id as string, url);

      if (result.success) {
        setNotification({ message: 'Asset deleted successfully. 🗑️', type: 'success' });
        // Refresh local state
        const db = await getDb();
        const foundProject = db.projects?.find((p: any) => p.id === params.id);
        if (foundProject) setProject(foundProject);
      } else {
        setNotification({ message: result.error || 'Failed to delete asset.', type: 'error' });
      }
    } catch (err) {
      setNotification({ message: 'An unexpected error occurred.', type: 'error' });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const cleanNote = (note: string) => {
    if (!note) return "No notes provided";
    // Strip redundant labels and Pos coordinates
    let cleaned = note.replace(/3D VIEWPORT FEEDBACK:/gi, '')
      .replace(/\(Pos:.*?\)/g, '')
      .trim();

    // Ensure every "Pin #" starts on a new line (except the very first one)
    cleaned = cleaned.replace(/Pin\s*#/g, '\nPin #').trim();

    return cleaned;
  };

  const handleRazorpayPayment = async (amount: number) => {
    try {
      const { createPaymentOrder } = await import('@/app/actions');
      const order = await createPaymentOrder(amount);
      
      if (!order.id) throw new Error("Failed to create Razorpay order");

      const options = {
        key: razorpayKey,
        amount: order.amount,
        currency: "INR",
        name: "CADONCE Studio",
        description: `Secure Fees: ${project.title}`,
        order_id: order.id,
        handler: async function (response: any) {
          console.log("Razorpay Success Callback:", response);
          const { verifyAndCompleteEscrow } = await import('@/app/actions');
          const res = await verifyAndCompleteEscrow({
            projectId: project.id,
            amount: amount, 
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });

          if (res.success) {
            setNotification({ message: 'Payment Verified & Fees Secured! 🔒', type: 'success' });
            setShowPaymentModal(false);
            // Give the notification time to breathe before reloading
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            console.error("Verification Error:", res.error);
            setNotification({ message: res.error || 'Verification failed.', type: 'error' });
          }
        },
        theme: { color: "#fce003" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setNotification({ message: err.message || 'Payment initiation failed.', type: 'error' });
    }
  };

  const handleWalletPayment = async (amountInProjectCurrency: number) => {
    const { initiateProjectEscrow } = await import('@/app/actions');
    const res = await initiateProjectEscrow(project.id, amountInProjectCurrency);
    if (res.success) {
      setNotification({ message: 'Escrow initiated! Funds locked. 🔒', type: 'success' });
      window.location.reload();
    } else {
      setNotification({ message: res.error || 'Failed to initiate escrow.', type: 'error' });
    }
  };

  const rawDescription = project?.description || '';
  const descLines = rawDescription.split('\n');
  
  let escrowInfo: string | null = null;
  let feedbackInfo: { rating: string; comment: string } | null = null;
  let manualPaymentInfo: Record<string, string> | null = null;
  const descriptionLines: string[] = [];
  let inManualPaymentBlock = false;
  
  for (const line of descLines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[ESCROW]')) {
      escrowInfo = trimmed.replace('[ESCROW]', '').trim();
      inManualPaymentBlock = false;
    } else if (trimmed.startsWith('[FEEDBACK]')) {
      const ratingMatch = trimmed.match(/Rating:\s*(\d+\/\d+|\d+)/);
      feedbackInfo = {
        rating: ratingMatch ? ratingMatch[1] : '5/5',
        comment: ''
      };
      inManualPaymentBlock = false;
    } else if (trimmed.startsWith('Comment:') && feedbackInfo) {
      feedbackInfo.comment = trimmed.replace('Comment:', '').trim();
      inManualPaymentBlock = false;
    } else if (trimmed === '[MANUAL_PAYMENT]') {
      manualPaymentInfo = {};
      inManualPaymentBlock = true;
    } else if (inManualPaymentBlock && trimmed.includes(':')) {
      const [key, ...valueParts] = trimmed.split(':');
      if (manualPaymentInfo) {
        manualPaymentInfo[key.trim()] = valueParts.join(':').trim();
      }
    } else if (trimmed) {
      descriptionLines.push(line);
      inManualPaymentBlock = false;
    }
  }
  
  const cleanDescription = descriptionLines.join('\n').trim() || 'No detailed description provided for this project.';

  return (
    <div className="bg-background text-on-surface font-body min-h-screen">
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${notification.type === 'success'
            ? 'bg-success/20 border-success/30 text-success'
            : 'bg-error/20 border-error/30 text-error'
          }`}>
          <span className="material-symbols-outlined text-sm">
            {notification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="text-xs font-bold uppercase tracking-tight">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70 transition-opacity">
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>
      )}

      {/* TopAppBar */}
      <header className="bg-[#1a1a17]/95 backdrop-blur-xl fixed top-0 left-0 md:left-64 right-0 z-[200] border-b border-white/5 shadow-2xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-[#fce003] active:scale-95 transition-all">
              <span className="material-symbols-outlined text-lg sm:text-xl">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline font-black tracking-tight text-[#fce003] text-xs sm:text-sm uppercase truncate max-w-[120px] sm:max-w-none">Project Details</h1>
              <span className="text-[7px] sm:text-[8px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Studio Interface</span>
            </div>
          </div>

          {!isDesigner && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Link href={`/projects/${params.id}/edit`} className="p-1.5 sm:p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:text-[#fce003] transition-all active:scale-95">
                <span className="material-symbols-outlined text-xs sm:text-sm">edit</span>
              </Link>

              <button onClick={handleDelete} className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all active:scale-95">
                <span className="material-symbols-outlined text-xs sm:text-sm">delete</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="pt-20 sm:pt-24 pb-28 md:pb-12 px-4 sm:px-6 max-w-7xl mx-auto text-left">
        {loading ? (
          <div className="space-y-4">
            {/* Skeleton Primary Actions */}
            <div className="flex gap-2.5">
              <div className="flex-1 h-12 bg-white/5 rounded-xl shimmer"></div>
              <div className="flex-1 h-12 bg-white/5 rounded-xl shimmer"></div>
            </div>
            {/* Skeleton Header Card */}
            <div className="bg-surface-container rounded-3xl p-6 border border-white/5 space-y-4">
               <div className="flex justify-between">
                 <div className="w-32 h-6 bg-white/5 rounded-lg shimmer"></div>
                 <div className="w-10 h-10 rounded-full bg-white/5 shimmer"></div>
               </div>
               <div className="flex gap-4">
                 <div className="w-20 h-4 bg-white/5 rounded shimmer"></div>
                 <div className="w-20 h-4 bg-white/5 rounded shimmer"></div>
                 <div className="w-20 h-4 bg-white/5 rounded shimmer"></div>
               </div>
            </div>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Content Area (Left) */}
            <div className="lg:col-span-8 order-2 lg:order-1 space-y-6">
              {/* Tab Navigation - Solid Sticky */}
              <nav className="flex p-1 bg-[#0c0a04] rounded-xl sticky top-[72px] sm:top-20 z-40 border border-white/5 shadow-2xl overflow-x-auto no-scrollbar whitespace-nowrap">
                {['overview', 'render', 'financials', 'tracking', 'revisions', 'gallery', 'chat', 'feedback'].filter(t => {
                  if (isDesigner && t === 'financials') return false;
                  if (t === 'feedback') {
                    return project.status === 'Completed' || project.status === 'Approved' || project.status === 'Complete' || !!feedback;
                  }
                  return true;
                }).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-[0.15em] sm:tracking-widest transition-all duration-500 ${activeTab === tab
                        ? 'text-black electric-gradient shadow-lg shadow-yellow-400/20 active:scale-95'
                        : 'text-neutral-500 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {tab}
                    {tab === 'chat' && (
                      <span className="ml-2 w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Tab Content: 3D Render Viewport */}
              {activeTab === 'render' && (
                <div className="bg-surface-container rounded-3xl overflow-hidden border border-white/5 shadow-2xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight">Interactive 3D Render Studio</h3>
                      <p className="text-[9px] font-bold text-outline uppercase tracking-widest mt-0.5">Real-time photorealistic model analysis and material preview</p>
                    </div>
                    {cadFileUrl && (
                      <a 
                        href={cadFileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fce003]/10 border border-[#fce003]/20 rounded-xl text-[#fce003] text-[9px] font-black uppercase tracking-wider hover:bg-[#fce003]/20 transition-all"
                      >
                        <span className="material-symbols-outlined text-xs">download</span>
                        Download Model
                      </a>
                    )}
                  </div>

                  <div className="w-full h-[600px] bg-black/40 rounded-2xl overflow-hidden border border-white/5 relative">
                    {cadFileLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0c0a04]">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-[#fce003] border-t-transparent rounded-full animate-spin"></div>
                          <div className="text-[#fce003] font-headline font-black text-xs tracking-widest uppercase">
                            Connecting to Render Core...
                          </div>
                        </div>
                      </div>
                    ) : cadFileError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0c0a04] p-6 text-center">
                        <div className="max-w-xs space-y-4">
                          <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-white">Renderer Load Failed</h4>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase leading-relaxed">{cadFileError}</p>
                        </div>
                      </div>
                    ) : cadFileUrl ? (
                      <ViewportCanvas 
                        fileUrl={cadFileUrl} 
                        metalType="gold" 
                        fileName={project.cadFileName || 'model.stl'}
                        projectId={params.id as string}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#0c0a04] p-6 text-center">
                        <div className="max-w-xs space-y-4">
                          <span className="material-symbols-outlined text-neutral-500 text-4xl">3d_rotation</span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-white">No 3D Model Attached</h4>
                          <p className="text-[10px] text-neutral-500 font-bold uppercase leading-relaxed">This project does not have an active 3D model uploaded yet.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Content: Overview */}
              {activeTab === 'overview' && (() => {
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Description Card (Takes 2 columns if on large screen) */}
                    <div className="lg:col-span-2 space-y-4">
                      <section className="bg-surface-container rounded-xl p-6 border border-white/5 shadow-sm h-full">
                        <h3 className="text-xs font-bold uppercase tracking-tighter text-outline mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">description</span>
                          Project Description
                        </h3>
                        <div className="max-w-none">
                          <FormattedDescription text={cleanDescription} />
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap gap-2">
                          {project.tags?.map((tag: string) => (
                            <span key={tag} className="px-3 py-1 rounded-full bg-surface-container-high text-[10px] font-bold text-outline uppercase tracking-wider border border-white/10">
                              {tag}
                            </span>
                          )) || (
                              <span className="px-3 py-1 rounded-full bg-surface-container-high text-[10px] font-bold text-outline uppercase tracking-wider border border-white/10">Standard 3D CAD</span>
                            )}
                        </div>
                      </section>
                    </div>

                    {/* Status & Meta Cards (Takes 1 column) */}
                    <div className="space-y-6">
                      {/* Escrow Card */}
                      {escrowInfo && (
                        <div className="bg-surface-container rounded-xl p-6 border border-green-500/20 relative overflow-hidden group shadow-lg">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity z-10 text-green-400">
                            <span className="material-symbols-outlined text-5xl">shield</span>
                          </div>
                          <div className="relative z-20">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="material-symbols-outlined text-green-400 text-sm">verified_user</span>
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-green-400">Escrow Secured</h4>
                            </div>
                            <p className="text-[11px] text-on-surface leading-relaxed">
                              {escrowInfo}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Feedback Card */}
                      {feedbackInfo && (
                        <div className="bg-surface-container rounded-xl p-6 border border-yellow-500/20 relative overflow-hidden group shadow-lg">
                          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity z-10 text-yellow-400">
                            <span className="material-symbols-outlined text-5xl">star</span>
                          </div>
                          <div className="relative z-20">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-yellow-400 text-sm">reviews</span>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Client Feedback</h4>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-yellow-400 text-[10px] font-black">
                                  {parseFloat(feedbackInfo.rating.split('/')[0] || '5').toFixed(1)}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className="material-symbols-outlined text-yellow-400 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-on-surface leading-relaxed italic">
                              "{feedbackInfo.comment || 'Amazing Experience'}"
                            </p>
                            <p className="text-[9px] text-outline font-black uppercase tracking-widest mt-2">
                              Rating: {feedbackInfo.rating}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

        {/* Tab Content: Financials */}
        {activeTab === 'financials' && (
          <div className="space-y-4">
            <section className="bg-surface-container rounded-xl p-5 border border-white/5">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold uppercase tracking-tighter text-outline">Financial Overview</h3>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${project.paymentStatus === 'Paid' ? 'bg-success/10 text-success border-success/20' :
                    project.paymentStatus === '50% Advance' ? 'bg-primary/10 text-primary border-primary/20' :
                      project.paymentStatus === 'Partial Payment' ? 'bg-tertiary-container/10 text-tertiary-container border-tertiary-container/20' :
                        'bg-error/10 text-error border-error/20'
                  }`}>
                  {project.paymentStatus || 'Unpaid'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Total Revenue */}
                  <div className={`relative overflow-hidden p-3.5 rounded-xl bg-surface-container-high/50 backdrop-blur-md border ${getCurrencySymbol(project.revenueCurrency || 'USD') === '$' ? 'border-red-500/30' : 'border-[#fce003]/30'} shadow-xl`}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[9px] text-outline uppercase font-black tracking-widest">Total Revenue</p>
                    </div>
                    <p className="text-2xl font-headline font-black text-white tracking-tight">{getCurrencySymbol(project.revenueCurrency || 'USD')}{parseFloat(project.revenue || '0').toLocaleString()}</p>
                  </div>

                  {/* Paid Amount */}
                  <div className="relative overflow-hidden p-3.5 rounded-xl bg-surface-container-high/50 backdrop-blur-md border border-white/5 shadow-xl">
                    <p className="text-[9px] text-outline uppercase font-black tracking-widest mb-2">Paid Amount</p>
                    <p className="text-2xl font-headline font-black text-success tracking-tight">{getCurrencySymbol(project.revenueCurrency || 'USD')}{parseFloat(project.paidAmount || '0').toLocaleString()}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="flex-1 bg-stone-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-success h-full" style={{ width: `${Math.min(100, (parseFloat(project.paidAmount || '0') / (parseFloat(project.revenue || '1') || 1)) * 100)}%` }}></div>
                      </div>
                      <span className="text-[8px] font-bold text-success">{Math.round((parseFloat(project.paidAmount || '0') / (parseFloat(project.revenue || '1') || 1)) * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  {/* Balance Due */}
                  <div className="relative overflow-hidden p-4 rounded-xl bg-[#1a1a14] border-l-4 border-[#fce003] shadow-2xl group hover:bg-[#1e1e16] transition-all">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] text-on-surface-variant uppercase font-black tracking-widest">Balance Due</p>
                      <span className="text-[8px] font-black text-outline">Pending Settlement</span>
                    </div>
                    <p className="text-3xl font-headline font-black text-[#fce003] tracking-tighter">
                      {getCurrencySymbol(project.revenueCurrency || 'USD')}{(parseFloat(project.revenue || '0') - parseFloat(project.paidAmount || '0')).toLocaleString()}
                    </p>
                  </div>

                  {/* Consolidated Net Margin & Designer Cost */}
                  <div className={`relative overflow-hidden p-4 rounded-xl bg-[#1a1a14] border-l-4 ${getCurrencySymbol(project.expenseCurrency || 'INR') === '$' ? 'border-red-500' : 'border-tertiary-container'} shadow-2xl`}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] text-on-surface-variant uppercase font-black tracking-widest">Net Profit Margin (USD)</p>
                      <div className="flex flex-col items-end">
                         <p className="text-[8px] text-outline uppercase font-black">Designer Cost: <span className="text-white">{getCurrencySymbol(project.expenseCurrency || 'INR')}{project.expense}</span></p>
                         <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                            <span className="text-[7px] text-neutral-500 font-bold uppercase tracking-widest">Live Rate: 1$ = ₹{exchangeRate.toFixed(2)}</span>
                         </div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-headline font-black text-white tracking-tighter">
                        ${(() => {
                          const rev = parseFloat(project.revenue || '0');
                          const exp = parseFloat(project.expense || '0');
                          
                          const revCurrencyCode = project.revenueCurrency && project.revenueCurrency.length === 3 ? project.revenueCurrency.toUpperCase() : (GLOBAL_CURRENCIES.find(c => c.symbol === (project.revenueCurrency || '$'))?.code || 'USD');
                          const expCurrencyCode = project.expenseCurrency && project.expenseCurrency.length === 3 ? project.expenseCurrency.toUpperCase() : (GLOBAL_CURRENCIES.find(c => c.symbol === (project.expenseCurrency || '$'))?.code || 'USD');
                          
                          const rateRevToUSD = allRates[revCurrencyCode] || 1;
                          const rateExpToUSD = allRates[expCurrencyCode] || 1;
                          
                          const revUSD = rev / rateRevToUSD;
                          const expUSD = exp / rateExpToUSD;
                          
                          return (revUSD - expUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()}
                      </p>
                      {project.revenueCurrency !== project.expenseCurrency && (
                        <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                          (Calculated from {getCurrencySymbol(project.revenueCurrency || 'USD')}{project.revenue} - {getCurrencySymbol(project.expenseCurrency || 'INR')}{project.expense})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                {/* Manual Payment Record */}
                {manualPaymentInfo && Object.keys(manualPaymentInfo).length > 0 && (
                  <div className="relative overflow-hidden p-6 rounded-2xl bg-[#1a1a17] border border-white/5 shadow-2xl mt-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <span className="material-symbols-outlined text-blue-400 text-xl">receipt_long</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Manual Payment Record</h4>
                        <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">
                          Offline Settlement Details
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(manualPaymentInfo).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-[9px] text-on-surface-variant uppercase font-black tracking-widest">{key}</p>
                          <p className="text-xs font-bold text-white truncate">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Designer Payout Settlement */}
                {/* Project Escrow Terminal */}
                {(!manualPaymentInfo && project.payoutStatus?.toLowerCase() !== 'paid') && (
                  <div className="relative overflow-hidden p-6 rounded-2xl bg-[#1a1a17] border border-white/5 shadow-2xl mt-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <span className="material-symbols-outlined text-orange-400 text-xl">lock</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Financial Escrow</h4>
                        <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest">
                          {escrow || project.paymentStatus === 'Escrow Secured' ? 'Funds Secured in Platform Trust' : 'Escrow Protection Available'}
                        </p>
                      </div>
                    </div>
                    {(escrow || project.paymentStatus === 'Escrow Secured') && (
                      <div className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-400 uppercase tracking-widest animate-pulse">
                        Active Hold
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-neutral-400">
                      <span>Project Expense (Escrow Target)</span>
                      <span className="text-white">{project.expenseCurrency || '₹'}{parseFloat(project.expense || '0').toLocaleString()}</span>
                    </div>
                    {(escrow || project.paymentStatus === 'Escrow Secured') && (
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-green-400/80">
                        <span>Status</span>
                        <span>Locked & Verified</span>
                      </div>
                    )}
                  </div>

                  {!isDesigner && !manualPaymentInfo && project.payoutStatus?.toLowerCase() !== 'paid' && (
                    <div className="flex gap-3">
                      {!escrow && project.paymentStatus !== 'Escrow Secured' && project.paymentStatus !== 'Paid' && (
                        <button 
                          onClick={() => setShowPaymentModal(true)}
                          className="flex-1 py-4 rounded-xl bg-orange-500 text-black font-headline font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Secure Designer Fees
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setManualPaymentForm(prev => ({ ...prev, amountPaid: project.expense || '' }));
                          setIsReceiptParsed(false);
                          setShowManualPaymentModal(true);
                        }}
                        className="flex-1 py-4 rounded-xl border border-white/10 bg-white/5 text-white font-headline font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 active:scale-95 transition-all"
                      >
                        Manual Payment
                      </button>
                    </div>
                  )}

                  {!isDesigner && (escrow || project.paymentStatus === 'Escrow Secured') && (
                    <button 
                      onClick={async () => {
                        if (!confirm('Are you sure you want to release these funds to the designer? This action cannot be undone.')) return;
                        const { releaseProjectEscrow } = await import('@/app/actions');
                        const res = await releaseProjectEscrow(project.id);
                        if (res.success) {
                          setNotification({ message: 'Funds released to designer! ✅', type: 'success' });
                          setEscrow(null);
                          setProject((prev: any) => ({ ...prev, paymentStatus: 'Paid', payoutStatus: 'Paid', status: 'Completed' }));
                        } else {
                          setNotification({ message: res.error || 'Failed to release funds.', type: 'error' });
                        }
                      }}
                      className="w-full py-4 rounded-xl bg-green-600 text-white font-headline font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-green-600/20 hover:bg-green-500 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Release Funds to Designer
                    </button>
                  )}

                  {isDesigner && (escrow || project.paymentStatus === 'Escrow Secured') && (
                    <div className="w-full py-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 font-headline font-black text-[10px] uppercase tracking-[0.2em] text-center">
                      Payment Secured by Platform
                    </div>
                  )}

                  {(project.payoutStatus?.toLowerCase() === 'paid' || (project.paymentStatus === 'Paid' && !escrow && project.payoutStatus?.toLowerCase() !== 'pending' && !manualPaymentInfo)) && (
                    <div className="w-full py-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-headline font-black text-[10px] uppercase tracking-[0.2em] text-center">
                      Designer Settled
                    </div>
                  )}

                  <p className="text-[7px] text-neutral-400 font-bold uppercase tracking-widest text-center mt-4">
                    Escrow system operates independently from CADONCE rewards points
                  </p>
                </div>
                )}

            </section>
          </div>
        )}

        {/* Tab Content: Tracking */}
        {activeTab === 'tracking' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-outline">Activity & Time Tracking</h3>
              <span className="text-[10px] font-black text-[#fce003] uppercase bg-[#fce003]/10 px-3 py-1 rounded-full border border-[#fce003]/20">
                Live Data
              </span>
            </div>

            <div className="bg-surface-container rounded-xl p-6 border border-white/5 shadow-sm">
              {timeLogs.length === 0 && screenshots.length === 0 && (
                <div className="mb-6 p-6 bg-yellow-400/5 border border-dashed border-yellow-400/20 rounded-xl text-center">
                  <div className="w-12 h-12 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-yellow-400 text-2xl">download</span>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase mb-1">Get Started with Cadonce Tracker</h4>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-4 max-w-sm mx-auto">
                    To start tracking your time and capturing screenshots for this project, you need to install the Cadonce desktop app.
                  </p>
                  <a 
                    href="https://github.com/saloarhussain/Cad/releases/download/v1.0.0/desktop-tracker-1.0.0.Setup.exe" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 text-black font-black text-[10px] uppercase tracking-widest rounded-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-yellow-400/10"
                  >
                    Download Tracker App
                    <span className="material-symbols-outlined text-sm">download</span>
                  </a>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-surface-container-high rounded-lg border border-white/5">
                  <p className="text-[9px] text-outline uppercase font-black tracking-widest mb-1">Total Active Time</p>
                  <p className="text-2xl font-headline font-black text-white">
                    {(() => {
                      const totalSeconds = timeLogs.reduce((acc, log) => acc + (log.active_seconds || 0), 0);
                      const hrs = Math.floor(totalSeconds / 3600);
                      const mins = Math.floor((totalSeconds % 3600) / 60);
                      return `${hrs}h ${mins}m`;
                    })()}
                  </p>
                </div>
                <div className="p-4 bg-surface-container-high rounded-lg border border-white/5">
                  <p className="text-[9px] text-outline uppercase font-black tracking-widest mb-1">Screenshots Captured</p>
                  <p className="text-2xl font-headline font-black text-white">{screenshots.length}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-tight text-outline mb-4">Recent Screenshots</h4>
              {screenshots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {screenshots.map((src, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-white/10">
                      <img 
                        src={`https://tqedzihlvsmolhaduntg.supabase.co/storage/v1/object/public/project-assets/screenshots/${params.id}/${src}`} 
                        alt={`Screenshot ${idx + 1}`}
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[8px] font-bold text-white uppercase">Screenshot {idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center py-4">No screenshots available yet.</p>
              )}

              <h4 className="text-xs font-bold uppercase tracking-tight text-outline mt-6 mb-4">Time Logs</h4>
              {timeLogs.length > 0 ? (
                <div className="space-y-2">
                  {timeLogs.map((log, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-surface-container-high rounded-lg border border-white/5">
                      <div>
                        <p className="text-[10px] font-bold text-white uppercase">Session {idx + 1}</p>
                        <p className="text-[8px] text-neutral-500 font-bold uppercase">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                      <span className="text-[10px] font-black text-[#fce003]">
                        {Math.floor(log.active_seconds / 60)} mins
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center py-4">No time logs recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Revisions */}
        {activeTab === 'revisions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-outline">Revision History</h3>
              <span className="text-[10px] font-black text-[#fce003] uppercase bg-[#fce003]/10 px-3 py-1 rounded-full border border-[#fce003]/20">
                {project.revisions?.length || 0} Entries
              </span>
            </div>

            {project.revisions && project.revisions.length > 0 ? (
              <div className="space-y-4">
                {[...project.revisions].reverse().map((rev: any, idx: number) => (
                  <div key={rev.id || idx} className="bg-surface-container rounded-2xl p-5 border border-white/5 shadow-lg relative overflow-hidden group hover:border-[#fce003]/30 transition-all">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#fce003] opacity-50"></div>

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">{rev.label || `Revision ${project.revisions.length - idx}`}</h4>
                        <p className="text-[9px] font-bold text-outline uppercase tracking-widest mt-0.5">
                          {new Date(rev.createdAt).toLocaleDateString()} • {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${rev.status === 'Fixed' ? 'bg-success/20 text-success' : 'bg-white/5 text-neutral-500'
                        }`}>
                        {rev.status || 'Pending'}
                      </div>
                    </div>

                    <div className="bg-surface-container-high rounded-xl p-4 mb-4 border border-white/5">
                      <p className="text-xs text-on-surface leading-relaxed italic whitespace-pre-line">
                        {cleanNote(rev.note)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {rev.annotations && rev.annotations.length > 0 && (
                        <Link
                          href={`/projects/${params.id}/viewport?revId=${rev.id}`}
                          className="flex items-center gap-2 px-4 py-3 bg-primary/10 border border-primary/30 rounded-xl text-primary hover:bg-primary/20 transition-all active:scale-[0.95] group"
                        >
                          <span className="material-symbols-outlined text-sm animate-pulse">3d_rotation</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">Review Pins in 3D</span>
                          <span className="material-symbols-outlined text-xs ml-auto group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </Link>
                      )}

                      {rev.status !== 'Fixed' && (
                        <button
                          onClick={() => handleUpdateRevisionStatus(rev.id, 'Fixed')}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-success/10 border border-success/30 rounded-xl text-success hover:bg-success/20 transition-all active:scale-[0.95] group"
                        >
                          <span className="material-symbols-outlined text-sm">task_alt</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">Mark as Fixed</span>
                        </button>
                      )}

                      {rev.status === 'Fixed' && (
                        <button
                          onClick={() => handleUpdateRevisionStatus(rev.id, 'Pending')}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all active:scale-[0.95] group"
                        >
                          <span className="material-symbols-outlined text-sm opacity-50">undo</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">Re-open Revision</span>
                        </button>
                      )}
                    </div>

                    {((rev.fileUrls && rev.fileUrls.length > 0) || rev.fileUrl) && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1">Attached References</span>
                        <div className="flex flex-wrap gap-2">
                          {/* Handle both legacy single fileUrl and new fileUrls array */}
                          {rev.fileUrls ? rev.fileUrls.map((url: string, fidx: number) => (
                            <a
                              key={fidx}
                              href={`https://tqedzihlvsmolhaduntg.supabase.co/storage/v1/object/public/project-assets/${url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-lg text-cyan-400 hover:bg-cyan-400/20 transition-all active:scale-95 group"
                            >
                              <span className="material-symbols-outlined text-xs">download</span>
                              <span className="text-[9px] font-black uppercase tracking-tight">Ref {fidx + 1}</span>
                            </a>
                          )) : rev.fileUrl && (
                            <a
                              href={`https://tqedzihlvsmolhaduntg.supabase.co/storage/v1/object/public/project-assets/${rev.fileUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-lg text-cyan-400 hover:bg-cyan-400/20 transition-all active:scale-95 group"
                            >
                              <span className="material-symbols-outlined text-xs">download</span>
                              <span className="text-[9px] font-black uppercase tracking-tight">Reference File</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container rounded-2xl p-12 border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-outline text-3xl">history_edu</span>
                </div>
                <h4 className="text-sm font-bold text-white uppercase mb-1">No Revisions Yet</h4>
                <p className="text-[10px] text-outline uppercase tracking-widest max-w-[200px]">
                  When the client requests changes via the viewport, they will appear here.
                </p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            {/* Upload Section */}
            {!isDesigner && (
              <section className="bg-surface-container rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/40"></div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                    <span className="material-symbols-outlined text-primary text-sm">cloud_upload</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-tight">Media Hub</h3>
                    <p className="text-[8px] text-outline font-bold uppercase tracking-widest">Signed Cloudinary Access Enabled</p>
                  </div>
                </div>
                <CloudinaryUpload 
                  projectId={params.id as string} 
                  onSuccess={async () => {
                    // SILENT REFRESH: Update the project data without reloading the page
                    const { getDb } = await import('@/app/actions');
                    const db = await getDb();
                    const foundProject = db.projects?.find((p: any) => p.id === params.id);
                    if (foundProject) {
                      setProject(foundProject);
                      setNotification({ message: 'Gallery updated successfully! ✨', type: 'success' });
                    }
                  }} 
                />
              </section>
            )}

            {/* Assets Grid */}
            <section className="bg-surface-container rounded-2xl p-6 border border-white/5">
              {(() => {
                let items = [];
                const rawImages = project.images;
                
                if (Array.isArray(rawImages)) {
                  items = rawImages;
                } else if (typeof rawImages === 'string' && rawImages) {
                  if (rawImages.trim().startsWith('[') || rawImages.trim().startsWith('{')) {
                    try {
                      const parsed = JSON.parse(rawImages);
                      items = Array.isArray(parsed) ? parsed : [parsed];
                    } catch (e) {
                      items = rawImages.split(/[\n,]+/).map(url => ({ url: url.trim(), type: 'image' }));
                    }
                  } else {
                    items = rawImages.split(/[\n,]+/).map(url => ({ url: url.trim(), type: 'image' }));
                  }
                }
                const filteredItems = items.filter((i: any) => i.url);

                return (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xs font-black text-white uppercase tracking-tight">Project Assets</h3>
                      <span className="text-[8px] font-black text-outline uppercase tracking-[0.2em]">{filteredItems.length} Files</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {filteredItems.length === 0 ? (
                        <div className="col-span-full py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                          <span className="material-symbols-outlined text-4xl text-white/10 mb-2">collections</span>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No assets delivered yet</p>
                        </div>
                      ) : (
                        filteredItems.map((item: any, idx: number) => {
                          const isVideo = item.type === 'video' || item.url?.endsWith('.mp4') || item.url?.includes('/video/upload/');
                          return (
                            <div key={idx} className="group relative aspect-square rounded-xl bg-stone-950 border border-white/5 overflow-hidden shadow-2xl">
                              {isVideo ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900">
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform duration-500">
                                    <span className="material-symbols-outlined text-primary text-2xl">play_circle</span>
                                  </div>
                                  <span className="text-[8px] font-black text-primary uppercase tracking-widest mt-3">Project Video</span>
                                </div>
                              ) : (
                                <img src={item.url} alt="Project Asset" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              )}
                              
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-all">
                                  <span className="material-symbols-outlined text-white text-lg">open_in_new</span>
                                </a>
                              </div>
                              {project.thumbnailUrl === item.url && (
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary text-black text-[7px] font-black uppercase tracking-tighter shadow-lg">
                                  Main Thumbnail
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}
            </section>
          </div>
        )}

        {/* Tab Content: Chat - Hard-Locked Workstation */}
        {activeTab === 'chat' && (
          <div className="h-[70vh] sm:h-[600px] lg:h-[calc(100vh-180px)] border border-white/5 bg-[#0c0a04] shadow-2xl z-20 rounded-xl overflow-hidden relative">
            <ProjectChat projectId={params.id as string} projectTitle={project.title} />
          </div>
        )}

        {/* Tab Content: Feedback */}
        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <section className="bg-surface-container rounded-xl p-6 border border-white/5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-tighter text-outline mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">reviews</span>
                Project Feedback
              </h3>
              
              {feedback ? (
                <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-xl ${feedback.rating >= star ? 'text-yellow-400' : 'text-white/20'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-outline uppercase">
                      {new Date(feedback.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface leading-relaxed italic">
                    "{feedback.comment}"
                  </p>
                </div>
              ) : !isDesigner ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`text-2xl ${rating >= star ? 'text-yellow-400' : 'text-white/20'} hover:text-yellow-300 transition-colors`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 block">Comment</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-white placeholder-white/20 focus:border-yellow-400/50 focus:outline-none transition-colors"
                      placeholder="Share your feedback on the designer's work..."
                      rows={4}
                    />
                  </div>
                  
                  <button
                    onClick={async () => {
                      if (rating === 0) {
                        alert('Please select a rating');
                        return;
                      }
                      const { submitProjectFeedback } = await import('@/app/actions');
                      const res = await submitProjectFeedback(params.id as string, rating, comment);
                      if (res.success) {
                        setNotification({ message: 'Feedback submitted successfully! ✨', type: 'success' });
                        setFeedback({ rating, comment, created_at: new Date().toISOString() });
                      } else {
                        setNotification({ message: res.error || 'Failed to submit feedback.', type: 'error' });
                      }
                    }}
                    className="px-5 py-2.5 bg-yellow-400 text-black font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg shadow-yellow-400/10 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    Submit Feedback
                  </button>
                </div>
              ) : (
                <div className="text-center py-10">
                  <span className="material-symbols-outlined text-white/20 text-4xl mb-2">pending_actions</span>
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">No feedback received yet</p>
                  <p className="text-[10px] text-white/20 mt-1">Feedback from the organization will appear here once submitted.</p>
                </div>
              )}
            </section>
          </div>
        )}
            </div>

            {/* Sidebar Context Area (Right) */}
            <aside className="lg:col-span-4 space-y-6 order-1 lg:order-2">
              <div className="lg:sticky lg:top-20 space-y-6">
                {/* Primary Actions Bar */}
                <div className="flex flex-col gap-2.5">
                  <Link
                    href={`/projects/${params.id}/viewport`}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(252,224,3,0.05)] active:scale-[0.98] transition-all hover:bg-primary/20"
                  >
                    <span className="material-symbols-outlined text-lg">3d_rotation</span>
                    Open 3D Viewport
                  </Link>
                  {!isDesigner && project.status !== 'Completed' && (
                    <button
                      onClick={async () => {
                        const { updateProjectStatus } = await import('@/app/actions');
                        const res = await updateProjectStatus(params.id as string, 'Completed');
                        if (res.success) {
                          setNotification({ message: 'Project marked as completed! 🏆', type: 'success' });
                          setProject((prev: any) => ({ ...prev, status: 'Completed' }));
                        } else {
                          setNotification({ message: res.error || 'Failed to update status.', type: 'error' });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-success/10 border border-success/30 text-success text-[10px] font-black uppercase tracking-widest active:scale-[0.98] transition-all hover:bg-success/20"
                    >
                      <span className="material-symbols-outlined text-lg">workspace_premium</span>
                      Mark as Completed
                    </button>
                  )}
                  {!isDesigner && (
                    <button
                      onClick={async () => {
                        const { notifyDelivery } = await import('@/app/actions');
                        const res = await notifyDelivery(params.id as string);
                        if (res.success) {
                          setNotification({ message: res.message || 'Notification sent!', type: 'success' });
                          if (res.waLink) window.open(res.waLink, '_blank');
                        } else {
                          setNotification({ message: res.error || 'Failed to notify.', type: 'error' });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl electric-gradient text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">send</span>
                      Notify Delivery
                    </button>
                  )}
                </div>

                {/* Quick Info Card - Hidden on Mobile when non-overview active */}
                <section className={`${activeTab !== 'overview' ? 'hidden lg:block' : 'block'} bg-surface-container rounded-2xl p-5 border border-white/5 shadow-sm space-y-5`}>
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-xl bg-tertiary-container/10 flex items-center justify-center border border-tertiary-container/20">
                        <span className="material-symbols-outlined text-tertiary-container text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[8px] uppercase tracking-widest text-outline font-bold">Project Title</span>
                        <span className="text-xs font-bold text-white tracking-tight">{project.title}</span>
                      </div>
                      {!isDesigner && (
                        <button
                          onClick={() => setShowInvoiceModal(true)}
                          disabled={isSendingInvoice}
                          className={`px-3 py-1.5 rounded-lg bg-surface-container-high border border-white/5 text-tertiary-container hover:text-[#fce003] transition-all active:scale-95 flex items-center justify-center gap-2 ${isSendingInvoice ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Generate & Send Invoice"
                        >
                          {isSendingInvoice ? (
                            <div className="w-4 h-4 border-2 border-tertiary-container border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[16px]">description</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">{project.invoiceSent ? 'View Invoice' : 'Generate Invoice'}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[7.5px] uppercase tracking-widest text-outline font-bold">Order Date</span>
                      <span className="text-[11px] font-bold text-white">{formatDate(project.orderDate || project.createdAt?.split('T')[0])}</span>
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[7.5px] uppercase tracking-widest text-outline font-bold">Status</span>
                      <div className="flex items-center justify-end gap-1.5">
                         <span className={`text-[10px] font-bold uppercase ${project.status === 'Completed' ? 'text-success' : 'text-[#fce003]'}`}>{project.status}</span>
                         <span className={`w-1.5 h-1.5 rounded-full ${project.status === 'Completed' ? 'bg-success' : 'bg-[#fce003] animate-pulse'}`}></span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
                      <span className="text-[7.5px] uppercase tracking-widest text-outline font-bold">Order ID</span>
                      <span className="text-[11px] font-bold text-primary font-mono">{project.orderId}</span>
                    </div>

                    <div className="flex flex-col gap-1 pt-2 border-t border-white/5 text-right">
                      <span className="text-[7.5px] uppercase tracking-widest text-outline font-bold">Designer</span>
                      <span className="text-[11px] font-bold text-tertiary-container">{project.designer || 'Unassigned'}</span>
                    </div>
                  </div>
                </section>

                {/* Client Information Sidebar - Hidden on Mobile when non-overview active */}
                {!isDesigner && (
                  <section className={`${activeTab !== 'overview' ? 'hidden lg:block' : 'block'} bg-surface-container rounded-2xl p-5 border border-white/5 shadow-sm`}>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-outline">Partner Profile</h3>
                      <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                    </div>
                    <div className="flex flex-col gap-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex-shrink-0 border border-white/10 flex items-center justify-center overflow-hidden">
                          {client?.avatar ? (
                            <img src={client.avatar} alt={client.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-3xl text-outline">person</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white text-sm truncate">{client?.companyName || client?.name || project.client}</p>
                          <p className="text-[9px] text-outline font-bold uppercase tracking-wider">{client?.name || 'Authorized Client'}</p>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                           <span className="text-[8px] uppercase tracking-widest text-outline font-bold">Email</span>
                           <span className="text-[10px] text-white font-medium truncate max-w-[180px]">{client?.email || 'No record'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-[8px] uppercase tracking-widest text-outline font-bold">WhatsApp</span>
                           <span className="text-[10px] text-white font-bold">{client?.mobile || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span className="text-[8px] uppercase tracking-widest text-outline font-bold">Region</span>
                           <span className="flex items-center gap-1.5 text-[10px] font-bold text-white uppercase">
                              <span className="text-base">
                                {(client?.country?.toLowerCase() === 'india' || client?.mobile?.startsWith('+91')) ? '🇮🇳' :
                                  (client?.country?.toLowerCase() === 'united kingdom' || client?.country?.toLowerCase() === 'uk') ? '🇬🇧' :
                                    (client?.country?.toLowerCase() === 'united states' || client?.country?.toLowerCase() === 'us' || client?.country?.toLowerCase() === 'usa' || client?.country?.toLowerCase() === 'united states of america') ? '🇺🇸' : '🌍'}
                              </span>
                              {client?.country || (client?.mobile?.startsWith('+91') ? 'INDIA' : 'GLOBAL')}
                           </span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </main>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 md:p-8"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-6 right-6 flex gap-4 z-[110]">
            <button
              onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(prev + 0.5, 3)); }}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <span className="material-symbols-outlined">zoom_in</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(prev - 0.5, 0.5)); }}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <span className="material-symbols-outlined">zoom_out</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
              className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain transition-transform duration-300 shadow-2xl rounded-lg"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/10 px-6 py-2 rounded-full backdrop-blur-md border border-white/10">
            <p className="text-[#fce003] font-bold text-xs uppercase tracking-widest">
              Zoom: {Math.round(zoom * 100)}% • Pinch to zoom or use controls
            </p>
          </div>
        </div>
      )}
      {/* Escrow Payment Selection Modal */}
      {showPaymentModal && project && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}></div>
          <div className="relative w-full max-w-md bg-[#0c0a04] border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4 border border-orange-500/20">
                  <span className="material-symbols-outlined text-orange-500 text-3xl">shield_with_heart</span>
                </div>
                <h2 className="text-xl font-headline font-black text-white uppercase tracking-wider">Secure Designer Fees</h2>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{project.title}</p>
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex items-center justify-between">
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Required Fees</p>
                   <p className="text-2xl font-black text-[#fce003]">{project.expenseCurrency === 'USD' ? '$' : '₹'}{project.expense}</p>
                   {project.expenseCurrency === 'USD' && (
                     <p className="text-[9px] font-bold text-white/20 uppercase tracking-tight">≈ ₹{(parseFloat(project.expense) * exchangeRate).toLocaleString()}</p>
                   )}
                </div>
                <div className="text-right space-y-1">
                   <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Wallet Balance</p>
                   <p className="text-xs font-bold text-white/60">₹{walletBalance.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const reqInINR = project.expenseCurrency === 'USD' ? parseFloat(project.expense) * exchangeRate : parseFloat(project.expense);
                    if (walletBalance < reqInINR) {
                      setNotification({ message: 'Insufficient wallet balance.', type: 'error' });
                      return;
                    }
                    handleWalletPayment(parseFloat(project.expense));
                  }}
                  className={`w-full py-5 rounded-2xl border flex items-center justify-between px-6 transition-all active:scale-[0.98] ${(() => {
                      const reqInINR = project.expenseCurrency === 'USD' ? parseFloat(project.expense) * exchangeRate : parseFloat(project.expense);
                      return walletBalance >= reqInINR;
                    })()
                      ? 'bg-white/5 border-white/10 hover:border-[#fce003]/30 text-white'
                      : 'bg-white/5 border-transparent opacity-40 cursor-not-allowed text-white/40'
                    }`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Pay from Wallet</p>
                      <p className="text-[9px] font-bold opacity-60">Instant processing from available funds</p>
                    </div>
                  </div>
                  {(() => {
                    const reqInINR = project.expenseCurrency === 'USD' ? parseFloat(project.expense) * exchangeRate : parseFloat(project.expense);
                    return walletBalance >= reqInINR;
                  })() && (
                    <span className="material-symbols-outlined text-[#fce003]">arrow_forward</span>
                  )}
                </button>

                <button
                  onClick={() => {
                    const amountToPay = project.expenseCurrency === 'USD' ? parseFloat(project.expense) * exchangeRate : parseFloat(project.expense);
                    handleRazorpayPayment(amountToPay);
                  }}
                  className="w-full py-5 rounded-2xl bg-[#0055ff]/10 border border-[#0055ff]/20 text-[#0055ff] flex items-center justify-between px-6 transition-all hover:bg-[#0055ff]/20 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4 text-left">
                    <span className="material-symbols-outlined text-2xl">payments</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest">Razorpay Checkout</p>
                      <p className="text-[9px] font-bold opacity-60">Pay via UPI, Cards or NetBanking</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>

              <button 
                onClick={() => setShowPaymentModal(false)}
                className="w-full py-3 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white/40 transition-all"
              >
                Cancel Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payment Modal */}
      {showManualPaymentModal && project && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowManualPaymentModal(false)}></div>
          <div className="relative w-full max-w-md bg-[#0c0a04] border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                  <span className="material-symbols-outlined text-blue-500 text-3xl">receipt_long</span>
                </div>
                <h2 className="text-xl font-headline font-black text-white uppercase tracking-wider">Record Manual Payment</h2>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Offline Settlement Details</p>
              </div>

              {!isReceiptParsed ? (
                <div 
                  className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all relative group flex flex-col items-center justify-center min-h-[300px] ${isParsingReceipt ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5'}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file && !isParsingReceipt) {
                      handleReceiptUpload({ target: { files: [file] } } as any);
                    }
                  }}
                >
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleReceiptUpload} 
                    disabled={isParsingReceipt}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" 
                  />
                  <div className="space-y-4 relative z-0 pointer-events-none">
                    <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${isParsingReceipt ? 'bg-blue-500/20 animate-pulse' : 'bg-white/5 group-hover:bg-blue-500/10'}`}>
                      <span className={`material-symbols-outlined text-4xl transition-all ${isParsingReceipt ? 'text-blue-400' : 'text-white/40 group-hover:text-blue-400'}`}>
                        {isParsingReceipt ? 'hourglass_empty' : 'cloud_upload'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{isParsingReceipt ? 'Analyzing Receipt...' : 'Upload Payment Receipt'}</h3>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-2">
                        {isParsingReceipt ? 'Extracting details via Gemini AI' : 'Drag & drop image or click to browse'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-success">check_circle</span>
                    <div>
                      <p className="text-[10px] font-black text-success uppercase tracking-widest">Parsed Successfully</p>
                      <p className="text-[9px] font-bold text-success/60 mt-0.5">Please review the extracted details below</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Platform (e.g. Bank, GPay)</label>
                      <input type="text" value={manualPaymentForm.platform} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 cursor-not-allowed focus:outline-none transition-all" placeholder="Kotak811" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Transaction ID</label>
                      <input type="text" value={manualPaymentForm.transactionId} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 cursor-not-allowed focus:outline-none transition-all" placeholder="Txn ID" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Recipient Name</label>
                      <input type="text" value={manualPaymentForm.recipientName} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 cursor-not-allowed focus:outline-none transition-all" placeholder="Designer Name" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Date</label>
                        <input type="date" value={manualPaymentForm.date} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 cursor-not-allowed focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Time</label>
                        <input type="time" value={manualPaymentForm.time} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/70 cursor-not-allowed focus:outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-white/40 uppercase tracking-widest block mb-1.5">Amount Paid</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">₹</span>
                        <input type="text" value={manualPaymentForm.amountPaid} readOnly className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm text-white/70 cursor-not-allowed focus:outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setShowManualPaymentModal(false)}
                      className="flex-1 py-4 rounded-xl border border-white/10 bg-white/5 text-white font-headline font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        if (!manualPaymentForm.platform || !manualPaymentForm.transactionId || !manualPaymentForm.amountPaid) {
                          setNotification({ message: 'Please fill all required fields.', type: 'error' });
                          return;
                        }
                        const manualPaymentBlock = `\n\n[MANUAL_PAYMENT]\nPlatform: ${manualPaymentForm.platform}\nTransaction ID: ${manualPaymentForm.transactionId}\nRecipient Name: ${manualPaymentForm.recipientName}\nDate: ${manualPaymentForm.date}\nTime: ${manualPaymentForm.time}\nAmount Paid: ${manualPaymentForm.amountPaid}`;
                        
                        const newDescription = (project.description || '') + manualPaymentBlock;
                        
                        const { updateProject } = await import('@/app/actions');
                        const res = await updateProject(project.id, { 
                          description: newDescription,
                          payoutStatus: 'Paid'
                        });
                        
                        if (res.success) {
                          setNotification({ message: 'Manual payment recorded successfully!', type: 'success' });
                          setShowManualPaymentModal(false);
                          window.location.reload();
                        } else {
                          setNotification({ message: res.error || 'Failed to record manual payment.', type: 'error' });
                        }
                      }}
                      className="flex-1 py-4 rounded-xl bg-blue-500 text-white font-headline font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Save Record
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Invoice Viewer Modal */}
      {showInvoiceModal && project && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)}></div>
          <div className="relative w-full max-w-4xl h-[90vh] bg-[#0c0a04] border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col">
            <div className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-black/50 shrink-0 gap-3">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-tertiary-container/10 flex items-center justify-center border border-tertiary-container/20 flex-shrink-0">
                  <span className="material-symbols-outlined text-tertiary-container text-sm sm:text-base">receipt_long</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-headline font-black text-white text-sm sm:text-lg tracking-wider uppercase truncate">Invoice</h3>
                  <p className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">{project.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                <button
                  onClick={() => window.open(`/api/projects/${project.id}/invoice?print=true`, '_blank')}
                  className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-surface-container-high border border-white/10 text-white font-headline font-black text-[10px] uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1 sm:gap-2"
                  title="Download / Print"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={async () => {
                    await handleSendInvoice();
                    setShowInvoiceModal(false);
                  }}
                  disabled={isSendingInvoice}
                  className="px-3 py-2 sm:px-5 sm:py-2.5 rounded-xl electric-gradient text-black font-headline font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-1 sm:gap-2 disabled:opacity-50"
                  title="Send Invoice"
                >
                  {isSendingInvoice ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span className="hidden sm:inline">Send</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all ml-1 sm:ml-2 flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-base sm:text-xl">close</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden bg-white relative">
              <iframe 
                src={`/api/projects/${project.id}/invoice`} 
                className="w-full h-full border-none absolute inset-0" 
                title="Invoice Preview"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
