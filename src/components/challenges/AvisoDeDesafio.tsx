import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EVENTO_DESAFIO_RESGATADO, EVENTO_MAO_REGISTRADA, type DesafiosDoDia } from '@/hooks/useDailyChallenges';
import type { DesafiosPorPeriodo } from '@/hooks/usePeriodChallenges';
import { DURACAO_DO_AVISO, concluidosDe, novosConcluidos, type DesafioConcluido } from '@/lib/avisoDeDesafio';
import { usarLayoutDoApp } from '@/lib/nativo/plataforma';

// Fora do componente: o que já estava concluído não pode voltar a avisar a
// cada troca de tela. A primeira leitura de cada pessoa só marca o ponto de partida.
let vistos: { userId: string; chaves: Set<string> } | null = null;

/**
 * Pop-up pequeno no topo quando um desafio (do dia, da semana ou do mês) é
 * concluído no treino. Some sozinho em 3,5 s e não recebe toque: no meio de uma
 * mão, um toque sem querer não pode tirar a pessoa da mesa. O resgate do XP
 * continua na tela de Desafios.
 */
export function AvisoDeDesafio() {
  const { user } = useAuth();
  const [aviso, setAviso] = useState<DesafioConcluido[] | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout>>();
  const fechar = useRef<ReturnType<typeof setTimeout>>();

  const verificar = useCallback(async () => {
    if (!user) return;
    const [dia, periodos] = await Promise.all([
      supabase.rpc('get_daily_challenges'),
      supabase.rpc('get_period_challenges'),
    ]);
    // Sem a migration, nenhum dos dois responde: não há o que avisar
    if (dia.error && periodos.error) return;
    const agora = concluidosDe(
      dia.error ? null : (dia.data as unknown as DesafiosDoDia),
      periodos.error ? null : (periodos.data as unknown as DesafiosPorPeriodo)
    );
    if (vistos?.userId !== user.id) {
      vistos = { userId: user.id, chaves: new Set(agora.map((d) => d.chave)) };
      return;
    }
    const novos = novosConcluidos(vistos.chaves, agora);
    if (novos.length === 0) return;
    clearTimeout(fechar.current);
    setAviso(novos);
    fechar.current = setTimeout(() => setAviso(null), DURACAO_DO_AVISO);
  }, [user]);

  useEffect(() => {
    void verificar();
  }, [verificar]);

  useEffect(() => {
    // Mesma folga do cartão de desafios: uma consulta depois da sequência de mãos
    const aoGravar = () => {
      clearTimeout(espera.current);
      espera.current = setTimeout(() => void verificar(), 1500);
    };
    window.addEventListener(EVENTO_MAO_REGISTRADA, aoGravar);
    // Resgatar diários conta para o desafio da semana "resgate N desafios"
    window.addEventListener(EVENTO_DESAFIO_RESGATADO, aoGravar);
    return () => {
      window.removeEventListener(EVENTO_MAO_REGISTRADA, aoGravar);
      window.removeEventListener(EVENTO_DESAFIO_RESGATADO, aoGravar);
      clearTimeout(espera.current);
    };
  }, [verificar]);

  useEffect(() => () => clearTimeout(fechar.current), []);

  if (!aviso) return null;

  const xp = aviso.reduce((soma, d) => soma + d.xp, 0);
  const onde = usarLayoutDoApp() ? 'Mais › Desafios' : 'Desafios';

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex justify-center px-4"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-xl motion-safe:animate-aviso-desce">
        <div className="flex items-center gap-3 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Trophy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">
              {aviso.length === 1 ? 'Desafio concluído!' : `${aviso.length} desafios concluídos!`}
            </p>
            <p className="truncate text-sm text-muted-foreground">{aviso.map((d) => d.titulo).join(' · ')}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">+{xp.toLocaleString('pt-BR')} XP</span> para resgatar em {onde}
            </p>
          </div>
        </div>
        {/* A barra esvazia no tempo que falta para o aviso fechar */}
        <div className="h-1 origin-left bg-primary motion-safe:animate-esvazia" aria-hidden="true" />
      </div>
    </div>
  );
}
