-- Notícias com cara de portal (31/10/2026, pedido do Filipe): a página
-- /noticias ganha uma faixa com os últimos resultados (quem ganhou, qual
-- torneio, quanto) e um quadro das maiores premiações do mês. Para isso cada
-- notícia de resultado guarda esses dados à parte, além do texto:
--
--   torneio     texto curto, ex.: "GGMillion$ US$ 10.000"
--   vencedor    ex.: "Fabiano Kovalski"
--   premio      como aparece na tela, ex.: "US$ 464.794"
--   premio_usd  o mesmo em dólares, número, só para ordenar o quadro
--   relevancia  1 normal, 2 destaque, 3 manchete (a manchete abre a página)
--
-- Tudo opcional: notícia que não é resultado de torneio fica sem. Quem
-- preenche é quem publica (a rotina do chat e o robô noticias-automaticas).
-- O anon pode ler as colunas novas, como as demais de notícia publicada; a
-- página funciona sem esta migration (só não mostra a faixa e o quadro).

ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS torneio    text CHECK (length(torneio) <= 80),
  ADD COLUMN IF NOT EXISTS vencedor   text CHECK (length(vencedor) <= 60),
  ADD COLUMN IF NOT EXISTS premio     text CHECK (length(premio) <= 30),
  ADD COLUMN IF NOT EXISTS premio_usd numeric CHECK (premio_usd >= 0),
  ADD COLUMN IF NOT EXISTS relevancia smallint NOT NULL DEFAULT 1 CHECK (relevancia BETWEEN 1 AND 3);

GRANT SELECT (torneio, vencedor, premio, premio_usd, relevancia) ON public.noticias TO anon;
