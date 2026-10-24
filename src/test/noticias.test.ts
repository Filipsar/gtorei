import { describe, expect, it } from 'vitest';
import {
  chamada,
  escapar,
  lerRss,
  limparLink,
  paginaDaLista,
  paginaDaNoticia,
  sitemap,
  type NoticiaPublicada,
} from '../../api/_noticias';
import { MINIMO_DO_RESUMO, slugDaNoticia } from '@/lib/noticias';

// Itens no formato das fontes de verdade (conferido em 24/10/2026)
const POKERNEWS = `<rss><channel><title>PokerNews</title>
<item>
  <title>Monte sua Grade: BSOP lança ferramenta</title>
  <link>https://br.pokernews.com/noticias/2026/10/monte-sua-grade-67935.htm?utm_medium=feed&amp;utm_campaign=homefeed&amp;utm_source=rss</link>
  <pubDate>Fri, 23 Oct 2026 15:20:00 +0000</pubDate>
  <description><![CDATA[<img src="https://s.pnimg.net/x.webp" alt="BSOP" /><p>O BSOP lançou uma ferramenta &amp; mais.</p>]]></description>
</item>
<item><title>Sem link</title></item>
<item><title>Link estranho</title><link>javascript:alert(1)</link></item>
</channel></rss>`;

const CARDPLAYER = `<rss><channel><item>
  <title>Vitalijs Zavorotnijs Wins Poker Masters Event No. 4</title>
  <link>https://www.cardplayer.com/poker-news/1763118-vitalijs</link>
  <description>&lt;p&gt;Resumo &amp;amp; texto&lt;/p&gt;</description>
  <pubDate>October 17, 2026</pubDate>
</item></channel></rss>`;

const noticia = (parcial: Partial<NoticiaPublicada> = {}): NoticiaPublicada => ({
  titulo: 'BSOP lança ferramenta para montar a grade do Millions',
  resumo: 'O BSOP colocou no ar uma ferramenta para montar a grade de torneios do Millions. '.repeat(4) + '\n\nSegundo parágrafo <b>com</b> marcação.',
  slug: 'bsop-lanca-ferramenta-a1b2c3',
  fonte: 'PokerNews Brasil',
  link: 'https://br.pokernews.com/noticias/2026/10/monte-sua-grade-67935.htm',
  publicada_em: '2026-10-24T15:00:00.000Z',
  atualizada_em: null,
  imagem_url: null,
  imagem_credito: null,
  ...parcial,
});

describe('leitura dos feeds', () => {
  it('pega título, link sem utm, data e trecho em texto puro', () => {
    const [item, ...resto] = lerRss(POKERNEWS, 'PokerNews Brasil');
    expect(resto).toHaveLength(0); // sem link ou com link que não é http: fora
    expect(item.titulo).toBe('Monte sua Grade: BSOP lança ferramenta');
    expect(item.link).toBe('https://br.pokernews.com/noticias/2026/10/monte-sua-grade-67935.htm');
    expect(item.data).toBe('2026-10-23T15:20:00.000Z');
    expect(item.trecho).toBe('O BSOP lançou uma ferramenta & mais.');
  });

  it('entende HTML escapado e data por extenso', () => {
    const [item] = lerRss(CARDPLAYER, 'CardPlayer');
    expect(item.trecho).toBe('Resumo & texto');
    expect(item.data?.startsWith('2026-10-17')).toBe(true);
  });

  it('só aceita link http(s)', () => {
    expect(limparLink('javascript:alert(1)')).toBeNull();
    expect(limparLink('https://a.com/x?utm_source=rss&id=3')).toBe('https://a.com/x?id=3');
  });
});

describe('páginas das notícias', () => {
  it('a notícia sai com o resumo do GTORei, link para a fonte e dados para o Google', () => {
    const html = paginaDaNoticia(noticia(), [noticia(), noticia({ slug: 'outra-d4e5f6', titulo: 'Outra notícia' })]);
    expect(html).toContain('<link rel="canonical" href="https://www.gtorei.com.br/noticias/bsop-lanca-ferramenta-a1b2c3">');
    expect(html).toContain('"@type":"NewsArticle"');
    expect(html).toContain('href="https://br.pokernews.com/noticias/2026/10/monte-sua-grade-67935.htm"');
    // Texto do admin é escapado: marcação vira texto
    expect(html).toContain('&lt;b&gt;com&lt;/b&gt;');
    expect(html).not.toContain('<b>com</b>');
    // Dois parágrafos; e a própria notícia não aparece em "Mais notícias"
    expect(html.match(/<p>/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('href="/noticias/outra-d4e5f6"');
    expect(html).not.toContain('href="/noticias/bsop-lanca-ferramenta-a1b2c3"');
  });

  it('com imagem: capa, crédito escapado, og:image e miniatura na lista', () => {
    const imagem = 'https://x.supabase.co/storage/v1/object/public/noticias/abc/gerada-1.png';
    const n = noticia({ imagem_url: imagem, imagem_credito: 'Foto: <PokerGO>' });
    const html = paginaDaNoticia(n, []);
    expect(html).toContain(`<figure class="capa"><img src="${imagem}"`);
    expect(html).toContain('<figcaption>Foto: &lt;PokerGO&gt;</figcaption>');
    expect(html).toContain(`<meta property="og:image" content="${imagem}">`);
    expect(html).toContain('max-image-preview:large');
    expect(html).toContain(`"image":["${imagem}"]`);
    expect(paginaDaLista([n], 1)).toContain('class="miniatura"');
    // Sem imagem: nem capa, e o compartilhamento usa a do site
    const sem = paginaDaNoticia(noticia(), []);
    expect(sem).not.toContain('<figure');
    expect(sem).toContain('og-gtorei.png');
  });

  it('lista vazia não é indexada; com notícias, é', () => {
    expect(paginaDaLista([], 1)).toContain('<meta name="robots" content="noindex">');
    const cheia = paginaDaLista([noticia()], 1);
    expect(cheia).not.toContain('noindex');
    expect(cheia).toContain('Notícias de poker');
  });

  it('sitemap traz a lista e cada notícia', () => {
    const xml = sitemap([noticia()]);
    expect(xml).toContain('<loc>https://www.gtorei.com.br/noticias</loc>');
    expect(xml).toContain('<loc>https://www.gtorei.com.br/noticias/bsop-lanca-ferramenta-a1b2c3</loc>');
  });

  it('escapa e corta no fim da palavra', () => {
    expect(escapar(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    expect(chamada('uma frase bem longa aqui', 12)).toBe('uma frase…');
  });
});

describe('slug e resumo no admin', () => {
  it('slug sem acento, com o começo do id para não repetir', () => {
    expect(slugDaNoticia('João Simão é campeão do BSOP: R$ 1 milhão!', 'a1b2c3d4-0000')).toBe('joao-simao-e-campeao-do-bsop-r-1-milhao-a1b2c3');
  });

  it('o mínimo do resumo é o mesmo do banco', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync('supabase/migrations/20261024160000_noticias.sql', 'utf8');
    expect(sql).toContain(`length(resumo) >= ${MINIMO_DO_RESUMO}`);
  });
});
