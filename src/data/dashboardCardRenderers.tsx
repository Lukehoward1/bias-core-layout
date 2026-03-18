import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Clock,
  Bell,
  AlertTriangle,
  Activity,
  Target,
  Shield,
  Brain,
  BarChart3,
  PieChart,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Progress } from "@/components/ui/progress";

import { QuickRiskCalculator } from "@/components/risk/QuickRiskCalculator";
import { PositionSizeCalculator } from "@/components/risk/PositionSizeCalculator";
import { RiskRewardCalculator } from "@/components/risk/RiskRewardCalculator";
import { DailyRiskLimitTracker } from "@/components/risk/DailyRiskLimitTracker";
import { MaxDrawdownGuard } from "@/components/risk/MaxDrawdownGuard";

// Sample equity data for charts
const getSampleEquityData = () => {
  const sampleTrades = [
    { date: "2025-01-03", pnl: 450 },
    { date: "2025-01-06", pnl: 300 },
    { date: "2025-01-08", pnl: -400 },
    { date: "2025-01-10", pnl: 480 },
    { date: "2025-01-12", pnl: -400 },
    { date: "2025-01-13", pnl: -73 },
    { date: "2025-01-14", pnl: 1350 },
    { date: "2025-01-15", pnl: 600 },
  ];
  let cumulative = 0;
  return sampleTrades.map((t) => {
    cumulative += t.pnl;
    return {
      date: t.date,
      equity: cumulative,
      formattedDate: t.date.split("-").slice(1).join("/"),
    };
  });
};

const equityData = getSampleEquityData();

export interface CardRenderContext {
  slotType: "wide" | "narrow" | "equal" | "hero" | "kpi" | "wide-narrow" | "three-equal" | "four-equal";
}

export const CARD_RENDERERS: Record<string, (ctx: CardRenderContext) => React.ReactNode> = {
  "pinned-journal-equity": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Journal Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="pinnedEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Equity"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  fill="url(#pinnedEquityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-kpi-total-pnl": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Total P&amp;L</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">+£2,307</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-avg-rr": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Avg R:R</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">1.85</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-win-rate": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-foreground">66.7%</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-expectancy": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Expectancy</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">£256/trade</p>
      </CardContent>
    </Card>
  ),

  "reports-overview-best-day": () => (
    <Card className="h-full bg-success/5 border-success/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          <CardTitle className="text-sm font-medium text-muted-foreground">Best Winning Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-success">+£1,200</p>
        <p className="text-xs text-muted-foreground mt-1">2025-01-14</p>
      </CardContent>
    </Card>
  ),

  "reports-overview-worst-day": () => (
    <Card className="h-full bg-destructive/5 border-destructive/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm font-medium text-muted-foreground">Worst Losing Day</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-destructive">-£400</p>
        <p className="text-xs text-muted-foreground mt-1">2025-01-12</p>
      </CardContent>
    </Card>
  ),

  "reports-overview-equity": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="overviewEquityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Equity"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  fill="url(#overviewEquityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-overview-rolling30": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Rolling 30-Day</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`£${value.toLocaleString()}`, "Cumulative P&amp;L"]}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-overview-edge": () => (
    <Card className="h-full border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Your Strongest Edge</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">High-confidence setups with 4+ star ratings</p>
      </CardContent>
    </Card>
  ),

  "reports-sessions-comparison": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Session Comparison</CardTitle>
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

  "reports-sessions-recommendations": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Session Recommendations</CardTitle>
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

  "reports-assets-pnl": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">P&amp;L by Instrument</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { pair: "EUR/USD", pnl: "+£1,250", trades: 45, color: "text-success" },
            { pair: "GBP/USD", pnl: "+£820", trades: 32, color: "text-success" },
            { pair: "USD/JPY", pnl: "-£180", trades: 18, color: "text-destructive" },
          ].map((item) => (
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

  "reports-assets-table": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Instrument Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-xs text-muted-foreground">Pair</th>
                <th className="text-right py-2 text-xs text-muted-foreground">Win %</th>
                <th className="text-right py-2 text-xs text-muted-foreground">P&amp;L</th>
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

  "reports-setup-best-worst": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Best &amp; Worst Setups</CardTitle>
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

  "reports-setup-patterns": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Common Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {["Breakout", "Pullback", "Reversal"].map((pattern, i) => (
            <div key={pattern} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm text-foreground">{pattern}</span>
              <span className="text-xs text-muted-foreground">{[32, 28, 15][i]} trades</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-psychology-sentiment": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Sentiment Summary</CardTitle>
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

  "reports-psychology-triggers": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Emotional Triggers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { trigger: "FOMO", impact: "High", color: "text-destructive" },
            { trigger: "Revenge Trading", impact: "Medium", color: "text-amber-500" },
            { trigger: "Overconfidence", impact: "Low", color: "text-muted-foreground" },
          ].map((item) => (
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

  "reports-psychology-improvement": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Improvement Focus</CardTitle>
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

  "reports-risk-kpis": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Risk KPIs</CardTitle>
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

  "reports-risk-distribution": ({ slotType }) => {
    const chartHeight = slotType === "hero" ? "h-64" : "h-40";
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={chartHeight + " flex items-center justify-center"}>
            <div className="grid grid-cols-4 gap-2 w-full">
              {["0-1%", "1-2%", "2-3%", "3%+"].map((range, i) => (
                <div key={range} className="text-center">
                  <div className="w-full bg-primary/20 rounded-t" style={{ height: `${[45, 85, 35, 15][i]}px` }} />
                  <p className="text-xs text-muted-foreground mt-1">{range}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },

  "reports-risk-discipline": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Risk Discipline Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="35" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
                <circle
                  cx="40"
                  cy="40"
                  r="35"
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

  "reports-performance-by-day": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Win Rate by Day</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
            <div key={day} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">{day}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${[72, 65, 58, 70, 68][i]}%` }} />
              </div>
              <span className="text-xs text-foreground w-10">{[72, 65, 58, 70, 68][i]}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-performance-by-session": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Win Rate by Session</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "London", rate: 71, color: "#F4D35E" },
            { name: "New York", rate: 65, color: "#F77F00" },
            { name: "Asian", rate: 58, color: "#4361EE" },
            { name: "Sydney", rate: 52, color: "#2EC4B6" },
          ].map((session) => (
            <div
              key={session.name}
              className="p-2 rounded-lg bg-muted/50 border-l-2"
              style={{ borderColor: session.color }}
            >
              <p className="text-xs text-muted-foreground">{session.name}</p>
              <p className="text-lg font-bold text-foreground">{session.rate}%</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-performance-distribution": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Trade Distribution</CardTitle>
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

  "alerts-my-alerts-timers": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">My Alerts &amp; Timers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { type: "Price Alert", what: "EURUSD &gt; 1.0850", status: "active" },
            { type: "News Alert", what: "USD High Impact", status: "pending" },
            { type: "Session Timer", what: "London Open", status: "active" },
          ].map((alert, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">{alert.type}</p>
                  <p className="text-xs text-muted-foreground">{alert.what}</p>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  alert.status === "active" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                }`}
              >
                {alert.status}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "alerts-price-alerts": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Active Price Alerts</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-foreground">EUR/USD above 1.0850</span>
            </div>
            <span className="text-xs text-muted-foreground">Touch</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
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

  "quick-calculator": () => <QuickRiskCalculator compact />,

  "position-size-calculator": () => <PositionSizeCalculator compact />,

  "rr-calculator": () => <RiskRewardCalculator compact />,

  "daily-risk-limit": () => <DailyRiskLimitTracker compact />,

  "max-drawdown-guard": () => <MaxDrawdownGuard compact />,

  "top-news": () => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top News</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { title: "Fed Signals Rate Hold", currency: "USD", time: "2h ago", sentiment: "hawkish" },
            { title: "ECB Minutes Divided", currency: "EUR", time: "4h ago", sentiment: "mixed" },
            { title: "BOE Hints at Cut", currency: "GBP", time: "5h ago", sentiment: "dovish" },
          ].map((item, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {item.currency}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        item.sentiment === "hawkish"
                          ? "bg-success/20 text-success"
                          : item.sentiment === "dovish"
                            ? "bg-warning/20 text-warning"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.sentiment}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "session-timers": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Session Timers</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { name: "Sydney", status: "closed", time: "Opens 8:30", accent: "#2EC4B6" },
            { name: "Asia", status: "open", time: "Closes 1:23", accent: "#4361EE" },
            { name: "London", status: "closed", time: "Opens 2:15", accent: "#F4D35E" },
            { name: "New York", status: "closed", time: "Opens 5:45", accent: "#F77F00" },
          ].map((session, i) => (
            <div key={i} className="relative p-2 rounded-lg bg-muted/50 border border-border overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: session.accent }} />
              <div className="flex items-center justify-between pl-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{session.name}</p>
                  <p className="text-[10px] text-muted-foreground">{session.time}</p>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    session.status === "open" ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {session.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "high-impact-events": () => (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle className="text-sm font-medium">High Impact Events</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { event: "US CPI", currency: "USD", time: "14:30", impact: "high" },
            { event: "ECB Rate Decision", currency: "EUR", time: "13:15", impact: "high" },
            { event: "UK Employment", currency: "GBP", time: "09:00", impact: "medium" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.event}</p>
                  <span className="text-[10px] text-muted-foreground">{item.currency}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{item.time}</span>
                <span className={`w-2 h-2 rounded-full ${item.impact === "high" ? "bg-destructive" : "bg-warning"}`} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "upcoming-events": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { event: "FOMC Minutes", currency: "USD", date: "Wed 19:00", impact: "high" },
            { event: "UK CPI", currency: "GBP", date: "Wed 09:00", impact: "high" },
            { event: "EU Flash PMI", currency: "EUR", date: "Thu 10:00", impact: "medium" },
            { event: "US Initial Claims", currency: "USD", date: "Thu 13:30", impact: "medium" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${item.impact === "high" ? "bg-destructive" : "bg-warning"}`}
                />
                <div>
                  <p className="text-xs font-medium text-foreground">{item.event}</p>
                  <span className="text-[10px] text-muted-foreground">{item.currency}</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">{item.date}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),

  "reports-overview": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Reports Overview</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Key trading metrics at a glance (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-performance": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Performance Analysis</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Win rate and session breakdowns (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-sessions": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Sessions Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Performance by trading session (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-assets": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Assets Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Performance by instrument (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-setup-quality": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Setup Quality Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Performance by setup rating (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-psychology": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Psychology Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Emotional trading analysis (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "reports-risk": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Risk Management Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Risk metrics and analysis (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "journal-summary": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Journal Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Recent journal entries overview (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),

  "daily-performance": () => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Daily Performance</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Current week trading calendar preview (dashboard summary card).</p>
      </CardContent>
    </Card>
  ),
};

export const getCardRenderer = (cardId: string): ((ctx: CardRenderContext) => React.ReactNode) | undefined => {
  return CARD_RENDERERS[cardId];
};

export const hasCardRenderer = (cardId: string): boolean => {
  return cardId in CARD_RENDERERS;
};

export const warnMissingRenderers = (registryCardIds: string[]): void => {
  const missing = registryCardIds.filter((id) => !hasCardRenderer(id));
  if (missing.length > 0) {
    console.warn(
      "[Dashboard] The following registered cards have no render function:\n" +
        missing.map((id) => `  - ${id}`).join("\n") +
        "\nAdd render functions to src/data/dashboardCardRenderers.tsx",
    );
  }
};
