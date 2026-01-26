import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon, Clock, Bell, AlertTriangle, Activity, Target, Shield, Brain, BarChart3, PieChart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Sample equity data for charts
const getSampleEquityData = () => {
  const sampleTrades = [
    { date: '2025-01-03', pnl: 450 },
    { date: '2025-01-06', pnl: 300 },
    { date: '2025-01-08', pnl: -400 },
    { date: '2025-01-10', pnl: 480 },
    { date: '2025-01-12', pnl: -400 },
    { date: '2025-01-13', pnl: -73 },
    { date: '2025-01-14', pnl: 1350 },
    { date: '2025-01-15', pnl: 600 },
  ];
  let cumulative = 0;
  return sampleTrades.map(t => {
    cumulative += t.pnl;
    return { 
      date: t.date, 
      equity: cumulative,
      formattedDate: t.date.split('-').slice(1).join('/')
    };
  });
};

const equityData = getSampleEquityData();

export interface CardRenderContext {
  slotType: 'wide' | 'narrow' | 'equal' | 'hero' | 'kpi';
}

/**
 * Registry of card renderers - single source of truth for how each pinned card renders on the dashboard.
 * When a new card is added to dashboardCardRegistry.ts, add its render function here.
 */
export const CARD_RENDERERS: Record<string, (ctx: CardRenderContext) => React.ReactNode> = {
  // ============ Journal Equity Curve ============
  'pinned-journal-equity': ({ slotType }) => {
    const chartHeight = slotType === 'hero' ? 'h-64' : 'h-40';
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Journal Equity Curve</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="pinnedEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, 'Equity']}
                />
                <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fill="url(#pinnedEquityGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  // ============ Reports KPI Cards ============
  'reports-kpi-total-pnl': () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">+£2,307</p>
      </CardContent>
    </Card>
  ),

  'reports-kpi-avg-rr': () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg R:R</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">1.85</p>
      </CardContent>
    </Card>
  ),

  'reports-kpi-win-rate': () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">66.7%</p>
      </CardContent>
    </Card>
  ),

  'reports-kpi-expectancy': () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Expectancy</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">£256/trade</p>
      </CardContent>
    </Card>
  ),

  // ============ Reports Overview Cards ============
  'reports-overview-best-day': () => (
    <Card className="h-full bg-success/5 border-success/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Winning Day</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">+£1,200</p>
        <p className="text-xs text-muted-foreground mt-1">2025-01-14</p>
      </CardContent>
    </Card>
  ),

  'reports-overview-worst-day': () => (
    <Card className="h-full bg-destructive/5 border-destructive/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Worst Losing Day</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-destructive">-£400</p>
        <p className="text-xs text-muted-foreground mt-1">2025-01-12</p>
      </CardContent>
    </Card>
  ),

  'reports-overview-equity': ({ slotType }) => {
    const chartHeight = slotType === 'hero' ? 'h-64' : 'h-40';
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="overviewEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, 'Equity']}
                />
                <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fill="url(#overviewEquityGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  'reports-overview-rolling30': ({ slotType }) => {
    const chartHeight = slotType === 'hero' ? 'h-64' : 'h-40';
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Rolling 30-Day</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, 'Cumulative P&L']}
                />
                <Area type="monotone" dataKey="equity" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  'reports-overview-edge': () => (
    <Card className="h-full border-primary/30 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Your Strongest Edge</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">High-confidence setups with 4+ star ratings</p>
      </CardContent>
    </Card>
  ),

  // ============ Reports Sessions ============
  'reports-sessions-comparison': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Session Comparison</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-xs text-muted-foreground">London</p>
            <p className="text-lg font-bold text-success">71%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">New York</p>
            <p className="text-lg font-bold text-foreground">65%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">Asian</p>
            <p className="text-lg font-bold text-foreground">58%</p>
            <p className="text-xs text-muted-foreground">Win Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  'reports-sessions-recommendations': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Session Recommendations</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-success/5 border border-success/20">
            <p className="text-xs text-success font-medium">✓ Best Session</p>
            <p className="text-sm font-medium text-foreground">London</p>
            <p className="text-xs text-muted-foreground">71% win rate, £450 avg profit</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-xs text-destructive font-medium">✗ Avoid</p>
            <p className="text-sm font-medium text-foreground">Asian (Low Volume)</p>
            <p className="text-xs text-muted-foreground">42% win rate, -£85 avg</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  // ============ Reports Assets ============
  'reports-assets-pnl': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">P&L by Instrument</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { pair: 'EUR/USD', pnl: '+£1,250', trades: 45, color: 'text-success' },
            { pair: 'GBP/USD', pnl: '+£820', trades: 32, color: 'text-success' },
            { pair: 'USD/JPY', pnl: '-£180', trades: 18, color: 'text-destructive' },
          ].map(item => (
            <div key={item.pair} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{item.pair}</span>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${item.color}`}>{item.pnl}</p>
                <p className="text-xs text-muted-foreground">{item.trades} trades</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  'reports-assets-table': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Instrument Statistics</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs text-muted-foreground">Pair</th>
                <th className="text-right py-2 text-xs text-muted-foreground">Win %</th>
                <th className="text-right py-2 text-xs text-muted-foreground">P&L</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2">EUR/USD</td>
                <td className="text-right text-success">68%</td>
                <td className="text-right text-success">+£1,250</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2">GBP/USD</td>
                <td className="text-right text-success">62%</td>
                <td className="text-right text-success">+£820</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  ),

  // ============ Reports Setup Quality ============
  'reports-setup-best-worst': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Best & Worst Setups</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border-success/30 bg-success/5 border">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <p className="text-xs font-medium text-muted-foreground">Best</p>
            </div>
            <p className="text-sm font-bold text-success">5 Star</p>
            <p className="text-xs text-muted-foreground">£320/trade</p>
          </div>
          <div className="p-3 rounded-lg border-destructive/30 bg-destructive/5 border">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <p className="text-xs font-medium text-muted-foreground">Worst</p>
            </div>
            <p className="text-sm font-bold text-destructive">1 Star</p>
            <p className="text-xs text-muted-foreground">-£85/trade</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  'reports-setup-patterns': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Common Patterns</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {['Breakout', 'Pullback', 'Reversal'].map((pattern, i) => (
            <div key={pattern} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">{pattern}</span>
              <span className="text-xs text-muted-foreground">{[32, 28, 15][i]} trades</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  // ============ Reports Psychology ============
  'reports-psychology-sentiment': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Sentiment Summary</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-success">68%</p>
            <p className="text-xs text-muted-foreground">Positive</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-destructive">32%</p>
            <p className="text-xs text-muted-foreground">Negative</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  'reports-psychology-triggers': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Emotional Triggers</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { trigger: 'FOMO', impact: 'High', color: 'text-destructive' },
            { trigger: 'Revenge Trading', impact: 'Medium', color: 'text-amber-500' },
            { trigger: 'Overconfidence', impact: 'Low', color: 'text-muted-foreground' },
          ].map(item => (
            <div key={item.trigger} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{item.trigger}</span>
              </div>
              <span className={`text-xs font-medium ${item.color}`}>{item.impact}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  'reports-psychology-improvement': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Improvement Focus</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Focus on reducing FOMO-driven trades</p>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-medium text-primary">Suggestion</p>
            <p className="text-sm text-foreground">Wait for confirmation before entering</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  // ============ Reports Risk Management ============
  'reports-risk-kpis': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Risk KPIs</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">1.2%</p>
            <p className="text-xs text-muted-foreground">Avg Risk</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">2.5%</p>
            <p className="text-xs text-muted-foreground">Max Risk</p>
          </div>
          <div>
            <p className="text-lg font-bold text-destructive">-£850</p>
            <p className="text-xs text-muted-foreground">Max Loss</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  'reports-risk-distribution': ({ slotType }) => {
    const chartHeight = slotType === 'hero' ? 'h-64' : 'h-40';
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className={chartHeight + " flex items-center justify-center"}>
            <div className="grid grid-cols-4 gap-2 w-full">
              {['0-1%', '1-2%', '2-3%', '3%+'].map((range, i) => (
                <div key={range} className="text-center">
                  <div 
                    className="w-full bg-primary/20 rounded-t"
                    style={{ height: `${[45, 85, 35, 15][i]}px` }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{range}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },

  'reports-risk-discipline': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Risk Discipline Score</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="35" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
                <circle 
                  cx="40" cy="40" r="35" 
                  stroke="hsl(var(--success))" 
                  strokeWidth="6" 
                  fill="none"
                  strokeDasharray={`${85 * 2.2} ${220 - 85 * 2.2}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">85%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Excellent discipline</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  // ============ Reports Performance ============
  'reports-performance-by-day': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Win Rate by Day</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">{day}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${[72, 65, 58, 70, 68][i]}%` }}
                />
              </div>
              <span className="text-xs text-foreground w-10">{[72, 65, 58, 70, 68][i]}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  'reports-performance-by-session': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Win Rate by Session</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'London', rate: 71, color: '#F4D35E' },
            { name: 'New York', rate: 65, color: '#F77F00' },
            { name: 'Asian', rate: 58, color: '#4361EE' },
            { name: 'Sydney', rate: 52, color: '#2EC4B6' },
          ].map(session => (
            <div key={session.name} className="p-2 rounded-lg bg-muted/50 border-l-2" style={{ borderColor: session.color }}>
              <p className="text-xs text-muted-foreground">{session.name}</p>
              <p className="text-lg font-bold text-foreground">{session.rate}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  'reports-performance-distribution': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Trade Distribution</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <p className="text-lg font-bold text-foreground mt-2">62%</p>
            <p className="text-xs text-muted-foreground">Long</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-lg font-bold text-foreground mt-2">38%</p>
            <p className="text-xs text-muted-foreground">Short</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),

  // ============ Alerts ============
  'alerts-my-alerts-timers': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">My Alerts & Timers</CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { type: 'Price Alert', what: 'EURUSD > 1.0850', status: 'active' },
            { type: 'News Alert', what: 'USD High Impact', status: 'pending' },
            { type: 'Session Timer', what: 'London Open', status: 'active' },
          ].map((alert, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">{alert.type}</p>
                  <p className="text-xs text-muted-foreground">{alert.what}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${alert.status === 'active' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                {alert.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  // ============ Alerts - Price Alerts ============
  'alerts-price-alerts': () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Active Price Alerts</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground">EUR/USD above 1.0850</span>
            </div>
            <span className="text-xs text-muted-foreground">Touch</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-foreground">Gold below 2020.00</span>
            </div>
            <span className="text-xs text-muted-foreground">Close 1H</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">2 active alerts</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Get render function for a card ID
 */
export const getCardRenderer = (cardId: string): ((ctx: CardRenderContext) => React.ReactNode) | undefined => {
  return CARD_RENDERERS[cardId];
};

/**
 * Check if a card has a render function defined
 */
export const hasCardRenderer = (cardId: string): boolean => {
  return cardId in CARD_RENDERERS;
};

/**
 * Developer check: log warnings for registry cards without renderers
 * Call this at app/dashboard mount for early detection of missing renderers
 */
export const warnMissingRenderers = (registryCardIds: string[]): void => {
  const missing = registryCardIds.filter(id => !hasCardRenderer(id));
  if (missing.length > 0) {
    console.warn(
      '[Dashboard] The following registered cards have no render function:\n' +
      missing.map(id => `  - ${id}`).join('\n') +
      '\nAdd render functions to src/data/dashboardCardRenderers.tsx'
    );
  }
};
