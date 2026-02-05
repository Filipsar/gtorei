-- Fix: Restrict rankings access to authenticated users only
-- This prevents anonymous access while maintaining leaderboard functionality

DROP POLICY IF EXISTS "Anyone can view rankings" ON public.rankings;

CREATE POLICY "Authenticated users can view rankings" 
  ON public.rankings 
  FOR SELECT 
  USING (auth.role() = 'authenticated');