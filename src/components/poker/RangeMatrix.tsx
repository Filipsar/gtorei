import { useState } from 'react';
import { cn } from '@/lib/utils';
import { RANKS, getRange, Scenario, Position, ActionType, HandData, GameMode } from '@/data/gtoRanges';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ColorPalette = 'classic' | 'ocean' | 'sunset' | 'neon' | 'pastel' | 'monochrome';

export const COLOR_PALETTES: { id: ColorPalette; label: string; colors: Record<ActionType, string> }[] = [
  {
    id: 'classic',
    label: 'Clássico',
    colors: { fold: '#64748b', call: '#3b82f6', raise: '#22c55e', allin: '#ef4444' },
  },
  {
    id: 'ocean',
    label: 'Oceano',
    colors: { fold: '#475569', call: '#06b6d4', raise: '#14b8a6', allin: '#f97316' },
  },
  {
    id: 'sunset',
    label: 'Pôr do Sol',
    colors: { fold: '#78716c', call: '#f59e0b', raise: '#f97316', allin: '#dc2626' },
  },
  {
    id: 'neon',
    label: 'Neon',
    colors: { fold: '#4b5563', call: '#a855f7', raise: '#22d3ee', allin: '#f43f5e' },
  },
  {
    id: 'pastel',
    label: 'Pastel',
    colors: { fold: '#94a3b8', call: '#93c5fd', raise: '#86efac', allin: '#fca5a5' },
  },
  {
    id: 'monochrome',
    label: 'Monocromático',
    colors: { fold: '#525252', call: '#a3a3a3', raise: '#e5e5e5', allin: '#fafafa' },
  },
];

interface RangeMatrixProps {
  scenario: Scenario;
  position: Position;
  stack: number;
  finalTable?: boolean;
  gameMode?: GameMode;
  bountyMultiplier?: number;
  onHandClick?: (hand: HandData) => void;
  selectedHand?: string;
  colorPalette?: ColorPalette;
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
  colorPalette = 'classic',
}: RangeMatrixProps) {
  const range = getRange(scenario, position, stack, finalTable, gameMode, bountyMultiplier);
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);

  const palette = COLOR_PALETTES.find(p => p.id === colorPalette) || COLOR_PALETTES[0];

  // Criar matriz 13x13
  const matrix: HandData[][] = [];
  for (let i = 0; i < 13; i++) {
    matrix[i] = [];
    for (let j = 0; j < 13; j++) {
      const rank1 = RANKS[i];
      const rank2 = RANKS[j];

      let handName: string;
      if (i === j) {
        handName = `${rank1}${rank2}`;
      } else if (i < j) {
        handName = `${rank1}${rank2}s`;
      } else {
        handName = `${rank2}${rank1}o`;
      }

      const handData = range.hands.find(h => h.hand === handName);
      if (handData) {
        matrix[i][j] = handData;
      }
    }
  }

  // Build CSS gradient for proportional fill
  function getProportionalGradient(hand: HandData): string {
    const visibleActions = hand.actions
      .filter(a => a.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency);

    if (visibleActions.length <= 1) {
      return palette.colors[hand.primaryAction];
    }

    // Build linear-gradient stops
    let accumulated = 0;
    const stops: string[] = [];
    for (const action of visibleActions) {
      const color = palette.colors[action.action];
      stops.push(`${color} ${accumulated}%`);
      accumulated += action.frequency;
      stops.push(`${color} ${accumulated}%`);
    }

    return `linear-gradient(to right, ${stops.join(', ')})`;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[400px] max-w-[600px] mx-auto">
          {/* Header row */}
          <div className="grid grid-cols-[2rem_repeat(13,1fr)] gap-0.5 mb-0.5">
            <div className="h-6" />
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
              <div className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {rowRank}
              </div>

              {RANKS.map((colRank, j) => {
                const hand = matrix[i]?.[j];
                if (!hand) return <div key={`${rowRank}-${colRank}`} className="h-8" />;

                const isPair = i === j;
                const isSuited = i < j;
                const isSelected = selectedHand === hand.hand;
                const isHovered = hoveredHand === hand.hand;

                const bg = getProportionalGradient(hand);
                const isGradient = bg.startsWith('linear-gradient');

                return (
                  <Tooltip key={hand.hand}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'h-8 flex items-center justify-center text-[10px] sm:text-xs font-medium rounded-sm',
                          'transition-all duration-150 cursor-pointer',
                          'border border-transparent text-white',
                          isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                          isHovered && !isSelected && 'border-white/50',
                          isPair && 'font-bold',
                        )}
                        style={{
                          background: bg,
                          ...(colorPalette === 'monochrome' ? { color: '#18181b' } : {}),
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
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${action.frequency}%`,
                                        backgroundColor: palette.colors[action.action],
                                      }}
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
