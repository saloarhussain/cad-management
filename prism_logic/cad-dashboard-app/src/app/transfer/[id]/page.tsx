import React from 'react';
import { createAdminClient, createClient } from '@/lib/supabaseServer';
import Link from 'next/link';
import ViewportCanvas from '@/components/viewport/ViewportCanvas';
import ZipPreviewer from '@/components/viewport/ZipPreviewer';
import TransferCheckout from '@/components/transfer/TransferCheckout';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DownloadPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const isPaid = sp.success === 'true';

  const supabase = await createAdminClient();
  const supabaseAuth = await createClient();
  const { data: { session } } = await supabaseAuth.auth.getSession();
  const isAuthenticated = !!session;

  // Fetch the transfer record
  const { data: transfer, error } = await supabase
    .from('file_transfers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !transfer) {
    return (
      <div className="bg-[#121414] text-[#e2e2e2] font-body min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tighter text-white uppercase mb-4">Transfer Not Found</h1>
        <p className="text-[#979177] mb-6">The link might be invalid or the transfer has been removed.</p>
        <Link href="/transfer" className="text-[#ffe311] hover:underline">Go to Upload Page</Link>
      </div>
    );
  }

  // Fetch the uploader's payment configuration
  const { data: uploaderSettings } = await supabase
    .from('settings')
    .select('payment_methods')
    .eq('user_id', transfer.uploader_id)
    .maybeSingle();

  const uploaderMethods = Array.isArray(uploaderSettings?.payment_methods) ? uploaderSettings.payment_methods : [];

  // Check expiration
  const expiresAt = new Date(transfer.expires_at);
  const now = new Date();
  const isExpired = expiresAt < now;

  if (isExpired) {
    return (
      <div className="bg-[#121414] text-[#e2e2e2] font-body min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-2xl font-extrabold tracking-tighter text-white uppercase mb-4">Link Expired</h1>
        <p className="text-[#979177] mb-6">This file transfer has expired (valid for 7 days).</p>
        <Link href="/transfer" className="text-[#ffe311] hover:underline">Go to Upload Page</Link>
      </div>
    );
  }

  // Determine if payment is required
  const requiresPayment = transfer.price > 0 && !isPaid;

  // Generate a short-lived signed URL for preview/download (1 hour)
  const { data: urlData } = await supabase
    .storage
    .from('file-transfers')
    .createSignedUrl(transfer.file_path, 3600);
  const downloadUrl = urlData?.signedUrl || '';

  return (
    <div className={`bg-[#121414] text-[#e2e2e2] font-body h-screen overflow-hidden flex flex-col selection:bg-[#ffe30c] selection:text-[#201c00] ${isAuthenticated ? 'pt-16' : ''}`}>
      <style>{`
        .electric-gradient-border {
            background: linear-gradient(#121414, #121414) padding-box,
                        linear-gradient(45deg, #fce003, #00fbfe) border-box;
            border: 2px dashed transparent;
        }
        .kinetic-btn {
            background: linear-gradient(90deg, #ffe311 0%, #00fbfe 100%);
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>

      {/* Header Section */}
      {!isAuthenticated && (
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#4b4732]/10 bg-[#1a1c1c]/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#fce003] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(252,224,3,0.3)]">
                <span className="material-symbols-outlined text-black text-2xl font-black">architecture</span>
             </div>
             <div>
                <h1 className="text-2xl font-headline font-black text-white tracking-tighter uppercase italic leading-none">
                  CAD<span className="text-[#fce003]">ONCE</span>
                </h1>
                <p className="text-[10px] font-bold text-[#fce003] mt-1 drop-shadow-[0_0_100px_rgba(252,224,3,0.5)]">
                  For Organizations
                </p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <Link 
               href="/auth/login" 
               className="px-4 py-2 rounded-lg bg-[#ffe311] text-[#0c0a04] hover:bg-[#ffe311]/90 transition-colors font-bold text-sm tracking-widest shadow-[0_4px_20px_rgba(252,224,3,0.15)]"
             >
               LOGIN
             </Link>
          </div>
        </header>
      )}

      {/* Main Centralized Content - Asset Workstation Layout */}
      <main className="flex-1 flex flex-col w-full min-h-0 bg-[#0c0f0f]">
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-[2000px] mx-auto w-full">
          
          {/* Download Card JSX to be injected into the sidebar */}
          {(() => {
            const downloadCardJsx = (
              <section className="bg-[#333535] rounded-3xl p-6 border border-white/10 relative overflow-hidden">
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#00f2ff]/10 blur-[60px] rounded-full"></div>
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-[#121414] rounded-2xl flex items-center justify-center border border-white/5">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#00f2ff]/20 to-[#00f2ff]/40 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#00f2ff]">download</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black italic tracking-tight font-headline break-all text-white">{transfer.file_name}</h3>
                      <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{(transfer.file_size / (1024 * 1024)).toFixed(2)} MB • READY FOR CLOUD</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-4 border-y border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Type</span>
                      <span className="text-[11px] font-extrabold text-white">{transfer.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Status</span>
                      <span className="text-[11px] font-extrabold text-[#00f2ff]">AVAILABLE</span>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Engine</span>
                      <span className="text-[11px] font-extrabold text-white">V.4.2</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {transfer.recipient && (
                      <div className="bg-[#00f2ff]/10 border border-[#00f2ff]/20 px-4 py-3 rounded-2xl flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#00f2ff] text-xl">person</span>
                        <div>
                          <p className="text-[8px] font-black text-[#00f2ff] uppercase tracking-widest leading-none">PREPARED FOR</p>
                          <p className="text-xs font-bold text-white mt-1.5">{transfer.recipient}</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-white/5 px-4 py-2 rounded-full inline-block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffe30c]">Expires in {Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days</span>
                    </div>
                    
                    {requiresPayment ? (
                      <TransferCheckout transferId={transfer.id} fileName={transfer.file_name} price={transfer.price} uploaderMethods={uploaderMethods} />
                    ) : downloadUrl ? (
                      <a 
                        href={downloadUrl}
                        className="w-full electric-gradient text-black py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center"
                        download={transfer.file_name}
                      >
                        DOWNLOAD FILE
                      </a>
                    ) : (
                      <button 
                        className="w-full bg-[#1e2020] text-white/30 py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] shadow-xl cursor-not-allowed flex items-center justify-center"
                        disabled
                      >
                        LINK UNAVAILABLE
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );

            // If 3D single file
            if (transfer.file_name.toLowerCase().endsWith('.stl') || transfer.file_name.toLowerCase().endsWith('.obj')) {
              return (
                <div className="flex-1 w-full h-full relative min-h-0">
                  <ViewportCanvas 
                    fileUrl={downloadUrl} 
                    fileName={transfer.file_name} 
                    metalType="gold" 
                    isReviewMode={false}
                    sidebarFooter={downloadCardJsx}
                  />
                  {requiresPayment && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none flex flex-wrap items-center justify-center gap-12 p-8 opacity-[0.08]">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="text-white font-headline font-black uppercase text-xl md:text-2xl tracking-[0.25em] -rotate-30 select-none whitespace-nowrap"
                        >
                          CADONCE PREVIEW
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // If Zip Archive
            if (transfer.file_name.toLowerCase().endsWith('.zip')) {
              return (
                <div className="flex-1 w-full h-full relative min-h-0">
                  <ZipPreviewer zipUrl={downloadUrl} sidebarFooter={downloadCardJsx} />
                  {requiresPayment && (
                    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none flex flex-wrap items-center justify-center gap-12 p-8 opacity-[0.08]">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="text-white font-headline font-black uppercase text-xl md:text-2xl tracking-[0.25em] -rotate-30 select-none whitespace-nowrap"
                        >
                          CADONCE PREVIEW
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // If Image or Video
            const isImage = transfer.mime_type?.startsWith('image/') || transfer.file_name.match(/\.(jpg|jpeg|png|gif|webp|heic|bmp|svg)$/i);
            const isVideo = transfer.mime_type?.startsWith('video/') || transfer.file_name.match(/\.(mp4|mov|webm|avi|mkv)$/i);

            if (isImage || isVideo) {
              return (
                <div className="flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden relative group font-body bg-[#0c0f0f]">
                  {/* Media Viewport */}
                  <div className="w-full min-h-[50vh] md:min-h-0 md:flex-1 relative overflow-hidden bg-black/80 flex items-center justify-center p-4 md:p-8">
                    {isImage ? (
                      <img src={downloadUrl} alt={transfer.file_name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                    ) : (
                      <video src={downloadUrl} controls className="max-w-full max-h-full rounded-xl shadow-2xl outline-none" />
                    )}
                    {requiresPayment && (
                      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden select-none flex flex-wrap items-center justify-center gap-12 p-8 opacity-[0.08]">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div 
                            key={i} 
                            className="text-white font-headline font-black uppercase text-xl md:text-2xl tracking-[0.25em] -rotate-30 select-none whitespace-nowrap"
                          >
                            CADONCE PREVIEW
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sidebar */}
                  <aside className="flex-1 min-h-0 md:flex-none w-full md:w-[380px] lg:w-[420px] xl:w-[460px] bg-[#1a1c1c] md:border-l border-white/10 overflow-y-auto custom-scrollbar z-20 flex flex-col">
                    <div className="p-6 md:p-8 flex-1 flex flex-col justify-center pb-12 md:pb-8">
                      {downloadCardJsx}
                    </div>
                  </aside>
                </div>
              );
            }
            
            // Non-media / unsupported preview (e.g. PDFs, documents)
            return (
              <div className="flex-1 flex items-center justify-center p-8 bg-[#0c0f0f]">
                <div className="w-full max-w-md">
                  {downloadCardJsx}
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
