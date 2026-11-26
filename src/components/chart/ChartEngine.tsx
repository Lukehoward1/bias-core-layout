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
  type ISeriesPrimitive,
  type IPrimitivePaneView,
  type IPrimitivePaneRenderer,
  type SeriesAttachedParameter,
  type CandlestickData,
  type LineData,
  type SeriesMarker,
  type Time,
  type Logical,
  type MouseEventHandler,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  CrosshairMode,
  LineStyle,
  PriceScaleMode,
} from 'lightweight-charts';
import type { CanvasRenderingTarget2D } from 'fancy-canvas';

import type { CalendarEvent } from '@/data/calendarEvents';

// ── Swing segment primitive ────────────────────────────────────
// Short horizontal lines from the swing candle to 4 bars past the last bar.
// Drawn as a native LWC ISeriesPrimitive so they re-render automatically on
// pan / zoom / rescale without any RAF loop.

interface SwingSegData {
  barIndex: number;
  price: number;
  direction: 'high' | 'low';
  opacity: number;
}

/** Convert 6-digit hex + alpha to rgba() string. Falls back to the hex on parse failure. */
function hexWithOpacity(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
}

/** Mix a 6-digit hex colour toward black by `amount` (0–1). Falls back unchanged on parse failure. */
function darkenHex(hex: string, amount: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const factor = 1 - amount;
  const r = Math.round(((n >> 16) & 0xff) * factor);
  const g = Math.round(((n >> 8)  & 0xff) * factor);
  const b = Math.round((n & 0xff)          * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Derive readable chart colours from background luminance. */
function deriveChartColors(isDark: boolean) {
  if (isDark) {
    return {
      textColor:       'hsl(215, 20%, 55%)',
      gridColor:       'hsl(217, 19%, 16%)',
      crosshairColor:  'hsl(215, 20%, 40%)',
      labelBgColor:    'hsl(217, 33%, 17%)',
      axisBorderColor: 'hsl(217, 19%, 20%)',
    };
  }
  return {
    textColor:       'hsl(217, 19%, 25%)',
    gridColor:       'hsl(218, 18%, 82%)',
    crosshairColor:  'hsl(218, 12%, 55%)',
    labelBgColor:    'hsl(218, 20%, 88%)',
    axisBorderColor: 'hsl(218, 16%, 78%)',
  };
}

class SwingSegmentRenderer implements IPrimitivePaneRenderer {
  private readonly _segments: SwingSegData[];
  private readonly _lastBarIdx: number;
  private readonly _chart: IChartApi | null;
  private readonly _series: ISeriesApi<'Candlestick', Time> | null;
  private readonly _highColor: string;
  private readonly _lowColor: string;

  constructor(
    segments: SwingSegData[],
    lastBarIdx: number,
    chart: IChartApi | null,
    series: ISeriesApi<'Candlestick', Time> | null,
    highColor: string,
    lowColor: string,
  ) {
    this._segments = segments;
    this._lastBarIdx = lastBarIdx;
    this._chart = chart;
    this._series = series;
    this._highColor = highColor;
    this._lowColor = lowColor;
  }

  draw(target: CanvasRenderingTarget2D): void {
    const chart = this._chart;
    const series = this._series;
    if (!chart || !series || this._segments.length === 0) return;
    const timeScale = chart.timeScale();
    target.useBitmapCoordinateSpace(({ context: ctx, horizontalPixelRatio, verticalPixelRatio }) => {
      ctx.save();
      ctx.lineWidth = horizontalPixelRatio;
      ctx.setLineDash([Math.round(2 * horizontalPixelRatio), Math.round(3 * horizontalPixelRatio)]);
      for (const seg of this._segments) {
        const y = series.priceToCoordinate(seg.price);
        if (y === null) continue;
        const x1 = timeScale.logicalToCoordinate(seg.barIndex as unknown as Logical);
        const x2 = timeScale.logicalToCoordinate((this._lastBarIdx + 4) as unknown as Logical);
        if (x1 === null || x2 === null) continue;
        ctx.strokeStyle = hexWithOpacity(
          seg.direction === 'high' ? this._highColor : this._lowColor,
          seg.opacity * 0.5,
        );
        ctx.beginPath();
        ctx.moveTo((x1 as number) * horizontalPixelRatio, (y as number) * verticalPixelRatio);
        ctx.lineTo((x2 as number) * horizontalPixelRatio, (y as number) * verticalPixelRatio);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}

class SwingSegmentView implements IPrimitivePaneView {
  private readonly _renderer: SwingSegmentRenderer;
  constructor(renderer: SwingSegmentRenderer) { this._renderer = renderer; }
  renderer(): IPrimitivePaneRenderer { return this._renderer; }
}

class SwingSegmentPrimitive implements ISeriesPrimitive<Time> {
  private _segments: SwingSegData[] = [];
  private _lastBarIdx = 0;
  private _highColor = '#ef4444';
  private _lowColor  = '#22c55e';
  private _chart: IChartApi | null = null;
  private _series: ISeriesApi<'Candlestick', Time> | null = null;
  private _requestUpdate: (() => void) | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart as unknown as IChartApi;
    this._series = param.series as unknown as ISeriesApi<'Candlestick', Time>;
    this._requestUpdate = param.requestUpdate;
  }

  detached(): void {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  update(
    segments: SwingSegData[],
    lastBarIdx: number,
    highColor?: string,
    lowColor?: string,
  ): void {
    this._segments = segments;
    this._lastBarIdx = lastBarIdx;
    if (highColor !== undefined) this._highColor = highColor;
    if (lowColor  !== undefined) this._lowColor  = lowColor;
    this._requestUpdate?.();
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [new SwingSegmentView(new SwingSegmentRenderer(
      this._segments, this._lastBarIdx, this._chart, this._series,
      this._highColor, this._lowColor,
    ))];
  }
}
// ──────────────────────────────────────────────────────────────

import type { OhlcDataPoint } from '@/lib/mockOhlcData';
import type { MarketCandle } from '@/services/marketData';
import type { DataClock } from '@/services/dataProvider';
import type { OverlayDescriptor } from '@/services/overlayBuilder';
import type { ChartStyle } from '@/components/chart/ChartStyleSelector';
import { classifyLiveBarUpdate } from '@/lib/liveBarClassify';
import { pricePrecision } from '@/lib/pricePrecision';
import {
  DEFAULT_SETTINGS,
  type ChartSettings,
  resolveChartBackground,
  isDarkHex,
} from '@/components/chart/ChartSettingsPopover';
import { useTheme } from '@/hooks/use-theme';

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
  chartSettings?: ChartSettings;
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


function toCrosshairLineStyle(s: string): LineStyle {
  if (s === 'normal') return LineStyle.Solid;
  if (s === 'dotted') return LineStyle.Dotted;
  return LineStyle.Dashed;
}

function toPsMode(m: string): PriceScaleMode {
  if (m === 'logarithmic') return PriceScaleMode.Logarithmic;
  if (m === 'percentage') return PriceScaleMode.Percentage;
  return PriceScaleMode.Normal;
}

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
      chartSettings,
    },
    ref,
  ) {
    const { theme: appTheme } = useTheme();
    // Stable ref so the init-chart effect (which runs once) can read the initial theme
    // without adding appTheme to its deps (which would re-create the chart on toggle).
    const appThemeRef = useRef(appTheme);
    useEffect(() => { appThemeRef.current = appTheme; }, [appTheme]);

    // Computed on every render — cheap and always in-sync with settings + app theme.
    const resolvedBg  = resolveChartBackground(chartSettings ?? DEFAULT_SETTINGS, appTheme);
    const isDarkChart = isDarkHex(resolvedBg);

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
    // Stable ref so the pill click handler never captures a stale callback.
    const onEventMarkerClickRef = useRef(onEventMarkerClick);
    useEffect(() => { onEventMarkerClickRef.current = onEventMarkerClick; });
    // Ref kept current so the range-change subscription reads fresh overlays.
    const overlaysRef = useRef(overlays);
    useEffect(() => { overlaysRef.current = overlays; });
    // Ref kept current so computeNewsPills can read bar prices without being in its deps.
    const barsRef = useRef(bars);
    barsRef.current = bars;

    // State preserved across renders so the live-update effect can derive from it.
    const seriesKindRef = useRef<ChartStyle>(chartStyle);
    const lastHaBarRef = useRef<BaseOhlc | null>(null);
    const prevHaBarRef = useRef<BaseOhlc | null>(null); // HA state at index N-2 (needed to recompute index N-1)
    // Set only in the structural effect (never touched by the live-update effect) so
    // rollover ticks always compute against the stable base HA, not a tick-mutated value.
    const baseLastHaRef = useRef<BaseOhlc | null>(null);
    const chartSettingsRef = useRef(chartSettings ?? DEFAULT_SETTINGS);
    chartSettingsRef.current = chartSettings ?? DEFAULT_SETTINGS;
    const prevScaleTopRef        = useRef<number>(0.08);
    const prevScaleBotRef        = useRef<number>(0.08);
    const prevPillsKeyRef        = useRef<string>('');
    const prevSessionLinesKeyRef = useRef<string>('');
    const swingSegPrimRef        = useRef<SwingSegmentPrimitive | null>(null);
    if (swingSegPrimRef.current === null) swingSegPrimRef.current = new SwingSegmentPrimitive();

    const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
    // Incremented by the structural effect each time it (re)creates the main series.
    // Adding it to the overlay effect's deps ensures overlays are re-applied after a
    // series rebuild (e.g. chart style change) even when the overlays array itself
    // hasn't changed.
    const [seriesGen, setSeriesGen] = useState(0);
    const [hoveredTs, setHoveredTs] = useState<number | null>(null);

    // ── News pill positions ─────────────────────────────────────
    // Candle-safe placement: the horizontal span of each pill is intersected
    // with all visible bar bounding boxes to find the tallest wick (minYTop)
    // and lowest wick (maxYBot). Six candidates are tried in order — above
    // levels 0–2, then below levels 0–2 — accepting the first that stays
    // inside the plot area and does not overlap an already-placed pill.
    // Fallback: dot-only marker.
    interface NewsPill {
      x: number;         // event-candle center x
      clampedX: number;  // pill left edge (edge-clamped)
      level: number;     // 0–2 for pills, -1 = dot fallback
      above: boolean;
      yCandle: number;   // anchor: candle high (above) or low (below)
      stemLength: number;
      ts: number;
      label: string;
      impact: 'high' | 'medium';
      event: CalendarEvent;
      windowEndX: number | null;
      moveData?: { direction: 'up' | 'down'; pips: number; minutes: number };
    }
    const [newsPills, setNewsPills] = useState<NewsPill[]>([]);

    // ── Session hairline positions ──────────────────────────────
    interface SessionLine { x: number; label: string; color: string }
    const [sessionLines, setSessionLines] = useState<SessionLine[]>([]);

    // Stable callback — reads refs only, safe for LWC subscriptions + RAF loop.
    const computeNewsPills = useCallback(() => {
      const chart      = chartRef.current;
      const timeScale  = chart?.timeScale();
      const mainSeries = mainSeriesRef.current;
      if (!timeScale || !chart || !containerRef.current || !mainSeries) return;

      // ── Scale margins: single owner — top (news headroom) + bottom (swing room).
      const curOverlays   = overlaysRef.current ?? [];
      const hasEvents     = curOverlays.some((o) => o.kind === 'event-marker');
      const hasSwings     = curOverlays.some((o) => o.kind === 'swing-marker');
      const hasSessions   = curOverlays.some((o) => o.kind === 'session-line');
      const desiredScaleTop = hasEvents  ? 0.16 : 0.08;
      const desiredScaleBot = hasSwings  ? 0.12 : 0.08;
      if (prevScaleTopRef.current !== desiredScaleTop || prevScaleBotRef.current !== desiredScaleBot) {
        prevScaleTopRef.current = desiredScaleTop;
        prevScaleBotRef.current = desiredScaleBot;
        chart.applyOptions({ rightPriceScale: { scaleMargins: { top: desiredScaleTop, bottom: desiredScaleBot } } });
      }

      const containerWidth  = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleWidth  = chart.priceScale('right').width();
      const plotWidth   = containerWidth - scaleWidth;
      const TIME_AXIS_H = 28;
      const plotHeight  = containerHeight - TIME_AXIS_H;

      const rawBars  = barsRef.current;
      const logRange = timeScale.getVisibleLogicalRange();

      // Derive half-candle-width from spacing between two adjacent visible bars
      let halfBarW = 4;
      if (logRange) {
        const liStart = Math.max(0, Math.floor(logRange.from));
        const liEnd   = Math.min(rawBars.length - 1, Math.ceil(logRange.to));
        for (let li = liStart; li < liEnd; li++) {
          const xa = timeScale.logicalToCoordinate(li as unknown as Logical);
          const xb = timeScale.logicalToCoordinate((li + 1) as unknown as Logical);
          if (xa !== null && xb !== null) {
            halfBarW = Math.abs((xb as number) - (xa as number)) / 2;
            break;
          }
        }
      }

      // Build pixel bounding boxes for all visible bars
      type BarPx = { x: number; yTop: number; yBot: number };
      const visibleBars: BarPx[] = [];
      {
        const iFrom = logRange ? Math.max(0, Math.floor(logRange.from)) : 0;
        const iTo   = logRange ? Math.min(rawBars.length - 1, Math.ceil(logRange.to)) : rawBars.length - 1;
        for (let i = iFrom; i <= iTo; i++) {
          const bar = rawBars[i];
          if (!bar) continue;
          const xc = timeScale.logicalToCoordinate(i as unknown as Logical);
          if (xc === null) continue;
          const yt = mainSeries.priceToCoordinate(bar.high);
          const yb = mainSeries.priceToCoordinate(bar.low);
          if (yt === null || yb === null) continue;
          visibleBars.push({ x: xc as number, yTop: yt as number, yBot: yb as number });
        }
      }

      // Min yTop / max yBot of bars whose center x falls within the pill's span
      const spanStats = (pillLeft: number, pillWidth: number) => {
        const lo = pillLeft - halfBarW;
        const hi = pillLeft + pillWidth + halfBarW;
        let minYTop = Infinity;
        let maxYBot = -Infinity;
        for (const b of visibleBars) {
          if (b.x >= lo && b.x <= hi) {
            if (b.yTop < minYTop) minYTop = b.yTop;
            if (b.yBot > maxYBot) maxYBot = b.yBot;
          }
        }
        return { minYTop, maxYBot };
      };

      const PILL_H     = 22;
      const PILL_GAP   = 6;        // clearance between pill edge and tallest wick
      const LEVEL_STEP = PILL_H + 4; // 26 px per stacked level
      const INTER_PILL = 4;
      // Reserve the top 14 px strip for session labels when sessions are showing.
      const TOP_BOUND  = hasSessions ? 18 : 4;
      const EDGE_GAP   = 4;

      // Keep-out zone on the right where level price-line tags are rendered.
      const hasLevels      = curOverlays.some((o) => o.kind === 'price-line');
      const RIGHT_KEEP_OUT = hasLevels ? 90 : EDGE_GAP;

      // Build swing-marker obstacle rects (SH/SL text labels ≈22×14px).
      type PillRect = { left: number; top: number; right: number; bottom: number };
      const swingObstacles: PillRect[] = [];
      for (const o of curOverlays) {
        if (o.kind !== 'swing-marker') continue;
        const idx = timeScale.timeToIndex(o.timestamp as Time, true);
        if (idx === null) continue;
        const xc = timeScale.logicalToCoordinate(idx as unknown as Logical);
        if (xc === null) continue;
        const yc = mainSeries.priceToCoordinate(o.price);
        if (yc === null) continue;
        const cx = xc as number;
        const cy = yc as number;
        // SH label is above the candle high; SL label is below the candle low.
        const LABEL_W = 22; const LABEL_H = 14;
        if (o.direction === 'high') {
          swingObstacles.push({ left: cx - LABEL_W / 2, top: cy - LABEL_H, right: cx + LABEL_W / 2, bottom: cy });
        } else {
          swingObstacles.push({ left: cx - LABEL_W / 2, top: cy, right: cx + LABEL_W / 2, bottom: cy + LABEL_H });
        }
      }

      // Collect event-marker overlays in screen-x order
      const raw: Array<{
        x: number; ts: number; label: string; impact: 'high' | 'medium';
        event: CalendarEvent; windowEndX: number | null;
        moveData?: { direction: 'up' | 'down'; pips: number; minutes: number };
        yEventHigh: number; yEventLow: number;
      }> = [];

      for (const o of (overlaysRef.current ?? [])) {
        if (o.kind !== 'event-marker') continue;
        const idx = timeScale.timeToIndex(o.timestamp as Time, true);
        if (idx === null) continue;
        const xc = timeScale.logicalToCoordinate(idx as unknown as Logical);
        if (xc === null) continue;
        const xNum = xc as number;
        if (xNum < 0 || xNum > plotWidth) continue;
        const barIdx = idx as unknown as number;
        const bar = rawBars[barIdx] ?? rawBars[rawBars.length - 1];
        if (!bar) continue;
        const yH = mainSeries.priceToCoordinate(bar.high);
        const yL = mainSeries.priceToCoordinate(bar.low);
        if (yH === null || yL === null) continue;
        const endIdx  = timeScale.timeToIndex((o.timestamp + 15 * 60) as Time, true);
        const weCoord = endIdx !== null ? timeScale.logicalToCoordinate(endIdx as unknown as Logical) : null;
        raw.push({
          x: xNum, ts: o.timestamp, label: o.label, impact: o.impact, event: o.event,
          windowEndX: weCoord !== null ? (weCoord as number) : null,
          moveData: o.moveData,
          yEventHigh: yH as number, yEventLow: yL as number,
        });
      }

      raw.sort((a, b) => a.x - b.x);

      // Track placed pill rects for inter-pill collision detection
      const placed: PillRect[] = [];
      const collides = (l: number, t: number, r: number, b: number): boolean => {
        for (const p of placed) {
          if (r + INTER_PILL > p.left && l - INTER_PILL < p.right &&
              b + INTER_PILL > p.top  && t - INTER_PILL < p.bottom) return true;
        }
        for (const s of swingObstacles) {
          if (r + INTER_PILL > s.left && l - INTER_PILL < s.right &&
              b + INTER_PILL > s.top  && t - INTER_PILL < s.bottom) return true;
        }
        return false;
      };

      const pills: NewsPill[] = [];

      for (const p of raw) {
        if (p.label === '') {
          pills.push({ x: p.x, clampedX: p.x, level: -1, above: true,
            yCandle: p.yEventHigh, stemLength: 0, ts: p.ts, label: '',
            impact: p.impact, event: p.event, windowEndX: p.windowEndX, moveData: p.moveData });
          continue;
        }

        const pillWidth = Math.round(p.label.length * 6.2 + 28);
        const pillLeft  = Math.max(EDGE_GAP, Math.min(p.x - pillWidth / 2, plotWidth - pillWidth - RIGHT_KEEP_OUT));
        const pillRight = pillLeft + pillWidth;

        const { minYTop, maxYBot } = spanStats(pillLeft, pillWidth);
        const effMinYTop = minYTop === Infinity  ? p.yEventHigh : minYTop;
        const effMaxYBot = maxYBot === -Infinity ? p.yEventLow  : maxYBot;

        type Cand = { above: boolean; level: number; top: number; bottom: number; stemLen: number; yCandle: number };
        const candidates: Cand[] = [];

        // Above levels 0–2: pill bottom clears tallest wick in span by PILL_GAP
        const aboveBase = effMinYTop - PILL_GAP;
        for (let lv = 0; lv < 3; lv++) {
          const bottom = aboveBase - lv * LEVEL_STEP;
          const top    = bottom - PILL_H;
          candidates.push({ above: true,  level: lv, top, bottom,
            stemLen: p.yEventHigh - bottom, yCandle: p.yEventHigh });
        }
        // Below levels 0–2: pill top clears lowest wick in span by PILL_GAP
        const belowBase = effMaxYBot + PILL_GAP;
        for (let lv = 0; lv < 3; lv++) {
          const top    = belowBase + lv * LEVEL_STEP;
          const bottom = top + PILL_H;
          candidates.push({ above: false, level: lv, top, bottom,
            stemLen: top - p.yEventLow, yCandle: p.yEventLow });
        }

        let chosen: Cand | null = null;
        for (const c of candidates) {
          if (c.top < TOP_BOUND || c.bottom > plotHeight) continue;
          if (collides(pillLeft, c.top, pillRight, c.bottom)) continue;
          chosen = c;
          break;
        }

        if (!chosen) {
          pills.push({ x: p.x, clampedX: p.x, level: -1, above: true,
            yCandle: p.yEventHigh, stemLength: 0, ts: p.ts, label: p.label,
            impact: p.impact, event: p.event, windowEndX: p.windowEndX, moveData: p.moveData });
          continue;
        }

        placed.push({ left: pillLeft, top: chosen.top, right: pillRight, bottom: chosen.bottom });
        pills.push({ x: p.x, clampedX: pillLeft, level: chosen.level, above: chosen.above,
          yCandle: chosen.yCandle, stemLength: Math.max(0, chosen.stemLen),
          ts: p.ts, label: p.label, impact: p.impact, event: p.event,
          windowEndX: p.windowEndX, moveData: p.moveData });
      }

      // Skip state update when pill geometry is identical (avoids re-renders during RAF loop)
      const key = pills.map((p) =>
        `${p.ts}:${Math.round(p.clampedX)}:${Math.round(p.yCandle)}:${p.level}:${p.above ? 1 : 0}`
      ).join('|');
      if (key !== prevPillsKeyRef.current) {
        prevPillsKeyRef.current = key;
        setNewsPills(pills);
      }
    }, []); // stable — only reads refs

    // Session hairlines: x-coordinate for each session-line descriptor.
    // Not affected by vertical rescale, so not included in the RAF loop.
    const computeSessionLines = useCallback(() => {
      const chart     = chartRef.current;
      const timeScale = chart?.timeScale();
      if (!timeScale || !chart || !containerRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const scaleWidth     = chart.priceScale('right').width();
      const plotWidth      = containerWidth - scaleWidth;

      const lines: SessionLine[] = [];
      for (const o of (overlaysRef.current ?? [])) {
        if (o.kind !== 'session-line') continue;
        const idx = timeScale.timeToIndex(o.timestamp as Time, true);
        if (idx === null) continue;
        const xc = timeScale.logicalToCoordinate(idx as unknown as Logical);
        if (xc === null) continue;
        const x = xc as number;
        if (x < 0 || x > plotWidth) continue;
        const sessionOverride = chartSettingsRef.current.sessionColor;
        lines.push({ x, label: o.label, color: sessionOverride ?? o.color });
      }

      const key = lines.map((l) => `${Math.round(l.x)}:${l.label}`).join('|');
      if (key !== prevSessionLinesKeyRef.current) {
        prevSessionLinesKeyRef.current = key;
        setSessionLines(lines);
      }
    }, []); // stable — only reads refs

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

    useEffect(() => {
      const chart = chartRef.current;
      if (!chart) return;
      const s   = chartSettings ?? DEFAULT_SETTINGS;
      const bg  = resolveChartBackground(s, appTheme);
      const dark = isDarkHex(bg);
      const c   = deriveChartColors(dark);
      const gridColor      = s.gridColor      ?? c.gridColor;
      const crosshairColor = s.crosshairColor ?? c.crosshairColor;

      chart.applyOptions({
        layout: {
          background: { color: bg },
          textColor: c.textColor,
        },
        grid: {
          vertLines: { color: s.gridVertical ? gridColor : 'transparent' },
          horzLines: { color: s.gridHorizontal ? gridColor : 'transparent' },
        },
        crosshair: {
          vertLine: {
            color: crosshairColor,
            style: toCrosshairLineStyle(s.crosshairStyle),
            labelBackgroundColor: c.labelBgColor,
          },
          horzLine: {
            color: crosshairColor,
            style: toCrosshairLineStyle(s.crosshairStyle),
            labelBackgroundColor: c.labelBgColor,
          },
        },
        rightPriceScale: { borderColor: c.axisBorderColor, mode: toPsMode(s.priceScaleMode) },
        timeScale: { borderColor: c.axisBorderColor },
      });
      computeNewsPills();

      const series = mainSeriesRef.current;
      const kind   = seriesKindRef.current;
      if (!series) return;
      if (kind === 'bars') {
        (series as ISeriesApi<'Bar'>).applyOptions({
          upColor: s.upColor,
          downColor: s.downColor,
        });
      } else if (kind === 'candlestick' || kind === 'heikin-ashi') {
        (series as ISeriesApi<'Candlestick'>).applyOptions({
          upColor: s.upColor,
          downColor: s.downColor,
          borderUpColor: s.upColor,
          borderDownColor: s.downColor,
          wickUpColor: s.upColor,
          wickDownColor: s.downColor,
        });
      } else if (kind === 'hollow') {
        (series as ISeriesApi<'Candlestick'>).applyOptions({
          upColor: 'transparent',
          downColor: s.downColor,
          borderUpColor: s.upColor,
          borderDownColor: s.downColor,
          wickUpColor: s.upColor,
          wickDownColor: s.downColor,
        });
      }
    }, [chartSettings, appTheme, computeNewsPills]);

    // ── Init chart (once) ──────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return;
      const initS = chartSettingsRef.current;
      const initBg            = resolveChartBackground(initS, appThemeRef.current);
      const initDark          = isDarkHex(initBg);
      const initC             = deriveChartColors(initDark);
      const initGridColor     = initS.gridColor     ?? initC.gridColor;
      const initCrosshairColor = initS.crosshairColor ?? initC.crosshairColor;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { color: initBg },
          textColor: initC.textColor,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: initS.gridVertical ? initGridColor : 'transparent' },
          horzLines: { color: initS.gridHorizontal ? initGridColor : 'transparent' },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: initCrosshairColor,
            width: 1,
            style: toCrosshairLineStyle(initS.crosshairStyle),
            labelBackgroundColor: initC.labelBgColor,
          },
          horzLine: {
            color: initCrosshairColor,
            width: 1,
            style: toCrosshairLineStyle(initS.crosshairStyle),
            labelBackgroundColor: initC.labelBgColor,
          },
        },
        rightPriceScale: {
          borderColor: initC.axisBorderColor,
          scaleMargins: { top: 0.08, bottom: 0.08 },
          mode: toPsMode(initS.priceScaleMode),
        },
        timeScale: {
          borderColor: initC.axisBorderColor,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 8,
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

      // ── Vertical-axis rescale: LWC has no price-scale-change subscription,
      // so we run a RAF loop while the pointer is held or wheel is active.
      let vRafId: number | null = null;
      let vStopTimer: ReturnType<typeof setTimeout> | null = null;
      const stopVLoop = () => { if (vRafId !== null) { cancelAnimationFrame(vRafId); vRafId = null; } };
      const scheduleVStop = () => {
        if (vStopTimer) clearTimeout(vStopTimer);
        vStopTimer = setTimeout(() => { stopVLoop(); vStopTimer = null; }, 300);
      };
      const startVLoop = () => {
        stopVLoop();
        if (vStopTimer) { clearTimeout(vStopTimer); vStopTimer = null; }
        const tick = () => { computeNewsPills(); vRafId = requestAnimationFrame(tick); };
        vRafId = requestAnimationFrame(tick);
      };
      const onVDown  = () => startVLoop();
      const onVUp    = () => { stopVLoop(); scheduleVStop(); computeNewsPills(); };
      const onVWheel = () => { computeNewsPills(); startVLoop(); scheduleVStop(); };
      const chartEl = containerRef.current!;
      chartEl.addEventListener('pointerdown', onVDown);
      window.addEventListener('pointerup', onVUp);
      chartEl.addEventListener('wheel', onVWheel, { passive: true });

      let rafId: number | null = null;
      const handleResize = () => {
        if (!containerRef.current || !chartRef.current) return;
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        computeNewsPills();
      };
      const resizeObserver = new ResizeObserver(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => { rafId = null; handleResize(); });
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);
      handleResize();

      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        if (crosshairHandlerRef.current) {
          try {
            chart.unsubscribeCrosshairMove(crosshairHandlerRef.current);
          } catch {
            /* chart already gone */
          }
          crosshairHandlerRef.current = null;
        }
        chartEl.removeEventListener('pointerdown', onVDown);
        window.removeEventListener('pointerup', onVUp);
        chartEl.removeEventListener('wheel', onVWheel);
        stopVLoop();
        if (vStopTimer) clearTimeout(vStopTimer);
        if (mainSeriesRef.current && swingSegPrimRef.current) {
          try { mainSeriesRef.current.detachPrimitive(swingSegPrimRef.current); } catch { /* noop */ }
        }
        chart.remove();
        chartRef.current = null;
        mainSeriesRef.current = null;
        maSeriesRef.current = null;
        priceLinesRef.current = [];
        highlightSeriesRef.current = [];
      };
    }, [computeNewsPills]);

    // ── STRUCTURAL effect ──────────────────────────────────────
    // Rebuilds series + MA + crosshair on bar/style/indicator/pair/interval change.
    // Does NOT depend on liveBar — a live tick never resets zoom.
    useEffect(() => {
      const chart = chartRef.current;
      if (!chart || !bars.length) return;

      if (mainSeriesRef.current) {
        if (swingSegPrimRef.current) {
          try { mainSeriesRef.current.detachPrimitive(swingSegPrimRef.current); } catch { /* noop */ }
        }
        chart.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
        // The dead series owns its price lines and markers plugin; reset refs so
        // the overlay effect never tries to operate on objects from the old series.
        priceLinesRef.current = [];
        if (markersPluginRef.current) {
          try { markersPluginRef.current.detach(); } catch { /* noop */ }
          markersPluginRef.current = null;
        }
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
          upColor: chartSettingsRef.current.upColor,
          downColor: chartSettingsRef.current.downColor,
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
        const cs = chartSettingsRef.current;
        const series = chart.addSeries(CandlestickSeries, {
          upColor: isHollow ? 'transparent' : cs.upColor,
          downColor: cs.downColor,
          borderUpColor: cs.upColor,
          borderDownColor: cs.downColor,
          wickUpColor: cs.upColor,
          wickDownColor: cs.downColor,
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

      // Set price-axis decimal precision for the instrument
      const precision = pricePrecision(pair);
      mainSeriesRef.current?.applyOptions({
        priceFormat: { type: 'price', precision, minMove: 1 / 10 ** precision },
      });

      if (mainSeriesRef.current && swingSegPrimRef.current) {
        mainSeriesRef.current.attachPrimitive(swingSegPrimRef.current);
      }

      chart.timeScale().fitContent();
      setSeriesGen((g) => g + 1);
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
    // News events are NOT rendered as LWC markers here — they appear as
    // HTML pill callouts computed by computeNewsPills below.
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

      // Swing segment primitive must be cleared even when overlay list is empty.
      if (swingSegPrimRef.current) {
        const cs = chartSettingsRef.current;
        const segs = (overlays ?? [])
          .filter((o): o is Extract<OverlayDescriptor, { kind: 'swing-segment' }> => o.kind === 'swing-segment')
          .map((o) => ({ barIndex: o.barIndex, price: o.price, direction: o.direction, opacity: o.opacity }));
        swingSegPrimRef.current.update(
          segs,
          Math.max(0, barsRef.current.length - 1),
          cs.swingHighColor,
          cs.swingLowColor,
        );
      }

      if (!overlays || overlays.length === 0) return;

      const cs = chartSettingsRef.current;
      const markers: SeriesMarker<Time>[] = [];

      for (const o of overlays) {
        if (o.kind === 'price-line') {
          const lineColor = cs.levelColor ?? o.color;
          const line = main.createPriceLine({
            price: o.price,
            color: lineColor,
            lineStyle: o.dotted ? LineStyle.Dotted : o.dash ? LineStyle.Dashed : LineStyle.Solid,
            lineWidth: 1,
            axisLabelVisible: o.axisLabelVisible ?? true,
            title: o.label,
          });
          priceLinesRef.current.push(line);
        } else if (o.kind === 'highlight-band') {
          priceLinesRef.current.push(
            main.createPriceLine({ price: o.to,   color: o.color, lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: o.label ?? '' }),
            main.createPriceLine({ price: o.from, color: o.color, lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: '' }),
          );
        } else if (o.kind === 'swing-marker') {
          // 'session-line' descriptors are rendered as HTML hairlines by computeSessionLines
          const opacity = o.opacity ?? 1.0;
          const swingColor = o.direction === 'high' ? cs.swingHighColor : cs.swingLowColor;
          // On light charts darken the colour ~27% toward black so faded older swings remain legible.
          const effectiveColor = isDarkChart ? swingColor : darkenHex(swingColor, 0.27);
          const effectiveOpacity = isDarkChart ? opacity : Math.max(0.70, opacity);
          markers.push({
            time: o.timestamp as Time,
            position: o.direction === 'high' ? 'aboveBar' : 'belowBar',
            shape: 'circle',
            color: hexWithOpacity(effectiveColor, effectiveOpacity),
            size: 0,
            text: o.direction === 'high' ? 'SH' : 'SL',
          });
        }
      }

      if (markers.length > 0) {
        // LWC requires markers sorted by time
        markers.sort((a, b) => (a.time as number) - (b.time as number));
        markersPluginRef.current = createSeriesMarkers(main as ISeriesApi<'Candlestick'>, markers);
      }
    }, [overlays, displayInterval, seriesGen, chartSettings, isDarkChart]);

    // ── News pill + session line position effects ───────────────
    // Subscribe to pan/zoom so pills and session hairlines track the chart.
    useEffect(() => {
      const chart = chartRef.current;
      if (!chart) return;
      computeNewsPills();
      computeSessionLines();
      chart.timeScale().subscribeVisibleLogicalRangeChange(computeNewsPills);
      chart.timeScale().subscribeVisibleLogicalRangeChange(computeSessionLines);
      return () => {
        try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(computeNewsPills); } catch { /* noop */ }
        try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(computeSessionLines); } catch { /* noop */ }
      };
    }, [seriesGen, computeNewsPills, computeSessionLines]);

    // Recompute positions when the overlay set itself changes.
    useEffect(() => {
      computeNewsPills();
      computeSessionLines();
    }, [overlays, seriesGen, computeNewsPills, computeSessionLines]);

    // Re-run session lines when sessionColor changes (overlays themselves didn't change).
    useEffect(() => {
      computeSessionLines();
    }, [chartSettings?.sessionColor, computeSessionLines]);

    return (
      <div className="relative w-full h-full">
        {/* OHLC hover tooltip */}
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

        {/* LWC chart canvas — background is owned by LWC via layout.background.color */}
        <div ref={containerRef} className="absolute inset-0" />

        {/* ── Session open hairlines ─────────────────────────────
            Thin dashed verticals + 14-px top-strip label per session open.
            Non-interactive; rendered below the news layer (z-[2]). */}
        {sessionLines.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
            {sessionLines.map((line) => (
              <div
                key={`sess-${Math.round(line.x)}-${line.label}`}
                className="absolute inset-y-0 pointer-events-none"
                style={{ left: line.x }}
              >
                <div
                  className="absolute inset-y-0 pointer-events-none"
                  style={{ width: 0, borderLeft: `1px dashed ${line.color}`, opacity: isDarkChart ? 0.2 : 0.4 }}
                />
                <div
                  className="absolute pointer-events-none text-[9px] leading-[12px] whitespace-nowrap select-none"
                  style={{
                    top: 2,
                    left: 3,
                    color: isDarkChart ? line.color : 'hsl(0, 0%, 20%)',
                    opacity: isDarkChart ? 0.55 : 0.70,
                  }}
                >
                  {line.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── News callout layer ──────────────────────────────────
            Pills are anchored to the candle they belong to via
            priceToCoordinate. A short stem + dot connects each pill
            to the candle high (or low when near the chart top).
            Shade window covers event time to +15 min. */}
        {newsPills.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-[3]">
            {/* Layer 1: shade windows */}
            {newsPills.map((pill) => {
              const pillCustom = chartSettings?.newsPillColor ?? null;
              const shadeColor = pillCustom
                ? hexWithOpacity(pillCustom, 0.04)
                : (pill.impact === 'high' ? 'hsla(0, 84%, 60%, 0.04)' : 'hsla(45, 90%, 60%, 0.04)');
              return pill.windowEndX !== null && pill.windowEndX > pill.x ? (
                <div
                  key={`shade-${pill.ts}`}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: pill.x, width: pill.windowEndX - pill.x, background: shadeColor }}
                />
              ) : null;
            })}

            {/* Layer 2: stems — vertical line from candle anchor to pill */}
            {newsPills.map((pill) => {
              if (pill.level < 0) return null;
              const isHovered = hoveredTs === pill.ts;
              const pillCustom = chartSettings?.newsPillColor ?? null;
              const color = pillCustom
                ? hexWithOpacity(pillCustom, isHovered ? 0.7 : 0.4)
                : (pill.impact === 'high'
                    ? `hsla(0, 84%, 60%, ${isHovered ? 0.7 : 0.4})`
                    : `hsla(45, 90%, 60%, ${isHovered ? 0.7 : 0.4})`);
              const stemTop = pill.above ? pill.yCandle - pill.stemLength : pill.yCandle;
              return (
                <div
                  key={`stem-${pill.ts}`}
                  className="absolute pointer-events-none"
                  style={{ left: pill.x - 0.5, top: stemTop, width: 1, height: pill.stemLength, background: color }}
                />
              );
            })}

            {/* Layer 3: anchor dots at candle high or low */}
            {newsPills.map((pill) => {
              if (pill.level < 0) return null;
              const isHovered = hoveredTs === pill.ts;
              const pillCustom = chartSettings?.newsPillColor ?? null;
              const color = pillCustom
                ? hexWithOpacity(pillCustom, isHovered ? 1 : 0.7)
                : (pill.impact === 'high'
                    ? `hsla(0, 84%, 60%, ${isHovered ? 1 : 0.7})`
                    : `hsla(45, 90%, 60%, ${isHovered ? 1 : 0.7})`);
              return (
                <div
                  key={`anchorDot-${pill.ts}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: pill.x - 2,
                    top: pill.yCandle - 2,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: color,
                  }}
                />
              );
            })}

            {/* Layer 4: pills or dot fallback buttons */}
            {newsPills.map((pill) => {
              const pillCustom = chartSettings?.newsPillColor ?? null;
              // Base accent colour: custom override or impact-based defaults
              const rawHigh = pillCustom ?? 'hsl(0, 84%, 60%)';
              const rawMed  = pillCustom ?? 'hsl(45, 90%, 60%)';
              const rawColor = pill.impact === 'high' ? rawHigh : rawMed;
              // Build colour variants — handle both hex and HSL strings
              const impactColor = rawColor;
              const impactFill  = pillCustom
                ? hexWithOpacity(pillCustom, 0.12)
                : (pill.impact === 'high' ? 'hsla(0, 84%, 60%, 0.12)' : 'hsla(45, 90%, 60%, 0.12)');
              const impactBorder = pillCustom
                ? hexWithOpacity(pillCustom, 0.4)
                : (pill.impact === 'high' ? 'hsla(0, 84%, 60%, 0.4)' : 'hsla(45, 90%, 60%, 0.4)');
              // Text colour: for defaults adapt to chart luminance; for custom use as-is
              const impactText = pillCustom
                ? pillCustom
                : pill.impact === 'high'
                  ? (isDarkChart ? 'hsl(0, 84%, 80%)' : 'hsl(0, 84%, 35%)')
                  : (isDarkChart ? 'hsl(45, 90%, 75%)' : 'hsl(45, 90%, 30%)');
              const ariaLabel    = `${pill.impact === 'high' ? 'High' : 'Medium'} impact: ${pill.event.event}`;
              const handleActivate = () => onEventMarkerClickRef.current?.(pill.event);
              const isHovered = hoveredTs === pill.ts;

              // Dot fallback — empty label or all 3 levels full
              if (pill.level === -1) {
                return (
                  <button
                    key={`dot-btn-${pill.ts}`}
                    type="button"
                    className="absolute pointer-events-auto flex items-center justify-center"
                    style={{ left: pill.x - 10, top: pill.yCandle - 10, width: 20, height: 20 }}
                    onClick={handleActivate}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } }}
                    aria-label={ariaLabel}
                    tabIndex={0}
                    title={pill.event.event}
                  >
                    <span
                      aria-hidden
                      style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: impactColor }}
                    />
                  </button>
                );
              }

              const pillTop = pill.above
                ? pill.yCandle - pill.stemLength
                : pill.yCandle + pill.stemLength;

              return (
                <button
                  key={`pill-${pill.ts}`}
                  type="button"
                  className="absolute pointer-events-auto flex items-center gap-1 px-1.5 py-0.5 rounded-full whitespace-nowrap select-none transition-opacity"
                  style={{
                    left: pill.clampedX,
                    top: pillTop,
                    transform: pill.above ? 'translateY(-100%)' : undefined,
                    fontSize: 11,
                    lineHeight: 1,
                    opacity: isHovered ? 1 : 0.9,
                    color: impactText,
                    background: impactFill,
                    border: `1px solid ${isHovered ? impactColor : impactBorder}`,
                    backdropFilter: 'blur(4px)',
                  }}
                  onMouseEnter={() => setHoveredTs(pill.ts)}
                  onMouseLeave={() => setHoveredTs(null)}
                  onClick={handleActivate}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); } }}
                  aria-label={ariaLabel}
                  tabIndex={0}
                  title={pill.event.event}
                >
                  <span aria-hidden style={{ display: 'block', width: 5, height: 5, borderRadius: '50%', background: impactColor, flexShrink: 0 }} />
                  {pill.label}
                  {pill.moveData && (
                    <span style={{ marginLeft: 4, color: isDarkChart ? 'hsl(215, 20%, 55%)' : 'hsl(215, 10%, 40%)' }}>
                      {pill.moveData.direction === 'up' ? '▲' : '▼'}{' '}
                      {pill.moveData.pips}p · {pill.moveData.minutes}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);
