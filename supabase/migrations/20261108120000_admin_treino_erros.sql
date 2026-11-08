-- Onde os jogadores erram no treino de torneio — 08/11/2026
--
-- O Filipe pediu no /admin o mesmo painel que existe para o Cash
-- (admin_cash_erros, migration 20261031140000), agora para o treino todo:
-- 8-max, 3-handed, HU e bounty. As mãos já ficam em played_hands; esta função
-- só agrega.
--
-- Efeito: cria public.admin_treino_erros(_desde, _modo). Só leitura; não mexe
-- em tabela nem em política. Só o admin chama (confere has_role dentro, como
-- admin_cash_erros e admin_monthly_metrics). Devolve números agregados, sem
-- user_id, nome ou e-mail:
--   por_modo, por_cenario, por_posicao, por_stack (faixas de stack),
--   por_vilao, maos_mais_erradas (com pelo menos 5 jogadas) e trocas (o que o
--   jogador fez quando errou, contra o que era certo).
-- "Acerto" = feedback 'best' ou 'correct', como no resto do site.
--
-- _modo: NULL = todos os modos de torneio (tudo menos 'cash', que tem o painel
-- próprio). Ou um modo só: '8max', 'threehand', 'hu', 'bounty'.
-- A Simulação (scenario = 'simulation') fica de fora: até 25/09/2026 ela
-- gravava tudo como fold por um defeito de range (ver CLAUDE-conteudo.md).

CREATE OR REPLACE FUNCTION public.admin_treino_erros(
  _desde timestamptz DEFAULT now() - interval '30 days',
  _modo text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  WITH m AS (
    SELECT coalesce(game_mode, 'outro') AS modo, scenario, position, villain_position, hand,
           user_action, correct_action, user_id,
           CASE WHEN stack <= 10 THEN 'até 10 BB'
                WHEN stack <= 20 THEN '11 a 20 BB'
                WHEN stack <= 40 THEN '21 a 40 BB'
                ELSE '41 BB ou mais' END AS faixa,
           (feedback IN ('best', 'correct')) AS acertou, coalesce(ev_loss, 0) AS ev_loss
      FROM public.played_hands
     WHERE played_at >= _desde
       AND game_mode IS DISTINCT FROM 'cash'
       AND scenario <> 'simulation'
       AND (_modo IS NULL OR game_mode = _modo)
  )
  SELECT jsonb_build_object(
    'maos', (SELECT count(*) FROM m),
    'jogadores', (SELECT count(DISTINCT user_id) FROM m),
    'acerto', (SELECT round(100.0 * avg(acertou::int), 1) FROM m),
    'por_modo', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'maos')::int DESC) FROM (
        SELECT jsonb_build_object('chave', modo, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1)) x
          FROM m GROUP BY modo) s), '[]'::jsonb),
    'por_cenario', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric) FROM (
        SELECT jsonb_build_object('chave', scenario, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1), 'ev_perdido', round(avg(ev_loss), 2)) x
          FROM m GROUP BY scenario) s), '[]'::jsonb),
    'por_posicao', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric) FROM (
        SELECT jsonb_build_object('chave', scenario || ' · ' || position, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1)) x
          FROM m GROUP BY scenario, position HAVING count(*) >= 10) s), '[]'::jsonb),
    'por_stack', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric) FROM (
        SELECT jsonb_build_object('chave', scenario || ' · ' || faixa, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1)) x
          FROM m GROUP BY scenario, faixa HAVING count(*) >= 10) s), '[]'::jsonb),
    'por_vilao', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric) FROM (
        SELECT jsonb_build_object('chave', scenario || ' · ' || position || ' contra ' || villain_position, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1)) x
          FROM m WHERE villain_position IS NOT NULL GROUP BY scenario, position, villain_position HAVING count(*) >= 10
          ORDER BY avg(acertou::int) LIMIT 20) s), '[]'::jsonb),
    'maos_mais_erradas', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric, (x->>'maos')::int DESC) FROM (
        SELECT jsonb_build_object('chave', scenario || ' · ' || position || ' · ' || faixa || ' · ' || hand, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1),
                                  'certo', mode() WITHIN GROUP (ORDER BY correct_action), 'mais_jogado', mode() WITHIN GROUP (ORDER BY user_action)) x
          FROM m GROUP BY scenario, position, faixa, hand HAVING count(*) >= 5
          ORDER BY avg(acertou::int), count(*) DESC LIMIT 25) s), '[]'::jsonb),
    'trocas', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'maos')::int DESC) FROM (
        SELECT jsonb_build_object('chave', 'fez ' || user_action || ', era ' || correct_action, 'maos', count(*)) x
          FROM m WHERE NOT acertou GROUP BY user_action, correct_action) s), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_treino_erros(timestamptz, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_treino_erros(timestamptz, text) TO authenticated;
