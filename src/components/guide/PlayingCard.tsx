import { cn } from '@/lib/utils';

// Carta de baralho simples para o guia. Branca nos dois temas: carta é carta.
const VERMELHOS = ['♥', '♦'];

export function PlayingCard({
  carta,
  oculta = false,
  destaque = false,
  className,
}: {
  carta?: string; // ex.: 'A♠', 'T♦'
  oculta?: boolean;
  destaque?: boolean;
  className?: string;
}) {
  if (!carta || oculta) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex h-14 w-10 sm:h-16 sm:w-11 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/40 bg-background/40',
          className,
        )}
      />
    );
  }
  const rank = carta.slice(0, -1) === 'T' ? '10' : carta.slice(0, -1);
  const naipe = carta.slice(-1);
  return (
    <span
      className={cn(
        'inline-flex h-14 w-10 sm:h-16 sm:w-11 flex-col items-center justify-center rounded-md bg-white font-bold leading-none shadow-md transition-transform duration-300',
        VERMELHOS.includes(naipe) ? 'text-red-600' : 'text-neutral-900',
        destaque && 'ring-2 ring-primary -translate-y-1',
        className,
      )}
      aria-label={carta}
    >
      <span className="text-lg sm:text-xl">{rank}</span>
      <span className="text-base sm:text-lg">{naipe}</span>
    </span>
  );
}
