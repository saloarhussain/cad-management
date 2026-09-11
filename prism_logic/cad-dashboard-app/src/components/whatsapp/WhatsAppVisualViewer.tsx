'use client';

import React, { useState, useMemo } from 'react';
import { ChatMessage } from '@/lib/whatsappParser';
import { ensureBanglish } from '@/lib/bengaliTransliterate';

interface WhatsAppVisualViewerProps {
  messages: ChatMessage[];
  participants: string[];
  chatTitle: string;
  loadingBanglish?: boolean;
  onTranslateToneChange?: (tone: 'casual' | 'formal' | 'slang') => void;
  currentTone?: 'casual' | 'formal' | 'slang';
}

const SENDER_COLORS = [
  '#00a884', // emerald
  '#53bdeb', // sky
  '#ec537f', // pink
  '#e59a00', // amber
  '#9c53ed', // purple
  '#25d366', // whatsapp green
  '#34b7f1', // light blue
  '#ff8533', // orange
];

function getSenderColor(sender: string, participants: string[]): string {
  const index = participants.indexOf(sender);
  if (index === -1) return SENDER_COLORS[0];
  return SENDER_COLORS[index % SENDER_COLORS.length];
}

export default function WhatsAppVisualViewer({
  messages,
  participants,
  chatTitle,
  loadingBanglish = false,
  onTranslateToneChange,
  currentTone = 'casual',
}: WhatsAppVisualViewerProps) {
  // Primary user ("Me") whose messages appear on the right in green
  const [selectedMe, setSelectedMe] = useState<string>(participants[0] || '');
  // Language view toggle: 'banglish' or 'original'
  const [viewMode, setViewMode] = useState<'banglish' | 'original'>('banglish');
  // Theme: 'dark' or 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  // Search filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParticipant, setFilterParticipant] = useState<string>('all');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Group messages by date
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (filterParticipant !== 'all' && m.sender !== filterParticipant) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const textToSearch = viewMode === 'banglish' ? ensureBanglish(m.banglishText || m.text) : m.text;
        return (
          textToSearch.toLowerCase().includes(query) ||
          m.sender.toLowerCase().includes(query) ||
          m.date.includes(query)
        );
      }
      return true;
    });
  }, [messages, filterParticipant, searchQuery, viewMode]);

  const isDarkMode = theme === 'dark';

  return (
    <div className="w-full flex flex-col items-center">
      {/* Control Toolbar */}
      <div className="w-full max-w-4xl mb-4 bg-[#1f1f21]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Left: Language Toggle & Tone */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/5">
            <button
              onClick={() => setViewMode('banglish')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === 'banglish'
                  ? 'bg-[#25D366] text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm font-bold">translate</span>
              <span>Banglish (AI)</span>
            </button>
            <button
              onClick={() => setViewMode('original')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                viewMode === 'original'
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-sm">history</span>
              <span>Original Text</span>
            </button>
          </div>

          {/* Tone Selector */}
          {onTranslateToneChange && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Tone:</span>
              <select
                value={currentTone}
                onChange={(e) => onTranslateToneChange(e.target.value as any)}
                className="bg-black/40 border border-white/10 text-white text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none focus:border-[#25D366]"
              >
                <option value="casual">Casual / Adda</option>
                <option value="formal">Formal / Shuddho</option>
                <option value="slang">Dhakaite / Slang</option>
              </select>
            </div>
          )}
        </div>

        {/* Right: Participant Switcher & Theme Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Who is "Me" */}
          {participants.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Outgoing (Me):</span>
              <select
                value={selectedMe}
                onChange={(e) => setSelectedMe(e.target.value)}
                className="bg-black/40 border border-white/10 text-[#25D366] text-xs font-black rounded-lg px-2.5 py-1.5 outline-none focus:border-[#25D366]"
              >
                {participants.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(isDarkMode ? 'light' : 'dark')}
            className="p-2 rounded-xl bg-black/40 border border-white/5 text-neutral-400 hover:text-white transition-all flex items-center justify-center"
            title={isDarkMode ? 'Switch to WhatsApp Light' : 'Switch to WhatsApp Dark'}
          >
            <span className="material-symbols-outlined text-lg">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Main WhatsApp Phone/Web Container */}
      <div
        className={`w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border transition-colors duration-300 flex flex-col h-[750px] ${
          isDarkMode
            ? 'bg-[#0b141a] border-[#222d34]'
            : 'bg-[#efeae2] border-neutral-300'
        }`}
      >
        {/* WhatsApp App Header */}
        <div
          className={`h-16 px-4 flex items-center justify-between shrink-0 z-10 transition-colors ${
            isDarkMode
              ? 'bg-[#202c33] text-[#e9edef] border-b border-[#2a3942]'
              : 'bg-[#f0f2f5] text-[#111b21] border-b border-neutral-200'
          }`}
        >
          {/* Left: Avatar & Contact Info */}
          <div className="flex items-center gap-3">
            <button className="text-neutral-400 hover:text-white md:hidden">
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
            <div className="size-10 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#25D366] font-headline font-black text-sm uppercase shadow-sm">
              {chatTitle.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-sm tracking-tight leading-tight">
                {chatTitle}
              </span>
              <span
                className={`text-[11px] leading-tight ${
                  isDarkMode ? 'text-[#8696a0]' : 'text-[#667781]'
                }`}
              >
                {participants.length > 2
                  ? participants.slice(0, 3).join(', ') + '...'
                  : 'online'}
              </span>
            </div>
          </div>

          {/* Right: WhatsApp Header Icons */}
          <div
            className={`flex items-center gap-4 ${
              isDarkMode ? 'text-[#aebac1]' : 'text-[#54656f]'
            }`}
          >
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="hover:scale-110 transition-transform p-1"
              title="Search chat"
            >
              <span className="material-symbols-outlined text-xl">search</span>
            </button>
            <button className="hover:scale-110 transition-transform p-1 hidden sm:block">
              <span className="material-symbols-outlined text-xl">videocam</span>
            </button>
            <button className="hover:scale-110 transition-transform p-1 hidden sm:block">
              <span className="material-symbols-outlined text-xl">call</span>
            </button>
            <button className="hover:scale-110 transition-transform p-1">
              <span className="material-symbols-outlined text-xl">more_vert</span>
            </button>
          </div>
        </div>

        {/* Search Bar Drawer */}
        {isSearchOpen && (
          <div
            className={`px-4 py-2 border-b flex items-center gap-2 animate-in slide-in-from-top duration-200 ${
              isDarkMode
                ? 'bg-[#111b21] border-[#222d34]'
                : 'bg-white border-neutral-200'
            }`}
          >
            <span className="material-symbols-outlined text-neutral-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in chat..."
              className={`w-full text-xs font-medium bg-transparent outline-none ${
                isDarkMode ? 'text-white placeholder-neutral-500' : 'text-black placeholder-neutral-400'
              }`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-neutral-400 hover:text-white">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        )}

        {/* WhatsApp Chat Message Scroll Area */}
        <div
          className="flex-1 overflow-y-auto px-4 py-6 space-y-3 relative"
          style={{
            backgroundImage: isDarkMode
              ? 'radial-gradient(#182229 1px, transparent 1px)'
              : 'radial-gradient(#d1d7db 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {loadingBanglish && (
            <div className="sticky top-2 z-20 flex justify-center">
              <div className="bg-[#25D366] text-black px-4 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-2 animate-pulse">
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Translating to Banglish with Gemini AI...</span>
              </div>
            </div>
          )}

          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <span className="material-symbols-outlined text-4xl mb-2 text-neutral-600">
                chat_bubble_outline
              </span>
              <p className="text-sm font-medium">No messages found</p>
              {searchQuery && (
                <p className="text-xs mt-1 text-neutral-400">Try clearing your search query.</p>
              )}
            </div>
          ) : (
            filteredMessages.map((msg, idx) => {
              const prevMsg = filteredMessages[idx - 1];
              const showDateDivider = !prevMsg || prevMsg.date !== msg.date;
              const isOutgoing = msg.sender === selectedMe;
              const isFirstOfCluster = !prevMsg || prevMsg.sender !== msg.sender || prevMsg.date !== msg.date;

              // System Message (e.g. Encryption or Group creation)
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="flex flex-col items-center my-3">
                    {showDateDivider && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg mb-2 shadow-sm ${
                          isDarkMode
                            ? 'bg-[#182229] text-[#8696a0]'
                            : 'bg-white text-[#54656f]'
                        }`}
                      >
                        {msg.date}
                      </span>
                    )}
                    <div
                      className={`text-[11px] text-center px-4 py-1.5 rounded-lg max-w-md shadow-sm leading-relaxed ${
                        isDarkMode
                          ? 'bg-[#182229]/90 text-[#ffd279] border border-[#ffd279]/10'
                          : 'bg-[#ffeecd] text-[#54656f]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px] inline mr-1 align-text-bottom">
                        lock
                      </span>
                      {msg.text}
                    </div>
                  </div>
                );
              }

              // Text to display: Banglish or Original
              const displayText = viewMode === 'banglish' ? ensureBanglish(msg.banglishText || msg.text) : msg.text;

              return (
                <div key={msg.id} className="flex flex-col">
                  {/* Date Divider Badge */}
                  {showDateDivider && (
                    <div className="flex justify-center my-3">
                      <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-lg shadow-sm ${
                          isDarkMode
                            ? 'bg-[#182229] text-[#8696a0]'
                            : 'bg-white text-[#54656f]'
                        }`}
                      >
                        {msg.date}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`relative max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm text-sm break-words transition-all ${
                        isOutgoing
                          ? isDarkMode
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                            : 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none'
                          : isDarkMode
                          ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                          : 'bg-white text-[#111b21] rounded-tl-none'
                      } ${!isFirstOfCluster ? 'mt-0.5' : 'mt-2'}`}
                    >
                      {/* Sender Name in Group Chat for Incoming */}
                      {!isOutgoing && isFirstOfCluster && participants.length > 2 && (
                        <div
                          className="text-[12px] font-bold leading-tight mb-1"
                          style={{ color: getSenderColor(msg.sender, participants) }}
                        >
                          {msg.sender}
                        </div>
                      )}

                      {/* Media Card Placeholder if <Media omitted> */}
                      {msg.mediaType ? (
                        <div
                          className={`flex items-center gap-3 p-2.5 rounded-xl mb-1.5 ${
                            isDarkMode ? 'bg-black/20' : 'bg-black/5'
                          }`}
                        >
                          <div className="size-9 rounded-lg bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lg">
                              {msg.mediaType === 'image'
                                ? 'photo_camera'
                                : msg.mediaType === 'video'
                                ? 'videocam'
                                : msg.mediaType === 'audio'
                                ? 'mic'
                                : 'description'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold capitalize">
                              {msg.mediaType} Attachment
                            </span>
                            <span
                              className={`text-[10px] ${
                                isDarkMode ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              WhatsApp Media
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {/* Message Content */}
                      <p className="whitespace-pre-wrap leading-relaxed pr-14 text-[13px] sm:text-[14px]">
                        {displayText}
                      </p>

                      {/* Timestamp & Double Blue Checks */}
                      <div
                        className={`absolute bottom-1 right-2 flex items-center gap-1 text-[10px] ${
                          isDarkMode ? 'text-[#8696a0]' : 'text-[#667781]'
                        }`}
                      >
                        <span>{msg.time}</span>
                        {isOutgoing && (
                          <span className="material-symbols-outlined text-[14px] text-[#53bdeb] font-bold">
                            done_all
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* WhatsApp Fake Input Bar at Bottom */}
        <div
          className={`h-16 px-4 flex items-center gap-3 shrink-0 border-t ${
            isDarkMode
              ? 'bg-[#202c33] border-[#2a3942] text-[#8696a0]'
              : 'bg-[#f0f2f5] border-neutral-200 text-[#54656f]'
          }`}
        >
          <span className="material-symbols-outlined text-2xl hover:text-[#25D366] cursor-pointer">
            sentiment_satisfied
          </span>
          <span className="material-symbols-outlined text-2xl hover:text-[#25D366] cursor-pointer">
            attach_file
          </span>
          <div
            className={`flex-1 h-10 rounded-xl px-4 flex items-center text-xs ${
              isDarkMode
                ? 'bg-[#2a3942] text-neutral-400'
                : 'bg-white text-neutral-500 border border-neutral-300'
            }`}
          >
            <span>Type a message in Banglish...</span>
          </div>
          <div className="size-10 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-xl">mic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
