-- Fix: Restrict profiles table access to authenticated users only
-- This prevents unauthenticated access to user profile data (usernames, levels, XP, etc.)

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.role() = 'authenticated');