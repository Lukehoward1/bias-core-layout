-- ── Trades table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trades (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date          date        NOT NULL,
  pair          text        NOT NULL,
  type          text        NOT NULL CHECK (type IN ('Long', 'Short')),
  entry         numeric,
  exit          numeric,
  lots          numeric,
  pnl           numeric,
  status        text        CHECK (status IN ('win', 'loss', 'breakeven')),
  notes         text,
  rating        integer     CHECK (rating BETWEEN 1 AND 5),
  actual_r      numeric,
  stop_loss     numeric,
  take_profit   numeric,
  entry_time    text,
  exit_time     text,
  account_id    text,
  source        text        DEFAULT 'manual',
  setup         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trades_set_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: trades ───────────────────────────────────────────────────────────────

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades: select own"
  ON public.trades FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "trades: insert own"
  ON public.trades FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trades: update own"
  ON public.trades FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trades: delete own"
  ON public.trades FOR DELETE
  USING (user_id = auth.uid());

-- ── Strategies table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.strategies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

-- ── RLS: strategies ───────────────────────────────────────────────────────────

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategies: select own"
  ON public.strategies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "strategies: insert own"
  ON public.strategies FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "strategies: update own"
  ON public.strategies FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "strategies: delete own"
  ON public.strategies FOR DELETE
  USING (user_id = auth.uid());
