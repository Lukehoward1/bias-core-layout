import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, Plus, Activity } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useWatchlist } from "@/hooks/use-watchlist";
import { useTraderStyle } from "@/context/TraderStyleProvider";
import { useMarketData } from "@/context/MarketDataProvider";
import { TRADE_INSTRUMENTS } from "@/data/tradeInstruments";

interface MarketsAtAGlanceCardProps {
  isEditMode?: boolean;
}

function BiasIcon({ biasState }: { biasState?: string }) {
  if (!biasState) return <Minus className="h-3 w-3" />;
  if (biasState.startsWith("Bullish")) return <TrendingUp className="h-3 w-3" />;
  if (biasState.startsWith("Bearish")) return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

function biasColor(biasState?: string): string {
  if (!biasState) return "text-muted-foreground";
  if (biasState.startsWith("Bullish")) return "text-success";
  if (biasState.startsWith("Bearish")) return "text-destructive";
  return "text-muted-foreground";
}

export function MarketsAtAGlanceCard({ isEditMode = false }: MarketsAtAGlanceCardProps) {
  const { watchlist, watchlistAssets, addToWatchlist } = useWatchlist();
  const { resolvedTimeframes } = useTraderStyle();
  const { contextMap, subscribeContextSymbols } = useMarketData();
  const navigate = useNavigate();

  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayAssets = useMemo(() => watchlistAssets.slice(0, 8), [watchlistAssets]);

  useEffect(() => {
    subscribeContextSymbols(displayAssets, resolvedTimeframes);
  }, [displayAssets, resolvedTimeframes, subscribeContextSymbols]);

  // Close the add-pair dropdown on outside click.
  useEffect(() => {
    if (!addOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAddOpen(false);
        setAddQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [addOpen]);

  const availableToAdd = useMemo(() => {
    const q = addQuery.toLowerCase();
    return TRADE_INSTRUMENTS.filter(
      (i) =>
        !watchlist.includes(i.symbol) &&
        (i.symbol.toLowerCase().includes(q) || i.displayName.toLowerCase().includes(q)),
    ).slice(0, 10);
  }, [watchlist, addQuery]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" />
            Markets at a Glance
          </CardTitle>
          {!isEditMode && (
            <div className="relative" ref={dropdownRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setAddOpen((o) => !o)}
                title="Add pair"
              >
                <Plus className="h-4 w-4" />
              </Button>
              {addOpen && (
                <div className="absolute right-0 top-8 w-56 z-50 bg-popover border border-border rounded-lg shadow-lg p-2">
                  <Input
                    autoFocus
                    placeholder="Search pair…"
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                    className="h-7 text-xs mb-1.5"
                  />
                  <div className="max-h-44 overflow-y-auto">
                    {availableToAdd.length === 0 ? (
                      <div className="text-xs text-muted-foreground px-2 py-1.5">
                        {watchlist.length >= 8 ? "Max 8 pairs" : "No results"}
                      </div>
                    ) : (
                      availableToAdd.map((inst) => (
                        <button
                          key={inst.symbol}
                          type="button"
                          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                          onClick={() => {
                            addToWatchlist(inst.symbol);
                            setAddOpen(false);
                            setAddQuery("");
                          }}
                        >
                          <span className="font-medium">{inst.symbol}</span>
                          <span className="text-muted-foreground ml-1.5">{inst.displayName}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {displayAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No pairs in your watchlist</p>
            <p className="text-xs text-muted-foreground">Use the + button to add pairs</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayAssets.map((asset) => {
              const ctx = contextMap[asset.symbol];
              return (
                <button
                  key={asset.symbol}
                  type="button"
                  onClick={() => { if (!isEditMode) navigate(`/trade/${asset.symbol}`); }}
                  disabled={isEditMode}
                  className="w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="font-semibold text-sm w-16 shrink-0 text-foreground">
                    {asset.symbol}
                  </span>
                  {ctx ? (
                    <>
                      <div className={`flex items-center gap-1 text-xs flex-1 min-w-0 ${biasColor(ctx.biasState)}`}>
                        <BiasIcon biasState={ctx.biasState} />
                        <span className="truncate">{ctx.biasState}</span>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {Math.round(ctx.biasConfidence)}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground flex-1">—</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
