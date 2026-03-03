import { useState, useEffect, useCallback, useMemo } from "react";
import { assetsData, getAssetBySymbol, getCurrenciesFromWatchlist, type Asset } from "@/data/assets";
import { TRADER_STYLE_EVENT } from "@/context/TraderStyleProvider";

const WATCHLIST_STORAGE_KEY = "watchlist";

// Custom event for cross-component watchlist sync
const WATCHLIST_CHANGE_EVENT = "watchlist-change";

function dispatchWatchlistChange(watchlist: string[]) {
  window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGE_EVENT, { detail: watchlist }));
}

/**
 * Shared watchlist hook - THE SINGLE SOURCE OF TRUTH for watchlist state
 * Adding/removing assets here updates the watchlist everywhere in the app
 */
export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ✅ Style tick: forces recalculation when trader style changes
  const [styleTick, setStyleTick] = useState(0);

  // Listen for changes from other components
  useEffect(() => {
    const handleWatchlistChange = (event: CustomEvent<string[]>) => {
      setWatchlist(event.detail);
    };

    window.addEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange as EventListener);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange as EventListener);
    };
  }, []);

  // ✅ Re-render when trader style changes (same tab) or storage updates (other tab)
  useEffect(() => {
    const bump = () => setStyleTick((t) => t + 1);

    window.addEventListener(TRADER_STYLE_EVENT, bump);
    window.addEventListener("storage", bump);

    return () => {
      window.removeEventListener(TRADER_STYLE_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  // Persist to localStorage and broadcast changes
  const updateWatchlist = useCallback((newWatchlist: string[]) => {
    setWatchlist(newWatchlist);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(newWatchlist));
    dispatchWatchlistChange(newWatchlist);
  }, []);

  // Add an asset to watchlist
  const addToWatchlist = useCallback(
    (symbol: string) => {
      if (!watchlist.includes(symbol)) {
        const newWatchlist = [...watchlist, symbol];
        updateWatchlist(newWatchlist);
      }
    },
    [watchlist, updateWatchlist],
  );

  // Remove an asset from watchlist
  const removeFromWatchlist = useCallback(
    (symbol: string) => {
      const newWatchlist = watchlist.filter((s) => s !== symbol);
      updateWatchlist(newWatchlist);
    },
    [watchlist, updateWatchlist],
  );

  // Toggle an asset's watchlist status
  const toggleWatchlist = useCallback(
    (symbol: string) => {
      if (watchlist.includes(symbol)) {
        removeFromWatchlist(symbol);
      } else {
        addToWatchlist(symbol);
      }
    },
    [watchlist, addToWatchlist, removeFromWatchlist],
  );

  // Check if an asset is in the watchlist
  const isInWatchlist = useCallback(
    (symbol: string) => {
      return watchlist.includes(symbol);
    },
    [watchlist],
  );

  // Get full asset data for watchlisted items
  const watchlistAssets = useMemo((): Asset[] => {
    // styleTick is intentionally included so bias/timeframes refresh when style changes
    void styleTick;

    return watchlist.map((symbol) => getAssetBySymbol(symbol)).filter((asset): asset is Asset => asset !== undefined);
  }, [watchlist, styleTick]);

  // Get currencies derived from watchlist for alert relevance
  const watchlistCurrencies = useMemo(() => {
    // keep consistent refresh behaviour
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

/**
 * Get all assets from the shared data store
 */
export function useAssets() {
  // ✅ Style tick: forces components using useAssets() to re-render on style changes
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

  // styleTick is intentionally unused except to trigger re-render
  void styleTick;

  return {
    assets: assetsData,
    getAssetBySymbol,
  };
}
