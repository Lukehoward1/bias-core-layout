// src/components/trade/MarketAwarenessPanel.tsx
// Persistent side panel (plan §2.4). Rows:
//   - Header: Bias/Structure/Entry labelled with each resolved TF + pencil + style chip
//   - 3 per-TF bias rows (direction, confidence, reason) — hidden lg:+ (shown in BiasStrip)
//   - Combined role-weighted bias + confidence — hidden lg:+
//   - Sentiment + Volume (side by side on lg:+)
//   - Next high-impact news (countdown)
//   - Nearest key level(s)
//
// Never reads chartBars except the volume row. When context is null, renders
// skeleton rows so the UI doesn't go blank between fetches.

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TraderTimeframesPicker } from "@/components/trade/TraderTimeframesPicker";
import { BiasRoleCard, BiasRoleSkeleton } from "@/components/trade/BiasRoleCard";
import { TF_BY_CODE } from "@/data/timeframes";
import { computeVolumeRow } from "@/lib/volumeRule";
import { getEventDateTime } from "@/services/calendarData";
import type { MarketContext, KeyLevel } from "@/services/contextEngine";
import type { TraderTimeframes, TfRole } from "@/services/traderTimeframes";
import type { TradeInstrument } from "@/data/tradeInstruments";
import type { MarketQuote } from "@/services/marketData";
import type { CalendarEvent } from "@/data/calendarEvents";
import type { OhlcDataPoint } from "@/lib/mockOhlcData";

const ROLES: readonly TfRole[] = ["bias", "structure", "entry"] as const;

export interface MarketAwarenessPanelProps {
  symbol: string;
  instrument: TradeInstrument | null;
  context: MarketContext | null;
  resolvedTimeframes: TraderTimeframes;
  traderStyleLabel: string;
  chartBars: OhlcDataPoint[] | null;
  quote: MarketQuote | null;
  sentiment: number | null;
  upcomingRelevantEvents: CalendarEvent[];
  blockingRoles: readonly TfRole[];
  onOpenPickerPopover?: () => void;
  onOpenEvent?: (event: CalendarEvent) => void;
  now?: Date;
  pickerAsSheet?: boolean;
}

function Skeleton({ width = "w-24" }: { width?: string }) {
  return <span className={`inline-block h-3 ${width} bg-muted/40 rounded animate-pulse`} />;
}

function formatMinsUntil(date: Date, now: Date): string {
  const ms = date.getTime() - now.getTime();
  if (ms <= 0) return "due";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `in ${h}h` : `in ${h}h ${m}m`;
}

function formatLevelDistance(price: number, levelPrice: number, pipSize: number): string {
  const pips = Math.abs(price - levelPrice) / pipSize;
  if (!Number.isFinite(pips)) return "";
  if (pips < 1) return "<1 pip";
  if (pips < 100) return `${pips.toFixed(1)} pips`;
  return `${Math.round(pips)} pips`;
}

function parsePrice(s: string): number {
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function MarketAwarenessPanel({
  symbol: _symbol,
  instrument,
  context,
  resolvedTimeframes,
  traderStyleLabel,
  chartBars,
  quote,
  sentiment,
  upcomingRelevantEvents,
  blockingRoles,
  onOpenPickerPopover: _onOpenPickerPopover,
  onOpenEvent,
  now,
  pickerAsSheet,
}: MarketAwarenessPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const nowDate = now ?? new Date();
  const biasLabel = TF_BY_CODE[resolvedTimeframes.bias].label;
  const structureLabel = TF_BY_CODE[resolvedTimeframes.structure].label;
  const entryLabel = TF_BY_CODE[resolvedTimeframes.entry].label;

  const vol = computeVolumeRow(chartBars, {
    hasVolumeOverride: instrument?.hasVolume,
  });

  const nextHighImpact = upcomingRelevantEvents.find((e) => e.impact === "high");

  const livePrice = quote?.last ?? null;
  const nearestLevels: KeyLevel[] = (context?.levels ?? [])
    .filter((l) => l.relevance === "High relevance" || l.relevance === "Medium relevance")
    .slice(0, 2);

  const isBlocking = (r: TfRole) => blockingRoles.includes(r);

  return (
    <div className="flex flex-col gap-3">
      {/* Header — always visible */}
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            Bias <span className="text-foreground font-medium">{biasLabel}</span>
            <span className="mx-1 opacity-50">·</span>
            Structure <span className="text-foreground font-medium">{structureLabel}</span>
            <span className="mx-1 opacity-50">·</span>
            Entry <span className="text-foreground font-medium">{entryLabel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {traderStyleLabel}
            </span>
            {pickerAsSheet ? (
              <>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                  title="Edit timeframes"
                  aria-label="Edit timeframes"
                  onClick={() => setPickerOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
                  <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Edit timeframes</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                      <TraderTimeframesPicker instrument={instrument} />
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded hover:bg-muted text-muted-foreground"
                    title="Edit timeframes"
                    aria-label="Edit timeframes"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <TraderTimeframesPicker instrument={instrument} />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* Per-TF bias rows — hidden on desktop (shown in BiasStrip instead) */}
      <div className="lg:hidden rounded-lg border border-border bg-card/40 p-3 space-y-2">
        {ROLES.map((role) => (
          <BiasRoleCard
            key={role}
            role={role}
            tfLabel={TF_BY_CODE[resolvedTimeframes[role]].label}
            roleData={context?.perRole[role]}
            blocking={isBlocking(role)}
            variant="row"
          />
        ))}
      </div>

      {/* Combined bias — hidden on desktop (shown in BiasStrip instead) */}
      <div className="lg:hidden rounded-lg border border-border bg-card/40 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          Combined bias
        </div>
        {context ? (
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">{context.biasState}</span>
            <span className="text-xs text-muted-foreground">
              {Math.round(context.biasConfidence)} conf
            </span>
          </div>
        ) : (
          <Skeleton width="w-40" />
        )}
      </div>

      {/* Sentiment + Volume — side by side on lg:+, stacked below */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card/40 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Sentiment
          </div>
          {sentiment === null ? (
            <span className="text-sm text-muted-foreground">No data</span>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-sm font-semibold ${
                  sentiment > 0
                    ? "text-success"
                    : sentiment < 0
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {sentiment > 0 ? "Bullish" : sentiment < 0 ? "Bearish" : "Neutral"}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {sentiment > 0 ? "+" : ""}{sentiment}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card/40 p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Volume
          </div>
          {vol.kind === "unavailable" && (
            <span className="text-sm text-muted-foreground">—</span>
          )}
          {vol.kind === "tick" && (
            <div>
              <span className="text-sm font-semibold text-foreground">
                {vol.lastVolume.toLocaleString()}
              </span>
              <div className="text-[11px] text-muted-foreground mt-0.5">{vol.label}</div>
            </div>
          )}
          {vol.kind === "activity" && (
            <div>
              <span className="text-sm font-semibold text-foreground">{vol.level}</span>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Last bar {vol.ratio.toFixed(2)}× 20-bar average range
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next high-impact news */}
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          Next high-impact news
        </div>
        {nextHighImpact ? (
          <button
            type="button"
            onClick={() => onOpenEvent?.(nextHighImpact)}
            className="text-left w-full group"
          >
            <div className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2">
              {nextHighImpact.event}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {nextHighImpact.currency} · {formatMinsUntil(getEventDateTime(nextHighImpact), nowDate)}
            </div>
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">None in the next 7 days</span>
        )}
      </div>

      {/* Nearest levels */}
      <div className="rounded-lg border border-border bg-card/40 p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
          Nearest levels
        </div>
        {!context ? (
          <div className="space-y-1.5">
            <Skeleton width="w-32" />
            <Skeleton width="w-28" />
          </div>
        ) : nearestLevels.length === 0 ? (
          <span className="text-sm text-muted-foreground">Levels unavailable</span>
        ) : (
          <ul className="space-y-1">
            {nearestLevels.map((lvl, i) => {
              const p = parsePrice(lvl.price);
              const dist =
                livePrice !== null && Number.isFinite(p) && instrument
                  ? formatLevelDistance(livePrice, p, instrument.pipSize)
                  : "";
              return (
                <li key={`${lvl.type}-${i}`} className="flex items-center justify-between text-xs">
                  <span className="text-foreground truncate pr-2">{lvl.type}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {lvl.price}
                    {dist && <span className="ml-1.5 opacity-70">({dist})</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
