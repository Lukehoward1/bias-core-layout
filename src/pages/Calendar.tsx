import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

import { calendarEvents, keyEvents, getCalendarEventById, type CalendarEvent } from "@/data/calendarEvents";

type ImpactFilter = "all" | "high" | "medium" | "low";
type DateRangeFilter = "today" | "week" | "month";
type CurrencyFilter = "all" | string;

function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangeFilter>("today");
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("all");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");

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
    if (el) {
      eventRefs.current.set(eventId, el);
    } else {
      eventRefs.current.delete(eventId);
    }
  }, []);

  const openEvent = useCallback((event: CalendarEvent | null) => {
    if (!event) return;

    setIsModalOpen(false);
    setSelectedEvent(null);

    requestAnimationFrame(() => {
      setSelectedEvent(event);
      setIsModalOpen(true);
    });
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  }, []);

  const getImpactVariant = (impact: CalendarEvent["impact"]) => {
    if (impact === "high") return "destructive";
    if (impact === "medium") return "default";
    return "secondary";
  };

  const availableCurrencies = useMemo(() => {
    return Array.from(new Set(calendarEvents.map((event) => event.currency))).sort();
  }, []);

  const filteredEvents = useMemo(() => {
    let events = [...calendarEvents];

    if (impactFilter !== "all") {
      events = events.filter((event) => event.impact === impactFilter);
    }

    if (currencyFilter !== "all") {
      events = events.filter((event) => event.currency === currencyFilter);
    }

    // For now all demo events are treated as current-period items,
    // but this keeps the filter structure ready for future API/date wiring.
    if (dateRange === "today") {
      return events;
    }

    if (dateRange === "week") {
      return events;
    }

    if (dateRange === "month") {
      return events;
    }

    return events;
  }, [impactFilter, currencyFilter, dateRange]);

  const filteredKeyEvents = useMemo(() => {
    return keyEvents.filter((keyEvent) => {
      if (impactFilter !== "all" && keyEvent.impact !== impactFilter) return false;
      if (currencyFilter !== "all" && keyEvent.currency !== currencyFilter) return false;
      return true;
    });
  }, [impactFilter, currencyFilter]);

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId) return;

    const match = getCalendarEventById(eventId) ?? null;
    if (!match) return;

    setHighlightedEventId(match.id);

    setTimeout(() => {
      eventRefs.current.get(match.id)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      openEvent(match);
    }, 100);

    setTimeout(() => {
      setHighlightedEventId(null);
    }, 3000);

    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, openEvent]);

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Calendar" />

      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-4 flex flex-wrap gap-3">
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeFilter)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={impactFilter} onValueChange={(value) => setImpactFilter(value as ImpactFilter)}>
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

            <Select value={currencyFilter} onValueChange={(value) => setCurrencyFilter(value as CurrencyFilter)}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                {availableCurrencies.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-9" disabled>
              <Filter className="h-4 w-4 mr-2" />
              Filters Active
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between">
            <CardTitle>Key Events</CardTitle>
            <AddToDashboardButton isAdded={isUpcomingEventsAdded} onAdd={handleAddCard} onRemove={handleRemoveCard} />
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredKeyEvents.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                No key events match the selected filters.
              </div>
            ) : (
              filteredKeyEvents.map((event) => {
                const fullEvent = getCalendarEventById(event.id) ?? null;

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
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {["Time", "Currency", "Event", "Previous", "Forecast", "Actual", "Impact"].map((heading) => (
                    <th key={heading} className="text-left px-4 py-2 text-xs text-muted-foreground">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No calendar events match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      ref={(el) => setEventRef(event.id, el)}
                      onClick={() => openEvent(event)}
                      className={cn(
                        "border-b cursor-pointer hover:bg-muted/50 transition-colors",
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
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <EventDetailsModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default Calendar;
