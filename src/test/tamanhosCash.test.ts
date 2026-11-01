import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ABERTURA_DO_CASH, tresBetDoCash } from '@/data/ranges/tamanhosCash';
import { initializeHandState } from '@/data/handState';

describe('tamanhos do cash', () => {
  it('a mesa usa os mesmos tamanhos de abertura do cálculo', () => {
    const script = readFileSync('scripts/build-open-ev.mjs', 'utf8');
    const linha = script.match(/const TAMANHO_DO_CASH = (\{[^}]+\})/)![1];
    const doScript = Object.fromEntries([...linha.matchAll(/(\w+): ([\d.]+)/g)].map((m) => [m[1], Number(m[2])]));
    expect(doScript).toEqual(ABERTURA_DO_CASH);
  });

  it('3-bet: 4x fora de posição (blind contra não blind), 3x em posição', () => {
    expect(tresBetDoCash('BTN', 'BB', 2)).toBe(8);
    expect(tresBetDoCash('CO', 'BTN', 2.5)).toBe(7.5);
    expect(tresBetDoCash('SB', 'BB', 3)).toBe(9);
  });

  it('na mesa do cash o botão abre 2 BB e o UTG 2,5 BB', () => {
    const cartas = [{ rank: 'A', suit: 's' as const }, { rank: 'K', suit: 'h' as const }];
    const seis = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
    const vsBtn = initializeHandState('vs3bet', 'BTN', 100, 'AKo', cartas, [...seis], undefined, false, true);
    expect(vsBtn.actions.find((a) => a.action === 'open')?.amount).toBe(2);
    const bet3 = vsBtn.actions.find((a) => a.action === '3-bet');
    if (bet3) expect([6, 8]).toContain(bet3.amount);
    const torneio = initializeHandState('vs3bet', 'BTN', 100, 'AKo', cartas, [...seis]);
    expect(torneio.actions.find((a) => a.action === 'open')?.amount).toBe(2.5);
  });
});
