import { describe, it, expect } from 'vitest';
import {
  MODOS_SORTEAVEIS,
  CENARIOS_APOIADOR,
  MODE_POSITIONS,
  cenariosDoModo,
  posicoesDoModo,
  posicoesInvalidas,
  sortearConfiguracaoDaMao,
  sortearModo,
  OpcoesDeSorteio,
  TrainingMode,
} from '@/lib/sorteioDeMao';
import { STACK_SIZES, Scenario } from '@/data/gtoRanges';

/**
 * O sorteio da mão.
 *
 * O que estes testes seguram: que o modo aleatório nunca monta uma mão
 * impossível. Sortear cenário e posição de forma independente parece inofensivo
 * até sair "vs 3bet no heads-up", que não tem posição nenhuma que sirva — e aí
 * a mão nasce sem herói.
 */

const base: OpcoesDeSorteio = {
  modo: 'rangeTraining',
  aleatorio: false,
  cenarioEscolhido: 'openRaise',
  cenarioAleatorio: false,
  posicoesEscolhidas: ['UTG'],
  posicaoAleatoria: false,
  stacksEscolhidos: [30],
  stackAleatorio: false,
  multiwayLigado: false,
};

function sortear(extra: Partial<OpcoesDeSorteio>) {
  return sortearConfiguracaoDaMao({ ...base, ...extra });
}

describe('sorteio da mão', () => {
  it('a posição sorteada sempre serve ao cenário sorteado', () => {
    for (const modo of MODOS_SORTEAVEIS) {
      for (let i = 0; i < 200; i++) {
        const { cenario, posicao, multiway } = sortear({ modo, aleatorio: true });

        expect(posicao, `${modo}/${cenario} saiu sem posição`).toBeDefined();
        expect(posicoesDoModo(modo)).toContain(posicao);
        expect(
          posicoesInvalidas(cenario, modo, multiway),
          `${modo}: ${posicao} não pode jogar ${cenario}${multiway ? ' multiway' : ''}`
        ).not.toContain(posicao);
      }
    }
  });

  it('no heads-up o vs 3bet nunca é sorteado, porque não tem onde caber', () => {
    // Está na lista do modo, mas o herói precisaria de alguém antes e alguém
    // depois — no 1x1 não existem os dois. Antes esta combinação saía e a mão
    // ficava sem posição.
    expect(cenariosDoModo('hu')).toContain('vs3bet');
    expect(posicoesInvalidas('vs3bet', 'hu')).toEqual(
      expect.arrayContaining(MODE_POSITIONS.hu)
    );

    const saiu = new Set<Scenario>();
    for (let i = 0; i < 300; i++) saiu.add(sortear({ modo: 'hu', aleatorio: true }).cenario);
    expect([...saiu]).not.toContain('vs3bet');
  });

  it('no aleatório o que está marcado na tela não vale mais', () => {
    const cenarios = new Set<Scenario>();
    const posicoes = new Set<string>();
    const stacks = new Set<number>();

    for (let i = 0; i < 300; i++) {
      const c = sortear({ modo: 'rangeTraining', aleatorio: true });
      cenarios.add(c.cenario);
      posicoes.add(c.posicao);
      stacks.add(c.stack);
    }

    // As escolhas de `base` são openRaise / UTG / 30BB. Se o aleatório as
    // respeitasse, cada conjunto teria um elemento só.
    expect(cenarios.size).toBeGreaterThan(1);
    expect(posicoes.size).toBeGreaterThan(1);
    expect(stacks.size).toBeGreaterThan(1);
    expect(stacks.size).toBe(STACK_SIZES.length);
  });

  it('fora do aleatório, o que está marcado é respeitado', () => {
    for (let i = 0; i < 50; i++) {
      const c = sortear({ cenarioEscolhido: 'vsOpenRaise', posicoesEscolhidas: ['CO'], stacksEscolhidos: [15] });
      expect(c.cenario).toBe('vsOpenRaise');
      expect(c.posicao).toBe('CO');
      expect(c.stack).toBe(15);
      expect(c.multiway).toBe(false);
    }
  });

  it('quem não apoia não recebe cenário de apoiador nem por sorteio', () => {
    const bloqueado = (s: Scenario) => CENARIOS_APOIADOR.includes(s);

    for (const modo of MODOS_SORTEAVEIS) {
      // O fallback só entra se o modo não tiver nenhum cenário liberado; se
      // isso acontecesse, o bloqueio vazaria.
      expect(cenariosDoModo(modo).filter(s => !bloqueado(s)).length).toBeGreaterThan(0);

      for (let i = 0; i < 200; i++) {
        const { cenario } = sortear({ modo, aleatorio: true, bloqueado });
        expect(CENARIOS_APOIADOR, `${modo} liberou ${cenario}`).not.toContain(cenario);
      }
    }
  });

  it('multiway só aparece na simulação, e no aleatório aparece dos dois jeitos', () => {
    const com = new Set<boolean>();

    for (let i = 0; i < 400; i++) {
      const { cenario, multiway } = sortear({ modo: 'rangeTraining', aleatorio: true });
      if (multiway) expect(cenario).toBe('simulation');
      if (cenario === 'simulation') com.add(multiway);
    }

    expect([...com].sort(), 'no aleatório o multiway deveria variar').toEqual([false, true]);
  });

  it('no heads-up a simulação nunca vira multiway: não há terceiro lugar', () => {
    for (let i = 0; i < 200; i++) {
      expect(sortear({ modo: 'hu', aleatorio: true, multiwayLigado: true }).multiway).toBe(false);
    }
  });

  it('sortearModo devolve só modo que existe, e cobre os quatro', () => {
    const saiu = new Set<TrainingMode>();
    for (let i = 0; i < 400; i++) saiu.add(sortearModo());
    expect([...saiu].sort()).toEqual([...MODOS_SORTEAVEIS].sort());
  });
});
