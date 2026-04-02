export type CalendarImpact = "high" | "medium" | "low";

export type CalendarEvent = {
  id: string;
  eventKey: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  scheduledAt: string; // ISO string
  currency: string;
  event: string;
  previous: string;
  forecast: string;
  actual: string;
  impact: CalendarImpact;
};

type CalendarEventTemplate = {
  eventKey: string;
  currency: string;
  event: string;
  impact: CalendarImpact;
  time: string;
  recurrence: "monthly" | "weekly";
  previousValues: string[];
  forecastValues: string[];
  actualValues: string[];
};

const CALENDAR_EVENT_TEMPLATES: CalendarEventTemplate[] = [
  {
    eventKey: "nfp",
    currency: "USD",
    event: "Non-Farm Payrolls",
    impact: "high",
    time: "08:30",
    recurrence: "monthly",
    previousValues: ["180K", "187K", "201K", "176K", "192K", "205K"],
    forecastValues: ["190K", "195K", "198K", "185K", "200K", "210K"],
    actualValues: ["184K", "202K", "191K", "178K", "214K", "197K"],
  },
  {
    eventKey: "unemployment",
    currency: "USD",
    event: "Unemployment Rate",
    impact: "high",
    time: "08:30",
    recurrence: "monthly",
    previousValues: ["3.9%", "3.8%", "4.0%", "3.9%", "3.7%", "3.8%"],
    forecastValues: ["3.9%", "3.9%", "4.0%", "3.8%", "3.8%", "3.9%"],
    actualValues: ["3.8%", "4.0%", "3.9%", "3.8%", "3.7%", "3.9%"],
  },
  {
    eventKey: "german-factory-orders",
    currency: "EUR",
    event: "German Factory Orders",
    impact: "medium",
    time: "09:00",
    recurrence: "monthly",
    previousValues: ["-0.2%", "0.1%", "-0.4%", "0.3%", "-0.1%", "0.0%"],
    forecastValues: ["0.5%", "0.3%", "0.2%", "0.4%", "0.1%", "0.2%"],
    actualValues: ["0.4%", "0.2%", "-0.1%", "0.6%", "0.0%", "0.3%"],
  },
  {
    eventKey: "ecb-rate",
    currency: "EUR",
    event: "ECB Interest Rate Decision",
    impact: "high",
    time: "10:00",
    recurrence: "monthly",
    previousValues: ["4.50%", "4.50%", "4.25%", "4.25%", "4.00%", "4.00%"],
    forecastValues: ["4.50%", "4.25%", "4.25%", "4.00%", "4.00%", "3.75%"],
    actualValues: ["4.50%", "4.25%", "4.25%", "4.00%", "4.00%", "3.75%"],
  },
  {
    eventKey: "boe-rate",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    impact: "high",
    time: "14:00",
    recurrence: "monthly",
    previousValues: ["5.25%", "5.25%", "5.00%", "5.00%", "4.75%", "4.75%"],
    forecastValues: ["5.25%", "5.00%", "5.00%", "4.75%", "4.75%", "4.50%"],
    actualValues: ["5.25%", "5.00%", "5.00%", "4.75%", "4.75%", "4.50%"],
  },
  {
    eventKey: "us-cpi",
    currency: "USD",
    event: "US CPI",
    impact: "high",
    time: "14:30",
    recurrence: "monthly",
    previousValues: ["3.1%", "3.2%", "3.3%", "3.0%", "2.9%", "3.1%"],
    forecastValues: ["3.0%", "3.1%", "3.2%", "2.9%", "2.8%", "3.0%"],
    actualValues: ["3.2%", "3.0%", "3.1%", "2.8%", "2.9%", "3.3%"],
  },
  {
    eventKey: "us-core-cpi",
    currency: "USD",
    event: "US Core CPI",
    impact: "high",
    time: "15:00",
    recurrence: "monthly",
    previousValues: ["3.9%", "3.8%", "3.7%", "3.8%", "3.6%", "3.5%"],
    forecastValues: ["3.8%", "3.7%", "3.7%", "3.6%", "3.5%", "3.4%"],
    actualValues: ["3.9%", "3.6%", "3.8%", "3.5%", "3.4%", "3.6%"],
  },
  {
    eventKey: "uk-retail-sales",
    currency: "GBP",
    event: "UK Retail Sales",
    impact: "medium",
    time: "07:00",
    recurrence: "monthly",
    previousValues: ["0.3%", "-0.1%", "0.5%", "0.2%", "-0.2%", "0.4%"],
    forecastValues: ["0.2%", "0.1%", "0.3%", "0.2%", "0.0%", "0.2%"],
    actualValues: ["0.4%", "-0.2%", "0.6%", "0.1%", "0.1%", "0.3%"],
  },
  {
    eventKey: "jobless-claims",
    currency: "USD",
    event: "Initial Jobless Claims",
    impact: "medium",
    time: "13:30",
    recurrence: "weekly",
    previousValues: ["218K", "220K", "224K", "219K", "222K", "217K"],
    forecastValues: ["220K", "221K", "223K", "220K", "221K", "219K"],
    actualValues: ["216K", "226K", "221K", "218K", "224K", "220K"],
  },
  {
    eventKey: "us-services-pmi",
    currency: "USD",
    event: "US Services PMI",
    impact: "medium",
    time: "14:45",
    recurrence: "weekly",
    previousValues: ["52.8", "53.1", "52.4", "51.9", "52.2", "53.0"],
    forecastValues: ["53.0", "52.9", "52.6", "52.1", "52.4", "53.2"],
    actualValues: ["53.4", "52.5", "52.8", "51.8", "52.7", "53.1"],
  },
  {
    eventKey: "eia-crude",
    currency: "USD",
    event: "EIA Crude Oil Inventories",
    impact: "medium",
    time: "15:30",
    recurrence: "weekly",
    previousValues: ["-2.1M", "1.3M", "-0.8M", "2.4M", "-1.6M", "0.9M"],
    forecastValues: ["-1.2M", "0.5M", "-0.4M", "1.0M", "-0.9M", "0.2M"],
    actualValues: ["-0.7M", "1.8M", "-1.1M", "0.6M", "-1.4M", "0.4M"],
  },
  {
    eventKey: "boj-rate",
    currency: "JPY",
    event: "BOJ Interest Rate Decision",
    impact: "high",
    time: "03:00",
    recurrence: "monthly",
    previousValues: ["0.10%", "0.10%", "0.00%", "0.00%", "-0.10%", "-0.10%"],
    forecastValues: ["0.10%", "0.10%", "0.10%", "0.00%", "0.00%", "-0.10%"],
    actualValues: ["0.10%", "0.10%", "0.10%", "0.00%", "0.00%", "-0.10%"],
  },
];

const KEY_EVENT_KEYS = new Set(["nfp", "ecb-rate", "boe-rate", "us-cpi", "us-core-cpi"]);

export const impactRank: Record<CalendarImpact, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function formatDateToYMD(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDateAtTime(baseDate: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(baseDate);
  next.setHours(hours || 0, minutes || 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function pickRotatingValue(values: string[], index: number): string {
  if (values.length === 0) return "—";
  return values[index % values.length] ?? values[0] ?? "—";
}

function buildEventSeries(template: CalendarEventTemplate, now: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  if (template.recurrence === "weekly") {
    for (let weekOffset = -2; weekOffset <= 6; weekOffset += 1) {
      const eventDate = addDays(now, weekOffset * 7);
      const scheduled = createDateAtTime(eventDate, template.time);
      const seriesIndex = weekOffset + 10;

      events.push({
        id: `${template.eventKey}-${formatDateToYMD(scheduled)}`,
        eventKey: template.eventKey,
        date: formatDateToYMD(scheduled),
        time: template.time,
        scheduledAt: scheduled.toISOString(),
        currency: template.currency,
        event: template.event,
        previous: pickRotatingValue(template.previousValues, seriesIndex),
        forecast: pickRotatingValue(template.forecastValues, seriesIndex + 1),
        actual: scheduled.getTime() <= now.getTime() ? pickRotatingValue(template.actualValues, seriesIndex + 2) : "—",
        impact: template.impact,
      });
    }
  }

  if (template.recurrence === "monthly") {
    for (let monthOffset = -2; monthOffset <= 6; monthOffset += 1) {
      const monthBase = addMonths(now, monthOffset);
      const eventDate = new Date(
        monthBase.getFullYear(),
        monthBase.getMonth(),
        1 + (Math.abs(template.eventKey.length * 3) % 20),
      );
      const scheduled = createDateAtTime(eventDate, template.time);
      const seriesIndex = monthOffset + 10;

      events.push({
        id: `${template.eventKey}-${formatDateToYMD(scheduled)}`,
        eventKey: template.eventKey,
        date: formatDateToYMD(scheduled),
        time: template.time,
        scheduledAt: scheduled.toISOString(),
        currency: template.currency,
        event: template.event,
        previous: pickRotatingValue(template.previousValues, seriesIndex),
        forecast: pickRotatingValue(template.forecastValues, seriesIndex + 1),
        actual: scheduled.getTime() <= now.getTime() ? pickRotatingValue(template.actualValues, seriesIndex + 2) : "—",
        impact: template.impact,
      });
    }
  }

  return events;
}

function buildCalendarEvents(): CalendarEvent[] {
  const now = new Date();

  return CALENDAR_EVENT_TEMPLATES.flatMap((template) => buildEventSeries(template, now)).sort((a, b) => {
    const aTime = new Date(a.scheduledAt).getTime();
    const bTime = new Date(b.scheduledAt).getTime();
    return aTime - bTime;
  });
}

export const calendarEvents: CalendarEvent[] = buildCalendarEvents();

export const keyEvents: Array<
  Pick<CalendarEvent, "id" | "eventKey" | "date" | "time" | "scheduledAt" | "currency" | "event" | "impact">
> = calendarEvents
  .filter((event) => KEY_EVENT_KEYS.has(event.eventKey))
  .map((event) => ({
    id: event.id,
    eventKey: event.eventKey,
    date: event.date,
    time: event.time,
    scheduledAt: event.scheduledAt,
    currency: event.currency,
    event: event.event,
    impact: event.impact,
  }));

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
