-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  hands_played INTEGER NOT NULL DEFAULT 0,
  consecutive_errors INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create rankings table
CREATE TABLE public.rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  hands_played INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_type, period_start)
);

-- Enable RLS on rankings
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;

-- Rankings policies
CREATE POLICY "Anyone can view rankings" ON public.rankings FOR SELECT USING (true);
CREATE POLICY "Users can insert own rankings" ON public.rankings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rankings" ON public.rankings FOR UPDATE USING (auth.uid() = user_id);

-- Create training_sessions table
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  hands_played INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  scenario TEXT NOT NULL,
  position TEXT NOT NULL,
  stack INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on training_sessions
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Training sessions policies
CREATE POLICY "Users can view own sessions" ON public.training_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.training_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.training_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Create played_hands table
CREATE TABLE public.played_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  hand TEXT NOT NULL,
  scenario TEXT NOT NULL,
  position TEXT NOT NULL,
  stack INTEGER NOT NULL,
  user_action TEXT NOT NULL,
  correct_action TEXT NOT NULL,
  feedback TEXT NOT NULL,
  points INTEGER NOT NULL,
  ev_loss NUMERIC(10,4) NOT NULL DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on played_hands
ALTER TABLE public.played_hands ENABLE ROW LEVEL SECURITY;

-- Played hands policies
CREATE POLICY "Users can view own hands" ON public.played_hands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hands" ON public.played_hands FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  scenario TEXT NOT NULL,
  position TEXT NOT NULL,
  stack TEXT NOT NULL,
  final_table BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rankings_updated_at
  BEFORE UPDATE ON public.rankings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Jogador'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get current period start
CREATE OR REPLACE FUNCTION public.get_period_start(period_type TEXT)
RETURNS DATE AS $$
BEGIN
  CASE period_type
    WHEN 'daily' THEN RETURN CURRENT_DATE;
    WHEN 'weekly' THEN RETURN DATE_TRUNC('week', CURRENT_DATE)::DATE;
    WHEN 'monthly' THEN RETURN DATE_TRUNC('month', CURRENT_DATE)::DATE;
    ELSE RETURN CURRENT_DATE;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;