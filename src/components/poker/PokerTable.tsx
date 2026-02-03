import { cn } from '@/lib/utils';
import { Position, POSITIONS } from '@/data/gtoRanges';
import { HandDisplay } from './PlayingCard';

interface PokerTableProps {
  heroPosition: Position;
  heroCards?: Array<{ rank: string; suit: 's' | 'h' | 'd' | 'c' }>;
  pot?: number;
  heroStack?: number;
  className?: string;
}

// Posições ao redor da mesa (8-max)
const positionAngles: Record<Position, number> = {
  BTN: 0,
  SB: 45,
  BB: 90,
  UTG: 135,
  'UTG1': 160,
  LJ: 180,
  HJ: 225,
  CO: 315,
};

export function PokerTable({
  heroPosition,
  heroCards,
  pot = 0,
  heroStack = 0,
  className,
}: PokerTableProps) {
  return (
    <div className={cn('relative w-full max-w-2xl mx-auto aspect-[2/1]', className)}>
      {/* Mesa oval */}
      <div className="absolute inset-4 rounded-[50%] bg-gradient-to-br from-emerald-800 to-emerald-900 border-8 border-amber-900 shadow-2xl">
        {/* Borda interna */}
        <div className="absolute inset-3 rounded-[50%] border-4 border-emerald-700/50" />

        {/* Pot no centro */}
        {pot > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="bg-black/40 px-4 py-2 rounded-lg backdrop-blur-sm">
              <span className="text-primary font-bold text-lg">{pot} BB</span>
            </div>
          </div>
        )}
      </div>

      {/* Posições */}
      {POSITIONS.map((pos) => {
        const angle = positionAngles[pos];
        const isHero = pos === heroPosition;

        // Calcular posição ao redor da elipse
        const radiusX = 44; // % do width
        const radiusY = 38; // % do height
        const x = 50 + radiusX * Math.cos((angle * Math.PI) / 180);
        const y = 50 + radiusY * Math.sin((angle * Math.PI) / 180);

        return (
          <div
            key={pos}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${x}%`,
              top: `${y}%`,
            }}
          >
            {/* Indicador de posição */}
            <div
              className={cn(
                'flex flex-col items-center gap-1',
                isHero && 'scale-110'
              )}
            >
              {/* Badge da posição */}
              <div
                className={cn(
                  'px-2 py-1 rounded-md text-xs font-bold shadow-lg',
                  isHero
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground'
                )}
              >
                {pos}
              </div>

              {/* Cartas do herói */}
              {isHero && heroCards && (
                <div className="mt-2">
                  <HandDisplay cards={heroCards} size="sm" />
                </div>
              )}

              {/* Stack do herói */}
              {isHero && heroStack > 0 && (
                <div className="mt-1 text-xs text-muted-foreground bg-black/50 px-2 py-0.5 rounded">
                  {heroStack} BB
                </div>
              )}

              {/* Cadeira vazia para outros jogadores */}
              {!isHero && (
                <div className="w-8 h-8 rounded-full bg-slate-700/50 border border-slate-600" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
