import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { AlertItem, AlertPreferences, PriceAlert, AlertType } from '@/types/alerts';
import { defaultAlertPreferences } from '@/types/alerts';
import { useWatchlist } from '@/hooks/use-watchlist';

interface AlertsContextValue {
  // Alerts
  alerts: AlertItem[];
  addAlert: (alert: Omit<AlertItem, 'id' | 'timestamp' | 'read'>) => AlertItem | null;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  clearAllAlerts: () => void;
  
  // Price Alerts
  priceAlerts: PriceAlert[];
  addPriceAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered' | 'enabled'>) => void;
  updatePriceAlert: (id: string, updates: Partial<PriceAlert>) => void;
  deletePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;
  
  // Preferences
  preferences: AlertPreferences;
  updatePreferences: (prefs: AlertPreferences) => void;
  
  // Status
  isQuietHours: boolean;
  unreadCount: number;
  
  // Watchlist
  watchlist: string[];
  watchlistCurrencies: string[];
  relevantCurrencies: string[];
}

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined);

// Notification sound - subtle text-message style
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    // Silent fail if audio not supported
    console.log('Audio not supported');
  }
};

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { watchlist, watchlistCurrencies } = useWatchlist();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences>(() => {
    const saved = localStorage.getItem('alertPreferences');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new fields
      return { ...defaultAlertPreferences, ...parsed };
    }
    return defaultAlertPreferences;
  });
  
  const lastAlertIdRef = useRef<string | null>(null);

  // Combine watchlist-derived currencies with manually selected currencies
  const relevantCurrencies = useMemo(() => {
    const combined = new Set([
      ...watchlistCurrencies,
      ...preferences.relevantCurrencies
    ]);
    return Array.from(combined);
  }, [watchlistCurrencies, preferences.relevantCurrencies]);

  // Check if an alert is relevant based on watchlist and preferences
  const isAlertRelevant = useCallback((alert: Omit<AlertItem, 'id' | 'timestamp' | 'read'>) => {
    // Event-specific alerts always notify
    if (alert.type === 'news' && preferences.eventSpecificNews.length > 0) {
      return true;
    }
    
    // Bias alerts are watchlist-only
    if (alert.type === 'bias') {
      return alert.relatedAsset ? watchlist.includes(alert.relatedAsset) : false;
    }
    
    // Price alerts always relevant (user created them)
    if (alert.type === 'price') {
      return true;
    }
    
    // For other alerts, check currency relevance
    if (alert.relatedAsset) {
      const assetCurrencies = alert.relatedAsset.match(/[A-Z]{3}/g) || [];
      return assetCurrencies.some(curr => relevantCurrencies.includes(curr));
    }
    
    return true;
  }, [watchlist, relevantCurrencies, preferences.eventSpecificNews]);

  // Check if currently in quiet hours
  const isQuietHours = useMemo(() => {
    if (!preferences.quietHoursEnabled) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    const [startH, startM] = preferences.quietHoursStart.split(':').map(Number);
    const [endH, endM] = preferences.quietHoursEnd.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;
    
    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }, [preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedAlerts = localStorage.getItem('alerts');
    if (savedAlerts) {
      const parsed = JSON.parse(savedAlerts);
      setAlerts(parsed.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp)
      })));
    }
    
    const savedPriceAlerts = localStorage.getItem('priceAlerts');
    if (savedPriceAlerts) {
      const parsed = JSON.parse(savedPriceAlerts);
      setPriceAlerts(parsed.map((a: any) => ({
        ...a,
        createdAt: new Date(a.createdAt),
        triggeredAt: a.triggeredAt ? new Date(a.triggeredAt) : undefined
      })));
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem('alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('priceAlerts', JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  useEffect(() => {
    localStorage.setItem('alertPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const unreadCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);

  const addAlert = useCallback((alert: Omit<AlertItem, 'id' | 'timestamp' | 'read'>) => {
    // Check relevance before adding (except for manual timers and price alerts)
    if (alert.type !== 'timer' && alert.type !== 'price' && !isAlertRelevant(alert)) {
      return null;
    }
    
    const newAlert: AlertItem = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    
    setAlerts(prev => [newAlert, ...prev].slice(0, 100));
    
    // Play sound if enabled and not quiet hours
    if (preferences.soundEnabled && !isQuietHours && lastAlertIdRef.current !== newAlert.id) {
      lastAlertIdRef.current = newAlert.id;
      playNotificationSound();
    }
    
    return newAlert;
  }, [isAlertRelevant, preferences.soundEnabled, isQuietHours]);

  const markRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, read: true } : a
    ));
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  }, []);

  const dismissAlert = useCallback((id: string) => {
    markRead(id);
  }, [markRead]);

  const deleteAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Price Alert functions
  const addPriceAlert = useCallback((alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered' | 'enabled'>) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      triggered: false,
      enabled: true
    };
    setPriceAlerts(prev => [...prev, newAlert]);
  }, []);

  const updatePriceAlert = useCallback((id: string, updates: Partial<PriceAlert>) => {
    setPriceAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, ...updates } : a
    ));
  }, []);

  const deletePriceAlert = useCallback((id: string) => {
    setPriceAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const togglePriceAlert = useCallback((id: string) => {
    setPriceAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  }, []);

  const updatePreferences = useCallback((newPrefs: AlertPreferences) => {
    setPreferences(newPrefs);
  }, []);

  const value: AlertsContextValue = {
    alerts,
    addAlert,
    markRead,
    markAllRead,
    dismissAlert,
    deleteAlert,
    clearAllAlerts,
    priceAlerts,
    addPriceAlert,
    updatePriceAlert,
    deletePriceAlert,
    togglePriceAlert,
    preferences,
    updatePreferences,
    isQuietHours,
    unreadCount,
    watchlist,
    watchlistCurrencies,
    relevantCurrencies
  };

  return (
    <AlertsContext.Provider value={value}>
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlertsContext() {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error('useAlertsContext must be used within an AlertsProvider');
  }
  return context;
}
