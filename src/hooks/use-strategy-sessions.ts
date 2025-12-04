import { useState, useCallback } from 'react';
import { StrategySession, SessionMetrics, EquityPoint, SessionTrade } from '@/types/strategySession';
import { format } from 'date-fns';

// Generate mock metrics for demo
const generateMockMetrics = (): SessionMetrics => ({
  netProfit: Math.round((Math.random() * 20000 - 5000) * 100) / 100,
  totalTrades: Math.floor(Math.random() * 150) + 50,
  winRate: Math.round((Math.random() * 30 + 50) * 10) / 10,
  avgRR: Math.round((Math.random() * 2 + 1) * 100) / 100,
  maxDrawdown: Math.round((Math.random() * 15 + 5) * 10) / 10,
  expectancy: Math.round((Math.random() * 100 + 20) * 100) / 100,
  profitFactor: Math.round((Math.random() * 1.5 + 1) * 100) / 100,
  winningTrades: 0,
  losingTrades: 0,
});

// Generate mock equity curve
const generateMockEquityCurve = (): EquityPoint[] => {
  const points: EquityPoint[] = [];
  let equity = 10000;
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    equity += (Math.random() - 0.4) * 500;
    points.push({
      date: format(date, 'MMM dd'),
      equity: Math.round(equity * 100) / 100,
    });
  }
  return points;
};

// Generate mock trades
const generateMockTrades = (count: number): SessionTrade[] => {
  const trades: SessionTrade[] = [];
  for (let i = 0; i < count; i++) {
    const isWin = Math.random() > 0.4;
    const pnl = isWin 
      ? Math.round(Math.random() * 500 + 100) 
      : -Math.round(Math.random() * 300 + 50);
    trades.push({
      id: `trade-${i}`,
      date: format(new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      type: Math.random() > 0.5 ? 'long' : 'short',
      entry: Math.round(Math.random() * 1000 + 1000) / 1000,
      exit: Math.round(Math.random() * 1000 + 1000) / 1000,
      pnl,
      rr: Math.round((Math.random() * 3 + 0.5) * 100) / 100,
    });
  }
  return trades;
};

export function useStrategySessions() {
  const [sessions, setSessions] = useState<StrategySession[]>([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);

  const saveSession = useCallback((
    pair: string,
    timeframe: string,
    strategy: string,
    indicators: string[]
  ) => {
    const metrics = generateMockMetrics();
    metrics.winningTrades = Math.floor(metrics.totalTrades * metrics.winRate / 100);
    metrics.losingTrades = metrics.totalTrades - metrics.winningTrades;

    const newSession: StrategySession = {
      id: `session-${Date.now()}`,
      name: `${pair.toUpperCase()} ${timeframe.toUpperCase()} – Session – ${format(new Date(), 'MMM dd')}`,
      pair,
      timeframe,
      strategy,
      indicators,
      timestamp: new Date(),
      metrics,
      equityCurve: generateMockEquityCurve(),
      trades: generateMockTrades(metrics.totalTrades),
    };

    setSessions(prev => [newSession, ...prev]);
    return newSession;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setSelectedSessionIds(prev => prev.filter(sid => sid !== id));
  }, []);

  const renameSession = useCallback((id: string, newName: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, name: newName } : s
    ));
  }, []);

  const updateSessionNotes = useCallback((id: string, notes: string) => {
    setSessions(prev => prev.map(s => 
      s.id === id ? { ...s, notes } : s
    ));
  }, []);

  const toggleSessionSelection = useCallback((id: string) => {
    setSelectedSessionIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(sid => sid !== id);
      }
      if (prev.length >= 3) {
        return prev; // Max 3 sessions for comparison
      }
      return [...prev, id];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSessionIds([]);
  }, []);

  const getSelectedSessions = useCallback(() => {
    return sessions.filter(s => selectedSessionIds.includes(s.id));
  }, [sessions, selectedSessionIds]);

  return {
    sessions,
    selectedSessionIds,
    saveSession,
    deleteSession,
    renameSession,
    updateSessionNotes,
    toggleSessionSelection,
    clearSelection,
    getSelectedSessions,
  };
}
