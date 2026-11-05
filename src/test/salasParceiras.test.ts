import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GGPOKER_URL, WPT_GLOBAL_URL, WPT_OFERTA_IMG } from '@/data/salasParceiras';

// As páginas de notícia (api/_noticias.ts) repetem os links, porque api/ não importa de src/
const api = readFileSync(join(process.cwd(), 'api/_noticias.ts'), 'utf8');
const constante = (nome: string) => api.match(new RegExp(`export const ${nome} = '([^']+)'`))?.[1];

describe('links de indicação das salas', () => {
  it('as notícias usam os mesmos links do site', () => {
    expect(constante('GGPOKER_URL')).toBe(GGPOKER_URL);
    expect(constante('WPT_GLOBAL_URL')).toBe(WPT_GLOBAL_URL);
  });

  it('todo link de sala nas notícias sai como patrocinado', () => {
    const links = api.match(/<a [^>]*href="\$\{(GGPOKER_URL|WPT_GLOBAL_URL)\}"[^>]*>/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l).toContain('rel="sponsored noopener noreferrer"');
  });

  it('a arte da oferta existe', () => {
    expect(existsSync(join(process.cwd(), 'public', WPT_OFERTA_IMG))).toBe(true);
    expect(api).toContain(WPT_OFERTA_IMG);
  });
});
