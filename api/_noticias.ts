// Notícias GTORei: o que as funções do Vercel (api/rss.ts, api/noticias.ts,
// api/sitemap-noticias.ts) dividem. O sublinhado no nome faz o Vercel não
// publicar este arquivo como rota.
//
// As páginas saem em HTML pronto, sem o React: o resto do site é SPA, e notícia
// só ajuda no Google se o robô ler o texto na primeira resposta. Fluxo e regras
// na migration supabase/migrations/20261024160000_noticias.sql.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const SITE = 'https://www.gtorei.com.br';

/** Lista fixa: a função só busca estes endereços (nada vem de fora) */
export const FONTES = [
  { nome: 'PokerNews Brasil', url: 'https://br.pokernews.com/rss.php' },
  { nome: 'PokerNews', url: 'https://www.pokernews.com/rss.php' },
  { nome: 'CardPlayer', url: 'https://www.cardplayer.com/poker-news.rss' },
] as const;

export interface ItemDaFonte {
  fonte: string;
  titulo: string;
  link: string;
  data: string | null;
  trecho: string;
}

export interface NoticiaPublicada {
  titulo: string;
  resumo: string;
  slug: string;
  fonte: string;
  link: string;
  publicada_em: string;
  atualizada_em: string | null;
  /** Enviada pelo admin ou gerada pelo GTORei; nula nas publicadas antes das imagens */
  imagem_url: string | null;
  imagem_credito: string | null;
}

// ---------------------------------------------------------------------------
// RSS
// ---------------------------------------------------------------------------

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodificar(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteiro, e: string) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : inteiro;
    }
    return ENTIDADES[e.toLowerCase()] ?? inteiro;
  });
}

const semCdata = (s: string) => s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');

/** Texto sem marcação: o feed às vezes manda HTML escapado (&lt;p&gt;) */
export function textoPuro(bruto: string): string {
  const html = decodificar(semCdata(bruto));
  return decodificar(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function campo(bloco: string, nome: string): string {
  const m = bloco.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, 'i'));
  return m ? m[1] : '';
}

/** Link da matéria sem os parâmetros de rastreio (utm_*); só http(s) */
export function limparLink(bruto: string): string | null {
  try {
    const url = new URL(decodificar(semCdata(bruto)).trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    for (const p of [...url.searchParams.keys()]) if (p.startsWith('utm_')) url.searchParams.delete(p);
    return url.toString();
  } catch {
    return null;
  }
}

export function lerRss(xml: string, fonte: string): ItemDaFonte[] {
  const itens: ItemDaFonte[] = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const bloco = m[0];
    const titulo = textoPuro(campo(bloco, 'title'));
    const link = limparLink(campo(bloco, 'link'));
    if (!titulo || !link) continue;
    const quando = Date.parse(textoPuro(campo(bloco, 'pubDate')));
    itens.push({
      fonte,
      titulo: titulo.slice(0, 300),
      link,
      data: Number.isFinite(quando) ? new Date(quando).toISOString() : null,
      trecho: textoPuro(campo(bloco, 'description')).slice(0, 600),
    });
  }
  return itens;
}

// ---------------------------------------------------------------------------
// Supabase (só leitura pública, com a chave publicável que já vai no site)
// ---------------------------------------------------------------------------

/** URL e chave publicável: do ambiente ou do .env versionado (incluído na função pelo vercel.json) */
export function supabasePublico(): { url: string; chave: string } | null {
  let url = process.env.VITE_SUPABASE_URL;
  let chave = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !chave) {
    try {
      for (const linha of readFileSync(join(process.cwd(), '.env'), 'utf8').split(/\r?\n/)) {
        const m = linha.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY)\s*=\s*"?([^"\s]+)"?/);
        if (m?.[1] === 'VITE_SUPABASE_URL') url ??= m[2];
        if (m?.[1] === 'VITE_SUPABASE_PUBLISHABLE_KEY') chave ??= m[2];
      }
    } catch {
      // sem .env: as páginas saem vazias em vez de quebrar
    }
  }
  return url && chave ? { url, chave } : null;
}

const COLUNAS_BASE = 'titulo,resumo,slug,fonte,link,publicada_em,atualizada_em';
const COLUNAS = `${COLUNAS_BASE},imagem_url,imagem_credito`;

/** A imagem da notícia ou, sem ela, a do site */
const imagemDe = (n: NoticiaPublicada) => n.imagem_url ?? `${SITE}/og-gtorei.png`;

/**
 * Consulta as notícias publicadas. Sem as colunas de imagem (migration
 * 20261024170000 por aplicar), consulta de novo sem elas; sem a tabela,
 * devolve lista vazia.
 */
export async function publicadas(filtro: string): Promise<NoticiaPublicada[]> {
  const sb = supabasePublico();
  if (!sb) return [];
  const consultar = (colunas: string) =>
    fetch(`${sb.url}/rest/v1/noticias?select=${colunas}&status=eq.publicada&${filtro}`, {
      headers: { apikey: sb.chave, Authorization: `Bearer ${sb.chave}` },
    });
  let resposta = await consultar(COLUNAS);
  if (!resposta.ok) resposta = await consultar(COLUNAS_BASE);
  if (!resposta.ok) return [];
  const lista = (await resposta.json()) as NoticiaPublicada[];
  return lista.map((n) => ({ ...n, imagem_url: n.imagem_url ?? null, imagem_credito: n.imagem_credito ?? null }));
}

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------

export function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function dataPorExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

/** Começo do resumo para descrição e lista, cortado na palavra */
export function chamada(resumo: string, limite: number): string {
  const limpo = resumo.replace(/\s+/g, ' ').trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite).replace(/\s+\S*$/, '')}…`;
}

/** Parágrafos separados por linha em branco; quebra simples vira <br> */
function paragrafos(resumo: string): string {
  return resumo
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapar(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

const ESTILO = `
:root{color-scheme:dark;--fundo:#111111;--cartao:#1b1b1b;--borda:#2c2c2c;--texto:#f5f5f5;--apoio:#a3a3a3;--ouro:#F5B900}
*{box-sizing:border-box}
body{margin:0;background:var(--fundo);color:var(--texto);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Inter,sans-serif}
a{color:inherit}
.topo{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;max-width:880px;margin:0 auto;padding:16px}
.marca{display:flex;align-items:center;gap:8px;font-weight:800;font-size:20px;text-decoration:none}
.marca b{color:var(--ouro)}
.topo nav{display:flex;gap:16px;align-items:center;font-size:15px}
.topo nav a{text-decoration:none;color:var(--apoio)}
.topo nav a:hover{color:var(--texto)}
.topo nav a.cta{background:var(--ouro);color:#111;font-weight:700;padding:8px 14px;border-radius:10px}
main{max-width:760px;margin:0 auto;padding:8px 16px 48px}
.trilha{font-size:14px;color:var(--apoio)}
.trilha a{text-decoration:none}
h1{font-size:clamp(26px,5vw,38px);line-height:1.2;margin:8px 0 12px}
h2{font-size:22px;line-height:1.3;margin:0 0 8px}
.meta{color:var(--apoio);font-size:14px;margin:0}
.resumo p{margin:0 0 16px}
.capa{margin:0 0 24px}
.capa img{display:block;width:100%;height:auto;border-radius:14px;border:1px solid var(--borda)}
.capa figcaption{color:var(--apoio);font-size:13px;margin-top:6px}
.lista .miniatura{display:block;margin:-16px -16px 12px;border-radius:14px 14px 0 0;overflow:hidden;aspect-ratio:1200/630;background:var(--borda)}
.lista .miniatura img{display:block;width:100%;height:100%;object-fit:cover}
.fonte{border-top:1px solid var(--borda);padding-top:16px;color:var(--apoio);font-size:15px}
.fonte a{color:var(--texto);text-decoration:underline;text-underline-offset:3px}
.chamada{background:linear-gradient(135deg,rgba(245,185,0,.16),var(--cartao));border:1px solid rgba(245,185,0,.35);border-radius:16px;padding:20px;margin:32px 0}
.chamada p{color:var(--apoio);margin:0 0 14px}
.botao{display:inline-block;background:var(--ouro);color:#111;font-weight:700;text-decoration:none;padding:12px 18px;border-radius:12px}
.lista{list-style:none;margin:24px 0 0;padding:0;display:grid;gap:12px}
.lista li{background:var(--cartao);border:1px solid var(--borda);border-radius:14px;padding:16px}
.lista h2{font-size:19px;margin:4px 0 6px}
.lista h2 a{text-decoration:none}
.lista h2 a:hover{text-decoration:underline}
.lista p{margin:0;color:var(--apoio);font-size:15px}
.paginas{display:flex;justify-content:space-between;margin-top:24px}
.paginas a{color:var(--ouro)}
footer{border-top:1px solid var(--borda);color:var(--apoio);font-size:14px;text-align:center;padding:24px 16px}
footer a{color:var(--apoio)}
a:focus-visible{outline:2px solid var(--ouro);outline-offset:2px}
`;

interface Cabeca {
  titulo: string;
  descricao: string;
  caminho: string;
  indexar?: boolean;
  tipo?: 'website' | 'article';
  dadosEstruturados?: object[];
  /** Imagem do compartilhamento (og:image); sem ela, a do site */
  imagem?: string;
}

function documento(c: Cabeca, corpo: string): string {
  const canonica = `${SITE}${c.caminho}`;
  const ld = (c.dadosEstruturados ?? [])
    .map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`)
    .join('\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(c.titulo)}</title>
<meta name="description" content="${escapar(c.descricao)}">
<link rel="canonical" href="${canonica}">
${c.indexar === false ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="max-image-preview:large">'}
<meta property="og:type" content="${c.tipo ?? 'website'}">
<meta property="og:site_name" content="GTORei">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${escapar(c.titulo)}">
<meta property="og:description" content="${escapar(c.descricao)}">
<meta property="og:url" content="${canonica}">
<meta property="og:image" content="${escapar(c.imagem ?? `${SITE}/og-gtorei.png`)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico">
<style>${ESTILO}</style>
${ld}
</head>
<body>
<header class="topo">
  <a class="marca" href="/"><img src="/logo-128.png" alt="" width="32" height="32"><span>GTO<b>Rei</b></span></a>
  <nav aria-label="Principal"><a href="/noticias">Notícias</a><a href="/iniciante">Guia do iniciante</a><a class="cta" href="/">Treinar grátis</a></nav>
</header>
<main>
${corpo}
</main>
<footer>GTORei · treinador de poker GTO grátis em português · <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a></footer>
</body>
</html>`;
}

const CHAMADA_PARA_TREINAR = `<aside class="chamada">
  <h2>Treine as decisões que decidem torneios</h2>
  <p>O GTORei é um treinador de poker grátis, em português: abrir, defender, pagar all-in e jogar a mesa final, mão a mão, com a resposta e o porquê.</p>
  <a class="botao" href="/">Começar a treinar</a>
</aside>`;

const ORGANIZACAO = {
  '@type': 'Organization',
  name: 'GTORei',
  url: SITE,
  logo: { '@type': 'ImageObject', url: `${SITE}/logo-128.png` },
};

export function paginaDaNoticia(n: NoticiaPublicada, outras: NoticiaPublicada[]): string {
  const caminho = `/noticias/${n.slug}`;
  const mais = outras.filter((o) => o.slug !== n.slug).slice(0, 5);
  const corpo = `<nav class="trilha" aria-label="Você está em"><a href="/noticias">Notícias</a> ›</nav>
<article>
  <p class="meta">${escapar(dataPorExtenso(n.publicada_em))} · Fonte: ${escapar(n.fonte)}</p>
  <h1>${escapar(n.titulo)}</h1>
  ${
    n.imagem_url
      ? `<figure class="capa"><img src="${escapar(n.imagem_url)}" alt="${escapar(n.titulo)}" width="1200" height="630" fetchpriority="high">${
          n.imagem_credito ? `<figcaption>${escapar(n.imagem_credito)}</figcaption>` : ''
        }</figure>`
      : ''
  }
  <div class="resumo">
${paragrafos(n.resumo)}
  </div>
  <p class="fonte">Matéria original: <a href="${escapar(n.link)}" target="_blank" rel="noopener">${escapar(n.fonte)} ↗</a></p>
</article>
${CHAMADA_PARA_TREINAR}
${
  mais.length
    ? `<section aria-labelledby="mais"><h2 id="mais">Mais notícias</h2><ul class="lista">${mais
        .map(
          (o) =>
            `<li><p class="meta">${escapar(dataPorExtenso(o.publicada_em))} · ${escapar(o.fonte)}</p><h2><a href="/noticias/${o.slug}">${escapar(o.titulo)}</a></h2></li>`
        )
        .join('')}</ul></section>`
    : ''
}`;
  return documento(
    {
      titulo: `${n.titulo} | Notícias GTORei`,
      descricao: chamada(n.resumo, 155),
      caminho,
      tipo: 'article',
      imagem: imagemDe(n),
      dadosEstruturados: [
        {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: n.titulo.slice(0, 110),
          description: chamada(n.resumo, 200),
          datePublished: n.publicada_em,
          dateModified: n.atualizada_em ?? n.publicada_em,
          mainEntityOfPage: `${SITE}${caminho}`,
          image: [imagemDe(n)],
          author: ORGANIZACAO,
          publisher: ORGANIZACAO,
          isBasedOn: n.link,
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Notícias', item: `${SITE}/noticias` },
            { '@type': 'ListItem', position: 2, name: n.titulo, item: `${SITE}${caminho}` },
          ],
        },
      ],
    },
    corpo
  );
}

export const POR_PAGINA = 20;

/** Lista. `lista` traz até POR_PAGINA + 1 itens: o excedente só diz que há página seguinte. */
export function paginaDaLista(lista: NoticiaPublicada[], pagina: number): string {
  const desta = lista.slice(0, POR_PAGINA);
  const temMais = lista.length > POR_PAGINA;
  const caminho = pagina > 1 ? `/noticias?pagina=${pagina}` : '/noticias';
  const corpo = `<h1>Notícias de poker</h1>
<p class="meta">O que aconteceu no poker, com resumo do GTORei e o link para a matéria original.${pagina > 1 ? ` Página ${pagina}.` : ''}</p>
${
  desta.length
    ? `<ul class="lista">${desta
        .map(
          (n) =>
            `<li>${
              n.imagem_url
                ? `<a class="miniatura" href="/noticias/${n.slug}" tabindex="-1" aria-hidden="true"><img src="${escapar(n.imagem_url)}" alt="" width="1200" height="630" loading="lazy"></a>`
                : ''
            }<p class="meta">${escapar(dataPorExtenso(n.publicada_em))} · ${escapar(n.fonte)}</p><h2><a href="/noticias/${n.slug}">${escapar(n.titulo)}</a></h2><p>${escapar(chamada(n.resumo, 220))}</p></li>`
        )
        .join('')}</ul>`
    : '<p>As primeiras notícias chegam em breve.</p>'
}
<nav class="paginas" aria-label="Páginas">
  <span>${pagina > 1 ? `<a href="${pagina === 2 ? '/noticias' : `/noticias?pagina=${pagina - 1}`}">← Mais recentes</a>` : ''}</span>
  <span>${temMais ? `<a href="/noticias?pagina=${pagina + 1}">Anteriores →</a>` : ''}</span>
</nav>
${CHAMADA_PARA_TREINAR}`;
  return documento(
    {
      titulo: pagina > 1 ? `Notícias de poker, página ${pagina} | GTORei` : 'Notícias de poker | GTORei',
      descricao: 'Notícias de poker resumidas em português pelo GTORei, com o que importa para quem joga torneio e o link para a matéria original.',
      caminho,
      // Lista vazia não vai para o Google
      indexar: desta.length > 0,
    },
    corpo
  );
}

export function paginaNaoEncontrada(): string {
  return documento(
    { titulo: 'Notícia não encontrada | GTORei', descricao: 'Esta notícia não existe ou saiu do ar.', caminho: '/noticias', indexar: false },
    `<h1>Notícia não encontrada</h1><p>Ela pode ter saído do ar. <a href="/noticias">Ver todas as notícias</a>.</p>`
  );
}

export function sitemap(lista: NoticiaPublicada[]): string {
  const urls = [
    lista.length ? `<url><loc>${SITE}/noticias</loc><lastmod>${lista[0].atualizada_em ?? lista[0].publicada_em}</lastmod></url>` : '',
    ...lista.map((n) => `<url><loc>${SITE}/noticias/${n.slug}</loc><lastmod>${n.atualizada_em ?? n.publicada_em}</lastmod></url>`),
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
