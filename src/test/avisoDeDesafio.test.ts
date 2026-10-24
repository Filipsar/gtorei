import { describe, expect, it } from 'vitest';
import { concluidosDe, novosConcluidos } from '@/lib/avisoDeDesafio';
import type { Desafio, DesafiosDoDia } from '@/hooks/useDailyChallenges';
import type { DesafiosPorPeriodo } from '@/hooks/usePeriodChallenges';

const desafio = (idx: number, concluido: boolean, titulo = `Desafio ${idx}`): Desafio => ({
  idx,
  chave: `d${idx}`,
  titulo,
  descricao: '',
  meta: 10,
  xp: 50,
  progresso: concluido ? 10 : 3,
  precisao: 0,
  concluido,
  resgatado: false,
});

const dia = (desafios: Desafio[]): DesafiosDoDia => ({ dia: '2026-10-24', desafios, sequencia_dias: 0, total_resgatados: 0 });
const periodos = (semana: Desafio[], mes: Desafio[]): DesafiosPorPeriodo => ({
  semana: { inicio: '2026-10-18', fim: '2026-10-24', desafios: semana },
  mes: { inicio: '2026-10-01', fim: '2026-10-31', desafios: mes },
});

describe('aviso de desafio concluído', () => {
  it('a mesma posição no dia, na semana e no mês são desafios diferentes', () => {
    const lista = concluidosDe(dia([desafio(0, true)]), periodos([desafio(0, true)], [desafio(0, true)]));
    expect(new Set(lista.map((d) => d.chave)).size).toBe(3);
  });

  it('avisa só o que fechou desde a última olhada, e uma vez só', () => {
    const vistos = new Set(concluidosDe(dia([desafio(0, true), desafio(1, false)]), null).map((d) => d.chave));
    const depois = concluidosDe(dia([desafio(0, true), desafio(1, true, 'Jogue 10 mãos')]), null);
    expect(novosConcluidos(vistos, depois).map((d) => d.titulo)).toEqual(['Jogue 10 mãos']);
    expect(novosConcluidos(vistos, depois)).toEqual([]);
  });

  it('sem a migration (nada carregado) não há o que avisar', () => {
    expect(concluidosDe(null, null)).toEqual([]);
  });
});
