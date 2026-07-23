// src/components/shared/AccountAwareStat.tsx
//
// Three-way KPI stat display — mirrors AccountAwareEquityChart's mode logic:
//   1. Single account selected → one big number, same style as today
//   2. All Accounts + combine OFF (or currencies differ) → per-account rows
//      (coloured dot · account name · value), styled like the Risk Snapshot card
//   3. All Accounts + combine ON + canCombine → single combined figure
//
// Does NOT render its own Combine toggle — the toggle is global state read
// via useAccountCombineMode(), which is also driven by the equity chart toggle.
// Showing a second toggle on every KPI card would be noisy and redundant.

import {
  ACTIVE_ACCOUNT_ALL,
  useAccountCombineMode,
} from "@/hooks/use-active-trading-account";
import { getAccountColor, shortAccountName } from "@/lib/account-colors";
import type { AccountEntry, AccountStats } from "@/hooks/use-account-aware-stats";

export interface AccountAwareStatProps {
  perAccount: Map<string, AccountEntry>;
  combined: AccountEntry | null;
  canCombine: boolean;
  activeAccountId: string;
  /** Extract the value to display from a single account's stats. */
  select: (stats: AccountStats) => string | number;
  /** Convert the selected value to its display string. */
  format: (value: string | number) => string;
  /** Optional Tailwind text-color class for the big single-figure. */
  colorClass?: (value: string | number) => string;
  /** Tailwind class for the big single-figure font size. Defaults to "text-2xl font-bold". */
  sizeClass?: string;
}

// ── Single big figure (single-account or combined) ────────────────────────────

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
  combined,
  canCombine,
  activeAccountId,
  select,
  format,
  colorClass,
  sizeClass,
}: AccountAwareStatProps) {
  const [combineMode] = useAccountCombineMode();
  const isAllAccounts = activeAccountId === ACTIVE_ACCOUNT_ALL;

  // ── Single account ──────────────────────────────────────────────────────────
  if (!isAllAccounts) {
    const entry = perAccount.get(activeAccountId);
    if (!entry) return <div className="text-2xl font-bold text-muted-foreground">—</div>;
    const raw = select(entry.stats);
    return (
      <BigFigure
        value={format(raw)}
        colorClass={colorClass?.(raw)}
        sizeClass={sizeClass}
      />
    );
  }

  // ── All accounts: combined view ─────────────────────────────────────────────
  if (combineMode && canCombine && combined) {
    const raw = select(combined.stats);
    return (
      <BigFigure
        value={format(raw)}
        colorClass={colorClass?.(raw)}
        sizeClass={sizeClass}
      />
    );
  }

  // ── All accounts: per-account rows ─────────────────────────────────────────
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
