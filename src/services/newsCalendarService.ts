// src/services/newsCalendarService.ts

export type ImpactLevel = "low" | "medium" | "high";

export interface CalendarEvent {
  id: string;
  event: string;
  currency: string;
  time: string;
  date: string;
  impact: ImpactLevel;
  forecast: number;
  previous: number;
  actual: number;
}

const BASE_EVENTS: Omit<CalendarEvent, "actual">[] = [
  {
    id: "1",
    event: "US CPI (YoY)",
    currency: "USD",
    time: "13:30",
    date: "2025-01-01",
    impact: "high",
    forecast: 3.2,
    previous: 3.1,
  },
  {
    id: "2",
    event: "ECB Interest Rate Decision",
    currency: "EUR",
    time: "13:15",
    date: "2025-01-02",
    impact: "high",
    forecast: 4.5,
    previous: 4.5,
  },
  {
    id: "3",
    event: "UK GDP (MoM)",
    currency: "GBP",
    time: "07:00",
    date: "2025-01-03",
    impact: "medium",
    forecast: 0.2,
    previous: 0.1,
  },
  {
    id: "4",
    event: "US Non-Farm Payrolls",
    currency: "USD",
    time: "13:30",
    date: "2025-01-04",
    impact: "high",
    forecast: 180,
    previous: 210,
  },
  {
    id: "5",
    event: "BOE Interest Rate Decision",
    currency: "GBP",
    time: "12:00",
    date: "2025-01-05",
    impact: "high",
    forecast: 5.25,
    previous: 5.25,
  },
];

function randomizeActual(forecast: number): number {
  const variance = forecast * 0.1;
  const random = (Math.random() - 0.5) * 2 * variance;
  return parseFloat((forecast + random).toFixed(2));
}

function generateEvents(): CalendarEvent[] {
  return BASE_EVENTS.map((event) => ({
    ...event,
    actual: randomizeActual(event.forecast),
  }));
}

export const newsCalendarService = {
  getAllEvents(): CalendarEvent[] {
    return generateEvents();
  },

  getTodayEvents(): CalendarEvent[] {
    return generateEvents().slice(0, 3);
  },

  getHighImpactEvents(): CalendarEvent[] {
    return generateEvents().filter((e) => e.impact === "high");
  },

  getEventsByCurrency(currency: string): CalendarEvent[] {
    return generateEvents().filter((e) => e.currency === currency);
  },

  getEventById(id: string): CalendarEvent | undefined {
    return generateEvents().find((e) => e.id === id);
  },
};
