// Login com Google dentro do app Android.
//
// O Google não deixa fazer login dentro de uma WebView, e o login do site passa
// pelo broker do Lovable, que só volta para o domínio do site. Então o app abre
// o próprio site numa aba do Chrome (/auth?app=1). O site faz o login normal e,
// ao terminar, devolve a sessão ao app por um link intent:// que nomeia o
// pacote do app: o Android entrega só para o GTORei, nenhum outro app recebe.
//
//   app ──abre──> Chrome: www.gtorei.com.br/auth?app=1
//                 (login Google pelo Lovable, volta para o site)
//   site ──intent://login?access_token=…&refresh_token=…;package=br.com.gtorei.app──> app
//   app: supabase.auth.setSession(...) e fecha a aba

import { PACOTE_ANDROID, SITE } from './plataforma';

const CHAVE = 'gtorei_login_para_app';
const VALIDADE_MS = 15 * 60 * 1000;

// ---------- Lado do site (navegador) ----------

/** /auth?app=1: lembra que o login atual é para devolver ao app */
export function marcarLoginParaApp(search: string, agora = Date.now()): void {
  if (new URLSearchParams(search).get('app') !== '1') return;
  try {
    localStorage.setItem(CHAVE, String(agora));
  } catch {
    // sem armazenamento, o retorno ao app vira manual (página /app/retorno)
  }
}

export function loginEhParaApp(agora = Date.now()): boolean {
  try {
    const em = Number(localStorage.getItem(CHAVE));
    return Number.isFinite(em) && em > 0 && agora - em < VALIDADE_MS;
  } catch {
    return false;
  }
}

export function esquecerLoginParaApp(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}

/** Link que só o app GTORei abre, levando a sessão */
export function linkDeVoltaAoApp(accessToken: string, refreshToken: string): string {
  const q = new URLSearchParams({ access_token: accessToken, refresh_token: refreshToken });
  return `intent://login?${q.toString()}#Intent;scheme=gtorei;package=${PACOTE_ANDROID};end`;
}

// ---------- Lado do app ----------

export const URL_LOGIN_NO_NAVEGADOR = `${SITE}/auth?app=1`;

/** Tira os tokens de gtorei://login?access_token=…&refresh_token=… */
export function lerRetornoDeLogin(url: string): { access_token: string; refresh_token: string } | null {
  if (!url.startsWith('gtorei://login')) return null;
  const q = new URLSearchParams(url.split('?')[1] ?? '');
  const access_token = q.get('access_token');
  const refresh_token = q.get('refresh_token');
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

export async function abrirLoginNoNavegador(): Promise<void> {
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: URL_LOGIN_NO_NAVEGADOR });
}
