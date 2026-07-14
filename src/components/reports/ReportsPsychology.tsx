import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, AlertTriangle, ThumbsUp, Target, Heart } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { CardFeatureGate, TierBadge } from "@/components/journal/FeatureGate";

interface Trade {
  id: string;
  date: string;
  pair: string;
  type: 'Long' | 'Short';
  entry: number;
  exit: number;
  lots: number;
  pnl: number;
  status: string;
  notes?: string;
  rating?: number;
  entryTime?: string;
  exitTime?: string;
}

interface PinState {
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

interface ReportsPsychologyProps {
  trades: Trade[];
  dateRangeLabel: string;
  isLocked?: boolean;
  sym?: string;
  pinStates?: {
    sentiment: PinState;
    triggers: PinState;
    improvement: PinState;
  };
}

const POSITIVE_KEYWORDS = ['patient', 'perfect', 'confident', 'disciplined', 'calm', 'good setup', 'followed plan', 'great'];
const NEGATIVE_KEYWORDS = ['fear', 'fomo', 'hesitation', 'revenge', 'late entry', 'early exit', 'overtrading', 'impatient', 'greedy', 'emotional'];

export function ReportsPsychology({ trades, dateRangeLabel, pinStates, isLocked = false, sym = '£' }: ReportsPsychologyProps) {
  const { exportToPdf } = usePdfExport();

  // Calculate summary stats
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  const handleExport = () => {
    exportToPdf('reports-psychology', {
      filename: `StreamBias-Psychology-${new Date().toISOString().split('T')[0]}`,
      title: 'Psychology Report',
      dateRange: dateRangeLabel,
      userName: 'John Trader',
      trades: {
        totalPnl,
        winRate,
        avgRR,
        tradeCount: trades.length,
        bestDay: null,
        worstDay: null,
      },
    });
  };

  // Sentiment analysis
  const tradesWithNotes = trades.filter(t => t.notes && t.notes.trim().length > 0);
  
  const positiveNotes = tradesWithNotes.filter(t => 
    POSITIVE_KEYWORDS.some(kw => t.notes?.toLowerCase().includes(kw))
  );
  const negativeNotes = tradesWithNotes.filter(t => 
    NEGATIVE_KEYWORDS.some(kw => t.notes?.toLowerCase().includes(kw))
  );

  // Word frequency
  const wordFrequency = trades.reduce((acc, t) => {
    if (!t.notes) return acc;
    const words = t.notes.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 3) {
        acc[word] = (acc[word] || 0) + 1;
      }
    });
    return acc;
  }, {} as Record<string, number>);

  const topWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word, count]) => ({ word, count }));

  // Emotional trigger analysis
  const triggerAnalysis = NEGATIVE_KEYWORDS.map(trigger => {
    const triggerTrades = trades.filter(t => t.notes?.toLowerCase().includes(trigger));
    const totalPnlVal = triggerTrades.reduce((sum, t) => sum + t.pnl, 0);
    const avgPnl = triggerTrades.length > 0 ? totalPnlVal / triggerTrades.length : 0;
    return { trigger, count: triggerTrades.length, avgPnl, totalPnl: totalPnlVal };
  }).filter(t => t.count > 0).sort((a, b) => a.avgPnl - b.avgPnl);

  // Top mistakes
  const topMistakes = triggerAnalysis.slice(0, 3);

  // Most confident trades (high rating + positive notes)
  const confidentTrades = trades
    .filter(t => t.rating && t.rating >= 4 && t.pnl > 0)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 3);

  // Improvement focus
  const getImprovementFocus = () => {
    if (topMistakes.length > 0) {
      const worst = topMistakes[0];
      return `Focus on eliminating "${worst.trigger}" - it has cost you ${sym}${Math.abs(worst.totalPnl).toLocaleString()} across ${worst.count} trades.`;
    }
    if (tradesWithNotes.length < trades.length * 0.3) {
      return "Start adding notes to more trades to identify psychological patterns.";
    }
    return "Keep maintaining trading discipline and documenting your thoughts.";
  };

  // Hold-time analysis from entryTime + exitTime
  const holdTimeTrades = trades
    .filter(t => t.entryTime && t.exitTime)
    .map(t => {
      const [eh, em] = t.entryTime!.split(':').map(Number);
      const [xh, xm] = t.exitTime!.split(':').map(Number);
      const entryMins = eh * 60 + em;
      let exitMins = xh * 60 + xm;
      if (exitMins < entryMins) exitMins += 24 * 60; // midnight crossing
      return { ...t, holdMins: exitMins - entryMins };
    });

  const hasHoldData = holdTimeTrades.length > 0;

  const holdWinners = holdTimeTrades.filter(t => t.pnl > 0);
  const holdLosers  = holdTimeTrades.filter(t => t.pnl < 0);
  const avgHoldWinners = holdWinners.length > 0
    ? holdWinners.reduce((s, t) => s + t.holdMins, 0) / holdWinners.length
    : 0;
  const avgHoldLosers = holdLosers.length > 0
    ? holdLosers.reduce((s, t) => s + t.holdMins, 0) / holdLosers.length
    : 0;

  const formatMins = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const holdBuckets = [
    { label: 'Scalp',    desc: '< 60 min', trades: holdTimeTrades.filter(t => t.holdMins < 60) },
    { label: 'Intraday', desc: '1 – 8 h',  trades: holdTimeTrades.filter(t => t.holdMins >= 60 && t.holdMins <= 480) },
    { label: 'Swing',    desc: '> 8 h',    trades: holdTimeTrades.filter(t => t.holdMins > 480) },
  ].map(b => ({
    label: b.label,
    desc:  b.desc,
    count: b.trades.length,
    pnl:   b.trades.reduce((s, t) => s + t.pnl, 0),
    winRate: b.trades.length > 0
      ? Math.round((b.trades.filter(t => t.pnl > 0).length / b.trades.length) * 100)
      : 0,
  }));

  return (
    <div id="reports-psychology" className="space-y-6">
      {/* Header with export */}
      <div className="flex items-center justify-end gap-2" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Sentiment Summary - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sentiment Summary</CardTitle>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.sentiment && (
                <AddToDashboardButton
                  isAdded={pinStates.sentiment.isAdded}
                  onAdd={pinStates.sentiment.onAdd}
                  onRemove={pinStates.sentiment.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Trades with Notes</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{tradesWithNotes.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((tradesWithNotes.length / trades.length) * 100)}% of all trades
                </p>
              </div>

              <div className="p-4 rounded-lg bg-success/5 border border-success/30">
                <div className="flex items-center gap-2 mb-2">
                  <ThumbsUp className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium text-muted-foreground">Positive Notes</p>
                </div>
                <p className="text-2xl font-bold text-success">{positiveNotes.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trades with confident/disciplined mentions
                </p>
              </div>

              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-muted-foreground">Negative Notes</p>
                </div>
                <p className="text-2xl font-bold text-destructive">{negativeNotes.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Trades with fear/FOMO/emotional mentions
                </p>
              </div>
            </div>
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Word Cloud (simplified as tags) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Common Terms in Notes</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {topWords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {topWords.map((w) => (
                  <Badge 
                    key={w.word} 
                    variant="secondary"
                    className="text-sm px-3 py-1"
                    style={{ fontSize: `${Math.min(16, 10 + w.count * 2)}px` }}
                  >
                    {w.word} ({w.count})
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add notes to your trades to build a word frequency analysis.
              </p>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Emotional Triggers Heatmap - with per-card pin */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Emotional Triggers vs Outcomes</CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.triggers && (
                <AddToDashboardButton
                  isAdded={pinStates.triggers.isAdded}
                  onAdd={pinStates.triggers.onAdd}
                  onRemove={pinStates.triggers.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {triggerAnalysis.length > 0 ? (
              <div className="space-y-3">
                {triggerAnalysis.map((t) => (
                  <div 
                    key={t.trigger}
                    className={`p-3 rounded-lg border flex items-center justify-between ${
                      t.avgPnl < 0 ? 'bg-destructive/5 border-destructive/30' : 'bg-success/5 border-success/30'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium capitalize">{t.trigger}</p>
                      <p className="text-xs text-muted-foreground">{t.count} occurrences</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${t.avgPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {t.avgPnl >= 0 ? '+' : ''}{sym}{Math.round(t.avgPnl)}/trade
                      </p>
                      <p className={`text-xs ${t.totalPnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        Total: {t.totalPnl >= 0 ? '+' : ''}{sym}{t.totalPnl.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add emotional notes to trades (fear, FOMO, hesitation, etc.) to analyze triggers.
              </p>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Top Emotional Mistakes */}
      {topMistakes.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>Top Emotional Mistakes</CardTitle>
              </div>
              {isLocked && <TierBadge requiredPlan="standard" />}
            </div>
          </CardHeader>
          <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
            <CardContent>
              <div className="space-y-3">
                {topMistakes.map((m, idx) => (
                  <div key={m.trigger} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">{m.trigger}</p>
                      <p className="text-xs text-destructive">
                        Cost: {sym}{Math.abs(m.totalPnl).toLocaleString()} ({m.count} trades)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CardFeatureGate>
        </Card>
      )}

      {/* Most Confident Trades */}
      <Card className="border-success/30 bg-success/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-success" />
              <CardTitle>Most Confident Winning Trades</CardTitle>
            </div>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {confidentTrades.length > 0 ? (
              <div className="space-y-3">
                {confidentTrades.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                    <div>
                      <Badge variant="outline">{t.pair}</Badge>
                      <span className="text-xs text-muted-foreground ml-2">{t.date}</span>
                    </div>
                    <span className="text-sm font-bold text-success">+{sym}{t.pnl.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Rate your best trades 4-5 stars to track confident winners.
              </p>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Hold-Time Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Hold-Time Analysis</CardTitle>
            {isLocked && <TierBadge requiredPlan="standard" />}
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            {!hasHoldData ? (
              <p className="text-sm text-muted-foreground">
                Add entry and exit times to your trades to see hold-time analysis.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                    <p className="text-xs text-muted-foreground">Avg Hold — Winners</p>
                    <p className="text-xl font-bold text-success">{formatMins(avgHoldWinners)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-xs text-muted-foreground">Avg Hold — Losers</p>
                    <p className="text-xl font-bold text-destructive">{formatMins(avgHoldLosers)}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {holdBuckets.filter(b => b.count > 0).map(b => (
                    <div key={b.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
                      <div>
                        <span className="text-sm font-medium">{b.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{b.desc}</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="text-sm font-medium">{b.count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Profit Rate</p>
                          <p className="text-sm font-medium">{b.winRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">P&L</p>
                          <p className={`text-sm font-medium ${b.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {b.pnl >= 0 ? '+' : ''}{sym}{b.pnl.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CardFeatureGate>
      </Card>

      {/* Improvement Focus - with per-card pin */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Your Improvement Focus This Month</CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              {isLocked && <TierBadge requiredPlan="standard" />}
              {!isLocked && pinStates?.improvement && (
                <AddToDashboardButton
                  isAdded={pinStates.improvement.isAdded}
                  onAdd={pinStates.improvement.onAdd}
                  onRemove={pinStates.improvement.onRemove}
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardFeatureGate isLocked={isLocked} requiredPlan="standard">
          <CardContent>
            <p className="text-sm text-foreground">{getImprovementFocus()}</p>
          </CardContent>
        </CardFeatureGate>
      </Card>
    </div>
  );
}
