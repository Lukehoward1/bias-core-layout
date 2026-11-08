// src/components/CandlestickChart.tsx
// ─────────────────────────────────────────────────────────────
// Thin stateful wrapper over ChartEngine. Owns: chart style,
// crosshair toggle, OHLC hover toggle, active indicator list,
// fullscreen state, toolbars, and the live-candle hook.
//
// Same external props + ref API (CandlestickChartRef) as before,
// so AssetDetail compiles untouched.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { OhlcDataPoint, formatPrice, formatTime } from '@/lib/mockOhlcData';
import { ChartToolbar } from './ChartToolbar';
import { ChartVerticalToolbar } from './ChartVerticalToolbar';
import { ChartStyle } from './chart/ChartStyleSelector';
import { SavedBacktest } from './chart/SavedBacktestsDropdown';
import { Button } from '@/components/ui/button';
import { Maximize2, Minimize2 } from 'lucide-react';

import { ChartEngine, type ChartEngineRef } from './chart/ChartEngine';
import { useLiveCandle } from '@/hooks/use-live-candle';

interface CandlestickChartProps {
  data: OhlcDataPoint[];
  pair: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  savedBacktests?: SavedBacktest[];
  onSaveBacktest?: () => void;
  onLoadBacktest?: (id: string) => void;
  onCompareBacktests?: (ids: string[]) => void;
}

export interface CandlestickChartRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  toggleFullscreen: () => void;
}

export const CandlestickChart = forwardRef<CandlestickChartRef, CandlestickChartProps>(
  ({ data, pair, timeframe, onTimeframeChange, savedBacktests, onSaveBacktest, onLoadBacktest, onCompareBacktests }, ref) => {
    const chartWrapperRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<ChartEngineRef>(null);

    const [crosshairEnabled, setCrosshairEnabled] = useState(true);
    const [ohlcEnabled, setOhlcEnabled] = useState(false);
    const [chartStyle, setChartStyle] = useState<ChartStyle>('candlestick');
    const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Live candle: pair wrapper owns the symbol; pass canonical through.
    const lastBar = data.length > 0 ? data[data.length - 1] : null;
    const liveBar = useLiveCandle({ symbol: pair.toUpperCase(), timeframe, lastBar });

    const handleToggleIndicator = useCallback((id: string) => {
      setActiveIndicators((prev) =>
        prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
      );
    }, []);

    const handleRemoveIndicator = useCallback((id: string) => {
      setActiveIndicators((prev) => prev.filter((i) => i !== id));
    }, []);

    const handleZoomIn = useCallback(() => engineRef.current?.zoomIn(), []);
    const handleZoomOut = useCallback(() => engineRef.current?.zoomOut(), []);
    const handleReset = useCallback(() => engineRef.current?.resetView(), []);
    const handleToggleFullscreen = useCallback(() => setIsFullscreen((p) => !p), []);

    // ESC exits fullscreen
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [isFullscreen]);

    useImperativeHandle(ref, () => ({
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetView: handleReset,
      toggleFullscreen: handleToggleFullscreen,
    }));

    const handleCrosshairToggle = useCallback((enabled: boolean) => {
      setCrosshairEnabled(enabled);
    }, []);

    const TOOLBAR_WIDTH = 40;
    const TOOLBAR_HEIGHT = 44;

    const engineProps = useMemo(
      () => ({
        bars: data,
        liveBar,
        chartStyle,
        displayInterval: timeframe,
        pair,
        ohlcEnabled,
        crosshairEnabled,
        activeIndicators,
        formatPrice,
        formatTime,
      }),
      [data, liveBar, chartStyle, timeframe, pair, ohlcEnabled, crosshairEnabled, activeIndicators],
    );

    return (
      <div
        ref={chartWrapperRef}
        className={`relative w-full h-full ${
          isFullscreen ? 'fixed inset-0 z-[100] bg-[hsl(222,30%,6%)]' : ''
        }`}
      >
        {/* Chart Toolbar - top bar */}
        <div
          className="absolute top-0 left-0 z-30"
          style={{ right: TOOLBAR_WIDTH, height: TOOLBAR_HEIGHT }}
        >
          <ChartToolbar
            pair={pair}
            timeframe={timeframe}
            onTimeframeChange={onTimeframeChange}
            crosshairEnabled={crosshairEnabled}
            onCrosshairToggle={handleCrosshairToggle}
            ohlcEnabled={ohlcEnabled}
            onOhlcToggle={setOhlcEnabled}
            chartStyle={chartStyle}
            onChartStyleChange={setChartStyle}
            activeIndicators={activeIndicators}
            onToggleIndicator={handleToggleIndicator}
            onRemoveIndicator={handleRemoveIndicator}
            savedBacktests={savedBacktests}
            onSaveBacktest={onSaveBacktest}
            onLoadBacktest={onLoadBacktest}
            onCompareBacktests={onCompareBacktests}
          />
        </div>

        {/* Right-side Vertical Tools Panel */}
        <div
          className="absolute top-0 right-0 bottom-0 z-30"
          style={{ width: TOOLBAR_WIDTH }}
        >
          <div
            className="flex items-center justify-center border-b border-border/50 bg-background/95"
            style={{ height: TOOLBAR_HEIGHT }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
          <div
            className="absolute right-0 left-0"
            style={{ top: TOOLBAR_HEIGHT, bottom: 0 }}
          >
            <ChartVerticalToolbar onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />
          </div>
        </div>

        {/* Chart engine (chart container + crosshair tooltip) */}
        <div
          className="absolute left-0 bottom-0"
          style={{ top: TOOLBAR_HEIGHT, right: TOOLBAR_WIDTH }}
        >
          <ChartEngine ref={engineRef} {...engineProps} />
        </div>

        {/* Live Data Label */}
        <div className="absolute bottom-2 left-2 z-20">
          <span className="text-[10px] text-muted-foreground/70 bg-background/50 backdrop-blur-sm border border-border/40 px-1.5 py-0.5 rounded">
            Live Data
          </span>
        </div>

        {/* Fullscreen exit hint */}
        {isFullscreen && (
          <div className="absolute bottom-2 z-20" style={{ right: TOOLBAR_WIDTH + 8 }}>
            <span className="text-[10px] text-muted-foreground/40 bg-background/40 backdrop-blur-sm px-1.5 py-0.5 rounded">
              Press ESC to exit
            </span>
          </div>
        )}
      </div>
    );
  },
);
