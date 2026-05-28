// src/pages/Dashboard.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Plus, Star, TrendingUp, TrendingDown, Minus, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { DashboardEditToolbar } from "@/components/dashboard/DashboardEditToolbar";
import { DashboardRow } from "@/components/dashboard/DashboardRow";
import { AddCardsModal } from "@/components/dashboard/AddCardsModal";

import { getCardRenderer, warnMissingRenderers } from "@/data/dashboardCardRenderers";
import { DASHBOARD_CARD_REGISTRY } from "@/data/dashboardCardRegistry";
import { cn } from "@/lib/utils";

import { SessionDetailsModal } from "@/components/dashboard/SessionDetailsModal";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";
import { AssetDetailContent } from "@/pages/AssetDetail";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { useWatchlist } from "@/hooks/use-watchlist";
import { useMarketQuotes } from "@/hooks/use-market-quotes";
import { getFormattedMarketChange, normalizeSymbol, type MarketQuote } from "@/services/marketData";

import { calendarEvents, type CalendarEvent } from "@/data/calendarEvents";
import { getEventImpact } from "@/data/eventImpactRules";
import { buildMarketContext, type MarketContext, type TimeframeState } from "@/services/contextEngine";
import { useTraderStyle } from "@/context/TraderStyleProvider";

type TradingSessionName = "Sydney" | "Asia" | "London" | "New York";

type TradingSession = {
  name: TradingSessionName;
  region: string;
  status: "active" | "closed";
  accent: string;
  opensAtLabel: string;
  closesAtLabel: string;
  timeRemainingLabel: string;
  timeRemainingSeconds: number;
};

type DashboardSlotType = "wide" | "narrow" | "equal" | "hero" | "kpi" | "wide-narrow" | "three-equal" | "four-equal";

const buildSessions = (): TradingSession[] => [
  {
    name: "Sydney",
    region: "Asia-Pacific",
    status: "closed",
    accent: "#2EC4B6",
    opensAtLabel: "Opens 08:30",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 8 * 3600 + 30 * 60,
  },
  {
    name: "Asia",
    region: "Asia-Pacific Markets",
    status: "active",
    accent: "#4361EE",
    opensAtLabel: "—",
    closesAtLabel: "Closes 01:23",
    timeRemainingLabel: "Session closes in",
    timeRemainingSeconds: 1 * 3600 + 23 * 60 + 45,
  },
  {
    name: "London",
    region: "European",
    status: "closed",
    accent: "#F4D35E",
    opensAtLabel: "Opens 02:15",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 2 * 3600 + 15 * 60 + 30,
  },
  {
    name: "New York",
    region: "US Markets",
    status: "closed",
    accent: "#F77F00",
    opensAtLabel: "Opens 05:45",
    closesAtLabel: "—",
    timeRemainingLabel: "Session opens in",
    timeRemainingSeconds: 5 * 3600 + 45 * 60 + 12,
  },
];

const impactRank = (impact: "high" | "medium" | "low") => {
  if (impact === "high") return 3;
  if (impact === "medium") return 2;
  return 1;
};

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

const getEventTimestamp = (event: CalendarEvent) => {
  const ts = new Date(event.scheduledAt).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

const getUniqueUpcomingEvents = () => {
  const now = Date.now();
  const nextByEventKey = new Map<string, CalendarEvent>();

  calendarEvents
    .filter((event) => getEventTimestamp(event) >= now)
    .sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b))
    .forEach((event) => {
      const key = event.eventKey || `${event.currency}-${event.event}`;
      if (!nextByEventKey.has(key)) nextByEventKey.set(key, event);
    });

  return Array.from(nextByEventKey.values()).sort((a, b) => {
    const timeDiff = getEventTimestamp(a) - getEventTimestamp(b);
    if (timeDiff !== 0) return timeDiff;

    const impactDiff = impactRank(b.impact) - impactRank(a.impact);
    if (impactDiff !== 0) return impactDiff;

    return a.event.localeCompare(b.event);
  });
};

const formatDashboardDate = (event: CalendarEvent) => {
  const date = new Date(event.scheduledAt);
  if (Number.isNaN(date.getTime())) return event.date;

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
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

export default function Dashboard() {
  const [showAddCardsModal, setShowAddCardsModal] = useState(false);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedSessionName, setSelectedSessionName] = useState<TradingSessionName>("Asia");

  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string | null>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const sessions = useMemo(() => buildSessions(), []);

  const selectedSession = useMemo(() => {
    const found = sessions.find((s) => s.name === selectedSessionName);
    return found ?? sessions.find((s) => s.status === "active") ?? sessions[0];
  }, [sessions, selectedSessionName]);

  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    if (!isSessionModalOpen) return;
    const t = window.setInterval(() => setSessionTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [isSessionModalOpen]);

  const selectedSessionWithTick = useMemo(() => {
    const dec = isSessionModalOpen ? sessionTick : 0;
    const next = Math.max(0, (selectedSession?.timeRemainingSeconds ?? 0) - dec);
    return { ...selectedSession, timeRemainingSeconds: next } as TradingSession;
  }, [selectedSession, sessionTick, isSessionModalOpen]);

  const openSessionModal = useCallback(
    (name?: TradingSessionName) => {
      setIsSessionModalOpen(false);

      requestAnimationFrame(() => {
        if (name) {
          setSelectedSessionName(name);
        } else {
          const active = sessions.find((s) => s.status === "active")?.name ?? "Asia";
          setSelectedSessionName(active);
        }

        setIsSessionModalOpen(true);
      });
    },
    [sessions],
  );

  const closeSessionModal = useCallback(() => setIsSessionModalOpen(false), []);

  const openAssetOverlay = useCallback((symbol: string) => {
    setSelectedAssetSymbol(null);
    requestAnimationFrame(() => setSelectedAssetSymbol(symbol));
  }, []);

  const closeAssetOverlay = useCallback(() => setSelectedAssetSymbol(null), []);

  const openCalendarEvent = useCallback((event: CalendarEvent) => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);

    requestAnimationFrame(() => {
      setSelectedCalendarEvent(event);
      setIsEventModalOpen(true);
    });
  }, []);

  const closeCalendarEvent = useCallback(() => {
    setIsEventModalOpen(false);
    setSelectedCalendarEvent(null);
  }, []);

  const {
    layout,
    isEditMode,
    toggleEditMode,
    addCard,
    addRow,
    changeRowType,
    removeRow,
    moveRow,
    removeCard,
    moveCard,
    moveCardToRow,
    resetToDefault,
    getMaxSlots,
  } = useDashboardLayout();

  const cardsOnDashboardSet = useMemo(() => {
    const ids = new Set<string>();
    layout.rows.forEach((row) => row.cards.forEach((card) => ids.add(card.id)));
    return ids;
  }, [layout]);

  const handleDragStart = (cardId: string) => setDraggingCardId(cardId);

  const handleDragOver = (cardId: string) => {
    if (draggingCardId && cardId !== draggingCardId) setDragOverCardId(cardId);
  };

  const handleDragOverRow = (rowId: string) => {
    if (draggingCardId) setDragOverRowId(rowId);
  };

  const handleDragEnd = () => {
    if (draggingCardId && dragOverCardId) {
      moveCard(draggingCardId, dragOverCardId);
    } else if (draggingCardId && dragOverRowId) {
      moveCardToRow(draggingCardId, dragOverRowId);
    }

    setDraggingCardId(null);
    setDragOverCardId(null);
    setDragOverRowId(null);
  };

  useEffect(() => {
    const registryCardIds = DASHBOARD_CARD_REGISTRY.map((c) => c.id);
    warnMissingRenderers(registryCardIds);
  }, []);

  const renderCardContent = (cardEntry: { id: string }, slotType: DashboardSlotType): React.ReactNode => {
    const cardId = cardEntry.id;

    if (cardId === "watchlist-overview") {
      return <DashboardWatchlistCard isEditMode={isEditMode} onOpenAsset={openAssetOverlay} />;
    }

    if (cardId === "upcoming-events" || cardId === "calendar-events") {
      return (
        <DashboardUpcomingEventsCard
          title={cardId === "calendar-events" ? "Week Ahead" : "Upcoming Events"}
          isEditMode={isEditMode}
          onOpenEvent={openCalendarEvent}
        />
      );
    }

    if (cardId === "next-session") {
      const active = sessions.find((s) => s.status === "active")?.name ?? "Asia";

      return (
        <div
          className={cn("h-full", !isEditMode && "cursor-pointer")}
          onClick={() => {
            if (isEditMode) return;
            openSessionModal(active);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (isEditMode) return;
            if (e.key === "Enter" || e.key === " ") openSessionModal(active);
          }}
        >
          {getCardRenderer(cardId)?.({ slotType })}
        </div>
      );
    }

    const renderer = getCardRenderer(cardId);

    if (renderer) return renderer({ slotType });

    return (
      <div className="h-full rounded-xl border border-warning/30 bg-warning/5 p-4">
        <p className="text-sm font-medium text-warning">Unknown Card</p>
        <p className="text-xs text-muted-foreground mt-2">Card ID: {cardId}</p>
      </div>
    );
  };

  const handleAddRow = (afterRowId?: string) => addRow("equal", afterRowId);

  return (
    <div className="p-6 space-y-6">
      <AppHeader title="Dashboard" />

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Welcome, Trader</h1>
            {isEditMode && (
              <p className="text-sm text-muted-foreground">
                Drag cards to reorder • Click × to remove • Change row layouts
              </p>
            )}
          </div>

          <DashboardEditToolbar
            isEditMode={isEditMode}
            onToggleEdit={toggleEditMode}
            onReset={resetToDefault}
            onOpenAddCards={() => setShowAddCardsModal(true)}
          />
        </div>

        {layout.rows.map((row, index) => (
          <DashboardRow
            key={row.id}
            row={row}
            rowIndex={index}
            totalRows={layout.rows.length}
            isEditMode={isEditMode}
            draggingCardId={draggingCardId}
            dragOverCardId={dragOverCardId}
            dragOverRowId={dragOverRowId}
            renderCardContent={renderCardContent}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragOverRow={handleDragOverRow}
            onRemoveCard={removeCard}
            onChangeRowType={changeRowType}
            onMoveRow={moveRow}
            onRemoveRow={removeRow}
            onAddRow={handleAddRow}
            maxSlots={getMaxSlots(row.type)}
          />
        ))}

        {isEditMode && (
          <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => handleAddRow()}>
            <Plus className="h-4 w-4" />
            Add New Row
          </Button>
        )}

        {layout.rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">No cards on your Dashboard.</p>
            <p className="text-sm text-muted-foreground">Click "Edit Dashboard" and then "Add Cards" to customize.</p>
          </div>
        )}
      </div>

      <AddCardsModal
        open={showAddCardsModal}
        onOpenChange={setShowAddCardsModal}
        cardsOnDashboard={cardsOnDashboardSet}
        onAddCard={addCard}
        onRemoveCard={removeCard}
      />

      <SessionDetailsModal isOpen={isSessionModalOpen} onClose={closeSessionModal} session={selectedSessionWithTick} />

      <EventDetailsModal event={selectedCalendarEvent} isOpen={isEventModalOpen} onClose={closeCalendarEvent} />

      {selectedAssetSymbol && (
        <div
          className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAssetOverlay();
          }}
        >
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl bg-background border border-border shadow-2xl">
            <ErrorBoundary fallbackMessage="Failed to load asset">
              <AssetDetailContent symbol={selectedAssetSymbol} onRequestClose={closeAssetOverlay} />
            </ErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardWatchlistCard({
  isEditMode,
  onOpenAsset,
}: {
  isEditMode: boolean;
  onOpenAsset: (symbol: string) => void;
}) {
  const { watchlistAssets } = useWatchlist();
  const { traderStyle } = useTraderStyle();

  const displayAssets = useMemo(() => watchlistAssets.slice(0, 5), [watchlistAssets]);
  const symbols = useMemo(() => displayAssets.map((asset) => asset.symbol), [displayAssets]);
  const quotes = useMarketQuotes(symbols);

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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isEditMode) return;
                  onOpenAsset(asset.symbol);
                }}
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

function DashboardUpcomingEventsCard({
  title,
  isEditMode,
  onOpenEvent,
}: {
  title: string;
  isEditMode: boolean;
  onOpenEvent: (event: CalendarEvent) => void;
}) {
  const events = useMemo(() => getUniqueUpcomingEvents().slice(0, 4), []);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events found.</p>
          ) : (
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                disabled={isEditMode}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (isEditMode) return;
                  onOpenEvent(event);
                }}
                className="w-full text-left flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      event.impact === "high"
                        ? "bg-destructive"
                        : event.impact === "medium"
                          ? "bg-warning"
                          : "bg-success",
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{event.event}</p>
                    <span className="text-[10px] text-muted-foreground">{event.currency}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDashboardDate(event)} {event.time}
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">click to open</span>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
