CREATE TABLE IF NOT EXISTS public.saved_reports (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  type       text        NOT NULL,
  subject    text,
  filters    jsonb       DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  last_run_at timestamptz
);

ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_reports: select own" ON public.saved_reports
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "saved_reports: insert own" ON public.saved_reports
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_reports: update own" ON public.saved_reports
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_reports: delete own" ON public.saved_reports
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.saved_reports TO authenticated;
GRANT ALL ON public.saved_reports TO service_role;
