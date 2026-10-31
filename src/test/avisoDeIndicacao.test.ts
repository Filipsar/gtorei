import { describe, expect, it } from 'vitest';
import { deveMostrarIndicacao } from '@/lib/avisoDeIndicacao';

describe('aviso do Indique e ganhe', () => {
  it('aparece na primeira vez e depois de 7 dias', () => {
    expect(deveMostrarIndicacao(null, false, '2026-10-31')).toBe(true);
    expect(deveMostrarIndicacao('2026-10-31', false, '2026-11-06')).toBe(false);
    expect(deveMostrarIndicacao('2026-10-31', false, '2026-11-07')).toBe(true);
  });

  it('para de aparecer depois que a pessoa abriu a página pelo pop-up', () => {
    expect(deveMostrarIndicacao('2026-10-01', true, '2026-10-31')).toBe(false);
  });
});
