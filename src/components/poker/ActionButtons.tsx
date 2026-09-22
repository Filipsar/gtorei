import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Check, ChevronsUp, Flame, X } from 'lucide-react';
import { ActionType, Scenario } from '@/data/gtoRanges';
import { ActionButton } from './ActionButton';

interface ActionButtonsProps {
  onAction: (action: ActionType, raiseSize?: number) => void;
  pot: number;
  stack: number;
  minRaise?: number;
  /** Quanto custa pagar, quando há aposta na frente */
  toCall?: number;
  disabled?: boolean;
  showRaiseSlider?: boolean;
  scenario?: Scenario;
}

export function ActionButtons({
  onAction,
  pot,
  stack,
  minRaise = 2,
  toCall,
  disabled = false,
  showRaiseSlider = true,
  scenario
}: ActionButtonsProps) {
  const [raiseSize, setRaiseSize] = useState(minRaise);
  const [showSlider, setShowSlider] = useState(false);

  const handleRaise = () => {
    if (showRaiseSlider) {
      setShowSlider(!showSlider);
    } else {
      onAction('raise', minRaise);
    }
  };
  const confirmRaise = () => {
    onAction('raise', raiseSize);
    setShowSlider(false);
  };
  const handleAllIn = () => {
    onAction('allin', stack);
    setShowSlider(false);
  };

  const ehLimp = scenario === 'openRaise';

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Raise slider */}
      {showSlider && showRaiseSlider && (
        <div className="animate-slide-up rounded-lg border border-border bg-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tamanho do Raise</span>
            <span className="text-lg font-bold text-primary tabular-nums">{raiseSize} BB</span>
          </div>
          {/* Slider maior no celular: pista mais alta e polegar maior */}
          <div className="mb-4 py-2 [&_.relative.h-2]:h-3 sm:[&_.relative.h-2]:h-2 [&_[role=slider]]:h-7 [&_[role=slider]]:w-7 sm:[&_[role=slider]]:h-5 sm:[&_[role=slider]]:w-5">
            <Slider
              value={[raiseSize]}
              onValueChange={([value]) => setRaiseSize(value)}
              min={minRaise}
              max={stack}
              step={0.5}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" size="sm" onClick={() => setRaiseSize(Math.round(pot * 0.5))} className="h-10 sm:h-9">
              50%
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRaiseSize(Math.round(pot * 0.75))} className="h-10 sm:h-9">
              75%
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRaiseSize(pot)} className="h-10 sm:h-9">
              Pot
            </Button>
            <Button size="sm" onClick={confirmRaise} className="h-10 sm:h-9">
              OK
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 pb-4 sm:gap-3">
        <ActionButton
          variante="fold"
          icone={X}
          rotulo="Fold"
          tecla="f"
          disabled={disabled}
          onClick={() => onAction('fold')}
        />
        <ActionButton
          variante="passiva"
          icone={Check}
          rotulo={ehLimp ? 'Limp' : 'Call'}
          detalhe={!ehLimp && toCall ? `${toCall.toFixed(1)} BB` : undefined}
          tecla="c"
          disabled={disabled}
          onClick={() => onAction('call')}
        />
        <ActionButton
          variante="agressiva"
          icone={ChevronsUp}
          rotulo="Raise"
          tecla="r"
          ativo={showSlider}
          disabled={disabled}
          onClick={handleRaise}
        />
        <ActionButton
          variante="allin"
          icone={Flame}
          rotulo="All-in"
          detalhe={stack > 0 ? `${stack} BB` : undefined}
          tecla="a"
          disabled={disabled}
          onClick={handleAllIn}
        />
      </div>
    </div>
  );
}
