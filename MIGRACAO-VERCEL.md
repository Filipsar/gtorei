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

## Passos que dependem de você

### 1. Dar acesso do repositório ao app do Vercel no GitHub

`Filipsar/gtorei` é privado. O erro "repo does not exist" que apareceu antes é falta de permissão, não repositório errado.

GitHub → Settings → Applications → Installed GitHub Apps → **Vercel** → Configure →
em *Repository access*, incluir `gtorei` → Save.

Depois: Vercel → Add New → Project → Import `Filipsar/gtorei`.

### 2. Conferir as configurações de build no Vercel

Devem ser detectadas sozinhas. Se não forem:

| Campo | Valor |
| --- | --- |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Node.js Version | 22.x (já fixado em `package.json` e `.nvmrc`) |

**Variáveis de ambiente:** não precisa configurar. O `.env` está versionado e só tem as três chaves `VITE_*`, que já vão compiladas no bundle público de qualquer forma. Se você preferir colocá-las no painel do Vercel, os valores têm que ser idênticos aos do `.env`.

### 3. Antes de mexer no DNS — o que dá para validar

Na URL `*.vercel.app` que o Vercel gerar, dá para conferir tudo menos o Google:

- [ ] A landing abre e a matriz de range aparece
- [ ] Login por e-mail e senha funciona (esse não passa pelo Lovable)
- [ ] Rotas internas abrem direto pela URL, sem 404 (`/iniciante`, `/atualizacoes`)
- [ ] `curl -I` mostra `X-Frame-Options: DENY` e `Content-Security-Policy: frame-ancestors 'none'`
- [ ] `curl -sD - -o /dev/null https://SEU-PROJETO.vercel.app/~oauth/initiate?provider=google` responde **302** com `Location` para `oauth.lovable.app` **com o `project_id` junto** — é isso que prova que a regra de redirect está certa

O login com Google em si só dá para testar depois da troca de DNS.

### 4. Trocar o DNS (HostGator)

O DNS do domínio está na HostGator, não na Cloudflare:

```
nameservers: dns3.hostgator.com.br, dns4.hostgator.com.br
gtorei.com.br     A      185.158.133.1     <- Lovable, ANOTE ESTE VALOR
www.gtorei.com.br CNAME  gtorei.com.br
```

**Anote `185.158.133.1` antes de mexer.** É o valor de rollback.

No Vercel: Project → Settings → Domains → adicionar `gtorei.com.br` e `www.gtorei.com.br`. O Vercel mostra o valor exato do registro A (eles mudam o IP de tempos em tempos — **use o que o painel mostrar**, não um IP anotado de outro lugar).

Na HostGator, painel de DNS do domínio:
- trocar o `A` de `gtorei.com.br` para o valor que o Vercel indicar
- `www` pode continuar `CNAME` para `gtorei.com.br`

Antes de trocar, baixe o TTL do registro A para 300 segundos e espere o TTL antigo expirar. Isso faz a propagação — e o rollback — levar minutos em vez de horas.

### 5. Logo depois da troca

1. Esperar o certificado do Vercel emitir (alguns minutos)
2. **Testar o login com Google numa aba anônima.** É o teste que importa.
3. Se funcionar: pronto. Testar também um cadastro novo por e-mail.
4. Se não funcionar: voltar o registro A para `185.158.133.1`. Em poucos minutos o Lovable volta a servir e o login volta.

## Depois da migração: tirar o login do Lovable

O pacote que faz o login com Google se chama, literalmente, `@lovable.dev/cloud-auth-js` — "Lovable **legacy** OAuth broker JS". Enquanto o login depender dele, o site depende do Lovable mesmo hospedado no Vercel, e eles podem desligar isso quando quiserem.

Para cortar essa dependência:

1. No Google Cloud Console, criar uma credencial OAuth 2.0 (Web application) com o redirect autorizado
   `https://dejfimivoonbmgfxtbdf.supabase.co/auth/v1/callback`
2. Colar client id e secret no provedor Google do Supabase (pelo backend do Lovable)
3. Adicionar `https://gtorei.com.br` na lista de Redirect URLs do Supabase
4. No código, trocar `lovable.auth.signInWithOAuth('google', ...)` por
   `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
   e apagar `src/integrations/lovable/`

**Sobre as contas que já existem:** as 126 identidades Google guardadas têm `provider_id` de 21 dígitos, que é o `sub` da conta Google. Esse número identifica a conta, não o cliente OAuth, então a expectativa é que os usuários caiam nas mesmas contas. Vale confirmar com uma conta de teste antes de considerar resolvido.
