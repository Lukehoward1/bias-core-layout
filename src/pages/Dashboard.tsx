// src/pages/Dashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

import { getCardRenderer, warnMissingRenderers } from "@/data/dashboardCardRenderers";
import { DASHBOARD_CARD_REGISTRY } from "@/data/dashboardCardRegistry";
import { cn } from "@/lib/utils";

import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents, type CalendarEvent } from "@/data/calendarEvents";

import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import { useTradingData } from "@/hooks/use-trading-data";

type TradingSessionName = "Sydney" | "Asia" | "London" | "New York";

type TradingSession = {
  name: TradingSessionName;
  region: string;
  status: "active" | "closed";
  accent: string;
  opensAtLabel: string;
  closesAtLabel: string;
  timeRemainingLabel: string;
  timeRemainingSeconds: number;
};

type DashboardSlotType = "wide" | "narrow" | "equal" | "hero" | "kpi" | "wide-narrow" | "three-equal" | "four-equal";

const buildSessions = (): TradingSession[] => [
  {
    name: "Sydney",
    region: "Asia-Pacific",
    status: "closed",
    accent: "#2EC4B6",
    opensAtLabel: "Opens 08:30",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 8 * 3600 + 30 * 60,
  },
  {
    name: "Asia",
    region: "Asia-Pacific Markets",
    status: "active",
    accent: "#4361EE",
    opensAtLabel: "—",
    closesAtLabel: "Closes 01:23",
    timeRemainingLabel: "Session closes in",
    timeRemainingSeconds: 1 * 3600 + 23 * 60 + 45,
  },
  {
    name: "London",
    region: "European",
    status: "closed",
    accent: "#F4D35E",
    opensAtLabel: "Opens 02:15",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 2 * 3600 + 15 * 60 + 30,
  },
  {
    name: "New York",
    region: "US Markets",
    status: "closed",
    accent: "#F77F00",
    opensAtLabel: "Opens 05:45",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 5 * 3600 + 45 * 60 + 12,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats } = useTradingData();

  const [showAddCardsModal, setShowAddCardsModal] = useState(false);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedSessionName, setSelectedSessionName] = useState<TradingSessionName>("Asia");

  const sessions = useMemo(() => buildSessions(), []);
  const selectedSession = useMemo(() => {
    const found = sessions.find((s) => s.name === selectedSessionName);
    return found ?? sessions.find((s) => s.status === "active") ?? sessions[0];
  }, [sessions, selectedSessionName]);

  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    if (!isSessionModalOpen) return;
    const t = window.setInterval(() => setSessionTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [isSessionModalOpen]);

  const selectedSessionWithTick = useMemo(() => {
    const dec = isSessionModalOpen ? sessionTick : 0;
    const next = Math.max(0, (selectedSession?.timeRemainingSeconds ?? 0) - dec);
    return { ...selectedSession, timeRemainingSeconds: next } as TradingSession;
  }, [selectedSession, sessionTick, isSessionModalOpen]);

  const openCalendarEvent = useCallback((ev: CalendarEvent) => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);

    requestAnimationFrame(() => {
      setSelectedCalendarEvent(ev);
      setIsEventModalOpen(true);
    });
  }, []);

  const closeCalendarEvent = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  }, []);

  const openSessionModal = useCallback(
    (name?: TradingSessionName) => {
      setIsSessionModalOpen(false);

      requestAnimationFrame(() => {
        if (name) {
          setSelectedSessionName(name);
        } else {
          const active = sessions.find((s) => s.status === "active")?.name ?? "Asia";
          setSelectedSessionName(active);
        }
        setIsSessionModalOpen(true);
      });
    },
    [sessions],
  );

  const closeSessionModal = useCallback(() => setIsSessionModalOpen(false), []);

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

  useEffect(() => {
    const registryCardIds = DASHBOARD_CARD_REGISTRY.map((c) => c.id);
    warnMissingRenderers(registryCardIds);
  }, []);

  const renderCardContent = (cardEntry: DashboardCardEntry, slotType: DashboardSlotType): React.ReactNode => {
    const cardId = cardEntry.id;

    if (cardId === "upcoming-events") {
      const upcoming = calendarEvents
        .slice()
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
        .slice(0, 4);

      return (
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Upcoming Events</CardTitle>

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

          <CardContent>
            <div className="space-y-3">
              {upcoming.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  disabled={isEditMode}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isEditMode) return;
                    openCalendarEvent(ev);
                  }}
                  className={cn(
                    "w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors",
                    "bg-muted/50 hover:bg-muted",
                    isEditMode && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <div className="min-w-[56px] text-sm font-medium text-muted-foreground">{ev.time}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{ev.event}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{ev.currency}</div>
                    <div
                      className={cn(
                        "text-xs mt-1 font-medium",
                        ev.impact === "high"
                          ? "text-destructive"
                          : ev.impact === "medium"
                            ? "text-accent"
                            : "text-muted-foreground",
                      )}
                    >
                      {(ev.impact || "low").toUpperCase()} IMPACT
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (cardId === "next-session") {
      const active = sessions.find((s) => s.status === "active")?.name ?? "Asia";

      return (
        <Card
          className={cn("h-full flex flex-col", !isEditMode && "cursor-pointer hover:bg-muted/30 transition-colors")}
          onClick={() => {
            if (isEditMode) return;
            openSessionModal(active);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (isEditMode) return;
            if (e.key === "Enter" || e.key === " ") openSessionModal(active);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            <div className="text-2xl font-bold text-foreground">{active}</div>
            <p className="text-xs text-muted-foreground mt-1">Click session for details</p>
          </CardContent>
        </Card>
      );
    }

    const renderer = getCardRenderer(cardId);
    if (renderer) {
      return renderer({ slotType });
    }

    switch (cardId) {
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

      case "performance-overview": {
        const weekPnl = stats.weekPnl ?? 0;
        const monthPnl = stats.monthPnl ?? 0;

        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <span className={`text-lg font-bold ${weekPnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {weekPnl >= 0 ? "+" : ""}£{Number(weekPnl).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <span className={`text-lg font-bold ${monthPnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {monthPnl >= 0 ? "+" : ""}£{Number(monthPnl).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-lg font-bold text-foreground">{stats.winRate ?? 0}%</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Trades</span>
                  <span className="text-lg font-bold text-foreground">{stats.totalTrades ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }

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

      <EventDetailsModal event={selectedCalendarEvent} isOpen={isEventModalOpen} onClose={closeCalendarEvent} />

      <SessionDetailsModal isOpen={isSessionModalOpen} onClose={closeSessionModal} session={selectedSessionWithTick} />
    </div>
  );
}
