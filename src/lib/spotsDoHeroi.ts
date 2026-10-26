// Em que spot de pré-flop o herói decidiu, lido das ações da mão, sem IA.
//
// A análise por IA inventava spot: um jogador mandou só mãos em que enfrentou
// open raise e leu "precisa melhorar vs 3-bet". Agora cada mão vai com o spot
// calculado aqui, a tela mostra quantas mãos há de cada um e o resumo da IA
// perde o leak de um spot que não aparece em nenhuma mão.

import type { ParsedAction, ParsedHand } from '@/utils/handHistoryParser';

export type SpotDoHeroi =
  | 'openRaise' //    ninguém entrou antes: abre, dá limp ou folda
  | 'vsLimp' //       alguém só completou o blind antes
  | 'vsOpenRaise' //  um raise antes
  | 'vsOpenShove' //  o raise antes foi all-in
  | 'vs3bet' //       o herói abriu e levou 3-bet
  | 'vs4bet' //       o herói deu 3-bet e levou 4-bet
  | 'vs3betFrio' //   open e 3-bet antes de o herói entrar
  | 'limpVsRaise'; // o herói deu limp e levou raise

export const NOME_DO_SPOT: Record<SpotDoHeroi, string> = {
  openRaise: 'Open raise (primeiro a entrar)',
  vsLimp: 'Contra limp',
  vsOpenRaise: 'Vs open raise',
  vsOpenShove: 'Vs open shove',
  vs3bet: 'Vs 3-bet (depois de abrir)',
  vs4bet: 'Vs 4-bet (depois de dar 3-bet)',
  vs3betFrio: 'Vs open + 3-bet (sem ter entrado)',
  limpVsRaise: 'Limp e levou raise',
};

export const ORDEM_DOS_SPOTS: SpotDoHeroi[] = [
  'openRaise',
  'vsLimp',
  'vsOpenRaise',
  'vsOpenShove',
  'vs3bet',
  'vs4bet',
  'vs3betFrio',
  'limpVsRaise',
];

export interface LeituraDaMao {
  posicao: string | null;
  /** Spots em ordem: o primeiro é o da primeira decisão; vs 3-bet e vs 4-bet vêm depois */
  spots: SpotDoHeroi[];
  /** Stack efetivo do herói em big blinds, contra o maior stack da mesa */
  stackEfetivoBb: number | null;
  /** O herói pôs ficha no pote por vontade própria (call, bet ou raise) */
  entrouNoPote: boolean;
}

const voluntaria = (a: ParsedAction) => a.action !== 'blind' && a.action !== 'ante';
const ehRaise = (a: ParsedAction) => a.action === 'raise' || a.action === 'bet';

/**
 * Posição de cada jogador. O big blind vem do post (o botão pode estar num
 * assento vazio); sem post, conta a partir do botão.
 */
export function posicoesDaMao(hand: ParsedHand): Map<string, string> {
  const nomes = [...hand.players].sort((a, b) => a.seat - b.seat).map((p) => p.name);
  const n = nomes.length;
  const posicoes = new Map<string, string>();
  if (n < 2) return posicoes;

  const blinds = hand.actions.filter((a) => a.action === 'blind');
  const postDoBB = blinds.find((a) => hand.bigBlind > 0 && Math.abs((a.amount ?? 0) - hand.bigBlind) < 1e-9) ?? blinds[1];
  let iBB = postDoBB ? nomes.indexOf(postDoBB.player) : -1;
  if (iBB < 0) {
    if (!hand.buttonSeat) return posicoes;
    const assentos = [...hand.players].sort((a, b) => a.seat - b.seat).map((p) => p.seat);
    // Botão em assento vazio: conta como se estivesse logo antes do próximo jogador
    let iBotao = assentos.indexOf(hand.buttonSeat);
    if (iBotao < 0) {
      const proximo = assentos.findIndex((s) => s > hand.buttonSeat);
      iBotao = (proximo < 0 ? 0 : proximo) - 1;
    }
    iBB = (iBotao + (n === 2 ? 1 : 2) + n) % n;
  }
  const em = (k: number) => nomes[(iBB + k + n) % n];
  posicoes.set(em(0), 'BB');
  if (n === 2) {
    posicoes.set(em(1), 'SB');
    return posicoes;
  }
  posicoes.set(em(-1), 'SB');
  // Do primeiro a falar ao botão: os últimos têm nome fixo, o primeiro é UTG
  const meio = Array.from({ length: n - 2 }, (_, k) => em(k + 1));
  const finais = ['BTN', 'CO', 'HJ', 'LJ'];
  meio.forEach((nome, k) => {
    const doFim = meio.length - 1 - k;
    if (doFim < finais.length && !(k === 0 && meio.length > 3)) posicoes.set(nome, finais[doFim]);
    else posicoes.set(nome, k === 0 ? 'UTG' : `UTG+${k}`);
  });
  return posicoes;
}

export function lerMaoDoHeroi(hand: ParsedHand): LeituraDaMao {
  const posicao = posicoesDaMao(hand).get(hand.heroName) ?? null;
  const heroi = hand.players.find((p) => p.name === hand.heroName);
  const maiorOutro = Math.max(0, ...hand.players.filter((p) => p.name !== hand.heroName).map((p) => p.chips));
  const stackEfetivoBb =
    heroi && hand.bigBlind > 0 ? Math.round((Math.min(heroi.chips, maiorOutro || heroi.chips) / hand.bigBlind) * 10) / 10 : null;

  const spots: SpotDoHeroi[] = [];
  const pre = hand.actions.filter((a) => a.street === 'preflop' && voluntaria(a));
  let raises = 0;
  let limps = 0;
  let ultimoFoiAllIn = false;
  let heroiAgiu = false;
  let heroiLimpou = false;
  let nivelDoHeroi = 0; // 1 = abriu, 2 = deu 3-bet...
  let entrouNoPote = false;
  const juntar = (s: SpotDoHeroi) => {
    if (!spots.includes(s)) spots.push(s);
  };

  for (const a of pre) {
    if (a.player === hand.heroName) {
      if (!heroiAgiu) {
        if (raises === 0) juntar(limps > 0 ? 'vsLimp' : 'openRaise');
        else if (raises === 1) juntar(ultimoFoiAllIn ? 'vsOpenShove' : 'vsOpenRaise');
        else juntar('vs3betFrio');
      } else if (raises > nivelDoHeroi) {
        if (nivelDoHeroi === 0 && heroiLimpou) juntar('limpVsRaise');
        else if (nivelDoHeroi === 1) juntar('vs3bet');
        else if (nivelDoHeroi >= 2) juntar('vs4bet');
      }
      heroiAgiu = true;
      if (a.action === 'call' || ehRaise(a)) entrouNoPote = true;
      if (a.action === 'call' && raises === 0) heroiLimpou = true;
      if (ehRaise(a)) {
        raises++;
        nivelDoHeroi = raises;
        ultimoFoiAllIn = !!a.allIn;
      }
      continue;
    }
    if (ehRaise(a)) {
      raises++;
      ultimoFoiAllIn = !!a.allIn;
    } else if (a.action === 'call' && raises === 0) {
      limps++;
    }
  }
  return { posicao, spots, stackEfetivoBb, entrouNoPote };
}

/** Quantas mãos do arquivo passaram por cada spot (uma mão conta em mais de um) */
export function contarSpots(hands: ParsedHand[]): { spot: SpotDoHeroi; maos: number }[] {
  const conta = new Map<SpotDoHeroi, number>();
  for (const h of hands) for (const s of lerMaoDoHeroi(h).spots) conta.set(s, (conta.get(s) ?? 0) + 1);
  return ORDEM_DOS_SPOTS.filter((s) => conta.has(s)).map((spot) => ({ spot, maos: conta.get(spot)! }));
}

/**
 * Quais mãos vão para a IA, que lê no máximo `maximo`. Primeiro as em que o
 * herói entrou no pote ou enfrentou mais de um raise; depois o resto, na
 * ordem do arquivo.
 */
export function escolherMaosParaAnalise(hands: ParsedHand[], maximo: number): ParsedHand[] {
  if (hands.length <= maximo) return hands;
  const peso = (h: ParsedHand) => {
    const l = lerMaoDoHeroi(h);
    if (l.entrouNoPote) return 2;
    return l.spots.length > 0 && l.spots[0] !== 'openRaise' ? 1 : 0;
  };
  const escolhidas = new Set(
    hands
      .map((h, i) => ({ i, p: peso(h) }))
      .sort((a, b) => b.p - a.p || a.i - b.i)
      .slice(0, maximo)
      .map((x) => x.i)
  );
  return hands.filter((_, i) => escolhidas.has(i));
}

// Texto da IA que fala de enfrentar 3-bet ou 4-bet: "vs 3-bet", "contra 3-bets",
// "diante de uma 4-bet", "defesa contra 3bet"...
const ANTES = String.raw`(?:\bvs\.?|\bversus|\bcontra|\benfrentando|\benfrentar|\bdiante d[eoa]s?|\bfrente [aà]|\bperante|\bem resposta [aà]s?|\bfacing)`;
const FALA_DE_3BET = new RegExp(String.raw`${ANTES}\s*(?:uma?s?\s+|o\s+|os\s+|as?\s+)?(?:3-?bets?|three-?bets?)`, 'i');
const FALA_DE_4BET = new RegExp(String.raw`${ANTES}\s*(?:uma?s?\s+|o\s+|os\s+|as?\s+)?(?:4-?bets?|four-?bets?)`, 'i');

/**
 * Tira do resumo da IA o que fala de um spot que não está em nenhuma mão
 * enviada. Devolve o que sobrou e quantos itens saíram.
 */
export function filtrarPorSpots(itens: string[], spotsPresentes: Set<SpotDoHeroi>): { itens: string[]; removidos: number } {
  const tem3bet = spotsPresentes.has('vs3bet') || spotsPresentes.has('vs3betFrio');
  const tem4bet = spotsPresentes.has('vs4bet') || spotsPresentes.has('vs3betFrio');
  const ficam = itens.filter((t) => !((!tem3bet && FALA_DE_3BET.test(t)) || (!tem4bet && FALA_DE_4BET.test(t))));
  return { itens: ficam, removidos: itens.length - ficam.length };
}
