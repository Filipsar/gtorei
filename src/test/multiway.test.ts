import { describe, it, expect } from 'vitest';
import { initializeHandState } from '@/data/handState';
import { generateCardsFromHand } from '@/components/poker/PlayingCard';
import { POSITIONS } from '@/data/gtoRanges';

/**
 * O treino Multiway só faz sentido se a mão chegar ao herói com mais de um
 * adversário no pote: quem abriu e pelo menos um que pagou. Com um só na frente
 * seria um heads-up com outro nome.
 *
 * Por isso o herói precisa ter ao menos duas posições agindo antes dele — é o
 * que a tela bloqueia, e é o que este teste confere do lado do motor.
 */
describe('mão de Multiway', () => {
  const posicoesValidas = POSITIONS.filter((_, i) => i >= 2);

  it('monta o pote com quem abriu e pelo menos um pagador', () => {
    for (const heroi of posicoesValidas) {
      // Várias amostras: o número de pagadores é sorteado a cada mão
      for (let tentativa = 0; tentativa < 25; tentativa++) {
        const estado = initializeHandState(
          'multiway',
          heroi,
          20,
          'AKs',
          generateCardsFromHand('AKs'),
          POSITIONS
        );

        expect(estado.villainPosition, `${heroi} ficou sem quem abrisse`).toBeDefined();

        const abriu = estado.actions.filter((a) => a.action === 'open').length;
        const pagaram = estado.actions.filter((a) => a.action === 'call').length;

        expect(abriu, `${heroi}: ninguém abriu`).toBe(1);
        expect(pagaram, `${heroi}: ninguém pagou, o pote não é multiway`).toBeGreaterThanOrEqual(1);
        // Herói + quem abriu + os pagadores
        expect(2 + pagaram).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('o pote já vem maior que o de um pote disputado a dois', () => {
    const doisJogadores = initializeHandState(
      'vsOpenRaise',
      'BTN',
      20,
      'AKs',
      generateCardsFromHand('AKs'),
      POSITIONS
    );
    const multiway = initializeHandState(
      'multiway',
      'BTN',
      20,
      'AKs',
      generateCardsFromHand('AKs'),
      POSITIONS
    );

    expect(multiway.pot).toBeGreaterThan(doisJogadores.pot);
  });
});
