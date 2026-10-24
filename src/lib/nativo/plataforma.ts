// O mesmo código roda no site e no app Android (Capacitor). Dentro do app, o
// Capacitor injeta window.Capacitor antes do site carregar; ler dali evita
// pôr o @capacitor/core no pacote do site, que não precisa dele.

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

export function ehApp(): boolean {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/**
 * Layout do app (abas embaixo, trilha) em vez do layout do site. Dentro do app
 * é sempre ele. Em desenvolvimento dá para ver no navegador com
 * localStorage gtorei_previa_app = '1'; no build de produção esse atalho nem
 * existe (import.meta.env.DEV vira false e o trecho some).
 *
 * Só para decidir layout: anúncio, compra e login continuam em ehApp().
 */
export function usarLayoutDoApp(): boolean {
  if (ehApp()) return true;
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem('gtorei_previa_app') === '1';
  } catch {
    return false;
  }
}

/** Pacote do app na Play Store (igual ao appId de capacitor.config.ts) */
export const PACOTE_ANDROID = 'br.com.gtorei.app';

/** Endereço público do site, usado pelo app para abrir login e links */
export const SITE = 'https://www.gtorei.com.br';
