// src/components/trade/ReadinessChecklist.tsx
// Fixed 3-condition checklist (plan §2.4):
//   1. Three timeframes strictly agree (all bullish or all bearish, non-neutral)
//   2. Active session for the pair (SESSION_CONFIGS matched to pair currencies)
//   3. No high-impact news in the next 15 minutes
//
// Wording is literal "X of 3 conditions met" — never "ready" / "safe".
// Blocking role(s) include an inline name + TF label so the user sees which
// slot is disagreeing. These roles also pass out via `blockingRoles` so the
// per-TF panel row can mark them visually.
//
// Logic is pure (takes `now: Date`) so the check script can reproduce it.

import { useEffect } from "react";
import { TF_BY_CODE } from "@/data/timeframes";
import { SESSION_CONFIGS, type SessionConfig } from "@/data/sessionConfig";
import { getSymbolCurrencies } from "@/lib/symbolCurrencies";
import { getEventDateTime } from "@/services/calendarData";
import type { MarketContext } from "@/services/contextEngine";
import type { TraderTimeframes, TfRole } from "@/services/traderTimeframes";
import type { CalendarEvent } from "@/data/calendarEvents";

export const NEWS_WINDOW_MS = 15 * 60 * 1000;

const ROLES: readonly TfRole[] = ["bias", "structure", "entry"] as const;

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Currency → session mapping ────────────────────────────────
// A session is "open for this pair" if any currency the pair references maps
// to a currently-open session. USD → New York; EUR + GBP + CHF → London;
// JPY + CNY → Asia/Sydney; AUD + NZD → Sydney. Others default to London.
const SESSION_NAMES_BY_CCY: Record<string, string[]> = {
  USD: ["New York"],
  CAD: ["New York"],
  EUR: ["London"],
  GBP: ["London"],
  CHF: ["London"],
  JPY: ["Asia", "Sydney"],
  CNY: ["Asia"],
  HKD: ["Asia"],
  AUD: ["Sydney"],
  NZD: ["Sydney"],
};

function sessionsForSymbol(symbol: string): SessionConfig[] {
  const ccys = getSymbolCurrencies(symbol);
  const names = new Set<string>();
  for (const c of ccys) {
    for (const n of SESSION_NAMES_BY_CCY[c] ?? ["London"]) names.add(n);
  }
  return SESSION_CONFIGS.filter((s) => names.has(s.name));
}

/**
 * Returns the wall-clock minutes-since-midnight in the session's IANA timezone
 * at `now`, plus the day-of-week (0=Sun…6=Sat). Uses Intl.DateTimeFormat so
 * DST and tz offsets are correct. This is called twice per session per render
 * — cheap and deterministic.
 */
function tzClock(now: Date, timeZone: string): { minutes: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const parts = fmt.formatToParts(now);
  let hh = 0;
  let mm = 0;
  let wd = "Mon";
  for (const p of parts) {
    if (p.type === "hour") hh = parseInt(p.value, 10) % 24;
    else if (p.type === "minute") mm = parseInt(p.value, 10);
    else if (p.type === "weekday") wd = p.value;
  }
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { minutes: hh * 60 + mm, weekday: dayMap[wd] ?? 1 };
}

function isSessionOpen(session: SessionConfig, now: Date): boolean {
  const { minutes, weekday } = tzClock(now, session.timeZone);
  // FX / index sessions treat Sat/Sun as closed. Crypto callers don't use this.
  if (weekday === 0 || weekday === 6) return false;
  const open = session.openHour * 60 + session.openMinute;
  const close = session.closeHour * 60 + session.closeMinute;
  return minutes >= open && minutes < close;
}

export interface ChecklistInputs {
  context: MarketContext | null;
  resolvedTimeframes: TraderTimeframes;
  symbol: string;
  upcomingRelevantEvents: CalendarEvent[];
  now: Date;
}

export interface CondResult {
  ok: boolean;
  label: string;
  reason?: string;
}

export interface ChecklistResult {
  conditions: [CondResult, CondResult, CondResult];
  metCount: number;
  blockingRoles: TfRole[];
}

export function evaluateChecklist(inputs: ChecklistInputs): ChecklistResult {
  const { context, resolvedTimeframes, symbol, upcomingRelevantEvents, now } = inputs;

  // 1. Three-TF agreement
  let agreement: CondResult;
  const blockingRoles: TfRole[] = [];
  if (!context) {
    agreement = { ok: false, label: "Three timeframes agree", reason: "Bias unavailable" };
  } else {
    const dirs = ROLES.map((r) => context.perRole[r].direction);
    const allBullish = dirs.every((d) => d === "bullish");
    const allBearish = dirs.every((d) => d === "bearish");
    if (allBullish || allBearish) {
      agreement = { ok: true, label: "Three timeframes agree" };
    } else {
      // Majority direction wins; whichever roles disagree become blockers.
      const bullCount = dirs.filter((d) => d === "bullish").length;
      const bearCount = dirs.filter((d) => d === "bearish").length;
      const dominant: "bullish" | "bearish" | null =
        bullCount > bearCount ? "bullish" : bearCount > bullCount ? "bearish" : null;

      const blockers: TfRole[] = [];
      ROLES.forEach((r, i) => {
        if (dominant === null) {
          // No majority: anything non-majority is a blocker — i.e. everything neutral/mixed.
          if (dirs[i] !== "bullish" && dirs[i] !== "bearish") blockers.push(r);
          else blockers.push(r);
        } else if (dirs[i] !== dominant) {
          blockers.push(r);
        }
      });

      blockingRoles.push(...blockers);
      const names = blockers.map((r) => {
        const tfLabel = TF_BY_CODE[resolvedTimeframes[r]].label;
        const d = context.perRole[r].direction;
        return `${cap(r)} (${tfLabel}) ${d}`;
      });
      agreement = { ok: false, label: "Three timeframes agree", reason: names.join(", ") };
    }
  }

  // 2. Active session
  const sessions = sessionsForSymbol(symbol);
  const openNow = sessions.filter((s) => isSessionOpen(s, now));
  let session: CondResult;
  if (openNow.length > 0) {
    session = { ok: true, label: `Active session for ${symbol}` };
  } else {
    session = { ok: false, label: `Active session for ${symbol}`, reason: "No relevant session open" };
  }

  // 3. News clearance
  const windowEnd = now.getTime() + NEWS_WINDOW_MS;
  const soon = upcomingRelevantEvents.find((e) => {
    if (e.impact !== "high") return false;
    const t = getEventDateTime(e).getTime();
    return !Number.isNaN(t) && t >= now.getTime() && t <= windowEnd;
  });
  const news: CondResult = soon
    ? {
        ok: false,
        label: "No high-impact news next 15 min",
        reason: `${soon.event} in ${Math.max(1, Math.round((getEventDateTime(soon).getTime() - now.getTime()) / 60000))} min`,
      }
    : { ok: true, label: "No high-impact news next 15 min" };

  const conditions: [CondResult, CondResult, CondResult] = [agreement, session, news];
  const metCount = conditions.filter((c) => c.ok).length;
  return { conditions, metCount, blockingRoles };
}

// ── Component ─────────────────────────────────────────────────

export interface ReadinessChecklistProps {
  context: MarketContext | null;
  resolvedTimeframes: TraderTimeframes;
  symbol: string;
  upcomingRelevantEvents: CalendarEvent[];
  now?: Date;
  onBlockingRolesChange?: (roles: TfRole[]) => void;
}

export function ReadinessChecklist({
  context,
  resolvedTimeframes,
  symbol,
  upcomingRelevantEvents,
  now,
  onBlockingRolesChange,
}: ReadinessChecklistProps) {
  const result = evaluateChecklist({
    context,
    resolvedTimeframes,
    symbol,
    upcomingRelevantEvents,
    now: now ?? new Date(),
  });

  // Report blocking roles up so the per-TF panel rows can mark them visually.
  // String key keeps the effect idempotent across equal arrays.
  const rolesKey = result.blockingRoles.join(",");
  useEffect(() => {
    onBlockingRolesChange?.(result.blockingRoles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesKey]);

  return (
    <div className="rounded-lg border border-border bg-card/40 p-3 space-y-2">
      <div className="text-sm font-semibold text-foreground">
        {result.metCount} of 3 conditions met
      </div>
      <ul className="space-y-1.5">
        {result.conditions.map((c) => (
          <li key={c.label} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                c.ok ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
              }`}
              aria-hidden
            >
              {c.ok ? "✓" : "✗"}
            </span>
            <span className="flex-1">
              <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
              {!c.ok && c.reason && (
                <span className="block text-muted-foreground/80 mt-0.5">{c.reason}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
