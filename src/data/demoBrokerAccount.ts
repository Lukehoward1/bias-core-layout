import { DEMO_TRADES } from "./demoTrades";
import type { LinkedAccount } from "@/hooks/use-linked-accounts";

const STARTING_BALANCE = 140_000;

const totalPnl = DEMO_TRADES.reduce((sum, t) => sum + t.pnl, 0);

export const DEMO_BROKER_ACCOUNT: LinkedAccount = {
  id: "demo-account",
  name: "Demo Account (StreamBias)",
  broker: "Demo",
  balance: Math.round(STARTING_BALANCE + totalPnl),
  currency: "GBP",
  isConnected: true,
  lastUpdated: new Date(),
};
