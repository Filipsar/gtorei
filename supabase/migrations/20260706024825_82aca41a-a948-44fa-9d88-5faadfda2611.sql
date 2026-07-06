
-- 1) Lock down SECURITY DEFINER function: handle_new_user runs as trigger owner; revoke public/anon/authenticated EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- 2) Storage: drop broad SELECT policy that allowed listing profile-images bucket.
-- Bucket stays public so direct object URLs still resolve; listing via API is blocked.
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;

-- 3) Achievements: move unlock to server-side validated SECURITY DEFINER function
DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;

CREATE OR REPLACE FUNCTION public.unlock_achievement(_key text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _level int;
  _hands int;
  _valid boolean := false;
  _threshold int;
  _acc numeric;
  _min_hands int;
  _best_threshold int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Already unlocked? no-op success.
  IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id = _uid AND achievement_key = _key) THEN
    RETURN true;
  END IF;

  SELECT p.level, p.hands_played INTO _level, _hands
    FROM public.profiles p WHERE p.user_id = _uid;

  IF _level IS NULL THEN _level := 1; END IF;
  IF _hands IS NULL THEN _hands := 0; END IF;

  -- level_N (N=2..8)
  IF _key ~ '^level_[2-8]$' THEN
    _threshold := substring(_key from 7)::int;
    _valid := _level >= _threshold;

  -- hands_N
  ELSIF _key ~ '^hands_[0-9]+$' THEN
    _threshold := substring(_key from 7)::int;
    _valid := _hands >= _threshold;

  -- streak_N: consecutive hands with feedback='best'
  ELSIF _key ~ '^streak_[0-9]+$' THEN
    _threshold := substring(_key from 8)::int;
    WITH ordered AS (
      SELECT feedback,
             row_number() OVER (ORDER BY played_at) AS rn,
             row_number() OVER (PARTITION BY (feedback = 'best') ORDER BY played_at) AS rn2
        FROM public.played_hands
       WHERE user_id = _uid
    ),
    grp AS (
      SELECT feedback, (rn - rn2) AS g FROM ordered WHERE feedback = 'best'
    ),
    streaks AS (
      SELECT count(*) AS c FROM grp GROUP BY g
    )
    SELECT COALESCE(max(c), 0) >= _threshold INTO _valid FROM streaks;

  -- session_perfect: session with accuracy=100 and hands_played>=10
  ELSIF _key = 'session_perfect' THEN
    _valid := EXISTS (
      SELECT 1 FROM public.training_sessions
       WHERE user_id = _uid AND accuracy = 100 AND hands_played >= 10
    );

  ELSIF _key = 'session_perfect_50' THEN
    _valid := EXISTS (
      SELECT 1 FROM public.training_sessions
       WHERE user_id = _uid AND accuracy = 100 AND hands_played >= 50
    );

  ELSIF _key IN ('accuracy_90','accuracy_95','accuracy_98') THEN
    IF _key = 'accuracy_90' THEN _acc := 90; _min_hands := 20;
    ELSIF _key = 'accuracy_95' THEN _acc := 95; _min_hands := 100;
    ELSE _acc := 98; _min_hands := 50;
    END IF;
    _valid := EXISTS (
      SELECT 1 FROM public.training_sessions
       WHERE user_id = _uid AND accuracy >= _acc AND hands_played >= _min_hands
    );

  -- best_N: single session where count of best hands >= N
  ELSIF _key ~ '^best_[0-9]+$' THEN
    _best_threshold := substring(_key from 6)::int;
    _valid := EXISTS (
      SELECT 1 FROM public.played_hands
       WHERE user_id = _uid AND feedback = 'best'
       GROUP BY session_id
      HAVING count(*) >= _best_threshold
    );

  ELSE
    _valid := false;
  END IF;

  IF NOT _valid THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_achievements (user_id, achievement_key)
  VALUES (_uid, _key)
  ON CONFLICT (user_id, achievement_key) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.unlock_achievement(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unlock_achievement(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.unlock_achievement(text) TO authenticated;
