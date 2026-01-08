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
  {
    id: 'alerts-my-alerts-timers',
    title: 'My Alerts & Timers',
    description: 'Your custom price alerts and session timers',
    section: 'alerts',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow', 'hero'],
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
  {
    id: 'daily-performance',
    title: 'Daily Performance',
    description: 'Current week trading calendar (max 5 days)',
    section: 'journal',
    category: 'overview',
    defaultRowType: 'wide-narrow',
    allowedRowTypes: ['wide-narrow', 'equal', 'hero'],
    dashboardEligible: true,
  },

  // ============ Reports (part of Journal) ============
  // Overview Tab
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
    id: 'reports-overview-equity',
    title: 'Equity Curve',
    description: 'Your trading equity over time',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'hero',
    allowedRowTypes: ['hero', 'equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  // Individual KPI cards for Overview
  {
    id: 'reports-kpi-total-pnl',
    title: 'Total P&L',
    description: 'Total profit and loss',
    section: 'reports',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'reports-kpi-avg-rr',
    title: 'Avg R:R',
    description: 'Average risk-to-reward ratio',
    section: 'reports',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'reports-kpi-win-rate',
    title: 'Win Rate',
    description: 'Percentage of winning trades',
    section: 'reports',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'reports-kpi-expectancy',
    title: 'Expectancy',
    description: 'Expected profit per trade',
    section: 'reports',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi', 'four-equal'],
    dashboardEligible: true,
  },
  {
    id: 'reports-overview-best-day',
    title: 'Best Winning Day',
    description: 'Your highest profit day',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-overview-worst-day',
    title: 'Worst Losing Day',
    description: 'Your biggest loss day',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-overview-rolling30',
    title: 'Rolling 30-Day',
    description: 'Rolling 30-day performance chart',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow', 'hero'],
    dashboardEligible: true,
  },
  {
    id: 'reports-overview-edge',
    title: 'Strongest Edge',
    description: 'Your strongest trading edge this month',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },

  // Performance Tab
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
    id: 'reports-performance-by-day',
    title: 'Win Rate by Day',
    description: 'Performance breakdown by day of week',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-performance-by-session',
    title: 'Win Rate by Session',
    description: 'Performance breakdown by trading session',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-performance-distribution',
    title: 'Trade Distribution',
    description: 'Long vs Short trade breakdown',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },

  // Sessions Tab
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
    id: 'reports-sessions-comparison',
    title: 'Session Comparison',
    description: 'Compare performance across sessions',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'wide-narrow',
    allowedRowTypes: ['wide-narrow', 'equal', 'hero'],
    dashboardEligible: true,
  },
  {
    id: 'reports-sessions-recommendations',
    title: 'Session Recommendations',
    description: 'Best and worst session insights',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },

  // Assets Tab
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
  {
    id: 'reports-assets-pnl',
    title: 'P&L by Instrument',
    description: 'Profit/loss breakdown by asset',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'wide-narrow',
    allowedRowTypes: ['wide-narrow', 'equal', 'hero'],
    dashboardEligible: true,
  },
  {
    id: 'reports-assets-table',
    title: 'Instrument Statistics',
    description: 'Detailed stats for each traded pair',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'hero',
    allowedRowTypes: ['hero', 'equal'],
    dashboardEligible: true,
  },

  // Setup Quality Tab
  {
    id: 'reports-setup-quality',
    title: 'Setup Quality Report',
    description: 'Performance by setup rating',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-setup-best-worst',
    title: 'Best/Worst Setups',
    description: 'Top and bottom performing setups',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-setup-patterns',
    title: 'Common Patterns',
    description: 'Frequently noted trade patterns',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },

  // Psychology Tab
  {
    id: 'reports-psychology',
    title: 'Psychology Report',
    description: 'Emotional trading analysis',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-psychology-sentiment',
    title: 'Sentiment Summary',
    description: 'Positive vs negative note analysis',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-psychology-triggers',
    title: 'Emotional Triggers',
    description: 'Common emotional patterns in trades',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-psychology-improvement',
    title: 'Improvement Focus',
    description: 'Personalized improvement suggestions',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
    dashboardEligible: true,
  },

  // Risk Management Tab
  {
    id: 'reports-risk',
    title: 'Risk Management Report',
    description: 'Risk metrics and analysis',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'hero', 'wide-narrow'],
    dashboardEligible: true,
  },
  {
    id: 'reports-risk-kpis',
    title: 'Risk KPIs',
    description: 'Avg risk, max risk, max loss metrics',
    section: 'reports',
    category: 'metrics',
    defaultRowType: 'kpi',
    allowedRowTypes: ['kpi'],
    dashboardEligible: true,
  },
  {
    id: 'reports-risk-distribution',
    title: 'Risk Distribution',
    description: 'Distribution of risk per trade',
    section: 'reports',
    category: 'analysis',
    defaultRowType: 'wide-narrow',
    allowedRowTypes: ['wide-narrow', 'equal'],
    dashboardEligible: true,
  },
  {
    id: 'reports-risk-discipline',
    title: 'Risk Discipline Score',
    description: 'Your trading discipline rating',
    section: 'reports',
    category: 'overview',
    defaultRowType: 'equal',
    allowedRowTypes: ['equal', 'wide-narrow'],
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
