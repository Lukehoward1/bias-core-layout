// src/hooks/use-watchlist.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { assetsData, getAssetBySymbol, getCurrenciesFromWatchlist, type Asset } from "@/data/assets";

const WATCHLIST_STORAGE_KEY = "watchlist";
const WATCHLIST_CHANGE_EVENT = "watchlist-change";

// ✅ keep these local (no importing provider files)
const TRADER_STYLE_EVENT = "traderStyleUpdated";

function dispatchWatchlistChange(watchlist: string[]) {
  window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGE_EVENT, { detail: watchlist }));
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ✅ tick to force re-render on trader style changes
  const [styleTick, setStyleTick] = useState(0);

  useEffect(() => {
    const handleWatchlistChange = (event: CustomEvent<string[]>) => {
      setWatchlist(event.detail);
    };

    window.addEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange as EventListener);
    return () => window.removeEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange as EventListener);
  }, []);

  // ✅ re-render on style changes (same tab) + storage (other tab)
  useEffect(() => {
    const bump = () => setStyleTick((t) => t + 1);

    window.addEventListener(TRADER_STYLE_EVENT, bump);
    window.addEventListener("storage", bump);

    return () => {
      window.removeEventListener(TRADER_STYLE_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const updateWatchlist = useCallback((newWatchlist: string[]) => {
    setWatchlist(newWatchlist);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(newWatchlist));
    dispatchWatchlistChange(newWatchlist);
  }, []);

  const addToWatchlist = useCallback(
    (symbol: string) => {
      if (!watchlist.includes(symbol)) updateWatchlist([...watchlist, symbol]);
    },
    [watchlist, updateWatchlist],
  );

  const removeFromWatchlist = useCallback(
    (symbol: string) => {
      updateWatchlist(watchlist.filter((s) => s !== symbol));
    },
    [watchlist, updateWatchlist],
  );

  const toggleWatchlist = useCallback(
    (symbol: string) => {
      if (watchlist.includes(symbol)) removeFromWatchlist(symbol);
      else addToWatchlist(symbol);
    },
    [watchlist, addToWatchlist, removeFromWatchlist],
  );

  const isInWatchlist = useCallback((symbol: string) => watchlist.includes(symbol), [watchlist]);

  const watchlistAssets = useMemo((): Asset[] => {
    void styleTick; // force refresh of bias/timeframes
    return watchlist.map((symbol) => getAssetBySymbol(symbol)).filter((a): a is Asset => !!a);
  }, [watchlist, styleTick]);

  const watchlistCurrencies = useMemo(() => {
    void styleTick;
    return getCurrenciesFromWatchlist(watchlist);
  }, [watchlist, styleTick]);

  return {
    watchlist,
    watchlistAssets,
    watchlistCurrencies,
    addToWatchlist,
    removeFromWatchlist,
    toggleWatchlist,
    isInWatchlist,
  };
}

export function useAssets() {
  // ✅ tick to force any page using getAssetBySymbol() to re-render when style changes
  const [styleTick, setStyleTick] = useState(0);

  useEffect(() => {
    const bump = () => setStyleTick((t) => t + 1);

    window.addEventListener(TRADER_STYLE_EVENT, bump);
    window.addEventListener("storage", bump);

    return () => {
      window.removeEventListener(TRADER_STYLE_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  void styleTick;

  return {
    assets: assetsData,
    getAssetBySymbol,
  };
}
