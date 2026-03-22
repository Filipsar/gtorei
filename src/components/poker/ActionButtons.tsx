import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ActionType, Scenario } from '@/data/gtoRanges';
interface ActionButtonsProps {
  onAction: (action: ActionType, raiseSize?: number) => void;
  pot: number;
  stack: number;
  minRaise?: number;
  disabled?: boolean;
  showRaiseSlider?: boolean;
  scenario?: Scenario;
}
export function ActionButtons({
  onAction,
  pot,
  stack,
  minRaise = 2,
  disabled = false,
  showRaiseSlider = true,
  scenario,
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
  return <div className="space-y-4">
      {/* Raise slider */}
      {showSlider && showRaiseSlider && <div className="p-4 bg-card rounded-lg border border-border animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Tamanho do Raise</span>
            <span className="text-lg font-bold text-primary">{raiseSize} BB</span>
          </div>
          <Slider value={[raiseSize]} onValueChange={([value]) => setRaiseSize(value)} min={minRaise} max={stack} step={0.5} className="mb-4" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRaiseSize(Math.round(pot * 0.5))} className="flex-1">
              50%
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRaiseSize(Math.round(pot * 0.75))} className="flex-1">
              75%
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRaiseSize(pot)} className="flex-1">
              Pot
            </Button>
            <Button variant="default" size="sm" onClick={confirmRaise} className="flex-1 bg-poker-raise hover:bg-poker-raise/90">
              Confirmar
            </Button>
          </div>
        </div>}

      {/* Main action buttons */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 pb-4 sm:my-[40px]">
        <Button variant="outline" onClick={() => onAction('fold')} disabled={disabled} className={cn('h-14 sm:h-16 flex flex-col items-center justify-center gap-1', 'bg-slate-700 hover:bg-slate-600 border-slate-600', 'text-white font-semibold')}>
          <span className="text-lg">✕</span>
          <span className="text-xs sm:text-sm">Fold</span>
        </Button>

        <Button variant="outline" onClick={() => onAction('call')} disabled={disabled} className={cn('h-14 sm:h-16 flex flex-col items-center justify-center gap-1', 'bg-secondary hover:bg-secondary/90 border-secondary', 'text-white font-semibold')}>
          <span className="text-lg">✓</span>
          <span className="text-xs sm:text-sm">{scenario === 'openRaise' ? 'Limp' : 'Call'}</span>
        </Button>

        <Button variant="outline" onClick={handleRaise} disabled={disabled} className={cn('h-14 sm:h-16 flex flex-col items-center justify-center gap-1', 'bg-poker-raise hover:bg-poker-raise/90 border-emerald-500', 'text-white font-semibold', showSlider && 'ring-2 ring-primary')}>
          <span className="text-lg">↑</span>
          <span className="text-xs sm:text-sm">Raise</span>
        </Button>

        <Button variant="outline" onClick={handleAllIn} disabled={disabled} className={cn('h-14 sm:h-16 flex flex-col items-center justify-center gap-1', 'bg-poker-allin hover:bg-poker-allin/90 border-red-500', 'text-white font-semibold')}>
          <span className="text-lg">💥</span>
          <span className="text-xs sm:text-sm">All-in</span>
        </Button>
      </div>
    </div>;
}