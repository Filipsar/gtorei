# GTORei — CLAUDE.md

## O que é

Treinador de poker GTO gratuito, em português, no ar em https://www.gtorei.com.br com cerca
de 150 usuários reais. Não há plano pago nem anúncios: o projeto se mantém por doações
via Pix (`/apoiar`). **Cada push na `main` vai para produção em ~25 segundos** pelo
Vercel — não existe ambiente de homologação.

O público é jogador de torneio brasileiro, muitos deles iniciantes. Texto de tela em
português claro, sem jargão de solver não explicado.

## Comandos

```bash
npm run dev            # servidor local na porta 8080
npx tsc --noEmit -p tsconfig.app.json   # checagem de tipos (sem o -p não checa nada: o tsconfig da raiz não lista arquivos)
npm run test           # vitest (roda uma vez)
npm run build          # build de produção
npx vercel ls gtorei --yes   # estado dos deploys
```

Antes de dizer que terminou: **tsc, test e build, os três**. Se a mudança aparece na
tela, abrir no navegador e conferir — não pedir para o usuário verificar no lugar.

## Convenções

- **Idioma**: textos de tela, comentários e mensagens de commit em **português**. Nomes
  de variáveis e funções em **inglês**. Alguns arquivos recentes (`PokerTable`,
  `ActionButton`, `OnboardingTutorial`) têm identificadores em português por herança —
  não replicar o padrão em arquivos novos.
- **Commits** curtos, em português, dizendo o efeito e não o arquivo mexido.
- **Changelog**: toda mudança que o usuário percebe entra como versão nova em
  `src/pages/UpdatesPage.tsx`. Quando vale reabrir o pop-up de novidades para todo
  mundo, subir também `CURRENT_VERSION` em `src/components/ui/UpdatesPopup.tsx`.
- **Publicar**: commit + push direto, depois conferir o deploy e a página no ar.
- **Banco de dados**: escrever o SQL comentado e explicar o efeito — quem aplica
  migration, RLS e política de acesso é o Filipe. Nunca rodar direto.

## Verificar tela que exige login

Quase tudo é rota protegida. Duas saídas, nesta ordem de preferência:

1. `/atualizacoes` e `/iniciante` são públicas **e** usam o `MainLayout` — servem para
   conferir barra lateral, banner do topo e temas sem login.
2. Para o resto: criar uma rota temporária (`/__algo`) apontando para um harness,
   verificar, e **restaurar o `src/App.tsx`** a partir de um backup no scratchpad,
   conferindo que não sobrou resíduo antes de commitar.

## Armadilhas (coisas que já quebraram aqui)

### O login do Google depende de infraestrutura do Lovable

82% dos usuários entram por ele. O fluxo passa por `/~oauth/initiate`, que **não existe
no repositório** — é um redirect declarado no `vercel.json` apontando para o broker
`oauth.lovable.app`, que guarda as credenciais. O Supabase **não** tem client id/secret
do Google. Além disso o broker só aceita o apex: mandar `www.gtorei.com.br` devolve 400,
por isso existe `origemParaOAuth()` em `src/pages/AuthPage.tsx`, que normaliza www → apex.

Não remover `src/integrations/lovable/`, os redirects do `vercel.json` nem essa
normalização sem antes criar credencial própria no Google Cloud + Supabase. O passo a
passo está em `MIGRACAO-VERCEL.md`.

### Hospedagem e domínio

Vercel, com DNS na HostGator (registro A `76.76.21.21`). O valor de rollback para o
Lovable é `185.158.133.1`.

**O endereço oficial é `www.gtorei.com.br`.** O apex responde 308 para o www, e
sitemap, canonical, Open Graph e dados estruturados apontam para o www. A única
exceção deliberada é o `redirect_uri` do OAuth, que continua saindo no apex porque é
só isso que o broker aceita — está explicado no comentário do `AuthPage.tsx`.

### localStorage e sessionStorage lançam exceção

Em aba anônima ou com cookies negados eles não devolvem `null`: eles **lançam**. Isso já
prendeu o usuário dentro do onboarding (o botão de fechar estourava antes de fechar) e
já impediu o X do banner de funcionar. Todo acesso vai dentro de `try/catch`, e a tela
precisa funcionar sem armazenamento nenhum.

### O `MainLayout` remonta a cada troca de rota

Cada página renderiza o próprio `<MainLayout>`, então estado dentro dele volta ao valor
inicial a cada navegação. Foi o que fazia o banner rotativo recomeçar sempre da primeira
mensagem. Estado que precisa sobreviver à navegação fica em variável de módulo.

### Cores vivem em três blocos do `index.css`

`:root` (escuro, padrão), `.light` e `.dark`. Token novo precisa entrar nos três, senão
o tema claro herda a cor do escuro. O site tem página pública de acessibilidade, então
contraste é compromisso assumido: **4,5:1 para texto, 3:1 para elemento de interface**.
O dourado como cor de texto sobre fundo claro reprova — já aconteceu duas vezes.

### Ranges são calculadas, não copiadas

As ranges de push/fold saem de `scripts/build-pushfold.mjs`, a partir de uma matriz de
equity 169x169 gerada por Monte Carlo, com iteração de melhor-resposta até o equilíbrio.
Nunca copiar tabela proprietária (GTO Wizard e afins) para dentro do projeto.

Desde 02/10/2026 a **abertura** (`openRaise`) de todas as stacks sai de
`scripts/build-open-ev.mjs` (fold / abrir pequeno / all-in, com ante de 1 BB), emitida em
`openev.generated.ts` por `scripts/emit-open-ev-ts.mjs`. Para refazer: `node
scripts/build-open-ev.mjs && node scripts/emit-open-ev-ts.mjs` (~2 min). O pós-flop é
estimado por realização de equity, não resolvido; as simplificações e a limitação
conhecida (CO/BTN apertados entre 20 e 35 BB) estão no cabeçalho do script. Mesa final,
bounty, `vsOpenRaise` e `vs3bet` continuam no corte por percentual de `engine.ts`; o
pagamento de all-in (`vsOpenShove`) continua no push/fold sem ante.

### Tailwind

`grid-cols-13` não existe no padrão — a matriz 13x13 usa
`grid-cols-[repeat(13,minmax(0,1fr))]`. Modificador de opacidade não funciona em cor
arbitrária com `var()`; usar `hsl(var(--x)_/_0.15)` quando precisar.

### Exportação CSV do admin

Célula que começa com `=`, `+`, `-` ou `@` vira fórmula ao abrir no Excel. O helper
`csvCell` em `src/pages/AdminPage.tsx` prefixa aspas simples — qualquer exportação nova
passa por ele.

### Hand history (análise com IA)

`src/utils/handHistoryParser.ts` lê o cabeçalho por sala e o corpo da mão num núcleo só
(`fillHandFromLines`). Até 25/10/2026 o GGPoker e o 888poker não importavam: o GG
exporta `Poker Hand #TM…` (o parser procurava `GGPoker Hand #`) e o 888 escreve
`( $2.13 )`, `[ 7d, Ah ]` e `raises [$0.06]`. Valor sempre por `numero()` — vírgula de
milhar (`3,750`) virava 3. Os testes em `src/test/handHistoryParser.test.ts` têm uma mão
real de cada sala; formato novo entra lá primeiro.

O spot do herói (open, vs open, vs 3-bet...) sai de `src/lib/spotsDoHeroi.ts`, não da IA:
ela dizia "melhorar vs 3-bet" para quem só tinha mãos vs open raise. A tela filtra do
resumo o leak de spot que não está em nenhuma mão enviada. A função lê no máximo 30 mãos
e 300 KB, então a tela escolhe as 30 em que o herói entrou no pote.

## Não fazer

- Não prometer na interface o que não existe. Já houve texto de onboarding citando
  ranking semanal e conquista "Sem Erro", nenhum dos dois existia.
- Não subir segredo para o repo (`.env*` está no `.gitignore`).
- Não mexer nas edge functions (`supabase/functions/`) assumindo que serão publicadas:
  hoje a publicação delas passa pelo Lovable. Confirmar antes de começar.

## Pendências conhecidas

- `ADMIN_EMAIL` ainda está escrito na mão em `AppSidebar.tsx` e `AdminPage.tsx` (só para
  mostrar o menu; quem protege os dados é o servidor). A função `admin-users` passou a usar
  `has_role` em 05/10/2026.
- Cliente ainda escreve direto em ranking e estatísticas. A trava está escrita em
  `supabase/migrations/20261005120000_travar_pontuacao.sql`, esperando o Filipe aplicar.
- Revisão de segurança de 05/10/2026: `analyze-hand-history` passou a exigir login e a
  limitar 5 análises por usuário por dia (`ai_analysis_usage`). Antes respondia a
  qualquer chamada, até sem token, e cada chamada gastava crédito de IA. As duas funções
  só valem em produção depois de publicadas pelo Lovable.
- Duas vulnerabilidades moderadas no react-router que só a versão 7 resolve. Analisadas
  como não exploráveis neste app.
- Indicação, desafios diários e conquistas novas (21/10/2026): telas `/indicar` e
  `/desafios`, cartão de desafios no topo do treino. Tudo depende da migration
  `20261021120000_indicacao_e_desafios.sql` (aplicar depois da `20261005120000`); sem
  ela, as telas mostram "em breve". O prêmio do nível 5 (sorteio mensal de US$ 100) só
  aparece com `PREMIO_INDICACAO_ATIVO = true` em `src/data/indicacao.ts`, depois da
  autorização do Ministério da Fazenda. XP de indicação e desafio não entra no ranking.
- App Android (21/10/2026): Capacitor em `android/`, guia completo em
  `docs/PLAY-STORE.md`. Um app só, grátis com anúncios, compra única PRO (`gtorei_pro`)
  que vira apoiador no banco. Código nativo fica em `src/lib/nativo/` e só carrega dentro
  do app (`ehApp()`). No app somem o link da GGPoker e o Pix. O AAB nunca foi gerado:
  sai pelo GitHub Actions depois dos segredos do passo 3 do guia.
  Teste fechado (24/10/2026): convite em `/baixar-app`, no menu lateral e no pop-up de
  novidades, tudo ligado por `TESTE_ANDROID_ABERTO` em `src/data/appAndroid.ts`. A
  entrada é o Grupo do Google cadastrado como testador; APK baixado do site não conta
  para os 12 testadores por 14 dias. Quando o app for para a produção, trocar a página
  pelo link direto da loja.
  APK de teste (24/10/2026): JDK 21 e Android SDK em
  `C:\Users\farub\AppData\Local\gtorei-android\` (fora do OneDrive). Com `JAVA_HOME` e
  `ANDROID_HOME` apontando para `jdk` e `sdk` ali: `npm run build && npx cap sync android
  && cd android && ./gradlew.bat assembleDebug -PVERSION_CODE=<AAMMDDHH> -PVERSION_NAME=<x.y.z-teste>`.
  O app empacota o `dist`: mudança no site só chega ao app num APK novo. A chave de debug
  fica em `~/.android/debug.keystore` desta máquina; compilando sempre aqui, a versão nova
  instala por cima. O Filipe envia e baixa o APK em /admin → App Android (bucket privado
  `app-teste`, migration `20261024120000_app_teste_storage.sql`).
- Layout do app (24/10/2026): dentro do app, o `MainLayout` vira `AppShell`
  (`src/components/app/`): barra do topo com nível e XP e cinco abas embaixo (Trilha,
  Treinar, Desafios, Ranking, Mais), acima da faixa de anúncio. O app abre em `/trilha`:
  níveis de torneio com fichas de poker como lições (`src/data/trilha.ts`), 10 mãos com
  resposta a cada uma, passa com 7 acertos (`src/lib/trilha.ts`). A lição roda no
  TrainPage por `?licao=id` e tem contador próprio (mão repetida conta para a lição, não
  para o XP). O progresso da trilha fica no aparelho por enquanto. No site, `/trilha` e
  `/mais` mandam para o treino. Para ver o layout do app no navegador em desenvolvimento:
  `localStorage.gtorei_previa_app = '1'` (`usarLayoutDoApp()`; some no build). Fora da
  trilha de propósito: vs 3-bet, Bounty, Simulação e Multiway. Guia de design usado: skill
  ui-ux-pro-max, clonada em `../ui-ux-pro-max-skill`.
  Abas do app: Trilha, Treinar, Duelo, Ranking, Mais (Desafios mora em Mais; no app o
  cartão de desafios não aparece no Treinar). Duelo ao vivo (24/10/2026, migration
  `20261024140000_duelo_ao_vivo.sql`, `src/lib/duelo.ts`, `src/components/duelo/`): HU
  entre dois jogadores, 10 mãos, um no SB e o outro no BB, só preflop (com call a mesa
  corre até o river). O servidor embaralha, guarda as cartas (`duelo_cartas`, sem leitura
  direta), valida cada jogada e decide o showdown (`_duelo_forca`, conferido contra o
  `handEvaluator` do app em 4.000 mãos no PGlite). Fila única de até 3 minutos; partida em
  `/duelo?partida=id`, que esconde as abas. 30 s por decisão, conferidos a cada chamada
  (sem pg_cron). A nota GTO vem do app e só existe onde o treino de HU tem range (abrir do
  SB, BB contra raise e contra all-in). Sem a migration, a aba avisa que o duelo não está
  disponível. O duelo contra o Rei (`?duelo=`) saiu. Desafio concluído vira aviso de 3,5 s
  no topo (`AvisoDeDesafio`, app e site). No app, depois de cada mão o Rei comenta (`ReiComenta`, texto de
  `src/lib/explicacao.ts`, tirado da mesma range que dá a nota); o quadro completo abre em
  "Ver range". Sem tutorial nem teste de nível no app: a trilha faz esse papel.
  Ligas por elo (migrations `20261024130000_ligas_por_elo.sql` e
  `20261024150000_ligas_diarias.sql`): Bronze, Prata, Ouro, Adamantio, Rúnico, Diamante,
  Rei. Desde 24/10/2026 a disputa é diária (XP do `rankings` daily, Brasília), com regra
  por elo: sobem 10/10/10/6/6/3 e caem do 20º/20º/15º/10º/10º para baixo (Bronze não cai);
  no Rei ficam os 10 primeiros. A tabela está no SQL (`_regra_do_elo`) e em
  `src/data/elos.ts` (`REGRAS_DOS_ELOS`); `src/test/ligas.test.ts` falha se divergirem. Sem
  pg_cron: os dias fecham, em ordem, na primeira chamada de `get_liga()` depois da
  meia-noite. Ranking e perfil são os mesmos no app e no site
  (`src/components/app/RankingApp.tsx` com `site`, `PerfilApp.tsx` responsivo); o ranking
  global é do mês, e só o admin escolhe meses anteriores. O anúncio das ligas é um slide do
  `UpdatesPopup` (versão 1.26.0).
  Sons da mesa (24/10/2026): `public/sons/` (cartas, fichas, check, estrelas), tocados por
  `src/lib/sons.ts`; o botão `BotaoDeSom` liga e desliga (guardado no aparelho). Os
  arquivos originais vieram em `sounds/`, na raiz, fora do git.
  Arte do app (24/10/2026): fichas, pilhas e baú em `public/trilha/`, poses do Rei em
  `public/mascote/rei-*.webp`. Prompts em `midia/_arte/prompts-trilha.md`; o Gemini entrega
  JPG com fundo magenta, recortado por `midia/_arte/recortar-trilha.py` (tira o magenta das
  bordas e das sombras e separa as folhas de expressões). `src/test/assetsDoApp.test.ts`
  falha se o app pedir uma imagem que não existe.
- Notícias (24/10/2026, migration `20261024160000_noticias.sql`): `/noticias` e
  `/noticias/:slug` saem em HTML pronto de funções do Vercel (`api/noticias.ts`, com o
  código comum em `api/_noticias.ts`), não do SPA: é o que deixa o Google ler a página.
  Rewrites e `includeFiles: .env` no `vercel.json` (as funções leem a URL e a chave
  publicável do `.env` versionado; não há variável no Vercel). Fluxo: o admin abre /admin →
  Notícias, `api/rss.ts` lê os feeds de uma lista fixa (PokerNews Brasil, PokerNews,
  CardPlayer) e o app grava o que é novo como rascunho; publicar exige título e resumo
  escritos pelo admin (mínimo de 200 caracteres, conferido no banco). O trecho do feed
  nunca vai para a página: só manchete e link de outro site seria conteúdo raspado e
  prejudica o site inteiro no Google. Sitemap próprio em `/sitemap-noticias.xml` (citado no
  `robots.txt`; `/noticias` só entra nele quando há notícia publicada, porque vazia ela é
  noindex). A porta de entrada pública é a página inicial: "Notícias" no menu do topo e no
  rodapé e a seção "Últimas notícias" (`src/components/home/UltimasNoticias.tsx`, some sem
  notícia publicada). Links para `/noticias` são `<a href>` comuns, nunca `Link` do roteador.
  No admin dá para marcar várias, abrir os editores juntos e publicar as prontas em lote.
  Imagem (migration `20261024170000_noticias_imagem.sql`, bucket público `noticias`, só o
  admin envia): a enviada pelo admin, com crédito, ou a arte do GTORei gerada no navegador
  (`src/lib/imagemDaNoticia.ts`: 1200x630, JPEG, título + Rei lendo; nome começa com
  `gerada-` e é refeita quando o título muda). A foto do feed da fonte nunca é usada: é da
  agência ou do site de origem. O título do rascunho começa em branco (o da fonte aparece
  só como referência). `api/_noticias.ts` consulta sem as colunas de imagem se elas ainda
  não existirem.
  Resumos prontos (24/10/2026): o Filipe pediu que, com o chat do Claude aberto, os
  resumos do dia saiam sozinhos. A rotina roda `node noticias/_ferramentas/baixar-materias.mjs
  <desde> <saida>` (tira o que já foi resumido, publicado ou dispensado em
  `noticias/_ferramentas/ignoradas.json`), escreve título e resumo com palavras próprias e
  grava `noticias/AAAA-MM-DD.json` (`{"gtorei_noticias":1,"itens":[...]}`, lido por
  `lerImportacao` em `src/lib/noticias.ts`). A pasta `noticias/` fica fora do git. No admin,
  "Importar resumos" cria o que o feed ainda não trouxe, preenche só rascunhos e deixa as
  importadas marcadas; publicar em lote segue a data da fonte. Nunca publicar sozinho nem
  escrever no banco: quem publica é o Filipe. Dispensar propaganda, podcast, caso policial
  ou alegação de crime e notícia repetida. A pasta `api/` fica fora do `tsconfig.app.json`; para checar os tipos:
  `npx tsc --noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext
  --types node --skipLibCheck api/*.ts`. O `dev` do Vite não serve `api/`.
- Excluir conta (`/excluir-conta`, função `delete-account`): exigência da Play Store.
  Ao criar tabela nova com dados do usuário, incluir na lista `TABELAS` da função.
- Políticas (22/10/2026): `/privacidade`, `/termos`, `/reembolso`, `/cookies` em
  `src/pages/LegalPage.tsx`. Controlador e contato em `src/data/legal.ts`
  (preenchidos em 22/10/2026: MEI 65.621.196, 3decor.suporte@gmail.com). O texto descreve o que o
  código faz: mudou coleta de dados, SDK ou cobrança, mudar a política e
  `docs/SDKS-E-DADOS.md` junto. O site não usa rastreador; não acrescentar sem rever a
  política e o aviso de cookies (`src/components/legal/AvisoPrivacidade.tsx`).
- Dificuldade do treino (22/10/2026): `src/lib/dificuldade.ts`, controle visível no
  treino. Muda só quais mãos são sorteadas e o multiplicador de XP ganho (Fácil ×0,7 a
  Elite ×1,4, com teto de 30 pontos por mão, o limite de `record_hand_result`). O
  automático usa só o acerto das últimas 20 mãos. Substitui o viés escondido por nível
  de XP que existia em `generateRandomHand`.
- Simulado (23/10/2026): série de 10 a 30 mãos sem resposta, correção e XP no fim
  (`src/lib/simulado.ts`, `SimuladoResultado.tsx`). Cada mão é gravada com 0 ponto numa
  sessão `scenario = 'simulado'`, e o XP sai do servidor (`claim_simulado`, migration
  `20261023130000_simulado.sql`), que recalcula tudo a partir de `played_hands`. Sem a
  migration, a correção aparece mas o XP dá erro. A sessão fica com `scenario =
  'simulado'`, mas cada mão em `played_hands` guarda o próprio cenário. O `openRaise` passou a valer metade do XP
  (mesma regra no cliente e no `claim_simulado`; no cliente, `pesarPorCenario`). Desde
  24/10/2026 o simulado não deixa escolher cenário, posição, stack nem mesa final: tudo é
  sorteado a cada mão, e 1 mão em 4 cai na mesa final (`sortearMesaFinal`). Mão de mesa
  final ganha borda dourada e o aviso no feltro (`PokerTable` `mesaFinal`).
- pg_cron não está instalado (conferido em 22/10/2026): a limpeza dos códigos de mão
  nunca rodou. Correção em `supabase/migrations/20261022120000_limpeza_codigos_de_mao.sql`.
- Não fazer: perfil de valor por usuário (receita de anúncio, aparelho, país) nem
  dificuldade do treino que dependa disso. Recusado em 22/10/2026: o treino é medida de
  habilidade, e mexer nele por monetização é padrão enganoso (LGPD e Play Store).

## Conteúdo do Instagram (@gtorei)

As pastas `midia/`, `pautas/`, `publicados/`, `rascunhos/` e `Gemini fotos/` são do
perfil @gtorei, não do app, e ficam fora do git (ver `.gitignore`). As regras de
conteúdo (voz, pilares, visual, mascote, decisões) estão em `CLAUDE-conteudo.md`:

@CLAUDE-conteudo.md
