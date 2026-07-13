-- ── Add home_currency to profiles ────────────────────────────────────────────
-- Stores the user's preferred display currency for P&L, balances, and risk
-- calculations across the app. Defaults to GBP (the app's original currency).

ALTER TABLE public.profiles
  ADD COLUMN home_currency TEXT NOT NULL DEFAULT 'GBP';
