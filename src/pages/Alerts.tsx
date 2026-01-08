import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Plus, Settings, Inbox, Bell, FlaskConical } from "lucide-react";
import { AlertToast } from "@/components/alerts/AlertToast";
import { AlertPreferencesPanel } from "@/components/alerts/AlertPreferencesPanel";
import { AlertInbox } from "@/components/alerts/AlertInbox";
import { TestAlertsPanel } from "@/components/alerts/TestAlertsPanel";
import { ManualTimerPanel } from "@/components/alerts/ManualTimerPanel";
import { useAlerts } from "@/hooks/use-alerts";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";

const news = [
  { title: 'Fed Signals Potential Rate Hold', currency: 'USD', time: '2h ago', sentiment: 'hawkish' },
  { title: 'ECB Minutes Show Divided Opinion', currency: 'EUR', time: '4h ago', sentiment: 'mixed' },
  { title: 'BOE Governor Speech Hints at Cut', currency: 'GBP', time: '5h ago', sentiment: 'dovish' },
  { title: 'China GDP Beats Expectations', currency: 'CNY', time: '6h ago', sentiment: 'positive' },
  { title: 'Oil Prices Surge on Supply Concerns', currency: 'USD', time: '7h ago', sentiment: 'positive' },
];

const sessions = [
  { name: 'Sydney', status: 'closed', time: 'Opens in 8:30:00', accent: '#2EC4B6', region: 'Asia-Pacific Markets' },
  { name: 'Asia', status: 'open', time: 'Closes in 1:23:45', accent: '#4361EE', region: 'Asia-Pacific Markets' },
  { name: 'London', status: 'closed', time: 'Opens in 2:15:30', accent: '#F4D35E', region: 'European Markets' },
  { name: 'New York', status: 'closed', time: 'Opens in 5:45:12', accent: '#F77F00', region: 'US Markets' },
];

const myAlerts = [
  { type: 'Price Alert', what: 'EURUSD > 1.0850', when: 'Ongoing', delivery: 'Push', status: 'active' },
  { type: 'News Alert', what: 'USD High Impact', when: 'Today 08:30', delivery: 'Email', status: 'pending' },
  { type: 'Session Timer', what: 'London Open', when: 'In 2h 15m', delivery: 'Push', status: 'active' },
];

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    alerts,
    preferences,
    isQuietHours,
    addAlert,
    markRead,
    markAllRead,
    dismissAlert,
    deleteAlert,
    clearAllAlerts,
    updatePreferences
  } = useAlerts();

  const unreadCount = alerts.filter(a => !a.read).length;

  const handleTimerComplete = (label: string) => {
    addAlert({
      type: 'timer',
      title: 'Timer Complete',
      message: `Your timer "${label}" has finished.`,
      severity: 'info'
    });
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Alerts" />
      
      {/* Toast Notifications */}
      <AlertToast
        alerts={alerts}
        onDismiss={dismissAlert}
        onMarkRead={markRead}
        quietHours={isQuietHours}
      />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-9">
              <TabsTrigger value="overview" className="text-sm gap-2">
                <Bell className="h-4 w-4" />
                Overview
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

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Top News</CardTitle>
                      <AddToDashboardButton cardId="alerts-top-news" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {news.map((item, i) => (
                        <div key={i} className="p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm text-foreground mb-2">{item.title}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">{item.currency}</Badge>
                                <Badge 
                                  variant={item.sentiment === 'hawkish' || item.sentiment === 'positive' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {item.sentiment}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Session Timers</CardTitle>
                      <AddToDashboardButton cardId="session-timers" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div key={session.name} className="relative p-4 bg-muted/50 rounded-lg border border-border overflow-hidden">
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-[3px]" 
                            style={{ backgroundColor: session.accent }}
                          />
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-sm text-foreground">{session.name}</h3>
                            <Badge variant={session.status === 'open' ? 'default' : 'secondary'} className="text-xs">
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
                  <Button size="sm" className="h-8">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Alert
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">What</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">When</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Delivery</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myAlerts.map((alert, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-5 text-sm text-foreground">{alert.type}</td>
                            <td className="py-3 px-4 text-sm text-foreground font-medium">{alert.what}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{alert.when}</td>
                            <td className="py-3 px-4">
                              <Badge variant="outline" className="text-xs">{alert.delivery}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={alert.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {alert.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-5">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">Edit</Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inbox Tab */}
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

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="mt-6">
              <div className="max-w-2xl">
                <AlertPreferencesPanel
                  preferences={preferences}
                  onUpdate={updatePreferences}
                />
              </div>
            </TabsContent>

            {/* Testing Tab */}
            <TabsContent value="testing" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <TestAlertsPanel onTriggerAlert={addAlert} />
                <ManualTimerPanel onTimerComplete={handleTimerComplete} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
