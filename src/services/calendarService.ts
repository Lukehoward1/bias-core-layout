// src/services/calendarService.ts
// Live economic calendar data from Financial Modeling Prep.
// Caches for 30 minutes; falls back to empty array on any failure
// so calendarData.ts can use static events instead.

import { calendarEvents as staticCalendarEvents, type CalendarEvent, type CalendarImpact } from "@/data/calendarEvents";

// ── Fixture toggle (dev + preview) ────────────────────────────
// When VITE_USE_CALENDAR_FIXTURES=true, short-circuit the FMP fetch and serve
// the static fixture set from data/calendarEvents. Vite bakes this value at
// build time (Vercel Preview builds are technically "production" mode, so we
// can't gate on import.meta.env.DEV here — that would exclude Preview too).
// Safety comes from where the env var is scoped: dashboard has it set for
// Preview only, and .env.local for local dev. Production builds have no such
// env var, so the comparison evaluates to `undefined === "true"` (false) and
// the whole fixture branch tree-shakes out of the production bundle.
const USE_FIXTURES = import.meta.env.VITE_USE_CALENDAR_FIXTURES === "true";
let _fixturesNoticeLogged = false;
function _logFixturesNotice() {
  if (_fixturesNoticeLogged) return;
  _fixturesNoticeLogged = true;
  console.info(
    "[calendarService] Serving fixture calendar data (VITE_USE_CALENDAR_FIXTURES=true, dev only).",
  );
}

// ── FMP response shape ────────────────────────────────────────

interface FmpEconomicEvent {
  event: string;
  date: string;         // "2026-05-28 13:30:00"
  country: string;      // "US"
  currency?: string;    // sometimes populated, sometimes empty
  previous?: string | null;
  estimate?: string | null;
  actual?: string | null;
  impact?: string;      // "High" | "Medium" | "Low"
}

// ── Cache ─────────────────────────────────────────────────────

const CACHE_TTL_MS = 30 * 60 * 1000;         // 30 minutes
const HISTORY_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes — history changes slowly
const FAILURE_COOLDOWN_MS = 2 * 60 * 1000;   // 2 minutes

let _cache: { data: CalendarEvent[]; expiresAt: number } | null = null;
let _inFlightPromise: Promise<CalendarEvent[]> | null = null;
let _failedAt: number | null = null;

let _historyCache: { data: CalendarEvent[]; expiresAt: number } | null = null;
let _historyInFlight: Promise<CalendarEvent[]> | null = null;

// Tracks whether the last completed list-view fetch succeeded (true/false) or
// hasn't completed yet (null). Used by calendarData.ts to distinguish a
// successful empty result from a network/auth failure.
let _lastFetchSucceeded: boolean | null = null;

export function getCalendarFetchStatus(): boolean | null {
  return _lastFetchSucceeded;
}

// ── Mapping helpers ───────────────────────────────────────────

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  EU: "EUR",
  JP: "JPY",
  AU: "AUD",
  CA: "CAD",
  CH: "CHF",
  NZ: "NZD",
  CN: "CNY",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  PT: "EUR",
  NL: "EUR",
};

function toEventKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toImpact(raw?: string): CalendarImpact {
  const s = (raw ?? "").toLowerCase();
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

function parseFmpDate(raw: string): { date: string; time: string; scheduledAt: string } {
  // FMP format: "2026-05-28 13:30:00" — treat as UTC
  const spaceIdx = raw.indexOf(" ");
  const datePart = spaceIdx === -1 ? raw : raw.slice(0, spaceIdx);
  const timePart = spaceIdx === -1 ? "00:00:00" : raw.slice(spaceIdx + 1);
  const [hh = "00", mm = "00"] = timePart.split(":");
  const time = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
  const scheduledAt = `${datePart}T${timePart}Z`;
  return { date: datePart, time, scheduledAt };
}

function deriveCurrency(raw: FmpEconomicEvent): string {
  if (raw.currency?.trim()) return raw.currency.trim().toUpperCase();
  const country = (raw.country ?? "").toUpperCase();
  return ((COUNTRY_TO_CURRENCY[country]) ?? country) || "USD";
}

function mapFmpEvent(raw: FmpEconomicEvent, index: number): CalendarEvent {
  const { date, time, scheduledAt } = parseFmpDate(raw.date ?? "");
  const eventKey = toEventKey(raw.event ?? "unknown");
  return {
    id: `fmp-${eventKey}-${date}-${index}`,
    eventKey,
    date,
    time,
    scheduledAt,
    currency: deriveCurrency(raw),
    event: raw.event ?? "Unknown Event",
    previous: raw.previous ?? "—",
    forecast: raw.estimate ?? "—",
    actual: raw.actual ?? "—",
    impact: toImpact(raw.impact),
  };
}

// ── Public API ────────────────────────────────────────────────

// Fetches ~12 months of past events for historical trend charts.
// Cached for 60 minutes — results are shared across all event detail modals.
// Filters to events with actual values must be done by the caller (FMP includes
// future events in date-ranged queries even when the range includes today).
export function getLiveCalendarHistoricalEvents(): Promise<CalendarEvent[]> {
  if (USE_FIXTURES) {
    _logFixturesNotice();
    if (!_historyCache) {
      const nowMs = Date.now();
      const oneYearAgo = nowMs - 365 * 24 * 60 * 60 * 1000;
      const past = staticCalendarEvents.filter((e) => {
        const t = new Date(e.scheduledAt).getTime();
        return !Number.isNaN(t) && t >= oneYearAgo && t <= nowMs;
      });
      _historyCache = { data: past, expiresAt: nowMs + HISTORY_CACHE_TTL_MS };
    }
    return Promise.resolve(_historyCache.data);
  }

  if (_historyCache && Date.now() < _historyCache.expiresAt) {
    return Promise.resolve(_historyCache.data);
  }
  if (_historyInFlight) return _historyInFlight;

  const now = new Date();
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 1);
  // Include through today — actual values on today's events may be populated
  const to = new Date(now);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `/api/economic-calendar?from=${fmt(from)}&to=${fmt(to)}`;

  _historyInFlight = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("Unexpected FMP response — expected array");
      const events = (data as FmpEconomicEvent[]).map(mapFmpEvent);
      _historyCache = { data: events, expiresAt: Date.now() + HISTORY_CACHE_TTL_MS };
      return events;
    })
    .catch((err) => {
      console.error("[calendarService] Failed to fetch historical calendar events:", err);
      return [] as CalendarEvent[];
    })
    .finally(() => {
      _historyInFlight = null;
    });

  return _historyInFlight;
}

export function getLiveCalendarEvents(): Promise<CalendarEvent[]> {
  if (USE_FIXTURES) {
    _logFixturesNotice();
    if (!_cache) {
      _cache = { data: staticCalendarEvents, expiresAt: Date.now() + CACHE_TTL_MS };
      _lastFetchSucceeded = true;
    }
    return Promise.resolve(_cache.data);
  }

  if (_cache && Date.now() < _cache.expiresAt) return Promise.resolve(_cache.data);
  if (_inFlightPromise) return _inFlightPromise;
  if (_failedAt && Date.now() - _failedAt < FAILURE_COOLDOWN_MS) return Promise.resolve([]);

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 3);
  const to = new Date(now);
  to.setDate(to.getDate() + 11);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `/api/economic-calendar?from=${fmt(from)}&to=${fmt(to)}`;

  _inFlightPromise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error("Unexpected FMP response — expected array");
      const events = (data as FmpEconomicEvent[]).map(mapFmpEvent);
      _cache = { data: events, expiresAt: Date.now() + CACHE_TTL_MS };
      _failedAt = null;
      _lastFetchSucceeded = true;
      return events;
    })
    .catch((err) => {
      console.error("[calendarService] Failed to fetch live calendar events:", err);
      _failedAt = Date.now();
      _lastFetchSucceeded = false;
      return [] as CalendarEvent[];
    })
    .finally(() => {
      _inFlightPromise = null;
    });

  return _inFlightPromise;
}
