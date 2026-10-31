// Pop-up do "Indique e ganhe" (31/10/2026): uma vez por semana, até a pessoa
// abrir a página de indicação pelo pop-up. Segue as regras dos outros pop-ups
// (um por visita, depois do teste de nível, fora do tour): ver avisoDoDiscord.ts.

const CHAVE_DIA = 'gtorei_indique_aviso_dia';
const CHAVE_ABRIU = 'gtorei_indique_abriu';
export const DIAS_ENTRE_AVISOS = 7;

/** Dia no fuso de Brasília (AAAA-MM-DD), como no aviso do Discord */
export function diaEmBrasilia(agora = new Date()): string {
  return agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

export function deveMostrarIndicacao(ultimoDia: string | null, abriu: boolean, hoje: string): boolean {
  if (abriu) return false;
  if (!ultimoDia) return true;
  const dias = (Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${ultimoDia}T12:00:00Z`)) / 86400000;
  return !(dias < DIAS_ENTRE_AVISOS);
}

/** Sem storage o aviso não aparece: melhor que aparecer a cada página */
export function avisoDeIndicacaoPendente(agora = new Date()): boolean {
  try {
    return deveMostrarIndicacao(localStorage.getItem(CHAVE_DIA), localStorage.getItem(CHAVE_ABRIU) === '1', diaEmBrasilia(agora));
  } catch {
    return false;
  }
}

export function marcarIndicacaoVista(agora = new Date()) {
  try {
    localStorage.setItem(CHAVE_DIA, diaEmBrasilia(agora));
  } catch {
    // sem storage, avisoDeIndicacaoPendente já devolve false
  }
}

export function marcarQueAbriuIndicacao() {
  try {
    localStorage.setItem(CHAVE_ABRIU, '1');
  } catch {
    // idem
  }
}
