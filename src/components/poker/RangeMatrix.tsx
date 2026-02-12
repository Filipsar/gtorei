import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RANKS, getRange, Scenario, Position, ActionType, HandData, GameMode } from '@/data/gtoRanges';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RangeMatrixProps {
  scenario: Scenario;
  position: Position;
  stack: number;
  finalTable?: boolean;
  gameMode?: GameMode;
  bountyMultiplier?: number;
  onHandClick?: (hand: HandData) => void;
  selectedHand?: string;
}

// Cores para cada ação
const actionColors: Record<ActionType, { bg: string; border: string }> = {
  fold: { bg: 'bg-slate-600/80', border: 'border-slate-500' },
  call: { bg: 'bg-secondary', border: 'border-secondary' },
  raise: { bg: 'bg-emerald-600', border: 'border-emerald-500' },
  allin: { bg: 'bg-destructive', border: 'border-red-500' },
};

// Obter cor com gradiente baseado em frequência
function getHandColor(hand: HandData): string {
  const primary = hand.actions.find(a => a.action === hand.primaryAction);
  if (!primary) return actionColors.fold.bg;

  const freq = primary.frequency;
  const colors = actionColors[hand.primaryAction];

  // Se frequência < 100, fazer gradiente com fold
  if (freq < 100) {
    const opacity = Math.round((freq / 100) * 100);
    if (hand.primaryAction === 'fold') return colors.bg;
    return `${colors.bg} opacity-${Math.max(30, opacity)}`;
  }

  return colors.bg;
}

export function RangeMatrix({
  scenario,
  position,
  stack,
  finalTable = false,
  gameMode = '8max',
  bountyMultiplier = 0,
  onHandClick,
  selectedHand,
}: RangeMatrixProps) {
  const range = getRange(scenario, position, stack, finalTable, gameMode, bountyMultiplier);
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);

  // Criar matriz 13x13
  const matrix: HandData[][] = [];
  for (let i = 0; i < 13; i++) {
    matrix[i] = [];
    for (let j = 0; j < 13; j++) {
      const rank1 = RANKS[i];
      const rank2 = RANKS[j];

      let handName: string;
      if (i === j) {
        handName = `${rank1}${rank2}`; // Pair
      } else if (i < j) {
        handName = `${rank1}${rank2}s`; // Suited (above diagonal)
      } else {
        handName = `${rank2}${rank1}o`; // Offsuit (below diagonal)
      }

      const handData = range.hands.find(h => h.hand === handName);
      if (handData) {
        matrix[i][j] = handData;
      }
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[400px] max-w-[600px] mx-auto">
          {/* Header row */}
          <div className="grid grid-cols-[2rem_repeat(13,1fr)] gap-0.5 mb-0.5">
            <div className="h-6" /> {/* Empty corner */}
            {RANKS.map((rank) => (
              <div
                key={`header-${rank}`}
                className="h-6 flex items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {rank}
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {RANKS.map((rowRank, i) => (
            <div key={rowRank} className="grid grid-cols-[2rem_repeat(13,1fr)] gap-0.5 mb-0.5">
              {/* Row label */}
              <div className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {rowRank}
              </div>

              {/* Hand cells */}
              {RANKS.map((colRank, j) => {
                const hand = matrix[i]?.[j];
                if (!hand) return <div key={`${rowRank}-${colRank}`} className="h-8" />;

                const isPair = i === j;
                const isSuited = i < j;
                const isSelected = selectedHand === hand.hand;
                const isHovered = hoveredHand === hand.hand;

                const primaryAction = hand.actions.find(a => a.action === hand.primaryAction);
                const freq = primaryAction?.frequency || 0;

                return (
                  <Tooltip key={hand.hand}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'h-8 flex items-center justify-center text-[10px] sm:text-xs font-medium rounded-sm',
                          'transition-all duration-150 cursor-pointer',
                          'border border-transparent',
                          actionColors[hand.primaryAction].bg,
                          freq < 100 && 'opacity-70',
                          isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                          isHovered && !isSelected && actionColors[hand.primaryAction].border,
                          isPair && 'font-bold',
                          isSuited ? 'text-white' : 'text-white/90'
                        )}
                        style={{
                          opacity: freq < 100 ? 0.4 + (freq / 100) * 0.6 : 1,
                        }}
                        onClick={() => onHandClick?.(hand)}
                        onMouseEnter={() => setHoveredHand(hand.hand)}
                        onMouseLeave={() => setHoveredHand(null)}
                      >
                        {hand.hand.replace('o', '').replace('s', '')}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="bg-popover border-border p-3 max-w-[200px]"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{hand.hand}</span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded',
                            isPair && 'bg-primary/20 text-primary',
                            isSuited && !isPair && 'bg-secondary/20 text-secondary',
                            !isSuited && !isPair && 'bg-muted text-muted-foreground'
                          )}>
                            {isPair ? 'Par' : isSuited ? 'Suited' : 'Offsuit'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {hand.actions
                            .filter(a => a.frequency > 0)
                            .sort((a, b) => b.frequency - a.frequency)
                            .map((action) => (
                              <div key={action.action} className="flex items-center justify-between text-xs">
                                <span className="capitalize">{action.action}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full rounded-full',
                                        actionColors[action.action].bg
                                      )}
                                      style={{ width: `${action.frequency}%` }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground w-8 text-right">
                                    {action.frequency}%
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
