import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  Shield, 
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

// Demo daily stats data
const DEMO_DAILY_STATS = [
  { date: 'Dec 2', pnl: 450.20, maxDD: 1.2, status: 'pass' },
  { date: 'Dec 3', pnl: -180.50, maxDD: 3.1, status: 'pass' },
  { date: 'Dec 4', pnl: 620.80, maxDD: 0.8, status: 'pass' },
  { date: 'Dec 5', pnl: -520.30, maxDD: 5.2, status: 'warning' },
  { date: 'Dec 6', pnl: 380.10, maxDD: 1.5, status: 'pass' },
];

export default function FundingChallengeSim() {
  const navigate = useNavigate();
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Form state
  const [accountSize, setAccountSize] = useState('25000');
  const [dailyMaxDD, setDailyMaxDD] = useState('5');
  const [overallMaxDD, setOverallMaxDD] = useState('10');
  const [profitTarget, setProfitTarget] = useState('10');
  const [timeLimit, setTimeLimit] = useState('30');
  const [includeWeekends, setIncludeWeekends] = useState(false);

  // Demo simulation state
  const [simProgress, setSimProgress] = useState(35);
  const [currentPnL, setCurrentPnL] = useState(1250.30);
  const [bestDay, setBestDay] = useState(620.80);
  const [worstDay, setWorstDay] = useState(-520.30);
  const [daysTraded, setDaysTraded] = useState(5);
  const [ruleBreaches, setRuleBreaches] = useState(1);

  const handleStartSimulation = () => {
    setIsSimulating(true);
    toast({
      title: "Simulation Started",
      description: "Demo simulation is now running with placeholder data.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'fail': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
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
            <h1 className="text-2xl font-bold text-foreground">Funding Challenge Simulator</h1>
            <p className="text-sm text-muted-foreground">
              Simulate prop-firm style rules before you risk a real evaluation account.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Rules Configuration */}
            <Card className="border-border/50 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Challenge Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Account Size */}
                <div className="space-y-2">
                  <Label>Account Size</Label>
                  <Select value={accountSize} onValueChange={setAccountSize}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="10000">$10,000</SelectItem>
                      <SelectItem value="25000">$25,000</SelectItem>
                      <SelectItem value="50000">$50,000</SelectItem>
                      <SelectItem value="100000">$100,000</SelectItem>
                      <SelectItem value="200000">$200,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Daily Max Drawdown */}
                <div className="space-y-2">
                  <Label>Daily Max Drawdown (%)</Label>
                  <Input 
                    type="number" 
                    step="0.5"
                    value={dailyMaxDD}
                    onChange={(e) => setDailyMaxDD(e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Max: ${((parseFloat(accountSize) * parseFloat(dailyMaxDD)) / 100).toLocaleString()}
                  </p>
                </div>

                {/* Overall Max Drawdown */}
                <div className="space-y-2">
                  <Label>Overall Max Drawdown (%)</Label>
                  <Input 
                    type="number" 
                    step="0.5"
                    value={overallMaxDD}
                    onChange={(e) => setOverallMaxDD(e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Max: ${((parseFloat(accountSize) * parseFloat(overallMaxDD)) / 100).toLocaleString()}
                  </p>
                </div>

                {/* Profit Target */}
                <div className="space-y-2">
                  <Label>Profit Target (%)</Label>
                  <Input 
                    type="number" 
                    step="0.5"
                    value={profitTarget}
                    onChange={(e) => setProfitTarget(e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: ${((parseFloat(accountSize) * parseFloat(profitTarget)) / 100).toLocaleString()}
                  </p>
                </div>

                {/* Time Limit */}
                <div className="space-y-2">
                  <Label>Time Limit (Trading Days)</Label>
                  <Select value={timeLimit} onValueChange={setTimeLimit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="10">10 Days</SelectItem>
                      <SelectItem value="20">20 Days</SelectItem>
                      <SelectItem value="30">30 Days</SelectItem>
                      <SelectItem value="45">45 Days</SelectItem>
                      <SelectItem value="60">60 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Include Weekends Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div>
                    <Label className="text-sm">Include Weekend Days</Label>
                    <p className="text-xs text-muted-foreground">Count weekends in time limit</p>
                  </div>
                  <Switch 
                    checked={includeWeekends} 
                    onCheckedChange={setIncludeWeekends}
                  />
                </div>

                {/* Start Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleStartSimulation}
                  disabled={isSimulating}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isSimulating ? 'Simulation Running...' : 'Start Simulation (demo)'}
                </Button>
              </CardContent>
            </Card>

            {/* Progress & Stats */}
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              {/* Progress Bar */}
              <Card className={`border-border/50 ${!isSimulating && 'opacity-50'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">Phase 1 Progress</span>
                    <Badge variant="outline" className="text-primary border-primary/30">
                      {isSimulating ? `${simProgress}%` : '—'}
                    </Badge>
                  </div>
                  <Progress value={isSimulating ? simProgress : 0} className="h-3" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {isSimulating 
                      ? `${daysTraded} of ${timeLimit} trading days completed`
                      : 'Start simulation to track progress'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className={`border-border/50 ${!isSimulating && 'opacity-50'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Current P&L</div>
                    <div className={`text-xl font-bold ${isSimulating && currentPnL >= 0 ? 'text-success' : 'text-muted-foreground'}`}>
                      {isSimulating ? `$${currentPnL.toLocaleString()}` : '—'}
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-border/50 ${!isSimulating && 'opacity-50'}`}>
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Days Traded</div>
                    <div className="text-xl font-bold text-foreground">
                      {isSimulating ? daysTraded : '—'}
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-border/50 ${!isSimulating && 'opacity-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-3.5 w-3.5 text-success" />
                      <span className="text-xs text-muted-foreground">Best Day</span>
                    </div>
                    <div className="text-lg font-bold text-success">
                      {isSimulating ? `+$${bestDay.toLocaleString()}` : '—'}
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-border/50 ${!isSimulating && 'opacity-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs text-muted-foreground">Worst Day</span>
                    </div>
                    <div className="text-lg font-bold text-destructive">
                      {isSimulating ? `$${worstDay.toLocaleString()}` : '—'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rule Breaches */}
              <Card className={`border-border/50 ${!isSimulating && 'opacity-50'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${isSimulating && ruleBreaches > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium">Rule Breaches</span>
                    </div>
                    <Badge variant={isSimulating && ruleBreaches > 0 ? "destructive" : "secondary"}>
                      {isSimulating ? `Daily DD breached: ${ruleBreaches}` : 'None'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Stats Table */}
              <Card className={`border-border/50 ${!isSimulating && 'opacity-50'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Daily Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isSimulating ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-2 text-muted-foreground font-medium">Date</th>
                            <th className="text-right py-2 text-muted-foreground font-medium">P&L</th>
                            <th className="text-right py-2 text-muted-foreground font-medium">Max DD</th>
                            <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DEMO_DAILY_STATS.map((day, index) => (
                            <tr key={index} className="border-b border-border/30 last:border-0">
                              <td className="py-2.5 text-foreground">{day.date}</td>
                              <td className={`py-2.5 text-right font-medium ${day.pnl >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(2)}
                              </td>
                              <td className="py-2.5 text-right text-muted-foreground">
                                {day.maxDD}%
                              </td>
                              <td className="py-2.5 text-center">
                                {getStatusIcon(day.status)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      Start simulation to see daily stats
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
