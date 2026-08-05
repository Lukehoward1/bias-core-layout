ALTER TABLE public.profiles
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles
  ADD COLUMN trader_style TEXT NOT NULL DEFAULT 'intraday'
  CHECK (trader_style IN ('scalper', 'intraday', 'swing'));
