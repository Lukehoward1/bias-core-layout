-- ── Linked accounts table ─────────────────────────────────────────────────────
-- Moves the localStorage-based linked account list into Supabase so accounts
-- persist across devices and sessions.

CREATE TABLE IF NOT EXISTS public.linked_accounts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  broker        text        NOT NULL DEFAULT 'Manual',
  balance       numeric     NOT NULL DEFAULT 0,
  currency      text        NOT NULL DEFAULT 'GBP',
  is_connected  boolean     NOT NULL DEFAULT true,
  is_primary    boolean     NOT NULL DEFAULT false,
  last_updated  timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── Partial unique index: one primary account per user ────────────────────────
-- Postgres partial unique indexes enforce the constraint only on rows matching
-- the WHERE predicate, so two rows with is_primary = false do not conflict.

CREATE UNIQUE INDEX linked_accounts_one_primary_per_user
  ON public.linked_accounts (user_id)
  WHERE is_primary = true;

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Reuses the set_updated_at() function created in migration 002.

CREATE TRIGGER linked_accounts_set_updated_at
  BEFORE UPDATE ON public.linked_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── RLS: linked_accounts ──────────────────────────────────────────────────────

ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linked_accounts: select own"
  ON public.linked_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "linked_accounts: insert own"
  ON public.linked_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "linked_accounts: update own"
  ON public.linked_accounts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "linked_accounts: delete own"
  ON public.linked_accounts FOR DELETE
  USING (user_id = auth.uid());

-- ── Grants ────────────────────────────────────────────────────────────────────

GRANT ALL ON public.linked_accounts TO authenticated;
GRANT ALL ON public.linked_accounts TO service_role;
