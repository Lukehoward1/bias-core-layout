// src/pages/Journal.tsx
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Star,
  Download,
  Lock,
  Zap,
  Pencil,
  Trash2,
} from "lucide-react";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { useSubscription } from "@/hooks/use-subscription";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { LockedBadge } from "@/components/journal/FeatureGate";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ReportsOverview } from "@/components/reports/ReportsOverview";
import { ReportsPerformance } from "@/components/reports/ReportsPerformance";
import { ReportsSessions } from "@/components/reports/ReportsSessions";
import { ReportsAssets } from "@/components/reports/ReportsAssets";
import { ReportsSetupQuality } from "@/components/reports/ReportsSetupQuality";
import { ReportsPsychology } from "@/components/reports/ReportsPsychology";
import { ReportsRiskManagement } from "@/components/reports/ReportsRiskManagement";
import { ReportsTradeLog } from "@/components/reports/ReportsTradeLog";
import { ReportDateRangeFilter, DateRange } from "@/components/reports/ReportDateRangeFilter";
import { usePdfExport } from "@/hooks/use-pdf-export";
import { Link } from "react-router-dom";

// ✅ Trading data (active account scope + stats)
import { useTradingData } from "@/hooks/use-trading-data";
import { ACTIVE_ACCOUNT_ALL } from "@/hooks/use-active-trading-account";

// ✅ Canonical trade type
import { type Trade as JournalTrade } from "@/hooks/use-journal-trades";

// ✅ Instrument-aware P&L
import { getInstrumentBySymbol, calculateTradePnl } from "@/data/tradingInstruments";
import { WHITELIST_SYMBOLS } from "@/services/candleData";

/* =======================
   TYPES
======================= */

type Trade = JournalTrade;

type ExportFormat = "pdf" | "csv";

const REPORT_SECTIONS = [
  { id: "reports-overview", title: "Overview" },
  { id: "reports-performance", title: "Performance" },
  { id: "reports-sessions", title: "Sessions" },
  { id: "reports-assets", title: "Assets" },
  { id: "reports-setup", title: "Setup Quality" },
  { id: "reports-psychology", title: "Psychology" },
  { id: "reports-risk", title: "Risk Management" },
  { id: "reports-tradelog", title: "Trade Log" },
] as const;

const escapeCsv = (v: unknown) => {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadTextFile = (filename: string, content: string, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const UNASSIGNED_ACCOUNT_VALUE = "__unassigned__";

/**
 * Normalize symbol input so "EUR/USD" or "eurusd" becomes "EURUSD"
 */
const normalizeSymbol = (s: string) => s.trim().toUpperCase().replace("/", "");

/**
 * Backward-compatible fallback formula (only if instrument metadata missing).
 */
const legacyFallbackPnl = (type: "Long" | "Short", entry: number, exit: number, lots: number) => {
  const raw = type === "Long" ? (exit - entry) * lots * 10000 : (entry - exit) * lots * 10000;
  return Math.round(raw);
};

/* =======================
   UI HELPERS
======================= */

function StarRating({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star === rating ? 0 : star)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
          />
        </button>
      ))}
    </div>
  );
}

interface EquityCurveCardProps {
  trades: Trade[];
  isAdded: boolean;
  onAdd: () => void;
  onRemove: () => void;
}

function EquityCurveCard({ trades, isAdded, onAdd, onRemove }: EquityCurveCardProps) {
  // ✅ daily aggregation so curve shows day-by-day moves
  const equityData = useMemo(() => {
    const daily = trades.reduce(
      (acc, t) => {
        acc[t.date] = (acc[t.date] || 0) + (t.pnl || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const days = Object.keys(daily).sort((a, b) => a.localeCompare(b));

    let cumulative = 0;
    let tradeCount = 0;

    return days.map((date) => {
      cumulative += daily[date];
      const tradesThatDay = trades.filter((t) => t.date === date).length;
      tradeCount += tradesThatDay;
      return {
        date,
        equity: cumulative,
        tradeCount,
        formattedDate: format(parseISO(date), "MMM d"),
      };
    });
  }, [trades]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{data.formattedDate}</p>
          <p className={`text-sm font-semibold ${data.equity >= 0 ? "text-success" : "text-destructive"}`}>
            {data.equity >= 0 ? "+" : ""}£{Number(data.equity || 0).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{data.tradeCount} trades total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Equity Curve</CardTitle>
          <div className="flex items-center gap-2">
            <AddToDashboardButton isAdded={isAdded} onAdd={onAdd} onRemove={onRemove} />
            <Badge variant="outline" className="text-xs">
              MT5 - Live
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={equityData}>
              <defs>
                <linearGradient id="journalEquityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => `£${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="hsl(var(--primary))"
                fill="url(#journalEquityGradient)"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 0 }}
                activeDot={{ fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))", r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* =======================
   PAGE
======================= */

export default function Journal() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);

  // ✅ Active account scope + canonical journal actions
  const { activeAccountId, setActiveAccountId, activeAccountLabel, accounts, primaryAccount, viewTrades, journal } = useTradingData();

  const {
    trades: allTrades,
    addManualTrade,
    updateManualTrade,
    deleteManualTrade,
    setTradeNotes,
    setTradeRating,
  } = journal;

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, a.name));
    return map;
  }, [accounts]);

  const { exportAllReports } = usePdfExport();

  const { limits } = useSubscription();
  const canAccessReports = limits.journal.reports;
  const canExportReports = limits.journal.exportReports;
  const canUseAutoJournaling = limits.journal.autoJournaling;

  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  // Dashboard pins
  const equityCurveCardId = "pinned-journal-equity";
  const isEquityCurveAdded = isCardOnDashboard(equityCurveCardId);

  const handleAddEquityCurve = () => {
    addCard(equityCurveCardId, true, "journal-equity");
    toast.success("Added to Dashboard");
  };

  const handleRemoveEquityCurve = () => {
    removeCard(equityCurveCardId);
    toast.success("Removed from Dashboard");
  };

  const dailyPerformanceCardId = "daily-performance";
  const isDailyPerformanceAdded = isCardOnDashboard(dailyPerformanceCardId);

  const handleAddDailyPerformance = () => {
    addCard(dailyPerformanceCardId, true, "daily-performance");
    toast.success("Pinned to Dashboard");
  };

  const handleRemoveDailyPerformance = () => {
    removeCard(dailyPerformanceCardId);
    toast.success("Unpinned from Dashboard");
  };

  const overviewCardIds = {
    totalPnl: "reports-kpi-total-pnl",
    avgRR: "reports-kpi-avg-rr",
    winRate: "reports-kpi-win-rate",
    expectancy: "reports-kpi-expectancy",
    bestDay: "reports-overview-best-day",
    worstDay: "reports-overview-worst-day",
    equity: "reports-overview-equity",
    rolling30: "reports-overview-rolling30",
    edge: "reports-overview-edge",
  };

  const performanceCardIds = {
    byDay: "reports-performance-by-day",
    bySession: "reports-performance-by-session",
    distribution: "reports-performance-distribution",
  };

  const sessionsCardIds = {
    comparison: "reports-sessions-comparison",
    recommendations: "reports-sessions-recommendations",
  };

  const assetsCardIds = {
    pnlChart: "reports-assets-pnl",
    table: "reports-assets-table",
  };

  const setupCardIds = {
    bestWorst: "reports-setup-best-worst",
    patterns: "reports-setup-patterns",
  };

  const psychologyCardIds = {
    sentiment: "reports-psychology-sentiment",
    triggers: "reports-psychology-triggers",
    improvement: "reports-psychology-improvement",
  };

  const riskCardIds = {
    kpis: "reports-risk-kpis",
    distribution: "reports-risk-distribution",
    discipline: "reports-risk-discipline",
  };

  const getCardPinState = (cardId: string) => ({
    isAdded: isCardOnDashboard(cardId),
    onAdd: () => {
      addCard(cardId, true, cardId);
      toast.success("Pinned to Dashboard");
    },
    onRemove: () => {
      removeCard(cardId);
      toast.success("Unpinned from Dashboard");
    },
  });

  const overviewPinStates = {
    totalPnl: getCardPinState(overviewCardIds.totalPnl),
    avgRR: getCardPinState(overviewCardIds.avgRR),
    winRate: getCardPinState(overviewCardIds.winRate),
    expectancy: getCardPinState(overviewCardIds.expectancy),
    bestDay: getCardPinState(overviewCardIds.bestDay),
    worstDay: getCardPinState(overviewCardIds.worstDay),
    equity: getCardPinState(overviewCardIds.equity),
    rolling30: getCardPinState(overviewCardIds.rolling30),
    edge: getCardPinState(overviewCardIds.edge),
  };

  const performancePinStates = {
    byDay: getCardPinState(performanceCardIds.byDay),
    bySession: getCardPinState(performanceCardIds.bySession),
    distribution: getCardPinState(performanceCardIds.distribution),
  };

  const sessionsPinStates = {
    comparison: getCardPinState(sessionsCardIds.comparison),
    recommendations: getCardPinState(sessionsCardIds.recommendations),
  };

  const assetsPinStates = {
    pnlChart: getCardPinState(assetsCardIds.pnlChart),
    table: getCardPinState(assetsCardIds.table),
  };

  const setupPinStates = {
    bestWorst: getCardPinState(setupCardIds.bestWorst),
    patterns: getCardPinState(setupCardIds.patterns),
  };

  const psychologyPinStates = {
    sentiment: getCardPinState(psychologyCardIds.sentiment),
    triggers: getCardPinState(psychologyCardIds.triggers),
    improvement: getCardPinState(psychologyCardIds.improvement),
  };

  const riskPinStates = {
    kpis: getCardPinState(riskCardIds.kpis),
    distribution: getCardPinState(riskCardIds.distribution),
    discipline: getCardPinState(riskCardIds.discipline),
  };

  // Date range filter for reports
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 3),
    to: endOfDay(new Date()),
    label: "Last 3 Months",
  });

  const { firstTradeDate, lastTradeDate } = useMemo(() => {
    if (viewTrades.length === 0) return { firstTradeDate: undefined, lastTradeDate: undefined };
    const sortedDates = viewTrades.map((t) => parseISO(t.date)).sort((a, b) => a.getTime() - b.getTime());
    return { firstTradeDate: sortedDates[0], lastTradeDate: sortedDates[sortedDates.length - 1] };
  }, [viewTrades]);

  const filteredTrades = useMemo(() => {
    return viewTrades.filter((t) => {
      const tradeDate = parseISO(t.date);
      return isWithinInterval(tradeDate, { start: dateRange.from, end: dateRange.to });
    });
  }, [viewTrades, dateRange]);

  const dateRangeLabel = `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`;

  // ✅ Top cards must use viewTrades (active scope)
  const topStats = useMemo(() => {
    const totalTrades = viewTrades.length;
    const wins = viewTrades.filter((t) => t.pnl > 0).length;
    const totalPnl = viewTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

    const winningTrades = viewTrades.filter((t) => t.pnl > 0);
    const losingTrades = viewTrades.filter((t) => t.pnl < 0);
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss =
      losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 1;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    return { totalTrades, winRate, totalPnl, avgRR };
  }, [viewTrades]);

  const tradeSummary = useMemo(() => {
    const totalPnl = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winningTrades = filteredTrades.filter((t) => t.pnl > 0);
    const losingTrades = filteredTrades.filter((t) => t.pnl < 0);
    const winRate = filteredTrades.length > 0 ? (winningTrades.length / filteredTrades.length) * 100 : 0;

    const avgWin =
      winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss =
      losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 1;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    const dailyPnl = filteredTrades.reduce(
      (acc, t) => {
        acc[t.date] = (acc[t.date] || 0) + (t.pnl || 0);
        return acc;
      },
      {} as Record<string, number>,
    );

    const dailyEntries = Object.entries(dailyPnl);
    const bestDay = dailyEntries.reduce(
      (best, [date, pnl]) => (pnl > (best?.pnl ?? -Infinity) ? { date, pnl } : best),
      null as { date: string; pnl: number } | null,
    );
    const worstDay = dailyEntries.reduce(
      (worst, [date, pnl]) => (pnl < (worst?.pnl ?? Infinity) ? { date, pnl } : worst),
      null as { date: string; pnl: number } | null,
    );

    return { totalPnl, winRate, avgRR, tradeCount: filteredTrades.length, bestDay, worstDay };
  }, [filteredTrades]);

  // Add trade form
  const [newTrade, setNewTrade] = useState({
    accountId: UNASSIGNED_ACCOUNT_VALUE,
    pair: "",
    type: "Long" as "Long" | "Short",
    entry: "",
    exit: "",
    lots: "",
    stopLoss: "",
    takeProfit: "",
    date: "",
    entryTime: "",
    exitTime: "",
    notes: "",
    rating: 0,
  });
  const [pairIsManual, setPairIsManual] = useState(false);

  const openAddTrade = () => {
    setNewTrade({
      accountId: UNASSIGNED_ACCOUNT_VALUE,
      pair: "",
      type: "Long",
      entry: "",
      exit: "",
      lots: "",
      stopLoss: "",
      takeProfit: "",
      date: selectedDay ? format(selectedDay, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      entryTime: "",
      exitTime: "",
      notes: "",
      rating: 0,
    });
    setPairIsManual(false);
    setIsAddTradeOpen(true);
  };

  // Export selected modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf");
  const defaultSelectedSectionIds = useMemo(() => REPORT_SECTIONS.map((s) => s.id), []);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(defaultSelectedSectionIds);

  useEffect(() => {
    setSelectedSectionIds((prev) => {
      if (prev.length > 0) return prev;
      return REPORT_SECTIONS.map((s) => s.id);
    });
  }, []);

  const toggleSection = (id: string) => {
    setSelectedSectionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const buildCsvExport = () => {
    const lines: string[] = [];
    const now = format(new Date(), "yyyy-MM-dd HH:mm");

    lines.push(["StreamBias Export", "", ""].map(escapeCsv).join(","));
    lines.push(["Generated", now, ""].map(escapeCsv).join(","));
    lines.push(["Date Range", dateRangeLabel, ""].map(escapeCsv).join(","));
    lines.push(["Account Scope", activeAccountLabel, ""].map(escapeCsv).join(","));
    lines.push(["", "", ""].map(escapeCsv).join(","));

    const include = new Set(selectedSectionIds);

    if (include.has("reports-overview")) {
      lines.push(["SECTION", "Overview", ""].map(escapeCsv).join(","));
      lines.push(["Total P&L", tradeSummary.totalPnl, ""].map(escapeCsv).join(","));
      lines.push(["Win Rate (%)", tradeSummary.winRate.toFixed(2), ""].map(escapeCsv).join(","));
      lines.push(["Avg R:R", tradeSummary.avgRR.toFixed(2), ""].map(escapeCsv).join(","));
      lines.push(["Trade Count", tradeSummary.tradeCount, ""].map(escapeCsv).join(","));
      lines.push(
        ["Best Day", tradeSummary.bestDay ? `${tradeSummary.bestDay.date} (${tradeSummary.bestDay.pnl})` : "N/A", ""]
          .map(escapeCsv)
          .join(","),
      );
      lines.push(
        [
          "Worst Day",
          tradeSummary.worstDay ? `${tradeSummary.worstDay.date} (${tradeSummary.worstDay.pnl})` : "N/A",
          "",
        ]
          .map(escapeCsv)
          .join(","),
      );
      lines.push(["", "", ""].map(escapeCsv).join(","));
    }

    if (include.has("reports-tradelog")) {
      lines.push(["SECTION", "Trade Log", ""].map(escapeCsv).join(","));
      const header = ["Date", "Account", "Pair", "Type", "Entry", "Exit", "Lots", "P&L", "Status", "Notes", "Rating"];
      lines.push(header.map(escapeCsv).join(","));

      filteredTrades.forEach((t) => {
        const accountLabel = t.accountId ? accountNameById.get(t.accountId) || t.accountId : "Unknown";
        lines.push(
          [t.date, accountLabel, t.pair, t.type, t.entry, t.exit, t.lots, t.pnl, t.status, t.notes ?? "", t.rating ?? 0]
            .map(escapeCsv)
            .join(","),
        );
      });

      lines.push(["", "", ""].map(escapeCsv).join(","));
    }

    const otherSections = REPORT_SECTIONS.filter(
      (s) => include.has(s.id) && s.id !== "reports-overview" && s.id !== "reports-tradelog",
    );

    otherSections.forEach((s) => {
      lines.push(["SECTION", s.title, ""].map(escapeCsv).join(","));
      lines.push(
        [
          "Note",
          "This section is visual in-app. PDF export captures the full formatted report cards for this section.",
          "",
        ]
          .map(escapeCsv)
          .join(","),
      );
      lines.push(["", "", ""].map(escapeCsv).join(","));
    });

    return lines.join("\n");
  };

  const handleExportAllReports = () => {
    const sessionHighlights = [
      "London session: Best performing with highest win rate",
      "Consider reducing exposure during Asian session",
    ];
    const assetHighlights = filteredTrades.length > 0 ? [`Top pair by P&L: ${filteredTrades[0]?.pair || "N/A"}`] : [];
    const psychologyHighlights = ["Track emotional patterns in your notes for better insights"];

    exportAllReports(
      [
        { id: "reports-overview", title: "Overview" },
        { id: "reports-performance", title: "Performance" },
        { id: "reports-sessions", title: "Sessions", highlights: sessionHighlights },
        { id: "reports-assets", title: "Assets", highlights: assetHighlights },
        { id: "reports-setup", title: "Setup Quality" },
        { id: "reports-psychology", title: "Psychology", highlights: psychologyHighlights },
        { id: "reports-risk", title: "Risk Management" },
      ],
      {
        filename: `StreamBias-Full-Report-${format(new Date(), "yyyy-MM-dd")}`,
        dateRange: dateRangeLabel,
        userName: "John Trader",
        trades: tradeSummary,
      },
    );
  };

  const handleExportSelected = () => {
    if (!canExportReports) return;

    if (selectedSectionIds.length === 0) {
      toast.error("Select at least one section to export.");
      return;
    }

    if (exportFormat === "csv") {
      const csv = buildCsvExport();
      downloadTextFile(
        `StreamBias-Selected-Export-${format(new Date(), "yyyy-MM-dd")}.csv`,
        csv,
        "text/csv;charset=utf-8",
      );
      toast.success("CSV exported");
      setIsExportModalOpen(false);
      return;
    }

    const include = new Set(selectedSectionIds);

    const sessionHighlights = [
      "London session: Best performing with highest win rate",
      "Consider reducing exposure during Asian session",
    ];
    const assetHighlights = filteredTrades.length > 0 ? [`Top pair by P&L: ${filteredTrades[0]?.pair || "N/A"}`] : [];
    const psychologyHighlights = ["Track emotional patterns in your notes for better insights"];

    const selectedPayload = REPORT_SECTIONS.filter((s) => include.has(s.id)).map((s) => {
      if (s.id === "reports-sessions") return { id: s.id, title: s.title, highlights: sessionHighlights };
      if (s.id === "reports-assets") return { id: s.id, title: s.title, highlights: assetHighlights };
      if (s.id === "reports-psychology") return { id: s.id, title: s.title, highlights: psychologyHighlights };
      return { id: s.id, title: s.title };
    });

    exportAllReports(selectedPayload as any, {
      filename: `StreamBias-Selected-Report-${format(new Date(), "yyyy-MM-dd")}`,
      dateRange: dateRangeLabel,
      userName: "John Trader",
      trades: tradeSummary,
    });

    toast.success("PDF export started");
    setIsExportModalOpen(false);
  };

  // ✅ Calendar day summaries MUST use viewTrades
  function getDailySummary(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayTrades = viewTrades.filter((t) => t.date === dateStr);
    const totalPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    return { trades: dayTrades, totalPnl, tradeCount: dayTrades.length };
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const handleDayClick = (date: Date) => {
    setSelectedDay(date);
    setIsDialogOpen(true);
  };

  const selectedDayTrades = selectedDay ? getDailySummary(selectedDay).trades : [];

  // Notes/rating editing in table (uses overrides; works for manual + synced)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");

  const handleNoteClick = (tradeId: string, currentNote: string) => {
    setEditingNoteId(tradeId);
    setNoteValue(currentNote || "");
  };

  const handleNoteSave = (tradeId: string) => {
    setTradeNotes(tradeId, noteValue);
    setEditingNoteId(null);
    setNoteValue("");
  };

  const handleRatingChange = (tradeId: string, rating: number) => {
    setTradeRating(tradeId, rating);
  };

  // Add trade (writes to canonical store, with correct default account behavior)
  const handleAddTrade = () => {
    if (!selectedDay || !newTrade.pair || !newTrade.entry || !newTrade.exit || !newTrade.lots) {
      toast.error("Please fill in all trade fields.");
      return;
    }

    const entry = parseFloat(newTrade.entry);
    const exit = parseFloat(newTrade.exit);
    const lots = parseFloat(newTrade.lots);

    if (!Number.isFinite(entry) || !Number.isFinite(exit) || !Number.isFinite(lots) || lots <= 0) {
      toast.error("Please enter valid numbers.");
      return;
    }

    const symbol = normalizeSymbol(newTrade.pair);

    const instrument = getInstrumentBySymbol(symbol);
    const pnl = instrument
      ? calculateTradePnl(instrument, entry, exit, lots, newTrade.type)
      : legacyFallbackPnl(newTrade.type, entry, exit, lots);

    // ✅ Account resolution:
    // 1) explicit dropdown selection
    // 2) viewing account (if not ALL)
    // 3) primary account
    // 4) undefined
    const explicitAccountId =
      newTrade.accountId && newTrade.accountId !== UNASSIGNED_ACCOUNT_VALUE ? newTrade.accountId : undefined;

    const viewingAccountId = activeAccountId !== ACTIVE_ACCOUNT_ALL ? activeAccountId : undefined;

    const resolvedAccountId = explicitAccountId || viewingAccountId || primaryAccount?.id || undefined;

    const sl = parseFloat(newTrade.stopLoss);
    let actualR: number | null = null;
    if (Number.isFinite(sl) && sl !== entry) {
      const raw = newTrade.type === "Long"
        ? (exit - entry) / (entry - sl)
        : (entry - exit) / (sl - entry);
      actualR = Math.round(raw * 100) / 100;
    }

    const trade: Trade = {
      id: Date.now().toString(),
      date: newTrade.date || (selectedDay ? format(selectedDay, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd")),
      pair: symbol,
      type: newTrade.type,
      entry,
      exit,
      lots,
      pnl,
      status: pnl > 0 ? "win" : pnl < 0 ? "loss" : "breakeven",
      notes: newTrade.notes,
      rating: newTrade.rating,
      actualR,
      entryTime: newTrade.entryTime || undefined,
      exitTime: newTrade.exitTime || undefined,
      accountId: resolvedAccountId,
      source: "manual",
    };

    addManualTrade(trade);

    setNewTrade({
      accountId: UNASSIGNED_ACCOUNT_VALUE,
      pair: "",
      type: "Long",
      entry: "",
      exit: "",
      lots: "",
      stopLoss: "",
      takeProfit: "",
      date: "",
      entryTime: "",
      exitTime: "",
      notes: "",
      rating: 0,
    });
    setPairIsManual(false);
    setIsAddTradeOpen(false);
    toast.success("Trade added");
  };

  /* =======================
     ✅ EDIT / DELETE
  ======================= */

  const [isEditTradeOpen, setIsEditTradeOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const openEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setIsEditTradeOpen(true);
  };

  const closeEditTrade = () => {
    setIsEditTradeOpen(false);
    setEditingTrade(null);
  };

  const isSyncedTrade = (t: Trade) => t.source === "synced";

  const handleDeleteTrade = (trade: Trade) => {
    if (isSyncedTrade(trade)) return;

    const ok = window.confirm("Delete this trade? This cannot be undone.");
    if (!ok) return;

    deleteManualTrade(trade.id);
    toast.success("Trade deleted");
  };

  const handleSaveEditTrade = () => {
    if (!editingTrade) return;

    if (isSyncedTrade(editingTrade)) {
      setTradeNotes(editingTrade.id, editingTrade.notes ?? "");
      setTradeRating(editingTrade.id, editingTrade.rating ?? 0);
      toast.success("Saved");
      closeEditTrade();
      return;
    }

    const symbol = normalizeSymbol(editingTrade.pair);

    const entry = Number(editingTrade.entry);
    const exit = Number(editingTrade.exit);
    const lots = Number(editingTrade.lots);

    if (!symbol || !Number.isFinite(entry) || !Number.isFinite(exit) || !Number.isFinite(lots) || lots <= 0) {
      toast.error("Please enter valid trade values.");
      return;
    }

    const instrument = getInstrumentBySymbol(symbol);
    const pnl = instrument
      ? calculateTradePnl(instrument, entry, exit, lots, editingTrade.type)
      : legacyFallbackPnl(editingTrade.type, entry, exit, lots);

    updateManualTrade(editingTrade.id, {
      pair: symbol,
      type: editingTrade.type,
      entry,
      exit,
      lots,
      pnl,
      status: editingTrade.status,
      accountId: editingTrade.accountId,
    });

    setTradeNotes(editingTrade.id, editingTrade.notes ?? "");
    setTradeRating(editingTrade.id, editingTrade.rating ?? 0);

    toast.success("Trade updated");
    closeEditTrade();
  };

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Journal" />

      <div className="max-w-7xl mx-auto space-y-6">
        <Tabs defaultValue="journal" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="journal" className="text-sm">
              Journal
            </TabsTrigger>
            <TabsTrigger value="reports" className="text-sm">
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="journal" className="space-y-6 mt-5">
            <Card className={!canUseAutoJournaling ? "border-muted" : "border-primary/30 bg-primary/5"}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        canUseAutoJournaling ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      {canUseAutoJournaling ? (
                        <Zap className="h-5 w-5 text-primary" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">Auto-Journaling</p>
                        {!canUseAutoJournaling && <LockedBadge requiredPlan="standard" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {canUseAutoJournaling
                          ? "Trades sync automatically from linked accounts"
                          : "Automatically sync trades from your broker"}
                      </p>
                    </div>
                  </div>
                  {!canUseAutoJournaling && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/billing">Upgrade</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ✅ Optional: show scope (keeps design consistent, subtle) */}
            <div className="flex items-center justify-end">
              <Select value={activeAccountId} onValueChange={setActiveAccountId}>
                <SelectTrigger className="h-7 w-auto min-w-[160px] text-xs gap-1.5">
                  <span className="text-muted-foreground">Viewing:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACTIVE_ACCOUNT_ALL}>All Accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Top stats (active scope) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{topStats.totalTrades}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{topStats.winRate}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total P&amp;L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${topStats.totalPnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {topStats.totalPnl >= 0 ? "+" : ""}£{Number(topStats.totalPnl || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg R:R</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{topStats.avgRR.toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>

            {/* ✅ Equity curve uses active scope */}
            <EquityCurveCard
              trades={viewTrades}
              isAdded={isEquityCurveAdded}
              onAdd={handleAddEquityCurve}
              onRemove={handleRemoveEquityCurve}
            />

            {/* Daily Performance calendar (active scope) */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daily Performance</CardTitle>
                  <div className="flex items-center gap-2">
                    <AddToDashboardButton
                      isAdded={isDailyPerformanceAdded}
                      onAdd={handleAddDailyPerformance}
                      onRemove={handleRemoveDailyPerformance}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[120px] text-center">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
                    <div key={dayName} className="text-center text-xs font-medium text-muted-foreground py-2">
                      {dayName}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((date, idx) => {
                    const summary = getDailySummary(date);
                    const isCurrentMonth = isSameMonth(date, currentMonth);
                    const hasTrades = summary.tradeCount > 0;

                    let bgClass = "bg-muted/20";
                    let pnlColorClass = "text-muted-foreground";

                    if (hasTrades) {
                      if (summary.totalPnl > 0) {
                        bgClass = "bg-success/10 hover:bg-success/20";
                        pnlColorClass = "text-success";
                      } else if (summary.totalPnl < 0) {
                        bgClass = "bg-destructive/10 hover:bg-destructive/20";
                        pnlColorClass = "text-destructive";
                      } else {
                        bgClass = "bg-muted/30 hover:bg-muted/40";
                        pnlColorClass = "text-muted-foreground";
                      }
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => isCurrentMonth && handleDayClick(date)}
                        className={`
                          min-h-[80px] p-2 rounded-lg border border-border/50 flex flex-col
                          ${bgClass}
                          ${!isCurrentMonth ? "opacity-30" : "cursor-pointer"}
                          transition-colors
                        `}
                      >
                        <span className={`text-xs ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"}`}>
                          {format(date, "d")}
                        </span>
                        {hasTrades && isCurrentMonth && (
                          <>
                            <span className={`text-sm font-bold mt-auto ${pnlColorClass}`}>
                              {summary.totalPnl >= 0 ? "+" : ""}£{Number(summary.totalPnl || 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {summary.tradeCount} trade{summary.tradeCount !== 1 ? "s" : ""}
                            </span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Day modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto scrollbar-hidden flex flex-col">
                <DialogHeader>
                  <div className="flex items-center justify-between pr-8">
                    <DialogTitle>Trades for {selectedDay ? format(selectedDay, "EEEE, MMMM d, yyyy") : ""}</DialogTitle>
                    <Button size="sm" className="h-8" onClick={openAddTrade}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trade
                    </Button>
                  </div>
                </DialogHeader>

                <div className="overflow-x-auto flex-1">
                  {selectedDayTrades.length > 0 ? (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Account</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Pair</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Entry</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Exit</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Lots</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">P&amp;L</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">R</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground min-w-[140px]">
                            Notes
                          </th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Rating</th>
                          <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedDayTrades.map((trade) => {
                          const accName = trade.accountId
                            ? accountNameById.get(trade.accountId) || "Account"
                            : "Unknown";
                          const synced = isSyncedTrade(trade);

                          return (
                            <tr key={trade.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-3 text-sm text-muted-foreground">{trade.date}</td>

                              <td className="py-3 px-3">
                                <Badge variant="secondary" className="text-xs">
                                  {accName}
                                  {primaryAccount?.id && trade.accountId === primaryAccount.id ? " (Primary)" : ""}
                                </Badge>
                              </td>

                              <td className="py-3 px-3">
                                <Badge variant="outline" className="text-xs">
                                  {trade.pair}
                                </Badge>
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5">
                                  {trade.type === "Long" ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                                  ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                                  )}
                                  <span className="text-sm text-foreground">{trade.type}</span>
                                </div>
                              </td>

                              <td className="py-3 px-3 text-sm text-foreground">{trade.entry}</td>
                              <td className="py-3 px-3 text-sm text-foreground">{trade.exit}</td>
                              <td className="py-3 px-3 text-sm text-foreground">{trade.lots}</td>

                              <td className="py-3 px-3">
                                <span
                                  className={`text-sm font-medium ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}
                                >
                                  {trade.pnl >= 0 ? "+" : ""}£{Number(trade.pnl || 0).toLocaleString()}
                                </span>
                              </td>

                              <td className="py-3 px-3">
                                {trade.actualR != null ? (
                                  <span className={`text-sm font-medium ${trade.actualR >= 0 ? "text-success" : "text-destructive"}`}>
                                    {trade.actualR >= 0 ? "+" : ""}{trade.actualR}R
                                  </span>
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <Badge variant="secondary" className="text-xs">
                                  {trade.status}
                                </Badge>
                              </td>

                              <td className="py-3 px-3">
                                {editingNoteId === trade.id ? (
                                  <div className="flex gap-1">
                                    <Input
                                      value={noteValue}
                                      onChange={(e) => setNoteValue(e.target.value)}
                                      className="h-7 text-xs w-24"
                                      placeholder="Add note..."
                                      onKeyDown={(e) => e.key === "Enter" && handleNoteSave(trade.id)}
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() => handleNoteSave(trade.id)}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleNoteClick(trade.id, trade.notes || "")}
                                    className="text-xs text-left hover:text-foreground transition-colors max-w-[120px] truncate"
                                  >
                                    {trade.notes || <span className="text-muted-foreground/60 italic">Add note…</span>}
                                  </button>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <StarRating
                                  rating={trade.rating || 0}
                                  onRatingChange={(r) => handleRatingChange(trade.id, r)}
                                />
                              </td>

                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditTrade(trade)}
                                    title={synced ? "Edit notes/rating" : "Edit trade"}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${synced ? "opacity-40 cursor-not-allowed" : ""}`}
                                    disabled={synced}
                                    onClick={() => handleDeleteTrade(trade)}
                                    title={synced ? "Synced trades cannot be deleted" : "Delete trade"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No trades for this day</p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Add trade modal */}
            <Dialog open={isAddTradeOpen} onOpenChange={setIsAddTradeOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Trade</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  {/* Account */}
                  <div className="space-y-2">
                    <Label htmlFor="account">Account</Label>
                    <Select
                      value={newTrade.accountId || UNASSIGNED_ACCOUNT_VALUE}
                      onValueChange={(value) => setNewTrade({ ...newTrade, accountId: value })}
                    >
                      <SelectTrigger id="account">
                        <SelectValue
                          placeholder={
                            activeAccountId !== ACTIVE_ACCOUNT_ALL
                              ? `Viewing Account (default): ${activeAccountLabel}`
                              : primaryAccount
                                ? "Primary Account (default)"
                                : "Select account (optional)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_ACCOUNT_VALUE}>Use default</SelectItem>
                        {primaryAccount && (
                          <SelectItem value={primaryAccount.id}>{primaryAccount.name} (Primary)</SelectItem>
                        )}
                        {accounts
                          .filter((a) => a.id !== primaryAccount?.id)
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Default = Viewing Account (if selected), otherwise Primary.
                    </p>
                  </div>

                  {/* Pair + Direction */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pair">Pair</Label>
                      <Select
                        value={pairIsManual ? "__manual__" : newTrade.pair}
                        onValueChange={(value) => {
                          if (value === "__manual__") {
                            setPairIsManual(true);
                            setNewTrade({ ...newTrade, pair: "" });
                          } else {
                            setPairIsManual(false);
                            setNewTrade({ ...newTrade, pair: value });
                          }
                        }}
                      >
                        <SelectTrigger id="pair">
                          <SelectValue placeholder="Select pair…" />
                        </SelectTrigger>
                        <SelectContent>
                          {WHITELIST_SYMBOLS.map((sym) => (
                            <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                          ))}
                          <SelectItem value="__manual__">Enter manually…</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={newTrade.type === "Long" ? "default" : "outline"}
                          className={newTrade.type === "Long" ? "bg-green-600 hover:bg-green-700 border-green-600 text-white" : ""}
                          onClick={() => setNewTrade({ ...newTrade, type: "Long" })}
                        >
                          Long
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={newTrade.type === "Short" ? "default" : "outline"}
                          className={newTrade.type === "Short" ? "bg-red-600 hover:bg-red-700 border-red-600 text-white" : ""}
                          onClick={() => setNewTrade({ ...newTrade, type: "Short" })}
                        >
                          Short
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Manual symbol input */}
                  {pairIsManual && (
                    <div className="space-y-2">
                      <Label htmlFor="pairManual">Symbol</Label>
                      <Input
                        id="pairManual"
                        placeholder="e.g. EURUSD"
                        value={newTrade.pair}
                        onChange={(e) => setNewTrade({ ...newTrade, pair: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Entry / Exit / Lots */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entry">Entry</Label>
                      <Input
                        id="entry"
                        type="number"
                        step="0.0001"
                        placeholder="1.0850"
                        value={newTrade.entry}
                        onChange={(e) => setNewTrade({ ...newTrade, entry: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exit">Exit</Label>
                      <Input
                        id="exit"
                        type="number"
                        step="0.0001"
                        placeholder="1.0900"
                        value={newTrade.exit}
                        onChange={(e) => setNewTrade({ ...newTrade, exit: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lots">Lots</Label>
                      <Input
                        id="lots"
                        type="number"
                        step="0.01"
                        placeholder="1.0"
                        value={newTrade.lots}
                        onChange={(e) => setNewTrade({ ...newTrade, lots: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Stop Loss / Take Profit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stopLoss">Stop Loss</Label>
                      <Input
                        id="stopLoss"
                        type="number"
                        step="0.0001"
                        placeholder="1.0800"
                        value={newTrade.stopLoss}
                        onChange={(e) => setNewTrade({ ...newTrade, stopLoss: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="takeProfit">Take Profit</Label>
                      <Input
                        id="takeProfit"
                        type="number"
                        step="0.0001"
                        placeholder="1.0950"
                        value={newTrade.takeProfit}
                        onChange={(e) => setNewTrade({ ...newTrade, takeProfit: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="tradeDate">Date</Label>
                    <Input
                      id="tradeDate"
                      type="date"
                      value={newTrade.date}
                      onChange={(e) => setNewTrade({ ...newTrade, date: e.target.value })}
                    />
                  </div>

                  {/* Entry / Exit Time */}
                  <div className="space-y-2">
                    <Label>Entry / Exit Time (UTC)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="entryTime" className="text-xs text-muted-foreground">Entry Time</Label>
                        <Input
                          id="entryTime"
                          type="time"
                          value={newTrade.entryTime}
                          onChange={(e) => setNewTrade({ ...newTrade, entryTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="exitTime" className="text-xs text-muted-foreground">Exit Time</Label>
                        <Input
                          id="exitTime"
                          type="time"
                          value={newTrade.exitTime}
                          onChange={(e) => setNewTrade({ ...newTrade, exitTime: e.target.value })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Optional — used for session and hold-time analysis.</p>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      placeholder="Optional notes…"
                      value={newTrade.notes}
                      onChange={(e) => setNewTrade({ ...newTrade, notes: e.target.value })}
                    />
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <StarRating
                      rating={newTrade.rating}
                      onRatingChange={(rating) => setNewTrade({ ...newTrade, rating })}
                    />
                  </div>

                  <Button className="w-full" onClick={handleAddTrade}>
                    Add Trade
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit trade modal */}
            <Dialog open={isEditTradeOpen} onOpenChange={setIsEditTradeOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Trade</DialogTitle>
                </DialogHeader>

                {editingTrade && (
                  <div className="space-y-4 pt-4">
                    {isSyncedTrade(editingTrade) && (
                      <div className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-md p-3">
                        This trade is synced from your broker. You can only edit{" "}
                        <span className="font-medium">Notes</span> and <span className="font-medium">Rating</span>.
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Account</Label>
                      <Select
                        value={editingTrade.accountId || UNASSIGNED_ACCOUNT_VALUE}
                        onValueChange={(v) =>
                          setEditingTrade((prev) =>
                            prev ? { ...prev, accountId: v === UNASSIGNED_ACCOUNT_VALUE ? undefined : v } : prev,
                          )
                        }
                        disabled={isSyncedTrade(editingTrade)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED_ACCOUNT_VALUE}>Unassigned / Unknown</SelectItem>
                          {primaryAccount && (
                            <SelectItem value={primaryAccount.id}>{primaryAccount.name} (Primary)</SelectItem>
                          )}
                          {accounts
                            .filter((a) => a.id !== primaryAccount?.id)
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pair</Label>
                        <Input
                          value={editingTrade.pair}
                          onChange={(e) => setEditingTrade((p) => (p ? { ...p, pair: e.target.value } : p))}
                          disabled={isSyncedTrade(editingTrade)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={editingTrade.type}
                          onValueChange={(v: "Long" | "Short") => setEditingTrade((p) => (p ? { ...p, type: v } : p))}
                          disabled={isSyncedTrade(editingTrade)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Long">Long</SelectItem>
                            <SelectItem value="Short">Short</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Entry</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={editingTrade.entry}
                          onChange={(e) => setEditingTrade((p) => (p ? { ...p, entry: Number(e.target.value) } : p))}
                          disabled={isSyncedTrade(editingTrade)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Exit</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={editingTrade.exit}
                          onChange={(e) => setEditingTrade((p) => (p ? { ...p, exit: Number(e.target.value) } : p))}
                          disabled={isSyncedTrade(editingTrade)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Lots</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingTrade.lots}
                          onChange={(e) => setEditingTrade((p) => (p ? { ...p, lots: Number(e.target.value) } : p))}
                          disabled={isSyncedTrade(editingTrade)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Input
                        value={editingTrade.status}
                        onChange={(e) => setEditingTrade((p) => (p ? { ...p, status: e.target.value } : p))}
                        disabled={isSyncedTrade(editingTrade)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        value={editingTrade.notes || ""}
                        onChange={(e) => setEditingTrade((p) => (p ? { ...p, notes: e.target.value } : p))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rating</Label>
                      <div>
                        <StarRating
                          rating={editingTrade.rating || 0}
                          onRatingChange={(r) => setEditingTrade((p) => (p ? { ...p, rating: r } : p))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={closeEditTrade}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEditTrade}>Save</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="space-y-6 mt-5">
            <Tabs defaultValue="overview" className="w-full">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <TabsList className="grid w-full lg:w-auto grid-cols-4 lg:grid-cols-8 h-auto gap-1 p-1">
                  <TabsTrigger value="overview" className="text-xs px-2 py-1.5">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="text-xs px-2 py-1.5">
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="sessions" className="text-xs px-2 py-1.5">
                    Sessions
                  </TabsTrigger>
                  <TabsTrigger value="assets" className="text-xs px-2 py-1.5">
                    Assets
                  </TabsTrigger>
                  <TabsTrigger value="setup" className="text-xs px-2 py-1.5">
                    Setup Quality
                  </TabsTrigger>
                  <TabsTrigger value="psychology" className="text-xs px-2 py-1.5">
                    Psychology
                  </TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs px-2 py-1.5">
                    Risk Mgmt
                  </TabsTrigger>
                  <TabsTrigger value="tradelog" className="text-xs px-2 py-1.5">
                    Trade Log
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-3">
                  <ReportDateRangeFilter
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    firstTradeDate={firstTradeDate}
                    lastTradeDate={lastTradeDate}
                  />

                  {canExportReports ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={handleExportAllReports}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export All
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => {
                          setSelectedSectionIds(REPORT_SECTIONS.map((s) => s.id));
                          setExportFormat("pdf");
                          setIsExportModalOpen(true);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export Selected Stats
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs opacity-60" disabled>
                        <Lock className="h-3 w-3" />
                        Export All
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs opacity-60" disabled>
                        <Lock className="h-3 w-3" />
                        Export Selected Stats
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Export Selected Stats</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-5 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Export format</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExportFormat("pdf")}
                          className={`py-2 px-3 text-sm font-medium rounded-md border transition-all ${
                            exportFormat === "pdf"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-border hover:bg-muted"
                          }`}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportFormat("csv")}
                          className={`py-2 px-3 text-sm font-medium rounded-md border transition-all ${
                            exportFormat === "csv"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 border-border hover:bg-muted"
                          }`}
                        >
                          CSV
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        PDF preserves the report layout. CSV is a clean data export (best for spreadsheets).
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Choose sections</Label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setSelectedSectionIds(REPORT_SECTIONS.map((s) => s.id))}
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => setSelectedSectionIds([])}
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {REPORT_SECTIONS.map((s) => {
                          const checked = selectedSectionIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSection(s.id)}
                                  className="h-4 w-4"
                                />
                                <span className="text-sm text-foreground">{s.title}</span>
                              </div>
                              {s.id === "reports-tradelog" && (
                                <Badge variant="outline" className="text-[10px]">
                                  rows
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        You can deselect anything you don’t want included before exporting.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setIsExportModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleExportSelected} disabled={selectedSectionIds.length === 0}>
                        Export
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <TabsContent value="overview" className="mt-5">
                <ReportsOverview
                  trades={filteredTrades}
                  dateRangeLabel={dateRangeLabel}
                  pinStates={overviewPinStates}
                  isLocked={!canAccessReports}
                />
              </TabsContent>
              <TabsContent value="performance" className="mt-5">
                <ReportsPerformance
                  trades={filteredTrades}
                  dateRangeLabel={dateRangeLabel}
                  pinStates={performancePinStates}
                  isLocked={!canAccessReports}
                />
              </TabsContent>
              <TabsContent value="sessions" className="mt-5">
                <ReportsSessions
                  trades={filteredTrades}
                  dateRangeLabel={dateRangeLabel}
                  pinStates={sessionsPinStates}
                  isLocked={!canAccessReports}
                />
              </TabsContent>
              <TabsContent value="assets" className="mt-5">
                <ReportsAssets
                  trades={filteredTrades}
                  dateRangeLabel={dateRangeLabel}
                  pinStates={assetsPinStates}
                  isLocked={!canAccessReports}
                />
              </TabsContent>
              <TabsContent value="setup" className="mt-5">
                <ReportsSetupQuality
                  trades={filteredTrades}
                  dateRangeLabel={dateRangeLabel}
                  pinStates={setupPinStates}
                  isLocked={!canAccessReports}
                />
              </TabsContent>
              <TabsContent value="psychology" className="mt-5">
                <ReportsPsychology
                  trades={filteredTrades}
                  dateRangeLabel={dateRangeLabel}
                  pinStates={psychologyPinStates}
                  isLocked={!canAccessReports}
                />
              </TabsContent>
              <TabsContent value="risk" className="mt-5">
                <ReportsRiskManagement
                  trades={filteredTrades}
                  dateRangeLabel={dateRangeLabel}
                  pinStates={riskPinStates}
                  isLocked={!canAccessReports}
                />
              </TabsContent>
              <TabsContent value="tradelog" className="mt-5">
                <ReportsTradeLog trades={filteredTrades} dateRangeLabel={dateRangeLabel} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
