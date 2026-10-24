-- Duelo ao vivo (aba Duelo do app): heads-up entre dois jogadores.
--
-- Como funciona:
--   * Fila única. Quem procura adversário chama duelo_procurar() a cada ~2 s;
--     a chamada marca presença e, se houver outra pessoa esperando (vista nos
--     últimos 10 s), cria o duelo para as duas. Com 3 minutos sem par, a fila
--     solta a pessoa e o app avisa que não há jogadores suficientes.
--   * Duelo de 10 mãos. Os dois começam cada mão com o mesmo stack, sorteado
--     entre 10 e 40 BB, e o small blind alterna. Blinds 0,5 / 1 BB, sem ante.
--   * Só preflop, com as jogadas do treino: o SB abre (2,5 BB), vai all-in ou
--     larga; o BB paga, dá 3-bet (7,5 BB), vai all-in ou larga; depois da 3-bet
--     só cabe pagar, all-in ou largar. Quando a ação fecha com call, as cartas
--     abrem e a mesa corre até o river, sem aposta depois do flop.
--   * Ganha quem terminar com mais BB. Saldo igual é empate.
--   * 30 s por decisão. Estourou, a mão é largada (fold). Duas vezes seguidas,
--     ou a mesa parada há mais de 2 minutos, é abandono e o outro vence. Não há
--     pg_cron (conferido em 22/10/2026): o relógio é conferido a cada chamada de
--     quem está na mesa, como nas ligas.
--
-- Segurança: o baralho fica em duelo_cartas, sem política de leitura. Cada um
-- recebe só as próprias cartas por duelo_estado(); as do outro só aparecem no
-- showdown (coluna ultima). Toda jogada é validada aqui: duelo, mão, vez e
-- ação permitida. A nota GTO de cada decisão vem do app, como no treino.
--
-- Efeito no banco: três tabelas novas (duelo_fila, duelos, duelo_cartas), a
-- tabela duelos entra na publicação do Realtime (a mesa atualiza na hora em
-- que o outro joga) e funções novas. Não mexe em tabela existente. As linhas
-- somem junto com o usuário (ON DELETE CASCADE), então a exclusão de conta já
-- cobre estas tabelas. Depende de profiles e de liga_jogador
-- (20261024130000_ligas_por_elo.sql).

-- Quem está procurando adversário. Só as funções leem e escrevem.
CREATE TABLE IF NOT EXISTS public.duelo_fila (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entrou_em timestamptz NOT NULL DEFAULT now(),
  visto_em  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.duelo_fila ENABLE ROW LEVEL SECURITY;

-- A partida, com tudo o que os dois podem ver. Nome, avatar e elo são
-- copiados na criação: o perfil do outro não é legível por RLS.
CREATE TABLE IF NOT EXISTS public.duelos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jogador_a     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  jogador_b     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_a        text NOT NULL,
  nome_b        text NOT NULL,
  avatar_a      text,
  avatar_b      text,
  elo_a         smallint NOT NULL DEFAULT 1,
  elo_b         smallint NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'jogando' CHECK (status IN ('jogando', 'fim')),
  motivo_fim    text CHECK (motivo_fim IN ('maos', 'abandono', 'desistencia')),
  vencedor      uuid,
  total_maos    smallint NOT NULL DEFAULT 10,
  mao           smallint NOT NULL DEFAULT 1,
  -- BB ganhos no duelo (negativo = perdidos); um é sempre o oposto do outro
  saldo_a       numeric(6,1) NOT NULL DEFAULT 0,
  saldo_b       numeric(6,1) NOT NULL DEFAULT 0,
  -- Decisões com nota GTO e quantas foram certas (a nota vem do app)
  decisoes_a    smallint NOT NULL DEFAULT 0,
  acertos_a     smallint NOT NULL DEFAULT 0,
  decisoes_b    smallint NOT NULL DEFAULT 0,
  acertos_b     smallint NOT NULL DEFAULT 0,
  -- Tempos estourados seguidos; zera quando a pessoa joga
  ausencias_a   smallint NOT NULL DEFAULT 0,
  ausencias_b   smallint NOT NULL DEFAULT 0,
  -- Mão em andamento: stack, sb ('a'/'b'), aposta_a, aposta_b, vez, prazo,
  -- aumentos (quantos raises já houve) e acoes
  estado        jsonb NOT NULL,
  -- Mão anterior: quem levou, quanto, e as cartas e o board se houve showdown
  ultima        jsonb,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS duelos_jogando_a ON public.duelos (jogador_a) WHERE status = 'jogando';
CREATE INDEX IF NOT EXISTS duelos_jogando_b ON public.duelos (jogador_b) WHERE status = 'jogando';
ALTER TABLE public.duelos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "duelos_dos_jogadores" ON public.duelos;
CREATE POLICY "duelos_dos_jogadores" ON public.duelos
  FOR SELECT TO authenticated USING (auth.uid() IN (jogador_a, jogador_b));

-- Cartas de cada mão ('AsKd' para cada jogador, 5 cartas de board). Sem
-- política: ninguém lê direto, nem os próprios jogadores.
CREATE TABLE IF NOT EXISTS public.duelo_cartas (
  duelo_id uuid NOT NULL REFERENCES public.duelos(id) ON DELETE CASCADE,
  mao      smallint NOT NULL,
  cartas_a text NOT NULL,
  cartas_b text NOT NULL,
  board    text NOT NULL,
  PRIMARY KEY (duelo_id, mao)
);
ALTER TABLE public.duelo_cartas ENABLE ROW LEVEL SECURITY;

-- A mesa recebe a jogada do outro na hora, pelo Realtime (respeita a RLS acima)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'duelos'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.duelos;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Cartas e força da mão
-- ---------------------------------------------------------------------------

-- As 52 cartas embaralhadas, em sequência ('AsKd7h...')
CREATE OR REPLACE FUNCTION public._duelo_baralho()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT string_agg(r || n, '' ORDER BY random())
  FROM unnest(ARRAY['A','K','Q','J','T','9','8','7','6','5','4','3','2']) AS r
  CROSS JOIN unnest(ARRAY['s','h','d','c']) AS n
$$;

-- Categoria e desempates num número só: quanto maior, melhor a mão
CREATE OR REPLACE FUNCTION public._duelo_pontos(_cat int, _ks int[])
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _cat * 1048576 + coalesce(_ks[1], 0) * 65536 + coalesce(_ks[2], 0) * 4096
       + coalesce(_ks[3], 0) * 256 + coalesce(_ks[4], 0) * 16 + coalesce(_ks[5], 0)
$$;

-- Maior carta de uma sequência no conjunto de valores (bit 2 = carta 2 ... bit
-- 14 = ás; o ás também vale 1, para A-2-3-4-5). 0 se não há sequência.
CREATE OR REPLACE FUNCTION public._duelo_sequencia(_mask int)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _m int := _mask | CASE WHEN _mask & (1 << 14) <> 0 THEN 2 ELSE 0 END;
  _t int;
BEGIN
  FOR _t IN REVERSE 14 .. 5 LOOP
    IF (_m >> (_t - 4)) & 31 = 31 THEN RETURN _t; END IF;
  END LOOP;
  RETURN 0;
END
$$;

-- Força da melhor mão de 5 entre as cartas dadas (7 no showdown)
CREATE OR REPLACE FUNCTION public._duelo_forca(_cartas text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _cont       int[] := array_fill(0, ARRAY[14]);
  _naipe_qtd  int[] := array_fill(0, ARRAY[4]);
  _naipe_mask int[] := array_fill(0, ARRAY[4]);
  _mask       int := 0;
  _r int; _k int; _i int; _t int;
  _quadra  int := 0;
  _trincas int[] := '{}';
  _pares   int[] := '{}';
  _soltas  int[] := '{}';
  _ks      int[] := '{}';
  _nt int; _np int;
BEGIN
  FOR _i IN 0 .. length(_cartas) / 2 - 1 LOOP
    _r := position(substr(_cartas, _i * 2 + 1, 1) IN '23456789TJQKA') + 1;
    _k := position(substr(_cartas, _i * 2 + 2, 1) IN 'shdc');
    _cont[_r] := _cont[_r] + 1;
    _mask := _mask | (1 << _r);
    _naipe_qtd[_k] := _naipe_qtd[_k] + 1;
    _naipe_mask[_k] := _naipe_mask[_k] | (1 << _r);
  END LOOP;

  -- Flush (e straight flush). Com 7 cartas, flush e quadra ou full house não
  -- cabem juntos, então o flush já é a resposta.
  FOR _k IN 1 .. 4 LOOP
    IF _naipe_qtd[_k] >= 5 THEN
      _t := public._duelo_sequencia(_naipe_mask[_k]);
      IF _t > 0 THEN RETURN public._duelo_pontos(8, ARRAY[_t]); END IF;
      FOR _r IN REVERSE 14 .. 2 LOOP
        IF _naipe_mask[_k] & (1 << _r) <> 0 AND coalesce(array_length(_ks, 1), 0) < 5 THEN
          _ks := _ks || _r;
        END IF;
      END LOOP;
      RETURN public._duelo_pontos(5, _ks);
    END IF;
  END LOOP;

  FOR _r IN REVERSE 14 .. 2 LOOP
    IF _cont[_r] = 4 THEN _quadra := _r;
    ELSIF _cont[_r] = 3 THEN _trincas := _trincas || _r;
    ELSIF _cont[_r] = 2 THEN _pares := _pares || _r;
    ELSIF _cont[_r] = 1 THEN _soltas := _soltas || _r;
    END IF;
  END LOOP;
  _nt := coalesce(array_length(_trincas, 1), 0);
  _np := coalesce(array_length(_pares, 1), 0);

  IF _quadra > 0 THEN
    RETURN public._duelo_pontos(7, ARRAY[_quadra,
      greatest(coalesce(_trincas[1], 0), coalesce(_pares[1], 0), coalesce(_soltas[1], 0))]);
  END IF;
  IF _nt >= 1 AND (_nt >= 2 OR _np >= 1) THEN
    RETURN public._duelo_pontos(6, ARRAY[_trincas[1], greatest(coalesce(_trincas[2], 0), coalesce(_pares[1], 0))]);
  END IF;
  _t := public._duelo_sequencia(_mask);
  IF _t > 0 THEN RETURN public._duelo_pontos(4, ARRAY[_t]); END IF;
  IF _nt = 1 THEN
    RETURN public._duelo_pontos(3, ARRAY[_trincas[1], _soltas[1], _soltas[2]]);
  END IF;
  IF _np >= 2 THEN
    RETURN public._duelo_pontos(2, ARRAY[_pares[1], _pares[2], greatest(coalesce(_pares[3], 0), coalesce(_soltas[1], 0))]);
  END IF;
  IF _np = 1 THEN
    RETURN public._duelo_pontos(1, ARRAY[_pares[1], _soltas[1], _soltas[2], _soltas[3]]);
  END IF;
  RETURN public._duelo_pontos(0, _soltas[1:5]);
END
$$;

-- ---------------------------------------------------------------------------
-- A mão
-- ---------------------------------------------------------------------------

-- Dá as cartas da mão _mao e devolve o estado inicial dela. _pausa é o tempo
-- em que o app ainda mostra o resultado da mão anterior.
CREATE OR REPLACE FUNCTION public._duelo_nova_mao(_duelo uuid, _mao smallint, _sb text, _pausa interval)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _baralho text := public._duelo_baralho();
  _stacks  numeric[] := ARRAY[10, 12, 14, 17, 20, 25, 30, 40];
  _stack   numeric := _stacks[1 + floor(random() * array_length(_stacks, 1))::int];
BEGIN
  INSERT INTO public.duelo_cartas (duelo_id, mao, cartas_a, cartas_b, board)
  VALUES (_duelo, _mao, substr(_baralho, 1, 4), substr(_baralho, 5, 4), substr(_baralho, 9, 10));

  RETURN jsonb_build_object(
    'stack', _stack,
    'sb', _sb,
    'aposta_a', CASE WHEN _sb = 'a' THEN 0.5 ELSE 1 END,
    'aposta_b', CASE WHEN _sb = 'b' THEN 0.5 ELSE 1 END,
    'vez', _sb,
    'prazo', now() + _pausa + interval '30 seconds',
    'aumentos', 0,
    'acoes', '[]'::jsonb
  );
END
$$;

-- O que _quem pode fazer agora (vazio se não é a vez dele)
CREATE OR REPLACE FUNCTION public._duelo_acoes_validas(_e jsonb, _quem text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _outro    text := CASE WHEN _quem = 'a' THEN 'b' ELSE 'a' END;
  _stack    numeric := (_e->>'stack')::numeric;
  _dele     numeric := (_e->>('aposta_' || _outro))::numeric;
  _aumentos int := (_e->>'aumentos')::int;
  _acoes    text[] := ARRAY['fold'];
BEGIN
  IF _e->>'vez' IS DISTINCT FROM _quem THEN RETURN '{}'; END IF;
  -- Sem limp: a primeira jogada do SB é abrir, all-in ou fold (como no treino)
  IF NOT (_aumentos = 0 AND _e->>'sb' = _quem) THEN _acoes := _acoes || 'call'::text; END IF;
  -- Subir só enquanto o outro não está all-in: abrir 2,5, 3-bet 7,5, e depois só all-in
  IF _dele < _stack THEN
    IF (_aumentos = 0 AND 2.5 < _stack) OR (_aumentos = 1 AND 7.5 < _stack) THEN
      _acoes := _acoes || 'raise'::text;
    END IF;
    _acoes := _acoes || 'allin'::text;
  END IF;
  RETURN _acoes;
END
$$;

-- Fecha a mão e abre a próxima (ou encerra o duelo). _levou_no_fold é quem
-- ganhou porque o outro largou; nulo é showdown, com a mesa até o river.
CREATE OR REPLACE FUNCTION public._duelo_fechar_mao(_id uuid, _e jsonb, _levou_no_fold text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d       public.duelos;
  _c       public.duelo_cartas;
  _aa      numeric := (_e->>'aposta_a')::numeric;
  _ab      numeric := (_e->>'aposta_b')::numeric;
  _venc    text;
  _delta_a numeric;
  _ultima  jsonb;
  _prox    smallint;
BEGIN
  SELECT * INTO _d FROM public.duelos WHERE id = _id;
  SELECT * INTO _c FROM public.duelo_cartas WHERE duelo_id = _id AND mao = _d.mao;

  IF _levou_no_fold IS NOT NULL THEN
    -- Quem largou perde o que já tinha posto na mão
    _venc := _levou_no_fold;
    _delta_a := CASE WHEN _venc = 'a' THEN _ab ELSE -_aa END;
  ELSE
    -- Depois do call as apostas são iguais: é isso que cada um arrisca
    _venc := CASE
      WHEN public._duelo_forca(_c.cartas_a || _c.board) > public._duelo_forca(_c.cartas_b || _c.board) THEN 'a'
      WHEN public._duelo_forca(_c.cartas_a || _c.board) < public._duelo_forca(_c.cartas_b || _c.board) THEN 'b'
      ELSE 'empate'
    END;
    _delta_a := CASE _venc WHEN 'a' THEN least(_aa, _ab) WHEN 'b' THEN -least(_aa, _ab) ELSE 0 END;
  END IF;

  _ultima := jsonb_build_object(
    'mao', _d.mao,
    'stack', _e->'stack',
    'sb', _e->'sb',
    'aposta_a', _aa,
    'aposta_b', _ab,
    'acoes', _e->'acoes',
    'vencedor', _venc,
    'delta_a', _delta_a,
    'showdown', _levou_no_fold IS NULL,
    'cartas_a', CASE WHEN _levou_no_fold IS NULL THEN _c.cartas_a END,
    'cartas_b', CASE WHEN _levou_no_fold IS NULL THEN _c.cartas_b END,
    'board', CASE WHEN _levou_no_fold IS NULL THEN _c.board END
  );

  IF _d.mao >= _d.total_maos THEN
    UPDATE public.duelos SET
      saldo_a = saldo_a + _delta_a,
      saldo_b = saldo_b - _delta_a,
      ultima = _ultima,
      estado = _e || jsonb_build_object('vez', NULL, 'prazo', NULL),
      status = 'fim',
      motivo_fim = 'maos',
      vencedor = CASE
        WHEN saldo_a + _delta_a > saldo_b - _delta_a THEN jogador_a
        WHEN saldo_a + _delta_a < saldo_b - _delta_a THEN jogador_b
      END,
      atualizado_em = now()
    WHERE id = _id;
  ELSE
    _prox := _d.mao + 1;
    UPDATE public.duelos SET
      saldo_a = saldo_a + _delta_a,
      saldo_b = saldo_b - _delta_a,
      ultima = _ultima,
      mao = _prox,
      estado = public._duelo_nova_mao(_id, _prox, CASE WHEN _e->>'sb' = 'a' THEN 'b' ELSE 'a' END, interval '4 seconds'),
      atualizado_em = now()
    WHERE id = _id;
  END IF;
END
$$;

-- Aplica a jogada de _quem (já validada a vez). Fold e call fecham a mão.
CREATE OR REPLACE FUNCTION public._duelo_aplicar(_id uuid, _quem text, _acao text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _e     jsonb;
  _outro text := CASE WHEN _quem = 'a' THEN 'b' ELSE 'a' END;
  _stack numeric;
  _para  numeric;
BEGIN
  SELECT estado INTO _e FROM public.duelos WHERE id = _id;
  IF NOT (_acao = ANY (public._duelo_acoes_validas(_e, _quem))) THEN
    RAISE EXCEPTION 'jogada_invalida';
  END IF;

  _stack := (_e->>'stack')::numeric;
  _para := CASE _acao
    WHEN 'fold'  THEN (_e->>('aposta_' || _quem))::numeric
    WHEN 'call'  THEN least((_e->>('aposta_' || _outro))::numeric, _stack)
    WHEN 'raise' THEN CASE WHEN (_e->>'aumentos')::int = 0 THEN 2.5 ELSE 7.5 END
    WHEN 'allin' THEN _stack
  END;
  _e := _e
    || jsonb_build_object('aposta_' || _quem, _para)
    || jsonb_build_object('acoes', (_e->'acoes') || jsonb_build_array(
         jsonb_build_object('quem', _quem, 'acao', _acao, 'para', _para)));

  IF _acao IN ('raise', 'allin') THEN
    UPDATE public.duelos SET
      estado = _e || jsonb_build_object(
        'aumentos', (_e->>'aumentos')::int + 1,
        'vez', _outro,
        'prazo', now() + interval '30 seconds'),
      atualizado_em = now()
    WHERE id = _id;
  ELSE
    PERFORM public._duelo_fechar_mao(_id, _e, CASE WHEN _acao = 'fold' THEN _outro END);
  END IF;
END
$$;

-- Confere o relógio. Quem estourou os 30 s larga a mão; na segunda vez seguida,
-- ou com a mesa parada há mais de 2 minutos, perde o duelo por abandono.
CREATE OR REPLACE FUNCTION public._duelo_conferir_prazo(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d         public.duelos;
  _vez       text;
  _prazo     timestamptz;
  _ausencias int;
BEGIN
  SELECT * INTO _d FROM public.duelos WHERE id = _id;
  IF _d.status <> 'jogando' THEN RETURN; END IF;
  _vez := _d.estado->>'vez';
  _prazo := (_d.estado->>'prazo')::timestamptz;
  IF _vez IS NULL OR now() <= _prazo THEN RETURN; END IF;

  _ausencias := CASE WHEN _vez = 'a' THEN _d.ausencias_a ELSE _d.ausencias_b END + 1;
  IF _ausencias >= 2 OR now() > _prazo + interval '2 minutes' THEN
    UPDATE public.duelos SET
      status = 'fim',
      motivo_fim = 'abandono',
      vencedor = CASE WHEN _vez = 'a' THEN jogador_b ELSE jogador_a END,
      estado = estado || jsonb_build_object('vez', NULL, 'prazo', NULL),
      atualizado_em = now()
    WHERE id = _id;
    RETURN;
  END IF;

  UPDATE public.duelos SET
    ausencias_a = CASE WHEN _vez = 'a' THEN _ausencias ELSE ausencias_a END,
    ausencias_b = CASE WHEN _vez = 'b' THEN _ausencias ELSE ausencias_b END
  WHERE id = _id;
  PERFORM public._duelo_aplicar(_id, _vez, 'fold');
END
$$;

-- O duelo visto por um dos jogadores: tudo o que é público e as cartas dele
CREATE OR REPLACE FUNCTION public._duelo_visao(_id uuid, _uid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _d  public.duelos;
  _eu text;
BEGIN
  SELECT * INTO _d FROM public.duelos WHERE id = _id;
  _eu := CASE WHEN _uid = _d.jogador_a THEN 'a' ELSE 'b' END;
  RETURN jsonb_build_object(
    'id', _d.id,
    'eu', _eu,
    'status', _d.status,
    'motivo_fim', _d.motivo_fim,
    'vencedor', CASE WHEN _d.vencedor IS NULL THEN NULL WHEN _d.vencedor = _uid THEN 'eu' ELSE 'outro' END,
    'total_maos', _d.total_maos,
    'mao', _d.mao,
    'nome_a', _d.nome_a, 'nome_b', _d.nome_b,
    'avatar_a', _d.avatar_a, 'avatar_b', _d.avatar_b,
    'elo_a', _d.elo_a, 'elo_b', _d.elo_b,
    'saldo_a', _d.saldo_a, 'saldo_b', _d.saldo_b,
    'decisoes_a', _d.decisoes_a, 'acertos_a', _d.acertos_a,
    'decisoes_b', _d.decisoes_b, 'acertos_b', _d.acertos_b,
    'estado', _d.estado,
    'ultima', _d.ultima,
    'minhas_cartas', (
      SELECT CASE WHEN _eu = 'a' THEN c.cartas_a ELSE c.cartas_b END
        FROM public.duelo_cartas c WHERE c.duelo_id = _id AND c.mao = _d.mao
    ),
    'acoes_validas', CASE WHEN _d.status = 'jogando'
      THEN to_jsonb(public._duelo_acoes_validas(_d.estado, _eu)) ELSE '[]'::jsonb END,
    -- Relógio do servidor, para o app acertar a contagem do prazo
    'agora', now()
  );
END
$$;

-- ---------------------------------------------------------------------------
-- Chamadas do app
-- ---------------------------------------------------------------------------

-- O duelo em andamento de quem chama (para voltar à mesa ao reabrir o app)
CREATE OR REPLACE FUNCTION public.duelo_atual()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id  uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'nao_autenticado'; END IF;
  SELECT id INTO _id FROM public.duelos
   WHERE status = 'jogando' AND _uid IN (jogador_a, jogador_b)
   ORDER BY criado_em DESC
   LIMIT 1
   FOR UPDATE;
  IF _id IS NULL THEN RETURN NULL; END IF;
  -- Mesa abandonada há tempo já encerra aqui, em vez de devolver um duelo morto
  PERFORM public._duelo_conferir_prazo(_id);
  RETURN (SELECT id FROM public.duelos WHERE id = _id AND status = 'jogando');
END
$$;

-- Entra (ou continua) na fila. Devolve {duelo} quando há par, {esperando,
-- desde} enquanto não há, e {expirou} depois de 3 minutos.
CREATE OR REPLACE FUNCTION public.duelo_procurar()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid   uuid := auth.uid();
  _id    uuid;
  _eu    public.duelo_fila;
  _outro uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'nao_autenticado'; END IF;
  -- Uma chamada por vez mexe na fila: sem a trava, dois jogadores se achariam
  -- ao mesmo tempo e nasceriam dois duelos
  PERFORM pg_advisory_xact_lock(hashtext('duelo_fila'));

  -- Já pareado pela chamada do outro, ou com duelo aberto: volta para a mesa
  _id := public.duelo_atual();
  IF _id IS NOT NULL THEN
    DELETE FROM public.duelo_fila WHERE user_id = _uid;
    RETURN jsonb_build_object('duelo', _id);
  END IF;

  -- Quem sumiu da fila (mais de 10 s sem chamar) volta do começo do relógio
  INSERT INTO public.duelo_fila AS f (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO UPDATE SET
    entrou_em = CASE WHEN f.visto_em < now() - interval '10 seconds' THEN now() ELSE f.entrou_em END,
    visto_em = now()
  RETURNING * INTO _eu;

  IF _eu.entrou_em < now() - interval '3 minutes' THEN
    DELETE FROM public.duelo_fila WHERE user_id = _uid;
    RETURN jsonb_build_object('expirou', true);
  END IF;

  SELECT user_id INTO _outro FROM public.duelo_fila
   WHERE user_id <> _uid
     AND visto_em > now() - interval '10 seconds'
     AND entrou_em > now() - interval '3 minutes'
   ORDER BY entrou_em
   LIMIT 1;
  IF _outro IS NULL THEN
    RETURN jsonb_build_object('esperando', true, 'desde', _eu.entrou_em);
  END IF;

  DELETE FROM public.duelo_fila WHERE user_id IN (_uid, _outro);
  _id := gen_random_uuid();
  INSERT INTO public.duelos (id, jogador_a, jogador_b, nome_a, nome_b, avatar_a, avatar_b, elo_a, elo_b, estado)
  VALUES (
    _id, _outro, _uid,
    coalesce((SELECT username FROM public.profiles WHERE user_id = _outro), 'Jogador'),
    coalesce((SELECT username FROM public.profiles WHERE user_id = _uid), 'Jogador'),
    (SELECT avatar_url FROM public.profiles WHERE user_id = _outro),
    (SELECT avatar_url FROM public.profiles WHERE user_id = _uid),
    coalesce((SELECT elo FROM public.liga_jogador WHERE user_id = _outro), 1),
    coalesce((SELECT elo FROM public.liga_jogador WHERE user_id = _uid), 1),
    '{}'::jsonb
  );
  -- Quem é o primeiro SB sai no sorteio; depois alterna
  UPDATE public.duelos
     SET estado = public._duelo_nova_mao(_id, 1::smallint, CASE WHEN random() < 0.5 THEN 'a' ELSE 'b' END, interval '3 seconds')
   WHERE id = _id;
  RETURN jsonb_build_object('duelo', _id);
END
$$;

-- Sai da fila. Se o par saiu no mesmo instante, devolve o duelo (o app entra
-- nele em vez de deixar o outro esperando à toa).
CREATE OR REPLACE FUNCTION public.duelo_sair_fila()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'nao_autenticado'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('duelo_fila'));
  DELETE FROM public.duelo_fila WHERE user_id = auth.uid();
  RETURN public.duelo_atual();
END
$$;

-- A mesa como este jogador a vê (e o relógio conferido)
CREATE OR REPLACE FUNCTION public.duelo_estado(_duelo uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _d   public.duelos;
BEGIN
  SELECT * INTO _d FROM public.duelos WHERE id = _duelo FOR UPDATE;
  IF NOT FOUND OR _uid IS NULL OR _uid NOT IN (_d.jogador_a, _d.jogador_b) THEN
    RAISE EXCEPTION 'duelo_nao_encontrado';
  END IF;
  PERFORM public._duelo_conferir_prazo(_duelo);
  RETURN public._duelo_visao(_duelo, _uid);
END
$$;

-- Uma jogada. _mao é a mão em que ela foi feita: clique atrasado (o tempo já
-- tinha estourado e a mão mudou) é recusado em vez de agir na mão seguinte.
-- _acertou é a nota GTO da decisão, quando o treino tem range para ela.
CREATE OR REPLACE FUNCTION public.duelo_agir(_duelo uuid, _mao smallint, _acao text, _acertou boolean DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _d   public.duelos;
  _eu  text;
BEGIN
  SELECT * INTO _d FROM public.duelos WHERE id = _duelo FOR UPDATE;
  IF NOT FOUND OR _uid IS NULL OR _uid NOT IN (_d.jogador_a, _d.jogador_b) THEN
    RAISE EXCEPTION 'duelo_nao_encontrado';
  END IF;
  _eu := CASE WHEN _uid = _d.jogador_a THEN 'a' ELSE 'b' END;

  PERFORM public._duelo_conferir_prazo(_duelo);
  SELECT * INTO _d FROM public.duelos WHERE id = _duelo;
  IF _d.status <> 'jogando' OR _d.mao <> _mao OR _d.estado->>'vez' IS DISTINCT FROM _eu THEN
    RETURN public._duelo_visao(_duelo, _uid) || jsonb_build_object('recusada', true);
  END IF;

  UPDATE public.duelos SET
    ausencias_a = CASE WHEN _eu = 'a' THEN 0 ELSE ausencias_a END,
    ausencias_b = CASE WHEN _eu = 'b' THEN 0 ELSE ausencias_b END,
    decisoes_a = decisoes_a + CASE WHEN _eu = 'a' AND _acertou IS NOT NULL THEN 1 ELSE 0 END,
    acertos_a  = acertos_a  + CASE WHEN _eu = 'a' AND _acertou THEN 1 ELSE 0 END,
    decisoes_b = decisoes_b + CASE WHEN _eu = 'b' AND _acertou IS NOT NULL THEN 1 ELSE 0 END,
    acertos_b  = acertos_b  + CASE WHEN _eu = 'b' AND _acertou THEN 1 ELSE 0 END
  WHERE id = _duelo;

  PERFORM public._duelo_aplicar(_duelo, _eu, _acao);
  RETURN public._duelo_visao(_duelo, _uid);
END
$$;

-- Sair no meio: o outro vence
CREATE OR REPLACE FUNCTION public.duelo_desistir(_duelo uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _d   public.duelos;
BEGIN
  SELECT * INTO _d FROM public.duelos WHERE id = _duelo FOR UPDATE;
  IF NOT FOUND OR _uid IS NULL OR _uid NOT IN (_d.jogador_a, _d.jogador_b) THEN
    RAISE EXCEPTION 'duelo_nao_encontrado';
  END IF;
  IF _d.status = 'jogando' THEN
    UPDATE public.duelos SET
      status = 'fim',
      motivo_fim = 'desistencia',
      vencedor = CASE WHEN _uid = jogador_a THEN jogador_b ELSE jogador_a END,
      estado = estado || jsonb_build_object('vez', NULL, 'prazo', NULL),
      atualizado_em = now()
    WHERE id = _duelo;
  END IF;
  RETURN public._duelo_visao(_duelo, _uid);
END
$$;

-- Funções internas: só as chamadas do app as usam
REVOKE EXECUTE ON FUNCTION public._duelo_baralho() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_pontos(int, int[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_sequencia(int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_forca(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_nova_mao(uuid, smallint, text, interval) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_acoes_validas(jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_fechar_mao(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_aplicar(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_conferir_prazo(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._duelo_visao(uuid, uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.duelo_atual() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.duelo_procurar() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.duelo_sair_fila() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.duelo_estado(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.duelo_agir(uuid, smallint, text, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.duelo_desistir(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duelo_atual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.duelo_procurar() TO authenticated;
GRANT EXECUTE ON FUNCTION public.duelo_sair_fila() TO authenticated;
GRANT EXECUTE ON FUNCTION public.duelo_estado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duelo_agir(uuid, smallint, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duelo_desistir(uuid) TO authenticated;
