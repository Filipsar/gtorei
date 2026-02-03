import { cn } from '@/lib/utils';

interface ChipStackProps {
  amount: number;
  position?: 'center' | 'player';
  className?: string;
}

interface ChipType {
  value: number;
  color: string;
  borderColor: string;
}

// Determina quais fichas mostrar baseado no valor
function getChipStack(amount: number): ChipType[] {
  const chips: ChipType[] = [];
  let remaining = amount;

  const chipValues: ChipType[] = [
    { value: 25, color: 'bg-green-500', borderColor: 'border-green-700' },
    { value: 5, color: 'bg-red-500', borderColor: 'border-red-700' },
    { value: 1, color: 'bg-white', borderColor: 'border-gray-400' },
    { value: 0.5, color: 'bg-blue-400', borderColor: 'border-blue-600' },
  ];

  chipValues.forEach(chipType => {
    while (remaining >= chipType.value && chips.length < 8) {
      chips.push(chipType);
      remaining -= chipType.value;
    }
  });

  // Se ainda sobrou, adiciona fichas pequenas
  if (remaining > 0 && chips.length < 8) {
    chips.push({ value: 0.5, color: 'bg-blue-400', borderColor: 'border-blue-600' });
  }

  return chips;
}

export function ChipStack({ amount, position = 'center', className }: ChipStackProps) {
  const chips = getChipStack(amount);

  if (amount <= 0) return null;

  return (
    <div className={cn(
      'flex flex-col items-center gap-0.5',
      className
    )}>
      {/* Pilha de fichas */}
      <div className="relative h-12 w-8 flex flex-col-reverse items-center">
        {chips.slice(0, 6).map((chip, i) => (
          <div
            key={i}
            className={cn(
              'w-6 h-2 rounded-full border shadow-sm transition-all duration-300',
              chip.color,
              chip.borderColor,
              'animate-fade-in'
            )}
            style={{
              marginBottom: i > 0 ? '-4px' : '0',
              zIndex: chips.length - i,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>

      {/* Label com valor */}
      <div className={cn(
        'px-2 py-0.5 rounded text-xs font-bold shadow-md',
        position === 'center' 
          ? 'bg-black/60 text-primary' 
          : 'bg-background/80 text-foreground'
      )}>
        {amount.toFixed(amount % 1 !== 0 ? 1 : 0)} BB
      </div>
    </div>
  );
}

// Componente para mostrar fichas ao lado de um jogador
export function PlayerBet({ amount, className }: { amount: number; className?: string }) {
  if (amount <= 0) return null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex -space-x-1">
        {getChipStack(amount).slice(0, 4).map((chip, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border shadow-sm',
              chip.color,
              chip.borderColor
            )}
            style={{ zIndex: 4 - i }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-primary bg-black/40 px-1.5 py-0.5 rounded">
        {amount}BB
      </span>
    </div>
  );
}
