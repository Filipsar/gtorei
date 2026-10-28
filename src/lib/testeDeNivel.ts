// Teste de nível inicial: feito ou pulado neste navegador. Fica fora do
// componente porque os pop-ups (novidades, Discord) esperam por ele.

import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

export const LEVEL_TEST_KEY = 'gtorei_level_test_completed_v1';

let resolvidoNestaSessao = false;

export function testeDeNivelResolvido(): boolean {
  if (resolvidoNestaSessao) return true;
  try {
    return localStorage.getItem(LEVEL_TEST_KEY) !== null;
  } catch {
    return false;
  }
}

/** 'true' quando terminou, 'skipped' quando fechou antes */
export function marcarTesteDeNivel(como: 'true' | 'skipped') {
  resolvidoNestaSessao = true;
  try {
    localStorage.setItem(LEVEL_TEST_KEY, como);
  } catch {
    // vale ao menos nesta sessão
  }
}

/**
 * Conta nova no site ainda com o teste de nível por fazer. Pop-up do Radix
 * aberto por cima do teste (que não é do Radix) deixa o body sem clique e
 * trava o teste, então os pop-ups esperam. No app o teste não aparece.
 */
export function introPendente(): boolean {
  return !usarLayoutDoApp() && !testeDeNivelResolvido();
}
