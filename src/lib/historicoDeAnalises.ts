// Histórico das análises com IA (tabela analises_ia, migration
// 20261101120000_historico_analises_ia.sql). Guarda o relatório e o resumo de
// cada mão, nunca o hand history. Sem a migration aplicada, gravar falha em
// silêncio e a lista avisa que o histórico ainda não está disponível.

import { supabase } from '@/integrations/supabase/client';
import type { MaoResumida } from '@/lib/treinoDaAnalise';

export type Verdict = 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';

export interface HandAnalysis {
  handId: string;
  verdict: Verdict;
  summary: string;
  gtoPlay: string;
  evDelta: number;
}

export interface AnalysisResult {
  hands: HandAnalysis[];
  overall: {
    leaks: string[];
    recommendations: string[];
    evTotal: number;
  };
}

/**
 * Quanto a mão custou contra o GTO: 0 ou negativo. A IA às vezes dá EV
 * positivo a jogada certa (conta o pote ganho, não a decisão), e o total que
 * ela manda não bate com as próprias mãos; por isso a conta é feita aqui.
 */
export const perdaDaMao = (h: Pick<HandAnalysis, 'evDelta'>): number => Math.min(0, Number(h.evDelta) || 0);

/** EV perdido no relatório: soma das perdas mão a mão, em bb */
export const evPerdido = (a: Pick<AnalysisResult, 'hands'>): number =>
  Math.round(a.hands.reduce((acc, h) => acc + perdaDaMao(h), 0) * 100) / 100 || 0;

/** O que vai para a coluna `resultado` */
export interface RelatorioSalvo {
  analise: AnalysisResult;
  maos: MaoResumida[];
  removidos: number;
}

export interface AnaliseDoHistorico {
  id: string;
  criada_em: string;
  arquivo: string | null;
  sala: string | null;
  maos_no_arquivo: number;
  maos_analisadas: number;
  ev_total: number | null;
  resultado: RelatorioSalvo;
}

interface Resposta<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

// A tabela ainda não está nos tipos gerados do Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabela = () => (supabase.from as unknown as (t: string) => any)('analises_ia');

export interface DadosDaAnalise {
  arquivo: string;
  sala: string | null;
  maosNoArquivo: number;
  relatorio: RelatorioSalvo;
}

/** Grava (id null) ou atualiza a análise; devolve o id, ou null se não deu */
export async function salvarAnalise(id: string | null, d: DadosDaAnalise): Promise<string | null> {
  const linha = {
    arquivo: d.arquivo.slice(0, 200),
    sala: d.sala,
    maos_no_arquivo: d.maosNoArquivo,
    maos_analisadas: d.relatorio.maos.length,
    ev_total: evPerdido(d.relatorio.analise),
    resultado: d.relatorio,
  };
  try {
    const consulta = id
      ? tabela().update({ ...linha, atualizada_em: new Date().toISOString() }).eq('id', id).select('id').single()
      : tabela().insert(linha).select('id').single();
    const { data, error } = (await consulta) as Resposta<{ id: string }>;
    return error ? null : data?.id ?? null;
  } catch {
    return null;
  }
}

/** As análises da conta, da mais nova à mais antiga; null = histórico indisponível */
export async function listarAnalises(): Promise<AnaliseDoHistorico[] | null> {
  try {
    const { data, error } = (await tabela()
      .select('id, criada_em, arquivo, sala, maos_no_arquivo, maos_analisadas, ev_total, resultado')
      .order('criada_em', { ascending: false })
      .limit(50)) as Resposta<AnaliseDoHistorico[]>;
    return error ? null : data ?? [];
  } catch {
    return null;
  }
}

export async function apagarAnalise(id: string): Promise<boolean> {
  try {
    const { error } = (await tabela().delete().eq('id', id)) as Resposta<unknown>;
    return !error;
  } catch {
    return false;
  }
}
