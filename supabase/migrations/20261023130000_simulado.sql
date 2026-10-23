-- =====================================================================
-- Simulado: série de mãos sem resposta, XP no fim
-- Escrito em 23/10/2026. NÃO APLICADO: quem aplica é o Filipe.
-- Depende da 20261021120000_indicacao_e_desafios (xp_bonus, _dar_xp_bonus,
-- _dar_conquista).
-- =====================================================================
--
-- COMO FUNCIONA
--   O site abre uma sessão de treino marcada como simulado
--   (training_sessions.scenario = 'simulado') e grava cada mão normalmente por
--   record_hand_result, mas com 0 ponto: a pessoa não vê se acertou. No fim,
--   chama claim_simulado(sessão), que corrige a série inteira aqui no servidor,
--   a partir de played_hands, e paga o XP uma vez só.
--
-- O XP
--   Por mão: "Best" 15, "Correta" 10, erro -5, multiplicado pelo peso do
--   cenário (Open Raise 0,5; Vs 3-bet e Vs Open Shove 0,2; o resto 1 — os
--   mesmos pesos do treino livre). Soma, e:
--     precisão de 90% ou mais: x1,5    80% ou mais: x1,25
--   e o multiplicador da dificuldade escolhida (0,7 a 1,4, o mesmo do treino
--   livre). Nunca negativo; no máximo 600 por simulado.
--   O XP vai para o total da conta E para o ranking do mês: é treino, como as
--   mãos do treino livre.
--
-- O QUE IMPEDE ABUSO
--   * sessão tem de ser da conta, marcada como simulado e de menos de 24 h;
--   * entre 10 e 50 mãos gravadas, e todas com 0 ponto (sessão normal, que já
--     pagou XP por mão, não vira simulado);
--   * pagamento único por sessão (chave no livro xp_bonus). Simulado que
--     rende 0 XP não é registrado; pedir de novo devolve 0 de novo.
-- =====================================================================

BEGIN;

-- O livro de XP bônus passa a aceitar a origem 'simulado'
ALTER TABLE public.xp_bonus DROP CONSTRAINT IF EXISTS xp_bonus_origem_check;
ALTER TABLE public.xp_bonus ADD CONSTRAINT xp_bonus_origem_check
  CHECK (origem IN ('indicacao', 'desafio', 'simulado'));

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

COMMIT;
