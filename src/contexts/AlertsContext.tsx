import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { AlertItem, AlertPreferences, PriceAlert } from "@/types/alerts";
import { defaultAlertPreferences } from "@/types/alerts";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { normalizeSymbol } from "@/services/marketData";

interface AlertsContextValue {
  alerts: AlertItem[];
  addAlert: (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => AlertItem | null;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  clearAllAlerts: () => void;

  priceAlerts: PriceAlert[];
  addPriceAlert: (alert: Omit<PriceAlert, "id" | "createdAt" | "triggered" | "enabled">) => void;
  updatePriceAlert: (id: string, updates: Partial<PriceAlert>) => void;
  deletePriceAlert: (id: string) => void;
  togglePriceAlert: (id: string) => void;

  preferences: AlertPreferences;
  updatePreferences: (prefs: AlertPreferences) => void;

  isQuietHours: boolean;
  unreadCount: number;

  watchlist: string[];
  watchlistCurrencies: string[];
  relevantCurrencies: string[];
}

const AlertsContext = createContext<AlertsContextValue | undefined>(undefined);

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

const safeJsonParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const audioContext = new AudioCtx();
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
  } catch {
    // no-op
  }
};

const timeframeConfirmTicks: Record<string, number> = {
  "1m": 2,
  "5m": 3,
  "15m": 4,
  "30m": 5,
  "1h": 6,
  "4h": 7,
  "1D": 8,
  "1W": 10,
};

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { watchlist, watchlistCurrencies } = useWatchlist();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences>(() => {
    const parsed = safeJsonParse<Partial<AlertPreferences>>(localStorage.getItem("alertPreferences"), {});
    return { ...defaultAlertPreferences, ...parsed };
  });

  const lastAlertIdRef = useRef<string | null>(null);
  const closeConfirmRef = useRef<Record<string, number>>({});

  const activePriceAlertSymbols = useMemo(() => {
    return Array.from(
      new Set(priceAlerts.filter((a) => a.enabled && !a.triggered && a.asset).map((a) => normalizeSymbol(a.asset))),
    );
  }, [priceAlerts]);

  const quotes = useMarketQuotes(activePriceAlertSymbols);

  const relevantCurrencies = useMemo(() => {
    const combined = new Set([...watchlistCurrencies, ...preferences.relevantCurrencies]);
    return Array.from(combined);
  }, [watchlistCurrencies, preferences.relevantCurrencies]);

  const isAlertRelevant = useCallback(
    (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => {
      if (alert.type === "news" && preferences.eventSpecificNews.length > 0) {
        return true;
      }

      if (alert.type === "bias") {
        return alert.relatedAsset ? watchlist.includes(alert.relatedAsset) : false;
      }

      if (alert.type === "price") {
        return true;
      }

      if (alert.relatedAsset) {
        const assetCurrencies = alert.relatedAsset.match(/[A-Z]{3}/g) || [];
        return assetCurrencies.some((curr) => relevantCurrencies.includes(curr));
      }

      return true;
    },
    [watchlist, relevantCurrencies, preferences.eventSpecificNews],
  );

  const isQuietHours = useMemo(() => {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = preferences.quietHoursStart.split(":").map(Number);
    const [endH, endM] = preferences.quietHoursEnd.split(":").map(Number);

    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    }

    return currentTime >= startTime || currentTime < endTime;
  }, [preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd]);

  useEffect(() => {
    const savedAlerts = safeJsonParse<any[]>(localStorage.getItem("alerts"), []);
    const savedPriceAlerts = safeJsonParse<any[]>(localStorage.getItem("priceAlerts"), []);

    setAlerts(
      savedAlerts.map((a) => ({
        ...a,
        timestamp: new Date(a.timestamp),
      })),
    );

    setPriceAlerts(
      savedPriceAlerts.map((a) => ({
        ...a,
        createdAt: new Date(a.createdAt),
        triggeredAt: a.triggeredAt ? new Date(a.triggeredAt) : undefined,
      })),
    );
  }, []);

  useEffect(() => {
    localStorage.setItem("alerts", JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem("priceAlerts", JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  useEffect(() => {
    localStorage.setItem("alertPreferences", JSON.stringify(preferences));
  }, [preferences]);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const addAlert = useCallback(
    (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => {
      if (alert.type !== "timer" && alert.type !== "price" && alert.type !== "bias" && !isAlertRelevant(alert)) {
        return null;
      }

      const newAlert: AlertItem = {
        ...alert,
        id: createId(),
        timestamp: new Date(),
        read: false,
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 100));

      if (preferences.soundEnabled && !isQuietHours && lastAlertIdRef.current !== newAlert.id) {
        lastAlertIdRef.current = newAlert.id;
        playNotificationSound();
      }

      return newAlert;
    },
    [isAlertRelevant, preferences.soundEnabled, isQuietHours],
  );

  const markRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const dismissAlert = useCallback(
    (id: string) => {
      markRead(id);
    },
    [markRead],
  );

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const addPriceAlert = useCallback((alert: Omit<PriceAlert, "id" | "createdAt" | "triggered" | "enabled">) => {
    const newAlert: PriceAlert = {
      ...alert,
      id: createId(),
      createdAt: new Date(),
      triggered: false,
      enabled: true,
      lastCheckedPrice: alert.lastCheckedPrice,
    };

    setPriceAlerts((prev) => [...prev, newAlert]);
  }, []);

  const updatePriceAlert = useCallback((id: string, updates: Partial<PriceAlert>) => {
    setPriceAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
  }, []);

  const deletePriceAlert = useCallback((id: string) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
    delete closeConfirmRef.current[id];
  }, []);

  const togglePriceAlert = useCallback((id: string) => {
    setPriceAlerts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        closeConfirmRef.current[id] = 0;
        return { ...a, enabled: !a.enabled };
      }),
    );
  }, []);

  const updatePreferences = useCallback((newPrefs: AlertPreferences) => {
    setPreferences(newPrefs);
  }, []);

  useEffect(() => {
    if (priceAlerts.length === 0) return;

    const triggeredNotifications: Array<{
      title: string;
      message: string;
      relatedAsset: string;
      routeTo: string;
      routeParams: Record<string, string>;
    }> = [];

    const nextAlerts = priceAlerts.map((alert) => {
      if (!alert.enabled || alert.triggered || !alert.asset) return alert;

      const symbol = normalizeSymbol(alert.asset);
      const quote = quotes[symbol];
      const currentPrice = quote?.last;

      if (!Number.isFinite(currentPrice)) {
        return alert;
      }

      const hit =
        alert.direction === "above"
          ? currentPrice >= alert.price
          : alert.direction === "below"
            ? currentPrice <= alert.price
            : false;

      if (alert.triggerType === "close") {
        const required = timeframeConfirmTicks[alert.timeframe || "15m"] ?? 4;
        const currentCount = closeConfirmRef.current[alert.id] ?? 0;
        const updatedCount = hit ? currentCount + 1 : 0;

        closeConfirmRef.current[alert.id] = updatedCount;

        if (updatedCount >= required) {
          triggeredNotifications.push({
            title: "Price Alert Triggered",
            message: `${alert.assetDisplayName} closed ${alert.direction} ${alert.price} (${alert.timeframe})`,
            relatedAsset: alert.asset,
            routeTo: "/asset/:symbol",
            routeParams: { symbol: symbol },
          });

          closeConfirmRef.current[alert.id] = 0;

          return {
            ...alert,
            lastCheckedPrice: currentPrice,
            triggered: true,
            triggeredAt: new Date(),
          };
        }

        if (alert.lastCheckedPrice !== currentPrice) {
          return {
            ...alert,
            lastCheckedPrice: currentPrice,
          };
        }

        return alert;
      }

      if (hit) {
        triggeredNotifications.push({
          title: "Price Alert Triggered",
          message: `${alert.assetDisplayName} wicked ${alert.direction} ${alert.price}`,
          relatedAsset: alert.asset,
          routeTo: "/asset/:symbol",
          routeParams: { symbol: symbol },
        });

        closeConfirmRef.current[alert.id] = 0;

        return {
          ...alert,
          lastCheckedPrice: currentPrice,
          triggered: true,
          triggeredAt: new Date(),
        };
      }

      if (alert.lastCheckedPrice !== currentPrice) {
        return {
          ...alert,
          lastCheckedPrice: currentPrice,
        };
      }

      return alert;
    });

    const changed = nextAlerts.some((alert, index) => alert !== priceAlerts[index]);

    if (changed) {
      setPriceAlerts(nextAlerts);
    }

    if (triggeredNotifications.length > 0) {
      triggeredNotifications.forEach((item) => {
        addAlert({
          type: "price",
          title: item.title,
          message: item.message,
          severity: "high",
          relatedAsset: item.relatedAsset,
          routeTo: item.routeTo,
          routeParams: item.routeParams,
        });
      });
    }
  }, [priceAlerts, quotes, addAlert]);

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
    relevantCurrencies,
  };

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlertsContext() {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error("useAlertsContext must be used within an AlertsProvider");
  }
  return context;
}
