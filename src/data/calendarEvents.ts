export type CalendarImpact = "high" | "medium" | "low";

export type CalendarEvent = {
  id: string;
  eventKey: string;
  date: Date; // ✅ NEW (core upgrade)
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
const FUTURE_EVENT_COUNT = 6; // ✅ number of upcoming releases per event

// ----------------------------
// EVENT TEMPLATES
// ----------------------------
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
];

// ----------------------------
// HELPERS
// ----------------------------
function getRotationIndex(): number {
  const now = new Date();
  const utcDayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  return utcDayNumber % CALENDAR_ROTATION_DAYS;
}

function pickRotatingValue(values: string[], rotationIndex: number, offset = 0): string {
  if (!values.length) return "—";
  return values[(rotationIndex + offset) % values.length] ?? values[0];
}

function buildEventDate(time: string, offsetDays: number): Date {
  const [hours, minutes] = time.split(":").map(Number);

  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(hours || 0, minutes || 0, 0, 0);

  return date;
}

// ----------------------------
// MAIN BUILDER
// ----------------------------
function buildCalendarEvents(): CalendarEvent[] {
  const rotationIndex = getRotationIndex();
  const events: CalendarEvent[] = [];

  CALENDAR_EVENT_TEMPLATES.forEach((template, templateIndex) => {
    for (let i = 0; i < FUTURE_EVENT_COUNT; i++) {
      const eventDate = buildEventDate(template.time, i);

      events.push({
        id: `${template.eventKey}-${eventDate.getTime()}`, // ✅ unique per instance
        eventKey: template.eventKey,
        date: eventDate,
        time: template.time,
        currency: template.currency,
        event: template.event,
        impact: template.impact,
        previous: pickRotatingValue(template.previousValues, rotationIndex, templateIndex + i),
        forecast: pickRotatingValue(template.forecastValues, rotationIndex, templateIndex + i + 1),
        actual: i === 0 ? pickRotatingValue(template.actualValues, rotationIndex, templateIndex + i + 2) : "—", // future events not released yet
      });
    }
  });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ----------------------------
// EXPORTS
// ----------------------------
export const calendarEvents: CalendarEvent[] = buildCalendarEvents();

const KEY_EVENT_KEYS = new Set(["nfp", "ecb-rate", "boe-rate", "us-cpi", "us-core-cpi"]);

export const keyEvents = calendarEvents.filter((e) => KEY_EVENT_KEYS.has(e.eventKey));

export const impactRank: Record<CalendarImpact, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// ----------------------------
// HELPERS (USED BY APP)
// ----------------------------
export function getCalendarEventById(id: string) {
  return calendarEvents.find((e) => e.id === id);
}

export function getEventsByEventKey(eventKey: string) {
  return calendarEvents.filter((e) => e.eventKey === eventKey);
}

export function getNextEventByKey(eventKey: string) {
  const now = Date.now();
  return calendarEvents.find((e) => e.eventKey === eventKey && e.date.getTime() > now);
}

export function sortCalendarEventsByImpact(events: CalendarEvent[]) {
  return [...events].sort((a, b) => impactRank[b.impact] - impactRank[a.impact]);
}
