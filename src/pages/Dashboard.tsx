import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { useDashboardLayout, type DashboardCardEntry } from "@/hooks/use-dashboard-layout";
import { DashboardEditToolbar } from "@/components/dashboard/DashboardEditToolbar";
import { DashboardRow } from "@/components/dashboard/DashboardRow";
import { AddCardsModal } from "@/components/dashboard/AddCardsModal";
import { Button } from "@/components/ui/button";
import { getCardRenderer } from "@/data/dashboardCardRenderers";
import { DASHBOARD_CARD_REGISTRY } from "@/data/dashboardCardRegistry";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents, type CalendarEvent } from "@/data/calendarEvents";

export default function Dashboard() {
  const navigate = useNavigate();

  const [showAddCardsModal, setShowAddCardsModal] = useState(false);

  // ✅ Event modal state
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

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

  const renderCardContent = (cardEntry: DashboardCardEntry, slotType: "wide" | "narrow" | "equal" | "hero" | "kpi") => {
    const renderer = getCardRenderer(cardEntry.id);
    if (renderer) return renderer({ slotType });

    switch (cardEntry.id) {
      case "upcoming-events": {
        const upcoming = calendarEvents
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time))
          .slice(0, 3);

        return (
          <Card className="h-full">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              <Button
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

      case "next-session":
        return (
          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors h-full"
            onClick={() => {
              if (isEditMode) return;
              navigate("/alerts"); // keep your session modal routing logic
            }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Next Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">New York</div>
              <p className="text-xs text-muted-foreground mt-1">Live session</p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Dashboard" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Welcome, Trader</h1>

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
            draggingCardId={null}
            dragOverCardId={null}
            dragOverRowId={null}
            renderCardContent={renderCardContent}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDragEnd={() => {}}
            onDragOverRow={() => {}}
            onRemoveCard={removeCard}
            onChangeRowType={changeRowType}
            onMoveRow={moveRow}
            onRemoveRow={removeRow}
            onAddRow={addRow}
            maxSlots={getMaxSlots(row.type)}
          />
        ))}

        <AddCardsModal
          open={showAddCardsModal}
          onOpenChange={setShowAddCardsModal}
          cardsOnDashboard={cardsOnDashboardSet}
          onAddCard={addCard}
          onRemoveCard={removeCard}
        />
      </div>

      {/* ✅ Event Modal Mount */}
      <EventDetailsModal event={selectedCalendarEvent} isOpen={isEventModalOpen} onClose={closeCalendarEvent} />
    </div>
  );
}
