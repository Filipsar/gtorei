-- ============ A1: helper level function ============
CREATE OR REPLACE FUNCTION public.calc_level(_xp integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _xp >= 250000 THEN 8
    WHEN _xp >= 100000 THEN 7
    WHEN _xp >= 17500 THEN 6
    WHEN _xp >= 8000 THEN 5
    WHEN _xp >= 3500 THEN 4
    WHEN _xp >= 1000 THEN 3
    WHEN _xp >= 150 THEN 2
    ELSE 1 END;
$$;
REVOKE EXECUTE ON FUNCTION public.calc_level(integer) FROM PUBLIC, anon;

-- ============ A2: profiles.level_test_completed_at ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level_test_completed_at timestamptz;

-- ============ A3: rankings unique key (dedupe first) ============
DELETE FROM public.rankings a USING public.rankings b
 WHERE a.ctid < b.ctid AND a.user_id = b.user_id
   AND a.period_type = b.period_type AND a.period_start = b.period_start;
CREATE UNIQUE INDEX IF NOT EXISTS rankings_user_period_uniq
  ON public.rankings (user_id, period_type, period_start);

-- ============ A4: indexes on played_hands ============
CREATE INDEX IF NOT EXISTS idx_played_hands_user_played_at ON public.played_hands (user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_played_hands_session ON public.played_hands (session_id);

-- ============ A5: rankings accumulator helper ============
CREATE OR REPLACE FUNCTION public.apply_ranking_delta(_uid uuid, _xp integer, _hands integer, _correct integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _p record;
BEGIN
  FOR _p IN
    SELECT 'daily'::text AS t, _today AS s
    UNION ALL SELECT 'weekly', _today - EXTRACT(DOW FROM _today)::int
    UNION ALL SELECT 'monthly', date_trunc('month', _today)::date
  LOOP
    INSERT INTO public.rankings (user_id, period_type, period_start, xp_earned, hands_played, accuracy)
    VALUES (_uid, _p.t, _p.s, _xp, _hands,
            CASE WHEN _hands > 0 THEN round(100.0 * _correct / _hands) ELSE 0 END)
    ON CONFLICT (user_id, period_type, period_start) DO UPDATE
      SET xp_earned = public.rankings.xp_earned + EXCLUDED.xp_earned,
          hands_played = public.rankings.hands_played + _hands,
          accuracy = CASE WHEN (public.rankings.hands_played + _hands) > 0
            THEN round(100.0 * (round(public.rankings.accuracy / 100.0 * public.rankings.hands_played) + _correct)
                       / (public.rankings.hands_played + _hands))
            ELSE 0 END,
          updated_at = now();
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_ranking_delta(uuid,integer,integer,integer) FROM PUBLIC, anon, authenticated;

-- ============ A6: record_hand_result ============
CREATE OR REPLACE FUNCTION public.record_hand_result(
  _session_id uuid,
  _hand text,
  _scenario text,
  _position text,
  _stack integer,
  _user_action text,
  _correct_action text,
  _feedback text,
  _points integer,
  _ev_loss numeric DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _sess record;
  _recent integer;
  _correct integer;
  _xp integer; _lvl integer; _hp integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _feedback NOT IN ('best','correct','inaccuracy','mistake','blunder') THEN
    RAISE EXCEPTION 'invalid_feedback';
  END IF;
  IF _points IS NULL OR _points < -300 OR _points > 30 THEN
    RAISE EXCEPTION 'invalid_points';
  END IF;

  SELECT * INTO _sess FROM public.training_sessions WHERE id = _session_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_session'; END IF;
  IF _sess.started_at < now() - interval '24 hours' THEN RAISE EXCEPTION 'session_expired'; END IF;

  SELECT count(*) INTO _recent FROM public.played_hands
   WHERE user_id = _uid AND played_at > now() - interval '1 minute';
  IF _recent >= 40 THEN RAISE EXCEPTION 'rate_limited'; END IF;

  _correct := CASE WHEN _feedback IN ('best','correct') THEN 1 ELSE 0 END;

  INSERT INTO public.played_hands (user_id, session_id, hand, scenario, "position", stack,
    user_action, correct_action, feedback, points, ev_loss)
  VALUES (_uid, _session_id, left(coalesce(_hand,''),16), left(coalesce(_scenario,''),32),
          left(coalesce(_position,''),16), coalesce(_stack,0), left(coalesce(_user_action,''),16),
          left(coalesce(_correct_action,''),16), _feedback, _points, coalesce(_ev_loss,0));

  UPDATE public.training_sessions ts
     SET hands_played = ts.hands_played + 1,
         score = ts.score + _points,
         accuracy = COALESCE((
           SELECT round(100.0 * count(*) FILTER (WHERE ph.feedback IN ('best','correct')) / NULLIF(count(*),0))
             FROM public.played_hands ph WHERE ph.session_id = _session_id), 0)
   WHERE ts.id = _session_id;

  UPDATE public.profiles p
     SET total_xp = p.total_xp + _points,
         hands_played = p.hands_played + 1,
         level = public.calc_level(p.total_xp + _points),
         updated_at = now()
   WHERE p.user_id = _uid
   RETURNING p.total_xp, p.level, p.hands_played INTO _xp, _lvl, _hp;

  PERFORM public.apply_ranking_delta(_uid, _points, 1, _correct);

  RETURN jsonb_build_object('total_xp', _xp, 'level', _lvl, 'hands_played', _hp);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_hand_result(uuid,text,text,text,integer,text,text,text,integer,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_hand_result(uuid,text,text,text,integer,text,text,text,integer,numeric) TO authenticated;

-- ============ A7: complete_level_test ============
CREATE OR REPLACE FUNCTION public.complete_level_test(_results jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _done timestamptz;
  _n integer;
  _correct integer := 0;
  _acc integer;
  _xp integer;
  _session_id uuid;
  _r jsonb;
  _total_xp integer; _lvl integer; _hp integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF jsonb_typeof(_results) <> 'array' THEN RAISE EXCEPTION 'invalid_results'; END IF;
  _n := jsonb_array_length(_results);
  IF _n <> 10 THEN RAISE EXCEPTION 'invalid_results'; END IF;

  SELECT level_test_completed_at INTO _done FROM public.profiles WHERE user_id = _uid;
  IF _done IS NOT NULL THEN RAISE EXCEPTION 'already_completed'; END IF;

  FOR _r IN SELECT jsonb_array_elements(_results) LOOP
    IF coalesce((_r->>'correct')::boolean, false) THEN _correct := _correct + 1; END IF;
  END LOOP;

  _acc := round(100.0 * _correct / _n);
  _xp := CASE WHEN _acc >= 86 THEN 250 WHEN _acc >= 60 THEN 120 ELSE 50 END;

  INSERT INTO public.training_sessions (user_id, scenario, "position", stack, hands_played, accuracy, score, ended_at)
  VALUES (_uid, 'openRaise', 'BTN', 50, _n, _acc, _xp, now())
  RETURNING id INTO _session_id;

  INSERT INTO public.played_hands (user_id, session_id, hand, scenario, "position", stack,
    user_action, correct_action, feedback, points, ev_loss)
  SELECT _uid, _session_id,
         left(coalesce(e->>'hand',''),16), left(coalesce(e->>'scenario',''),32),
         left(coalesce(e->>'position',''),16), coalesce((e->>'stack')::int, 0),
         left(coalesce(e->>'user_action',''),16), left(coalesce(e->>'correct_action',''),16),
         CASE WHEN coalesce((e->>'correct')::boolean,false) THEN 'correct' ELSE 'mistake' END,
         CASE WHEN coalesce((e->>'correct')::boolean,false) THEN 10 ELSE 0 END,
         0
    FROM jsonb_array_elements(_results) AS e;

  UPDATE public.profiles p
     SET total_xp = p.total_xp + _xp,
         hands_played = p.hands_played + _n,
         level = public.calc_level(p.total_xp + _xp),
         level_test_completed_at = now(),
         updated_at = now()
   WHERE p.user_id = _uid
   RETURNING p.total_xp, p.level, p.hands_played INTO _total_xp, _lvl, _hp;

  PERFORM public.apply_ranking_delta(_uid, _xp, _n, _correct);

  RETURN jsonb_build_object('total_xp', _total_xp, 'level', _lvl, 'hands_played', _hp,
                            'accuracy', _acc, 'xp_earned', _xp, 'correct', _correct);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.complete_level_test(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_level_test(jsonb) TO authenticated;