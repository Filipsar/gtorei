// Aviso do servidor do Discord: uma vez por dia, para quem está logado, até a
// pessoa clicar para entrar. Um pop-up por visita: quando há novidade de
// versão, o de novidades tem a vez e o do Discord fica para a próxima visita.

export const DISCORD_URL = 'https://discord.gg/jrhjFbB5DX';

// Páginas abertas ao público (SEO e conteúdo): nenhum pop-up abre nelas
export const PAGINAS_SEM_POPUP = ['/iniciante', '/atualizacoes', '/gtoreiacessibilidade', '/apoiar', '/baixar-app'];

const CHAVE_DIA = 'gtorei_discord_aviso_dia';
const CHAVE_ENTROU = 'gtorei_discord_entrou';

/** Dia no fuso de Brasília (AAAA-MM-DD): o "uma vez ao dia" vira à meia-noite daqui */
export function diaEmBrasilia(agora = new Date()): string {
  return agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
}

export function deveMostrarAviso(ultimoDia: string | null, entrou: boolean, hoje: string): boolean {
  return !entrou && ultimoDia !== hoje;
}

/** Sem storage (aba anônima, dado bloqueado) o aviso não aparece: melhor que aparecer a cada página */
export function avisoDoDiscordPendente(agora = new Date()): boolean {
  try {
    return deveMostrarAviso(localStorage.getItem(CHAVE_DIA), localStorage.getItem(CHAVE_ENTROU) === '1', diaEmBrasilia(agora));
  } catch {
    return false;
  }
}

export function marcarAvisoVistoHoje(agora = new Date()) {
  try {
    localStorage.setItem(CHAVE_DIA, diaEmBrasilia(agora));
  } catch {
    // sem storage não há como lembrar; avisoDoDiscordPendente já devolve false
  }
}

export function marcarQueEntrou() {
  try {
    localStorage.setItem(CHAVE_ENTROU, '1');
  } catch {
    // idem
  }
}

// O MainLayout remonta a cada troca de rota; isto vive no módulo e só zera
// quando a página recarrega, que é o que conta como "abrir o site"
let popupNestaVisita = false;

export function marcarPopupNestaVisita() {
  popupNestaVisita = true;
}

export function jaTevePopupNestaVisita(): boolean {
  return popupNestaVisita;
}
