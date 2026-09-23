import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Se a conta tem acesso de apoiador.
 *
 * A resposta vem do banco, não de nada guardado no navegador — quem apoiou está
 * na tabela `supporters`, e o admin concede pela tela de administração.
 *
 * É um bloqueio de tela, e não de segurança: o treino roda todo no navegador,
 * então quem mexer no console abre assim mesmo. Para um modo de estudo está de
 * bom tamanho.
 */
export function useSupporter() {
  const { user } = useAuth();
  const [isSupporter, setIsSupporter] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsSupporter(false);
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);

    void supabase.rpc('is_supporter').then(({ data, error }) => {
      if (cancelado) return;
      // Sem a migration aplicada a função não existe: o acesso fica fechado,
      // que é o lado seguro de errar.
      setIsSupporter(!error && data === true);
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [user]);

  return { isSupporter, loading };
}
