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
import { Play, BarChart3, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CandlestickChart } from "@/components/CandlestickChart";
import { generateMockOhlcData } from "@/lib/mockOhlcData";
import { SessionsPanel } from "@/components/strategy/SessionsPanel";
import { useStrategySessions } from "@/hooks/use-strategy-sessions";
import { toast } from "@/hooks/use-toast";

export default function StrategyTester() {
  const navigate = useNavigate();
  const [selectedPair, setSelectedPair] = useState("eurusd");
  const [selectedTimeframe, setSelectedTimeframe] = useState("h1");
  const [selectedStrategy, setSelectedStrategy] = useState("ma-cross");
  const [hasRunBacktest, setHasRunBacktest] = useState(false);

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

  const handleRunBacktest = () => {
    setHasRunBacktest(true);
    toast({
      title: "Backtest Complete",
      description: "Strategy results have been calculated.",
    });
  };

  const handleSaveSession = () => {
    const activeIndicators: string[] = ["SMA 20", "SMA 50"]; // Would come from chart state
    const session = saveSession(selectedPair, selectedTimeframe, selectedStrategy, activeIndicators);
    toast({
      title: "Session Saved",
      description: `"${session.name}" has been saved.`,
    });
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
                  <SelectContent>
                    <SelectItem value="eurusd">EURUSD</SelectItem>
                    <SelectItem value="gbpusd">GBPUSD</SelectItem>
                    <SelectItem value="usdjpy">USDJPY</SelectItem>
                    <SelectItem value="xauusd">XAUUSD</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ma-cross">MA Crossover</SelectItem>
                    <SelectItem value="rsi-divergence">RSI Divergence</SelectItem>
                    <SelectItem value="support-resistance">Support/Resistance</SelectItem>
                  </SelectContent>
                </Select>

                <Button className="ml-auto h-9" onClick={handleRunBacktest}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Chart Card - Dominant element */}
          <Card className="flex-1">
            <CardContent className="p-0">
              <div className="h-[calc(65vh-120px)] min-h-[400px] md:h-[calc(70vh-100px)]">
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
                  <Badge variant="secondary" className="text-xs">Last run: 2 mins ago</Badge>
                  {hasRunBacktest && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8"
                      onClick={handleSaveSession}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Session
                    </Button>
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
                  <div className="text-lg font-bold text-success">+$12,450</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Total Trades</div>
                  <div className="text-lg font-bold text-foreground">184</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-foreground">64.7%</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Profit Factor</div>
                  <div className="text-lg font-bold text-primary">1.85</div>
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
