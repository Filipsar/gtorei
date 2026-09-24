import { describe, it, expect } from 'vitest';
import { getRange, calculateFeedback, STACK_SIZES, Scenario, Position, GameMode } from '@/data/gtoRanges';
import { MODE_POSITIONS, cenariosDoModo, posicoesInvalidas, TrainingMode } from '@/lib/sorteioDeMao';

/**
 * A range que dá a nota nunca pode ser 100% fold.
 *
 * Era o que acontecia na Simulação em HU e Three Hand: a tabela de modos só
 * declarava openRaise, vsOpenRaise, vs3bet e vsOpenShove, então a busca por
 * `simulation` voltava vazia e virava 0% raise, 0% call, 0% all-in. Resultado:
 * o treino dava +15 pontos para quem passava AA e -8 para quem jogava.
 */

const MODO_DE_JOGO: Record<TrainingMode, GameMode> = {
  rangeTraining: '8max',
  hu: 'hu',
  threeHand: 'threehand',
  bounty: 'bounty',
};

const MODOS = Object.keys(MODO_DE_JOGO) as TrainingMode[];

/** Todo par modo/cenário/posição que o treino realmente consegue sortear */
function combinacoesJogaveis(): Array<{ modo: TrainingMode; cenario: Scenario; posicao: Position }> {
  const fora: Array<{ modo: TrainingMode; cenario: Scenario; posicao: Position }> = [];
  for (const modo of MODOS) {
    for (const cenario of cenariosDoModo(modo)) {
      const invalidas = posicoesInvalidas(cenario, modo, false);
      for (const posicao of MODE_POSITIONS[modo]) {
        if (!invalidas.includes(posicao)) fora.push({ modo, cenario, posicao });
      }
    }
  }
  return fora;
}

describe('ranges da simulação', () => {
  it('nenhuma combinação jogável devolve uma range 100% fold', () => {
    const quebradas: string[] = [];

    for (const { modo, cenario, posicao } of combinacoesJogaveis()) {
      for (const stack of STACK_SIZES) {
        const range = getRange(cenario, posicao, stack, false, MODO_DE_JOGO[modo], 0, 3, undefined);
        const acoes = new Set(range.hands.map(h => h.primaryAction));
        if (acoes.size === 1 && acoes.has('fold')) {
          quebradas.push(`${modo}/${cenario}/${posicao}/${stack}BB`);
        }
      }
    }

    expect(quebradas, `range vazia em ${quebradas.length} combinações`).toEqual([]);
  });

  it('a simulação herda o vsOpenRaise em todos os modos', () => {
    // No pré-flop os dois são o mesmo spot: alguém abriu e o herói responde.
    // Se um dia divergirem de propósito, este teste é o lugar de dizer isso.
    for (const modo of MODOS) {
      if (!cenariosDoModo(modo).includes('simulation')) continue;
      const invalidas = posicoesInvalidas('simulation', modo, false);

      for (const posicao of MODE_POSITIONS[modo]) {
        if (invalidas.includes(posicao)) continue;
        for (const stack of [8, 25, 60]) {
          const sim = getRange('simulation', posicao, stack, false, MODO_DE_JOGO[modo], 0, 3, undefined);
          const vs = getRange('vsOpenRaise', posicao, stack, false, MODO_DE_JOGO[modo], 0, 3, undefined);
          expect(
            sim.hands.map(h => h.primaryAction),
            `${modo}/${posicao}/${stack}BB`
          ).toEqual(vs.hands.map(h => h.primaryAction));
        }
      }
    }
  });

  it('passar AA nunca vale ponto, e jogar AA nunca é erro', () => {
    // A forma mais direta de ver a range vazia: com ela, fold de AA dava +15.
    for (const modo of MODOS) {
      if (!cenariosDoModo(modo).includes('simulation')) continue;
      const invalidas = posicoesInvalidas('simulation', modo, false);

      for (const posicao of MODE_POSITIONS[modo]) {
        if (invalidas.includes(posicao)) continue;
        for (const stack of [8, 25, 100]) {
          const range = getRange('simulation', posicao, stack, false, MODO_DE_JOGO[modo], 0, 3, undefined);
          const aa = range.hands.find(h => h.hand === 'AA')!;
          const onde = `${modo}/${posicao}/${stack}BB`;

          expect(aa.primaryAction, `${onde}: AA virou fold`).not.toBe('fold');
          expect(calculateFeedback('fold', aa, 3).points, `${onde}: fold de AA premiado`).toBeLessThan(0);
          expect(
            calculateFeedback(aa.primaryAction, aa, 3).points,
            `${onde}: jogar AA punido`
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});
