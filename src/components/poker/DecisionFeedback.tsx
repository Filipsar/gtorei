import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ActionType, FeedbackType, HandData } from '@/data/gtoRanges';
import { CheckCircle2, XCircle, AlertTriangle, Skull, Trophy } from 'lucide-react';

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
}: DecisionFeedbackProps) {
  const config = feedbackConfig[feedback.type];
  const gtoAction = handData.primaryAction;
  const isCorrect = feedback.type === 'best' || feedback.type === 'correct';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="sr-only">Resultado da Jogada</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
            {handData.actions
              .filter(a => a.frequency > 0)
              .sort((a, b) => b.frequency - a.frequency)
              .map((action) => (
                <div key={action.action} className="flex items-center gap-3">
                  <span className="text-sm w-16 capitalize">{actionLabels[action.action]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        action.action === 'fold' && 'bg-slate-500',
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
              feedback.points >= 0 ? 'text-feedback-best' : 'text-feedback-blunder'
            )}>
              {feedback.points > 0 ? '+' : ''}{feedback.points}
            </span>
            <span className="text-muted-foreground">pontos</span>
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

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Rever
            </Button>
            <Button
              onClick={onNextHand}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Próxima Mão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
