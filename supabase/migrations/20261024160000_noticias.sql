-- Notícias GTORei (/noticias): notícias de poker com resumo próprio.
--
-- Fluxo: quando o admin abre /admin → Notícias, o app busca os feeds RSS de uma
-- lista fixa de sites (função do Vercel api/rss.ts) e grava cada matéria nova
-- como rascunho. O admin escreve título e resumo com as próprias palavras e
-- publica; só então ela vira página (api/noticias.ts, HTML pronto para o
-- Google), sempre com o link para a matéria original. O trecho do feed fica só
-- para referência do admin e nunca vai para a página: a página republicando
-- texto de outro site seria conteúdo copiado.
--
-- Efeito no banco: uma tabela nova (noticias). Leitura pública só das
-- publicadas e só das colunas da página; o admin (has_role) lê, cria rascunho
-- e edita. Não mexe em tabela existente nem tem dado de usuário.

CREATE TABLE IF NOT EXISTS public.noticias (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link               text NOT NULL UNIQUE CHECK (link ~ '^https?://'),
  fonte              text NOT NULL,
  titulo_fonte       text NOT NULL,
  -- Trecho do feed: só para o admin decidir; a página não mostra
  trecho_fonte       text,
  publicada_na_fonte timestamptz,
  status             text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicada', 'descartada')),
  titulo             text,
  resumo             text,
  slug               text UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  publicada_em       timestamptz,
  atualizada_em      timestamptz,
  criada_em          timestamptz NOT NULL DEFAULT now(),
  -- Publicada só com título, slug e resumo de verdade (o mesmo mínimo do app)
  CONSTRAINT noticia_publicada_completa CHECK (
    status <> 'publicada'
    OR (titulo IS NOT NULL AND slug IS NOT NULL AND publicada_em IS NOT NULL AND length(resumo) >= 200)
  )
);
CREATE INDEX IF NOT EXISTS noticias_publicadas ON public.noticias (publicada_em DESC) WHERE status = 'publicada';

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "noticias_publicas" ON public.noticias;
CREATE POLICY "noticias_publicas" ON public.noticias
  FOR SELECT TO anon, authenticated
  USING (status = 'publicada');

DROP POLICY IF EXISTS "noticias_admin_le" ON public.noticias;
CREATE POLICY "noticias_admin_le" ON public.noticias
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "noticias_admin_cria" ON public.noticias;
CREATE POLICY "noticias_admin_cria" ON public.noticias
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) AND status = 'rascunho');

DROP POLICY IF EXISTS "noticias_admin_edita" ON public.noticias;
CREATE POLICY "noticias_admin_edita" ON public.noticias
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Quem não está logado (a página e o sitemap) lê só as colunas da página
REVOKE ALL ON public.noticias FROM anon;
GRANT SELECT (titulo, resumo, slug, fonte, link, publicada_em, atualizada_em, publicada_na_fonte, status)
  ON public.noticias TO anon;
