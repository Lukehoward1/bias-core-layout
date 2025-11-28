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
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

const trades = [
  { date: '2025-01-15', pair: 'EURUSD', type: 'Long', entry: 1.0850, exit: 1.0910, lots: 1.0, pnl: 600, status: 'closed' },
  { date: '2025-01-14', pair: 'GBPUSD', type: 'Short', entry: 1.2650, exit: 1.2620, lots: 0.5, pnl: 150, status: 'closed' },
  { date: '2025-01-14', pair: 'USDJPY', type: 'Long', entry: 148.20, exit: 148.80, lots: 2.0, pnl: 1200, status: 'closed' },
  { date: '2025-01-13', pair: 'XAUUSD', type: 'Long', entry: 2025.50, exit: 2018.20, lots: 0.1, pnl: -73, status: 'closed' },
  { date: '2025-01-12', pair: 'EURUSD', type: 'Short', entry: 1.0880, exit: 1.0920, lots: 1.0, pnl: -400, status: 'closed' },
];

export default function Journal() {
  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Journal" />
      
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue="journal" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2 h-9">
              <TabsTrigger value="journal" className="text-sm">Journal</TabsTrigger>
              <TabsTrigger value="reports" className="text-sm">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="journal" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Trades</CardTitle>
                    <Button size="sm" className="h-8">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trade
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-5">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Pair</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Entry</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Exit</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Lots</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">P&L</th>
                          <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/50 transition-colors">
                            <td className="py-3 px-5 text-sm text-muted-foreground">{trade.date}</td>
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
                                {trade.pnl >= 0 ? '+' : ''}${trade.pnl}
                              </span>
                            </td>
                            <td className="py-3 px-5">
                              <Badge variant="secondary" className="text-xs">{trade.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6 mt-6">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
