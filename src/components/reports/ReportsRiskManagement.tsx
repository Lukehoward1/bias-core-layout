import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, AlertTriangle, TrendingDown, Target } from "lucide-react";
import { PdfExportButton } from "./PdfExportButton";
import { usePdfExport } from "@/hooks/use-pdf-export";

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
}

interface ReportsRiskManagementProps {
  trades: Trade[];
  dateRangeLabel: string;
}

export function ReportsRiskManagement({ trades, dateRangeLabel }: ReportsRiskManagementProps) {
  const { exportToPdf } = usePdfExport();

  const handleExport = () => {
    exportToPdf('reports-risk', {
      filename: `StreamBias-RiskManagement-${new Date().toISOString().split('T')[0]}`,
      title: 'Risk Management Report',
      dateRange: dateRangeLabel,
    });
  };
  // Calculate risk metrics (using lots as proxy for risk)
  const risks = trades.map(t => t.lots * 100); // Convert to pseudo £ risk
  const avgRisk = risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
  const maxRisk = risks.length > 0 ? Math.max(...risks) : 0;
  
  // Risk distribution
  const riskBuckets = [
    { range: '£0-50', count: risks.filter(r => r <= 50).length },
    { range: '£50-100', count: risks.filter(r => r > 50 && r <= 100).length },
    { range: '£100-150', count: risks.filter(r => r > 100 && r <= 150).length },
    { range: '£150-200', count: risks.filter(r => r > 150 && r <= 200).length },
    { range: '£200+', count: risks.filter(r => r > 200).length },
  ];

  // Trades exceeding planned risk (assume >150 is excessive)
  const excessiveRiskTrades = trades.filter(t => t.lots * 100 > 150);
  
  // Losing trades (potential risk realized)
  const losingTrades = trades.filter(t => t.pnl < 0);
  const totalLoss = losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl), 0);
  const maxLoss = losingTrades.length > 0 ? Math.max(...losingTrades.map(t => Math.abs(t.pnl))) : 0;

  // Risk discipline score calculation
  const calculateDisciplineScore = () => {
    let score = 100;
    
    // Penalty for excessive risk trades
    score -= excessiveRiskTrades.length * 5;
    
    // Penalty for high variance in risk
    const riskVariance = risks.length > 0 
      ? risks.reduce((acc, r) => acc + Math.pow(r - avgRisk, 2), 0) / risks.length 
      : 0;
    if (riskVariance > 2000) score -= 15;
    else if (riskVariance > 1000) score -= 10;
    
    // Bonus for consistent risk
    if (riskVariance < 500) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  const disciplineScore = calculateDisciplineScore();
  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Poor';
  };

  // Risk of ruin estimation (simplified)
  const winRate = trades.length > 0 
    ? trades.filter(t => t.pnl > 0).length / trades.length 
    : 0;
  const riskOfRuin = ((1 - winRate) / winRate) * 100;

  return (
    <div id="reports-risk" className="space-y-6">
      {/* Header with export */}
      <div className="flex items-center justify-end" data-pdf-exclude>
        <PdfExportButton onClick={handleExport} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Risk/Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{Math.round(avgRisk)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max Risk Taken</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">£{Math.round(maxRisk)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Max Single Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">-£{maxLoss.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Losses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">-£{totalLoss.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{losingTrades.length} losing trades</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution per Trade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskBuckets}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [value, 'Trades']}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Excessive Risk Trades */}
      <Card className={excessiveRiskTrades.length > 0 ? 'border-amber-500/30' : ''}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${excessiveRiskTrades.length > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <CardTitle>Trades Exceeding Planned Risk</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {excessiveRiskTrades.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-amber-500 font-medium">
                {excessiveRiskTrades.length} trades exceeded normal risk levels (&gt;£150)
              </p>
              <div className="space-y-2 mt-3">
                {excessiveRiskTrades.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div>
                      <Badge variant="outline">{t.pair}</Badge>
                      <span className="text-xs text-muted-foreground ml-2">{t.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium">£{Math.round(t.lots * 100)} risk</span>
                      <span className={`text-xs ml-2 ${t.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {t.pnl >= 0 ? '+' : ''}£{t.pnl}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-success">
              ✓ All trades within acceptable risk limits
            </p>
          )}
        </CardContent>
      </Card>

      {/* Risk of Ruin */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Risk of Ruin Estimation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-foreground">
              {riskOfRuin > 100 ? '>100' : Math.round(riskOfRuin)}%
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                Based on your current win rate of {Math.round(winRate * 100)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {riskOfRuin < 10 
                  ? 'Low risk - maintain current approach'
                  : riskOfRuin < 30 
                    ? 'Moderate risk - ensure proper position sizing'
                    : 'High risk - review strategy and risk management'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Discipline Score */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Your Risk Discipline Score</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke={disciplineScore >= 60 ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(disciplineScore / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{disciplineScore}</span>
              </div>
            </div>
            <div>
              <p className={`text-lg font-bold ${disciplineScore >= 60 ? 'text-success' : 'text-destructive'}`}>
                {getScoreLabel(disciplineScore)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {disciplineScore >= 80 
                  ? 'Outstanding risk management discipline!'
                  : disciplineScore >= 60
                    ? 'Good discipline, minor improvements possible.'
                    : 'Focus on consistent position sizing and risk limits.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Slippage Placeholder */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="text-muted-foreground">Average Slippage</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Slippage data will be available once broker connection is enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
