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
import { Lock, Palette } from 'lucide-react';

// Locked scenarios (under maintenance)
const LOCKED_SCENARIOS: Scenario[] = ['multiway'];

export default function TablesPage() {
  const [scenario, setScenario] = useState<Scenario>('openRaise');
  const [position, setPosition] = useState<Position>('UTG');
  const [stack, setStack] = useState<number>(30);
  const [finalTable, setFinalTable] = useState(false);
  const [selectedHand, setSelectedHand] = useState<HandData | null>(null);
  const [colorPalette, setColorPalette] = useState<ColorPalette>('classic');

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
                        {SCENARIOS.map((s) => {
                          const isLocked = LOCKED_SCENARIOS.includes(s.id);
                          return (
                            <SelectItem 
                              key={s.id} 
                              value={s.id} 
                              disabled={isLocked}
                              className={cn(isLocked && 'opacity-50')}
                            >
                              <div className="flex flex-col">
                                <span className="flex items-center gap-2">
                                  {s.label}
                                  {isLocked && <Lock className="h-3 w-3 text-muted-foreground" />}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {isLocked ? 'Em manutenção' : s.description}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
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

                </div>
              </CardContent>
            </Card>

            {/* Range Matrix */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-xs">
                  {SCENARIOS.find(s => s.id === scenario)?.label} - {position} - {stack}BB
                </CardTitle>
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
            {/* Color palette selector */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-heading-xs flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Paleta de Cores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-heading-xs">Detalhes da Mão</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedHand ? (
                  <div className="space-y-4">
                    {/* Hand name */}
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <span className="text-3xl font-bold text-primary">
                        {selectedHand.hand}
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedHand.pair ? 'Par' : selectedHand.suited ? 'Suited' : 'Offsuit'}
                      </p>
                    </div>

                    {/* Actions breakdown */}
                    <div className="space-y-3">
                      <p className="font-medium text-sm">Frequências:</p>
                      {selectedHand.actions
                        .filter(a => a.frequency > 0)
                        .sort((a, b) => b.frequency - a.frequency)
                        .map((action) => (
                          <div key={action.action} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{action.action}</span>
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
                            {action.ev !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                EV: {action.ev > 0 ? '+' : ''}{action.ev.toFixed(2)} BB
                              </p>
                            )}
                          </div>
                        ))}
                    </div>

                    {/* Primary action */}
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
