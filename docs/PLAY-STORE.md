# App Android na Play Store

Um app só, **GTORei** (`br.com.gtorei.app`), grátis com anúncios, e uma compra
única **PRO** (`gtorei_pro`) que tira os anúncios e libera tudo. O PRO vira
"apoiador" no banco, então vale também no site, na mesma conta. Decisão de
21/10/2026.

O app é o próprio site empacotado pelo Capacitor (pasta `android/`). Tudo o que
muda no site entra no app na próxima versão gerada.

## O que já está pronto no código

| Parte | Onde |
|---|---|
| Projeto Android, ícone, abertura | `android/`, `capacitor.config.ts`, `assets/` |
| Arte da loja (ícone 512, banner 1024×500) | `assets/loja/` |
| Anúncios (faixa no rodapé + tela cheia a cada 3 treinos) | `src/lib/nativo/anuncios.ts` |
| Compra do PRO no app | `src/lib/nativo/compras.ts`, tela `/pro` |
| Conferência da compra com o Google | `supabase/functions/verify-play-purchase` + migration `20261021130000_pro_google_play.sql` |
| Login com Google no app (pelo Chrome) | `src/lib/nativo/loginApp.ts`, página `/app/retorno` |
| Excluir conta (exigência da loja) | tela `/excluir-conta` + `supabase/functions/delete-account` |
| Gerar o AAB assinado | GitHub Actions, `.github/workflows/android.yml` |

No app, o link de cadastro da GGPoker some (a loja recusa app que leve a site de
aposta com dinheiro real) e o Pix vira o PRO (conteúdo digital só se vende pelo
Google Play dentro do app).

## O que só você pode fazer, na ordem

### 1. Conta de desenvolvedor
Play Console, taxa única de US$ 25. Conta pessoal nova exige teste fechado com
**12 testadores por 14 dias** antes de liberar a produção. Comece a juntar os 12
cedo (grupo do Instagram, amigos do poker).

### 2. Criar o app no Play Console
Nome **GTORei**, idioma português (Brasil), tipo **app** (não jogo), categoria
**Educação**, gratuito. Ative a **Assinatura de apps do Google Play** (padrão).

### 3. Chave de upload (fica com você, nunca no repositório)
No Android Studio ou com o `keytool` do Java:

```
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Guarde o `upload.jks` e as senhas num lugar seguro (gerenciador de senhas). Depois,
no GitHub do repositório, **Settings > Secrets and variables > Actions**:

- Secrets: `ANDROID_KEYSTORE_BASE64` (o arquivo em base64; no PowerShell:
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload.jks"))`),
  `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD`.

### 4. AdMob
Crie a conta em admob.google.com, cadastre o app Android e dois blocos de anúncio:
**Banner** e **Intersticial**. No GitHub, em **Variables** (não secrets, não são
segredo): `ADMOB_APP_ID` (`ca-app-pub-…~…`), `ADMOB_BANNER_ID` e
`ADMOB_INTERSTICIAL_ID` (`ca-app-pub-…/…`). Sem elas, o app sai com os anúncios
de teste do Google, que não pagam nada.

Depois crie o arquivo `public/app-ads.txt` com a linha que o AdMob mostrar
(`google.com, pub-…, DIRECT, f08c47fec0942fa0`) e publique o site.

### 5. Gerar a primeira versão
GitHub > Actions > **App Android** > Run workflow, versão `1.0.0`. Ao terminar, o
AAB está em "Artifacts". Envie para o teste interno no Play Console.

### 6. Produto PRO
Play Console > Monetizar > Produtos > **Produtos no app** > criar `gtorei_pro`,
compra única. O preço é decisão sua.

### 7. Conta de serviço (para o servidor conferir as compras)
Google Cloud: crie uma conta de serviço, gere a chave JSON, e no Play Console >
Usuários e permissões, convide o e-mail dela com "Ver informações financeiras" e
"Gerenciar pedidos e assinaturas". Cole o JSON inteiro como segredo
`GOOGLE_PLAY_SERVICE_ACCOUNT` no projeto (Lovable / Supabase), nunca no repo.

### 8. Ficha da loja e questionários
- **Política de privacidade**: `https://www.gtorei.com.br/privacidade` (termos em `/termos`,
  reembolso em `/reembolso`). Controlador e contato já preenchidos.
- **Exclusão de conta**: `https://www.gtorei.com.br/excluir-conta`.
- **Segurança dos dados**: respostas prontas em `docs/SDKS-E-DADOS.md`.
- **Classificação**: o questionário pergunta sobre "jogo de azar simulado". Treino
  de decisão sem apostas e sem fichas para comprar costuma sair como 18+ ou 16+;
  responda com a verdade e aceite o que vier.
- **Público-alvo**: 18+.
- **Anúncios**: marcar "contém anúncios".

### 9. Aplicar no banco e publicar as funções
Migrations, na ordem: `20261005120000_travar_pontuacao.sql`,
`20261021120000_indicacao_e_desafios.sql`, `20261021130000_pro_google_play.sql`.
Funções a publicar pelo Lovable: `verify-play-purchase`, `delete-account` (e as já
alteradas `analyze-hand-history` e `admin-users`).

## Pendências conhecidas

- **Estorno do PRO**: o Google não avisa o banco. Quem pedir reembolso continua PRO
  até o admin tirar o apoio. Automatizar exige as notificações em tempo real do Play.
- **Build nunca rodou**: o projeto Android foi gerado e configurado, mas o primeiro
  AAB só sai no passo 5. Se o Gradle reclamar de algo, o erro aparece no log do
  Actions.
- **Login Google no app**: o retorno ao app usa um link `intent://` com o nome do
  pacote. Testar num celular de verdade antes de abrir o teste fechado.
