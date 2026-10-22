import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAchievement } from '@/data/achievements';
import { AchievementIcon } from '@/components/achievements/AchievementIcon';
import { EVENTO_DESAFIO_RESGATADO, EVENTO_MAO_REGISTRADA, type Desafio } from '@/hooks/useDailyChallenges';

export type Periodo = 'semana' | 'mes';

export interface DesafiosDoPeriodo {
  inicio: string;
  /** Último dia do período (inclusive) */
  fim: string;
  desafios: Desafio[];
}

export type DesafiosPorPeriodo = Record<Periodo, DesafiosDoPeriodo>;

/** Desafios da semana e do mês. Progresso e XP vêm do servidor. */
export function usePeriodChallenges() {
  const { user, refreshProfile } = useAuth();
  const [dados, setDados] = useState<DesafiosPorPeriodo | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [resgatando, setResgatando] = useState<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>();

  const carregar = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_period_challenges');
    if (error) {
      setIndisponivel(true);
      return;
    }
    setIndisponivel(false);
    setDados(data as unknown as DesafiosPorPeriodo);
  }, [user]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const aoGravar = () => {
      clearTimeout(espera.current);
      espera.current = setTimeout(() => void carregar(), 2000);
    };
    window.addEventListener(EVENTO_MAO_REGISTRADA, aoGravar);
    window.addEventListener('focus', aoGravar);
    // Resgatar um diário conta para o desafio "Resgate N desafios diários"
    window.addEventListener(EVENTO_DESAFIO_RESGATADO, aoGravar);
    return () => {
      window.removeEventListener(EVENTO_MAO_REGISTRADA, aoGravar);
      window.removeEventListener('focus', aoGravar);
      window.removeEventListener(EVENTO_DESAFIO_RESGATADO, aoGravar);
      clearTimeout(espera.current);
    };
  }, [carregar]);

  const resgatar = useCallback(
    async (periodo: Periodo, idx: number) => {
      setResgatando(`${periodo}#${idx}`);
      const { data, error } = await supabase.rpc('claim_period_challenge', { _periodo: periodo, _idx: idx });
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
        toast.success(`+${r.xp_ganho.toLocaleString('pt-BR')} XP`, {
          description: periodo === 'semana' ? 'Desafio da semana resgatado.' : 'Desafio do mês resgatado.',
        });
      }
      for (const chave of r.conquistas ?? []) {
        const c = getAchievement(chave);
        if (!c) continue;
        toast.success('Conquista Desbloqueada!', {
          icon: <AchievementIcon achievement={chave} className="h-5 w-5 text-primary" />,
          description: `${c.name}: ${c.description}`,
          duration: 5000,
        });
      }
      void refreshProfile();
      void carregar();
    },
    [carregar, refreshProfile],
  );

  return { dados, indisponivel, resgatando, resgatar };
}
