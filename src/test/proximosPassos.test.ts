import { describe, expect, it } from 'vitest';
import type { CardType } from '@/components/poker/PlayingCard';
import { detectarDraws, descreverDraws } from '@/data/draws';
import { analyzeStreetAction, equityParaPagar } from '@/data/postflopAnalysis';
import { getRange } from '@/data/gtoRanges';
import type { RangeData } from '@/data/ranges/types';

const cartas = (s: string): CardType[] =>
  s.split(' ').map((c) => ({ rank: c[0], suit: c[1] as CardType['suit'] }));

describe('draws de sequência', () => {
  it('OESD: 8 outs, as duas pontas', () => {
    const d = detectarDraws(cartas('9h 8d'), cartas('7c 6s Kd'));
    expect(d.sequencia).toBe('oesd');
    expect(d.outs).toBe(8);
    expect(d.cartasQueCompletam).toEqual([5, 10]);
    // 8 de 47 no turn; 1 - 39/47 * 38/46 até o river
    expect(d.proximaCarta).toBe(17);
    expect(d.ateORiver).toBe(31.5);
  });

  it('gutshot vale 4 outs, não 8', () => {
    const d = detectarDraws(cartas('9h 8d'), cartas('6c 5s Kd'));
    expect(d.sequencia).toBe('gutshot');
    expect(d.outs).toBe(4);
    expect(d.cartasQueCompletam).toEqual([7]);
  });

  it('dupla gutshot: 8 outs sem quatro seguidas', () => {
    const d = detectarDraws(cartas('9h 7d'), cartas('Jc 5s 8d'));
    expect(d.sequencia).toBe('dupla_gutshot');
    expect(d.outs).toBe(8);
  });

  it('ás conta como 1 e como 14', () => {
    expect(detectarDraws(cartas('Ah 3d'), cartas('2c 4s Kd')).sequencia).toBe('gutshot'); // só o 5
    expect(detectarDraws(cartas('Ah Kd'), cartas('Qc Js 4d')).sequencia).toBe('gutshot'); // só o T
  });

  it('sequência só da mesa não é draw do jogador; sequência feita também não', () => {
    expect(detectarDraws(cartas('2h 2d'), cartas('9c 8s 7d 6h')).sequencia).toBeNull();
    expect(detectarDraws(cartas('9h 8d'), cartas('7c 6s 5d')).outs).toBe(0);
  });

  it('flush + OESD: 15 outs, sem contar duas vezes', () => {
    const d = detectarDraws(cartas('9h 8h'), cartas('7h 6c 2h'));
    expect(d.flush).toBe(true);
    expect(d.sequencia).toBe('oesd');
    expect(d.outs).toBe(15);
    expect(descreverDraws(d)).toMatch(/^Flush draw \+ open-ended \(OESD\): 15 outs/);
  });

  it('no river não há draw', () => {
    expect(detectarDraws(cartas('9h 8d'), cartas('7c 6s Kd 2h 3c')).outs).toBe(0);
  });
});

describe('análise do pós-flop com o preço do call', () => {
  it('preço: aposta de 5 num pote que já tem 15 (com a aposta) pede 25%', () => {
    expect(equityParaPagar(5, 15)).toBe(25);
  });

  it('fold de gutshot contra aposta grande é fold correto', () => {
    const a = analyzeStreetAction({
      street: 'flop', heroAction: 'Fold', pot: 30, villainAmount: 10, potBefore: 30,
      boardCards: cartas('6c 5s Kd'), heroCards: cartas('9h 8d'),
    });
    expect(a.reasoning.join(' ')).toMatch(/Fold correto pelo preço/);
    expect(['good', 'acceptable']).toContain(a.verdict);
  });

  it('fold de flush + OESD contra aposta pequena é questionável', () => {
    const a = analyzeStreetAction({
      street: 'flop', heroAction: 'Fold', pot: 12, villainAmount: 2, potBefore: 12,
      boardCards: cartas('7h 6c 2h'), heroCards: cartas('9h 8h'),
    });
    expect(a.verdict).toBe('questionable');
    expect(a.reasoning.some((r) => r.includes('15 outs'))).toBe(true);
  });
});

const freq = (r: RangeData, mao: string, acao: string) => r.hands.find((h) => h.hand === mao)?.actions.find((a) => a.action === acao)?.frequency ?? 0;
const largura = (r: RangeData, acoes: string[]) => {
  let s = 0, t = 0;
  for (const h of r.hands) {
    const c = h.pair ? 6 : h.suited ? 4 : 12;
    t += c;
    s += (c * h.actions.filter((a) => acoes.includes(a.action)).reduce((x, a) => x + a.frequency, 0)) / 100;
  }
  return (100 * s) / t;
};

describe('ante no pagamento de all-in', () => {
  it('BB contra o all-in de 10 BB do SB paga mais da metade das mãos', () => {
    expect(largura(getRange('vsOpenShove', 'BB', 10, false, '8max', 0, 3, 'SB'), ['call'])).toBeGreaterThan(45);
  });
});

describe('resposta à abertura calculada por EV', () => {
  it('botão contra o CO em 100 BB paga e dá 3-bet', () => {
    const r = getRange('vsOpenRaise', 'BTN', 100, false, '8max', 0, 3, 'CO');
    expect(largura(r, ['call'])).toBeGreaterThan(8);
    expect(largura(r, ['raise', 'allin'])).toBeGreaterThan(8);
    expect(freq(r, 'AA', 'fold')).toBe(0);
    expect(freq(r, '72o', 'fold')).toBe(100);
  });

  it('SB responde com 3-bet ou fold; BB defende pagando', () => {
    const sb = getRange('vsOpenRaise', 'SB', 40, false, '8max', 0, 3, 'BTN');
    expect(largura(sb, ['call'])).toBe(0);
    const bb = getRange('vsOpenRaise', 'BB', 40, false, '8max', 0, 3, 'BTN');
    expect(largura(bb, ['call'])).toBeGreaterThan(30);
  });

  it('com stack curto o 3-bet vira all-in', () => {
    const r = getRange('vsOpenRaise', 'BB', 14, false, '8max', 0, 3, 'CO');
    expect(largura(r, ['allin'])).toBeGreaterThan(largura(r, ['raise']));
  });

  it('mesa final e bounty continuam no modelo antigo', () => {
    const mf = getRange('vsOpenRaise', 'BTN', 40, true, '8max', 0, 3, 'CO');
    const normal = getRange('vsOpenRaise', 'BTN', 40, false, '8max', 0, 3, 'CO');
    expect(JSON.stringify(mf.hands)).not.toBe(JSON.stringify(normal.hands));
  });
});
