import React, { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Clock,
  Calendar as CalendarIcon,
  Activity,
  ChevronDown,
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

// ✅ Session details modal (created via prompt)
import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";

// ✅ Infer the EXACT session type from the modal props (prevents union mismatch errors)
type TradingSession = NonNullable<React.ComponentProps<typeof SessionDetailsModal>["session"]>;
type SessionName = TradingSession["name"];

const sessionsDataBase: Array<{
  name: SessionName;
  region: string;
  status: "active" | "closed";
  accent: string;
}> = [
  { name: "Sydney", region: "Asia-Pacific", status: "closed", accent: "#2EC4B6" },
  { name: "Asia", region: "Asia-Pacific Markets", status: "active", accent: "#4361EE" },
  { name: "London", region: "European", status: "closed", accent: "#F4D35E" },
  { name: "New York", region: "US Markets", status: "closed", accent: "#F77F00" },
];

// Build a session object that matches TradingSession (no NaN)
const buildDemoSession = (s: (typeof sessionsDataBase)[number]): TradingSession => {
  const seconds = s.status === "active" ? 60 * 60 + 23 * 60 + 45 : 2 * 60 * 60 + 15 * 60 + 30;

  const opensAtLabel = s.status === "active" ? "—" : "Opens 08:30";
  const closesAtLabel = s.status === "active" ? "Closes 01:23" : "—";
  const timeRemainingLabel = s.status === "active" ? "Session closes in" : "Session opens in";

  return {
    name: s.name,
    region: s.region,
    status: s.status,
    accent: s.accent,
    opensAtLabel,
    closesAtLabel,
    timeRemainingLabel,
    timeRemainingSeconds: seconds,
  };
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showAddCardsModal, setShowAddCardsModal] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const sessionCardRef = useRef<HTMLDivElement>(null);

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

  // ✅ Session modal state (Dashboard → SessionDetailsModal)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TradingSession | null>(null);

  const openSessionModal = useCallback((sessionName?: SessionName) => {
    const activeName = sessionsDataBase.find((s) => s.status === "active")?.name ?? "Asia";
    const pickName = sessionName ?? activeName;

    const base = sessionsDataBase.find((s) => s.name === pickName) ?? sessionsDataBase[1];
    const built = buildDemoSession(base);

    setSelectedSession(built);
    setIsSessionModalOpen(true);
  }, []);

  const closeSessionModal = useCallback(() => {
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  }, []);

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

  const handleDragStart = (cardId: string) => {
    setDraggingCardId(cardId);
  };

  const handleDragOver = (cardId: string) => {
    if (draggingCardId && cardId !== draggingCardId) {
      setDragOverCardId(cardId);
    }
  };

  const handleDragOverRow = (rowId: string) => {
    if (draggingCardId) {
      setDragOverRowId(rowId);
    }
  };

  const handleDragEnd = () => {
    if (draggingCardId && dragOverCardId) {
      moveCard(draggingCardId, dragOverCardId);
    } else if (draggingCardId && dragOverRowId) {
      moveCardToRow(draggingCardId, dragOverRowId);
    }
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

  // Developer check: warn about missing renderers at mount
  useEffect(() => {
    const registryCardIds = DASHBOARD_CARD_REGISTRY.map((c) => c.id);
    warnMissingRenderers(registryCardIds);
  }, []);

  // Render card content based on card ID and slot type
  const renderCardContent = (
    cardEntry: DashboardCardEntry,
    slotType: "wide" | "narrow" | "equal" | "hero" | "kpi",
  ): React.ReactNode => {
    const cardId = cardEntry.id;

    // First, try the centralized renderer (covers pinned and registry cards)
    const renderer = getCardRenderer(cardId);
    if (renderer) {
      return renderer({ slotType });
    }

    // Handle default dashboard-native cards (legacy hardcoded)
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

      // ✅ Next Session now opens SessionDetailsModal (no routing away)
      case "next-session": {
        const active = sessionsDataBase.find((s) => s.status === "active") ?? sessionsDataBase[1];

        return (
          <div className="relative h-full" ref={sessionCardRef}>
            <Card
              className="cursor-pointer hover:bg-muted/30 transition-colors h-full flex flex-col"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isEditMode) return;
                openSessionModal(active.name);
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-accent" />
                  <ChevronDown
                    className={`h-3 w-3 text-muted-foreground transition-transform ${showSessionDropdown ? "rotate-180" : ""}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div className="text-2xl font-bold text-foreground">{active.name}</div>
                <p className="text-xs text-muted-foreground mt-1">Click session for details</p>
              </CardContent>
            </Card>
          </div>
        );
      }

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
                {sessionsDataBase.map((session) => (
                  <div
                    key={session.name}
                    className="relative p-3 bg-muted/50 rounded-lg border border-border overflow-hidden"
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
                        className={`text-xs ${session.status === "active" ? "text-success font-medium" : "text-muted-foreground"}`}
                      >
                        {session.status === "active"
                          ? "Closes 1:23"
                          : session.name === "London"
                            ? "Opens 2:15"
                            : session.name === "New York"
                              ? "Opens 5:45"
                              : "Opens 8:30"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      // ✅ Upcoming events clickable and opens EventDetailsModal
      case "upcoming-events": {
        const upcoming = calendarEvents
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time))
          .slice(0, 4);

        return (
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isEditMode) return;
                  navigate("/calendar");
                }}
                disabled={isEditMode}
              >
                View all
              </Button>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className="w-full text-left flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isEditMode) return;
                      openCalendarEvent(ev);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-sm font-medium text-muted-foreground min-w-[56px]">{ev.time}</div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{ev.event}</div>
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
                    </div>

                    <div className="text-xs text-muted-foreground shrink-0">{ev.currency}</div>
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
                  <span className="text-lg font-bold text-foreground">127%</span>
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

  const handleAddRow = (afterRowId?: string) => {
    addRow("equal", afterRowId);
  };

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Dashboard" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header with Edit Controls */}
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

        {/* Row-based layout */}
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
            onDragStart={(id) => setDraggingCardId(id)}
            onDragOver={(id) => draggingCardId && id !== draggingCardId && setDragOverCardId(id)}
            onDragEnd={handleDragEnd}
            onDragOverRow={(id) => draggingCardId && setDragOverRowId(id)}
            onRemoveCard={removeCard}
            onChangeRowType={changeRowType}
            onMoveRow={moveRow}
            onRemoveRow={removeRow}
            onAddRow={handleAddRow}
            maxSlots={getMaxSlots(row.type)}
          />
        ))}

        {/* Add row button in edit mode */}
        {isEditMode && (
          <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => handleAddRow()}>
            <Plus className="h-4 w-4" />
            Add New Row
          </Button>
        )}

        {/* Empty state when no cards */}
        {layout.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">No cards on your Dashboard.</p>
            <p className="text-sm text-muted-foreground">Click "Edit Dashboard" and then "Add Cards" to customize.</p>
          </div>
        )}
      </div>

      {/* Add Cards Modal */}
      <AddCardsModal
        open={showAddCardsModal}
        onOpenChange={setShowAddCardsModal}
        cardsOnDashboard={cardsOnDashboardSet}
        onAddCard={addCard}
        onRemoveCard={removeCard}
      />

      {/* ✅ Event modal mount */}
      <EventDetailsModal event={selectedCalendarEvent} isOpen={isEventModalOpen} onClose={closeCalendarEvent} />

      {/* ✅ Session modal mount */}
      <SessionDetailsModal isOpen={isSessionModalOpen} onClose={closeSessionModal} session={selectedSession} />
    </div>
  );
}
