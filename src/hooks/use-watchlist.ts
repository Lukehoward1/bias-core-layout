import { useState, useEffect, useCallback, useMemo } from 'react';
import { assetsData, getAssetBySymbol, getCurrenciesFromWatchlist, type Asset } from '@/data/assets';

const WATCHLIST_STORAGE_KEY = 'watchlist';

// Custom event for cross-component watchlist sync
const WATCHLIST_CHANGE_EVENT = 'watchlist-change';

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

  // Persist to localStorage and broadcast changes
  const updateWatchlist = useCallback((newWatchlist: string[]) => {
    setWatchlist(newWatchlist);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(newWatchlist));
    dispatchWatchlistChange(newWatchlist);
  }, []);

  // Add an asset to watchlist
  const addToWatchlist = useCallback((symbol: string) => {
    if (!watchlist.includes(symbol)) {
      const newWatchlist = [...watchlist, symbol];
      updateWatchlist(newWatchlist);
    }
  }, [watchlist, updateWatchlist]);

  // Remove an asset from watchlist
  const removeFromWatchlist = useCallback((symbol: string) => {
    const newWatchlist = watchlist.filter(s => s !== symbol);
    updateWatchlist(newWatchlist);
  }, [watchlist, updateWatchlist]);

  // Toggle an asset's watchlist status
  const toggleWatchlist = useCallback((symbol: string) => {
    if (watchlist.includes(symbol)) {
      removeFromWatchlist(symbol);
    } else {
      addToWatchlist(symbol);
    }
  }, [watchlist, addToWatchlist, removeFromWatchlist]);

  // Check if an asset is in the watchlist
  const isInWatchlist = useCallback((symbol: string) => {
    return watchlist.includes(symbol);
  }, [watchlist]);

  // Get full asset data for watchlisted items
  const watchlistAssets = useMemo((): Asset[] => {
    return watchlist
      .map(symbol => getAssetBySymbol(symbol))
      .filter((asset): asset is Asset => asset !== undefined);
  }, [watchlist]);

  // Get currencies derived from watchlist for alert relevance
  const watchlistCurrencies = useMemo(() => {
    return getCurrenciesFromWatchlist(watchlist);
  }, [watchlist]);

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
  return {
    assets: assetsData,
    getAssetBySymbol,
  };
}
