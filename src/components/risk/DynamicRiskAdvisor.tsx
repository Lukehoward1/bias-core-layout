import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { useLinkedAccounts } from "@/hooks/use-linked-accounts";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import { cn } from "@/lib/utils";
import type { Trade } from "@/hooks/use-journal-trades";

const RISK_STORAGE_KEY = "globalRiskPreset";
const MIN_TRADES = 20;

const SESSIONS = ["Asia", "London", "London-NY Overlap", "New York"] as const;
type SessionName = typeof SESSIONS[number];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
type DayName = typeof DAYS[number];

function getSession(entryTime: string | undefined): SessionName | null {
  if (!entryTime) return null;
  const parts = entryTime.split(":");
  const hour = parseInt(parts[0] ?? "", 10);
  const minute = parseInt(parts[1] ?? "0", 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const mins = hour * 60 + minute;
  if (mins < 9 * 60) return "Asia";
  if (mins < 12 * 60) return "London";
  if (mins < 17 * 60) return "London-NY Overlap";
  if (mins < 21 * 60) return "New York";
  return null;
}

function getDayName(dateStr: string): DayName | null {
  // Parse as noon local to avoid timezone boundary shifts
  const d = new Date(dateStr + "T12:00:00");
  const dayMap: Record<number, DayName> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
  };
  return dayMap[d.getDay()] ?? null;
}

interface SegmentStats {
  count: number;
  profitRate: number; // 0-100
  avgR: number | null;
  profitFactor: number | null; // Infinity when no losses
}

function computeStats(trades: Trade[]): SegmentStats {
  const count = trades.length;
  if (count === 0) return { count: 0, profitRate: 0, avgR: null, profitFactor: null };

  const wins = trades.filter((t) => t.status === "win").length;
  const profitRate = (wins / count) * 100;

  const rValues = trades
    .map((t) => t.actualR)
    .filter((r): r is number => r != null);
  const avgR = rValues.length > 0
    ? rValues.reduce((s, r) => s + r, 0) / rValues.length
    : null;

  let posSum = 0;
  let negSum = 0;
  for (const t of trades) {
    const p = t.pnl ?? 0;
    if (p > 0) posSum += p;
    else if (p < 0) negSum += Math.abs(p);
  }
  const profitFactor = negSum > 0 ? posSum / negSum : posSum > 0 ? Infinity : null;

  return { count, profitRate, avgR, profitFactor };
}

type Direction = "up" | "down" | "same";

interface Recommendation {
  pct: number;
  direction: Direction;
}

function getRecommendation(
  seg: SegmentStats,
  overall: SegmentStats,
  baseRisk: number,
): Recommendation {
  const profitRateDiff = seg.profitRate - overall.profitRate;

  const avgRBetter =
    seg.avgR != null && overall.avgR != null
      ? seg.avgR > overall.avgR
      : false;

  const avgRMuchWorse =
    seg.avgR != null && overall.avgR != null
      ? seg.avgR < overall.avgR * 0.7
      : false;

  if (profitRateDiff > 10 && avgRBetter) {
    return { pct: Math.round(baseRisk * 1.5 * 10) / 10, direction: "up" };
  }
  if (profitRateDiff < -10 || avgRMuchWorse) {
    return { pct: Math.round(baseRisk * 0.5 * 10) / 10, direction: "down" };
  }
  return { pct: baseRisk, direction: "same" };
}

function fmtPct(n: number) {
  return n.toFixed(1) + "%";
}

function fmtR(n: number | null) {
  if (n == null) return "—";
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "R";
}

function fmtPF(n: number | null) {
  if (n == null) return "—";
  if (!Number.isFinite(n)) return "∞";
  return n.toFixed(2);
}

interface SegmentRow {
  label: string;
  stats: SegmentStats;
  rec: Recommendation | null; // null = insufficient data
}

function RiskCell({ rec, baseRisk }: { rec: Recommendation | null; baseRisk: number }) {
  if (rec === null) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Not enough data — keep journaling
      </span>
    );
  }
  const { pct, direction } = rec;
  return (
    <span
      className={cn(
        "font-semibold text-sm",
        direction === "up" && "text-emerald-500",
        direction === "down" && "text-destructive",
        direction === "same" && "text-muted-foreground",
      )}
    >
      {fmtPct(pct)}
      {direction === "up" && <TrendingUp className="inline h-3 w-3 ml-1" />}
      {direction === "down" && <TrendingDown className="inline h-3 w-3 ml-1" />}
      {direction === "same" && <Minus className="inline h-3 w-3 ml-1" />}
    </span>
  );
}

function SegmentTable({
  rows,
  overall,
  baseRisk,
}: {
  rows: SegmentRow[];
  overall: SegmentStats;
  baseRisk: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-0 text-xs">Segment</TableHead>
          <TableHead className="text-xs text-right">Trades</TableHead>
          <TableHead className="text-xs text-right">Profit Rate</TableHead>
          <TableHead className="text-xs text-right">Avg R</TableHead>
          <TableHead className="text-xs text-right">Profit Factor</TableHead>
          <TableHead className="text-xs text-right">Recommended Risk</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Overall row */}
        <TableRow className="bg-muted/30">
          <TableCell className="pl-0 py-2">
            <span className="text-xs font-semibold text-foreground">Overall</span>
          </TableCell>
          <TableCell className="text-xs text-right py-2">{overall.count}</TableCell>
          <TableCell className="text-xs text-right py-2">{fmtPct(overall.profitRate)}</TableCell>
          <TableCell className="text-xs text-right py-2">{fmtR(overall.avgR)}</TableCell>
          <TableCell className="text-xs text-right py-2">{fmtPF(overall.profitFactor)}</TableCell>
          <TableCell className="text-xs text-right py-2">
            <span className="text-muted-foreground font-medium">Base ({fmtPct(baseRisk)})</span>
          </TableCell>
        </TableRow>

        {rows.map(({ label, stats, rec }) => (
          <TableRow key={label}>
            <TableCell className="pl-0 py-2">
              <span className="text-sm">{label}</span>
            </TableCell>
            <TableCell className="text-xs text-right py-2">{stats.count}</TableCell>
            <TableCell className="text-xs text-right py-2">
              {stats.count > 0 ? fmtPct(stats.profitRate) : "—"}
            </TableCell>
            <TableCell className="text-xs text-right py-2">
              {stats.count > 0 ? fmtR(stats.avgR) : "—"}
            </TableCell>
            <TableCell className="text-xs text-right py-2">
              {stats.count > 0 ? fmtPF(stats.profitFactor) : "—"}
            </TableCell>
            <TableCell className="text-right py-2">
              <RiskCell rec={rec} baseRisk={baseRisk} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export interface DynamicRiskAdvisorProps {
  isAdded?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function DynamicRiskAdvisor({
  isAdded,
  onAdd,
  onRemove,
  compact = false,
}: DynamicRiskAdvisorProps) {
  const { accounts } = useLinkedAccounts();
  const accountIds = useMemo(() => accounts.map((a) => a.id), [accounts]);
  const { trades } = useJournalTrades(accountIds);

  const [baseRisk, setBaseRisk] = useState<number>(1);

  useEffect(() => {
    const raw = localStorage.getItem(RISK_STORAGE_KEY);
    if (raw) {
      const n = parseFloat(raw);
      if (Number.isFinite(n) && n > 0) setBaseRisk(n);
    }
  }, []);

  const overall = useMemo(() => computeStats(trades), [trades]);

  const sessionRows = useMemo<SegmentRow[]>(() => {
    return SESSIONS.map((session) => {
      const filtered = trades.filter((t) => getSession(t.entryTime) === session);
      const stats = computeStats(filtered);
      const rec = stats.count >= MIN_TRADES
        ? getRecommendation(stats, overall, baseRisk)
        : null;
      return { label: session, stats, rec };
    });
  }, [trades, overall, baseRisk]);

  const setupRows = useMemo<SegmentRow[]>(() => {
    const setupNames = [
      ...new Set(
        trades.map((t) => t.setup).filter((s): s is string => !!s),
      ),
    ].sort();

    return setupNames.map((setup) => {
      const filtered = trades.filter((t) => t.setup === setup);
      const stats = computeStats(filtered);
      const rec = stats.count >= MIN_TRADES
        ? getRecommendation(stats, overall, baseRisk)
        : null;
      return { label: setup, stats, rec };
    });
  }, [trades, overall, baseRisk]);

  const dayRows = useMemo<SegmentRow[]>(() => {
    return DAYS.map((day) => {
      const filtered = trades.filter((t) => getDayName(t.date) === day);
      const stats = computeStats(filtered);
      const rec = stats.count >= MIN_TRADES
        ? getRecommendation(stats, overall, baseRisk)
        : null;
      return { label: day, stats, rec };
    });
  }, [trades, overall, baseRisk]);

  // Top insight across all segments (for compact view and header badge)
  const topInsight = useMemo(() => {
    const allRows = [...sessionRows, ...setupRows, ...dayRows];
    const withRec = allRows.filter((r) => r.rec !== null);
    const best = withRec
      .filter((r) => r.rec!.direction === "up")
      .sort((a, b) => b.rec!.pct - a.rec!.pct)[0];
    const worst = withRec
      .filter((r) => r.rec!.direction === "down")
      .sort((a, b) => a.rec!.pct - b.rec!.pct)[0];
    return { best, worst };
  }, [sessionRows, setupRows, dayRows]);

  const hasEnoughData = overall.count >= MIN_TRADES;

  if (compact) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Dynamic Risk Advisor</CardTitle>
            </div>
            {onAdd && onRemove && (
              <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!hasEnoughData ? (
            <p className="text-xs text-muted-foreground">
              Journal at least {MIN_TRADES} trades to unlock personalised recommendations.
            </p>
          ) : topInsight.best ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="text-xs text-foreground">
                  <span className="font-semibold">{topInsight.best.label}</span>
                  {" — risk up to "}
                  <span className="text-emerald-500 font-semibold">
                    {fmtPct(topInsight.best.rec!.pct)}
                  </span>
                </span>
              </div>
              {topInsight.worst && (
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span className="text-xs text-foreground">
                    <span className="font-semibold">{topInsight.worst.label}</span>
                    {" — reduce to "}
                    <span className="text-destructive font-semibold">
                      {fmtPct(topInsight.worst.rec!.pct)}
                    </span>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Edge is uniform — stick with your base risk of {fmtPct(baseRisk)}.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Dynamic Risk Advisor</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Personalised risk recommendations based on your trading history
              </p>
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              Base {fmtPct(baseRisk)}
            </Badge>
          </div>
          {onAdd && onRemove && (
            <AddToDashboardButton isAdded={isAdded || false} onAdd={onAdd} onRemove={onRemove} />
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!hasEnoughData ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Brain className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-foreground">Not enough data yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add at least {MIN_TRADES} trades to your journal to unlock personalised
                recommendations.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {overall.count} / {MIN_TRADES} trades logged
              </p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="sessions">
            <TabsList className="h-8 gap-1 mb-4">
              <TabsTrigger value="sessions" className="text-xs px-3 h-6">
                Sessions
              </TabsTrigger>
              <TabsTrigger value="setups" className="text-xs px-3 h-6">
                Setups
              </TabsTrigger>
              <TabsTrigger value="days" className="text-xs px-3 h-6">
                Days
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="mt-0">
              <SegmentTable rows={sessionRows} overall={overall} baseRisk={baseRisk} />
            </TabsContent>

            <TabsContent value="setups" className="mt-0">
              {setupRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No setups assigned yet. Tag your trades with a setup in the Journal to see
                  breakdown here.
                </p>
              ) : (
                <SegmentTable rows={setupRows} overall={overall} baseRisk={baseRisk} />
              )}
            </TabsContent>

            <TabsContent value="days" className="mt-0">
              <SegmentTable rows={dayRows} overall={overall} baseRisk={baseRisk} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
