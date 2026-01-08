import type { RowType } from '@/hooks/use-dashboard-layout';

export type DashboardSection = 'journal' | 'reports' | 'alerts' | 'calendar' | 'risk-tools' | 'markets';

export interface DashboardCardDefinition {
  id: string;
  title: string;
  description: string;
  section: DashboardSection;
  category: 'metrics' | 'analysis' | 'overview';
  defaultRowType: RowType;
  allowedRowTypes: RowType[];
  /** If true, this card can be added from its native page */
  dashboardEligible: true;
}

/**
 * Single source of truth for all dashboard-eligible cards.
 * 
 * ONLY cards in this registry can:
 * 1. Appear in Dashboard → Add Cards modal
 * 2. Show "Add to Dashboard" on their native page
 * 
 * Excluded sections (by design):
 * - Strategy Tester
 * - Education / Webinars
 * - Brokerage / Broker discovery
 * - Community
 */
export const DASHBOARD_CARD_REGISTRY: DashboardCardDefinition[] = [
  // ============ KPI Cards (fixed top row) ============
  {
    id: 'todays-bias',
    title: "Today's Bias",
    description: 'Current market bias direction',
    section: 'markets',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi'],
    dashboardEligible: true,
  },
  {
    id: 'active-trades',
    title: 'Active Trades',
    description: 'Current open positions',
    section: 'markets',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi'],
    dashboardEligible: true,
  },
  {
    id: 'next-session',
    title: 'Next Session',
    description: 'Upcoming trading session timer',
    section: 'alerts',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi'],
    dashboardEligible: true,
  },
  {
    id: 'high-impact-events',
    title: 'High Impact Events',
    description: 'Important economic events today',
    section: 'calendar',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi'],
    dashboardEligible: true,
  },

  // ============ Markets / Watchlist ============
  {
    id: 'watchlist-overview',
    title: 'Watchlist Overview',
    description: 'Your watchlist with key technical levels',
    section: 'markets',
    category: 'analysis',
    defaultRowType: 'wide-narrow',
    allowedRowTypes: ['wide-narrow', 'equal', 'hero', 'three-equal', 'four-equal'],
    dashboardEligible: true,
  },

  // ============ Alerts ============
  {
    id: 'session-timers',
    title: 'Session Timers',
    description: 'All trading session countdowns',
    section: 'alerts',
    category: 'analysis',
    defaultRowType: 'wide-narrow',
    allowedRowTypes: ['wide-narrow', 'equal', 'hero', 'three-equal', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'top-news',
    title: 'Top News',
    description: 'Latest market-moving headlines',
    section: 'alerts',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow', 'three-equal'],
    dashboardEligible: true,
  },

  // ============ Calendar ============
  {
    id: 'upcoming-events',
    title: 'Upcoming Events',
    description: 'Calendar of upcoming economic events',
    section: 'calendar',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'three-equal', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'calendar-events',
    title: 'Week Ahead',
    description: 'Week ahead calendar preview',
    section: 'calendar',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'three-equal', 'four-equal'],
    dashboardEligible: true,
  },

  // ============ Journal ============
  {
    id: 'journal-summary',
    title: 'Journal Summary',
    description: 'Recent journal entries overview',
    section: 'journal',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'three-equal', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'pinned-journal-equity',
    title: 'Journal Equity Curve',
    description: 'Your trading equity over time',
    section: 'journal',
    category: 'overview',
    defaultRowType: 'hero',
    allowedRowTypes: ['hero', 'equal', 'wide-narrow'],
    dashboardEligible: true,
  },

  // ============ Reports (part of Journal) ============
  {
    id: 'performance-overview',
    title: 'Performance Overview',
    description: 'Trading performance summary',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'three-equal', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'reports-overview',
    title: 'Reports Overview',
    description: 'Key trading metrics at a glance',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-performance',
    title: 'Performance Analysis',
    description: 'Win rate and session breakdowns',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-sessions',
    title: 'Sessions Report',
    description: 'Performance by trading session',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-assets',
    title: 'Assets Report',
    description: 'Performance by instrument',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardEligible: true,
  },

  // ============ Risk Tools ============
  {
    id: 'risk-snapshot',
    title: 'Risk Snapshot',
    description: 'Current risk exposure summary',
    section: 'risk-tools',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['wide-narrow', 'equal', 'three-equal', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'quick-calculator',
    title: 'Quick Calculator',
    description: 'Position size calculator widget',
    section: 'risk-tools',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow', 'hero'],
    dashboardEligible: true,
  },
];

/**
 * Get all dashboard-eligible cards
 */
export const getAllEligibleCards = (): DashboardCardDefinition[] => {
  return DASHBOARD_CARD_REGISTRY;
};

/**
 * Get eligible cards for a specific section
 */
export const getCardsBySection = (section: DashboardSection): DashboardCardDefinition[] => {
  return DASHBOARD_CARD_REGISTRY.filter(card => card.section === section);
};

/**
 * Check if a card ID is in the registry (eligible for dashboard)
 */
export const isCardEligible = (cardId: string): boolean => {
  return DASHBOARD_CARD_REGISTRY.some(card => card.id === cardId);
};

/**
 * Get card definition by ID
 */
export const getCardById = (cardId: string): DashboardCardDefinition | undefined => {
  return DASHBOARD_CARD_REGISTRY.find(card => card.id === cardId);
};

/**
 * Group cards by category for display in modals
 */
export const getCardsGroupedByCategory = (): Record<string, DashboardCardDefinition[]> => {
  return DASHBOARD_CARD_REGISTRY.reduce((acc, card) => {
    if (!acc[card.category]) {
      acc[card.category] = [];
    }
    acc[card.category].push(card);
    return acc;
  }, {} as Record<string, DashboardCardDefinition[]>);
};
