import {
  calendarEvents,
  keyEvents,
  impactRank,
  getCalendarEventById,
  getCalendarEventByKey,
  getCalendarEventsByEventKey,
  getEventsByCurrency,
  sortCalendarEventsByImpact,
  type CalendarEvent,
  type CalendarImpact,
} from "@/data/calendarEvents";

export type CalendarDateRange = "today" | "week" | "month";
export type CalendarSortMode = "time" | "impact";

export type CalendarFilters = {
  dateRange?: CalendarDateRange;
  impact?: "all" | CalendarImpact;
  currency?: "all" | string;
  sortMode?: CalendarSortMode;
};

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function getEventDate(event: CalendarEvent): Date {
  return new Date(event.scheduledAt);
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
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

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function getAllCalendarEvents(): CalendarEvent[] {
  return [...calendarEvents];
}

export function getAvailableCalendarCurrencies(): string[] {
  return Array.from(new Set(calendarEvents.map((event) => event.currency))).sort();
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  filters: CalendarFilters = {},
): CalendarEvent[] {
  const {
    dateRange = "today",
    impact = "all",
    currency = "all",
    sortMode = "impact",
  } = filters;

  let next = [...events];

  if (impact !== "all") {
    next = next.filter((event) => event.impact === impact);
  }

  if (currency !== "all") {
    const normalized = currency.trim().toUpperCase();
    next = next.filter((event) => event.currency.toUpperCase() === normalized);
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekEnd = addDays(todayStart, 7);
  const monthEnd = addMonths(todayStart, 1);

  if (dateRange === "today") {
    next = next.filter((event) => {
      const eventDate = getEventDate(event);
      return isValidDate(eventDate) && isSameDay(eventDate, now);
    });
  }

  if (dateRange === "week") {
    next = next.filter((event) => {
      const eventDate = getEventDate(event);
      return isValidDate(eventDate) && eventDate >= todayStart && eventDate < weekEnd;
    });
  }

  if (dateRange === "month") {
    next = next.filter((event) => {
      const eventDate = getEventDate(event);
      return isValidDate(eventDate) && eventDate >= todayStart && eventDate < monthEnd;
    });
  }

  next.sort((a, b) => {
    const aDate = getEventDate(a);
    const bDate = getEventDate(b);

    if (sortMode === "impact") {
      const impactDiff = impactRank[b.impact] - impactRank[a.impact];
      if (impactDiff !== 0) return impactDiff;
    }

    const dateDiff = aDate.getTime() - bDate.getTime();
    if (dateDiff !== 0) return dateDiff;

    return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  });

  return next;
}

export function getFilteredCalendarEvents(filters: CalendarFilters = {}): CalendarEvent[] {
  return filterCalendarEvents(calendarEvents, filters);
}

export function getCalendarCounts(events: CalendarEvent[]) {
  return {
    total: events.length,
    high: events.filter((event) => event.impact === "high").length,
    medium: events.filter((event) => event.impact === "medium").length,
    low: events.filter((event) => event.impact === "low").length,
  };
}

export function getUpcomingCalendarEvents(limit = 5): CalendarEvent[] {
  const now = Date.now();

  return [...calendarEvents]
    .filter((event) => {
      const eventTime = getEventDate(event).getTime();
      return !Number.isNaN(eventTime);
    })
    .sort((a, b) => {
      const aDate = getEventDate(a);
      const bDate = getEventDate(b);

      const aUpcoming = aDate.getTime() >= now;
      const bUpcoming = bDate.getTime() >= now;

      if (aUpcoming !== bUpcoming) {
        return aUpcoming ? -1 : 1;
      }

      const impactDiff = impactRank[b.impact] - impactRank[a.impact];
      if (impactDiff !== 0) return impactDiff;

      const aDistance = Math.abs(aDate.getTime() - now);
      const bDistance = Math.abs(bDate.getTime() - now);
      return aDistance - bDistance;
    })
    .slice(0, limit);
}

export function getUpcomingEventsByEventKey(eventKey: string): CalendarEvent[] {
  const now = Date.now();

  return calendarEvents
    .filter((event) => event.eventKey === eventKey)
    .filter((event) => {
      const eventTime = getEventDate(event).getTime();
      return !Number.isNaN(eventTime) && eventTime >= now;
    })
    .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime());
}

export function getNextEventByEventKey(eventKey: string): CalendarEvent | undefined {
  return getUpcomingEventsByEventKey(eventKey)[0];
}

export function getFilteredKeyEvents(filters: CalendarFilters = {}, limit = 4): CalendarEvent[] {
  const keyIds = new Set(keyEvents.map((event) => event.id));

  return filterCalendarEvents(
    calendarEvents.filter((event) => keyIds.has(event.id)),
    filters,
  ).slice(0, limit);
}

export function getNextKeyEvents(limit = 4): CalendarEvent[] {
  const now = Date.now();

  const nextPerKey = Array.from(new Set(keyEvents.map((event) => event.eventKey)))
    .map((eventKey) => getNextEventByEventKey(eventKey))
    .filter((event): event is CalendarEvent => Boolean(event));

  return nextPerKey
    .sort((a, b) => {
      const aUpcoming = getEventDate(a).getTime() >= now;
      const bUpcoming = getEventDate(b).getTime() >= now;

      if (aUpcoming !== bUpcoming) {
        return aUpcoming ? -1 : 1;
      }

      const impactDiff = impactRank[b.impact] - impactRank[a.impact];
      if (impactDiff !== 0) return impactDiff;

      return getEventDate(a).getTime() - getEventDate(b).getTime();
    })
    .slice(0, limit);
}

export function getEventDateLabel(event: CalendarEvent): string {
  const date = getEventDate(event);
  if (!isValidDate(date)) return event.date;

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
}

export function getEventTimeLabel(event: CalendarEvent): string {
  return event.time;
}

export function getEventDateTime(event: CalendarEvent): Date {
  return getEventDate(event);
}

export function getCalendarEventOrNullById(id: string): CalendarEvent | null {
  return getCalendarEventById(id) ?? null;
}

export function getCalendarEventOrNullByKey(eventKey: string): CalendarEvent | null {
  return getCalendarEventByKey(eventKey) ?? null;
}

export {
  getCalendarEventById,
  getCalendarEventByKey,
  getCalendarEventsByEventKey,
  getEventsByCurrency,
  sortCalendarEventsByImpact,
};
