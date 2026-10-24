// /sitemap-noticias.xml (rewrite no vercel.json, citado no robots.txt): a lista
// de notícias e cada notícia publicada, para o Google achar as páginas novas.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { publicadas, sitemap } from './_noticias.js';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  let lista: Awaited<ReturnType<typeof publicadas>> = [];
  try {
    lista = await publicadas('order=publicada_em.desc&limit=5000');
  } catch {
    // sem banco, sitemap vazio
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
  res.end(sitemap(lista));
}
