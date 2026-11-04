// Precisão por sessão nos últimos 12 meses (página de Análise, só PRO).

export interface SessaoDoAno {
  started_at: string;
  hands_played: number;
  accuracy: number | string;
}

export interface PontoDaSerie {
  i: number;
  label: string;
  accuracy: number;
  hands: number;
}

/** Até aqui cada sessão vira um ponto; acima, a série agrupa por semana */
export const MAX_PONTOS_POR_SESSAO = 60;
/** Sessão com menos mãos que isso não entra (mesmo corte do gráfico do mês) */
export const MIN_MAOS_NA_SESSAO = 5;

const dataCurta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

/** Segunda-feira da semana da data, à meia-noite local */
function inicioDaSemana(d: Date): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

/**
 * Série do gráfico e média do período, ponderada pelas mãos. Com mais de 60
 * sessões, cada ponto é uma semana (média ponderada das sessões dela).
 */
export function serieDoAno(sessoes: SessaoDoAno[]): { pontos: PontoDaSerie[]; media: number; porSemana: boolean } {
  const validas = sessoes
    .filter((s) => s.hands_played >= MIN_MAOS_NA_SESSAO)
    .map((s) => ({ data: new Date(s.started_at), maos: s.hands_played, acc: Number(s.accuracy) }))
    .filter((s) => Number.isFinite(s.acc) && !Number.isNaN(s.data.getTime()))
    .sort((a, b) => a.data.getTime() - b.data.getTime());

  const totalMaos = validas.reduce((t, s) => t + s.maos, 0);
  const media = totalMaos ? Math.round(validas.reduce((t, s) => t + s.acc * s.maos, 0) / totalMaos) : 0;

  if (validas.length <= MAX_PONTOS_POR_SESSAO) {
    return {
      pontos: validas.map((s, i) => ({ i: i + 1, label: dataCurta(s.data), accuracy: Math.round(s.acc), hands: s.maos })),
      media,
      porSemana: false,
    };
  }

  const semanas = new Map<number, { inicio: Date; maos: number; soma: number }>();
  for (const s of validas) {
    const inicio = inicioDaSemana(s.data);
    const k = inicio.getTime();
    const sem = semanas.get(k) ?? { inicio, maos: 0, soma: 0 };
    sem.maos += s.maos;
    sem.soma += s.acc * s.maos;
    semanas.set(k, sem);
  }
  const pontos = [...semanas.values()]
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
    .map((w, i) => ({ i: i + 1, label: dataCurta(w.inicio), accuracy: Math.round(w.soma / w.maos), hands: w.maos }));
  return { pontos, media, porSemana: true };
}
