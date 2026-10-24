-- Ligas diárias, com regras de subida e queda por elo.
--
-- Troca a disputa semanal (20261024130000_ligas_por_elo.sql) por uma disputa
-- por dia, no horário de Brasília, com o XP do dia que já existe em
-- public.rankings (period_type = 'daily', a mesma conta de
-- apply_ranking_delta: mãos, duelo e simulado; desafio e indicação não entram).
--
-- No fim de cada dia, dentro de cada elo (posição pelo XP do dia, entre todos
-- os jogadores do elo, inclusive quem não jogou):
--
--   elo          sobem (os N primeiros, com XP no dia)   caem (desta posição para baixo)
--   Bronze       10                                       ninguém cai
--   Prata        10                                       20º
--   Ouro         10                                       20º
--   Adamantio     6                                       15º
--   Rúnico        6                                       10º
--   Diamante      3                                       10º
--   Rei          (topo)                                   11º (fica quem termina no top 10 com XP)
--
-- Sobe e cai um elo por dia. As mesmas regras estão no app em src/data/elos.ts
-- (REGRAS_DOS_ELOS): mudou aqui, muda lá.
--
-- Sem pg_cron: o dia fecha na primeira chamada de get_liga() depois da
-- meia-noite. Dias que ninguém abriu a liga são fechados em ordem, até 7 para
-- trás. O dia de hoje é o primeiro a valer; os anteriores contam como fechados.
--
-- Efeito no banco: duas tabelas novas (liga_dia, liga_historico_dia), troca
-- get_liga() e remove _processar_ligas() (a semanal). liga_jogador continua
-- igual (os elos atuais ficam); liga_semana e liga_historico ficam sem uso.
-- As linhas novas somem com o usuário (ON DELETE CASCADE).

-- Dias já fechados. Só o servidor lê e escreve.
CREATE TABLE IF NOT EXISTS public.liga_dia (
  dia           date PRIMARY KEY,
  processado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liga_dia ENABLE ROW LEVEL SECURITY;

-- O que aconteceu com cada um em cada dia fechado. Cada um vê o seu.
CREATE TABLE IF NOT EXISTS public.liga_historico_dia (
  dia        date NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  elo_antes  smallint NOT NULL,
  elo_depois smallint NOT NULL,
  posicao    integer NOT NULL,
  xp         integer NOT NULL,
  PRIMARY KEY (dia, user_id)
);
ALTER TABLE public.liga_historico_dia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liga_historico_dia_proprio" ON public.liga_historico_dia;
CREATE POLICY "liga_historico_dia_proprio" ON public.liga_historico_dia
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Ontem conta como fechado: a primeira disputa diária é a de hoje
INSERT INTO public.liga_dia (dia)
VALUES ((now() AT TIME ZONE 'America/Sao_Paulo')::date - 1)
ON CONFLICT (dia) DO NOTHING;

-- Regras de cada elo: quantos sobem e a partir de que posição cai (nulo: ninguém)
CREATE OR REPLACE FUNCTION public._regra_do_elo(_elo smallint, OUT sobem int, OUT cai_a int)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT r.sobem, r.cai_a
  FROM (VALUES (1, 10, NULL::int), (2, 10, 20), (3, 10, 20), (4, 6, 15), (5, 6, 10), (6, 3, 10), (7, 0, 11))
       AS r(elo, sobem, cai_a)
  WHERE r.elo = _elo
$$;
REVOKE EXECUTE ON FUNCTION public._regra_do_elo(smallint) FROM PUBLIC, anon, authenticated;

-- Fecha um dia: classifica cada elo pelo XP do dia e sobe/desce um elo
CREATE OR REPLACE FUNCTION public._fechar_dia_da_liga(_dia date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quem pontuou no dia e ainda não tinha elo entra no Bronze
  INSERT INTO public.liga_jogador (user_id)
  SELECT r.user_id
  FROM public.rankings r
  WHERE r.period_type = 'daily' AND r.period_start = _dia AND r.xp_earned > 0
  ON CONFLICT (user_id) DO NOTHING;

  WITH do_dia AS (
    SELECT lj.user_id, lj.elo, COALESCE(r.xp_earned, 0) AS xp
    FROM public.liga_jogador lj
    LEFT JOIN public.rankings r
      ON r.user_id = lj.user_id AND r.period_type = 'daily' AND r.period_start = _dia
  ),
  classificados AS (
    SELECT user_id, elo, xp,
           row_number() OVER (PARTITION BY elo ORDER BY xp DESC, user_id) AS posicao
    FROM do_dia
  ),
  novo AS (
    SELECT c.user_id, c.elo, c.xp, c.posicao,
           CASE
             WHEN c.elo < 7 AND c.posicao <= g.sobem AND c.xp > 0 THEN c.elo + 1
             WHEN g.cai_a IS NOT NULL AND c.posicao >= g.cai_a THEN c.elo - 1
             -- No Rei, quem não jogou no dia também cai
             WHEN c.elo = 7 AND c.xp <= 0 THEN 6
             ELSE c.elo
           END::smallint AS elo_novo
    FROM classificados c
    CROSS JOIN LATERAL public._regra_do_elo(c.elo) g
  ),
  historico AS (
    INSERT INTO public.liga_historico_dia (dia, user_id, elo_antes, elo_depois, posicao, xp)
    SELECT _dia, user_id, elo, elo_novo, posicao, xp
    FROM novo
    WHERE xp > 0 OR elo_novo <> elo
    ON CONFLICT (dia, user_id) DO NOTHING
  )
  UPDATE public.liga_jogador lj
  SET elo = n.elo_novo, atualizado_em = now()
  FROM novo n
  WHERE n.user_id = lj.user_id AND n.elo_novo <> lj.elo;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._fechar_dia_da_liga(date) FROM PUBLIC, anon, authenticated;

-- Fecha, em ordem, os dias que acabaram e ainda não foram processados
CREATE OR REPLACE FUNCTION public._processar_ligas_do_dia()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _dia  date;
BEGIN
  IF EXISTS (SELECT 1 FROM public.liga_dia WHERE dia = _hoje - 1) THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('gtorei_ligas'));

  SELECT max(dia) + 1 INTO _dia FROM public.liga_dia;
  -- Nunca mais que uma semana para trás (e começa ontem se a tabela estiver vazia)
  _dia := greatest(COALESCE(_dia, _hoje - 1), _hoje - 7);
  WHILE _dia < _hoje LOOP
    -- Outra chamada pode ter fechado o dia enquanto esta esperava a trava
    IF NOT EXISTS (SELECT 1 FROM public.liga_dia WHERE dia = _dia) THEN
      PERFORM public._fechar_dia_da_liga(_dia);
      INSERT INTO public.liga_dia (dia) VALUES (_dia) ON CONFLICT (dia) DO NOTHING;
    END IF;
    _dia := _dia + 1;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._processar_ligas_do_dia() FROM PUBLIC, anon, authenticated;

-- A semanal deixa de existir
DROP FUNCTION IF EXISTS public._processar_ligas();

-- A liga de quem chama: elo, regras, a classificação do dia e o que aconteceu
-- ontem. No Bronze lista só quem pontuou (e quem chama); nos outros elos lista
-- todo mundo, porque quem não jogou também ocupa posição (e pode cair).
CREATE OR REPLACE FUNCTION public.get_liga()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid       uuid := auth.uid();
  _hoje      date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _elo       smallint;
  _sobem     int;
  _cai_a     int;
  _total     int;
  _jogadores jsonb;
  _ultima    jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public._processar_ligas_do_dia();

  INSERT INTO public.liga_jogador (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT elo INTO _elo FROM public.liga_jogador WHERE user_id = _uid;
  SELECT g.sobem, g.cai_a INTO _sobem, _cai_a FROM public._regra_do_elo(_elo) g;
  SELECT count(*) INTO _total FROM public.liga_jogador WHERE elo = _elo;

  WITH do_dia AS (
    SELECT lj.user_id, COALESCE(r.xp_earned, 0) AS xp
    FROM public.liga_jogador lj
    LEFT JOIN public.rankings r
      ON r.user_id = lj.user_id AND r.period_type = 'daily' AND r.period_start = _hoje
    WHERE lj.elo = _elo
  ),
  classificados AS (
    SELECT user_id, xp, row_number() OVER (ORDER BY xp DESC, user_id) AS posicao
    FROM do_dia
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'user_id', c.user_id,
           'username', COALESCE(p.username, 'Jogador'),
           'avatar_url', p.avatar_url,
           'xp', c.xp,
           'posicao', c.posicao,
           'eu', c.user_id = _uid
         ) ORDER BY c.posicao), '[]'::jsonb)
  INTO _jogadores
  FROM classificados c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE (c.posicao <= 100 OR c.user_id = _uid)
    AND (_elo > 1 OR c.xp > 0 OR c.user_id = _uid);

  SELECT jsonb_build_object('elo_antes', h.elo_antes, 'elo_depois', h.elo_depois, 'posicao', h.posicao, 'xp', h.xp)
  INTO _ultima
  FROM public.liga_historico_dia h
  WHERE h.user_id = _uid AND h.dia = _hoje - 1;

  RETURN jsonb_build_object(
    'elo', _elo,
    'dia', _hoje,
    'sobem', _sobem,
    'cai_a', _cai_a,
    'total', _total,
    'jogadores', _jogadores,
    'ultima', _ultima
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_liga() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_liga() TO authenticated;
