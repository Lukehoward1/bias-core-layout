import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StrategyTester() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <AppHeader title="Strategy Tester" />
      
      <div className="flex-1 overflow-y-auto bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <Select defaultValue="eurusd">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Pair" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eurusd">EURUSD</SelectItem>
                    <SelectItem value="gbpusd">GBPUSD</SelectItem>
                    <SelectItem value="usdjpy">USDJPY</SelectItem>
                    <SelectItem value="xauusd">XAUUSD</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="h1">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m15">15 Minutes</SelectItem>
                    <SelectItem value="h1">1 Hour</SelectItem>
                    <SelectItem value="h4">4 Hours</SelectItem>
                    <SelectItem value="d1">Daily</SelectItem>
                  </SelectContent>
                </Select>

                <Select defaultValue="ma-cross">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ma-cross">MA Crossover</SelectItem>
                    <SelectItem value="rsi-divergence">RSI Divergence</SelectItem>
                    <SelectItem value="support-resistance">Support/Resistance</SelectItem>
                  </SelectContent>
                </Select>

                <Button className="ml-auto">
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardContent className="p-0">
              <div className="h-[600px] bg-muted/30 flex items-center justify-center border-b border-border">
                <p className="text-muted-foreground text-lg">TradingView-style chart placeholder</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Strategy Results</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Last run: 2 mins ago</Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/journal')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Detailed Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Net Profit</div>
                  <div className="text-2xl font-bold text-success">+$12,450</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Total Trades</div>
                  <div className="text-2xl font-bold text-foreground">184</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Percent Profitable</div>
                  <div className="text-2xl font-bold text-foreground">64.7%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Profit Factor</div>
                  <div className="text-2xl font-bold text-primary">1.85</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
