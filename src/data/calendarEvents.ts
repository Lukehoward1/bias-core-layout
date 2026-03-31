export type CalendarImpact = "high" | "medium" | "low";

export type CalendarEvent = {
  id: string;
  eventKey: string;
  time: string;
  currency: string;
  event: string;
  previous: string;
  forecast: string;
  actual: string;
  impact: CalendarImpact;
};

type CalendarEventTemplate = {
  eventKey: string;
  time: string;
  currency: string;
  event: string;
  impact: CalendarImpact;
  previousValues: string[];
  forecastValues: string[];
  actualValues: string[];
};

const CALENDAR_ROTATION_DAYS = 30;

const CALENDAR_EVENT_TEMPLATES: CalendarEventTemplate[] = [
  {
    eventKey: "nfp",
    time: "08:30",
    currency: "USD",
    event: "Non-Farm Payrolls",
    impact: "high",
    previousValues: ["180K", "187K", "201K", "176K", "192K", "205K"],
    forecastValues: ["190K", "195K", "198K", "185K", "200K", "210K"],
    actualValues: ["184K", "202K", "191K", "178K", "214K", "197K"],
  },
  {
    eventKey: "unemployment",
    time: "08:30",
    currency: "USD",
    event: "Unemployment Rate",
    impact: "high",
    previousValues: ["3.9%", "3.8%", "4.0%", "3.9%", "3.7%", "3.8%"],
    forecastValues: ["3.9%", "3.9%", "4.0%", "3.8%", "3.8%", "3.9%"],
    actualValues: ["3.8%", "4.0%", "3.9%", "3.8%", "3.7%", "3.9%"],
  },
  {
    eventKey: "german-factory-orders",
    time: "09:00",
    currency: "EUR",
    event: "German Factory Orders",
    impact: "medium",
    previousValues: ["-0.2%", "0.1%", "-0.4%", "0.3%", "-0.1%", "0.0%"],
    forecastValues: ["0.5%", "0.3%", "0.2%", "0.4%", "0.1%", "0.2%"],
    actualValues: ["0.4%", "0.2%", "-0.1%", "0.6%", "0.0%", "0.3%"],
  },
  {
    eventKey: "ecb-rate",
    time: "10:00",
    currency: "EUR",
    event: "ECB Interest Rate Decision",
    impact: "high",
    previousValues: ["4.50%", "4.50%", "4.25%", "4.25%", "4.00%", "4.00%"],
    forecastValues: ["4.50%", "4.25%", "4.25%", "4.00%", "4.00%", "3.75%"],
    actualValues: ["4.50%", "4.25%", "4.25%", "4.00%", "4.00%", "3.75%"],
  },
  {
    eventKey: "boe-rate",
    time: "14:00",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    impact: "high",
    previousValues: ["5.25%", "5.25%", "5.00%", "5.00%", "4.75%", "4.75%"],
    forecastValues: ["5.25%", "5.00%", "5.00%", "4.75%", "4.75%", "4.50%"],
    actualValues: ["5.25%", "5.00%", "5.00%", "4.75%", "4.75%", "4.50%"],
  },
  {
    eventKey: "us-cpi",
    time: "14:30",
    currency: "USD",
    event: "US CPI",
    impact: "high",
    previousValues: ["3.1%", "3.2%", "3.3%", "3.0%", "2.9%", "3.1%"],
    forecastValues: ["3.0%", "3.1%", "3.2%", "2.9%", "2.8%", "3.0%"],
    actualValues: ["3.2%", "3.0%", "3.1%", "2.8%", "2.9%", "3.3%"],
  },
  {
    eventKey: "us-core-cpi",
    time: "15:00",
    currency: "USD",
    event: "US Core CPI",
    impact: "high",
    previousValues: ["3.9%", "3.8%", "3.7%", "3.8%", "3.6%", "3.5%"],
    forecastValues: ["3.8%", "3.7%", "3.7%", "3.6%", "3.5%", "3.4%"],
    actualValues: ["3.9%", "3.6%", "3.8%", "3.5%", "3.4%", "3.6%"],
  },
  {
    eventKey: "uk-retail-sales",
    time: "07:00",
    currency: "GBP",
    event: "UK Retail Sales",
    impact: "medium",
    previousValues: ["0.3%", "-0.1%", "0.5%", "0.2%", "-0.2%", "0.4%"],
    forecastValues: ["0.2%", "0.1%", "0.3%", "0.2%", "0.0%", "0.2%"],
    actualValues: ["0.4%", "-0.2%", "0.6%", "0.1%", "0.1%", "0.3%"],
  },
  {
    eventKey: "jobless-claims",
    time: "13:30",
    currency: "USD",
    event: "Initial Jobless Claims",
    impact: "medium",
    previousValues: ["218K", "220K", "224K", "219K", "222K", "217K"],
    forecastValues: ["220K", "221K", "223K", "220K", "221K", "219K"],
    actualValues: ["216K", "226K", "221K", "218K", "224K", "220K"],
  },
  {
    eventKey: "us-services-pmi",
    time: "14:45",
    currency: "USD",
    event: "US Services PMI",
    impact: "medium",
    previousValues: ["52.8", "53.1", "52.4", "51.9", "52.2", "53.0"],
    forecastValues: ["53.0", "52.9", "52.6", "52.1", "52.4", "53.2"],
    actualValues: ["53.4", "52.5", "52.8", "51.8", "52.7", "53.1"],
  },
  {
    eventKey: "eia-crude",
    time: "15:30",
    currency: "USD",
    event: "EIA Crude Oil Inventories",
    impact: "medium",
    previousValues: ["-2.1M", "1.3M", "-0.8M", "2.4M", "-1.6M", "0.9M"],
    forecastValues: ["-1.2M", "0.5M", "-0.4M", "1.0M", "-0.9M", "0.2M"],
    actualValues: ["-0.7M", "1.8M", "-1.1M", "0.6M", "-1.4M", "0.4M"],
  },
  {
    eventKey: "boj-rate",
    time: "03:00",
    currency: "JPY",
    event: "BOJ Interest Rate Decision",
    impact: "high",
    previousValues: ["0.10%", "0.10%", "0.00%", "0.00%", "-0.10%", "-0.10%"],
    forecastValues: ["0.10%", "0.10%", "0.10%", "0.00%", "0.00%", "-0.10%"],
    actualValues: ["0.10%", "0.10%", "0.10%", "0.00%", "0.00%", "-0.10%"],
  },
];

function getRotationIndex(): number {
  const now = new Date();
  const utcDayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  return utcDayNumber % CALENDAR_ROTATION_DAYS;
}

function pickRotatingValue(values: string[], rotationIndex: number, offset = 0): string {
  if (values.length === 0) return "—";
  return values[(rotationIndex + offset) % values.length] ?? values[0] ?? "—";
}

function buildCalendarEvents(): CalendarEvent[] {
  const rotationIndex = getRotationIndex();

  return CALENDAR_EVENT_TEMPLATES.map((template, idx) => ({
    id: `${template.eventKey}-demo-${rotationIndex}`,
    eventKey: template.eventKey,
    time: template.time,
    currency: template.currency,
    event: template.event,
    impact: template.impact,
    previous: pickRotatingValue(template.previousValues, rotationIndex, idx),
    forecast: pickRotatingValue(template.forecastValues, rotationIndex, idx + 1),
    actual: pickRotatingValue(template.actualValues, rotationIndex, idx + 2),
  }));
}

export const calendarEvents: CalendarEvent[] = buildCalendarEvents();

const KEY_EVENT_KEYS = new Set(["nfp", "ecb-rate", "boe-rate", "us-cpi", "us-core-cpi"]);

export const keyEvents: Array<Pick<CalendarEvent, "id" | "eventKey" | "time" | "currency" | "event" | "impact">> =
  calendarEvents
    .filter((event) => KEY_EVENT_KEYS.has(event.eventKey))
    .map((event) => ({
      id: event.id,
      eventKey: event.eventKey,
      time: event.time,
      currency: event.currency,
      event: event.event,
      impact: event.impact,
    }));

export const impactRank: Record<CalendarImpact, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function getEventsByCurrency(currency: string): CalendarEvent[] {
  const normalized = currency.trim().toUpperCase();
  return calendarEvents.filter((event) => event.currency.toUpperCase() === normalized);
}

export function getKeyEvents(): CalendarEvent[] {
  const keyIds = new Set(keyEvents.map((event) => event.id));
  return calendarEvents.filter((event) => keyIds.has(event.id));
}

export function getCalendarEventById(id: string): CalendarEvent | undefined {
  return calendarEvents.find((event) => event.id === id);
}

export function getCalendarEventByKey(eventKey: string): CalendarEvent | undefined {
  return calendarEvents.find((event) => event.eventKey === eventKey);
}

export function getCalendarEventsByEventKey(eventKey: string): CalendarEvent[] {
  return calendarEvents.filter((event) => event.eventKey === eventKey);
}

export function sortCalendarEventsByImpact(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => impactRank[b.impact] - impactRank[a.impact]);
}
