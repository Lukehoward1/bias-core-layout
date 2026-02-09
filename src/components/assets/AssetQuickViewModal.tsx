import React from "react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAssets } from "@/hooks/use-watchlist";
import { useWatchlist } from "@/hooks/use-watchlist";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  StarOff,
  BarChart3,
  Activity,
  Shield,
  X,
} from "lucide-react";

interface AssetQuickViewModalProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetQuickViewModal({
  symbol,
  isOpen,
  onClose,
}: AssetQuickViewModalProps) {
  const { getAssetBySymbol } = useAssets();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  const asset = getAssetBySymbol(symbol);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogOverlay
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        style={{ zIndex: 200 }}
        onClick={(e) => e.stopPropagation()}
      />
      <DialogContent
        className="max-w-6xl w-[96vw] max-h-[92vh] overflow-y-auto scrollbar-hidden bg-background border-border p-0"
        style={{ zIndex: 201 }}
        onClick={(e) => e.stopPropagation()}
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
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-foreground">
                    {asset.displayName}
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {asset.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWatchlist(symbol)}
                    className="p-1.5 rounded hover:bg-accent transition-colors"
                    title={isInWatchlist(symbol) ? "Remove from watchlist" : "Add to watchlist"}
                  >
                    {isInWatchlist(symbol) ? (
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-sm opacity-70 hover:opacity-100 transition-opacity ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-6">
              {/* Price row */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold tracking-tight">
                  {asset.latestPrice}
                </span>
                <span
                  className={`text-sm font-medium ${
                    asset.priceChange.startsWith("+")
                      ? "text-emerald-400"
                      : asset.priceChange.startsWith("-")
                        ? "text-red-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {asset.priceChange}
                </span>
              </div>

              {/* Bias */}
              <div className="flex items-center gap-2">
                {asset.biasDirection === "Bullish" ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : asset.biasDirection === "Bearish" ? (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                ) : (
                  <Minus className="h-4 w-4 text-yellow-400" />
                )}
                <span
                  className={`font-semibold ${
                    asset.biasDirection === "Bullish"
                      ? "text-emerald-400"
                      : asset.biasDirection === "Bearish"
                        ? "text-red-400"
                        : "text-yellow-400"
                  }`}
                >
                  {asset.biasDirection}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({asset.biasConfidence}% confidence)
                </span>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-muted/40 border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="text-sm font-semibold">{asset.volume}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/40 border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Spread</p>
                      <p className="text-sm font-semibold">{asset.spread}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/40 border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                      <p className="text-sm font-semibold">{asset.biasConfidence}%</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/40 border-border/50">
                  <CardContent className="p-4 flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Sentiment</p>
                      <p className="text-sm font-semibold">{asset.sentiment}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insight */}
              {asset.insight && (
                <p className="text-xs text-muted-foreground italic">
                  💡 {asset.insight}
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
