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

/** O que /api/rss devolve */
export interface ItemDoFeed {
  fonte: string;
  titulo: string;
  link: string;
  data: string | null;
  trecho: string;
}
