// src/components/shared/AccountAwareEquityChart.tsx
//
// Three-way equity chart:
//   1. Single account selected → single chart in account's currency
//   2. All Accounts + combine OFF → per-account mini-grid
//   3. All Accounts + combine ON → multi-series % return chart, one line per
//      account in its own colour. Currency-agnostic, so the Combine toggle is
//      always available (canCombine no longer gates it).
//
// `combined` and `canCombine` are retained in the props interface for caller
// compatibility but are no longer used by this component.

import { useId } from "react";
import { format, parseISO } from "date-fns";
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
  /** Retained for caller compatibility; no longer used by this component. */
  combined: AccountEntry | null;
  /** Retained for caller compatibility; no longer gates the Combine toggle. */
  canCombine: boolean;
  activeAccountId: string;
  /** Tailwind height class for single / combined chart, e.g. "h-56". Mini-grid always uses "h-36". */
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

// ── Multi-series % return chart (combine-on view) ─────────────────────────────

type MergedPoint = Record<string, number | string>;

interface MultiSeriesChartProps {
  accounts: [string, AccountEntry][];
  curveType: "absolute" | "relative";
  height: string;
  baseGradId: string;
}

function MultiSeriesChart({ accounts, curveType, height, baseGradId }: MultiSeriesChartProps) {
  // Per-account date→point maps for O(1) lookup; last point wins for dates
  // with multiple trades (possible on the absolute curve).
  const dateMaps = accounts.map(([, entry]) => {
    const curve = curveType === "absolute" ? entry.equityCurveAbsolute : entry.equityCurveRelative;
    const map = new Map<string, EquityPoint>();
    for (const pt of curve) {
      map.set(pt.date, pt);
    }
    return map;
  });

  // Union of all dates across all accounts, sorted ascending.
  const allDates = [...new Set(dateMaps.flatMap((m) => [...m.keys()]))].sort();

  // Build merged dataset: forward-fill each account's last known value onto
  // any date it doesn't have its own point for.
  const lastKnown = new Map<string, { pct: number; actual: number }>();
  const merged: MergedPoint[] = allDates.map((date) => {
    const row: MergedPoint = {
      date,
      formattedDate: format(parseISO(date), "MMM d"),
    };
    accounts.forEach(([accountId, entry], i) => {
      const pt = dateMaps[i].get(date);
      const startingBalance = entry.account.balance - entry.stats.totalPnl;
      if (pt !== undefined) {
        const cumulativePnl =
          curveType === "absolute" ? pt.equity - startingBalance : pt.equity;
        const pct =
          startingBalance !== 0 ? (cumulativePnl / startingBalance) * 100 : 0;
        lastKnown.set(accountId, { pct, actual: pt.equity });
      }
      const known = lastKnown.get(accountId);
      if (known !== undefined) {
        row[`${accountId}_pct`] = known.pct;
        row[`${accountId}_actual`] = known.actual;
      }
    });
    return row;
  });

  if (merged.length === 0) {
    return <p className="text-sm text-muted-foreground">No closed trades yet.</p>;
  }

  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={merged} margin={{ top: 5, right: 5, bottom: 5, left: 15 }}>
          <defs>
            {accounts.map(([accountId], index) => {
              const color = getAccountColor(index);
              return (
                <linearGradient
                  key={accountId}
                  id={`${baseGradId}_ms${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              );
            })}
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
            tickFormatter={(v: number) =>
              `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              const pctEntries = payload.filter(
                (p) => typeof p.dataKey === "string" && (p.dataKey as string).endsWith("_pct"),
              );
              if (pctEntries.length === 0) return null;
              return (
                <div
                  style={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: 12,
                  }}
                >
                  <p style={{ marginBottom: 4, color: "hsl(var(--muted-foreground))" }}>
                    {label}
                  </p>
                  {pctEntries.map((p) => {
                    const accountId = (p.dataKey as string).replace(/_pct$/, "");
                    const idx = accounts.findIndex(([id]) => id === accountId);
                    const entry = accounts[idx]?.[1];
                    const color = getAccountColor(idx);
                    const actual = Number(
                      (p.payload as MergedPoint)[`${accountId}_actual`],
                    );
                    const pct = Number(p.value);
                    const sym = currencySymbol(entry?.account.currency ?? "USD");
                    const sign = pct >= 0 ? "+" : "";
                    return (
                      <p key={accountId} style={{ color, margin: "2px 0" }}>
                        {shortAccountName(entry?.account.name ?? "")}: {sym}
                        {actual.toLocaleString()} ({sign}
                        {pct.toFixed(1)}%)
                      </p>
                    );
                  })}
                </div>
              );
            }}
          />
          {accounts.map(([accountId], index) => {
            const color = getAccountColor(index);
            return (
              <Area
                key={accountId}
                type="monotone"
                dataKey={`${accountId}_pct`}
                stroke={color}
                fill={`url(#${baseGradId}_ms${index})`}
                strokeWidth={2}
                isAnimationActive={false}
                dot={{ fill: color, strokeWidth: 0, r: 0 }}
                activeDot={{
                  fill: color,
                  strokeWidth: 2,
                  stroke: "hsl(var(--background))",
                  r: 4,
                }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AccountAwareEquityChart({
  perAccount,
  activeAccountId,
  chartHeight = "h-56",
  curveType = "relative",
}: AccountAwareEquityChartProps) {
  const [combineMode] = useAccountCombineMode();
  const isAllAccounts = activeAccountId === ACTIVE_ACCOUNT_ALL;
  const rawId = useId();
  const baseGradId = `aeGrad${rawId.replace(/:/g, "")}`;

  const pickCurve = (entry: AccountEntry) =>
    curveType === "absolute" ? entry.equityCurveAbsolute : entry.equityCurveRelative;

  // ── Single account ──────────────────────────────────────────────────────────
  if (!isAllAccounts) {
    const entry = perAccount.get(activeAccountId);
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
  }

  // Accounts with at least one data point — shared by both all-accounts branches.
  const nonEmpty = [...perAccount.entries()].filter(
    ([, e]) => pickCurve(e).length > 0,
  );

  // ── All accounts: combined % return view ────────────────────────────────────
  if (combineMode) {
    if (nonEmpty.length === 0) {
      return <p className="text-sm text-muted-foreground">No closed trades yet.</p>;
    }
    return (
      <MultiSeriesChart
        accounts={nonEmpty}
        curveType={curveType}
        height={chartHeight}
        baseGradId={baseGradId}
      />
    );
  }

  // ── All accounts: per-account mini-grid ────────────────────────────────────
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
