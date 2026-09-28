import { describe, it, expect } from 'vitest';
import {
  initializeHandState,
  processHeroAction,
  processPostflopAction,
  avancarRua,
  HandState,
} from '@/data/handState';
import { desviarDaLinha, CHANCE_DE_ERRO, VillainDecision } from '@/data/villainGTO';
import { generateCardsFromHand } from '@/components/poker/PlayingCard';
import { POSITIONS } from '@/data/gtoRanges';

/**
 * O vilão precisa ser visível.
 *
 * O defeito que estes testes seguram: pagar e virar a carta seguinte
 * aconteciam no mesmo instante, e `dealNextStreet` apagava a ação e as fichas
 * dele antes de chegarem à tela. Sobravam visíveis só as jogadas que exigiam
 * resposta — bet, raise, fold —, e de fora parecia que o vilão fazia sempre o
 * mesmo que o herói. Medindo 400 mãos antes do conserto: 45% das apostas do
 * herói e 61% dos checks não mostravam reação nenhuma.
 */

function novaMao(heroi: (typeof POSITIONS)[number] = 'BTN'): HandState {
  return initializeHandState(
    'simulation', heroi, 40, 'AKs', generateCardsFromHand('AKs'), POSITIONS,
  );
}

/** Joga a mão inteira, anotando o que o jogador teria visto em cada parada */
function jogar(heroi: (typeof POSITIONS)[number], minhaJogada: 'check' | 'bet') {
  const vistas: string[] = [];
  let s = processHeroAction(novaMao(heroi), 'call', 'simulation');
  let voltas = 0;

  while (!s.isHandComplete && voltas++ < 30) {
    if (s.aguardandoAvanco) {
      vistas.push(s.lastVillainAction ?? 'INVISÍVEL');
      s = avancarRua(s);
      continue;
    }
    const antes = s.street;
    s = processPostflopAction(s, s.villainAction ? 'call' : minhaJogada, 0.5);
    if (!s.aguardandoAvanco && s.lastVillainAction) vistas.push(s.lastVillainAction);
    if (s.street === antes && !s.villainAction && !s.aguardandoAvanco && !s.isHandComplete) break;
  }
  return { estado: s, vistas };
}

describe('o vilão na tela', () => {
  it('pagar e dar check param a mão para a tela mostrar', () => {
    // Contar só o que era invisível antes não basta: fold e river sempre
    // apareceram. O que este teste exige é a PARADA existir no flop e no turn,
    // que é exatamente o que o código antigo não fazia.
    let paradasNoMeioDaMao = 0;
    let invisiveis = 0;

    for (let i = 0; i < 150; i++) {
      let s = processHeroAction(novaMao('BTN'), 'call', 'simulation');
      let voltas = 0;
      while (!s.isHandComplete && voltas++ < 30) {
        if (s.aguardandoAvanco) {
          if (s.street === 'flop' || s.street === 'turn') paradasNoMeioDaMao++;
          if (!s.lastVillainAction) invisiveis++;
          s = avancarRua(s);
          continue;
        }
        const antes = s.street;
        s = processPostflopAction(s, s.villainAction ? 'call' : (i % 2 ? 'check' : 'bet'), 0.5);
        if (s.street === antes && !s.villainAction && !s.aguardandoAvanco && !s.isHandComplete) break;
      }
    }

    expect(paradasNoMeioDaMao, 'a rua virou sem parar para mostrar o vilão').toBeGreaterThan(80);
    expect(invisiveis, 'parou, mas sem dizer o que ele fez').toBe(0);
  });

  it('quando ele paga, as fichas ficam na mesa e só entram no pote na virada', () => {
    let conferidos = 0;

    for (let i = 0; i < 200 && conferidos < 25; i++) {
      let s = processHeroAction(novaMao('BTN'), 'call', 'simulation');
      let voltas = 0;

      while (!s.isHandComplete && voltas++ < 30) {
        if (s.aguardandoAvanco) {
          const fichas = s.fichasDoVilao ?? 0;
          if (fichas > 0) {
            conferidos++;
            // Na pausa: fichas na frente dele, pote ainda sem elas
            const naFrente = (s.activeBets ?? []).find((b) => b.position === s.villainPosition);
            expect(naFrente?.amount, 'as fichas do call não aparecem na mesa').toBeCloseTo(fichas, 5);
            const potePausa = s.pot;

            const depois = avancarRua(s);
            // Na virada: o pote cresce exatamente o que estava na frente dele
            expect(depois.pot).toBeCloseTo(potePausa + fichas, 5);
            expect(depois.fichasDoVilao, 'ficha contada duas vezes').toBeUndefined();
            s = depois;
            continue;
          }
          s = avancarRua(s);
          continue;
        }
        const antes = s.street;
        s = processPostflopAction(s, s.villainAction ? 'call' : 'bet', 0.5);
        if (s.street === antes && !s.villainAction && !s.aguardandoAvanco && !s.isHandComplete) break;
      }
    }

    expect(conferidos, 'ele nunca pagou uma aposta em 200 mãos').toBeGreaterThan(5);
  });

  it('no fim da mão as cartas dele estão abertas, com ou sem showdown', () => {
    let semShowdown = 0;

    for (let i = 0; i < 120; i++) {
      const { estado } = jogar('BTN', i % 2 ? 'check' : 'bet');
      expect(estado.isHandComplete).toBe(true);
      expect(estado.villainCardsRevealed, 'mão acabou com as cartas dele fechadas').toBe(true);
      if (estado.street !== 'showdown') {
        semShowdown++;
        // Desistiu: a tela joga as cartas dele na mesa
        expect(estado.villainMucked).toBe(true);
      }
    }

    expect(semShowdown, 'nenhuma mão terminou sem showdown para conferir').toBeGreaterThan(0);
  });
});

describe('o vilão erra de propósito', () => {
  const linha = (action: VillainDecision['action']): VillainDecision =>
    ({ action, description: action });

  it('desvia na frequência combinada, e não mais que isso', () => {
    const n = 20000;
    let desvios = 0;
    for (let i = 0; i < n; i++) {
      if (desviarDaLinha(linha('call')).erroProposital) desvios++;
    }
    const taxa = desvios / n;
    expect(taxa).toBeGreaterThan(CHANCE_DE_ERRO - 0.02);
    expect(taxa).toBeLessThan(CHANCE_DE_ERRO + 0.02);
  });

  it('o erro é sempre uma jogada plausível, nunca aleatória', () => {
    // Pagar quando devia passar é o erro clássico; virar all-in do nada, não.
    const vizinho: Record<string, string> = {
      fold: 'call', call: 'fold', check: 'bet', raise: 'call', bet: 'check',
    };
    for (const [certa, esperada] of Object.entries(vizinho)) {
      const desviada = desviarDaLinha(linha(certa as VillainDecision['action']), () => 0);
      expect(desviada.action, `${certa} desviou para algo estranho`).toBe(esperada);
      expect(desviada.erroProposital).toBe(true);
    }
  });

  it('sem sorteio favorável, a linha certa passa intacta', () => {
    for (const a of ['fold', 'call', 'check', 'raise', 'bet'] as const) {
      const igual = desviarDaLinha(linha(a), () => 0.99);
      expect(igual.action).toBe(a);
      expect(igual.erroProposital).toBeUndefined();
    }
  });
});
