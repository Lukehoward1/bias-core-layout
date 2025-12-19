import { useState, useCallback, useEffect } from "react";
import type { AlertItem } from "@/components/alerts/AlertToast";
import type { AlertPreferences } from "@/components/alerts/AlertPreferencesPanel";

const defaultPreferences: AlertPreferences = {
  sessionReminders: true,
  sessionReminderOffsets: [15, 5],
  sessionOverlaps: true,
  sessionStatus: false,
  highImpactNews: true,
  eventSpecificNews: [],
  breakingNews: true,
  postEventSummaries: true,
  biasFlipAlerts: true,
  biasFlipTimeframes: ['H4', 'Daily'],
  biasAlignmentAlerts: true,
  dailySummary: true,
  weeklySummary: false,
  preNewsExposure: true,
  lowLiquidity: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  relevantCurrencies: ['USD', 'EUR', 'GBP']
};

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences>(() => {
    const saved = localStorage.getItem('alertPreferences');
    return saved ? JSON.parse(saved) : defaultPreferences;
  });

  // Check if currently in quiet hours
  const isQuietHours = useCallback(() => {
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
      // Handles overnight quiet hours (e.g., 22:00 - 06:00)
      return currentTime >= startTime || currentTime < endTime;
    }
  }, [preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd]);

  // Load alerts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('alerts');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAlerts(parsed.map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp)
      })));
    }
  }, []);

  // Save alerts to localStorage on change
  useEffect(() => {
    localStorage.setItem('alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Save preferences to localStorage on change
  useEffect(() => {
    localStorage.setItem('alertPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const addAlert = useCallback((alert: Omit<AlertItem, 'id' | 'timestamp' | 'read'>) => {
    const newAlert: AlertItem = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 100)); // Keep max 100 alerts
    return newAlert;
  }, []);

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

  const updatePreferences = useCallback((newPrefs: AlertPreferences) => {
    setPreferences(newPrefs);
  }, []);

  return {
    alerts,
    preferences,
    isQuietHours: isQuietHours(),
    addAlert,
    markRead,
    markAllRead,
    dismissAlert,
    deleteAlert,
    clearAllAlerts,
    updatePreferences
  };
}
