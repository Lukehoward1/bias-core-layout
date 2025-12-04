import { useState, useMemo } from "react";
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
import { Play, BarChart3, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CandlestickChart } from "@/components/CandlestickChart";
import { generateMockOhlcData } from "@/lib/mockOhlcData";
import { SessionsPanel } from "@/components/strategy/SessionsPanel";
import { useStrategySessions } from "@/hooks/use-strategy-sessions";
import { NewStrategyModal } from "@/components/strategy/NewStrategyModal";
import { SavedBacktest } from "@/components/chart/SavedBacktestsDropdown";
import { toast } from "@/hooks/use-toast";

interface CustomStrategy {
  id: string;
  name: string;
  entryRules: string;
  exitRules: string;
  stopLoss: string;
  takeProfit: string;
  riskReward: string;
  positionSize: string;
}

export default function StrategyTester() {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState("eurusd");
  const [selectedTimeframe, setSelectedTimeframe] = useState("h1");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [hasRunBacktest, setHasRunBacktest] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>([]);
  const [savedBacktests, setSavedBacktests] = useState<SavedBacktest[]>([]);

  // Mock backtest results state
  const [backtestResults, setBacktestResults] = useState({
    netProfit: 12450,
    totalTrades: 184,
    winRate: 64.7,
    profitFactor: 1.85,
  });

  const {
    sessions,
    selectedSessionIds,
    saveSession,
    deleteSession,
    renameSession,
    updateSessionNotes,
    toggleSessionSelection,
    clearSelection,
    getSelectedSessions,
  } = useStrategySessions();

  // Generate mock data based on selected pair and timeframe
  const chartData = useMemo(() => {
    return generateMockOhlcData(selectedPair, selectedTimeframe, 200);
  }, [selectedPair, selectedTimeframe]);

  const handleRunBacktest = async () => {
    if (!selectedStrategy) {
      toast({
        title: "Select a Strategy",
        description: "Please select or create a strategy before running a backtest.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    
    // Simulate backtest processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate randomized but realistic mock results
    const newResults = {
      netProfit: Math.round((Math.random() * 25000 - 5000) * 100) / 100,
      totalTrades: Math.floor(Math.random() * 200) + 50,
      winRate: Math.round((Math.random() * 30 + 45) * 10) / 10,
      profitFactor: Math.round((Math.random() * 1.5 + 0.8) * 100) / 100,
    };
    
    setBacktestResults(newResults);
    setHasRunBacktest(true);
    setIsRunning(false);
    
    toast({
      title: "Backtest Complete",
      description: `${newResults.totalTrades} trades analyzed with ${newResults.winRate}% win rate.`,
    });
  };

  const handleSaveSession = () => {
    const activeIndicators: string[] = ["SMA 20", "SMA 50"];
    const session = saveSession(selectedPair, selectedTimeframe, selectedStrategy, activeIndicators);
    toast({
      title: "Session Saved",
      description: `"${session.name}" has been saved.`,
    });
  };

  const handleSaveBacktest = () => {
    if (!hasRunBacktest) {
      toast({
        title: "No Backtest Results",
        description: "Run a backtest first before saving.",
        variant: "destructive",
      });
      return;
    }

    const newBacktest: SavedBacktest = {
      id: `bt-${Date.now()}`,
      strategyName: getStrategyName(selectedStrategy),
      pair: selectedPair,
      timeframe: selectedTimeframe,
      savedAt: new Date(),
      netProfit: backtestResults.netProfit,
      winRate: backtestResults.winRate,
      totalTrades: backtestResults.totalTrades,
      profitFactor: backtestResults.profitFactor,
      avgRR: Math.round((Math.random() * 2 + 1) * 100) / 100,
      maxDrawdown: Math.round(Math.random() * 20 + 5),
    };

    setSavedBacktests(prev => [newBacktest, ...prev]);
    toast({
      title: "Backtest Saved",
      description: `"${newBacktest.strategyName}" results have been saved.`,
    });
  };

  const handleLoadBacktest = (id: string) => {
    const backtest = savedBacktests.find(b => b.id === id);
    if (backtest) {
      setBacktestResults({
        netProfit: backtest.netProfit,
        totalTrades: backtest.totalTrades,
        winRate: backtest.winRate,
        profitFactor: backtest.profitFactor,
      });
      setHasRunBacktest(true);
      toast({
        title: "Backtest Loaded",
        description: `Loaded "${backtest.strategyName}" results.`,
      });
    }
  };

  const handleCompareBacktests = (ids: string[]) => {
    toast({
      title: "Comparison Ready",
      description: `Comparing ${ids.length} backtests.`,
    });
  };

  const handleCreateStrategy = (strategy: Omit<CustomStrategy, 'id'>) => {
    const newStrategy: CustomStrategy = {
      ...strategy,
      id: `custom-${Date.now()}`,
    };
    setCustomStrategies(prev => [...prev, newStrategy]);
    setSelectedStrategy(newStrategy.id);
    toast({
      title: "Strategy Created",
      description: `"${strategy.name}" has been created.`,
    });
  };

  const getStrategyName = (id: string) => {
    const presets: Record<string, string> = {
      'ma-cross': 'MA Crossover',
      'rsi-divergence': 'RSI Divergence',
      'support-resistance': 'Support/Resistance',
    };
    const custom = customStrategies.find(s => s.id === id);
    return custom?.name || presets[id] || 'Select Strategy';
  };

  return (
    <div className="flex flex-col min-h-full bg-background">
      <AppHeader title="Strategy Tester" />
      
      <div className="flex-1 p-3 md:p-4">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-3">
          {/* Top Control Bar */}
          <Card className="border-border/50">
            <CardContent className="py-2.5 px-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-[110px] h-8 text-xs">
                    <SelectValue placeholder="Pair" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="eurusd">EURUSD</SelectItem>
                    <SelectItem value="gbpusd">GBPUSD</SelectItem>
                    <SelectItem value="usdjpy">USDJPY</SelectItem>
                    <SelectItem value="xauusd">XAUUSD</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Select Strategy" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="ma-cross">MA Crossover</SelectItem>
                    <SelectItem value="rsi-divergence">RSI Divergence</SelectItem>
                    <SelectItem value="support-resistance">Support/Resistance</SelectItem>
                    {customStrategies.map(strategy => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <NewStrategyModal onCreateStrategy={handleCreateStrategy} />

                <Button 
                  className="ml-auto h-8 text-xs" 
                  onClick={handleRunBacktest}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Run Backtest
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Chart Card */}
          <Card className="flex-1 border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[calc(72vh-120px)] min-h-[450px] md:h-[calc(76vh-100px)]">
                <CandlestickChart 
                  data={chartData} 
                  pair={selectedPair} 
                  timeframe={selectedTimeframe}
                  onTimeframeChange={setSelectedTimeframe}
                  savedBacktests={savedBacktests}
                  onSaveBacktest={handleSaveBacktest}
                  onLoadBacktest={handleLoadBacktest}
                  onCompareBacktests={handleCompareBacktests}
                />
              </div>
            </CardContent>
          </Card>

          {/* Strategy Results */}
          <Card className="border-border/50">
            <CardHeader className="py-2.5 px-3 md:px-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-sm">Strategy Results</CardTitle>
                <div className="flex items-center gap-2">
                  {hasRunBacktest && (
                    <>
                      <Badge variant="secondary" className="text-xs h-5">
                        {getStrategyName(selectedStrategy)}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleSaveSession}
                      >
                        <Save className="h-3 w-3 mr-1.5" />
                        Save Session
                      </Button>
                    </>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => navigate('/journal')}
                  >
                    <BarChart3 className="h-3 w-3 mr-1.5" />
                    View Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 md:px-4 pb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Net Profit</div>
                  <div className={`text-base font-bold ${backtestResults.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {backtestResults.netProfit >= 0 ? '+' : ''}${backtestResults.netProfit.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Total Trades</div>
                  <div className="text-base font-bold text-foreground">{backtestResults.totalTrades}</div>
                </div>
                <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Win Rate</div>
                  <div className="text-base font-bold text-foreground">{backtestResults.winRate}%</div>
                </div>
                <div className="text-center p-2.5 bg-muted/30 rounded-lg">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Profit Factor</div>
                  <div className={`text-base font-bold ${backtestResults.profitFactor >= 1 ? 'text-primary' : 'text-destructive'}`}>
                    {backtestResults.profitFactor}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sessions Panel */}
      <SessionsPanel
        sessions={sessions}
        selectedSessionIds={selectedSessionIds}
        onToggleSelection={toggleSessionSelection}
        onClearSelection={clearSelection}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onUpdateNotes={updateSessionNotes}
        getSelectedSessions={getSelectedSessions}
      />
    </div>
  );
}
