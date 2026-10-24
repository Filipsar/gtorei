// App Android em teste fechado no Google Play.
//
// Conta pessoal nova só ganha acesso à produção depois de um teste fechado com
// pelo menos 12 testadores inscritos por 14 dias seguidos. APK baixado do site
// não conta: o testador precisa entrar pelo Google Play. Como o teste fechado
// só aceita quem está na lista, a porta de entrada é um Grupo do Google
// cadastrado como testador no Play Console (Teste fechado → Testadores).

export const PACOTE_ANDROID = 'br.com.gtorei.app';

/** Grupo do Google cadastrado como lista de testadores do teste fechado */
export const GRUPO_TESTADORES_URL = 'https://groups.google.com/g/gtorei-testadores';

/** Link de participação do teste (Play Console → Teste fechado → Testadores → "Participar na Web") */
export const LINK_TESTE_URL = `https://play.google.com/apps/testing/${PACOTE_ANDROID}`;

/** Página do app no Google Play: para quem já aceitou o teste, é onde instala */
export const LINK_LOJA_URL = `https://play.google.com/store/apps/details?id=${PACOTE_ANDROID}`;

/**
 * Liga o convite no pop-up de novidades, no menu lateral e na página
 * /baixar-app. Só com o grupo criado e o teste fechado publicado: antes disso
 * o link do teste não abre.
 */
export const TESTE_ANDROID_ABERTO = false;
