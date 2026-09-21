import { cn } from '@/lib/utils';
import { Position } from '@/data/gtoRanges';
import { HandDisplay, CardType } from './PlayingCard';

interface PlayerSeatProps {
  position: Position;
  isHero?: boolean;
  isVillain?: boolean;
  isActive?: boolean;
  hasFolded?: boolean;
  cards?: CardType[];
  stack?: number;
  lastAction?: {
    action: string;
    amount?: number;
  };
  showCards?: boolean;
  /** Metade da mesa em que o assento está: decide se o balão de ação sai por cima ou por baixo */
  half?: 'top' | 'bottom';
  className?: string;
}

// Cores por posição baseadas no tipo de posição usando classes Tailwind
function getPositionColorClass(position: Position): string {
  const colorClasses: Record<Position, string> = {
    'UTG': 'bg-poker-early',
    'UTG1': 'bg-poker-early',
    'LJ': 'bg-poker-early',
    'HJ': 'bg-poker-middle',
    'CO': 'bg-poker-late',
    'BTN': 'bg-poker-late',
    'SB': 'bg-poker-blinds',
    'BB': 'bg-poker-blinds'
  };
  return colorClasses[position] || 'bg-muted';
}

// Função legada para compatibilidade
function getPositionColor(position: Position): string {
  return `hsl(var(--poker-${getPositionType(position)}))`;
}

function getPositionType(position: Position): string {
  const types: Record<Position, string> = {
    'UTG': 'early',
    'UTG1': 'early',
    'LJ': 'early',
    'HJ': 'middle',
    'CO': 'late',
    'BTN': 'late',
    'SB': 'blinds',
    'BB': 'blinds'
  };
  return types[position] || 'muted';
}

function getPositionFullName(position: Position): string {
  const names: Record<Position, string> = {
    'SB': 'Small Blind',
    'BB': 'Big Blind',
    'UTG': 'Under The Gun',
    'UTG1': 'UTG+1',
    'LJ': 'Lojack',
    'HJ': 'Hijack',
    'CO': 'Cutoff',
    'BTN': 'Button'
  };
  return names[position] || position;
}

export function PlayerSeat({
  position,
  isHero = false,
  isVillain = false,
  isActive = false,
  hasFolded = false,
  cards,
  stack,
  lastAction,
  showCards = false,
  half = 'bottom',
  className
}: PlayerSeatProps) {
  const positionColorClass = getPositionColorClass(position);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center transition-all duration-300',
        hasFolded && 'opacity-35 saturate-0',
        className
      )}
      title={getPositionFullName(position)}
    >
      {/* Avatar e stack num bloco só. Soltos, os dois brigavam por espaço e o
          nome por extenso ("Under The...") ainda cortava no meio. */}
      <div
        className={cn(
          'flex flex-col items-center rounded-xl border bg-black/55 px-1.5 pb-1 pt-1.5 shadow-lg backdrop-blur-sm',
          isHero
            ? 'border-primary/70 shadow-[0_0_18px_-4px_hsl(var(--primary)/0.7)]'
            : isVillain
              ? 'border-destructive/70'
              : 'border-white/10'
        )}
      >
        <div
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-md sm:h-10 sm:w-10 sm:text-xs',
            positionColorClass,
            isHero ? 'border-primary' : isVillain ? 'border-destructive' : 'border-white/20',
            isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-black/60'
          )}
        >
          <span className="text-white drop-shadow-md">{position}</span>

          {isHero && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground">
              H
            </span>
          )}
          {isVillain && !hasFolded && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[7px] font-bold text-destructive-foreground">
              V
            </span>
          )}
        </div>

        {stack !== undefined && stack > 0 && (
          <span className="mt-0.5 text-[9px] font-semibold leading-none tabular-nums text-white/80 sm:text-[10px]">
            {stack} <span className="text-white/45">BB</span>
          </span>
        )}
      </div>

      {/* Cartas do vilão, viradas para baixo até o showdown */}
      {cards && cards.length > 0 && !isHero && (
        <div className="mt-1">
          <HandDisplay cards={cards} size="xs" faceDown={!showCards} />
        </div>
      )}

      {/* Balão de ação fora do fluxo, para não mudar a altura do assento. Sai
          sempre em direção à borda da mesa, nunca por cima das fichas do meio. */}
      {lastAction && !hasFolded && (
        <div
          className={cn(
            'absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-bold text-accent-foreground shadow-md sm:text-[10px]',
            half === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {lastAction.action}
          {lastAction.amount ? ` ${lastAction.amount}BB` : ''}
        </div>
      )}

      {hasFolded && (
        <div
          className={cn(
            'absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/60',
            half === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          Fold
        </div>
      )}
    </div>
  );
}

export { getPositionColor, getPositionFullName };
