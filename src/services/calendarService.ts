// src/services/calendarService.ts
// Live economic calendar data from Financial Modeling Prep.
// Caches for 30 minutes; falls back to empty array on any failure
// so calendarData.ts can use static events instead.

import type { CalendarEvent, CalendarImpact } from "@/data/calendarEvents";

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

const CACHE_TTL_MS = 30 * 60 * 1000;      // 30 minutes
const FAILURE_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

let _cache: { data: CalendarEvent[]; expiresAt: number } | null = null;
let _inFlightPromise: Promise<CalendarEvent[]> | null = null;
let _failedAt: number | null = null;

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

export function getLiveCalendarEvents(): Promise<CalendarEvent[]> {
  if (_cache && Date.now() < _cache.expiresAt) return Promise.resolve(_cache.data);
  if (_inFlightPromise) return _inFlightPromise;
  if (_failedAt && Date.now() - _failedAt < FAILURE_COOLDOWN_MS) return Promise.resolve([]);

  const apiKey = import.meta.env.VITE_FMP_API_KEY;
  if (!apiKey) {
    console.warn("[calendarService] VITE_FMP_API_KEY is not set — falling back to static calendar data");
    return Promise.resolve([]);
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 3);
  const to = new Date(now);
  to.setDate(to.getDate() + 11);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url =
    `https://financialmodelingprep.com/api/v3/economic_calendar` +
    `?from=${fmt(from)}&to=${fmt(to)}&apikey=${apiKey}`;

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
      return events;
    })
    .catch((err) => {
      console.error("[calendarService] Failed to fetch live calendar events:", err);
      _failedAt = Date.now();
      return [] as CalendarEvent[];
    })
    .finally(() => {
      _inFlightPromise = null;
    });

  return _inFlightPromise;
}
