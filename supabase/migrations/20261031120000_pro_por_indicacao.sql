-- =====================================================================
-- PRO por indicação (31/10/2026, pedido do Filipe)
--   * 15 indicados válidos (nível 3): PRO por 7 dias, uma vez por conta.
--   * 100 indicados válidos (nível 5): PRO permanente.
-- Quem aplica é o Filipe. O XP e as conquistas dos níveis continuam iguais.
-- =====================================================================
--
-- POR QUE UMA TABELA NOVA PARA OS 7 DIAS
--   O PRO é a tabela supporters, sem data de fim. A compra no Google Play grava
--   nela com "ignore se já existir" (verify-play-purchase); se o PRO de 7 dias
--   fosse uma linha de supporters com validade, quem ganhasse a semana e depois
--   comprasse ficaria com a linha temporária e perderia o PRO pago. Então:
--     - pro_temporario guarda o PRO com data de fim (uma linha por conta, que
--       fica depois de vencer: é o que impede ganhar a semana de novo);
--     - o PRO permanente dos 100 indicados entra em supporters, como o do Pix e
--       o do Google Play.
--   is_supporter passa a olhar as duas.
--
-- QUEM JÁ PASSOU DOS NÍVEIS
--   O bloco 4 dá agora o que cabe a quem já tinha 15 ou 100 indicados válidos
--   (os 7 dias começam a contar na aplicação).
--
-- LIMITE CONHECIDO
--   A função analyze-hand-history decide o limite de análises de IA olhando
--   só supporters: quem está nos 7 dias de PRO por indicação tem o PRO no app
--   e no site, mas o limite de IA de conta grátis. Ajustar lá exige publicar a
--   função pelo Lovable.
-- =====================================================================

BEGIN;

-- 1. PRO com data de fim
CREATE TABLE IF NOT EXISTS public.pro_temporario (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL,
  origem    text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.pro_temporario IS 'PRO com prazo (hoje: 7 dias ao chegar a 15 indicados). Escrito só por funções do servidor; a linha fica depois de vencer.';

ALTER TABLE public.pro_temporario ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pro_temporario FROM anon, authenticated;
GRANT SELECT ON public.pro_temporario TO authenticated;
DROP POLICY IF EXISTS "Ver o proprio pro temporario" ON public.pro_temporario;
CREATE POLICY "Ver o proprio pro temporario" ON public.pro_temporario
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id OR public.has_role((select auth.uid()), 'admin'::public.app_role));

-- 2. "É PRO?" agora olha as duas tabelas
CREATE OR REPLACE FUNCTION public.is_supporter(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.supporters WHERE user_id = _uid)
      OR EXISTS (SELECT 1 FROM public.pro_temporario WHERE user_id = _uid AND expira_em > now());
$$;
REVOKE EXECUTE ON FUNCTION public.is_supporter(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_supporter(uuid) TO authenticated;

-- Entrega dos prêmios de PRO conforme os indicados válidos
CREATE OR REPLACE FUNCTION public._pro_por_indicacao(_uid uuid, _validos integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _validos >= 15 THEN
    INSERT INTO public.pro_temporario (user_id, expira_em, origem)
    VALUES (_uid, now() + interval '7 days', 'indicacao_15')
    ON CONFLICT (user_id) DO NOTHING;  -- uma vez por conta
  END IF;
  IF _validos >= 100 THEN
    INSERT INTO public.supporters (user_id, note)
    VALUES (_uid, 'PRO permanente: 100 indicados válidos')
    ON CONFLICT (user_id) DO NOTHING;  -- quem já é PRO continua como está
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._pro_por_indicacao(uuid, integer) FROM PUBLIC, anon, authenticated;

-- 3. A validação do indicado passa a entregar também o PRO (o resto é igual
--    à versão de 20261021120000, conferida contra a produção em 31/10)
CREATE OR REPLACE FUNCTION public._validar_indicacao(_referred uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referrer uuid;
  _n integer;
  _nivel integer;
  _t integer;
  _xp   integer[] := ARRAY[150, 500, 1500, 4000, 0];  -- nível 5: PRO permanente, não XP
  _conq text[]    := ARRAY['indica_1', 'indica_5', 'indica_15', 'indica_40', 'indica_100'];
BEGIN
  UPDATE public.referrals
     SET validado_em = now()
   WHERE referred_id = _referred
     AND validado_em IS NULL
     AND criado_em > now() - interval '30 days'
  RETURNING referrer_id INTO _referrer;
  IF _referrer IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO _n
    FROM public.referrals
   WHERE referrer_id = _referrer AND validado_em IS NOT NULL;
  _nivel := public.referral_tier(_n);

  -- Paga todos os níveis até o atual: o livro de bônus ignora os já pagos
  FOR _t IN 1.._nivel LOOP
    IF _xp[_t] > 0 THEN
      PERFORM public._dar_xp_bonus(_referrer, 'indicacao', 'nivel_' || _t, _xp[_t]);
    END IF;
    PERFORM public._dar_conquista(_referrer, _conq[_t]);
  END LOOP;

  PERFORM public._pro_por_indicacao(_referrer, _n);
END;
$$;
REVOKE EXECUTE ON FUNCTION public._validar_indicacao(uuid) FROM PUBLIC, anon, authenticated;

-- Para a tela "Indique e ganhe": até quando vai o PRO de 7 dias (null se nunca teve)
CREATE OR REPLACE FUNCTION public.get_my_referral_pro()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'semana_ate', (SELECT expira_em FROM public.pro_temporario WHERE user_id = auth.uid()),
    'permanente', EXISTS (SELECT 1 FROM public.supporters WHERE user_id = auth.uid()));
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_referral_pro() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_my_referral_pro() TO authenticated;

-- 4. Quem já tinha chegado lá antes desta migration
DO $$
DECLARE _r record;
BEGIN
  FOR _r IN
    SELECT referrer_id, count(*)::integer AS validos
      FROM public.referrals
     WHERE validado_em IS NOT NULL
     GROUP BY referrer_id
    HAVING count(*) >= 15
  LOOP
    PERFORM public._pro_por_indicacao(_r.referrer_id, _r.validos);
  END LOOP;
END;
$$;

COMMIT;
