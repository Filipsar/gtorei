import { readFileSync, existsSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { DIAS_NO_MENU, passosDoTour, tour, tourAtivo, tourFeito, tourNoMenu } from '@/lib/tour';

describe('tour do GTORei', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    tour.encerrar();
    localStorage.clear();
  });

  it('fica no menu só nos primeiros dias e enquanto não foi feito', () => {
    const agora = new Date('2026-10-28T12:00:00Z').getTime();
    expect(tourNoMenu('2026-10-27T12:00:00Z', false, agora)).toBe(true);
    expect(tourNoMenu(`2026-10-${28 - DIAS_NO_MENU}T11:00:00Z`, false, agora)).toBe(false);
    expect(tourNoMenu('2026-10-27T12:00:00Z', true, agora)).toBe(false);
    expect(tourNoMenu(undefined, false, agora)).toBe(false);
  });

  it('anda, volta e marca como feito ao terminar', () => {
    tour.iniciar();
    expect(tourAtivo()).toBe(true);
    tour.voltar();
    tour.avancar();
    expect(sessionStorage.getItem('gtorei_tour_passo')).toBe('1');
    for (let i = 0; i < passosDoTour().length; i++) tour.avancar();
    expect(tourAtivo()).toBe(false);
    expect(tourFeito()).toBe(true);
  });

  it('cada passo leva a uma rota que existe e a um rei que existe', () => {
    const rotas = readFileSync('src/App.tsx', 'utf8');
    for (const p of passosDoTour()) {
      expect(rotas).toContain(`path="${p.rota}"`);
      expect(existsSync(`public/mascote/${p.rei}.webp`)).toBe(true);
    }
  });
});
