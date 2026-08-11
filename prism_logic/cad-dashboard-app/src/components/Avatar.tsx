"use client";
import React, { useState, useEffect } from 'react';
import md5 from 'md5';

interface AvatarProps {
  src?: string;
  email?: string;
  name?: string;
  website?: string;
  size?: number;
  className?: string;
  ring?: boolean;
}

export default function Avatar({ src, email, name, website, size = 64, className = '', ring = false }: AvatarProps) {
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
  const unavatarDomainUrl = domain ? `https://unavatar.io/${domain}?fallback=false` : '';
  const unavatarEmailUrl = email ? `https://unavatar.io/${email}?fallback=false` : '';
  
  // 0 = Try Explicit Src
  // 1 = Try Unavatar (Website)
  // 2 = Try Unavatar (Email)
  // 3 = Try Gravatar (Email)
  // 4 = Show Initials
  
  const getInitialState = () => {
    if (src) return 0;
    if (domain) return 1;
    if (email) return 2;
    return 4;
  };

  const [imgState, setImgState] = useState(getInitialState());

  // Reset state if props change
  useEffect(() => {
    setImgState(getInitialState());
  }, [src, domain, email]);

  const getInitials = () => {
    const text = name || email || '?';
    const parts = text.split(/[ @]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const handleError = () => {
    if (imgState === 0) {
      setImgState(domain ? 1 : (email ? 2 : 4));
    } else if (imgState === 1 && email) {
      setImgState(2); // Unavatar domain failed, try Unavatar email
    } else if (imgState === 2 && email) {
      setImgState(3); // Unavatar email failed, try Gravatar
    } else {
      setImgState(4); // Everything failed, show Initials
    }
  };

  if (imgState === 4) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-gradient-to-br from-[#333] to-[#111] text-[#F59E0B] font-bold tracking-widest rounded-full flex-shrink-0 ${ring ? 'ring-2 ring-yellow-400/30 hover:ring-yellow-400 transition-all' : ''} ${className}`}
      >
        {getInitials()}
      </div>
    );
  }

  const currentSrc = 
    imgState === 0 ? src :
    imgState === 1 ? unavatarDomainUrl :
    imgState === 2 ? unavatarEmailUrl :
    gravatarUrl;

  return (
    <img
      src={currentSrc}
      alt={name || email || 'Avatar'}
      width={size}
      height={size}
      onError={handleError}
      className={`rounded-full object-cover bg-surface-container-highest flex-shrink-0 ${ring ? 'ring-2 ring-yellow-400/30 hover:ring-yellow-400 transition-all' : ''} ${className}`}
    />
  );
}

