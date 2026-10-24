// Duelo do app (/duelo): heads-up contra o Rei, sem fim marcado. Cada mão
// certa é ponto seu, cada erro é ponto do Rei.
//
// Cenários grátis do heads-up, sem o vs 3-bet (range em revisão) e sem o
// pagamento de all-in com stack fundo, que não existe nessa profundidade.

import type { Preset } from '@/data/trilha';

export type FaixaDoDuelo = 'curto' | 'medio' | 'fundo';

export interface OpcaoDeDuelo {
  id: FaixaDoDuelo;
  titulo: string;
  detalhe: string;
  preset: Preset;
}

export const DUELOS: OpcaoDeDuelo[] = [
  {
    id: 'curto',
    titulo: 'Stack curto',
    detalhe: '8 a 12 BB. Abrir, defender e pagar all-in.',
    preset: { modo: 'hu', cenarios: ['openRaise', 'vsOpenRaise', 'vsOpenShove'], posicoes: ['SB', 'BB'], stacks: [8, 9, 10, 12] },
  },
  {
    id: 'medio',
    titulo: 'Stack médio',
    detalhe: '14 a 25 BB. Ainda dá all-in, mas o raise pequeno entra no jogo.',
    preset: { modo: 'hu', cenarios: ['openRaise', 'vsOpenRaise', 'vsOpenShove'], posicoes: ['SB', 'BB'], stacks: [14, 17, 20, 25] },
  },
  {
    id: 'fundo',
    titulo: 'Stack fundo',
    detalhe: '30 a 60 BB. Abrir e defender, mão a mão.',
    preset: { modo: 'hu', cenarios: ['openRaise', 'vsOpenRaise'], posicoes: ['SB', 'BB'], stacks: [30, 35, 40, 50, 60] },
  },
];

export function dueloPorId(id: string | null | undefined): OpcaoDeDuelo | null {
  return (id && DUELOS.find((d) => d.id === id)) || null;
}
