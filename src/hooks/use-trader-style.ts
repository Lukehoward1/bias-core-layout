// src/hooks/use-trader-style.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import * as TraderStyleModule from "@/context/TraderStyleProvider";

export type TraderStyle = "scalper" | "intraday" | "swing";
export type BiasTimeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

const CUSTOM_TF_KEY = "custom-bias-timeframes";

function getUseTraderStyleHook(): () => { traderStyle: TraderStyle; setTraderStyle: (s: TraderStyle) => void } {
  const hook = (TraderStyleModule as any).useTraderStyle;
  if (typeof hook !== "function") {
    throw new Error(
      "TraderStyleProvider export mismatch: expected `useTraderStyle` to be exported from '@/context/TraderStyleProvider'.",
    );
  }
  return hook;
}

/**
 * Locked mapping (authoritative):
 * Scalper: 5m / 15m / 1h
 * Intraday: 15m / 1h / 4h
 * Swing: 4h / 1d / 1w
 */
export function getBiasTimeframesForStyle(style: TraderStyle): BiasTimeframe[] {
  if (style === "scalper") return ["5m", "15m", "1h"];
  if (style === "intraday") return ["15m", "1h", "4h"];
  return ["4h", "1d", "1w"];
}

function readCustomTimeframes(): BiasTimeframe[] | null {
  try {
    const raw = localStorage.getItem(CUSTOM_TF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? (parsed as BiasTimeframe[]) : null;
  } catch {
    return null;
  }
}

export function useCustomBiasTimeframes() {
  const [customTimeframes, setCustomTimeframesState] = useState<BiasTimeframe[] | null>(readCustomTimeframes);

  const setCustomTimeframes = useCallback((tfs: BiasTimeframe[]) => {
    localStorage.setItem(CUSTOM_TF_KEY, JSON.stringify(tfs));
    setCustomTimeframesState(tfs);
  }, []);

  const clearCustomTimeframes = useCallback(() => {
    localStorage.removeItem(CUSTOM_TF_KEY);
    setCustomTimeframesState(null);
  }, []);

  return { customTimeframes, setCustomTimeframes, clearCustomTimeframes };
}

export function useTraderBiasMode() {
  const useTraderStyle = getUseTraderStyleHook();
  const { traderStyle, setTraderStyle } = useTraderStyle();
  const { customTimeframes, setCustomTimeframes, clearCustomTimeframes } = useCustomBiasTimeframes();

  const biasTimeframes = useMemo(
    () =>
      customTimeframes && customTimeframes.length > 0
        ? customTimeframes
        : getBiasTimeframesForStyle(traderStyle),
    [traderStyle, customTimeframes],
  );

  const traderStyleLabel = useMemo(() => {
    if (traderStyle === "scalper") return "Scalper";
    if (traderStyle === "intraday") return "Intraday";
    return "Swing";
  }, [traderStyle]);

  return {
    traderStyle,
    setTraderStyle,
    traderStyleLabel,
    biasTimeframes,
    customTimeframes,
    setCustomTimeframes,
    clearCustomTimeframes,
  };
}
