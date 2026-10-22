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

/** Pacote do app na Play Store (igual ao appId de capacitor.config.ts) */
export const PACOTE_ANDROID = 'br.com.gtorei.app';

/** Endereço público do site, usado pelo app para abrir login e links */
export const SITE = 'https://www.gtorei.com.br';
