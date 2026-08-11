'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Script from 'next/script';
import { useAuth } from '@/components/AuthProvider';

export default function TransferPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState('0.0 MB/s');
  const [shareLink, setShareLink] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [requirePayment, setRequirePayment] = useState(false);
  const [applyWatermark, setApplyWatermark] = useState(true);
  const [price, setPrice] = useState<string>('');
  const { isAuthenticated, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTimeRef = useRef<number>(0);

  const [recipients, setRecipients] = useState<{ id: string; name: string; type: 'client' | 'team'; email?: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('General Link');

  React.useEffect(() => {
    const loadRecipients = async () => {
      try {
        const list: any[] = [];
        
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, email')
          .order('name');
          
        if (clientsData && clientsData.length > 0) {
          clientsData.forEach((c: any) => {
            list.push({ id: c.id, name: c.name, type: 'client', email: c.email });
          });
        }
        
        const { data: designersData } = await supabase
          .from('designers')
          .select('id, fullName, email')
          .order('fullName');
          
        if (designersData && designersData.length > 0) {
          designersData.forEach((d: any) => {
            list.push({ id: d.id, name: d.fullName, type: 'team', email: d.email });
          });
        }
        
        setRecipients(list);
      } catch (err) {
        console.error('Error loading recipients:', err);
      }
    };

    if (isAuthenticated) {
      loadRecipients();
    }
  }, [isAuthenticated]);

  const getGroupedRecipients = () => {
    const clients = recipients.filter(r => r.type === 'client');
    const team = recipients.filter(r => r.type === 'team');
    
    return {
      clients: clients.length > 0 ? clients : [
        { id: '1', name: 'Alexander Sterling' },
        { id: '2', name: 'Sophia Laurent' },
        { id: '3', name: 'Vance Casting House' }
      ],
      team: team
    };
  };

  const [transfers, setTransfers] = useState<any[]>([]);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  React.useEffect(() => {
    const loadTransfers = async () => {
      try {
        let query = supabase.from('file_transfers').select('*');
        
        if (isAuthenticated && user?.id) {
          query = query.eq('uploader_id', user.id);
        } else {
          query = query.is('uploader_id', null);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (!error && data) {
          setTransfers(data);
        }
      } catch (err) {
        console.error('Error loading transfers:', err);
      }
    };

    loadTransfers();
  }, [isAuthenticated, user?.id, reloadTrigger]);

  const totalStorageBytes = transfers.reduce((acc, t) => acc + (t.file_size || 0), 0);
  const activeLinksCount = transfers.filter(t => new Date(t.expires_at) > new Date()).length;
  const totalClicks = transfers.reduce((acc, t) => acc + (t.downloads || 0), 0);

  const formatStorageUsed = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const selectedFiles = e.dataTransfer.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const generateLink = async () => {
    if (files.length === 0) {
      alert('Please select at least one file first.');
      return;
    }

    if (requirePayment && parseFloat(price) > 0 && !isAuthenticated) {
      alert('You must be logged in to set a price for downloads.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setSpeed('0.0 MB/s');
    setError('');
    const uploadStartTime = Date.now();

    try {
      console.log('Starting file transfer process...');
      
      let fileToUpload: File | Blob;
      let finalFileName: string;
      let fileExt: string;
      
      if (files.length > 1) {
        console.log('Multiple files selected, creating ZIP...');
        if (!(window as any).JSZip) {
          throw new Error('JSZip library not loaded yet. Please wait or refresh.');
        }
        const zip = new (window as any).JSZip();
        files.forEach(f => {
          zip.file(f.name, f);
        });
        fileToUpload = await zip.generateAsync({ type: 'blob' });
        finalFileName = 'Archive.zip';
        fileExt = 'zip';
      } else {
        fileToUpload = files[0];
        finalFileName = files[0].name;
        fileExt = files[0].name.split('.').pop() || '';
      }

      if (applyWatermark) {
        if (finalFileName.includes('.')) {
          const nameWithoutExt = finalFileName.substring(0, finalFileName.lastIndexOf('.'));
          finalFileName = `${nameWithoutExt} [WATERMARKED].${fileExt}`;
        } else {
          finalFileName = `${finalFileName} [WATERMARKED]`;
        }
      }

      const randomName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `transfers/${randomName}`;

      // Upload file to Supabase Storage using XMLHttpRequest for progress support
      const xhr = new XMLHttpRequest();
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/file-transfers/${filePath}`;
      xhr.open('POST', url);
      
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || key;
      
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('apikey', key);
      xhr.setRequestHeader('Content-Type', fileToUpload.type || 'application/octet-stream');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);

          const elapsedTime = (Date.now() - uploadStartTime) / 1000;
          const uploadedMB = event.loaded / (1024 * 1024);
          const currentSpeed = (uploadedMB / elapsedTime).toFixed(1);
          setSpeed(`${currentSpeed} MB/s`);
        }
      };

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 201) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network Error during upload'));
      });

      xhr.send(fileToUpload);
      const uploadResult = await uploadPromise;
      console.log('File uploaded to storage successfully:', uploadResult);

      // Create record in database
      console.log('Creating database record...');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const { data: dbData, error: dbError } = await supabase
        .from('file_transfers')
        .insert([
          {
            file_path: filePath,
            file_name: finalFileName,
            file_size: fileToUpload.size,
            mime_type: fileToUpload.type || 'application/octet-stream',
            expires_at: expiresAt.toISOString(),
            price: requirePayment && price ? parseFloat(price) : 0,
            uploader_id: isAuthenticated ? user?.id : null,
            recipient: selectedRecipient !== 'General Link' ? selectedRecipient : null
          },
        ])
        .select();

      if (dbError) throw dbError;
      console.log('Database record created successfully:', dbData);

      const finalShareLink = `${window.location.origin}/transfer/${dbData[0].id}`;
      setShareLink(finalShareLink);
      
      // Auto-send email if recipient is assigned
      if (selectedRecipient !== 'General Link') {
        const recipientObj = recipients.find(r => r.name === selectedRecipient);
        if (recipientObj) {
          if (!recipientObj.email) {
            alert(`Link generated, but we couldn't send an email because ${recipientObj.name} does not have an email address on file.`);
          } else {
            try {
              console.log(`Sending email via Gmail API to ${recipientObj.email}...`);
              const emailRes = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  toEmail: recipientObj.email,
                  toName: recipientObj.name,
                  shareLink: finalShareLink,
                  fileName: finalFileName,
                  requirePayment,
                  price
                })
              });
              const emailData = await emailRes.json();
              if (!emailRes.ok || !emailData.success) {
                if (emailData.code === 'NO_GMAIL') {
                  alert(`Link generated! However, we couldn't auto-send the email because you haven't connected your Gmail account in the Settings yet.`);
                } else {
                  alert(`Link generated, but email sending failed: ${emailData.error}`);
                  console.error('Failed to send email:', emailData.error);
                }
              } else {
                alert(`Link generated and email successfully sent to ${recipientObj.name}!`);
                console.log('Email sent successfully:', emailData);
              }
            } catch (err) {
              alert(`Link generated, but a network error occurred while sending the email.`);
              console.error('Network error sending email:', err);
            }
          }
        }
      }

      setReloadTrigger(prev => prev + 1);

    } catch (err: any) {
      console.error('Error in generateLink:', err);
      setError(err.message || 'An unknown error occurred during link generation.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`bg-[#121414] text-[#e2e2e2] font-body min-h-screen flex flex-col selection:bg-[#ffe30c] selection:text-[#201c00] ${isAuthenticated ? 'pt-16' : ''}`}>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" strategy="lazyOnload" />
      <style>{`
        .electric-gradient-border {
            background: linear-gradient(#121414, #121414) padding-box,
                        linear-gradient(45deg, #F59E0B, #00fbfe) border-box;
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
             <div className="w-12 h-12 bg-[#F59E0B] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(252,224,3,0.3)]">
                <span className="material-symbols-outlined text-black text-2xl font-black">architecture</span>
             </div>
             <div>
                <h1 className="text-2xl font-headline font-black text-white tracking-tighter uppercase italic leading-none">
                  CAD<span className="text-[#F59E0B]">ONCE</span>
                </h1>
                <p className="text-[10px] font-bold text-[#F59E0B] mt-1 drop-shadow-[0_0_100px_rgba(252,224,3,0.5)]">
                  For Organizations
                </p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link 
                href="/" 
                className="px-4 py-2 rounded-lg bg-[#333535] text-white hover:bg-[#4b4732] transition-colors font-bold text-sm tracking-widest shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
              >
                GO TO DASHBOARD
              </Link>
            ) : (
              <Link 
                href="/auth/login" 
                className="px-4 py-2 rounded-lg bg-[#ffe311] text-[#0c0a04] hover:bg-[#ffe311]/90 transition-colors font-bold text-sm tracking-widest shadow-[0_4px_20px_rgba(252,224,3,0.15)]"
              >
                LOGIN
              </Link>
            )}
          </div>
        </header>
      )}

      {/* Main Centralized Content - Two Column Responsive Layout */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Analytics & Ledger */}
          <div className="lg:col-span-7 w-full space-y-8">
            
            {/* Storage & Clicks Analytics */}
            <div className="bg-[#1a1c1c] border border-[#4b4732]/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#00fbfe]/5 blur-[40px] rounded-full"></div>
              <h3 className="font-headline font-bold text-lg text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffe311]">analytics</span>
                Secure Share Analytics
              </h3>
              
              <div className="space-y-6">
                {/* Cloud storage progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end text-xs">
                    <span className="font-medium text-white/50">Confidential Cloud Storage Space</span>
                    <strong className="text-white font-mono">{formatStorageUsed(totalStorageBytes)} / 50 GB</strong>
                  </div>
                  <div className="w-full h-2 bg-[#121414] rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ffe311] to-[#00fbfe] rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (totalStorageBytes / (50 * 1024 * 1024 * 1024)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Active links and click stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0c0a04] p-4 rounded-xl border border-[#4b4732]/30 relative overflow-hidden">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#979177]">Active Links</p>
                    <span className="text-2xl font-black font-headline text-white mt-1 block">{activeLinksCount}</span>
                  </div>
                  <div className="bg-[#0c0a04] p-4 rounded-xl border border-[#4b4732]/30 relative overflow-hidden">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#979177]">Verified Clicks</p>
                    <span className="text-2xl font-black font-headline text-[#00fbfe] mt-1 block">{totalClicks}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* History Ledger Table */}
            <div className="bg-[#1a1c1c] border border-[#4b4732]/30 rounded-2xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-[#4b4732]/20 flex items-center justify-between">
                <h3 className="font-headline font-bold text-lg text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00fbfe]">history</span>
                  Active Transfers Ledger
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-[#121414] rounded-full border border-[#4b4732]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00fbfe] animate-pulse"></span>
                  <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Auto Sync</span>
                </div>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#121414]">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-[#979177] uppercase tracking-widest">Share Details</th>
                      <th className="px-6 py-4 text-[9px] font-black text-[#979177] uppercase tracking-widest">Recipient &amp; Expiry</th>
                      <th className="px-6 py-4 text-[9px] font-black text-[#979177] uppercase tracking-widest text-center">Security</th>
                      <th className="px-6 py-4 text-[9px] font-black text-[#979177] uppercase tracking-widest text-center">Downloads</th>
                      <th className="px-6 py-4 text-[9px] font-black text-[#979177] uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#4b4732]/10 text-sm">
                    {transfers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#979177]">
                          <span className="material-symbols-outlined text-4xl mb-2 opacity-30">folder_open</span>
                          <p className="text-[11px] font-bold uppercase tracking-widest">No Active Share Links Generated</p>
                        </td>
                      </tr>
                    ) : (
                      transfers.map((t) => {
                        const isExpired = new Date(t.expires_at) < new Date();
                        const sizeMB = (t.file_size / (1024 * 1024)).toFixed(1);
                        
                        return (
                          <tr key={t.id} className="hover:bg-[#121414]/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-white max-w-[180px] truncate" title={t.file_name}>
                                {t.file_name}
                              </div>
                              <div className="text-[10px] text-[#979177] mt-0.5">{sizeMB} MB | ID: {t.id.substring(0, 8)}...</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-white">{t.recipient || 'General Link'}</div>
                              <div className={`text-[10px] uppercase font-bold tracking-tight mt-0.5 ${isExpired ? 'text-red-400' : 'text-[#ffe311]'}`}>
                                {isExpired ? 'Expired' : `${Math.ceil((new Date(t.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left`}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                                t.price > 0 ? 'bg-[#ffe311]/10 text-[#ffe311] border border-[#ffe311]/20' : 'bg-[#00fbfe]/10 text-[#00fbfe] border border-[#00fbfe]/20'
                              }`}>
                                <span className="material-symbols-outlined text-[11px]">{t.price > 0 ? 'payments' : 'verified_user'}</span>
                                {t.price > 0 ? `$${t.price.toFixed(2)}` : 'FREE'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-mono font-bold text-white">
                              {t.downloads || 0}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const link = `${window.location.origin}/transfer/${t.id}`;
                                  navigator.clipboard.writeText(link);
                                  alert('Link copied to clipboard!');
                                }}
                                className="p-2 hover:bg-[#333535] rounded-lg text-[#00fbfe] transition-all hover:scale-105 active:scale-95"
                                title="Copy Share Link"
                              >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: Upload Form */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:mx-0 flex flex-col gap-8">
            {/* Upload Zone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="group relative aspect-square w-full rounded-xl flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br from-[#1a1c1c] to-[#0c0a04] cursor-pointer transition-all hover:scale-[1.01] shadow-[0_10px_50px_rgba(0,0,0,0.5)]"
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                onClick={(e) => e.stopPropagation()}
                className="hidden"
                multiple
              />
              
              <div className="absolute top-4 right-4 flex gap-2">
                <span className="px-2 py-1 bg-[#333535] rounded text-[10px] font-mono text-white/50 border border-[#4b4732]/20">ENCRYPTED</span>
              </div>
              
              <div className="w-20 h-20 rounded-full kinetic-btn flex items-center justify-center shadow-[0_0_30px_rgba(252,224,3,0.3)] group-hover:scale-105 transition-transform">
                {uploading ? (
                  <span className="text-on-primary font-bold text-xl">{progress}%</span>
                ) : (
                  <span className="material-symbols-outlined text-[#383100] text-4xl" style={{ fontVariationSettings: '"wght" 700' }}>add</span>
                )}
              </div>
              
              <div className="text-center">
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  {files.length > 0 ? (files.length === 1 ? files[0].name : `${files.length} Files Selected`) : 'Upload or Drag Files'}
                </h3>
                <p className="text-[#979177] text-sm">
                  {files.length > 0 ? `${(files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB` : 'Drag files or click to browse'}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e2020] border border-[#4b4732]/30">
                  <span className="text-[11px] font-mono font-bold text-[#ffe311] uppercase tracking-widest">Max 2GB</span>
                </div>
              </div>
              
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-6 px-4">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-[#979177] font-label uppercase">Speed</span>
                  <span className="text-xs font-mono text-white">{speed}</span>
                </div>
                <div className="flex flex-col items-center border-x border-[#4b4732]/30 px-6">
                  <span className="text-[9px] text-[#979177] font-label uppercase">Files</span>
                  <span className="text-xs font-mono text-white">{files.length > 0 ? `${files.length} Loaded` : '0 Loaded'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-[#979177] font-label uppercase">Engine</span>
                  <span className="text-xs font-mono text-white">V.4.2</span>
                </div>
              </div>
            </div>

            {/* Recipient Selector */}
            <div className="bg-[#1a1c1c] border border-[#4b4732]/30 rounded-xl p-5 flex flex-col gap-3 shadow-lg transition-all">
              <div>
                <h4 className="text-white font-bold text-sm">Assign Recipient</h4>
                <p className="text-[#979177] text-[10px] uppercase tracking-widest mt-1">Assign this link to a client or team member</p>
              </div>
              
              <select
                value={selectedRecipient}
                onChange={(e) => setSelectedRecipient(e.target.value)}
                className="w-full bg-[#0c0a04] border border-[#4b4732]/50 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#ffe311] transition-all color-scheme-dark"
              >
                <option value="General Link">No Recipient (Generate General Share Link)</option>
                
                {(() => {
                  const { clients, team } = getGroupedRecipients();
                  return (
                    <>
                      <optgroup label="Clients" className="bg-[#1a1c1c] text-white">
                        {clients.map(c => (
                          <option key={c.id} value={c.name} className="bg-[#1a1c1c]">
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                      {team.length > 0 && (
                        <optgroup label="Team Members" className="bg-[#1a1c1c] text-white">
                          {team.map(t => (
                            <option key={t.id} value={t.name} className="bg-[#1a1c1c]">
                              {t.name} (Team)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  );
                })()}
              </select>
            </div>

            {/* Watermark Options */}
            <div className="bg-[#1a1c1c] border border-[#4b4732]/30 rounded-xl p-5 flex flex-col gap-4 shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-sm">Apply Watermark</h4>
                  <p className="text-[#979177] text-[10px] uppercase tracking-widest mt-1">Protect media with CADONCE watermark</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={applyWatermark} onChange={(e) => setApplyWatermark(e.target.checked)} />
                  <div className="w-11 h-6 bg-[#333535] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffe311]"></div>
                </label>
              </div>
            </div>

            {/* Payment Options */}
            <div className="bg-[#1a1c1c] border border-[#4b4732]/30 rounded-xl p-5 flex flex-col gap-4 shadow-lg transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-bold text-sm">Require Payment</h4>
                  <p className="text-[#979177] text-[10px] uppercase tracking-widest mt-1">Charge users to download</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={requirePayment} onChange={(e) => setRequirePayment(e.target.checked)} />
                  <div className="w-11 h-6 bg-[#333535] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ffe311]"></div>
                </label>
              </div>
              
              {requirePayment && (
                <div className="animate-in slide-in-from-top-2 duration-200 mt-2 pt-4 border-t border-[#4b4732]/30">
                  {!isAuthenticated ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold text-center">
                      You must be logged in to collect payments.
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#333535] flex items-center justify-center border border-[#4b4732]/50 text-[#ffe311] font-black">
                        $
                      </div>
                      <input 
                        type="number" 
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        min="0.50"
                        step="0.01"
                        className="flex-1 bg-[#0c0a04] border border-[#4b4732]/50 rounded-lg px-4 py-2 text-white font-mono text-lg outline-none focus:border-[#ffe311] transition-all"
                      />
                      <div className="px-3 py-2 bg-[#1e2020] rounded-lg border border-[#4b4732]/30 text-[#979177] font-bold text-xs uppercase tracking-widest">
                        USD
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Area */}
            {shareLink ? (
              <div className="flex flex-col gap-3 w-full animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-2 p-3 bg-[#1a1c1c] border border-[#ffe311]/50 rounded-lg shadow-[0_0_20px_rgba(252,224,3,0.15)]">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] text-[#ffe311] font-bold uppercase tracking-widest mb-1">Shareable Link Ready</p>
                    <p className="text-white text-sm truncate font-mono">{shareLink}</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`kinetic-btn w-full h-16 rounded-lg font-display font-extrabold text-lg tracking-widest uppercase transition-all active:scale-[0.98] ${copied ? 'bg-white text-black shadow-[0_10px_40px_rgba(255,255,255,0.3)]' : 'bg-[#ffe311] text-[#383100] shadow-[0_10px_40px_rgba(252,224,3,0.2)] hover:shadow-[0_15px_50px_rgba(252,224,3,0.3)]'}`}
                >
                  {copied ? 'COPIED TO CLIPBOARD!' : 'COPY LINK'}
                </button>
                <button 
                  onClick={() => setShareLink('')} 
                  className="w-full h-12 bg-[#1a1c1c] border border-[#4b4732]/50 hover:border-[#ffe311]/50 rounded-lg text-[#979177] hover:text-[#ffe311] text-xs uppercase tracking-widest font-bold mt-1 transition-all active:scale-[0.98]"
                >
                  Generate New Link
                </button>
              </div>
            ) : (
              <button 
                onClick={generateLink}
                disabled={uploading || files.length === 0}
                className={`kinetic-btn w-full h-16 rounded-lg font-display font-extrabold text-[#383100] text-lg tracking-widest uppercase shadow-[0_10px_40px_rgba(252,224,3,0.2)] hover:shadow-[0_15px_50px_rgba(252,224,3,0.3)] transition-all active:scale-[0.98] ${uploading || files.length === 0 ? 'opacity-50 cursor-not-allowed bg-[#ffe311]/50' : 'bg-[#ffe311]'}`}
              >
                {uploading ? 'UPLOADING...' : 'GENERATE LINK'}
              </button>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-center text-sm font-bold">
                {error}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

