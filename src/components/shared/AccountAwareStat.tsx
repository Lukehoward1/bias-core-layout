// src/components/shared/AccountAwareStat.tsx
//
// Three-way KPI stat display driven by the Viewing dropdown + Combine toggle:
//   1. Specific account selected           → one big number for that account.
//   2. All Accounts + combine toggle ON    → per-account stacked rows, each in
//                                            its own colour/scale. Never blended.
//   3. All Accounts + combine toggle OFF   → one big number for the primary
//                                            account only. Never a cross-
//                                            account blend.
//
// Does NOT render its own Combine toggle — the toggle is global state read
// via useAccountCombineMode(), which is also driven by the equity chart toggle.

import {
  ACTIVE_ACCOUNT_ALL,
  useAccountCombineMode,
} from "@/hooks/use-active-trading-account";
import { getAccountColor, shortAccountName } from "@/lib/account-colors";
import type { AccountEntry, AccountStats } from "@/hooks/use-account-aware-stats";

export interface AccountAwareStatProps {
  perAccount: Map<string, AccountEntry>;
  activeAccountId: string;
  /**
   * Id of the primary account, used to resolve which single account to show
   * when the Viewing dropdown is "All Accounts" and the Combine toggle is OFF.
   * Null when the user has no linked accounts.
   */
  primaryAccountId: string | null;
  /** Extract the value to display from a single account's stats. */
  select: (stats: AccountStats) => string | number;
  /** Convert the selected value to its display string. */
  format: (value: string | number) => string;
  /** Optional Tailwind text-color class for the big single-figure. */
  colorClass?: (value: string | number) => string;
  /** Tailwind class for the big single-figure font size. Defaults to "text-2xl font-bold". */
  sizeClass?: string;
}

// ── Single big figure ─────────────────────────────────────────────────────────

function BigFigure({
  value,
  colorClass,
  sizeClass = "text-2xl font-bold",
}: {
  value: string;
  colorClass?: string;
  sizeClass?: string;
}) {
  return <div className={`${sizeClass} ${colorClass ?? "text-foreground"}`}>{value}</div>;
}

// ── Per-account stacked rows ──────────────────────────────────────────────────

function AccountRows({
  entries,
  select,
  format,
  colorClass,
}: {
  entries: [string, AccountEntry][];
  select: (s: AccountStats) => string | number;
  format: (v: string | number) => string;
  colorClass?: (v: string | number) => string;
}) {
  return (
    <div className="space-y-1.5">
      {entries.map(([accountId, entry], index) => {
        const color = getAccountColor(index);
        const raw = select(entry.stats);
        const display = format(raw);
        const valColor = colorClass?.(raw) ?? "text-foreground";
        return (
          <div
            key={accountId}
            className="flex items-center justify-between px-2 py-1 rounded-md bg-muted/50"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground truncate" title={entry.account.name}>{shortAccountName(entry.account.name)}</span>
            </div>
            <span className={`text-sm font-semibold ml-2 flex-shrink-0 ${valColor}`}>
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AccountAwareStat({
  perAccount,
  activeAccountId,
  primaryAccountId,
  select,
  format,
  colorClass,
  sizeClass,
}: AccountAwareStatProps) {
  const [combineMode] = useAccountCombineMode();
  const isAllAccounts = activeAccountId === ACTIVE_ACCOUNT_ALL;

  const renderSingle = (accountId: string | null) => {
    if (!accountId) return <div className="text-2xl font-bold text-muted-foreground">—</div>;
    const entry = perAccount.get(accountId);
    if (!entry) return <div className="text-2xl font-bold text-muted-foreground">—</div>;
    const raw = select(entry.stats);
    return (
      <BigFigure
        value={format(raw)}
        colorClass={colorClass?.(raw)}
        sizeClass={sizeClass}
      />
    );
  };

  // ── Specific account selected ──────────────────────────────────────────────
  if (!isAllAccounts) return renderSingle(activeAccountId);

  // ── All Accounts + combine ON: per-account rows ────────────────────────────
  if (combineMode) {
    const entries = [...perAccount.entries()];
    if (entries.length === 0) {
      return <div className="text-2xl font-bold text-muted-foreground">—</div>;
    }
    return (
      <AccountRows
        entries={entries}
        select={select}
        format={format}
        colorClass={colorClass}
      />
    );
  }

  // ── All Accounts + combine OFF: single figure for primary account ──────────
  return renderSingle(primaryAccountId);
}
