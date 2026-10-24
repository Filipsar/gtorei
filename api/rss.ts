// GET /api/rss: as matérias dos feeds de poker (lista fixa em _noticias.ts), já
// limpas, para o /admin gravar como rascunho. O navegador não consegue ler os
// feeds direto (CORS); por isso a busca passa por aqui. Não recebe endereço de
// fora e não grava nada: quem grava é o admin, com o próprio login.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { FONTES, lerRss, type ItemDaFonte } from './_noticias.js';

const ESPERA_MS = 8000;

async function buscar(fonte: (typeof FONTES)[number]): Promise<ItemDaFonte[]> {
  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), ESPERA_MS);
  try {
    const resposta = await fetch(fonte.url, {
      signal: controle.signal,
      headers: { 'User-Agent': 'GTORei-Noticias/1.0 (+https://www.gtorei.com.br/noticias)' },
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return lerRss(await resposta.text(), fonte.nome);
  } finally {
    clearTimeout(prazo);
  }
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const resultados = await Promise.allSettled(FONTES.map(buscar));
  const itens = resultados
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => (b.data ?? '').localeCompare(a.data ?? ''));
  const erros = resultados.flatMap((r, i) => (r.status === 'rejected' ? [FONTES[i].nome] : []));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // A CDN guarda por 15 minutos: abrir o admin várias vezes não bate nos sites
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
  res.end(JSON.stringify({ itens, erros }));
}
