import { useEffect, useMemo, useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { TrendingUp, TrendingDown, Minus, ChevronRight, Star } from "lucide-react";

import { useWatchlist } from "@/hooks/use-watchlist";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { getFormattedMarketChange, normalizeSymbol, type MarketQuote } from "@/services/marketData";

import { calendarEvents, type CalendarEvent } from "@/data/calendarEvents";
import { getEventImpact } from "@/data/eventImpactRules";
import { buildMarketContext, type MarketContext, type TimeframeState } from "@/services/contextEngine";
import { useTraderStyle } from "@/context/TraderStyleProvider";

interface WatchlistOverviewCardProps {
  isEditMode?: boolean;
  slotType?: "wide" | "narrow" | "equal" | "hero" | "kpi" | "wide-narrow" | "three-equal" | "four-equal";
}

const formatPriceNoCommas = (raw: string | number) => {
  const cleaned = (raw ?? "").toString().trim();
  if (!cleaned || cleaned === "—") return "—";

  const noCommas = cleaned.replace(/,/g, "");
  const n = Number(noCommas);
  if (!Number.isFinite(n)) return noCommas;

  const m = noCommas.match(/^\d+(\.(\d+))?$/);
  if (m) {
    const decimals = m[2]?.length ?? 0;
    if (decimals > 0) return n.toFixed(decimals);
  }

  return String(n);
};

const normalizeMarketSymbol = (symbol: string) => symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

const isFxPairSymbol = (symbol: string) => /^[A-Z]{6}$/.test(symbol);

const getFxCurrencies = (symbol: string) => {
  const normalized = normalizeMarketSymbol(symbol);
  if (!isFxPairSymbol(normalized)) return [];
  return [normalized.slice(0, 3), normalized.slice(3, 6)];
};

const isEventRelevantToSymbol = (symbol: string, event: CalendarEvent) => {
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  const impact = getEventImpact({
    title: event.event,
    currency: event.currency,
  });

  if (impact.affectedPairs.includes(normalizedSymbol)) return true;
  if (impact.affectedAssets.includes(normalizedSymbol)) return true;

  if (isFxPairSymbol(normalizedSymbol)) {
    const pairCurrencies = getFxCurrencies(normalizedSymbol);
    return pairCurrencies.some((currency) => impact.affectedCurrencies.includes(currency));
  }

  return false;
};

const getStateDotClass = (state: TimeframeState) => {
  switch (state) {
    case "bullish":
      return "bg-success";
    case "bearish":
      return "bg-destructive";
    case "weakening":
      return "bg-warning";
    case "liquidity":
      return "bg-primary";
    default:
      return "bg-muted-foreground/40";
  }
};

export function WatchlistOverviewCard({ isEditMode = false }: WatchlistOverviewCardProps) {
  const { watchlistAssets } = useWatchlist();
  const { traderStyle } = useTraderStyle();
  const navigate = useNavigate();
  const location = useLocation();

  const displayAssets = useMemo(() => watchlistAssets.slice(0, 5), [watchlistAssets]);
  const symbols = useMemo(() => displayAssets.map((asset) => asset.symbol), [displayAssets]);
  const quotes = useMarketQuotes(symbols);

  const openAsset = useCallback(
    (symbol: string) => {
      if (isEditMode) return;

      navigate(`/asset/${symbol}`, {
        state: {
          backgroundLocation: location,
          from: `${location.pathname}${location.search}`,
        },
      });
    },
    [isEditMode, navigate, location],
  );

  const [contextMap, setContextMap] = useState<Record<string, MarketContext>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      displayAssets.map(async (asset) => {
        const quote = quotes[normalizeSymbol(asset.symbol)];
        const relevantEvents = calendarEvents.filter((event) => isEventRelevantToSymbol(asset.symbol, event));
        const ctx = await buildMarketContext({ asset, quote, upcomingRelevantEvents: relevantEvents, traderStyle });
        return [asset.symbol, ctx] as const;
      }),
    )
      .then((entries) => {
        if (!cancelled) setContextMap(Object.fromEntries(entries));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [displayAssets, traderStyle]); // quotes intentionally omitted — new ref every render would cause infinite loop

  // Derive Bullish/Bearish/Neutral from the candle-engine biasState string.
  // asset.biasDirection is now a neutral fallback only — the real value is in context.biasState.
  const getBiasDirection = (biasState?: string): "Bullish" | "Bearish" | "Neutral" => {
    if (!biasState) return "Neutral";
    if (biasState.startsWith("Bullish")) return "Bullish";
    if (biasState.startsWith("Bearish")) return "Bearish";
    return "Neutral";
  };

  const getBiasIcon = (bias: string) => {
    if (bias === "Bullish") return <TrendingUp className="h-4 w-4" />;
    if (bias === "Bearish") return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getBiasColor = (bias: string) => {
    if (bias === "Bullish") return "text-success";
    if (bias === "Bearish") return "text-destructive";
    return "text-muted-foreground";
  };

  const getQuoteForAsset = (symbol: string): MarketQuote | undefined => {
    return quotes[normalizeSymbol(symbol)];
  };

  const getChangeColor = (quote: MarketQuote | undefined, fallbackChange?: string) => {
    if (quote) {
      const formatted = getFormattedMarketChange(quote);
      if (formatted.direction === "up") return "text-success";
      if (formatted.direction === "down") return "text-destructive";
      return "text-muted-foreground";
    }

    if (fallbackChange?.startsWith("+")) return "text-success";
    if (fallbackChange?.startsWith("-")) return "text-destructive";
    return "text-muted-foreground";
  };

  const getDisplayedChange = (quote: MarketQuote | undefined, fallbackChange?: string) => {
    if (quote) return getFormattedMarketChange(quote).value;
    return fallbackChange || "0.00%";
  };

  if (displayAssets.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent" />
            Watchlist Overview
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Star className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">No assets in your watchlist</p>
            <p className="text-xs text-muted-foreground">Add assets from the Markets page to see them here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-4 w-4 text-accent" />
          Watchlist Overview
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {displayAssets.map((asset) => {
            const quote = getQuoteForAsset(asset.symbol);
            const context = contextMap[asset.symbol];
            const shortTf = context?.timeframeContext[0];
            const nearestLevel = context?.levels[0];

            return (
              <button
                key={asset.symbol}
                type="button"
                onClick={() => openAsset(asset.symbol)}
                disabled={isEditMode}
                className="w-full text-left p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group disabled:cursor-default disabled:hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-foreground">{asset.symbol}</span>

                      <div
                        className={`flex items-center gap-1 text-xs font-medium ${getBiasColor(getBiasDirection(context?.biasState))}`}
                      >
                        {getBiasIcon(getBiasDirection(context?.biasState))}
                        <span>{context?.biasState ?? "—"}</span>
                      </div>

                      {context?.structureState && (
                        <Badge variant="outline" className="text-[10px]">
                          {context.structureState}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {shortTf && (
                        <span className="inline-flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${getStateDotClass(shortTf.state)}`} />
                          {shortTf.timeframe}: {shortTf.label}
                        </span>
                      )}

                      {nearestLevel && <span>Key area: {nearestLevel.price}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {formatPriceNoCommas(quote?.last?.toString() ?? asset.latestPrice)}
                      </div>
                      <div className={`text-xs ${getChangeColor(quote, asset.priceChange)}`}>
                        {getDisplayedChange(quote, asset.priceChange)}
                      </div>
                    </div>

                    {!isEditMode && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {watchlistAssets.length > 5 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            +{watchlistAssets.length - 5} more in watchlist
          </p>
        )}
      </CardContent>
    </Card>
  );
}
