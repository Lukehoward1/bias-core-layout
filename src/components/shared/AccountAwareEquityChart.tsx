// src/components/shared/AccountAwareEquityChart.tsx
//
// Three-way equity chart driven by the Viewing dropdown + Combine toggle:
//   1. Specific account selected                → single chart for that account.
//   2. All Accounts + combine toggle ON         → per-account mini-grid, one
//                                                 chart per account in its own
//                                                 currency and scale. Never
//                                                 merged onto one chart.
//   3. All Accounts + combine toggle OFF        → single chart for the primary
//                                                 account only. Never a
//                                                 cross-account blend.
//
// Blending across accounts (currencies, balances, scales) is never a reachable
// mode — combining unlike accounts into one line or one number is not a valid
// display for real users.

import { useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ACTIVE_ACCOUNT_ALL,
  useAccountCombineMode,
} from "@/hooks/use-active-trading-account";
import { getAccountColor, shortAccountName } from "@/lib/account-colors";
import { currencySymbol } from "@/lib/currency";
import type { AccountEntry, EquityPoint } from "@/hooks/use-account-aware-stats";

interface AccountAwareEquityChartProps {
  perAccount: Map<string, AccountEntry>;
  activeAccountId: string;
  /**
   * Id of the primary account, used to resolve which single account to show
   * when the Viewing dropdown is "All Accounts" and the Combine toggle is OFF.
   * Null when the user has no linked accounts.
   */
  primaryAccountId: string | null;
  /** Tailwind height class for single chart, e.g. "h-56". Mini-grid always uses "h-36". */
  chartHeight?: string;
  /** "absolute" = real balance (LiveEquityCard style); "relative" = cumulative P&L from 0 (Journal style). */
  curveType?: "absolute" | "relative";
}

// ── Internal single-series area chart ────────────────────────────────────────

interface SingleChartProps {
  data: EquityPoint[];
  color: string;
  sym: string;
  height: string;
  gradId: string;
}

function SingleChart({ data, color, sym, height, gradId }: SingleChartProps) {
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
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
            tickFormatter={(v: number) => `${sym}${v.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [
              `${sym}${value.toLocaleString()}`,
              "Equity",
            ]}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={color}
            fill={`url(#${gradId})`}
            strokeWidth={2}
            isAnimationActive={false}
            dot={{ fill: color, strokeWidth: 0, r: 0 }}
            activeDot={{
              fill: color,
              strokeWidth: 2,
              stroke: "hsl(var(--background))",
              r: 5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AccountAwareEquityChart({
  perAccount,
  activeAccountId,
  primaryAccountId,
  chartHeight = "h-56",
  curveType = "relative",
}: AccountAwareEquityChartProps) {
  const [combineMode] = useAccountCombineMode();
  const isAllAccounts = activeAccountId === ACTIVE_ACCOUNT_ALL;
  const rawId = useId();
  const baseGradId = `aeGrad${rawId.replace(/:/g, "")}`;

  const pickCurve = (entry: AccountEntry) =>
    curveType === "absolute" ? entry.equityCurveAbsolute : entry.equityCurveRelative;

  const renderSingle = (accountId: string | null) => {
    if (!accountId) return <p className="text-sm text-muted-foreground">No closed trades yet.</p>;
    const entry = perAccount.get(accountId);
    const data = entry ? pickCurve(entry) : [];
    if (!entry || data.length === 0) {
      return <p className="text-sm text-muted-foreground">No closed trades yet.</p>;
    }
    return (
      <SingleChart
        data={data}
        color="hsl(var(--primary))"
        sym={currencySymbol(entry.account.currency)}
        height={chartHeight}
        gradId={baseGradId}
      />
    );
  };

  // ── Specific account selected ──────────────────────────────────────────────
  if (!isAllAccounts) return renderSingle(activeAccountId);

  // ── All Accounts + combine ON: per-account mini-grid ───────────────────────
  if (combineMode) {
    const nonEmpty = [...perAccount.entries()].filter(
      ([, e]) => pickCurve(e).length > 0,
    );
    if (nonEmpty.length === 0) {
      return <p className="text-sm text-muted-foreground">No closed trades yet.</p>;
    }
    return (
      <div
        className={
          nonEmpty.length === 1
            ? "grid grid-cols-1"
            : "grid grid-cols-1 sm:grid-cols-2 gap-4"
        }
      >
        {nonEmpty.map(([accountId, entry], index) => {
          const color = getAccountColor(index);
          const data = pickCurve(entry);
          return (
            <div key={accountId}>
              <p className="text-xs font-medium mb-1 truncate" style={{ color }} title={entry.account.name}>
                {shortAccountName(entry.account.name)}
              </p>
              <SingleChart
                data={data}
                color={color}
                sym={currencySymbol(entry.account.currency)}
                height="h-36"
                gradId={`${baseGradId}_${index}`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // ── All Accounts + combine OFF: single chart for primary account ────────────
  return renderSingle(primaryAccountId);
}
