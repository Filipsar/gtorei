-- Imagem das notícias (/noticias).
--
-- Cada notícia publicada tem uma imagem: a que o admin enviar (foto própria ou
-- com permissão, com o crédito ao lado) ou, sem ela, a imagem do GTORei que o
-- /admin gera na hora com o título (1200x630, o Rei lendo e a marca). A foto
-- que vem no feed da fonte não é usada: ela é da agência ou do site de origem.
--
-- Efeito no banco: duas colunas novas em noticias (imagem_url,
-- imagem_credito), liberadas para leitura pública como o resto da página, e o
-- bucket público 'noticias' no Storage (até 2 MB, só PNG, JPEG e WebP). Qualquer
-- um vê as imagens (elas vão na página e no compartilhamento); só o admin
-- (has_role) envia, substitui e apaga. Não mexe em outro bucket. Pode rodar de
-- novo sem erro.

ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS imagem_url text CHECK (imagem_url ~ '^https://'),
  ADD COLUMN IF NOT EXISTS imagem_credito text;

GRANT SELECT (imagem_url, imagem_credito) ON public.noticias TO anon;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('noticias', 'noticias', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "noticias_admin_envia" ON storage.objects;
CREATE POLICY "noticias_admin_envia" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'noticias' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "noticias_admin_substitui" ON storage.objects;
CREATE POLICY "noticias_admin_substitui" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'noticias' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'noticias' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "noticias_admin_apaga" ON storage.objects;
CREATE POLICY "noticias_admin_apaga" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'noticias' AND public.has_role(auth.uid(), 'admin'));
