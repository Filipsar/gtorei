# SDKs de terceiros e dados (auditoria de 22/10/2026)

Para que serve: preencher a "Segurança dos dados" da Play Store, manter a
Política de Privacidade (`/privacidade`) verdadeira e saber o que revisar ao
trocar uma dependência. Mudou SDK ou coleta, atualize aqui e na política.

## O que sai do aparelho, e para onde

| Serviço | Onde roda | Dados | Por quê | Base legal |
|---|---|---|---|---|
| Supabase (via Lovable Cloud) | site e app | e-mail, apelido, avatar, treino, posts, indicação, compras | banco e login | contrato |
| Lovable cloud-auth (`oauth.lovable.app`) | site | redirecionamento do login Google | login com Google | contrato |
| Vercel | site | IP e cabeçalhos HTTP (logs do servidor) | hospedagem | legítimo interesse |
| Google Gemini (via gateway do Lovable) | servidor, só quando a pessoa pede | hand history **anonimizado** (`src/lib/anonimizarMaos.ts`) | análise por IA | contrato |
| Google Play Billing (`@capgo/native-purchases`) | app | token e número do pedido do PRO | compra | contrato |
| Google Play Developer API | servidor (`verify-play-purchase`) | token da compra | conferir e confirmar a compra | contrato |
| Google AdMob (`@capacitor-community/admob`) | app grátis | ID de publicidade, IP, dados técnicos do aparelho | anúncios | consentimento para personalizado; não personalizado sem ele |
| Capacitor App / Browser | app | nada sai: abrir o Chrome e receber o retorno do login | login no app | — |

## O que conferimos

- **Nenhum rastreador no site**: sem Google Analytics, Tag Manager, Pixel, Hotjar,
  Clarity, PostHog. Busca por esses nomes em `src/`, `index.html` e `public/` vazia.
- **Sem telemetria escondida nos plugins**: `@capgo/native-purchases`,
  `@capacitor/*` e `jspdf` não têm endereço de rede próprio no código (só links
  de documentação). O `cloud-auth-js` fala só com `oauth.lovable.app`.
- **AdMob**: inicia só no app, só para quem não é PRO; usa `npa` (não
  personalizado) enquanto a pessoa não permitir; pede o formulário UMP do Google
  onde a lei exige. Classificação máxima de anúncio: Teen.
- **Minimização**: os apelidos dos adversários no hand history viram "Vilão N"
  antes de ir para a IA. O app não coleta modelo do aparelho, país, localização,
  contatos ou receita de anúncio por pessoa.

## Formulário "Segurança dos dados" (Play Console)

- Coletados: e-mail, nome de usuário, conteúdo gerado (posts, imagens), atividade
  no app (mãos), histórico de compras, ID de publicidade (AdMob), diagnósticos do
  AdMob.
- Compartilhados: ID de publicidade com o Google (anúncios).
- Criptografia em trânsito: sim (HTTPS). Exclusão: sim, no app e em
  `https://www.gtorei.com.br/excluir-conta`.
- Nada é vendido.
