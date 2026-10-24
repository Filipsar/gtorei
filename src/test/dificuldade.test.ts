import { describe, expect, it } from 'vitest';
import {
  JANELA,
  MAOS_MARGINAIS,
  ajustarPontos,
  dificuldadeInicial,
  limitarPontos,
  pesarPorCenario,
  registrarNoAuto,
  sortearMao,
  type EstadoAuto,
} from '@/lib/dificuldade';

const rodada = (estado: EstadoAuto, acertos: number) => {
  let e = estado;
  let ajuste = null;
  for (let i = 0; i < JANELA; i++) {
    const r = registrarNoAuto(e, i < acertos);
    e = r.estado;
    ajuste = r.ajuste ?? ajuste;
  }
  return { e, ajuste };
};

describe('dificuldade automática', () => {
  it('só decide depois de uma janela inteira', () => {
    let e: EstadoAuto = { atual: 'media', recentes: [] };
    for (let i = 0; i < JANELA - 1; i++) e = registrarNoAuto(e, true).estado;
    expect(e.atual).toBe('media');
    expect(e.recentes).toHaveLength(JANELA - 1);
  });

  it('sobe com 85%+ e desce com 60% ou menos', () => {
    expect(rodada({ atual: 'media', recentes: [] }, 17).e.atual).toBe('dificil'); // 85%
    expect(rodada({ atual: 'media', recentes: [] }, 12).e.atual).toBe('facil'); // 60%
    expect(rodada({ atual: 'media', recentes: [] }, 15).e.atual).toBe('media'); // 75%: fica
  });

  it('não passa dos extremos e conta os acertos do ajuste', () => {
    expect(rodada({ atual: 'elite', recentes: [] }, 20).ajuste).toBeNull();
    expect(rodada({ atual: 'facil', recentes: [] }, 0).ajuste).toBeNull();
    expect(rodada({ atual: 'facil', recentes: [] }, 18).ajuste).toEqual({ de: 'facil', para: 'media', acertos: 18, total: JANELA });
  });

  it('parte do nível de XP, como antes', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(dificuldadeInicial)).toEqual(['facil', 'facil', 'media', 'media', 'dificil', 'dificil', 'elite', 'elite']);
  });
});

describe('XP pela dificuldade', () => {
  it('multiplica só o ganho e respeita o teto de 30 do servidor', () => {
    expect(ajustarPontos(15, 'facil')).toBe(11);
    expect(ajustarPontos(15, 'elite')).toBe(21);
    expect(ajustarPontos(-8, 'elite')).toBe(-8);
    expect(limitarPontos(36)).toBe(30);
    expect(limitarPontos(-400)).toBe(-300);
  });
});

describe('sorteio da mão', () => {
  it('Fácil nunca força mão marginal; Elite usa a lista quando o sorteio cai abaixo de 75%', () => {
    expect(sortearMao('elite', () => 0.1)).toBe(MAOS_MARGINAIS[Math.floor(0.1 * MAOS_MARGINAIS.length)]);
    expect(sortearMao('facil', () => 0)).toBe('AA');
  });

  it('sempre devolve uma mão válida', () => {
    for (let i = 0; i < 500; i++) expect(sortearMao('dificil')).toMatch(/^([AKQJT2-9])([AKQJT2-9])(s|o)?$/);
  });
});

describe('peso do cenário nos pontos', () => {
  it('open raise rende metade do ganho e perde igual', () => {
    expect(pesarPorCenario('openRaise', 15)).toBe(8);
    expect(pesarPorCenario('openRaise', -8)).toBe(-8);
  });

  it('vs 3-bet e vs all-in: 80% menos ganho, 20% mais perda', () => {
    expect(pesarPorCenario('vsOpenShove', 15)).toBe(3);
    expect(pesarPorCenario('vs3bet', -10)).toBe(-12);
    expect(pesarPorCenario('vsOpenRaise', 15)).toBe(15);
  });
});
