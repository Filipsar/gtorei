# Migração do GTORei para o Vercel

Levantamento feito em 21/09/2026, com o site no ar pelo Lovable.

## O que trava a migração: o login com Google

**124 dos 152 usuários (82%) entram com Google.** Dos 40 que acessaram nos últimos 30 dias, 31 são Google.

Esse login **não passa pelo Supabase**. Ele passa por um intermediário do Lovable:

1. O app manda o navegador para `/~oauth/initiate?provider=google&redirect_uri=https://gtorei.com.br&state=...`
2. **A borda do Lovable** responde 302 para `https://oauth.lovable.app/initiate?...&project_id=lovp_5jamtv3ph38k6b6nr0eccjt613`
3. O intermediário manda para o Google, recebe de volta e devolve os tokens para o `redirect_uri`
4. O app chama `supabase.auth.setSession(tokens)`

O passo 2 **não existe neste repositório**. É injetado pela hospedagem do Lovable. No Vercel, `/~oauth/initiate` cairia na regra de SPA e devolveria o `index.html` — o botão do Google pararia de funcionar.

Confirmado por resposta do servidor:

```
GET https://gtorei.com.br/~oauth/initiate?provider=google
302 Location: https://oauth.lovable.app/initiate?provider=google&project_id=lovp_5jamtv3ph38k6b6nr0eccjt613
```

E o Supabase, sozinho, não consegue fazer esse login:

```
GET .../auth/v1/authorize?provider=google
400 {"error_code":"validation_failed","msg":"Unsupported provider: missing OAuth secret"}
```

Ou seja: o Google está marcado como habilitado no projeto, mas **sem client id e sem secret**. Quem tem a credencial do Google é o Lovable.

### O que o `vercel.json` já resolve

As duas regras de `redirects` reproduzem exatamente o que a borda do Lovable faz hoje. Com elas, o fluxo continua igual.

### O que ainda é incerto

O intermediário do Lovable valida o `redirect_uri` contra uma lista do projeto. Testado:

| `redirect_uri` | Resposta |
| --- | --- |
| `https://gtorei.com.br` | 302 para o Google ✅ |
| `https://gtorei.vercel.app` | 400 ❌ |
| domínio qualquer | 400 ❌ |

Duas consequências:

1. **Não dá para testar o login com Google numa URL `*.vercel.app`.** O intermediário recusa. Só dá para validar depois que o `gtorei.com.br` estiver apontando para o Vercel.
2. O domínio `gtorei.com.br` está na lista hoje. Se o Lovable tira o domínio da lista quando o DNS deixa de apontar para eles, o login quebra. Isso não dá para descobrir sem fazer a troca.

Por isso o cutover precisa ser feito em horário fraco e com o rollback pronto.

## O que já está pronto (verificado em 21/09/2026)

Projeto `gtorei` no Vercel, conectado a `Filipsar/gtorei`, com deploy de produção
saindo a cada push na `main`. Os domínios `gtorei.com.br` e `www.gtorei.com.br`
já estão registrados no projeto — só não são servidos porque o DNS ainda aponta
para o Lovable.

Conferido na URL `https://gtorei.vercel.app`:

| Item | Resultado |
| --- | --- |
| Redirect do OAuth | `307 → https://oauth.lovable.app/initiate?provider=google&redirect_uri=...&state=...&project_id=lovp_5jamtv3ph38k6b6nr0eccjt613` — query preservada e `project_id` acrescentado, igual ao que a borda do Lovable faz |
| `/~oauth/callback` | `307 → https://oauth.lovable.app/callback` |
| Headers | `X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'`, HSTS, Referrer-Policy, Permissions-Policy, nosniff |
| Rotas do SPA | `/iniciante`, `/atualizacoes`, `/apoiar`, `/gtoreiacessibilidade`, `/auth` abrem direto pela URL |
| Estáticos | `robots.txt`, `sitemap.xml`, `og-gtorei.png`, ícones — todos 200 com o tipo certo |
| Cache | `/assets/*` imutável por 1 ano, `index.html` com `must-revalidate` |
| Supabase | Responde da origem do Vercel, sem bloqueio de CORS |
| Console | Limpo, zero erro |

O `frame-ancestors` é um ganho real: o host do Lovable nunca serviu esse header.

**Variáveis de ambiente:** não precisam ser configuradas. O `.env` está versionado
e só tem as três chaves `VITE_*`, que já vão compiladas no bundle público.

## O que falta: o DNS

Isso depende de você, e é o único passo irreversível.

```
nameservers: dns3.hostgator.com.br, dns4.hostgator.com.br
gtorei.com.br     A      185.158.133.1     <- Lovable, ANOTE, é o rollback
www.gtorei.com.br CNAME  gtorei.com.br
```

No painel de DNS da HostGator:

1. **Baixe o TTL do registro A para 300 segundos e espere o TTL antigo expirar.**
   É isso que faz a volta atrás levar minutos em vez de horas.
2. Troque o `A` de `gtorei.com.br` de `185.158.133.1` para **`76.76.21.21`**
   (valor que o próprio Vercel indica para este domínio).
3. O `www` pode continuar `CNAME` para `gtorei.com.br`.

Não delegue os nameservers para o Vercel. O registro A resolve, e manter o DNS na
HostGator deixa o rollback na sua mão.

### Logo depois da troca

1. Esperar o certificado do Vercel emitir (alguns minutos)
2. **Testar o login com Google numa aba anônima.** É o único teste que importa,
   e é o único que não pôde ser feito antes.
3. Se funcionar: pronto. Testar também um cadastro novo por e-mail.
4. Se não funcionar: voltar o registro A para `185.158.133.1`. Com TTL de 300s,
   em poucos minutos o Lovable volta a servir e o login volta.

Depois que o Vercel estiver servindo o domínio, o Lovable continua publicando
em `gtorei.lovable.app`. Vale manter por um tempo como rede de segurança — e
lembrar que um `deploy_project` lá não afeta mais o gtorei.com.br.

## Depois da migração: tirar o login do Lovable

O pacote que faz o login com Google se chama, literalmente, `@lovable.dev/cloud-auth-js` — "Lovable **legacy** OAuth broker JS". Enquanto o login depender dele, o site depende do Lovable mesmo hospedado no Vercel, e eles podem desligar isso quando quiserem.

Para cortar essa dependência:

1. No Google Cloud Console, criar uma credencial OAuth 2.0 (Web application) com o redirect autorizado
   `https://dejfimivoonbmgfxtbdf.supabase.co/auth/v1/callback`
2. Colar client id e secret no provedor Google do Supabase (pelo backend do Lovable)
3. Adicionar `https://www.gtorei.com.br` (endereço oficial) e `https://gtorei.com.br` na lista de Redirect URLs do Supabase
4. No código, trocar `lovable.auth.signInWithOAuth('google', ...)` por
   `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
   e apagar `src/integrations/lovable/`

**Sobre as contas que já existem:** as 126 identidades Google guardadas têm `provider_id` de 21 dígitos, que é o `sub` da conta Google. Esse número identifica a conta, não o cliente OAuth, então a expectativa é que os usuários caiam nas mesmas contas. Vale confirmar com uma conta de teste antes de considerar resolvido.
