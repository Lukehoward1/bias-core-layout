-- Tags table (user-defined tag names + colors)
CREATE TABLE IF NOT EXISTS public.tags (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  color      text        DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags: select own" ON public.tags FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tags: insert own" ON public.tags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tags: update own" ON public.tags FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tags: delete own" ON public.tags FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;

-- Add tags column to trades
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
