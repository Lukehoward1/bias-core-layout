import { useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Minus, Calendar, Star, ChevronRight, Activity, Search } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useWatchlist, useAssets } from "@/hooks/use-watchlist";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { AddToDashboardButton } from "@/components/dashboard/AddToDashboardButton";
import { toast } from "sonner";
import { calendarEvents } from "@/data/calendarEvents";

type MarketType = "Watchlist" | "All" | "FX" | "Crypto" | "Indices" | "Commodities" | "ETFs" | "Futures";

/* =======================
   NEWS MATCHING (AUTO)
======================= */

type CalendarEvent = (typeof calendarEvents)[0];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ") // remove bracketed currency like (USD)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractCurrencyFromLabel = (label: string) => {
  const m = label.match(/\(([A-Z]{3})\)/);
  return m?.[1] ?? null;
};

const extractTimeHHMM = (timeStr: string) => {
  const m = timeStr.match(/(\d{1,2}:\d{2})/);
  if (!m) return null;
  const [hh, mm] = m[1].split(":");
  return `${hh.padStart(2, "0")}:${mm}`;
};

// Alias layer for common variations so it matches Calendar table names
const normalizeEventAlias = (label: string) => {
  const raw = normalize(label);

  // "CPI (USD)" should match "US CPI"
  if (raw === "cpi") return "us cpi";
  if (raw.includes("cpi") && raw.includes("core")) return "core cpi";
  if (raw.includes("interest rate decision")) return "interest rate decision";
  if (raw.includes("non farm payroll")) return "non farm payrolls";

  return raw;
};

const scoreCalendarMatch = (args: {
  pillLabel: string;
  pillCurrency: string | null;
  pillTime: string | null;
  candidate: CalendarEvent;
}) => {
  const { pillLabel, pillCurrency, pillTime, candidate } = args;

  const pillNorm = normalizeEventAlias(pillLabel);
  const candNorm = normalize(candidate.event);

  let score = 0;

  // Exact / contains match
  if (candNorm === pillNorm) score += 6;
  if (candNorm.includes(pillNorm) || pillNorm.includes(candNorm)) score += 4;

  // Token overlap
  const pillTokens = new Set(pillNorm.split(" ").filter(Boolean));
  const candTokens = new Set(candNorm.split(" ").filter(Boolean));
  let overlap = 0;
  pillTokens.forEach((t) => {
    if (candTokens.has(t)) overlap += 1;
  });
  score += overlap;

  // Currency match
  if (pillCurrency && candidate.currency?.toUpperCase() === pillCurrency.toUpperCase()) score += 3;

  // Time match
  if (pillTime && candidate.time === pillTime) score += 2;

  // Slightly prefer higher impact if close
  if (candidate.impact === "high") score += 0.5;

  return score;
};

const matchCalendarEventId = (label: string, time: string) => {
  const pillCurrency = extractCurrencyFromLabel(label);
  const pillTime = extractTimeHHMM(time);

  let best: { ev: CalendarEvent; score: number } | null = null;

  for (const ev of calendarEvents) {
    const s = scoreCalendarMatch({
      pillLabel: label,
      pillCurrency,
      pillTime,
      candidate: ev,
    });

    if (!best || s > best.score) best = { ev, score: s };
  }

  if (!best || best.score < 4) return null;
  return best.ev.id;
};

// Very light “relevance” filter so cards only show events likely to matter for that symbol
const isEventRelevantToSymbol = (symbol: string, ev: CalendarEvent) => {
  // FX pairs: show events where event currency matches either base or quote currency
  // EURUSD -> EUR or USD
  const base = symbol.slice(0, 3).toUpperCase();
  const quote = symbol.slice(3, 6).toUpperCase();
  const cur = ev.currency?.toUpperCase?.() ?? "";

  // If it's a 6-char FX symbol, do the FX relevance check
  if (symbol.length === 6 && /^[A-Z]{6}$/.test(symbol.toUpperCase())) {
    return cur === base || cur === quote;
  }

  // Non-FX assets: for now show all USD events as "relevant"
  // (You can refine later by asset type)
  if (cur === "USD") return true;

  return false;
};

/* =======================
   PAGE
======================= */

export default function Markets() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const filterParam = searchParams.get("filter") as MarketType | null;

  const { assets } = useAssets();
  const { watchlist, toggleWatchlist, isInWatchlist, watchlistAssets } = useWatchlist();

  const { isCardOnDashboard, addCard, removeCard } = useDashboardLayout();

  const watchlistOverviewCardId = "watchlist-overview";
  const isWatchlistOverviewAdded = isCardOnDashboard(watchlistOverviewCardId);

  const handleAddCard = () => {
    addCard(watchlistOverviewCardId);
    toast.success("Added to Dashboard");
  };

  const handleRemoveCard = () => {
    removeCard(watchlistOverviewCardId);
    toast.success("Removed from Dashboard");
  };

  const [selectedType, setSelectedType] = useState<MarketType>(() => {
    if (
      filterParam &&
      ["Watchlist", "All", "FX", "Crypto", "Indices", "Commodities", "ETFs", "Futures"].includes(filterParam)
    ) {
      return filterParam;
    }
    const saved = localStorage.getItem("watchlist");
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length > 0 ? "Watchlist" : "All";
  });

  const [searchQuery, setSearchQuery] = useState("");

  // per-card toggle: show all relevant news vs high impact only
  const [expandedNews, setExpandedNews] = useState<Record<string, boolean>>({});

  const marketTypes: MarketType[] = ["Watchlist", "All", "FX", "Crypto", "Indices", "Commodities", "ETFs", "Futures"];

  const handleToggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWatchlist(symbol);
  };

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

  // Keep your modal overlay routing
  const openAssetDetail = (symbol: string) => {
    navigate(`/asset/${symbol}?from=${selectedType}`, {
      state: { backgroundLocation: location },
    });
  };

  // When clicking a news pill: open the calendar modal via querystring
  const openCalendarEventByPill = (e: React.MouseEvent, label: string, time: string) => {
    e.preventDefault();
    e.stopPropagation();

    const eventId = matchCalendarEventId(label, time);
    if (!eventId) {
      toast.error("No matching calendar event found for this news item yet.");
      return;
    }

    navigate(`/calendar?eventId=${encodeURIComponent(eventId)}`);
  };

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Markets" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Search Bar */}
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
            Updated 2 mins ago
          </Badge>
        </div>

        {/* Market Type Filters */}
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

        {/* Watchlist Overview Bar */}
        {(selectedType === "Watchlist" || selectedType === "All") && watchlistAssets.length > 0 && (
          <Card className="bg-muted/30">
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
                {watchlistAssets.map((asset) => (
                  <div
                    key={asset.symbol}
                    onClick={() => openAssetDetail(asset.symbol)}
                    className="flex items-center gap-4 p-3 rounded-lg bg-background/50 hover:bg-background cursor-pointer transition-colors group"
                  >
                    <span className="font-semibold text-foreground min-w-[80px]">{asset.symbol}</span>
                    <div className={`flex items-center gap-1 min-w-[80px] ${getBiasColor(asset.biasDirection)}`}>
                      {getBiasIcon(asset.biasDirection)}
                      <span className="text-sm">{asset.biasDirection}</span>
                    </div>
                    <span className="text-sm text-muted-foreground flex-1 truncate">{asset.insight}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground hidden md:block">
                        <span className="mr-3">Vol: {asset.volume}</span>
                        <span>Spread: {asset.spread}</span>
                      </div>
                      {asset.news && (
                        <Badge variant="destructive" className="text-[10px] hidden lg:inline-flex">
                          News
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty Watchlist State */}
        {selectedType === "Watchlist" && watchlistAssets.length === 0 && (
          <Card className="bg-muted/30">
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

        {/* No Search Results */}
        {searchQuery && filteredPairs.length === 0 && (
          <Card className="bg-muted/30">
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground">No markets match "{searchQuery}"</p>
            </CardContent>
          </Card>
        )}

        {/* Asset Cards Grid */}
        {(selectedType !== "Watchlist" || watchlistAssets.length > 0) && filteredPairs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredPairs.map((asset) => {
              const relevantEvents = calendarEvents.filter((ev) => isEventRelevantToSymbol(asset.symbol, ev));
              const highImpactRelevant = relevantEvents.filter((ev) => ev.impact === "high");
              const isExpanded = !!expandedNews[asset.symbol];

              // Default view: high only
              const eventsToShow = isExpanded ? relevantEvents : highImpactRelevant;

              return (
                <Card
                  key={asset.symbol}
                  onClick={() => openAssetDetail(asset.symbol)}
                  className="hover:shadow-lg transition-shadow cursor-pointer group relative"
                >
                  {/* Watchlist Star */}
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
                      <CardTitle className="text-lg">{asset.symbol}</CardTitle>
                      <div className={`flex items-center gap-1.5 ${getBiasColor(asset.biasDirection)}`}>
                        {getBiasIcon(asset.biasDirection)}
                        <span className="text-sm font-medium">{asset.biasDirection}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-foreground">{asset.latestPrice}</span>
                      <span
                        className={`text-sm font-medium ${
                          asset.priceChange.startsWith("+") ? "text-success" : "text-destructive"
                        }`}
                      >
                        {asset.priceChange}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
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

                    {/* Mini Sentiment Gauge */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">Sentiment</span>
                        <span
                          className={`text-xs font-medium ${
                            asset.sentiment > 0
                              ? "text-success"
                              : asset.sentiment < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {asset.sentiment > 0 ? "+" : ""}
                          {asset.sentiment}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 relative">
                        <div className="absolute left-1/2 top-0 w-px h-1.5 bg-border" />
                        <div
                          className={`${asset.sentiment > 0 ? "bg-success" : "bg-destructive"} rounded-full h-1.5 transition-all`}
                          style={{
                            width: `${Math.abs(asset.sentiment) / 2}%`,
                            marginLeft: asset.sentiment > 0 ? "50%" : `${50 - Math.abs(asset.sentiment) / 2}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* News (High only by default, with toggle to see all relevant) */}
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
                              setExpandedNews((prev) => ({ ...prev, [asset.symbol]: !prev[asset.symbol] }));
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
                          {/* CHANGED: show 2 items instead of 3 */}
                          {eventsToShow.slice(0, 2).map((ev) => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={(e) => openCalendarEventByPill(e, ev.event, ev.time)}
                              className="w-full flex items-center justify-between gap-3 p-2 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge
                                  variant={
                                    ev.impact === "high"
                                      ? "destructive"
                                      : ev.impact === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="text-[10px] shrink-0"
                                >
                                  {ev.impact.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-foreground truncate">{ev.event}</span>
                              </div>
                              <span className="text-xs text-muted-foreground shrink-0">{ev.time}</span>
                            </button>
                          ))}

                          {/* CHANGED: reflect 2-item limit */}
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
