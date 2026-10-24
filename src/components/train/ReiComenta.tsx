import { useEffect, useRef } from 'react';
import { BarChart3, Check, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Explicacao } from '@/lib/explicacao';
import { cn } from '@/lib/utils';

interface Props {
  explicacao: Explicacao;
  /** XP desta mão; null quando a mão é repetida e não pontua */
  pontos: number | null;
  onProxima: () => void;
  onDetalhes: () => void;
}

/**
 * Depois de cada mão no app, o Rei sobe da borda de baixo e comenta: parabéns
 * no acerto, a jogada certa no erro. O quadro completo (range, frequências)
 * continua a um toque, em "Ver range".
 */
export function ReiComenta({ explicacao, pontos, onProxima, onDetalhes }: Props) {
  const proxima = useRef<HTMLButtonElement>(null);
  const { acertou, titulo, texto } = explicacao;

  // O foco vai para "Próxima mão": quem joga pelo teclado ou leitor de tela
  // não fica preso atrás do painel
  useEffect(() => {
    proxima.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 overflow-hidden" role="region" aria-label="Comentário do Rei sobre a jogada">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent" />
      <div className="relative mx-auto max-w-lg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6 motion-safe:animate-rei-sobe">
        <div className="flex items-end gap-2">
          <img
            src={acertou ? '/mascote/rei-acertou.webp' : '/mascote/rei-explicando.webp'}
            alt=""
            aria-hidden="true"
            width={acertou ? 445 : 426}
            height={acertou ? 372 : 397}
            className="-mb-1 h-24 w-auto shrink-0 select-none"
          />
          <div
            className={cn(
              'relative mb-6 min-w-0 flex-1 rounded-2xl border-2 bg-card p-3 shadow-xl',
              acertou ? 'border-feedback-best' : 'border-feedback-blunder'
            )}
            aria-live="polite"
          >
            {/* Rabinho do balão, apontando para o Rei */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute -left-[9px] bottom-5 h-4 w-4 rotate-45 border-b-2 border-l-2 bg-card',
                acertou ? 'border-feedback-best' : 'border-feedback-blunder'
              )}
            />
            <p className="flex items-center gap-2 font-bold">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-black',
                  acertou ? 'bg-feedback-best' : 'bg-feedback-blunder'
                )}
                aria-hidden="true"
              >
                {acertou ? <Check className="h-4 w-4 stroke-[3]" /> : <X className="h-4 w-4 stroke-[3]" />}
              </span>
              <span className="min-w-0 flex-1">{titulo}</span>
            </p>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{texto}</p>
            {pontos !== null && (
              <span
                className={cn(
                  'mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                  pontos >= 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}
              >
                {pontos >= 0 ? `+${pontos}` : pontos} XP
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
          <Button variant="outline" className="h-12 px-4" onClick={onDetalhes}>
            <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
            Ver range
          </Button>
          <Button ref={proxima} className="h-12 text-base font-bold" onClick={onProxima}>
            Próxima mão <ChevronRight className="ml-1 h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
