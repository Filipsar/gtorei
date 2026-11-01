-- Histórico das análises com IA (01/11/2026)
--
-- Cada análise feita em /analise-ia vira uma linha: o relatório da IA (veredito
-- e EV de cada mão, leaks, recomendações) e um resumo de cada mão (cartas do
-- herói, spot, posição, stack). O hand history em si NÃO é guardado: nem as
-- ações nem os apelidos de ninguém. "Analisar as próximas 30" atualiza a mesma
-- linha.
--
-- Efeito: tabela nova, só o dono lê, grava, muda e apaga as próprias análises
-- (RLS). Cada conta guarda as 50 mais recentes; a 51ª apaga a mais antiga.
-- Excluir a conta apaga tudo (ON DELETE CASCADE em auth.users).

CREATE TABLE IF NOT EXISTS public.analises_ia (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  atualizada_em   timestamptz NOT NULL DEFAULT now(),
  arquivo         text CHECK (char_length(arquivo) <= 200),
  sala            text CHECK (char_length(sala) <= 30),
  maos_no_arquivo integer NOT NULL CHECK (maos_no_arquivo >= 0),
  maos_analisadas integer NOT NULL CHECK (maos_analisadas >= 0),
  ev_total        numeric,
  resultado       jsonb NOT NULL,
  -- Teto de ~200 KB por análise: o relatório de 300 mãos fica bem abaixo disso
  CONSTRAINT analises_ia_tamanho CHECK (pg_column_size(resultado) <= 200000)
);

CREATE INDEX IF NOT EXISTS analises_ia_usuario_data ON public.analises_ia (user_id, criada_em DESC);

ALTER TABLE public.analises_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analises_ia: dono lê"    ON public.analises_ia FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "analises_ia: dono grava" ON public.analises_ia FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "analises_ia: dono muda"  ON public.analises_ia FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "analises_ia: dono apaga" ON public.analises_ia FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Mantém só as 50 análises mais recentes de cada conta
CREATE OR REPLACE FUNCTION public._analises_ia_limite()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.analises_ia
  WHERE user_id = NEW.user_id
    AND id IN (
      SELECT id FROM public.analises_ia
      WHERE user_id = NEW.user_id
      ORDER BY criada_em DESC
      OFFSET 50
    );
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public._analises_ia_limite() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS analises_ia_limite ON public.analises_ia;
CREATE TRIGGER analises_ia_limite AFTER INSERT ON public.analises_ia
  FOR EACH ROW EXECUTE FUNCTION public._analises_ia_limite();
