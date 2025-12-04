import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";

const trades = [
  { date: '2025-01-15', pair: 'EURUSD', type: 'Long', entry: 1.0850, exit: 1.0910, lots: 1.0, pnl: 600, status: 'closed' },
  { date: '2025-01-14', pair: 'GBPUSD', type: 'Short', entry: 1.2650, exit: 1.2620, lots: 0.5, pnl: 150, status: 'closed' },
  { date: '2025-01-14', pair: 'USDJPY', type: 'Long', entry: 148.20, exit: 148.80, lots: 2.0, pnl: 1200, status: 'closed' },
  { date: '2025-01-13', pair: 'XAUUSD', type: 'Long', entry: 2025.50, exit: 2018.20, lots: 0.1, pnl: -73, status: 'closed' },
  { date: '2025-01-12', pair: 'EURUSD', type: 'Short', entry: 1.0880, exit: 1.0920, lots: 1.0, pnl: -400, status: 'closed' },
  { date: '2025-01-10', pair: 'GBPUSD', type: 'Long', entry: 1.2580, exit: 1.2640, lots: 0.8, pnl: 480, status: 'closed' },
  { date: '2025-01-08', pair: 'EURUSD', type: 'Long', entry: 1.0820, exit: 1.0780, lots: 1.0, pnl: -400, status: 'closed' },
  { date: '2025-01-06', pair: 'XAUUSD', type: 'Short', entry: 2040.00, exit: 2025.00, lots: 0.2, pnl: 300, status: 'closed' },
  { date: '2025-01-03', pair: 'USDJPY', type: 'Short', entry: 149.50, exit: 149.20, lots: 1.5, pnl: 450, status: 'closed' },
];

// Helper to get daily summary
function getDailySummary(date: Date) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayTrades = trades.filter(t => t.date === dateStr);
  const totalPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
  return { trades: dayTrades, totalPnl, tradeCount: dayTrades.length };
}

export default function Journal() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 0, 1)); // January 2025
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Generate calendar days
  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  const handleDayClick = (date: Date) => {
    const summary = getDailySummary(date);
    if (summary.tradeCount > 0) {
      setSelectedDay(date);
      setIsDialogOpen(true);
    }
  };

  const selectedDayTrades = selectedDay ? getDailySummary(selectedDay).trades : [];

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Journal" />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="journal" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="journal" className="text-sm">Journal</TabsTrigger>
              <TabsTrigger value="reports" className="text-sm">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="journal" className="space-y-6 mt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Trades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">127</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">68%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total P&L</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">+$24,680</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg R:R</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">2.1</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Equity Curve</CardTitle>
                    <Badge variant="outline" className="text-xs">MT5 - Live</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-56 bg-muted/30 rounded-lg flex items-center justify-center border border-border">
                    <p className="text-sm text-muted-foreground">Chart placeholder - Equity curve visualization</p>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Performance Calendar */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Daily Performance</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium min-w-[120px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                      <div key={dayName} className="text-center text-xs font-medium text-muted-foreground py-2">
                        {dayName}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((date, idx) => {
                      const summary = getDailySummary(date);
                      const isCurrentMonth = isSameMonth(date, currentMonth);
                      const hasTrades = summary.tradeCount > 0;
                      
                      let bgClass = "bg-muted/20";
                      let pnlColorClass = "text-muted-foreground";
                      
                      if (hasTrades) {
                        if (summary.totalPnl > 0) {
                          bgClass = "bg-success/10 hover:bg-success/20";
                          pnlColorClass = "text-success";
                        } else if (summary.totalPnl < 0) {
                          bgClass = "bg-destructive/10 hover:bg-destructive/20";
                          pnlColorClass = "text-destructive";
                        } else {
                          bgClass = "bg-muted/30 hover:bg-muted/40";
                          pnlColorClass = "text-muted-foreground";
                        }
                      }
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => hasTrades && handleDayClick(date)}
                          className={`
                            min-h-[80px] p-2 rounded-lg border border-border/50 flex flex-col
                            ${bgClass}
                            ${!isCurrentMonth ? 'opacity-30' : ''}
                            ${hasTrades ? 'cursor-pointer transition-colors' : ''}
                          `}
                        >
                          <span className={`text-xs ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {format(date, 'd')}
                          </span>
                          {hasTrades && isCurrentMonth && (
                            <>
                              <span className={`text-sm font-bold mt-auto ${pnlColorClass}`}>
                                {summary.totalPnl >= 0 ? '+' : ''}£{summary.totalPnl.toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {summary.tradeCount} trade{summary.tradeCount !== 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Day Detail Dialog */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>
                      Trades for {selectedDay ? format(selectedDay, 'EEEE, MMMM d, yyyy') : ''}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="overflow-x-auto">
                    {selectedDayTrades.length > 0 ? (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Date</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Pair</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Type</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Entry</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Exit</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Lots</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">P&L</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDayTrades.map((trade, i) => (
                            <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
                              <td className="py-3 px-4 text-sm text-muted-foreground">{trade.date}</td>
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="text-xs">{trade.pair}</Badge>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  {trade.type === 'Long' ? (
                                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                                  ) : (
                                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                                  )}
                                  <span className="text-sm text-foreground">{trade.type}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-foreground">{trade.entry}</td>
                              <td className="py-3 px-4 text-sm text-foreground">{trade.exit}</td>
                              <td className="py-3 px-4 text-sm text-foreground">{trade.lots}</td>
                              <td className="py-3 px-4">
                                <span className={`text-sm font-medium ${trade.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                  {trade.pnl >= 0 ? '+' : ''}£{trade.pnl}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant="secondary" className="text-xs">{trade.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">No trades for this day</p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6 mt-5">
              <div className="flex flex-wrap items-center gap-3">
                <Select defaultValue="performance">
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="performance">Performance Overview</SelectItem>
                    <SelectItem value="by-pair">By Pair</SelectItem>
                    <SelectItem value="by-session">By Session</SelectItem>
                    <SelectItem value="by-day">By Day of Week</SelectItem>
                    <SelectItem value="strategy">Strategy Comparison</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="live">
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Data source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live Account</SelectItem>
                    <SelectItem value="backtests">Backtests</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">68%</div>
                    <p className="text-xs text-success mt-1">+3% from last period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Average R</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">2.1</div>
                    <p className="text-xs text-success mt-1">+0.2 from last period</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Max Drawdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">-8.5%</div>
                    <p className="text-xs text-muted-foreground mt-1">Within acceptable limits</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Best Pair</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">EURUSD</div>
                    <p className="text-xs text-success mt-1">+$12,450</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Equity Curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 bg-muted/30 rounded-lg flex items-center justify-center border border-border">
                    <p className="text-sm text-muted-foreground">Equity curve visualization (Performance Overview)</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance by Pair</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 bg-muted/30 rounded-lg flex items-center justify-center border border-border">
                    <p className="text-sm text-muted-foreground">Bar chart showing P&L by trading pair</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
