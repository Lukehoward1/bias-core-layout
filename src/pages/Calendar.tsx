import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Filter, ChevronDown, ChevronUp, CalendarDays, Sparkles, BarChart3, RefreshCw, Clock } from "lucide-react";

import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import type { CalendarEvent } from "@/data/calendarEvents";
import {
  getAllCalendarEvents,
  getAvailableCalendarCurrencies,
  getCalendarCounts,
  getCalendarEventOrNullById,
  getEventDateLabel,
  getFilteredCalendarEvents,
  getNextKeyEvents,
  isCalendarLoading,
  isCalendarLiveDataAvailable,
  type CalendarDateRange,
  type CalendarSortMode,
} from "@/services/calendarData";

type ImpactFilter = "all" | "high" | "medium" | "low";
type CurrencyFilter = "all" | string;
type VisibleCount = 6 | 10 | 20 | 999;

const CALENDAR_FILTERS_KEY = "cal-filters-v1";
type SavedCalendarFilters = {
  dateRange?: CalendarDateRange;
  impactFilter?: ImpactFilter;
  currencyFilter?: CurrencyFilter;
  sortMode?: CalendarSortMode;
  visibleCount?: VisibleCount;
};
function readCalendarFilters(): SavedCalendarFilters | null {
  try {
    const raw = sessionStorage.getItem(CALENDAR_FILTERS_KEY);
    return raw ? (JSON.parse(raw) as SavedCalendarFilters) : null;
  } catch { return null; }
}

function Calendar() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const savedFilters = useRef(readCalendarFilters()).current;
  const [dateRange, setDateRange] = useState<CalendarDateRange>(savedFilters?.dateRange ?? "today");
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>(savedFilters?.impactFilter ?? "high");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>(savedFilters?.currencyFilter ?? "all");
  const [sortMode, setSortMode] = useState<CalendarSortMode>(savedFilters?.sortMode ?? "impact");
  const [visibleCount, setVisibleCount] = useState<VisibleCount>(savedFilters?.visibleCount ?? 10);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const eventRefs = useRef<Map<string, HTMLElement>>(new Map());
  // Set to true by openEvent when it writes the eventId to the URL, so the
  // restore-on-load useEffect below doesn't re-open the already-open modal.
  const skipNextEventRestore = useRef(false);

  // Re-render when async live data arrives (calendarData.ts dispatches this event)
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!isCalendarLoading()) return;
    const handler = () => forceUpdate((n) => n + 1);
    window.addEventListener("calendarDataLoaded", handler);
    return () => window.removeEventListener("calendarDataLoaded", handler);
  }, []);

  // Persist filter selections to sessionStorage so they survive iOS Safari tab reloads.
  // showAllEvents is intentionally excluded — it's transient (reset on each load).
  useEffect(() => {
    try {
      sessionStorage.setItem(CALENDAR_FILTERS_KEY, JSON.stringify({
        dateRange, impactFilter, currencyFilter, sortMode, visibleCount,
      }));
    } catch { /* noop */ }
  }, [dateRange, impactFilter, currencyFilter, sortMode, visibleCount]);

  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  const upcomingEventsCardId = "upcoming-events";
  const isUpcomingEventsAdded = isCardOnDashboard(upcomingEventsCardId);

  const openedFromAlert = Boolean((location.state as { openedFromAlert?: boolean } | null)?.openedFromAlert);

  const handleAddCard = useCallback(() => {
    addCard(upcomingEventsCardId);
    toast.success("Pinned to Dashboard");
  }, [addCard]);

  const handleRemoveCard = useCallback(() => {
    removeCard(upcomingEventsCardId);
    toast.success("Unpinned from Dashboard");
  }, [removeCard]);

  const setEventRef = useCallback((eventId: string, el: HTMLElement | null) => {
    if (el) {
      eventRefs.current.set(eventId, el);
      return;
    }

    eventRefs.current.delete(eventId);
  }, []);

  const openEvent = useCallback((event: CalendarEvent | null) => {
    if (!event) return;

    setIsModalOpen(false);
    setSelectedEvent(null);
    // Clear any stale deep-link highlight immediately — once a modal is
    // actively opened the visual indicator is no longer needed, and leaving
    // it would cause it to stay stuck if the clearHighlightTimer was
    // cancelled by a subsequent effect re-run.
    setHighlightedEventId(null);

    // Write the event id to the URL so a tab reload restores the modal.
    // Set the skip flag first so the restore useEffect ignores this write.
    skipNextEventRestore.current = true;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("eventId", event.id);
      return next;
    }, { replace: true });

    requestAnimationFrame(() => {
      setSelectedEvent(event);
      setIsModalOpen(true);
    });
  }, [setSearchParams]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setHighlightedEventId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("eventId");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const getImpactVariant = (impact: CalendarEvent["impact"]) => {
    if (impact === "high") return "destructive";
    if (impact === "medium") return "default";
    return "secondary";
  };

  const availableCurrencies = useMemo(() => getAvailableCalendarCurrencies(), []);

  const filteredEvents = useMemo(() => {
    return getFilteredCalendarEvents({
      dateRange,
      impact: impactFilter,
      currency: currencyFilter,
      sortMode,
    });
  }, [dateRange, impactFilter, currencyFilter, sortMode]);

  const filteredKeyEvents = useMemo(() => {
    return getNextKeyEvents(4).filter((event) => {
      if (impactFilter !== "all" && event.impact !== impactFilter) return false;
      if (currencyFilter !== "all" && event.currency !== currencyFilter) return false;

      if (dateRange === "today") {
        const eventDate = new Date(event.scheduledAt);
        const now = new Date();

        return (
          eventDate.getFullYear() === now.getFullYear() &&
          eventDate.getMonth() === now.getMonth() &&
          eventDate.getDate() === now.getDate()
        );
      }

      return true;
    });
  }, [dateRange, impactFilter, currencyFilter]);

  const visibleEvents = useMemo(() => {
    if (showAllEvents || visibleCount === 999) {
      return filteredEvents;
    }

    return filteredEvents.slice(0, visibleCount);
  }, [filteredEvents, showAllEvents, visibleCount]);

  const counts = useMemo(() => getCalendarCounts(filteredEvents), [filteredEvents]);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Always consume the skip flag immediately so it can never go stale across
    // effect runs where eventId is null (e.g. after closeModal clears the param).
    const skip = skipNextEventRestore.current;
    skipNextEventRestore.current = false;

    const eventId = searchParams.get("eventId");
    if (!eventId) return;

    // openEvent writes this id itself when opening — don't re-enter.
    if (skip) return;

    const match = getCalendarEventOrNullById(eventId);
    if (!match) return;

    setHighlightedEventId(match.id);
    setShowAllEvents(true);

    const openTimer = window.setTimeout(() => {
      eventRefs.current.get(match.id)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      openEvent(match);
    }, 100);

    const clearHighlightTimer = window.setTimeout(() => {
      setHighlightedEventId(null);
    }, 3000);

    // Do NOT call setSearchParams here — doing so synchronously changes
    // searchParams, which causes React to run this effect's cleanup
    // (clearTimeout) before the 100ms timer fires, cancelling the modal open.
    // openEvent() manages the eventId param itself when it runs.

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(clearHighlightTimer);
    };
  }, [searchParams, openEvent]);

  const calendarIsLoading = isCalendarLoading();
  const calendarHasData = isCalendarLiveDataAvailable();

  // Loading state — live data fetch still in-flight
  if (calendarIsLoading) {
    return (
      <div className="p-3 sm:p-6 space-y-6">
        <AppHeader title="Calendar" />
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading calendar data…</p>
        </div>
      </div>
    );
  }

  // No live data — FMP not yet active; never show synthetic fixture data to users
  if (!calendarHasData) {
    return (
      <div className="p-3 sm:p-6 space-y-6">
        <AppHeader title="Calendar" />
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="py-20 flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Economic Calendar Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Live economic calendar data is being set up. Check back shortly — this page will update automatically once the data feed is active.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-6">
      <AppHeader title="Calendar" />

      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" />
              Calendar Filters
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              <Select value={dateRange} onValueChange={(value) => setDateRange(value as CalendarDateRange)}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>

              <Select value={impactFilter} onValueChange={(value) => setImpactFilter(value as ImpactFilter)}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
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
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
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

              <Select value={sortMode} onValueChange={(value) => setSortMode(value as CalendarSortMode)}>
                <SelectTrigger className="h-9 w-full sm:w-[160px]">
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
                  if (value !== "999") {
                    setShowAllEvents(false);
                  }
                }}
              >
                <SelectTrigger className="h-9 w-full sm:w-[120px]">
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

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
              <div className="px-3 py-2 rounded-full border bg-muted/30 min-w-[108px]">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{counts.total}</span>
                  <span className="text-xs text-muted-foreground">Visible Events</span>
                </div>
              </div>

              <div className="px-3 py-2 rounded-full border bg-muted/30 min-w-[108px]">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{counts.high}</span>
                  <span className="text-xs text-muted-foreground">High Impact</span>
                </div>
              </div>

              <div className="px-3 py-2 rounded-full border bg-muted/30 min-w-[108px]">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{counts.medium}</span>
                  <span className="text-xs text-muted-foreground">Medium Impact</span>
                </div>
              </div>

              <div className="px-3 py-2 rounded-full border bg-muted/30 min-w-[108px]">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{counts.low}</span>
                  <span className="text-xs text-muted-foreground">Low Impact</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle>Key Events</CardTitle>
            </div>

            <AddToDashboardButton isAdded={isUpcomingEventsAdded} onAdd={handleAddCard} onRemove={handleRemoveCard} />
          </CardHeader>

          <CardContent className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredKeyEvents.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                No key events match the selected filters.
              </div>
            ) : (
              filteredKeyEvents.slice(0, 4).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => openEvent(event)}
                  className={cn(
                    "text-left p-2.5 sm:p-4 rounded-lg border bg-muted/50 hover:bg-muted/70 transition-colors w-full",
                    highlightedEventId === event.id && "ring-2 ring-primary",
                  )}
                >
                  <div className="flex justify-between mb-2">
                    <Badge variant={getImpactVariant(event.impact)}>{event.impact.toUpperCase()}</Badge>
                    <span className="text-sm text-muted-foreground">{event.time}</span>
                  </div>

                  <div className="font-semibold text-sm">{event.event}</div>

                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {event.currency}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {isMobile ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle>Calendar</CardTitle>
              </div>
              {filteredEvents.length > visibleEvents.length && (
                <Button variant="outline" size="sm" onClick={() => setShowAllEvents((prev) => !prev)} className="shrink-0">
                  {showAllEvents ? (
                    <><ChevronUp className="h-4 w-4 mr-1" />Less</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-1" />More</>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-0 px-3 pb-3">
              {visibleEvents.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No calendar events match the selected filters.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {visibleEvents.map((event) => (
                    <button
                      key={event.id}
                      ref={(el) => setEventRef(event.id, el)}
                      type="button"
                      onClick={() => openEvent(event)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/40 transition-colors",
                        highlightedEventId === event.id && "bg-primary/10 border-primary/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            "shrink-0 h-2 w-2 rounded-full",
                            event.impact === "high" ? "bg-destructive" : event.impact === "medium" ? "bg-warning" : "bg-muted-foreground/40",
                          )} />
                          <Badge variant="outline" className="text-xs shrink-0 py-0 px-1.5">{event.currency}</Badge>
                          <span className="text-sm font-medium text-foreground truncate">{event.event}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 pl-4 text-xs text-muted-foreground flex-wrap">
                        <span>{getEventDateLabel(event)}</span>
                        {event.actual !== "—" && <span className="text-foreground font-medium">A: {event.actual}</span>}
                        {event.forecast !== "—" && <span>F: {event.forecast}</span>}
                        {event.previous !== "—" && <span>P: {event.previous}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {filteredEvents.length > visibleEvents.length && !showAllEvents && visibleCount !== 999 && (
                <div className="flex justify-center pt-3">
                  <Button variant="outline" size="sm" onClick={() => setShowAllEvents(true)}>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show all {filteredEvents.length}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <CardTitle>Calendar</CardTitle>
              </div>

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
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
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
                      <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          {getEventDateLabel(event)}
                        </td>

                        <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">{event.time}</td>

                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {event.currency}
                          </Badge>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-sm text-foreground">{event.event}</div>
                        </td>

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
        )}
      </div>

      <EventDetailsModal
        event={selectedEvent}
        isOpen={isModalOpen}
        onClose={closeModal}
        openedFromAlert={openedFromAlert}
      />
    </div>
  );
}

export default Calendar;
