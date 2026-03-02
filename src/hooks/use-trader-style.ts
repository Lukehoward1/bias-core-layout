// src/hooks/use-trader-style.ts
import { useMemo } from "react";
import { useTraderStyle, type TraderStyle } from "@/context/TraderStyleProvider";

export type BiasTimeframe = "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

export function getBiasTimeframesForStyle(style: TraderStyle): BiasTimeframe[] {
  // ✅ Locked mapping:
  // Scalper: 5m / 15m / 1h (user confirmed)
  // Intraday: 15m / 1h / 4h
  // Swing: 4h / 1d / 1w
  if (style === "scalper") return ["5m", "15m", "1h"];
  if (style === "intraday") return ["15m", "1h", "4h"];
  return ["4h", "1d", "1w"];
}

export function useTraderBiasMode() {
  const { traderStyle, setTraderStyle } = useTraderStyle();

  const biasTimeframes = useMemo(() => getBiasTimeframesForStyle(traderStyle), [traderStyle]);

  const traderStyleLabel = useMemo(() => {
    if (traderStyle === "scalper") return "Scalper";
    if (traderStyle === "intraday") return "Intraday";
    return "Swing";
  }, [traderStyle]);

  return {
    traderStyle,
    traderStyleLabel,
    setTraderStyle,
    biasTimeframes,
  };
}
