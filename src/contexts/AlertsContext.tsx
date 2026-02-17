import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { AlertItem, AlertPreferences, PriceAlert } from "@/types/alerts";
import { defaultAlertPreferences } from "@/types/alerts";
import { useWatchlist } from "@/hooks/use-watchlist";
import { assetsData } from "@/data/assets";

interface AlertsContextValue {
  // Alerts
  alerts: AlertItem[];
  addAlert: (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => AlertItem | null;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismissAlert: (id: string) => void;
  deleteAlert: (id: string) => void;
  clearAllAlerts: () => void;

  // Price Alerts
  priceAlerts: PriceAlert[];
  addPriceAlert: (alert: Omit<PriceAlert, "id" | "createdAt" | "triggered" | "enabled">) => void;
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
    console.log("Audio not supported");
  }
};

// --------------------
// Demo price simulation helpers
// --------------------
const parsePriceNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;

  const cleaned = v.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const getSeedPriceForAsset = (symbol: string): number => {
  const a = assetsData.find((x: any) => (x.symbol || "").toUpperCase() === symbol.toUpperCase());
  const n = parsePriceNumber(a?.latestPrice);
  if (n && n > 0) return n;

  const s = symbol.toUpperCase();
  if (s.startsWith("BTC")) return 40000;
  if (s.startsWith("ETH")) return 2500;
  if (s.startsWith("XAU")) return 2000;
  if (s.startsWith("SPX")) return 5000;
  if (s.length === 6) return 1.25;
  return 100;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const randomWalkNext = (symbol: string, last: number): number => {
  const s = symbol.toUpperCase();

  let pct = 0.0008;
  if (s.startsWith("BTC") || s.startsWith("ETH")) pct = 0.0035;
  if (s.startsWith("XAU")) pct = 0.0015;
  if (s.startsWith("SPX")) pct = 0.0012;

  const step = last * pct * (Math.random() - 0.5) * 2;
  const next = last + step;
  return clamp(next, last * 0.2, last * 5);
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
    const saved = localStorage.getItem("alertPreferences");
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultAlertPreferences, ...parsed };
    }
    return defaultAlertPreferences;
  });

  const lastAlertIdRef = useRef<string | null>(null);

  const lastPriceBySymbolRef = useRef<Record<string, number>>({});
  const closeConfirmRef = useRef<Record<string, number>>({});

  const relevantCurrencies = useMemo(() => {
    const combined = new Set([...watchlistCurrencies, ...preferences.relevantCurrencies]);
    return Array.from(combined);
  }, [watchlistCurrencies, preferences.relevantCurrencies]);

  const isAlertRelevant = useCallback(
    (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => {
      if (alert.type === "news" && preferences.eventSpecificNews.length > 0) {
        return true;
      }

      // Bias alerts are normally watchlist-only.
      // NOTE: addAlert() now bypasses relevance gating for bias (see below),
      // so this still applies for any future auto-generated bias alerts you might add.
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
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }, [preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd]);

  useEffect(() => {
    const savedAlerts = localStorage.getItem("alerts");
    if (savedAlerts) {
      const parsed = JSON.parse(savedAlerts);
      setAlerts(
        parsed.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })),
      );
    }

    const savedPriceAlerts = localStorage.getItem("priceAlerts");
    if (savedPriceAlerts) {
      const parsed = JSON.parse(savedPriceAlerts);
      setPriceAlerts(
        parsed.map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          triggeredAt: a.triggeredAt ? new Date(a.triggeredAt) : undefined,
        })),
      );
    }
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
      // ✅ FIX:
      // Allow "bias" alerts through (same as timer/price),
      // so Test Alerts always appear even if the symbol isn't in watchlist yet.
      if (alert.type !== "timer" && alert.type !== "price" && alert.type !== "bias" && !isAlertRelevant(alert)) {
        return null;
      }

      const newAlert: AlertItem = {
        ...alert,
        id: Math.random().toString(36).substr(2, 9),
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
      id: Math.random().toString(36).substr(2, 9),
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
        const nextEnabled = !a.enabled;
        closeConfirmRef.current[id] = 0;
        return { ...a, enabled: nextEnabled };
      }),
    );
  }, []);

  const updatePreferences = useCallback((newPrefs: AlertPreferences) => {
    setPreferences(newPrefs);
  }, []);

  // ✅ DEMO: simulated price feed + alert triggering
  useEffect(() => {
    const interval = window.setInterval(() => {
      setPriceAlerts((prev) => {
        if (!prev || prev.length === 0) return prev;

        let mutated = false;
        const nextAlerts = prev.map((a) => {
          if (!a.enabled || a.triggered) return a;

          const symbol = (a.asset || "").toUpperCase();
          const last =
            typeof a.lastCheckedPrice === "number" && Number.isFinite(a.lastCheckedPrice)
              ? a.lastCheckedPrice
              : (lastPriceBySymbolRef.current[symbol] ?? getSeedPriceForAsset(symbol));

          const nextPrice = randomWalkNext(symbol, last);
          lastPriceBySymbolRef.current[symbol] = nextPrice;

          const hit =
            a.direction === "above" ? nextPrice >= a.price : a.direction === "below" ? nextPrice <= a.price : false;

          if (a.triggerType === "close") {
            const required = timeframeConfirmTicks[a.timeframe || "15m"] ?? 4;
            const current = closeConfirmRef.current[a.id] ?? 0;
            const updated = hit ? current + 1 : 0;
            closeConfirmRef.current[a.id] = updated;

            const confirmed = updated >= required;

            if (confirmed) {
              mutated = true;

              addAlert({
                type: "price",
                title: "Price Alert Triggered",
                message: `${a.assetDisplayName} closed ${a.direction} ${a.price} (${a.timeframe})`,
                severity: "high",
                relatedAsset: a.asset,
                routeTo: "/alerts",
              });

              return {
                ...a,
                lastCheckedPrice: nextPrice,
                triggered: true,
                triggeredAt: new Date(),
              };
            }

            mutated = true;
            return { ...a, lastCheckedPrice: nextPrice };
          }

          if (hit) {
            mutated = true;

            addAlert({
              type: "price",
              title: "Price Alert Triggered",
              message: `${a.assetDisplayName} wicked ${a.direction} ${a.price}`,
              severity: "high",
              relatedAsset: a.asset,
              routeTo: "/alerts",
            });

            return {
              ...a,
              lastCheckedPrice: nextPrice,
              triggered: true,
              triggeredAt: new Date(),
            };
          }

          mutated = true;
          return { ...a, lastCheckedPrice: nextPrice };
        });

        return mutated ? nextAlerts : prev;
      });
    }, 1500);

    return () => window.clearInterval(interval);
  }, [addAlert]);

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
