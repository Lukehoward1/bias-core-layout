-- Support requests submitted from the in-app support panel.
-- The BEFORE INSERT trigger enriches each row with email/plan/priority
-- from auth.users and profiles so the client cannot fake those values.
-- A rate limit (5 per user per hour) is also enforced in the trigger.
-- Emails are sent by api/subscription.ts (best-effort; row is source of truth).
-- Inserts are performed by the API using the service role after JWT verification;
-- no INSERT privilege or policy is granted to the authenticated role.

CREATE TABLE IF NOT EXISTS public.support_requests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  plan        text,
  priority    text        CHECK (priority IN ('priority', 'standard')),
  topic       text        NOT NULL CHECK (topic IN ('billing', 'bug', 'data', 'question', 'other')),
  message     text        NOT NULL CHECK (char_length(message) BETWEEN 10 AND 2000),
  page        text,
  status      text        NOT NULL DEFAULT 'open'
);

CREATE INDEX IF NOT EXISTS support_requests_user_created_idx
  ON public.support_requests (user_id, created_at DESC);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own rows.
CREATE POLICY "users can view own support requests"
  ON public.support_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT ALL ON public.support_requests TO service_role;
GRANT SELECT ON public.support_requests TO authenticated;

-- ── Trigger: enrich + rate-limit ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.support_request_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _email  text;
  _tier   text;
  _status text;
  _is_fm  boolean;
  _cnt    integer;
BEGIN
  -- Rate limit: max 5 requests per user per 60 minutes.
  SELECT count(*) INTO _cnt
  FROM public.support_requests
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';

  IF _cnt >= 5 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Maximum 5 support requests per hour.';
  END IF;

  -- Populate email from auth.users (client cannot supply this).
  SELECT email INTO _email
  FROM auth.users
  WHERE id = NEW.user_id;
  NEW.email := _email;

  -- Populate plan and priority from profiles.
  SELECT subscription_tier, subscription_status, is_founding_member
  INTO _tier, _status, _is_fm
  FROM public.profiles
  WHERE id = NEW.user_id;

  NEW.plan := _tier;
  NEW.priority := CASE
    WHEN (_is_fm IS TRUE OR _tier = 'pro')
         AND _status IN ('active', 'trialing')
    THEN 'priority'
    ELSE 'standard'
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER support_request_before_insert_trigger
  BEFORE INSERT ON public.support_requests
  FOR EACH ROW EXECUTE FUNCTION public.support_request_before_insert();
