// Alert types and interfaces for the comprehensive alerts system

export type AlertType =
  | "session"
  | "news"
  | "bias"
  | "exposure"
  | "summary"
  | "timer"
  | "breaking"
  | "price"
  | "level"
  | "risk";

export type AlertSeverity = "info" | "warning" | "high";

export type AlertStatus = "pending" | "triggered";

export interface AlertItem {
  id: string;
  type: AlertType;
  title: string;
  message: string;

  /**
   * Created timestamp
   */
  timestamp: Date;

  read: boolean;
  severity: AlertSeverity;

  /**
   * Lifecycle state:
   * - pending   = scheduled but not yet fired
   * - triggered = already fired / active in inbox and notifications
   */
  status: AlertStatus;

  /**
   * When this alert is due to trigger.
   * Used for scheduled news/event alerts.
   */
  scheduledFor?: Date;

  /**
   * When the alert actually triggered.
   * For immediate alerts this is usually set to the same time as timestamp.
   */
  triggeredAt?: Date;

  relatedAsset?: string;

  // Click-through routing with deep-link support
  routeTo?: string;
  routeParams?: Record<string, string>;

  // Deep-link for calendar events
  eventId?: string;
}

// Custom Price Alert Types
export type PriceAlertTriggerType = "wick" | "close";
export type PriceAlertDirection = "above" | "below";
export type PriceAlertTimeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D" | "1W";

export interface PriceAlert {
  id: string;
  asset: string;
  assetDisplayName: string;
  direction: PriceAlertDirection;
  triggerType: PriceAlertTriggerType;
  price: number;
  timeframe?: PriceAlertTimeframe; // Required only for 'close' type
  enabled: boolean;
  triggered: boolean;
  triggeredAt?: Date;
  createdAt: Date;
  lastCheckedPrice?: number;
}

// Alert Preferences (extended)
export interface AlertPreferences {
  // Session alerts
  sessionReminders: boolean;
  sessionReminderOffsets: number[];
  sessionOverlaps: boolean;
  sessionStatus: boolean;

  // News alerts
  highImpactNews: boolean;
  eventSpecificNews: string[];
  breakingNews: boolean;
  postEventSummaries: boolean;

  // Bias alerts
  biasFlipAlerts: boolean;
  biasFlipTimeframes: ("H4" | "Daily")[];
  biasAlignmentAlerts: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;

  // Risk alerts
  preNewsExposure: boolean;
  lowLiquidity: boolean;

  // Delivery
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;

  // Sound
  soundEnabled: boolean;

  // Currency relevance
  relevantCurrencies: string[];
}

export const defaultAlertPreferences: AlertPreferences = {
  sessionReminders: true,
  sessionReminderOffsets: [15, 5],
  sessionOverlaps: true,
  sessionStatus: false,
  highImpactNews: true,
  eventSpecificNews: [],
  breakingNews: true,
  postEventSummaries: true,
  biasFlipAlerts: true,
  biasFlipTimeframes: ["H4", "Daily"],
  biasAlignmentAlerts: true,
  dailySummary: true,
  weeklySummary: false,
  preNewsExposure: true,
  lowLiquidity: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "06:00",
  soundEnabled: true,
  relevantCurrencies: ["USD", "EUR", "GBP"],
};
