import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { calendarEvents, keyEvents, getCalendarEventById, type CalendarEvent } from "@/data/calendarEvents";

type ImpactFilter = "all" | "high" | "medium" | "low";
type DateRangeFilter = "today" | "week" | "month";
type CurrencyFilter = "all" | string;
type SortMode = "time" | "impact";
type VisibleCount = 6 | 10 | 20 | 999;

function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangeFilter>("today");
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>("high");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("impact");
  const [visibleCount, setVisibleCount] = useState<VisibleCount>(10);
  const [showAllEvents, setShowAllEvents] = useState(false);

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

  const getImpactWeight = (impact: CalendarEvent["impact"]) => {
    if (impact === "high") return 3;
    if (impact === "medium") return 2;
    return 1;
  };

  const parseTimeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
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

    if (dateRange === "today") {
      events = events;
    } else if (dateRange === "week") {
      events = events;
    } else if (dateRange === "month") {
      events = events;
    }

    events.sort((a, b) => {
      if (sortMode === "impact") {
        const impactDiff = getImpactWeight(b.impact) - getImpactWeight(a.impact);
        if (impactDiff !== 0) return impactDiff;
      }

      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });

    return events;
  }, [impactFilter, currencyFilter, dateRange, sortMode]);

  const filteredKeyEvents = useMemo(() => {
    const items = keyEvents.filter((keyEvent) => {
      if (impactFilter !== "all" && keyEvent.impact !== impactFilter) return false;
      if (currencyFilter !== "all" && keyEvent.currency !== currencyFilter) return false;
      return true;
    });

    return items.sort((a, b) => {
      if (sortMode === "impact") {
        const impactDiff = getImpactWeight(b.impact) - getImpactWeight(a.impact);
        if (impactDiff !== 0) return impactDiff;
      }

      return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });
  }, [impactFilter, currencyFilter, sortMode]);

  const visibleEvents = useMemo(() => {
    if (showAllEvents || visibleCount === 999) {
      return filteredEvents;
    }

    return filteredEvents.slice(0, visibleCount);
  }, [filteredEvents, showAllEvents, visibleCount]);

  const counts = useMemo(() => {
    return {
      total: filteredEvents.length,
      high: filteredEvents.filter((event) => event.impact === "high").length,
      medium: filteredEvents.filter((event) => event.impact === "medium").length,
      low: filteredEvents.filter((event) => event.impact === "low").length,
    };
  }, [filteredEvents]);

  useEffect(() => {
    const eventId = searchParams.get("eventId");
    if (!eventId) return;

    const match = getCalendarEventById(eventId) ?? null;
    if (!match) return;

    setHighlightedEventId(match.id);
    setShowAllEvents(true);

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
          <CardContent className="py-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeFilter)}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={impactFilter} onValueChange={(value) => setImpactFilter(value as ImpactFilter)}>
                <SelectTrigger className="w-[150px] h-9">
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
                <SelectTrigger className="w-[150px] h-9">
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

              <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="impact">Sort by Impact</SelectItem>
                  <SelectItem value="time">Sort by Time</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={String(visibleCount)}
                onValueChange={(value) => {
                  setVisibleCount(Number(value) as VisibleCount);
                  if (value !== "999") setShowAllEvents(false);
                }}
              >
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Show" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Show 6</SelectItem>
                  <SelectItem value="10">Show 10</SelectItem>
                  <SelectItem value="20">Show 20</SelectItem>
                  <SelectItem value="999">Show All</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" className="h-9" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Filters Active
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground border-t border-border pt-3">
              <span>
                <span className="text-foreground font-semibold">{counts.total}</span> visible
              </span>
              <span>
                <span className="text-foreground font-semibold">{counts.high}</span> high
              </span>
              <span>
                <span className="text-foreground font-semibold">{counts.medium}</span> medium
              </span>
              <span>
                <span className="text-foreground font-semibold">{counts.low}</span> low
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Key Events</CardTitle>
            <AddToDashboardButton isAdded={isUpcomingEventsAdded} onAdd={handleAddCard} onRemove={handleRemoveCard} />
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredKeyEvents.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                No key events match the selected filters.
              </div>
            ) : (
              filteredKeyEvents.slice(0, 4).map((event) => {
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

                    <div className="font-semibold text-sm">{event.event}</div>

                    <div className="mt-3">
                      <Badge variant="outline" className="text-xs">
                        {event.currency}
                      </Badge>
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Calendar</CardTitle>

            {filteredEvents.length > visibleEvents.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllEvents((prev) => !prev)}
                className="shrink-0"
              >
                {showAllEvents ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show More
                  </>
                )}
              </Button>
            )}
          </CardHeader>

          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Currency</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Previous</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Forecast</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Actual</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Impact</th>
                </tr>
              </thead>

              <tbody>
                {visibleEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No calendar events match the selected filters.
                    </td>
                  </tr>
                ) : (
                  visibleEvents.map((event) => (
                    <tr
                      key={event.id}
                      ref={(el) => setEventRef(event.id, el)}
                      onClick={() => openEvent(event)}
                      className={cn(
                        "border-b border-border cursor-pointer hover:bg-muted/40 transition-colors",
                        highlightedEventId === event.id && "bg-primary/10",
                      )}
                    >
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{event.time}</td>

                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {event.currency}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-sm font-medium text-foreground">{event.event}</td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{event.previous}</td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{event.forecast}</td>
                      <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{event.actual}</td>

                      <td className="px-4 py-3">
                        <Badge variant={getImpactVariant(event.impact)} className="text-xs">
                          {event.impact.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {filteredEvents.length > visibleEvents.length && !showAllEvents && visibleCount !== 999 && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={() => setShowAllEvents(true)}>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show all {filteredEvents.length} events
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EventDetailsModal event={selectedEvent} isOpen={isModalOpen} onClose={closeModal} />
    </div>
  );
}

export default Calendar;
