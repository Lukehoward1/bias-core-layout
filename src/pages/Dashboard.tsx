import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Clock,
  Calendar as CalendarIcon,
  Activity,
  AlertTriangle,
  BookOpen,
  Shield,
  Plus,
} from "lucide-react";
import { useDashboardLayout, type DashboardCardEntry } from "@/hooks/use-dashboard-layout";
import { DashboardEditToolbar } from "@/components/dashboard/DashboardEditToolbar";
import { DashboardRow } from "@/components/dashboard/DashboardRow";
import { AddCardsModal } from "@/components/dashboard/AddCardsModal";
import { WatchlistOverviewCard } from "@/components/dashboard/WatchlistOverviewCard";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { getCardRenderer, warnMissingRenderers } from "@/data/dashboardCardRenderers";
import { DASHBOARD_CARD_REGISTRY } from "@/data/dashboardCardRegistry";

import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents, type CalendarEvent } from "@/data/calendarEvents";

import { SessionDetailsModal, type TradingSession } from "@/components/dashboard/SessionDetailsModal";

type SessionName = TradingSession["name"];

const SESSION_SCHEDULE_UTC: Record<
  SessionName,
  { opensHour: number; opensMinute: number; closesHour: number; closesMinute: number; region: string; accent: string }
> = {
  Sydney: { opensHour: 22, opensMinute: 0, closesHour: 7, closesMinute: 0, region: "Asia-Pacific", accent: "#2EC4B6" },
  Asia: { opensHour: 0, opensMinute: 0, closesHour: 9, closesMinute: 0, region: "Asia", accent: "#4361EE" },
  London: { opensHour: 7, opensMinute: 0, closesHour: 16, closesMinute: 0, region: "Europe", accent: "#F4D35E" },
  "New York": { opensHour: 13, opensMinute: 0, closesHour: 22, closesMinute: 0, region: "US", accent: "#F77F00" },
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtGMT = (h: number, m: number) => `${pad2(h)}:${pad2(m)} GMT`;

const getTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
};

const addDaysUtc = (d: Date, days: number) => new Date(d.getTime() + days * 24 * 60 * 60 * 1000);

const makeUtcTime = (baseDayUtc: Date, hour: number, minute: number) =>
  new Date(Date.UTC(baseDayUtc.getUTCFullYear(), baseDayUtc.getUTCMonth(), baseDayUtc.getUTCDate(), hour, minute, 0));

const diffSeconds = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / 1000);

const formatCountdownLabel = (status: "active" | "closed", seconds: number) => {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = `${h}h ${m}m ${sec}s`;
  return status === "active" ? `Closes in ${label}` : `Opens in ${label}`;
};

function computeSessions(now: Date): TradingSession[] {
  const todayUtc = getTodayUtc();

  const names: SessionName[] = ["Sydney", "Asia", "London", "New York"];

  return names.map((name) => {
    const sched = SESSION_SCHEDULE_UTC[name];

    // sessions can span midnight (Sydney does)
    const opensToday = makeUtcTime(todayUtc, sched.opensHour, sched.opensMinute);
    const closesToday = makeUtcTime(todayUtc, sched.closesHour, sched.closesMinute);

    const spansMidnight = closesToday.getTime() <= opensToday.getTime();
    const closesAt = spansMidnight ? addDaysUtc(closesToday, 1) : closesToday;

    // Determine if active now:
    const isActive = now.getTime() >= opensToday.getTime() && now.getTime() < closesAt.getTime();

    // If not active, countdown to next open:
    const nextOpen = now.getTime() < opensToday.getTime() ? opensToday : addDaysUtc(opensToday, 1);
    const target = isActive ? closesAt : nextOpen;

    const remaining = diffSeconds(target, now);

    return {
      name,
      region: sched.region,
      accent: sched.accent,
      status: isActive ? "active" : "closed",
      opensAtLabel: fmtGMT(sched.opensHour, sched.opensMinute),
      closesAtLabel: fmtGMT(sched.closesHour, sched.closesMinute),
      timeRemainingSeconds: remaining,
      timeRemainingLabel: formatCountdownLabel(isActive ? "active" : "closed", remaining),
    };
  });
}

export default function Dashboard() {
  const [showAddCardsModal, setShowAddCardsModal] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const navigate = useNavigate();

  // ✅ Event modal state (Dashboard → EventDetailsModal)
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const openCalendarEvent = useCallback((ev: CalendarEvent) => {
    setSelectedCalendarEvent(ev);
    setIsEventModalOpen(true);
  }, []);

  const closeCalendarEvent = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  }, []);

  // ✅ Session modal state
  const [selectedSession, setSelectedSession] = useState<TradingSession | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  const openSessionModal = useCallback((s: TradingSession) => {
    setSelectedSession(s);
    setIsSessionModalOpen(true);
  }, []);

  const closeSessionModal = useCallback(() => {
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  }, []);

  // ✅ live time tick
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const sessions = useMemo(() => computeSessions(now), [now]);

  // Pick “current” session (active if any) else the soonest opening
  const primarySession = useMemo(() => {
    const active = sessions.find((s) => s.status === "active");
    if (active) return active;

    const sorted = [...sessions].sort((a, b) => a.timeRemainingSeconds - b.timeRemainingSeconds);
    return sorted[0] ?? sessions[0];
  }, [sessions]);

  // Row-based dashboard layout
  const {
    layout,
    isEditMode,
    toggleEditMode,
    addCard,
    addRow,
    changeRowType,
    removeRow,
    moveRow,
    removeCard,
    moveCard,
    moveCardToRow,
    resetToDefault,
    getMaxSlots,
  } = useDashboardLayout();

  // Compute set of card IDs on dashboard for modal
  const cardsOnDashboardSet = useMemo(() => {
    const ids = new Set<string>();
    layout.rows.forEach((row) => row.cards.forEach((card) => ids.add(card.id)));
    return ids;
  }, [layout]);

  const handleDragStart = (cardId: string) => setDraggingCardId(cardId);

  const handleDragOver = (cardId: string) => {
    if (draggingCardId && cardId !== draggingCardId) setDragOverCardId(cardId);
  };

  const handleDragOverRow = (rowId: string) => {
    if (draggingCardId) setDragOverRowId(rowId);
  };

  const handleDragEnd = () => {
    if (draggingCardId && dragOverCardId) moveCard(draggingCardId, dragOverCardId);
    else if (draggingCardId && dragOverRowId) moveCardToRow(draggingCardId, dragOverRowId);

    setDraggingCardId(null);
    setDragOverCardId(null);
    setDragOverRowId(null);
  };

  // Sample equity data for pinned journal equity card - must be before early return
  useMemo(() => {
    const sampleTrades = [
      { date: "2025-01-03", pnl: 450 },
      { date: "2025-01-06", pnl: 300 },
      { date: "2025-01-08", pnl: -400 },
      { date: "2025-01-10", pnl: 480 },
      { date: "2025-01-12", pnl: -400 },
      { date: "2025-01-13", pnl: -73 },
      { date: "2025-01-14", pnl: 1350 },
      { date: "2025-01-15", pnl: 600 },
    ];
    let cumulative = 0;
    return sampleTrades.map((t) => {
      cumulative += t.pnl;
      return {
        date: t.date,
        equity: cumulative,
        formattedDate: format(new Date(t.date), "MMM d"),
      };
    });
  }, []);

  useEffect(() => {
    const registryCardIds = DASHBOARD_CARD_REGISTRY.map((c) => c.id);
    warnMissingRenderers(registryCardIds);
  }, []);

  const renderCardContent = (
    cardEntry: DashboardCardEntry,
    slotType: "wide" | "narrow" | "equal" | "hero" | "kpi",
  ): React.ReactNode => {
    const cardId = cardEntry.id;

    const renderer = getCardRenderer(cardId);
    if (renderer) return renderer({ slotType });

    switch (cardEntry.id) {
      case "todays-bias":
        return (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Bias</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="text-2xl font-bold text-foreground">Bullish</div>
              <p className="text-xs text-muted-foreground mt-1">85% confidence</p>
            </CardContent>
          </Card>
        );

      case "active-trades":
        return (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Trades</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="text-2xl font-bold text-foreground">3</div>
              <p className="text-xs text-success mt-1">+$2,450 unrealized</p>
            </CardContent>
          </Card>
        );

      // ✅ Session Timer Card → live countdown + opens SessionDetailsModal
      case "next-session":
        return (
          <Card
            className={`h-full flex flex-col cursor-pointer hover:bg-muted/30 transition-colors ${isEditMode ? "cursor-default" : ""}`}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isEditMode) return;
              if (primarySession) openSessionModal(primarySession);
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="text-2xl font-bold text-foreground">{primarySession?.name ?? "—"}</div>
              <p className="text-xs text-muted-foreground mt-1">{primarySession?.timeRemainingLabel ?? "—"}</p>
            </CardContent>
          </Card>
        );

      case "high-impact-events":
        return (
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">High Impact</CardTitle>
              <CalendarIcon className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="text-2xl font-bold text-foreground">5</div>
              <p className="text-xs text-muted-foreground mt-1">Events today</p>
            </CardContent>
          </Card>
        );

      case "watchlist-overview":
        return <WatchlistOverviewCard isEditMode={isEditMode} slotType={slotType} />;

      // (kept as-is)
      case "session-timers":
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Session Timers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isEditMode) return;
                      openSessionModal(s);
                    }}
                    className="w-full text-left relative p-3 bg-muted/50 rounded-lg border border-border overflow-hidden hover:bg-muted/70 transition-colors"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: s.accent }} />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.region}</div>
                      </div>
                      <div
                        className={`text-xs ${s.status === "active" ? "text-success font-medium" : "text-muted-foreground"}`}
                      >
                        {s.timeRemainingLabel}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      // ✅ Upcoming events clickable (kept working)
      case "upcoming-events": {
        const upcoming = calendarEvents
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time))
          .slice(0, 4);

        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate("/calendar")}
                disabled={isEditMode}
              >
                View all
              </Button>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="space-y-2">
                {upcoming.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isEditMode) return;
                      openCalendarEvent(ev);
                    }}
                    className="w-full text-left flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="text-sm font-medium text-muted-foreground min-w-[56px]">{ev.time}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{ev.event}</div>
                      <div
                        className={`text-xs mt-1 ${
                          ev.impact === "high"
                            ? "text-destructive"
                            : ev.impact === "medium"
                              ? "text-accent"
                              : "text-muted-foreground"
                        }`}
                      >
                        {ev.impact.toUpperCase()} IMPACT
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      }

      case "performance-overview":
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className="text-lg font-bold text-success">+$8,240</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className="text-lg font-bold text-success">+$24,680</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-lg font-bold text-foreground">68%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Trades</span>
                  <span className="text-lg font-bold text-foreground">127</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "journal-summary":
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Journal Summary</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Entries This Week</span>
                  <span className="font-medium text-foreground">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Mood</span>
                  <span className="font-medium text-success">Positive</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Entry</span>
                  <span className="font-medium text-foreground">2h ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "risk-snapshot":
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Risk Snapshot</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Daily Drawdown</span>
                  <span className="font-medium text-foreground">1.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Max Position</span>
                  <span className="font-medium text-foreground">2.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Risk Status</span>
                  <span className="font-medium text-success">Healthy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card className="h-full border-warning/30 bg-warning/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-warning">Unknown Card</CardTitle>
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Card ID: {cardEntry.id}</p>
              <p className="text-xs text-muted-foreground">
                This card type is not recognized. Use Edit mode to remove it.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  const handleAddRow = (afterRowId?: string) => addRow("equal", afterRowId);

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Dashboard" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Welcome, Trader</h1>
            {isEditMode && (
              <p className="text-sm text-muted-foreground">
                Drag cards to reorder • Click × to remove • Change row layouts
              </p>
            )}
          </div>

          <DashboardEditToolbar
            isEditMode={isEditMode}
            onToggleEdit={toggleEditMode}
            onReset={resetToDefault}
            onOpenAddCards={() => setShowAddCardsModal(true)}
          />
        </div>

        {layout.rows.map((row, index) => (
          <DashboardRow
            key={row.id}
            row={row}
            rowIndex={index}
            totalRows={layout.rows.length}
            isEditMode={isEditMode}
            draggingCardId={draggingCardId}
            dragOverCardId={dragOverCardId}
            dragOverRowId={dragOverRowId}
            renderCardContent={renderCardContent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragOverRow={handleDragOverRow}
            onRemoveCard={removeCard}
            onChangeRowType={changeRowType}
            onMoveRow={moveRow}
            onRemoveRow={removeRow}
            onAddRow={handleAddRow}
            maxSlots={getMaxSlots(row.type)}
          />
        ))}

        {isEditMode && (
          <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => handleAddRow()}>
            <Plus className="h-4 w-4" />
            Add New Row
          </Button>
        )}

        {layout.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">No cards on your Dashboard.</p>
            <p className="text-sm text-muted-foreground">Click "Edit Dashboard" and then "Add Cards" to customize.</p>
          </div>
        )}
      </div>

      <AddCardsModal
        open={showAddCardsModal}
        onOpenChange={setShowAddCardsModal}
        cardsOnDashboard={cardsOnDashboardSet}
        onAddCard={addCard}
        onRemoveCard={removeCard}
      />

      {/* ✅ Event modal */}
      <EventDetailsModal event={selectedCalendarEvent} isOpen={isEventModalOpen} onClose={closeCalendarEvent} />

      {/* ✅ Session modal */}
      <SessionDetailsModal session={selectedSession} isOpen={isSessionModalOpen} onClose={closeSessionModal} />
    </div>
  );
}
