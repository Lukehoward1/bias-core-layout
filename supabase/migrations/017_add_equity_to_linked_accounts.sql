-- ── Add equity column to linked_accounts ──────────────────────────────────────
-- equity = balance + floating P&L on open positions. A genuinely different value
-- from balance (moves continuously while trades are open), so it warrants its own
-- column rather than overloading balance.
-- Nullable: NULL means "never synced yet", which is distinct from 0.

ALTER TABLE public.linked_accounts
  ADD COLUMN IF NOT EXISTS equity numeric;
