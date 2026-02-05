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

/* =======================
   DATA
======================= */

const keyEvents = [
  { id: "nfp-2025-01", time: "08:30", currency: "USD", event: "Non-Farm Payrolls", impact: "high" },
  { id: "ecb-rate-2025-01", time: "10:00", currency: "EUR", event: "ECB Interest Rate Decision", impact: "high" },
  { id: "boe-rate-2025-01", time: "14:00", currency: "GBP", event: "BOE Interest Rate Decision", impact: "high" },
];

const events = [
  {
    id: "nfp-2025-01",
    time: "08:30",
    currency: "USD",
    event: "Non-Farm Payrolls",
    previous: "180K",
    forecast: "190K",
    actual: "—",
    impact: "high",
  },
  {
    id: "unemployment-2025-01",
    time: "08:30",
    currency: "USD",
    event: "Unemployment Rate",
    previous: "3.9%",
    forecast: "3.9%",
    actual: "—",
    impact: "high",
  },
  {
    id: "german-factory-2025-01",
    time: "09:00",
    currency: "EUR",
    event: "German Factory Orders",
    previous: "-0.2%",
    forecast: "0.5%",
    actual: "—",
    impact: "medium",
  },
  {
    id: "ecb-rate-2025-01",
    time: "10:00",
    currency: "EUR",
    event: "ECB Interest Rate Decision",
    previous: "4.50%",
    forecast: "4.50%",
    actual: "—",
    impact: "high",
  },
  {
    id: "cad-employment-2025-01",
    time: "12:30",
    currency: "CAD",
    event: "Employment Change",
    previous: "42.0K",
    forecast: "25.0K",
    actual: "—",
    impact: "medium",
  },
  {
    id: "boe-rate-2025-01",
    time: "14:00",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    previous: "5.25%",
    forecast: "5.25%",
    actual: "—",
    impact: "high",
  },
  {
    id: "us-cpi-2025-01",
    time: "14:30",
    currency: "USD",
    event: "US CPI",
    previous: "3.1%",
    forecast: "3.0%",
    actual: "—",
    impact: "high",
  },
];

type CalendarEvent = (typeof events)[0];

/* =======================
   PAGE
======================= */

export default function Calendar() {
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

  useEffect(() => {
    const eventId = searchParams.get("eventId");

    if (!eventId) return;

    const match = events.find((e) => e.id === eventId);
    if (!match) return;

    setHighlightedEventId(match.id);

    setTimeout(() => {
      eventRefs.current.get(match.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setSelectedEvent(match);
      setIsModalOpen(true);
    }, 100);

    setTimeout(() => setHighlightedEventId(null), 3000);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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
            {keyEvents.map((event) => (
              <div
                key={event.id}
                className={cn(
                  "p-4 rounded-lg border bg-muted/50 cursor-pointer hover:bg-muted/70",
                  highlightedEventId === event.id && "ring-2 ring-primary",
                )}
                onClick={() => setSelectedEvent(events.find((e) => e.id === event.id) ?? null)}
              >
                <div className="flex justify-between mb-2">
                  <Badge variant={getImpactVariant(event.impact)}>{event.impact.toUpperCase()}</Badge>
                  <span className="text-sm text-muted-foreground">{event.time}</span>
                </div>
                <div className="font-semibold text-sm">{event.currency}</div>
                <div className="text-xs text-muted-foreground">{event.event}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Events Table */}
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
                {events.map((event) => (
                  <tr
                    key={event.id}
                    ref={(el) => setEventRef(event.id, el)}
                    onClick={() => setSelectedEvent(event)}
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

      <EventDetailsModal event={selectedEvent} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
