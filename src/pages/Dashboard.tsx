import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { LockScreen } from "@/components/LockScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Clock, Calendar as CalendarIcon, Activity, ChevronDown, AlertTriangle, BookOpen, Shield, Plus } from "lucide-react";
import { useDashboardLayout, type DashboardCardEntry, type RowType } from "@/hooks/use-dashboard-layout";
import { DashboardEditToolbar } from "@/components/dashboard/DashboardEditToolbar";
import { DashboardRow } from "@/components/dashboard/DashboardRow";
import { AddCardsModal } from "@/components/dashboard/AddCardsModal";
import { WatchlistOverviewCard } from "@/components/dashboard/WatchlistOverviewCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface SessionData {
  name: string;
  time: string;
  status: string;
  accent: string;
  region: string;
}

const sessionsData: SessionData[] = [
  { name: 'Sydney', time: 'Opens in 8:30:00', status: 'closed', accent: '#2EC4B6', region: 'Asia-Pacific' },
  { name: 'Asia', time: 'Closes in 1:23:45', status: 'active', accent: '#4361EE', region: 'Asia-Pacific Markets' },
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

  const handleClickOutside = (event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node) &&
      anchorRef.current &&
      !anchorRef.current.contains(event.target as Node)
    ) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const activeSession = sessions.find(s => s.status === 'active');
  const upcomingSessions = sessions.filter(s => s.status !== 'active').sort((a, b) => {
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
  const [showAddCardsModal, setShowAddCardsModal] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
  const sessionCardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  
  // Row-based dashboard layout
  const {
    layout,
    isEditMode,
    toggleEditMode,
    addCard,
    addRow,
    changeRowType,
    removeRow,
    moveRow,
    removeCard,
    moveCard,
    moveCardToRow,
    resetToDefault,
    getMaxSlots,
    isCardOnDashboard,
  } = useDashboardLayout();

  // Compute set of card IDs on dashboard for modal
  const cardsOnDashboardSet = useMemo(() => {
    const ids = new Set<string>();
    layout.rows.forEach(row => row.cards.forEach(card => ids.add(card.id)));
    return ids;
  }, [layout]);

  const handleDragStart = (cardId: string) => {
    setDraggingCardId(cardId);
  };

  const handleDragOver = (cardId: string) => {
    if (draggingCardId && cardId !== draggingCardId) {
      setDragOverCardId(cardId);
    }
  };

  const handleDragOverRow = (rowId: string) => {
    if (draggingCardId) {
      setDragOverRowId(rowId);
    }
  };

  const handleDragEnd = () => {
    if (draggingCardId && dragOverCardId) {
      moveCard(draggingCardId, dragOverCardId);
    } else if (draggingCardId && dragOverRowId) {
      moveCardToRow(draggingCardId, dragOverRowId);
    }
    setDraggingCardId(null);
    setDragOverCardId(null);
    setDragOverRowId(null);
  };

  // Sample equity data for pinned journal equity card - must be before early return
  const journalEquityData = useMemo(() => {
    const sampleTrades = [
      { date: '2025-01-03', pnl: 450 },
      { date: '2025-01-06', pnl: 300 },
      { date: '2025-01-08', pnl: -400 },
      { date: '2025-01-10', pnl: 480 },
      { date: '2025-01-12', pnl: -400 },
      { date: '2025-01-13', pnl: -73 },
      { date: '2025-01-14', pnl: 1350 },
      { date: '2025-01-15', pnl: 600 },
    ];
    let cumulative = 0;
    return sampleTrades.map(t => {
      cumulative += t.pnl;
      return { 
        date: t.date, 
        equity: cumulative,
        formattedDate: format(new Date(t.date), 'MMM d')
      };
    });
  }, []);

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  // Render card content based on card ID and slot type
  const renderCardContent = (cardEntry: DashboardCardEntry, slotType: 'wide' | 'narrow' | 'equal' | 'hero' | 'kpi'): React.ReactNode => {
    // Handle pinned cards first
    if (cardEntry.isPinned) {
      return getPinnedCardContent(cardEntry, slotType);
    }

    // Handle default dashboard cards
    switch (cardEntry.id) {
      case 'todays-bias':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Bias</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">Bullish</div>
              <p className="text-xs text-muted-foreground mt-1">85% confidence</p>
            </CardContent>
          </Card>
        );

      case 'active-trades':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Trades</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">3</div>
              <p className="text-xs text-success mt-1">+$2,450 unrealized</p>
            </CardContent>
          </Card>
        );

      case 'next-session':
        return (
          <div className="relative h-full" ref={sessionCardRef}>
            <Card 
              className="cursor-pointer hover:bg-muted/30 transition-colors h-full"
              onClick={() => !isEditMode && setShowSessionDropdown(!showSessionDropdown)}
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
              isOpen={showSessionDropdown && !isEditMode}
              onClose={() => setShowSessionDropdown(false)}
              sessions={sessionsData}
              anchorRef={sessionCardRef}
            />
          </div>
        );

      case 'high-impact-events':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">High Impact Events</CardTitle>
              <CalendarIcon className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">5</div>
              <p className="text-xs text-muted-foreground mt-1">Today</p>
            </CardContent>
          </Card>
        );

      case 'watchlist-overview':
        return <WatchlistOverviewCard isEditMode={isEditMode} slotType={slotType} />;

      case 'session-timers':
        return (
          <Card className="h-full">
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
        );

      case 'upcoming-events':
        return (
          <Card className="h-full">
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
        );

      case 'performance-overview':
        return (
          <Card className="h-full">
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
        );

      case 'journal-summary':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Journal Summary</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Entries This Week</span>
                  <span className="font-medium text-foreground">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg. Mood</span>
                  <span className="font-medium text-success">Positive</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Entry</span>
                  <span className="font-medium text-foreground">2h ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'risk-snapshot':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Risk Snapshot</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Daily Drawdown</span>
                  <span className="font-medium text-foreground">1.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Max Position</span>
                  <span className="font-medium text-foreground">2.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Risk Status</span>
                  <span className="font-medium text-success">Healthy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'calendar-events':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Week Ahead</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground min-w-[40px]">Mon</div>
                  <div className="text-sm text-foreground">FOMC Minutes</div>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto shrink-0" />
                </div>
                <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground min-w-[40px]">Wed</div>
                  <div className="text-sm text-foreground">CPI Data</div>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto shrink-0" />
                </div>
                <div className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground min-w-[40px]">Fri</div>
                  <div className="text-sm text-foreground">NFP Release</div>
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive ml-auto shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const getPinnedCardContent = (cardEntry: DashboardCardEntry, slotType: 'wide' | 'narrow' | 'equal' | 'hero' | 'kpi'): React.ReactNode => {
    const chartHeight = slotType === 'hero' ? 'h-64' : 'h-40';
    const cardId = cardEntry.id;
    
    // Handle by cardId for consistent rendering
    switch (cardId) {
      // Journal Equity Curve
      case 'pinned-journal-equity':
        return (
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Journal Equity Curve</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className={chartHeight}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={journalEquityData}>
                    <defs>
                      <linearGradient id="pinnedEquityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="formattedDate" 
                      tick={{ fontSize: 10 }} 
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={{ stroke: 'hsl(var(--border))' }}
                      tickFormatter={(value) => `£${value}`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-xs text-muted-foreground">{data.formattedDate}</p>
                              <p className={`text-sm font-semibold ${data.equity >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {data.equity >= 0 ? '+' : ''}£{data.equity.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#pinnedEquityGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      // Reports Overview - Individual KPI Cards
      case 'reports-kpi-total-pnl':
        return (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">+£2,307</p>
            </CardContent>
          </Card>
        );

      case 'reports-kpi-avg-rr':
        return (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg R:R</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">1.85</p>
            </CardContent>
          </Card>
        );

      case 'reports-kpi-win-rate':
        return (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">66.7%</p>
            </CardContent>
          </Card>
        );

      case 'reports-kpi-expectancy':
        return (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expectancy</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">£256/trade</p>
            </CardContent>
          </Card>
        );

      // Best/Worst Days
      case 'reports-overview-best-day':
        return (
          <Card className="h-full bg-success/5 border-success/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Best Winning Day</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">+£1,200</p>
              <p className="text-xs text-muted-foreground mt-1">2025-01-14</p>
            </CardContent>
          </Card>
        );

      case 'reports-overview-worst-day':
        return (
          <Card className="h-full bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-destructive" />
                  <CardTitle className="text-sm font-medium text-muted-foreground">Worst Losing Day</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">-£400</p>
              <p className="text-xs text-muted-foreground mt-1">2025-01-12</p>
            </CardContent>
          </Card>
        );

      // Overview Equity Curve
      case 'reports-overview-equity':
        return (
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className={chartHeight}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={journalEquityData}>
                    <defs>
                      <linearGradient id="overviewEquityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`£${value.toLocaleString()}`, 'Equity']}
                    />
                    <Area type="monotone" dataKey="equity" stroke="hsl(var(--primary))" fill="url(#overviewEquityGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      // Rolling 30-Day
      case 'reports-overview-rolling30':
        return (
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Rolling 30-Day</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className={chartHeight}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={journalEquityData.slice(-30)}>
                    <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `£${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                      formatter={(value: number) => [`£${value.toLocaleString()}`, 'Cumulative P&L']}
                    />
                    <Area type="monotone" dataKey="equity" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );

      // Strongest Edge
      case 'reports-overview-edge':
        return (
          <Card className="h-full border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Your Strongest Edge</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Pinned</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">High-confidence setups with 4+ star ratings</p>
            </CardContent>
          </Card>
        );

      // Fallback: render a warning card with remove option
      default:
        return (
          <Card className="h-full border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-amber-600">Unknown Card</CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Card ID: {cardId}</p>
              <p className="text-xs text-muted-foreground">This card type is not recognized. Use Edit mode to remove it.</p>
            </CardContent>
          </Card>
        );
    }
  };

  const handleAddRow = (afterRowId?: string) => {
    addRow('equal', afterRowId);
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Dashboard" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Header with Edit Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-foreground">Welcome, Trader</h1>
              {isEditMode && (
                <p className="text-sm text-muted-foreground">
                  Drag cards to reorder • Click × to remove • Change row layouts
                </p>
              )}
            </div>
            <DashboardEditToolbar
              isEditMode={isEditMode}
              onToggleEdit={toggleEditMode}
              onReset={resetToDefault}
              onOpenAddCards={() => setShowAddCardsModal(true)}
            />
          </div>
          
          {/* Row-based layout */}
          {layout.rows.map((row, index) => (
            <DashboardRow
              key={row.id}
              row={row}
              rowIndex={index}
              totalRows={layout.rows.length}
              isEditMode={isEditMode}
              draggingCardId={draggingCardId}
              dragOverCardId={dragOverCardId}
              dragOverRowId={dragOverRowId}
              renderCardContent={renderCardContent}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragOverRow={handleDragOverRow}
              onRemoveCard={removeCard}
              onChangeRowType={changeRowType}
              onMoveRow={moveRow}
              onRemoveRow={removeRow}
              onAddRow={handleAddRow}
              maxSlots={getMaxSlots(row.type)}
            />
          ))}

          {/* Add row button in edit mode */}
          {isEditMode && (
            <Button
              variant="outline"
              className="w-full border-dashed gap-2"
              onClick={() => handleAddRow()}
            >
              <Plus className="h-4 w-4" />
              Add New Row
            </Button>
          )}

          {/* Empty state when no cards */}
          {layout.rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-4">No cards on your Dashboard.</p>
              <p className="text-sm text-muted-foreground">
                Click "Edit Dashboard" and then "Add Cards" to customize.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Cards Modal */}
      <AddCardsModal
        open={showAddCardsModal}
        onOpenChange={setShowAddCardsModal}
        cardsOnDashboard={cardsOnDashboardSet}
        onAddCard={addCard}
        onRemoveCard={removeCard}
      />
    </div>
  );
}
