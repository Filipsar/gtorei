// Trava os erros de range encontrados na auditoria de setembro/2026.
import { describe, it, expect } from 'vitest';
import { getRange } from '@/data/gtoRanges';
import type { GameMode, Position, Scenario } from '@/data/ranges/types';

const combos = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12);
const TOTAL_COMBOS = 1326;

function analisar(scenario: Scenario, position: Position, stack: number, mode: GameMode = '8max') {
  const range = getRange(scenario, position, stack, false, mode, 0);
  const freq = (h: any, a: string) => h.actions.find((x: any) => x.action === a)?.frequency ?? 0;
  let agressivoCombos = 0;
  let pagarCombos = 0;
  const agressivo: string[] = [];
  const pagar: string[] = [];
  for (const h of range.hands) {
    const agg = freq(h, 'raise') + freq(h, 'allin');
    if (agg > 0) agressivo.push(h.hand);
    if (freq(h, 'call') > 0) pagar.push(h.hand);
    agressivoCombos += (combos(h.hand) * agg) / 100;
    pagarCombos += (combos(h.hand) * freq(h, 'call')) / 100;
  }
  return {
    pctAgressivo: (agressivoCombos / TOTAL_COMBOS) * 100,
    pctPagar: (pagarCombos / TOTAL_COMBOS) * 100,
    agressivo,
    pagar,
    hands: range.hands,
  };
}

describe('largura das ranges', () => {
  // O corte era por classe de mão (169) em vez de combos (1326), e toda range
  // saía ~30% mais estreita do que o configurado.
  it('abertura de 30bb fica perto do configurado', () => {
    expect(analisar('openRaise', 'UTG', 30).pctAgressivo).toBeGreaterThan(12);
    expect(analisar('openRaise', 'UTG', 30).pctAgressivo).toBeLessThan(17);
    expect(analisar('openRaise', 'CO', 30).pctAgressivo).toBeGreaterThan(24);
    expect(analisar('openRaise', 'BTN', 30).pctAgressivo).toBeGreaterThan(40);
  });

  it('abre mais quanto mais perto do botão', () => {
    const utg = analisar('openRaise', 'UTG', 30).pctAgressivo;
    const co = analisar('openRaise', 'CO', 30).pctAgressivo;
    const btn = analisar('openRaise', 'BTN', 30).pctAgressivo;
    expect(utg).toBeLessThan(co);
    expect(co).toBeLessThan(btn);
  });
});

describe('composição da range de abertura', () => {
  const utg = analisar('openRaise', 'UTG', 30).agressivo;

  it('inclui os pares médios que toda tabela abre de UTG', () => {
    for (const mao of ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66']) {
      expect(utg, `${mao} deveria estar na range de UTG`).toContain(mao);
    }
  });

  it('inclui os broadways fortes', () => {
    for (const mao of ['AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'QJs', 'AKo', 'AQo', 'AJo', 'KQo']) {
      expect(utg, `${mao} deveria estar na range de UTG`).toContain(mao);
    }
  });

  it('não abre lixo de UTG', () => {
    for (const mao of ['Q8s', 'J8s', 'T8s', 'K7s', 'K5s', 'Q9o', 'J9o', 'K9o', '72o', '32o']) {
      expect(utg, `${mao} não deveria abrir de UTG`).not.toContain(mao);
    }
  });
});

describe('push/fold calculado por EV', () => {
  // Conferidos contra tabelas Nash publicadas (chipEV, sem ante)
  it('heads-up 10bb: SB dá all-in em torno de 55%', () => {
    const r = analisar('openRaise', 'SB', 10, 'hu');
    expect(r.pctAgressivo).toBeGreaterThan(48);
    expect(r.pctAgressivo).toBeLessThan(65);
  });

  it('mesmo spot dá o mesmo resultado em 8max e heads-up', () => {
    // SB a 10bb só tem o BB atrás nos dois casos; foi um bug real quando o
    // 8max dava 85% e o heads-up 55%.
    const hu = analisar('openRaise', 'SB', 10, 'hu').pctAgressivo;
    const oito = analisar('openRaise', 'SB', 10, '8max').pctAgressivo;
    expect(Math.abs(hu - oito)).toBeLessThan(3);
  });

  it('8max 10bb: aperta da posição inicial para a final', () => {
    const utg = analisar('openRaise', 'UTG', 10).pctAgressivo;
    const co = analisar('openRaise', 'CO', 10).pctAgressivo;
    const btn = analisar('openRaise', 'BTN', 10).pctAgressivo;
    expect(utg).toBeGreaterThan(6);
    expect(utg).toBeLessThan(15);
    expect(btn).toBeGreaterThan(co);
    expect(co).toBeGreaterThan(utg);
  });

  it('stack menor significa all-in mais largo', () => {
    const oito = analisar('openRaise', 'BTN', 8).pctAgressivo;
    const vinte = analisar('openRaise', 'BTN', 20).pctAgressivo;
    expect(oito).toBeGreaterThan(vinte);
  });

  it('paga mais largo contra o SB do que contra o UTG', () => {
    const vsSB = getRange('vsOpenShove', 'BB', 10, false, '8max', 0, 3, 'SB');
    const vsUTG = getRange('vsOpenShove', 'BB', 10, false, '8max', 0, 3, 'UTG');
    const largura = (r: any) =>
      r.hands.reduce((acc: number, h: any) =>
        acc + (combos(h.hand) * (h.actions.find((x: any) => x.action === 'call')?.frequency ?? 0)) / 100, 0);
    expect(largura(vsSB)).toBeGreaterThan(largura(vsUTG) * 2);
  });

  it('traz EV real em bb, não número sintético', () => {
    const r = analisar('openRaise', 'BTN', 10);
    const aa = r.hands.find((h: any) => h.hand === 'AA');
    const lixo = r.hands.find((h: any) => h.hand === '32o');
    const evDe = (h: any, a: string) => h?.actions.find((x: any) => x.action === a)?.ev ?? 0;
    expect(evDe(aa, 'allin')).toBeGreaterThan(evDe(lixo, 'allin'));
    expect(evDe(aa, 'allin')).toBeGreaterThan(1);
  });
});
