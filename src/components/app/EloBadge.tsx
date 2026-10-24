import { useId } from 'react';
import { Club, Diamond, Gem, Heart, Sparkles, Spade, type LucideIcon } from 'lucide-react';
import { eloPorNumero } from '@/data/elos';
import { cn } from '@/lib/utils';

// Símbolo de cada elo: os quatro naipes, a runa e o diamante. O Rei é o próprio rei.
const SIMBOLO: Record<number, LucideIcon> = { 1: Club, 2: Diamond, 3: Heart, 4: Spade, 5: Sparkles, 6: Gem };

interface Props {
  elo: number;
  /** Lado do brasão, em px */
  tamanho?: number;
  className?: string;
  /** Mostra o nome do elo para leitor de tela (quando não há texto ao lado) */
  rotulo?: boolean;
}

/**
 * Brasão hexagonal do elo (o mesmo formato do logo). Diamante tem um fogo azul
 * leve atrás; o Rei, fogo forte e o rosto do rei no meio. Com "reduzir
 * movimento" o fogo fica parado.
 */
export function EloBadge({ elo, tamanho = 40, className, rotulo = false }: Props) {
  const e = eloPorNumero(elo);
  // useId traz ":" no meio, que atrapalha o url(#…) do degradê
  const id = `elo${useId().replace(/:/g, '')}`;
  const Icone = SIMBOLO[e.numero];

  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: tamanho, height: tamanho }}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo ? `Elo ${e.nome}` : undefined}
      aria-hidden={rotulo ? undefined : true}
    >
      {e.fogo && (
        <>
          <span
            className="absolute inset-x-[8%] -top-[30%] bottom-[25%] origin-bottom rounded-[50%] blur-[6px] motion-safe:animate-fogo-azul"
            style={{
              background:
                'radial-gradient(ellipse at 50% 85%, rgba(125,211,252,0.95), rgba(59,130,246,0.6) 45%, transparent 72%)',
              opacity: e.fogo === 'forte' ? 1 : 0.6,
            }}
          />
          {e.fogo === 'forte' && (
            <span
              className="absolute inset-x-[22%] -top-[45%] bottom-[35%] origin-bottom rounded-[50%] blur-[4px] motion-safe:animate-fogo-azul"
              style={{
                background: 'radial-gradient(ellipse at 50% 90%, rgba(224,242,254,0.95), rgba(56,189,248,0.7) 40%, transparent 70%)',
                animationDelay: '-0.8s',
              }}
            />
          )}
        </>
      )}
      <svg viewBox="0 0 100 100" className="relative h-full w-full drop-shadow-md" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={e.claro} />
            <stop offset="1" stopColor={e.escuro} />
          </linearGradient>
        </defs>
        <polygon points="50,4 92,27 92,73 50,96 8,73 8,27" fill={`url(#${id}-g)`} stroke={e.borda} strokeWidth="5" strokeLinejoin="round" />
        <polygon points="50,17 80,34 80,66 50,83 20,66 20,34" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {Icone ? (
          <Icone className="h-[42%] w-[42%] fill-current" style={{ color: e.tinta }} strokeWidth={2.2} />
        ) : (
          <img src="/mascote/rei-avatar.webp" alt="" width={192} height={256} className="h-[62%] w-auto" />
        )}
      </span>
    </span>
  );
}
