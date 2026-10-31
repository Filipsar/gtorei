import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { RANKS, POSITIONS, STACK_SIZES, getRange, type Position, type Scenario, type GameMode, type HandData, type ActionType } from '@/data/gtoRanges';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Users, ChevronDown, ChevronUp, Palette, ChevronRight, ChevronLeft } from 'lucide-react';
import { combosDaMao, resumoDaRange } from '@/lib/resumoDaRange';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================
// CONSTANTS
// ============================================================

const COLOR_PALETTES: { id: string; label: string; colors: Record<ActionType, string> }[] = [
  { id: 'wizard', label: 'GTO Wizard', colors: { fold: '#3B9EBF', call: '#4CAF50', raise: '#E91E63', allin: '#C62828' } },
  { id: 'classic', label: 'Clássico', colors: { fold: '#64748b', call: '#3b82f6', raise: '#22c55e', allin: '#ef4444' } },
  { id: 'sunset', label: 'Pôr do Sol', colors: { fold: '#78716c', call: '#f59e0b', raise: '#f97316', allin: '#dc2626' } },
  { id: 'neon', label: 'Neon', colors: { fold: '#4b5563', call: '#a855f7', raise: '#22d3ee', allin: '#f43f5e' } },
  { id: 'mono', label: 'Monocromático', colors: { fold: '#525252', call: '#a3a3a3', raise: '#d4d4d4', allin: '#fafafa' } },
];

type PaletteId = typeof COLOR_PALETTES[number]['id'];

type PlayerMode = '8max' | '6max' | 'hu' | 'threehand';

const PLAYER_MODES: { id: PlayerMode; label: string }[] = [
  { id: 'hu', label: 'Heads-up' },
  { id: '6max', label: '6max' },
  { id: '8max', label: '8max' },
  { id: 'threehand', label: '3-Hand' },
];

const POSITIONS_BY_MODE: Record<PlayerMode, Position[]> = {
  '8max': ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  hu: ['SB', 'BB'],
  threehand: ['BTN', 'SB', 'BB'],
};

const SCENARIOS_LIST: { id: Scenario; label: string }[] = [
  { id: 'openRaise', label: 'Open Raise' },
  { id: 'vsOpenRaise', label: 'Vs Open Raise' },
  { id: 'vs3bet', label: 'Vs 3-Bet' },
  { id: 'vsOpenShove', label: 'Vs Open Shove' },
  { id: 'multiway', label: 'Multiway' },
];

const MULTIWAY_PLAYERS = [3, 4, 5, 6] as const;

// ============================================================
// FILTER CHIP COMPONENT
// ============================================================

function FilterChip({
  label,
  active,
  onClick,
  locked,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  locked?: boolean;
}) {
  return (
    <button
      onClick={locked ? undefined : onClick}
      className={cn(
        'px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap',
        active
          ? 'bg-primary/20 text-primary border border-primary/40'
          : 'bg-[hsl(var(--card))] text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground',
        locked && 'opacity-40 cursor-not-allowed'
      )}
    >
      {label}
    </button>
  );
}

// ============================================================
// ACTION PANEL (RIGHT SIDE)
// ============================================================

const ROTULO: Record<ActionType, string> = { allin: 'All-in', raise: 'Raise', call: 'Call', fold: 'Fold' };

function ActionPanel({ range, selectedHand, colors }: { range: ReturnType<typeof getRange>; selectedHand: HandData | null; colors: Record<ActionType, string> }) {
  const resumo = useMemo(() => resumoDaRange(range.hands), [range]);
  const totals = useMemo(() => {
    // Com uma mão escolhida, mostra o que ela faz; sem, a range inteira
    return (['allin', 'raise', 'call', 'fold'] as ActionType[]).map((action) => {
      if (selectedHand) {
        const freq = selectedHand.actions.find((a) => a.action === action)?.frequency ?? 0;
        return { action, label: ROTULO[action], percentage: freq, combos: (freq / 100) * combosDaMao(selectedHand) };
      }
      return { action, label: ROTULO[action], percentage: (resumo[action] / 1326) * 100, combos: resumo[action] };
    });
  }, [resumo, selectedHand]);
  const joga = ((1326 - resumo.fold) / 1326) * 100;

  return (
    <div className="space-y-1">
      <div className="mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {selectedHand ? `Ações: ${selectedHand.hand}` : 'Ações da range'}
        </span>
        {!selectedHand && (
          <p className="mt-1 text-sm text-foreground">
            Joga <strong className="text-primary">{joga.toFixed(1)}%</strong> das mãos
            <span className="text-muted-foreground"> ({Math.round(1326 - resumo.fold)} de 1.326 combos)</span>
          </p>
        )}
      </div>
      {totals.map(({ action, label, percentage, combos }) => (
        <div
          key={action}
          className="relative overflow-hidden rounded border border-border"
          style={{ minHeight: Math.max(36, percentage * 0.8 + 24) }}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{
              width: `${percentage}%`,
              backgroundColor: colors[action],
            }}
          />
          <div className="relative flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{combos.toFixed(1)} combos</span>
              <span className="text-sm font-bold text-foreground">{percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


// ============================================================
// HAND DETAIL PANEL
// ============================================================

function HandDetailPanel({ hand, colors }: { hand: HandData; colors: Record<ActionType, string> }) {
  // EV só onde a range foi calculada por EV; nas de corte por percentual ele não
  // existe, e mostrar "EV 0,00" em tudo dava a entender que todas empatam
  const temEv = hand.actions.some((a) => a.action !== 'fold' && typeof a.ev === 'number' && a.ev !== 0);
  const allActions = (['allin', 'raise', 'call', 'fold'] as ActionType[]).map((act) => {
    const found = hand.actions.find((a) => a.action === act);
    return { action: act, frequency: found?.frequency ?? 0, ev: found?.ev ?? 0, label: ROTULO[act] };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xl font-bold text-foreground">{hand.hand}</span>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          hand.pair && 'bg-primary/20 text-primary',
          hand.suited && !hand.pair && 'bg-emerald-500/20 text-emerald-400',
          !hand.suited && !hand.pair && 'bg-muted text-muted-foreground'
        )}>
          {hand.pair ? 'Par' : hand.suited ? 'Suited' : 'Offsuit'}
        </span>
      </div>

      <div className="space-y-2">
        {allActions.map(({ action, frequency, ev, label }) => (
          <div key={action} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{label}</span>
              <span className="font-bold text-foreground">{frequency}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${frequency}%`,
                  backgroundColor: colors[action],
                }}
              />
            </div>
            {temEv && action !== 'fold' && frequency > 0 && (
              <p className={cn('text-xs', ev < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                EV contra foldar: {ev > 0 ? '+' : ''}{ev.toFixed(2)} BB
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
        <p className="text-xs text-muted-foreground">Ação Principal</p>
        <p className="font-bold text-primary capitalize text-lg">
          {hand.primaryAction === 'allin' ? 'All-in' : hand.primaryAction}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// POSITION BAR (mini poker table)
// ============================================================

function PositionBar({
  positions,
  activePosition,
  stack,
  desligadas = [],
  onPositionClick,
}: {
  positions: Position[];
  activePosition: Position;
  stack: number;
  /** Posições em que o cenário não existe */
  desligadas?: Position[];
  onPositionClick: (pos: Position) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {positions.map((pos) => {
        const isActive = pos === activePosition;
        const desligada = desligadas.includes(pos);
        return (
          <button
            key={pos}
            disabled={desligada}
            title={desligada ? 'Este cenário não existe nesta posição' : undefined}
            aria-pressed={isActive}
            onClick={() => onPositionClick(pos)}
            className={cn(
              'flex flex-col items-center px-3 py-1.5 rounded text-xs font-medium transition-all border',
              isActive
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/30',
              desligada && 'opacity-30 cursor-not-allowed hover:border-border'
            )}
          >
            <span className="font-bold">{pos}</span>
            <span className="text-[10px] opacity-70">{stack}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// MATRIX 13x13
// ============================================================

function WizardMatrix({
  range,
  selectedHand,
  onHandClick,
  highlightAction,
  colors,
}: {
  range: ReturnType<typeof getRange>;
  selectedHand: string | null;
  onHandClick: (hand: HandData) => void;
  highlightAction: ActionType | null;
  colors: Record<ActionType, string>;
}) {
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);

  const matrix = useMemo(() => {
    const m: (HandData | null)[][] = [];
    for (let i = 0; i < 13; i++) {
      m[i] = [];
      for (let j = 0; j < 13; j++) {
        let handName: string;
        if (i === j) handName = `${RANKS[i]}${RANKS[j]}`;
        else if (i < j) handName = `${RANKS[i]}${RANKS[j]}s`;
        else handName = `${RANKS[j]}${RANKS[i]}o`;
        m[i][j] = range.hands.find((h) => h.hand === handName) || null;
      }
    }
    return m;
  }, [range]);

  function getCellBackground(hand: HandData): string {
    const visibleActions = hand.actions.filter((a) => a.frequency > 0).sort((a, b) => b.frequency - a.frequency);
    if (visibleActions.length <= 1) {
      const color = colors[hand.primaryAction];
      const freq = visibleActions[0]?.frequency || 100;
      const alpha = Math.max(0.3, freq / 100);
      return hexToRgba(color, alpha);
    }
    // Gradient for mixed strategies
    let accumulated = 0;
    const stops: string[] = [];
    for (const action of visibleActions) {
      const color = colors[action.action];
      stops.push(`${color} ${accumulated}%`);
      accumulated += action.frequency;
      stops.push(`${color} ${accumulated}%`);
    }
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return (
    <TooltipProvider delayDuration={80}>
      <div className="w-full overflow-x-auto">
        {/* Sem largura mínima: no celular as 13 colunas cabem em ~26 px cada, sem rolar para o lado */}
        <div className="max-w-[650px] mx-auto">
          {/* Header */}
          <div className="grid grid-cols-[1rem_repeat(13,minmax(0,1fr))] sm:grid-cols-[1.5rem_repeat(13,minmax(0,1fr))] gap-[2px] mb-[2px]">
            <div />
            {RANKS.map((rank) => (
              <div key={`h-${rank}`} className="h-5 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                {rank}
              </div>
            ))}
          </div>

          {/* Rows */}
          {RANKS.map((rowRank, i) => (
            <div key={rowRank} className="grid grid-cols-[1rem_repeat(13,minmax(0,1fr))] sm:grid-cols-[1.5rem_repeat(13,minmax(0,1fr))] gap-[2px] mb-[2px]">
              <div className="h-[26px] sm:h-[38px] lg:h-[44px] flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                {rowRank}
              </div>
              {RANKS.map((colRank, j) => {
                const hand = matrix[i]?.[j];
                if (!hand) return <div key={`${rowRank}-${colRank}`} className="h-[26px] sm:h-[38px] lg:h-[44px] rounded-sm bg-muted/20" />;

                const isSelected = selectedHand === hand.hand;
                const isHovered = hoveredHand === hand.hand;
                const isDominant = highlightAction ? hand.primaryAction === highlightAction : false;
                const isDimmed = highlightAction && !isDominant;
                const bg = getCellBackground(hand);
                const isGradient = bg.startsWith('linear');

                return (
                  <Tooltip key={hand.hand}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'h-[26px] sm:h-[38px] lg:h-[44px] flex items-center justify-center text-[9px] sm:text-xs font-mono font-medium rounded-sm relative',
                          'transition-all duration-150 cursor-pointer text-white',
                          'border border-[#1a1a2e]',
                          isSelected && 'ring-2 ring-[#FFBF00] ring-offset-1 ring-offset-background z-10',
                          isHovered && !isSelected && 'ring-1 ring-[#FFBF00]/50',
                          isDimmed && 'opacity-25',
                          hand.pair && 'font-bold',
                        )}
                        style={{
                          background: isGradient ? bg : undefined,
                          backgroundColor: !isGradient ? bg : undefined,
                        }}
                        onClick={() => onHandClick(hand)}
                        onMouseEnter={() => setHoveredHand(hand.hand)}
                        onMouseLeave={() => setHoveredHand(null)}
                      >
                        {hand.hand.replace('o', '').replace('s', '')}
                        {hand.suited && !hand.pair && (
                          <span className="absolute top-0 right-0.5 hidden text-[7px] opacity-60 sm:inline">s</span>
                        )}
                        {!hand.suited && !hand.pair && (
                          <span className="absolute top-0 right-0.5 hidden text-[7px] opacity-60 sm:inline">o</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-popover border-border p-2 max-w-[180px]">
                      <div className="space-y-1">
                        <span className="font-bold text-sm">{hand.hand}</span>
                        {hand.actions
                          .filter((a) => a.frequency > 0)
                          .sort((a, b) => b.frequency - a.frequency)
                          .map((a) => (
                            <div key={a.action} className="flex items-center justify-between text-xs gap-2">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: colors[a.action] }} />
                                <span className="capitalize">{a.action}</span>
                              </div>
                              <span className="font-medium">{a.frequency}%</span>
                            </div>
                          ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

type Formato = 'torneio' | 'cash';

const POSICOES_DO_CASH: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const CENARIOS_DO_CASH: Scenario[] = ['openRaise', 'vsOpenRaise', 'vs3bet'];

/** Posições em que o cenário não existe (BB não abre; o primeiro a falar não enfrenta abertura...) */
function posicaoImpossivel(cenario: Scenario, posicoes: Position[], pos: Position): boolean {
  const i = posicoes.indexOf(pos);
  const ultimo = i === posicoes.length - 1;
  switch (cenario) {
    case 'openRaise':
      return ultimo;
    case 'vsOpenRaise':
    case 'vsOpenShove':
      return i === 0;
    case 'vs3bet':
      return i === 0 || ultimo;
    case 'multiway':
      return i < 2;
    default:
      return false;
  }
}

function lerPaleta(): PaletteId {
  try {
    return (localStorage.getItem('tabelas_palette') as PaletteId) || 'wizard';
  } catch {
    return 'wizard';
  }
}

function guardarPaleta(id: PaletteId) {
  try {
    localStorage.setItem('tabelas_palette', id);
  } catch {
    // sem storage, a paleta volta ao padrão na próxima visita
  }
}

export default function TablesPage() {
  const [formato, setFormato] = useState<Formato>('torneio');
  const [playerMode, setPlayerMode] = useState<PlayerMode>('6max');
  const [scenario, setScenario] = useState<Scenario>('openRaise');
  const [position, setPosition] = useState<Position>('UTG');
  const [vilao, setVilao] = useState<Position | null>(null);
  const [stack, setStack] = useState<number>(100);
  const [finalTable, setFinalTable] = useState(false);
  const [selectedHand, setSelectedHand] = useState<HandData | null>(null);
  const [multiwayPlayers, setMultiwayPlayers] = useState<number>(3);
  const [highlightAction, setHighlightAction] = useState<ActionType | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [paletteId, setPaletteId] = useState<PaletteId>(lerPaleta);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const colors = (COLOR_PALETTES.find(p => p.id === paletteId) || COLOR_PALETTES[0]).colors;

  const cash = formato === 'cash';
  const positions = cash ? POSICOES_DO_CASH : POSITIONS_BY_MODE[playerMode];
  const gameMode: GameMode = cash ? 'cash' : playerMode;
  const cenarios = cash ? SCENARIOS_LIST.filter((s) => CENARIOS_DO_CASH.includes(s.id)) : SCENARIOS_LIST;
  const cenario = cenarios.some((s) => s.id === scenario) ? scenario : 'openRaise';
  const stackEfetivo = cash ? 100 : stack;
  const mesaFinal = cash ? false : finalTable;

  // Posição: a escolhida, se existe no formato e no cenário; senão a primeira que serve
  const validas = positions.filter((p) => !posicaoImpossivel(cenario, positions, p));
  const effectivePosition = validas.includes(position) ? position : validas[0];

  // "Contra quem": só onde a range depende de quem abriu ou empurrou (cash vs
  // abertura e pagar all-in); quem age antes do herói
  const usaVilao = (cash && (cenario === 'vsOpenRaise' || cenario === 'vs3bet')) || (!cash && cenario === 'vsOpenShove');
  // No vs 3-bet o vilão fala depois do herói; nos outros, antes
  const iHeroi = positions.indexOf(effectivePosition);
  const viloes = !usaVilao ? [] : cenario === 'vs3bet' ? positions.slice(iHeroi + 1) : positions.slice(0, iHeroi);
  const vilaoEfetivo = vilao && viloes.includes(vilao) ? vilao : undefined;

  const range = useMemo(
    () => getRange(cenario, effectivePosition, stackEfetivo, mesaFinal, gameMode, 0, multiwayPlayers, vilaoEfetivo),
    [cenario, effectivePosition, stackEfetivo, mesaFinal, gameMode, multiwayPlayers, vilaoEfetivo]
  );

  // Available stacks for display
  const displayStacks = [100, 80, 60, 50, 40, 35, 30, 25, 20, 17, 14, 12, 10, 9, 8];
  const nomeDoCenario = SCENARIOS_LIST.find((s) => s.id === cenario)?.label;

  return (
    <MainLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* FILTER BAR */}
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-heading-sm text-foreground">Tabelas de range</h1>
              <p className="text-xs text-muted-foreground">Calculadas pelo GTORei; toque numa mão para ver o detalhe.</p>
            </div>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              aria-label={filtersExpanded ? 'Esconder filtros' : 'Mostrar filtros'}
              className="text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            >
              {filtersExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          <div className={cn('space-y-3 overflow-hidden transition-all', filtersExpanded ? 'max-h-[600px]' : 'max-h-0 lg:max-h-[600px]')}>
            {/* Formato */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Formato</span>
              <FilterChip label="Torneio" active={!cash} onClick={() => setFormato('torneio')} />
              <button
                onClick={() => {
                  setFormato('cash');
                  setSelectedHand(null);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all whitespace-nowrap border',
                  cash
                    ? 'bg-primary/20 text-primary border-primary/40'
                    : 'bg-[hsl(var(--card))] text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                )}
              >
                Cash 6-max
                <span className="rounded bg-primary px-1 py-px text-[9px] font-bold uppercase text-primary-foreground">Beta</span>
              </button>
            </div>

            {/* Players (torneio) */}
            {!cash && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-16 shrink-0">Mesa</span>
                {PLAYER_MODES.map((m) => (
                  <FilterChip
                    key={m.id}
                    label={m.label}
                    active={playerMode === m.id}
                    onClick={() => {
                      setPlayerMode(m.id);
                      setSelectedHand(null);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Scenario */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Cenário</span>
              {cenarios.map((s) => (
                <FilterChip
                  key={s.id}
                  label={s.label}
                  active={cenario === s.id}
                  onClick={() => {
                    setScenario(s.id);
                    setSelectedHand(null);
                  }}
                />
              ))}
            </div>

            {/* Stacks (o cash é sempre 100 BB) */}
            {!cash && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-16 shrink-0">Stack</span>
                <ScrollArea className="w-full">
                  <div className="flex gap-1.5 pb-1">
                    {displayStacks.map((s) => (
                      <FilterChip key={s} label={`${s}`} active={stack === s} onClick={() => setStack(s)} />
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}

            {/* Multiway players */}
            {cenario === 'multiway' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-16 shrink-0 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Way
                </span>
                {MULTIWAY_PLAYERS.map((n) => (
                  <FilterChip key={n} label={`${n}-way`} active={multiwayPlayers === n} onClick={() => setMultiwayPlayers(n)} />
                ))}
              </div>
            )}

            {/* Final table toggle (só torneio) */}
            {!cash && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0">ICM</span>
                <div className="flex items-center gap-2">
                  <Switch id="ft-toggle" checked={finalTable} onCheckedChange={setFinalTable} className="data-[state=checked]:bg-primary" />
                  <Label htmlFor="ft-toggle" className="text-xs text-muted-foreground cursor-pointer">
                    Mesa Final
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-7xl mx-auto">
            {cash && (
              <p className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                Cash 6-max com 100 BB, sem ante e com rake de 5% (teto de 3 BB) no pote disputado. Calculado pelo GTORei por EV;
                quem paga a abertura fora do big blind corre o risco de squeeze de quem fala depois. Contra o 3-bet, o 4-bet é pequeno (2,2x) e o all-in fica para o 5-bet.
              </p>
            )}

            {/* Posição do herói */}
            <div className="mb-3">
              <p className="mb-1.5 text-xs text-muted-foreground">Sua posição</p>
              <PositionBar
                positions={positions}
                activePosition={effectivePosition}
                stack={stackEfetivo}
                desligadas={positions.filter((p) => !validas.includes(p))}
                onPositionClick={(p) => {
                  setPosition(p);
                  setSelectedHand(null);
                }}
              />
            </div>

            {/* Contra quem */}
            {usaVilao && viloes.length > 0 && (
              <div className="mb-4">
                <p className="mb-1.5 text-xs text-muted-foreground">{cenario === 'vsOpenShove' ? 'Quem foi all-in' : cenario === 'vs3bet' ? 'Quem deu 3-bet' : 'Quem abriu'}</p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Média" active={!vilaoEfetivo} onClick={() => setVilao(null)} />
                  {viloes.map((v) => (
                    <FilterChip key={v} label={v} active={vilaoEfetivo === v} onClick={() => setVilao(v)} />
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {nomeDoCenario} · {effectivePosition}
                {vilaoEfetivo ? ` contra ${vilaoEfetivo}` : ''} · {stackEfetivo} BB
              </span>
              {cash && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">Cash</span>}
              {cenario === 'multiway' && (
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{multiwayPlayers}-way</span>
              )}
              {mesaFinal && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">ICM</span>}
            </div>

            {/* Grid: Matrix + Palette + Action Panel */}
            <div className="grid lg:grid-cols-[1fr_auto_280px] gap-4 items-start">
              {/* Matrix */}
              <div className="bg-card rounded-lg border border-border p-2 sm:p-4">
                <WizardMatrix
                  range={range}
                  selectedHand={selectedHand?.hand || null}
                  onHandClick={(hand) => setSelectedHand(hand)}
                  highlightAction={highlightAction}
                  colors={colors}
                />

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 justify-center">
                  {(['fold', 'call', 'raise', 'allin'] as ActionType[]).map((action) => (
                    <button
                      key={action}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded transition-all',
                        highlightAction === action ? 'bg-foreground/10 ring-1 ring-foreground/20' : 'hover:bg-foreground/5'
                      )}
                      aria-pressed={highlightAction === action}
                      onClick={() => setHighlightAction(highlightAction === action ? null : action)}
                    >
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[action] }} />
                      <span className="text-xs text-muted-foreground">{ROTULO[action]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Palette toggle + card */}
              <div className="hidden lg:flex items-start gap-0">
                <button
                  onClick={() => setPaletteOpen(!paletteOpen)}
                  aria-label={paletteOpen ? 'Fechar paleta de cores' : 'Abrir paleta de cores'}
                  className="bg-card border border-border rounded-l-lg px-1.5 py-3 hover:bg-muted/50 transition-colors flex flex-col items-center gap-1 mt-2"
                >
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  {paletteOpen ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
                </button>
                {paletteOpen && (
                  <div className="bg-card rounded-lg border border-border p-3 w-[200px]">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Cores</p>
                    <div className="space-y-1.5">
                      {COLOR_PALETTES.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setPaletteId(p.id);
                            guardarPaleta(p.id);
                          }}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 px-2 py-2 rounded border transition-all',
                            paletteId === p.id ? 'border-primary/50 bg-primary/10' : 'border-border hover:border-primary/30 bg-card'
                          )}
                        >
                          <span className="text-xs font-medium text-foreground">{p.label}</span>
                          <div className="flex gap-0.5">
                            {(['fold', 'call', 'raise', 'allin'] as ActionType[]).map((a) => (
                              <div key={a} className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.colors[a] }} />
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="space-y-4">
                <div className="bg-card rounded-lg border border-border p-3">
                  <ActionPanel range={range} selectedHand={selectedHand} colors={colors} />
                </div>
                <div className="bg-card rounded-lg border border-border p-3">
                  {selectedHand ? (
                    <HandDetailPanel hand={range.hands.find((h) => h.hand === selectedHand.hand) ?? selectedHand} colors={colors} />
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Toque numa mão da tabela para ver o que ela faz</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
