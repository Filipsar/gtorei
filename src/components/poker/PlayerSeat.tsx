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
  className
}: PlayerSeatProps) {
  const positionColorClass = getPositionColorClass(position);

  return (
    <div className={cn(
      'flex flex-col items-center gap-1 transition-all duration-300',
      isHero && 'scale-110',
      hasFolded && 'opacity-40',
      className
    )}>
      {/* Avatar do jogador */}
      <div
        className={cn(
          'relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg transition-all',
          positionColorClass,
          isHero ? 'border-primary' : isVillain ? 'border-destructive ring-2 ring-destructive/50' : 'border-transparent',
          isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}>
        <span className="text-white drop-shadow-md">{position}</span>
        
        {/* Indicador de herói */}
        {isHero && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
            <span className="text-[8px] text-primary-foreground font-bold">H</span>
          </div>
        )}

        {/* Indicador de vilão */}
        {isVillain && !hasFolded && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
            <span className="text-[8px] text-destructive-foreground font-bold">V</span>
          </div>
        )}
      </div>

      {/* Nome da posição (apenas em telas maiores) */}
      <span className="hidden sm:block text-[10px] text-muted-foreground text-center max-w-[60px] truncate">
        {getPositionFullName(position)}
      </span>

      {/* Stack do jogador */}
      {stack !== undefined && stack > 0 && (
        <div className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded shadow-sm">
          {stack} BB
        </div>
      )}

      {/* Cartas do jogador */}
      {cards && cards.length > 0 && (
        <div className="mt-1">
          <HandDisplay cards={cards} size="xs" faceDown={!showCards} />
        </div>
      )}

      {/* Indicador de ação do villain */}
      {lastAction && !hasFolded && (
        <div className="text-[10px] sm:text-xs font-semibold bg-accent/90 text-accent-foreground px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
          {lastAction.action}{lastAction.amount ? ` ${lastAction.amount}BB` : ''}
        </div>
      )}

      {/* Indicador de fold */}
      {hasFolded && (
        <div className="text-[10px] text-muted-foreground italic">
          Fold
        </div>
      )}
    </div>
  );
}

export { getPositionColor, getPositionFullName };
