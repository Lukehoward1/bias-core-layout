// src/hooks/use-trader-style.ts
import { useMemo } from "react";
import * as TraderStyleModule from "@/context/TraderStyleProvider";

export type TraderStyle = "scalper" | "intraday" | "swing";
export type BiasTimeframe = "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

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

export function useTraderBiasMode() {
  const useTraderStyle = getUseTraderStyleHook();
  const { traderStyle, setTraderStyle } = useTraderStyle();

  const biasTimeframes = useMemo(() => getBiasTimeframesForStyle(traderStyle), [traderStyle]);

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
  };
}
