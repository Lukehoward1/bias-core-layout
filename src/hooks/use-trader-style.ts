import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type TraderStyle = "scalper" | "intraday" | "swing";

type TraderStyleContextValue = {
  traderStyle: TraderStyle;
  setTraderStyle: (style: TraderStyle) => void;
};

const TraderStyleContext = createContext<TraderStyleContextValue | undefined>(undefined);

const STORAGE_KEY = "traderStyle";
const EVENT_NAME = "traderStyleUpdated";

function isTraderStyle(v: unknown): v is TraderStyle {
  return v === "scalper" || v === "intraday" || v === "swing";
}

function readStoredStyle(): TraderStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTraderStyle(raw)) return raw;
    return "intraday"; // sensible default
  } catch {
    return "intraday";
  }
}

function writeStoredStyle(style: TraderStyle) {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
}

function broadcastStyleChanged() {
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function TraderStyleProvider({ children }: { children: React.ReactNode }) {
  const [traderStyle, _setTraderStyle] = useState<TraderStyle>(() => readStoredStyle());

  // Keep in sync with external changes (other tabs OR other components writing to storage)
  useEffect(() => {
    const sync = () => {
      const next = readStoredStyle();
      _setTraderStyle(next);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, sync);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, sync);
    };
  }, []);

  const setTraderStyle = useCallback((style: TraderStyle) => {
    _setTraderStyle(style);
    writeStoredStyle(style);
    broadcastStyleChanged();
  }, []);

  const value = useMemo(() => ({ traderStyle, setTraderStyle }), [traderStyle, setTraderStyle]);

  return <TraderStyleContext.Provider value={value}>{children}</TraderStyleContext.Provider>;
}

export function useTraderStyle(): TraderStyleContextValue {
  const ctx = useContext(TraderStyleContext);
  if (!ctx) {
    throw new Error("useTraderStyle must be used within a TraderStyleProvider");
  }
  return ctx;
}

// Optional exports in case other files want the storage/event names consistently
export const TRADER_STYLE_STORAGE_KEY = STORAGE_KEY;
export const TRADER_STYLE_EVENT_NAME = EVENT_NAME;
