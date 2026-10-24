-- APK de teste do app Android, baixado pela página /admin (aba "App Android").
--
-- O arquivo fica num bucket PRIVADO do Storage. Só quem tem o papel 'admin'
-- em user_roles (has_role) envia, lista, substitui, baixa e apaga. Usuário
-- comum e visitante sem login não veem nem o nome dos arquivos: não há
-- política para eles, e bucket privado nega tudo o que não tem política.
-- O download sai por link assinado que expira em 10 minutos.
--
-- Efeito: cria o bucket 'app-teste' (até 150 MB por arquivo, só APK) e quatro
-- políticas em storage.objects restritas a esse bucket. Não mexe em nenhuma
-- tabela nem em outro bucket. Pode rodar de novo sem erro.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('app-teste', 'app-teste', false, 157286400, ARRAY['application/vnd.android.package-archive'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "app_teste_admin_le" ON storage.objects;
CREATE POLICY "app_teste_admin_le" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'app-teste' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app_teste_admin_envia" ON storage.objects;
CREATE POLICY "app_teste_admin_envia" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'app-teste' AND public.has_role(auth.uid(), 'admin'));

-- Necessária para enviar de novo um arquivo com o mesmo nome (upsert)
DROP POLICY IF EXISTS "app_teste_admin_substitui" ON storage.objects;
CREATE POLICY "app_teste_admin_substitui" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'app-teste' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'app-teste' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "app_teste_admin_apaga" ON storage.objects;
CREATE POLICY "app_teste_admin_apaga" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'app-teste' AND public.has_role(auth.uid(), 'admin'));
