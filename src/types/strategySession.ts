export interface StrategySession {
  id: string;
  name: string;
  pair: string;
  timeframe: string;
  strategy: string;
  indicators: string[];
  timestamp: Date;
  metrics: SessionMetrics;
  equityCurve: EquityPoint[];
  trades: SessionTrade[];
  notes?: string;
}

export interface SessionMetrics {
  netProfit: number;
  totalTrades: number;
  winRate: number;
  avgRR: number;
  maxDrawdown: number;
  expectancy: number;
  profitFactor: number;
  winningTrades: number;
  losingTrades: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface SessionTrade {
  id: string;
  date: string;
  type: 'long' | 'short';
  entry: number;
  exit: number;
  pnl: number;
  rr: number;
}
