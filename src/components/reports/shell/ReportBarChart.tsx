// src/components/reports/shell/ReportBarChart.tsx
//
// Single-series bar chart for report chart cards — e.g. win rate by day of
// week on the Performance preset. Deliberately minimal (no grid lines) to
// match the document's restrained chart style.

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export interface ReportBarDatum {
  label: string;
  value: number;
  /** Optional per-bar color override — defaults to the primary brand color. */
  color?: string;
}

interface ReportBarChartProps {
  data: ReportBarDatum[];
  /** Appended to axis ticks and tooltip values, e.g. "%" or "h". */
  unit?: string;
  /** Overrides unit-suffix formatting entirely — use for currency, e.g. (v) => `£${v}`. */
  valueFormatter?: (value: number) => string;
  tooltipLabel?: string;
  height?: string;
  emptyMessage?: string;
}

export function ReportBarChart({
  data,
  unit = "",
  valueFormatter,
  tooltipLabel = "Value",
  height = "h-56 print:h-40",
  emptyMessage = "No data yet.",
}: ReportBarChartProps) {
  const formatValue = valueFormatter ?? ((v: number) => `${v}${unit}`);
  const hasData = data.some((d) => d.value !== 0) || data.length > 0;

  if (!hasData) {
    return (
      <div className={`${height} flex items-center justify-center`}>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => formatValue(v)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
            formatter={(value: number) => [formatValue(value), tooltipLabel]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? "hsl(var(--primary))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
