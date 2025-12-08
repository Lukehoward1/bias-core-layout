import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Layers,
  ChevronRight,
  ArrowLeft,
  Trash2,
  FileDown,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { StrategySession } from "@/types/strategySession";
import { SessionComparison } from "./SessionComparison";
import { MiniEquityCurve } from "./MiniEquityCurve";

interface SessionsPanelProps {
  sessions: StrategySession[];
  selectedSessionIds: string[];
  onToggleSelection: (id: string) => void;
  onClearSelection: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  getSelectedSessions: () => StrategySession[];
}

export function SessionsPanel({
  sessions,
  selectedSessionIds,
  onToggleSelection,
  onClearSelection,
  onDeleteSession,
  onRenameSession,
  onUpdateNotes,
  getSelectedSessions,
}: SessionsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewingSession, setViewingSession] = useState<StrategySession | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const handleStartCompare = () => {
    if (selectedSessionIds.length >= 2) {
      setIsComparing(true);
    }
  };

  const handleExitCompare = () => {
    setIsComparing(false);
    onClearSelection();
  };

  const handleStartRename = (session: StrategySession) => {
    setEditingName(session.id);
    setEditNameValue(session.name);
  };

  const handleSaveRename = (id: string) => {
    if (editNameValue.trim()) {
      onRenameSession(id, editNameValue.trim());
    }
    setEditingName(null);
  };

  const formatMetricValue = (value: number, prefix = "", suffix = "") => {
    const formatted = value >= 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
    return `${prefix}${formatted}${suffix}`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 rounded-l-lg rounded-r-none border-r-0 px-2 py-6 bg-background/95 backdrop-blur"
        >
          <Layers className="h-4 w-4" />
          <span className="ml-1 text-xs [writing-mode:vertical-lr] rotate-180">Sessions</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col">
        {isComparing ? (
          <SessionComparison
            sessions={getSelectedSessions()}
            onBack={handleExitCompare}
          />
        ) : viewingSession ? (
          // Session Detail View
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewingSession(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <SheetTitle className="text-base">Session Overview</SheetTitle>
              </div>
            </SheetHeader>
            <ScrollArea className="flex-1 p-4" hideScrollbar>
              <div className="space-y-4">
                {/* Session Name */}
                <div>
                  {editingName === viewingSession.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveRename(viewingSession.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingName(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{viewingSession.name}</h3>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleStartRename(viewingSession)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {viewingSession.pair.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {viewingSession.timeframe.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(viewingSession.timestamp), "MMM dd, yyyy HH:mm")}
                    </span>
                  </div>
                </div>

                {/* Mini Equity Curve */}
                <div className="bg-muted/30 rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-2">Equity Curve</div>
                  <MiniEquityCurve data={viewingSession.equityCurve} height={100} />
                </div>

                {/* Full Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Net Profit</div>
                    <div className={`text-lg font-bold ${viewingSession.metrics.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatMetricValue(viewingSession.metrics.netProfit, "$")}
                    </div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                    <div className="text-lg font-bold">{viewingSession.metrics.winRate}%</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Avg R:R</div>
                    <div className="text-lg font-bold">{viewingSession.metrics.avgRR}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Max Drawdown</div>
                    <div className="text-lg font-bold text-destructive">{viewingSession.metrics.maxDrawdown}%</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Expectancy</div>
                    <div className="text-lg font-bold">${viewingSession.metrics.expectancy}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Profit Factor</div>
                    <div className="text-lg font-bold text-primary">{viewingSession.metrics.profitFactor}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">Total Trades</div>
                    <div className="text-lg font-bold">{viewingSession.metrics.totalTrades}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-xs text-muted-foreground">W/L</div>
                    <div className="text-lg font-bold">
                      <span className="text-success">{viewingSession.metrics.winningTrades}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-destructive">{viewingSession.metrics.losingTrades}</span>
                    </div>
                  </div>
                </div>

                {/* Indicators Used */}
                {viewingSession.indicators.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Indicators Used</div>
                    <div className="flex flex-wrap gap-1">
                      {viewingSession.indicators.map((ind, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {ind}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <div className="text-xs text-muted-foreground mb-2">Notes</div>
                  <Textarea
                    placeholder="Add notes about this session..."
                    value={viewingSession.notes || ""}
                    onChange={(e) => onUpdateNotes(viewingSession.id, e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                </div>

                {/* Export */}
                <Button variant="outline" className="w-full" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Sessions List View
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle>Saved Sessions</SheetTitle>
                {selectedSessionIds.length >= 2 && (
                  <Button size="sm" onClick={handleStartCompare}>
                    Compare Selected ({selectedSessionIds.length})
                  </Button>
                )}
              </div>
            </SheetHeader>
            <ScrollArea className="flex-1" hideScrollbar>
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No saved sessions yet</p>
                  <p className="text-xs mt-1">Run a backtest and click "Save Session" to start</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedSessionIds.includes(session.id)}
                        onCheckedChange={() => onToggleSelection(session.id)}
                        className="shrink-0"
                      />
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setViewingSession(session)}
                      >
                        <div className="font-medium text-sm truncate">{session.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {session.pair.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {session.timeframe.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className={session.metrics.netProfit >= 0 ? 'text-success' : 'text-destructive'}>
                            {formatMetricValue(session.metrics.netProfit, "$")}
                          </span>
                          <span className="text-muted-foreground">
                            {session.metrics.winRate}% WR
                          </span>
                          <span className="text-muted-foreground">
                            {format(new Date(session.timestamp), "MMM dd")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <ChevronRight
                          className="h-4 w-4 text-muted-foreground cursor-pointer"
                          onClick={() => setViewingSession(session)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
