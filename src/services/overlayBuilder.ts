// src/services/overlayBuilder.ts
// ─────────────────────────────────────────────────────────────
// OverlayDescriptor types (Stage 2 stubs) + five builder functions (Stage 4).
// All builders are pure — no side effects, no I/O.
// ChartOverlayController memoises and combines them for ChartEngine.
// ─────────────────────────────────────────────────────────────

import type { CalendarEvent } from '@/data/calendarEvents';
import type { OhlcDataPoint } from '@/lib/mockOhlcData';
import type { KeyLevel } from '@/services/contextEngine';
import type { EntryIntent } from '@/components/trade/InATradeButton';
import { SESSION_CONFIGS } from '@/data/sessionConfig';
import { getEventImpact } from '@/data/eventImpactRules';
import { isFxPairSymbol, normalizeMarketSymbol, getSymbolCurrencies, INDEX_CCY } from '@/lib/symbolCurrencies';

export type OverlayDescriptor =
  | { kind: 'price-line';     price: number; label: string; color: string; dash?: boolean; axisLabelVisible?: boolean }
  | { kind: 'event-marker';   timestamp: number; label: string; impact: 'high' | 'medium'; event: CalendarEvent }
  | { kind: 'session-line';   timestamp: number; label: string; color: string }
  | { kind: 'swing-marker';   timestamp: number; price: number; direction: 'high' | 'low' }
  | { kind: 'highlight-band'; from: number; to: number; color: string; label?: string };

// ── Pure helpers (exported for tests) ─────────────────────────

/**
 * DST-correct conversion: wall-clock time in an IANA timezone → UTC ms.
 * Uses an iterative correction via Intl.DateTimeFormat.formatToParts (3 passes
 * is sufficient for all known DST transitions).
 */
export function sessionOpenUTC(
  year: number,
  month0: number,
  day: number,
  openHour: number,
  openMinute: number,
  timeZone: string,
): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  function localParts(utcMs: number) {
    const p: Record<string, number> = {};
    for (const part of fmt.formatToParts(new Date(utcMs))) {
      if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10);
    }
    return { y: p.year, mo: p.month - 1, d: p.day, h: p.hour, mi: p.minute, s: p.second ?? 0 };
  }

  let utcMs = Date.UTC(year, month0, day, openHour, openMinute, 0);
  for (let i = 0; i < 3; i++) {
    const lp = localParts(utcMs);
    const desired = Date.UTC(year, month0, day, openHour, openMinute, 0);
    const actual  = Date.UTC(lp.y, lp.mo, lp.d, lp.h, lp.mi, lp.s);
    utcMs += desired - actual;
  }
  return utcMs;
}

/**
 * Returns true if `price` is within 15 × `avgBarRange` of `lastClose`.
 * Exported for tests.
 */
export function levelInRange(price: number, lastClose: number, avgBarRange: number): boolean {
  return Math.abs(price - lastClose) <= 15 * avgBarRange;
}

/**
 * Pivot rule: bar[i] is a swing high if its `high` is strictly greater than
 * the high of all N bars to its left AND all N bars to its right.
 * Swing low: mirrored with `low`. Last N bars are excluded (confirmed only).
 * O(N × window). Exported for tests.
 */
export function computeSwingPivots(
  bars: OhlcDataPoint[],
  n: number,
): Array<{ timestamp: number; price: number; direction: 'high' | 'low' }> {
  const result: Array<{ timestamp: number; price: number; direction: 'high' | 'low' }> = [];
  if (n < 1 || bars.length < 2 * n + 1) return result;

  const limit = bars.length - n; // last N bars can't be confirmed pivots

  for (let i = n; i < limit; i++) {
    const bar = bars[i];

    let isHigh = true;
    for (let j = i - n; j < i && isHigh; j++) {
      if (bars[j].high >= bar.high) isHigh = false;
    }
    if (isHigh) {
      for (let j = i + 1; j <= i + n && isHigh; j++) {
        if (bars[j].high >= bar.high) isHigh = false;
      }
    }

    let isLow = true;
    for (let j = i - n; j < i && isLow; j++) {
      if (bars[j].low <= bar.low) isLow = false;
    }
    if (isLow) {
      for (let j = i + 1; j <= i + n && isLow; j++) {
        if (bars[j].low <= bar.low) isLow = false;
      }
    }

    if (isHigh) result.push({ timestamp: bar.timestamp, price: bar.high, direction: 'high' });
    if (isLow)  result.push({ timestamp: bar.timestamp, price: bar.low,  direction: 'low'  });
  }
  return result;
}

// ── Declutter helpers (exported for tests) ─────────────────────

const SESSION_SHORT_LABELS: Record<string, string> = {
  Sydney: 'SYD',
  Asia: 'ASIA',
  London: 'LDN',
  'New York': 'NY',
};

const SESSION_NAMES_BY_CCY: Record<string, string> = {
  USD: 'New York', CAD: 'New York',
  EUR: 'London',  GBP: 'London', CHF: 'London',
  JPY: 'Asia',    CNY: 'Asia',
  AUD: 'Sydney',  NZD: 'Sydney',
};

const LEVEL_ABBREVS: Record<string, string> = {
  'Swing High': 'SwHigh',
  'Swing Low': 'SwLow',
  'Liquidity Sweep': 'LiqSwp',
  'Strong Reaction Zone': 'SRZ',
  'Break and Retest Zone': 'BnR',
  'Nearby Target': 'Target',
  'Possible Reaction Zone': 'PRZ',
};

/**
 * Returns short session-name keys relevant to the given symbol.
 * Metals (XAU*, XAG*) and indices always show LDN + NY.
 * FX pairs derive sessions from their two currencies.
 * Exported for tests.
 */
export function relevantSessionShortNames(symbol: string): string[] {
  const norm = normalizeMarketSymbol(symbol);
  if (/^X[AG]/i.test(norm) || norm in INDEX_CCY) return ['LDN', 'NY'];
  const shortNames = new Set<string>();
  for (const ccy of getSymbolCurrencies(norm)) {
    const sessionName = SESSION_NAMES_BY_CCY[ccy] ?? 'London';
    shortNames.add(SESSION_SHORT_LABELS[sessionName] ?? sessionName);
  }
  return [...shortNames];
}

/**
 * Remove levels within `threshold × avgBarRange` of a stronger one.
 * Sorted by `strength` descending before dedup so the stronger is always kept.
 * Exported for tests.
 */
export function dedupeLevelsByProximity<T extends { price: number; strength: number }>(
  levels: T[],
  avgBarRange: number,
  threshold = 0.25,
): T[] {
  const kept: T[] = [];
  const sorted = [...levels].sort((a, b) => b.strength - a.strength);
  for (const l of sorted) {
    const tooClose = kept.some((k) => Math.abs(k.price - l.price) < threshold * avgBarRange);
    if (!tooClose) kept.push(l);
  }
  return kept;
}

/**
 * Shorten a news event title to 14 chars and append the currency code.
 * Exported for tests.
 */
export function shortenNewsLabel(title: string, currency: string): string {
  const truncated = title.length > 14 ? title.slice(0, 14).trimEnd() + '…' : title;
  return `${truncated} ${currency}`;
}

// ── Internal helpers ───────────────────────────────────────────

const TF_MINUTES: Record<string, number> = {
  m1: 1, m5: 5, m15: 15, h1: 60, h4: 240, d1: 1440,
  '1min': 1, '5min': 5, '15min': 15, '1h': 60, '4h': 240, '1day': 1440,
};

function intervalMinutes(interval: string): number {
  return TF_MINUTES[interval] ?? 60;
}

function isNewsRelevant(symbol: string, event: CalendarEvent): boolean {
  const norm = normalizeMarketSymbol(symbol);
  const impact = getEventImpact({ title: event.event, currency: event.currency });
  if (impact.affectedPairs.includes(norm)) return true;
  if (impact.affectedAssets.includes(norm)) return true;
  if (isFxPairSymbol(norm)) {
    const ccys = [norm.slice(0, 3), norm.slice(3, 6)];
    return ccys.some((c) => impact.affectedCurrencies.includes(c));
  }
  return getSymbolCurrencies(norm).some((c) => impact.affectedCurrencies.includes(c));
}

// ── Builders ───────────────────────────────────────────────────

/** Key level price-lines from contextEngine. Sanity-filtered, deduped, capped at 5. */
export function buildLevelOverlays(
  levels: KeyLevel[],
  bars: OhlcDataPoint[],
): OverlayDescriptor[] {
  if (levels.length === 0) return [];

  const lastClose = bars.length > 0 ? bars[bars.length - 1].close : null;
  const slice     = bars.slice(-Math.min(20, bars.length));
  const avgRange  = slice.length >= 5
    ? slice.reduce((s, b) => s + (b.high - b.low), 0) / slice.length
    : null;

  type ScoredLevel = { price: number; strength: number; label: string; color: string; dash: boolean };
  const scored: ScoredLevel[] = [];
  for (const l of levels) {
    const price = parseFloat(l.price);
    if (!Number.isFinite(price)) continue;
    if (lastClose !== null && avgRange !== null && !levelInRange(price, lastClose, avgRange)) continue;
    scored.push({
      price,
      strength: l.score,
      label: LEVEL_ABBREVS[l.type] ?? l.type.slice(0, 6),
      color: l.higherTimeframe
        ? 'hsl(45, 90%, 60%)'
        : l.alignedWithBias
          ? 'hsl(142, 71%, 45%)'
          : 'hsl(0, 84%, 60%)',
      dash: !l.higherTimeframe,
    });
  }

  if (scored.length === 0) return [];

  const deduped = dedupeLevelsByProximity(scored, avgRange ?? 0.0001);

  // Keep at most 5; prefer strongest, tiebreak by proximity to close
  deduped.sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    return Math.abs(a.price - (lastClose ?? 0)) - Math.abs(b.price - (lastClose ?? 0));
  });
  const top5 = deduped.slice(0, 5);

  // Nearest 3 to close get axis labels; the rest hide their axis label
  const sortedByDist = [...top5].sort(
    (a, b) => Math.abs(a.price - (lastClose ?? 0)) - Math.abs(b.price - (lastClose ?? 0)),
  );
  const axisVisible = new Set(sortedByDist.slice(0, 3).map((l) => l.price));

  return top5.map((l) => ({
    kind: 'price-line',
    price: l.price,
    label: l.label,
    color: l.color,
    dash: l.dash,
    axisLabelVisible: axisVisible.has(l.price),
  }));
}

const MAX_NEWS_MARKERS = 60;

/** High-impact news markers within the loaded bar range, filtered by symbol relevance. */
export function buildNewsOverlays(
  events: CalendarEvent[],
  symbol: string,
  bars: OhlcDataPoint[],
): OverlayDescriptor[] {
  if (bars.length === 0) return [];
  const minTs = bars[0].timestamp;
  const maxTs = bars[bars.length - 1].timestamp;

  const result: OverlayDescriptor[] = [];
  for (const e of events) {
    if (e.impact !== 'high') continue;
    if (!isNewsRelevant(symbol, e)) continue;
    const ts = Math.floor(new Date(e.scheduledAt).getTime() / 1000);
    if (!Number.isFinite(ts) || ts < minTs || ts > maxTs) continue;
    result.push({ kind: 'event-marker', timestamp: ts, label: shortenNewsLabel(e.event, e.currency), impact: 'high', event: e });
    if (result.length >= MAX_NEWS_MARKERS) break;
  }

  // Only the 2 events nearest to the last bar show a text label; the rest show
  // just the dot (empty string keeps the click handler working).
  if (result.length > 2) {
    const lastBarTs = bars.length > 0 ? bars[bars.length - 1].timestamp : 0;
    const byDist = [...result].sort(
      (a, b) => Math.abs(a.timestamp - lastBarTs) - Math.abs(b.timestamp - lastBarTs),
    );
    const featured = new Set([byDist[0].timestamp, byDist[1].timestamp]);
    return result.map((r) => ({ ...r, label: featured.has(r.timestamp) ? r.label : '' }));
  }
  return result;
}

/** Session open timestamps within the loaded bar range (DST-correct IANA). */
export function buildSessionOverlays(
  bars: OhlcDataPoint[],
  _interval: string,
  symbol = '',
): OverlayDescriptor[] {
  if (bars.length === 0) return [];
  const minTs = bars[0].timestamp;
  const maxTs = bars[bars.length - 1].timestamp;

  // Only the most recent 5 calendar days of session opens
  const FIVE_DAYS_SEC = 5 * 24 * 3600;
  const cutoffSec = maxTs - FIVE_DAYS_SEC;

  const relevant = new Set(symbol ? relevantSessionShortNames(symbol) : []);

  const result: OverlayDescriptor[] = [];

  const startUTC = new Date(Math.max(minTs, cutoffSec) * 1000);
  const endUTC   = new Date(maxTs * 1000);

  // Iterate UTC days spanning the capped range (+1 day buffer either side)
  const cur = new Date(
    Date.UTC(startUTC.getUTCFullYear(), startUTC.getUTCMonth(), startUTC.getUTCDate() - 1),
  );
  const end = new Date(
    Date.UTC(endUTC.getUTCFullYear(), endUTC.getUTCMonth(), endUTC.getUTCDate() + 2),
  );

  while (cur <= end) {
    for (const session of SESSION_CONFIGS) {
      const shortLabel = SESSION_SHORT_LABELS[session.name] ?? session.name;
      if (symbol && relevant.size > 0 && !relevant.has(shortLabel)) continue;
      const openMs  = sessionOpenUTC(
        cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate(),
        session.openHour, session.openMinute, session.timeZone,
      );
      const openSec = Math.floor(openMs / 1000);
      if (openSec >= Math.max(minTs, cutoffSec) && openSec <= maxTs) {
        result.push({ kind: 'session-line', timestamp: openSec, label: shortLabel, color: session.accent });
      }
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result;
}

const MAX_SWING_MARKERS = 20;

/** Pivot-based swing high/low markers. N=3 for sub-hour intervals, N=5 for 1H+. */
export function buildSwingOverlays(
  bars: OhlcDataPoint[],
  interval: string,
): OverlayDescriptor[] {
  const n = intervalMinutes(interval) < 60 ? 3 : 5;
  const pivots = computeSwingPivots(bars, n);
  const capped = pivots.length > MAX_SWING_MARKERS
    ? pivots.slice(pivots.length - MAX_SWING_MARKERS)
    : pivots;
  return capped.map((p) => ({
    kind: 'swing-marker' as const,
    timestamp: p.timestamp,
    price: p.price,
    direction: p.direction,
  }));
}

/** Entry/stop/target price-lines from InATradeButton state. */
export function buildTradeOverlays(entry: EntryIntent | null): OverlayDescriptor[] {
  if (!entry) return [];
  const result: OverlayDescriptor[] = [
    {
      kind: 'price-line',
      price: entry.entryPrice,
      label: `Entry ${entry.direction === 'long' ? '▲' : '▼'}`,
      color: 'hsl(210, 90%, 60%)',
      dash: false,
    },
  ];
  if (entry.stopPrice !== undefined) {
    result.push({ kind: 'price-line', price: entry.stopPrice,   label: 'Stop',   color: 'hsl(0, 84%, 60%)',    dash: true });
  }
  if (entry.targetPrice !== undefined) {
    result.push({ kind: 'price-line', price: entry.targetPrice, label: 'Target', color: 'hsl(142, 71%, 45%)', dash: true });
  }
  return result;
}
