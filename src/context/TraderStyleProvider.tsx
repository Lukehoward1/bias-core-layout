// src/context/TraderStyleProvider.tsx
// trader_style + custom_timeframes are persisted in Supabase profiles.
// Children are blocked (null) until the real value is loaded from the DB,
// preventing any consumer from briefly seeing the wrong default on mount.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTraderTimeframes,
  isCustom as isCustomPreset,
  isStrictlyDescending,
  PRESETS,
  type TraderTimeframes,
} from "@/services/traderTimeframes";

export type TraderStyle = "scalper" | "intraday" | "swing";

export const TRADER_STYLE_DEFAULT: TraderStyle = "intraday";

// Backward-compatible: existing consumers only use traderStyle + setTraderStyle.
export type TraderStyleContextValue = {
  traderStyle: TraderStyle;
  setTraderStyle: (style: TraderStyle) => void;
  resolvedTimeframes: TraderTimeframes;
  isCustomTimeframes: boolean;
  customTimeframes: Partial<TraderTimeframes> | null;
  /** Validates strict-descending order before writing. Returns false (no write) if invalid. */
  setCustomTimeframes: (custom: Partial<TraderTimeframes> | null) => boolean;
  resetToPreset: () => void;
};

const TraderStyleContext = createContext<TraderStyleContextValue | undefined>(undefined);

function isValidStyle(raw: unknown): raw is TraderStyle {
  return raw === "scalper" || raw === "intraday" || raw === "swing";
}

function isValidTfCode(v: unknown): boolean {
  return (
    v === "1min" || v === "5min" || v === "15min" ||
    v === "1h" || v === "4h" || v === "1day" || v === "1week"
  );
}

function parseCustomTimeframes(raw: unknown): Partial<TraderTimeframes> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const result: Partial<TraderTimeframes> = {};
  if (isValidTfCode(obj.bias))      result.bias      = obj.bias      as TraderTimeframes["bias"];
  if (isValidTfCode(obj.structure)) result.structure = obj.structure as TraderTimeframes["structure"];
  if (isValidTfCode(obj.entry))     result.entry     = obj.entry     as TraderTimeframes["entry"];
  return Object.keys(result).length > 0 ? result : null;
}

export function TraderStyleProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [traderStyle, setTraderStyleState] = useState<TraderStyle>(TRADER_STYLE_DEFAULT);
  const [customTimeframes, setCustomTimeframesState] = useState<Partial<TraderTimeframes> | null>(null);
  const [isStyleLoading, setIsStyleLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      setTraderStyleState(TRADER_STYLE_DEFAULT);
      setCustomTimeframesState(null);
      setIsStyleLoading(false);
      return;
    }

    // Try to load both columns together. If the custom_timeframes column is absent,
    // Supabase/PostgREST returns an error — catch it and fall back to trader_style alone
    // so existing behaviour is fully preserved.
    supabase
      .from("profiles")
      .select("trader_style, custom_timeframes")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Column missing or other schema error — fall back to trader_style alone.
          return supabase
            .from("profiles")
            .select("trader_style")
            .eq("id", user.id)
            .maybeSingle()
            .then(({ data: fallback }) => {
              if (fallback && isValidStyle((fallback as Record<string, unknown>).trader_style)) {
                setTraderStyleState((fallback as Record<string, unknown>).trader_style as TraderStyle);
              }
            });
        }
        const row = data as Record<string, unknown> | null;
        if (row && isValidStyle(row.trader_style)) {
          setTraderStyleState(row.trader_style as TraderStyle);
        }
        if (row) {
          setCustomTimeframesState(parseCustomTimeframes(row.custom_timeframes));
        }
      })
      .finally(() => {
        setIsStyleLoading(false);
      });
  }, [user, isAuthLoading]);

  // Unchanged from before: saves only trader_style, never touches custom_timeframes.
  const setTraderStyle = useCallback(
    (style: TraderStyle) => {
      setTraderStyleState(style);
      if (!user) return;
      supabase
        .from("profiles")
        .update({ trader_style: style })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) console.error("[TraderStyleProvider] Failed to save trader_style:", error.message);
        });
    },
    [user],
  );

  const setCustomTimeframes = useCallback(
    (custom: Partial<TraderTimeframes> | null): boolean => {
      if (custom !== null) {
        const merged = { ...PRESETS[traderStyle], ...custom };
        if (!isStrictlyDescending(merged)) return false;
      }
      setCustomTimeframesState(custom);
      if (!user) return true;
      // A failed save here must never affect trader_style saving (separate update call).
      supabase
        .from("profiles")
        .update({ custom_timeframes: custom })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) console.error("[TraderStyleProvider] Failed to save custom_timeframes:", error.message);
        });
      return true;
    },
    [user, traderStyle],
  );

  const resetToPreset = useCallback(() => {
    setCustomTimeframes(null);
  }, [setCustomTimeframes]);

  const resolvedTimeframes = useMemo(
    () => getTraderTimeframes(traderStyle, customTimeframes),
    [traderStyle, customTimeframes],
  );

  const isCustomTimeframes = useMemo(
    () => isCustomPreset(traderStyle, resolvedTimeframes),
    [traderStyle, resolvedTimeframes],
  );

  const value = useMemo<TraderStyleContextValue>(
    () => ({
      traderStyle,
      setTraderStyle,
      resolvedTimeframes,
      isCustomTimeframes,
      customTimeframes,
      setCustomTimeframes,
      resetToPreset,
    }),
    [traderStyle, setTraderStyle, resolvedTimeframes, isCustomTimeframes, customTimeframes, setCustomTimeframes, resetToPreset],
  );

  if (isAuthLoading || isStyleLoading) return null;

  return <TraderStyleContext.Provider value={value}>{children}</TraderStyleContext.Provider>;
}

export function useTraderStyle(): TraderStyleContextValue {
  const ctx = useContext(TraderStyleContext);
  if (!ctx) throw new Error("useTraderStyle must be used inside TraderStyleProvider");
  return ctx;
}
