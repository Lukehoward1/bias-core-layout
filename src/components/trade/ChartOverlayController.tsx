// src/components/trade/ChartOverlayController.tsx
// ─────────────────────────────────────────────────────────────
// Memoises overlay descriptors for the five overlay kinds and
// provides toggle buttons overlaid on the chart container.
// Descriptors recompute only when bars content, context levels,
// events, or tradeEntry change — never on each live price tick
// (live ticks pass through ChartEngine's liveBar prop directly).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { OhlcDataPoint } from '@/lib/mockOhlcData';
import type { MarketContext } from '@/services/contextEngine';
import type { CalendarEvent } from '@/data/calendarEvents';
import type { EntryIntent } from '@/components/trade/InATradeButton';
import type { OverlayDescriptor } from '@/services/overlayBuilder';
import {
  buildLevelOverlays,
  buildNewsOverlays,
  buildSessionOverlays,
  buildSwingOverlays,
  buildTradeOverlays,
} from '@/services/overlayBuilder';

const INTERVAL_SECONDS: Record<string, number> = {
  m1: 60, m5: 300, m15: 900, h1: 3600, h4: 14400, d1: 86400,
  '1min': 60, '5min': 300, '15min': 900, '1h': 3600, '4h': 14400, '1day': 86400,
};

/** Returns false when the last few bar spacings don't match the requested interval.
 *  Guards against stale swings/sessions flashing on new bars during a TF switch. */
function barsMatchInterval(bars: OhlcDataPoint[], interval: string): boolean {
  if (bars.length < 3) return true;
  const expected = INTERVAL_SECONDS[interval];
  if (!expected) return true;
  const spacings: number[] = [];
  for (let i = Math.max(1, bars.length - 5); i < bars.length; i++) {
    spacings.push(bars[i].timestamp - bars[i - 1].timestamp);
  }
  spacings.sort((a, b) => a - b);
  const median = spacings[Math.floor(spacings.length / 2)];
  return median > 0 && Math.abs(median - expected) <= expected * 0.5;
}

interface ChartOverlayControllerProps {
  symbol: string;
  bars: OhlcDataPoint[];
  interval: string;
  marketContext: MarketContext | null;
  /** All calendar events (not just upcoming) so historical markers appear on chart. */
  calendarEvents: CalendarEvent[];
  tradeEntry: EntryIntent | null;
  onOverlaysChange: (overlays: OverlayDescriptor[]) => void;
}

export function ChartOverlayController({
  symbol,
  bars,
  interval,
  marketContext,
  calendarEvents,
  tradeEntry,
  onOverlaysChange,
}: ChartOverlayControllerProps) {
  const isMobileInit = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
  const [showLevels,   setShowLevels]   = useState(true);
  const [showNews,     setShowNews]     = useState(true);
  const [showSessions, setShowSessions] = useState(!isMobileInit);
  const [showSwings,   setShowSwings]   = useState(!isMobileInit);

  const levelOverlays = useMemo(
    () => buildLevelOverlays(marketContext?.levels ?? [], bars),
    [marketContext, bars],
  );

  const newsOverlays = useMemo(
    () => buildNewsOverlays(calendarEvents, symbol, bars),
    [calendarEvents, symbol, bars],
  );

  const sessionOverlays = useMemo(
    () => barsMatchInterval(bars, interval) ? buildSessionOverlays(bars, interval, symbol) : [],
    [bars, interval, symbol],
  );

  const swingOverlays = useMemo(
    () => barsMatchInterval(bars, interval) ? buildSwingOverlays(bars, interval) : [],
    [bars, interval],
  );

  const tradeOverlays = useMemo(
    () => buildTradeOverlays(tradeEntry),
    [tradeEntry],
  );

  const combined = useMemo(
    () => [
      ...(showLevels   ? levelOverlays   : []),
      ...(showNews     ? newsOverlays     : []),
      ...(showSessions ? sessionOverlays : []),
      ...(showSwings   ? swingOverlays   : []),
      ...tradeOverlays,
    ],
    [showLevels, levelOverlays, showNews, newsOverlays, showSessions, sessionOverlays, showSwings, swingOverlays, tradeOverlays],
  );

  useEffect(() => {
    onOverlaysChange(combined);
  }, [combined, onOverlaysChange]);

  const sessionsUnavailable = (INTERVAL_SECONDS[interval] ?? 0) >= 14400;

  const toggles: { label: string; active: boolean; set: (v: boolean) => void; title?: string }[] = [
    { label: 'Levels',   active: showLevels,   set: setShowLevels   },
    { label: 'News',     active: showNews,     set: setShowNews     },
    { label: 'Sessions', active: showSessions, set: setShowSessions, title: sessionsUnavailable ? 'Sessions are shown on 1H and below' : undefined },
    { label: 'Swings',   active: showSwings,   set: setShowSwings,  title: 'SH = swing high · SL = swing low (this timeframe)' },
  ];

  return (
    <div className="absolute bottom-[52px] left-2 z-20 flex gap-1 pointer-events-auto overflow-x-auto max-w-[calc(100vw-4rem)]">
      {toggles.map(({ label, active, set, title }) => (
        <button
          key={label}
          onClick={() => set(!active)}
          title={title}
          className={`shrink-0 text-[9px] lg:text-[10px] px-1 lg:px-1.5 py-0.5 rounded border transition-colors select-none ${
            active
              ? 'border-border/60 bg-background/80 text-foreground'
              : 'border-transparent bg-transparent text-muted-foreground/40'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
