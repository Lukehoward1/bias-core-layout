// src/context/TraderStyleProvider.tsx

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type TraderStyle = "scalper" | "intraday" | "swing";

export const TRADER_STYLE_STORAGE_KEY = "traderStyle:v1";

export const TRADER_STYLE_EVENT = "traderStyleUpdated";

export const TRADER_STYLE_DEFAULT: TraderStyle = "intraday";

type TraderStyleContextValue = {
  traderStyle: TraderStyle;
  setTraderStyle: (style: TraderStyle) => void;
};

const TraderStyleContext = createContext<TraderStyleContextValue | null>(null);

function safeReadStyle(): TraderStyle {
  const raw = localStorage.getItem(TRADER_STYLE_STORAGE_KEY);
  if (raw === "scalper" || raw === "intraday" || raw === "swing") return raw;
  return TRADER_STYLE_DEFAULT;
}

export function TraderStyleProvider({ children }: { children: React.ReactNode }) {
  const [traderStyle, setTraderStyleState] = useState<TraderStyle>(() => safeReadStyle());

  const setTraderStyle = useCallback((style: TraderStyle) => {
    localStorage.setItem(TRADER_STYLE_STORAGE_KEY, style);
    setTraderStyleState(style);
    // Notify same-tab listeners
    window.dispatchEvent(new Event(TRADER_STYLE_EVENT));
  }, []);

  useEffect(() => {
    const sync = () => setTraderStyleState(safeReadStyle());
    // Other tabs
    window.addEventListener("storage", sync);
    // Same tab
    window.addEventListener(TRADER_STYLE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(TRADER_STYLE_EVENT, sync);
    };
  }, []);

  const value = useMemo(() => ({ traderStyle, setTraderStyle }), [traderStyle, setTraderStyle]);

  return <TraderStyleContext.Provider value={value}>{children}</TraderStyleContext.Provider>;
}

export function useTraderStyle() {
  const ctx = useContext(TraderStyleContext);
  if (!ctx) {
    throw new Error("useTraderStyle must be used inside TraderStyleProvider");
  }
  return ctx;
}
