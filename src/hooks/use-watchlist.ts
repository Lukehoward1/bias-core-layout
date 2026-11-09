// src/hooks/use-watchlist.ts
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { assetsData, getAssetBySymbol, getCurrenciesFromWatchlist, type Asset } from "@/data/assets";
import { TRADE_INSTRUMENTS } from "@/data/tradeInstruments";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const WATCHLIST_STORAGE_KEY = "watchlist";
const WATCHLIST_CHANGE_EVENT = "watchlist-change";
const WATCHLIST_DEFAULTS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"] as const;

const VALID_SYMBOLS = new Set(TRADE_INSTRUMENTS.map((i) => i.symbol));

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

// Module-level warn-once guard so noisy offline environments don't spam.
let supabaseWarnedOnce = false;
function warnSupabase(error: unknown) {
  if (!supabaseWarnedOnce) {
    supabaseWarnedOnce = true;
    console.warn("[watchlist] Supabase sync failed, falling back to localStorage:", error);
  }
}

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

/**
 * Pure migration-decision function. No side effects — directly testable.
 *
 * Rules:
 *   remote non-empty → use remote (Supabase is source of truth)
 *   remote empty + local non-empty → use local, upload it, then clear local
 *   both empty → seed from defaults, upload defaults
 */
export function resolveWatchlistMigration(
  remoteSymbols: string[],
  localSymbols: string[],
  defaults: string[],
): { list: string[]; shouldUpload: boolean; shouldClearLocal: boolean } {
  const norm = (s: string) => s.trim().toUpperCase();
  const unique = (arr: string[]) => Array.from(new Set(arr.map(norm).filter(Boolean)));

  const remote = unique(remoteSymbols);
  const local = unique(localSymbols);
  const defs = unique(defaults);

  if (remote.length > 0) {
    return { list: remote, shouldUpload: false, shouldClearLocal: false };
  }
  if (local.length > 0) {
    return { list: local, shouldUpload: true, shouldClearLocal: true };
  }
  return { list: defs, shouldUpload: true, shouldClearLocal: false };
}

export function useWatchlist() {
  const { user } = useAuth();
  // Stable refs so callbacks never become stale on auth/state changes.
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [watchlist, setWatchlist] = useState<string[]>(() => readStoredWatchlist());
  const watchlistRef = useRef(watchlist);
  useEffect(() => { watchlistRef.current = watchlist; }, [watchlist]);

  // Load from Supabase on login; apply migration logic (upload localStorage once, then clear).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("watchlist")
          .select("symbol")
          .eq("user_id", user.id);

        if (cancelled) return;

        if (error) {
          warnSupabase(error);
          return; // keep localStorage state
        }

        const remoteSymbols = (data ?? [])
          .map((r: { symbol: string }) => normalizeSymbol(r.symbol))
          .filter((s) => VALID_SYMBOLS.has(s));

        const localSymbols = readStoredWatchlist().filter((s) => VALID_SYMBOLS.has(s));

        const { list, shouldUpload, shouldClearLocal } = resolveWatchlistMigration(
          remoteSymbols,
          localSymbols,
          Array.from(WATCHLIST_DEFAULTS),
        );

        setWatchlist(list);
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
        dispatchWatchlistChange(list);

        if (shouldUpload && list.length > 0) {
          const { error: insertErr } = await supabase
            .from("watchlist")
            .insert(list.map((symbol) => ({ user_id: user.id, symbol })));
          if (insertErr) {
            warnSupabase(insertErr);
          } else if (shouldClearLocal) {
            // Only clear after confirmed upload so a reload before upload doesn't lose data.
            localStorage.removeItem(WATCHLIST_STORAGE_KEY);
          }
        }
      } catch (err) {
        if (!cancelled) warnSupabase(err);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistWatchlist = useCallback((nextWatchlist: string[]) => {
    const cleaned = Array.from(
      new Set(
        nextWatchlist
          .map(normalizeSymbol)
          .filter((s) => s && VALID_SYMBOLS.has(s)),
      ),
    );
    setWatchlist(cleaned);
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(cleaned));
    dispatchWatchlistChange(cleaned);

    const currentUser = userRef.current;
    if (currentUser) {
      (async () => {
        try {
          // Full resync: delete all then re-insert.
          await supabase.from("watchlist").delete().eq("user_id", currentUser.id);
          if (cleaned.length > 0) {
            const { error } = await supabase
              .from("watchlist")
              .insert(cleaned.map((symbol) => ({ user_id: currentUser.id, symbol })));
            if (error) warnSupabase(error);
          }
        } catch (err) {
          warnSupabase(err);
        }
      })();
    }
  }, []);

  useEffect(() => {
    const handleWatchlistChange = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      const nextWatchlist = Array.isArray(customEvent.detail) ? customEvent.detail : [];
      setWatchlist(
        Array.from(
          new Set(
            nextWatchlist
              .filter((value): value is string => typeof value === "string")
              .map(normalizeSymbol),
          ),
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
    if (!normalized || !VALID_SYMBOLS.has(normalized)) return;

    setWatchlist((prev) => {
      if (prev.includes(normalized)) return prev;
      const next = [...prev, normalized];
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      dispatchWatchlistChange(next);
      return next;
    });

    const currentUser = userRef.current;
    if (currentUser) {
      supabase
        .from("watchlist")
        .insert({ user_id: currentUser.id, symbol: normalized })
        .then(({ error }) => { if (error) warnSupabase(error); })
        .catch(warnSupabase);
    }
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

    const currentUser = userRef.current;
    if (currentUser) {
      supabase
        .from("watchlist")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("symbol", normalized)
        .then(({ error }) => { if (error) warnSupabase(error); })
        .catch(warnSupabase);
    }
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    if (!normalized || !VALID_SYMBOLS.has(normalized)) return;

    const isCurrentlyIn = watchlistRef.current.includes(normalized);

    setWatchlist((prev) => {
      const exists = prev.includes(normalized);
      const next = exists
        ? prev.filter((item) => item !== normalized)
        : [...prev, normalized];
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      dispatchWatchlistChange(next);
      return next;
    });

    const currentUser = userRef.current;
    if (currentUser) {
      if (isCurrentlyIn) {
        supabase
          .from("watchlist")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("symbol", normalized)
          .then(({ error }) => { if (error) warnSupabase(error); })
          .catch(warnSupabase);
      } else {
        supabase
          .from("watchlist")
          .insert({ user_id: currentUser.id, symbol: normalized })
          .then(({ error }) => { if (error) warnSupabase(error); })
          .catch(warnSupabase);
      }
    }
  }, []);

  const isInWatchlist = useCallback(
    (symbol: string) => {
      const normalized = normalizeSymbol(symbol);
      return watchlist.includes(normalized);
    },
    [watchlist],
  );

  const watchlistAssets = useMemo((): Asset[] => {
    return watchlist
      .map((symbol) => getAssetBySymbol(symbol))
      .filter((asset): asset is Asset => Boolean(asset));
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
