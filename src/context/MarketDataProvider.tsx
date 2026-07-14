import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getQuotes, normalizeSymbol, type MarketQuote } from "@/services/marketData";
import { buildMarketContext, type MarketContext } from "@/services/contextEngine";
import type { Asset } from "@/data/assets";
import { calendarEvents as staticCalendarEvents, type CalendarEvent } from "@/data/calendarEvents";
import { getLiveCalendarEvents } from "@/services/calendarService";
import { getEventImpact } from "@/data/eventImpactRules";
import type { TraderStyle } from "@/context/TraderStyleProvider";

type MarketDataContextValue = {
  quotes: Record<string, MarketQuote>;
  subscribeSymbols: (symbols: string[]) => void;
  contextMap: Record<string, MarketContext>;
  subscribeContextSymbols: (assets: Asset[], traderStyle: TraderStyle) => void;
};

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

const POLL_INTERVAL = 15000;

const normalizeForMatch = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const isFxPair = (s: string) => /^[A-Z]{6}$/.test(s);
const fxCurrencies = (s: string) => {
  const n = normalizeForMatch(s);
  return isFxPair(n) ? [n.slice(0, 3), n.slice(3)] : [];
};

function isEventRelevant(symbol: string, event: CalendarEvent): boolean {
  const n = normalizeForMatch(symbol);
  const impact = getEventImpact({ title: event.event, currency: event.currency });
  if (impact.affectedPairs.includes(n)) return true;
  if (impact.affectedAssets.includes(n)) return true;
  if (isFxPair(n)) return fxCurrencies(n).some((c) => impact.affectedCurrencies.includes(c));
  return false;
}

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [contextMap, setContextMap] = useState<Record<string, MarketContext>>({});
  const [calendarSource, setCalendarSource] = useState<CalendarEvent[]>(staticCalendarEvents);
  const [contextTrigger, setContextTrigger] = useState(0);

  const trackedSymbols = useRef<Set<string>>(new Set());
  const trackedContextAssets = useRef<Map<string, Asset>>(new Map());
  const latestTraderStyle = useRef<TraderStyle>("intraday");
  const latestQuotes = useRef<Record<string, MarketQuote>>({});

  useEffect(() => { latestQuotes.current = quotes; }, [quotes]);

  useEffect(() => {
    getLiveCalendarEvents()
      .then((events) => { if (events.length > 0) setCalendarSource(events); })
      .catch(() => {});
  }, []);

  const subscribeSymbols = (symbols: string[]) => {
    for (const s of symbols) {
      trackedSymbols.current.add(s.toUpperCase().replace(/[/ ]/g, ""));
    }
  };

  const subscribeContextSymbols = useCallback((assets: Asset[], style: TraderStyle) => {
    let dirty = false;
    for (const a of assets) {
      if (!trackedContextAssets.current.has(a.symbol)) {
        trackedContextAssets.current.set(a.symbol, a);
        dirty = true;
      }
    }
    if (style !== latestTraderStyle.current) {
      latestTraderStyle.current = style;
      dirty = true;
    }
    if (dirty) setContextTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    const poll = async () => {
      const syms = Array.from(trackedSymbols.current);
      if (syms.length === 0) return;
      try {
        const results = await getQuotes(syms);
        const map: Record<string, MarketQuote> = {};
        for (const q of results) map[q.symbol] = q;
        setQuotes((prev) => ({ ...prev, ...map }));
      } catch { /* fail silently */ }
    };

    poll();
    const id = window.setInterval(poll, POLL_INTERVAL);
    return () => window.clearInterval(id);
  }, []);

  // Rebuilds when new assets are registered, traderStyle changes, or live calendar events load.
  // Reads quotes from latestQuotes ref (not state) to avoid re-triggering on every 15s poll.
  useEffect(() => {
    const assets = Array.from(trackedContextAssets.current.values());
    if (assets.length === 0) return;

    let cancelled = false;
    Promise.all(
      assets.map(async (asset) => {
        const quote = latestQuotes.current[normalizeSymbol(asset.symbol)];
        const relevant = calendarSource.filter((e) => isEventRelevant(asset.symbol, e));
        const ctx = await buildMarketContext({
          asset,
          quote,
          upcomingRelevantEvents: relevant,
          traderStyle: latestTraderStyle.current,
        });
        return [asset.symbol, ctx] as const;
      }),
    )
      .then((entries) => { if (!cancelled) setContextMap(Object.fromEntries(entries)); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [contextTrigger, calendarSource]); // quotes intentionally omitted — read from latestQuotes ref

  return (
    <MarketDataContext.Provider value={{ quotes, subscribeSymbols, contextMap, subscribeContextSymbols }}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData(): MarketDataContextValue {
  const ctx = useContext(MarketDataContext);
  if (!ctx) throw new Error("useMarketData must be used within MarketDataProvider");
  return ctx;
}
