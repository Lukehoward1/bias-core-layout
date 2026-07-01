import { useEffect, useState } from "react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Sun, Moon, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSessionPlan } from "@/hooks/use-session-plans";
import { useJournalTrades } from "@/hooks/use-journal-trades";
import { getAllCalendarEvents } from "@/services/calendarData";
import type { CalendarEvent } from "@/data/calendarEvents";

// ── Economic events card ──────────────────────────────────────────────────────

const IMPACT_STYLES: Record<string, string> = {
  high:   "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
  low:    "bg-muted/40 text-muted-foreground border-border",
};

function EconomicEventsCard({ date }: { date: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const all = getAllCalendarEvents();
    setEvents(all.filter((e) => e.date === date).sort((a, b) => a.time.localeCompare(b.time)));
  }, [date]);

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground text-center">
        No economic events found for this date
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
      {events.map((e) => (
        <div key={e.id} className="flex items-center gap-3 px-3 py-2 text-xs bg-background hover:bg-muted/30 transition-colors">
          <span className="text-muted-foreground font-mono w-10 shrink-0">{e.time}</span>
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0 h-4 font-medium shrink-0 capitalize", IMPACT_STYLES[e.impact])}
          >
            {e.impact}
          </Badge>
          <span className="font-medium text-foreground flex-1 truncate">{e.event}</span>
          <span className="text-muted-foreground shrink-0 font-mono">{e.currency}</span>
          {e.actual !== "—" && (
            <span className="text-muted-foreground shrink-0">A: {e.actual}</span>
          )}
          {e.forecast !== "—" && (
            <span className="text-muted-foreground shrink-0">F: {e.forecast}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Day stats card ────────────────────────────────────────────────────────────

function DayStatsCard({ date }: { date: string }) {
  const { trades } = useJournalTrades();
  const dayTrades = trades.filter((t) => t.date === date);

  if (dayTrades.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs text-muted-foreground text-center">
        No trades recorded for this date
      </div>
    );
  }

  const totalPnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
  const wins = dayTrades.filter((t) => t.status === "win").length;
  const losses = dayTrades.filter((t) => t.status === "loss").length;
  const winRate = dayTrades.length > 0 ? Math.round((wins / dayTrades.length) * 100) : 0;
  const pnlPositive = totalPnl >= 0;

  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
        <p className="text-xs text-muted-foreground mb-1">Trades</p>
        <p className="text-lg font-bold text-foreground">{dayTrades.length}</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
        <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
        <p className="text-lg font-bold text-foreground">{winRate}%</p>
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
        <p className="text-xs text-muted-foreground mb-1">W / L</p>
        <p className="text-lg font-bold text-foreground">{wins} / {losses}</p>
      </div>
      <div className={cn("rounded-lg border p-3 text-center", pnlPositive ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10")}>
        <p className="text-xs text-muted-foreground mb-1">P&L</p>
        <p className={cn("text-lg font-bold", pnlPositive ? "text-success" : "text-destructive")}>
          {pnlPositive ? "+" : ""}£{totalPnl.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

function PlanTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
    />
  );
}

// ── Save indicator ────────────────────────────────────────────────────────────

function SaveIndicator({ status }: { status: "idle" | "saving" | "saved" }) {
  if (status === "idle") return null;
  return (
    <span className={cn("text-xs transition-opacity", status === "saving" ? "text-muted-foreground" : "text-success")}>
      {status === "saving" ? "Saving…" : "Saved"}
    </span>
  );
}

// ── Main tab component ────────────────────────────────────────────────────────

export function SessionPlanningTab() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    try { return localStorage.getItem("planning_date") ?? format(new Date(), "yyyy-MM-dd"); }
    catch { return format(new Date(), "yyyy-MM-dd"); }
  });

  useEffect(() => {
    try { localStorage.setItem("planning_date", selectedDate); } catch { /* ignore */ }
  }, [selectedDate]);

  const { plan, isLoading, saveStatus, updateField } = useSessionPlan(selectedDate);

  const goToPrev = () => setSelectedDate(format(subDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  const goToNext = () => setSelectedDate(format(addDays(parseISO(selectedDate), 1), "yyyy-MM-dd"));
  const goToToday = () => setSelectedDate(format(new Date(), "yyyy-MM-dd"));

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");
  const displayDate = format(parseISO(selectedDate), "EEEE, d MMMM yyyy");

  return (
    <div className="space-y-6">
      {/* Date navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[220px] text-center">{displayDate}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="outline" size="sm" className="h-7 text-xs ml-1" onClick={goToToday}>
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Autosaves as you type</span>
          <SaveIndicator status={saveStatus} />
        </div>
      </div>

      {/* Morning Plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sun className="h-4 w-4 text-yellow-500" />
            Morning Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Market Bias</Label>
            <PlanTextarea
              value={isLoading ? "" : plan.marketBias}
              onChange={(v) => updateField("marketBias", v)}
              placeholder="What's your read on the market today? Which way are you leaning and why?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Key Levels</Label>
            <PlanTextarea
              value={isLoading ? "" : plan.keyLevels}
              onChange={(v) => updateField("keyLevels", v)}
              placeholder="Support, resistance, or other levels you're watching today"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              Today's Economic Events
            </Label>
            <EconomicEventsCard date={selectedDate} />
          </div>
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">Post-Session</span>
        </div>
      </div>

      {/* Evening Reflection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="h-4 w-4 text-blue-400" />
            Post-Session Reflection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Reflection</Label>
            <PlanTextarea
              value={isLoading ? "" : plan.reflection}
              onChange={(v) => updateField("reflection", v)}
              placeholder="How did today go compared to your plan? What worked, what didn't?"
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Today's Trading Summary</Label>
            <DayStatsCard date={selectedDate} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
