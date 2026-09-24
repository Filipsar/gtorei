import { Card, CardContent } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeIcon } from './ModeIcon';
import type { ModeChoice } from '@/lib/sorteioDeMao';

// Quem decide o que cada modo pode jogar é o sorteioDeMao; aqui é só a tela.
export { MODOS_SORTEAVEIS, MODOS_APOIADOR, sortearModo } from '@/lib/sorteioDeMao';
export type { TrainingMode, ModeChoice } from '@/lib/sorteioDeMao';

interface TrainingModeSelectorProps {
  onSelect: (mode: ModeChoice) => void;
  /** Se este jogador não tem acesso ao modo (bloqueio de apoiador) */
  bloqueado?: (mode: ModeChoice) => boolean;
}

const modes: { id: ModeChoice; title: string; subtitle: string; description: string }[] = [
  {
    id: 'rangeTraining',
    title: 'Treino de Range',
    subtitle: '8-max completo',
    description: 'Mesa completa com todas as posições e cenários. O treino clássico do GTORei.',
  },
  {
    id: 'hu',
    title: 'HU',
    subtitle: '1 x 1',
    description: 'Heads-Up contra um único oponente. Treine decisões em cenários diretos.',
  },
  {
    id: 'threeHand',
    title: 'Three Hand',
    subtitle: '1 x 1 x 1',
    description: 'Mesa com 3 jogadores. Ranges mais amplos e dinâmica multiway simplificada.',
  },
  {
    id: 'bounty',
    title: 'Modo Bounty',
    subtitle: 'ICM + Recompensas',
    description: 'Torneio PKO com bounties. O valor da recompensa em cada cabeça altera seus ranges.',
  },
  {
    id: 'random',
    title: 'Aleatório',
    subtitle: 'Começa na hora',
    description: 'Senta direto na mesa. Modo, cenário, posição e fichas mudam a cada mão, sem configurar nada.',
  },
];

export function TrainingModeSelector({ onSelect, bloqueado }: TrainingModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-heading-md mb-1">Escolha o Modo de Treino</h2>
        <p className="text-body-sm text-muted-foreground">Selecione como você quer praticar</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {modes.map((mode) => {
          const travado = bloqueado?.(mode.id) ?? false;
          return (
            <Card
              key={mode.id}
              // O cadeado leva para a página de apoio em vez de só não responder:
              // um cartão morto não diz como destravar.
              className={cn(
                'cursor-pointer transition-all group relative',
                travado
                  ? 'border-primary/40 hover:border-primary hover:shadow-lg'
                  : 'hover:border-primary/50 hover:shadow-lg'
              )}
              onClick={() => onSelect(mode.id)}
            >
              {travado && <Lock className="absolute top-3 right-3 h-4 w-4 text-primary" />}
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div
                  className={cn(
                    'w-16 h-16 rounded-xl flex items-center justify-center transition-colors overflow-hidden',
                    travado
                      ? 'bg-primary/10 text-primary/70 group-hover:text-primary'
                      : 'bg-muted/50 group-hover:bg-primary/10 text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <ModeIcon mode={mode.id} className="h-11 w-11" />
                </div>
                <div>
                  <h3 className="text-heading-sm">{mode.title}</h3>
                  <p className="text-body-xs text-muted-foreground font-mono tracking-wider">{mode.subtitle}</p>
                  <p className="text-body-xs text-muted-foreground">{mode.description}</p>
                  {travado && (
                    <p className="mt-2 text-body-xs font-medium text-primary">Para apoiadores</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
