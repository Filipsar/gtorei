-- Trava a linha do perfil antes de checar o teste de nível, para que duas
-- chamadas simultâneas não concluam o teste (e não creditem o XP) duas vezes.
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

  SELECT level_test_completed_at INTO _done FROM public.profiles WHERE user_id = _uid FOR UPDATE;
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
