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
import { POSITIONS, SCENARIOS, STACK_SIZES, Position, Scenario, ActionType, RANKS, getHandData, calculateFeedback } from '@/data/gtoRanges';
import { initializeHandState, getVillainPosition, getScenarioDescription, HandState, Street } from '@/data/handState';
import { createSession, getCurrentSession, updateCurrentSession, addHandToSession, endCurrentSession, getUserProfile, createUserProfile, addFavoriteHand, isHandFavorited, removeFavoriteHand, getFavoriteHands } from '@/data/localStorage';
import { generateHandId, isHandAlreadyPlayed, getPlayedHandData, markHandAsPlayed, clearPlayedHandsSession } from '@/data/playedHandsTracker';
import { updateUserRanking, updateUserProfile as updateSupabaseProfile } from '@/data/rankingService';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Play, Shuffle, Trophy, Target, Zap, Info, AlertTriangle, RefreshCw, Lock, Heart } from 'lucide-react';

// Locked scenarios (under maintenance)
const LOCKED_SCENARIOS: Scenario[] = ['simulation', 'multiway'];

type GamePhase = 'config' | 'playing' | 'feedback' | 'review';
export default function TrainPage() {
  // Config state
  const [scenario, setScenario] = useState<Scenario>('openRaise');
  const [randomScenario, setRandomScenario] = useState(false);
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
  const [isCurrentHandFavorited, setIsCurrentHandFavorited] = useState(false);
  const [correctHandsCount, setCorrectHandsCount] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

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

  // Auto-remove invalid positions when scenario changes
  const handleScenarioChange = (newScenario: Scenario) => {
    setScenario(newScenario);
    const invalid = getInvalidPositions(newScenario);
    if (invalid.length > 0) {
      setSelectedPositions(prev => {
        const filtered = prev.filter(p => !invalid.includes(p));
        return filtered.length > 0 ? filtered : POSITIONS.filter(p => !invalid.includes(p)).slice(0, 1);
      });
    }
  };

  // Start game
  const startGame = useCallback(() => {
    // Filter out locked scenarios for random selection
    const availableScenarios: Scenario[] = ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'];
    const selectedScenario = randomScenario ? availableScenarios[Math.floor(Math.random() * availableScenarios.length)] : scenario;
    const scenarioInvalid = getInvalidPositions(selectedScenario);
    const validPositions = POSITIONS.filter(p => !scenarioInvalid.includes(p));
    const validSelected = selectedPositions.filter(p => !scenarioInvalid.includes(p));
    const pos = randomPosition ? validPositions[Math.floor(Math.random() * validPositions.length)] : (validSelected.length > 0 ? validSelected[Math.floor(Math.random() * validSelected.length)] : validPositions[0]);
    const stk = randomStack ? STACK_SIZES[Math.floor(Math.random() * STACK_SIZES.length)] : selectedStacks[Math.floor(Math.random() * selectedStacks.length)];
    const hand = generateRandomHand();
    const cards = generateCardsFromHand(hand);
    createSession({
      scenario: selectedScenario,
      position: randomPosition ? 'random' : pos,
      stack: randomStack ? 'random' : stk
    });

    // Inicializar estado da mão com o novo sistema
    const newHandState = initializeHandState(selectedScenario, pos, stk, hand, cards);

    // Gerar ID da mão
    const handId = generateHandId(selectedScenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;
    
    // Atualizar o cenário exibido (para cenário aleatório)
    if (randomScenario) {
      setScenario(selectedScenario);
    }
    
    setHandState({
      ...newHandState,
      heroStack: stk
    });
    setCurrentHandId(handId);
    setIsHandAlreadyPlayedState(alreadyPlayed);
    setPreviousHandResult(previousResult ? {
      action: previousResult.action,
      feedback: previousResult.feedback,
      points: previousResult.points
    } : null);
    setIsCurrentHandFavorited(isHandFavorited(hand, selectedScenario, pos, stk));
    setSessionScore(0);
    setHandsPlayed(0);
    setPhase('playing');
  }, [scenario, selectedPositions, selectedStacks, randomPosition, randomStack, randomScenario, generateRandomHand]);

  // Handle action
  const handleAction = useCallback((action: ActionType) => {
    if (!handState || !currentHandId) return;

    // Verificar se mão já foi jogada
    if (isHandAlreadyPlayedState) {
      toast({
        title: "Mão já jogada!",
        description: "Esta mão já foi jogada nesta sessão. Você pode revisar, mas não ganhará pontos.",
        variant: "destructive"
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
    const isCorrect = feedback.type === 'best' || feedback.type === 'correct';

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
        evLoss: feedback.evLoss
      });
      setSessionScore(prev => prev + pointsToAdd);
      setHandsPlayed(prev => prev + 1);
      if (isCorrect) {
        setCorrectHandsCount(prev => prev + 1);
      }

      // Update ranking in Supabase
      if (user && pointsToAdd > 0) {
        updateUserRanking({
          userId: user.id,
          xpEarned: pointsToAdd,
          handsPlayed: 1,
          correctHands: isCorrect ? 1 : 0,
        });
        updateSupabaseProfile(user.id, pointsToAdd, 1);
      }
    }
    setLastFeedback({
      userAction: action,
      handData,
      feedback
    });
    setPhase('feedback');
  }, [handState, currentHandId, scenario, finalTable, isHandAlreadyPlayedState]);

  // Next hand
  const nextHand = useCallback(() => {
    // Filter out locked scenarios for random selection
    const availableScenarios: Scenario[] = ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'];
    const selectedScenario = randomScenario ? availableScenarios[Math.floor(Math.random() * availableScenarios.length)] : scenario;
    
    const scenarioInvalid = getInvalidPositions(selectedScenario);
    const validPositions = POSITIONS.filter(p => !scenarioInvalid.includes(p));
    const validSelected = selectedPositions.filter(p => !scenarioInvalid.includes(p));
    const pos = randomPosition ? validPositions[Math.floor(Math.random() * validPositions.length)] : (validSelected.length > 0 ? validSelected[Math.floor(Math.random() * validSelected.length)] : validPositions[0]);
    const stk = randomStack ? STACK_SIZES[Math.floor(Math.random() * STACK_SIZES.length)] : selectedStacks[Math.floor(Math.random() * selectedStacks.length)];
    const hand = generateRandomHand();
    const cards = generateCardsFromHand(hand);
    const newHandState = initializeHandState(selectedScenario, pos, stk, hand, cards);

    // Gerar ID da mão
    const handId = generateHandId(selectedScenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;
    
    // Atualizar o cenário exibido (para cenário aleatório)
    if (randomScenario) {
      setScenario(selectedScenario);
    }
    
    setHandState({
      ...newHandState,
      heroStack: stk
    });
    setCurrentHandId(handId);
    setIsHandAlreadyPlayedState(alreadyPlayed);
    setPreviousHandResult(previousResult ? {
      action: previousResult.action,
      feedback: previousResult.feedback,
      points: previousResult.points
    } : null);
    setIsCurrentHandFavorited(isHandFavorited(hand, selectedScenario, pos, stk));
    setLastFeedback(null);
    setPhase('playing');
  }, [selectedPositions, selectedStacks, randomPosition, randomStack, randomScenario, scenario, generateRandomHand]);

  // Toggle favorite hand
  const toggleFavoriteHand = useCallback(() => {
    if (!handState) return;
    
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
    
    if (isCurrentHandFavorited) {
      // Find and remove
      const favorites = getFavoriteHands();
      const fav = favorites.find(f => 
        f.hand === handName && 
        f.scenario === scenario && 
        f.position === handState.heroPosition && 
        f.stack === handState.heroStack
      );
      if (fav) {
        removeFavoriteHand(fav.id);
        setIsCurrentHandFavorited(false);
        toast({
          title: 'Removido dos favoritos',
          description: `${handName} foi removido.`,
        });
      }
    } else {
      // Get correct action
      const handData = getHandData(handName, scenario, handState.heroPosition, handState.heroStack, finalTable);
      addFavoriteHand({
        hand: handName,
        scenario,
        position: handState.heroPosition,
        stack: handState.heroStack,
        finalTable,
        correctAction: handData?.primaryAction || 'fold',
      });
      setIsCurrentHandFavorited(true);
      toast({
        title: 'Adicionado aos favoritos!',
        description: `${handName} em ${handState.heroPosition} foi salvo.`,
      });
    }
  }, [handState, scenario, finalTable, isCurrentHandFavorited]);

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
      description: "Todas as mãos podem ser jogadas novamente para ganhar pontos."
    });
  }, []);

  // Get invalid positions for current scenario
  const getInvalidPositions = (sc: Scenario): Position[] => {
    switch (sc) {
      case 'openRaise':
        return ['BB']; // BB is last to act preflop — if it folds to BB, he wins automatically
      case 'vsOpenRaise':
      case 'vsOpenShove':
        return ['UTG']; // No one acts before UTG
      case 'vs3bet':
        return ['BB']; // No one acts after BB
      default:
        return [];
    }
  };

  const invalidPositions = getInvalidPositions(scenario);

  // Toggle position selection
  const togglePosition = (pos: Position) => {
    if (invalidPositions.includes(pos)) return;
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
    return <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
             <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Treino Rápido
            </h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Configure seu treino e pratique decisões GTO
            </p>
          </div>

          <div className="space-y-6">
            {/* Scenario selection */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-heading-xs">Cenário</h2>
                  <div className="flex items-center gap-2">
                    <Switch id="random-scenario" checked={randomScenario} onCheckedChange={setRandomScenario} />
                    <Label htmlFor="random-scenario" className="text-sm flex items-center gap-1">
                      <Shuffle className="h-4 w-4" />
                      Aleatório
                    </Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SCENARIOS.map(s => {
                    const isLocked = LOCKED_SCENARIOS.includes(s.id);
                    return (
                      <Button 
                        key={s.id} 
                        variant={scenario === s.id && !randomScenario && !isLocked ? 'default' : 'outline'} 
                        onClick={() => !isLocked && handleScenarioChange(s.id)} 
                        disabled={randomScenario || isLocked} 
                        className={cn(
                          'h-auto py-3 flex flex-col items-center gap-1 relative',
                          scenario === s.id && !randomScenario && !isLocked && 'bg-primary text-primary-foreground',
                          isLocked && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {isLocked && (
                          <Lock className="absolute top-2 right-2 h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="font-medium">{s.label}</span>
                        {isLocked && (
                          <span className="text-[10px] text-muted-foreground">Em manutenção</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Position selection */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-heading-xs">Posição</h2>
                  <div className="flex items-center gap-2">
                    <Switch id="random-pos" checked={randomPosition} onCheckedChange={setRandomPosition} />
                    <Label htmlFor="random-pos" className="text-sm flex items-center gap-1">
                      <Shuffle className="h-4 w-4" />
                      Aleatório
                    </Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                {POSITIONS.map(pos => {
                    const isInvalid = invalidPositions.includes(pos);
                    return (
                      <Button key={pos} variant={selectedPositions.includes(pos) && !randomPosition && !isInvalid ? 'default' : 'outline'} size="sm" onClick={() => togglePosition(pos)} disabled={randomPosition || isInvalid} className={cn('min-w-[3.5rem]', selectedPositions.includes(pos) && !randomPosition && !isInvalid && 'bg-primary text-primary-foreground', isInvalid && 'opacity-40 cursor-not-allowed')}>
                        {pos}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Stack selection */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-heading-xs">Stack (BB)</h2>
                  <div className="flex items-center gap-2">
                    <Switch id="random-stack" checked={randomStack} onCheckedChange={setRandomStack} />
                    <Label htmlFor="random-stack" className="text-sm flex items-center gap-1">
                      <Shuffle className="h-4 w-4" />
                      Aleatório
                    </Label>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STACK_SIZES.map(stk => <Button key={stk} variant={selectedStacks.includes(stk) && !randomStack ? 'default' : 'outline'} size="sm" onClick={() => toggleStack(stk)} disabled={randomStack} className={cn('min-w-[3rem]', selectedStacks.includes(stk) && !randomStack && 'bg-primary text-primary-foreground')}>
                      {stk}
                    </Button>)}
                </div>
              </CardContent>
            </Card>

            {/* Final table toggle */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-heading-xs">Modo Mesa Final</h2>
                    <p className="text-sm text-muted-foreground">
                      Ativa ajustes ICM para final tables
                    </p>
                  </div>
                  <Switch checked={finalTable} onCheckedChange={setFinalTable} />
                </div>
              </CardContent>
            </Card>

            {/* Session reset button */}
            <Card className="border-dashed border-muted-foreground/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-heading-xs flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Limpar Sessão
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Permite jogar as mesmas mãos novamente para ganhar pontos
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearSession}>
                    🔄 Limpar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Config summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 sm:p-6">
                <h2 className="text-heading-xs mb-3">Resumo</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cenário</p>
                    <p className="font-medium">
                      {randomScenario ? 'Aleatório' : SCENARIOS.find(s => s.id === scenario)?.label}
                    </p>
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
            <Button onClick={startGame} size="lg" className="w-full h-16 text-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-gold">
              <Play className="h-6 w-6 mr-2" />
              JOGAR
            </Button>
          </div>
        </div>
      </MainLayout>;
  }

  // Playing/feedback phase
  return <MainLayout>
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavoriteHand}
              className={cn(
                'h-9 w-9',
                isCurrentHandFavorited && 'text-destructive'
              )}
              title={isCurrentHandFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Heart className={cn('h-5 w-5', isCurrentHandFavorited && 'fill-current')} />
            </Button>
            <Button variant="outline" size="sm" onClick={endSession}>
              Encerrar
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={Math.max(0, Math.min(100, sessionScore / 10))} className="h-2" />
        </div>

        {/* Already played warning */}
        {isHandAlreadyPlayedState && phase === 'playing' && <div className="mb-4 p-3 rounded-lg bg-primary/20 border border-primary/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-primary font-medium">
                Mão já jogada nesta sessão
              </p>
              <p className="text-xs text-primary/80">
                Você pode revisar, mas não ganhará pontos.
              </p>
            </div>
          </div>}

        {/* Review mode indicator */}
        {phase === 'review' && <div className="mb-4 p-3 rounded-lg bg-secondary/20 border border-secondary/30 flex items-center gap-3">
            <Info className="h-5 w-5 text-secondary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-secondary font-medium">
                Modo Revisão
              </p>
              <p className="text-xs text-muted-foreground">
                Você está revisando a mão. Clique em "Próxima Mão" para continuar.
              </p>
            </div>
          </div>}

        {/* Game info */}
        {handState && <div className="space-y-4">
            {/* Scenario description */}
            <Card className="bg-muted/30 border-primary/20">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    {getScenarioDescription(scenario, handState.heroPosition, handState.villainPosition, handState.villainAction)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Action history for VS scenarios */}
            {scenario !== 'openRaise' && handState.actions.length > 0 && <ActionHistory actions={handState.actions} street={handState.street} heroPosition={handState.heroPosition} className="max-w-xs" />}

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
            <PokerTable heroPosition={handState.heroPosition} heroCards={handState.heroCards} pot={handState.pot} heroStack={handState.heroStack} villainPosition={handState.villainPosition} villainAction={handState.villainAction} villainStack={handState.villainStack} communityCards={handState.communityCards} street={handState.street} foldedPositions={handState.foldedPositions} activeBets={handState.activeBets} />

            {/* Action buttons - hidden in review mode */}
            {phase !== 'review' && (
              <ActionButtons onAction={handleAction} pot={handState.pot} stack={handState.heroStack} disabled={phase === 'feedback'} showRaiseSlider={false} />
            )}
            
            {/* Review mode - only show next hand button */}
            {phase === 'review' && (
              <div className="flex justify-center gap-4 mt-4">
                <Button
                  onClick={nextHand}
                  size="lg"
                  className="px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Próxima Mão
                </Button>
              </div>
            )}
          </div>}

        {/* Feedback modal */}
        {lastFeedback && lastFeedback.handData && handState && <DecisionFeedback open={phase === 'feedback'} onClose={() => setPhase('review')} onNextHand={nextHand} userAction={lastFeedback.userAction} handData={lastFeedback.handData} feedback={lastFeedback.feedback} sessionScore={sessionScore} handsPlayed={handsPlayed} scenario={scenario} position={handState.heroPosition} stack={handState.heroStack} finalTable={finalTable} alreadyPlayed={isHandAlreadyPlayedState} previousResult={previousHandResult ? {
        action: previousHandResult.action,
        feedback: previousHandResult.feedback as any,
        points: previousHandResult.points
      } : undefined} />}
      </div>
    </MainLayout>;
}