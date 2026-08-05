-- ── Downgrade grace period columns on profiles ───────────────────────────────
-- When a subscription downgrades to a lower account limit, a 72-hour grace
-- period is written here instead of immediately undeploying broker connections.
-- The cron job /api/cron/downgrade-enforce enforces on expiry.
-- Cleared when the user resolves via /api/broker-downgrade-resolve, or when a
-- subsequent subscription event shows the new tier already covers the count.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS downgrade_grace_end_at  timestamptz,
  ADD COLUMN IF NOT EXISTS downgrade_new_max        smallint,
  ADD COLUMN IF NOT EXISTS downgrade_account_chosen uuid REFERENCES public.linked_accounts(id) ON DELETE SET NULL;
