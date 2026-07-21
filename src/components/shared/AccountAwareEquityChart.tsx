// src/components/shared/AccountAwareEquityChart.tsx
//
// Three-way equity chart:
//   1. Single account selected → single chart in account's currency
//   2. All Accounts + combine OFF (or currencies differ) → per-account mini-grid
//   3. All Accounts + combine ON + canCombine → single combined chart
//
// The Combine toggle is only shown when canCombine=true.

import { useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ACTIVE_ACCOUNT_ALL,
  useAccountCombineMode,
} from "@/hooks/use-active-trading-account";
import { getAccountColor } from "@/lib/account-colors";
import { currencySymbol } from "@/lib/currency";
import type { AccountEntry, EquityPoint } from "@/hooks/use-account-aware-stats";

interface AccountAwareEquityChartProps {
  perAccount: Map<string, AccountEntry>;
  combined: AccountEntry | null;
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

// ── Combine toggle ────────────────────────────────────────────────────────────

function CombineToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-2 mb-2">
      <Label htmlFor="combine-accounts-toggle" className="text-xs text-muted-foreground cursor-pointer">
        Combine accounts
      </Label>
      <Switch
        id="combine-accounts-toggle"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AccountAwareEquityChart({
  perAccount,
  combined,
  canCombine,
  activeAccountId,
  chartHeight = "h-56",
  curveType = "relative",
}: AccountAwareEquityChartProps) {
  const [combineMode, setCombineMode] = useAccountCombineMode();
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

  // ── All accounts: combined view ─────────────────────────────────────────────
  if (combineMode && canCombine && combined) {
    const data = pickCurve(combined);
    return (
      <div>
        <CombineToggle checked={combineMode} onCheckedChange={setCombineMode} />
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No closed trades yet.</p>
        ) : (
          <SingleChart
            data={data}
            color="hsl(var(--primary))"
            sym={currencySymbol(combined.account.currency)}
            height={chartHeight}
            gradId={baseGradId}
          />
        )}
      </div>
    );
  }

  // ── All accounts: per-account mini-grid ────────────────────────────────────
  const nonEmpty = [...perAccount.entries()].filter(
    ([, e]) => pickCurve(e).length > 0,
  );

  return (
    <div>
      {canCombine && (
        <CombineToggle checked={combineMode} onCheckedChange={setCombineMode} />
      )}
      {nonEmpty.length === 0 ? (
        <p className="text-sm text-muted-foreground">No closed trades yet.</p>
      ) : (
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
                <p className="text-xs font-medium mb-1" style={{ color }}>
                  {entry.account.name}
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
      )}
    </div>
  );
}
