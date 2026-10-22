-- =====================================================================
-- PRO comprado no Google Play
-- Escrito em 21/10/2026. NÃO APLICADO: quem aplica é o Filipe.
-- =====================================================================
--
-- O app Android vende o PRO como compra única ("gtorei_pro"). A função
-- verify-play-purchase confere o pagamento com o Google e, se valer, grava a
-- compra aqui e põe a conta em supporters (o mesmo acesso de quem apoia por
-- Pix). Por isso o PRO vale no site também.
--
-- Esta tabela existe para um mesmo pagamento não liberar duas contas: o token
-- da compra é a chave, e fica preso à primeira conta que o validou.
--
-- Só a função (service role) escreve e lê. Nenhum acesso para o usuário.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.play_purchases (
  purchase_token text PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id     text NOT NULL,
  order_id       text,
  -- 'comprado'; 'teste' para compra de testador de licença (sem cobrança)
  estado         text NOT NULL CHECK (estado IN ('comprado', 'teste')),
  criado_em      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_play_purchases_user ON public.play_purchases (user_id);
COMMENT ON TABLE public.play_purchases IS 'Compras do PRO no Google Play já conferidas com o Google. Escrita só pela função verify-play-purchase.';

ALTER TABLE public.play_purchases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.play_purchases FROM anon, authenticated;

COMMIT;

-- Estorno: o Google não avisa esta tabela sozinho. Se alguém pedir reembolso,
-- o acesso sai pela tela de admin (tirar apoiador). Automatizar isso exige as
-- notificações em tempo real do Play (RTDN), que ficaram para depois.
