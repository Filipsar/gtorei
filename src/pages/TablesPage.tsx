import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { RANKS, POSITIONS, STACK_SIZES, getRange, type Position, type Scenario, type GameMode, type HandData, type ActionType } from '@/data/gtoRanges';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Users, ChevronDown, ChevronUp, Palette, ChevronRight, ChevronLeft } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================
// CONSTANTS
// ============================================================

const WIZARD_COLORS: Record<ActionType, string> = {
  fold: '#3B9EBF',
  call: '#4CAF50',
  raise: '#E91E63',
  allin: '#C62828',
};

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

function ActionPanel({ range, selectedHand }: { range: ReturnType<typeof getRange>; selectedHand: HandData | null }) {
  const totals = useMemo(() => {
    // If a hand is selected, show its per-action breakdown instead of the aggregate
    if (selectedHand) {
      return (['allin', 'raise', 'call', 'fold'] as ActionType[]).map((action) => {
        const found = selectedHand.actions.find((a) => a.action === action);
        const freq = found?.frequency ?? 0;
        return {
          action,
          label: action === 'allin' ? 'All-in' : action === 'raise' ? 'Raise 2.5x' : action === 'call' ? 'Call' : 'Fold',
          percentage: freq,
          combos: freq / 100,
        };
      });
    }

    const sums: Record<ActionType, { freq: number; combos: number }> = {
      fold: { freq: 0, combos: 0 },
      call: { freq: 0, combos: 0 },
      raise: { freq: 0, combos: 0 },
      allin: { freq: 0, combos: 0 },
    };
    for (const hand of range.hands) {
      for (const action of hand.actions) {
        if (action.frequency > 0) {
          sums[action.action].freq += action.frequency;
          sums[action.action].combos += action.frequency / 100;
        }
      }
    }
    const totalFreq = Object.values(sums).reduce((s, v) => s + v.freq, 0);
    return (['allin', 'raise', 'call', 'fold'] as ActionType[]).map((action) => ({
      action,
      label: action === 'allin' ? 'All-in' : action === 'raise' ? 'Raise 2.5x' : action === 'call' ? 'Call' : 'Fold',
      percentage: totalFreq > 0 ? (sums[action].freq / totalFreq) * 100 : 0,
      combos: sums[action].combos,
    }));
  }, [range, selectedHand]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {selectedHand ? `Ações — ${selectedHand.hand}` : 'Ações (Range)'}
        </span>
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
              backgroundColor: WIZARD_COLORS[action],
            }}
          />
          <div className="relative flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <div className="flex items-center gap-3">
              {!selectedHand && <span className="text-xs text-muted-foreground">{combos.toFixed(1)} combos</span>}
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

function HandDetailPanel({ hand }: { hand: HandData }) {
  const allActions = (['allin', 'raise', 'call', 'fold'] as ActionType[]).map((act) => {
    const found = hand.actions.find((a) => a.action === act);
    return {
      action: act,
      frequency: found?.frequency ?? 0,
      ev: found?.ev ?? 0,
      label: act === 'allin' ? 'All-in' : act === 'raise' ? 'Raise 2.5x' : act === 'call' ? 'Call' : 'Fold',
    };
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
                  backgroundColor: WIZARD_COLORS[action],
                }}
              />
            </div>
            <p className={cn(
              'text-xs',
              ev < 0 ? 'text-destructive' : 'text-muted-foreground'
            )}>
              EV: {ev > 0 ? '+' : ''}{ev.toFixed(2)} BB
            </p>
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
  onPositionClick,
}: {
  positions: Position[];
  activePosition: Position;
  stack: number;
  onPositionClick: (pos: Position) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {positions.map((pos) => {
        const isActive = pos === activePosition;
        return (
          <button
            key={pos}
            onClick={() => onPositionClick(pos)}
            className={cn(
              'flex flex-col items-center px-3 py-1.5 rounded text-xs font-medium transition-all border',
              isActive
                ? 'bg-primary/20 border-primary/50 text-primary'
                : 'bg-card border-border text-muted-foreground hover:border-primary/30'
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
}: {
  range: ReturnType<typeof getRange>;
  selectedHand: string | null;
  onHandClick: (hand: HandData) => void;
  highlightAction: ActionType | null;
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
      const color = WIZARD_COLORS[hand.primaryAction];
      const freq = visibleActions[0]?.frequency || 100;
      const alpha = Math.max(0.3, freq / 100);
      return hexToRgba(color, alpha);
    }
    // Gradient for mixed strategies
    let accumulated = 0;
    const stops: string[] = [];
    for (const action of visibleActions) {
      const color = WIZARD_COLORS[action.action];
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
        <div className="min-w-[420px] max-w-[650px] mx-auto">
          {/* Header */}
          <div className="grid grid-cols-[1.5rem_repeat(13,1fr)] gap-[2px] mb-[2px]">
            <div />
            {RANKS.map((rank) => (
              <div key={`h-${rank}`} className="h-5 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                {rank}
              </div>
            ))}
          </div>

          {/* Rows */}
          {RANKS.map((rowRank, i) => (
            <div key={rowRank} className="grid grid-cols-[1.5rem_repeat(13,1fr)] gap-[2px] mb-[2px]">
              <div className="h-[38px] sm:h-[44px] flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                {rowRank}
              </div>
              {RANKS.map((colRank, j) => {
                const hand = matrix[i]?.[j];
                if (!hand) return <div key={`${rowRank}-${colRank}`} className="h-[38px] sm:h-[44px] rounded-sm bg-muted/20" />;

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
                          'h-[38px] sm:h-[44px] flex items-center justify-center text-[10px] sm:text-xs font-mono font-medium rounded-sm relative',
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
                          <span className="absolute top-0 right-0.5 text-[7px] opacity-60">s</span>
                        )}
                        {!hand.suited && !hand.pair && (
                          <span className="absolute top-0 right-0.5 text-[7px] opacity-60">o</span>
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
                                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: WIZARD_COLORS[a.action] }} />
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

export default function TablesPage() {
  const [playerMode, setPlayerMode] = useState<PlayerMode>('6max');
  const [scenario, setScenario] = useState<Scenario>('openRaise');
  const [position, setPosition] = useState<Position>('UTG');
  const [stack, setStack] = useState<number>(100);
  const [finalTable, setFinalTable] = useState(false);
  const [selectedHand, setSelectedHand] = useState<HandData | null>(null);
  const [multiwayPlayers, setMultiwayPlayers] = useState<number>(3);
  const [highlightAction, setHighlightAction] = useState<ActionType | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const positions = POSITIONS_BY_MODE[playerMode];
  const gameMode: GameMode = playerMode === 'threehand' ? 'threehand' : playerMode === 'hu' ? 'hu' : playerMode;

  // Reset position if not available in current mode
  const effectivePosition = positions.includes(position) ? position : positions[0];

  const range = useMemo(
    () => getRange(scenario, effectivePosition, stack, finalTable, gameMode, 0, multiwayPlayers),
    [scenario, effectivePosition, stack, finalTable, gameMode, multiwayPlayers]
  );

  // Available stacks for display
  const displayStacks = [100, 80, 60, 50, 40, 35, 30, 25, 20, 17, 14, 12, 10, 9, 8];

  return (
    <MainLayout>
      <div className="flex flex-col h-full min-h-0">
        {/* FILTER BAR */}
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-heading-sm text-foreground">Ranges GTO</h1>
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors lg:hidden"
            >
              {filtersExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          <div className={cn('space-y-3 overflow-hidden transition-all', filtersExpanded ? 'max-h-[500px]' : 'max-h-0 lg:max-h-[500px]')}>
            {/* Players */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Players</span>
              {PLAYER_MODES.map((m) => (
                <FilterChip
                  key={m.id}
                  label={m.label}
                  active={playerMode === m.id}
                  onClick={() => {
                    setPlayerMode(m.id);
                    const newPositions = POSITIONS_BY_MODE[m.id];
                    if (!newPositions.includes(position)) setPosition(newPositions[0]);
                  }}
                />
              ))}
            </div>

            {/* Scenario */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Cenário</span>
              {SCENARIOS_LIST.map((s) => (
                <FilterChip
                  key={s.id}
                  label={s.label}
                  active={scenario === s.id}
                  onClick={() => setScenario(s.id)}
                />
              ))}
            </div>

            {/* Stacks */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Stack</span>
              <ScrollArea className="w-full">
                <div className="flex gap-1.5 pb-1">
                  {displayStacks.map((s) => (
                    <FilterChip
                      key={s}
                      label={`${s}`}
                      active={stack === s}
                      onClick={() => setStack(s)}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* Multiway players */}
            {scenario === 'multiway' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground w-16 shrink-0 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Way
                </span>
                {MULTIWAY_PLAYERS.map((n) => (
                  <FilterChip
                    key={n}
                    label={`${n}-way`}
                    active={multiwayPlayers === n}
                    onClick={() => setMultiwayPlayers(n)}
                  />
                ))}
              </div>
            )}

            {/* Final table toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 shrink-0">ICM</span>
              <div className="flex items-center gap-2">
                <Switch
                  id="ft-toggle"
                  checked={finalTable}
                  onCheckedChange={setFinalTable}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="ft-toggle" className="text-xs text-muted-foreground cursor-pointer">
                  Mesa Final
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-7xl mx-auto">
            {/* Position bar */}
            <div className="mb-4">
              <PositionBar
                positions={positions}
                activePosition={effectivePosition}
                stack={stack}
                onPositionClick={setPosition}
              />
            </div>

            {/* Title */}
            <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">
                {SCENARIOS_LIST.find((s) => s.id === scenario)?.label} — {effectivePosition} — {stack}BB
              </span>
              {scenario === 'multiway' && (
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{multiwayPlayers}-way</span>
              )}
              {finalTable && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">ICM</span>
              )}
            </div>

            {/* Grid: Matrix + Action Panel */}
            <div className="grid lg:grid-cols-[1fr_280px] gap-4">
              {/* Matrix */}
              <div className="bg-card rounded-lg border border-border p-3 sm:p-4">
                <WizardMatrix
                  range={range}
                  selectedHand={selectedHand?.hand || null}
                  onHandClick={(hand) => setSelectedHand(hand)}
                  highlightAction={highlightAction}
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
                      onClick={() => setHighlightAction(highlightAction === action ? null : action)}
                    >
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: WIZARD_COLORS[action] }} />
                      <span className="text-xs text-muted-foreground capitalize">
                        {action === 'allin' ? 'All-in' : action}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div className="space-y-4">
                {/* Action summary */}
                <div className="bg-card rounded-lg border border-border p-3">
                  <ActionPanel range={range} selectedHand={selectedHand} />
                </div>

                {/* Hand detail */}
                <div className="bg-card rounded-lg border border-border p-3">
                  {selectedHand ? (
                    <HandDetailPanel hand={selectedHand} />
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p className="text-sm">Clique em uma mão na matriz para ver os detalhes</p>
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
