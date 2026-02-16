import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Clock, Calendar, TrendingUp, AlertTriangle, Radio, Bell, Zap, Target } from "lucide-react";
import type { AlertItem } from "@/types/alerts";

interface TestAlertsPanelProps {
  onTriggerAlert: (alert: Omit<AlertItem, "id" | "timestamp" | "read">) => void;
}

type TestAlertRow = {
  label: string;
  icon: ReactNode;
  alert: Omit<AlertItem, "id" | "timestamp" | "read">;
};

export function TestAlertsPanel({ onTriggerAlert }: TestAlertsPanelProps) {
  const testAlerts: TestAlertRow[] = [
    {
      label: "Session Open",
      icon: <Clock className="h-3.5 w-3.5" />,
      alert: {
        type: "session",
        title: "London Session Opening",
        message: "London session opens in 15 minutes. Prepare for increased liquidity.",
        severity: "info",
      },
    },
    {
      label: "Session Overlap",
      icon: <Zap className="h-3.5 w-3.5" />,
      alert: {
        type: "session",
        title: "London–NY Overlap Active",
        message: "High liquidity period active for the next 4 hours.",
        severity: "info",
      },
    },

    // ✅ Calendar deep-link examples (eventId only — AlertInbox will route to /calendar?eventId=...)
    {
      label: "High Impact News",
      icon: <Calendar className="h-3.5 w-3.5" />,
      alert: {
        type: "news",
        title: "USD CPI Release",
        message: "US CPI data releasing in 30 minutes. High volatility expected on USD pairs.",
        severity: "high",
        eventId: "us-cpi-2025-01",
        relatedAsset: "EURUSD",
      },
    },
    {
      label: "Breaking News",
      icon: <Radio className="h-3.5 w-3.5" />,
      alert: {
        type: "breaking",
        title: "BREAKING: Fed Emergency Statement",
        message: "Unscheduled Federal Reserve announcement incoming. Markets may react sharply.",
        severity: "high",
        eventId: "nfp-2025-01",
        relatedAsset: "USDJPY",
      },
    },
    {
      label: "Post-Event Summary",
      icon: <Calendar className="h-3.5 w-3.5" />,
      alert: {
        type: "summary",
        title: "NFP Result Summary",
        message: "Actual: 256K vs Forecast: 164K — Better than expected (Bullish USD)",
        severity: "info",
        eventId: "nfp-2025-01",
        relatedAsset: "GBPUSD",
      },
    },

    // ✅ Asset deep-link examples (no eventId; will route to /asset/:symbol via relatedAsset fallback)
    {
      label: "Bias Flip",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      alert: {
        type: "bias",
        title: "EURUSD Bias Flip",
        message: "H4 bias changed from Bearish to Bullish on EURUSD.",
        severity: "warning",
        relatedAsset: "EURUSD",
      },
    },
    {
      label: "Bias Alignment",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      alert: {
        type: "bias",
        title: "GBPUSD Bias Alignment",
        message: "H4 and Daily bias now aligned Bullish on GBPUSD.",
        severity: "info",
        relatedAsset: "GBPUSD",
      },
    },
    {
      label: "Exposure Warning",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      alert: {
        type: "exposure",
        title: "Pre-News Exposure Warning",
        message: "You have open positions in USD pairs. High-impact news in 10 minutes.",
        severity: "warning",
        relatedAsset: "EURUSD",
      },
    },
    {
      label: "Low Liquidity",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      alert: {
        type: "exposure",
        title: "Low Liquidity Period",
        message: "Market liquidity is low. Consider reducing position sizes.",
        severity: "warning",
      },
    },
    {
      label: "Daily Summary",
      icon: <Bell className="h-3.5 w-3.5" />,
      alert: {
        type: "summary",
        title: "Daily Bias Summary",
        message: "Your watchlist: 4 Bullish, 2 Bearish, 1 Neutral. Top mover: XAUUSD +1.2%",
        severity: "info",
      },
    },

    // ✅ Explicit routeTo examples (kept for cases where you want direct navigation)
    {
      label: "Price Alert (Wick)",
      icon: <Target className="h-3.5 w-3.5" />,
      alert: {
        type: "price",
        title: "Gold wicked above 2025.50",
        message: "Your price alert for XAUUSD was triggered.",
        severity: "info",
        relatedAsset: "XAUUSD",
        routeTo: "/asset/XAUUSD",
      },
    },
    {
      label: "Price Alert (Close)",
      icon: <Target className="h-3.5 w-3.5" />,
      alert: {
        type: "price",
        title: "EUR/USD closed above 1.0850 on 15m",
        message: "Candle close confirmed above your alert level.",
        severity: "info",
        relatedAsset: "EURUSD",
        routeTo: "/asset/EURUSD",
      },
    },
  ];

  return (
    <Card className="border-dashed border-warning/50 bg-warning/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-warning" />
          Test Alerts
          <Badge variant="outline" className="text-[10px] text-warning border-warning/50">
            Dev Mode
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Click buttons to trigger simulated alerts for testing purposes.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {testAlerts.map((item, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-8 text-xs"
              onClick={() => onTriggerAlert(item.alert)}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
