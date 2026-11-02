import { describe, expect, it } from 'vitest';
import { evPerdido, perdaDaMao } from '@/lib/historicoDeAnalises';

describe('EV perdido da análise', () => {
  it('jogada certa vale 0, mesmo quando a IA manda EV positivo', () => {
    expect(perdaDaMao({ evDelta: 11.4 })).toBe(0);
    expect(perdaDaMao({ evDelta: 0 })).toBe(0);
    expect(perdaDaMao({ evDelta: -4.8 })).toBe(-4.8);
    expect(perdaDaMao({ evDelta: Number.NaN })).toBe(0);
  });

  it('soma só as perdas e ignora o total da IA', () => {
    const hands = [{ evDelta: 11.4 }, { evDelta: -8.5 }, { evDelta: 2.5 }, { evDelta: -1.5 }, { evDelta: -0.15 }];
    expect(evPerdido({ hands } as never)).toBe(-10.15);
    expect(evPerdido({ hands: [{ evDelta: 3 }] } as never)).toBe(0);
    expect(Object.is(evPerdido({ hands: [] } as never), 0)).toBe(true);
  });
});
