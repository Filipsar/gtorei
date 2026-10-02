// Trava a abertura calculada por EV (scripts/build-open-ev.mjs, 02/10/2026).
//
// Origem: um jogador mostrou que o UTG com 100 BB abria 11,2% dos combos,
// contra ~16% de solver de torneio com ante. A abertura era um corte fixo por
// posição, sem ante e calibrado em 30 BB, que ainda apertava acima disso.
import { describe, it, expect } from 'vitest';
import { getRange } from '@/data/gtoRanges';
import { STACK_SIZES, type GameMode, type Position } from '@/data/ranges/types';

const combos = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12);
const freq = (h: any, a: string) => h.actions.find((x: any) => x.action === a)?.frequency ?? 0;
const ev = (h: any, a: string) => h.actions.find((x: any) => x.action === a)?.ev ?? 0;

function abertura(position: Position, stack: number, mode: GameMode = '8max') {
  const r = getRange('openRaise', position, stack, false, mode, 0);
  let abre = 0, allin = 0;
  for (const h of r.hands) {
    abre += (combos(h.hand) * (freq(h, 'raise') + freq(h, 'allin'))) / 100;
    allin += (combos(h.hand) * freq(h, 'allin')) / 100;
  }
  return { pct: (100 * abre) / 1326, pctAllin: (100 * allin) / 1326, hands: r.hands };
}

const OITO: Position[] = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];

describe('abertura por EV: largura', () => {
  it('UTG com 100 BB abre na faixa de solver com ante, não os 11% de antes', () => {
    const { pct } = abertura('UTG', 100);
    expect(pct).toBeGreaterThan(13);
    expect(pct).toBeLessThan(19);
  });

  it('com 100 BB a abertura cresce posição a posição até o botão', () => {
    const larguras = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN'].map((p) => abertura(p as Position, 100).pct);
    for (let i = 1; i < larguras.length; i++) expect(larguras[i]).toBeGreaterThan(larguras[i - 1]);
  });

  it('não repete os erros do desenvolvimento (botão a 98%, UTG a 67%)', () => {
    expect(abertura('BTN', 100).pct).toBeLessThan(60);
    expect(abertura('UTG', 20).pct).toBeLessThan(20);
  });

  it('não tem degrau entre stacks vizinhos (era 43,5% com 30 BB e 32% com 25)', () => {
    for (const p of OITO) {
      for (let i = 1; i < STACK_SIZES.length; i++) {
        const a = abertura(p, STACK_SIZES[i - 1]).pct, b = abertura(p, STACK_SIZES[i]).pct;
        expect(Math.abs(a - b), `${p} ${STACK_SIZES[i - 1]}→${STACK_SIZES[i]} BB`).toBeLessThan(8);
      }
    }
  });
});

describe('abertura por EV: tamanho', () => {
  it('stack curto vai de all-in, stack fundo abre pequeno', () => {
    const curto = abertura('UTG', 10), fundo = abertura('UTG', 100);
    expect(curto.pctAllin / curto.pct).toBeGreaterThan(0.9);
    expect(fundo.pctAllin / fundo.pct).toBeLessThan(0.02);
  });

  it('com 20 BB o botão mistura abrir pequeno e all-in (antes só existia all-in até 20 BB)', () => {
    const { pct, pctAllin } = abertura('BTN', 20);
    expect(pctAllin).toBeGreaterThan(0);
    expect(pct - pctAllin).toBeGreaterThan(5);
  });
});

describe('abertura por EV: composição', () => {
  it('as premium abrem de toda posição em todo stack', () => {
    for (const p of OITO) for (const s of STACK_SIZES) {
      const { hands } = abertura(p, s);
      for (const m of ['AA', 'KK', 'QQ', 'AKs', 'AKo']) {
        const h = hands.find((x) => x.hand === m)!;
        expect(freq(h, 'raise') + freq(h, 'allin'), `${m} ${p} ${s}BB`).toBeGreaterThanOrEqual(95);
      }
    }
  });

  it('72o e 32o nunca abrem do UTG ao CO', () => {
    for (const p of ['UTG', 'UTG1', 'LJ', 'HJ', 'CO'] as Position[]) for (const s of STACK_SIZES) {
      const { hands } = abertura(p, s);
      for (const m of ['72o', '32o']) {
        const h = hands.find((x) => x.hand === m)!;
        expect(freq(h, 'fold'), `${m} ${p} ${s}BB`).toBe(100);
      }
    }
  });

  it('o botão com 100 BB abre todo ás offsuit', () => {
    const { hands } = abertura('BTN', 100);
    for (const m of ['A2o', 'A3o', 'A4o', 'A5o', 'A6o', 'A7o', 'A8o', 'A9o']) {
      const h = hands.find((x) => x.hand === m)!;
      expect(freq(h, 'raise') + freq(h, 'allin'), m).toBeGreaterThanOrEqual(90);
    }
  });
});

describe('abertura por EV: consistência', () => {
  it('frequências somam 100 em toda mesa, posição e stack', () => {
    const mesas: [GameMode, Position[]][] = [
      ['8max', OITO], ['6max', ['UTG', 'HJ', 'CO', 'BTN', 'SB']],
      ['threehand', ['BTN', 'SB']], ['hu', ['SB']],
    ];
    for (const [modo, posicoes] of mesas) for (const p of posicoes) for (const s of STACK_SIZES) {
      for (const h of abertura(p, s, modo).hands) {
        const soma = h.actions.reduce((t, a) => t + a.frequency, 0);
        expect(soma, `${modo} ${p} ${s}BB ${h.hand}`).toBe(100);
      }
    }
  });

  it('a ação principal é a de EV mais alto quando a mão não mistura', () => {
    for (const p of OITO) for (const s of [10, 30, 100]) {
      for (const h of abertura(p, s).hands) {
        if (freq(h, 'raise') === 100) {
          expect(ev(h, 'raise'), `${h.hand} ${p} ${s}BB`).toBeGreaterThan(0);
          expect(ev(h, 'raise') + 0.15, `${h.hand} ${p} ${s}BB`).toBeGreaterThanOrEqual(ev(h, 'allin'));
        }
        if (freq(h, 'fold') === 100) {
          expect(ev(h, 'raise'), `${h.hand} ${p} ${s}BB`).toBeLessThan(0.15);
        }
      }
    }
  });

  it('mesa final e bounty continuam no modelo antigo, sem quebrar', () => {
    const final = getRange('openRaise', 'CO', 30, true, '8max', 0);
    const bounty = getRange('openRaise', 'CO', 30, false, 'bounty', 1.5);
    for (const r of [final, bounty]) {
      expect(r.hands).toHaveLength(169);
      for (const h of r.hands) expect(h.actions.reduce((t, a) => t + a.frequency, 0)).toBe(100);
    }
  });
});
