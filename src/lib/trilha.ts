// Progresso na trilha do app (src/data/trilha.ts).
//
// Por enquanto o progresso fica no aparelho (localStorage, por usuário): a
// trilha está em teste no app e o formato ainda vai mudar. O XP de cada mão
// continua indo ao servidor pelo record_hand_result, como em qualquer treino;
// aqui só se guarda qual lição passou e com quantas estrelas.

import { LICOES } from '@/data/trilha';

export const MAOS_POR_LICAO = 10;
/** Acertos mínimos (de 10) para passar e liberar a próxima */
export const ACERTOS_PARA_PASSAR = 7;

export type Estrelas = 0 | 1 | 2 | 3;

export interface ResultadoGuardado {
  estrelas: Estrelas;
  /** Melhor número de acertos já feito */
  melhor: number;
  vezes: number;
  em: string;
}

export type Progresso = Record<string, ResultadoGuardado>;

export type Estado = 'feita' | 'atual' | 'bloqueada';

const chave = (userId: string) => `gtorei_trilha_${userId}`;

/** 7 acertos: 1 estrela; 8: 2; 9 ou 10: 3. Abaixo de 7 não passa. */
export function estrelasDe(acertos: number, total = MAOS_POR_LICAO): Estrelas {
  if (total <= 0) return 0;
  const p = acertos / total;
  if (p >= 0.9) return 3;
  if (p >= 0.8) return 2;
  if (p >= ACERTOS_PARA_PASSAR / MAOS_POR_LICAO) return 1;
  return 0;
}

export function lerProgresso(userId: string | undefined): Progresso {
  if (!userId) return {};
  try {
    const bruto = localStorage.getItem(chave(userId));
    const dados = bruto ? JSON.parse(bruto) : {};
    return dados && typeof dados === 'object' ? (dados as Progresso) : {};
  } catch {
    return {};
  }
}

/**
 * Guarda o resultado de uma lição, mantendo o melhor. Devolve se passou e se
 * foi a primeira vez (é o que libera a próxima lição).
 */
export function registrarResultado(userId: string | undefined, licaoId: string, acertos: number, total = MAOS_POR_LICAO) {
  const progresso = lerProgresso(userId);
  const antes = progresso[licaoId];
  const estrelas = estrelasDe(acertos, total);
  const passou = estrelas > 0;
  const primeiraVez = passou && !(antes && antes.estrelas > 0);

  progresso[licaoId] = {
    estrelas: Math.max(estrelas, antes?.estrelas ?? 0) as Estrelas,
    melhor: Math.max(acertos, antes?.melhor ?? 0),
    vezes: (antes?.vezes ?? 0) + 1,
    em: new Date().toISOString(),
  };

  if (userId) {
    try {
      localStorage.setItem(chave(userId), JSON.stringify(progresso));
    } catch {
      // Sem armazenamento a lição vale só agora; o XP das mãos já foi ao servidor
    }
  }
  return { progresso, passou, primeiraVez, estrelas };
}

/**
 * Feita: passou alguma vez. Atual: a primeira que ainda não passou. Depois
 * dela, bloqueada. Uma lição feita fora de ordem não pula as anteriores.
 */
export function estadosDaTrilha(progresso: Progresso): Map<string, Estado> {
  const estados = new Map<string, Estado>();
  let achouAtual = false;
  for (const licao of LICOES) {
    const feita = (progresso[licao.id]?.estrelas ?? 0) > 0;
    if (!achouAtual && feita) {
      estados.set(licao.id, 'feita');
    } else if (!achouAtual) {
      estados.set(licao.id, 'atual');
      achouAtual = true;
    } else {
      estados.set(licao.id, feita ? 'feita' : 'bloqueada');
    }
  }
  return estados;
}

/** A lição que vem depois desta, na ordem da trilha */
export function proximaLicao(licaoId: string) {
  const i = LICOES.findIndex((l) => l.id === licaoId);
  return i >= 0 ? LICOES[i + 1] ?? null : null;
}
