
-- Wrap auth.* in subselect so it evaluates once per query, not per row
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Authenticated users can view rankings" ON public.rankings;
CREATE POLICY "Authenticated users can view rankings" ON public.rankings
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Users can update own rankings" ON public.rankings;
CREATE POLICY "Users can update own rankings" ON public.rankings
  FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own sessions" ON public.training_sessions;
CREATE POLICY "Users can view own sessions" ON public.training_sessions
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.training_sessions;
CREATE POLICY "Users can update own sessions" ON public.training_sessions
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- Helpful composite index for ranking queries (period filter + sort by xp)
CREATE INDEX IF NOT EXISTS idx_rankings_period_xp
  ON public.rankings (period_type, period_start, xp_earned DESC);
