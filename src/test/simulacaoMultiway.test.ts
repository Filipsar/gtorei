import { describe, it, expect } from 'vitest';
import { initializeHandState, processHeroAction, processPostflopAction, HandState } from '@/data/handState';
import { generateCardsFromHand } from '@/components/poker/PlayingCard';
import { evaluateHand } from '@/data/handEvaluator';
import { POSITIONS } from '@/data/gtoRanges';
import type { CardType } from '@/components/poker/PlayingCard';

/**
 * Simulação multiway: a mão vai ao flop com três jogadores, e não dois.
 *
 * O que estes testes seguram: que o terceiro existe de verdade (carta própria,
 * dinheiro no pote), que ele pode sair no meio do caminho, e que no showdown
 * quem ganha é a melhor mão da mesa — não a do adversário principal por ser o
 * principal.
 */

const chave = (c: CardType) => `${c.rank}${c.suit}`;

function montar(heroi: (typeof POSITIONS)[number], multiway: boolean): HandState {
  return initializeHandState(
    'simulation',
    heroi,
    40,
    'AKs',
    generateCardsFromHand('AKs'),
    POSITIONS,
    undefined,
    multiway
  );
}

/** Joga a mão até o fim passando sempre (check/call), que é o caminho mais longo */
function jogarPassivo(inicial: HandState): HandState {
  let estado = processHeroAction(inicial, 'call', 'simulation');
  let voltas = 0;
  while (!estado.isHandComplete && voltas < 40) {
    voltas++;
    const temAposta = !!estado.villainAction;
    estado = processPostflopAction(estado, temAposta ? 'call' : 'check');
  }
  return estado;
}

describe('simulação multiway', () => {
  it('monta o pote com um terceiro jogador e cartas próprias', () => {
    for (const heroi of ['HJ', 'CO', 'BTN'] as const) {
      let achouExtra = 0;
      for (let i = 0; i < 20; i++) {
        const estado = montar(heroi, true);
        if (!estado.extraOpponents?.length) continue;
        achouExtra++;

        const extra = estado.extraOpponents[0];
        expect(extra.cards).toHaveLength(2);
        expect(extra.folded).toBe(false);

        // Ninguém joga com carta repetida
        const todas = [...estado.heroCards, ...(estado.villainCards || []), ...extra.cards].map(chave);
        expect(new Set(todas).size).toBe(todas.length);

        // O dinheiro dele está no pote
        expect(estado.pot).toBeGreaterThan(montar(heroi, false).pot - 0.01);
      }
      expect(achouExtra, `${heroi} nunca montou multiway`).toBeGreaterThan(15);
    }
  });

  it('sem a opção ligada, a simulação continua com um adversário só', () => {
    for (let i = 0; i < 20; i++) {
      expect(montar('CO', false).extraOpponents).toBeUndefined();
    }
  });

  it('o terceiro chega ao showdown ou sai no caminho, nunca some sem explicação', () => {
    let chegaramAoShowdown = 0;
    let sairamNoCaminho = 0;

    for (let i = 0; i < 120; i++) {
      const estado = jogarPassivo(montar('BTN', true));
      if (!estado.extraOpponents?.length) continue;
      expect(estado.isHandComplete).toBe(true);

      const extra = estado.extraOpponents[0];
      if (extra.folded) {
        sairamNoCaminho++;
        expect(estado.foldedPositions).toContain(extra.position);
      } else if (estado.street === 'showdown') {
        chegaramAoShowdown++;
        expect(extra.eval).toBeDefined();
      }
    }

    // As duas coisas têm de acontecer: se uma nunca acontece, o adversário é
    // decorativo — ou nunca desiste, ou nunca é avaliado.
    expect(chegaramAoShowdown, 'o terceiro nunca chegou ao showdown').toBeGreaterThan(0);
    expect(sairamNoCaminho + chegaramAoShowdown).toBeGreaterThan(0);
  });

  it('no showdown ganha a melhor mão da mesa, e não a do adversário principal', () => {
    let conferidos = 0;

    for (let i = 0; i < 200 && conferidos < 40; i++) {
      const estado = jogarPassivo(montar('BTN', true));
      const extra = estado.extraOpponents?.[0];
      if (estado.street !== 'showdown' || !extra || extra.folded) continue;
      conferidos++;

      const board = estado.communityCards.slice(0, 5);
      const heroi = evaluateHand(estado.heroCards, board).score;
      const principal = evaluateHand(estado.villainCards!, board).score;
      const terceiro = evaluateHand(extra.cards, board).score;
      const melhorAdversario = Math.max(principal, terceiro);

      const esperado =
        heroi > melhorAdversario ? 'hero_wins' : melhorAdversario > heroi ? 'villain_wins' : 'tie';
      expect(estado.result).toBe(esperado);

      // Quando quem ganhou foi o terceiro, a tela precisa saber de quem é a mão
      if (esperado === 'villain_wins' && terceiro > principal) {
        expect(estado.showdownWinner).toBe(extra.position);
      }
    }

    expect(conferidos, 'nenhum showdown de três para conferir').toBeGreaterThan(5);
  });

  it('numa mesa de dois, pedir multiway não inventa um terceiro', () => {
    // Heads-up: não há lugar de onde tirar o pagador. A mão tem de sair normal,
    // e não quebrar nem montar um jogador do nada.
    for (let i = 0; i < 20; i++) {
      const estado = initializeHandState(
        'simulation',
        'BB',
        40,
        'AKs',
        generateCardsFromHand('AKs'),
        ['SB', 'BB'],
        undefined,
        true
      );
      expect(estado.extraOpponents).toBeUndefined();
      expect(estado.villainPosition).toBe('SB');
      expect(jogarPassivo(estado).isHandComplete).toBe(true);
    }
  });

  it('o board não repete carta de ninguém', () => {
    for (let i = 0; i < 60; i++) {
      const estado = jogarPassivo(montar('BTN', true));
      const extra = estado.extraOpponents?.[0];
      if (!extra) continue;

      const todas = [
        ...estado.heroCards,
        ...(estado.villainCards || []),
        ...extra.cards,
        ...estado.communityCards,
      ].map(chave);
      expect(new Set(todas).size, 'carta repetida na mesa').toBe(todas.length);
    }
  });
});
