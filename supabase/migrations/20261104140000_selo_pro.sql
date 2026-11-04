-- Selo PRO no ranking e no perfil (04/11/2026).
--
-- pros_entre(uuid[]): de uma lista de jogadores, devolve os que são PRO hoje
-- (linha em supporters, ou PRO temporário de indicação ainda válido) — a mesma
-- regra de is_supporter. Uma chamada para a lista inteira do ranking, em vez
-- de uma por jogador.
--
-- Efeito no banco: só cria a função. Não mexe em tabela, dado nem política.
-- Privacidade: não expõe nada novo. is_supporter(_uid) já aceita o id de
-- qualquer jogador e pode ser chamada por qualquer usuário logado; esta função
-- devolve a mesma resposta (sim/não), sem valor, data nem forma de pagamento.

CREATE OR REPLACE FUNCTION public.pros_entre(_ids uuid[])
RETURNS TABLE (user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u.id
  FROM unnest(_ids[1:200]) AS u(id)
  WHERE EXISTS (SELECT 1 FROM public.supporters s WHERE s.user_id = u.id)
     OR EXISTS (SELECT 1 FROM public.pro_temporario p WHERE p.user_id = u.id AND p.expira_em > now())
$$;
REVOKE EXECUTE ON FUNCTION public.pros_entre(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pros_entre(uuid[]) TO authenticated;
