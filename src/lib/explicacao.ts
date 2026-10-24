// O que o Rei diz depois de cada mão no app. Tudo sai da mesma range que deu
// a nota (getRange no TrainPage), para a explicação nunca contradizer a
// correção. Não citar "solver": o motor do GTORei não é um (CLAUDE-conteudo.md).

import type { ActionType, HandData, RangeData, Scenario } from '@/data/gtoRanges';

export interface DadosDaJogada {
  mao: string;
  posicao: string;
  stack: number;
  cenario: Scenario;
  suaAcao: ActionType;
  handData: HandData;
  range: RangeData;
  tipo: 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';
  evPerdido: number;
}

export interface Explicacao {
  acertou: boolean;
  titulo: string;
  texto: string;
}

const NOME: Record<string, string> = {
  fold: 'fold',
  raise: 'raise',
  allin: 'all-in',
  call: 'call',
  limp: 'limp',
  check: 'check',
};
const nome = (a: string) => NOME[a] ?? a;

/** Combinações de cada tipo de mão: par 6, suited 4, offsuit 12 (1.326 no total) */
const combos = (h: HandData) => (h.pair ? 6 : h.suited ? 4 : 12);

/** Quanto da range segue na mão (tudo que não é fold), pesado pelas combinações */
export function fatiaQueJoga(range: RangeData): number {
  let jogam = 0;
  let total = 0;
  for (const h of range.hands) {
    const c = combos(h);
    const fold = h.actions.find((a) => a.action === 'fold')?.frequency ?? 0;
    jogam += c * (1 - fold / 100);
    total += c;
  }
  return total > 0 ? Math.round((100 * jogam) / total) : 0;
}

function sobreARange(d: DadosDaJogada): string {
  const pct = fatiaQueJoga(d.range);
  const joga = d.handData.primaryAction !== 'fold';
  switch (d.cenario) {
    case 'openRaise':
      return `Do ${d.posicao} com ${d.stack} BB, a range abre cerca de ${pct}% das mãos, e ${d.mao} ${joga ? 'está dentro' : 'fica de fora'}.`;
    case 'vsOpenRaise':
      return `Contra essa abertura, a range continua com cerca de ${pct}% das mãos.`;
    case 'vsOpenShove':
      return `Contra esse all-in, a range paga com cerca de ${pct}% das mãos.`;
    case 'vs3bet':
      return `Contra a 3-bet, a range continua com cerca de ${pct}% das mãos.`;
    default:
      return '';
  }
}

/** Ações que a range mistura nesta mão, da mais para a menos usada */
function mistura(h: HandData): string {
  const usadas = h.actions.filter((a) => a.frequency >= 10).sort((a, b) => b.frequency - a.frequency);
  if (usadas.length < 2) return '';
  return `Aqui a range mistura: ${usadas.map((a) => `${nome(a.action)} ${Math.round(a.frequency)}%`).join(', ')}.`;
}

export function explicarJogada(d: DadosDaJogada): Explicacao {
  const certa = d.handData.primaryAction;
  const freqCerta = Math.round(d.handData.actions.find((a) => a.action === certa)?.frequency ?? 0);
  const acertou = d.tipo === 'best' || d.tipo === 'correct';
  const range = sobreARange(d);
  const mix = mistura(d.handData);

  if (acertou) {
    const titulo = d.tipo === 'best' ? 'Isso! Jogada certa.' : 'Boa, dá para jogar assim.';
    const abertura =
      d.suaAcao === certa
        ? `${capitalizar(nome(d.suaAcao))} com ${d.mao} é a jogada principal aqui.`
        : `${capitalizar(nome(d.suaAcao))} com ${d.mao} também faz parte da range.`;
    return { acertou, titulo, texto: [abertura, range, mix].filter(Boolean).join(' ') };
  }

  const titulo = d.tipo === 'inaccuracy' ? 'Quase.' : 'Não foi dessa vez.';
  const ev = d.evPerdido > 0.005 ? `Essa escolha custa ${d.evPerdido.toFixed(2)} BB de EV.` : '';
  const abertura = `Com ${d.mao} no ${d.posicao}, o certo é ${nome(certa)} (${freqCerta}% das vezes).`;
  return { acertou, titulo, texto: [abertura, range, ev].filter(Boolean).join(' ') };
}

/** Arquivo em public/mascote (rei-<pose>.webp) que acompanha o comentário */
export type PoseDoComentario = 'allin' | 'rindo' | 'ombros' | 'acertou' | 'joinha' | 'susto' | 'errou' | 'explicando';

/** Sequência de acertos a partir da qual o Rei aparece rindo */
export const SEQUENCIA_PARA_RIR = 5;

/**
 * A pose do Rei para a mão: comemora conforme a jogada certa, e no erro vai do
 * susto (erro grave) à explicação (imprecisão).
 */
export function poseDoComentario(d: { tipo: DadosDaJogada['tipo']; suaAcao: ActionType; sequencia: number }): PoseDoComentario {
  const acertou = d.tipo === 'best' || d.tipo === 'correct';
  if (acertou) {
    if (d.suaAcao === 'allin') return 'allin';
    if (d.sequencia >= SEQUENCIA_PARA_RIR) return 'rindo';
    if (d.suaAcao === 'fold') return 'ombros';
    return d.tipo === 'best' ? 'acertou' : 'joinha';
  }
  if (d.tipo === 'blunder') return 'susto';
  if (d.tipo === 'mistake') return 'errou';
  return 'explicando';
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
