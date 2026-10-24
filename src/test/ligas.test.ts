import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ELOS, REGRAS_DOS_ELOS, regraDoElo } from '@/data/elos';
import { somDaJogada } from '@/lib/sons';

describe('regras das ligas diárias', () => {
  it('a tabela do app é a mesma do servidor (_regra_do_elo)', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261024150000_ligas_diarias.sql'), 'utf8');
    const trecho = sql.slice(sql.indexOf('FUNCTION public._regra_do_elo'));
    const doServidor = [...trecho.matchAll(/\((\d), (\d+), (NULL::int|\d+)\)/g)].map((m) => ({
      elo: Number(m[1]),
      sobem: Number(m[2]),
      caiA: m[3].startsWith('NULL') ? null : Number(m[3]),
    }));
    expect(doServidor).toHaveLength(ELOS.length);
    for (const r of doServidor) expect(REGRAS_DOS_ELOS[r.elo], `elo ${r.elo}`).toEqual({ sobem: r.sobem, caiA: r.caiA });
  });

  it('as regras pedidas: Bronze não cai, Prata e Ouro caem do 20º, Diamante sobe 3', () => {
    expect(regraDoElo(1)).toEqual({ sobem: 10, caiA: null });
    expect(regraDoElo(2)).toEqual({ sobem: 10, caiA: 20 });
    expect(regraDoElo(4)).toEqual({ sobem: 6, caiA: 15 });
    expect(regraDoElo(5)).toEqual({ sobem: 6, caiA: 10 });
    expect(regraDoElo(6)).toEqual({ sobem: 3, caiA: 10 });
    // No Rei ficam os 10 primeiros
    expect(regraDoElo(7)).toEqual({ sobem: 0, caiA: 11 });
  });
});

describe('sons da mesa', () => {
  it('fichas quando entra aposta, batida no check, cartas no fold', () => {
    expect(somDaJogada('raise')).toBe('fichas');
    expect(somDaJogada('allin')).toBe('fichas');
    expect(somDaJogada('call')).toBe('fichas');
    expect(somDaJogada('check')).toBe('check');
    expect(somDaJogada('fold')).toBe('cartas');
  });

  it('todo som existe em public/sons', async () => {
    const { existsSync } = await import('node:fs');
    for (const s of ['cartas', 'fichas', 'check', 'estrelas']) {
      expect(existsSync(join(process.cwd(), 'public/sons', `${s}.mp3`)), s).toBe(true);
    }
  });
});
