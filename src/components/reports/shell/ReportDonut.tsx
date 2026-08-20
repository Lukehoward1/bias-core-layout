// src/components/reports/shell/ReportDonut.tsx
//
// Generic distribution donut for the report chart row — used for Win/Loss/
// Breakeven on the Overview preset, Long/Short on the Performance preset,
// and any future preset that needs a labeled-slice breakdown with a big
// figure in the center. Mirrors the "Asset Allocation" donut pattern from
// the reference tearsheet.

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface ReportDonutSlice {
  name: string;
  value: number;
  color: string;
}

interface ReportDonutProps {
  data: ReportDonutSlice[];
  /** Big figure shown in the center of the ring, e.g. "50%". */
  centerValue: string;
  /** Small uppercase label under the center figure, e.g. "Win Rate". */
  centerLabel: string;
  /** Shown when every slice is zero. */
  emptyMessage?: string;
  /** Unit label used in the tooltip, e.g. "trades". */
  unitLabel?: string;
}

export function ReportDonut({
  data: rawData,
  centerValue,
  centerLabel,
  emptyMessage = "No data yet.",
  unitLabel = "trades",
}: ReportDonutProps) {
  const data = rawData.filter((d) => d.value > 0);
  const total = rawData.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="h-52 print:h-40 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="98%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [`${value} ${unitLabel}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-foreground">{centerValue}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-3 print:mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {d.name} ({d.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
