import { describe, expect, it } from 'vitest';
import { linkDoTreino, montarTreino, presetDoLink, temasDoTexto, type MaoResumida } from '@/lib/treinoDaAnalise';
import { MATERIAL } from '@/data/materialDidatico';

const mao = (handId: string, spots: MaoResumida['spots'], posicao: string, stackBb: number, modo: MaoResumida['modo'] = 'rangeTraining'): MaoResumida => ({
  handId,
  cartas: ['As', 'Kd'],
  spots,
  posicao,
  stackBb,
  modo,
});

describe('temasDoTexto', () => {
  it('liga o texto da IA ao tema certo', () => {
    expect(temasDoTexto('Foldando demais contra 3-bet do botão')).toEqual(['vs3bet']);
    expect(temasDoTexto('Dar 3-bet mais vezes no big blind contra o botão')).toEqual(['vsOpenRaise']);
    expect(temasDoTexto('Pagar all-in leve demais com K fraco')).toEqual(['vsOpenShove']);
    expect(temasDoTexto('Abrir menos mãos do UTG')).toEqual(['openRaise']);
    expect(temasDoTexto('Push/fold com 10 BB do botão')).toEqual(['openRaise']);
    expect(temasDoTexto('C-bet em todo flop')).toEqual(['posflop']);
    expect(temasDoTexto('Pagar shove na bolha com stack média')).toEqual(['vsOpenShove', 'icm']);
    expect(temasDoTexto('Diante de 4-bet, largar o blefe')).toEqual(['vs4bet']);
    expect(temasDoTexto('Mantenha a calma')).toEqual([]);
  });

  it('todo tema tem material', () => {
    for (const t of ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'vs4bet', 'icm', 'posflop'] as const) {
      expect(MATERIAL[t].naPratica.length).toBeGreaterThan(0);
    }
  });
});

describe('montarTreino', () => {
  const maos = [
    mao('1', ['vsOpenRaise'], 'BB', 24),
    mao('2', ['vsOpenRaise'], 'BTN', 31),
    mao('3', ['openRaise'], 'UTG+1', 40),
    mao('4', ['openRaise', 'vs3bet'], 'CO', 60),
  ];

  it('usa as posições e stacks das mãos com erro', () => {
    const p = montarTreino('vsOpenRaise', maos, new Set(['1']));
    expect(p).toEqual({ modo: 'rangeTraining', cenarios: ['vsOpenRaise'], posicoes: ['BB'], stacks: [25] });
  });

  it('sem erro no spot, vale toda mão dele; UTG+1 vira UTG1', () => {
    const p = montarTreino('openRaise', maos);
    expect(p.posicoes).toEqual(['UTG1', 'CO']);
    expect(p.stacks).toEqual([40, 60]);
  });

  it('cash vai para 100 BB e as cadeiras do 6-max', () => {
    const p = montarTreino('openRaise', [mao('5', ['openRaise'], 'LJ', 87, 'cash')]);
    expect(p).toEqual({ modo: 'cash', cenarios: ['openRaise'], posicoes: ['UTG'], stacks: [100] });
  });

  it('vs all-in de cash cai no torneio, que tem esse cenário', () => {
    expect(montarTreino('vsOpenShove', [mao('6', ['vsOpenShove'], 'BB', 100, 'cash')]).modo).toBe('rangeTraining');
  });
});

describe('link do treino', () => {
  it('ida e volta pela URL', () => {
    const p = montarTreino('vs3bet', [mao('4', ['openRaise', 'vs3bet'], 'CO', 60)]);
    const url = new URL(linkDoTreino(p), 'https://x');
    expect(url.pathname).toBe('/treinar');
    expect(presetDoLink(url.searchParams)).toEqual(p);
  });

  it('recusa cenário que o modo não tem e limpa posição inválida', () => {
    expect(presetDoLink(new URLSearchParams('treino=vsOpenShove&modo=cash&pos=BB&stack=100'))).toBeNull();
    expect(presetDoLink(new URLSearchParams('treino=simulation&modo=rangeTraining'))).toBeNull();
    const p = presetDoLink(new URLSearchParams('treino=openRaise&modo=rangeTraining&pos=BB,XX&stack=999'));
    expect(p?.posicoes).not.toContain('BB');
    expect(p?.stacks).toEqual([30]);
  });
});
