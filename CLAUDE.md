# GTORei — CLAUDE.md

## O que é

Treinador de poker GTO gratuito, em português, no ar em https://gtorei.com.br com cerca
de 150 usuários reais. Não há plano pago nem anúncios: o projeto se mantém por doações
via Pix (`/apoiar`). **Cada push na `main` vai para produção em ~25 segundos** pelo
Vercel — não existe ambiente de homologação.

O público é jogador de torneio brasileiro, muitos deles iniciantes. Texto de tela em
português claro, sem jargão de solver não explicado.

## Comandos

```bash
npm run dev            # servidor local na porta 8080
npx tsc --noEmit       # checagem de tipos
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
Lovable é `185.158.133.1`. Hoje o apex responde 308 para o `www`, enquanto sitemap,
canonical e Open Graph apontam para o apex — inconsistência conhecida, resolvida
trocando o domínio principal no painel do Vercel ou mudando a base no código.

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

- `ADMIN_EMAIL` está escrito na mão em `AppSidebar.tsx`, `AdminPage.tsx` e
  `supabase/functions/admin-users/index.ts`. O banco já tem a função `has_role`, que é o
  mecanismo correto.
- Cliente ainda escreve direto em ranking e estatísticas; a proteção por RLS está
  planejada.
- Duas vulnerabilidades moderadas no react-router que só a versão 7 resolve. Analisadas
  como não exploráveis neste app.
