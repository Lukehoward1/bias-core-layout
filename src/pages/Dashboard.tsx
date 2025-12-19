import { useState, useRef, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LockScreen } from "@/components/LockScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Calendar as CalendarIcon, Activity, ChevronDown } from "lucide-react";

interface SessionData {
  name: string;
  time: string;
  status: string;
  accent: string;
  region: string;
}

const sessionsData: SessionData[] = [
  { name: 'Sydney', time: 'Opens in 8:30:00', status: 'closed', accent: '#2EC4B6', region: 'Asia-Pacific' },
  { name: 'Tokyo', time: 'Closes in 1:23:45', status: 'active', accent: '#4361EE', region: 'JPY Markets' },
  { name: 'London', time: 'Opens in 2:15:30', status: 'closed', accent: '#F4D35E', region: 'European' },
  { name: 'New York', time: 'Opens in 5:45:12', status: 'closed', accent: '#F77F00', region: 'US Markets' },
];

// Local Session Timer Dropdown Component
function SessionTimerDropdown({ 
  isOpen, 
  onClose, 
  sessions, 
  anchorRef 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  sessions: SessionData[];
  anchorRef: React.RefObject<HTMLDivElement>;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.status === 'active');
  const upcomingSessions = sessions.filter(s => s.status !== 'active').sort((a, b) => {
    // Simple sort by time string for demo
    return a.time.localeCompare(b.time);
  });

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-full left-0 mt-2 w-72 bg-popover border border-border rounded-lg shadow-lg z-50"
    >
      <div className="p-3 border-b border-border">
        <p className="text-xs font-medium text-muted-foreground mb-1">Current Session</p>
        {activeSession ? (
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full animate-pulse" 
              style={{ backgroundColor: activeSession.accent }}
            />
            <span className="font-medium text-foreground">{activeSession.name}</span>
            <span className="text-xs text-muted-foreground ml-auto">{activeSession.time}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active session</p>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Upcoming Sessions</p>
        <div className="space-y-2">
          {upcomingSessions.map(session => (
            <div 
              key={session.name}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: session.accent }}
              />
              <span className="text-sm text-foreground">{session.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{session.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const sessionCardRef = useRef<HTMLDivElement>(null);

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

            {/* Next Session Card with Dropdown */}
            <div className="relative" ref={sessionCardRef}>
              <Card 
                className="cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setShowSessionDropdown(!showSessionDropdown)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Next Session</CardTitle>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-accent" />
                    <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showSessionDropdown ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">London</div>
                  <p className="text-xs text-muted-foreground mt-1">Opens in 2h 15m</p>
                </CardContent>
              </Card>
              <SessionTimerDropdown
                isOpen={showSessionDropdown}
                onClose={() => setShowSessionDropdown(false)}
                sessions={sessionsData}
                anchorRef={sessionCardRef}
              />
            </div>

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
                  {sessionsData.map((session) => (
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
