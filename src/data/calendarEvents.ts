export type CalendarEvent = {
  id: string;
  time: string;
  currency: string;
  event: string;
  previous: string;
  forecast: string;
  actual: string;
  impact: "high" | "medium" | "low";
};

/**
 * Key Events (cards at the top of Calendar)
 * Keep this as a lightweight subset of calendarEvents by ID.
 */
export const keyEvents: Array<Pick<CalendarEvent, "id" | "time" | "currency" | "event" | "impact">> = [
  { id: "nfp-2025-01", time: "08:30", currency: "USD", event: "Non-Farm Payrolls", impact: "high" },
  { id: "ecb-rate-2025-01", time: "10:00", currency: "EUR", event: "ECB Interest Rate Decision", impact: "high" },
  { id: "boe-rate-2025-01", time: "14:00", currency: "GBP", event: "BOE Interest Rate Decision", impact: "high" },
  { id: "us-cpi-2025-01", time: "14:30", currency: "USD", event: "US CPI", impact: "high" },
];

/**
 * Full Calendar Events (table + modal)
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

  /**
   * Optional (used by AssetDetail mapping for "Core CPI (USD)")
   * If you don’t want this yet, we can remove the mapping instead — but this keeps it working.
   */
  {
    id: "us-core-cpi-2025-01",
    time: "15:00",
    currency: "USD",
    event: "Core CPI (USD)",
    previous: "3.9%",
    forecast: "3.8%",
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
];
