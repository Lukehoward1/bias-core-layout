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
  const [showLevels,   setShowLevels]   = useState(true);
  const [showNews,     setShowNews]     = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const [showSwings,   setShowSwings]   = useState(true);

  const levelOverlays = useMemo(
    () => buildLevelOverlays(marketContext?.levels ?? [], bars),
    [marketContext, bars],
  );

  const newsOverlays = useMemo(
    () => buildNewsOverlays(calendarEvents, symbol, bars),
    [calendarEvents, symbol, bars],
  );

  const sessionOverlays = useMemo(
    () => buildSessionOverlays(bars, interval),
    [bars, interval],
  );

  const swingOverlays = useMemo(
    () => buildSwingOverlays(bars, interval),
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

  const toggles: { label: string; active: boolean; set: (v: boolean) => void }[] = [
    { label: 'Levels',   active: showLevels,   set: setShowLevels   },
    { label: 'News',     active: showNews,     set: setShowNews     },
    { label: 'Sessions', active: showSessions, set: setShowSessions },
    { label: 'Swings',   active: showSwings,   set: setShowSwings   },
  ];

  return (
    <div className="absolute bottom-10 left-2 z-20 flex gap-1 pointer-events-auto">
      {toggles.map(({ label, active, set }) => (
        <button
          key={label}
          onClick={() => set(!active)}
          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors select-none ${
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
