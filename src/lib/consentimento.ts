// Escolha de privacidade de quem usa o GTORei.
//
// A única coisa opcional é o anúncio personalizado: no app grátis (AdMob) e,
// desde 05/11/2026, no site (AdSense nas notícias e na área logada, só para
// quem não é PRO; src/lib/anuncios.ts). Sem consentimento, os dois pedem anúncios não personalizados (npa).
// As notícias saem do servidor (api/_noticias.ts) e leem esta mesma chave.
//
// Regra contra padrão enganoso: "aceitar" e "recusar" têm o mesmo peso visual,
// nada vem marcado de antemão, e mudar de ideia é tão fácil quanto escolher.

const CHAVE = 'gtorei_consentimento';
const VERSAO = 1;

export interface Consentimento {
  versao: number;
  anunciosPersonalizados: boolean;
  em: number;
}

export const EVENTO_ABRIR_PREFERENCIAS = 'gtorei:abrir-preferencias-privacidade';
export const EVENTO_CONSENTIMENTO_MUDOU = 'gtorei:consentimento-mudou';

export function lerConsentimento(): Consentimento | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    return c && c.versao === VERSAO && typeof c.anunciosPersonalizados === 'boolean' ? c : null;
  } catch {
    return null;
  }
}

export function salvarConsentimento(anunciosPersonalizados: boolean, agora = Date.now()): Consentimento {
  const c: Consentimento = { versao: VERSAO, anunciosPersonalizados, em: agora };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(c));
  } catch {
    // sem armazenamento, a escolha vale só nesta visita
  }
  window.dispatchEvent(new Event(EVENTO_CONSENTIMENTO_MUDOU));
  return c;
}

/** Aviso antigo do site, que só informava (até 05/11/2026). Não vale mais como resposta */
export const CHAVE_AVISO_DO_SITE_VISTO = 'gtorei_aviso_cookies_visto';

/** Marca de quem é PRO, lida pelas notícias para não carregar anúncio (useSupporter grava) */
export const CHAVE_SEM_ANUNCIO = 'gtorei_sem_anuncio';

/**
 * O aviso de privacidade ainda está no rodapé esperando resposta (no app, a
 * escolha do anúncio; no site, o "Entendi"). Pop-up que abre nessa hora fica
 * com o botão embaixo do aviso no celular.
 */
export function avisoDePrivacidadePendente(_app?: boolean): boolean {
  // Site e app pedem a mesma escolha desde que as notícias têm anúncio
  return lerConsentimento() === null;
}

/** Sem escolha registrada, vale o lado seguro: nada personalizado */
export function podePersonalizarAnuncios(): boolean {
  return lerConsentimento()?.anunciosPersonalizados === true;
}

export function abrirPreferenciasDePrivacidade(): void {
  window.dispatchEvent(new Event(EVENTO_ABRIR_PREFERENCIAS));
}
