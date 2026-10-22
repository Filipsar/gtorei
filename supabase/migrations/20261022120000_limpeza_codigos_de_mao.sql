-- =====================================================================
-- Limpeza dos códigos de mão (7 dias) que funciona sem pg_cron
-- Escrito em 22/10/2026. NÃO APLICADO: quem aplica é o Filipe.
-- =====================================================================
--
-- O PROBLEMA
--   A migration 20260922190000 criou purge_old_hand_codes() e só agendava a
--   execução diária SE o pg_cron estivesse instalado. Em 22/10/2026 o Filipe
--   rodou `SELECT * FROM cron.job` e veio "relation cron.job does not exist":
--   o pg_cron não está instalado, então a limpeza nunca rodou. Os códigos de
--   todas as mãos desde setembro continuam gravados, e a Política de
--   Privacidade promete apagá-los em 7 dias.
--   (A consulta lookup_hand já recusa código com mais de 7 dias, então ninguém
--   consegue usá-los; o que falta é tirar do disco.)
--
-- O QUE ESTA MIGRATION FAZ
--   1. Tenta instalar o pg_cron e agendar a limpeza diária às 4h17. Se o
--      Lovable Cloud não permitir, segue sem erro.
--   2. Instala, de qualquer jeito, uma limpeza que não depende de agenda: a
--      cada mão gravada, com 5% de chance, apaga até 500 códigos vencidos.
--      Com 100 mãos num dia, roda umas 5 vezes e limpa até 2.500 códigos:
--      sobra folga para o que vence a cada dia. Não trava a gravação da mão:
--      pula linhas em uso e, se algo falhar, só registra um aviso.
--   3. Faz a limpeza de tudo o que já venceu, agora.
--
-- Só o código sai. A mão, os pontos e o XP ficam.
-- =====================================================================

-- 1. pg_cron, se der
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron indisponível (%), segue só com a limpeza por gatilho', SQLERRM;
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_old_hand_codes') THEN
      PERFORM cron.unschedule('purge_old_hand_codes');
    END IF;
    PERFORM cron.schedule('purge_old_hand_codes', '17 4 * * *', 'SELECT public.purge_old_hand_codes();');
    RAISE NOTICE 'pg_cron ativo: limpeza diária agendada';
  END IF;
END $$;

-- 2. Limpeza por gatilho
CREATE OR REPLACE FUNCTION public._limpar_codigos_vencidos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF random() < 0.05 THEN
    BEGIN
      UPDATE public.played_hands
         SET hand_code = NULL
       WHERE ctid IN (
         SELECT ctid FROM public.played_hands
          WHERE hand_code IS NOT NULL
            AND played_at < now() - interval '7 days'
          LIMIT 500
          FOR UPDATE SKIP LOCKED);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'limpeza de códigos de mão falhou: %', SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._limpar_codigos_vencidos() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS limpar_codigos_vencidos ON public.played_hands;
CREATE TRIGGER limpar_codigos_vencidos
  AFTER INSERT ON public.played_hands
  FOR EACH STATEMENT
  EXECUTE FUNCTION public._limpar_codigos_vencidos();

-- 3. O que já venceu sai agora (devolve quantos códigos foram apagados)
SELECT public.purge_old_hand_codes() AS codigos_apagados;

-- =====================================================================
-- Conferência (só leitura). Tem que dar 0:
--   SELECT count(*) FROM public.played_hands
--    WHERE hand_code IS NOT NULL AND played_at < now() - interval '8 days';
-- Ver se o pg_cron entrou:
--   SELECT extname FROM pg_extension WHERE extname = 'pg_cron';
-- =====================================================================
