// src/components/chart/ChartEngine.tsx
// ─────────────────────────────────────────────────────────────
// The ONLY file in the codebase that imports `lightweight-charts`.
// Library swap = rewrite one file.
//
// Owns series refs internally; never exposes them.
// Preserves every behaviour previously in CandlestickChart.tsx:
//   chart styles (candlestick, heikin-ashi, hollow, line, area, bars),
//   moving-average indicator overlay,
//   crosshair hover + OHLC tooltip,
//   fullscreen state (owned by caller via style),
//   resize,
//   theme colours.
//
// Two effects:
//   STRUCTURAL effect — creates/replaces series, calls setData, subscribes
//     crosshair, draws MA, runs fitContent ONCE. Depends on `bars` (NOT the
//     merged live set), chartStyle, activeIndicators, pair, displayInterval,
//     formatPrice, formatTime, onCrosshairMove. A live tick therefore never
//     rebuilds the series or resets the user's zoom.
//   LIVE-UPDATE effect — applies `liveBar` incrementally via series.update()
//     and updates the MA's last point. Never calls fitContent, never removes
//     or recreates any series, never changes the visible range. Uses
//     classifyLiveBarUpdate to decide same-bar overwrite vs new-bar append
//     vs ignore-older.
// ─────────────────────────────────────────────────────────────

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type IPriceLine,
  type CandlestickData,
  type LineData,
  type SeriesMarker,
  type Time,
  type MouseEventHandler,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';

import type { CalendarEvent } from '@/data/calendarEvents';

import type { OhlcDataPoint } from '@/lib/mockOhlcData';
import type { MarketCandle } from '@/services/marketData';
import type { DataClock } from '@/services/dataProvider';
import type { OverlayDescriptor } from '@/services/overlayBuilder';
import type { ChartStyle } from '@/components/chart/ChartStyleSelector';
import { classifyLiveBarUpdate } from '@/lib/liveBarClassify';

export interface ChartEngineProps {
  /** Oldest-first OHLC points (same shape AssetDetail passes today). */
  bars: OhlcDataPoint[];
  /** Live-updating forming bar (or a new rollover bar). Must include timestamp. */
  liveBar?: Partial<OhlcDataPoint> & { timestamp: number };
  chartStyle: ChartStyle;
  /** LiveClock in prod, ReplayClock in replay. Unused in Stage 2 live path. */
  clock?: DataClock;
  /** Display interval key (ChartToolbar key — 'm1'|'m5'|...|'d1' or raw TfCode). */
  displayInterval: string;
  /** Present only in replay (Stage 8). Not read in Stage 2. */
  sourceBars1m?: MarketCandle[];
  /** Overlays (Stage 4 builds them; Stage 2 renders price-line + highlight-band). */
  overlays?: OverlayDescriptor[];
  /** Optional crosshair callback (Stage 4+). */
  onCrosshairMove?: (bar: OhlcDataPoint | null) => void;
  /** Called when user clicks an event-marker on the chart. */
  onEventMarkerClick?: (event: CalendarEvent) => void;
  /** Pair string used by the OHLC-hover formatter. */
  pair: string;
  /** True → OHLC tooltip near crosshair. */
  ohlcEnabled?: boolean;
  /** True → crosshair visible (Normal); false → hidden. */
  crosshairEnabled?: boolean;
  /** Active indicator ids. Only `sma`/`ema`/`ma` recognised at launch. */
  activeIndicators?: string[];
  /** Formatter for the tooltip's price fields. */
  formatPrice: (price: number, pair: string) => string;
  /** Formatter for the tooltip's time field. */
  formatTime: (timestamp: number, timeframe: string) => string;
}

export interface ChartEngineRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  isUp: boolean;
}

function calculateHeikinAshi(data: OhlcDataPoint[]): OhlcDataPoint[] {
  const result: OhlcDataPoint[] = [];
  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const prev = result[i - 1];
    const haClose = (current.open + current.high + current.low + current.close) / 4;
    const haOpen = prev
      ? (prev.open + prev.close) / 2
      : (current.open + current.close) / 2;
    const haHigh = Math.max(current.high, haOpen, haClose);
    const haLow = Math.min(current.low, haOpen, haClose);
    result.push({
      time: current.time,
      timestamp: current.timestamp,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    });
  }
  return result;
}

interface BaseOhlc { open: number; high: number; low: number; close: number }

/** Compute a Heikin-Ashi bar given raw OHLC and the previous HA bar (nullable). */
function computeHaBar(raw: BaseOhlc, prevHa: BaseOhlc | null): BaseOhlc {
  const haClose = (raw.open + raw.high + raw.low + raw.close) / 4;
  const haOpen = prevHa ? (prevHa.open + prevHa.close) / 2 : (raw.open + raw.close) / 2;
  const haHigh = Math.max(raw.high, haOpen, haClose);
  const haLow = Math.min(raw.low, haOpen, haClose);
  return { open: haOpen, high: haHigh, low: haLow, close: haClose };
}

const INTERVAL_DURATION_SEC: Record<string, number> = {
  m1: 60, m5: 300, m15: 900, h1: 3600, h4: 14400, d1: 86400,
  '1min': 60, '5min': 300, '15min': 900, '1h': 3600, '4h': 14400, '1day': 86400,
};

export const ChartEngine = forwardRef<ChartEngineRef, ChartEngineProps>(
  function ChartEngine(
    {
      bars,
      liveBar,
      chartStyle,
      displayInterval,
      overlays,
      onCrosshairMove,
      onEventMarkerClick,
      pair,
      ohlcEnabled = false,
      crosshairEnabled = true,
      activeIndicators = [],
      formatPrice,
      formatTime,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const mainSeriesRef = useRef<
      ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | ISeriesApi<'Area'> | ISeriesApi<'Bar'> | null
    >(null);
    const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const crosshairHandlerRef = useRef<MouseEventHandler<Time> | null>(null);
    const priceLinesRef = useRef<IPriceLine[]>([]);
    const highlightSeriesRef = useRef<ISeriesApi<'Area'>[]>([]);
    const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const overlayClickHandlerRef = useRef<MouseEventHandler<Time> | null>(null);
    // Stable ref so the overlay click handler never captures a stale callback.
    const onEventMarkerClickRef = useRef(onEventMarkerClick);
    useEffect(() => { onEventMarkerClickRef.current = onEventMarkerClick; });

    // State preserved across renders so the live-update effect can derive from it.
    const seriesKindRef = useRef<ChartStyle>(chartStyle);
    const lastHaBarRef = useRef<BaseOhlc | null>(null);
    const prevHaBarRef = useRef<BaseOhlc | null>(null); // HA state at index N-2 (needed to recompute index N-1)
    // Set only in the structural effect (never touched by the live-update effect) so
    // rollover ticks always compute against the stable base HA, not a tick-mutated value.
    const baseLastHaRef = useRef<BaseOhlc | null>(null);

    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

    const handleZoomIn = useCallback(() => {
      if (!chartRef.current) return;
      const timeScale = chartRef.current.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (range) {
        timeScale.setVisibleLogicalRange({
          from: range.from + (range.to - range.from) * 0.2,
          to: range.to - (range.to - range.from) * 0.2,
        });
      }
    }, []);

    const handleZoomOut = useCallback(() => {
      if (!chartRef.current) return;
      const timeScale = chartRef.current.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (range) {
        timeScale.setVisibleLogicalRange({
          from: range.from - (range.to - range.from) * 0.25,
          to: range.to + (range.to - range.from) * 0.25,
        });
      }
    }, []);

    const handleReset = useCallback(() => {
      chartRef.current?.timeScale().fitContent();
    }, []);

    useImperativeHandle(ref, () => ({
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetView: handleReset,
    }));

    useEffect(() => {
      chartRef.current?.applyOptions({
        crosshair: {
          mode: crosshairEnabled ? CrosshairMode.Normal : CrosshairMode.Hidden,
        },
      });
    }, [crosshairEnabled]);

    // ── Init chart (once) ──────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { color: 'transparent' },
          textColor: 'hsl(215, 20%, 55%)',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: 'hsl(217, 19%, 16%)' },
          horzLines: { color: 'hsl(217, 19%, 16%)' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'hsl(215, 20%, 40%)',
            width: 1,
            style: 2,
            labelBackgroundColor: 'hsl(217, 33%, 17%)',
          },
          horzLine: {
            color: 'hsl(215, 20%, 40%)',
            width: 1,
            style: 2,
            labelBackgroundColor: 'hsl(217, 33%, 17%)',
          },
        },
        rightPriceScale: {
          borderColor: 'hsl(217, 19%, 20%)',
          scaleMargins: { top: 0.08, bottom: 0.08 },
        },
        timeScale: {
          borderColor: 'hsl(217, 19%, 20%)',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      });
      chartRef.current = chart;

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };
      window.addEventListener('resize', handleResize);
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
        if (crosshairHandlerRef.current) {
          try {
            chart.unsubscribeCrosshairMove(crosshairHandlerRef.current);
          } catch {
            /* chart already gone */
          }
          crosshairHandlerRef.current = null;
        }
        chart.remove();
        chartRef.current = null;
        mainSeriesRef.current = null;
        maSeriesRef.current = null;
        priceLinesRef.current = [];
        highlightSeriesRef.current = [];
      };
    }, []);

    // ── STRUCTURAL effect ──────────────────────────────────────
    // Rebuilds series + MA + crosshair on bar/style/indicator/pair/interval change.
    // Does NOT depend on liveBar — a live tick never resets zoom.
    useEffect(() => {
      const chart = chartRef.current;
      if (!chart || !bars.length) return;

      if (mainSeriesRef.current) {
        chart.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
      }
      if (maSeriesRef.current) {
        chart.removeSeries(maSeriesRef.current);
        maSeriesRef.current = null;
      }
      if (crosshairHandlerRef.current) {
        try {
          chart.unsubscribeCrosshairMove(crosshairHandlerRef.current);
        } catch {
          /* noop */
        }
        crosshairHandlerRef.current = null;
      }

      seriesKindRef.current = chartStyle;

      let processed = bars;
      if (chartStyle === 'heikin-ashi') {
        processed = calculateHeikinAshi(bars);
        lastHaBarRef.current = processed.length > 0 ? processed[processed.length - 1] : null;
        baseLastHaRef.current = lastHaBarRef.current;
        prevHaBarRef.current = processed.length > 1 ? processed[processed.length - 2] : null;
      } else {
        lastHaBarRef.current = null;
        baseLastHaRef.current = null;
        prevHaBarRef.current = null;
      }

      if (chartStyle === 'line') {
        const series = chart.addSeries(LineSeries, {
          color: 'hsl(200, 80%, 60%)',
          lineWidth: 2,
          priceLineVisible: true,
        });
        series.setData(
          processed.map((d): LineData => ({ time: d.timestamp as Time, value: d.close })),
        );
        mainSeriesRef.current = series;
      } else if (chartStyle === 'area') {
        const series = chart.addSeries(AreaSeries, {
          topColor: 'hsl(200, 80%, 60%)',
          bottomColor: 'hsla(200, 80%, 60%, 0.1)',
          lineColor: 'hsl(200, 80%, 60%)',
          lineWidth: 2,
        });
        series.setData(
          processed.map((d): LineData => ({ time: d.timestamp as Time, value: d.close })),
        );
        mainSeriesRef.current = series;
      } else if (chartStyle === 'bars') {
        const series = chart.addSeries(BarSeries, {
          upColor: 'hsl(142, 71%, 45%)',
          downColor: 'hsl(0, 84%, 60%)',
        });
        series.setData(
          processed.map((d) => ({
            time: d.timestamp as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          })),
        );
        mainSeriesRef.current = series;
      } else {
        const isHollow = chartStyle === 'hollow';
        const series = chart.addSeries(CandlestickSeries, {
          upColor: isHollow ? 'transparent' : 'hsl(142, 71%, 45%)',
          downColor: 'hsl(0, 84%, 60%)',
          borderUpColor: 'hsl(142, 71%, 45%)',
          borderDownColor: 'hsl(0, 84%, 60%)',
          wickUpColor: 'hsl(142, 71%, 45%)',
          wickDownColor: 'hsl(0, 84%, 60%)',
        });
        series.setData(
          processed.map((d): CandlestickData => ({
            time: d.timestamp as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          })),
        );
        mainSeriesRef.current = series;

        const handler: MouseEventHandler<Time> = (param) => {
          if (!param.point || !param.time || !param.seriesData.size) {
            setTooltipData(null);
            onCrosshairMove?.(null);
            return;
          }
          const candle = param.seriesData.get(series) as CandlestickData | undefined;
          if (!candle) {
            setTooltipData(null);
            onCrosshairMove?.(null);
            return;
          }
          const isUp = candle.close >= candle.open;
          setTooltipData({
            visible: true,
            x: param.point.x,
            y: param.point.y,
            time: formatTime(param.time as number, displayInterval),
            open: formatPrice(candle.open, pair),
            high: formatPrice(candle.high, pair),
            low: formatPrice(candle.low, pair),
            close: formatPrice(candle.close, pair),
            isUp,
          });
          onCrosshairMove?.({
            time: new Date((param.time as number) * 1000).toISOString(),
            timestamp: param.time as number,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          });
        };
        chart.subscribeCrosshairMove(handler);
        crosshairHandlerRef.current = handler;
      }

      // Moving-average indicator
      if (activeIndicators.some((id) => ['sma', 'ema', 'ma'].includes(id))) {
        const maSeries = chart.addSeries(LineSeries, {
          color: 'hsl(200, 80%, 60%)',
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        const maPeriod = 20;
        const maData = bars
          .map((d, i) => {
            if (i < maPeriod - 1) return null;
            const slice = bars.slice(i - maPeriod + 1, i + 1);
            const avg = slice.reduce((s, c) => s + c.close, 0) / maPeriod;
            return { time: d.timestamp as Time, value: avg };
          })
          .filter(Boolean) as { time: Time; value: number }[];
        maSeries.setData(maData);
        maSeriesRef.current = maSeries;
      }

      chart.timeScale().fitContent();
    }, [bars, chartStyle, activeIndicators, pair, displayInterval, formatPrice, formatTime, onCrosshairMove]);

    // ── LIVE-UPDATE effect ──────────────────────────────────────
    // Applies liveBar incrementally via series.update(). Never rebuilds, never
    // calls fitContent, never changes the visible range.
    useEffect(() => {
      if (!liveBar) return;
      const series = mainSeriesRef.current;
      if (!series) return;
      const lastBase = bars.length > 0 ? bars[bars.length - 1] : null;
      if (!lastBase) return;

      const kind = classifyLiveBarUpdate(lastBase.timestamp, liveBar.timestamp);
      if (kind === 'older') return;

      // Resolve the raw OHLC under the live timestamp:
      // - 'same'  → merge missing fields from lastBase (quote channel only sets close/high/low)
      // - 'newer' → candle rollover; the slow channel provides a full OHLC. Missing fields
      //             fall back to liveBar.close so a partial payload still produces a sane bar.
      const sameBar = kind === 'same';
      const liveOpen  = liveBar.open  ?? (sameBar ? lastBase.open  : (liveBar.close ?? lastBase.close));
      const liveClose = liveBar.close ?? (sameBar ? lastBase.close : liveOpen);
      const liveHigh  = liveBar.high  ?? (sameBar ? lastBase.high  : Math.max(liveOpen, liveClose));
      const liveLow   = liveBar.low   ?? (sameBar ? lastBase.low   : Math.min(liveOpen, liveClose));

      const style = seriesKindRef.current;
      const timeArg = liveBar.timestamp as Time;

      if (style === 'line' || style === 'area') {
        (series as ISeriesApi<'Line'> | ISeriesApi<'Area'>).update({ time: timeArg, value: liveClose });
      } else if (style === 'heikin-ashi') {
        // HA recompute: 'same' uses prevHaBarRef (HA at N-2); 'newer' uses baseLastHaRef (HA at N-1
        // of the base set, frozen by the structural effect — never mutated by live ticks).
        const priorHa = sameBar ? prevHaBarRef.current : baseLastHaRef.current;
        const ha = computeHaBar({ open: liveOpen, high: liveHigh, low: liveLow, close: liveClose }, priorHa);
        (series as ISeriesApi<'Candlestick'>).update({
          time: timeArg,
          open: ha.open,
          high: ha.high,
          low: ha.low,
          close: ha.close,
        });
        lastHaBarRef.current = ha;
        if (kind === 'newer') {
          prevHaBarRef.current = priorHa; // the HA that was last before this new bar
        }
      } else {
        // candlestick, hollow, bars
        (series as ISeriesApi<'Candlestick'> | ISeriesApi<'Bar'>).update({
          time: timeArg,
          open: liveOpen,
          high: liveHigh,
          low: liveLow,
          close: liveClose,
        });
      }

      // MA last-point update (never shifts earlier values; never calls fitContent).
      const ma = maSeriesRef.current;
      if (ma) {
        const maPeriod = 20;
        let window: number[] | null = null;
        if (kind === 'newer') {
          // New bar's window = last (maPeriod - 1) base closes + liveClose
          if (bars.length >= maPeriod - 1) {
            window = bars.slice(bars.length - (maPeriod - 1)).map((b) => b.close).concat(liveClose);
          }
        } else {
          // Same bar: window = (maPeriod - 1) bars ending at the one before last + liveClose
          if (bars.length >= maPeriod) {
            window = bars.slice(bars.length - maPeriod, bars.length - 1).map((b) => b.close).concat(liveClose);
          }
        }
        if (window && window.length === maPeriod) {
          const avg = window.reduce((s, c) => s + c, 0) / maPeriod;
          ma.update({ time: timeArg, value: avg });
        }
      }
    }, [liveBar, bars]);

    // ── OVERLAY effect ─────────────────────────────────────────
    // Separate from structural and live-update effects: rebuilds only when
    // overlays or displayInterval change, never on a live price tick.
    // Reuses/removes only the overlay primitives it created.
    useEffect(() => {
      const chart = chartRef.current;
      const main = mainSeriesRef.current;
      if (!chart || !main) return;

      // Clear price lines
      for (const line of priceLinesRef.current) {
        try { main.removePriceLine(line); } catch { /* noop */ }
      }
      priceLinesRef.current = [];
      for (const s of highlightSeriesRef.current) {
        try { chart.removeSeries(s); } catch { /* noop */ }
      }
      highlightSeriesRef.current = [];

      // Clear existing markers plugin
      if (markersPluginRef.current) {
        try { markersPluginRef.current.detach(); } catch { /* noop */ }
        markersPluginRef.current = null;
      }

      // Clear existing event-marker click handler
      if (overlayClickHandlerRef.current) {
        try { chart.unsubscribeClick(overlayClickHandlerRef.current); } catch { /* noop */ }
        overlayClickHandlerRef.current = null;
      }

      if (!overlays || overlays.length === 0) return;

      const markers: SeriesMarker<Time>[] = [];
      const eventMarkerData: { timestamp: number; event: CalendarEvent }[] = [];
      const barDurationSec = INTERVAL_DURATION_SEC[displayInterval] ?? 3600;

      for (const o of overlays) {
        if (o.kind === 'price-line') {
          const line = main.createPriceLine({
            price: o.price,
            color: o.color,
            lineStyle: o.dash ? LineStyle.Dashed : LineStyle.Solid,
            lineWidth: 1,
            axisLabelVisible: true,
            title: o.label,
          });
          priceLinesRef.current.push(line);
        } else if (o.kind === 'highlight-band') {
          priceLinesRef.current.push(
            main.createPriceLine({ price: o.to,   color: o.color, lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: o.label ?? '' }),
            main.createPriceLine({ price: o.from, color: o.color, lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: '' }),
          );
        } else if (o.kind === 'event-marker') {
          markers.push({
            time: o.timestamp as Time,
            position: 'belowBar',
            shape: 'circle',
            color: 'hsl(45, 90%, 60%)',
            size: 1,
            text: o.label.length > 24 ? o.label.slice(0, 24) + '…' : o.label,
          });
          eventMarkerData.push({ timestamp: o.timestamp, event: o.event });
        } else if (o.kind === 'session-line') {
          markers.push({
            time: o.timestamp as Time,
            position: 'aboveBar',
            shape: 'arrowDown',
            color: o.color,
            size: 1,
            text: o.label,
          });
        } else if (o.kind === 'swing-marker') {
          markers.push({
            time: o.timestamp as Time,
            position: o.direction === 'high' ? 'aboveBar' : 'belowBar',
            shape: o.direction === 'high' ? 'arrowDown' : 'arrowUp',
            color: o.direction === 'high' ? 'hsl(0, 84%, 60%)' : 'hsl(142, 71%, 45%)',
            size: 1,
          });
        }
      }

      if (markers.length > 0) {
        // LWC requires markers sorted by time
        markers.sort((a, b) => (a.time as number) - (b.time as number));
        markersPluginRef.current = createSeriesMarkers(main as ISeriesApi<'Candlestick'>, markers);
      }

      if (eventMarkerData.length > 0) {
        const handler: MouseEventHandler<Time> = (param) => {
          if (!param.time) return;
          const ts = param.time as number;
          for (const em of eventMarkerData) {
            if (Math.abs(em.timestamp - ts) <= barDurationSec) {
              onEventMarkerClickRef.current?.(em.event);
              return;
            }
          }
        };
        chart.subscribeClick(handler);
        overlayClickHandlerRef.current = handler;
      }

      return () => {
        if (overlayClickHandlerRef.current) {
          try { chartRef.current?.unsubscribeClick(overlayClickHandlerRef.current); } catch { /* noop */ }
          overlayClickHandlerRef.current = null;
        }
      };
    }, [overlays, displayInterval]);

    return (
      <>
        {ohlcEnabled && tooltipData && tooltipData.visible && (
          <div
            className="absolute z-[60] pointer-events-none bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg text-sm"
            style={{
              left: Math.min(
                tooltipData.x + 12,
                (containerRef.current?.clientWidth ?? 0) - 150,
              ),
              top: Math.max(tooltipData.y - 80, 10),
            }}
          >
            <div className="text-muted-foreground text-xs mb-1">{tooltipData.time}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-muted-foreground">O:</span>
              <span className="text-foreground font-medium">{tooltipData.open}</span>
              <span className="text-muted-foreground">H:</span>
              <span className="text-foreground font-medium">{tooltipData.high}</span>
              <span className="text-muted-foreground">L:</span>
              <span className="text-foreground font-medium">{tooltipData.low}</span>
              <span className="text-muted-foreground">C:</span>
              <span className={`font-medium ${tooltipData.isUp ? 'text-success' : 'text-destructive'}`}>
                {tooltipData.close}
              </span>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="absolute inset-0 bg-[hsl(222,30%,5%)]"
        />
      </>
    );
  },
);
