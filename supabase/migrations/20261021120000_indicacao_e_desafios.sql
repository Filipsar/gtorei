-- =====================================================================
-- Indicação, desafios diários e as conquistas dos dois
-- Escrito em 21/10/2026. NÃO APLICADO: quem aplica é o Filipe (SQL Editor do
-- Supabase), depois de ler o efeito de cada bloco.
-- =====================================================================
--
-- O QUE MUDA PARA O JOGADOR
--   * Cada conta ganha um link de convite (gtorei.com.br/?ref=CODIGO).
--   * Indicado válido = conta nova criada pelo link que treina 50 mãos em até
--     30 dias. Conta fantasma não conta.
--   * Níveis de indicação: 1, 5, 15, 40 e 100 indicados válidos. Os níveis 1 a
--     4 dão XP (150, 500, 1.500 e 4.000). O nível 5 dá o direito de concorrer ao
--     sorteio mensal de US$ 100, que o site só anuncia quando a autorização do
--     Ministério da Fazenda sair (Lei 5.768/71). Aqui o banco só registra quem
--     chegou lá; o sorteio em si é feito fora do app, pelo regulamento.
--   * Três desafios por dia, os mesmos para todo mundo, que trocam à meia-noite
--     de Brasília. Cada um dá de 50 a 120 XP ao ser resgatado.
--   * 13 conquistas novas: 5 de indicação e 8 de desafios.
--
-- DE ONDE VEM A CONFIANÇA NOS NÚMEROS
--   O progresso dos desafios é contado em played_hands, que só o servidor
--   escreve (record_hand_result; a trava de escrita direta é a migration
--   20261005120000_travar_pontuacao). A validação do indicado olha
--   profiles.hands_played, escrito pelo mesmo caminho. Nada aqui confia em
--   número mandado pelo navegador. Sem a 20261005120000 aplicada, um usuário
--   ainda conseguiria inflar as próprias mãos pelo console e validar indicações
--   falsas: aplique aquela antes desta.
--
-- XP BÔNUS NÃO ENTRA NO RANKING
--   O XP de indicação e de desafio soma no total da conta (e no nível), mas não
--   no ranking mensal, que continua medindo só treino. Decisão de 21/10/2026.
--
-- NADA AQUI MEXE EM record_hand_result
--   A validação do indicado é um gatilho em profiles, protegido para nunca
--   derrubar a gravação da mão se algo nele falhar.
-- =====================================================================

BEGIN;

-- =====================================================================
-- 0. Peças comuns: livro de XP bônus e entrega de conquista
-- =====================================================================

-- Todo XP que não vem de mão jogada passa por aqui. A chave única
-- (user_id, origem, referencia) é o que impede pagar duas vezes o mesmo
-- desafio ou o mesmo nível de indicação, mesmo com cliques repetidos.
CREATE TABLE IF NOT EXISTS public.xp_bonus (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origem     text NOT NULL CHECK (origem IN ('indicacao', 'desafio')),
  referencia text NOT NULL,
  xp         integer NOT NULL CHECK (xp > 0 AND xp <= 10000),
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, origem, referencia)
);
COMMENT ON TABLE public.xp_bonus IS 'XP fora das mãos (indicação, desafio). Escrito só por funções do servidor.';

ALTER TABLE public.xp_bonus ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.xp_bonus FROM anon, authenticated;
GRANT SELECT ON public.xp_bonus TO authenticated;
DROP POLICY IF EXISTS "Ver o proprio bonus" ON public.xp_bonus;
CREATE POLICY "Ver o proprio bonus" ON public.xp_bonus
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public._dar_xp_bonus(_uid uuid, _origem text, _ref text, _xp integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  INSERT INTO public.xp_bonus (user_id, origem, referencia, xp)
  VALUES (_uid, _origem, _ref, _xp)
  ON CONFLICT (user_id, origem, referencia) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN RETURN false; END IF;  -- já pago antes

  UPDATE public.profiles p
     SET total_xp   = p.total_xp + _xp,
         level      = public.calc_level(p.total_xp + _xp),
         updated_at = now()
   WHERE p.user_id = _uid;
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._dar_xp_bonus(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;

-- Conquista concedida pelo próprio servidor (as de indicação e desafio não
-- passam por unlock_achievement: a condição já foi checada aqui dentro).
CREATE OR REPLACE FUNCTION public._dar_conquista(_uid uuid, _key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n integer;
BEGIN
  INSERT INTO public.user_achievements (user_id, achievement_key)
  VALUES (_uid, _key)
  ON CONFLICT (user_id, achievement_key) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n > 0;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._dar_conquista(uuid, text) FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- 1. Indicação
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code      text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6,12}$'),
  criado_em timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.referral_codes IS 'Código de convite de cada conta, criado na primeira vez que ela abre a tela de indicação.';

-- Cada conta é indicada uma vez só (referred_id é a chave). Se o indicado
-- apaga a conta, a linha some e deixa de contar para o próximo nível; o XP de
-- nível já pago fica.
CREATE TABLE IF NOT EXISTS public.referrals (
  referred_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  validado_em timestamptz,
  CHECK (referrer_id <> referred_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id, validado_em);
COMMENT ON TABLE public.referrals IS 'Quem indicou quem. validado_em = quando o indicado completou 50 mãos (prazo de 30 dias).';

-- As duas tabelas só são lidas e escritas pelas funções abaixo: sem política
-- e sem privilégio para o usuário, ninguém lista códigos nem indicações alheias.
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_codes, public.referrals FROM anon, authenticated;

-- Níveis: 1, 5, 15, 40 e 100 indicados válidos
CREATE OR REPLACE FUNCTION public.referral_tier(_n integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _n >= 100 THEN 5
    WHEN _n >= 40  THEN 4
    WHEN _n >= 15  THEN 3
    WHEN _n >= 5   THEN 2
    WHEN _n >= 1   THEN 1
    ELSE 0
  END;
$$;

-- Marca o indicado como válido e paga o que o indicador ganhou com isso.
-- Chamada pelo gatilho das 50 mãos e por claim_referral.
CREATE OR REPLACE FUNCTION public._validar_indicacao(_referred uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referrer uuid;
  _n integer;
  _nivel integer;
  _t integer;
  _xp   integer[] := ARRAY[150, 500, 1500, 4000, 0];  -- nível 5: sorteio, não XP
  _conq text[]    := ARRAY['indica_1', 'indica_5', 'indica_15', 'indica_40', 'indica_100'];
BEGIN
  UPDATE public.referrals
     SET validado_em = now()
   WHERE referred_id = _referred
     AND validado_em IS NULL
     AND criado_em > now() - interval '30 days'
  RETURNING referrer_id INTO _referrer;
  IF _referrer IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO _n
    FROM public.referrals
   WHERE referrer_id = _referrer AND validado_em IS NOT NULL;
  _nivel := public.referral_tier(_n);

  -- Paga todos os níveis até o atual: o livro de bônus ignora os já pagos
  FOR _t IN 1.._nivel LOOP
    IF _xp[_t] > 0 THEN
      PERFORM public._dar_xp_bonus(_referrer, 'indicacao', 'nivel_' || _t, _xp[_t]);
    END IF;
    PERFORM public._dar_conquista(_referrer, _conq[_t]);
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._validar_indicacao(uuid) FROM PUBLIC, anon, authenticated;

-- Gatilho: quando a conta passa de 49 para 50 mãos. O bloco de exceção é de
-- propósito: um erro aqui não pode derrubar a gravação da mão.
CREATE OR REPLACE FUNCTION public._indicacao_ao_jogar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public._validar_indicacao(NEW.user_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'validar indicacao de % falhou: %', NEW.user_id, SQLERRM;
  END;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._indicacao_ao_jogar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS indicacao_valida_com_50_maos ON public.profiles;
CREATE TRIGGER indicacao_valida_com_50_maos
  AFTER UPDATE OF hands_played ON public.profiles
  FOR EACH ROW
  WHEN (OLD.hands_played < 50 AND NEW.hands_played >= 50)
  EXECUTE FUNCTION public._indicacao_ao_jogar();

-- Código da própria conta; cria na primeira chamada. 8 letras e números,
-- sem 0, O, 1 e I, para ninguém errar ao digitar.
CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
  _tentativas integer := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
  IF FOUND THEN RETURN _code; END IF;

  LOOP
    SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      INTO _code
      FROM generate_series(1, 8);
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (_uid, _code);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      -- Ou outra aba já criou o código desta conta, ou o sorteio repetiu um
      SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
      IF FOUND THEN RETURN _code; END IF;
      _tentativas := _tentativas + 1;
      IF _tentativas >= 5 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_referral_code() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;

-- A conta nova diz por qual convite chegou. O site chama isto uma vez, logo
-- depois do primeiro login, com o código guardado do link. Só vale para conta
-- criada nas últimas 72 horas: quem já usava o GTORei não vira "indicado".
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _referrer uuid;
  _criada timestamptz;
  _maos integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT user_id INTO _referrer FROM public.referral_codes WHERE code = upper(btrim(coalesce(_code, '')));
  IF NOT FOUND THEN RETURN 'codigo_invalido'; END IF;
  IF _referrer = _uid THEN RETURN 'proprio_codigo'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _uid) THEN RETURN 'ja_indicado'; END IF;

  SELECT created_at INTO _criada FROM auth.users WHERE id = _uid;
  IF _criada < now() - interval '72 hours' THEN RETURN 'conta_antiga'; END IF;

  -- A indica B e B indica A: as duas contas novas se validariam entre si
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referrer_id = _uid AND referred_id = _referrer) THEN
    RETURN 'indicacao_cruzada';
  END IF;

  INSERT INTO public.referrals (referred_id, referrer_id) VALUES (_uid, _referrer)
  ON CONFLICT (referred_id) DO NOTHING;

  SELECT hands_played INTO _maos FROM public.profiles WHERE user_id = _uid;
  IF coalesce(_maos, 0) >= 50 THEN PERFORM public._validar_indicacao(_uid); END IF;

  RETURN 'ok';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;

-- Tela "Indique e ganhe": código, contagem, nível e a lista de indicados
-- (só apelido, mãos até 50 e situação; nada de e-mail).
CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _validos integer;
  _pendentes integer;
  _lista jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT count(*) FILTER (WHERE r.validado_em IS NOT NULL),
         count(*) FILTER (WHERE r.validado_em IS NULL AND r.criado_em > now() - interval '30 days')
    INTO _validos, _pendentes
    FROM public.referrals r WHERE r.referrer_id = _uid;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'desde' DESC), '[]'::jsonb) INTO _lista
    FROM (
      SELECT jsonb_build_object(
               'nome',  coalesce(p.username, 'Jogador'),
               'maos',  least(coalesce(p.hands_played, 0), 50),
               'desde', r.criado_em,
               'situacao', CASE
                 WHEN r.validado_em IS NOT NULL THEN 'valido'
                 WHEN r.criado_em > now() - interval '30 days' THEN 'pendente'
                 ELSE 'expirado' END,
               'prazo', r.criado_em + interval '30 days') AS x
        FROM public.referrals r
        LEFT JOIN public.profiles p ON p.user_id = r.referred_id
       WHERE r.referrer_id = _uid
       ORDER BY r.criado_em DESC
       LIMIT 200
    ) t;

  RETURN jsonb_build_object(
    'validos', _validos,
    'pendentes', _pendentes,
    'nivel', public.referral_tier(_validos),
    'indicados', _lista);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_referrals() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_referrals() TO authenticated;

-- Admin: quem está no nível 5 (100+ válidos) e desde quando. É a lista de
-- participantes do sorteio mensal; o regulamento define o resto.
CREATE OR REPLACE FUNCTION public.admin_referral_level5()
RETURNS TABLE (user_id uuid, username text, email text, validos bigint, nivel5_desde timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'not_admin'; END IF;
  RETURN QUERY
    WITH v AS (
      SELECT r.referrer_id, r.validado_em,
             row_number() OVER (PARTITION BY r.referrer_id ORDER BY r.validado_em) AS n
        FROM public.referrals r
       WHERE r.validado_em IS NOT NULL
    )
    SELECT v.referrer_id, p.username, u.email::text,
           (SELECT count(*) FROM v v2 WHERE v2.referrer_id = v.referrer_id),
           v.validado_em
      FROM v
      JOIN auth.users u ON u.id = v.referrer_id
      LEFT JOIN public.profiles p ON p.user_id = v.referrer_id
     WHERE v.n = 100
     ORDER BY v.validado_em;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_referral_level5() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_referral_level5() TO authenticated;

-- =====================================================================
-- 2. Desafios diários
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.daily_challenge_claims (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia          date NOT NULL,
  idx          smallint NOT NULL CHECK (idx BETWEEN 1 AND 3),
  chave        text NOT NULL,
  xp           integer NOT NULL,
  resgatado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dia, idx)
);
ALTER TABLE public.daily_challenge_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_challenge_claims FROM anon, authenticated;
GRANT SELECT ON public.daily_challenge_claims TO authenticated;
DROP POLICY IF EXISTS "Ver os proprios desafios" ON public.daily_challenge_claims;
CREATE POLICY "Ver os proprios desafios" ON public.daily_challenge_claims
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);

-- O dia do GTORei é o de Brasília
CREATE OR REPLACE FUNCTION public._hoje_brasilia()
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date;
$$;

-- Os três desafios de um dia: um de volume, um de qualidade e um de cenário.
-- A escolha sai da data, então todo mundo vê os mesmos e não há o que guardar.
-- Os cenários são os liberados para todos (multiway e simulação são de
-- apoiador, então ficam de fora).
CREATE OR REPLACE FUNCTION public._desafios_do_dia(_dia date)
RETURNS TABLE (idx integer, chave text, titulo text, descricao text, tipo text, param text, meta integer, xp integer)
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  _s integer := (_dia - date '2026-01-01');
  _v integer := ((_s % 3) + 3) % 3;
  _q integer := (((_s * 7 + 3) % 6) + 6) % 6;
  _c integer := (((_s * 5 + 1) % 4) + 4) % 4;
  _cen text[]  := ARRAY['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'];
  _nome text[] := ARRAY['abertura', 'contra abertura', 'contra 3-bet', 'contra all-in'];
BEGIN
  -- 1. Volume
  idx := 1; tipo := 'maos'; param := NULL;
  meta := (ARRAY[20, 40, 60])[_v + 1];
  xp   := (ARRAY[50, 80, 120])[_v + 1];
  chave := 'maos_' || meta;
  titulo := 'Jogue ' || meta || ' mãos';
  descricao := 'Qualquer modo e cenário conta.';
  RETURN NEXT;

  -- 2. Qualidade
  idx := 2; param := NULL;
  CASE _q
    WHEN 0 THEN tipo := 'acertos';   meta := 15; xp := 60;  titulo := 'Acerte 15 decisões';          descricao := 'Jogadas "Best" ou "Correta".';
    WHEN 1 THEN tipo := 'acertos';   meta := 30; xp := 100; titulo := 'Acerte 30 decisões';          descricao := 'Jogadas "Best" ou "Correta".';
    WHEN 2 THEN tipo := 'best';      meta := 5;  xp := 60;  titulo := 'Faça 5 jogadas "Best"';       descricao := 'A melhor ação da range, não só uma correta.';
    WHEN 3 THEN tipo := 'best';      meta := 10; xp := 100; titulo := 'Faça 10 jogadas "Best"';      descricao := 'A melhor ação da range, não só uma correta.';
    WHEN 4 THEN tipo := 'sequencia'; meta := 8;  xp := 80;  titulo := 'Acerte 8 seguidas';           descricao := 'Uma sequência de 8 acertos sem errar no meio.';
    ELSE        tipo := 'precisao';  meta := 30; xp := 100; titulo := '80% de acerto em 30 mãos';    descricao := 'Jogue pelo menos 30 mãos hoje com 80% ou mais de acerto.';
  END CASE;
  chave := tipo || '_' || meta;
  RETURN NEXT;

  -- 3. Cenário
  idx := 3; tipo := 'cenario'; param := _cen[_c + 1];
  meta := 15; xp := 70;
  chave := 'cenario_' || param;
  titulo := '15 mãos de ' || _nome[_c + 1];
  descricao := 'Escolha o cenário "' || _nome[_c + 1] || '" no treino.';
  RETURN NEXT;
END;
$$;

-- Progresso de uma conta num dia. Tudo sai de played_hands.
CREATE OR REPLACE FUNCTION public._progresso_desafios(_uid uuid, _dia date)
RETURNS TABLE (idx integer, chave text, titulo text, descricao text, meta integer, xp integer,
               progresso integer, precisao integer, concluido boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ini timestamptz := (_dia::timestamp AT TIME ZONE 'America/Sao_Paulo');
  _fim timestamptz := ((_dia + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo');
  _maos integer; _acertos integer; _best integer; _seq integer;
  _d record;
  _cen integer;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE feedback IN ('best', 'correct')),
         count(*) FILTER (WHERE feedback = 'best')
    INTO _maos, _acertos, _best
    FROM public.played_hands
   WHERE user_id = _uid AND played_at >= _ini AND played_at < _fim;

  -- Maior sequência de acertos do dia (ilhas de acertos consecutivos)
  SELECT coalesce(max(c), 0) INTO _seq FROM (
    SELECT count(*) AS c FROM (
      SELECT feedback IN ('best', 'correct') AS ok,
             row_number() OVER (ORDER BY played_at, id)
           - row_number() OVER (PARTITION BY feedback IN ('best', 'correct') ORDER BY played_at, id) AS grupo
        FROM public.played_hands
       WHERE user_id = _uid AND played_at >= _ini AND played_at < _fim
    ) t WHERE ok GROUP BY grupo
  ) s;

  FOR _d IN SELECT * FROM public._desafios_do_dia(_dia) LOOP
    idx := _d.idx; chave := _d.chave; titulo := _d.titulo; descricao := _d.descricao;
    meta := _d.meta; xp := _d.xp;
    precisao := CASE WHEN _maos > 0 THEN round(100.0 * _acertos / _maos)::int ELSE 0 END;
    CASE _d.tipo
      WHEN 'maos'      THEN progresso := _maos;
      WHEN 'acertos'   THEN progresso := _acertos;
      WHEN 'best'      THEN progresso := _best;
      WHEN 'sequencia' THEN progresso := _seq;
      WHEN 'precisao'  THEN progresso := _maos;
      WHEN 'cenario'   THEN
        SELECT count(*) INTO _cen FROM public.played_hands
         WHERE user_id = _uid AND played_at >= _ini AND played_at < _fim AND scenario = _d.param;
        progresso := _cen;
      ELSE progresso := 0;
    END CASE;
    concluido := progresso >= meta AND (_d.tipo <> 'precisao' OR precisao >= 80);
    progresso := least(progresso, meta);
    RETURN NEXT;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._progresso_desafios(uuid, date) FROM PUBLIC, anon, authenticated;

-- Dias seguidos com pelo menos um desafio resgatado, contando até hoje (ou
-- até ontem, se hoje ainda não teve resgate: a sequência só quebra amanhã).
CREATE OR REPLACE FUNCTION public._sequencia_desafios(_uid uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _d date := public._hoje_brasilia();
  _n integer := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_challenge_claims WHERE user_id = _uid AND dia = _d) THEN
    _d := _d - 1;
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.daily_challenge_claims WHERE user_id = _uid AND dia = _d) LOOP
    _n := _n + 1;
    _d := _d - 1;
  END LOOP;
  RETURN _n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._sequencia_desafios(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_daily_challenges()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _dia date := public._hoje_brasilia();
  _lista jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT jsonb_agg(jsonb_build_object(
           'idx', p.idx, 'chave', p.chave, 'titulo', p.titulo, 'descricao', p.descricao,
           'meta', p.meta, 'xp', p.xp, 'progresso', p.progresso, 'precisao', p.precisao,
           'concluido', p.concluido,
           'resgatado', EXISTS (SELECT 1 FROM public.daily_challenge_claims c
                                 WHERE c.user_id = _uid AND c.dia = _dia AND c.idx = p.idx))
         ORDER BY p.idx)
    INTO _lista
    FROM public._progresso_desafios(_uid, _dia) p;

  RETURN jsonb_build_object(
    'dia', _dia,
    'desafios', _lista,
    'sequencia_dias', public._sequencia_desafios(_uid),
    'total_resgatados', (SELECT count(*) FROM public.daily_challenge_claims WHERE user_id = _uid));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_daily_challenges() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_daily_challenges() TO authenticated;

-- Resgata o XP de um desafio concluído hoje e entrega as conquistas que ele
-- destravar. Devolve o XP ganho, o total novo e as conquistas novas (para o
-- site mostrar o aviso na hora).
CREATE OR REPLACE FUNCTION public.claim_daily_challenge(_idx integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _dia date := public._hoje_brasilia();
  _p record;
  _n integer;
  _total integer;
  _hoje integer;
  _seq integer;
  _novas text[] := ARRAY[]::text[];
  _k text;
  _xp integer; _lvl integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO _p FROM public._progresso_desafios(_uid, _dia) WHERE idx = _idx;
  IF NOT FOUND THEN RAISE EXCEPTION 'desafio_invalido'; END IF;
  IF NOT _p.concluido THEN RAISE EXCEPTION 'desafio_incompleto'; END IF;

  INSERT INTO public.daily_challenge_claims (user_id, dia, idx, chave, xp)
  VALUES (_uid, _dia, _idx, _p.chave, _p.xp)
  ON CONFLICT (user_id, dia, idx) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;

  IF _n > 0 THEN
    PERFORM public._dar_xp_bonus(_uid, 'desafio', _dia::text || '#' || _idx, _p.xp);

    SELECT count(*) INTO _total FROM public.daily_challenge_claims WHERE user_id = _uid;
    SELECT count(*) INTO _hoje  FROM public.daily_challenge_claims WHERE user_id = _uid AND dia = _dia;
    _seq := public._sequencia_desafios(_uid);

    FOREACH _k IN ARRAY ARRAY[
      CASE WHEN _total >= 1   THEN 'desafio_1'   END,
      CASE WHEN _total >= 10  THEN 'desafio_10'  END,
      CASE WHEN _total >= 50  THEN 'desafio_50'  END,
      CASE WHEN _total >= 100 THEN 'desafio_100' END,
      CASE WHEN _hoje  >= 3   THEN 'dia_perfeito' END,
      CASE WHEN _seq   >= 3   THEN 'desafio_seq_3'  END,
      CASE WHEN _seq   >= 7   THEN 'desafio_seq_7'  END,
      CASE WHEN _seq   >= 30  THEN 'desafio_seq_30' END
    ] LOOP
      IF _k IS NOT NULL AND public._dar_conquista(_uid, _k) THEN
        _novas := _novas || _k;
      END IF;
    END LOOP;
  END IF;

  SELECT total_xp, level INTO _xp, _lvl FROM public.profiles WHERE user_id = _uid;
  RETURN jsonb_build_object(
    'xp_ganho', CASE WHEN _n > 0 THEN _p.xp ELSE 0 END,
    'total_xp', _xp,
    'level', _lvl,
    'conquistas', to_jsonb(_novas));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_daily_challenge(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_daily_challenge(integer) TO authenticated;

-- Índice para contar as mãos do dia sem varrer a tabela
CREATE INDEX IF NOT EXISTS idx_played_hands_user_played_at ON public.played_hands (user_id, played_at);

COMMIT;

-- =====================================================================
-- Conferência depois de aplicar (só leitura)
--
-- Os desafios de hoje e dos próximos dias (iguais para todos):
--   SELECT d, x.* FROM generate_series(current_date, current_date + 6, '1 day') d,
--          LATERAL public._desafios_do_dia(d::date) x;
--
-- O gatilho existe:
--   SELECT tgname FROM pg_trigger WHERE tgname = 'indicacao_valida_com_50_maos';
--
-- Para desfazer: DROP TRIGGER indicacao_valida_com_50_maos ON public.profiles;
-- e DROP das funções e tabelas criadas acima (xp_bonus, referral_codes,
-- referrals, daily_challenge_claims). O XP já pago fica em profiles.
-- =====================================================================
