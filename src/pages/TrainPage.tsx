import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PokerTable } from '@/components/poker/PokerTable';
import { ActionButtons } from '@/components/poker/ActionButtons';
import { DecisionFeedback } from '@/components/poker/DecisionFeedback';
import { generateCardsFromHand } from '@/components/poker/PlayingCard';
import { 
  POSITIONS, SCENARIOS, STACK_SIZES, 
  Position, Scenario, ActionType, 
  RANKS, getHandData, calculateFeedback 
} from '@/data/gtoRanges';
import { 
  createSession, getCurrentSession, updateCurrentSession, 
  addHandToSession, endCurrentSession, getUserProfile, createUserProfile 
} from '@/data/localStorage';
import { cn } from '@/lib/utils';
import { Play, Shuffle, Trophy, Target, Zap } from 'lucide-react';

type GamePhase = 'config' | 'playing' | 'feedback';

interface GameState {
  hand: string;
  cards: Array<{ rank: string; suit: 's' | 'h' | 'd' | 'c' }>;
  position: Position;
  stack: number;
  pot: number;
}

export default function TrainPage() {
  // Config state
  const [scenario, setScenario] = useState<Scenario>('openRaise');
  const [selectedPositions, setSelectedPositions] = useState<Position[]>(['UTG']);
  const [selectedStacks, setSelectedStacks] = useState<number[]>([30]);
  const [randomPosition, setRandomPosition] = useState(false);
  const [randomStack, setRandomStack] = useState(false);
  const [finalTable, setFinalTable] = useState(false);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('config');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{
    userAction: ActionType;
    handData: ReturnType<typeof getHandData>;
    feedback: ReturnType<typeof calculateFeedback>;
  } | null>(null);

  const navigate = useNavigate();

  // Ensure user profile exists
  useEffect(() => {
    if (!getUserProfile()) {
      createUserProfile('Jogador');
    }
  }, []);

  // Generate random hand
  const generateRandomHand = useCallback((): string => {
    const rank1 = RANKS[Math.floor(Math.random() * RANKS.length)];
    const rank2 = RANKS[Math.floor(Math.random() * RANKS.length)];
    
    const idx1 = RANKS.indexOf(rank1);
    const idx2 = RANKS.indexOf(rank2);
    
    if (idx1 === idx2) {
      return `${rank1}${rank2}`;
    } else if (idx1 < idx2) {
      return Math.random() > 0.5 ? `${rank1}${rank2}s` : `${rank1}${rank2}o`;
    } else {
      return Math.random() > 0.5 ? `${rank2}${rank1}s` : `${rank2}${rank1}o`;
    }
  }, []);

  // Start game
  const startGame = useCallback(() => {
    const pos = randomPosition 
      ? POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
      : selectedPositions[Math.floor(Math.random() * selectedPositions.length)];
    
    const stk = randomStack
      ? STACK_SIZES[Math.floor(Math.random() * STACK_SIZES.length)]
      : selectedStacks[Math.floor(Math.random() * selectedStacks.length)];

    const hand = generateRandomHand();
    const cards = generateCardsFromHand(hand);

    createSession({
      scenario,
      position: randomPosition ? 'random' : pos,
      stack: randomStack ? 'random' : stk,
    });

    setGameState({
      hand,
      cards,
      position: pos,
      stack: stk,
      pot: 1.5, // SB + BB
    });
    setSessionScore(0);
    setHandsPlayed(0);
    setPhase('playing');
  }, [scenario, selectedPositions, selectedStacks, randomPosition, randomStack, generateRandomHand]);

  // Handle action
  const handleAction = useCallback((action: ActionType) => {
    if (!gameState) return;

    const handData = getHandData(gameState.hand, scenario, gameState.position, gameState.stack, finalTable);
    if (!handData) return;

    const feedback = calculateFeedback(action, handData);

    addHandToSession({
      hand: gameState.hand,
      scenario,
      position: gameState.position,
      stack: gameState.stack,
      userAction: action,
      correctAction: handData.primaryAction,
      feedback: feedback.type,
      points: feedback.points,
      evLoss: feedback.evLoss,
    });

    setSessionScore(prev => prev + feedback.points);
    setHandsPlayed(prev => prev + 1);
    setLastFeedback({ userAction: action, handData, feedback });
    setPhase('feedback');
  }, [gameState, scenario, finalTable]);

  // Next hand
  const nextHand = useCallback(() => {
    const pos = randomPosition 
      ? POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
      : selectedPositions[Math.floor(Math.random() * selectedPositions.length)];
    
    const stk = randomStack
      ? STACK_SIZES[Math.floor(Math.random() * STACK_SIZES.length)]
      : selectedStacks[Math.floor(Math.random() * selectedStacks.length)];

    const hand = generateRandomHand();
    const cards = generateCardsFromHand(hand);

    setGameState({
      hand,
      cards,
      position: pos,
      stack: stk,
      pot: 1.5,
    });
    setLastFeedback(null);
    setPhase('playing');
  }, [selectedPositions, selectedStacks, randomPosition, randomStack, generateRandomHand]);

  // End session
  const endSession = useCallback(() => {
    endCurrentSession();
    setPhase('config');
    setGameState(null);
    setLastFeedback(null);
  }, []);

  // Toggle position selection
  const togglePosition = (pos: Position) => {
    if (selectedPositions.includes(pos)) {
      if (selectedPositions.length > 1) {
        setSelectedPositions(prev => prev.filter(p => p !== pos));
      }
    } else {
      setSelectedPositions(prev => [...prev, pos]);
    }
  };

  // Toggle stack selection
  const toggleStack = (stk: number) => {
    if (selectedStacks.includes(stk)) {
      if (selectedStacks.length > 1) {
        setSelectedStacks(prev => prev.filter(s => s !== stk));
      }
    } else {
      setSelectedStacks(prev => [...prev, stk]);
    }
  };

  // Config phase
  if (phase === 'config') {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Treino Rápido
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure seu treino e pratique decisões GTO
            </p>
          </div>

          <div className="space-y-6">
            {/* Scenario selection */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h2 className="font-semibold mb-4 text-lg">Cenário</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SCENARIOS.map((s) => (
                    <Button
                      key={s.id}
                      variant={scenario === s.id ? 'default' : 'outline'}
                      onClick={() => setScenario(s.id)}
                      className={cn(
                        'h-auto py-3 flex flex-col items-center gap-1',
                        scenario === s.id && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <span className="font-medium">{s.label}</span>
                      <span className="text-xs opacity-70">{s.description}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Position selection */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Posição</h2>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="random-pos"
                      checked={randomPosition}
                      onCheckedChange={setRandomPosition}
                    />
                    <Label htmlFor="random-pos" className="text-sm flex items-center gap-1">
                      <Shuffle className="h-4 w-4" />
                      Aleatório
                    </Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((pos) => (
                    <Button
                      key={pos}
                      variant={selectedPositions.includes(pos) && !randomPosition ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePosition(pos)}
                      disabled={randomPosition}
                      className={cn(
                        'min-w-[3.5rem]',
                        selectedPositions.includes(pos) && !randomPosition && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stack selection */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Stack (BB)</h2>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="random-stack"
                      checked={randomStack}
                      onCheckedChange={setRandomStack}
                    />
                    <Label htmlFor="random-stack" className="text-sm flex items-center gap-1">
                      <Shuffle className="h-4 w-4" />
                      Aleatório
                    </Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STACK_SIZES.map((stk) => (
                    <Button
                      key={stk}
                      variant={selectedStacks.includes(stk) && !randomStack ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleStack(stk)}
                      disabled={randomStack}
                      className={cn(
                        'min-w-[3rem]',
                        selectedStacks.includes(stk) && !randomStack && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {stk}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Final table toggle */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-lg">Modo Mesa Final</h2>
                    <p className="text-sm text-muted-foreground">
                      Ativa ajustes ICM para final tables
                    </p>
                  </div>
                  <Switch
                    checked={finalTable}
                    onCheckedChange={setFinalTable}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Config summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 sm:p-6">
                <h2 className="font-semibold mb-3 text-lg">Resumo</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cenário</p>
                    <p className="font-medium">{SCENARIOS.find(s => s.id === scenario)?.label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Posição</p>
                    <p className="font-medium">
                      {randomPosition ? 'Aleatório' : selectedPositions.join(', ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stack</p>
                    <p className="font-medium">
                      {randomStack ? 'Aleatório' : selectedStacks.join(', ') + ' BB'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Modo</p>
                    <p className="font-medium">{finalTable ? 'Mesa Final' : 'Normal'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Start button */}
            <Button
              onClick={startGame}
              size="lg"
              className="w-full h-16 text-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-gold"
            >
              <Play className="h-6 w-6 mr-2" />
              JOGAR
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Playing/feedback phase
  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header with session info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg">{sessionScore} pts</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>{handsPlayed} mãos</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={endSession}>
            Encerrar
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress 
            value={Math.max(0, Math.min(100, sessionScore / 10))} 
            className="h-2"
          />
        </div>

        {/* Game info */}
        {gameState && (
          <div className="space-y-6">
            {/* Hand info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Sua Mão</p>
                      <p className="text-2xl font-bold text-primary">{gameState.hand}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Posição</p>
                      <p className="text-lg font-semibold">{gameState.position}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Stack</p>
                      <p className="text-lg font-semibold">{gameState.stack} BB</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Cenário</p>
                    <p className="text-sm font-medium">
                      {SCENARIOS.find(s => s.id === scenario)?.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Poker table */}
            <PokerTable
              heroPosition={gameState.position}
              heroCards={gameState.cards}
              pot={gameState.pot}
              heroStack={gameState.stack}
            />

            {/* Action buttons */}
            <ActionButtons
              onAction={handleAction}
              pot={gameState.pot}
              stack={gameState.stack}
              disabled={phase === 'feedback'}
              showRaiseSlider={false}
            />
          </div>
        )}

        {/* Feedback modal */}
        {lastFeedback && lastFeedback.handData && (
          <DecisionFeedback
            open={phase === 'feedback'}
            onClose={() => setPhase('playing')}
            onNextHand={nextHand}
            userAction={lastFeedback.userAction}
            handData={lastFeedback.handData}
            feedback={lastFeedback.feedback}
            sessionScore={sessionScore}
            handsPlayed={handsPlayed}
          />
        )}
      </div>
    </MainLayout>
  );
}
