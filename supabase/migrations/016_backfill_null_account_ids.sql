-- Backfill: assign orphaned trades (account_id IS NULL) to each user's primary
-- linked account.
--
-- Root cause: migration 010 changed trades.account_id from TEXT to UUID and
-- nulled out any values that couldn't be cast (including the legacy
-- "demo-account" string stored by pre-accounts client code). Those trades
-- became invisible to per-account stats queries that filter on account_id.
--
-- Pass 1: assign to the user's designated primary account.
UPDATE public.trades t
SET account_id = la.id
FROM public.linked_accounts la
WHERE la.user_id = t.user_id
  AND la.is_primary = true
  AND t.account_id IS NULL;

-- Pass 2: for users with no primary flagged, fall back to their oldest account.
-- (Runs only for trades still NULL after pass 1.)
UPDATE public.trades t
SET account_id = (
  SELECT la.id
  FROM public.linked_accounts la
  WHERE la.user_id = t.user_id
  ORDER BY la.created_at ASC
  LIMIT 1
)
WHERE t.account_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.linked_accounts la WHERE la.user_id = t.user_id
  );

-- Trades for users with no linked_accounts rows at all are intentionally left
-- NULL — those users rely on the client-side DEMO_BROKER_ACCOUNT fallback and
-- are handled by the useAccountAwareStats orphan-assignment logic.
