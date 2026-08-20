// src/components/reports/presets/types.ts
//
// Shared trade shape for report presets. A superset of what any single
// preset needs — callers pass the richer JournalTrade objects through,
// which satisfies this structurally.

export interface PresetTrade {
  id: string;
  date: string;
  pnl: number;
  status: "win" | "loss" | "breakeven";
  actualR?: number | null;
  pair?: string;
  type?: "Long" | "Short";
  accountId?: string;
  entryTime?: string;
  exitTime?: string;
  notes?: string;
  rating?: number;
  stopLoss?: number;
  entry?: number;
  exit?: number;
  lots?: number;
}

/** Props every preset component shares — the wrapper (ReportPreview) resolves
 * these once and hands the same values to whichever preset is active. */
export interface PresetProps {
  trades: PresetTrade[];
  reportTitle: string;
  periodLabel: string;
  /** Individual start/end dates of periodLabel, formatted the same way — for
   * presets (like Trade Log) that need to label the two ends separately. */
  periodStartLabel: string;
  periodEndLabel: string;
  accountLabel: string;
  generatedAt: string;
  reportId: string;
  onPrint: () => void;
  /**
   * Account balance progression across the report's date range, derived from
   * the account's current (live) balance minus the P&L of trades that fall
   * after the range — so closing = balance "as of" the range's end date, and
   * opening = closing minus the period's own net P&L. Only Trade Log uses
   * these today; null/undefined means balance data wasn't available (e.g.
   * "All Accounts" spanning mixed currencies, or no balance set).
   */
  openingBalance?: number | null;
  closingBalance?: number | null;
}
