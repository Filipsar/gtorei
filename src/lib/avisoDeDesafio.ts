// O que já fechou nos desafios (do dia, da semana e do mês) e o que fechou
// desde a última olhada: é o que o aviso de desafio concluído mostra.

import type { Desafio, DesafiosDoDia } from '@/hooks/useDailyChallenges';
import type { DesafiosPorPeriodo } from '@/hooks/usePeriodChallenges';

/** Quanto o aviso fica na tela (a barra que esvazia, animate-esvazia, dura o mesmo) */
export const DURACAO_DO_AVISO = 3500;

export interface DesafioConcluido {
  chave: string;
  titulo: string;
  xp: number;
}

/** Todos os desafios já concluídos, com uma chave que não se repete entre dia, semana e mês */
export function concluidosDe(dia: DesafiosDoDia | null, periodos: DesafiosPorPeriodo | null): DesafioConcluido[] {
  const lista: DesafioConcluido[] = [];
  const somar = (prefixo: string, desafios: Desafio[]) => {
    for (const d of desafios) if (d.concluido) lista.push({ chave: `${prefixo}#${d.idx}`, titulo: d.titulo, xp: d.xp });
  };
  if (dia) somar(`dia:${dia.dia}`, dia.desafios);
  if (periodos) {
    somar(`semana:${periodos.semana.inicio}`, periodos.semana.desafios);
    somar(`mes:${periodos.mes.inicio}`, periodos.mes.desafios);
  }
  return lista;
}

/** O que fechou desde a última olhada (e passa a contar como já visto) */
export function novosConcluidos(vistos: Set<string>, agora: DesafioConcluido[]): DesafioConcluido[] {
  const novos = agora.filter((d) => !vistos.has(d.chave));
  for (const d of novos) vistos.add(d.chave);
  return novos;
}
