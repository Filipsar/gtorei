-- Notícias automáticas (28/10/2026)
--
-- O Filipe pediu que as notícias saiam sozinhas, sem revisão. Quem escreve é
-- a edge function noticias-automaticas (supabase/functions/noticias-automaticas):
-- lê os feeds, a IA escolhe e resume, o código confere o resumo e publica.
-- Esta migration faz duas coisas:
--
--   1. Coluna "motivo": por que a notícia foi descartada ou ficou como
--      rascunho (resumo que não passou na checagem). Só o admin lê: o anon
--      continua com as colunas liberadas na 20261024160000, sem esta.
--
--   2. Agenda a função três vezes por dia, às 8h, 14h e 20h de Brasília
--      (11h, 17h e 23h UTC), pelo pg_cron (instalado, conferido em 28/10) e
--      pelo pg_net (disponível, ligado aqui). A chamada usa a chave pública
--      (anon), a mesma que já vai dentro do site: com ela não dá para fazer
--      nada além do que o agendamento faz, porque a função só processa matéria
--      que ainda não foi lida e grava com a própria service role.
--
-- Efeito: a partir do primeiro horário depois de aplicar (e da função
-- publicada pelo Lovable), notícias novas aparecem em /noticias sem passar
-- pelo admin. Para parar: SELECT cron.unschedule('noticias-automaticas');

ALTER TABLE public.noticias ADD COLUMN IF NOT EXISTS motivo text;

CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'noticias-automaticas') THEN
    PERFORM cron.unschedule('noticias-automaticas');
  END IF;
END
$$;

SELECT cron.schedule(
  'noticias-automaticas',
  '0 11,17,23 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://dejfimivoonbmgfxtbdf.supabase.co/functions/v1/noticias-automaticas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlamZpbWl2b29uYm1nZnh0YmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTE5ODMsImV4cCI6MjA4NTgyNzk4M30.p4F3ga8UbTWX0hDWv5jFjX3qhjJ2HDaxeEp6rvPaDNQ'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
