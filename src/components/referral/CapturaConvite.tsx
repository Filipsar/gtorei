import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { esquecerCodigo, guardarCodigoDoLink, lerCodigoGuardado, MENSAGEM_CLAIM } from '@/data/indicacao';

/**
 * Guarda o código de convite do link (?ref=) e o entrega ao banco quando a
 * conta existir. Não desenha nada; fica uma vez só, dentro do AuthProvider.
 *
 * O banco decide se o convite vale (conta nova, não é o próprio código etc.).
 * Qualquer resposta dele encerra o assunto e o código é esquecido; só um erro
 * de rede deixa o código guardado para tentar de novo na próxima visita.
 */
export function CapturaConvite() {
  const location = useLocation();
  const { user } = useAuth();
  const enviado = useRef(false);

  useEffect(() => {
    guardarCodigoDoLink(location.search);
  }, [location.search]);

  useEffect(() => {
    if (!user || enviado.current) return;
    const codigo = lerCodigoGuardado();
    if (!codigo) return;
    enviado.current = true;

    void supabase.rpc('claim_referral', { _code: codigo }).then(({ data, error }) => {
      if (error) {
        // Sem a migration aplicada a função não existe: também não adianta insistir
        if (!/not_authenticated|fetch|network/i.test(error.message)) esquecerCodigo();
        return;
      }
      esquecerCodigo();
      const mensagem = MENSAGEM_CLAIM[data as string];
      if (mensagem) toast.success('Convite aceito', { description: mensagem });
    });
  }, [user]);

  return null;
}
