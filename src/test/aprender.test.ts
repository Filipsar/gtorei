import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ARTIGOS, materialDoArtigo } from '@/data/artigos';
import { paginaDaLista, paginaDaNoticia, GGPOKER_URL, WPT_GLOBAL_URL } from '../../api/_noticias';

const ler = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('artigos de conceito (/aprender)', () => {
  it('cada artigo está no sitemap e tem slug único', () => {
    const sitemap = ler('public/sitemap.xml');
    expect(sitemap).toContain('<loc>https://www.gtorei.com.br/aprender</loc>');
    expect(new Set(ARTIGOS.map((a) => a.slug)).size).toBe(ARTIGOS.length);
    for (const a of ARTIGOS) expect(sitemap, a.slug).toContain(`<loc>https://www.gtorei.com.br/aprender/${a.slug}</loc>`);
  });

  it('cada artigo tem texto de verdade, não só o resumo do material', () => {
    for (const a of ARTIGOS) {
      const m = materialDoArtigo(a);
      const texto = [a.abertura, ...a.secoes.flatMap((s) => s.paragrafos), ...(a.exemplo?.passos ?? []), m.porQue, ...m.naPratica, m.erroComum].join(' ');
      const palavras = texto.split(/\s+/).length;
      expect(palavras, a.slug).toBeGreaterThanOrEqual(500);
      expect(a.secoes.length, a.slug).toBeGreaterThanOrEqual(3);
      expect(a.tituloSeo.length, a.slug).toBeLessThanOrEqual(70);
      expect(a.descricao.length, a.slug).toBeLessThanOrEqual(170);
    }
  });

  it('o robots.txt não bloqueia os artigos nem as tabelas', () => {
    const robots = ler('public/robots.txt');
    expect(robots).not.toMatch(/Disallow: \/aprender/);
    expect(robots).not.toMatch(/Disallow: \/tabelas/);
  });
});

// 19/11/2026: sala de aposta é categoria restrita no AdSense e quem revisa não
// faz login. Os links das salas parceiras ficam só no menu de quem está logado.
describe('salas parceiras fora das páginas públicas', () => {
  const noticia = {
    id: '1', slug: 'x-a1b2c3', titulo: 'Título', resumo: 'Um.\n\nDois.\n\nO que fica para o seu torneio: três.',
    fonte: 'F', link: 'https://f', titulo_fonte: 'T', publicada_na_fonte: '2026-11-18T10:00:00Z', publicada_em: '2026-11-18T10:00:00Z',
    atualizada_em: null, imagem_url: null, imagem_credito: null,
  } as Parameters<typeof paginaDaNoticia>[0];

  it('notícia e lista não têm link nem pop-up de sala', () => {
    for (const html of [paginaDaNoticia(noticia, [noticia]), paginaDaLista([noticia, noticia], 1)]) {
      expect(html).not.toContain(GGPOKER_URL);
      expect(html).not.toContain(WPT_GLOBAL_URL);
      expect(html).not.toContain('id="oferta"');
    }
  });

  it('a página inicial não monta o bloco de salas', () => {
    expect(ler('src/pages/HomePage.tsx')).not.toContain('<SalasParceiras');
  });

  it('no menu lateral, as salas só aparecem com login', () => {
    const menu = ler('src/components/layout/AppSidebar.tsx').replace(/\r\n/g, '\n');
    expect(menu).toMatch(/\.\.\.\(user\n\s+\? \[\n\s+\{ title: t\.sidebar\.ggpoker/);
  });
});
