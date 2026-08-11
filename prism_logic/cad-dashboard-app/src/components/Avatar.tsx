"use client";
import React, { useState, useEffect } from 'react';
import md5 from 'md5';

interface AvatarProps {
  email?: string;
  name?: string;
  website?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

export default function Avatar({ email, name, website, size = 64, className = '', ring = false }: AvatarProps) {
  const hash = email ? md5(email.trim().toLowerCase()) : '';
  const gravatarUrl = email ? `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404` : '';
  
  // Extract domain from website if provided
  let domain = '';
  if (website) {
    try {
      const urlString = website.startsWith('http') ? website : `https://${website}`;
      const url = new URL(urlString);
      domain = url.hostname.replace('www.', '');
    } catch (e) {
      // Invalid URL
    }
  }
  
  // We use unavatar.io which aggregates from Twitter, Google Favicons, etc.
  const unavatarUrl = domain ? `https://unavatar.io/${domain}?fallback=false` : '';
  
  // 0 = Try Unavatar (Website)
  // 1 = Try Gravatar (Email)
  // 2 = Show Initials
  const [imgState, setImgState] = useState(domain ? 0 : (email ? 1 : 2));

  // Reset state if props change
  useEffect(() => {
    setImgState(domain ? 0 : (email ? 1 : 2));
  }, [domain, email]);

  const getInitials = () => {
    const text = name || email || '?';
    const parts = text.split(/[ @]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const handleError = () => {
    if (imgState === 0 && email) {
      setImgState(1); // Unavatar failed, try Gravatar
    } else {
      setImgState(2); // Everything failed, show Initials
    }
  };

  if (imgState === 2) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-gradient-to-br from-[#333] to-[#111] text-[#fce003] font-bold tracking-widest rounded-full flex-shrink-0 ${ring ? 'ring-2 ring-yellow-400/30 hover:ring-yellow-400 transition-all' : ''} ${className}`}
      >
        {getInitials()}
      </div>
    );
  }

  return (
    <img
      src={imgState === 0 ? unavatarUrl : gravatarUrl}
      alt={name || email || 'Avatar'}
      width={size}
      height={size}
      onError={handleError}
      className={`rounded-full object-cover bg-surface-container-highest flex-shrink-0 ${ring ? 'ring-2 ring-yellow-400/30 hover:ring-yellow-400 transition-all' : ''} ${className}`}
    />
  );
}
