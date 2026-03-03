import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RangeMatrix, COLOR_PALETTES, type ColorPalette } from '@/components/poker/RangeMatrix';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { POSITIONS, SCENARIOS, STACK_SIZES, Position, Scenario, HandData } from '@/data/gtoRanges';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Users } from 'lucide-react';

// Scenarios hidden from Tables page
const HIDDEN_SCENARIOS: Scenario[] = ['simulation'];

// Multiway player count options
const MULTIWAY_PLAYERS = [3, 4, 5, 6] as const;

export default function TablesPage() {
  const [scenario, setScenario] = useState<Scenario>('openRaise');
  const [position, setPosition] = useState<Position>('UTG');
  const [stack, setStack] = useState<number>(30);
  const [finalTable, setFinalTable] = useState(false);
  const [selectedHand, setSelectedHand] = useState<HandData | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette>('classic');
  const [multiwayPlayers, setMultiwayPlayers] = useState<number>(3);

  const isMultiway = scenario === 'multiway';

  // Filter scenarios: hide simulation from Tables
  const availableScenarios = SCENARIOS.filter(s => !HIDDEN_SCENARIOS.includes(s.id));

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground">
            Ranges por ChipEV
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Visualize as ranges GTO para cada cenário e posição
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Main content */}
          <div className="space-y-6 min-w-0">
            {/* Filters */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-6">
                  {/* Scenario select */}
                  <div className="space-y-2">
                    <Label>Cenário</Label>
                    <Select value={scenario} onValueChange={(v) => setScenario(v as Scenario)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableScenarios.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex flex-col">
                              <span>{s.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {s.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Position chips */}
                  <div className="space-y-2">
                    <Label>Posição</Label>
                    <div className="flex flex-wrap gap-2">
                      {POSITIONS.map((pos) => (
                        <Button
                          key={pos}
                          variant={position === pos ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPosition(pos)}
                          className={cn(
                            position === pos && 'bg-primary text-primary-foreground'
                          )}
                        >
                          {pos}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Stack chips */}
                  <div className="space-y-2">
                    <Label>Stack (BB)</Label>
                    <div className="flex flex-wrap gap-2">
                      {STACK_SIZES.map((s) => (
                        <Button
                          key={s}
                          variant={stack === s ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStack(s)}
                          className={cn(
                            'min-w-[3rem]',
                            stack === s && 'bg-primary text-primary-foreground'
                          )}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Final table toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <Label htmlFor="final-table" className="font-medium">
                        Modo Mesa Final
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        ICM ajustado para final tables
                      </p>
                    </div>
                    <Switch
                      id="final-table"
                      checked={finalTable}
                      onCheckedChange={setFinalTable}
                    />
                  </div>

                  {/* Multiway player count */}
                  {isMultiway && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Jogadores no Pote
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {MULTIWAY_PLAYERS.map((n) => (
                          <Button
                            key={n}
                            variant={multiwayPlayers === n ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setMultiwayPlayers(n)}
                            className={cn(
                              'min-w-[3rem]',
                              multiwayPlayers === n && 'bg-primary text-primary-foreground'
                            )}
                          >
                            {n}-way
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quantidade de jogadores que entraram no pote
                      </p>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>

            {/* Range Matrix */}
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-heading-xs">
                  {SCENARIOS.find(s => s.id === scenario)?.label} - {position} - {stack}BB
                  {isMultiway && ` (${multiwayPlayers}-way)`}
                </CardTitle>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56">
                    <p className="font-medium text-sm mb-2">Paleta de Cores</p>
                    <div className="flex flex-col gap-1.5">
                      {COLOR_PALETTES.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setColorPalette(p.id)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all w-full',
                            colorPalette === p.id
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                          )}
                        >
                          <div className="flex gap-0.5">
                            {Object.values(p.colors).map((color, idx) => (
                              <div
                                key={idx}
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent className="p-4">
                <ScrollArea className="w-full">
                  <div className="min-w-[320px]">
                     <RangeMatrix
                      scenario={scenario}
                      position={position}
                      stack={stack}
                      finalTable={finalTable}
                      selectedHand={selectedHand?.hand}
                      onHandClick={setSelectedHand}
                      colorPalette={colorPalette}
                      multiwayPlayers={multiwayPlayers}
                    />
                   </div>
                   <ScrollBar orientation="horizontal" />
                 </ScrollArea>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 justify-center">
                  {(['fold', 'call', 'raise', 'allin'] as const).map((action) => {
                    const palette = COLOR_PALETTES.find(p => p.id === colorPalette) || COLOR_PALETTES[0];
                    return (
                      <div key={action} className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: palette.colors[action] }}
                        />
                        <span className="text-sm text-muted-foreground capitalize">
                          {action === 'allin' ? 'All-in' : action}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Palette + Hand details */}
          <div className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-heading-xs">Detalhes da Mão</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedHand ? (
                  <div className="space-y-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <span className="text-3xl font-bold text-primary">
                        {selectedHand.hand}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedHand.pair ? 'Par' : selectedHand.suited ? 'Suited' : 'Offsuit'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="font-medium text-sm">Frequências:</p>
                      {(() => {
                        const allActions: Array<{ action: string; frequency: number; ev: number }> = ['fold', 'call', 'raise', 'allin'].map((act) => {
                          const found = selectedHand.actions.find(a => a.action === act);
                          return {
                            action: act,
                            frequency: found?.frequency ?? 0,
                            ev: found?.ev ?? 0,
                          };
                        });
                        const inRangeBestEv = Math.max(
                          ...allActions.filter(a => a.frequency > 0).map(a => a.ev),
                          0
                        );
                        const maxAbsEv = Math.max(
                          1,
                          ...allActions.map(a => Math.abs(a.ev))
                        );

                        return allActions
                          .sort((a, b) => b.frequency - a.frequency)
                          .map((action) => {
                            const getSizingLabel = (act: string) => {
                              switch (act) {
                                case 'raise': return 'Raise 2.5x';
                                case 'call': return 'Call';
                                case 'fold': return 'Fold';
                                case 'allin': return 'All-in';
                                default: return act;
                              }
                            };
                            const evLoss = action.action === 'raise'
                              ? Math.max(0, inRangeBestEv - action.ev)
                              : null;
                            const negativeEvWidth = Math.max(
                              6,
                              Math.round((Math.abs(action.ev) / maxAbsEv) * 100)
                            );

                            return (
                              <div key={action.action} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="capitalize">{getSizingLabel(action.action)}</span>
                                  <span className="font-medium">{action.frequency}%</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      action.action === 'fold' && 'bg-muted-foreground/50',
                                      action.action === 'call' && 'bg-secondary',
                                      action.action === 'raise' && 'bg-feedback-best',
                                      action.action === 'allin' && 'bg-destructive'
                                    )}
                                    style={{ width: `${action.frequency}%` }}
                                  />
                                </div>
                                <p className={cn(
                                  'text-xs',
                                  action.ev < 0 ? 'text-destructive' : 'text-muted-foreground'
                                )}>
                                  EV: {action.ev > 0 ? '+' : ''}{action.ev.toFixed(2)} BB
                                </p>
                                {action.ev < 0 && (
                                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-destructive"
                                      style={{ width: `${negativeEvWidth}%` }}
                                    />
                                  </div>
                                )}
                                {action.action === 'raise' && evLoss !== null && (
                                  <p className={cn(
                                    'text-xs',
                                    evLoss > 0 ? 'text-destructive' : 'text-muted-foreground'
                                  )}>
                                    EV Loss por Raise: -{evLoss.toFixed(2)} BB
                                  </p>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>

                    {selectedHand.actions.some(a => a.action === 'raise' && a.frequency > 0) && (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="font-medium text-sm">Sizing do Raise:</p>
                        <div className="space-y-1.5">
                          {[
                            { label: 'Min Raise (33%)', pct: Math.round((selectedHand.actions.find(a => a.action === 'raise')?.frequency || 0) * 0.25) },
                            { label: 'Raise 50%', pct: Math.round((selectedHand.actions.find(a => a.action === 'raise')?.frequency || 0) * 0.35) },
                            { label: 'Raise 75%', pct: Math.round((selectedHand.actions.find(a => a.action === 'raise')?.frequency || 0) * 0.25) },
                            { label: 'Raise Pot', pct: Math.round((selectedHand.actions.find(a => a.action === 'raise')?.frequency || 0) * 0.15) },
                          ].filter(s => s.pct > 0).map((sizing) => (
                            <div key={sizing.label} className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">{sizing.label}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-feedback-best/70"
                                    style={{ width: `${sizing.pct}%` }}
                                  />
                                </div>
                                <span className="font-medium w-8 text-right">{sizing.pct}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm text-muted-foreground">Ação Principal</p>
                      <p className="font-bold text-primary capitalize text-lg">
                        {selectedHand.primaryAction}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Clique em uma mão para ver os detalhes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
