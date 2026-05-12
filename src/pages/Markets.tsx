// src/pages/Markets.tsx
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { TrendingUp, TrendingDown, Minus, Calendar, Star, ChevronRight, Activity, Search } from "lucide-react";

import { useWatchlist, useAssets } from "@/hooks/use-watchlist";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { toast } from "sonner";

import { calendarEvents, sortCalendarEventsByImpact, type CalendarEvent } from "@/data/calendarEvents";
import { getEventImpact } from "@/data/eventImpactRules";
import { getFormattedMarketChange, type MarketQuote } from "@/services/marketData";
import { buildMarketContext, type TimeframeState } from "@/services/contextEngine";
import { useTraderStyle } from "@/context/TraderStyleProvider";

type MarketType = "Watchlist" | "All" | "FX" | "Crypto" | "Indices" | "Commodities" | "ETFs" | "Futures";

const marketTypes: MarketType[] = ["Watchlist", "All", "FX", "Crypto", "Indices", "Commodities", "ETFs", "Futures"];

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

const sortRelevantEvents = (events: CalendarEvent[]) => {
  return sortCalendarEventsByImpact(events).sort((a, b) => {
    if (a.impact !== b.impact) return 0;
    return a.time.localeCompare(b.time);
  });
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

export default function Markets() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const filterParam = searchParams.get("filter") as MarketType | null;

  const { assets } = useAssets();
  const { watchlist, toggleWatchlist, isInWatchlist, watchlistAssets } = useWatchlist();
  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();
  const { traderStyle } = useTraderStyle();

  const watchlistOverviewCardId = "watchlist-overview";
  const isWatchlistOverviewAdded = isCardOnDashboard(watchlistOverviewCardId);

  const [selectedType, setSelectedType] = useState<MarketType>(() => {
    if (filterParam && marketTypes.includes(filterParam)) return filterParam;

    const saved = localStorage.getItem("watchlist");
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? "Watchlist" : "All";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNews, setExpandedNews] = useState<Record<string, boolean>>({});

  const filteredPairs = useMemo(() => {
    let filtered =
      selectedType === "Watchlist"
        ? watchlistAssets
        : selectedType === "All"
          ? assets
          : assets.filter((asset) => asset.category === selectedType);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(query) ||
          asset.displayName.toLowerCase().includes(query) ||
          asset.category.toLowerCase().includes(query) ||
          asset.biasDirection.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [selectedType, watchlistAssets, searchQuery, assets]);

  const quotes = useMarketQuotes(filteredPairs.map((asset) => asset.symbol));

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

  const openAssetDetail = (symbol: string) => {
    navigate(`/asset/${symbol}?from=${selectedType}`, {
      state: {
        backgroundLocation: location,
        from: `${location.pathname}${location.search}`,
      },
    });
  };

  const openCalendarEvent = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!eventId) {
      toast.error("No matching calendar event found.");
      return;
    }

    navigate(`/calendar?eventId=${encodeURIComponent(eventId)}`);
  };

  const handleAddCard = () => {
    addCard(watchlistOverviewCardId);
    toast.success("Added to Dashboard");
  };

  const handleRemoveCard = () => {
    removeCard(watchlistOverviewCardId);
    toast.success("Removed from Dashboard");
  };

  const handleToggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist(symbol);
  };

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Markets" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50"
            />
          </div>

          <Badge variant="outline" className="text-xs">
            Live demo pricing
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {marketTypes.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type)}
              className={`rounded-full h-8 px-4 text-xs ${type === "Watchlist" ? "gap-1.5" : ""}`}
            >
              {type === "Watchlist" && <Star className="h-3.5 w-3.5" />}
              {type}
              {type === "Watchlist" && watchlist.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {watchlist.length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {(selectedType === "Watchlist" || selectedType === "All") && watchlistAssets.length > 0 && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-primary" />
                My Watchlist Overview
              </CardTitle>
              <AddToDashboardButton
                isAdded={isWatchlistOverviewAdded}
                onAdd={handleAddCard}
                onRemove={handleRemoveCard}
              />
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-2">
                {watchlistAssets.map((asset) => {
                  const quote = quotes[asset.symbol];
                  const context = buildMarketContext({
                    asset,
                    quote,
                    upcomingRelevantEvents: calendarEvents.filter((event) =>
                      isEventRelevantToSymbol(asset.symbol, event),
                    ),
                    traderStyle,
                  });

                  return (
                    <div
                      key={asset.symbol}
                      onClick={() => openAssetDetail(asset.symbol)}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/40 cursor-pointer transition-colors group"
                    >
                      <div className="min-w-[90px]">
                        <div className="font-semibold text-foreground">{asset.symbol}</div>
                        <div className="text-[11px] text-muted-foreground">{asset.category}</div>
                      </div>

                      <div className="hidden md:block min-w-[130px]">
                        <div className="text-sm font-medium text-foreground">
                          {formatPriceNoCommas(quote?.last?.toString() ?? asset.latestPrice)}
                        </div>
                        <div className={`text-xs ${getChangeColor(quote, asset.priceChange)}`}>
                          {getDisplayedChange(quote, asset.priceChange)}
                        </div>
                      </div>

                      <div className={`flex items-center gap-1 min-w-[120px] ${getBiasColor(asset.biasDirection)}`}>
                        {getBiasIcon(asset.biasDirection)}
                        <span className="text-sm">{asset.biasDirection}</span>
                      </div>

                      <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {context.structureState}
                        </Badge>
                        <span className="text-xs text-muted-foreground truncate">
                          {context.timeframeContext[0]?.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        {context.highImpactSoon && (
                          <Badge variant="destructive" className="text-[10px] hidden lg:inline-flex">
                            News risk
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedType === "Watchlist" && watchlistAssets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Your watchlist is empty</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click the star icon on any asset card to add it to your watchlist
              </p>
              <Button variant="outline" onClick={() => setSelectedType("All")}>
                Browse All Assets
              </Button>
            </CardContent>
          </Card>
        )}

        {searchQuery && filteredPairs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground">No markets match "{searchQuery}"</p>
            </CardContent>
          </Card>
        )}

        {(selectedType !== "Watchlist" || watchlistAssets.length > 0) && filteredPairs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredPairs.map((asset) => {
              const quote = quotes[asset.symbol];
              const relevantEvents = sortRelevantEvents(
                calendarEvents.filter((event) => isEventRelevantToSymbol(asset.symbol, event)),
              );
              const highImpactRelevant = relevantEvents.filter((event) => event.impact === "high");
              const isExpanded = !!expandedNews[asset.symbol];
              const eventsToShow = isExpanded ? relevantEvents : highImpactRelevant;

              const context = buildMarketContext({
                asset,
                quote,
                upcomingRelevantEvents: relevantEvents,
                traderStyle,
              });

              const mainTimeframes = context.timeframeContext.slice(0, 3);
              const nearestLevel = context.levels[0];

              return (
                <Card
                  key={asset.symbol}
                  onClick={() => openAssetDetail(asset.symbol)}
                  className="hover:shadow-lg transition-shadow cursor-pointer group relative"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleToggleWatchlist(asset.symbol, e)}
                    className="absolute top-3 right-3 h-8 w-8 z-10"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        isInWatchlist(asset.symbol)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    />
                  </Button>

                  <CardHeader className="pb-3 pr-12">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <CardTitle className="text-xl leading-none">{asset.symbol}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">{asset.displayName}</p>
                      </div>

                      <div className={`flex items-center gap-1.5 ${getBiasColor(asset.biasDirection)}`}>
                        {getBiasIcon(asset.biasDirection)}
                        <span className="text-sm font-medium">{asset.biasDirection}</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <span className="text-2xl font-bold text-foreground">
                          {formatPriceNoCommas(quote?.last?.toString() ?? asset.latestPrice)}
                        </span>
                        <div className={`text-sm font-medium ${getChangeColor(quote, asset.priceChange)}`}>
                          {getDisplayedChange(quote, asset.priceChange)}
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px] mb-1">
                        {context.biasState}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-y border-border/60 py-2">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Structure</div>
                        <div className="text-xs font-medium text-foreground truncate">{context.structureState}</div>
                      </div>

                      {nearestLevel && (
                        <div className="text-right min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Key area</div>
                          <div className="text-xs font-medium text-foreground">{nearestLevel.price}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {mainTimeframes.map((tf) => (
                          <div key={tf.timeframe} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">{tf.timeframe}</span>
                            <span className={`h-2 w-2 rounded-full ${getStateDotClass(tf.state)}`} />
                          </div>
                        ))}
                      </div>

                      {context.highImpactSoon && (
                        <Badge variant="destructive" className="text-[10px]">
                          News risk
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-muted-foreground">Spread</span>
                        <span className="font-medium text-foreground">{asset.spread}</span>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <span className="text-muted-foreground">Vol</span>
                        <span className="font-medium text-foreground">{asset.volume}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {isExpanded ? "Relevant News" : "High Impact News"}
                          </span>
                        </div>

                        {relevantEvents.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedNews((prev) => ({
                                ...prev,
                                [asset.symbol]: !prev[asset.symbol],
                              }));
                            }}
                            className="text-[11px] text-primary hover:underline"
                          >
                            {isExpanded ? "Show high only" : "See all"}
                          </button>
                        )}
                      </div>

                      {eventsToShow.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No relevant events found.</p>
                      ) : (
                        <div className="space-y-2">
                          {eventsToShow.slice(0, 2).map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={(e) => openCalendarEvent(e, event.id)}
                              className="w-full flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30 hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge
                                  variant={
                                    event.impact === "high"
                                      ? "destructive"
                                      : event.impact === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-[10px] shrink-0"
                                >
                                  {event.impact.toUpperCase()}
                                </Badge>

                                <span className="text-xs text-foreground truncate">{event.event}</span>
                              </div>

                              <span className="text-xs text-muted-foreground shrink-0">{event.time}</span>
                            </button>
                          ))}

                          {eventsToShow.length > 2 && (
                            <div className="text-[11px] text-muted-foreground">
                              +{eventsToShow.length - 2} more (tap “See all”)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
