import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

// ✅ Calendar event modal wiring (dashboard → event details)
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents, type CalendarEvent } from "@/data/calendarEvents";

// ✅ Session details modal
import { SessionDetailsModal, type TradingSession } from "@/components/dashboard/SessionDetailsModal";

/* =========================================================
   SESSION SCHEDULE (UTC hours)
   ========================================================= */
const SESSION_SCHEDULE: {
  name: TradingSession["name"];
  region: string;
  accent: string;
  openUTC: number;
  closeUTC: number;
}[] = [
  { name: "Sydney", region: "Asia-Pacific", accent: "#2EC4B6", openUTC: 22, closeUTC: 7 },
  { name: "Asia", region: "Asia-Pacific Markets", accent: "#4361EE", openUTC: 0, closeUTC: 9 },
  { name: "London", region: "European", accent: "#F4D35E", openUTC: 7, closeUTC: 16 },
  { name: "New York", region: "US Markets", accent: "#F77F00", openUTC: 13, closeUTC: 22 },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function computeSessions(now: Date): TradingSession[] {
  const utcH = now.getUTCHours();
  const utcM = now.getUTCMinutes();
  const utcS = now.getUTCSeconds();
  const nowTotalSec = utcH * 3600 + utcM * 60 + utcS;

  return SESSION_SCHEDULE.map((sched) => {
    const openSec = sched.openUTC * 3600;
    const closeSec = sched.closeUTC * 3600;

    let isActive: boolean;
    let remainingSec: number;

    if (sched.openUTC < sched.closeUTC) {
      // Same-day session (e.g. London 07–16)
      isActive = nowTotalSec >= openSec && nowTotalSec < closeSec;
      if (isActive) {
        remainingSec = closeSec - nowTotalSec;
      } else {
        // Time until it opens
        remainingSec = nowTotalSec < openSec ? openSec - nowTotalSec : 86400 - nowTotalSec + openSec;
      }
    } else {
      // Overnight session (e.g. Sydney 22–07)
      isActive = nowTotalSec >= openSec || nowTotalSec < closeSec;
      if (isActive) {
        remainingSec = nowTotalSec >= openSec ? 86400 - nowTotalSec + closeSec : closeSec - nowTotalSec;
      } else {
        remainingSec = openSec - nowTotalSec;
        if (remainingSec < 0) remainingSec += 86400;
      }
    }

    const h = Math.floor(remainingSec / 3600);
    const m = Math.floor((remainingSec % 3600) / 60);
    const s = remainingSec % 60;
    const timeLabel = isActive
      ? `Closes in ${h}h ${pad2(m)}m ${pad2(s)}s`
      : `Opens in ${h}h ${pad2(m)}m ${pad2(s)}s`;

    return {
      name: sched.name,
      region: sched.region,
      status: isActive ? "active" : "closed",
      accent: sched.accent,
      opensAtLabel: `${pad2(sched.openUTC)}:00 GMT`,
      closesAtLabel: `${pad2(sched.closeUTC)}:00 GMT`,
      timeRemainingLabel: timeLabel,
      timeRemainingSeconds: remainingSec,
    } satisfies TradingSession;
  });
}

function getPrimarySession(sessions: TradingSession[]): TradingSession {
  const active = sessions.find((s) => s.status === "active");
  if (active) return active;
  // soonest upcoming
  return sessions.reduce((a, b) => (a.timeRemainingSeconds <= b.timeRemainingSeconds ? a : b));
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

  const openCalendarEvent = (ev: CalendarEvent) => {
    setSelectedCalendarEvent(ev);
    setIsEventModalOpen(true);
  };

  const closeCalendarEvent = () => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  };

  // ✅ Session modal state
  const [selectedSession, setSelectedSession] = useState<TradingSession | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  const openSessionModal = useCallback((session: TradingSession) => {
    setSelectedSession(session);
    setIsSessionModalOpen(true);
  }, []);

  const closeSessionModal = useCallback(() => {
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  }, []);

  // ✅ Live session countdown
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const sessions = useMemo(() => computeSessions(now), [now]);
  const primarySession = useMemo(() => getPrimarySession(sessions), [sessions]);

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

    // ✅ IMPORTANT: Force Upcoming Events to use the clickable implementation,
    // even if a central renderer exists for "upcoming-events".
    if (cardId === "upcoming-events") {
      const upcoming = calendarEvents
        .slice()
        .sort((a, b) => a.time.localeCompare(b.time))
        .slice(0, 4);

      return (
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">Upcoming Events</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/calendar")}
              disabled={isEditMode}
            >
              View all
            </Button>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {upcoming.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className="w-full text-left flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted transition-colors"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEditMode) return;
                    openCalendarEvent(ev);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-[54px] text-xs text-muted-foreground">{ev.time}</div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{ev.event}</span>
                      <span className="text-[11px] text-muted-foreground">{ev.currency}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      ev.impact === "high"
                        ? "bg-destructive/20 text-destructive"
                        : ev.impact === "medium"
                          ? "bg-warning/20 text-warning"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {ev.impact.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Otherwise use centralized renderers first
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

      case "next-session":
        return (
          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors h-full flex flex-col"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isEditMode) openSessionModal(primarySession);
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="text-2xl font-bold text-foreground">{primarySession.name}</div>
              <p className="text-xs text-muted-foreground mt-1">{primarySession.timeRemainingLabel}</p>
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

      case "session-timers":
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Session Timers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <button
                    key={session.name}
                    type="button"
                    className="relative w-full text-left p-3 bg-muted/50 rounded-lg border border-border overflow-hidden hover:bg-muted/70 transition-colors"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isEditMode) openSessionModal(session);
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 bottom-0 w-[3px]"
                      style={{ backgroundColor: session.accent }}
                    />
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm">{session.name}</div>
                        <div className="text-xs text-muted-foreground">{session.region}</div>
                      </div>
                      <div
                        className={`text-xs ${
                          session.status === "active" ? "text-success font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {session.timeRemainingLabel}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        );

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

      case "calendar-events":
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Week Ahead</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground min-w-[40px]">Mon</div>
                  <div className="text-sm text-foreground">FOMC Minutes</div>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto shrink-0" />
                </div>
                <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground min-w-[40px]">Wed</div>
                  <div className="text-sm text-foreground">CPI Data</div>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto shrink-0" />
                </div>
                <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground min-w-[40px]">Fri</div>
                  <div className="text-sm text-foreground">NFP Release</div>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto shrink-0" />
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

      <EventDetailsModal event={selectedCalendarEvent} isOpen={isEventModalOpen} onClose={closeCalendarEvent} />
      <SessionDetailsModal session={selectedSession} isOpen={isSessionModalOpen} onClose={closeSessionModal} />
    </div>
  );
}
