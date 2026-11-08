// src/pages/Trade.tsx
// Trade screen (plan §2.4). Single view, chart + persistent side panel.
// Side panel is hidden below lg: (desktop-only for Stage 3; mobile is Stage 10).
//
// Data flow:
//   - symbol comes from /trade/:symbol (or redirects from /trade using lastTradeSymbol)
//   - fetchRealOhlcData feeds the chart + the volume row in the panel
//   - buildMarketContext feeds everything else in the panel + the readiness checklist
//   - A chart failure is isolated: side panel still populates from the independent
//     context fetch; chart slot shows DataUnavailableState / NotOnPlanState

import { useEffect, useMemo, useState, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CandlestickChart } from "@/components/CandlestickChart";
import { DataUnavailableState } from "@/components/chart/DataUnavailableState";
import { NotOnPlanState } from "@/components/chart/NotOnPlanState";

import { PairSelector } from "@/components/trade/PairSelector";
import { MarketAwarenessPanel } from "@/components/trade/MarketAwarenessPanel";
import { ReadinessChecklist } from "@/components/trade/ReadinessChecklist";
import { DynamicRiskCell } from "@/components/trade/DynamicRiskCell";
import { InATradeButton, type EntryIntent } from "@/components/trade/InATradeButton";
import { PositionSizeSlideOver } from "@/components/trade/PositionSizeSlideOver";
import { getSession as getDraSession } from "@/components/risk/DynamicRiskAdvisor";

import { useAssets } from "@/hooks/use-watchlist";
import { useMarketQuote } from "@/hooks/use-market-quotes";
import { useTraderStyle } from "@/context/TraderStyleProvider";

import { buildMarketContext, type MarketContext } from "@/services/contextEngine";
import { setPrioritySymbol } from "@/services/candleData";
import { getLiveCalendarEvents } from "@/services/calendarService";
import { getAllCalendarEvents, getEventDateTime } from "@/services/calendarData";
import { getEventImpact } from "@/data/eventImpactRules";
import { EventDetailsModal } from "@/components/calendar/EventDetailsModal";

import { fetchRealOhlcData, type OhlcDataPoint } from "@/lib/mockOhlcData";
import { getInstrument, TRADE_INSTRUMENTS } from "@/data/tradeInstruments";
import {
  getSymbolCurrencies,
  isFxPairSymbol,
  normalizeMarketSymbol,
} from "@/lib/symbolCurrencies";

import type { CalendarEvent } from "@/data/calendarEvents";
import type { TfRole } from "@/services/traderTimeframes";

const LAST_SYMBOL_KEY = "lastTradeSymbol";
const DEFAULT_SYMBOL = "EURUSD";

function readLastSymbol(): string {
  try {
    const raw = localStorage.getItem(LAST_SYMBOL_KEY);
    if (raw && TRADE_INSTRUMENTS.some((i) => i.symbol === raw.toUpperCase())) {
      return raw.toUpperCase();
    }
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT_SYMBOL;
}

function writeLastSymbol(symbol: string) {
  try {
    localStorage.setItem(LAST_SYMBOL_KEY, symbol);
  } catch {
    /* ignore quota / private mode */
  }
}

function styleLabel(style: string, isCustom: boolean): string {
  if (isCustom) return "Custom";
  if (style === "scalper") return "Scalper";
  if (style === "swing") return "Swing";
  return "Intraday";
}

function isEventRelevantToSymbol(symbol: string, event: CalendarEvent): boolean {
  const norm = normalizeMarketSymbol(symbol);
  const impact = getEventImpact({ title: event.event, currency: event.currency });
  if (impact.affectedPairs.includes(norm)) return true;
  if (impact.affectedAssets.includes(norm)) return true;
  if (isFxPairSymbol(norm)) {
    const ccys = [norm.slice(0, 3), norm.slice(3, 6)];
    return ccys.some((c) => impact.affectedCurrencies.includes(c));
  }
  // Metals / indices: match on the primary currency
  const ccys = getSymbolCurrencies(norm);
  return ccys.some((c) => impact.affectedCurrencies.includes(c));
}

type ChartState =
  | { kind: "loading" }
  | { kind: "ok"; bars: OhlcDataPoint[] }
  | { kind: "unavailable" }
  | { kind: "not-on-plan" };

export default function Trade() {
  const { symbol: urlSymbol } = useParams<{ symbol: string }>();
  // /trade with no symbol → redirect to /trade/<lastViewedOrDefault>
  if (!urlSymbol) {
    return <Navigate to={`/trade/${readLastSymbol()}`} replace />;
  }
  return <TradeContent symbol={urlSymbol.toUpperCase()} />;
}

function TradeContent({ symbol }: { symbol: string }) {
  const navigate = useNavigate();
  const { getAssetBySymbol } = useAssets();
  const { traderStyle, resolvedTimeframes, isCustomTimeframes } = useTraderStyle();
  const instrument = useMemo(() => getInstrument(symbol) ?? null, [symbol]);
  const asset = useMemo(() => getAssetBySymbol(symbol), [symbol, getAssetBySymbol, traderStyle]);
  const quote = useMarketQuote(symbol);

  const [timeframe, setTimeframe] = useState<string>("h1");
  const [chartState, setChartState] = useState<ChartState>({ kind: "loading" });
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [liveNewsEvents, setLiveNewsEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [blockingRoles, setBlockingRoles] = useState<TfRole[]>([]);
  const [tradeEntry, setTradeEntry] = useState<EntryIntent | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // Current session (by wall-clock hour) — reuses DynamicRiskAdvisor's getSession
  // so the "context" matching is consistent with how journalled trades were
  // bucketed. Recomputed once per render; cheap.
  const currentSession = useMemo(() => {
    const d = new Date();
    const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return getDraSession(hhmm);
  }, [symbol]);

  // Persist last-viewed symbol on every change
  useEffect(() => {
    writeLastSymbol(symbol);
  }, [symbol]);

  // Priority symbol hint for candle cache
  useEffect(() => {
    setPrioritySymbol(symbol);
    return () => setPrioritySymbol(null);
  }, [symbol]);

  // Fetch live calendar once
  useEffect(() => {
    let cancelled = false;
    getLiveCalendarEvents()
      .then((events) => {
        if (!cancelled) setLiveNewsEvents(events);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch chart bars
  useEffect(() => {
    let cancelled = false;
    setChartState({ kind: "loading" });
    fetchRealOhlcData(symbol, timeframe)
      .then((bars) => {
        if (cancelled) return;
        if (!bars || bars.length === 0) {
          setChartState({ kind: "unavailable" });
          return;
        }
        setChartState({ kind: "ok", bars });
      })
      .catch(() => {
        if (!cancelled) setChartState({ kind: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframe]);

  // Relevant upcoming calendar events
  const allEvents = useMemo(() => {
    // live source preferred; fall back to static bundle
    return liveNewsEvents.length > 0 ? liveNewsEvents : getAllCalendarEvents();
  }, [liveNewsEvents]);

  const upcomingRelevantEvents = useMemo(() => {
    const now = Date.now();
    const horizon = now + 7 * 24 * 60 * 60 * 1000;
    return allEvents
      .filter((e) => isEventRelevantToSymbol(symbol, e))
      .filter((e) => {
        const t = getEventDateTime(e).getTime();
        return !Number.isNaN(t) && t >= now && t <= horizon;
      })
      .sort((a, b) => getEventDateTime(a).getTime() - getEventDateTime(b).getTime());
  }, [allEvents, symbol]);

  // Build market context (panel + checklist consumer)
  useEffect(() => {
    if (!asset) {
      setMarketContext(null);
      return;
    }
    let cancelled = false;
    buildMarketContext({
      asset,
      quote,
      upcomingRelevantEvents,
      resolvedTimeframes,
    })
      .then((ctx) => {
        if (!cancelled) setMarketContext(ctx);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [asset, quote, upcomingRelevantEvents, resolvedTimeframes]);

  const handleSelectSymbol = useCallback(
    (s: string) => {
      if (s.toUpperCase() !== symbol) navigate(`/trade/${s}`);
    },
    [navigate, symbol],
  );

  const handleOpenEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventOpen(true);
  }, []);

  const chartBars = chartState.kind === "ok" ? chartState.bars : null;
  const liveMid = quote?.last ?? null;

  // Stop distance in pips — only well-defined once both prices exist.
  const stopPips = useMemo(() => {
    if (!tradeEntry?.stopPrice || !instrument) return undefined;
    const diff = Math.abs(tradeEntry.entryPrice - tradeEntry.stopPrice);
    const pips = diff / instrument.pipSize;
    return Number.isFinite(pips) ? Math.round(pips * 10) / 10 : undefined;
  }, [tradeEntry, instrument]);

  return (
    <div className="p-3 sm:p-6 space-y-4">
      <AppHeader title="Trade" />

      <div className="flex items-center gap-3">
        <PairSelector currentSymbol={symbol} onSelect={handleSelectSymbol} />
      </div>

      <div className="flex gap-4">
        <ErrorBoundary key={symbol} fallbackMessage="Failed to load chart">
          <div className="flex-1 min-w-0 relative h-[600px]">
            {chartState.kind === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Loading chart…
              </div>
            )}
            {chartState.kind === "ok" && (
              <CandlestickChart
                data={chartState.bars}
                pair={symbol.toLowerCase()}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
              />
            )}
            {chartState.kind === "unavailable" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <DataUnavailableState />
              </div>
            )}
            {chartState.kind === "not-on-plan" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <NotOnPlanState name={instrument?.displayName ?? symbol} />
              </div>
            )}
          </div>
        </ErrorBoundary>

        <div className="hidden lg:flex lg:flex-col gap-3 w-[360px] shrink-0">
          <MarketAwarenessPanel
            symbol={symbol}
            instrument={instrument}
            context={marketContext}
            resolvedTimeframes={resolvedTimeframes}
            traderStyleLabel={styleLabel(traderStyle, isCustomTimeframes)}
            chartBars={chartBars}
            quote={quote}
            sentiment={asset?.sentiment ?? null}
            upcomingRelevantEvents={upcomingRelevantEvents}
            blockingRoles={blockingRoles}
            onOpenEvent={handleOpenEvent}
          />
          <ReadinessChecklist
            context={marketContext}
            resolvedTimeframes={resolvedTimeframes}
            symbol={symbol}
            upcomingRelevantEvents={upcomingRelevantEvents}
            onBlockingRolesChange={setBlockingRoles}
          />
          <DynamicRiskCell
            symbol={symbol}
            session={currentSession}
            onOpenSlideOver={() => setSlideOverOpen(true)}
          />
          <InATradeButton
            symbol={symbol}
            liveMidPrice={liveMid}
            active={tradeEntry !== null}
            entry={tradeEntry}
            displayDecimals={instrument?.displayDecimals ?? 5}
            onEnter={setTradeEntry}
            onExit={() => setTradeEntry(null)}
          />
        </div>
      </div>

      <PositionSizeSlideOver
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
        prefill={{
          symbol,
          entryPrice: tradeEntry?.entryPrice ?? liveMid,
          stopPrice: tradeEntry?.stopPrice ?? null,
          targetPrice: tradeEntry?.targetPrice ?? null,
          stopPips,
        }}
      />

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={isEventOpen}
          onClose={() => setIsEventOpen(false)}
        />
      )}
    </div>
  );
}
