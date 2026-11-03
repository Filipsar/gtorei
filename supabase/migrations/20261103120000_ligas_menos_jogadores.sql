-- Ligas com menos jogadores ativos: novas vagas de subida e Rei mais fechado.
--
-- Pedido do Filipe em 03/11/2026: "Do ouro ao adamantio sobe 5. Rúnico e
-- diamante sobem 3 e no rei permanecem somente 2".
--
--   elo          sobem (antes → agora)   caem (desta posição para baixo, sem mudança)
--   Bronze       10                      ninguém cai
--   Prata        10                      20º
--   Ouro         10 → 5                  20º
--   Adamantio     6 → 5                  15º
--   Rúnico        6 → 3                  10º
--   Diamante      3                      10º
--   Rei          (topo)                  11º → 3º (fica só quem termina no top 2 com XP)
--
-- Efeito no banco: troca só a função _regra_do_elo, lida por
-- _fechar_dia_da_liga e get_liga (20261024150000_ligas_diarias.sql). Não mexe
-- em tabela, dado nem política. Vale a partir do próximo fechamento de dia:
-- quem está hoje no Rei e terminar fora do top 2 cai para o Diamante.
-- As mesmas regras estão no app em src/data/elos.ts (REGRAS_DOS_ELOS).

CREATE OR REPLACE FUNCTION public._regra_do_elo(_elo smallint, OUT sobem int, OUT cai_a int)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT r.sobem, r.cai_a
  FROM (VALUES (1, 10, NULL::int), (2, 10, 20), (3, 5, 20), (4, 5, 15), (5, 3, 10), (6, 3, 10), (7, 0, 3))
       AS r(elo, sobem, cai_a)
  WHERE r.elo = _elo
$$;
REVOKE EXECUTE ON FUNCTION public._regra_do_elo(smallint) FROM PUBLIC, anon, authenticated;
