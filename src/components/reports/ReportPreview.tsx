import { useEffect, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ACTIVE_ACCOUNT_ALL } from "@/hooks/use-active-trading-account";
import { OverviewPreset } from "./presets/OverviewPreset";
import { PerformancePreset } from "./presets/PerformancePreset";
import { SessionsPreset } from "./presets/SessionsPreset";
import { AssetsPreset } from "./presets/AssetsPreset";
import { SetupQualityPreset } from "./presets/SetupQualityPreset";
import { PsychologyPreset } from "./presets/PsychologyPreset";
import { RiskManagementPreset } from "./presets/RiskManagementPreset";
import { TradeLogPreset } from "./presets/TradeLogPreset";

interface Trade {
  id: string;
  date: string;
  pnl: number;
  status: "win" | "loss" | "breakeven";
  actualR?: number | null;
  pair?: string;
  type?: "Long" | "Short";
  accountId?: string;
  entryTime?: string;
  exitTime?: string;
  notes?: string;
  rating?: number;
  stopLoss?: number;
  entry?: number;
  exit?: number;
  lots?: number;
}

export interface ReportPreviewProps {
  /** One or more preset ids, in the order they should appear in the document.
   * Each renders as its own full page (masthead through footer); a page break
   * is forced before every preset after the first so a multi-select generates
   * one combined, multi-page document rather than overlapping sections. */
  reportTypes: string[];
  selectedStats: string[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  trades: Trade[];
  /** Filter by account — ACTIVE_ACCOUNT_ALL (or omitted) means all accounts. */
  accountId?: string;
  /** Filter by pair — "__all__" (or omitted) means all pairs. */
  pair?: string;
  /** When true, opens the browser print dialog shortly after mount — used by the "Print" action. */
  autoPrint?: boolean;
  /**
   * The selected account's current (live) balance — used to derive the
   * opening/closing balance shown on the Trade Log report. Omit (or pass
   * undefined) when no single reliable balance applies, e.g. "All Accounts"
   * spanning mixed currencies.
   */
  accountBalance?: number;
}

// "overview" and "performance" have real reports built so far — the rest of
// the preset list mirrors the Reports tabs so the picker is honest about
// what exists, with a "coming soon" placeholder until each is built out.
const REPORT_TYPE_LABELS: Record<string, string> = {
  overview: "Overview Report",
  performance: "Performance Report",
  sessions: "Sessions Report",
  assets: "Assets Report",
  setup: "Setup Quality Report",
  psychology: "Psychology Report",
  risk: "Risk Management Report",
  tradelog: "Trade Log Report",
};

const BUILT_PRESETS = new Set([
  "overview", "performance", "sessions", "assets", "setup", "psychology", "risk", "tradelog",
]);

const PRESET_COMPONENTS: Record<string, typeof OverviewPreset> = {
  overview: OverviewPreset,
  performance: PerformancePreset,
  sessions: SessionsPreset,
  assets: AssetsPreset,
  setup: SetupQualityPreset,
  psychology: PsychologyPreset,
  risk: RiskManagementPreset,
  tradelog: TradeLogPreset,
};

export function ReportPreview({
  reportTypes,
  dateRange,
  trades,
  accountId,
  pair,
  autoPrint = false,
  accountBalance,
}: ReportPreviewProps) {
  // Date range as strings, shared by the trade filter below and the balance
  // reconstruction further down.
  const { fromStr, toStr } = useMemo(() => {
    const today = new Date();
    const from = dateRange.from ?? subDays(today, 30);
    const to = dateRange.to ?? today;
    return { fromStr: format(from, "yyyy-MM-dd"), toStr: format(to, "yyyy-MM-dd") };
  }, [dateRange]);

  // Account + pair filtered, but NOT date filtered — used to reconstruct the
  // balance as of the range's end date from trades that happened afterward.
  const accountPairFiltered = useMemo(
    () =>
      trades
        .filter((t) => !accountId || accountId === ACTIVE_ACCOUNT_ALL || t.accountId === accountId)
        .filter((t) => !pair || pair === "__all__" || t.pair === pair),
    [trades, accountId, pair],
  );

  const filtered = useMemo(
    () =>
      accountPairFiltered
        .filter((t) => t.date >= fromStr && t.date <= toStr)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [accountPairFiltered, fromStr, toStr],
  );

  // Balance progression across the report period. The account's `balance`
  // field is its CURRENT (live) value, not its value as of the report's end
  // date — so we walk it backward: subtract the P&L of trades that happened
  // after the range to get the closing balance, then subtract the period's
  // own net P&L to get the opening balance. This assumes no deposits or
  // withdrawals occurred, since trade history alone can't tell us about those.
  const { openingBalance, closingBalance } = useMemo(() => {
    if (accountBalance == null) return { openingBalance: null, closingBalance: null };
    const pnlAfterRange = accountPairFiltered
      .filter((t) => t.date > toStr)
      .reduce((s, t) => s + t.pnl, 0);
    const closing = accountBalance - pnlAfterRange;
    const periodPnl = filtered.reduce((s, t) => s + t.pnl, 0);
    const opening = closing - periodPnl;
    return { openingBalance: opening, closingBalance: closing };
  }, [accountBalance, accountPairFiltered, filtered, toStr]);

  const builtTypes = reportTypes.filter((t) => BUILT_PRESETS.has(t));
  const hasSelection = builtTypes.length > 0;

  // Print — triggered a beat after mount so layout/charts settle first.
  useEffect(() => {
    if (!autoPrint || !hasSelection) return;
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [autoPrint, hasSelection]);

  const handlePrintClick = () => window.print();

  if (reportTypes.length === 0) {
    return (
      <div className="pt-6 mt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center py-8">
          Select at least one report type above.
        </p>
      </div>
    );
  }

  if (!hasSelection) {
    return (
      <div className="pt-6 mt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center py-8">
          {REPORT_TYPE_LABELS[reportTypes[0]] ?? "This report"} is coming soon.
        </p>
      </div>
    );
  }

  if (filtered.length < 10) {
    return (
      <div className="pt-6 mt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center py-8">
          Not enough data yet — keep journaling
        </p>
      </div>
    );
  }

  const now = new Date();
  const periodStartLabel = format(new Date(fromStr + "T12:00:00"), "MMM d, yyyy");
  const periodEndLabel = format(new Date(toStr + "T12:00:00"), "MMM d, yyyy");
  const periodLabel = dateRange.from && dateRange.to
    ? `${periodStartLabel} – ${periodEndLabel}`
    : "Last 30 days";
  const generatedAt = now.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const reportIdSlug = builtTypes.length > 1 ? "MULTI" : builtTypes[0].slice(0, 3).toUpperCase();
  const reportId = `SB-${reportIdSlug}-${now.toISOString().slice(0, 10).replace(/-/g, "")}`;

  const sharedPresetProps = {
    trades: filtered,
    periodLabel,
    periodStartLabel,
    periodEndLabel,
    accountLabel: "All Accounts",
    generatedAt,
    reportId,
    onPrint: handlePrintClick,
    openingBalance,
    closingBalance,
  };

  return (
    <div className="pt-6 mt-6 border-t border-border">
      <div id="report-print-area">
        {builtTypes.map((type, idx) => {
          const PresetComponent = PRESET_COMPONENTS[type] ?? OverviewPreset;
          return (
            <div
              key={type}
              className={idx > 0 ? "mt-8 print:mt-0 print:break-before-page" : ""}
            >
              <PresetComponent
                {...sharedPresetProps}
                reportTitle={REPORT_TYPE_LABELS[type] ?? "Overview Report"}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
