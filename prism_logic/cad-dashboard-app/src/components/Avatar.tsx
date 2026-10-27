"use client";
import React, { useState, useEffect } from 'react';
import md5 from 'md5';

interface AvatarProps {
  email?: string;
  name?: string;
  website?: string;
  size?: number;
  className?: string;
  /** Show a ring on hover */
  ring?: boolean;
}

function getDomainFromUrl(url?: string): string | null {
  if (!url) return null;
  let cleaned = url.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

/**
 * Smart Avatar component:
 * 1. Tries to load website logo if website is provided.
 * 2. Tries Gravatar (uses email MD5 hash) — shows real photo if person has a Gravatar account.
 * 3. Falls back to UI Avatars (branded initials avatar) if Gravatar or logo fails.
 */
export default function Avatar({ email, name, website, size = 64, className = '', ring = false }: AvatarProps) {
  const domain = getDomainFromUrl(website);
  const [src, setSrc] = useState(() => {
    if (domain) {
      const sz = size > 64 ? 128 : 64;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`;
    }
    return buildGravatarUrl(email, size);
  });

  useEffect(() => {
    if (domain) {
      const sz = size > 64 ? 128 : 64;
      setSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`);
    } else {
      setSrc(buildGravatarUrl(email, size));
    }
  }, [website, email, size, domain]);

  const fallback = buildUiAvatarUrl(name || email || '?', size);

  const handleError = () => {
    // If the website logo fails, try Gravatar. Otherwise try UI Avatars.
    if (src.includes('favicons')) {
      setSrc(buildGravatarUrl(email, size));
    } else {
      setSrc(fallback);
    }
  };

  return (
    <img
      src={src}
      alt={name || email || 'Avatar'}
      width={size}
      height={size}
      onError={handleError}
      className={`rounded-full object-cover bg-surface-container-highest ${ring ? 'ring-2 ring-yellow-400/30 hover:ring-yellow-400 transition-all' : ''} ${className}`}
    />
  );
}

/** Build Gravatar URL with d=404 so onError fires if no image exists */
function buildGravatarUrl(email?: string, size = 64): string {
  if (!email) return buildUiAvatarUrl('?', size);
  const hash = md5(email.trim().toLowerCase());
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

/** UI Avatars fallback — branded initials in gold/dark */
function buildUiAvatarUrl(nameOrEmail: string, size = 64): string {
  const displayName = nameOrEmail.includes('@')
    ? nameOrEmail.split('@')[0]
    : nameOrEmail;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=${size}&background=1a1a17&color=fce003&bold=true&format=png`;
}
