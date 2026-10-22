-- =====================================================================
-- Desafios semanais e mensais
-- Escrito em 23/10/2026. NÃO APLICADO: quem aplica é o Filipe.
-- Depende da 20261021120000_indicacao_e_desafios (xp_bonus, _dar_xp_bonus,
-- _dar_conquista, _hoje_brasilia, daily_challenge_claims).
-- =====================================================================
--
-- Mesmo desenho dos diários: três desafios por período, iguais para todo
-- mundo, escolhidos pela data; progresso contado em played_hands (que só o
-- servidor escreve); XP pago uma vez só pelo livro xp_bonus; não entra no
-- ranking mensal.
--
--   Semana: segunda a domingo (horário de Brasília). 250 a 600 XP cada.
--   Mês:    do dia 1 ao último dia.                   1.000 a 1.500 XP cada.
--
-- Três tipos por período: volume (mãos), qualidade (acertos, "Best",
-- precisão ou sequência) e constância (dias com 10+ mãos, ou desafios
-- diários resgatados).
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.period_challenge_claims (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  periodo      text NOT NULL CHECK (periodo IN ('semana', 'mes')),
  inicio       date NOT NULL,
  idx          smallint NOT NULL CHECK (idx BETWEEN 1 AND 3),
  chave        text NOT NULL,
  xp           integer NOT NULL,
  resgatado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, periodo, inicio, idx)
);
ALTER TABLE public.period_challenge_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.period_challenge_claims FROM anon, authenticated;
GRANT SELECT ON public.period_challenge_claims TO authenticated;
DROP POLICY IF EXISTS "Ver os proprios desafios de periodo" ON public.period_challenge_claims;
CREATE POLICY "Ver os proprios desafios de periodo" ON public.period_challenge_claims
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- Início do período que contém a data (segunda-feira, ou dia 1)
CREATE OR REPLACE FUNCTION public._inicio_periodo(_periodo text, _ref date)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _periodo = 'semana'
              THEN date_trunc('week', _ref::timestamp)::date
              ELSE date_trunc('month', _ref::timestamp)::date END;
$$;

CREATE OR REPLACE FUNCTION public._fim_periodo(_periodo text, _inicio date)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _periodo = 'semana' THEN _inicio + 7
              ELSE (_inicio + interval '1 month')::date END;
$$;

-- Os três desafios de um período. A escolha sai da data de início.
CREATE OR REPLACE FUNCTION public._desafios_do_periodo(_periodo text, _inicio date)
RETURNS TABLE (idx integer, chave text, titulo text, descricao text, tipo text, meta integer, xp integer)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  _n integer;
BEGIN
  IF _periodo = 'semana' THEN
    _n := (_inicio - date '2026-01-05') / 7;  -- 05/01/2026 é uma segunda
    _n := ((_n % 12) + 12) % 12;

    idx := 1; tipo := 'maos';
    meta := (ARRAY[150, 250, 400])[_n % 3 + 1];
    xp   := (ARRAY[250, 400, 600])[_n % 3 + 1];
    titulo := 'Jogue ' || meta || ' mãos na semana'; descricao := 'Qualquer modo e cenário conta.';
    chave := 'semana_maos_' || meta; RETURN NEXT;

    idx := 2;
    CASE (_n * 5 + 1) % 4
      WHEN 0 THEN tipo := 'acertos';   meta := 120; xp := 350; titulo := 'Acerte 120 decisões na semana';     descricao := 'Jogadas "Best" ou "Correta".';
      WHEN 1 THEN tipo := 'best';      meta := 40;  xp := 350; titulo := 'Faça 40 jogadas "Best" na semana';  descricao := 'A melhor ação da range, não só uma correta.';
      WHEN 2 THEN tipo := 'precisao';  meta := 150; xp := 400; titulo := '80% de acerto em 150 mãos';         descricao := 'Pelo menos 150 mãos na semana, com 80% ou mais de acerto.';
      ELSE        tipo := 'sequencia'; meta := 15;  xp := 350; titulo := 'Acerte 15 seguidas';                descricao := 'Uma sequência de 15 acertos sem errar no meio, em qualquer dia da semana.';
    END CASE;
    chave := 'semana_' || tipo || '_' || meta; RETURN NEXT;

    idx := 3;
    IF _n % 2 = 0 THEN
      tipo := 'dias'; meta := 4; xp := 300; titulo := 'Treine em 4 dias da semana'; descricao := 'Conta o dia com pelo menos 10 mãos.';
    ELSE
      tipo := 'diarios'; meta := 7; xp := 400; titulo := 'Resgate 7 desafios diários'; descricao := 'Qualquer um dos três de cada dia conta.';
    END IF;
    chave := 'semana_' || tipo || '_' || meta; RETURN NEXT;

  ELSE
    _n := extract(year FROM _inicio)::int * 12 + extract(month FROM _inicio)::int;

    idx := 1; tipo := 'maos';
    meta := (ARRAY[800, 1200])[_n % 2 + 1];
    xp   := (ARRAY[1000, 1500])[_n % 2 + 1];
    titulo := 'Jogue ' || replace(to_char(meta, 'FM999,999'), ',', '.') || ' mãos no mês'; descricao := 'Qualquer modo e cenário conta.';  -- 1.200, não 1200
    chave := 'mes_maos_' || meta; RETURN NEXT;

    idx := 2;
    CASE _n % 3
      WHEN 0 THEN tipo := 'acertos';  meta := 600; xp := 1200; titulo := 'Acerte 600 decisões no mês';      descricao := 'Jogadas "Best" ou "Correta".';
      WHEN 1 THEN tipo := 'precisao'; meta := 500; xp := 1500; titulo := '80% de acerto em 500 mãos';       descricao := 'Pelo menos 500 mãos no mês, com 80% ou mais de acerto.';
      ELSE        tipo := 'best';     meta := 150; xp := 1200; titulo := 'Faça 150 jogadas "Best" no mês';  descricao := 'A melhor ação da range, não só uma correta.';
    END CASE;
    chave := 'mes_' || tipo || '_' || meta; RETURN NEXT;

    idx := 3;
    IF (_n + 1) % 2 = 0 THEN
      tipo := 'dias'; meta := 15; xp := 1500; titulo := 'Treine em 15 dias do mês'; descricao := 'Conta o dia com pelo menos 10 mãos.';
    ELSE
      tipo := 'diarios'; meta := 30; xp := 1500; titulo := 'Resgate 30 desafios diários'; descricao := 'Qualquer um dos três de cada dia conta.';
    END IF;
    chave := 'mes_' || tipo || '_' || meta; RETURN NEXT;
  END IF;
END;
$$;

-- Progresso de uma conta num período. Tudo sai de played_hands e dos
-- desafios diários resgatados.
CREATE OR REPLACE FUNCTION public._progresso_periodo(_uid uuid, _periodo text, _inicio date)
RETURNS TABLE (idx integer, chave text, titulo text, descricao text, meta integer, xp integer,
               progresso integer, precisao integer, concluido boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _fim date := public._fim_periodo(_periodo, _inicio);
  _ini_ts timestamptz := (_inicio::timestamp AT TIME ZONE 'America/Sao_Paulo');
  _fim_ts timestamptz := (_fim::timestamp AT TIME ZONE 'America/Sao_Paulo');
  _maos integer; _acertos integer; _best integer; _seq integer; _dias integer; _diarios integer;
  _d record;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE feedback IN ('best', 'correct')),
         count(*) FILTER (WHERE feedback = 'best')
    INTO _maos, _acertos, _best
    FROM public.played_hands
   WHERE user_id = _uid AND played_at >= _ini_ts AND played_at < _fim_ts;

  SELECT coalesce(max(c), 0) INTO _seq FROM (
    SELECT count(*) AS c FROM (
      SELECT feedback IN ('best', 'correct') AS ok,
             row_number() OVER (ORDER BY played_at, id)
           - row_number() OVER (PARTITION BY feedback IN ('best', 'correct') ORDER BY played_at, id) AS grupo
        FROM public.played_hands
       WHERE user_id = _uid AND played_at >= _ini_ts AND played_at < _fim_ts
    ) t WHERE ok GROUP BY grupo
  ) s;

  SELECT count(*) INTO _dias FROM (
    SELECT (played_at AT TIME ZONE 'America/Sao_Paulo')::date
      FROM public.played_hands
     WHERE user_id = _uid AND played_at >= _ini_ts AND played_at < _fim_ts
     GROUP BY 1 HAVING count(*) >= 10
  ) d;

  SELECT count(*) INTO _diarios FROM public.daily_challenge_claims
   WHERE user_id = _uid AND dia >= _inicio AND dia < _fim;

  FOR _d IN SELECT * FROM public._desafios_do_periodo(_periodo, _inicio) LOOP
    idx := _d.idx; chave := _d.chave; titulo := _d.titulo; descricao := _d.descricao;
    meta := _d.meta; xp := _d.xp;
    precisao := CASE WHEN _maos > 0 THEN round(100.0 * _acertos / _maos)::int ELSE 0 END;
    progresso := CASE _d.tipo
      WHEN 'maos' THEN _maos WHEN 'acertos' THEN _acertos WHEN 'best' THEN _best
      WHEN 'sequencia' THEN _seq WHEN 'precisao' THEN _maos WHEN 'dias' THEN _dias
      WHEN 'diarios' THEN _diarios ELSE 0 END;
    concluido := progresso >= meta AND (_d.tipo <> 'precisao' OR precisao >= 80);
    progresso := least(progresso, meta);
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._progresso_periodo(uuid, text, date) FROM PUBLIC, anon, authenticated;

-- Semana e mês de hoje, com progresso e o que já foi resgatado
CREATE OR REPLACE FUNCTION public.get_period_challenges()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _hoje date := public._hoje_brasilia();
  _res jsonb := '{}'::jsonb;
  _per text;
  _ini date;
  _lista jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  FOREACH _per IN ARRAY ARRAY['semana', 'mes'] LOOP
    _ini := public._inicio_periodo(_per, _hoje);
    SELECT jsonb_agg(jsonb_build_object(
             'idx', p.idx, 'chave', p.chave, 'titulo', p.titulo, 'descricao', p.descricao,
             'meta', p.meta, 'xp', p.xp, 'progresso', p.progresso, 'precisao', p.precisao,
             'concluido', p.concluido,
             'resgatado', EXISTS (SELECT 1 FROM public.period_challenge_claims c
                                   WHERE c.user_id = _uid AND c.periodo = _per AND c.inicio = _ini AND c.idx = p.idx))
           ORDER BY p.idx)
      INTO _lista
      FROM public._progresso_periodo(_uid, _per, _ini) p;
    _res := _res || jsonb_build_object(_per, jsonb_build_object(
      'inicio', _ini,
      'fim', public._fim_periodo(_per, _ini) - 1,
      'desafios', _lista));
  END LOOP;
  RETURN _res;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_period_challenges() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_period_challenges() TO authenticated;

-- Resgata um desafio da semana ou do mês corrente
CREATE OR REPLACE FUNCTION public.claim_period_challenge(_periodo text, _idx integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _ini date;
  _p record;
  _n integer;
  _no_periodo integer;
  _total integer;
  _novas text[] := ARRAY[]::text[];
  _k text;
  _xp integer; _lvl integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _periodo NOT IN ('semana', 'mes') THEN RAISE EXCEPTION 'periodo_invalido'; END IF;
  _ini := public._inicio_periodo(_periodo, public._hoje_brasilia());

  SELECT * INTO _p FROM public._progresso_periodo(_uid, _periodo, _ini) WHERE idx = _idx;
  IF NOT FOUND THEN RAISE EXCEPTION 'desafio_invalido'; END IF;
  IF NOT _p.concluido THEN RAISE EXCEPTION 'desafio_incompleto'; END IF;

  INSERT INTO public.period_challenge_claims (user_id, periodo, inicio, idx, chave, xp)
  VALUES (_uid, _periodo, _ini, _idx, _p.chave, _p.xp)
  ON CONFLICT (user_id, periodo, inicio, idx) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;

  IF _n > 0 THEN
    PERFORM public._dar_xp_bonus(_uid, 'desafio', _periodo || ':' || _ini::text || '#' || _idx, _p.xp);

    SELECT count(*) INTO _no_periodo FROM public.period_challenge_claims
     WHERE user_id = _uid AND periodo = _periodo AND inicio = _ini;
    SELECT count(*) INTO _total FROM public.period_challenge_claims
     WHERE user_id = _uid AND periodo = _periodo;

    FOREACH _k IN ARRAY CASE WHEN _periodo = 'semana' THEN ARRAY[
        'semana_1',
        CASE WHEN _no_periodo >= 3 THEN 'semana_perfeita' END,
        CASE WHEN _total >= 10 THEN 'semana_10' END]
      ELSE ARRAY[
        'mes_1',
        CASE WHEN _no_periodo >= 3 THEN 'mes_perfeito' END] END
    LOOP
      IF _k IS NOT NULL AND public._dar_conquista(_uid, _k) THEN _novas := _novas || _k; END IF;
    END LOOP;
  END IF;

  SELECT total_xp, level INTO _xp, _lvl FROM public.profiles WHERE user_id = _uid;
  RETURN jsonb_build_object(
    'xp_ganho', CASE WHEN _n > 0 THEN _p.xp ELSE 0 END,
    'total_xp', _xp, 'level', _lvl,
    'conquistas', to_jsonb(_novas));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_period_challenge(text, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_period_challenge(text, integer) TO authenticated;

COMMIT;

-- Conferência (só leitura): os desafios das próximas semanas e meses
--   SELECT d, x.* FROM generate_series(date '2026-10-19', date '2026-11-30', '7 days') d,
--          LATERAL public._desafios_do_periodo('semana', d::date) x;
--   SELECT x.* FROM public._desafios_do_periodo('mes', date '2026-10-01') x;
