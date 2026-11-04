import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, CATEGORY_LABELS, CATEGORY_ORDER, conquistasDeLiga, getAchievement } from '@/data/achievements';
import { alternarDestaque, limparDestaques } from '@/lib/destaques';
import { pesarPorPosicao } from '@/lib/dificuldade';
import { serieDoAno } from '@/lib/precisaoAnual';

const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261104120000_conquistas_destaques_indicacao.sql'), 'utf8');

describe('XP do UTG1', () => {
  it('no treino de range o acerto rende 1/3; a perda e as outras posições não mudam', () => {
    expect(pesarPorPosicao('rangeTraining', 'UTG1', 15)).toBe(5);
    expect(pesarPorPosicao(null, 'UTG1', 9)).toBe(3);
    expect(pesarPorPosicao('rangeTraining', 'UTG1', -10)).toBe(-10);
    expect(pesarPorPosicao('rangeTraining', 'UTG', 15)).toBe(15);
    expect(pesarPorPosicao('bounty', 'UTG1', 15)).toBe(15);
  });

  it('o simulado tem a mesma regra no servidor', () => {
    expect(sql).toMatch(/position = 'UTG1'\s+AND coalesce\(game_mode, '8max'\) = '8max' THEN 1\.0 \/ 3/);
  });
});

describe('conquistas novas', () => {
  it('as três de precisão só valem no Aleatório, no app e no servidor', () => {
    for (const k of ['session_perfect_50', 'accuracy_95', 'accuracy_98']) {
      expect(getAchievement(k)?.soNoAleatorio, k).toBe(true);
    }
    expect(getAchievement('accuracy_90')?.soNoAleatorio).toBeUndefined();
    expect(sql.match(/WHERE user_id = _uid AND aleatorio AND/g)).toHaveLength(2);
  });

  it('liga: do Ouro ao Rei, conforme o elo', () => {
    expect(conquistasDeLiga(2)).toEqual([]);
    expect(conquistasDeLiga(4)).toEqual(['liga_3', 'liga_4']);
    expect(conquistasDeLiga(7)).toEqual(['liga_3', 'liga_4', 'liga_5', 'liga_6', 'liga_7']);
    for (const k of [...conquistasDeLiga(7), 'liga_rei_3']) expect(getAchievement(k)?.category, k).toBe('league');
  });

  it('toda categoria aparece na tela, e toda conquista tem categoria listada', () => {
    expect(new Set(CATEGORY_ORDER)).toEqual(new Set(Object.keys(CATEGORY_LABELS)));
    for (const a of ACHIEVEMENTS) expect(CATEGORY_ORDER, a.key).toContain(a.category);
  });
});

describe('destaques do perfil', () => {
  it('limpa chave desconhecida, repetida e o que passa de 3', () => {
    expect(limparDestaques(['streak_5', 'xxx', 'streak_5', 'hands_10', 'level_2', 'level_3'])).toEqual(['streak_5', 'hands_10', 'level_2']);
    expect(limparDestaques(null)).toEqual([]);
  });

  it('liga e desliga, e não passa de 3', () => {
    expect(alternarDestaque(['a'], 'b')).toEqual(['a', 'b']);
    expect(alternarDestaque(['a', 'b'], 'a')).toEqual(['b']);
    expect(alternarDestaque(['a', 'b', 'c'], 'd')).toBeNull();
  });
});

describe('precisão dos últimos 12 meses', () => {
  it('média ponderada pelas mãos e corte de 5 mãos', () => {
    const r = serieDoAno([
      { started_at: '2026-03-01T12:00:00Z', hands_played: 10, accuracy: 90 },
      { started_at: '2026-03-02T12:00:00Z', hands_played: 30, accuracy: '70' },
      { started_at: '2026-03-03T12:00:00Z', hands_played: 4, accuracy: 0 },
    ]);
    expect(r.porSemana).toBe(false);
    expect(r.pontos.map((p) => p.accuracy)).toEqual([90, 70]);
    expect(r.media).toBe(75);
  });

  it('com mais de 60 sessões agrupa por semana', () => {
    const sessoes = Array.from({ length: 70 }, (_, i) => ({
      started_at: new Date(Date.UTC(2026, 0, 5 + i, 12)).toISOString(),
      hands_played: 10,
      accuracy: 80,
    }));
    const r = serieDoAno(sessoes);
    expect(r.porSemana).toBe(true);
    expect(r.pontos.length).toBeLessThanOrEqual(11);
    expect(r.pontos.reduce((t, p) => t + p.hands, 0)).toBe(700);
  });
});
