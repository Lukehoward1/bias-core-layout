// src/hooks/use-watchlist.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { assetsData, getAssetBySymbol, getCurrenciesFromWatchlist, type Asset } from "@/data/assets";

const WATCHLIST_STORAGE_KEY = "watchlist";
const WATCHLIST_CHANGE_EVENT = "watchlist-change";

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

const readStoredWatchlist = (): string[] => {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return Array.from(
      new Set(
        parsed
          .filter((value): value is string => typeof value === "string")
          .map(normalizeSymbol)
          .filter(Boolean),
      ),
    );
  } catch {
    return [];
  }
};

function dispatchWatchlistChange(watchlist: string[]) {
  window.dispatchEvent(
    new CustomEvent<string[]>(WATCHLIST_CHANGE_EVENT, {
      detail: watchlist,
    }),
  );
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => readStoredWatchlist());

  const persistWatchlist = useCallback((nextWatchlist: string[]) => {
    const cleaned = Array.from(new Set(nextWatchlist.map(normalizeSymbol).filter(Boolean)));
    setWatchlist(cleaned);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(cleaned));
    dispatchWatchlistChange(cleaned);
  }, []);

  useEffect(() => {
    const handleWatchlistChange = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      const nextWatchlist = Array.isArray(customEvent.detail) ? customEvent.detail : [];
      setWatchlist(
        Array.from(
          new Set(nextWatchlist.filter((value): value is string => typeof value === "string").map(normalizeSymbol)),
        ),
      );
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WATCHLIST_STORAGE_KEY) return;
      setWatchlist(readStoredWatchlist());
    };

    window.addEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(WATCHLIST_CHANGE_EVENT, handleWatchlistChange as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const addToWatchlist = useCallback((symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    setWatchlist((prev) => {
      if (prev.includes(normalized)) return prev;

      const next = [...prev, normalized];
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      dispatchWatchlistChange(next);
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    setWatchlist((prev) => {
      const next = prev.filter((item) => item !== normalized);
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      dispatchWatchlistChange(next);
      return next;
    });
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) return;

    setWatchlist((prev) => {
      const exists = prev.includes(normalized);
      const next = exists ? prev.filter((item) => item !== normalized) : [...prev, normalized];

      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      dispatchWatchlistChange(next);
      return next;
    });
  }, []);

  const isInWatchlist = useCallback(
    (symbol: string) => {
      const normalized = normalizeSymbol(symbol);
      return watchlist.includes(normalized);
    },
    [watchlist],
  );

  const watchlistAssets = useMemo((): Asset[] => {
    return watchlist.map((symbol) => getAssetBySymbol(symbol)).filter((asset): asset is Asset => Boolean(asset));
  }, [watchlist]);

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
    setWatchlist: persistWatchlist,
  };
}

export function useAssets() {
  const assets = useMemo(() => assetsData, []);

  const getAsset = useCallback(
    (symbol: string) => getAssetBySymbol(normalizeSymbol(symbol)),
    [],
  );

  return {
    assets,
    getAssetBySymbol: getAsset,
  };
}
