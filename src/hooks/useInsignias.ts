import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Nível de indicação de cada jogador (0 = sem insígnia), guardado no módulo:
// o MainLayout remonta a cada página e o ranking, a comunidade e o perfil
// pedem os mesmos jogadores.
const cache = new Map<string, number>();
// Sem a função no banco (migration 20261104120000 por aplicar), não pede de novo
let indisponivel = false;

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{
  data: { user_id: string; nivel: number }[] | null;
  error: unknown;
}>;

/** Busca no banco os níveis que faltam no cache. Devolve false se não deu. */
async function buscar(ids: string[]): Promise<boolean> {
  const faltam = [...new Set(ids)].filter((id) => !cache.has(id));
  if (faltam.length === 0) return true;
  if (indisponivel) return false;
  const rpc = supabase.rpc as unknown as Rpc;
  for (let i = 0; i < faltam.length; i += 200) {
    const lote = faltam.slice(i, i + 200);
    const { data, error } = await rpc.call(supabase, 'insignias_de_indicacao', { _ids: lote });
    if (error) {
      indisponivel = true;
      return false;
    }
    for (const id of lote) cache.set(id, 0);
    for (const r of data ?? []) cache.set(r.user_id, Number(r.nivel) || 0);
  }
  return true;
}

/** Nível de indicação de cada jogador da lista (sem entrada = sem insígnia) */
export function useInsignias(ids: string[]): Map<string, number> {
  const chave = [...new Set(ids)].sort().join(',');
  const [niveis, setNiveis] = useState<Map<string, number>>(() => mapaDe(ids));

  useEffect(() => {
    if (!chave) return;
    const lista = chave.split(',');
    let vivo = true;
    void buscar(lista).then(() => {
      if (vivo) setNiveis(mapaDe(lista));
    });
    return () => {
      vivo = false;
    };
  }, [chave]);

  return niveis;
}

function mapaDe(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) {
    const n = cache.get(id);
    if (n) m.set(id, n);
  }
  return m;
}
