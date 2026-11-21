// /sitemap-noticias.xml (rewrite no vercel.json): a lista de notícias e cada
// notícia publicada, para o Google achar as páginas novas.
//
// Com as notícias fora do índice (NOTICIAS_NO_INDICE, desde 19/11/2026) o
// endereço responde 404. Sitemap vazio é erro no Search Console ("tag url
// ausente"): o Google exige pelo menos uma <url> dentro do <urlset>. O mesmo
// vale quando o banco não responde ou não há notícia publicada.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { NOTICIAS_NO_INDICE, publicadas, sitemap } from './_noticias.js';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  let lista: Awaited<ReturnType<typeof publicadas>> = [];
  if (NOTICIAS_NO_INDICE) {
    try {
      lista = await publicadas('order=publicada_em.desc&limit=5000');
    } catch {
      // sem banco, sem sitemap
    }
  }
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  if (lista.length === 0) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Sem notícias no índice do Google no momento.');
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.end(sitemap(lista));
}
