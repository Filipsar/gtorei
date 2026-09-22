import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SCENARIOS, getHandData, Position, Scenario, ActionType } from '@/data/gtoRanges';
import { FavoriteHand } from '@/data/localStorage';
import { cn } from '@/lib/utils';
import { X, Eye } from 'lucide-react';
import { RangeViewerModal } from './RangeViewerModal';
import { useState } from 'react';

interface FavoriteHandReviewProps {
  open: boolean;
  onClose: () => void;
  hand: FavoriteHand | null;
}

export function FavoriteHandReview({ open, onClose, hand }: FavoriteHandReviewProps) {
  const [rangeViewerOpen, setRangeViewerOpen] = useState(false);

  if (!hand) return null;

  // Mesmo contexto em que a mão foi jogada, e não o padrão 8-max sem bounty
  const handData = getHandData(
    hand.hand,
    hand.scenario,
    hand.position,
    hand.stack,
    hand.finalTable,
    hand.gameMode,
    hand.bountyMultiplier,
    hand.villainPosition
  );

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'fold': return 'bg-muted text-muted-foreground';
      case 'call': return 'bg-blue-500/20 text-blue-500';
      case 'raise': return 'bg-green-500/20 text-green-500';
      case 'allin': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'fold': return 'Fold';
      case 'call': return 'Call';
      case 'raise': return 'Raise';
      case 'allin': return 'All-in';
      default: return action;
    }
  };

  const getBarColor = (action: ActionType) => {
    switch (action) {
      case 'fold': return 'bg-muted-foreground/50';
      case 'call': return 'bg-secondary';
      case 'raise': return 'bg-feedback-best';
      case 'allin': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl font-mono bg-primary/10 px-3 py-1 rounded">
                {hand.hand}
              </span>
              Análise GTO
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Context Info */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{hand.position}</Badge>
              <Badge variant="outline">{hand.stack} BB</Badge>
              <Badge variant="outline">
                {SCENARIOS.find(s => s.id === hand.scenario)?.label}
              </Badge>
              {hand.finalTable && (
                <Badge className="bg-primary/20 text-primary">Mesa Final</Badge>
              )}
            </div>

            {/* Correct Action */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-1">Ação Correta (GTO)</p>
              <Badge className={cn('text-lg px-3 py-1', getActionBadgeColor(hand.correctAction))}>
                {getActionLabel(hand.correctAction)}
              </Badge>
            </div>

            {/* GTO Frequencies */}
            {handData && (
              <div className="space-y-3">
                <p className="font-medium text-sm">Frequências GTO:</p>
                {handData.actions
                  .filter(a => a.frequency > 0)
                  .sort((a, b) => b.frequency - a.frequency)
                  .map((action) => (
                    <div key={action.action} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{getActionLabel(action.action)}</span>
                        <span className="font-medium">{action.frequency}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', getBarColor(action.action))}
                          style={{ width: `${action.frequency}%` }}
                        />
                      </div>
                      {action.ev !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          EV: {action.ev > 0 ? '+' : ''}{action.ev.toFixed(2)} BB
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* View Full Range Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setRangeViewerOpen(true)}
            >
              <Eye className="h-4 w-4" />
              Ver Range GTO Completo
            </Button>

            <Button onClick={onClose} className="w-full">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Range Viewer Modal */}
      <RangeViewerModal
        open={rangeViewerOpen}
        onClose={() => setRangeViewerOpen(false)}
        scenario={hand.scenario}
        position={hand.position}
        stack={hand.stack}
        finalTable={hand.finalTable}
        gameMode={hand.gameMode}
        bountyMultiplier={hand.bountyMultiplier}
        villainPosition={hand.villainPosition}
        heroHand={hand.hand}
        heroAction={hand.correctAction}
      />
    </>
  );
}
