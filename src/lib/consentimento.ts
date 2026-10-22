// Escolha de privacidade de quem usa o GTORei.
//
// O site só guarda o necessário para funcionar, então lá o aviso é informativo.
// A única coisa opcional é o anúncio personalizado do app grátis (AdMob): sem
// consentimento, o app pede anúncios não personalizados (npa).
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

/** Sem escolha registrada, vale o lado seguro: nada personalizado */
export function podePersonalizarAnuncios(): boolean {
  return lerConsentimento()?.anunciosPersonalizados === true;
}

export function abrirPreferenciasDePrivacidade(): void {
  window.dispatchEvent(new Event(EVENTO_ABRIR_PREFERENCIAS));
}
