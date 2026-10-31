import { describe, expect, it } from 'vitest';
import { getRange } from '@/data/gtoRanges';
import { resumoDaRange, TOTAL_DE_COMBOS } from '@/lib/resumoDaRange';

describe('resumo da aba Tabelas', () => {
  it('pesa por combos: as ações somam 1.326', () => {
    const r = resumoDaRange(getRange('openRaise', 'BTN', 100, false, '6max').hands);
    const soma = r.fold + r.call + r.raise + r.allin;
    expect(soma).toBeCloseTo(TOTAL_DE_COMBOS, 0);
  });

  it('AA sozinho são 6 combos e AKo, 12', () => {
    const mao = (hand: string, pair: boolean, suited: boolean) => ({ hand, pair, suited, primaryAction: 'raise' as const, actions: [{ action: 'raise' as const, frequency: 100 }] });
    expect(resumoDaRange([mao('AA', true, false)]).raise).toBe(6);
    expect(resumoDaRange([mao('AKo', false, false)]).raise).toBe(12);
  });

  it('o cash abre do UTG o mesmo que o cálculo diz (~14%)', () => {
    const r = resumoDaRange(getRange('openRaise', 'UTG', 100, false, 'cash').hands);
    expect((r.raise / TOTAL_DE_COMBOS) * 100).toBeGreaterThan(12);
    expect((r.raise / TOTAL_DE_COMBOS) * 100).toBeLessThan(18);
  });
});
