ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS confluence text[] DEFAULT '{}';
