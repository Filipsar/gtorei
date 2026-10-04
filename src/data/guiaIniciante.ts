// Dados do Guia do Iniciante (/iniciante).
//
// ABERTURA_100BB é a abertura de cada posição com 100 BB em 8-max, tirada do
// motor de ranges (abertura calculada por EV, com ante — scripts/build-open-ev.mjs).
// Fica fixa aqui para a página não carregar o motor inteiro; o teste
// src/test/guiaIniciante.test.ts quebra se ela deixar de bater com o motor.
//
// Matriz: 169 casas, linha a linha (A, K, Q... 2). Acima da diagonal são as
// mãos do mesmo naipe, abaixo as de naipes diferentes, na diagonal os pares.
// 2 = abre sempre, 1 = abre parte das vezes, 0 = fold.
import type { Position } from '@/data/ranges/types';

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export function nomeDaMao(linha: number, coluna: number) {
  const alto = RANKS[Math.min(linha, coluna)];
  const baixo = RANKS[Math.max(linha, coluna)];
  if (linha === coluna) return alto + alto;
  return alto + baixo + (coluna > linha ? 's' : 'o');
}

export function combosDaMao(mao: string) {
  return mao.length === 2 ? 6 : mao.endsWith('s') ? 4 : 12;
}

export const POSICOES_GUIA: Position[] = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];

export const ABERTURA_100BB: Record<string, { pct: number; matriz: string }> = {
  UTG: {
    pct: 15.4,
    matriz: '2222222212111222221100000021222100000002112210000000110021000000000000200000000000002000000000000020000000000000200000000000002000000000000010000000000000100000000000000',
  },
  UTG1: {
    pct: 17.6,
    matriz: '2222222212211222221111000022222110000002112210000000211021000000010000210000000000002000000000000020000000000000200000000000002000000000000020000000000000100000000000000',
  },
  LJ: {
    pct: 20.5,
    matriz: '2222222222221222222111100022222110000002112211000000211122100000010000210000001000002100000000000020000000000000200000000000002000000000000020000000000000200000000000001',
  },
  HJ: {
    pct: 25.2,
    matriz: '2222222222222222222211111122222211110002222221000000211122200000010000221000001000002100000100000021000010000000200001000000002000000000000020000000000000200000000000002',
  },
  CO: {
    pct: 33.9,
    matriz: '2222222222222222222222221122222222111112222222111100222222211000021100222100002100002210000200000022000010000000210001000000002100100000000020010000000000201000000000002',
  },
  BTN: {
    pct: 48.4,
    matriz: '2222222222222222222222222222222222222222222222222221222222222111122222222211102211112221100221000022210020000000221002000000002200200000000020020000000000202000000000002',
  },
  SB: {
    pct: 49.3,
    matriz: '2222222222222222222222222222222222222222222222222221222222222211122222222211112211112221100221101122110020000000221002000000002110200000000021020000000000202000000000002',
  },
};

// Quiz: a resposta de cada pergunta sai da matriz acima, não de opinião.
// Só entram spots que qualquer solver de torneio responde igual.
export const QUIZ = [
  { posicao: 'UTG', mao: 'AQo', explicacao: 'Uma das mãos mais fortes do baralho. Abre de qualquer posição, até da primeira a falar.' },
  { posicao: 'UTG', mao: 'K7o', explicacao: 'Com sete jogadores ainda para falar, um rei com carta baixa e naipes diferentes perde para as mãos que vão continuar. Fold.' },
  { posicao: 'BTN', mao: 'A4s', explicacao: 'No botão só restam os blinds, e você joga o resto da mão por último. Um ás do mesmo naipe abre com folga.' },
  { posicao: 'CO', mao: '72o', explicacao: 'A pior mão do poker continua fold mesmo no cutoff. Posição ajuda, mas não transforma lixo em mão.' },
  { posicao: 'SB', mao: 'K9o', explicacao: 'Quando todos foldam até o small blind, só o big blind sobra. A range abre bastante, e K9 entra.' },
] as const;

// Estado da casa na abertura de uma posição: 2 abre, 1 mistura, 0 fold
export function acaoNaPosicao(posicao: string, mao: string): 0 | 1 | 2 {
  for (let l = 0; l < 13; l++) {
    for (let c = 0; c < 13; c++) {
      if (nomeDaMao(l, c) === mao) return Number(ABERTURA_100BB[posicao].matriz[l * 13 + c]) as 0 | 1 | 2;
    }
  }
  return 0;
}
