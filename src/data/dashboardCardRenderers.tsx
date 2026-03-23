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

// ✅ FIXED IMPORT (THIS WAS THE ERROR)
import { WatchlistOverviewCard } from "@/components/dashboard/WatchlistOverviewCard";

// Risk tools
import { QuickRiskCalculator } from "@/components/risk/QuickRiskCalculator";
import { PositionSizeCalculator } from "@/components/risk/PositionSizeCalculator";
import { RiskRewardCalculator } from "@/components/risk/RiskRewardCalculator";
import { DailyRiskLimitTracker } from "@/components/risk/DailyRiskLimitTracker";
import { MaxDrawdownGuard } from "@/components/risk/MaxDrawdownGuard";

// Sample equity data
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
  // ========================
  // ✅ WATCHLIST (FIXED)
  // ========================
  "watchlist-overview": () => <WatchlistOverviewCard />,

  // ========================
  // JOURNAL
  // ========================
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
                <XAxis dataKey="formattedDate" />
                <YAxis />
                <Tooltip />
                <Area dataKey="equity" stroke="hsl(var(--primary))" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  },

  // ========================
  // KPI
  // ========================
  "reports-kpi-total-pnl": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-2xl font-bold text-success">+£2,307</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-avg-rr": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-2xl font-bold">1.85</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-win-rate": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-2xl font-bold">66.7%</p>
      </CardContent>
    </Card>
  ),

  "reports-kpi-expectancy": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-2xl font-bold text-success">£256/trade</p>
      </CardContent>
    </Card>
  ),

  // ========================
  // ALERTS / TIMERS
  // ========================
  "session-timers": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-sm">Session Timers</p>
      </CardContent>
    </Card>
  ),

  "top-news": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-sm">Top News</p>
      </CardContent>
    </Card>
  ),

  "alerts-my-alerts-timers": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-sm">My Alerts</p>
      </CardContent>
    </Card>
  ),

  "alerts-price-alerts": () => (
    <Card className="h-full">
      <CardContent>
        <p className="text-sm">Price Alerts</p>
      </CardContent>
    </Card>
  ),

  // ========================
  // CALCULATORS
  // ========================
  "quick-calculator": () => <QuickRiskCalculator compact />,
  "position-size-calculator": () => <PositionSizeCalculator compact />,
  "rr-calculator": () => <RiskRewardCalculator compact />,
  "daily-risk-limit": () => <DailyRiskLimitTracker compact />,
  "max-drawdown-guard": () => <MaxDrawdownGuard compact />,
};

// ========================
// HELPERS
// ========================
export const getCardRenderer = (cardId: string) => {
  return CARD_RENDERERS[cardId];
};

export const hasCardRenderer = (cardId: string) => {
  return cardId in CARD_RENDERERS;
};

export const warnMissingRenderers = (registryCardIds: string[]) => {
  const missing = registryCardIds.filter((id) => !hasCardRenderer(id));

  if (missing.length > 0) {
    console.warn("[Dashboard] Missing renderers:\n" + missing.map((id) => `- ${id}`).join("\n"));
  }
};
