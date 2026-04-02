export type CalendarImpact = "high" | "medium" | "low";

export type CalendarEvent = {
  id: string;
  eventKey: string;
  date: string;
  time: string;
  scheduledAt: string;
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
    eventKey: "ecb-rate",
    currency: "EUR",
    event: "ECB Interest Rate Decision",
    impact: "high",
    time: "10:00",
    recurrence: "monthly",
    previousValues: ["4.50%", "4.25%", "4.00%"],
    forecastValues: ["4.25%", "4.00%", "3.75%"],
    actualValues: ["4.25%", "4.00%", "3.75%"],
  },
  {
    eventKey: "boe-rate",
    currency: "GBP",
    event: "BOE Interest Rate Decision",
    impact: "high",
    time: "14:00",
    recurrence: "monthly",
    previousValues: ["5.25%", "5.00%", "4.75%"],
    forecastValues: ["5.00%", "4.75%", "4.50%"],
    actualValues: ["5.00%", "4.75%", "4.50%"],
  },
  {
    eventKey: "us-cpi",
    currency: "USD",
    event: "US CPI",
    impact: "high",
    time: "14:30",
    recurrence: "monthly",
    previousValues: ["3.1%", "3.2%", "3.3%"],
    forecastValues: ["3.0%", "3.1%", "3.2%"],
    actualValues: ["3.2%", "3.0%", "3.1%"],
  },
  {
    eventKey: "jobless-claims",
    currency: "USD",
    event: "Initial Jobless Claims",
    impact: "medium",
    time: "13:30",
    recurrence: "weekly",
    previousValues: ["218K", "220K", "224K"],
    forecastValues: ["220K", "221K", "223K"],
    actualValues: ["216K", "226K", "221K"],
  },
];

const KEY_EVENT_KEYS = new Set(["nfp", "ecb-rate", "boe-rate", "us-cpi"]);

export const impactRank: Record<CalendarImpact, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function createEventDate(base: Date, time: string) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function pick(values: string[], i: number) {
  return values[i % values.length] ?? "—";
}

/**
 * 🔥 KEY FIX: ALWAYS INCLUDE TODAY EVENTS
 */
function buildCalendarEvents(): CalendarEvent[] {
  const now = new Date();

  const events: CalendarEvent[] = [];

  CALENDAR_EVENT_TEMPLATES.forEach((template, idx) => {
    // ✅ TODAY EVENT (CRITICAL FIX)
    const todayEventDate = createEventDate(now, template.time);

    events.push({
      id: `${template.eventKey}-today`,
      eventKey: template.eventKey,
      date: formatDate(todayEventDate),
      time: template.time,
      scheduledAt: todayEventDate.toISOString(),
      currency: template.currency,
      event: template.event,
      previous: pick(template.previousValues, idx),
      forecast: pick(template.forecastValues, idx + 1),
      actual: "—",
      impact: template.impact,
    });

    // ✅ FUTURE EVENTS
    for (let i = 1; i <= 5; i++) {
      const futureDate = new Date(now);

      if (template.recurrence === "weekly") {
        futureDate.setDate(now.getDate() + i * 7);
      } else {
        futureDate.setMonth(now.getMonth() + i);
      }

      const scheduled = createEventDate(futureDate, template.time);

      events.push({
        id: `${template.eventKey}-${i}`,
        eventKey: template.eventKey,
        date: formatDate(scheduled),
        time: template.time,
        scheduledAt: scheduled.toISOString(),
        currency: template.currency,
        event: template.event,
        previous: pick(template.previousValues, i),
        forecast: pick(template.forecastValues, i + 1),
        actual: "—",
        impact: template.impact,
      });
    }
  });

  return events.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export const calendarEvents = buildCalendarEvents();

export const keyEvents = calendarEvents.filter((e) => KEY_EVENT_KEYS.has(e.eventKey));

export function getCalendarEventById(id: string) {
  return calendarEvents.find((e) => e.id === id);
}
