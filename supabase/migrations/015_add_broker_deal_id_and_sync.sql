-- Add broker_deal_id to trades for deduplication of broker-synced deals
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS broker_deal_id text;

-- Unique constraint on (account_id, broker_deal_id).
-- PostgreSQL treats NULL as distinct from NULL, so manual trades with broker_deal_id=NULL
-- do not conflict with each other — only duplicate broker deals are blocked.
ALTER TABLE public.trades
  ADD CONSTRAINT trades_account_broker_deal_unique UNIQUE (account_id, broker_deal_id);

-- Add last_synced_at to broker_connections for incremental trade sync
ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
