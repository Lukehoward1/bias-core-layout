import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, CandlestickSeries, LineSeries, CrosshairMode } from 'lightweight-charts';
import { OhlcDataPoint, formatPrice, formatTime } from '@/lib/mockOhlcData';
import { ChartToolbar } from './ChartToolbar';
import { ChartVerticalToolbar } from './ChartVerticalToolbar';

interface CandlestickChartProps {
  data: OhlcDataPoint[];
  pair: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
}

export interface CandlestickChartRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

export const CandlestickChart = forwardRef<CandlestickChartRef, CandlestickChartProps>(
  ({ data, pair, timeframe, onTimeframeChange }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
    const [crosshairEnabled, setCrosshairEnabled] = useState(true);
    const [ohlcEnabled, setOhlcEnabled] = useState(false);
    const [tooltipData, setTooltipData] = useState<{
      visible: boolean;
      x: number;
      y: number;
      time: string;
      open: string;
      high: string;
      low: string;
      close: string;
      isUp: boolean;
    } | null>(null);

    // Zoom controls
    const handleZoomIn = useCallback(() => {
      if (!chartRef.current) return;
      const timeScale = chartRef.current.timeScale();
      const currentRange = timeScale.getVisibleLogicalRange();
      if (currentRange) {
        const newRange = {
          from: currentRange.from + (currentRange.to - currentRange.from) * 0.2,
          to: currentRange.to - (currentRange.to - currentRange.from) * 0.2,
        };
        timeScale.setVisibleLogicalRange(newRange);
      }
    }, []);

    const handleZoomOut = useCallback(() => {
      if (!chartRef.current) return;
      const timeScale = chartRef.current.timeScale();
      const currentRange = timeScale.getVisibleLogicalRange();
      if (currentRange) {
        const newRange = {
          from: currentRange.from - (currentRange.to - currentRange.from) * 0.25,
          to: currentRange.to + (currentRange.to - currentRange.from) * 0.25,
        };
        timeScale.setVisibleLogicalRange(newRange);
      }
    }, []);

    const handleReset = useCallback(() => {
      if (!chartRef.current) return;
      chartRef.current.timeScale().fitContent();
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      zoomIn: handleZoomIn,
      zoomOut: handleZoomOut,
      resetView: handleReset,
    }));

    // Toggle crosshair mode
    const handleCrosshairToggle = useCallback((enabled: boolean) => {
      setCrosshairEnabled(enabled);
      if (chartRef.current) {
        chartRef.current.applyOptions({
          crosshair: {
            mode: enabled ? CrosshairMode.Normal : CrosshairMode.Hidden,
          },
        });
      }
    }, []);

    // Initialize chart
    useEffect(() => {
      if (!chartContainerRef.current) return;

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: 'transparent' },
          textColor: 'hsl(215, 20%, 55%)',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: 'hsl(217, 19%, 18%)' },
          horzLines: { color: 'hsl(217, 19%, 18%)' },
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
          borderColor: 'hsl(217, 19%, 22%)',
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          borderColor: 'hsl(217, 19%, 22%)',
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

      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: 'hsl(142, 71%, 45%)',
        downColor: 'hsl(0, 84%, 60%)',
        borderUpColor: 'hsl(142, 71%, 45%)',
        borderDownColor: 'hsl(0, 84%, 60%)',
        wickUpColor: 'hsl(142, 71%, 45%)',
        wickDownColor: 'hsl(0, 84%, 60%)',
      });

      // Add MA line series (visual only)
      const maSeries = chart.addSeries(LineSeries, {
        color: 'hsl(200, 80%, 60%)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      chartRef.current = chart;
      seriesRef.current = candlestickSeries;
      maSeriesRef.current = maSeries;

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

      // Crosshair move handler for tooltip
      chart.subscribeCrosshairMove((param) => {
        if (!param.point || !param.time || !param.seriesData.size) {
          setTooltipData(null);
          return;
        }

        const candleData = param.seriesData.get(candlestickSeries) as CandlestickData;
        if (!candleData) {
          setTooltipData(null);
          return;
        }

        const isUp = candleData.close >= candleData.open;

        setTooltipData({
          visible: true,
          x: param.point.x,
          y: param.point.y,
          time: formatTime(param.time as number, timeframe),
          open: formatPrice(candleData.open, pair),
          high: formatPrice(candleData.high, pair),
          low: formatPrice(candleData.low, pair),
          close: formatPrice(candleData.close, pair),
          isUp,
        });
      });

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
        maSeriesRef.current = null;
      };
    }, []);

    // Update data when it changes
    useEffect(() => {
      if (!seriesRef.current || !maSeriesRef.current || !data.length) return;

      const chartData: CandlestickData[] = data.map((d) => ({
        time: d.timestamp as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

      seriesRef.current.setData(chartData);

      // Calculate simple MA (20-period)
      const maPeriod = 20;
      const maData = data.map((d, i) => {
        if (i < maPeriod - 1) return null;
        const slice = data.slice(i - maPeriod + 1, i + 1);
        const avg = slice.reduce((sum, c) => sum + c.close, 0) / maPeriod;
        return { time: d.timestamp as Time, value: avg };
      }).filter(Boolean) as { time: Time; value: number }[];

      maSeriesRef.current.setData(maData);
      chartRef.current?.timeScale().fitContent();
    }, [data]);

    return (
      <div className="relative w-full h-full">
        {/* Chart Toolbar */}
        <ChartToolbar
          pair={pair}
          timeframe={timeframe}
          onTimeframeChange={onTimeframeChange}
          crosshairEnabled={crosshairEnabled}
          onCrosshairToggle={handleCrosshairToggle}
          ohlcEnabled={ohlcEnabled}
          onOhlcToggle={setOhlcEnabled}
        />

        {/* Right-side Vertical Tools Panel */}
        <ChartVerticalToolbar
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
        />

        {/* Tooltip - only shown when ohlcEnabled */}
        {ohlcEnabled && tooltipData && tooltipData.visible && (
          <div
            className="absolute z-20 pointer-events-none bg-card/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg text-sm"
            style={{
              left: Math.min(tooltipData.x + 12, (chartContainerRef.current?.clientWidth || 0) - 150),
              top: Math.max(tooltipData.y - 80, 50),
            }}
          >
            <div className="text-muted-foreground text-xs mb-1">{tooltipData.time}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-muted-foreground">Open:</span>
              <span className="text-foreground font-medium">{tooltipData.open}</span>
              <span className="text-muted-foreground">High:</span>
              <span className="text-foreground font-medium">{tooltipData.high}</span>
              <span className="text-muted-foreground">Low:</span>
              <span className="text-foreground font-medium">{tooltipData.low}</span>
              <span className="text-muted-foreground">Close:</span>
              <span className={`font-medium ${tooltipData.isUp ? 'text-success' : 'text-destructive'}`}>
                {tooltipData.close}
              </span>
            </div>
          </div>
        )}

        {/* Chart Container */}
        <div ref={chartContainerRef} className="w-full h-full pt-11 pr-12" />

        {/* Demo Data Label */}
        <div className="absolute bottom-3 left-3 z-10">
          <span className="text-xs text-muted-foreground/60 bg-background/60 backdrop-blur-sm px-2 py-1 rounded">
            Demo data – live data coming soon
          </span>
        </div>
      </div>
    );
  }
);
