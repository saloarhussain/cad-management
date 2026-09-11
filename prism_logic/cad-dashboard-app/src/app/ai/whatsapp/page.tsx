'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { parseUploadedFile, parseWhatsAppChat, SAMPLE_CHAT_TEXT, ChatMessage } from '@/lib/whatsappParser';
import { ensureBanglish, containsBengaliScript } from '@/lib/bengaliTransliterate';
import WhatsAppVisualViewer from '@/components/whatsapp/WhatsAppVisualViewer';

export default function WhatsAppBanglishPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<string[]>([]);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [tone, setTone] = useState<'casual' | 'formal' | 'slang'>('casual');
  const [showExportGuide, setShowExportGuide] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically translate messages to Banglish via our AI route
  const translateMessagesToBanglish = async (rawMessages: ChatMessage[], currentTone: 'casual' | 'formal' | 'slang') => {
    setIsTranslating(true);
    setStatusMessage('Translating messages to Banglish with Gemini AI...');

    try {
      // 1. Immediately ensure EVERY message is in Banglish right away so zero Bengali script shows
      const updatedMessages = rawMessages.map((m) => ({
        ...m,
        banglishText: ensureBanglish(m.banglishText || m.text),
      }));

      // Render immediately with 100% Banglish
      setMessages([...updatedMessages]);

      // 2. Upgrade to conversational AI Banglish in batches of 25
      const batchSize = 25;

      for (let i = 0; i < rawMessages.length; i += batchSize) {
        const chunk = rawMessages.slice(i, i + batchSize);
        setStatusMessage(`Refining with AI Banglish... (${Math.min(i + batchSize, rawMessages.length)}/${rawMessages.length} messages)`);

        try {
          const res = await fetch('/api/ai/whatsapp-banglish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: chunk.map((m) => ({
                id: m.id,
                sender: m.sender,
                text: m.text,
                isSystem: m.isSystem,
              })),
              tone: currentTone,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.translations && Array.isArray(data.translations)) {
              const map = new Map<string, string>(
                data.translations.map((t: any) => [t.id, ensureBanglish(t.banglishText)])
              );
              for (let j = i; j < Math.min(i + batchSize, rawMessages.length); j++) {
                const m = updatedMessages[j];
                if (map.has(m.id) && map.get(m.id)) {
                  m.banglishText = ensureBanglish(map.get(m.id)!);
                } else {
                  m.banglishText = ensureBanglish(m.banglishText || m.text);
                }
              }
            }
          }
        } catch (chunkErr) {
          console.warn('Chunk AI translation error, keeping flawless transliteration:', chunkErr);
        }

        // Update state incrementally so user sees live translation upgrade
        setMessages([...updatedMessages]);

        // Gentle pause to avoid hitting Gemini RPM rate limits
        if (i + batchSize < rawMessages.length) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }

      setStatusMessage('');
    } catch (err) {
      console.error('Translation error:', err);
      setStatusMessage('');
    } finally {
      setIsTranslating(false);
    }
  };

  // Handle file upload (.txt or .zip)
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setStatusMessage('Parsing WhatsApp export file...');
    try {
      const parsed = await parseUploadedFile(file);
      if (parsed.messages.length === 0) {
        alert('No messages found in the uploaded file. Please make sure it is a valid WhatsApp chat export (.txt or .zip).');
        setIsProcessing(false);
        return;
      }

      // Immediately initialize banglishText so Banglish tab never shows Bengali script
      const initialMessages = parsed.messages.map((m) => ({
        ...m,
        banglishText: ensureBanglish(m.text),
      }));

      setMessages(initialMessages);
      setParticipants(parsed.participants);
      setChatTitle(parsed.chatTitle);
      setIsProcessing(false);

      // Translate all parsed messages to Banglish
      await translateMessagesToBanglish(initialMessages, tone);
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(err.message || 'Failed to parse WhatsApp chat file');
      setIsProcessing(false);
    }
  };

  // Handle sample chat click
  const handleLoadSample = async () => {
    setIsProcessing(true);
    setStatusMessage('Loading sample WhatsApp conversation...');
    const parsed = parseWhatsAppChat(SAMPLE_CHAT_TEXT);
    const initialMessages = parsed.messages.map((m) => ({
      ...m,
      banglishText: ensureBanglish(m.text),
    }));

    setMessages(initialMessages);
    setParticipants(parsed.participants);
    setChatTitle('Diamond Ring CAD Brief');
    setIsProcessing(false);

    await translateMessagesToBanglish(initialMessages, tone);
  };

  // Handle paste submission
  const handlePasteSubmit = async () => {
    if (!pastedText.trim()) return;
    setIsProcessing(true);
    setShowPasteModal(false);
    setStatusMessage('Parsing pasted chat text...');

    const parsed = parseWhatsAppChat(pastedText);
    if (parsed.messages.length === 0) {
      alert('Could not find any timestamped WhatsApp messages in the pasted text.');
      setIsProcessing(false);
      return;
    }

    const initialMessages = parsed.messages.map((m) => ({
      ...m,
      banglishText: ensureBanglish(m.text),
    }));

    setMessages(initialMessages);
    setParticipants(parsed.participants);
    setChatTitle(parsed.chatTitle);
    setIsProcessing(false);

    await translateMessagesToBanglish(initialMessages, tone);
  };

  // Tone change
  const handleToneChange = async (newTone: 'casual' | 'formal' | 'slang') => {
    setTone(newTone);
    if (messages.length > 0) {
      await translateMessagesToBanglish(messages, newTone);
    }
  };

  // Drag & drop handlers
  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0a04] text-white selection:bg-[#25D366] selection:text-black pb-24">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0c0a04]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="size-9 bg-[#F59E0B] rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-black font-black text-xl leading-none">architecture</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-black text-lg text-white tracking-tighter uppercase italic leading-none">
                CAD<span className="text-[#F59E0B]">ONCE</span>
              </span>
              <span className="text-[8px] font-bold text-[#25D366] tracking-[0.2em] uppercase mt-0.5">
                AI WhatsApp Banglish
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExportGuide(true)}
              className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">help_outline</span>
              <span className="hidden sm:inline">How to Export</span>
            </button>
            <Link
              href="/"
              className="text-xs font-black uppercase tracking-wider text-neutral-400 hover:text-white px-3 py-1.5"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-28 px-4 sm:px-6 max-w-6xl mx-auto flex flex-col items-center">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in">
            <span className="size-2 rounded-full bg-[#25D366] animate-pulse" />
            <span>AI WhatsApp to Banglish Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-headline font-black uppercase tracking-tight text-white italic leading-[1.05]">
            Import WhatsApp Chat <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#25D366] via-[#2DD4BF] to-[#00f2ff]">
              Output in Banglish
            </span>
          </h1>

          <p className="text-neutral-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Upload your exported WhatsApp chat (<code className="text-[#25D366] text-xs">.txt</code> or <code className="text-[#25D366] text-xs">.zip</code>).
            Our Gemini AI translates every message into natural, conversational <strong>Banglish</strong> and renders it in an authentic WhatsApp interface.
          </p>
        </div>

        {/* Upload & Import Dropzone (Shown prominently when no messages yet or expandable) */}
        {messages.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`w-full max-w-3xl rounded-[2.5rem] p-8 sm:p-14 border-2 border-dashed transition-all flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden backdrop-blur-xl ${
              isDragging
                ? 'border-[#25D366] bg-[#25D366]/10 scale-[1.01]'
                : 'border-white/10 bg-white/[0.02] hover:border-[#25D366]/40'
            }`}
          >
            <div className="size-20 rounded-3xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,211,102,0.2)]">
              <span className="material-symbols-outlined text-4xl font-black">upload_file</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-headline font-black uppercase italic tracking-tight text-white mb-2">
              Drag & Drop WhatsApp Export File
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mb-8 leading-relaxed">
              Accepts exported <span className="text-white font-bold">.txt</span> files or <span className="text-white font-bold">.zip</span> archives from Android or iOS WhatsApp chat export.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="electric-gradient text-black font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl shadow-[0_0_25px_rgba(37,211,102,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">folder_open</span>
                <span>Select File (.txt / .zip)</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={handleLoadSample}
                className="bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest px-6 py-4 rounded-xl border border-white/10 hover:border-white/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg text-[#25D366]">play_circle</span>
                <span>Load Sample Chat</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => setShowPasteModal(true)}
                className="text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-wider px-4 py-4 transition-colors"
              >
                Paste Text
              </button>
            </div>

            {/* Status indicator */}
            {isProcessing && (
              <div className="mt-8 flex items-center gap-3 text-xs font-bold text-[#25D366] animate-pulse">
                <div className="size-4 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            {/* Action Bar when chat is loaded */}
            <div className="w-full max-w-4xl flex flex-wrap items-center justify-between mb-4 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-[#25D366] animate-ping" />
                <span className="text-xs font-bold text-neutral-300">
                  Loaded <strong className="text-white">{messages.length}</strong> messages across <strong className="text-[#25D366]">{participants.length}</strong> participants
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span>Upload Another</span>
                </button>

                <button
                  onClick={() => {
                    setMessages([]);
                    setParticipants([]);
                  }}
                  className="text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 px-3 py-1.5 transition-colors"
                >
                  Clear
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Status notification banner during translation */}
            {statusMessage && (
              <div className="w-full max-w-4xl mb-4 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  <span>{statusMessage}</span>
                </div>
                <span className="text-[10px] uppercase font-mono tracking-widest opacity-80">Gemini 2.5 Flash</span>
              </div>
            )}

            {/* Live WhatsApp Visual Viewer */}
            <WhatsAppVisualViewer
              messages={messages}
              participants={participants}
              chatTitle={chatTitle}
              loadingBanglish={isTranslating}
              onTranslateToneChange={handleToneChange}
              currentTone={tone}
            />
          </div>
        )}

        {/* How to Export Guide Modal */}
        {showExportGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#18181b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
                    <span className="material-symbols-outlined text-xl">share</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-headline font-black uppercase italic text-white">
                      How To Export WhatsApp Chat
                    </h3>
                    <p className="text-xs text-neutral-400">Step-by-step instructions for Android & iPhone</p>
                  </div>
                </div>
                <button onClick={() => setShowExportGuide(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <span className="text-[#25D366] font-bold uppercase tracking-wider text-[11px] block">
                    Android WhatsApp
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                    <li>Open the WhatsApp chat or group you want to export.</li>
                    <li>Tap the three dots (<span className="text-white font-bold">⋮</span>) in the top right corner.</li>
                    <li>Tap <strong className="text-white">More</strong> → <strong className="text-white">Export chat</strong>.</li>
                    <li>Select <strong className="text-white">Without Media</strong>.</li>
                    <li>Save or share the generated <code className="text-[#25D366]">.txt</code> file here.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                  <span className="text-[#25D366] font-bold uppercase tracking-wider text-[11px] block">
                    iPhone / iOS WhatsApp
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-neutral-400">
                    <li>Open the chat and tap the contact or group name at the top.</li>
                    <li>Scroll down and tap <strong className="text-white">Export Chat</strong>.</li>
                    <li>Select <strong className="text-white">Without Media</strong>.</li>
                    <li>Choose <strong className="text-white">Save to Files</strong> or AirDrop to your computer.</li>
                    <li>Upload the <code className="text-[#25D366]">_chat.txt</code> or <code className="text-[#25D366]">.zip</code> file here.</li>
                  </ol>
                </div>
              </div>

              <button
                onClick={() => setShowExportGuide(false)}
                className="w-full electric-gradient text-black font-black py-3 rounded-xl uppercase tracking-widest text-xs"
              >
                Got It, Thanks
              </button>
            </div>
          </div>
        )}

        {/* Paste Text Modal */}
        {showPasteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#18181b] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-headline font-black uppercase italic text-white">
                  Paste WhatsApp Chat Text
                </h3>
                <button onClick={() => setShowPasteModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <p className="text-xs text-neutral-400">
                Paste raw exported WhatsApp text containing timestamps (e.g. <code>25/03/2024, 10:15 AM - Name: Message</code>).
              </p>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={10}
                placeholder="25/03/2024, 10:15 AM - John: Hey bro..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xs font-mono text-white placeholder-neutral-600 outline-none focus:border-[#25D366]"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteSubmit}
                  className="electric-gradient text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest"
                >
                  Parse & Translate
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
