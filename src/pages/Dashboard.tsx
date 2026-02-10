import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { calendarEvents } from "@/data/calendarEvents";
import { toast } from "sonner";

interface SessionData {
  name: string;
  time: string;
  status: string;
  accent: string;
  region: string;
}

const sessionsData: SessionData[] = [
  { name: "Sydney", time: "Opens in 8:30:00", status: "closed", accent: "#2EC4B6", region: "Asia-Pacific" },
  { name: "Asia", time: "Closes in 1:23:45", status: "active", accent: "#4361EE", region: "Asia-Pacific Markets" },
  { name: "London", time: "Opens in 2:15:30", status: "closed", accent: "#F4D35E", region: "European" },
  { name: "New York", time: "Opens in 5:45:12", status: "closed", accent: "#F77F00", region: "US Markets" },
];

// Local Session Timer Dropdown Component
function SessionTimerDropdown({
  isOpen,
  onClose,
  sessions,
  anchorRef,
}: {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionData[];
  anchorRef: React.RefObject<HTMLDivElement>;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node) &&
      anchorRef.current &&
      !anchorRef.current.contains(event.target as Node)
    ) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const activeSession = sessions.find((s) => s.status === "active");
  const upcomingSessions = sessions
    .filter((s) => s.status !== "active")
    .sort((a, b) => {
      return a.time.localeCompare(b.time);
    });

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg z-50"
    >
      <div className="p-3 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground mb-1">Current Session</p>
        {activeSession ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeSession.accent }} />
            <span className="font-medium text-foreground">{activeSession.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">{activeSession.time}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active session</p>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Upcoming Sessions</p>
        <div className="space-y-2">
          {upcomingSessions.map((session) => (
            <div
              key={session.name}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: session.accent }} />
              <span className="text-sm text-foreground">{session.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{session.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type CalendarEvent = (typeof calendarEvents)[0];

const impactStyles = (impact: string) => {
  const v = (impact || "").toLowerCase();
  if (v === "high") return "text-destructive";
  if (v === "medium") return "text-accent";
  return "text-muted-foreground";
};

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function Dashboard() {
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showAddCardsModal, setShowAddCardsModal] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const sessionCardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ✅ Event overlay state (for Dashboard clickable events)
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const openCalendarEvent = useCallback(
    (ev: CalendarEvent) => {
      if (!ev) return;
      setSelectedCalendarEvent(ev);
      setIsEventModalOpen(true);
    },
    [setSelectedCalendarEvent, setIsEventModalOpen],
  );

  const closeCalendarEvent = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
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

  // ✅ Upcoming events list (real calendarEvents, next 4)
  const upcomingCalendarItems = useMemo(() => {
    const toMinutes = (hhmm: string) => {
      const m = (hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return Number.MAX_SAFE_INTEGER;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    };

    return [...calendarEvents]
      .filter((ev) => !!ev?.time && !!ev?.event)
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
      .slice(0, 4);
  }, []);

  const findCalendarEventByLabel = useCallback((label: string, timeHHMM?: string) => {
    const lbl = normalize(label);
    const best = calendarEvents
      .map((ev) => {
        const evLabel = normalize(ev.event);
        let score = 0;
        if (evLabel === lbl) score += 6;
        if (evLabel.includes(lbl) || lbl.includes(evLabel)) score += 3;

        const lblTokens = new Set(lbl.split(" ").filter(Boolean));
        const evTokens = new Set(evLabel.split(" ").filter(Boolean));
        let overlap = 0;
        lblTokens.forEach((t) => {
          if (evTokens.has(t)) overlap += 1;
        });
        score += overlap;

        if (timeHHMM && ev.time === timeHHMM) score += 2;
        return { ev, score };
      })
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 3) return null;
    return best.ev as CalendarEvent;
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

      case "next-session":
        return (
          <div className="relative h-full" ref={sessionCardRef}>
            <Card
              className="cursor-pointer hover:bg-muted/30 transition-colors h-full flex flex-col"
              onClick={() => !isEditMode && setShowSessionDropdown(!showSessionDropdown)}
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
                <div className="text-2xl font-bold text-foreground">London</div>
                <p className="text-xs text-muted-foreground mt-1">Opens in 2h 15m</p>
              </CardContent>
            </Card>
            <SessionTimerDropdown
              isOpen={showSessionDropdown && !isEditMode}
              onClose={() => setShowSessionDropdown(false)}
              sessions={sessionsData}
              anchorRef={sessionCardRef}
            />
          </div>
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
                {sessionsData.map((session) => (
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
                        {session.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      // ✅ CLICKABLE → opens EventDetailsModal
      case "upcoming-events":
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingCalendarItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No upcoming events found.</div>
                ) : (
                  upcomingCalendarItems.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isEditMode) return;

                        // This is already a real calendar event, so just open it
                        openCalendarEvent(ev as any);
                      }}
                      className="w-full text-left flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="text-sm font-medium text-muted-foreground min-w-[56px]">{ev.time}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">
                          {ev.currency ? `${ev.currency} ` : ""}
                          {ev.event}
                        </div>
                        <div className={`text-xs mt-1 ${impactStyles(ev.impact)}`}>
                          {String(ev.impact).toUpperCase()} IMPACT
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Tip: Click any event to open the full event post (same overlay as Calendar).
              </p>
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

      // (Left as-is for now)
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
    <>
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
      </div>

      {/* ✅ Nested Calendar overlay (same template as Calendar page) */}
      <EventDetailsModal event={selectedCalendarEvent as any} isOpen={isEventModalOpen} onClose={closeCalendarEvent} />
    </>
  );
}
