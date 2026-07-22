import { getInstrumentBySymbol } from "@/data/tradingInstruments";

export function calculateTradeRisk(
  entry: number,
  stopLoss: number | null | undefined,
  lots: number,
  pair: string,
): number | null {
  if (stopLoss == null) return null;
  const instrument = getInstrumentBySymbol(pair);
  if (!instrument) return null;
  return Math.abs(entry - stopLoss) / instrument.pipSize * instrument.pipValue * lots;
}
