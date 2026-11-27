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

const OVERLAY_PREFS_KEY = 'streambias.chartOverlays.v1';

interface OverlayPrefs { levels: boolean; news: boolean; sessions: boolean; swings: boolean }

function readOverlayPrefs(isMobile: boolean): OverlayPrefs {
  try {
    const raw = localStorage.getItem(OVERLAY_PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as unknown;
      if (p && typeof p === 'object') {
        const o = p as Record<string, unknown>;
        return {
          levels:   typeof o.levels   === 'boolean' ? o.levels   : true,
          news:     typeof o.news     === 'boolean' ? o.news     : true,
          sessions: typeof o.sessions === 'boolean' ? o.sessions : !isMobile,
          swings:   typeof o.swings   === 'boolean' ? o.swings   : !isMobile,
        };
      }
    }
  } catch { /* localStorage unavailable */ }
  return { levels: true, news: true, sessions: !isMobile, swings: !isMobile };
}

function writeOverlayPrefs(prefs: OverlayPrefs): void {
  try {
    localStorage.setItem(OVERLAY_PREFS_KEY, JSON.stringify(prefs));
  } catch { /* noop */ }
}

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
  // Lazy initialisers read from localStorage once on mount so toggle choices
  // survive remounts (tab refocus, auth token refresh) and full page reloads.
  const [showLevels,   setShowLevels]   = useState(() => readOverlayPrefs(isMobileInit).levels);
  const [showNews,     setShowNews]     = useState(() => readOverlayPrefs(isMobileInit).news);
  const [showSessions, setShowSessions] = useState(() => readOverlayPrefs(isMobileInit).sessions);
  const [showSwings,   setShowSwings]   = useState(() => readOverlayPrefs(isMobileInit).swings);

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

  useEffect(() => {
    writeOverlayPrefs({ levels: showLevels, news: showNews, sessions: showSessions, swings: showSwings });
  }, [showLevels, showNews, showSessions, showSwings]);

  const sessionsUnavailable = (INTERVAL_SECONDS[interval] ?? 0) >= 14400;

  const toggles: { label: string; active: boolean; set: (v: boolean) => void; title?: string }[] = [
    { label: 'Levels',   active: showLevels,   set: setShowLevels   },
    { label: 'News',     active: showNews,     set: setShowNews     },
    { label: 'Sessions', active: showSessions, set: setShowSessions, title: sessionsUnavailable ? 'Sessions are shown on 1H and below' : undefined },
    { label: 'Swings',   active: showSwings,   set: setShowSwings,  title: 'SH = swing high · SL = swing low (this timeframe)' },
  ];

  return (
    <div className="absolute top-11 left-2 z-20 flex gap-1 pointer-events-auto overflow-x-auto max-w-[calc(100vw-4rem)]">
      {toggles.map(({ label, active, set, title }) => (
        <button
          key={label}
          onClick={() => set(!active)}
          title={title}
          className={`shrink-0 text-[9px] lg:text-[10px] px-1 lg:px-1.5 py-0.5 rounded border transition-colors select-none ${
            active
              ? 'border-border/60 bg-background/80 text-foreground'
              : 'border-border/20 bg-background/50 text-muted-foreground/60'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
