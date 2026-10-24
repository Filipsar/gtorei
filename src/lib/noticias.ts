// Notícias GTORei no /admin: o que o app precisa para publicar. As páginas e a
// coleta dos feeds ficam nas funções do Vercel (api/), e as regras do banco na
// migration 20261024160000_noticias.sql.

/** Resumo mais curto que isto não publica (o banco confere o mesmo número) */
export const MINIMO_DO_RESUMO = 200;

/** Endereço da notícia: o título sem acento e o começo do id, para não repetir */
export function slugDaNoticia(titulo: string, id: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    .replace(/-+$/, '');
  const sufixo = id.replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase();
  return base ? `${base}-${sufixo}` : sufixo;
}

export interface Noticia {
  id: string;
  link: string;
  fonte: string;
  titulo_fonte: string;
  trecho_fonte: string | null;
  publicada_na_fonte: string | null;
  status: 'rascunho' | 'publicada' | 'descartada';
  titulo: string | null;
  resumo: string | null;
  slug: string | null;
  publicada_em: string | null;
  atualizada_em: string | null;
  criada_em: string;
  /** Imagem enviada pelo admin ou gerada pelo GTORei (migration 20261024170000) */
  imagem_url?: string | null;
  imagem_credito?: string | null;
}

/** Imagem até este tamanho (o mesmo limite do bucket 'noticias') */
export const MAXIMO_DA_IMAGEM = 2 * 1024 * 1024;

/** A imagem do GTORei (gerada) leva este prefixo no nome; a enviada pelo admin, não */
export const ehImagemGerada = (url: string | null | undefined) => !!url && url.includes('/gerada-');

/**
 * Resumo pronto para importar no /admin → Notícias. Quem prepara (o Claude,
 * todo dia) entrega um JSON neste formato; a importação cria a notícia se o
 * feed ainda não trouxe e preenche título e resumo dos rascunhos.
 */
export interface ResumoPronto {
  link: string;
  fonte: string;
  titulo_fonte: string;
  publicada_na_fonte: string | null;
  titulo: string;
  resumo: string;
}

export const VERSAO_DA_IMPORTACAO = 1;

/** Lê o texto colado (ou o arquivo) e separa o que serve do que tem problema */
export function lerImportacao(texto: string): { itens: ResumoPronto[]; erros: string[] } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { itens: [], erros: ['O texto não é um JSON válido. Cole o conteúdo inteiro do arquivo.'] };
  }
  const pacote = bruto as { gtorei_noticias?: number; itens?: unknown };
  if (pacote?.gtorei_noticias !== VERSAO_DA_IMPORTACAO || !Array.isArray(pacote.itens)) {
    return { itens: [], erros: ['Formato desconhecido: falta "gtorei_noticias": 1 com a lista "itens".'] };
  }
  const itens: ResumoPronto[] = [];
  const erros: string[] = [];
  pacote.itens.forEach((cru, i) => {
    const r = cru as Partial<ResumoPronto>;
    const nome = typeof r?.titulo === 'string' && r.titulo ? `"${r.titulo.slice(0, 50)}"` : `item ${i + 1}`;
    if (typeof r?.link !== 'string' || !/^https?:\/\//.test(r.link)) return void erros.push(`${nome}: link inválido`);
    if (typeof r.titulo !== 'string' || r.titulo.trim().length < 10) return void erros.push(`${nome}: título curto demais`);
    if (typeof r.resumo !== 'string' || r.resumo.trim().length < MINIMO_DO_RESUMO) return void erros.push(`${nome}: resumo com menos de ${MINIMO_DO_RESUMO} caracteres`);
    itens.push({
      link: r.link,
      fonte: typeof r.fonte === 'string' && r.fonte ? r.fonte : new URL(r.link).hostname,
      titulo_fonte: typeof r.titulo_fonte === 'string' && r.titulo_fonte ? r.titulo_fonte : r.titulo.trim(),
      publicada_na_fonte: typeof r.publicada_na_fonte === 'string' ? r.publicada_na_fonte : null,
      titulo: r.titulo.trim().slice(0, 140),
      resumo: r.resumo.trim(),
    });
  });
  return { itens, erros };
}

/** O que /api/rss devolve */
export interface ItemDoFeed {
  fonte: string;
  titulo: string;
  link: string;
  data: string | null;
  trecho: string;
}
