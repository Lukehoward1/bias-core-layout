import { useState, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Settings, Inbox, Bell, FlaskConical, Target } from "lucide-react";
import { AlertPreferencesPanel } from "@/components/alerts/AlertPreferencesPanel";
import { AlertInbox } from "@/components/alerts/AlertInbox";
import { TestAlertsPanel } from "@/components/alerts/TestAlertsPanel";
import { ManualTimerPanel } from "@/components/alerts/ManualTimerPanel";
import { PriceAlertsPanel } from "@/components/alerts/PriceAlertsPanel";
import { AlertsSoundToggle } from "@/components/alerts/AlertsSoundToggle";
import { CreatePriceAlertModal } from "@/components/alerts/CreatePriceAlertModal";
import { useAlertsContext } from "@/contexts/AlertsContext";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { toast } from "sonner";

// ✅ Calendar modal wiring
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents, type CalendarEvent as CalendarEventData } from "@/data/calendarEvents";

const news = [
  { title: "Fed Signals Potential Rate Hold", currency: "USD", time: "2h ago", sentiment: "hawkish" },
  { title: "ECB Minutes Show Divided Opinion", currency: "EUR", time: "4h ago", sentiment: "mixed" },
  { title: "BOE Governor Speech Hints at Cut", currency: "GBP", time: "5h ago", sentiment: "dovish" },
  { title: "China GDP Beats Expectations", currency: "CNY", time: "6h ago", sentiment: "positive" },
  { title: "Oil Prices Surge on Supply Concerns", currency: "USD", time: "7h ago", sentiment: "positive" },
];

const sessions = [
  { name: "Sydney", status: "closed", time: "Opens in 8:30:00", accent: "#2EC4B6", region: "Asia-Pacific Markets" },
  { name: "Asia", status: "open", time: "Closes in 1:23:45", accent: "#4361EE", region: "Asia-Pacific Markets" },
  { name: "London", status: "closed", time: "Opens in 2:15:30", accent: "#F4D35E", region: "European Markets" },
  { name: "New York", status: "closed", time: "Opens in 5:45:12", accent: "#F77F00", region: "US Markets" },
];

/* =======================
   ✅ SAFE MATCHER
   - Only opens calendar event if there is a real name match
   - Otherwise shows a toast (no “USD fallback to NFP”)
======================= */

const normalize = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Optional aliases to help matching without being “too loose”
const normalizeNewsAlias = (title: string) => {
  const t = normalize(title);

  // Examples you might add over time:
  if (t.includes("non farm payroll")) return "non farm payrolls";
  if (t === "cpi") return "us cpi";
  if (t.includes("core cpi")) return "us core cpi";
  if (t.includes("interest rate decision")) return "interest rate decision";

  return t;
};

const scoreTitleToEvent = (newsTitle: string, ev: CalendarEventData) => {
  const titleNorm = normalizeNewsAlias(newsTitle);
  const eventNorm = normalize(ev.event);

  let score = 0;

  // Strong substring matches
  if (titleNorm.includes(eventNorm)) score += 6;
  if (eventNorm.includes(titleNorm)) score += 6;

  // Token overlap
  const titleTokens = new Set(titleNorm.split(" ").filter(Boolean));
  const eventTokens = new Set(eventNorm.split(" ").filter(Boolean));

  let overlap = 0;
  titleTokens.forEach((t) => {
    if (eventTokens.has(t)) overlap += 1;
  });

  score += overlap;

  // Small bump for high impact (only as a tie-break)
  if (ev.impact === "high") score += 0.25;

  return score;
};

const pickBestEventForNewsTitle = (title: string): CalendarEventData | null => {
  let best: { ev: CalendarEventData; score: number } | null = null;

  for (const ev of calendarEvents) {
    const s = scoreTitleToEvent(title, ev);
    if (!best || s > best.score) best = { ev, score: s };
  }

  // ✅ IMPORTANT: require a meaningful match
  // If not, do NOT open a random event
  if (!best || best.score < 3) return null;

  return best.ev;
};

export default function Alerts() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreatePriceAlert, setShowCreatePriceAlert] = useState(false);

  // ✅ Event modal state
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEventData | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const {
    alerts,
    preferences,
    addAlert,
    markRead,
    markAllRead,
    deleteAlert,
    clearAllAlerts,
    updatePreferences,
    unreadCount,
    priceAlerts,
  } = useAlertsContext();

  // Dashboard integration - single hook at page level
  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  const topNewsCardId = "top-news";
  const sessionTimersCardId = "session-timers";
  const myAlertsTimersCardId = "alerts-my-alerts-timers";
  const priceAlertsCardId = "alerts-price-alerts";
  const highImpactCardId = "high-impact-events";

  const isTopNewsAdded = isCardOnDashboard(topNewsCardId);
  const isSessionTimersAdded = isCardOnDashboard(sessionTimersCardId);
  const isMyAlertsTimersAdded = isCardOnDashboard(myAlertsTimersCardId);
  const isPriceAlertsAdded = isCardOnDashboard(priceAlertsCardId);
  const isHighImpactAdded = isCardOnDashboard(highImpactCardId);

  const handleAddCard = (cardId: string) => {
    addCard(cardId);
    toast.success("Added to Dashboard");
  };

  const handleRemoveCard = (cardId: string) => {
    removeCard(cardId);
    toast.success("Removed from Dashboard");
  };

  const handleTimerComplete = (label: string) => {
    addAlert({
      type: "timer",
      title: "Timer Complete",
      message: `Your timer "${label}" has finished.`,
      severity: "info",
      routeTo: "/alerts",
    });
  };

  const activePriceAlertsCount = priceAlerts.filter((a) => !a.triggered && a.enabled).length;

  /**
   * ✅ IMPORTANT FIX (same modal pattern you already used elsewhere)
   * Close current event modal first, then open the next event.
   * Prevents “opens behind” behaviour.
   */
  const openCalendarEvent = useCallback((ev: CalendarEventData) => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);

    requestAnimationFrame(() => {
      setSelectedCalendarEvent(ev);
      setIsEventModalOpen(true);
    });
  }, []);

  const closeCalendarOverlay = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  }, []);

  // ✅ Click Top News item -> only open if a real match exists
  const handleTopNewsClick = useCallback(
    (item: { title: string; currency: string }) => {
      const matched = pickBestEventForNewsTitle(item.title);

      if (!matched) {
        toast.error("This news item isn’t linked to a calendar event yet.", {
          description: "Add it to calendarEvents (or improve the name match) to enable deep linking.",
        });
        return;
      }

      openCalendarEvent(matched);
    },
    [openCalendarEvent],
  );

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Alerts" />

      <div className="max-w-7xl mx-auto space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="h-9">
              <TabsTrigger value="overview" className="text-sm gap-2">
                <Bell className="h-4 w-4" />
                Overview
              </TabsTrigger>

              <TabsTrigger value="price-alerts" className="text-sm gap-2">
                <Target className="h-4 w-4" />
                Price Alerts
                {activePriceAlertsCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-1">
                    {activePriceAlertsCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="inbox" className="text-sm gap-2">
                <Inbox className="h-4 w-4" />
                Inbox
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5 ml-1">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="preferences" className="text-sm gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </TabsTrigger>

              <TabsTrigger value="testing" className="text-sm gap-2">
                <FlaskConical className="h-4 w-4" />
                Test
              </TabsTrigger>
            </TabsList>

            <AlertsSoundToggle />
          </div>

          {/* Overview */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Top News</CardTitle>
                  <AddToDashboardButton
                    isAdded={isTopNewsAdded}
                    onAdd={() => handleAddCard(topNewsCardId)}
                    onRemove={() => handleRemoveCard(topNewsCardId)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {news.map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleTopNewsClick(item);
                        }}
                        className="w-full text-left p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-foreground mb-2">{item.title}</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {item.currency}
                              </Badge>
                              <Badge
                                variant={
                                  item.sentiment === "hawkish" || item.sentiment === "positive"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {item.sentiment}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Session Timers</CardTitle>
                  <AddToDashboardButton
                    isAdded={isSessionTimersAdded}
                    onAdd={() => handleAddCard(sessionTimersCardId)}
                    onRemove={() => handleRemoveCard(sessionTimersCardId)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <div
                        key={session.name}
                        className="relative p-4 bg-muted/50 rounded-lg border border-border overflow-hidden"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px]"
                          style={{ backgroundColor: session.accent }}
                        />
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm text-foreground">{session.name}</h3>
                          <Badge variant={session.status === "open" ? "default" : "secondary"} className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mb-2">{session.region}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{session.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle>My Alerts & Timers</CardTitle>
                <div className="flex items-center gap-2">
                  <AddToDashboardButton
                    isAdded={isMyAlertsTimersAdded}
                    onAdd={() => handleAddCard(myAlertsTimersCardId)}
                    onRemove={() => handleRemoveCard(myAlertsTimersCardId)}
                  />
                  <Button size="sm" className="h-8" onClick={() => setShowCreatePriceAlert(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Alert
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">What</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">When</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceAlerts
                        .filter((a) => !a.triggered)
                        .map((alert) => (
                          <tr key={alert.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-5 text-sm text-foreground">
                              <Badge variant="outline" className="text-xs">
                                Price
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-foreground font-medium">
                              {alert.assetDisplayName} {alert.direction} {alert.price}
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {alert.triggerType === "wick" ? "Touch" : `Close ${alert.timeframe}`}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={alert.enabled ? "default" : "secondary"} className="text-xs">
                                {alert.enabled ? "Active" : "Paused"}
                              </Badge>
                            </td>
                            <td className="py-3 px-5">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}

                      {priceAlerts.filter((a) => !a.triggered).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                            No active alerts. Click "Add Alert" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Alerts */}
          <TabsContent value="price-alerts" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <PriceAlertsPanel />

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Price Alerts Summary</CardTitle>
                  <AddToDashboardButton
                    isAdded={isPriceAlertsAdded}
                    onAdd={() => handleAddCard(priceAlertsCardId)}
                    onRemove={() => handleRemoveCard(priceAlertsCardId)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">{activePriceAlertsCount}</p>
                      <p className="text-xs text-muted-foreground">Active Alerts</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <p className="text-2xl font-bold text-foreground">
                        {priceAlerts.filter((a) => a.triggered).length}
                      </p>
                      <p className="text-xs text-muted-foreground">Triggered Today</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button className="w-full" onClick={() => setShowCreatePriceAlert(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Price Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inbox */}
          <TabsContent value="inbox" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <AlertInbox
                  alerts={alerts}
                  onMarkRead={markRead}
                  onMarkAllRead={markAllRead}
                  onDelete={deleteAlert}
                  onClearAll={clearAllAlerts}
                />
              </div>
              <div>
                <ManualTimerPanel onTimerComplete={handleTimerComplete} />
              </div>
            </div>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences" className="mt-6">
            <div className="max-w-2xl">
              <AlertPreferencesPanel preferences={preferences} onUpdate={updatePreferences} />
            </div>
          </TabsContent>

          {/* Testing */}
          <TabsContent value="testing" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TestAlertsPanel onTriggerAlert={addAlert} />
              <ManualTimerPanel onTimerComplete={handleTimerComplete} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreatePriceAlertModal open={showCreatePriceAlert} onOpenChange={setShowCreatePriceAlert} />

      {/* ✅ Nested Calendar overlay for Top News */}
      <EventDetailsModal
        event={selectedCalendarEvent as any}
        isOpen={isEventModalOpen}
        onClose={closeCalendarOverlay}
      />
    </div>
  );
}
