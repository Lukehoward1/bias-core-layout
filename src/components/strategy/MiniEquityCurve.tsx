import { useMemo } from "react";
import { EquityPoint } from "@/types/strategySession";

interface MiniEquityCurveProps {
  data: EquityPoint[];
  height?: number;
}

export function MiniEquityCurve({ data, height = 60 }: MiniEquityCurveProps) {
  const pathData = useMemo(() => {
    if (data.length < 2) return "";

    const values = data.map((d) => d.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 100;
    const padding = 2;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((d.equity - min) / range) * chartHeight;
      return `${x},${y}`;
    });

    return `M${points.join(" L")}`;
  }, [data, height]);

  const areaPath = useMemo(() => {
    if (data.length < 2) return "";

    const values = data.map((d) => d.equity);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const width = 100;
    const padding = 2;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((d.equity - min) / range) * chartHeight;
      return `${x},${y}`;
    });

    return `M${padding},${height - padding} L${points.join(" L")} L${width - padding},${height - padding} Z`;
  }, [data, height]);

  const isPositive = data.length >= 2 && data[data.length - 1].equity >= data[0].equity;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop
            offset="0%"
            stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
            stopOpacity="0.3"
          />
          <stop
            offset="100%"
            stopColor={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#equityGradient)" />
      <path
        d={pathData}
        fill="none"
        stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
