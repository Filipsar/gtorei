import { describe, it, expect } from 'vitest';
import { getRange } from '@/data/gtoRanges';
import { POSITIONS } from '@/data/gtoRanges';
import type { HandData, Position } from '@/data/ranges/types';

/**
 * Defeitos achados em 15/11/2026 olhando onde os jogadores mais "erravam" no
 * treino: boa parte era a range que estava errada, não o jogador.
 *
 * 1. Resposta à abertura com stack fundo: o 3-bet saía sempre all-in. O BB ia
 *    all-in com AA e mais 28 mãos contra o botão em 60 BB, e o SB com 43.
 * 2. Resposta à abertura até 14 BB: era calculada contra uma range vazia (o
 *    modelo só abria de all-in nesses stacks) e saía quase arbitrária.
 * 3. Abertura do SB: all-in direto com 30 BB em 71 mãos (QQ e JJ entre elas) e
 *    com 40 BB em 45 (até 98o).
 */

const freq = (h: HandData, acao: string) => h.actions.find((a) => a.action === acao)?.frequency ?? 0;
const mao = (hands: HandData[], nome: string) => hands.find((h) => h.hand === nome)!;
const combos = (h: HandData) => (h.pair ? 6 : h.suited ? 4 : 12);
const largura = (hands: HandData[], acao: string) =>
  hands.reduce((t, h) => t + (combos(h) * freq(h, acao)) / 100, 0) / 13.26;

function resposta(heroi: Position, vilao: Position, stack: number) {
  return getRange('vsOpenRaise', heroi, stack, false, '8max', 0, 3, vilao).hands;
}

describe('resposta à abertura: all-in só em stack de re-steal', () => {
  it('a partir de 35 BB ninguém dá 3-bet all-in direto', () => {
    for (const stack of [35, 40, 50, 60, 80, 100]) {
      for (let i = 1; i < POSITIONS.length; i++) {
        for (let j = 0; j < i; j++) {
          const hands = resposta(POSITIONS[i], POSITIONS[j], stack);
          const empurra = hands.filter((h) => freq(h, 'allin') > 0).map((h) => h.hand);
          expect(empurra, `${POSITIONS[i]} contra ${POSITIONS[j]} com ${stack} BB`).toEqual([]);
        }
      }
    }
  });

  it('AA e KK dão 3-bet pequeno nos blinds contra o botão com 40 e 60 BB', () => {
    for (const stack of [40, 60]) {
      for (const heroi of ['SB', 'BB'] as Position[]) {
        const hands = resposta(heroi, 'BTN', stack);
        for (const nome of ['AA', 'KK']) {
          expect(mao(hands, nome).primaryAction, `${nome} no ${heroi} com ${stack} BB`).toBe('raise');
        }
      }
    }
  });

  it('com stack fundo os blinds dão 3-bet numa frequência de solver, não o dobro', () => {
    // Ordem de grandeza de solver de torneio com ante: BB contra o botão perto
    // de 13-16%, contra o UTG perto de 4-6%
    for (const stack of [40, 60, 100]) {
      const btn = largura(resposta('BB', 'BTN', stack), 'raise');
      const utg = largura(resposta('BB', 'UTG', stack), 'raise');
      expect(btn, `BB contra BTN ${stack} BB`).toBeGreaterThan(10);
      expect(btn, `BB contra BTN ${stack} BB`).toBeLessThan(20);
      expect(utg, `BB contra UTG ${stack} BB`).toBeGreaterThan(2.5);
      expect(utg, `BB contra UTG ${stack} BB`).toBeLessThan(8);
    }
  });

  it('em stack de re-steal (até 30 BB) o all-in continua existindo', () => {
    for (const stack of [10, 20, 30]) {
      expect(largura(resposta('SB', 'BTN', stack), 'allin'), `SB contra BTN ${stack} BB`).toBeGreaterThan(10);
      expect(largura(resposta('BB', 'BTN', stack), 'allin'), `BB contra BTN ${stack} BB`).toBeGreaterThan(8);
    }
  });
});

describe('resposta à abertura em stack curto: contra uma range de verdade', () => {
  it('quem empurra por cima do UTG com 10 BB tem mão forte, e o resto não empurra', () => {
    for (const heroi of ['HJ', 'CO', 'BTN', 'SB', 'BB'] as Position[]) {
      const hands = resposta(heroi, 'UTG', 10);
      for (const nome of ['AA', 'KK', 'QQ', 'AKs']) {
        expect(mao(hands, nome).primaryAction, `${nome} no ${heroi}`).toBe('allin');
      }
      for (const nome of ['72o', 'T4o', 'J5s', '96o']) {
        expect(freq(mao(hands, nome), 'allin'), `${nome} no ${heroi}`).toBe(0);
      }
      // Contra o UTG, o all-in é uma fatia pequena do baralho
      expect(largura(hands, 'allin'), heroi).toBeLessThan(12);
    }
  });

  it('o all-in por cima fica mais largo quanto mais tarde abre o vilão', () => {
    for (const stack of [8, 10, 14, 17]) {
      const contraUtg = largura(resposta('BB', 'UTG', stack), 'allin');
      const contraCo = largura(resposta('BB', 'CO', stack), 'allin');
      const contraBtn = largura(resposta('BB', 'BTN', stack), 'allin');
      expect(contraCo, `${stack} BB`).toBeGreaterThan(contraUtg);
      expect(contraBtn, `${stack} BB`).toBeGreaterThan(contraCo);
    }
  });

  it('fora dos blinds, quem enfrenta a abertura com 10 BB larga a maior parte das mãos', () => {
    for (const heroi of ['UTG1', 'LJ', 'HJ', 'CO', 'BTN'] as Position[]) {
      const hands = resposta(heroi, 'UTG', 10);
      expect(largura(hands, 'fold'), heroi).toBeGreaterThan(75);
    }
  });
});

describe('abertura: all-in direto só até 20 BB', () => {
  it('de 25 BB para cima ninguém abre de all-in, em nenhuma mesa', () => {
    const mesas: [Parameters<typeof getRange>[4], Position[]][] = [
      ['8max', POSITIONS.slice(0, -1)],
      ['6max', ['UTG', 'HJ', 'CO', 'BTN', 'SB']],
      ['threehand', ['BTN', 'SB']],
      ['hu', ['SB']],
    ];
    for (const [modo, posicoes] of mesas) {
      for (const p of posicoes) {
        for (const stack of [25, 30, 40, 60, 100]) {
          const hands = getRange('openRaise', p, stack, false, modo, 0).hands;
          const empurra = hands.filter((h) => freq(h, 'allin') > 0).map((h) => h.hand);
          expect(empurra, `${modo} ${p} ${stack} BB`).toEqual([]);
        }
      }
    }
  });

  it('o SB continua abrindo perto de metade das mãos com 30 e 40 BB, agora de raise', () => {
    for (const stack of [30, 40]) {
      const hands = getRange('openRaise', 'SB', stack, false, '8max', 0).hands;
      expect(largura(hands, 'raise'), `${stack} BB`).toBeGreaterThan(42);
      expect(largura(hands, 'raise'), `${stack} BB`).toBeLessThan(56);
      for (const nome of ['AA', 'KK', 'QQ', 'JJ']) expect(mao(hands, nome).primaryAction, nome).toBe('raise');
    }
  });

  it('em stack curto o all-in de abertura continua (push/fold)', () => {
    for (const p of ['CO', 'BTN', 'SB'] as Position[]) {
      const hands = getRange('openRaise', p, 10, false, '8max', 0).hands;
      expect(largura(hands, 'allin'), p).toBeGreaterThan(25);
    }
  });
});
