import { describe, it, expect } from 'vitest';
import {
  initializeHandState,
  processHeroAction,
  processPostflopAction,
  avancarRua,
  HandState,
} from '@/data/handState';
import { generateCardsFromHand } from '@/components/poker/PlayingCard';
import { POSITIONS } from '@/data/gtoRanges';
import type { Position, Scenario } from '@/data/ranges/types';

/**
 * Dois defeitos relatados em 12/11/2026:
 *
 * 1. Na simulação, all-in pago abria só o flop e a mão seguia pedindo ação,
 *    como se os dois ainda tivessem fichas.
 * 2. Com o vilão abrindo do HJ e o herói no BB, o UTG e os outros de antes do
 *    HJ ficavam com o assento aceso, como se ainda fossem jogar.
 */

function nova(cenario: Scenario, heroi: Position, stack = 40): HandState {
  return initializeHandState(cenario, heroi, stack, 'AKs', generateCardsFromHand('AKs'), POSITIONS);
}

/** Joga até o fim como a tela faz: vira a rua nas pausas e responde ao que vier */
function ateOFim(inicio: HandState, jogada: (s: HandState) => Parameters<typeof processPostflopAction>[1]): HandState {
  let s = inicio;
  let voltas = 0;
  while (!s.isHandComplete && voltas++ < 40) {
    s = s.aguardandoAvanco ? avancarRua(s) : processPostflopAction(s, jogada(s), 1);
  }
  return s;
}

describe('all-in pago na simulação acaba a mão', () => {
  it('herói vai all-in no pré-flop: ou o vilão larga, ou vai direto ao showdown com as cinco cartas', () => {
    let pagos = 0;
    for (let i = 0; i < 300; i++) {
      const s = processHeroAction(nova('simulation', 'BTN'), 'allin', 'simulation');
      if (s.isHandComplete) continue; // vilão desistiu
      pagos++;
      expect(s.aguardandoAvanco).toBe(true);
      const fim = avancarRua(s);
      expect(fim.isHandComplete).toBe(true);
      expect(fim.street).toBe('showdown');
      expect(fim.communityCards).toHaveLength(5);
      expect(fim.awaitingPostflopAction).toBeFalsy();
      // Stacks iguais: o pote é a soma dos dois mais os blinds
      expect(fim.pot).toBeCloseTo(40 + 40 + 1.5, 5);
    }
    expect(pagos).toBeGreaterThan(0);
  });

  it('nenhuma mão pede ação com herói ou vilão sem fichas', () => {
    const jogadas = ['allin', 'bet', 'raise', 'call'] as const;
    for (let i = 0; i < 600; i++) {
      const stack = [8, 12, 20, 40][i % 4];
      const pre = (['call', 'raise', 'allin'] as const)[i % 3];
      let s = processHeroAction(nova('simulation', 'BB', stack), pre, 'simulation');
      let voltas = 0;
      while (!s.isHandComplete && voltas++ < 40) {
        if (s.aguardandoAvanco) {
          s = avancarRua(s);
        } else {
          // Parada para o herói agir: os dois precisam ter fichas, a não ser
          // que seja só para pagar (ou largar) a aposta do vilão
          expect(s.heroStack).toBeGreaterThan(0.05);
          if (!s.villainAction) expect(s.villainStack ?? 1).toBeGreaterThan(0.05);
          const quer = jogadas[(i + voltas) % jogadas.length];
          const enfrenta = !!s.villainAction;
          const acao = enfrenta ? (quer === 'bet' ? 'call' : quer) : quer === 'call' || quer === 'raise' ? 'bet' : quer;
          s = processPostflopAction(s, acao, 1);
        }
        expect(s.heroStack).toBeGreaterThanOrEqual(-0.0001);
        expect(s.villainStack ?? 0).toBeGreaterThanOrEqual(-0.0001);
      }
      expect(s.isHandComplete).toBe(true);
    }
  });

  it('pagar o all-in do vilão no pós-flop custa fichas e leva ao showdown', () => {
    let vistos = 0;
    for (let i = 0; i < 3000 && vistos < 20; i++) {
      let s = processHeroAction(nova('simulation', 'BB', 20), 'call', 'simulation');
      let voltas = 0;
      while (!s.isHandComplete && voltas++ < 40) {
        if (s.aguardandoAvanco) { s = avancarRua(s); continue; }
        if (s.villainAction?.action === 'All-in') {
          vistos++;
          const antes = s.heroStack;
          expect(s.villainAction.amount).toBeGreaterThan(0);
          s = processPostflopAction(s, 'call');
          expect(s.heroStack).toBeLessThan(antes);
          expect(s.isHandComplete).toBe(true);
          expect(s.street).toBe('showdown');
          expect(s.communityCards).toHaveLength(5);
          break;
        }
        s = processPostflopAction(s, s.villainAction ? 'raise' : 'bet', 1);
      }
    }
    expect(vistos).toBeGreaterThan(0);
  });

  it('jogando só de all-in a mão sempre termina', () => {
    for (let i = 0; i < 100; i++) {
      const fim = ateOFim(processHeroAction(nova('simulation', 'CO'), 'call', 'simulation'), () => 'allin');
      expect(fim.isHandComplete).toBe(true);
    }
  });
});

describe('assentos de quem já desistiu', () => {
  it('contra abertura ou all-in, quem falou antes do vilão e quem está entre os dois já largou', () => {
    for (const cenario of ['vsOpenRaise', 'vsOpenShove', 'simulation'] as Scenario[]) {
      for (let i = 0; i < 200; i++) {
        const s = nova(cenario, 'BB');
        const vilao = POSITIONS.indexOf(s.villainPosition!);
        const esperados = POSITIONS.filter((p, j) => j !== vilao && p !== 'BB');
        expect([...s.foldedPositions].sort()).toEqual([...esperados].sort());
      }
    }
  });

  it('quem ainda vai falar depois do herói continua na mão', () => {
    for (let i = 0; i < 200; i++) {
      const s = nova('vsOpenRaise', 'CO');
      expect(s.foldedPositions).not.toContain('BTN');
      expect(s.foldedPositions).not.toContain('SB');
      expect(s.foldedPositions).not.toContain('BB');
      const vilao = POSITIONS.indexOf(s.villainPosition!);
      for (const p of POSITIONS.slice(0, POSITIONS.indexOf('CO'))) {
        if (POSITIONS.indexOf(p) !== vilao) expect(s.foldedPositions).toContain(p);
      }
    }
  });

  it('na abertura, quem falou antes do herói já largou', () => {
    const s = nova('openRaise', 'CO');
    expect([...s.foldedPositions].sort()).toEqual(['HJ', 'LJ', 'UTG', 'UTG1']);
  });

  it('contra 3-bet, só herói e vilão seguem', () => {
    for (let i = 0; i < 100; i++) {
      const s = nova('vs3bet', 'HJ');
      expect(s.foldedPositions).toHaveLength(POSITIONS.length - 2);
      expect(s.foldedPositions).not.toContain('HJ');
      expect(s.foldedPositions).not.toContain(s.villainPosition);
    }
  });

  it('no multiway, quem pagou não é marcado como fora', () => {
    for (let i = 0; i < 200; i++) {
      const s = nova('multiway', 'BB');
      const pagaram = s.actions.filter((a) => a.action === 'call').map((a) => a.position);
      expect(pagaram.length).toBeGreaterThan(0);
      for (const p of pagaram) expect(s.foldedPositions).not.toContain(p);
      expect(new Set(s.foldedPositions).size).toBe(s.foldedPositions.length);
    }
  });
});
