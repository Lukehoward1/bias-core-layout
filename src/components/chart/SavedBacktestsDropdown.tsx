import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  Save, 
  GitCompare, 
  ChevronDown,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

export interface SavedBacktest {
  id: string;
  strategyName: string;
  pair: string;
  timeframe: string;
  savedAt: Date;
  netProfit: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgRR: number;
  maxDrawdown: number;
}

interface SavedBacktestsDropdownProps {
  savedBacktests: SavedBacktest[];
  onSave: () => void;
  onLoad: (id: string) => void;
  onCompare: (ids: string[]) => void;
}

export function SavedBacktestsDropdown({
  savedBacktests,
  onSave,
  onLoad,
  onCompare,
}: SavedBacktestsDropdownProps) {
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  const handleToggleCompare = (id: string) => {
    setSelectedForCompare(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleCompare = () => {
    if (selectedForCompare.length >= 2) {
      onCompare(selectedForCompare);
      setCompareModalOpen(false);
      setSelectedForCompare([]);
    }
  };

  const selectedBacktests = savedBacktests.filter(b => selectedForCompare.includes(b.id));

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium gap-1.5 border-border/50 hover:bg-muted"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Saved Backtests
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-card border-border">
          <DropdownMenuItem onClick={onSave} className="cursor-pointer">
            <Save className="h-4 w-4 mr-2" />
            Save Current Backtest
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => setLoadModalOpen(true)} 
            className="cursor-pointer"
            disabled={savedBacktests.length === 0}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Load Saved Backtest
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setCompareModalOpen(true)}
            className="cursor-pointer"
            disabled={savedBacktests.length < 2}
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare Backtests
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Load Modal */}
      <Dialog open={loadModalOpen} onOpenChange={setLoadModalOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Load Saved Backtest</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {savedBacktests.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No saved backtests yet</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {savedBacktests.map(backtest => (
                  <div
                    key={backtest.id}
                    onClick={() => {
                      onLoad(backtest.id);
                      setLoadModalOpen(false);
                    }}
                    className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{backtest.strategyName}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs">
                          {backtest.pair.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {backtest.timeframe.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className={backtest.netProfit >= 0 ? 'text-success' : 'text-destructive'}>
                          {backtest.netProfit >= 0 ? '+' : ''}${backtest.netProfit.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">{backtest.winRate}% PR</span>
                        <span className="text-muted-foreground">{backtest.totalTrades} trades</span>
                      </div>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(backtest.savedAt, 'MMM dd, HH:mm')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Compare Modal */}
      <Dialog open={compareModalOpen} onOpenChange={setCompareModalOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Compare Backtests</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select 2-3 backtests to compare side-by-side
            </p>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2 pr-4">
                {savedBacktests.map(backtest => (
                  <div
                    key={backtest.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      selectedForCompare.includes(backtest.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedForCompare.includes(backtest.id)}
                        onCheckedChange={() => handleToggleCompare(backtest.id)}
                        disabled={!selectedForCompare.includes(backtest.id) && selectedForCompare.length >= 3}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{backtest.strategyName}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-xs">
                              {backtest.pair.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs mt-1 text-muted-foreground">
                          <span className={backtest.netProfit >= 0 ? 'text-success' : 'text-destructive'}>
                            {backtest.netProfit >= 0 ? '+' : ''}${backtest.netProfit.toLocaleString()}
                          </span>
                          <span>{backtest.winRate}% PR</span>
                          <span>PF: {backtest.profitFactor}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Comparison Preview */}
            {selectedForCompare.length >= 2 && (
              <div className="border border-border rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Comparison Preview
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-normal">Metric</th>
                        {selectedBacktests.map(b => (
                          <th key={b.id} className="text-center py-2 font-medium">
                            {b.strategyName.substring(0, 15)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">Net Profit</td>
                        {selectedBacktests.map(b => (
                          <td key={b.id} className={`text-center py-2 ${b.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            ${b.netProfit.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">Profit Rate</td>
                        {selectedBacktests.map(b => (
                          <td key={b.id} className="text-center py-2">{b.winRate}%</td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">Profit Factor</td>
                        {selectedBacktests.map(b => (
                          <td key={b.id} className={`text-center py-2 ${b.profitFactor >= 1 ? 'text-primary' : 'text-destructive'}`}>
                            {b.profitFactor}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-2 text-muted-foreground">Avg R:R</td>
                        {selectedBacktests.map(b => (
                          <td key={b.id} className="text-center py-2">{b.avgRR}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-2 text-muted-foreground">Max Drawdown</td>
                        {selectedBacktests.map(b => (
                          <td key={b.id} className="text-center py-2 text-destructive">{b.maxDrawdown}%</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCompareModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCompare}
                disabled={selectedForCompare.length < 2}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Compare ({selectedForCompare.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
