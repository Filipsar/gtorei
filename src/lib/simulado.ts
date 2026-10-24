// Simulado: uma série de mãos sem resposta. A pessoa decide todas e só no fim
// vê a correção e ganha o XP, pela proporção de acertos e erros.
//
// Quem corrige e paga é o servidor (claim_simulado, migration
// 20261023130000_simulado), a partir das mãos gravadas na sessão. Aqui fica o
// que é da tela: tamanhos, o que não entra e o resumo mostrado no fim.

import type { Scenario } from '@/data/gtoRanges';

export type Formato = 'livre' | 'simulado';

export const TAMANHOS_SIMULADO = [10, 20, 30] as const;

/** Mínimo de mãos gravadas para o servidor pagar o XP (claim_simulado) */
export const MINIMO_PARA_XP = 10;

/**
 * Fora do simulado: a Simulação joga o pós-flop, com várias decisões por mão
 * e o vilão respondendo — não cabe numa série de respostas rápidas.
 */
export const CENARIOS_FORA_DO_SIMULADO: Scenario[] = ['simulation', 'multiway'];

/** Marca da sessão no banco: é o que claim_simulado confere */
export const CENARIO_DA_SESSAO_SIMULADO = 'simulado';

/**
 * No simulado nada se escolhe: cenário, posição e stack saem do sorteio a cada
 * mão, e a mesa final também. Uma mão em quatro cai na mesa final (ICM); no
 * Bounty ela é sempre ICM, como no resto do treino.
 */
export const CHANCE_DE_MESA_FINAL = 0.25;

export function sortearMesaFinal(bounty: boolean, sorteio: () => number = Math.random): boolean {
  return bounty || sorteio() < CHANCE_DE_MESA_FINAL;
}

export interface RespostaSimulado {
  mao: string;
  cenario: Scenario;
  posicao: string;
  stack: number;
  suaAcao: string;
  acaoCerta: string;
  feedback: 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';
  evPerdido: number;
  /** A mão caiu na mesa final (a range muda com o ICM) */
  mesaFinal?: boolean;
}

export interface ResultadoSimulado {
  xp: number;
  ja_pago: boolean;
  maos: number;
  acertos: number;
  best: number;
  precisao: number;
  multiplicador_precisao: number;
  conquistas: string[];
}

export const acertou = (r: Pick<RespostaSimulado, 'feedback'>) => r.feedback === 'best' || r.feedback === 'correct';

export function resumoLocal(respostas: RespostaSimulado[]) {
  const acertos = respostas.filter(acertou).length;
  return {
    total: respostas.length,
    acertos,
    erros: respostas.length - acertos,
    precisao: respostas.length ? Math.round((100 * acertos) / respostas.length) : 0,
  };
}

/** A mesma conta do servidor, para mostrar a regra na tela antes de jogar */
export const REGRA_DO_XP =
  '"Best" vale 15, "Correta" 10 e erro tira 5, com o peso de cada cenário. Acerto de 80% ou mais multiplica por 1,25; de 90% ou mais, por 1,5. A dificuldade também multiplica.';
