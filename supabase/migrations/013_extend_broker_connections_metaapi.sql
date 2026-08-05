-- Extends broker_connections with MetaApi lifecycle fields.
-- broker-disconnect.ts and api/webhook.ts already reference deploy_state;
-- this migration makes the column real.

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS platform text
    CHECK (platform IN ('mt4', 'mt5'));

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS deploy_state text
    CHECK (deploy_state IN ('DEPLOYING','DEPLOYED','UNDEPLOYING','UNDEPLOYED','DEPLOY_FAILED','UNDEPLOY_FAILED'));

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS reliability text
    CHECK (reliability IN ('regular', 'high'));

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS region text;

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS last_deployed_at timestamptz;

ALTER TABLE public.broker_connections
  ADD COLUMN IF NOT EXISTS metastats_enabled boolean NOT NULL DEFAULT false;
