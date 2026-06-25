import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

interface Trade {
  id: string;
  date: string;
  pnl: number;
  status: "win" | "loss" | "breakeven";
  actualR?: number | null;
}

export interface ReportPreviewProps {
  reportType: string;
  selectedStats: string[];
  dateRange: { from: Date | undefined; to: Date | undefined };
  trades: Trade[];
}

function StatCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold text-foreground", valueClass)}>{value}</p>
    </div>
  );
}

function ReportTooltip({
  active,
  payload,
  chartMode,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  chartMode: "pnl" | "r";
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as {
    fullDate: string;
    cumPnl: number;
    cumR: number;
    tradePnl: number;
    tradeR: number | null;
  };
  return (
    <div className="bg-card border border-border rounded-lg p-2.5 text-xs shadow-sm">
      <p className="font-medium text-foreground mb-1.5">{d.fullDate}</p>
      <p className="text-muted-foreground">
        Cumulative:{" "}
        {chartMode === "pnl" ? `£${d.cumPnl.toLocaleString()}` : `${d.cumR.toFixed(2)}R`}
      </p>
      <p className="text-muted-foreground">
        This trade:{" "}
        {chartMode === "pnl"
          ? `£${d.tradePnl.toFixed(2)}`
          : d.tradeR != null
            ? `${d.tradeR.toFixed(2)}R`
            : "—"}
      </p>
    </div>
  );
}

export function ReportPreview({ dateRange, trades }: ReportPreviewProps) {
  const [chartMode, setChartMode] = useState<"pnl" | "r">("pnl");

  const filtered = useMemo(() => {
    const today = new Date();
    const from = dateRange.from ?? subDays(today, 30);
    const to = dateRange.to ?? today;
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    return [...trades]
      .filter((t) => t.date >= fromStr && t.date <= toStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [trades, dateRange]);

  const metrics = useMemo(() => {
    const wins = filtered.filter((t) => t.status === "win");
    const losses = filtered.filter((t) => t.status === "loss");

    const totalTrades = filtered.length;
    const profitRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const posSum = wins.reduce((s, t) => s + t.pnl, 0);
    const negSum = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const profitFactor =
      posSum === 0 ? "0.00" : negSum === 0 ? "∞" : (posSum / negSum).toFixed(2);

    const avgWin = wins.length > 0 ? posSum / wins.length : 0;
    const avgLoss = losses.length > 0 ? negSum / losses.length : 0;
    const wr = profitRate / 100;
    const expectancy = wr * avgWin - (1 - wr) * avgLoss;

    const winR = wins.map((t) => t.actualR).filter((r): r is number => r != null);
    const lossRAbs = losses
      .map((t) => t.actualR)
      .filter((r): r is number => r != null)
      .map(Math.abs);
    const avgWinR = winR.length > 0 ? winR.reduce((s, r) => s + r, 0) / winR.length : 0;
    const avgLossR =
      lossRAbs.length > 0 ? lossRAbs.reduce((s, r) => s + r, 0) / lossRAbs.length : 1;
    const avgRR = avgWinR / avgLossR;

    const netPnl = filtered.reduce((s, t) => s + t.pnl, 0);

    let maxConsecWins = 0, maxConsecLosses = 0, curW = 0, curL = 0;
    for (const t of filtered) {
      if (t.status === "win") {
        curW++; maxConsecWins = Math.max(maxConsecWins, curW); curL = 0;
      } else if (t.status === "loss") {
        curL++; maxConsecLosses = Math.max(maxConsecLosses, curL); curW = 0;
      } else {
        curW = 0; curL = 0;
      }
    }

    return {
      totalTrades,
      profitRate,
      profitFactor,
      expectancy,
      avgRR,
      netPnl,
      maxConsecWins,
      maxConsecLosses,
    };
  }, [filtered]);

  const chartData = useMemo(() => {
    let cumPnl = 0;
    let cumR = 0;
    return filtered.map((t) => {
      cumPnl += t.pnl;
      cumR += t.actualR ?? 0;
      return {
        label: format(new Date(t.date + "T12:00:00"), "dd MMM"),
        fullDate: t.date,
        cumPnl: parseFloat(cumPnl.toFixed(2)),
        cumR: parseFloat(cumR.toFixed(2)),
        tradePnl: t.pnl,
        tradeR: t.actualR ?? null,
      };
    });
  }, [filtered]);

  if (filtered.length < 10) {
    return (
      <div className="pt-6 mt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center py-8">
          Not enough data yet — keep journaling
        </p>
      </div>
    );
  }

  return (
    <div className="pt-6 mt-6 border-t border-border space-y-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Preview
      </p>

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Trades" value={String(metrics.totalTrades)} />
        <StatCard label="Profit Rate" value={`${metrics.profitRate.toFixed(1)}%`} />
        <StatCard label="Profit Factor" value={metrics.profitFactor} />
        <StatCard
          label="Expectancy"
          value={`${metrics.expectancy >= 0 ? "+" : ""}£${metrics.expectancy.toFixed(0)}/trade`}
          valueClass={metrics.expectancy >= 0 ? "text-success" : "text-destructive"}
        />
        <StatCard label="Avg R:R" value={metrics.avgRR.toFixed(2)} />
        <StatCard
          label="Net P&L"
          value={`${metrics.netPnl >= 0 ? "+" : ""}£${metrics.netPnl.toLocaleString()}`}
          valueClass={metrics.netPnl >= 0 ? "text-success" : "text-destructive"}
        />
        <StatCard
          label="Max Consec. Wins"
          value={String(metrics.maxConsecWins)}
          valueClass="text-success"
        />
        <StatCard
          label="Max Consec. Losses"
          value={String(metrics.maxConsecLosses)}
          valueClass="text-destructive"
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">Equity Curve</p>
          <div className="flex items-center rounded-md border border-border bg-background p-0.5 gap-0.5">
            {(["pnl", "r"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setChartMode(m)}
                className={cn(
                  "px-2.5 py-1 rounded-[4px] text-xs font-medium transition-colors leading-none",
                  chartMode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "pnl" ? "£ P&L" : "R Multiple"}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  chartMode === "pnl" ? `£${v}` : `${v}R`
                }
              />
              <Tooltip
                content={(props) => (
                  <ReportTooltip
                    active={props.active}
                    payload={props.payload}
                    chartMode={chartMode}
                  />
                )}
              />
              <Line
                type="monotone"
                dataKey={chartMode === "pnl" ? "cumPnl" : "cumR"}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
