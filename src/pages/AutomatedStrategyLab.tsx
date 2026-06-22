import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Play, Loader2, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

// Demo markets list
const DEMO_MARKETS = [
  { value: 'EURUSD', label: 'EUR/USD' },
  { value: 'GBPUSD', label: 'GBP/USD' },
  { value: 'USDJPY', label: 'USD/JPY' },
  { value: 'XAUUSD', label: 'XAU/USD (Gold)' },
  { value: 'SPX500', label: 'S&P 500' },
  { value: 'BTCUSD', label: 'BTC/USD' },
  { value: 'AUDUSD', label: 'AUD/USD' },
  { value: 'USDCAD', label: 'USD/CAD' },
];

// Demo strategies
const DEMO_STRATEGIES = [
  { value: 'ema-crossover', label: 'EMA Crossover' },
  { value: 'breakout-range', label: 'Breakout Range' },
  { value: 'session-momentum', label: 'Session Momentum' },
  { value: 'mean-reversion', label: 'Mean Reversion' },
  { value: 'trend-following', label: 'Trend Following' },
];

// Demo results
const DEMO_RESULTS = {
  netPnL: 4850.32,
  winRate: 62.5,
  maxDrawdown: 8.2,
  profitFactor: 1.78,
  topMarkets: [
    { symbol: 'XAUUSD', pnl: 2340.50, winRate: 71.2 },
    { symbol: 'EURUSD', pnl: 1520.80, winRate: 65.0 },
    { symbol: 'GBPUSD', pnl: 989.02, winRate: 58.3 },
  ],
  worstMarkets: [
    { symbol: 'BTCUSD', pnl: -320.40, winRate: 42.1 },
    { symbol: 'USDJPY', pnl: -180.60, winRate: 48.5 },
  ],
};

export default function AutomatedStrategyLab() {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  
  // Form state
  const [strategy, setStrategy] = useState('');
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState('1h');
  const [riskPerTrade, setRiskPerTrade] = useState('1.0');
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-12-01');

  const handleRunBacktest = async () => {
    if (!strategy) {
      toast({
        title: "Select a Strategy",
        description: "Please select a strategy before running the backtest.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    
    // Simulate backtest processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsRunning(false);
    setHasResults(true);
    
    toast({
      title: "Backtest Complete",
      description: "Results have been loaded with demo data.",
    });
  };

  const toggleMarket = (market: string) => {
    setSelectedMarkets(prev => 
      prev.includes(market) 
        ? prev.filter(m => m !== market)
        : [...prev, market]
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <AppHeader title="Strategy Tester" />
      
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4 mb-6 animate-fade-in">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/strategy-tester')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Automated Strategy Lab</h1>
            <p className="text-sm text-muted-foreground">
              Configure and run multi-market backtests automatically.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration Form */}
            <Card className="border-border/50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Strategy */}
                <div className="space-y-2">
                  <Label>Strategy</Label>
                  <Select value={strategy} onValueChange={setStrategy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a strategy" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {DEMO_STRATEGIES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Markets Multi-select */}
                <div className="space-y-2">
                  <Label>Markets</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                    {DEMO_MARKETS.map(market => (
                      <Badge
                        key={market.value}
                        variant={selectedMarkets.includes(market.value) ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          selectedMarkets.includes(market.value) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleMarket(market.value)}
                      >
                        {market.label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedMarkets.length} market(s) selected
                  </p>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input 
                      type="date" 
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input 
                      type="date" 
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>

                {/* Timeframe */}
                <div className="space-y-2">
                  <Label>Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Risk Per Trade */}
                <div className="space-y-2">
                  <Label>Risk Per Trade (%)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(e.target.value)}
                    className="bg-background"
                  />
                </div>

                {/* Run Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleRunBacktest}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Backtest...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Backtest (demo)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Area */}
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className={`border-border/50 ${!hasResults && 'opacity-50'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Net P&L</div>
                    <div className={`text-xl font-bold ${hasResults && DEMO_RESULTS.netPnL >= 0 ? 'text-success' : hasResults ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {hasResults ? `$${DEMO_RESULTS.netPnL.toLocaleString()}` : '—'}
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-border/50 ${!hasResults && 'opacity-50'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Profit Rate</div>
                    <div className="text-xl font-bold text-foreground">
                      {hasResults ? `${DEMO_RESULTS.winRate}%` : '—'}
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-border/50 ${!hasResults && 'opacity-50'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Max Drawdown</div>
                    <div className="text-xl font-bold text-destructive">
                      {hasResults ? `${DEMO_RESULTS.maxDrawdown}%` : '—'}
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-border/50 ${!hasResults && 'opacity-50'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Profit Factor</div>
                    <div className={`text-xl font-bold ${hasResults && DEMO_RESULTS.profitFactor >= 1 ? 'text-primary' : hasResults ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {hasResults ? DEMO_RESULTS.profitFactor : '—'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Equity Curve Placeholder */}
              <Card className={`border-border/50 ${!hasResults && 'opacity-50'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Equity Curve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 bg-muted/20 rounded-lg flex items-center justify-center border border-border/30">
                    {hasResults ? (
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground mb-1">Demo Chart Placeholder</div>
                        <div className="text-xs text-muted-foreground/70">Real charts coming soon</div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Run backtest to see results</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Market Performance Tables */}
              <div className="grid grid-cols-1 gap-4">
                {/* Top Markets */}
                <Card className={`border-border/50 ${!hasResults && 'opacity-50'}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Top Performing Markets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasResults ? (
                      <div className="space-y-2">
                        {DEMO_RESULTS.topMarkets.map(market => (
                          <div key={market.symbol} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                            <span className="font-medium text-foreground">{market.symbol}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-success">+${market.pnl.toLocaleString()}</span>
                              <span className="text-muted-foreground">{market.winRate}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Worst Markets */}
                <Card className={`border-border/50 ${!hasResults && 'opacity-50'}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      Worst Performing Markets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasResults ? (
                      <div className="space-y-2">
                        {DEMO_RESULTS.worstMarkets.map(market => (
                          <div key={market.symbol} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                            <span className="font-medium text-foreground">{market.symbol}</span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-destructive">${market.pnl.toLocaleString()}</span>
                              <span className="text-muted-foreground">{market.winRate}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
