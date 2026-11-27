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

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CandlestickChart } from "@/components/CandlestickChart";
import { DataUnavailableState } from "@/components/chart/DataUnavailableState";
import { NotOnPlanState } from "@/components/chart/NotOnPlanState";

import { PairSelector } from "@/components/trade/PairSelector";
import { MarketAwarenessPanel } from "@/components/trade/MarketAwarenessPanel";
import { ReadinessChecklist, evaluateChecklist } from "@/components/trade/ReadinessChecklist";
import { DynamicRiskCell } from "@/components/trade/DynamicRiskCell";
import { InATradeButton, type EntryIntent } from "@/components/trade/InATradeButton";
import { ChartOverlayController } from "@/components/trade/ChartOverlayController";
import { BiasStrip } from "@/components/trade/BiasStrip";
import { PositionSizeSlideOver } from "@/components/trade/PositionSizeSlideOver";
import { MobileMarketPanel } from "@/components/trade/MobileMarketPanel";
import { getSession as getDraSession } from "@/components/risk/DynamicRiskAdvisor";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { useAssets } from "@/hooks/use-watchlist";
import { useMarketQuote } from "@/hooks/use-market-quotes";
import { useTraderStyle } from "@/context/TraderStyleProvider";

import { buildMarketContext, type MarketContext } from "@/services/contextEngine";
import type { OverlayDescriptor } from "@/services/overlayBuilder";
import { setPrioritySymbol, isSymbolRestricted } from "@/services/candleData";
import { pollIntervals, isUserIdle, getLastActivity } from "@/lib/pollPolicy";
import { activeProviderName } from "@/services/activeProvider";
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

function PriceTicker({
  quote,
  instrument,
  session,
}: {
  quote: { last: number; change: number; changePercent: number; direction: string; stale?: boolean } | null;
  instrument: { displayDecimals: number } | null;
  session: string | null;
}) {
  if (!instrument) return null;
  if (!quote) {
    return (
      <div className="hidden lg:flex items-center gap-2">
        <span className="inline-block h-4 w-24 bg-muted/40 rounded animate-pulse" />
      </div>
    );
  }
  const priceStr = quote.last.toFixed(instrument.displayDecimals);
  const absStr = Math.abs(quote.change).toFixed(instrument.displayDecimals);
  const sign = quote.change > 0 ? "+" : quote.change < 0 ? "−" : "";
  const pctStr = (quote.change > 0 ? "+" : quote.change < 0 ? "−" : "") + Math.abs(quote.changePercent).toFixed(2) + "%";
  const changeColor = quote.direction === "up" ? "text-success" : quote.direction === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className={`hidden lg:flex items-baseline gap-2.5${quote.stale ? " opacity-50" : ""}`}>
      <span className="text-sm font-semibold tabular-nums text-foreground">{priceStr}</span>
      <span className={`text-xs tabular-nums ${changeColor}`}>
        {sign}{absStr} ({pctStr})
      </span>
      {session && (
        <span className="text-[11px] text-muted-foreground/90 border border-border/50 rounded px-1.5 py-0.5 leading-none">
          {session}
        </span>
      )}
    </div>
  );
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

// Auto-retry schedule for transient rate-limit failures (8 s, 20 s, 45 s).
const RETRY_DELAYS_MS = [8_000, 20_000, 45_000];

function debugContext(msg: string): void {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('debugCandles') === '1') {
      console.debug(msg);
    }
  } catch { /* noop */ }
}

function isContextInsufficient(ctx: MarketContext): boolean {
  // "Bias Unavailable" is a permanent gate (symbol not whitelisted); no point retrying.
  if (ctx.biasState === "Bias Unavailable") return false;
  // All-zero confidence across all roles means every candle fetch returned empty —
  // the typical signal for a Twelve Data rate-limit hit.
  return Object.values(ctx.perRole).every((r) => r.confidence === 0);
}

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
  // Keep latest quote in a ref so the context-build effect doesn't restart on
  // every 15 s poll tick — the actual quote value is read at build time.
  const quoteRef = useRef(quote);
  useEffect(() => { quoteRef.current = quote; }, [quote]);
  // Monotonic sequence number: increment on each effect run (and cleanup) so
  // any in-flight build that completes after a symbol/TF change is discarded.
  const contextBuildSeq = useRef(0);

  const [timeframe, setTimeframe] = useState<string>("h1");
  const [chartState, setChartState] = useState<ChartState>({ kind: "loading" });
  const [marketContext, setMarketContext] = useState<MarketContext | null>(null);
  const [liveNewsEvents, setLiveNewsEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [blockingRoles, setBlockingRoles] = useState<TfRole[]>([]);
  const [tradeEntry, setTradeEntry] = useState<EntryIntent | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [chartOverlays, setChartOverlays] = useState<OverlayDescriptor[]>([]);
  const [mobileTradeSheetOpen, setMobileTradeSheetOpen] = useState(false);

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

  // Fetch chart bars — auto-retries up to 3 times on rate-limit empty responses,
  // staying in "loading" state between attempts (no hard error until exhausted).
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    setChartState({ kind: "loading" });

    const run = () => {
      fetchRealOhlcData(symbol, timeframe)
        .then((bars) => {
          if (cancelled) return;
          if (bars && bars.length > 0) {
            setChartState({ kind: "ok", bars });
            return;
          }
          if (isSymbolRestricted(symbol, timeframe)) {
            setChartState({ kind: "not-on-plan" });
            return;
          }
          if (attempt < RETRY_DELAYS_MS.length) {
            setTimeout(() => { if (!cancelled) run(); }, RETRY_DELAYS_MS[attempt++]);
          } else {
            setChartState({ kind: "unavailable" });
          }
        })
        .catch(() => {
          if (cancelled) return;
          if (attempt < RETRY_DELAYS_MS.length) {
            setTimeout(() => { if (!cancelled) run(); }, RETRY_DELAYS_MS[attempt++]);
          } else {
            setChartState({ kind: "unavailable" });
          }
        });
    };
    run();

    return () => { cancelled = true; };
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

  // Readiness count for mobile chip row (slightly stale on session boundary but acceptable for a badge).
  // Must stay BELOW upcomingRelevantEvents: using a const before its declaration throws at render.
  const mobileConditionsMet = useMemo(() => {
    if (!marketContext) return 0;
    return evaluateChecklist({
      context: marketContext,
      resolvedTimeframes,
      symbol,
      upcomingRelevantEvents,
      now: new Date(),
    }).metCount;
  }, [marketContext, resolvedTimeframes, symbol, upcomingRelevantEvents]);

  // Build market context — survives quote ticks (quote removed from dep array;
  // read via quoteRef at build time). Retries on all-zero confidence.
  // Refreshes every 60 s for freshness once context is populated.
  useEffect(() => {
    if (!asset) {
      setMarketContext(null);
      return;
    }

    contextBuildSeq.current += 1;
    const mySeq = contextBuildSeq.current;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const run = () => {
      debugContext(`[context] ${symbol} build start seq=${mySeq} attempt=${attempt}`);
      buildMarketContext({
        asset,
        quote: quoteRef.current,
        upcomingRelevantEvents,
        resolvedTimeframes,
      })
        .then((ctx) => {
          if (contextBuildSeq.current !== mySeq) {
            debugContext(`[context] ${symbol} build discarded seq=${mySeq}`);
            return;
          }
          if (isContextInsufficient(ctx) && attempt < RETRY_DELAYS_MS.length) {
            retryTimer = setTimeout(() => {
              if (contextBuildSeq.current !== mySeq) return;
              attempt++;
              run();
            }, RETRY_DELAYS_MS[attempt]);
            return;
          }
          debugContext(`[context] ${symbol} build applied seq=${mySeq}`);
          setMarketContext(ctx);
        })
        .catch(() => {});
    };
    run();

    // Periodic refresh so context stays fresh without depending on quote churn.
    const contextMs = pollIntervals(activeProviderName).contextMs;
    const refreshTimer = setInterval(() => {
      if (contextBuildSeq.current !== mySeq) return;
      if (isUserIdle(Date.now(), getLastActivity())) return;
      attempt = 0;
      run();
    }, contextMs);

    // Catch-up rebuild when user returns after idle period
    const onActive = () => {
      if (contextBuildSeq.current !== mySeq) return;
      attempt = 0;
      run();
    };
    window.addEventListener('user-active', onActive);

    return () => {
      contextBuildSeq.current += 1;
      if (retryTimer !== null) clearTimeout(retryTimer);
      clearInterval(refreshTimer);
      window.removeEventListener('user-active', onActive);
    };
  }, [asset, symbol, upcomingRelevantEvents, resolvedTimeframes]);

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
    <div className="p-3 sm:p-6 space-y-4 pb-16 lg:p-0 lg:space-y-0 lg:pb-0 lg:h-full lg:overflow-hidden lg:flex lg:flex-col [@media_(orientation:landscape)_and_(max-height:500px)]:p-2 [@media_(orientation:landscape)_and_(max-height:500px)]:space-y-1 [@media_(orientation:landscape)_and_(max-height:500px)]:pb-10">
      <AppHeader title="Trade" />

      <div className="flex items-center gap-3 lg:px-4 lg:py-2 lg:shrink-0">
        <PairSelector currentSymbol={symbol} onSelect={handleSelectSymbol} />
        <PriceTicker quote={quote} instrument={instrument} session={currentSession} />
      </div>

      {/* Mobile chip row — hidden on landscape phones where vertical space is tight */}
      <div className="lg:hidden [@media_(orientation:landscape)_and_(max-height:500px)]:hidden overflow-x-auto -mx-3 px-3">
        <div className="flex items-center gap-2 pb-1 min-w-max">
          <div className="shrink-0 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
            {marketContext === null ? '—' : `${mobileConditionsMet} of 3 conditions`}
          </div>
          <button
            type="button"
            onClick={() => setSlideOverOpen(true)}
            className="shrink-0 rounded-full bg-muted/60 px-3 py-1 text-xs text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
          >
            Dynamic Risk
          </button>
          {tradeEntry ? (
            <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/40 px-3 py-1 text-xs">
              <span className="text-foreground">
                {tradeEntry.direction === "long" ? "Long" : "Short"} @{tradeEntry.entryPrice.toFixed(instrument?.displayDecimals ?? 5)}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setTradeEntry(null); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Exit trade"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMobileTradeSheetOpen(true)}
              className="shrink-0 rounded-full bg-muted/60 px-3 py-1 text-xs text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
            >
              I&apos;m in a trade
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden lg:px-4 lg:pb-3">
        <div className="flex-1 min-w-0 flex flex-col lg:min-h-0">
          <ErrorBoundary key={symbol} fallbackMessage="Failed to load chart">
            <div className="relative min-h-[60vh] lg:flex-1 lg:min-h-[320px] [@media_(orientation:landscape)_and_(max-height:500px)]:min-h-[180px]">
              {chartState.kind === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  Loading chart…
                </div>
              )}
              {chartState.kind === "ok" && (
                <>
                  <CandlestickChart
                    data={chartState.bars}
                    pair={symbol.toLowerCase()}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                    overlays={chartOverlays}
                    onEventMarkerClick={handleOpenEvent}
                  />
                  <ChartOverlayController
                    symbol={symbol}
                    bars={chartState.bars}
                    interval={timeframe}
                    marketContext={marketContext}
                    calendarEvents={allEvents}
                    tradeEntry={tradeEntry}
                    onOverlaysChange={setChartOverlays}
                  />
                </>
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
          <BiasStrip
            context={marketContext}
            resolvedTimeframes={resolvedTimeframes}
            blockingRoles={blockingRoles}
            conditionsMet={mobileConditionsMet}
          />
        </div>

        <div className="hidden lg:flex lg:flex-col gap-3 w-[360px] shrink-0 overflow-y-auto min-h-0 py-3">
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

      {/* Mobile trade entry sheet */}
      <Sheet open={mobileTradeSheetOpen} onOpenChange={setMobileTradeSheetOpen}>
        <SheetContent side="bottom" className="lg:hidden max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Mark trade entry — {symbol}</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <InATradeButton
              symbol={symbol}
              liveMidPrice={liveMid}
              active={tradeEntry !== null}
              entry={tradeEntry}
              displayDecimals={instrument?.displayDecimals ?? 5}
              onEnter={(e) => { setTradeEntry(e); setMobileTradeSheetOpen(false); }}
              onExit={() => { setTradeEntry(null); setMobileTradeSheetOpen(false); }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          isOpen={isEventOpen}
          onClose={() => setIsEventOpen(false)}
        />
      )}

      {/* Mobile bottom sheet panel (lg:hidden inside the component) */}
      <MobileMarketPanel
        symbol={symbol}
        instrument={instrument}
        context={marketContext}
        resolvedTimeframes={resolvedTimeframes}
        traderStyleLabel={styleLabel(traderStyle, isCustomTimeframes)}
        chartBars={chartBars}
        quote={quote}
        sentiment={asset?.sentiment ?? null}
        upcomingRelevantEvents={upcomingRelevantEvents}
        onOpenEvent={handleOpenEvent}
        session={currentSession}
        onOpenSlideOver={() => setSlideOverOpen(true)}
        conditionsMet={mobileConditionsMet}
      />
    </div>
  );
}
