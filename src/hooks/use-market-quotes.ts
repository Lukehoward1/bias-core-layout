import { useEffect, useMemo } from "react";
import { normalizeSymbol, type MarketQuote } from "@/services/marketData";
import { useMarketData } from "@/context/MarketDataProvider";

export function useMarketQuote(symbol: string): MarketQuote | null {
  const { quotes, subscribeSymbols } = useMarketData();

  const norm = symbol ? normalizeSymbol(symbol) : "";

  useEffect(() => {
    if (!norm) return;
    subscribeSymbols([norm]);
  }, [norm, subscribeSymbols]);

  return norm ? (quotes[norm] ?? null) : null;
}

export function useMarketQuotes(symbols: string[]): Record<string, MarketQuote> {
  const { quotes, subscribeSymbols } = useMarketData();

  const normalizedSymbols = useMemo(() => symbols.map(normalizeSymbol).filter(Boolean), [symbols]);

  const key = normalizedSymbols.sort().join(",");

  useEffect(() => {
    if (normalizedSymbols.length === 0) return;
    subscribeSymbols(normalizedSymbols);
  }, [key, subscribeSymbols]);

  const result: Record<string, MarketQuote> = {};

  for (const sym of normalizedSymbols) {
    if (quotes[sym]) {
      result[sym] = quotes[sym];
    }
  }

  return result;
}
