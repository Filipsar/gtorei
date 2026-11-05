import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { definirAnuncios, ROTAS_SEM_ANUNCIO, SLOT_NOTICIAS } from '@/lib/anuncios';

type Fila = unknown[] & { pauseAdRequests?: number; requestNonPersonalizedAds?: number };
const fila = () => (window as unknown as { adsbygoogle: Fila }).adsbygoogle;

describe('AdSense no site', () => {
  beforeEach(() => {
    const f = [] as Fila;
    f.pauseAdRequests = 1; // como o head do index.html deixa
    (window as unknown as { adsbygoogle: Fila }).adsbygoogle = f;
    document.head.innerHTML = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=x"></script>';
  });

  it('libera para quem pode e pausa de novo', () => {
    definirAnuncios(true, false);
    expect(fila().pauseAdRequests).toBe(0);
    expect(fila().requestNonPersonalizedAds).toBe(1);
    definirAnuncios(false, false);
    expect(fila().pauseAdRequests).toBe(1);
  });

  it('personaliza só com consentimento', () => {
    definirAnuncios(true, true);
    expect(fila().requestNonPersonalizedAds).toBe(0);
  });

  it('a mesa de treino fica sem anúncio', () => {
    for (const r of ['/treinar', '/duelo', '/trilha']) expect(ROTAS_SEM_ANUNCIO).toContain(r);
  });

  it('o head começa pausado e o script é o do AdSense da conta', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    const ini = html.indexOf('<!-- ADSENSE:INICIO -->');
    const fim = html.indexOf('<!-- ADSENSE:FIM');
    expect(ini).toBeGreaterThan(-1);
    expect(fim).toBeGreaterThan(ini);
    const bloco = html.slice(ini, fim);
    expect(bloco.indexOf('pauseAdRequests = 1')).toBeLessThan(bloco.indexOf('adsbygoogle.js?client=ca-pub-7415553208405657'));
  });

  it('as notícias usam o bloco in-article da conta', () => {
    const api = readFileSync(join(process.cwd(), 'api/_noticias.ts'), 'utf8');
    expect(api.match(/export const ADSENSE_SLOT_NOTICIAS = '(\d+)'/)?.[1]).toBe(SLOT_NOTICIAS);
  });
});
