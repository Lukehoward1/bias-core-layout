import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Each event now has a unique ID for deep-linking
const keyEvents = [
  { id: 'nfp-2025-01', time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', impact: 'high' },
  { id: 'ecb-rate-2025-01', time: '10:00', currency: 'EUR', event: 'ECB Interest Rate Decision', impact: 'high' },
  { id: 'boe-rate-2025-01', time: '14:00', currency: 'GBP', event: 'BOE Interest Rate Decision', impact: 'high' },
];

const events = [
  { id: 'nfp-2025-01', time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', previous: '180K', forecast: '190K', actual: '—', impact: 'high' },
  { id: 'unemployment-2025-01', time: '08:30', currency: 'USD', event: 'Unemployment Rate', previous: '3.9%', forecast: '3.9%', actual: '—', impact: 'high' },
  { id: 'german-factory-2025-01', time: '09:00', currency: 'EUR', event: 'German Factory Orders', previous: '-0.2%', forecast: '0.5%', actual: '—', impact: 'medium' },
  { id: 'ecb-rate-2025-01', time: '10:00', currency: 'EUR', event: 'ECB Interest Rate Decision', previous: '4.50%', forecast: '4.50%', actual: '—', impact: 'high' },
  { id: 'cad-employment-2025-01', time: '12:30', currency: 'CAD', event: 'Employment Change', previous: '42.0K', forecast: '25.0K', actual: '—', impact: 'medium' },
  { id: 'boe-rate-2025-01', time: '14:00', currency: 'GBP', event: 'BOE Interest Rate Decision', previous: '5.25%', forecast: '5.25%', actual: '—', impact: 'high' },
  { id: 'us-cpi-2025-01', time: '14:30', currency: 'USD', event: 'US CPI', previous: '3.1%', forecast: '3.0%', actual: '—', impact: 'high' },
];

type CalendarEvent = typeof events[0];

export default function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const eventRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  
  // Dashboard integration - single hook at page level
  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();
  
  // Dashboard card states
  const upcomingEventsCardId = 'upcoming-events';
  const isUpcomingEventsAdded = isCardOnDashboard(upcomingEventsCardId);
  
  const handleAddCard = (cardId: string) => {
    addCard(cardId);
    toast.success('Pinned to Dashboard');
  };
  
  const handleRemoveCard = (cardId: string) => {
    removeCard(cardId);
    toast.success('Unpinned from Dashboard');
  };

  // Register event row ref
  const setEventRef = useCallback((eventId: string, element: HTMLTableRowElement | null) => {
    if (element) {
      eventRefs.current.set(eventId, element);
    } else {
      eventRefs.current.delete(eventId);
    }
  }, []);

  // Handle deep-link navigation via eventId query param
  useEffect(() => {
    const eventId = searchParams.get('eventId');
    const eventParam = searchParams.get('event'); // Legacy support
    
    if (eventId) {
      // Find matching event by ID
      const matchingEvent = events.find(e => e.id === eventId);
      
      if (matchingEvent) {
        // Scroll to event and highlight it
        setHighlightedEventId(matchingEvent.id);
        
        // Wait for refs to be set, then scroll
        setTimeout(() => {
          const element = eventRefs.current.get(matchingEvent.id);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          
          // Open the event details modal
          setSelectedEvent(matchingEvent);
          setIsModalOpen(true);
        }, 100);
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedEventId(null);
        }, 3000);
      }
      
      // Clear the search param after processing
      setSearchParams({}, { replace: true });
    } else if (eventParam) {
      // Legacy: Find matching event by name (case-insensitive partial match)
      const matchingEvent = events.find(e => 
        e.event.toLowerCase().includes(eventParam.toLowerCase()) ||
        eventParam.toLowerCase().includes(e.event.toLowerCase())
      );
      
      if (matchingEvent) {
        setSelectedEvent(matchingEvent);
        setIsModalOpen(true);
      }
      
      // Clear the search param after processing
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'destructive';
    if (impact === 'medium') return 'default';
    return 'secondary';
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleKeyEventClick = (keyEvent: typeof keyEvents[0]) => {
    // Find the matching full event data
    const fullEvent = events.find(e => e.id === keyEvent.id);
    if (fullEvent) {
      setSelectedEvent(fullEvent);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Keep selectedEvent for a moment to prevent flash during close animation
    setTimeout(() => setSelectedEvent(null), 200);
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Calendar" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
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

                <Select defaultValue="all">
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Currencies</SelectItem>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="gbp">GBP</SelectItem>
                    <SelectItem value="jpy">JPY</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Key Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Key Events Today</CardTitle>
              <AddToDashboardButton
                isAdded={isUpcomingEventsAdded}
                onAdd={() => handleAddCard(upcomingEventsCardId)}
                onRemove={() => handleRemoveCard(upcomingEventsCardId)}
              />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {keyEvents.map((event, i) => (
                  <div 
                    key={event.id} 
                    className={cn(
                      "p-4 bg-muted/50 rounded-lg border border-border cursor-pointer hover:bg-muted/70 hover:border-primary/30 transition-all",
                      highlightedEventId === event.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                    onClick={() => handleKeyEventClick(event)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={getImpactColor(event.impact)} className="text-xs">
                        {event.impact.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{event.time}</span>
                    </div>
                    <div className="font-semibold text-sm text-foreground mb-1">{event.currency}</div>
                    <div className="text-xs text-muted-foreground">{event.event}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Events Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Time</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Currency</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Event</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Previous</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Forecast</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Actual</th>
                      <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr 
                        key={event.id}
                        ref={(el) => setEventRef(event.id, el)}
                        className={cn(
                          "border-b border-border hover:bg-muted/50 transition-all cursor-pointer",
                          highlightedEventId === event.id && "bg-primary/10 ring-2 ring-inset ring-primary"
                        )}
                        onClick={() => handleEventClick(event)}
                      >
                        <td className="py-3 px-5 text-sm text-foreground">{event.time}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">{event.currency}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-foreground font-medium">{event.event}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{event.previous}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{event.forecast}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{event.actual}</td>
                        <td className="py-3 px-5">
                          <Badge variant={getImpactColor(event.impact)} className="text-xs">
                            {event.impact.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal 
        event={selectedEvent} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </div>
  );
}
