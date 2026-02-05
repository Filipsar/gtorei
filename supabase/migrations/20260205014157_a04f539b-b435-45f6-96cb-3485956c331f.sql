-- First, drop the constraint that seems to exist but doesn't reference profiles properly
-- Then add the correct foreign key

-- Add foreign key from rankings.user_id to profiles.user_id
ALTER TABLE public.rankings
DROP CONSTRAINT IF EXISTS rankings_user_id_fkey;

ALTER TABLE public.rankings
ADD CONSTRAINT rankings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rankings_user_id ON public.rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_rankings_period ON public.rankings(period_type, period_start);