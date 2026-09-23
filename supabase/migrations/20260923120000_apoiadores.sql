-- ============================================================
-- Apoiadores: acesso ao modo Multiway
-- ============================================================
--
-- Quem apoia o projeto ganha acesso ao treino Multiway. Esta migration cria a
-- lista de apoiadores, as funções para o admin conceder e tirar o acesso, e já
-- libera o Filipe.
--
-- POR QUE UMA TABELA E NÃO UM PAPEL NOVO NO app_role
--   Acrescentar valor a um ENUM tem uma armadilha: o Postgres não deixa usar o
--   valor novo na mesma transação em que ele é criado, e migration roda em
--   transação. Daria erro no INSERT lá embaixo. Tabela própria não tem essa
--   restrição, e ainda guarda quando o acesso foi dado e por quem.
--
-- ATÉ ONDE ESTE BLOQUEIO VAI
--   Ele vale para a tela: o site lê esta tabela para decidir se mostra o modo.
--   Não é barreira de segurança — quem mexer no navegador consegue abrir o
--   treino assim mesmo. Para o que existe aqui (um modo de estudo) está de bom
--   tamanho; se um dia valer a pena travar de verdade, o lugar é o
--   record_hand_result recusar mão de Multiway de quem não apoia.
--
-- Esta migration é independente da 20260922190000 (ID da mão): dá para aplicar
-- em qualquer ordem, ou só esta.

-- ============ 1. a lista ============

CREATE TABLE IF NOT EXISTS public.supporters (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid,
  note       text
);

COMMENT ON TABLE public.supporters IS
  'Quem apoiou o projeto e tem acesso aos modos liberados para apoiadores.';

ALTER TABLE public.supporters ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.supporters TO authenticated;

-- Cada um enxerga o próprio acesso; o admin enxerga a lista toda para poder
-- administrar. Escrita não passa por aqui: só pelas funções do passo 3.
DROP POLICY IF EXISTS "Ver o proprio acesso, admin ve todos" ON public.supporters;
CREATE POLICY "Ver o proprio acesso, admin ve todos" ON public.supporters
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============ 2. consulta ============

CREATE OR REPLACE FUNCTION public.is_supporter(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.supporters WHERE user_id = _uid);
$$;
REVOKE EXECUTE ON FUNCTION public.is_supporter(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_supporter(uuid) TO authenticated;

-- ============ 3. o admin concede e tira ============

CREATE OR REPLACE FUNCTION public.set_supporter(
  _user_id uuid,
  _ativo boolean,
  _note text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  -- SECURITY DEFINER passa por cima do RLS, então a checagem de admin é aqui
  IF NOT public.has_role(_uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;
  IF _user_id IS NULL THEN RAISE EXCEPTION 'invalid_user'; END IF;

  IF _ativo THEN
    INSERT INTO public.supporters (user_id, granted_by, note)
    VALUES (_user_id, _uid, left(_note, 200))
    ON CONFLICT (user_id) DO UPDATE
      SET granted_at = now(), granted_by = _uid, note = left(_note, 200);
  ELSE
    DELETE FROM public.supporters WHERE user_id = _user_id;
  END IF;

  RETURN _ativo;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_supporter(uuid, boolean, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.set_supporter(uuid, boolean, text) TO authenticated;

-- ============ 4. acesso imediato ao Filipe ============

INSERT INTO public.supporters (user_id, note)
SELECT id, 'dono do projeto' FROM auth.users WHERE email = 'farubini2@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
