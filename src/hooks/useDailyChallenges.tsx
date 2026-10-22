import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAchievement } from '@/data/achievements';
import { AchievementIcon } from '@/components/achievements/AchievementIcon';

export interface Desafio {
  idx: number;
  chave: string;
  titulo: string;
  descricao: string;
  meta: number;
  xp: number;
  progresso: number;
  precisao: number;
  concluido: boolean;
  resgatado: boolean;
}

export interface DesafiosDoDia {
  dia: string;
  desafios: Desafio[];
  sequencia_dias: number;
  total_resgatados: number;
}

/** Evento que o treino dispara a cada mão gravada, para o progresso andar sozinho */
export const EVENTO_MAO_REGISTRADA = 'gtorei:mao-registrada';

/** Disparado ao resgatar um diário: o desafio semanal/mensal "resgate N diários" anda junto */
export const EVENTO_DESAFIO_RESGATADO = 'gtorei:desafio-resgatado';

/**
 * Desafios do dia, vindos do banco. Quem decide o progresso e paga o XP é o
 * servidor (get_daily_challenges / claim_daily_challenge); aqui só se mostra.
 */
export function useDailyChallenges() {
  const { user, refreshProfile } = useAuth();
  const [dados, setDados] = useState<DesafiosDoDia | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [resgatando, setResgatando] = useState<number | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>();

  const carregar = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_daily_challenges');
    if (error) {
      // Sem a migration aplicada: some da tela em vez de mostrar erro
      setIndisponivel(true);
      return;
    }
    setIndisponivel(false);
    setDados(data as unknown as DesafiosDoDia);
  }, [user]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Cada mão gravada no treino atualiza o progresso, com folga de 1,5 s para
  // não fazer uma consulta por clique em sequência rápida
  useEffect(() => {
    const aoGravar = () => {
      clearTimeout(espera.current);
      espera.current = setTimeout(() => void carregar(), 1500);
    };
    window.addEventListener(EVENTO_MAO_REGISTRADA, aoGravar);
    window.addEventListener('focus', aoGravar);
    return () => {
      window.removeEventListener(EVENTO_MAO_REGISTRADA, aoGravar);
      window.removeEventListener('focus', aoGravar);
      clearTimeout(espera.current);
    };
  }, [carregar]);

  const resgatar = useCallback(
    async (idx: number) => {
      setResgatando(idx);
      const { data, error } = await supabase.rpc('claim_daily_challenge', { _idx: idx });
      setResgatando(null);
      if (error) {
        toast.error(
          error.message.includes('desafio_incompleto')
            ? 'Esse desafio ainda não foi concluído.'
            : 'Não deu para resgatar agora. Tente de novo.',
        );
        void carregar();
        return;
      }
      const r = data as unknown as { xp_ganho: number; conquistas: string[] };
      if (r.xp_ganho > 0) {
        window.dispatchEvent(new Event(EVENTO_DESAFIO_RESGATADO));
        toast.success(`+${r.xp_ganho} XP`, { description: 'Desafio do dia resgatado.' });
      }
      for (const chave of r.conquistas ?? []) {
        const conquista = getAchievement(chave);
        if (!conquista) continue;
        toast.success('Conquista Desbloqueada!', {
          icon: <AchievementIcon achievement={chave} className="h-5 w-5 text-primary" />,
          description: `${conquista.name}: ${conquista.description}`,
          duration: 5000,
        });
      }
      void refreshProfile();
      void carregar();
    },
    [carregar, refreshProfile],
  );

  return { dados, indisponivel, resgatando, resgatar, recarregar: carregar };
}
