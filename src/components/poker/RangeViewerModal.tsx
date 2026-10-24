import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RANKS, Scenario, Position, ActionType, HandData, RangeData, getRange, GameMode } from '@/data/gtoRanges';
import { Crown } from 'lucide-react';

interface RangeViewerModalProps {
  open: boolean;
  onClose: () => void;
  scenario: Scenario;
  position: Position;
  stack: number;
  finalTable?: boolean;
  gameMode?: GameMode;
  bountyMultiplier?: number;
  heroHand: string;
  heroAction: ActionType;
  villainPosition?: Position;
  /**
   * A range exata que deu a nota da mão.
   *
   * Sem ela, este gráfico recalculava tudo de novo a partir dos parâmetros
   * soltos — e bastava faltar um deles para a tela dizer Fold e o gráfico
   * mostrar Call na mesma mão. Faltavam quatro: o modo de jogo, o bounty, o
   * stack efetivo e a posição de quem deu o all-in.
   */
  range?: RangeData;
}

// Cores para cada ação
const actionColors: Record<ActionType, { bg: string; text: string }> = {
  fold: { bg: 'bg-slate-600/80', text: 'text-slate-400' },
  call: { bg: 'bg-secondary', text: 'text-secondary' },
  raise: { bg: 'bg-emerald-600', text: 'text-emerald-500' },
  allin: { bg: 'bg-destructive', text: 'text-destructive' },
};

const actionLabels: Record<ActionType, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  allin: 'All-in',
};

const scenarioLabels: Record<Scenario, string> = {
  openRaise: 'Open Raise',
  vsOpenRaise: 'Vs Open Raise',
  vs3bet: 'vs 3-bet',
  vsOpenShove: 'Vs Open Shove',
  simulation: 'Simulação',
  multiway: 'Multiway',
};

const tipoDaMao = (mao: string) => (mao.length === 2 ? 'Par' : mao.endsWith('s') ? 'Suited' : 'Offsuit');

export function RangeViewerModal({
  open,
  onClose,
  scenario,
  position,
  stack,
  finalTable = false,
  gameMode = '8max',
  bountyMultiplier = 0,
  heroHand,
  heroAction,
  villainPosition,
  range: rangeRecebida,
}: RangeViewerModalProps) {
  // Quem chama de dentro do treino manda a range pronta. O cálculo aqui embaixo
  // é só para quem não tem como mandar, e agora leva os mesmos parâmetros.
  const range =
    rangeRecebida ??
    getRange(scenario, position, stack, finalTable, gameMode, bountyMultiplier, 3, villainPosition);
  // A mão cujos números aparecem embaixo da matriz: a do mouse, a tocada ou a sua.
  // Era um tooltip por célula, que no celular abria sozinho no AA (o foco da
  // janela caía na primeira célula) e ficava preso em cima do título.
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);
  const [tocada, setTocada] = useState<string | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);

  const mostrada = hoveredHand ?? tocada ?? heroHand;
  const ehSuaMao = mostrada === heroHand;
  const dadosMostrados = range.hands.find(h => h.hand === mostrada);

  // Criar matriz 13x13
  const matrix: HandData[][] = [];
  for (let i = 0; i < 13; i++) {
    matrix[i] = [];
    for (let j = 0; j < 13; j++) {
      const rank1 = RANKS[i];
      const rank2 = RANKS[j];

      let handName: string;
      if (i === j) {
        handName = `${rank1}${rank2}`; // Pair
      } else if (i < j) {
        handName = `${rank1}${rank2}s`; // Suited (above diagonal)
      } else {
        handName = `${rank2}${rank1}o`; // Offsuit (below diagonal)
      }

      const handData = range.hands.find(h => h.hand === handName);
      if (handData) {
        matrix[i][j] = handData;
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="flex max-h-[90dvh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden border-border bg-card p-0"
        // O foco vai para "Fechar", não para a primeira célula da matriz
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          fechar.current?.focus();
        }}
      >
        {/* O X de fechar vem do próprio DialogContent. Havia um segundo botão
            aqui dentro, e a janela aparecia com dois X colados um no outro. */}
        <DialogHeader className="p-4 pb-0 pr-12">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            📊 Range GTO Completo
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            {scenarioLabels[scenario]} • {position} • {stack} BB
            {finalTable && ' • Mesa Final'}
          </DialogDescription>
        </DialogHeader>

        {/* Rolagem simples: dentro da ScrollArea do Radix a matriz não encolhia
            e empurrava a última coluna e o quadro da mão para fora da tela */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3 sm:px-4">
          <div className="space-y-4 sm:space-y-6">
            {/* Legenda */}
            <div className="flex flex-wrap gap-3 justify-center">
              {Object.entries(actionColors).map(([action, colors]) => (
                <div key={action} className="flex items-center gap-1.5">
                  <div className={cn('w-4 h-4 rounded', colors.bg)} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {actionLabels[action as ActionType]}
                  </span>
                </div>
              ))}
            </div>

            {/* Matriz de Ranges: 13 colunas que cabem na largura que houver */}
            <div className="mx-auto w-full max-w-[480px]" onMouseLeave={() => setHoveredHand(null)}>
              {/* Header row */}
              <div className="mb-[2px] grid grid-cols-[1rem_repeat(13,minmax(0,1fr))] gap-[2px] sm:grid-cols-[1.5rem_repeat(13,minmax(0,1fr))]">
                <div />
                {RANKS.map((rank) => (
                  <div
                    key={`header-${rank}`}
                    className="flex h-5 items-center justify-center text-[10px] font-medium text-muted-foreground"
                  >
                    {rank}
                  </div>
                ))}
              </div>

              {/* Matrix rows */}
              {RANKS.map((rowRank, i) => (
                <div
                  key={rowRank}
                  className="mb-[2px] grid grid-cols-[1rem_repeat(13,minmax(0,1fr))] gap-[2px] sm:grid-cols-[1.5rem_repeat(13,minmax(0,1fr))]"
                >
                  <div className="flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    {rowRank}
                  </div>

                  {RANKS.map((colRank, j) => {
                    const hand = matrix[i]?.[j];
                    if (!hand) return <div key={`${rowRank}-${colRank}`} className="aspect-square" />;

                    const isPair = i === j;
                    const isHeroHand = hand.hand === heroHand;
                    const isShown = mostrada === hand.hand;

                    const primaryAction = hand.actions.find(a => a.action === hand.primaryAction);
                    const freq = primaryAction?.frequency || 0;

                    return (
                      <button
                        key={hand.hand}
                        type="button"
                        aria-label={`${hand.hand}: ${actionLabels[hand.primaryAction]} ${freq}%`}
                        aria-pressed={isShown}
                        className={cn(
                          'relative flex aspect-square min-w-0 items-center justify-center rounded-sm text-[8px] font-medium leading-none text-white sm:text-[10px]',
                          'cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'border sm:border-2',
                          actionColors[hand.primaryAction].bg,
                          isHeroHand
                            ? 'z-10 border-primary ring-2 ring-primary/50 shadow-lg shadow-primary/30'
                            : isShown
                              ? 'border-white/70'
                              : 'border-transparent',
                          isPair && 'font-bold'
                        )}
                        style={{
                          opacity: freq < 100 ? 0.5 + (freq / 100) * 0.5 : 1,
                        }}
                        onClick={() => setTocada(hand.hand)}
                        onMouseEnter={() => setHoveredHand(hand.hand)}
                      >
                        {hand.hand.replace('o', '').replace('s', '')}

                        {/* Coroa para mão do herói */}
                        {isHeroHand && (
                          <div className="absolute -top-1.5 -right-1.5 text-primary">
                            <Crown className="w-3 h-3 fill-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Números da mão mostrada (a sua, até tocar em outra) */}
            {dadosMostrados && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-3 sm:p-4" aria-live="polite">
                <div className="flex flex-wrap items-center gap-2">
                  {ehSuaMao && <Crown className="w-5 h-5 text-primary fill-primary" />}
                  <span className="font-bold">{ehSuaMao ? `Sua Mão: ${heroHand}` : mostrada}</span>
                  {!ehSuaMao && (
                    <>
                      <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tipoDaMao(mostrada)}</span>
                      <button
                        type="button"
                        className="ml-auto text-xs font-medium text-foreground underline underline-offset-2"
                        onClick={() => {
                          setTocada(null);
                          setHoveredHand(null);
                        }}
                      >
                        Ver a sua ({heroHand})
                      </button>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  {dadosMostrados.actions
                    .filter(a => a.frequency > 0)
                    .sort((a, b) => b.frequency - a.frequency)
                    .map((action) => {
                      const isUserAction = ehSuaMao && action.action === heroAction;
                      return (
                        <div
                          key={action.action}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded sm:gap-3',
                            isUserAction && 'bg-primary/10 border border-primary/30'
                          )}
                        >
                          <span className="text-sm w-14 shrink-0 capitalize font-medium sm:w-16">
                            {actionLabels[action.action]}
                          </span>
                          <div className="min-w-0 flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                actionColors[action.action].bg
                              )}
                              style={{ width: `${action.frequency}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-11 shrink-0 text-right">
                            {action.frequency}%
                          </span>
                          {isUserAction && (
                            <span className="shrink-0 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              Sua escolha
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
                {!ehSuaMao && (
                  <p className="text-xs text-muted-foreground">
                    Ação GTO: <span className="font-medium text-foreground">{actionLabels[dadosMostrados.primaryAction]}</span>
                  </p>
                )}
              </div>
            )}
            <p className="text-center text-xs text-muted-foreground">Toque numa mão para ver as frequências dela.</p>
          </div>
        </div>

        <div className="p-4 pt-2 border-t border-border">
          <Button ref={fechar} onClick={onClose} className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
