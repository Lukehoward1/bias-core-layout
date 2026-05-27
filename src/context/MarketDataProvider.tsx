import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { getQuotes, type MarketQuote } from "@/services/marketData";

type MarketDataContextValue = {
  quotes: Record<string, MarketQuote>;
  subscribeSymbols: (symbols: string[]) => void;
};

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

const POLL_INTERVAL = 15000;

export function MarketDataProvider({ children }: { children: React.ReactNode }) {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const trackedSymbols = useRef<Set<string>>(new Set());

  const subscribeSymbols = (symbols: string[]) => {
    for (const s of symbols) {
      trackedSymbols.current.add(s.toUpperCase().replace(/[/ ]/g, ""));
    }
  };

  useEffect(() => {
    const poll = async () => {
      const syms = Array.from(trackedSymbols.current);
      if (syms.length === 0) return;

      try {
        const results = await getQuotes(syms);
        const map: Record<string, MarketQuote> = {};
        for (const q of results) map[q.symbol] = q;
        setQuotes((prev) => ({ ...prev, ...map }));
      } catch {
        // fail silently
      }
    };

    poll();
    const id = window.setInterval(poll, POLL_INTERVAL);
    return () => window.clearInterval(id);
  }, []);

  return (
    <MarketDataContext.Provider value={{ quotes, subscribeSymbols }}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData(): MarketDataContextValue {
  const ctx = useContext(MarketDataContext);
  if (!ctx) throw new Error("useMarketData must be used within MarketDataProvider");
  return ctx;
}
