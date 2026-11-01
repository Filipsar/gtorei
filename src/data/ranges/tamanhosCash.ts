// Tamanhos de aposta do cash 6-max 100 BB (etapa 3, 01/11/2026). São os mesmos
// de scripts/build-open-ev.mjs (TAMANHO_DO_CASH e tamanho3bet): a mesa do treino
// mostra o que a range calculou. Mudou lá, muda aqui.
import type { Position } from './types';

/** Abertura em BB: 2,5x do UTG ao CO, 2x do botão, 3x do SB */
export const ABERTURA_DO_CASH: Partial<Record<Position, number>> = { UTG: 2.5, HJ: 2.5, CO: 2.5, BTN: 2, SB: 3 };

export function aberturaDoCash(quemAbre: Position): number {
  return ABERTURA_DO_CASH[quemAbre] ?? 2.5;
}

/**
 * 3-bet: 4x a abertura quando quem dá 3-bet fica fora de posição (os blinds
 * contra quem não é blind) e 3x em posição. SB contra BB: o BB fala por último
 * no pós-flop, então 3x.
 */
export function tresBetDoCash(quemAbre: Position, quemDa3bet: Position, abertura: number): number {
  const blind = (p: Position) => p === 'SB' || p === 'BB';
  const foraDePosicao = blind(quemDa3bet) && !blind(quemAbre);
  return Math.round(abertura * (foraDePosicao ? 4 : 3) * 10) / 10;
}

/** 4-bet pequeno: 2,2x o 3-bet */
export const quatroBetDoCash = (tresBet: number) => Math.round(tresBet * 2.2 * 10) / 10;
