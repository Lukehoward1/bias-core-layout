// src/context/TraderStyleProvider.tsx
// trader_style is now persisted in Supabase profiles.trader_style.
// Children are blocked (null) until the real value is loaded from the DB,
// preventing any consumer from briefly seeing the wrong default on mount.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export type TraderStyle = "scalper" | "intraday" | "swing";

export const TRADER_STYLE_DEFAULT: TraderStyle = "intraday";

export type TraderStyleContextValue = {
  traderStyle: TraderStyle;
  setTraderStyle: (style: TraderStyle) => void;
};

const TraderStyleContext = createContext<TraderStyleContextValue | undefined>(undefined);

function isValidStyle(raw: unknown): raw is TraderStyle {
  return raw === "scalper" || raw === "intraday" || raw === "swing";
}

export function TraderStyleProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [traderStyle, setTraderStyleState] = useState<TraderStyle>(TRADER_STYLE_DEFAULT);
  const [isStyleLoading, setIsStyleLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user) {
      setTraderStyleState(TRADER_STYLE_DEFAULT);
      setIsStyleLoading(false);
      return;
    }

    supabase
      .from("profiles")
      .select("trader_style")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && isValidStyle(data.trader_style)) {
          setTraderStyleState(data.trader_style);
        }
      })
      .finally(() => {
        setIsStyleLoading(false);
      });
  }, [user, isAuthLoading]);

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

  const value = useMemo<TraderStyleContextValue>(
    () => ({ traderStyle, setTraderStyle }),
    [traderStyle, setTraderStyle],
  );

  if (isAuthLoading || isStyleLoading) return null;

  return <TraderStyleContext.Provider value={value}>{children}</TraderStyleContext.Provider>;
}

export function useTraderStyle(): TraderStyleContextValue {
  const ctx = useContext(TraderStyleContext);
  if (!ctx) throw new Error("useTraderStyle must be used inside TraderStyleProvider");
  return ctx;
}
