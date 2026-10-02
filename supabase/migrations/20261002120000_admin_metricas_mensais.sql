-- ============================================================
-- Admin: métricas mês a mês para o Dashboard
-- ============================================================
--
-- O Dashboard do admin só tinha retrato do momento (totais acumulados por
-- jogador, vindos da edge function admin-users). Para comparar com os meses
-- anteriores é preciso o histórico, e o RLS não deixa o navegador ler as mãos
-- dos outros jogadores. Esta função faz a conta no banco e devolve só os
-- agregados, uma linha por mês.
--
-- DE ONDE SAI CADA NÚMERO
--   novos / total_usuarios  profiles.created_at (é o "Cadastro" da tela).
--   ativos                  jogadores distintos com pelo menos uma mão no mês.
--   maos, precisao          played_hands, uma linha por mão. Precisão = mãos
--                           com points > 0, a mesma regra dos posts do
--                           @gtorei. NÃO usa training_sessions: lá
--                           hands_played soma 32.885 contra 45.023 mãos
--                           gravadas (02/10/2026), 468 sessões nunca fecham e
--                           há accuracy de até 989.
--   sessoes                 sessões distintas com mão no mês.
--   minutos                 soma dos intervalos entre mãos seguidas da mesma
--                           sessão, cada intervalo limitado a 5 min. Sessão
--                           aberta e esquecida não vira 7 horas de treino.
--
-- Mês no fuso de Brasília. Com _ate_dia = N, cada mês conta só do dia 1 ao
-- dia N: é o que deixa justa a comparação do mês corrente (incompleto) com
-- os anteriores.
--
-- SEGURANÇA
--   SECURITY DEFINER passa por cima do RLS; por isso a função recusa quem não
--   tem o papel admin (mesmo padrão de set_supporter). Só devolve contagens,
--   nenhum dado de jogador.
--
-- Até ser aplicada, a tela mostra só cadastros (que ela calcula sozinha) e
-- avisa que o resto depende desta migration.

CREATE OR REPLACE FUNCTION public.admin_monthly_metrics(
  _meses integer DEFAULT 12,
  _ate_dia integer DEFAULT NULL
) RETURNS TABLE (
  mes date,
  novos integer,
  total_usuarios integer,
  ativos integer,
  sessoes integer,
  maos integer,
  minutos integer,
  precisao numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _fim date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _inicio date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  _meses := greatest(1, least(coalesce(_meses, 12), 36));
  _inicio := (_fim - make_interval(months => _meses - 1))::date;

  RETURN QUERY
  WITH meses AS (
    SELECT generate_series(_inicio, _fim, interval '1 month')::date AS m
  ),
  perfis AS (
    SELECT (p.created_at AT TIME ZONE 'America/Sao_Paulo') AS t FROM public.profiles p
  ),
  maos_local AS (
    SELECT h.user_id, h.session_id, h.points, h.played_at,
           (h.played_at AT TIME ZONE 'America/Sao_Paulo') AS t
    FROM public.played_hands h
    WHERE h.played_at >= (_inicio::timestamp AT TIME ZONE 'America/Sao_Paulo')
  ),
  maos_filtradas AS (
    SELECT ml.*, date_trunc('month', ml.t)::date AS m,
           -- intervalo até a mão anterior da mesma sessão, no máximo 5 min
           least(
             coalesce(extract(epoch FROM ml.played_at - lag(ml.played_at)
               OVER (PARTITION BY ml.session_id ORDER BY ml.played_at)), 0),
             300
           ) AS gap_s
    FROM maos_local ml
    WHERE _ate_dia IS NULL OR extract(day FROM ml.t) <= _ate_dia
  ),
  por_mes AS (
    SELECT mf.m,
           count(DISTINCT mf.user_id)::integer   AS ativos,
           count(DISTINCT mf.session_id)::integer AS sessoes,
           count(*)::integer                       AS maos,
           round(sum(mf.gap_s) / 60)::integer      AS minutos,
           round(100.0 * avg((mf.points > 0)::int), 1) AS precisao
    FROM maos_filtradas mf
    GROUP BY mf.m
  )
  SELECT
    ms.m,
    (SELECT count(*) FROM perfis pf
      WHERE date_trunc('month', pf.t)::date = ms.m
        AND (_ate_dia IS NULL OR extract(day FROM pf.t) <= _ate_dia))::integer,
    -- acumulado até o fim do mês (ou até o dia _ate_dia dele)
    (SELECT count(*) FROM perfis pf
      WHERE pf.t < CASE WHEN _ate_dia IS NULL THEN ms.m + interval '1 month'
                        ELSE least(ms.m + make_interval(days => _ate_dia), ms.m + interval '1 month') END
    )::integer,
    coalesce(pm.ativos, 0),
    coalesce(pm.sessoes, 0),
    coalesce(pm.maos, 0),
    coalesce(pm.minutos, 0),
    pm.precisao
  FROM meses ms
  LEFT JOIN por_mes pm ON pm.m = ms.m
  ORDER BY ms.m;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_monthly_metrics(integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_monthly_metrics(integer, integer) TO authenticated;
