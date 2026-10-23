import { ChevronRight, ClipboardCheck, Lock, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModeIcon } from './ModeIcon';
import type { ModeChoice } from '@/lib/sorteioDeMao';

// Quem decide o que cada modo pode jogar é o sorteioDeMao; aqui é só a tela.
export { MODOS_SORTEAVEIS, MODOS_APOIADOR, sortearModo } from '@/lib/sorteioDeMao';
export type { TrainingMode, ModeChoice } from '@/lib/sorteioDeMao';

interface TrainingModeSelectorProps {
  onSelect: (mode: ModeChoice) => void;
  /** Abre a configuração já no formato Simulado */
  onSimulado?: () => void;
  /** Se este jogador não tem acesso ao modo (bloqueio de apoiador) */
  bloqueado?: (mode: ModeChoice) => boolean;
}

const MESAS: { id: ModeChoice; titulo: string; detalhe: string; descricao: string }[] = [
  { id: 'rangeTraining', titulo: 'Treino de Range', detalhe: '8-max', descricao: 'Mesa completa, todas as posições e cenários.' },
  { id: 'hu', titulo: 'Heads-Up', detalhe: '1 x 1', descricao: 'Só você e um oponente: ranges bem mais largas.' },
  { id: 'threeHand', titulo: 'Three Hand', detalhe: '3 jogadores', descricao: 'Fim de torneio, blinds pressionando.' },
  { id: 'bounty', titulo: 'Bounty', detalhe: 'PKO + ICM', descricao: 'A recompensa de cada cabeça muda a range.' },
];

/**
 * Início do treino: dois atalhos (Simulado e Aleatório) e as quatro mesas.
 * Cartão inteiro clicável, com foco visível; o cadeado leva ao apoio em vez de
 * um cartão morto que não diz como destravar.
 */
export function TrainingModeSelector({ onSelect, onSimulado, bloqueado }: TrainingModeSelectorProps) {
  const aleatorioTravado = bloqueado?.('random') ?? false;

  return (
    <div className="space-y-6">
      {/* Atalhos */}
      <div className="grid gap-3 sm:grid-cols-2">
        {onSimulado && (
          <button
            type="button"
            onClick={onSimulado}
            className="group relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/20 via-card to-card p-5 text-left transition-all hover:border-primary hover:shadow-[0_10px_40px_-15px_hsl(var(--primary)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="absolute right-4 top-4 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Novo
            </span>
            <ClipboardCheck className="h-8 w-8 text-primary" aria-hidden="true" />
            <p className="mt-3 text-lg font-bold">Simulado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Uma série de mãos sem resposta. No fim, a correção e o XP pelos seus acertos.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Fazer simulado <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={() => onSelect('random')}
          className="group relative rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {aleatorioTravado && <Lock className="absolute right-4 top-4 h-4 w-4 text-primary" aria-label="Para apoiadores" />}
          <Shuffle className="h-8 w-8 text-primary" aria-hidden="true" />
          <p className="mt-3 text-lg font-bold">Aleatório</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Senta direto. Mesa, cenário, posição e stack mudam a cada mão.
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            {aleatorioTravado ? 'Para apoiadores' : 'Começar agora'}
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>

      {/* Mesas */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ou escolha a mesa</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MESAS.map((m) => {
            const travado = bloqueado?.(m.id) ?? false;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m.id)}
                className={cn(
                  'group flex items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  travado ? 'border-primary/30 hover:border-primary' : 'border-border hover:border-primary/50',
                )}
              >
                <span
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-colors',
                    travado ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-foreground',
                  )}
                >
                  <ModeIcon mode={m.id} className="h-10 w-10" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{m.titulo}</span>
                    <span className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground">{m.detalhe}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{m.descricao}</span>
                  {travado && <span className="mt-1 block text-xs font-medium text-primary">Para apoiadores</span>}
                </span>
                {travado ? (
                  <Lock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
