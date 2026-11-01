// Da análise com IA para o treino (01/11/2026).
//
// Cada leak e cada recomendação do resumo vira um tema de estudo
// (src/data/materialDidatico.ts) e, quando o tema tem cenário no treino, um
// link que abre o Treinar já no spot, nas posições e stacks das mãos do
// arquivo. O link é /treinar?treino=<cenário>&modo=&pos=&stack=, lido por
// presetDoLink no TrainPage.

import type { ParsedHand } from '@/utils/handHistoryParser';
import type { TemaDeEstudo } from '@/data/materialDidatico';
import type { Preset } from '@/data/trilha';
import { STACK_SIZES, type Position, type Scenario } from '@/data/ranges/types';
import { cenariosDoModo, posicoesDoModo, STACK_DO_CASH, type TrainingMode } from '@/lib/sorteioDeMao';
import { FALA_DE_3BET, FALA_DE_4BET, lerMaoDoHeroi, type SpotDoHeroi } from '@/lib/spotsDoHeroi';

/** O que a análise guarda de cada mão: dá para montar o treino sem o arquivo */
export interface MaoResumida {
  handId: string;
  cartas: string[];
  spots: SpotDoHeroi[];
  posicao: string | null;
  stackBb: number | null;
  modo: TrainingMode;
}

/** Cenário do treino de cada tema; os outros temas têm só o material */
export const CENARIO_DO_TEMA: Partial<Record<TemaDeEstudo, Exclude<Scenario, 'simulation' | 'multiway'>>> = {
  openRaise: 'openRaise',
  vsOpenRaise: 'vsOpenRaise',
  vs3bet: 'vs3bet',
  vsOpenShove: 'vsOpenShove',
};

/** Tema de cada spot lido da mão (sem tema: o treino não tem esse spot) */
export const TEMA_DO_SPOT: Partial<Record<SpotDoHeroi, TemaDeEstudo>> = {
  openRaise: 'openRaise',
  vsOpenRaise: 'vsOpenRaise',
  vs3bet: 'vs3bet',
  vsOpenShove: 'vsOpenShove',
  vs4bet: 'vs4bet',
};

const FALA_DE_ICM = /\b(icm|bolha|bubble|mesa final|pay ?jumps?|salto de pr[eê]mio|premia[çc][ãa]o)\b/i;
const FALA_DE_POSFLOP = /\b(c-?bets?|continuation|flop|turn|river|p[óo]s-?flop|postflop|barril|barrel|check-?raise|showdown)\b/i;
const PAGA_SHOVE = /\b(pagar|pague|paga|call|calls|contra|vs\.?|enfrent\w*|diante)\b[^.;]{0,30}\b(shoves?|all-?ins?|push|jams?)\b/i;
const FALA_DE_SHOVE = /\b(shoves?|all-?ins?|push(?:\/fold)?|jams?|empurr\w*)\b/i;
const FALA_DE_DEFESA =
  /\b(defe(?:sa|nder|nda|ndeu)|big blind|bb|3-?bet(?:ar|s|e)?|squeeze|pagar (?:o |um |uma |a )?(?:raise|abertura|open)|vs\.? open|contra (?:o |um |uma |a )?(?:raise|abertura|open))\b/i;
const FALA_DE_ABERTURA = /\b(abert\w*|abrir|abre|open(?:-?raise)?s?|steal|roub\w*|rfi|limp\w*|primeiro a entrar|utg|hijack|cutoff|bot[ãa]o)\b/i;

/**
 * Temas de um texto da IA, do mais específico ao mais geral. Um texto pode
 * cair em mais de um ("pagar all-in na bolha": vs shove e ICM).
 */
export function temasDoTexto(texto: string): TemaDeEstudo[] {
  const temas: TemaDeEstudo[] = [];
  const incluir = (t: TemaDeEstudo) => {
    if (!temas.includes(t)) temas.push(t);
  };
  if (FALA_DE_4BET.test(texto)) incluir('vs4bet');
  else if (FALA_DE_3BET.test(texto)) incluir('vs3bet');
  else if (PAGA_SHOVE.test(texto)) incluir('vsOpenShove');
  else if (FALA_DE_SHOVE.test(texto)) incluir('openRaise');
  else if (FALA_DE_DEFESA.test(texto)) incluir('vsOpenRaise');
  else if (FALA_DE_ABERTURA.test(texto)) incluir('openRaise');
  if (FALA_DE_POSFLOP.test(texto)) incluir('posflop');
  if (FALA_DE_ICM.test(texto)) incluir('icm');
  return temas;
}

/** Modo do treino que mais se parece com a mesa da mão */
function modoDaMao(h: ParsedHand): TrainingMode {
  if (!h.isTournament) return 'cash';
  if (h.players.length === 2) return 'hu';
  return 'rangeTraining';
}

export function resumirMao(h: ParsedHand): MaoResumida {
  const l = lerMaoDoHeroi(h);
  return { handId: h.handId, cartas: h.holeCards, spots: l.spots, posicao: l.posicao, stackBb: l.stackEfetivoBb, modo: modoDaMao(h) };
}

/** Posição lida da mão ("UTG+1", "LJ") no nome que o treino usa */
function posicaoDoTreino(p: string | null, modo: TrainingMode): Position | null {
  if (!p) return null;
  const nome = /^UTG\+\d/.test(p) ? 'UTG1' : p;
  const validas = posicoesDoModo(modo);
  if (validas.includes(nome as Position)) return nome as Position;
  // Cash é 6-max: as cadeiras antes do HJ viram UTG
  if (modo === 'cash' && (nome === 'UTG1' || nome === 'LJ')) return 'UTG';
  return null;
}

/** Posições em que o cenário existe: o BB nunca abre, o UTG nunca enfrenta abertura */
function posicoesDoCenario(cenario: Scenario, modo: TrainingMode): Position[] {
  const todas = posicoesDoModo(modo);
  if (cenario === 'openRaise' || cenario === 'vs3bet') return todas.filter((p) => p !== 'BB');
  return todas.slice(1);
}

function stackDoTreino(bb: number): number {
  return STACK_SIZES.reduce((melhor, s) => (Math.abs(s - bb) < Math.abs(melhor - bb) ? s : melhor), STACK_SIZES[0]);
}

const SPOT_DO_CENARIO: Record<string, SpotDoHeroi> = {
  openRaise: 'openRaise',
  vsOpenRaise: 'vsOpenRaise',
  vs3bet: 'vs3bet',
  vsOpenShove: 'vsOpenShove',
};

/**
 * O treino de um cenário com as posições e stacks das mãos em que ele
 * apareceu. As mãos com erro (`comErro`) têm a preferência; sem nenhuma, valem
 * todas as do spot.
 */
export function montarTreino(cenario: Scenario, maos: MaoResumida[], comErro: Set<string> = new Set()): Preset {
  const doSpot = maos.filter((m) => m.spots.includes(SPOT_DO_CENARIO[cenario]));
  const ruins = doSpot.filter((m) => comErro.has(m.handId));
  const base = ruins.length > 0 ? ruins : doSpot;

  // Modo da maioria; o cash não tem vs all-in, então ele fica no torneio
  const conta = new Map<TrainingMode, number>();
  for (const m of base) conta.set(m.modo, (conta.get(m.modo) ?? 0) + 1);
  let modo: TrainingMode = [...conta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'rangeTraining';
  if (!cenariosDoModo(modo).includes(cenario)) modo = 'rangeTraining';

  const possiveis = posicoesDoCenario(cenario, modo);
  const posicoes = [
    ...new Set(base.map((m) => posicaoDoTreino(m.posicao, modo)).filter((p): p is Position => !!p && possiveis.includes(p))),
  ];
  const stacks =
    modo === 'cash'
      ? [STACK_DO_CASH]
      : [...new Set(base.map((m) => m.stackBb).filter((s): s is number => s !== null && s > 0).map(stackDoTreino))].sort((a, b) => a - b);

  return {
    modo,
    cenarios: [cenario],
    posicoes: posicoes.length > 0 ? posicoes : possiveis,
    stacks: stacks.length > 0 ? stacks : [30],
  };
}

export function linkDoTreino(p: Preset): string {
  const q = new URLSearchParams({
    treino: p.cenarios[0],
    modo: p.modo,
    pos: p.posicoes.join(','),
    stack: p.stacks.join(','),
  });
  return `/treinar?${q.toString()}`;
}

const MODOS: TrainingMode[] = ['rangeTraining', 'hu', 'threeHand', 'bounty', 'cash'];

/** O treino pedido pelo link da análise; null se faltar algo ou não existir */
export function presetDoLink(params: URLSearchParams): Preset | null {
  const cenario = params.get('treino') as Scenario | null;
  const modo = params.get('modo') as TrainingMode | null;
  if (!cenario || !modo || !MODOS.includes(modo) || !(cenario in SPOT_DO_CENARIO)) return null;
  if (!cenariosDoModo(modo).includes(cenario)) return null;
  const possiveis = posicoesDoCenario(cenario, modo);
  const posicoes = (params.get('pos') ?? '').split(',').filter((p): p is Position => possiveis.includes(p as Position));
  const stacks = (params.get('stack') ?? '')
    .split(',')
    .map(Number)
    .filter((s) => (modo === 'cash' ? s === STACK_DO_CASH : STACK_SIZES.includes(s)));
  return {
    modo,
    cenarios: [cenario],
    posicoes: posicoes.length > 0 ? posicoes : possiveis,
    stacks: stacks.length > 0 ? stacks : modo === 'cash' ? [STACK_DO_CASH] : [30],
  };
}
