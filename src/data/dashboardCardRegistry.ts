/**
 * Scoped Dashboard Card Registry
 * 
 * IMPORTANT: Only cards from APPROVED sections may be added to the Dashboard.
 * 
 * APPROVED SECTIONS:
 * - Journal
 * - Risk Tools
 * - Alerts
 * - Calendar
 * - Watchlist (Markets - Watchlist ONLY)
 * - Reports
 * 
 * EXCLUDED SECTIONS (never add cards from):
 * - Strategy Tester
 * - Education
 * - Brokerage / Broker Discovery
 * - Community
 * - Marketing / Onboarding / Upsell
 */

import type { RowType } from '@/hooks/use-dashboard-layout';

export type DashboardSection = 
  | 'journal' 
  | 'risk-tools' 
  | 'alerts' 
  | 'calendar' 
  | 'watchlist' 
  | 'reports';

export type DashboardVariant = 'summary' | 'compact' | 'full';

export interface DashboardCardDefinition {
  cardId: string;
  title: string;
  description: string;
  sourceSection: DashboardSection;
  dashboardEligible: true; // Only eligible cards are in this registry
  supportedRowTypes: RowType[];
  dashboardVariant: DashboardVariant;
  isKpiCard?: boolean; // For fixed KPI row cards
}

// Section display configuration
export const SECTION_CONFIG: Record<DashboardSection, { label: string; order: number }> = {
  'journal': { label: 'Journal', order: 1 },
  'risk-tools': { label: 'Risk Tools', order: 2 },
  'alerts': { label: 'Alerts', order: 3 },
  'calendar': { label: 'Calendar', order: 4 },
  'watchlist': { label: 'Watchlist', order: 5 },
  'reports': { label: 'Reports & Analytics', order: 6 },
};

/**
 * SCOPED CARD REGISTRY
 * Only cards from approved sections are included here.
 * This is the single source of truth for dashboard-eligible cards.
 */
export const DASHBOARD_CARD_REGISTRY: DashboardCardDefinition[] = [
  // ════════════════════════════════════════════
  // JOURNAL CARDS
  // ════════════════════════════════════════════
  {
    cardId: 'journal-equity-curve',
    title: 'Equity Curve',
    description: 'Visual representation of account growth over time',
    sourceSection: 'journal',
    dashboardEligible: true,
    supportedRowTypes: ['hero', 'wide-narrow', 'equal'],
    dashboardVariant: 'summary',
  },
  {
    cardId: 'journal-total-trades',
    title: 'Total Trades',
    description: 'Count of all recorded trades',
    sourceSection: 'journal',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },
  {
    cardId: 'journal-win-rate',
    title: 'Win Rate',
    description: 'Percentage of winning trades',
    sourceSection: 'journal',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },
  {
    cardId: 'journal-total-pnl',
    title: 'Total P&L',
    description: 'Cumulative profit and loss',
    sourceSection: 'journal',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },
  {
    cardId: 'journal-avg-rr',
    title: 'Average R:R',
    description: 'Average risk-to-reward ratio',
    sourceSection: 'journal',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },
  {
    cardId: 'journal-daily-performance',
    title: 'Daily Performance',
    description: 'Current week trading performance (5 days)',
    sourceSection: 'journal',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'wide-narrow', 'three-equal'],
    dashboardVariant: 'summary',
  },

  // ════════════════════════════════════════════
  // RISK TOOLS CARDS
  // ════════════════════════════════════════════
  {
    cardId: 'risk-quick-calculator',
    title: 'Quick Calculator',
    description: 'Embedded position size calculator',
    sourceSection: 'risk-tools',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'wide-narrow', 'three-equal'],
    dashboardVariant: 'compact',
  },

  // ════════════════════════════════════════════
  // ALERTS CARDS
  // ════════════════════════════════════════════
  {
    cardId: 'todays-bias',
    title: "Today's Bias",
    description: 'Current market bias direction',
    sourceSection: 'alerts',
    dashboardEligible: true,
    supportedRowTypes: ['kpi'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },
  {
    cardId: 'alerts-top-news',
    title: 'Top News',
    description: 'Latest high-impact news items',
    sourceSection: 'alerts',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'wide-narrow', 'hero'],
    dashboardVariant: 'summary',
  },
  {
    cardId: 'alerts-feed',
    title: 'High Impact Alerts',
    description: 'Active high-impact alert feed',
    sourceSection: 'alerts',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'wide-narrow', 'three-equal'],
    dashboardVariant: 'summary',
  },
  {
    cardId: 'session-timers',
    title: 'Session Timers',
    description: 'All trading session countdowns',
    sourceSection: 'alerts',
    dashboardEligible: true,
    supportedRowTypes: ['wide-narrow', 'equal', 'hero', 'three-equal'],
    dashboardVariant: 'full',
  },
  {
    cardId: 'next-session',
    title: 'Next Session',
    description: 'Upcoming trading session timer',
    sourceSection: 'alerts',
    dashboardEligible: true,
    supportedRowTypes: ['kpi'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },
  {
    cardId: 'high-impact-events',
    title: 'High Impact Events',
    description: 'Important economic events today',
    sourceSection: 'alerts',
    dashboardEligible: true,
    supportedRowTypes: ['kpi'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },

  // ════════════════════════════════════════════
  // CALENDAR CARDS
  // ════════════════════════════════════════════
  {
    cardId: 'upcoming-events',
    title: 'Upcoming Events',
    description: 'Calendar of upcoming economic events',
    sourceSection: 'calendar',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardVariant: 'summary',
  },
  {
    cardId: 'calendar-week-preview',
    title: 'Week Ahead',
    description: 'Week ahead calendar preview',
    sourceSection: 'calendar',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'hero'],
    dashboardVariant: 'summary',
  },

  // ════════════════════════════════════════════
  // WATCHLIST CARDS (Markets - Watchlist ONLY)
  // ════════════════════════════════════════════
  {
    cardId: 'watchlist-overview',
    title: 'Watchlist Overview',
    description: 'Your watchlist with key levels',
    sourceSection: 'watchlist',
    dashboardEligible: true,
    supportedRowTypes: ['wide-narrow', 'equal', 'hero'],
    dashboardVariant: 'full',
  },

  // ════════════════════════════════════════════
  // REPORTS & ANALYTICS CARDS
  // ════════════════════════════════════════════
  // Overview
  {
    cardId: 'reports-best-day',
    title: 'Best Winning Day',
    description: 'Your highest single-day profit',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal', 'three-equal'],
    dashboardVariant: 'compact',
  },
  {
    cardId: 'reports-worst-day',
    title: 'Worst Losing Day',
    description: 'Your largest single-day loss',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal', 'three-equal'],
    dashboardVariant: 'compact',
  },
  {
    cardId: 'reports-total-pnl',
    title: 'Total P&L (Reports)',
    description: 'Cumulative profit from reports',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal'],
    dashboardVariant: 'compact',
  },
  {
    cardId: 'reports-avg-rr',
    title: 'Avg R:R (Reports)',
    description: 'Average risk-reward from analytics',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal'],
    dashboardVariant: 'compact',
  },
  {
    cardId: 'reports-win-rate',
    title: 'Win Rate (Reports)',
    description: 'Win rate from analytics',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal'],
    dashboardVariant: 'compact',
  },
  {
    cardId: 'reports-expectancy',
    title: 'Expectancy',
    description: 'Expected value per trade',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['kpi', 'four-equal', 'three-equal'],
    dashboardVariant: 'compact',
  },
  // Performance
  {
    cardId: 'performance-overview',
    title: 'Performance Overview',
    description: 'Trading performance summary',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardVariant: 'summary',
  },
  {
    cardId: 'performance-by-session',
    title: 'Performance by Session',
    description: 'Breakdown by trading session',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'three-equal'],
    dashboardVariant: 'compact',
  },
  {
    cardId: 'performance-by-asset',
    title: 'Performance by Asset',
    description: 'Breakdown by traded asset',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['equal', 'three-equal'],
    dashboardVariant: 'compact',
  },
  {
    cardId: 'active-trades',
    title: 'Active Trades',
    description: 'Current open positions',
    sourceSection: 'reports',
    dashboardEligible: true,
    supportedRowTypes: ['kpi'],
    dashboardVariant: 'compact',
    isKpiCard: true,
  },
];

// ════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════

/**
 * Get all cards from the registry
 */
export function getAllDashboardCards(): DashboardCardDefinition[] {
  return DASHBOARD_CARD_REGISTRY;
}

/**
 * Get cards by section
 */
export function getCardsBySection(section: DashboardSection): DashboardCardDefinition[] {
  return DASHBOARD_CARD_REGISTRY.filter(card => card.sourceSection === section);
}

/**
 * Get a specific card by ID
 */
export function getCardById(cardId: string): DashboardCardDefinition | undefined {
  return DASHBOARD_CARD_REGISTRY.find(card => card.cardId === cardId);
}

/**
 * Get cards grouped by section (for the Add Cards modal)
 */
export function getCardsGroupedBySection(): Record<DashboardSection, DashboardCardDefinition[]> {
  const grouped: Record<DashboardSection, DashboardCardDefinition[]> = {
    'journal': [],
    'risk-tools': [],
    'alerts': [],
    'calendar': [],
    'watchlist': [],
    'reports': [],
  };

  DASHBOARD_CARD_REGISTRY.forEach(card => {
    grouped[card.sourceSection].push(card);
  });

  return grouped;
}

/**
 * Get only KPI-compatible cards
 */
export function getKpiCards(): DashboardCardDefinition[] {
  return DASHBOARD_CARD_REGISTRY.filter(card => card.isKpiCard);
}

/**
 * Get cards that support a specific row type
 */
export function getCardsForRowType(rowType: RowType): DashboardCardDefinition[] {
  return DASHBOARD_CARD_REGISTRY.filter(card => 
    card.supportedRowTypes.includes(rowType)
  );
}

/**
 * Check if a card exists in the registry (is dashboard-eligible)
 */
export function isCardDashboardEligible(cardId: string): boolean {
  return DASHBOARD_CARD_REGISTRY.some(card => card.cardId === cardId);
}
