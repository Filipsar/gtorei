import { useState, useCallback, useEffect, useRef } from 'react';
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
import { TrainingModeSelector, TrainingMode } from '@/components/poker/TrainingModeSelector';
import { BountyConfig, BountyTier, BOUNTY_TIERS, generateOpponentBounty } from '@/components/poker/BountyConfig';
import { calculateBountyMultiplier } from '@/data/gtoRanges';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { POSITIONS, SCENARIOS, STACK_SIZES, Position, Scenario, ActionType, RANKS, getHandData, calculateFeedback, GameMode } from '@/data/gtoRanges';
import { initializeHandState, getVillainPosition, getScenarioDescription, HandState, Street } from '@/data/handState';
import { createSession, getCurrentSession, updateCurrentSession, addHandToSession, endCurrentSession, getUserProfile, createUserProfile, addFavoriteHand, isHandFavorited, removeFavoriteHand, getFavoriteHands, calculateLevel } from '@/data/localStorage';
import { generateHandId, isHandAlreadyPlayed, getPlayedHandData, markHandAsPlayed, clearPlayedHandsSession } from '@/data/playedHandsTracker';
import { updateUserRanking, updateUserProfile as updateSupabaseProfile } from '@/data/rankingService';
import { useAchievements } from '@/hooks/useAchievements';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Play, Shuffle, Trophy, Target, Zap, Info, AlertTriangle, RefreshCw, Lock, Heart, ArrowLeft } from 'lucide-react';

// Locked scenarios (under maintenance)
const LOCKED_SCENARIOS: Scenario[] = ['simulation', 'multiway'];

// Scenarios available per mode
const MODE_SCENARIOS: Record<TrainingMode, Scenario[]> = {
  rangeTraining: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'],
  hu: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'],
  threeHand: ['openRaise', 'vsOpenRaise', 'vs3bet'],
  bounty: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'],
};

// Positions available per mode
const MODE_POSITIONS: Record<TrainingMode, Position[]> = {
  rangeTraining: POSITIONS, // Full 8-max
  hu: ['SB', 'BB'],
  threeHand: ['BTN', 'SB', 'BB'],
  bounty: POSITIONS,
};

type GamePhase = 'modeSelect' | 'config' | 'playing' | 'feedback' | 'review';

export default function TrainPage() {
  // Mode state
  const [trainingMode, setTrainingMode] = useState<TrainingMode | null>(null);
  const [heroBounty, setHeroBounty] = useState<BountyTier>(5);
  const [currentBounties, setCurrentBounties] = useState<Record<string, number>>({});

  // Config state
  const [scenario, setScenario] = useState<Scenario>('openRaise');
  const [randomScenario, setRandomScenario] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<Position[]>(['UTG']);
  const [selectedStacks, setSelectedStacks] = useState<number[]>([30]);
  const [randomPosition, setRandomPosition] = useState(false);
  const [randomStack, setRandomStack] = useState(false);
  const [finalTable, setFinalTable] = useState(false);

  // Game state
  const [phase, setPhase] = useState<GamePhase>('modeSelect');
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
  const [currentStreak, setCurrentStreak] = useState(0);
  const [sessionBestCount, setSessionBestCount] = useState(0);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const supabaseSessionId = useRef<string | null>(null);
  const { checkAchievements } = useAchievements();

  // Ensure user profile exists
  useEffect(() => {
    if (!getUserProfile()) {
      createUserProfile('Jogador');
    }
  }, []);

  // When mode changes, reset positions to valid ones
  const handleModeSelect = (mode: TrainingMode) => {
    setTrainingMode(mode);
    const validPositions = MODE_POSITIONS[mode];
    setSelectedPositions([validPositions[0]]);
    // Bounty mode always has ICM
    if (mode === 'bounty') {
      setFinalTable(true);
    } else {
      setFinalTable(false);
    }
    setPhase('config');
  };

  // Get available positions for current mode
  const getAvailablePositions = (): Position[] => {
    return trainingMode ? MODE_POSITIONS[trainingMode] : POSITIONS;
  };

  // Get available scenarios for current mode
  const getAvailableScenarios = (): Scenario[] => {
    return trainingMode ? MODE_SCENARIOS[trainingMode] : ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'];
  };

  // Get current game mode
  const getGameMode = (): GameMode => {
    const map: Record<TrainingMode, GameMode> = {
      rangeTraining: '8max', hu: 'hu', threeHand: 'threehand', bounty: 'bounty',
    };
    return trainingMode ? map[trainingMode] : '8max';
  };

  // Get current bounty multiplier
  const getBountyMultiplier = (): number => {
    if (trainingMode !== 'bounty' || !handState) return 0;
    const villainBounty = handState.villainPosition ? (currentBounties[handState.villainPosition] || heroBounty) : heroBounty;
    return calculateBountyMultiplier(heroBounty, villainBounty);
  };

  // Backward compat helper for info display
  const getBountyAdjustment = (): number => {
    if (trainingMode !== 'bounty' || !handState) return 0;
    const mult = getBountyMultiplier();
    return Math.round((mult - 1) * 15);
  };

  // Generate bounties for all positions
  const generateBounties = (): Record<string, number> => {
    const bounties: Record<string, number> = {};
    const positions = getAvailablePositions();
    for (const pos of positions) {
      bounties[pos] = generateOpponentBounty(heroBounty);
    }
    // Hero always has the selected bounty
    return bounties;
  };

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
        const available = getAvailablePositions().filter(p => !invalid.includes(p));
        return filtered.length > 0 ? filtered : available.slice(0, 1);
      });
    }
  };

  // Start game
  const startGame = useCallback(() => {
    const availableScenarios = getAvailableScenarios().filter(s => !LOCKED_SCENARIOS.includes(s));
    const selectedScenario = randomScenario ? availableScenarios[Math.floor(Math.random() * availableScenarios.length)] : scenario;
    const scenarioInvalid = getInvalidPositions(selectedScenario);
    const validPositions = getAvailablePositions().filter(p => !scenarioInvalid.includes(p));
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

    // Persist session to Supabase
    if (user) {
      supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          scenario: selectedScenario,
          position: pos,
          stack: stk,
        })
        .select('id')
        .single()
        .then(({ data }) => {
          if (data) supabaseSessionId.current = data.id;
        });
    }

    const newHandState = initializeHandState(selectedScenario, pos, stk, hand, cards, MODE_POSITIONS[trainingMode]);

    const handId = generateHandId(selectedScenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;
    
    if (randomScenario) {
      setScenario(selectedScenario);
    }

    // Generate bounties for bounty mode
    let bounties: Record<string, number> = {};
    if (trainingMode === 'bounty') {
      bounties = generateBounties();
      // Hero bounty is always the selected one
      bounties[pos] = heroBounty;
      setCurrentBounties(bounties);
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
  }, [scenario, selectedPositions, selectedStacks, randomPosition, randomStack, randomScenario, generateRandomHand, trainingMode, heroBounty]);

  // Handle action
  const handleAction = useCallback((action: ActionType) => {
    if (!handState || !currentHandId) return;

    if (isHandAlreadyPlayedState) {
      toast({
        title: "Mão já jogada!",
        description: "Esta mão já foi jogada nesta sessão. Você pode revisar, mas não ganhará pontos.",
        variant: "destructive"
      });
    }

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

    const gm = getGameMode();
    const bm = getBountyMultiplier();
    const handData = getHandData(handName, scenario, handState.heroPosition, handState.heroStack, finalTable, gm, bm);
    if (!handData) return;
    const userLevel = profile?.level || 1;
    const feedback = calculateFeedback(action, handData, userLevel);

    const pointsToAdd = isHandAlreadyPlayedState ? 0 : feedback.points;
    const isCorrect = feedback.type === 'best' || feedback.type === 'correct';

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

      // Persist hand to Supabase
      if (user && supabaseSessionId.current) {
        supabase
          .from('played_hands')
          .insert({
            user_id: user.id,
            session_id: supabaseSessionId.current,
            hand: handName,
            scenario,
            position: handState.heroPosition,
            stack: handState.heroStack,
            user_action: action,
            correct_action: handData.primaryAction,
            feedback: feedback.type,
            points: feedback.points,
            ev_loss: feedback.evLoss,
          })
          .then(({ error }) => {
            if (error) console.error('Error saving hand:', error);
          });
      }
      setSessionScore(prev => prev + pointsToAdd);
      setHandsPlayed(prev => prev + 1);
      if (isCorrect) {
        setCorrectHandsCount(prev => prev + 1);
        setCurrentStreak(prev => {
          const newStreak = prev + 1;
          // Check streak achievements
          checkAchievements({ streak: newStreak });
          return newStreak;
        });
      } else {
        setCurrentStreak(0);
      }

      if (feedback.type === 'best') {
        setSessionBestCount(prev => prev + 1);
      }

      if (user && pointsToAdd !== 0) {
        updateUserRanking({
          userId: user.id,
          xpEarned: pointsToAdd,
          handsPlayed: 1,
          correctHands: isCorrect ? 1 : 0,
        });
        updateSupabaseProfile(user.id, pointsToAdd, 1);

        // Check volume and level achievements
        const totalXp = (profile?.total_xp || 0) + pointsToAdd;
        const newLevel = calculateLevel(totalXp);
        checkAchievements({
          totalHands: handsPlayed + 1,
          level: newLevel,
        });
      }
    }
    setLastFeedback({
      userAction: action,
      handData,
      feedback
    });
    setPhase('feedback');
  }, [handState, currentHandId, scenario, finalTable, isHandAlreadyPlayedState, trainingMode, heroBounty, currentBounties, user]);

  // Next hand
  const nextHand = useCallback(() => {
    const availableScenarios = getAvailableScenarios().filter(s => !LOCKED_SCENARIOS.includes(s));
    const selectedScenario = randomScenario ? availableScenarios[Math.floor(Math.random() * availableScenarios.length)] : scenario;
    
    const scenarioInvalid = getInvalidPositions(selectedScenario);
    const validPositions = getAvailablePositions().filter(p => !scenarioInvalid.includes(p));
    const validSelected = selectedPositions.filter(p => !scenarioInvalid.includes(p));
    const pos = randomPosition ? validPositions[Math.floor(Math.random() * validPositions.length)] : (validSelected.length > 0 ? validSelected[Math.floor(Math.random() * validSelected.length)] : validPositions[0]);
    const stk = randomStack ? STACK_SIZES[Math.floor(Math.random() * STACK_SIZES.length)] : selectedStacks[Math.floor(Math.random() * selectedStacks.length)];
    const hand = generateRandomHand();
    const cards = generateCardsFromHand(hand);
    const newHandState = initializeHandState(selectedScenario, pos, stk, hand, cards, MODE_POSITIONS[trainingMode]);

    const handId = generateHandId(selectedScenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;
    
    if (randomScenario) {
      setScenario(selectedScenario);
    }

    // Regenerate bounties
    if (trainingMode === 'bounty') {
      const bounties = generateBounties();
      bounties[pos] = heroBounty;
      setCurrentBounties(bounties);
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
  }, [selectedPositions, selectedStacks, randomPosition, randomStack, randomScenario, scenario, generateRandomHand, trainingMode, heroBounty]);

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
      const handData = getHandData(handName, scenario, handState.heroPosition, handState.heroStack, finalTable, getGameMode());
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

    // Check accuracy achievements before resetting
    if (handsPlayed > 0) {
      const accuracy = Math.round((correctHandsCount / handsPlayed) * 100);
      checkAchievements({
        sessionAccuracy: accuracy,
        sessionHands: handsPlayed,
        sessionBestCount,
      });
    }

    // Update Supabase session with final stats
    if (user && supabaseSessionId.current) {
      const accuracy = handsPlayed > 0 ? Math.round((correctHandsCount / handsPlayed) * 100) : 0;
      supabase
        .from('training_sessions')
        .update({
          ended_at: new Date().toISOString(),
          hands_played: handsPlayed,
          score: sessionScore,
          accuracy,
        })
        .eq('id', supabaseSessionId.current)
        .then(({ error }) => {
          if (error) console.error('Error ending session:', error);
        });
      supabaseSessionId.current = null;
    }

    setPhase('config');
    setHandState(null);
    setLastFeedback(null);
    setCurrentHandId(null);
    setIsHandAlreadyPlayedState(false);
    setPreviousHandResult(null);
    setCurrentStreak(0);
    setSessionBestCount(0);
  }, [user, handsPlayed, correctHandsCount, sessionScore, sessionBestCount, checkAchievements]);

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
    const available = getAvailablePositions();
    const invalid: Position[] = [];
    
    for (const pos of available) {
      const posIndex = available.indexOf(pos);
      const hasEarlier = posIndex > 0; // someone acts before this position
      const hasLater = posIndex < available.length - 1; // someone acts after
      const isFirst = posIndex === 0;
      
      switch (sc) {
        case 'openRaise':
          // Last position (BB) can't open raise
          if (!hasLater) invalid.push(pos);
          break;
        case 'vsOpenRaise':
        case 'vsOpenShove':
          // First position has no one before to open/shove
          if (!hasEarlier) invalid.push(pos);
          break;
        case 'vs3bet':
          // First position can't face 3-bet (they open, but in shorthanded they're the opener not the 3-bet facer)
          // Also need at least someone before AND after: hero must NOT be first, and must have opened then been 3-bet
          // In shorthanded (HU/Three Hand): only non-first, non-last positions or BB can face 3-bet
          if (isFirst) {
            invalid.push(pos);
          } else if (!hasLater && available.length <= 3) {
            // In shorthanded, last position (BB) CAN face 3-bet (BTN opens, SB 3-bets, BB faces it)
            // So BB is valid — don't block
          } else if (!hasLater && available.length > 3) {
            // In full ring, last position can't be 3-bet
            invalid.push(pos);
          }
          break;
      }
    }
    
    // Also mark positions not available in current mode as invalid
    return [...invalid, ...POSITIONS.filter(p => !available.includes(p))];
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

  // Mode label helper
  const getModeLabel = (): string => {
    switch (trainingMode) {
      case 'rangeTraining': return 'Treino de Range';
      case 'hu': return 'HU (1x1)';
      case 'threeHand': return 'Three Hand (1x1x1)';
      case 'bounty': return 'Modo Bounty';
      default: return '';
    }
  };

  // Mode selection phase
  if (phase === 'modeSelect') {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Treino Rápido
            </h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Configure seu treino e pratique decisões GTO
            </p>
          </div>
          <TrainingModeSelector onSelect={handleModeSelect} />
        </div>
      </MainLayout>
    );
  }

  // Config phase
  if (phase === 'config') {
    const availableScenarios = getAvailableScenarios();
    const availablePositions = getAvailablePositions();

    return <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" onClick={() => setPhase('modeSelect')} className="gap-1 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <span className="text-body-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">{getModeLabel()}</span>
            </div>
             <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Treino Rápido
            </h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Configure seu treino e pratique decisões GTO
            </p>
          </div>

          <div className="space-y-6">
            {/* Bounty config (only in bounty mode) */}
            {trainingMode === 'bounty' && (
              <BountyConfig selectedBounty={heroBounty} onBountyChange={setHeroBounty} />
            )}

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
                    const isAvailable = availableScenarios.includes(s.id);
                    const isDisabled = isLocked || !isAvailable;
                    return (
                      <Button 
                        key={s.id} 
                        variant={scenario === s.id && !randomScenario && !isDisabled ? 'default' : 'outline'} 
                        onClick={() => !isDisabled && handleScenarioChange(s.id)} 
                        disabled={randomScenario || isDisabled} 
                        className={cn(
                          'h-auto py-3 flex flex-col items-center gap-1 relative',
                          scenario === s.id && !randomScenario && !isDisabled && 'bg-primary text-primary-foreground',
                          isDisabled && 'opacity-50 cursor-not-allowed'
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
                {availablePositions.map(pos => {
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

            {/* Final table toggle (hidden in bounty mode - always on) */}
            {trainingMode !== 'bounty' && (
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
            )}

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
                    <p className="text-muted-foreground">Modo</p>
                    <p className="font-medium">{getModeLabel()}</p>
                  </div>
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
                  {trainingMode === 'bounty' && (
                    <div>
                      <p className="text-muted-foreground">Bounty</p>
                      <p className="font-medium">${heroBounty}</p>
                    </div>
                  )}
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
            {trainingMode && (
              <span className="text-body-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">{getModeLabel()}</span>
            )}
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

        {/* Bounty info banner */}
        {/* Hand info compact with info popover */}
        {handState && (
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
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Cenário</p>
                    <p className="text-sm font-medium">
                      {SCENARIOS.find(s => s.id === scenario)?.label}
                    </p>
                  </div>
                </div>

                {/* Info icon with popover */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1.5 rounded-full hover:bg-muted transition-colors" aria-label="Informações da mão">
                      <Info className="h-5 w-5 text-primary" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 space-y-3" side="bottom" align="end">
                    {/* Street */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">Street</span>
                      <span className="text-sm font-medium capitalize">{handState.street}</span>
                    </div>

                    {/* Scenario description */}
                    <div className="text-sm text-muted-foreground">
                      {getScenarioDescription(scenario, handState.heroPosition, handState.villainPosition, handState.villainAction)}
                    </div>

                    {/* Bounty info */}
                    {trainingMode === 'bounty' && (
                      <div className="p-2 rounded bg-rank-first/10 border border-rank-first/30 space-y-1">
                        <p className="text-sm font-medium">
                          💰 Seu bounty: <span className="text-rank-first">${heroBounty}</span>
                          {handState.villainPosition && currentBounties[handState.villainPosition] && (
                            <> · Vilão: <span className="text-rank-first">${currentBounties[handState.villainPosition]}</span></>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getBountyAdjustment() > 0 ? 'Ranges mais amplos (bounty do oponente vale a pena)' : getBountyAdjustment() < 0 ? 'Ranges mais conservadores' : 'Ajuste neutro'}
                        </p>
                      </div>
                    )}

                    {/* Action history */}
                    {scenario !== 'openRaise' && handState.actions.length > 0 && (
                      <ActionHistory actions={handState.actions} street={handState.street} heroPosition={handState.heroPosition} />
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game content */}
        {handState && <div className="space-y-4">
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
              bounties={trainingMode === 'bounty' ? currentBounties : undefined}
              visiblePositions={(() => {
                const modePositions = MODE_POSITIONS[trainingMode];
                if (!modePositions) return undefined;
                const positions = [...modePositions];
                if (handState.villainPosition && !positions.includes(handState.villainPosition)) {
                  positions.push(handState.villainPosition);
                }
                return positions;
              })()}
            />

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
        {lastFeedback && lastFeedback.handData && handState && <DecisionFeedback open={phase === 'feedback'} onClose={() => setPhase('review')} onNextHand={nextHand} userAction={lastFeedback.userAction} handData={lastFeedback.handData} feedback={lastFeedback.feedback} sessionScore={sessionScore} handsPlayed={handsPlayed} scenario={scenario} position={handState.heroPosition} stack={handState.heroStack} finalTable={finalTable} gameMode={getGameMode()} bountyMultiplier={getBountyMultiplier()} alreadyPlayed={isHandAlreadyPlayedState} previousResult={previousHandResult ? {
        action: previousHandResult.action,
        feedback: previousHandResult.feedback as any,
        points: previousHandResult.points
      } : undefined} />}
      </div>
    </MainLayout>;
}
