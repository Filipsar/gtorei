// Conquistas em destaque no perfil (profiles.conquistas_destaque, migration
// 20261104120000). Até 3; o banco recusa conquista que a pessoa não tem.

import { supabase } from '@/integrations/supabase/client';
import { getAchievement } from '@/data/achievements';

export const MAX_DESTAQUES = 3;

// A coluna ainda não está nos tipos gerados do Supabase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const perfis = () => (supabase.from as unknown as (t: string) => any)('profiles');

/** Só chaves que existem, sem repetir, no máximo 3 */
export function limparDestaques(chaves: readonly unknown[] | null | undefined): string[] {
  const vistas = new Set<string>();
  for (const k of chaves ?? []) {
    if (typeof k === 'string' && getAchievement(k) && !vistas.has(k)) vistas.add(k);
    if (vistas.size === MAX_DESTAQUES) break;
  }
  return [...vistas];
}

/** Liga ou desliga uma conquista na lista; null quando a lista já está cheia */
export function alternarDestaque(atuais: string[], chave: string): string[] | null {
  if (atuais.includes(chave)) return atuais.filter((k) => k !== chave);
  if (atuais.length >= MAX_DESTAQUES) return null;
  return [...atuais, chave];
}

/** Destaques de um jogador; null se a coluna ainda não existe no banco */
export async function lerDestaques(userId: string): Promise<string[] | null> {
  const { data, error } = await perfis().select('conquistas_destaque').eq('user_id', userId).maybeSingle();
  if (error) return null;
  return limparDestaques(data?.conquistas_destaque);
}

/** Grava a lista do próprio jogador; devolve false se o banco recusou */
export async function salvarDestaques(userId: string, chaves: string[]): Promise<boolean> {
  const { error } = await perfis().update({ conquistas_destaque: limparDestaques(chaves) }).eq('user_id', userId);
  return !error;
}
