-- Onde os jogadores erram no Cash (beta) — 31/10/2026
--
-- O Cash foi liberado para todos como beta, e o Filipe pediu para medir desde
-- o início onde os jogadores mais erram. As mãos já ficam em played_hands
-- (game_mode = 'cash'); esta função só agrega.
--
-- Efeito: cria public.admin_cash_erros(_desde). Só leitura; só o admin chama
-- (confere has_role dentro). Devolve números agregados, sem user_id, nome ou
-- e-mail: acerto por cenário, por posição, por vilão, as mãos que mais erram
-- (com pelo menos 5 jogadas) e o que o jogador fez quando errou.
-- "Acerto" = feedback 'best' ou 'correct', como no resto do site.

CREATE OR REPLACE FUNCTION public.admin_cash_erros(_desde timestamptz DEFAULT now() - interval '30 days')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  WITH m AS (
    SELECT scenario, position, villain_position, hand, user_action, correct_action,
           (feedback IN ('best', 'correct')) AS acertou, coalesce(ev_loss, 0) AS ev_loss, user_id
      FROM public.played_hands
     WHERE game_mode = 'cash' AND played_at >= _desde
  )
  SELECT jsonb_build_object(
    'maos', (SELECT count(*) FROM m),
    'jogadores', (SELECT count(DISTINCT user_id) FROM m),
    'acerto', (SELECT round(100.0 * avg(acertou::int), 1) FROM m),
    'por_cenario', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric) FROM (
        SELECT jsonb_build_object('chave', scenario, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1), 'ev_perdido', round(avg(ev_loss), 2)) x
          FROM m GROUP BY scenario) s), '[]'::jsonb),
    'por_posicao', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric) FROM (
        SELECT jsonb_build_object('chave', scenario || ' · ' || position, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1)) x
          FROM m GROUP BY scenario, position HAVING count(*) >= 3) s), '[]'::jsonb),
    'por_vilao', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'acerto')::numeric) FROM (
        SELECT jsonb_build_object('chave', scenario || ' · ' || position || ' contra ' || villain_position, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1)) x
          FROM m WHERE villain_position IS NOT NULL GROUP BY scenario, position, villain_position HAVING count(*) >= 3) s), '[]'::jsonb),
    'maos_mais_erradas', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT jsonb_build_object('chave', scenario || ' · ' || position || ' · ' || hand, 'maos', count(*), 'acerto', round(100.0 * avg(acertou::int), 1),
                                  'certo', mode() WITHIN GROUP (ORDER BY correct_action), 'mais_jogado', mode() WITHIN GROUP (ORDER BY user_action)) x
          FROM m GROUP BY scenario, position, hand HAVING count(*) >= 5
          ORDER BY avg(acertou::int), count(*) DESC LIMIT 15) s), '[]'::jsonb),
    'trocas', coalesce((SELECT jsonb_agg(x ORDER BY (x->>'maos')::int DESC) FROM (
        SELECT jsonb_build_object('chave', 'fez ' || user_action || ', era ' || correct_action, 'maos', count(*)) x
          FROM m WHERE NOT acertou GROUP BY user_action, correct_action) s), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_cash_erros(timestamptz) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_cash_erros(timestamptz) TO authenticated;
