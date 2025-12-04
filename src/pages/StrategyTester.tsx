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
      
      <div className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          {/* Top Control Bar */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedPair} onValueChange={setSelectedPair}>
                  <SelectTrigger className="w-[130px] h-9">
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
                  <SelectTrigger className="w-[180px] h-9">
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
                  className="ml-auto h-9" 
                  onClick={handleRunBacktest}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Backtest
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Chart Card - Dominant element with increased height */}
          <Card className="flex-1">
            <CardContent className="p-0">
              <div className="h-[calc(70vh-100px)] min-h-[500px] md:h-[calc(75vh-80px)]">
                <CandlestickChart 
                  data={chartData} 
                  pair={selectedPair} 
                  timeframe={selectedTimeframe}
                  onTimeframeChange={setSelectedTimeframe}
                />
              </div>
            </CardContent>
          </Card>

          {/* Strategy Results - Full width below chart */}
          <Card>
            <CardHeader className="py-3 px-4 md:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base">Strategy Results</CardTitle>
                <div className="flex items-center gap-3">
                  {hasRunBacktest && (
                    <>
                      <Badge variant="secondary" className="text-xs">
                        {getStrategyName(selectedStrategy)}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8"
                        onClick={handleSaveSession}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Session
                      </Button>
                    </>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8"
                    onClick={() => navigate('/journal')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Detailed Report
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 md:px-6 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Net Profit</div>
                  <div className={`text-lg font-bold ${backtestResults.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {backtestResults.netProfit >= 0 ? '+' : ''}${backtestResults.netProfit.toLocaleString()}
                  </div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                  <div className="text-lg font-bold text-foreground">{backtestResults.totalTrades}</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-foreground">{backtestResults.winRate}%</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Profit Factor</div>
                  <div className={`text-lg font-bold ${backtestResults.profitFactor >= 1 ? 'text-primary' : 'text-destructive'}`}>
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
