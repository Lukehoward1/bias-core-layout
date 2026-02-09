import React from "react";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAssets, useWatchlist } from "@/hooks/use-watchlist";
import { Star, TrendingUp, TrendingDown, Minus, BarChart3, Activity, Shield, X } from "lucide-react";

interface AssetQuickViewModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetQuickViewModal({ symbol, isOpen, onClose }: AssetQuickViewModalProps) {
  const { getAssetBySymbol } = useAssets();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const asset = getAssetBySymbol(symbol);
  const isWatchlisted = isInWatchlist(symbol);

  const getBiasColor = (bias: string) => {
    if (bias === "Bullish") return "text-success";
    if (bias === "Bearish") return "text-destructive";
    return "text-muted-foreground";
  };

  const getBiasIcon = (bias: string) => {
    if (bias === "Bullish") return <TrendingUp className="h-5 w-5" />;
    if (bias === "Bearish") return <TrendingDown className="h-5 w-5" />;
    return <Minus className="h-5 w-5" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Overlay: closes THIS modal and prevents click-through */}
      <DialogOverlay
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      <DialogContent
        className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border-border p-0 z-[201]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!asset ? (
          <div className="px-8 py-12 text-center space-y-4">
            <p className="text-muted-foreground text-sm">Asset not available yet</p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Top bar (same feel as other modals) */}
            <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">{asset.symbol}</h2>
                <Badge variant="outline" className="text-xs">
                  {asset.category}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleWatchlist(symbol)}
                  className="h-9 w-9"
                  title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                >
                  <Star
                    className={`h-5 w-5 ${isWatchlisted ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                  />
                </Button>

                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              {/* Hero card (matches AssetDetail “unified hero” spacing/feel) */}
              <Card className="overflow-hidden">
                <CardContent className="p-8">
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* LEFT */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 mb-3">
                        <h1 className="text-4xl font-bold text-foreground">{asset.symbol}</h1>
                        <Badge variant="outline" className="text-xs">
                          {asset.category}
                        </Badge>
                      </div>

                      <div className="flex items-baseline gap-3 mb-5">
                        <span className="text-3xl font-semibold text-foreground">{asset.latestPrice}</span>
                        <span
                          className={`text-lg font-medium ${
                            asset.priceChange.startsWith("+") ? "text-success" : "text-destructive"
                          }`}
                        >
                          {asset.priceChange}
                        </span>
                      </div>

                      <div className={`flex items-center gap-2 ${getBiasColor(asset.biasDirection)}`}>
                        {getBiasIcon(asset.biasDirection)}
                        <span className="text-xl font-bold">{asset.biasDirection}</span>
                        <span className="text-sm text-muted-foreground">({asset.biasConfidence}% confidence)</span>
                      </div>

                      {asset.insight && (
                        <p className="text-sm text-muted-foreground mt-4">
                          <span className="mr-2">💡</span>
                          {asset.insight}
                        </p>
                      )}
                    </div>

                    {/* RIGHT */}
                    <div className="flex flex-col">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <BarChart3 className="h-4 w-4" />
                            Volume
                          </div>
                          <div className="text-lg font-semibold text-foreground">{asset.volume}</div>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Activity className="h-4 w-4" />
                            Spread
                          </div>
                          <div className="text-lg font-semibold text-foreground">{asset.spread}</div>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Shield className="h-4 w-4" />
                            Confidence
                          </div>
                          <div className="text-lg font-semibold text-foreground">{asset.biasConfidence}%</div>
                        </div>

                        <div className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            Sentiment
                          </div>
                          <div className="text-lg font-semibold text-foreground">{asset.sentiment}</div>
                        </div>
                      </div>

                      {/* Optional: keeps the modal feeling “full” even when content is short */}
                      <div className="mt-5 text-xs text-muted-foreground">
                        Quick view — open the full asset card for deeper analysis.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
