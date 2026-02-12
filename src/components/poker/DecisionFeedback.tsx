import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ActionType, FeedbackType, HandData, Scenario, Position, GameMode } from '@/data/gtoRanges';
import { RangeViewerModal } from './RangeViewerModal';
import { CheckCircle2, XCircle, AlertTriangle, Skull, Trophy, BarChart3 } from 'lucide-react';

interface DecisionFeedbackProps {
  open: boolean;
  onClose: () => void;
  onNextHand: () => void;
  userAction: ActionType;
  handData: HandData;
  feedback: {
    type: FeedbackType;
    points: number;
    evLoss: number;
    message: string;
  };
  sessionScore: number;
  handsPlayed: number;
  // Novos props para o modal de range
  scenario?: Scenario;
  position?: Position;
  stack?: number;
  finalTable?: boolean;
  gameMode?: GameMode;
  bountyMultiplier?: number;
  // Flag para mão já jogada
  alreadyPlayed?: boolean;
  previousResult?: {
    action: ActionType;
    feedback: FeedbackType;
    points: number;
  };
  // Flag para modo de revisão (após clicar em "Rever")
  isReviewMode?: boolean;
}

const feedbackConfig: Record<FeedbackType, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  best: {
    icon: <Trophy className="w-8 h-8" />,
    label: 'Melhor Jogada',
    color: 'text-feedback-best',
    bgColor: 'bg-feedback-best/20',
  },
  correct: {
    icon: <CheckCircle2 className="w-8 h-8" />,
    label: 'Jogada Correta',
    color: 'text-feedback-correct',
    bgColor: 'bg-feedback-correct/20',
  },
  inaccuracy: {
    icon: <AlertTriangle className="w-8 h-8" />,
    label: 'Imprecisão',
    color: 'text-feedback-inaccuracy',
    bgColor: 'bg-feedback-inaccuracy/20',
  },
  mistake: {
    icon: <XCircle className="w-8 h-8" />,
    label: 'Erro',
    color: 'text-feedback-mistake',
    bgColor: 'bg-feedback-mistake/20',
  },
  blunder: {
    icon: <Skull className="w-8 h-8" />,
    label: 'Blunder',
    color: 'text-feedback-blunder',
    bgColor: 'bg-feedback-blunder/20',
  },
};

const actionLabels: Record<ActionType, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  allin: 'All-in',
};

export function DecisionFeedback({
  open,
  onClose,
  onNextHand,
  userAction,
  handData,
  feedback,
  sessionScore,
  handsPlayed,
  scenario,
  position,
  stack,
  finalTable = false,
  gameMode = '8max',
  bountyMultiplier = 0,
  alreadyPlayed = false,
  previousResult,
  isReviewMode = false,
}: DecisionFeedbackProps) {
  const [showRangeModal, setShowRangeModal] = useState(false);
  
  const config = feedbackConfig[feedback.type];
  const gtoAction = handData.primaryAction;
  const isCorrect = feedback.type === 'best' || feedback.type === 'correct';

  // Ajustar pontos se mão já foi jogada
  const displayPoints = alreadyPlayed ? 0 : feedback.points;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Resultado da Jogada</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Banner de mão já jogada */}
            {alreadyPlayed && (
              <div className="p-3 rounded-lg bg-primary/20 border border-primary/30 text-center">
                <p className="text-sm text-primary font-medium">
                  ⚠️ Mão já jogada nesta sessão
                </p>
                <p className="text-xs text-primary/80 mt-1">
                  Você pode revisar, mas não ganhará pontos.
                </p>
                {previousResult && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Resultado anterior: {actionLabels[previousResult.action]} ({previousResult.points > 0 ? '+' : ''}{previousResult.points} pts)
                  </p>
                )}
              </div>
            )}

            {/* Feedback header */}
            <div className={cn('p-4 rounded-lg text-center', config.bgColor)}>
              <div className={cn('flex justify-center mb-2', config.color)}>
                {config.icon}
              </div>
              <h3 className={cn('text-xl font-bold', config.color)}>
                {config.label}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {feedback.message}
              </p>
            </div>

            {/* Comparação de ações */}
            <div className="grid grid-cols-2 gap-4">
              <div className={cn(
                'p-3 rounded-lg text-center border-2',
                isCorrect ? 'border-feedback-best bg-feedback-best/10' : 'border-feedback-blunder bg-feedback-blunder/10'
              )}>
                <p className="text-xs text-muted-foreground mb-1">Sua Jogada</p>
                <p className="font-bold text-lg capitalize">{actionLabels[userAction]}</p>
              </div>

              <div className="p-3 rounded-lg text-center border-2 border-primary bg-primary/10">
                <p className="text-xs text-muted-foreground mb-1">Jogada GTO</p>
                <p className="font-bold text-lg capitalize">{actionLabels[gtoAction]}</p>
              </div>
            </div>

            {/* Frequências */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Frequências GTO:</p>
            {(['allin', 'raise', 'call', 'fold'] as ActionType[])
                .map(actionType => {
                  const found = handData.actions.find(a => a.action === actionType);
                  return { action: actionType, frequency: found?.frequency || 0, ev: found?.ev };
                })
                .map((action) => (
                  <div key={action.action} className="flex items-center gap-3">
                    <span className="text-sm w-16 capitalize">{actionLabels[action.action]}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          action.action === 'fold' && 'bg-muted-foreground',
                          action.action === 'call' && 'bg-secondary',
                          action.action === 'raise' && 'bg-poker-raise',
                          action.action === 'allin' && 'bg-poker-allin'
                        )}
                        style={{ width: `${action.frequency}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {action.frequency}%
                    </span>
                  </div>
                ))}
            </div>

            {/* EV Loss */}
            {feedback.evLoss > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-center">
                  <span className="text-muted-foreground">Perda de EV: </span>
                  <span className="font-bold text-destructive">-{feedback.evLoss.toFixed(2)} BB</span>
                </p>
              </div>
            )}

            {/* Points */}
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted">
              <span className={cn(
                'text-2xl font-bold',
                displayPoints >= 0 ? 'text-feedback-best' : 'text-feedback-blunder',
                alreadyPlayed && 'line-through opacity-50'
              )}>
                {displayPoints > 0 ? '+' : ''}{displayPoints}
              </span>
              <span className="text-muted-foreground">pontos</span>
              {alreadyPlayed && (
                <span className="text-xs text-primary ml-2">(já jogada)</span>
              )}
            </div>

            {/* Session progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Score da Sessão</span>
                <span className="font-medium">{sessionScore} pts</span>
              </div>
              <Progress
                value={Math.max(0, Math.min(100, sessionScore / 10))}
                className="h-2"
              />
              <p className="text-xs text-center text-muted-foreground">
                {handsPlayed} mãos jogadas
              </p>
            </div>

            {/* Actions - sticky on mobile */}
            <div className="flex gap-3 sticky bottom-0 bg-card pt-3 pb-1 -mx-1 px-1 border-t border-border mt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 text-base"
              >
                Rever
              </Button>
              {scenario && position && stack && (
                <Button
                  variant="outline"
                  onClick={() => setShowRangeModal(true)}
                  className="flex items-center gap-2 h-12"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver Range</span>
                </Button>
              )}
              <Button
                onClick={onNextHand}
                className="flex-1 h-12 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Próxima Mão
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Range Completo */}
      {scenario && position && stack && (
        <RangeViewerModal
          open={showRangeModal}
          onClose={() => setShowRangeModal(false)}
          scenario={scenario}
          position={position}
          stack={stack}
          finalTable={finalTable}
          gameMode={gameMode}
          bountyMultiplier={bountyMultiplier}
          heroHand={handData.hand}
          heroAction={userAction}
        />
      )}
    </>
  );
}
