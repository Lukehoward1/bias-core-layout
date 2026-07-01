-- ── Session plans table ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_plans (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date        NOT NULL,
  market_bias text,
  key_levels  text,
  reflection  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE TRIGGER session_plans_set_updated_at
  BEFORE UPDATE ON public.session_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: session_plans ────────────────────────────────────────────────────────

ALTER TABLE public.session_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_plans: select own"
  ON public.session_plans FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "session_plans: insert own"
  ON public.session_plans FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "session_plans: update own"
  ON public.session_plans FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "session_plans: delete own"
  ON public.session_plans FOR DELETE
  USING (user_id = auth.uid());

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT ALL ON public.session_plans TO authenticated;
GRANT ALL ON public.session_plans TO service_role;
