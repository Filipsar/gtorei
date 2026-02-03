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
import { ActionHistory, ActionEntry } from '@/components/poker/ActionHistory';
import { generateCardsFromHand, CardType } from '@/components/poker/PlayingCard';
import { toast } from '@/hooks/use-toast';
import { 
  POSITIONS, SCENARIOS, STACK_SIZES, 
  Position, Scenario, ActionType, 
  RANKS, getHandData, calculateFeedback 
} from '@/data/gtoRanges';
import { 
  initializeHandState, 
  getVillainPosition, 
  getScenarioDescription,
  HandState,
  Street
} from '@/data/handState';
import { 
  createSession, getCurrentSession, updateCurrentSession, 
  addHandToSession, endCurrentSession, getUserProfile, createUserProfile 
} from '@/data/localStorage';
import {
  generateHandId,
  isHandAlreadyPlayed,
  getPlayedHandData,
  markHandAsPlayed,
  clearPlayedHandsSession,
} from '@/data/playedHandsTracker';
import { cn } from '@/lib/utils';
import { Play, Shuffle, Trophy, Target, Zap, Info, AlertTriangle, RefreshCw } from 'lucide-react';

type GamePhase = 'config' | 'playing' | 'feedback';

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
  const [handState, setHandState] = useState<HandState | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [currentHandId, setCurrentHandId] = useState<string | null>(null);
  const [isHandAlreadyPlayedState, setIsHandAlreadyPlayedState] = useState(false);
  const [previousHandResult, setPreviousHandResult] = useState<{
    action: ActionType;
    feedback: string;
    points: number;
  } | null>(null);
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

  // Get cards string for hand ID
  const getCardsString = (cards: CardType[]): string => {
    return cards.map(c => `${c.rank}${c.suit}`).join('');
  };

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

    // Inicializar estado da mão com o novo sistema
    const newHandState = initializeHandState(scenario, pos, stk, hand, cards);
    
    // Gerar ID da mão
    const handId = generateHandId(scenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;
    
    setHandState({
      ...newHandState,
      heroStack: stk,
    });
    setCurrentHandId(handId);
    setIsHandAlreadyPlayedState(alreadyPlayed);
    setPreviousHandResult(previousResult ? {
      action: previousResult.action,
      feedback: previousResult.feedback,
      points: previousResult.points,
    } : null);
    setSessionScore(0);
    setHandsPlayed(0);
    setPhase('playing');
  }, [scenario, selectedPositions, selectedStacks, randomPosition, randomStack, generateRandomHand]);

  // Handle action
  const handleAction = useCallback((action: ActionType) => {
    if (!handState || !currentHandId) return;

    // Verificar se mão já foi jogada
    if (isHandAlreadyPlayedState) {
      toast({
        title: "Mão já jogada!",
        description: "Esta mão já foi jogada nesta sessão. Você pode revisar, mas não ganhará pontos.",
        variant: "destructive",
      });
    }

    // Extrair nome da mão a partir das cartas
    const heroCards = handState.heroCards;
    const rank1 = heroCards[0]?.rank || '';
    const rank2 = heroCards[1]?.rank || '';
    const isSuited = heroCards[0]?.suit === heroCards[1]?.suit;
    const isPair = rank1 === rank2;
    
    let handName: string;
    if (isPair) {
      handName = `${rank1}${rank2}`;
    } else {
      const idx1 = RANKS.indexOf(rank1 as any);
      const idx2 = RANKS.indexOf(rank2 as any);
      if (idx1 < idx2) {
        handName = `${rank1}${rank2}${isSuited ? 's' : 'o'}`;
      } else {
        handName = `${rank2}${rank1}${isSuited ? 's' : 'o'}`;
      }
    }

    const handData = getHandData(handName, scenario, handState.heroPosition, handState.heroStack, finalTable);
    if (!handData) return;

    const feedback = calculateFeedback(action, handData);

    // Só dar pontos se mão não foi jogada antes
    const pointsToAdd = isHandAlreadyPlayedState ? 0 : feedback.points;

    // Registrar mão como jogada (se ainda não foi)
    if (!isHandAlreadyPlayedState) {
      markHandAsPlayed(currentHandId, action, feedback.points, feedback.type);
      
      addHandToSession({
        hand: handName,
        scenario,
        position: handState.heroPosition,
        stack: handState.heroStack,
        userAction: action,
        correctAction: handData.primaryAction,
        feedback: feedback.type,
        points: feedback.points,
        evLoss: feedback.evLoss,
      });

      setSessionScore(prev => prev + pointsToAdd);
      setHandsPlayed(prev => prev + 1);
    }
    
    setLastFeedback({ userAction: action, handData, feedback });
    setPhase('feedback');
  }, [handState, currentHandId, scenario, finalTable, isHandAlreadyPlayedState]);

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

    const newHandState = initializeHandState(scenario, pos, stk, hand, cards);
    
    // Gerar ID da mão
    const handId = generateHandId(scenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;
    
    setHandState({
      ...newHandState,
      heroStack: stk,
    });
    setCurrentHandId(handId);
    setIsHandAlreadyPlayedState(alreadyPlayed);
    setPreviousHandResult(previousResult ? {
      action: previousResult.action,
      feedback: previousResult.feedback,
      points: previousResult.points,
    } : null);
    setLastFeedback(null);
    setPhase('playing');
  }, [selectedPositions, selectedStacks, randomPosition, randomStack, generateRandomHand, scenario]);

  // End session
  const endSession = useCallback(() => {
    endCurrentSession();
    setPhase('config');
    setHandState(null);
    setLastFeedback(null);
    setCurrentHandId(null);
    setIsHandAlreadyPlayedState(false);
    setPreviousHandResult(null);
  }, []);

  // Clear played hands session
  const handleClearSession = useCallback(() => {
    clearPlayedHandsSession();
    toast({
      title: "Sessão limpa!",
      description: "Todas as mãos podem ser jogadas novamente para ganhar pontos.",
    });
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

            {/* Session reset button */}
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Limpar Sessão
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Permite jogar as mesmas mãos novamente para ganhar pontos
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSession}
                  >
                    🔄 Limpar
                  </Button>
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

        {/* Already played warning */}
        {isHandAlreadyPlayedState && phase === 'playing' && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-amber-400 font-medium">
                Mão já jogada nesta sessão
              </p>
              <p className="text-xs text-amber-400/80">
                Você pode revisar, mas não ganhará pontos.
              </p>
            </div>
          </div>
        )}

        {/* Game info */}
        {handState && (
          <div className="space-y-4">
            {/* Scenario description */}
            <Card className="bg-muted/30 border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {getScenarioDescription(
                      scenario, 
                      handState.heroPosition, 
                      handState.villainPosition,
                      handState.villainAction
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action history for VS scenarios */}
            {scenario !== 'openRaise' && handState.actions.length > 0 && (
              <ActionHistory
                actions={handState.actions}
                street={handState.street}
                heroPosition={handState.heroPosition}
                className="max-w-xs"
              />
            )}

            {/* Hand info compact */}
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Posição</p>
                      <p className="text-lg font-semibold">{handState.heroPosition}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Stack</p>
                      <p className="text-lg font-semibold">{handState.heroStack} BB</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Pot</p>
                      <p className="text-lg font-semibold text-primary">{handState.pot.toFixed(1)} BB</p>
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
              heroPosition={handState.heroPosition}
              heroCards={handState.heroCards}
              pot={handState.pot}
              heroStack={handState.heroStack}
              villainPosition={handState.villainPosition}
              villainAction={handState.villainAction}
              villainStack={handState.villainStack}
              communityCards={handState.communityCards}
              street={handState.street}
              foldedPositions={handState.foldedPositions}
              activeBets={handState.activeBets}
            />

            {/* Action buttons */}
            <ActionButtons
              onAction={handleAction}
              pot={handState.pot}
              stack={handState.heroStack}
              disabled={phase === 'feedback'}
              showRaiseSlider={false}
            />
          </div>
        )}

        {/* Feedback modal */}
        {lastFeedback && lastFeedback.handData && handState && (
          <DecisionFeedback
            open={phase === 'feedback'}
            onClose={() => setPhase('playing')}
            onNextHand={nextHand}
            userAction={lastFeedback.userAction}
            handData={lastFeedback.handData}
            feedback={lastFeedback.feedback}
            sessionScore={sessionScore}
            handsPlayed={handsPlayed}
            scenario={scenario}
            position={handState.heroPosition}
            stack={handState.heroStack}
            finalTable={finalTable}
            alreadyPlayed={isHandAlreadyPlayedState}
            previousResult={previousHandResult ? {
              action: previousHandResult.action,
              feedback: previousHandResult.feedback as any,
              points: previousHandResult.points,
            } : undefined}
          />
        )}
      </div>
    </MainLayout>
  );
}
