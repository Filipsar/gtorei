import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RANKS, Scenario, Position, ActionType, HandData, getRange } from '@/data/gtoRanges';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Crown, X } from 'lucide-react';

interface RangeViewerModalProps {
  open: boolean;
  onClose: () => void;
  scenario: Scenario;
  position: Position;
  stack: number;
  finalTable?: boolean;
  heroHand: string; // ex: "AKs"
  heroAction: ActionType;
}

// Cores para cada ação
const actionColors: Record<ActionType, { bg: string; text: string }> = {
  fold: { bg: 'bg-slate-600/80', text: 'text-slate-400' },
  call: { bg: 'bg-secondary', text: 'text-secondary' },
  raise: { bg: 'bg-emerald-600', text: 'text-emerald-500' },
  allin: { bg: 'bg-destructive', text: 'text-destructive' },
};

const actionLabels: Record<ActionType, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  allin: 'All-in',
};

const scenarioLabels: Record<Scenario, string> = {
  openRaise: 'Open Raise',
  vsOpenRaise: 'Vs Open Raise',
  vs3bet: 'vs 3-bet',
  vsOpenShove: 'Vs Open Shove',
  simulation: 'Simulação',
  multiway: 'Multiway',
};

export function RangeViewerModal({
  open,
  onClose,
  scenario,
  position,
  stack,
  finalTable = false,
  heroHand,
  heroAction,
}: RangeViewerModalProps) {
  const range = getRange(scenario, position, stack, finalTable);
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);

  // Encontrar dados da mão do herói
  const heroHandData = range.hands.find(h => h.hand === heroHand);

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden bg-card border-border p-0">
        <DialogHeader className="p-4 pb-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              📊 Range GTO Completo
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {scenarioLabels[scenario]} • {position} • {stack} BB
              {finalTable && ' • Mesa Final'}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 pt-2">
          <div className="space-y-6">
            {/* Legenda */}
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.entries(actionColors).map(([action, colors]) => (
                <div key={action} className="flex items-center gap-1.5">
                  <div className={cn('w-4 h-4 rounded', colors.bg)} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {actionLabels[action as ActionType]}
                  </span>
                </div>
              ))}
            </div>

            {/* Matriz de Ranges */}
            <TooltipProvider delayDuration={100}>
              <div className="w-full overflow-x-auto">
                <div className="min-w-[350px] max-w-[500px] mx-auto">
                  {/* Header row */}
                  <div className="grid grid-cols-[1.5rem_repeat(13,1fr)] gap-0.5 mb-0.5">
                    <div className="h-5" />
                    {RANKS.map((rank) => (
                      <div
                        key={`header-${rank}`}
                        className="h-5 flex items-center justify-center text-[10px] font-medium text-muted-foreground"
                      >
                        {rank}
                      </div>
                    ))}
                  </div>

                  {/* Matrix rows */}
                  {RANKS.map((rowRank, i) => (
                    <div key={rowRank} className="grid grid-cols-[1.5rem_repeat(13,1fr)] gap-0.5 mb-0.5">
                      <div className="h-7 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                        {rowRank}
                      </div>

                      {RANKS.map((colRank, j) => {
                        const hand = matrix[i]?.[j];
                        if (!hand) return <div key={`${rowRank}-${colRank}`} className="h-7" />;

                        const isPair = i === j;
                        const isSuited = i < j;
                        const isHeroHand = hand.hand === heroHand;
                        const isHovered = hoveredHand === hand.hand;

                        const primaryAction = hand.actions.find(a => a.action === hand.primaryAction);
                        const freq = primaryAction?.frequency || 0;

                        return (
                          <Tooltip key={hand.hand}>
                            <TooltipTrigger asChild>
                              <button
                                className={cn(
                                  'h-7 flex items-center justify-center text-[9px] font-medium rounded-sm relative',
                                  'transition-all duration-150 cursor-pointer',
                                  'border-2',
                                  actionColors[hand.primaryAction].bg,
                                  isHeroHand 
                                    ? 'border-primary ring-2 ring-primary/50 shadow-lg shadow-primary/30 z-10' 
                                    : 'border-transparent',
                                  isHovered && !isHeroHand && 'border-white/30',
                                  isPair && 'font-bold',
                                  'text-white'
                                )}
                                style={{
                                  opacity: freq < 100 ? 0.5 + (freq / 100) * 0.5 : 1,
                                }}
                                onMouseEnter={() => setHoveredHand(hand.hand)}
                                onMouseLeave={() => setHoveredHand(null)}
                              >
                                {hand.hand.replace('o', '').replace('s', '')}
                                
                                {/* Coroa para mão do herói */}
                                {isHeroHand && (
                                  <div className="absolute -top-1.5 -right-1.5 text-primary">
                                    <Crown className="w-3 h-3 fill-primary" />
                                  </div>
                                )}
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

                                <div className="border-t border-border pt-2 space-y-1">
                                  {hand.actions
                                    .filter(a => a.frequency > 0)
                                    .sort((a, b) => b.frequency - a.frequency)
                                    .map((action) => (
                                      <div key={action.action} className="flex items-center justify-between text-xs">
                                        <span className="capitalize">{actionLabels[action.action]}</span>
                                        <div className="flex items-center gap-2">
                                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
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

                                <div className="border-t border-border pt-2 text-xs">
                                  <span className="text-muted-foreground">Ação GTO: </span>
                                  <span className="font-medium capitalize">{actionLabels[hand.primaryAction]}</span>
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

            {/* Detalhes da mão do herói */}
            {heroHandData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary fill-primary" />
                  <span className="font-bold">Sua Mão: {heroHand}</span>
                </div>

                <div className="space-y-2">
                  {heroHandData.actions
                    .filter(a => a.frequency > 0)
                    .sort((a, b) => b.frequency - a.frequency)
                    .map((action) => {
                      const isUserAction = action.action === heroAction;
                      return (
                        <div 
                          key={action.action} 
                          className={cn(
                            'flex items-center gap-3 p-2 rounded',
                            isUserAction && 'bg-primary/10 border border-primary/30'
                          )}
                        >
                          <span className="text-sm w-16 capitalize font-medium">
                            {actionLabels[action.action]}
                          </span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                actionColors[action.action].bg
                              )}
                              style={{ width: `${action.frequency}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {action.frequency}%
                          </span>
                          {isUserAction && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              Sua escolha
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 pt-2 border-t border-border">
          <Button onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
