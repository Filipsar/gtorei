import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

import rangeImg from '@/assets/modes/range-training.png';
import huImg from '@/assets/modes/hu.png';
import threeHandImg from '@/assets/modes/three-hand.png';
import bountyImg from '@/assets/modes/bounty.png';

export type TrainingMode = 'rangeTraining' | 'hu' | 'threeHand' | 'bounty';

interface TrainingModeSelectorProps {
  onSelect: (mode: TrainingMode) => void;
}

const modes: { id: TrainingMode; title: string; subtitle: string; description: string; image: string }[] = [
  {
    id: 'rangeTraining',
    title: 'Treino de Range',
    subtitle: '8-max completo',
    description: 'Mesa completa com todas as posições e cenários. O treino clássico do GTORei.',
    image: rangeImg,
  },
  {
    id: 'hu',
    title: 'HU',
    subtitle: '1 x 1',
    description: 'Heads-Up contra um único oponente. Treine decisões em cenários diretos.',
    image: huImg,
  },
  {
    id: 'threeHand',
    title: 'Three Hand',
    subtitle: '1 x 1 x 1',
    description: 'Mesa com 3 jogadores. Ranges mais amplos e dinâmica multiway simplificada.',
    image: threeHandImg,
  },
  {
    id: 'bounty',
    title: 'Modo Bounty',
    subtitle: 'ICM + Recompensas',
    description: 'Torneio PKO com bounties. O valor da recompensa em cada cabeça altera seus ranges.',
    image: bountyImg,
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
            className="cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group overflow-hidden"
            onClick={() => onSelect(mode.id)}
          >
            <CardContent className="p-0 flex flex-col items-center text-center">
              <div className="w-full aspect-square overflow-hidden bg-muted/30">
                <img
                  src={mode.image}
                  alt={mode.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4 space-y-1">
                <h3 className="text-heading-sm">{mode.title}</h3>
                <p className="text-body-xs text-muted-foreground font-mono tracking-wider">{mode.subtitle}</p>
                <p className="text-body-xs text-muted-foreground">{mode.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
