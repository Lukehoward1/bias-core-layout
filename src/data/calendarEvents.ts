export type CalendarImpact = "high" | "medium" | "low";

export type CalendarEvent = {
  id: string;
  time: string;
  currency: string;
  event: string;
  previous: string;
  forecast: string;
  actual: string;
  impact: CalendarImpact;
};

/**
 * Full calendar event source of truth.
 * Used by:
 * - Calendar page table
 * - EventDetailsModal
 * - AssetDetail event matching
 * - Alerts / Top News ranking
 */
export const calendarEvents: CalendarEvent[] = [
  {
    id: "nfp-2025-01",
    time: "08:30",
    currency: "USD",
    event: "Non-Farm Payrolls",
    previous: "180K",
    forecast: "190K",
    actual: "—",
    impact: "high",
  },
  {
    id: "unemployment-2025-01",
    time: "08:30",
    currency: "USD",
    event: "Unemployment Rate",
    previous: "3.9%",
    forecast: "3.9%",
    actual: "—",
    impact: "high",
  },
  {
    id: "german-factory-2025-01",
    time: "09:00",
    currency: "EUR",
    event: "German Factory Orders",
    previous: "-0.2%",
    forecast: "0.5%",
    actual: "—",
    impact: "medium",
  },
  {
    id: "ecb-rate-2025-01",
    time: "10:00",
    currency: "EUR",
    event: "ECB Interest Rate Decision",
    previous: "4.50%",
    forecast: "4.50%",
    actual: "—",
    impact: "high",
  },
  {
    id: "boe-rate-2025-01",
    time: "14:00",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    previous: "5.25%",
    forecast: "5.25%",
    actual: "—",
    impact: "high",
  },
  {
    id: "us-cpi-2025-01",
    time: "14:30",
    currency: "USD",
    event: "US CPI",
    previous: "3.1%",
    forecast: "3.0%",
    actual: "—",
    impact: "high",
  },
  {
    id: "us-core-cpi-2025-01",
    time: "15:00",
    currency: "USD",
    event: "US Core CPI",
    previous: "3.9%",
    forecast: "3.8%",
    actual: "—",
    impact: "high",
  },
];

/**
 * Lightweight subset for key event cards / highlight areas.
 * Keep these IDs aligned with calendarEvents above.
 */
export const keyEvents: Array<Pick<CalendarEvent, "id" | "time" | "currency" | "event" | "impact">> = [
  {
    id: "nfp-2025-01",
    time: "08:30",
    currency: "USD",
    event: "Non-Farm Payrolls",
    impact: "high",
  },
  {
    id: "ecb-rate-2025-01",
    time: "10:00",
    currency: "EUR",
    event: "ECB Interest Rate Decision",
    impact: "high",
  },
  {
    id: "boe-rate-2025-01",
    time: "14:00",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    impact: "high",
  },
  {
    id: "us-cpi-2025-01",
    time: "14:30",
    currency: "USD",
    event: "US CPI",
    impact: "high",
  },
  {
    id: "us-core-cpi-2025-01",
    time: "15:00",
    currency: "USD",
    event: "US Core CPI",
    impact: "high",
  },
];

/**
 * Optional helpers for shared ranking / filtering logic.
 * These are useful for Alerts, Calendar, Markets, and AssetDetail.
 */
export const impactRank: Record<CalendarImpact, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function getEventsByCurrency(currency: string): CalendarEvent[] {
  const norm = currency.trim().toUpperCase();
  return calendarEvents.filter((event) => event.currency.toUpperCase() === norm);
}

export function getKeyEvents(): CalendarEvent[] {
  const keyIds = new Set(keyEvents.map((event) => event.id));
  return calendarEvents.filter((event) => keyIds.has(event.id));
}

export function getCalendarEventById(id: string): CalendarEvent | undefined {
  return calendarEvents.find((event) => event.id === id);
}

export function sortCalendarEventsByImpact(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => impactRank[b.impact] - impactRank[a.impact]);
}
