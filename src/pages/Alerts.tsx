import { useMemo, useState, useCallback } from "react";
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

import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { calendarEvents } from "@/data/calendarEvents";

import type { PriceAlert } from "@/types/alerts";

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

type CalendarEvent = (typeof calendarEvents)[0];

const pickBestEventForCurrency = (currency: string): CalendarEvent | null => {
  const c = (currency || "").toUpperCase();
  const matches = calendarEvents.filter((ev) => (ev.currency || "").toUpperCase() === c);

  if (matches.length === 0) return null;

  const impactRank = (impact: string) => {
    const v = (impact || "").toLowerCase();
    if (v === "high") return 3;
    if (v === "medium") return 2;
    return 1;
  };

  const sorted = [...matches].sort((a, b) => impactRank(b.impact) - impactRank(a.impact));
  return sorted[0] ?? null;
};

export default function Alerts() {
  const [activeTab, setActiveTab] = useState("overview");

  const [showCreatePriceAlert, setShowCreatePriceAlert] = useState(false);
  const [editingPriceAlert, setEditingPriceAlert] = useState<PriceAlert | null>(null);

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
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

  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  const topNewsCardId = "top-news";
  const sessionTimersCardId = "session-timers";
  const myAlertsTimersCardId = "alerts-my-alerts-timers";
  const priceAlertsCardId = "alerts-price-alerts";

  const isTopNewsAdded = isCardOnDashboard(topNewsCardId);
  const isSessionTimersAdded = isCardOnDashboard(sessionTimersCardId);
  const isMyAlertsTimersAdded = isCardOnDashboard(myAlertsTimersCardId);
  const isPriceAlertsAdded = isCardOnDashboard(priceAlertsCardId);

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

  const activePriceAlertsCount = useMemo(
    () => priceAlerts.filter((a) => !a.triggered && a.enabled).length,
    [priceAlerts],
  );

  const overviewActivePriceAlerts = useMemo(() => priceAlerts.filter((a) => !a.triggered), [priceAlerts]);

  const openCalendarEvent = useCallback((ev: CalendarEvent) => {
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

  const handleTopNewsClick = useCallback(
    (item: (typeof news)[0]) => {
      const ev = pickBestEventForCurrency(item.currency);

      if (!ev) {
        toast.error("No matching calendar event found for this currency yet.");
        return;
      }

      openCalendarEvent(ev);
    },
    [openCalendarEvent],
  );

  const openCreatePriceAlert = useCallback(() => {
    if (isEventModalOpen) {
      closeCalendarOverlay();
      requestAnimationFrame(() => {
        setEditingPriceAlert(null);
        setShowCreatePriceAlert(true);
      });
      return;
    }

    setEditingPriceAlert(null);
    setShowCreatePriceAlert(true);
  }, [isEventModalOpen, closeCalendarOverlay]);

  const openEditPriceAlert = useCallback(
    (alert: PriceAlert) => {
      if (isEventModalOpen) {
        closeCalendarOverlay();
        requestAnimationFrame(() => {
          setEditingPriceAlert(alert);
          setShowCreatePriceAlert(true);
        });
        return;
      }

      setEditingPriceAlert(alert);
      setShowCreatePriceAlert(true);
    },
    [isEventModalOpen, closeCalendarOverlay],
  );

  const handlePriceAlertModalOpenChange = useCallback((open: boolean) => {
    setShowCreatePriceAlert(open);
    if (!open) {
      setEditingPriceAlert(null);
    }
  }, []);

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
                              <span className="text-[11px] text-muted-foreground ml-1">• click to view event</span>
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
                  <Button size="sm" className="h-8" onClick={openCreatePriceAlert}>
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
                      {overviewActivePriceAlerts.map((alert) => (
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => openEditPriceAlert(alert)}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {overviewActivePriceAlerts.length === 0 && (
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
                    <Button className="w-full" onClick={openCreatePriceAlert}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Price Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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

          <TabsContent value="preferences" className="mt-6">
            <div className="max-w-2xl">
              <AlertPreferencesPanel preferences={preferences} onUpdate={updatePreferences} />
            </div>
          </TabsContent>

          <TabsContent value="testing" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TestAlertsPanel onTriggerAlert={addAlert} />
              <ManualTimerPanel onTimerComplete={handleTimerComplete} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <EventDetailsModal
        event={selectedCalendarEvent as any}
        isOpen={isEventModalOpen}
        onClose={closeCalendarOverlay}
      />

      <CreatePriceAlertModal
        open={showCreatePriceAlert}
        onOpenChange={handlePriceAlertModalOpenChange}
        editingAlert={editingPriceAlert}
      />
    </div>
  );
}
