import { describe, expect, it } from 'vitest';
import { getCashRange } from '@/data/ranges/engine';
import { maoQueAbre, sortearConfiguracaoDaMao } from '@/lib/sorteioDeMao';
import { HAND_ORDER } from '@/data/ranges/handorder.generated';
import type { Position, RangeData } from '@/data/ranges/types';

const combos = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12);
/** % dos 1326 combos que fazem alguma coisa além de foldar */
function largura(r: RangeData): number {
  let s = 0;
  for (const m of r.hands) s += (combos(m.hand) * (100 - (m.actions.find((a) => a.action === 'fold')?.frequency ?? 100))) / 100;
  return (100 * s) / 1326;
}
const acao = (r: RangeData, mao: string) => r.hands.find((h) => h.hand === mao)!.primaryAction;

describe('cash 6-max 100 BB (beta)', () => {
  it('abre mais quanto mais perto do botão', () => {
    const abre = (['UTG', 'HJ', 'CO', 'BTN'] as Position[]).map((p) => largura(getCashRange('openRaise', p)!));
    for (let i = 1; i < abre.length; i++) expect(abre[i]).toBeGreaterThan(abre[i - 1]);
    // Faixa de cash com rake: UTG entre 13% e 20%, botão entre 33% e 48%
    expect(abre[0]).toBeGreaterThan(12);
    expect(abre[0]).toBeLessThan(20);
    expect(abre[3]).toBeGreaterThan(33);
    expect(abre[3]).toBeLessThan(48);
  });

  it('mãos óbvias saem certas', () => {
    for (const p of ['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]) {
      expect(acao(getCashRange('openRaise', p)!, 'AA')).toBe('raise');
      expect(acao(getCashRange('openRaise', p)!, '72o')).toBe('fold');
    }
    expect(acao(getCashRange('vsOpenRaise', 'BB', 'BTN')!, 'AA')).toBe('raise');
  });

  it('o big blind defende mais contra o botão do que contra o UTG', () => {
    expect(largura(getCashRange('vsOpenRaise', 'BB', 'BTN')!)).toBeGreaterThan(largura(getCashRange('vsOpenRaise', 'BB', 'UTG')!));
  });

  it('em posição dá para pagar a abertura, mas pouco: o squeeze de quem fala depois pesa', () => {
    const paga = (r: RangeData) => r.hands.filter((h) => h.actions.some((a) => a.action === 'call' && a.frequency >= 50)).map((h) => h.hand);
    const btn = paga(getCashRange('vsOpenRaise', 'BTN', 'UTG')!);
    // Pares pequenos pagam para tentar a trinca
    expect(btn).toEqual(expect.arrayContaining(['55', '44']));
    expect(largura(getCashRange('vsOpenRaise', 'BTN', 'UTG')!)).toBeLessThan(20);
    // O HJ, com quatro jogadores atrás, praticamente não paga
    expect(paga(getCashRange('vsOpenRaise', 'HJ', 'UTG')!)).toHaveLength(0);
  });

  it('cenário sem cálculo de cash devolve null (cai no corte do 6-max)', () => {
    expect(getCashRange('vsOpenShove', 'CO', 'BTN')).toBeNull();
  });

  it('contra o 3-bet: as mais fortes dão 4-bet pequeno, mão que nem abre folda', () => {
    const r = getCashRange('vs3bet', 'BTN', 'BB')!;
    for (const m of ['AA', 'KK', 'QQ']) expect(acao(r, m)).toBe('raise');
    expect(acao(r, 'KQs')).toBe('call');
    expect(acao(r, '72o')).toBe('fold');
    // 4-bet all-in não existe com 100 BB: o all-in é do 5-bet do vilão
    expect(r.hands.every((h) => !h.actions.some((a) => a.action === 'allin' && a.frequency > 0))).toBe(true);
  });

  it('contra o 3-bet, larga entre 30% e 60% do que abriu', () => {
    const abre = largura(getCashRange('openRaise', 'CO')!);
    const continua = largura(getCashRange('vs3bet', 'CO', 'BTN')!);
    const larga = 100 * (1 - continua / abre);
    expect(larga).toBeGreaterThan(30);
    expect(larga).toBeLessThan(60);
  });

  it('o sorteio do cash é sempre 100 BB, em posição do 6-max', () => {
    for (let i = 0; i < 50; i++) {
      const c = sortearConfiguracaoDaMao({
        modo: 'cash', aleatorio: false, cenarioEscolhido: 'openRaise', cenarioAleatorio: true,
        posicoesEscolhidas: [], posicaoAleatoria: true, stacksEscolhidos: [25], stackAleatorio: false, multiwayLigado: false,
      });
      expect(c.stack).toBe(100);
      expect(['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']).toContain(c.posicao);
      expect(['openRaise', 'vsOpenRaise', 'vs3bet']).toContain(c.cenario);
    }
  });

  it('no vs 3-bet a mão sorteada sempre está na range de abertura do herói', () => {
    const maos = HAND_ORDER as readonly string[];
    const sortear = () => maos[Math.floor(Math.random() * maos.length)];
    const abre = getCashRange('openRaise', 'UTG')!;
    for (let i = 0; i < 300; i++) {
      const m = maoQueAbre(sortear, 'UTG');
      const f = abre.hands.find((h) => h.hand === m)!.actions.find((a) => a.action === 'raise')?.frequency ?? 0;
      expect(f).toBeGreaterThan(0);
    }
  });
});
