import { cn } from '@/lib/utils';
import { Position } from '@/data/gtoRanges';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ActionEntry {
  position: Position;
  action: string;
  amount?: number;
  isHero?: boolean;
}

interface ActionHistoryProps {
  actions: ActionEntry[];
  street?: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  heroPosition?: Position;
  className?: string;
}

function formatAction(entry: ActionEntry): string {
  const { position, action, amount, isHero } = entry;
  const posLabel = isHero ? `Hero (${position})` : position;
  
  switch (action.toLowerCase()) {
    case 'fold':
      return `${posLabel} folds`;
    case 'call':
      return amount ? `${posLabel} calls ${amount}BB` : `${posLabel} calls`;
    case 'raise':
    case 'open':
      return amount ? `${posLabel} raises to ${amount}BB` : `${posLabel} raises`;
    case 'allin':
    case 'all-in':
      return amount ? `${posLabel} all-in ${amount}BB` : `${posLabel} all-in`;
    case '3-bet':
      return amount ? `${posLabel} 3-bets to ${amount}BB` : `${posLabel} 3-bets`;
    case '4-bet':
      return amount ? `${posLabel} 4-bets to ${amount}BB` : `${posLabel} 4-bets`;
    case 'check':
      return `${posLabel} checks`;
    case 'bet':
      return amount ? `${posLabel} bets ${amount}BB` : `${posLabel} bets`;
    case 'post_sb':
      return `${posLabel} posts SB 0.5BB`;
    case 'post_bb':
      return `${posLabel} posts BB 1BB`;
    default:
      return `${posLabel} ${action}${amount ? ` ${amount}BB` : ''}`;
  }
}

export function ActionHistory({ 
  actions, 
  street = 'preflop',
  heroPosition,
  className 
}: ActionHistoryProps) {
  if (actions.length === 0) return null;

  const streetLabels: Record<string, string> = {
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',
  };

  return (
    <div className={cn(
      'bg-card/80 backdrop-blur-sm rounded-lg border border-border p-3',
      className
    )}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
        {streetLabels[street]}
      </h3>
      
      <ScrollArea className="h-auto max-h-24">
        <ul className="space-y-1 text-xs">
          {actions.map((entry, index) => (
            <li 
              key={index}
              className={cn(
                'flex items-center gap-2',
                entry.isHero && 'text-primary font-medium'
              )}
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                entry.action === 'fold' && 'bg-muted-foreground',
                entry.action === 'call' && 'bg-poker-call',
                entry.action === 'raise' && 'bg-poker-raise',
                entry.action === 'allin' && 'bg-poker-allin',
                entry.action === 'open' && 'bg-primary',
                entry.action === '3-bet' && 'bg-poker-raise',
                entry.action === 'check' && 'bg-muted-foreground',
                entry.action === 'bet' && 'bg-poker-raise',
              )} />
              <span>{formatAction(entry)}</span>
            </li>
          ))}
        </ul>
      </ScrollArea>

      {/* Indicador de ação pendente */}
      {heroPosition && (
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-xs text-primary font-medium">
            → Ação para Hero ({heroPosition})
          </span>
        </div>
      )}
    </div>
  );
}
