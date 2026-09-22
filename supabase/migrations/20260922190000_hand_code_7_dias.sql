-- ============================================================
-- ID público da mão, guardado por 7 dias
-- ============================================================
--
-- O ID de 18 caracteres que aparece na tela de resultado ("dPhtcPHVex1jQUyQxx")
-- era sorteado no navegador e não ia para lugar nenhum. Quem relatava um
-- problema mandava o ID e ninguém conseguia consultar a mão.
--
-- O QUE ESTA MIGRATION FAZ
--   1. guarda esse ID na linha da mão, junto com o contexto que faltava para
--      reconstruir o spot (modo de jogo, adversário e stack efetivo);
--   2. apaga o ID depois de 7 dias — A LINHA DA MÃO CONTINUA. Só o código sai.
--      Apagar a linha zeraria XP, precisão, ranking e histórico do jogador;
--   3. cria uma função de consulta pelo código, que só devolve a mão para o
--      próprio dono ou para um admin, e só dentro dos 7 dias.
--
-- EFEITO PARA O USUÁRIO: nenhum, além de o ID passar a servir para alguma
-- coisa. Nada muda na pontuação, no ranking ou no que a tela mostra.
--
-- ATENÇÃO À ORDEM: o passo 2 troca a assinatura de record_hand_result. Como a
-- migration roda inteira numa transação, não existe janela sem a função. O
-- código do site aguenta os dois formatos, então tanto faz aplicar antes ou
-- depois do deploy.

-- ============ 1. colunas ============

ALTER TABLE public.played_hands
  ADD COLUMN IF NOT EXISTS hand_code       text,
  ADD COLUMN IF NOT EXISTS game_mode       text,
  ADD COLUMN IF NOT EXISTS villain_position text,
  ADD COLUMN IF NOT EXISTS effective_stack integer;

COMMENT ON COLUMN public.played_hands.hand_code IS
  'ID de 18 caracteres mostrado ao jogador. Apagado 7 dias depois da mão (purge_old_hand_codes).';
COMMENT ON COLUMN public.played_hands.effective_stack IS
  'Stack que valeu para a decisão: o menor entre herói e vilão. A coluna stack guarda o do herói.';

-- Índice só sobre as linhas que ainda têm código: passados os 7 dias a linha
-- sai do índice sozinha, e ele fica do tamanho de uma semana de jogo.
CREATE INDEX IF NOT EXISTS idx_played_hands_code
  ON public.played_hands (hand_code)
  WHERE hand_code IS NOT NULL;

-- ============ 2. record_hand_result aceita o código e o contexto ============

-- Precisa dropar: acrescentar parâmetros com DEFAULT criaria uma sobrecarga, e
-- aí uma chamada por nome ficaria ambígua para o PostgREST.
DROP FUNCTION IF EXISTS public.record_hand_result(uuid,text,text,text,integer,text,text,text,integer,numeric);

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
  _ev_loss numeric DEFAULT 0,
  _hand_code text DEFAULT NULL,
  _game_mode text DEFAULT NULL,
  _villain_position text DEFAULT NULL,
  _effective_stack integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _sess record;
  _recent integer;
  _correct integer;
  _code text;
  _xp integer; _lvl integer; _hp integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _feedback NOT IN ('best','correct','inaccuracy','mistake','blunder') THEN
    RAISE EXCEPTION 'invalid_feedback';
  END IF;
  IF _points IS NULL OR _points < -300 OR _points > 30 THEN
    RAISE EXCEPTION 'invalid_points';
  END IF;

  -- Código fora do formato é descartado, e não recusado: perder a mão inteira
  -- (e o XP dela) por causa de um identificador seria pior do que ficar sem ele.
  _code := CASE WHEN _hand_code ~ '^[A-Za-z0-9]{18}$' THEN _hand_code ELSE NULL END;

  SELECT * INTO _sess FROM public.training_sessions WHERE id = _session_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_session'; END IF;
  IF _sess.started_at < now() - interval '24 hours' THEN RAISE EXCEPTION 'session_expired'; END IF;

  SELECT count(*) INTO _recent FROM public.played_hands
   WHERE user_id = _uid AND played_at > now() - interval '1 minute';
  IF _recent >= 40 THEN RAISE EXCEPTION 'rate_limited'; END IF;

  _correct := CASE WHEN _feedback IN ('best','correct') THEN 1 ELSE 0 END;

  INSERT INTO public.played_hands (user_id, session_id, hand, scenario, "position", stack,
    user_action, correct_action, feedback, points, ev_loss,
    hand_code, game_mode, villain_position, effective_stack)
  VALUES (_uid, _session_id, left(coalesce(_hand,''),16), left(coalesce(_scenario,''),32),
          left(coalesce(_position,''),16), coalesce(_stack,0), left(coalesce(_user_action,''),16),
          left(coalesce(_correct_action,''),16), _feedback, _points, coalesce(_ev_loss,0),
          _code, left(_game_mode,16), left(_villain_position,16), _effective_stack);

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

REVOKE EXECUTE ON FUNCTION public.record_hand_result(uuid,text,text,text,integer,text,text,text,integer,numeric,text,text,text,integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_hand_result(uuid,text,text,text,integer,text,text,text,integer,numeric,text,text,text,integer) TO authenticated;

-- ============ 3. os 7 dias ============

CREATE OR REPLACE FUNCTION public.purge_old_hand_codes()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  -- Só o código sai. A mão, o ponto e o XP ficam.
  UPDATE public.played_hands
     SET hand_code = NULL
   WHERE hand_code IS NOT NULL
     AND played_at < now() - interval '7 days';
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.purge_old_hand_codes() FROM PUBLIC, anon, authenticated;

-- Agenda diária, se o pg_cron estiver instalado. Se não estiver, a migration
-- passa assim mesmo e nada quebra: a consulta do passo 4 já recusa qualquer
-- mão com mais de 7 dias, então a promessa vale de qualquer jeito — o que
-- falta é só a faxina no disco, que dá para rodar na mão:
--     SELECT public.purge_old_hand_codes();
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_old_hand_codes') THEN
      PERFORM cron.unschedule('purge_old_hand_codes');
    END IF;
    PERFORM cron.schedule('purge_old_hand_codes', '17 4 * * *',
                          'SELECT public.purge_old_hand_codes();');
  END IF;
END $$;

-- ============ 4. consulta pelo código ============

CREATE OR REPLACE FUNCTION public.lookup_hand(_code text)
RETURNS TABLE (
  hand text,
  scenario text,
  "position" text,
  stack integer,
  effective_stack integer,
  game_mode text,
  villain_position text,
  user_action text,
  correct_action text,
  feedback text,
  points integer,
  ev_loss numeric,
  played_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _code IS NULL OR _code !~ '^[A-Za-z0-9]{18}$' THEN RAISE EXCEPTION 'invalid_code'; END IF;

  RETURN QUERY
  SELECT ph.hand, ph.scenario, ph."position", ph.stack, ph.effective_stack,
         ph.game_mode, ph.villain_position, ph.user_action, ph.correct_action,
         ph.feedback, ph.points, ph.ev_loss, ph.played_at
    FROM public.played_hands ph
   WHERE ph.hand_code = _code
     -- Fora da janela de 7 dias a mão não é devolvida, mesmo que a faxina
     -- ainda não tenha passado pela linha.
     AND ph.played_at > now() - interval '7 days'
     -- SECURITY DEFINER passa por cima do RLS, então o dono é conferido aqui:
     -- ninguém lê a mão de outra pessoa, só o próprio jogador ou um admin.
     AND (ph.user_id = _uid OR public.has_role(_uid, 'admin'::public.app_role))
   ORDER BY ph.played_at DESC
   LIMIT 1;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_hand(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.lookup_hand(text) TO authenticated;
