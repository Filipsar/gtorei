import { describe, it, expect } from 'vitest';
import { getRange, STACK_SIZES, type GameMode, type Position, type HandData } from '@/data/gtoRanges';
import { HAND_ORDER } from '@/data/ranges/handorder.generated';

/**
 * No vs3bet a escala de força tem que ser contínua: nenhuma mão foldada pode
 * estar acima de uma mão que continua (call ou all-in).
 *
 * Não era: o fim da faixa de all-in tem uma zona de mistura de 3%, e o resto
 * dessa mistura ia para raise ou, sem raise, direto para fold. O vs3bet só tem
 * all-in e call, então a zona inteira caía em fold. No CO 25bb vs BTN, TT, AJs
 * e AQo foldavam enquanto 99, ATs e AJo pagavam. Acontecia em toda combinação
 * de modo, posição e stack.
 */

const POSICOES: Record<GameMode, Position[]> = {
  '8max': ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  hu: ['SB', 'BB'],
  threehand: ['BTN', 'SB', 'BB'],
  bounty: ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};

const freq = (h: HandData, acao: string) => h.actions.find((a) => a.action === acao)?.frequency ?? 0;

function combinacoes(stacks: number[]) {
  const fora: Array<{ modo: GameMode; posicao: Position; stack: number; mesaFinal: boolean; bounty: number }> = [];
  for (const modo of Object.keys(POSICOES) as GameMode[]) {
    for (const posicao of POSICOES[modo]) {
      for (const stack of stacks) {
        for (const mesaFinal of [false, true]) {
          for (const bounty of modo === 'bounty' ? [0, 1, 2] : [0]) {
            fora.push({ modo, posicao, stack, mesaFinal, bounty });
          }
        }
      }
    }
  }
  return fora;
}

const rotulo = (c: ReturnType<typeof combinacoes>[number]) =>
  `${c.modo} ${c.posicao} ${c.stack}bb${c.mesaFinal ? ' mesa final' : ''}${c.bounty ? ` bounty ${c.bounty}x` : ''}`;

describe('vs3bet: escala de força contínua', () => {
  it('as mãos da range vêm na ordem de força do motor', () => {
    // O teste lê a ordem de força direto de range.hands; no 8max ela tem que
    // ser a mesma de handorder.generated.ts, senão a checagem abaixo não vale.
    const range = getRange('vs3bet', 'CO', 25, false, '8max', 0, 3, 'BTN');
    expect(range.hands.map((h) => h.hand)).toEqual(HAND_ORDER);
  });

  it('CO 25bb vs BTN: TT, AJs e AQo continuam (o caso relatado)', () => {
    const range = getRange('vs3bet', 'CO', 25, false, '8max', 0, 3, 'BTN');
    for (const mao of ['TT', 'AJs', 'AQo']) {
      const h = range.hands.find((x) => x.hand === mao)!;
      expect(freq(h, 'fold'), mao).toBe(0);
      expect(h.primaryAction, mao).not.toBe('fold');
    }
  });

  it('em nenhuma combinação de posição/stack uma mão foldada fica acima de uma que continua', () => {
    const quebradas: string[] = [];
    for (const c of combinacoes(STACK_SIZES)) {
      const range = getRange('vs3bet', c.posicao, c.stack, c.mesaFinal, c.modo, c.bounty);
      const ultimaQueContinua = range.hands.map((h) => h.primaryAction !== 'fold').lastIndexOf(true);
      const buracos = range.hands
        .slice(0, ultimaQueContinua)
        .filter((h) => h.primaryAction === 'fold')
        .map((h) => h.hand);
      if (buracos.length) quebradas.push(`${rotulo(c)}: ${buracos.join(', ')} foldam acima de ${range.hands[ultimaQueContinua].hand}`);
    }
    expect(quebradas).toEqual([]);
  });

  it('a frequência de fold nunca diminui ao descer na escala, inclusive em stacks interpolados', () => {
    // Stacks fora da tabela (11, 22, 27...) saem da interpolação entre os
    // vizinhos e aparecem no treino porque o stack efetivo é o menor dos dois.
    const stacks = [...STACK_SIZES, 11, 13, 22, 27, 45, 70];
    const quebradas: string[] = [];
    for (const c of combinacoes(stacks)) {
      const range = getRange('vs3bet', c.posicao, c.stack, c.mesaFinal, c.modo, c.bounty);
      for (let i = 1; i < range.hands.length; i++) {
        const acima = range.hands[i - 1];
        const abaixo = range.hands[i];
        if (freq(abaixo, 'fold') < freq(acima, 'fold')) {
          quebradas.push(`${rotulo(c)}: ${acima.hand} folda ${freq(acima, 'fold')}% e ${abaixo.hand} só ${freq(abaixo, 'fold')}%`);
          break;
        }
      }
    }
    expect(quebradas).toEqual([]);
  });
});
