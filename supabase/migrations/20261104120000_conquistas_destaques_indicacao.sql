-- Conquistas novas, destaques no perfil, insígnia de indicação e XP do UTG1.
--
-- Pedidos do Filipe em 04/11/2026. O que esta migration faz no banco:
--
-- 1. training_sessions.aleatorio (boolean, padrão false). O app marca a sessão
--    do modo Aleatório. Sniper GTO, Perfeição Estendida e Solver Humano passam
--    a valer só em sessão marcada assim. Quem já tem essas conquistas fica com
--    elas: nada é apagado.
--
-- 2. profiles.conquistas_destaque (text[], até 3). As conquistas que o jogador
--    escolhe mostrar no perfil. A coluna é legível por quem já lê o perfil
--    (todo usuário logado). Um gatilho recusa conquista que a pessoa não tem,
--    repetida ou mais de 3, mesmo se gravada direto pela API.
--
-- 3. insignias_de_indicacao(uuid[]): devolve, para uma lista de jogadores, o
--    nível de indicação (1 a 5) tirado das conquistas indica_*. As conquistas
--    continuam privadas; a função entrega só o nível, para a insígnia aparecer
--    no ranking, na comunidade e no perfil.
--
-- 4. unlock_achievement: as três conquistas acima pedem sessão do Aleatório, e
--    entram as conquistas de liga (chegar ao Ouro, Adamantio, Rúnico, Diamante
--    e Rei, e passar 3 dias no Rei), conferidas em liga_jogador e
--    liga_historico_dia.
--
-- 5. claim_simulado: no simulado, a mão do UTG1 na mesa de 8 (game_mode
--    '8max') rende 1/3 do ganho, igual ao treino livre (pesarPorPosicao em
--    src/lib/dificuldade.ts). A perda não muda.
--
-- 6. A conta do Filipe (farubini2@gmail.com) recebe as cinco conquistas de
--    indicação, até a Embaixador GTORei (nível 5): ele trouxe os jogadores no
--    orgânico, sem link de convite. Só conquista: não paga XP.
--
-- Nada é apagado. Para desfazer o item 6:
--   DELETE FROM public.user_achievements WHERE achievement_key LIKE 'indica_%'
--     AND user_id = (SELECT id FROM auth.users WHERE email = 'farubini2@gmail.com');

BEGIN;

-- 1. Sessão do modo Aleatório --------------------------------------------------

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS aleatorio boolean NOT NULL DEFAULT false;
-- O INSERT do app é por coluna desde 20261005120000_travar_pontuacao.sql
GRANT INSERT (aleatorio) ON public.training_sessions TO authenticated;

-- 2. Destaques do perfil -------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS conquistas_destaque text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_conquistas_destaque_max3;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_conquistas_destaque_max3 CHECK (cardinality(conquistas_destaque) <= 3);
GRANT UPDATE (conquistas_destaque) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public._conferir_destaques()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.conquistas_destaque IS NULL THEN
    NEW.conquistas_destaque := '{}';
  END IF;
  IF cardinality(NEW.conquistas_destaque) > 3 THEN
    RAISE EXCEPTION 'destaques_demais';
  END IF;
  IF (SELECT count(DISTINCT k) FROM unnest(NEW.conquistas_destaque) k) <> cardinality(NEW.conquistas_destaque) THEN
    RAISE EXCEPTION 'destaque_repetido';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(NEW.conquistas_destaque) k
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements a
      WHERE a.user_id = NEW.user_id AND a.achievement_key = k
    )
  ) THEN
    RAISE EXCEPTION 'destaque_sem_conquista';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._conferir_destaques() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS conferir_destaques ON public.profiles;
CREATE TRIGGER conferir_destaques
  BEFORE INSERT OR UPDATE OF conquistas_destaque ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public._conferir_destaques();

-- 3. Insígnia de indicação -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.insignias_de_indicacao(_ids uuid[])
RETURNS TABLE (user_id uuid, nivel smallint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.user_id,
         max(CASE a.achievement_key
               WHEN 'indica_1' THEN 1 WHEN 'indica_5' THEN 2 WHEN 'indica_15' THEN 3
               WHEN 'indica_40' THEN 4 WHEN 'indica_100' THEN 5
             END)::smallint
  FROM public.user_achievements a
  WHERE a.user_id = ANY (_ids[1:200])
    AND a.achievement_key IN ('indica_1', 'indica_5', 'indica_15', 'indica_40', 'indica_100')
  GROUP BY a.user_id
$$;
REVOKE EXECUTE ON FUNCTION public.insignias_de_indicacao(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insignias_de_indicacao(uuid[]) TO authenticated;

-- 4. Conquistas conferidas pelo servidor ---------------------------------------

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
  _elo int;
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

  -- Desde 04/11/2026: só em sessão do modo Aleatório
  ELSIF _key = 'session_perfect_50' THEN
    _valid := EXISTS (
      SELECT 1 FROM public.training_sessions
       WHERE user_id = _uid AND aleatorio AND accuracy = 100 AND hands_played >= 50
    );

  ELSIF _key = 'accuracy_90' THEN
    _valid := EXISTS (
      SELECT 1 FROM public.training_sessions
       WHERE user_id = _uid AND accuracy >= 90 AND hands_played >= 20
    );

  -- Desde 04/11/2026: só em sessão do modo Aleatório
  ELSIF _key IN ('accuracy_95','accuracy_98') THEN
    IF _key = 'accuracy_95' THEN _acc := 95; _min_hands := 100;
    ELSE _acc := 98; _min_hands := 50;
    END IF;
    _valid := EXISTS (
      SELECT 1 FROM public.training_sessions
       WHERE user_id = _uid AND aleatorio AND accuracy >= _acc AND hands_played >= _min_hands
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

  -- liga_N (3..7): chegou ao elo N em algum dia
  ELSIF _key ~ '^liga_[3-7]$' THEN
    _threshold := substring(_key from 6)::int;
    SELECT greatest(
             coalesce((SELECT elo FROM public.liga_jogador WHERE user_id = _uid), 1),
             coalesce((SELECT max(elo_depois) FROM public.liga_historico_dia WHERE user_id = _uid), 1)
           ) INTO _elo;
    _valid := _elo >= _threshold;

  -- liga_rei_3: terminou 3 dias no Rei e continuou nele
  ELSIF _key = 'liga_rei_3' THEN
    _valid := (
      SELECT count(*) FROM public.liga_historico_dia
       WHERE user_id = _uid AND elo_antes = 7 AND elo_depois = 7
    ) >= 3;

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

-- 5. Simulado: UTG1 da mesa de 8 rende 1/3 do ganho ---------------------------
-- Igual a 20261023130000_simulado.sql, mudando só a soma de _base.

CREATE OR REPLACE FUNCTION public.claim_simulado(_session_id uuid, _dificuldade text DEFAULT 'media')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _sess record;
  _total integer; _acertos integer; _best integer; _pontos_por_mao integer;
  _base numeric;
  _precisao numeric;
  _mult_precisao numeric;
  _mult_dif numeric;
  _xp integer;
  _pago boolean;
  _feitos integer;
  _novas text[] := ARRAY[]::text[];
  _k text;
  _total_xp integer; _lvl integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO _sess FROM public.training_sessions WHERE id = _session_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'sessao_invalida'; END IF;
  IF _sess.scenario IS DISTINCT FROM 'simulado' THEN RAISE EXCEPTION 'nao_e_simulado'; END IF;
  IF _sess.started_at < now() - interval '24 hours' THEN RAISE EXCEPTION 'sessao_expirada'; END IF;

  SELECT count(*),
         count(*) FILTER (WHERE feedback IN ('best', 'correct')),
         count(*) FILTER (WHERE feedback = 'best'),
         count(*) FILTER (WHERE points <> 0),
         coalesce(sum(
           CASE feedback WHEN 'best' THEN 15 WHEN 'correct' THEN 10 ELSE -5 END
           * CASE scenario WHEN 'openRaise' THEN 0.5 WHEN 'vs3bet' THEN 0.2 WHEN 'vsOpenShove' THEN 0.2 ELSE 1 END
           -- 04/11/2026: acerto no UTG1 da mesa de 8 vale 1/3
           * CASE WHEN feedback IN ('best', 'correct') AND position = 'UTG1'
                       AND coalesce(game_mode, '8max') = '8max' THEN 1.0 / 3 ELSE 1 END
         ), 0)
    INTO _total, _acertos, _best, _pontos_por_mao, _base
    FROM public.played_hands
   WHERE session_id = _session_id AND user_id = _uid;

  IF _total < 10 THEN RAISE EXCEPTION 'simulado_curto'; END IF;
  IF _total > 50 THEN RAISE EXCEPTION 'simulado_longo'; END IF;
  IF _pontos_por_mao > 0 THEN RAISE EXCEPTION 'nao_e_simulado'; END IF;

  _precisao := 100.0 * _acertos / _total;
  _mult_precisao := CASE WHEN _precisao >= 90 THEN 1.5 WHEN _precisao >= 80 THEN 1.25 ELSE 1 END;
  _mult_dif := CASE _dificuldade WHEN 'facil' THEN 0.7 WHEN 'dificil' THEN 1.2 WHEN 'elite' THEN 1.4 ELSE 1 END;
  _xp := least(600, greatest(0, round(_base * _mult_precisao * _mult_dif)))::int;

  _pago := false;
  IF _xp > 0 THEN
    _pago := public._dar_xp_bonus(_uid, 'simulado', _session_id::text, _xp);
    IF _pago THEN
      -- Conta no ranking do mês como as mãos do treino livre (mãos e acertos
      -- já entraram lá uma a uma, por record_hand_result)
      PERFORM public.apply_ranking_delta(_uid, _xp, 0, 0);
      -- E aparece como pontuação da sessão na página de Análise
      UPDATE public.training_sessions SET score = _xp WHERE id = _session_id;
    END IF;
  END IF;

  SELECT count(*) INTO _feitos FROM public.xp_bonus WHERE user_id = _uid AND origem = 'simulado';
  FOREACH _k IN ARRAY ARRAY[
    'simulado_1',
    CASE WHEN _feitos >= 10 THEN 'simulado_10' END,
    CASE WHEN _acertos = _total AND _total >= 20 THEN 'simulado_perfeito' END
  ] LOOP
    IF _k IS NOT NULL AND public._dar_conquista(_uid, _k) THEN _novas := _novas || _k; END IF;
  END LOOP;

  SELECT total_xp, level INTO _total_xp, _lvl FROM public.profiles WHERE user_id = _uid;
  RETURN jsonb_build_object(
    'xp', CASE WHEN _pago THEN _xp ELSE 0 END,
    'ja_pago', NOT _pago AND _xp > 0,
    'maos', _total, 'acertos', _acertos, 'best', _best,
    'precisao', round(_precisao)::int,
    'multiplicador_precisao', _mult_precisao,
    'total_xp', _total_xp, 'level', _lvl,
    'conquistas', to_jsonb(_novas));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_simulado(uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_simulado(uuid, text) TO authenticated;

-- 6. Insígnia máxima de indicação para o Filipe --------------------------------

INSERT INTO public.user_achievements (user_id, achievement_key)
SELECT u.id, k
FROM auth.users u
CROSS JOIN unnest(ARRAY['indica_1', 'indica_5', 'indica_15', 'indica_40', 'indica_100']) AS k
WHERE u.email = 'farubini2@gmail.com'
ON CONFLICT (user_id, achievement_key) DO NOTHING;

COMMIT;
