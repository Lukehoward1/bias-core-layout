import { useEffect, useState } from "react";
import {
  getQuote,
  getQuotes,
  normalizeSymbol,
  type MarketQuote,
} from "@/services/marketData";

const POLL_INTERVAL = 3000;

export function useMarketQuote(symbol: string): MarketQuote | null {
  const [quote, setQuote] = useState<MarketQuote | null>(null);

  useEffect(() => {
    const norm = symbol ? normalizeSymbol(symbol) : "";
    if (!norm) {
      setQuote(null);
      return;
    }

    let mounted = true;

    const fetch = async () => {
      try {
        const q = await getQuote(norm);
        if (mounted) setQuote(q);
      } catch {
        if (mounted) setQuote(null);
      }
    };

    fetch();
    const id = window.setInterval(fetch, POLL_INTERVAL);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [symbol]);

  return quote;
}

export function useMarketQuotes(symbols: string[]): Record<string, MarketQuote> {
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});

  const key = symbols.map(normalizeSymbol).sort().join(",");

  useEffect(() => {
    const normed = key ? key.split(",").filter(Boolean) : [];
    if (normed.length === 0) {
      setQuotes({});
      return;
    }

    let mounted = true;

    const fetch = async () => {
      try {
        const results = await getQuotes(normed);
        if (!mounted) return;
        const map: Record<string, MarketQuote> = {};
        for (const q of results) map[q.symbol] = q;
        setQuotes(map);
      } catch {
        if (mounted) setQuotes({});
      }
    };

    fetch();
    const id = window.setInterval(fetch, POLL_INTERVAL);

    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [key]);

  return quotes;
}
