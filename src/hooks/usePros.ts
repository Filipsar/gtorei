import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Quem é PRO entre os jogadores mostrados (pros_entre, migration
// 20261104140000). Guardado no módulo, como as insígnias: o layout remonta a
// cada página e o ranking e o perfil pedem os mesmos jogadores.
const cache = new Map<string, boolean>();
// Sem a função no banco, não pede de novo até recarregar
let indisponivel = false;

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: { user_id: string }[] | null; error: unknown }>;

async function buscar(ids: string[]): Promise<void> {
  const faltam = [...new Set(ids)].filter((id) => !cache.has(id));
  if (faltam.length === 0 || indisponivel) return;
  const rpc = supabase.rpc as unknown as Rpc;
  for (let i = 0; i < faltam.length; i += 200) {
    const lote = faltam.slice(i, i + 200);
    const { data, error } = await rpc.call(supabase, 'pros_entre', { _ids: lote });
    if (error) {
      indisponivel = true;
      return;
    }
    for (const id of lote) cache.set(id, false);
    for (const r of data ?? []) cache.set(r.user_id, true);
  }
}

const conjuntoDe = (ids: string[]) => new Set(ids.filter((id) => cache.get(id)));

/** Os ids da lista que são PRO */
export function usePros(ids: string[]): Set<string> {
  const chave = [...new Set(ids)].sort().join(',');
  const [pros, setPros] = useState<Set<string>>(() => conjuntoDe(ids));

  useEffect(() => {
    if (!chave) return;
    const lista = chave.split(',');
    let vivo = true;
    void buscar(lista).then(() => {
      if (vivo) setPros(conjuntoDe(lista));
    });
    return () => {
      vivo = false;
    };
  }, [chave]);

  return pros;
}
