import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AcaoVariante = 'fold' | 'passiva' | 'agressiva' | 'allin';

// As cores de ação são as mesmas nos temas claro e escuro, então o texto branco
// serve nos dois. A exceção é o verde: no tom do feedback (--poker-raise) o
// branco dava 2,3:1 de contraste, daí o botão usar a variação mais funda.
const VARIANTES: Record<AcaoVariante, string> = {
  fold: 'bg-poker-fold',
  passiva: 'bg-poker-call',
  agressiva: 'bg-[hsl(var(--poker-raise-deep))]',
  allin: 'bg-poker-allin'
};

interface ActionButtonProps {
  variante: AcaoVariante;
  icone: LucideIcon;
  rotulo: string;
  /** Valor em BB, quando faz diferença saber quanto custa a ação */
  detalhe?: string;
  /** Atalho de teclado. Quem treina joga centenas de mãos: a mão não sai do teclado. */
  tecla?: string;
  ativo?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export function ActionButton({
  variante,
  icone: Icone,
  rotulo,
  detalhe,
  tecla,
  ativo = false,
  disabled = false,
  onClick,
  className
}: ActionButtonProps) {
  // Guarda o callback num ref para o atalho não reassinar o listener a cada render
  const aoClicar = useRef(onClick);
  aoClicar.current = onClick;

  useEffect(() => {
    if (!tecla || disabled) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.ctrlKey || evento.metaKey || evento.altKey || evento.repeat) return;
      if (evento.key.toLowerCase() !== tecla.toLowerCase()) return;

      // Não roubar a tecla de quem está digitando nem de um diálogo aberto
      const alvo = evento.target as HTMLElement | null;
      if (alvo && (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))) return;
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;

      evento.preventDefault();
      aoClicar.current();
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [tecla, disabled]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-keyshortcuts={tecla}
      aria-label={detalhe ? `${rotulo} ${detalhe}` : rotulo}
      className={cn(
        'relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 text-white shadow-lg sm:h-[4.5rem]',
        'transition-[filter,transform,box-shadow] duration-150 hover:brightness-110 active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTES[variante],
        ativo && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
    >
      <Icone className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-xs font-bold leading-none sm:text-sm">{rotulo}</span>
      {detalhe && (
        <span className="text-[10px] font-semibold leading-none tabular-nums text-white/75">{detalhe}</span>
      )}
      {tecla && (
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden rounded bg-black/30 px-1 text-[9px] font-semibold uppercase leading-relaxed text-white/60 sm:block">
          {tecla}
        </kbd>
      )}
    </button>
  );
}
