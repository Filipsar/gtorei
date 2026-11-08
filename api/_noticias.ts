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

// Links de indicação nas salas: os mesmos de src/data/salasParceiras.ts (a
// pasta api/ não importa de src/; o teste salasParceiras.test.ts confere).
export const GGPOKER_URL = 'https://signup.ggpass.com?qtag1=RFBR3103784&lang=pt-br&brand-id=GGPCOM';
export const WPT_GLOBAL_URL = 'https://wptglobal.com/poker-download?referralCode=79F94E';
// Google AdSense (05/11/2026): só nas páginas de notícia e só para quem não é
// PRO. A página não tem o login (é HTML do servidor), então lê duas marcas que o
// site grava no mesmo navegador: gtorei_sem_anuncio (useSupporter, conta PRO) e
// gtorei_consentimento (aviso de privacidade). Sem "Permitir", o anúncio sai não
// personalizado (requestNonPersonalizedAds). Laterais fixas de 160x600 ("Lateral
// anúncios"), uma de cada lado, só em tela de 1500px para cima.
export const ADSENSE_CLIENTE = 'ca-pub-7415553208405657';
/** Lateral 160x600 (o mesmo de SLOT_LATERAL em src/lib/anuncios.ts) */
export const ADSENSE_SLOT_LATERAL: string | null = '4504981437';
/** Bloco in-article do AdSense (o mesmo de SLOT_NOTICIAS em src/lib/anuncios.ts) */
export const ADSENSE_SLOT_NOTICIAS = '2904125157';

// Um bloco por página: na notícia, antes do parágrafo "O que fica para o seu
// torneio"; na lista, entre os destaques e as últimas. Para o PRO (marca
// sem-anuncio) o bloco some e não pede anúncio; sem anúncio para mostrar
// (unfilled), também some.
const BLOCO_DE_ANUNCIO = `<aside class="bloco-anuncio" aria-label="Publicidade"><p class="rotulo">Publicidade</p><ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="${ADSENSE_CLIENTE}" data-ad-slot="${ADSENSE_SLOT_NOTICIAS}"></ins><script>if(!document.documentElement.classList.contains('sem-anuncio')){(window.adsbygoogle=window.adsbygoogle||[]).push({});}</script></aside>`;

const ANUNCIOS_NA_CABECA = `<meta name="google-adsense-account" content="${ADSENSE_CLIENTE}">
<script>
(function(){
  try{if(localStorage.getItem('gtorei_sem_anuncio')==='1'){document.documentElement.classList.add('sem-anuncio');return;}}catch(e){}
  var personalizado=false;
  try{var c=JSON.parse(localStorage.getItem('gtorei_consentimento')||'null');personalizado=!!(c&&c.versao===1&&c.anunciosPersonalizados===true);}catch(e){}
  window.adsbygoogle=window.adsbygoogle||[];
  if(!personalizado)window.adsbygoogle.requestNonPersonalizedAds=1;
  var s=document.createElement('script');
  s.async=true;s.crossOrigin='anonymous';
  s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENTE}';
  document.head.appendChild(s);
})();
</script>`;

/** Uma coluna de anúncio de cada lado do texto, em tela larga (só com o bloco criado no AdSense) */
const TRILHOS_DE_ANUNCIO = ADSENSE_SLOT_LATERAL
  ? ['esq', 'dir']
      .map(
        (lado) => `<aside class="trilho ${lado}" aria-label="Publicidade"><ins class="adsbygoogle" style="display:block;width:160px;height:600px" data-ad-client="${ADSENSE_CLIENTE}" data-ad-slot="${ADSENSE_SLOT_LATERAL}"></ins></aside>`,
      )
      .join('\n') +
    `\n<script>(function(){if(document.documentElement.classList.contains('sem-anuncio'))return;if(!matchMedia('(min-width:1500px)').matches)return;document.querySelectorAll('.trilho').forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({});});})();</script>`
  : '';

// Escolha sobre anúncio personalizado para quem chega direto do Google na
// notícia: a mesma chave e o mesmo formato do aviso do site (consentimento.ts).
// Botões do mesmo tamanho; nada escolhido sem a pessoa escolher.
const AVISO_DE_ANUNCIOS = `<section class="aviso-ads" id="aviso-ads" role="region" aria-label="Privacidade e cookies" hidden>
  <p><b>Anúncios personalizados</b><br>O site mostra anúncios do Google AdSense para quem não é PRO. Com sua permissão, eles podem ser personalizados com cookies do Google. Sem ela, os anúncios continuam, mas genéricos. <a href="/cookies">Saiba mais</a>.</p>
  <div><button type="button" data-escolha="0">Não permitir</button><button type="button" data-escolha="1">Permitir</button></div>
</section>
<script>
(function(){
  var a=document.getElementById('aviso-ads');if(!a||document.documentElement.classList.contains('sem-anuncio'))return;
  try{var c=JSON.parse(localStorage.getItem('gtorei_consentimento')||'null');if(c&&c.versao===1&&typeof c.anunciosPersonalizados==='boolean')return;}catch(e){return;}
  a.hidden=false;
  a.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){
    try{localStorage.setItem('gtorei_consentimento',JSON.stringify({versao:1,anunciosPersonalizados:b.getAttribute('data-escolha')==='1',em:Date.now()}));}catch(e){}
    a.hidden=true;
  });});
})();
</script>`;

const AVISO_PARCEIROS =
  'Links de indicação: o GTORei pode receber comissão se você se cadastrar, sem custo para você. Só para maiores de 18 anos. Jogue com responsabilidade.';

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
  /** Resultado de torneio (migration 20261031130000); nulos quando não é resultado */
  torneio?: string | null;
  vencedor?: string | null;
  premio?: string | null;
  premio_usd?: number | null;
  relevancia?: number | null;
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
const COLUNAS_RESULTADO = `${COLUNAS},torneio,vencedor,premio,premio_usd,relevancia`;

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
  // Sem a migration das colunas de resultado (ou de imagem), tenta com menos colunas
  let resposta = await consultar(COLUNAS_RESULTADO);
  if (!resposta.ok) resposta = await consultar(COLUNAS);
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
function paragrafos(resumo: string, anuncio = ''): string {
  const ps = resumo
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapar(p.trim()).replace(/\n/g, '<br>')}</p>`);
  // O anúncio entra antes do último parágrafo ("O que fica para o seu torneio"),
  // nunca antes do primeiro: quem abriu a notícia lê o fato antes da propaganda
  if (anuncio && ps.length >= 2) ps.splice(ps.length - 1, 0, anuncio);
  return ps.join('\n');
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
main.largo{max-width:1120px}
.faixa{display:flex;align-items:stretch;background:var(--cartao);border:1px solid var(--borda);border-radius:12px;overflow:hidden;margin:4px 0 20px}
.faixa-rotulo{flex:none;display:flex;align-items:center;background:var(--ouro);color:#111;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:.04em;padding:0 14px}
.faixa-trilho{flex:1;overflow:hidden;position:relative}
.faixa-rolo{display:flex;width:max-content;animation:rolar 45s linear infinite}
.faixa-trilho ul{list-style:none;margin:0;padding:10px 32px 10px 0;display:flex;gap:32px}
.faixa-trilho:hover .faixa-rolo,.faixa-trilho:focus-within .faixa-rolo{animation-play-state:paused}
.faixa-trilho li{white-space:nowrap;font-size:14px}
.faixa-trilho a{text-decoration:none;color:var(--apoio)}
.faixa-trilho a b{color:var(--texto)}
.faixa-trilho a em{font-style:normal;color:var(--ouro);font-weight:700}
@keyframes rolar{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.faixa-trilho{overflow-x:auto}.faixa-rolo{animation:none}.faixa-trilho ul[aria-hidden]{display:none}}
.portal{display:grid;gap:24px}
@media (min-width:900px){.portal{grid-template-columns:minmax(0,1fr) 320px}}
.manchete{background:var(--cartao);border:1px solid var(--borda);border-radius:16px;overflow:hidden}
.manchete .miniatura{display:block;aspect-ratio:1200/630;background:var(--borda)}
.manchete img{display:block;width:100%;height:100%;object-fit:cover}
.manchete div{padding:18px 20px 20px}
.manchete h2{font-size:clamp(22px,3.2vw,30px);line-height:1.2;margin:6px 0 10px}
.manchete h2 a,.destaques h3 a{text-decoration:none}
.manchete h2 a:hover,.destaques h3 a:hover{text-decoration:underline}
.manchete p{margin:0;color:var(--apoio)}
.selo{display:inline-block;background:rgba(245,185,0,.15);color:var(--ouro);border:1px solid rgba(245,185,0,.4);border-radius:999px;font-size:12px;font-weight:700;padding:2px 10px;margin-right:6px}
.destaques{display:grid;gap:12px;margin-top:12px}
@media (min-width:600px){.destaques{grid-template-columns:1fr 1fr}}
.destaques article{background:var(--cartao);border:1px solid var(--borda);border-radius:14px;overflow:hidden}
.destaques .miniatura{display:block;aspect-ratio:1200/630;background:var(--borda)}
.destaques img{display:block;width:100%;height:100%;object-fit:cover}
.destaques div{padding:12px 14px 14px}
.destaques h3{font-size:17px;line-height:1.3;margin:4px 0 0}
.secao{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--ouro);margin:28px 0 0}
.grade{grid-template-columns:1fr}
@media (min-width:600px){.grade{grid-template-columns:1fr 1fr}}
.lateral{display:grid;gap:16px;align-content:start}
.premios{background:var(--cartao);border:1px solid var(--borda);border-radius:16px;padding:16px}
.premios h2{font-size:17px;margin:0 0 10px}
.premios ol{list-style:none;margin:0;padding:0;counter-reset:p}
.premios li{counter-increment:p;display:grid;grid-template-columns:24px 1fr;gap:2px 8px;padding:10px 0;border-top:1px solid var(--borda)}
.premios li:first-child{border-top:0}
.premios li::before{content:counter(p);grid-row:span 2;font-weight:800;color:var(--ouro)}
.premios a{text-decoration:none;font-weight:700}
.premios a:hover{text-decoration:underline}
.premios small{color:var(--apoio);font-size:13px}
.premios .valor{color:var(--ouro)}
.lateral .chamada{margin:0}
footer{border-top:1px solid var(--borda);color:var(--apoio);font-size:14px;text-align:center;padding:24px 16px}
footer a{color:var(--apoio)}
a:focus-visible{outline:2px solid var(--ouro);outline-offset:2px}
.parceiros{background:var(--cartao);border:1px solid var(--borda);border-radius:16px;padding:16px;margin:32px 0}
.lateral .parceiros{margin:0}
.parceiros h2{font-size:17px;margin:0 0 6px}
.parceiros p{color:var(--apoio);font-size:14px;margin:0 0 12px}
.parceiros .salas{display:grid;gap:8px}
.parceiros .salas a{display:flex;justify-content:space-between;align-items:center;background:#242424;border:1px solid var(--borda);border-radius:10px;padding:10px 12px;font-weight:700;text-decoration:none}
.parceiros .salas a:hover{border-color:var(--ouro)}
.parceiros .salas a span{color:var(--ouro);font-size:13px;font-weight:600}
.parceiros small{display:block;color:var(--apoio);font-size:12px;line-height:1.5;margin-top:10px}
dialog.oferta{border:0;padding:0;background:transparent;max-width:min(92vw,420px)}
dialog.oferta::backdrop{background:rgba(0,0,0,.75)}
.oferta a.arte{display:block}
.oferta img{display:block;width:100%;height:auto;max-height:88vh;object-fit:contain;border-radius:14px}
.oferta .fechar{position:absolute;top:8px;right:8px;width:36px;height:36px;border-radius:999px;border:0;background:rgba(0,0,0,.7);color:#fff;font-size:22px;line-height:1;cursor:pointer}
.bloco-anuncio{margin:24px 0;min-height:120px}
.bloco-anuncio .rotulo{margin:0 0 4px;text-align:center;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--apoio)}
.sem-anuncio .bloco-anuncio,.bloco-anuncio:has(ins[data-ad-status="unfilled"]){display:none}
.trilho{display:none;position:fixed;top:96px;width:160px;height:600px}
.trilho.esq{left:max(12px,calc(50% - 560px - 184px))}
.trilho.dir{right:max(12px,calc(50% - 560px - 184px))}
@media (min-width:1500px){.trilho{display:block}}
.sem-anuncio .trilho{display:none!important}
.trilho:has(ins[data-ad-status="unfilled"]){display:none!important}
.aviso-ads{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:12px}
.aviso-ads[hidden]{display:none}
.aviso-ads p{max-width:640px;margin:0 auto;background:var(--cartao);border:1px solid var(--borda);border-bottom:0;border-radius:12px 12px 0 0;padding:14px 16px 8px;font-size:14px;color:var(--apoio)}
.aviso-ads p b{color:var(--texto)}
.aviso-ads p a{color:var(--ouro)}
.aviso-ads div{max-width:640px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:8px;background:var(--cartao);border:1px solid var(--borda);border-top:0;border-radius:0 0 12px 12px;padding:0 16px 14px}
.aviso-ads button{background:transparent;color:var(--texto);border:1px solid var(--borda);border-radius:10px;padding:10px;font:inherit;font-weight:600;cursor:pointer}
.aviso-ads button:hover{border-color:var(--ouro)}
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
  /** Página larga (a lista com faixa e coluna lateral) */
  largo?: boolean;
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
${ANUNCIOS_NA_CABECA}
${ld}
</head>
<body>
<header class="topo">
  <a class="marca" href="/"><img src="/logo-128.png" alt="" width="32" height="32"><span>GTO<b>Rei</b></span></a>
  <nav aria-label="Principal"><a href="/noticias">Notícias</a><a href="/iniciante">Guia do iniciante</a><a class="cta" href="/">Treinar grátis</a></nav>
</header>
<main${c.largo ? ' class="largo"' : ''}>
${corpo}
</main>
<footer>GTORei · treinador de poker GTO grátis em português · <a href="/termos">Termos</a> · <a href="/privacidade">Privacidade</a></footer>
${TRILHOS_DE_ANUNCIO}
${AVISO_DE_ANUNCIOS}
${POPUP_DA_OFERTA}
</body>
</html>`;
}

const SALAS_PARCEIRAS = `<aside class="parceiros">
  <h2>Onde jogar</h2>
  <p>Leve o treino para a mesa nas salas parceiras do GTORei.</p>
  <div class="salas">
    <a href="${WPT_GLOBAL_URL}" target="_blank" rel="sponsored noopener noreferrer">WPT Global <span>Oferta de boas-vindas →</span></a>
    <a href="${GGPOKER_URL}" target="_blank" rel="sponsored noopener noreferrer">GGPoker <span>Criar conta →</span></a>
  </div>
  <small>${AVISO_PARCEIROS}</small>
</aside>`;

// Pop-up da oferta da WPT Global: uma vez por dia por navegador, 2 s depois de
// abrir. Sem storage (aba anônima com cookies negados), não abre: melhor que
// abrir a cada página. Esc e o X fecham (é um <dialog> nativo).
const POPUP_DA_OFERTA = `<dialog class="oferta" id="oferta" aria-label="Oferta de boas-vindas da WPT Global">
  <button class="fechar" type="button" aria-label="Fechar">×</button>
  <a class="arte" href="${WPT_GLOBAL_URL}" target="_blank" rel="sponsored noopener noreferrer"><img src="/parceiros/wpt-oferta.webp" alt="WPT Global: oferta de boas-vindas para conta nova" width="1126" height="2000" loading="lazy"></a>
</dialog>
<script>
(function(){
  var d=document.getElementById('oferta');
  if(!d||typeof d.showModal!=='function')return;
  var hoje=new Date().toISOString().slice(0,10),chave='gtorei_oferta_wpt_dia';
  try{if(localStorage.getItem(chave)===hoje)return;}catch(e){return;}
  var fechar=function(){d.close();};
  d.querySelector('.fechar').addEventListener('click',fechar);
  d.addEventListener('click',function(e){if(e.target===d)fechar();});
  d.querySelectorAll('a').forEach(function(a){a.addEventListener('click',fechar);});
  setTimeout(function(){
    try{localStorage.setItem(chave,hoje);}catch(e){return;}
    d.querySelector('img').loading='eager';
    d.showModal();
  },2000);
})();
</script>`;

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
${paragrafos(n.resumo, BLOCO_DE_ANUNCIO)}
  </div>
  <p class="fonte">Matéria original: <a href="${escapar(n.link)}" target="_blank" rel="noopener">${escapar(n.fonte)} ↗</a></p>
</article>
${CHAMADA_PARA_TREINAR}
${SALAS_PARCEIRAS}
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

/** O que a primeira página da lista mostra além das notícias */
export interface ExtrasDaLista {
  /** Resultados recentes (com vencedor e prêmio), para a faixa do topo */
  resultados?: NoticiaPublicada[];
  /** Maiores premiações do mês, já em ordem */
  premios?: NoticiaPublicada[];
}

const miniatura = (n: NoticiaPublicada, carregar: 'lazy' | 'eager' = 'lazy') =>
  n.imagem_url
    ? `<a class="miniatura" href="/noticias/${n.slug}" tabindex="-1" aria-hidden="true"><img src="${escapar(n.imagem_url)}" alt="" width="1200" height="630" loading="${carregar}"></a>`
    : '';

const meta = (n: NoticiaPublicada) =>
  `<p class="meta">${n.torneio ? `<span class="selo">${escapar(n.torneio)}</span>` : ''}${escapar(dataPorExtenso(n.publicada_em))} · ${escapar(n.fonte)}</p>`;

/** Faixa que rola com os últimos resultados; a lista vai duas vezes para o laço não ter emenda */
function faixa(resultados: NoticiaPublicada[]): string {
  const itens = resultados
    .filter((r) => r.vencedor && r.premio)
    .map(
      (r) =>
        `<li><a href="/noticias/${r.slug}">🏆 <b>${escapar(r.vencedor!)}</b>${r.torneio ? ` · ${escapar(r.torneio)}` : ''} · <em>${escapar(r.premio!)}</em></a></li>`,
    )
    .join('');
  if (!itens) return '';
  return `<section class="faixa" aria-label="Últimos resultados"><span class="faixa-rotulo">Últimos resultados</span><div class="faixa-trilho"><div class="faixa-rolo"><ul>${itens}</ul><ul aria-hidden="true">${itens.replace(/<a /g, '<a tabindex="-1" ')}</ul></div></div></section>`;
}

function quadroDePremios(premios: NoticiaPublicada[]): string {
  const itens = premios
    .filter((p) => p.vencedor && p.premio)
    .slice(0, 5)
    .map(
      (p) =>
        `<li><a href="/noticias/${p.slug}">${escapar(p.vencedor!)}</a><small><span class="valor">${escapar(p.premio!)}</span>${p.torneio ? ` · ${escapar(p.torneio)}` : ''}</small></li>`,
    )
    .join('');
  return itens ? `<section class="premios" aria-labelledby="premios"><h2 id="premios">Maiores prêmios do mês</h2><ol>${itens}</ol></section>` : '';
}

/**
 * Lista. `lista` traz até POR_PAGINA + 1 itens: o excedente só diz que há
 * página seguinte. A primeira página é a de portal: faixa de resultados,
 * manchete (a de maior relevância, empate fica com a mais nova), dois
 * destaques, o resto em grade e, ao lado, as maiores premiações do mês.
 */
export function paginaDaLista(lista: NoticiaPublicada[], pagina: number, extras: ExtrasDaLista = {}): string {
  const desta = lista.slice(0, POR_PAGINA);
  const temMais = lista.length > POR_PAGINA;
  const caminho = pagina > 1 ? `/noticias?pagina=${pagina}` : '/noticias';

  const cartao = (n: NoticiaPublicada) =>
    `<li>${miniatura(n)}${meta(n)}<h2><a href="/noticias/${n.slug}">${escapar(n.titulo)}</a></h2><p>${escapar(chamada(n.resumo, 180))}</p></li>`;

  let conteudo: string;
  if (!desta.length) {
    conteudo = '<p>As primeiras notícias chegam em breve.</p>';
  } else if (pagina > 1) {
    conteudo = `${BLOCO_DE_ANUNCIO}<ul class="lista grade">${desta.map(cartao).join('')}</ul>`;
  } else {
    const relev = (n: NoticiaPublicada) => n.relevancia ?? 1;
    const manchete = desta.reduce((a, b) => (relev(b) > relev(a) ? b : a), desta[0]);
    const resto = desta.filter((n) => n !== manchete);
    const destaques = [...resto].sort((a, b) => relev(b) - relev(a)).slice(0, 2);
    const demais = resto.filter((n) => !destaques.includes(n));
    conteudo = `<article class="manchete">${miniatura(manchete, 'eager')}<div>${meta(manchete)}<h2><a href="/noticias/${manchete.slug}">${escapar(manchete.titulo)}</a></h2><p>${escapar(chamada(manchete.resumo, 260))}</p></div></article>
${
  destaques.length
    ? `<div class="destaques">${destaques
        .map((n) => `<article>${miniatura(n)}<div>${meta(n)}<h3><a href="/noticias/${n.slug}">${escapar(n.titulo)}</a></h3></div></article>`)
        .join('')}</div>`
    : ''
}
${BLOCO_DE_ANUNCIO}
${demais.length ? `<h2 class="secao">Últimas notícias</h2><ul class="lista grade">${demais.map(cartao).join('')}</ul>` : ''}`;
  }

  const corpo = `<h1>Notícias de poker</h1>
<p class="meta">Resultados, torneios e o que muda para quem joga, resumidos pelo GTORei com o link para a matéria original.${pagina > 1 ? ` Página ${pagina}.` : ''}</p>
${pagina === 1 ? faixa(extras.resultados ?? []) : ''}
<div class="portal">
<div class="principal">
${conteudo}
<nav class="paginas" aria-label="Páginas">
  <span>${pagina > 1 ? `<a href="${pagina === 2 ? '/noticias' : `/noticias?pagina=${pagina - 1}`}">← Mais recentes</a>` : ''}</span>
  <span>${temMais ? `<a href="/noticias?pagina=${pagina + 1}">Anteriores →</a>` : ''}</span>
</nav>
</div>
<aside class="lateral" aria-label="Destaques do mês">
${pagina === 1 ? quadroDePremios(extras.premios ?? []) : ''}
${CHAMADA_PARA_TREINAR}
${SALAS_PARCEIRAS}
</aside>
</div>`;
  return documento(
    {
      titulo: pagina > 1 ? `Notícias de poker, página ${pagina} | GTORei` : 'Notícias de poker | GTORei',
      descricao: 'Notícias de poker resumidas em português pelo GTORei: resultados, torneios e o que importa para quem joga, com o link para a matéria original.',
      caminho,
      largo: true,
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
