-- Registro das rodadas do robô de notícias (30/10/2026)
--
-- Em 29 e 30/10 o pg_cron chamou a função noticias-automaticas nos horários
-- certos e ela respondeu 202, mas nenhuma matéria foi lida: o erro ficou só
-- no log da função, que só o Lovable mostra. A partir desta tabela, cada
-- rodada grava início, fim, o relatório (quantas novas, publicadas,
-- rascunhos, descartadas) e, se falhar, o erro (inclusive a resposta do
-- gateway de IA quando ele recusa).
--
-- Quem escreve é a função, com a service role. Quem lê é só o admin (RLS);
-- o anon não tem acesso nenhum. Sem esta migration a função segue
-- funcionando, só não registra.

CREATE TABLE IF NOT EXISTS public.noticias_execucoes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inicio    timestamptz NOT NULL DEFAULT now(),
  fim       timestamptz,
  relatorio jsonb,
  erro      text
);

CREATE INDEX IF NOT EXISTS noticias_execucoes_inicio ON public.noticias_execucoes (inicio DESC);

ALTER TABLE public.noticias_execucoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "noticias_execucoes_admin_le" ON public.noticias_execucoes;
CREATE POLICY "noticias_execucoes_admin_le" ON public.noticias_execucoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.noticias_execucoes FROM anon;
