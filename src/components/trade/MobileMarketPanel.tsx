// src/components/trade/MobileMarketPanel.tsx
// Fixed bottom sheet (mobile only, hidden lg:+). Collapsed handle bar shows
// bias state + confidence + readiness count. Expands to ~85vh on tap or
// swipe-up; swipe-down or tap collapses.

import { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MarketAwarenessPanel } from '@/components/trade/MarketAwarenessPanel';
import { ReadinessChecklist } from '@/components/trade/ReadinessChecklist';
import { DynamicRiskCell } from '@/components/trade/DynamicRiskCell';
import type { MarketContext } from '@/services/contextEngine';
import type { MarketQuote } from '@/services/marketData';
import type { TraderTimeframes, TfRole } from '@/services/traderTimeframes';
import type { TradeInstrument } from '@/data/tradeInstruments';
import type { CalendarEvent } from '@/data/calendarEvents';
import type { OhlcDataPoint } from '@/lib/mockOhlcData';

export interface MobileMarketPanelProps {
  symbol: string;
  instrument: TradeInstrument | null;
  context: MarketContext | null;
  resolvedTimeframes: TraderTimeframes;
  traderStyleLabel: string;
  chartBars: OhlcDataPoint[] | null;
  quote: MarketQuote | null;
  sentiment: number | null;
  upcomingRelevantEvents: CalendarEvent[];
  onOpenEvent?: (event: CalendarEvent) => void;
  session: string;
  onOpenSlideOver: () => void;
  /** Pre-computed count from Trade.tsx so collapsed header stays accurate. */
  conditionsMet?: number;
}

function HandleBiasIcon({ biasState }: { biasState: string | undefined }) {
  if (!biasState) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  if (biasState.startsWith('Bullish')) return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (biasState.startsWith('Bearish')) return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function MobileMarketPanel({
  symbol,
  instrument,
  context,
  resolvedTimeframes,
  traderStyleLabel,
  chartBars,
  quote,
  sentiment,
  upcomingRelevantEvents,
  onOpenEvent,
  session,
  onOpenSlideOver,
  conditionsMet: externalConditionsMet,
}: MobileMarketPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [blockingRoles, setBlockingRoles] = useState<TfRole[]>([]);
  const [conditionsMet, setConditionsMet] = useState(0);

  // Vertical swipe-down detection to collapse
  const dragRef = useRef<{ startY: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    dragRef.current = { startY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !expanded) return;
    if (e.clientY - dragRef.current.startY > 60) {
      dragRef.current = null;
      setExpanded(false);
    }
  };
  const onPointerUp = () => { dragRef.current = null; };
  const onPointerCancel = () => { dragRef.current = null; };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-background border-t border-border"
      style={{
        maxHeight: expanded ? '85vh' : '56px',
        transition: 'max-height 300ms ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Handle bar — tap to toggle, swipe-down to collapse */}
      <div
        className="relative flex items-center justify-between px-4 cursor-pointer select-none"
        style={{ height: '56px' }}
        onClick={() => setExpanded((v) => !v)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Drag handle pill */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-muted-foreground/30" />

        {/* Summary row */}
        <div className="flex items-center gap-2 mt-1">
          <HandleBiasIcon biasState={context?.biasState} />
          <span className="text-sm font-semibold text-foreground leading-none">
            {context?.biasState ?? '—'}
          </span>
          {context && (
            <span className="text-xs text-muted-foreground">
              {Math.round(context.biasConfidence)}%
            </span>
          )}
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground">
            {externalConditionsMet ?? conditionsMet} of 3
          </span>
        </div>

        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          className="overflow-y-auto px-4 pb-6 space-y-3"
          style={{ maxHeight: 'calc(85vh - 56px)' }}
        >
          <MarketAwarenessPanel
            symbol={symbol}
            instrument={instrument}
            context={context}
            resolvedTimeframes={resolvedTimeframes}
            traderStyleLabel={traderStyleLabel}
            chartBars={chartBars}
            quote={quote}
            sentiment={sentiment}
            upcomingRelevantEvents={upcomingRelevantEvents}
            blockingRoles={blockingRoles}
            onOpenEvent={onOpenEvent}
            pickerAsSheet
          />
          <ReadinessChecklist
            context={context}
            resolvedTimeframes={resolvedTimeframes}
            symbol={symbol}
            upcomingRelevantEvents={upcomingRelevantEvents}
            onBlockingRolesChange={setBlockingRoles}
            onConditionsMetChange={setConditionsMet}
          />
          <DynamicRiskCell
            symbol={symbol}
            session={session}
            onOpenSlideOver={onOpenSlideOver}
          />
        </div>
      )}
    </div>
  );
}
