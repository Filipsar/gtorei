import { beforeEach, describe, expect, it } from 'vitest';
import {
  avisoDoDiscordPendente,
  deveMostrarAviso,
  diaEmBrasilia,
  marcarAvisoVistoHoje,
  marcarQueEntrou,
} from '@/lib/avisoDoDiscord';

describe('aviso do Discord', () => {
  beforeEach(() => localStorage.clear());

  it('o dia vira à meia-noite de Brasília, não de Londres', () => {
    // 02:30 UTC do dia 27 ainda é 23:30 do dia 26 em Brasília
    expect(diaEmBrasilia(new Date('2026-10-27T02:30:00Z'))).toBe('2026-10-26');
    expect(diaEmBrasilia(new Date('2026-10-27T03:30:00Z'))).toBe('2026-10-27');
  });

  it('aparece uma vez por dia', () => {
    expect(deveMostrarAviso(null, false, '2026-10-26')).toBe(true);
    expect(deveMostrarAviso('2026-10-26', false, '2026-10-26')).toBe(false);
    expect(deveMostrarAviso('2026-10-25', false, '2026-10-26')).toBe(true);
  });

  it('para de aparecer depois que a pessoa clica para entrar', () => {
    expect(deveMostrarAviso(null, true, '2026-10-26')).toBe(false);
  });

  it('lembra no navegador o dia em que já apareceu', () => {
    const hoje = new Date('2026-10-26T15:00:00Z');
    const amanha = new Date('2026-10-27T15:00:00Z');
    expect(avisoDoDiscordPendente(hoje)).toBe(true);
    marcarAvisoVistoHoje(hoje);
    expect(avisoDoDiscordPendente(hoje)).toBe(false);
    expect(avisoDoDiscordPendente(amanha)).toBe(true);
    marcarQueEntrou();
    expect(avisoDoDiscordPendente(amanha)).toBe(false);
  });
});
