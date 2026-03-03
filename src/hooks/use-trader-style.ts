// src/hooks/use-trader-style.ts
import { useMemo } from "react";
import { useTraderStyle, type TraderStyle } from "@/context/TraderStyleProvider";

export type BiasTimeframe = "5m" | "15m" | "1h" | "4h" | "1d" | "1w";

/**
 * Locked mapping (authoritative):
 * Scalper: 5m / 15m / 1h
 * Intraday: 15m / 1h / 4h
 * Swing: 4h / 1d / 1w
 */
export function getBiasTimeframesForStyle(style: TraderStyle): BiasTimeframe[] {
  switch (style) {
    case "scalper":
      return ["5m", "15m", "1h"];
    case "intraday":
      return ["15m", "1h", "4h"];
    case "swing":
    default:
      return ["4h", "1d", "1w"];
  }
}

export function useTraderBiasMode() {
  // ✅ MUST match the import name exactly
  const { traderStyle, setTraderStyle } = useTraderStyle();

  const biasTimeframes = useMemo(() => getBiasTimeframesForStyle(traderStyle), [traderStyle]);

  const traderStyleLabel = useMemo(() => {
    switch (traderStyle) {
      case "scalper":
        return "Scalper";
      case "intraday":
        return "Intraday";
      case "swing":
      default:
        return "Swing";
    }
  }, [traderStyle]);

  return {
    traderStyle,
    setTraderStyle,
    traderStyleLabel,
    biasTimeframes,
  };
}
