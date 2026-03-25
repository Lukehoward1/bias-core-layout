import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Clock, Calendar, TrendingUp, AlertTriangle, Radio, Bell, Zap, Target } from "lucide-react";
import type { AlertItem } from "@/types/alerts";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { calendarEvents } from "@/data/calendarEvents";

interface TestAlertsPanelProps {
  onTriggerAlert: (alert: Omit<AlertItem, "id" | "timestamp" | "read" | "status" | "triggeredAt">) => void;
}

export function TestAlertsPanel({ onTriggerAlert }: TestAlertsPanelProps) {
  const { watchlist } = useAlertsContext();

  const biasSymbol = useMemo(() => {
    return (watchlist?.[0] || "EURUSD").toUpperCase();
  }, [watchlist]);

  const usCpiEvent = useMemo(() => calendarEvents.find((event) => event.event === "US CPI"), []);

  const nfpEvent = useMemo(() => calendarEvents.find((event) => event.event === "Non-Farm Payrolls"), []);

  const testAlerts: Array<{
    label: string;
    icon: React.ReactNode;
    alert: Omit<AlertItem, "id" | "timestamp" | "read" | "status" | "triggeredAt">;
  }> = [
    {
      label: "Session Open",
      icon: <Clock className="h-3.5 w-3.5" />,
      alert: {
        type: "session",
        title: "London Session Opening",
        message: "London session opens in 15 minutes. Prepare for increased liquidity.",
        severity: "info",
        routeTo: "/alerts",
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
        routeTo: "/alerts",
      },
    },
    {
      label: "High Impact News",
      icon: <Calendar className="h-3.5 w-3.5" />,
      alert: {
        type: "news",
        title: "USD CPI Release",
        message: "US CPI data releasing in 30 minutes. High volatility expected on USD pairs.",
        severity: "high",
        relatedAsset: "USD",
        eventId: usCpiEvent?.id,
        routeTo: "/calendar",
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
        relatedAsset: "USD",
        routeTo: "/calendar",
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
        relatedAsset: "USD",
        eventId: nfpEvent?.id,
        routeTo: "/calendar",
      },
    },
    {
      label: "Bias Flip",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      alert: {
        type: "bias",
        title: `${biasSymbol} Bias Flip`,
        message: `H4 bias changed from Bearish to Bullish on ${biasSymbol}.`,
        severity: "warning",
        relatedAsset: biasSymbol,
        routeTo: "/asset/:symbol",
        routeParams: { symbol: biasSymbol },
      },
    },
    {
      label: "Bias Alignment",
      icon: <TrendingUp className="h-3.5 w-3.5" />,
      alert: {
        type: "bias",
        title: `${biasSymbol} Bias Alignment`,
        message: `H4 and Daily bias now aligned Bullish on ${biasSymbol}.`,
        severity: "info",
        relatedAsset: biasSymbol,
        routeTo: "/asset/:symbol",
        routeParams: { symbol: biasSymbol },
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
        relatedAsset: "USD",
        routeTo: "/risk-tools",
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
        routeTo: "/risk-tools",
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
        routeTo: "/alerts",
      },
    },
    {
      label: "Price Alert (Wick)",
      icon: <Target className="h-3.5 w-3.5" />,
      alert: {
        type: "price",
        title: "Gold wicked above 2025.50",
        message: "Your price alert for XAUUSD was triggered.",
        severity: "info",
        relatedAsset: "XAUUSD",
        routeTo: "/asset/:symbol",
        routeParams: { symbol: "XAUUSD" },
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
        routeTo: "/asset/:symbol",
        routeParams: { symbol: "EURUSD" },
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
          {testAlerts.map((item) => (
            <Button
              key={item.label}
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
