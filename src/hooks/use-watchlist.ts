// src/hooks/use-watchlist.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { assetsData, getAssetBySymbol, getCurrenciesFromWatchlist, type Asset } from "@/data/assets";
import { TRADER_STYLE_EVENT } from "@/context/TraderStyleProvider";

const WATCHLIST_STORAGE_KEY = "watchlist";
const WATCHLIST_CHANGE_EVENT = "watchlist-change";

function dispatchWatchlistChange(watchlist: string[]) {
  window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGE_EVENT, { detail: watchlist }));
}

/**
 * Shared watchlist hook - SINGLE SOURCE OF TRUTH for watchlist state.
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Used only to force recompute of derived data when trader style changes
  const [styleVersion, setStyleVersion] = useState(0);

  // Same-tab watchlist sync
  useEffect(() => {
    const handleWatchlistChange = (event: Event) => {
      const e = event as CustomEvent<string[]>;
      if (Array.isArray(e.detail)) setWatchlist(e.detail);
    };

    window.addEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange);
    return () => window.removeEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange);
  }, []);

  // Re-render derived values when trader style changes
  useEffect(() => {
    const bump = () => setStyleVersion((v) => v + 1);

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
    // styleVersion forces refresh when trader style changes
    return watchlist.map((symbol) => getAssetBySymbol(symbol)).filter((asset): asset is Asset => asset !== undefined);
  }, [watchlist, styleVersion]);

  const watchlistCurrencies = useMemo(() => {
    // styleVersion forces refresh when trader style changes
    return getCurrenciesFromWatchlist(watchlist);
  }, [watchlist, styleVersion]);

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

/**
 * Asset access helper (no hooks inside on purpose).
 */
export function useAssets() {
  return {
    assets: assetsData,
    getAssetBySymbol,
  };
}
