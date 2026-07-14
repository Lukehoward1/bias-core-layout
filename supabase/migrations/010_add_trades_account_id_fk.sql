-- ── FK: trades.account_id → linked_accounts.id ───────────────────────────────
--
-- !! THIS MIGRATION CANNOT RUN UNTIL THE DATA MIGRATION IS COMPLETE !!
--
-- The problem: trades.account_id is TEXT, linked_accounts.id is UUID.
-- Postgres requires FK columns to have the same type — there is no implicit
-- cast between text and uuid at the constraint level. A direct ADD CONSTRAINT
-- on mismatched types will fail with:
--   ERROR: foreign key constraint "trades_account_id_fkey" cannot be
--   implemented — key columns "account_id" and "id" are of incompatible types.
--
-- Therefore this migration must be run in the following order:
--
--   STEP 1 — Run migration 009 (create linked_accounts table).
--
--   STEP 2 — Run the manual data migration (one-off, in Supabase SQL editor):
--     a) INSERT the demo account row into linked_accounts, capturing its new UUID.
--     b) UPDATE trades SET account_id = '<new-uuid>' WHERE account_id = 'demo-account'.
--     c) UPDATE trades SET account_id = NULL WHERE account_id IS NOT NULL
--        AND account_id NOT IN (SELECT id::text FROM linked_accounts).
--        (Nulls out any orphaned "account-{timestamp}-{random}" strings that
--        have no corresponding linked_accounts row and cannot be cast to uuid.)
--
--   STEP 3 — Run this migration.
--
-- After step 2, every non-null trades.account_id value will be a valid UUID
-- string (e.g. "550e8400-e29b-41d4-a716-446655440000"), which the USING cast
-- below can safely convert.

-- Change column type from text → uuid, casting existing UUID-format strings.
ALTER TABLE public.trades
  ALTER COLUMN account_id TYPE uuid
  USING account_id::uuid;

-- Add the foreign key constraint.
ALTER TABLE public.trades
  ADD CONSTRAINT trades_account_id_fkey
  FOREIGN KEY (account_id)
  REFERENCES public.linked_accounts (id)
  ON DELETE SET NULL;
