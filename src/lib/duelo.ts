// Duelo ao vivo (aba Duelo do app): heads-up entre dois jogadores, 10 mãos.
//
// Quem embaralha, valida cada jogada, cuida do relógio e decide o showdown é o
// servidor (migration 20261024140000_duelo_ao_vivo). Aqui ficam os tipos do que
// ele devolve e as contas da tela: posições, apostas e a nota GTO de cada
// decisão, tirada da mesma range do treino de heads-up.

import type { CardType } from '@/components/poker/PlayingCard';
import { calculateFeedback, getRange, RANKS, type ActionType, type FeedbackType, type Position, type Scenario } from '@/data/gtoRanges';
import { limitarPontos, pesarPorCenario } from '@/lib/dificuldade';

export type Lado = 'a' | 'b';

export interface AcaoFeita {
  quem: Lado;
  acao: ActionType;
  /** Quanto ele tinha posto na mão depois da jogada */
  para: number;
}

/** A mão em andamento, como o servidor guarda (duelos.estado) */
export interface EstadoDaMao {
  stack: number;
  sb: Lado;
  aposta_a: number;
  aposta_b: number;
  vez: Lado | null;
  prazo: string | null;
  aumentos: number;
  acoes: AcaoFeita[];
}

/** A mão que acabou de fechar (duelos.ultima). Cartas só quando houve showdown. */
export interface UltimaMao {
  mao: number;
  stack: number;
  sb: Lado;
  aposta_a: number;
  aposta_b: number;
  acoes: AcaoFeita[];
  vencedor: Lado | 'empate';
  delta_a: number;
  showdown: boolean;
  cartas_a: string | null;
  cartas_b: string | null;
  board: string | null;
}

/** O duelo visto por um dos jogadores (duelo_estado / duelo_agir) */
export interface VisaoDoDuelo {
  id: string;
  eu: Lado;
  status: 'jogando' | 'fim';
  motivo_fim: 'maos' | 'abandono' | 'desistencia' | null;
  vencedor: 'eu' | 'outro' | null;
  total_maos: number;
  mao: number;
  nome_a: string;
  nome_b: string;
  avatar_a: string | null;
  avatar_b: string | null;
  elo_a: number;
  elo_b: number;
  saldo_a: number;
  saldo_b: number;
  decisoes_a: number;
  acertos_a: number;
  decisoes_b: number;
  acertos_b: number;
  estado: EstadoDaMao;
  ultima: UltimaMao | null;
  minhas_cartas: string | null;
  acoes_validas: ActionType[];
  /** Relógio do servidor, para acertar a contagem do prazo */
  agora: string;
  /** A jogada chegou atrasada (a vez ou a mão já tinham mudado) */
  recusada?: boolean;
}

/** Resposta de duelo_procurar */
export type RespostaDaFila = { duelo: string } | { esperando: true; desde: string } | { expirou: true };

/** O app desiste da fila depois disto (o servidor também solta a pessoa) */
export const ESPERA_MAXIMA_MS = 3 * 60 * 1000;
/** De quanto em quanto a fila e a mesa perguntam ao servidor */
export const INTERVALO_DA_FILA_MS = 2000;
export const INTERVALO_DA_MESA_MS = 2000;
/** Quanto o resultado de uma mão fica na tela antes da próxima (o servidor dá 4 s) */
export const PAUSA_DO_RESULTADO_MS = 3500;
/** Tempo de cada decisão, o mesmo do servidor */
export const PRAZO_DA_DECISAO_S = 30;

export const outroLado = (l: Lado): Lado => (l === 'a' ? 'b' : 'a');
export const posicaoDe = (lado: Lado, sb: Lado): Position => (lado === sb ? 'SB' : 'BB');

/** Os campos de cada lado, sem espalhar `v[\`saldo_${lado}\`]` pela tela */
export function jogador(v: VisaoDoDuelo, lado: Lado) {
  return lado === 'a'
    ? { nome: v.nome_a, avatar: v.avatar_a, elo: v.elo_a, saldo: Number(v.saldo_a), decisoes: v.decisoes_a, acertos: v.acertos_a }
    : { nome: v.nome_b, avatar: v.avatar_b, elo: v.elo_b, saldo: Number(v.saldo_b), decisoes: v.decisoes_b, acertos: v.acertos_b };
}

export const apostaDe = (e: Pick<EstadoDaMao, 'aposta_a' | 'aposta_b'>, lado: Lado) =>
  Number(lado === 'a' ? e.aposta_a : e.aposta_b);

/** 'AsKd' -> [{A, s}, {K, d}] */
export function lerCartas(texto: string | null | undefined): CardType[] {
  if (!texto) return [];
  const cartas: CardType[] = [];
  for (let i = 0; i + 1 < texto.length; i += 2) {
    cartas.push({ rank: texto[i], suit: texto[i + 1] as CardType['suit'] });
  }
  return cartas;
}

/** Nome da mão como nas ranges: 'AKs', 'QQ', 'T9o' */
export function nomeDaMao(cartas: CardType[]): string {
  const [c1, c2] = cartas;
  if (!c1 || !c2) return '';
  if (c1.rank === c2.rank) return `${c1.rank}${c2.rank}`;
  const [alta, baixa] =
    RANKS.indexOf(c1.rank as (typeof RANKS)[number]) < RANKS.indexOf(c2.rank as (typeof RANKS)[number]) ? [c1, c2] : [c2, c1];
  return `${alta.rank}${baixa.rank}${c1.suit === c2.suit ? 's' : 'o'}`;
}

/** Spot do treino que corresponde à decisão de agora */
export interface SpotDoDuelo {
  cenario: Scenario;
  posicao: Position;
  vilao: Position;
  stack: number;
}

/**
 * A decisão tem range no treino? Abrir do SB, defender o BB contra o raise e
 * pagar (ou não) o all-in do SB têm. Depois da 3-bet, não: o vs 3-bet de
 * heads-up está fora do treino (a range está em revisão), então a decisão fica
 * sem nota.
 */
export function spotDaDecisao(e: EstadoDaMao, eu: Lado): SpotDoDuelo | null {
  const stack = Number(e.stack);
  if (e.sb === eu) {
    return e.aumentos === 0 ? { cenario: 'openRaise', posicao: 'SB', vilao: 'BB', stack } : null;
  }
  if (e.aumentos !== 1) return null;
  const abertura = e.acoes.find((a) => a.quem !== eu);
  if (abertura?.acao === 'raise') return { cenario: 'vsOpenRaise', posicao: 'BB', vilao: 'SB', stack };
  if (abertura?.acao === 'allin') return { cenario: 'vsOpenShove', posicao: 'BB', vilao: 'SB', stack };
  return null;
}

export interface NotaDaDecisao {
  tipo: FeedbackType;
  acertou: boolean;
  acaoCerta: ActionType;
  /** Pontos de XP como no treino (peso do cenário e teto do servidor) */
  pontos: number;
  evPerdido: number;
  mao: string;
}

/** Nota GTO da jogada, da mesma range do treino de heads-up */
export function avaliarDecisao(spot: SpotDoDuelo, cartas: CardType[], acao: ActionType, nivel: number): NotaDaDecisao | null {
  const mao = nomeDaMao(cartas);
  const range = getRange(spot.cenario, spot.posicao, spot.stack, false, 'hu', 0, 3, spot.vilao);
  const dados = range.hands.find((h) => h.hand === mao);
  if (!dados) return null;
  const fb = calculateFeedback(acao, dados, nivel);
  return {
    tipo: fb.type,
    acertou: fb.type === 'best' || fb.type === 'correct',
    acaoCerta: dados.primaryAction,
    pontos: limitarPontos(pesarPorCenario(spot.cenario, fb.points)),
    evPerdido: fb.evLoss,
    mao,
  };
}

/** Rótulo do botão de cada jogada, com o valor que ela põe na mesa */
export function rotuloDaAcao(acao: ActionType, e: EstadoDaMao, eu: Lado): { rotulo: string; detalhe?: string } {
  const stack = Number(e.stack);
  const falta = apostaDe(e, outroLado(eu)) - apostaDe(e, eu);
  switch (acao) {
    case 'fold':
      return { rotulo: 'Fold' };
    case 'call':
      return { rotulo: 'Call', detalhe: `${emBB(falta)} BB` };
    case 'raise':
      return e.aumentos === 0 ? { rotulo: 'Raise', detalhe: 'para 2,5 BB' } : { rotulo: '3-bet', detalhe: 'para 7,5 BB' };
    case 'allin':
      return { rotulo: 'All-in', detalhe: `${emBB(stack)} BB` };
  }
}

/** Como a jogada do outro aparece na mesa */
export function nomeDaJogada(a: AcaoFeita, aumentosAntes: number): string {
  switch (a.acao) {
    case 'fold':
      return 'Fold';
    case 'call':
      return 'Call';
    case 'raise':
      return aumentosAntes === 0 ? 'Raise' : '3-bet';
    case 'allin':
      return 'All-in';
  }
}

/** 2.5 -> "2,5"; 10 -> "10" */
export function emBB(valor: number): string {
  return Number(valor).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** Saldo com sinal: "+7,5", "-2", "0" */
export function comSinal(valor: number): string {
  const v = Number(valor);
  return v > 0 ? `+${emBB(v)}` : emBB(v);
}
