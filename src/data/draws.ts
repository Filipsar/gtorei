// Draws do jogador no flop e no turn: sequência (open-ended, gutshot, dupla
// gutshot) e flush, com outs e a chance de completar.
//
// Até 04/11/2026 a análise pós-flop contava qualquer quatro cartas numa janela
// de cinco como "straight draw" de 8 outs: o gutshot (4 outs) valia como
// open-ended, o ás não contava como 1 (A-2-3-4) e o draw continuava no river.
// O vilão tinha o erro oposto (três cartas numa janela viravam gutshot).

import type { CardType } from '@/components/poker/PlayingCard';

const VALOR: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, T: 10, J: 11, Q: 12, K: 13, A: 14,
};

export type DrawDeSequencia = 'oesd' | 'dupla_gutshot' | 'gutshot' | null;

export interface Draws {
  sequencia: DrawDeSequencia;
  /** Valores (2..14) que completam a sequência */
  cartasQueCompletam: number[];
  flush: boolean;
  /** Outs limpos: flush 9, OESD/dupla 8, gutshot 4; combinado sem contar duas vezes */
  outs: number;
  /** Chance de completar na próxima carta, em % (0 no river) */
  proximaCarta: number;
  /** Chance de completar até o river, em % (só no flop; no turn é igual à próxima carta) */
  ateORiver: number;
}

const SEM_DRAW: Draws = { sequencia: null, cartasQueCompletam: [], flush: false, outs: 0, proximaCarta: 0, ateORiver: 0 };

/** Valores presentes, com o ás valendo 1 e 14 */
function valores(cartas: CardType[]): Set<number> {
  const s = new Set<number>();
  for (const c of cartas) {
    const v = VALOR[c.rank];
    if (!v) continue;
    s.add(v);
    if (v === 14) s.add(1);
  }
  return s;
}

/** Já tem sequência feita com essas cartas (5 valores seguidos)? */
function temSequencia(vs: Set<number>): boolean {
  for (let baixo = 1; baixo <= 10; baixo++) {
    let ok = true;
    for (let k = 0; k < 5; k++) if (!vs.has(baixo + k)) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

/**
 * Draw de sequência do jogador: as cartas que, saindo, fecham uma sequência
 * que use pelo menos uma das cartas dele (sequência só da mesa não é draw dele).
 */
export function drawDeSequencia(maos: CardType[], mesa: CardType[]): { tipo: DrawDeSequencia; cartas: number[] } {
  const todas = valores([...maos, ...mesa]);
  if (temSequencia(todas)) return { tipo: null, cartas: [] };
  const daMesa = valores(mesa);

  const completam: number[] = [];
  for (let x = 2; x <= 14; x++) {
    if (todas.has(x)) continue;
    const com = new Set(todas);
    com.add(x);
    if (x === 14) com.add(1);
    if (!temSequencia(com)) continue;
    // A sequência que fecha precisa de carta do jogador: a mesa mais x sozinha não basta
    const soMesa = new Set(daMesa);
    soMesa.add(x);
    if (x === 14) soMesa.add(1);
    if (temSequencia(soMesa)) continue;
    completam.push(x);
  }

  if (completam.length === 0) return { tipo: null, cartas: [] };
  if (completam.length === 1) return { tipo: 'gutshot', cartas: completam };

  // Duas cartas: quatro seguidas abertas nas duas pontas é open-ended; o resto, dupla gutshot
  const [a, b] = completam;
  for (let baixo = 1; baixo <= 11; baixo++) {
    const quatro = [baixo, baixo + 1, baixo + 2, baixo + 3];
    if (!quatro.every((v) => todas.has(v))) continue;
    const pontas = [baixo - 1, baixo + 4].map((v) => (v === 1 ? 14 : v));
    if (pontas.includes(a) && pontas.includes(b)) return { tipo: 'oesd', cartas: completam };
  }
  return { tipo: 'dupla_gutshot', cartas: completam };
}

/** Flush draw do jogador: 4 do mesmo naipe com pelo menos uma carta dele */
export function drawDeFlush(maos: CardType[], mesa: CardType[]): boolean {
  const conta: Record<string, number> = {};
  for (const c of [...maos, ...mesa]) conta[c.suit] = (conta[c.suit] ?? 0) + 1;
  return Object.entries(conta).some(([naipe, n]) => n === 4 && maos.some((c) => c.suit === naipe));
}

/** Draws do jogador no flop ou no turn. No river (5 cartas na mesa) não há draw. */
export function detectarDraws(maos: CardType[], mesa: CardType[]): Draws {
  if (mesa.length < 3 || mesa.length >= 5 || maos.length < 2) return SEM_DRAW;
  const seq = drawDeSequencia(maos, mesa);
  const flush = drawDeFlush(maos, mesa);
  const outsSeq = seq.cartas.length * 4;
  // Com flush draw, a carta da sequência no naipe do flush já está nos 9 do flush
  const outs = flush ? 9 + outsSeq - seq.cartas.length : outsSeq;
  if (outs === 0) return SEM_DRAW;

  const naoVistas = 52 - maos.length - mesa.length;
  const proxima = outs / naoVistas;
  const ateORiver = mesa.length === 3 ? 1 - (1 - proxima) * (1 - outs / (naoVistas - 1)) : proxima;
  const pct = (x: number) => Math.round(x * 1000) / 10;
  return {
    sequencia: seq.tipo,
    cartasQueCompletam: seq.cartas,
    flush,
    outs,
    proximaCarta: pct(proxima),
    ateORiver: pct(ateORiver),
  };
}

const NOME_DA_CARTA: Record<number, string> = { 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const carta = (v: number) => NOME_DA_CARTA[v] ?? String(v);

/** Texto curto do draw, para a análise da mão ("OESD (8 outs: 9 ou 4)") */
export function descreverDraws(d: Draws): string | null {
  if (d.outs === 0) return null;
  const partes: string[] = [];
  if (d.flush) partes.push('flush draw');
  if (d.sequencia === 'oesd') partes.push('open-ended (OESD)');
  if (d.sequencia === 'dupla_gutshot') partes.push('dupla gutshot');
  if (d.sequencia === 'gutshot') partes.push('gutshot');
  const quais = d.cartasQueCompletam.length ? `; sequência com ${d.cartasQueCompletam.map(carta).join(' ou ')}` : '';
  const nome = partes.join(' + ');
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}: ${d.outs} outs${quais}`;
}

/** Texto da chance de completar, com a conta exata pelas cartas que faltam ver */
export function descreverChance(d: Draws, ruasQueFaltam: 1 | 2): string | null {
  if (d.outs === 0) return null;
  const fmt = (x: number) => x.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return ruasQueFaltam === 2
    ? `Chance de completar: ${fmt(d.proximaCarta)}% no turn e ${fmt(d.ateORiver)}% até o river`
    : `Chance de completar no river: ${fmt(d.proximaCarta)}%`;
}
