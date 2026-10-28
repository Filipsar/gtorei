// GET /api/capa?slug=...: a arte do GTORei (1200x630) para a notícia publicada
// sem foto, com o título dela, o Rei lendo e a marca. É a mesma arte que o
// admin gera no navegador (src/lib/imagemDaNoticia.ts), feita aqui para as
// notícias automáticas, que não passam pelo admin.
//
// Recebe o slug, não o texto: o título vem do banco, só de notícia publicada,
// para ninguém gerar imagem com texto qualquer no domínio do GTORei.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { supabasePublico } from './_noticias.js';

const OURO = '#F5B900';
const arquivo = (nome: string) => readFileSync(join(process.cwd(), 'api', '_arquivos', nome));

type No = { type: string; props: Record<string, unknown> };
const el = (type: string, style: Record<string, unknown>, ...children: (No | string)[]): No => ({
  type,
  // O satori exige display explícito em toda div
  props: { style: type === 'div' ? { display: 'flex', ...style } : style, children: children.length === 1 ? children[0] : children },
});

async function tituloDaNoticia(slug: string): Promise<string | null> {
  const sb = supabasePublico();
  if (!sb) return null;
  const r = await fetch(`${sb.url}/rest/v1/noticias?select=titulo&status=eq.publicada&slug=eq.${encodeURIComponent(slug)}`, {
    headers: { apikey: sb.chave, Authorization: `Bearer ${sb.chave}` },
  });
  if (!r.ok) return null;
  const [n] = (await r.json()) as { titulo: string }[];
  return n?.titulo ?? null;
}

/** Tamanho do título para caber em até 4 linhas na coluna da esquerda */
export function tamanhoDoTitulo(titulo: string): number {
  const n = titulo.length;
  return n <= 55 ? 64 : n <= 80 ? 56 : n <= 110 ? 48 : 42;
}

export function arte(titulo: string, rei: string): No {
  return el(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      position: 'relative',
      backgroundColor: '#111111',
      backgroundImage: 'radial-gradient(circle at 82% 62%, rgba(245,185,0,0.30) 0%, rgba(245,185,0,0) 460px)',
      fontFamily: 'Inter',
      color: '#FFFFFF',
    },
    el('div', { position: 'absolute', left: 0, top: 0, width: 14, height: 630, backgroundColor: OURO }),
    { type: 'img', props: { src: rei, width: 349, height: 440, style: { position: 'absolute', right: 56, bottom: 28 } } },
    el(
      'div',
      { position: 'absolute', left: 72, top: 70, width: 640, height: 490, display: 'flex', flexDirection: 'column' },
      el(
        'div',
        { display: 'flex', alignSelf: 'flex-start', border: `2px solid ${OURO}`, borderRadius: 23, padding: '8px 20px', color: OURO, fontSize: 24, fontWeight: 600 },
        'NOTÍCIAS',
      ),
      el('div', { display: 'flex', marginTop: 48, fontSize: tamanhoDoTitulo(titulo), fontWeight: 700, lineHeight: 1.18 }, titulo),
      el(
        'div',
        { display: 'flex', alignItems: 'baseline', marginTop: 'auto', fontSize: 30, fontWeight: 700 },
        el('span', { color: OURO }, 'GTO'),
        el('span', {}, 'Rei'),
        el('span', { marginLeft: 40, fontSize: 22, fontWeight: 600, color: '#9A9A9A' }, 'gtorei.com.br/noticias'),
      ),
    ),
  );
}

/** PNG 1200x630: o satori monta o SVG e o resvg rasteriza */
export async function desenhar(titulo: string): Promise<Buffer> {
  const rei = `data:image/png;base64,${arquivo('rei-lendo.png').toString('base64')}`;
  const svg = await satori(arte(titulo, rei) as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: arquivo('inter-latin-700-normal.woff'), weight: 700, style: 'normal' },
      { name: 'Inter', data: arquivo('inter-latin-600-normal.woff'), weight: 600, style: 'normal' },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const slug = new URL(req.url ?? '/', 'http://x').searchParams.get('slug') ?? '';
  const titulo = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? await tituloDaNoticia(slug) : null;
  if (!titulo) {
    res.statusCode = 404;
    res.end('Notícia não encontrada');
    return;
  }

  const png = await desenhar(titulo.slice(0, 160));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/png');
  // O título de uma notícia publicada não muda à toa: a CDN guarda por um dia
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
  res.end(png);
}
