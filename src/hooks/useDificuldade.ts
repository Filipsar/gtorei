import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  lerGuardado,
  nivelPorId,
  registrarNoAuto,
  salvarGuardado,
  type IdDificuldade,
  type Preferencia,
} from '@/lib/dificuldade';

/** Dificuldade do treino: a escolhida pela pessoa, ou a automática pelo acerto */
export function useDificuldade(userId: string | undefined, nivelJogador: number) {
  const id = userId ?? 'anonimo';
  const [g, setG] = useState(() => lerGuardado(id, nivelJogador));

  useEffect(() => setG(lerGuardado(id, nivelJogador)), [id, nivelJogador]);

  const efetiva: IdDificuldade = g.preferencia === 'auto' ? g.auto.atual : g.preferencia;

  const mudarPreferencia = useCallback(
    (p: Preferencia) => {
      setG((atual) => {
        const novo = { ...atual, preferencia: p };
        salvarGuardado(id, novo);
        return novo;
      });
    },
    [id],
  );

  /** Chamar a cada mão que vale (não repetida). Só mexe no automático. */
  const registrar = useCallback(
    (acertou: boolean) => {
      setG((atual) => {
        const { estado, ajuste } = registrarNoAuto(atual.auto, acertou);
        const novo = { ...atual, auto: estado };
        salvarGuardado(id, novo);
        if (ajuste && atual.preferencia === 'auto') {
          const subiu = nivelPorId(ajuste.para).chanceMarginal > nivelPorId(ajuste.de).chanceMarginal;
          // Fora do setState para não disparar duas vezes no modo estrito
          setTimeout(() =>
            toast(`Dificuldade ${subiu ? 'subiu' : 'desceu'} para ${nivelPorId(ajuste.para).nome}`, {
              description: `Você acertou ${ajuste.acertos} das últimas ${ajuste.total} mãos. ${
                subiu ? 'Vêm mais mãos da borda da range.' : 'Vêm mais decisões claras para firmar a base.'
              }`,
            }),
          );
        }
        return novo;
      });
    },
    [id],
  );

  return {
    preferencia: g.preferencia,
    efetiva,
    nivel: nivelPorId(efetiva),
    acertosNaJanela: g.auto.recentes.filter(Boolean).length,
    maosNaJanela: g.auto.recentes.length,
    mudarPreferencia,
    registrar,
  };
}
