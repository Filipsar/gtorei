import { describe, expect, it } from 'vitest';
import { diasRestantes } from '@/lib/periodo';

describe('dias restantes do período (dia de Brasília)', () => {
  // 23/10/2026, 15h em Brasília (18h UTC)
  const agora = new Date('2026-10-23T18:00:00Z');

  it('conta hoje: o último dia vale 1', () => {
    expect(diasRestantes('2026-10-23', agora)).toBe(1);
    expect(diasRestantes('2026-10-25', agora)).toBe(3);
    expect(diasRestantes('2026-10-31', agora)).toBe(9);
  });

  it('usa o dia de Brasília, não o UTC: 23h30 de sexta ainda é sexta', () => {
    const sextaNoite = new Date('2026-10-24T02:30:00Z'); // 23h30 de 23/10 em Brasília
    expect(diasRestantes('2026-10-25', sextaNoite)).toBe(3);
  });
});
