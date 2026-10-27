'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/AuthProvider';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getMySettings } from '@/app/actions';

interface Notification {
  id: string;
  type: 'message' | 'annotation' | 'intake' | 'update';
  title: string;
  content: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

class RingtoneSynthesizer {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass && !this.ctx) {
            this.ctx = new AudioContextClass();
          }
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
        } catch (e) {
          console.warn('Pre-unlock AudioContext failed:', e);
        }
      };
      
      // Register global interaction listeners to unlock audio immediately on first click/tap/keypress
      document.addEventListener('click', unlock, { once: true });
      document.addEventListener('touchstart', unlock, { once: true });
      document.addEventListener('keydown', unlock, { once: true });
    }
  }

  public start() {
    if (this.intervalId) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      // Create context if it hasn't been initialized by user gesture yet
      if (!this.ctx) {
        this.ctx = new AudioContextClass();
      }
      
      // Ensure context is actively running
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      
      this.intervalId = setInterval(() => {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        const now = this.ctx.currentTime;
        
        // Dynamically fetch user volume and sound style settings
        const volume = typeof window !== 'undefined' ? Number(localStorage.getItem('cad_alarm_volume') || '80') : 80;
        const style = typeof window !== 'undefined' ? localStorage.getItem('cad_alarm_style') || 'telephone' : 'telephone';
        
        // Detect iOS devices (iPhone, iPad, iPod)
        const isIOS = typeof navigator !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
        
        // Dynamic headroom scaling: iOS Safari has an aggressive automatic dynamic compressor
        // that squeezes high-gain Web Audio API signals to prevent speaker clipping, actually muting the sound.
        // Keeping peak digital amplitude under 0.55 prevents triggering the iOS compressor, making it much louder.
        const maxGain = isIOS ? 0.55 : 0.9;
        const gainVal = (volume / 100) * maxGain;
        
        const triggerRing = (delay: number, duration: number) => {
          if (!this.ctx) return;
          try {
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            
            if (style === 'siren') {
              // High-frequency sweeping Industrial Siren (1200Hz to 2200Hz)
              // Highly optimized for tiny iPhone micro-speaker voice coils (which cannot produce low frequencies)
              osc1.type = 'sawtooth';
              osc1.frequency.setValueAtTime(1200, now + delay);
              osc1.frequency.linearRampToValueAtTime(2200, now + delay + duration * 0.5);
              osc1.frequency.linearRampToValueAtTime(1200, now + delay + duration);
              
              osc2.type = 'triangle';
              osc2.frequency.setValueAtTime(1220, now + delay);
              osc2.frequency.linearRampToValueAtTime(2220, now + delay + duration * 0.5);
              osc2.frequency.linearRampToValueAtTime(1220, now + delay + duration);
            } else if (style === 'buzzer') {
              // High-pitched 2200Hz dual-tone Digital Buzzer (the absolute loudest resonance sweet spot for iPhone speakers)
              osc1.type = 'triangle';
              osc2.type = 'triangle';
              osc1.frequency.setValueAtTime(2200, now + delay);
              osc2.frequency.setValueAtTime(2400, now + delay);
            } else {
              // Classic Telephone Ring shifted exactly one octave higher (880Hz/960Hz)
              // Retains classic beat-frequency character while increasing perceived mobile volume by 300%
              osc1.type = 'sine';
              osc2.type = 'sine';
              osc1.frequency.setValueAtTime(880, now + delay);
              osc2.frequency.setValueAtTime(960, now + delay);
            }
            
            gainNode.gain.setValueAtTime(0, now + delay);
            gainNode.gain.linearRampToValueAtTime(gainVal, now + delay + 0.05);
            gainNode.gain.setValueAtTime(gainVal, now + delay + duration - 0.05);
            gainNode.gain.linearRampToValueAtTime(0, now + delay + duration);
            
            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.ctx.destination);
            
            osc1.start(now + delay);
            osc2.start(now + delay);
            osc1.stop(now + delay + duration);
            osc2.stop(now + delay + duration);
          } catch (e) {}
        };

        if (style === 'siren') {
          triggerRing(0, 0.85);
          triggerRing(1.0, 0.85);
        } else {
          triggerRing(0, 0.45);
          triggerRing(0.55, 0.45);
        }
      }, 3000);
    } catch (err) {
      console.error('Web Audio init failed:', err);
    }
  }

  public stop() {
    try {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      // CRITICAL: Do NOT close or nullify the AudioContext! 
      // Keeping it alive preserves browser autoplay permission permanently!
      if (this.ctx && this.ctx.state === 'running') {
        // Suspend temporarily to avoid battery drain, but do not destroy it
        this.ctx.suspend().catch(() => {});
      }
    } catch (err) {
      console.error('Web Audio stop failed:', err);
    }
  }
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global looping opportunity alerter states
  const [isAlerting, setIsAlerting] = useState(false);
  const [activeAlertNotif, setActiveAlertNotif] = useState<any>(null);
  const activeAlertNotifRef = useRef<any>(null);
  const synthRef = useRef<RingtoneSynthesizer | null>(null);
  const [hasMountedAlarm, setHasMountedAlarm] = useState(false);
  const alarmEnabledTimeRef = useRef<number>(0);

  // Keep activeAlertNotif ref updated to prevent stale closures in Service Worker message listener
  useEffect(() => {
    activeAlertNotifRef.current = activeAlertNotif;
  }, [activeAlertNotif]);

  // Screen Keep-Alive (Wake Lock) and Native Notification states
  const wakeLockRef = useRef<any>(null);
  const [isWakeLocked, setIsWakeLocked] = useState(false);

  // Initialize synthesizer and register service worker on mount
  useEffect(() => {
    synthRef.current = new RingtoneSynthesizer();
    setHasMountedAlarm(true);

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully with scope:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));

      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'BACKGROUND_PUSH_ALERT') {
          const payload = event.data.payload;
          console.log('[NotificationCenter] Received background push alert from Service Worker:', payload);
          
          // Avoid duplicate triggering if already alerting this ID
          if (activeAlertNotifRef.current?.id === payload.id) return;

          setActiveAlertNotif({
            id: payload.id,
            type: 'gmail',
            title: payload.title,
            content: payload.snippet || payload.body,
            from: payload.from
          });
          setIsAlerting(true);
          
          if (synthRef.current) {
            synthRef.current.start();
          }
        }
      };

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

      return () => {
        if (synthRef.current) {
          synthRef.current.stop();
        }
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.stop();
      }
    };
  }, []);

  // Web Push Subscription Synchronizer
  const syncPushSubscription = async (enabled: boolean) => {
    if (typeof window === 'undefined') return;

    if (!('serviceWorker' in navigator)) {
      if (enabled) console.warn('Service Worker is not supported in this browser.');
      return;
    }
    if (!('PushManager' in window)) {
      if (enabled) console.warn('Push Manager is not supported. iOS Safari requires standalone PWA mode (Add to Home Screen).');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      
      if (enabled) {
        // 1. Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('Push subscription aborted: OS Notification permission denied. Please enable it in iPhone Settings.');
          return;
        }

        // 2. Check for existing subscription
        let subscription = await reg.pushManager.getSubscription();
        
        if (!subscription) {
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BBsho8AhVaY857QsOLxtH1MecqeucomFDwZaKvkcmC3nu4_qSbSgjC0DzgOhTbZyk_lA7-rHE155cehIzWrwOdY';
          const convertedKey = urlBase64ToUint8Array(publicKey);
          
          try {
            subscription = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey
            });
            console.log('Successfully registered to browser PushManager!');
          } catch (subErr: any) {
            console.error('PushManager subscribe call failed: ' + subErr.message);
            throw subErr;
          }
        }

        // 3. Sync to API backend
        const syncRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription })
        });
        if (syncRes.ok) {
          console.log('Success: Background Alarm synced to cloud securely!');
        } else {
          console.error('Database synchronization failed.');
        }
      } else {
        // If alarm toggled OFF, unsubscribe and unregister
        const subscription = await reg.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          console.log('Unsubscribed from browser PushManager.');
        }

        await fetch('/api/push/subscribe', {
          method: 'DELETE'
        });
        console.log('Removed push subscription from backend.');
      }
    } catch (err: any) {
      console.error('Failed to sync push subscription:', err);
    }
  };

  // Screen Wake Lock API Helpers
  const requestWakeLock = async () => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (wakeLockRef.current) return; // Already acquired
      
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      setIsWakeLocked(true);
      console.log('Screen Wake Lock active');

      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
        setIsWakeLocked(false);
        console.log('Screen Wake Lock was released by browser');
      });
    } catch (err) {
      console.warn('Failed to acquire screen wake lock:', err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsWakeLocked(false);
        console.log('Screen Wake Lock released manually');
      } catch (err) {
        console.error('Error releasing screen wake lock:', err);
      }
    }
  };

  // Manage Screen Wake Lock based on alarm setting and page visibility
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAndManageWakeLock = () => {
      const enabled = localStorage.getItem('cad_gmail_alarm_enabled') === 'true';
      if (enabled) {
        requestWakeLock();
        if (alarmEnabledTimeRef.current === 0) {
          alarmEnabledTimeRef.current = Date.now() - 12 * 60 * 60 * 1000;
        }
      } else {
        releaseWakeLock();
        alarmEnabledTimeRef.current = 0;
      }
      syncPushSubscription(enabled);
    };

    checkAndManageWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndManageWakeLock();
      }
    };

    const handleSettingsChange = () => {
      checkAndManageWakeLock();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('cad-alarm-settings-changed', handleSettingsChange);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('cad-alarm-settings-changed', handleSettingsChange);
      releaseWakeLock();
    };
  }, []);

  // Native OS Notification Helper
  const showNativeNotification = (title: string, content: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const options = {
        body: content,
        icon: '/favicon.ico',
        tag: 'opportunity-alarm',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: { link: '/settings' }
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options).catch((err) => {
            console.warn('Service Worker notification failed, falling back:', err);
            new Notification(title, options);
          });
        });
      } else {
        new Notification(title, options);
      }

      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  };

  // Show native notification when alert triggers
  useEffect(() => {
    if (isAlerting && activeAlertNotif) {
      showNativeNotification(
        activeAlertNotif.title || 'NEW OPPORTUNITY DETECTED',
        activeAlertNotif.content || 'A high-priority CAD project inquiry was received.'
      );
    }
  }, [isAlerting, activeAlertNotif]);

  // Silence alert handler (quiets synthesis and updates Gmail labels if needed)
  const handleSilenceAlert = async () => {
    setIsAlerting(false);
    if (synthRef.current) {
      synthRef.current.stop();
    }
    
    if (activeAlertNotif && activeAlertNotif.type === 'gmail') {
      try {
        await fetch('/api/gmail/silence-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: activeAlertNotif.id }),
        });
      } catch (err) {
        console.error('Failed to silence Gmail alert:', err);
      }
    }
    
    setActiveAlertNotif(null);
  };

  // Listen for local Settings test alarm trigger event
  useEffect(() => {
    const handleTestTrigger = () => {
      setActiveAlertNotif({
        id: 'test-alarm-id',
        type: 'test',
        title: '🚨 MOCK OPPORTUNITY ALERT (Fiverr Order #1293)',
        content: 'Fiverr Client Sterling has placed a custom CAD rendering order. Details: Matrix Art Deco Diamond Ring, 14k White Gold. Deadline: 3 days.',
        from: 'Fiverr Support <noreply@fiverr.com>'
      });
      setIsAlerting(true);
      if (synthRef.current) {
        synthRef.current.start();
      }
    };

    window.addEventListener('cad-trigger-test-alarm', handleTestTrigger);
    return () => {
      window.removeEventListener('cad-trigger-test-alarm', handleTestTrigger);
    };
  }, []);

  // Gmail platforms checker poller (runs every 15 seconds if enabled)
  useEffect(() => {
    if (!user || !hasMountedAlarm) return;

    let pollerInterval: any = null;

    const checkGmailAlerts = async () => {
      try {
        const settingsEnabled = localStorage.getItem('cad_gmail_alarm_enabled') === 'true';
        if (!settingsEnabled) return;

        if (alarmEnabledTimeRef.current === 0) {
          alarmEnabledTimeRef.current = Date.now() - 12 * 60 * 60 * 1000;
        }

        const query = localStorage.getItem('cad_gmail_alarm_query') || 'is:unread (from:fiverr.com OR from:upwork.com OR from:freelancer.com OR (from:binance.com "p2p") OR "new order" OR "placed an order" OR "sent you a message" OR "new inquiry")';
        const checkUrl = `/api/gmail/check-alerts?q=${encodeURIComponent(query)}&since=${alarmEnabledTimeRef.current}`;

        const res = await fetch(checkUrl);
        if (res.ok) {
          const data = await res.json();
          if (data.connected && data.alerts && data.alerts.length > 0) {
            const alertEmail = data.alerts[0];
            
            // Avoid duplicate triggering if already alerting this ID
            if (activeAlertNotif?.id === alertEmail.id) return;
            
            setActiveAlertNotif({
              id: alertEmail.id,
              type: 'gmail',
              title: alertEmail.subject,
              content: alertEmail.snippet,
              from: alertEmail.from
            });
            setIsAlerting(true);
            
            if (synthRef.current) {
              synthRef.current.start();
            }
          }
        }
      } catch (err) {
        console.warn('Gmail alert polling error:', err);
      }
    };

    const initialTimeout = setTimeout(checkGmailAlerts, 4000);
    pollerInterval = setInterval(checkGmailAlerts, 15000);

    return () => {
      clearTimeout(initialTimeout);
      if (pollerInterval) {
        clearInterval(pollerInterval);
      }
    };
  }, [user?.id, activeAlertNotif?.id, hasMountedAlarm]);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const res = await getNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.notifications?.filter(n => !n.is_read).length || 0);
      }
    };

    fetchNotifications();

    const fetchSettings = async () => {
      try {
        const res = await getMySettings();
        if (res.success && res.settings) {
          const s = res.settings;
          const dbAlarmEnabled = s.alarmEnabled === true || s.alarmEnabled === 'true';
          const dbAlarmQuery = s.alarmQuery || 'is:unread (from:fiverr.com OR from:upwork.com OR from:freelancer.com OR (from:binance.com "p2p") OR "new order" OR "placed an order" OR "sent you a message" OR "new inquiry")';
          const dbAlarmVolume = s.alarmVolume !== undefined ? Number(s.alarmVolume) : 80;
          const dbAlarmStyle = s.alarmStyle || 'telephone';

          localStorage.setItem('cad_gmail_alarm_enabled', dbAlarmEnabled ? 'true' : 'false');
          localStorage.setItem('cad_gmail_alarm_query', dbAlarmQuery);
          localStorage.setItem('cad_alarm_volume', dbAlarmVolume.toString());
          localStorage.setItem('cad_alarm_style', dbAlarmStyle);

          // Dispatch event to activate wake-lock and synchronization immediately in client state
          window.dispatchEvent(new CustomEvent('cad-alarm-settings-changed'));
        }
      } catch (err) {
        console.error('Failed to sync settings on mount:', err);
      }
    };

    fetchSettings();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Play subtle notification sound if possible
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.2;
            audio.play().catch(() => {}); // Browsers might block autoplay
          } catch (e) {}
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotif = payload.new as Notification;
          setNotifications(prev => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n));
          setUnreadCount(prev => Math.max(0, notifications.filter(n => !n.is_read).length));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationAsRead(id);
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const res = await markAllNotificationsAsRead();
    if (res.success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return 'chat_bubble';
      case 'annotation': return '3d_rotation';
      case 'intake': return 'assignment_ind';
      case 'update': return 'sync';
      default: return 'notifications';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-400 bg-blue-400/10';
      case 'annotation': return 'text-orange-400 bg-orange-400/10';
      case 'intake': return 'text-purple-400 bg-purple-400/10';
      case 'update': return 'text-green-400 bg-green-400/10';
      default: return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative size-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95 group"
        >
          <span className="material-symbols-outlined text-xl text-white group-hover:text-yellow-400 transition-colors">
            notifications
          </span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-5 bg-[#FF2626] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0c0a04] animate-in zoom-in duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {isWakeLocked && (
            <span 
              className="absolute -bottom-0.5 -right-0.5 size-2.5 bg-green-400 rounded-full border-2 border-[#0c0a04] animate-pulse" 
              title="Screen Keep-Alive (Wake Lock) Active"
            />
          )}
        </button>

        {isOpen && (
          <div className="fixed inset-x-4 top-16 mt-2 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[380px] bg-[#1a1a17] border border-white/10 rounded-2xl shadow-2xl z-[500] animate-in slide-in-from-top-4 fade-in duration-300 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Activity Feed</h3>
                <p className="text-[8px] font-bold text-white/40 uppercase mt-0.5">Real-time Project Updates</p>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  className="text-[9px] font-black text-yellow-400 uppercase tracking-widest hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              {notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center opacity-20">
                  <span className="material-symbols-outlined text-4xl mb-2">notifications_off</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">No activity yet</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`relative p-4 border-b border-white/5 hover:bg-white/2 transition-colors group ${!notif.is_read ? 'bg-yellow-400/[0.02]' : ''}`}
                  >
                    {!notif.is_read && (
                      <div className="absolute top-1/2 -translate-y-1/2 left-1.5 w-1 h-8 bg-yellow-400 rounded-full"></div>
                    )}
                    <div className="flex gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/5 ${getTypeColor(notif.type)}`}>
                        <span className="material-symbols-outlined text-lg">{getTypeIcon(notif.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <Link 
                            href={notif.link || '#'} 
                            onClick={() => {
                              handleMarkAsRead(notif.id);
                              setIsOpen(false);
                            }}
                            className="text-[11px] font-black text-white hover:text-yellow-400 transition-colors uppercase tracking-tight truncate pr-2"
                          >
                            {notif.title}
                          </Link>
                          <span className="text-[8px] font-bold text-white/20 whitespace-nowrap">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed line-clamp-2 mb-2 font-medium">
                          {notif.content}
                        </p>
                        {!notif.is_read && (
                          <button 
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-yellow-400 transition-colors"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-white/2 border-t border-white/5 text-center">
              <Link 
                href="/notifications" 
                onClick={() => setIsOpen(false)}
                className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] hover:text-white transition-colors"
              >
                View Full History
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Global high-priority opportunity alert fullscreen glassmorphic modal overlay (Desktop: Bottom-Right Corner Alert Widget) */}
      {isAlerting && activeAlertNotif && hasMountedAlarm && typeof document !== 'undefined' && createPortal(
        <div className="fixed top-0 left-0 bottom-0 right-0 md:top-auto md:left-auto md:bottom-8 md:right-8 w-full md:w-[480px] h-full md:h-auto z-[9999] flex items-center justify-center md:items-end md:justify-end bg-black/85 md:bg-transparent backdrop-blur-3xl md:backdrop-blur-none animate-in slide-in-from-bottom-8 fade-in duration-300 text-left">
          <div className="relative w-full max-w-2xl mx-4 md:mx-0 bg-[#0d0d0c]/98 border border-[#FF2626]/30 rounded-[2.5rem] md:rounded-[2rem] p-8 md:p-6 shadow-[0_0_100px_rgba(255,38,38,0.25)] md:shadow-[0_0_50px_rgba(255,38,38,0.3)] backdrop-blur-xl overflow-hidden">
            {/* Ambient Red Radar Pulsing Background (Mobile only, hidden on Desktop to preserve design clean) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 md:hidden">
              <div className="absolute w-[200px] h-[200px] rounded-full border border-red-500 animate-ping duration-1000"></div>
              <div className="absolute w-[400px] h-[400px] rounded-full border border-red-500 animate-ping duration-1500"></div>
              <div className="absolute w-[600px] h-[600px] rounded-full border border-red-500 animate-ping duration-2000"></div>
            </div>

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Pulsing Alarm Bell Icon with Ripple Rings */}
              <div className="relative mb-6 md:mb-4 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#FF2626]/10 animate-ping duration-1500 scale-150 md:scale-125"></div>
                <div className="size-20 md:size-12 rounded-3xl md:rounded-2xl bg-[#FF2626]/20 border border-[#FF2626]/30 flex items-center justify-center text-[#FF2626] shadow-[0_0_30px_rgba(255,38,38,0.3)] animate-bounce duration-1000">
                  <span className="material-symbols-outlined text-4xl md:text-2xl animate-pulse">ring_volume</span>
                </div>
              </div>

              {/* Alert Title */}
              <h2 className="text-xl md:text-sm font-black text-white uppercase italic tracking-tighter mb-2 md:mb-1">
                🚨 {activeAlertNotif.title || 'NEW OPPORTUNITY DETECTED'}
              </h2>
              <p className="text-[#FF2626] text-[10px] md:text-[8px] font-black uppercase tracking-[0.3em] mb-6 md:mb-4 animate-pulse">
                High Priority Live Alert
              </p>

              {/* Snippet / Content Card */}
              <div className="w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl md:rounded-xl p-6 md:p-4 mb-6 md:mb-5 text-left max-h-60 md:max-h-40 overflow-y-auto">
                <p className="text-[10px] md:text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Sender</p>
                <p className="text-[11px] md:text-[9px] font-bold text-white mb-4 md:mb-3">{activeAlertNotif.from || 'Unknown Source'}</p>
                
                <p className="text-[10px] md:text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Message Snippet</p>
                <p className="text-[11px] md:text-[9px] text-zinc-300 leading-relaxed font-medium">
                  {activeAlertNotif.content || 'No description preview available.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 md:gap-3 w-full">
                <button
                  onClick={handleSilenceAlert}
                  className="flex-1 py-4 md:py-3 rounded-2xl md:rounded-xl bg-[#FF2626] hover:bg-[#E01E1E] text-white text-[10px] md:text-[9px] font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(255,38,38,0.35)] active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-sm md:text-xs">notifications_off</span>
                  Acknowledge & Silence
                </button>
                {activeAlertNotif.type === 'gmail' && (
                  <a
                    href="https://mail.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-4 md:py-3 rounded-2xl md:rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[10px] md:text-[9px] font-black uppercase tracking-[0.2em] hover:bg-zinc-800 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    <span className="material-symbols-outlined text-sm md:text-xs">open_in_new</span>
                    Open Gmail
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
