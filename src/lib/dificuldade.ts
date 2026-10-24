// Dificuldade do treino, às claras.
//
// O que ela muda: só QUAIS mãos aparecem. Quanto mais difícil, mais mãos da
// "zona marginal" (as que ficam na borda da range, onde a decisão é apertada).
// O que ela NÃO muda: a resposta certa, a nota, a range. A mesma mão tem a
// mesma resposta em qualquer dificuldade.
//
// Antes (até 22/10/2026) isto já existia, escondido: o nível de XP decidia a
// chance de mão marginal e a tela não dizia nada. Agora a dificuldade aparece
// no treino, a pessoa pode fixá-la, e o modo automático segue o acerto real
// das últimas mãos, nunca dados de fora do treino.
//
// XP acompanha a dificuldade (e aparece na tela): sem isso, escolher "Fácil"
// viraria atalho para o ranking com mãos óbvias.

export type IdDificuldade = 'facil' | 'media' | 'dificil' | 'elite';
export type Preferencia = 'auto' | IdDificuldade;

export interface NivelDificuldade {
  id: IdDificuldade;
  nome: string;
  /** Chance de a mão sair da zona marginal */
  chanceMarginal: number;
  /** Multiplica só o XP ganho, nunca a perda */
  multiplicadorXp: number;
  descricao: string;
}

export const NIVEIS: NivelDificuldade[] = [
  { id: 'facil', nome: 'Fácil', chanceMarginal: 0, multiplicadorXp: 0.7, descricao: 'Mãos sorteadas ao acaso: muitas decisões claras.' },
  { id: 'media', nome: 'Média', chanceMarginal: 0.3, multiplicadorXp: 1, descricao: 'Uma em cada três mãos vem da borda da range.' },
  { id: 'dificil', nome: 'Difícil', chanceMarginal: 0.55, multiplicadorXp: 1.2, descricao: 'Mais da metade das mãos são decisões apertadas.' },
  { id: 'elite', nome: 'Elite', chanceMarginal: 0.75, multiplicadorXp: 1.4, descricao: 'Quase só mãos marginais. Para quem já domina as ranges.' },
];

export const nivelPorId = (id: IdDificuldade) => NIVEIS.find((n) => n.id === id)!;

/** Regras do automático: avalia a cada JANELA mãos desde o último ajuste */
export const JANELA = 20;
export const SOBE_COM = 0.85;
export const DESCE_COM = 0.6;

/** Ponto de partida do automático, pelo nível de XP (o mesmo de antes) */
export function dificuldadeInicial(nivelJogador: number): IdDificuldade {
  if (nivelJogador >= 7) return 'elite';
  if (nivelJogador >= 5) return 'dificil';
  if (nivelJogador >= 3) return 'media';
  return 'facil';
}

export interface EstadoAuto {
  atual: IdDificuldade;
  /** Resultados (acertou?) desde o último ajuste, no máximo JANELA */
  recentes: boolean[];
}

export interface Ajuste {
  de: IdDificuldade;
  para: IdDificuldade;
  acertos: number;
  total: number;
}

/**
 * Registra uma mão no automático. Com JANELA mãos desde o último ajuste,
 * sobe com 85%+ de acerto, desce com 60% ou menos, e recomeça a contagem.
 */
export function registrarNoAuto(estado: EstadoAuto, acertou: boolean): { estado: EstadoAuto; ajuste: Ajuste | null } {
  const recentes = [...estado.recentes, acertou].slice(-JANELA);
  if (recentes.length < JANELA) return { estado: { ...estado, recentes }, ajuste: null };

  const acertos = recentes.filter(Boolean).length;
  const taxa = acertos / JANELA;
  const i = NIVEIS.findIndex((n) => n.id === estado.atual);
  let j = i;
  if (taxa >= SOBE_COM) j = Math.min(i + 1, NIVEIS.length - 1);
  else if (taxa <= DESCE_COM) j = Math.max(i - 1, 0);

  // Avaliou: começa uma janela nova, tenha mudado ou não
  const novo: EstadoAuto = { atual: NIVEIS[j].id, recentes: [] };
  return {
    estado: novo,
    ajuste: j !== i ? { de: estado.atual, para: NIVEIS[j].id, acertos, total: JANELA } : null,
  };
}

/** XP ganho ajustado pela dificuldade; perda não muda */
export function ajustarPontos(pontos: number, id: IdDificuldade): number {
  return pontos > 0 ? Math.round(pontos * nivelPorId(id).multiplicadorXp) : pontos;
}

/** O servidor (record_hand_result) aceita de -300 a 30 por mão */
export const limitarPontos = (pontos: number) => Math.max(-300, Math.min(30, Math.round(pontos)));

/**
 * Peso de cada cenário nos pontos da mão, antes da dificuldade.
 * vs 3-bet e vs open shove: 80% menos ganho e 20% mais perda. Open Raise (e o
 * open shove de stack curto, que é o mesmo cenário): metade do ganho, por ter
 * mais fold óbvio e render XP fácil (23/10/2026). O simulado usa o mesmo peso
 * no servidor (claim_simulado).
 */
export function pesarPorCenario(cenario: string, pontos: number): number {
  if (cenario === 'vs3bet' || cenario === 'vsOpenShove') {
    return pontos > 0 ? Math.round(pontos * 0.2) : pontos < 0 ? Math.round(pontos * 1.2) : 0;
  }
  if (cenario === 'openRaise' && pontos > 0) return Math.round(pontos * 0.5);
  return pontos;
}

// Mãos da borda da range: as decisões apertadas de raise/call/fold
export const MAOS_MARGINAIS = [
  'T9s', '98s', '87s', '76s', '65s', 'J9s', 'T8s', '97s', '86s',
  'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
  'KTo', 'QTo', 'JTo', 'KJo', 'QJo', 'K9o', 'Q9o',
  '77', '66', '55', '44', '33', '22',
  'K9s', 'K8s', 'K7s', 'Q9s', 'Q8s', 'J8s',
  'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
];

const RANKS = 'AKQJT98765432';

export function sortearMao(id: IdDificuldade, sorteio: () => number = Math.random): string {
  if (sorteio() < nivelPorId(id).chanceMarginal) {
    return MAOS_MARGINAIS[Math.floor(sorteio() * MAOS_MARGINAIS.length)];
  }
  const a = Math.floor(sorteio() * 13);
  const b = Math.floor(sorteio() * 13);
  if (a === b) return RANKS[a] + RANKS[b];
  const [alta, baixa] = a < b ? [a, b] : [b, a];
  return RANKS[alta] + RANKS[baixa] + (sorteio() > 0.5 ? 's' : 'o');
}

// ---------- Guardado no navegador, por conta ----------

interface Guardado {
  preferencia: Preferencia;
  auto: EstadoAuto;
}

const chave = (userId: string) => `gtorei_dificuldade_${userId}`;

export function lerGuardado(userId: string, nivelJogador: number): Guardado {
  try {
    const g = JSON.parse(localStorage.getItem(chave(userId)) ?? 'null');
    const valido = (x: unknown): x is IdDificuldade => NIVEIS.some((n) => n.id === x);
    if (g && (g.preferencia === 'auto' || valido(g.preferencia)) && valido(g.auto?.atual) && Array.isArray(g.auto?.recentes)) {
      return { preferencia: g.preferencia, auto: { atual: g.auto.atual, recentes: g.auto.recentes.slice(-JANELA).map(Boolean) } };
    }
  } catch {
    // começa do zero
  }
  return { preferencia: 'auto', auto: { atual: dificuldadeInicial(nivelJogador), recentes: [] } };
}

export function salvarGuardado(userId: string, g: Guardado): void {
  try {
    localStorage.setItem(chave(userId), JSON.stringify(g));
  } catch {
    // vale só nesta visita
  }
}
