import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { AlertItem, AlertPreferences, PriceAlert, AlertStatus } from "@/types/alerts";
import { defaultAlertPreferences } from "@/types/alerts";
import { useWatchlist } from "@/hooks/use-watchlist";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { normalizeSymbol } from "@/services/marketData";
import { getAllCalendarEvents, getEventDateTime } from "@/services/calendarData";

interface ScheduleAlertInput extends Omit<AlertItem, "id" | "timestamp" | "read" | "status" | "triggeredAt"> {
  scheduledFor: Date;
}

interface ImmediateAlertInput extends Omit<AlertItem, "id" | "timestamp" | "read" | "status" | "triggeredAt"> {}

interface RecurringSubscription {
  id: string;
  key: string;
  eventName: string;
  currency: string;
  createdAt: Date;
}

interface AlertsContextValue {
  alerts: AlertItem[];
  recurringSubscriptions: RecurringSubscription[];

  addAlert: (alert: ImmediateAlertInput) => AlertItem | null;
  scheduleAlert: (alert: ScheduleAlertInput) => AlertItem | null;

  addRecurringSubscription: (input: { key: string; eventName: string; currency: string }) => void;
  removeRecurringSubscription: (id: string) => void;

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

const RECURRING_SUBSCRIPTIONS_STORAGE_KEY = "recurringSubscriptions";

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

const isAlertStatus = (value: unknown): value is AlertStatus => {
  return value === "pending" || value === "triggered";
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

const parseStoredAlert = (alert: any): AlertItem => {
  const timestamp = alert?.timestamp ? new Date(alert.timestamp) : new Date();
  const scheduledFor = alert?.scheduledFor ? new Date(alert.scheduledFor) : undefined;
  const triggeredAt = alert?.triggeredAt ? new Date(alert.triggeredAt) : undefined;

  const status: AlertStatus = isAlertStatus(alert?.status)
    ? alert.status
    : scheduledFor && scheduledFor.getTime() > Date.now()
      ? "pending"
      : "triggered";

  return {
    ...alert,
    timestamp,
    scheduledFor,
    triggeredAt,
    status,
    read: Boolean(alert?.read),
  };
};

const parseStoredRecurringSubscription = (item: any): RecurringSubscription => {
  return {
    ...item,
    createdAt: item?.createdAt ? new Date(item.createdAt) : new Date(),
  };
};

export function AlertsProvider({ children }: { children: React.ReactNode }) {
  const { watchlist, watchlistCurrencies } = useWatchlist();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recurringSubscriptions, setRecurringSubscriptions] = useState<RecurringSubscription[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [preferences, setPreferences] = useState<AlertPreferences>(() => {
    const parsed = safeJsonParse<Partial<AlertPreferences>>(localStorage.getItem("alertPreferences"), {});
    return { ...defaultAlertPreferences, ...parsed };
  });

  const [timeTick, setTimeTick] = useState(() => Date.now());

  const lastAlertIdRef = useRef<string | null>(null);
  const closeConfirmRef = useRef<Record<string, number>>({});

  const allCalendarEvents = useMemo(() => getAllCalendarEvents(), []);

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
    (alert: ImmediateAlertInput | ScheduleAlertInput) => {
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
  }, [preferences.quietHoursEnabled, preferences.quietHoursStart, preferences.quietHoursEnd, timeTick]);

  useEffect(() => {
    const savedAlerts = safeJsonParse<any[]>(localStorage.getItem("alerts"), []);
    const savedRecurringSubscriptions = safeJsonParse<any[]>(
      localStorage.getItem(RECURRING_SUBSCRIPTIONS_STORAGE_KEY),
      [],
    );
    const savedPriceAlerts = safeJsonParse<any[]>(localStorage.getItem("priceAlerts"), []);

    setAlerts(savedAlerts.map(parseStoredAlert));
    setRecurringSubscriptions(savedRecurringSubscriptions.map(parseStoredRecurringSubscription));

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
    localStorage.setItem(RECURRING_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(recurringSubscriptions));
  }, [recurringSubscriptions]);

  useEffect(() => {
    localStorage.setItem("priceAlerts", JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  useEffect(() => {
    localStorage.setItem("alertPreferences", JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeTick(Date.now());
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const addAlert = useCallback(
    (alert: ImmediateAlertInput) => {
      if (alert.type !== "timer" && alert.type !== "price" && alert.type !== "bias" && !isAlertRelevant(alert)) {
        return null;
      }

      const now = new Date();

      const newAlert: AlertItem = {
        ...alert,
        id: createId(),
        timestamp: now,
        read: false,
        status: "triggered",
        triggeredAt: now,
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

  const scheduleAlert = useCallback(
    (alert: ScheduleAlertInput) => {
      if (!isAlertRelevant(alert)) return null;

      const scheduledDate = alert.scheduledFor instanceof Date ? alert.scheduledFor : new Date(alert.scheduledFor);

      const newAlert: AlertItem = {
        ...alert,
        id: createId(),
        timestamp: new Date(),
        read: false,
        status: "pending",
        scheduledFor: scheduledDate,
      };

      setAlerts((prev) => [newAlert, ...prev].slice(0, 100));
      return newAlert;
    },
    [isAlertRelevant],
  );

  const addRecurringSubscription = useCallback((input: { key: string; eventName: string; currency: string }) => {
    setRecurringSubscriptions((prev) => {
      const exists = prev.some((item) => item.key === input.key);
      if (exists) return prev;

      return [
        {
          id: createId(),
          key: input.key,
          eventName: input.eventName,
          currency: input.currency,
          createdAt: new Date(),
        },
        ...prev,
      ];
    });
  }, []);

  const removeRecurringSubscription = useCallback((id: string) => {
    setRecurringSubscriptions((prev) => prev.filter((item) => item.id !== id));
  }, []);

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
    if (alerts.length === 0) return;

    const now = Date.now();
    const newlyTriggered: AlertItem[] = [];

    const nextAlerts = alerts.map((alert) => {
      if (alert.status !== "pending" || !alert.scheduledFor) return alert;
      if (alert.scheduledFor.getTime() > now) return alert;

      const triggeredAlert: AlertItem = {
        ...alert,
        status: "triggered",
        triggeredAt: new Date(),
        read: false,
      };

      newlyTriggered.push(triggeredAlert);
      return triggeredAlert;
    });

    const changed = nextAlerts.some((alert, index) => alert !== alerts[index]);

    if (changed) {
      setAlerts(nextAlerts);

      newlyTriggered.forEach((alert) => {
        if (preferences.soundEnabled && !isQuietHours && lastAlertIdRef.current !== alert.id) {
          lastAlertIdRef.current = alert.id;
          playNotificationSound();
        }

        toastTriggeredAlert(alert);
      });
    }
  }, [alerts, preferences.soundEnabled, isQuietHours, timeTick]);

  useEffect(() => {
    if (recurringSubscriptions.length === 0) return;

    const now = Date.now();
    const newAlerts: AlertItem[] = [];

    recurringSubscriptions.forEach((sub) => {
      const matchingEvents = allCalendarEvents
        .filter((event) => event.eventKey === sub.key)
        .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());

      if (matchingEvents.length === 0) return;

      const dueEvent = [...matchingEvents].reverse().find((event) => {
        const eventTime = getEventDateTime(event).getTime();
        return !Number.isNaN(eventTime) && eventTime <= now;
      });

      if (!dueEvent) return;

      const alreadyTriggeredForEvent = alerts.some(
        (alert) =>
          alert.recurrence === "event-series" &&
          alert.recurrenceKey === sub.key &&
          alert.eventId === dueEvent.id &&
          alert.status === "triggered",
      );

      if (alreadyTriggeredForEvent) return;

      newAlerts.push({
        id: createId(),
        type: "news",
        title: `${dueEvent.event} (${dueEvent.currency})`,
        message: `${dueEvent.event} is due now.`,
        timestamp: new Date(),
        read: false,
        severity: dueEvent.impact === "high" ? "high" : "info",
        status: "triggered",
        triggeredAt: new Date(),
        relatedAsset: dueEvent.currency,
        routeTo: "/calendar",
        eventId: dueEvent.id,
        recurrence: "event-series",
        recurrenceKey: sub.key,
      });
    });

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 100));

      newAlerts.forEach((alert) => {
        if (preferences.soundEnabled && !isQuietHours && lastAlertIdRef.current !== alert.id) {
          lastAlertIdRef.current = alert.id;
          playNotificationSound();
        }

        toastTriggeredAlert(alert);
      });
    }
  }, [recurringSubscriptions, alerts, preferences.soundEnabled, isQuietHours, timeTick, allCalendarEvents]);

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
            routeParams: { symbol },
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
          routeParams: { symbol },
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
    recurringSubscriptions,
    addAlert,
    scheduleAlert,
    addRecurringSubscription,
    removeRecurringSubscription,
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

function toastTriggeredAlert(alert: AlertItem) {
  try {
    const event = new CustomEvent("streambias-alert-triggered", { detail: alert });
    window.dispatchEvent(event);
  } catch {
    // no-op
  }
}

export function useAlertsContext() {
  const context = useContext(AlertsContext);
  if (context === undefined) {
    throw new Error("useAlertsContext must be used within an AlertsProvider");
  }
  return context;
}
