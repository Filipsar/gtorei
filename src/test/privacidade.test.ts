import { beforeEach, describe, expect, it } from 'vitest';
import { anonimizarMaos } from '@/lib/anonimizarMaos';
import { lerConsentimento, podePersonalizarAnuncios, salvarConsentimento } from '@/lib/consentimento';

describe('hand history anonimizado antes da IA', () => {
  const mao = {
    handId: '1',
    heroName: 'filipe_reg',
    players: [
      { seat: 1, name: 'filipe_reg', chips: 1000, isHero: true },
      { seat: 2, name: 'TubaraoSP', chips: 900, isHero: false },
      { seat: 3, name: 'peixe99', chips: 500, isHero: false },
    ],
    actions: [
      { street: 'preflop', player: 'TubaraoSP', action: 'raise', isHero: false },
      { street: 'preflop', player: 'filipe_reg', action: 'call', isHero: true },
      { street: 'flop', player: 'TubaraoSP', action: 'bet', isHero: false },
    ],
  };

  it('nenhum apelido real sobra no que vai para o servidor', () => {
    const texto = JSON.stringify(anonimizarMaos([mao]));
    expect(texto).not.toMatch(/filipe_reg|TubaraoSP|peixe99/);
  });

  it('o mesmo jogador vira sempre o mesmo vilão, e a mão continua legível', () => {
    const [m] = anonimizarMaos([mao]);
    expect(m.players.map((p) => p.name)).toEqual(['Herói', 'Vilão 1', 'Vilão 2']);
    expect(m.actions.map((a) => a.player)).toEqual(['Vilão 1', 'Herói', 'Vilão 1']);
    expect(m.players[1].chips).toBe(900);
  });
});

describe('consentimento de anúncio personalizado', () => {
  beforeEach(() => localStorage.clear());

  it('sem escolha, não personaliza', () => {
    expect(lerConsentimento()).toBeNull();
    expect(podePersonalizarAnuncios()).toBe(false);
  });

  it('guarda a escolha e permite mudar de ideia', () => {
    salvarConsentimento(true);
    expect(podePersonalizarAnuncios()).toBe(true);
    salvarConsentimento(false);
    expect(podePersonalizarAnuncios()).toBe(false);
  });
});
