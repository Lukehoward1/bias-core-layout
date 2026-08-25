-- Cancellation feedback captured by /api/cancel-subscription at the moment
-- the user confirms cancellation. Reason is required (dropdown selection),
-- free-text feedback is optional. Reads are for internal churn analysis only,
-- so no authenticated-role policies — service role writes and reads.

CREATE TABLE IF NOT EXISTS public.cancellation_feedback (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_at_cancellation     text         NOT NULL,
  cadence_at_cancellation  text,
  reason                   text         NOT NULL,
  feedback_text            text,
  created_at               timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cancellation_feedback_created_at_idx
  ON public.cancellation_feedback (created_at DESC);

ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- No authenticated-role policies. The cancel endpoint verifies the caller's
-- JWT, then writes using the service-role client — client code cannot
-- write to this table directly.

GRANT ALL ON public.cancellation_feedback TO service_role;
