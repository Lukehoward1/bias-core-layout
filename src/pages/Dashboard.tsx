import React, { useMemo, useEffect, useState, useCallback } from "react";
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

import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents, type CalendarEvent } from "@/data/calendarEvents";

import { SessionDetailsModal, type TradingSession } from "@/components/dashboard/SessionDetailsModal";

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

  const [showAddCardsModal, setShowAddCardsModal] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  // ✅ Event modal state
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
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TradingSession | null>(null);

  const openSessionModal = useCallback((sessionName?: SessionName) => {
    const activeName = sessionsDataBase.find((s) => s.status === "active")?.name ?? "Asia";
    const pickName = sessionName ?? activeName;

    const base = sessionsDataBase.find((s) => s.name === pickName) ?? sessionsDataBase[1];
    setSelectedSession(buildDemoSession(base));
    setIsSessionModalOpen(true);
  }, []);

  const closeSessionModal = useCallback(() => {
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  }, []);

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

  useEffect(() => {
    const registryCardIds = DASHBOARD_CARD_REGISTRY.map((c) => c.id);
    warnMissingRenderers(registryCardIds);
  }, []);

  // ✅ robust click helper (prevents parent drag wrappers eating the click)
  const handleUpcomingEventActivate = useCallback(
    (ev: CalendarEvent, e?: any) => {
      if (e) {
        e.preventDefault?.();
        e.stopPropagation?.();
      }
      if (isEditMode) return;
      openCalendarEvent(ev);
    },
    [isEditMode, openCalendarEvent],
  );

  const renderCardContent = (
    cardEntry: DashboardCardEntry,
    slotType: "wide" | "narrow" | "equal" | "hero" | "kpi",
  ): React.ReactNode => {
    const renderer = getCardRenderer(cardEntry.id);
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

      case "next-session": {
        const active = sessionsDataBase.find((s) => s.status === "active") ?? sessionsDataBase[1];

        return (
          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors h-full flex flex-col"
            onClick={(e) => {
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
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <div className="text-2xl font-bold text-foreground">{active.name}</div>
              <p className="text-xs text-muted-foreground mt-1">Click session for details</p>
            </CardContent>
          </Card>
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

      // ✅ restore: performance card (fixes Unknown Card)
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

      // ✅ Upcoming events clickable → EventDetailsModal
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
                disabled={isEditMode}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isEditMode) return;
                  navigate("/calendar");
                }}
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
                    // ✅ pointerdown for drag-wrapper environments
                    onPointerDown={(e) => handleUpcomingEventActivate(ev, e)}
                    // ✅ click fallback
                    onClick={(e) => handleUpcomingEventActivate(ev, e)}
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
            onDragStart={(id) => setDraggingCardId(id)}
            onDragOver={(id) => draggingCardId && id !== draggingCardId && setDragOverCardId(id)}
            onDragEnd={() => {
              if (draggingCardId && dragOverCardId) {
                moveCard(draggingCardId, dragOverCardId);
              } else if (draggingCardId && dragOverRowId) {
                moveCardToRow(draggingCardId, dragOverRowId);
              }
              setDraggingCardId(null);
              setDragOverCardId(null);
              setDragOverRowId(null);
            }}
            onDragOverRow={(id) => draggingCardId && setDragOverRowId(id)}
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

      <SessionDetailsModal isOpen={isSessionModalOpen} onClose={closeSessionModal} session={selectedSession} />
    </div>
  );
}
