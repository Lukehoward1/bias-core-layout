import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { calendarEvents, keyEvents } from "@/data/calendarEvents";

type CalendarEvent = (typeof calendarEvents)[0];

function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const eventRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  const upcomingEventsCardId = "upcoming-events";
  const isUpcomingEventsAdded = isCardOnDashboard(upcomingEventsCardId);

  const handleAddCard = () => {
    addCard(upcomingEventsCardId);
    toast.success("Pinned to Dashboard");
  };

  const handleRemoveCard = () => {
    removeCard(upcomingEventsCardId);
    toast.success("Unpinned from Dashboard");
  };

  const setEventRef = useCallback((eventId: string, el: HTMLTableRowElement | null) => {
    if (el) eventRefs.current.set(eventId, el);
    else eventRefs.current.delete(eventId);
  }, []);

  /**
   * Always close current modal before opening another
   */
  const openEvent = useCallback((ev: CalendarEvent | null) => {
    if (!ev) return;

    setIsModalOpen(false);
    setSelectedEvent(null);

    requestAnimationFrame(() => {
      setSelectedEvent(ev);
      setIsModalOpen(true);
    });
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  /**
   * Deep-link support:
   * /calendar?eventId=xxx
   */
  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId) return;

    const match = calendarEvents.find((e) => e.id === eventId) ?? null;

    if (!match) return;

    setHighlightedEventId(match.id);

    setTimeout(() => {
      eventRefs.current.get(match.id)?.scrollIntoView({ behavior: "smooth", block: "center" });

      openEvent(match);
    }, 100);

    setTimeout(() => setHighlightedEventId(null), 3000);

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, openEvent]);

  const getImpactVariant = (impact: string) =>
    impact === "high" ? "destructive" : impact === "medium" ? "default" : "secondary";

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Calendar" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="py-4 flex flex-wrap gap-3">
            <Select defaultValue="today">
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Impact</SelectItem>
                <SelectItem value="high">High Impact</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="low">Low Impact</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </CardContent>
        </Card>

        {/* Key Events */}
        <Card>
          <CardHeader className="flex flex-row justify-between">
            <CardTitle>Key Events Today</CardTitle>
            <AddToDashboardButton isAdded={isUpcomingEventsAdded} onAdd={handleAddCard} onRemove={handleRemoveCard} />
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {keyEvents.map((event) => {
              const fullEvent = calendarEvents.find((e) => e.id === event.id) ?? null;

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEvent(fullEvent)}
                  className={cn(
                    "text-left p-4 rounded-lg border bg-muted/50 hover:bg-muted/70 transition-colors",
                    highlightedEventId === event.id && "ring-2 ring-primary",
                  )}
                >
                  <div className="flex justify-between mb-2">
                    <Badge variant={getImpactVariant(event.impact)}>{event.impact.toUpperCase()}</Badge>
                    <span className="text-sm text-muted-foreground">{event.time}</span>
                  </div>
                  <div className="font-semibold text-sm">{event.currency}</div>
                  <div className="text-xs text-muted-foreground">{event.event}</div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* All Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {["Time", "Currency", "Event", "Previous", "Forecast", "Actual", "Impact"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 text-xs text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {calendarEvents.map((event) => (
                  <tr
                    key={event.id}
                    ref={(el) => setEventRef(event.id, el)}
                    onClick={() => openEvent(event)}
                    className={cn(
                      "border-b cursor-pointer hover:bg-muted/50",
                      highlightedEventId === event.id && "bg-primary/10",
                    )}
                  >
                    <td className="px-4 py-2">{event.time}</td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{event.currency}</Badge>
                    </td>
                    <td className="px-4 py-2 font-medium">{event.event}</td>
                    <td className="px-4 py-2">{event.previous}</td>
                    <td className="px-4 py-2">{event.forecast}</td>
                    <td className="px-4 py-2">{event.actual}</td>
                    <td className="px-4 py-2">
                      <Badge variant={getImpactVariant(event.impact)}>{event.impact.toUpperCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Single authoritative event modal */}
      <EventDetailsModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default Calendar;
