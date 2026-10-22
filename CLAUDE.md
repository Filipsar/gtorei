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
