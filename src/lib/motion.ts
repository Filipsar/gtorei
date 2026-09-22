import type { gsap as GSAPType } from 'gsap';

export type Gsap = typeof GSAPType;

/**
 * Carregamento do GSAP em um lugar só.
 *
 * Ele entra por import dinâmico, fora do bundle inicial, e quem pediu menos
 * movimento no sistema nem chega a baixar o arquivo — a função devolve null
 * antes de importar qualquer coisa.
 */

export function prefereMenosMovimento(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

let promessa: Promise<Gsap> | null = null;

export function carregarGsap(): Promise<Gsap> | null {
  if (prefereMenosMovimento()) return null;
  if (!promessa) promessa = import('gsap').then((modulo) => modulo.gsap);
  return promessa;
}
