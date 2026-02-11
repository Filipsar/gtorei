import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Swords, Crown, Zap } from 'lucide-react';

export type TrainingMode = 'rangeTraining' | 'hu' | 'threeHand' | 'bounty';

interface TrainingModeSelectorProps {
  onSelect: (mode: TrainingMode) => void;
}

const modes: { id: TrainingMode; title: string; subtitle: string; description: string; icon: React.ElementType; color: string }[] = [
  {
    id: 'rangeTraining',
    title: 'Treino de Range',
    subtitle: '8-max completo',
    description: 'Mesa completa com todas as posições e cenários. O treino clássico do GTORei.',
    icon: Zap,
    color: 'text-primary',
  },
  {
    id: 'hu',
    title: 'HU',
    subtitle: '1 x 1',
    description: 'Heads-Up contra um único oponente. Treine decisões em cenários diretos.',
    icon: Swords,
    color: 'text-poker-call',
  },
  {
    id: 'threeHand',
    title: 'Three Hand',
    subtitle: '1 x 1 x 1',
    description: 'Mesa com 3 jogadores. Ranges mais amplos e dinâmica multiway simplificada.',
    icon: Users,
    color: 'text-poker-raise',
  },
  {
    id: 'bounty',
    title: 'Modo Bounty',
    subtitle: 'ICM + Recompensas',
    description: 'Torneio PKO com bounties. O valor da recompensa em cada cabeça altera seus ranges.',
    icon: Crown,
    color: 'text-rank-first',
  },
];

export function TrainingModeSelector({ onSelect }: TrainingModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-heading-md mb-1">Escolha o Modo de Treino</h2>
        <p className="text-body-sm text-muted-foreground">Selecione como você quer praticar</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modes.map((mode) => (
          <Card
            key={mode.id}
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group"
            onClick={() => onSelect(mode.id)}
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className={cn(
                'w-16 h-16 rounded-xl flex items-center justify-center bg-muted/50 group-hover:bg-primary/10 transition-colors',
              )}>
                <mode.icon className={cn('h-8 w-8', mode.color)} />
              </div>
              <div>
                <h3 className="text-heading-sm">{mode.title}</h3>
                <p className="text-body-xs text-muted-foreground font-mono tracking-wider">{mode.subtitle}</p>
              </div>
              <p className="text-body-xs text-muted-foreground">{mode.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
