-- ── Broker connections table ──────────────────────────────────────────────────
-- Stores MT4/MT5 connection credentials (and later other broker types).
-- NOTE: account_id is a soft reference only — linked_accounts currently lives
-- in localStorage, not Supabase. The FK is omitted until that table exists.

CREATE TABLE IF NOT EXISTS public.broker_connections (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id                  uuid,       -- reserved for future FK to linked_accounts once that table is created
  broker_type                 text        NOT NULL DEFAULT 'mt4_mt5',
  metaapi_account_id          text,
  login                       text        NOT NULL,
  server                      text        NOT NULL,
  investor_password_encrypted text        NOT NULL,
  connection_status           text        NOT NULL DEFAULT 'pending'
                                          CHECK (connection_status IN ('pending', 'connected', 'error', 'disconnected')),
  last_synced_at              timestamptz,
  last_error                  text,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────

CREATE TRIGGER broker_connections_set_updated_at
  BEFORE UPDATE ON public.broker_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: broker_connections ───────────────────────────────────────────────────

ALTER TABLE public.broker_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_connections: select own"
  ON public.broker_connections FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "broker_connections: insert own"
  ON public.broker_connections FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "broker_connections: update own"
  ON public.broker_connections FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "broker_connections: delete own"
  ON public.broker_connections FOR DELETE
  USING (user_id = auth.uid());

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT ALL ON public.broker_connections TO authenticated;
GRANT ALL ON public.broker_connections TO service_role;
