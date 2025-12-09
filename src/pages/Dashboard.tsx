import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LockScreen } from "@/components/LockScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Calendar as CalendarIcon, Activity } from "lucide-react";

export default function Dashboard() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Dashboard" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Header */}
          <h1 className="text-3xl font-bold text-foreground">Welcome, Trader</h1>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Bias</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">Bullish</div>
                <p className="text-xs text-muted-foreground mt-1">85% confidence</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Trades</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">3</div>
                <p className="text-xs text-success mt-1">+$2,450 unrealized</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
                <Clock className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">London</div>
                <p className="text-xs text-muted-foreground mt-1">Opens in 2h 15m</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">High Impact Events</CardTitle>
                <CalendarIcon className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">5</div>
                <p className="text-xs text-muted-foreground mt-1">Today</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Today's Bias Snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['EURUSD', 'GBPUSD', 'USDJPY'].map((pair) => (
                    <div key={pair} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-foreground">{pair}</div>
                        <div className="text-sm text-success font-medium">Bullish</div>
                      </div>
                      <div className="text-sm text-muted-foreground">78% confidence</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Timers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Sydney', time: 'Opens in 8:30:00', status: 'closed', accent: '#2EC4B6', region: 'Asia-Pacific' },
                    { name: 'Tokyo', time: 'Closes in 1:23:45', status: 'active', accent: '#4361EE', region: 'JPY Markets' },
                    { name: 'London', time: 'Opens in 2:15:30', status: 'closed', accent: '#F4D35E', region: 'European' },
                    { name: 'New York', time: 'Opens in 5:45:12', status: 'closed', accent: '#F77F00', region: 'US Markets' },
                  ].map((session) => (
                    <div key={session.name} className="relative p-3 bg-muted/50 rounded-lg border border-border overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-[3px]" 
                        style={{ backgroundColor: session.accent }}
                      />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground text-sm">{session.name}</div>
                          <div className="text-xs text-muted-foreground">{session.region}</div>
                        </div>
                        <div className={`text-xs ${session.status === 'active' ? 'text-success font-medium' : 'text-muted-foreground'}`}>
                          {session.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { time: '08:30', event: 'USD Non-Farm Payrolls', impact: 'high' },
                    { time: '10:00', event: 'EUR CPI', impact: 'medium' },
                    { time: '14:00', event: 'GBP Interest Rate', impact: 'high' },
                  ].map((event, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground min-w-[48px]">{event.time}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{event.event}</div>
                        <div className={`text-xs mt-1 ${event.impact === 'high' ? 'text-destructive' : 'text-accent'}`}>
                          {event.impact.toUpperCase()} IMPACT
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Week</span>
                    <span className="text-lg font-bold text-success">+$8,240</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="text-lg font-bold text-success">+$24,680</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="text-lg font-bold text-foreground">68%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Trades</span>
                    <span className="text-lg font-bold text-foreground">127</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
