-- Ligas por elo (ranking do app).
--
-- Elos, do primeiro ao último: 1 Bronze, 2 Prata, 3 Ouro, 4 Adamantio,
-- 5 Rúnico, 6 Diamante, 7 Rei. Todo mundo começa no Bronze.
--
-- A disputa é semanal e usa o XP da semana que já existe em public.rankings
-- (period_type = 'weekly', semana de domingo a sábado no horário de Brasília,
-- a mesma conta de apply_ranking_delta). Ou seja: entra o XP das mãos e do
-- simulado; XP de desafio e de indicação não entra, como no ranking de hoje.
--
-- Ao fim de cada semana, dentro de cada elo:
--   * os 3 primeiros sobem um elo (precisam ter feito XP na semana);
--   * no Rei, quem ficar fora do top 10, ou sem XP na semana, cai para Diamante;
--   * ninguém cai nos outros elos.
--
-- O banco não tem pg_cron (conferido em 22/10/2026), então a semana fecha na
-- primeira chamada de get_liga() depois que ela acaba. Uma trava (advisory
-- lock) garante que só uma chamada processa. Se ninguém abrir a liga por
-- várias semanas, só a última semana fechada é processada.
--
-- Efeito no banco: três tabelas novas (liga_jogador, liga_semana,
-- liga_historico) e duas funções (_processar_ligas, get_liga). Não mexe em
-- tabela existente. As linhas somem junto com o usuário (ON DELETE CASCADE),
-- então a exclusão de conta já cobre estas tabelas.

-- Elo atual de cada jogador. Público para quem está logado (aparece no ranking
-- global e no perfil), mas só as funções do servidor escrevem.
CREATE TABLE IF NOT EXISTS public.liga_jogador (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  elo           smallint NOT NULL DEFAULT 1 CHECK (elo BETWEEN 1 AND 7),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liga_jogador ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liga_jogador_leitura" ON public.liga_jogador;
CREATE POLICY "liga_jogador_leitura" ON public.liga_jogador
  FOR SELECT TO authenticated USING (true);

-- Semanas já fechadas (domingo de início). Só o servidor lê e escreve.
CREATE TABLE IF NOT EXISTS public.liga_semana (
  semana        date PRIMARY KEY,
  processada_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liga_semana ENABLE ROW LEVEL SECURITY;

-- O que aconteceu com cada um em cada semana fechada. Cada um vê o seu.
CREATE TABLE IF NOT EXISTS public.liga_historico (
  semana     date NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  elo_antes  smallint NOT NULL,
  elo_depois smallint NOT NULL,
  posicao    integer NOT NULL,
  xp         integer NOT NULL,
  PRIMARY KEY (semana, user_id)
);
ALTER TABLE public.liga_historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "liga_historico_proprio" ON public.liga_historico;
CREATE POLICY "liga_historico_proprio" ON public.liga_historico
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- A primeira disputa é a semana que começa no próximo domingo. A semana atual
-- e a anterior já contam como fechadas, para ninguém subir pelo que jogou
-- antes das ligas existirem.
INSERT INTO public.liga_semana (semana)
SELECT d.domingo - s
FROM (
  SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date
         - EXTRACT(DOW FROM (now() AT TIME ZONE 'America/Sao_Paulo')::date)::int AS domingo
) d
CROSS JOIN (VALUES (0), (7)) AS v(s)
ON CONFLICT (semana) DO NOTHING;

CREATE OR REPLACE FUNCTION public._processar_ligas()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hoje    date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _semana  date := _hoje - EXTRACT(DOW FROM _hoje)::int;  -- domingo da semana atual
  _fechada date := _semana - 7;                           -- a semana que acabou
BEGIN
  IF EXISTS (SELECT 1 FROM public.liga_semana WHERE semana = _fechada) THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('gtorei_ligas'));
  -- Outra chamada pode ter fechado a semana enquanto esta esperava a trava
  IF EXISTS (SELECT 1 FROM public.liga_semana WHERE semana = _fechada) THEN
    RETURN;
  END IF;

  -- Quem jogou na semana e ainda não tinha elo entra no Bronze
  INSERT INTO public.liga_jogador (user_id)
  SELECT r.user_id
  FROM public.rankings r
  WHERE r.period_type = 'weekly' AND r.period_start = _fechada AND r.xp_earned > 0
  ON CONFLICT (user_id) DO NOTHING;

  WITH semana AS (
    SELECT lj.user_id, lj.elo, COALESCE(r.xp_earned, 0) AS xp
    FROM public.liga_jogador lj
    LEFT JOIN public.rankings r
      ON r.user_id = lj.user_id AND r.period_type = 'weekly' AND r.period_start = _fechada
  ),
  classificados AS (
    SELECT user_id, elo, xp,
           row_number() OVER (PARTITION BY elo ORDER BY xp DESC, user_id) AS posicao
    FROM semana
  ),
  novo AS (
    SELECT user_id, elo, xp, posicao,
           CASE
             WHEN elo < 7 AND posicao <= 3 AND xp > 0 THEN elo + 1
             WHEN elo = 7 AND (posicao > 10 OR xp <= 0) THEN 6
             ELSE elo
           END::smallint AS elo_novo
    FROM classificados
  ),
  historico AS (
    INSERT INTO public.liga_historico (semana, user_id, elo_antes, elo_depois, posicao, xp)
    SELECT _fechada, user_id, elo, elo_novo, posicao, xp
    FROM novo
    WHERE xp > 0 OR elo_novo <> elo
    ON CONFLICT (semana, user_id) DO NOTHING
  )
  UPDATE public.liga_jogador lj
  SET elo = n.elo_novo, atualizado_em = now()
  FROM novo n
  WHERE n.user_id = lj.user_id AND n.elo_novo <> lj.elo;

  INSERT INTO public.liga_semana (semana) VALUES (_fechada);
END;
$$;
REVOKE EXECUTE ON FUNCTION public._processar_ligas() FROM PUBLIC, anon, authenticated;

-- A liga de quem chama: elo, a semana, quem está no mesmo elo com XP na semana
-- (até 100, mais quem chama) e o que aconteceu na semana passada.
CREATE OR REPLACE FUNCTION public.get_liga()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid       uuid := auth.uid();
  _hoje      date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _semana    date := _hoje - EXTRACT(DOW FROM _hoje)::int;
  _elo       smallint;
  _jogadores jsonb;
  _ultima    jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  PERFORM public._processar_ligas();

  INSERT INTO public.liga_jogador (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT elo INTO _elo FROM public.liga_jogador WHERE user_id = _uid;

  WITH semana AS (
    SELECT lj.user_id, COALESCE(r.xp_earned, 0) AS xp
    FROM public.liga_jogador lj
    LEFT JOIN public.rankings r
      ON r.user_id = lj.user_id AND r.period_type = 'weekly' AND r.period_start = _semana
    WHERE lj.elo = _elo
  ),
  classificados AS (
    SELECT user_id, xp, row_number() OVER (ORDER BY xp DESC, user_id) AS posicao
    FROM semana
    WHERE xp > 0 OR user_id = _uid
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
  WHERE c.posicao <= 100 OR c.user_id = _uid;

  SELECT jsonb_build_object('elo_antes', h.elo_antes, 'elo_depois', h.elo_depois, 'posicao', h.posicao, 'xp', h.xp)
  INTO _ultima
  FROM public.liga_historico h
  WHERE h.user_id = _uid AND h.semana = _semana - 7;

  RETURN jsonb_build_object(
    'elo', _elo,
    'semana_inicio', _semana,
    'semana_fim', _semana + 6,
    'jogadores', _jogadores,
    'ultima', _ultima
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_liga() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_liga() TO authenticated;
