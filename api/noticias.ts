// /noticias e /noticias/:slug (rewrites no vercel.json): as páginas das
// notícias publicadas, em HTML pronto para o Google.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { POR_PAGINA, SLUG_VALIDO, paginaDaLista, paginaDaNoticia, paginaNaoEncontrada, publicadas } from './_noticias.js';

function responder(res: ServerResponse, status: number, html: string) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Publicar ou corrigir aparece em até 5 minutos; a CDN segura o resto
  res.setHeader('Cache-Control', status === 200 ? 'public, s-maxage=300, stale-while-revalidate=86400' : 'public, s-maxage=60');
  res.end(html);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'https://www.gtorei.com.br');
  // O rewrite manda ?slug=; chamada direta pelo caminho também funciona
  const slug = url.searchParams.get('slug') ?? url.pathname.match(/^\/noticias\/([^/]+)\/?$/)?.[1] ?? null;

  try {
    if (slug) {
      if (!SLUG_VALIDO.test(slug) || slug.length > 140) return responder(res, 404, paginaNaoEncontrada());
      const [noticia] = await publicadas(`slug=eq.${encodeURIComponent(slug)}&limit=1`);
      if (!noticia) return responder(res, 404, paginaNaoEncontrada());
      const outras = await publicadas('order=publicada_em.desc&limit=6');
      return responder(res, 200, paginaDaNoticia(noticia, outras));
    }

    const pagina = Math.max(1, Math.min(500, Number.parseInt(url.searchParams.get('pagina') ?? '1', 10) || 1));
    const lista = await publicadas(`order=publicada_em.desc&offset=${(pagina - 1) * POR_PAGINA}&limit=${POR_PAGINA + 1}`);
    if (pagina > 1 && lista.length === 0) return responder(res, 404, paginaNaoEncontrada());
    return responder(res, 200, paginaDaLista(lista, pagina));
  } catch {
    // Banco fora do ar: a lista sai vazia (e sem indexar) em vez de erro 500
    return responder(res, 200, paginaDaLista([], 1));
  }
}
