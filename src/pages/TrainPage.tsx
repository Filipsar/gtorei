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
import { generateCardsFromHand, CardType, HandDisplay } from '@/components/poker/PlayingCard';
import { TrainingModeSelector, TrainingMode } from '@/components/poker/TrainingModeSelector';
import { BountyConfig, BountyTier, BOUNTY_TIERS, generateOpponentBounty } from '@/components/poker/BountyConfig';
import { calculateBountyMultiplier } from '@/data/gtoRanges';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { POSITIONS, SCENARIOS, STACK_SIZES, Position, Scenario, ActionType, RANKS, getHandData, calculateFeedback, GameMode } from '@/data/gtoRanges';
import { getStackDistribution, StackDistribution } from '@/data/stackDistribution';
import { initializeHandState, getVillainPosition, getScenarioDescription, processHeroAction, processPostflopAction, HandState, Street } from '@/data/handState';
import { HAND_RANK_NAMES, HandEvaluation } from '@/data/handEvaluator';
import { createSession, getCurrentSession, updateCurrentSession, addHandToSession, endCurrentSession, getUserProfile, createUserProfile, addFavoriteHand, isHandFavorited, removeFavoriteHand, getFavoriteHands, calculateLevel } from '@/data/localStorage';
import { generateHandId, isHandAlreadyPlayed, getPlayedHandData, markHandAsPlayed, clearPlayedHandsSession } from '@/data/playedHandsTracker';
import { generateUniqueHandId } from '@/data/handIdGenerator';
import { updateUserRanking, updateUserProfile as updateSupabaseProfile } from '@/data/rankingService';
import { useAchievements } from '@/hooks/useAchievements';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Play, Shuffle, Trophy, Target, Zap, Info, AlertTriangle, RefreshCw, Lock, Heart, ArrowLeft, BarChart3 } from 'lucide-react';
import { RangeViewerModal } from '@/components/poker/RangeViewerModal';
import { OnboardingTutorial, useOnboardingStatus } from '@/components/onboarding/OnboardingTutorial';
import { useIsMobile } from '@/hooks/use-mobile';
import { analyzeStreetAction, getVerdictColor, getVerdictBgColor, StreetAnalysis, StreetActionData } from '@/data/postflopAnalysis';

// Locked scenarios (under maintenance)
const LOCKED_SCENARIOS: Scenario[] = ['multiway'];

// Scenarios available per mode
const MODE_SCENARIOS: Record<TrainingMode, Scenario[]> = {
  rangeTraining: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'simulation'],
  hu: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'simulation'],
  threeHand: ['openRaise', 'vsOpenRaise', 'vs3bet', 'simulation'],
  bounty: ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'simulation'],
};

// Positions available per mode
const MODE_POSITIONS: Record<TrainingMode, Position[]> = {
  rangeTraining: POSITIONS, // Full 8-max
  hu: ['SB', 'BB'],
  threeHand: ['BTN', 'SB', 'BB'],
  bounty: POSITIONS,
};

type GamePhase = 'modeSelect' | 'config' | 'playing' | 'feedback' | 'review' | 'postflop' | 'transitioning';

export default function TrainPage() {
  // Onboarding
  const { needsOnboarding, completeOnboarding } = useOnboardingStatus();

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
  const [currentUniqueHandId, setCurrentUniqueHandId] = useState<string | null>(null);
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
  const [pendingSimulationScore, setPendingSimulationScore] = useState<{
    points: number;
    isCorrect: boolean;
    action: ActionType;
    handName: string;
    handData: ReturnType<typeof getHandData>;
    feedback: ReturnType<typeof calculateFeedback>;
  } | null>(null);
  const [selectedBetSize, setSelectedBetSize] = useState(0.5);
  const [simulationStreetActions, setSimulationStreetActions] = useState<Array<StreetActionData>>([]);
  const [summaryRangeViewer, setSummaryRangeViewer] = useState<{ open: boolean; stack: number } | null>(null);
  const [currentStackDistribution, setCurrentStackDistribution] = useState<StackDistribution | null>(null);
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

  // Generate random hand with difficulty scaling based on player level
  // Higher ranks get more marginal/borderline hands (harder decisions)
  const generateRandomHand = useCallback((): string => {
    const playerLevel = profile?.level || getUserProfile()?.level || 1;
    
    // Difficulty: chance of generating a "marginal" hand (medium strength)
    // Level 1-2: 0% bias (pure random)
    // Level 3 (Intermediário): 25% chance of marginal hand
    // Level 4 (Avançado): 40% chance
    // Level 5 (Expert): 55% chance
    // Level 6 (Mestre): 65% chance
    // Level 7 (Lenda): 75% chance
    const marginalChance = [0, 0, 0.25, 0.40, 0.55, 0.65, 0.75][Math.min(playerLevel - 1, 6)];
    
    const useMarginal = Math.random() < marginalChance;
    
    if (useMarginal) {
      // Generate hands in the "marginal zone" - medium strength hands
      // These are the hardest to decide: borderline raise/call/fold
      const marginalHands = [
        // Suited connectors/gappers (common marginal spots)
        'T9s', '98s', '87s', '76s', '65s', 'J9s', 'T8s', '97s', '86s',
        // Suited aces (marginal in many positions)
        'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
        // Off-suit broadways (tough decisions)
        'KTo', 'QTo', 'JTo', 'KJo', 'QJo', 'K9o', 'Q9o',
        // Medium pairs (position-dependent)
        '77', '66', '55', '44', '33', '22',
        // Suited kings/queens (marginal 3bet/call spots)
        'K9s', 'K8s', 'K7s', 'Q9s', 'Q8s', 'J8s', 'J9s',
        // Off-suit aces (classic marginal hands)
        'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
      ];
      return marginalHands[Math.floor(Math.random() * marginalHands.length)];
    }
    
    // Standard random generation
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
  }, [profile?.level]);

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

    // Generate realistic stack distribution
    const gm = getGameMode();
    const stackDist = getStackDistribution(stk, pos, gm, selectedScenario, newHandState.villainPosition, MODE_POSITIONS[trainingMode]);
    
    // Re-initialize with villain's dynamic stack
    const handStateWithStacks = initializeHandState(selectedScenario, pos, stk, hand, cards, MODE_POSITIONS[trainingMode], stackDist.villain);

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
    
    setCurrentStackDistribution(stackDist);
    setHandState({
      ...handStateWithStacks,
      heroStack: stk
    });
    setCurrentHandId(handId);
    setCurrentUniqueHandId(generateUniqueHandId());
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
    const effectiveStack = currentStackDistribution?.effectiveStack || handState.heroStack;
    const handData = getHandData(handName, scenario, handState.heroPosition, effectiveStack, finalTable, gm, bm);
    if (!handData) return;
    const userLevel = profile?.level || 1;
    const feedback = calculateFeedback(action, handData, userLevel);

    // Cenários vs3Bet e vsOpenShove: -80% ganho, +20% perda
    if (scenario === 'vs3bet' || scenario === 'vsOpenShove') {
      if (feedback.points > 0) {
        feedback.points = Math.round(feedback.points * 0.2); // 80% menos ganho
      } else if (feedback.points < 0) {
        feedback.points = Math.round(feedback.points * 1.2); // 20% mais perda
      }
    }

    const pointsToAdd = isHandAlreadyPlayedState ? 0 : feedback.points;
    const isCorrect = feedback.type === 'best' || feedback.type === 'correct';

    // In simulation mode, defer scoring until hand completes
    const isSimulation = scenario === 'simulation';

    if (!isHandAlreadyPlayedState && !isSimulation) {
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
            points: Math.round(feedback.points),
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

        const totalXp = (profile?.total_xp || 0) + pointsToAdd;
        const newLevel = calculateLevel(totalXp);
        checkAchievements({
          totalHands: handsPlayed + 1,
          level: newLevel,
        });
      }
    } else if (isSimulation && !isHandAlreadyPlayedState) {
      // Store pending score to apply after simulation completes
      setPendingSimulationScore({
        points: pointsToAdd,
        isCorrect,
        action,
        handName,
        handData,
        feedback,
      });
    }

    setLastFeedback({
      userAction: action,
      handData,
      feedback
    });

    // In simulation mode, skip popup for non-fold actions — continue directly to postflop
    // Even if the preflop action was incorrect, the simulation continues (score is deferred)
    if (isSimulation && action !== 'fold') {
      const newState = processHeroAction(handState, action, scenario);
      
      // Record preflop action
      const villainResponse = newState.actions.filter(a => !a.isHero && a.position === handState.villainPosition).slice(-1)[0];
      setSimulationStreetActions([{
        street: 'Preflop',
        heroAction: action === 'allin' ? 'All-in' : action.charAt(0).toUpperCase() + action.slice(1),
        villainAction: villainResponse ? (villainResponse.action === 'call' ? 'Call' : villainResponse.action === 'fold' ? 'Fold' : villainResponse.action) : undefined,
        pot: newState.pot,
        effectiveStack: handState.heroStack,
        boardCards: [],
        heroCards: handState.heroCards,
      }]);
      
      setHandState(newState);
      
      if (newState.isHandComplete) {
        // Show villain response for a moment before entering review
        setPhase('transitioning');
        setTimeout(() => {
          setPhase('review');
        }, 1200);
      } else {
        setPhase('transitioning');
        setTimeout(() => {
          setPhase('postflop');
        }, 500);
      }
      return;
    }

    setPhase('feedback');
  }, [handState, currentHandId, scenario, finalTable, isHandAlreadyPlayedState, trainingMode, heroBounty, currentBounties, user, handsPlayed, profile, checkAchievements, sessionScore]);

  // Calculate postflop bonus/penalty from street verdicts
  const calculatePostflopBonus = useCallback((): number => {
    const VERDICT_POINTS: Record<string, number> = {
      optimal: 5,
      good: 3,
      acceptable: 0,
      questionable: -4,
      bad: -8,
    };
    let bonus = 0;
    for (const sa of simulationStreetActions) {
      if (sa.street.toLowerCase() === 'preflop') continue;
      const analysis = analyzeStreetAction(sa);
      bonus += VERDICT_POINTS[analysis.verdict] ?? 0;
    }
    return bonus;
  }, [simulationStreetActions]);

  // Apply deferred simulation score when hand completes
  const applyPendingScore = useCallback(() => {
    if (!pendingSimulationScore || !handState || !currentHandId) return;
    
    const { points: preflopPoints, isCorrect, action, handName, feedback } = pendingSimulationScore;
    
    // Add postflop bonus/penalty
    const postflopBonus = calculatePostflopBonus();
    const totalPoints = preflopPoints + postflopBonus;
    
    markHandAsPlayed(currentHandId, action, totalPoints, feedback.type);
    addHandToSession({
      hand: handName,
      scenario,
      position: handState.heroPosition,
      stack: handState.heroStack,
      userAction: action,
      correctAction: pendingSimulationScore.handData?.primaryAction || 'fold',
      feedback: feedback.type,
      points: totalPoints,
      evLoss: feedback.evLoss
    });

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
          correct_action: pendingSimulationScore.handData?.primaryAction || 'fold',
          feedback: feedback.type,
          points: Math.round(totalPoints),
          ev_loss: feedback.evLoss,
        })
        .then(({ error }) => {
          if (error) console.error('Error saving hand:', error);
        });
    }

    setSessionScore(prev => prev + totalPoints);
    setHandsPlayed(prev => prev + 1);
    if (isCorrect) {
      setCorrectHandsCount(prev => prev + 1);
      setCurrentStreak(prev => {
        const newStreak = prev + 1;
        checkAchievements({ streak: newStreak });
        return newStreak;
      });
    } else {
      setCurrentStreak(0);
    }
    if (feedback.type === 'best') {
      setSessionBestCount(prev => prev + 1);
    }
    if (user && totalPoints !== 0) {
      updateUserRanking({
        userId: user.id,
        xpEarned: totalPoints,
        handsPlayed: 1,
        correctHands: isCorrect ? 1 : 0,
      });
      updateSupabaseProfile(user.id, totalPoints, 1);
    }
    
    setPendingSimulationScore(null);
  }, [pendingSimulationScore, handState, currentHandId, scenario, user, checkAchievements, calculatePostflopBonus]);

  // Auto-apply pending simulation score when hand completes and enters review
  useEffect(() => {
    if (phase === 'review' && pendingSimulationScore && handState?.isHandComplete) {
      applyPendingScore();
    }
  }, [phase, pendingSimulationScore, handState?.isHandComplete, applyPendingScore]);

  const handleFeedbackClose = useCallback(() => {
    if (scenario === 'simulation' && handState && lastFeedback?.userAction) {
      // In simulation, feedback modal only shows for fold — go to review
      if (lastFeedback.userAction === 'fold') {
        applyPendingScore();
        setPhase('review');
        return;
      }
      
      const newState = processHeroAction(handState, lastFeedback.userAction, scenario);
      setHandState(newState);
      
      if (newState.isHandComplete) {
        applyPendingScore();
        setPhase('review');
      } else {
        // Show transitioning state with delay before showing postflop actions
        setPhase('transitioning');
        setTimeout(() => {
          setPhase('postflop');
        }, 500);
      }
    } else {
      // Non-simulation — go to review
      setPhase('review');
    }
  }, [scenario, handState, lastFeedback, applyPendingScore]);

  // Handle postflop action in simulation mode with delays
  const handlePostflopAction = useCallback((action: 'check' | 'bet' | 'fold' | 'allin' | 'call' | 'raise') => {
    if (!handState) return;
    
    const betSize = action === 'bet' ? selectedBetSize : undefined;
    const currentStreet = handState.street;
    const newState = processPostflopAction(handState, action, betSize);
    
    // Determine hero's action label and amount
    const facingBet = handState.awaitingPostflopAction && handState.villainAction;
    const heroActionLabel = action === 'allin' ? 'All-in' 
      : action === 'bet' ? `Bet ${(handState.pot * (betSize || 0.5)).toFixed(1)}BB`
      : action === 'call' ? `Call ${facingBet ? handState.villainAction!.amount.toFixed(1) : '0'}BB`
      : action === 'raise' ? `Raise ${(handState.pot * (betSize || 0.75)).toFixed(1)}BB`
      : action.charAt(0).toUpperCase() + action.slice(1);
    
    // Determine villain's response from the new state
    const villainActionLabel = newState.lastVillainAction || undefined;
    
    // Record street action
    const streetLabel = currentStreet.charAt(0).toUpperCase() + currentStreet.slice(1);
    setSimulationStreetActions(prev => [...prev, {
      street: streetLabel,
      heroAction: heroActionLabel,
      villainAction: villainActionLabel,
      pot: newState.pot,
      effectiveStack: handState.heroStack,
      boardCards: [...handState.communityCards],
      heroCards: handState.heroCards,
    }]);
    
    // Show transitioning phase for delay effect
    setPhase('transitioning');
    
    setTimeout(() => {
      setHandState(newState);
      
      if (newState.isHandComplete) {
        // Show villain's final action for a moment before review
        setTimeout(() => {
          applyPendingScore();
          setPhase('review');
        }, 1200);
      } else if (newState.awaitingPostflopAction) {
        // Villain bet, hero must respond — add another delay
        setTimeout(() => {
          setPhase('postflop');
        }, 500);
      } else {
        // Next street dealt — delay before showing actions
        setTimeout(() => {
          setPhase('postflop');
        }, 500);
      }
    }, 500);
  }, [handState, selectedBetSize, applyPendingScore]);

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
    const tempState = initializeHandState(selectedScenario, pos, stk, hand, cards, MODE_POSITIONS[trainingMode]);

    // Generate realistic stack distribution
    const gm = getGameMode();
    const stackDist = getStackDistribution(stk, pos, gm, selectedScenario, tempState.villainPosition, MODE_POSITIONS[trainingMode]);
    
    // Re-initialize with villain's dynamic stack
    const newHandState = initializeHandState(selectedScenario, pos, stk, hand, cards, MODE_POSITIONS[trainingMode], stackDist.villain);

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
    
    setCurrentStackDistribution(stackDist);
    setHandState({
      ...newHandState,
      heroStack: stk
    });
    setCurrentHandId(handId);
    setCurrentUniqueHandId(generateUniqueHandId());
    setIsHandAlreadyPlayedState(alreadyPlayed);
    setPreviousHandResult(previousResult ? {
      action: previousResult.action,
      feedback: previousResult.feedback,
      points: previousResult.points
    } : null);
    setIsCurrentHandFavorited(isHandFavorited(hand, selectedScenario, pos, stk));
    setLastFeedback(null);
    setPendingSimulationScore(null);
    setSimulationStreetActions([]);
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
    setCurrentUniqueHandId(null);
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
        case 'simulation':
          // First position has no one before to open/shove
          if (!hasEarlier) invalid.push(pos);
          break;
        case 'vs3bet':
          // Hero opens, then someone AFTER hero 3-bets. So hero needs someone acting after them.
          // First position can't face 3-bet (no one opened before them to re-raise)
          // Last position can't face 3-bet (no one acts after them to 3-bet)
          if (isFirst || !hasLater) {
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
        {needsOnboarding && <OnboardingTutorial onComplete={completeOnboarding} />}
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
                  {currentStackDistribution && currentStackDistribution.effectiveStack !== handState.heroStack && (
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Efetivo</p>
                      <p className="text-lg font-semibold text-secondary">{currentStackDistribution.effectiveStack} BB</p>
                    </div>
                  )}
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
                    {/* Hand ID */}
                    {currentUniqueHandId && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">ID</span>
                        <span className="text-xs font-mono text-foreground select-all">{currentUniqueHandId}</span>
                      </div>
                    )}

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
              villainCards={handState.villainCards}
              villainAction={handState.villainAction} 
              villainStack={handState.villainStack} 
              communityCards={handState.communityCards} 
              street={handState.street} 
              foldedPositions={handState.foldedPositions} 
              activeBets={handState.activeBets}
              bounties={trainingMode === 'bounty' ? currentBounties : undefined}
              playerStacks={currentStackDistribution?.all}
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

            {/* Action buttons - hidden in review/postflop mode */}
            {phase === 'playing' && (
              <>
                {/* Hero cards display above actions */}
                {handState.heroCards && handState.heroCards.length > 0 && (
                  <div className="flex justify-center">
                    <HandDisplay cards={handState.heroCards} size="md" />
                  </div>
                )}
                <ActionButtons onAction={handleAction} pot={handState.pot} stack={handState.heroStack} disabled={false} showRaiseSlider={false} scenario={scenario} />
              </>
            )}

            {/* Transitioning indicator - show villain action when hand is completing */}
            {phase === 'transitioning' && (
              <div className="flex flex-col items-center justify-center py-6 gap-3">
                {handState.lastVillainAction && handState.isHandComplete && (
                  <div className="bg-destructive/20 border border-destructive/40 text-destructive-foreground px-4 py-2 rounded-lg text-sm font-semibold animate-fade-in">
                    Vilão: {handState.lastVillainAction}
                  </div>
                )}
                <div className="animate-pulse text-sm text-muted-foreground">Aguarde...</div>
              </div>
            )}

            {/* Post-flop action buttons for simulation mode */}
            {phase === 'postflop' && handState.isSimulation && !handState.isHandComplete && (
              <div className="space-y-3">
                <div className="text-center space-y-2">
                  {/* Street indicator - above everything */}
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
                    {handState.street} — Sua vez
                  </span>
                  {/* Show last villain action prominently */}
                  {handState.lastVillainAction && (
                    <div className="flex justify-center">
                      <div className="bg-destructive/20 border border-destructive/40 text-destructive-foreground px-3 py-1.5 rounded-lg text-sm font-semibold">
                        Vilão: {handState.lastVillainAction}
                      </div>
                    </div>
                  )}
                  {/* Hero cards display above postflop actions */}
                  {handState.heroCards && handState.heroCards.length > 0 && (
                    <div className="flex justify-center pt-2">
                      <HandDisplay cards={handState.heroCards} size="md" />
                    </div>
                  )}
                  {/* Stack info */}
                  <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-1">
                    <span>Seu stack: <strong className="text-foreground">{handState.heroStack.toFixed(1)} BB</strong></span>
                    <span>Vilão stack: <strong className="text-foreground">{(handState.villainStack || 0).toFixed(1)} BB</strong></span>
                    <span>Pot: <strong className="text-primary">{handState.pot.toFixed(1)} BB</strong></span>
                  </div>
                </div>

                {/* Bet/Raise sizing selector */}
                <div className="flex items-center justify-center gap-2">
                  {[
                    { label: '33%', value: 0.33 },
                    { label: '50%', value: 0.5 },
                    { label: '75%', value: 0.75 },
                    { label: '100%', value: 1.0 },
                  ].map(size => {
                    const betAmount = Math.min(
                      Math.round(handState.pot * size.value * 10) / 10,
                      Math.min(handState.heroStack, handState.villainStack || handState.heroStack)
                    );
                    return (
                      <Button
                        key={size.label}
                        variant={selectedBetSize === size.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedBetSize(size.value)}
                        className={cn(
                          'min-w-[3rem] text-xs',
                          selectedBetSize === size.value && 'bg-primary text-primary-foreground'
                        )}
                      >
                        {size.label}
                      </Button>
                    );
                  })}
                  <span className="text-xs text-muted-foreground ml-1">
                    {Math.min(
                      Math.round(handState.pot * selectedBetSize * 10) / 10,
                      Math.min(handState.heroStack, handState.villainStack || handState.heroStack)
                    ).toFixed(1)} BB
                  </span>
                </div>

                {/* Action buttons - adapt based on whether facing a villain bet */}
                {handState.awaitingPostflopAction && handState.villainAction ? (
                  /* Facing villain bet/raise: show Call, Raise, Fold, All-in */
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('fold')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-muted hover:bg-muted/80 border-muted text-foreground font-semibold"
                    >
                      <span className="text-lg">✕</span>
                      <span className="text-xs sm:text-sm">Fold</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('call')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-secondary hover:bg-secondary/90 border-secondary text-secondary-foreground font-semibold"
                    >
                      <span className="text-lg">✓</span>
                      <span className="text-xs sm:text-sm">Call {handState.villainAction.amount.toFixed(1)}</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('raise')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-poker-raise hover:bg-poker-raise/90 border-poker-raise text-foreground font-semibold"
                    >
                      <span className="text-lg">↑</span>
                      <span className="text-xs sm:text-sm">Raise</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('allin')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-destructive hover:bg-destructive/90 border-destructive text-destructive-foreground font-semibold"
                    >
                      <span className="text-lg">💥</span>
                      <span className="text-xs sm:text-sm">All-in</span>
                    </Button>
                  </div>
                ) : (
                  /* No villain bet: show Check, Bet, Fold, All-in */
                  <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('check')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-secondary hover:bg-secondary/90 border-secondary text-secondary-foreground font-semibold"
                    >
                      <span className="text-lg">✓</span>
                      <span className="text-xs sm:text-sm">Check</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('bet')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-poker-raise hover:bg-poker-raise/90 border-poker-raise text-foreground font-semibold"
                    >
                      <span className="text-lg">💰</span>
                      <span className="text-xs sm:text-sm">Bet {Math.min(
                        Math.round(handState.pot * selectedBetSize * 10) / 10,
                        Math.min(handState.heroStack, handState.villainStack || handState.heroStack)
                      ).toFixed(1)}</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('fold')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-muted hover:bg-muted/80 border-muted text-foreground font-semibold"
                    >
                      <span className="text-lg">✕</span>
                      <span className="text-xs sm:text-sm">Fold</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePostflopAction('allin')}
                      className="h-14 sm:h-16 flex flex-col items-center justify-center gap-1 bg-destructive hover:bg-destructive/90 border-destructive text-destructive-foreground font-semibold"
                    >
                      <span className="text-lg">💥</span>
                      <span className="text-xs sm:text-sm">All-in</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Showdown result for simulation */}
            {handState.isHandComplete && handState.isSimulation && phase === 'review' && (
              <>
                {/* Result banner */}
                <Card className={cn(
                  'border-2',
                  handState.result === 'hero_wins' ? 'border-feedback-best bg-feedback-best/10' :
                  handState.result === 'villain_wins' ? 'border-feedback-blunder bg-feedback-blunder/10' :
                  'border-primary bg-primary/10'
                )}>
                  <CardContent className="p-4 text-center space-y-2">
                    <p className={cn('text-xl font-bold',
                      handState.result === 'hero_wins' ? 'text-feedback-best' :
                      handState.result === 'villain_wins' ? 'text-feedback-blunder' :
                      'text-primary'
                    )}>
                      {handState.result === 'hero_wins' ? '🏆 Você Ganhou!' :
                       handState.result === 'villain_wins' ? '💀 Você Perdeu' :
                       '🤝 Empate'}
                    </p>
                    {handState.street === 'showdown' && (
                      <div className="flex justify-center gap-6 text-sm">
                        {handState.heroEval && (
                          <div>
                            <span className="text-muted-foreground">Você: </span>
                            <span className="font-medium">{handState.heroEval.rankName}</span>
                          </div>
                        )}
                        {handState.villainEval && (
                          <div>
                            <span className="text-muted-foreground">Vilão: </span>
                            <span className="font-medium">{handState.villainEval.rankName}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Show last villain action if not showdown */}
                    {handState.lastVillainAction && handState.street !== 'showdown' && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Vilão: </span>
                        <span className="font-semibold">{handState.lastVillainAction}</span>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Pot: {handState.pot.toFixed(1)} BB
                    </p>
                  </CardContent>
                </Card>

                {/* Simulation street-by-street summary */}
                {simulationStreetActions.length > 0 && (
                  <Card className="border border-border">
                    <CardContent className="p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        📋 Resumo da Mão
                      </h3>
                      <div className="space-y-2">
                        {(() => {
                          const seenReasons = new Set<string>();
                          return simulationStreetActions.map((sa, idx) => {
                            const analysis = analyzeStreetAction(sa);
                            const isPostflop = sa.street.toLowerCase() !== 'preflop';
                            // Filter out reasoning already shown in previous streets
                            const uniqueReasons = analysis.reasoning.filter(r => {
                              if (seenReasons.has(r)) return false;
                              seenReasons.add(r);
                              return true;
                            });
                            return (
                              <div key={idx} className="rounded-lg border border-border/50 overflow-hidden">
                                <div className="flex items-center justify-between p-2 bg-muted/50">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-primary uppercase w-14">{sa.street}</span>
                                    <div className="text-sm">
                                      <span className="font-medium">Hero: {sa.heroAction}</span>
                                      {sa.villainAction && (
                                        <span className="text-muted-foreground ml-2">→ Vilão: {sa.villainAction}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Pot: {sa.pot.toFixed(1)}</span>
                                    {sa.street === 'Preflop' && handState && (
                                      <button
                                        className="p-1 rounded hover:bg-primary/20 transition-colors group relative"
                                        title="Ver Range GTO"
                                        onClick={() => setSummaryRangeViewer({ open: true, stack: sa.effectiveStack || handState.heroStack })}
                                      >
                                        <BarChart3 className="h-4 w-4 text-primary" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Post-flop analysis */}
                                {isPostflop && (
                                  <div className={cn('px-3 py-2 space-y-1', getVerdictBgColor(analysis.verdict))}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{analysis.verdictEmoji}</span>
                                      <span className={cn('text-sm font-semibold', getVerdictColor(analysis.verdict))}>
                                        {analysis.verdictLabel}
                                      </span>
                                      {analysis.handStrength && (
                                        <span className="text-xs text-muted-foreground">• {analysis.handStrength}</span>
                                      )}
                                    </div>
                                    {analysis.boardTexture && (
                                      <p className="text-xs text-muted-foreground">
                                        🃏 {analysis.boardTexture.label}
                                      </p>
                                    )}
                                    {analysis.betSizingAnalysis && (
                                      <p className="text-xs text-muted-foreground">
                                        💰 {analysis.betSizingAnalysis}
                                      </p>
                                    )}
                                    {uniqueReasons.map((r, ri) => (
                                      <p key={ri} className="text-xs text-muted-foreground">
                                        → {r}
                                      </p>
                                    ))}
                                    {analysis.idealPlay && analysis.verdict !== 'optimal' && (
                                      <div className="mt-1.5 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                                        <p className="text-xs font-medium text-primary">
                                          💡 Jogada ideal: {analysis.idealPlay}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                      {/* Score summary */}
                      {pendingSimulationScore === null && lastFeedback && (() => {
                        // Calculate postflop bonus for display
                        const VERDICT_DISPLAY_POINTS: Record<string, number> = { optimal: 5, good: 3, acceptable: 0, questionable: -4, bad: -8 };
                        const postflopActions = simulationStreetActions.filter(sa => sa.street.toLowerCase() !== 'preflop');
                        const postflopBonus = postflopActions.reduce((sum, sa) => {
                          const analysis = analyzeStreetAction(sa);
                          return sum + (VERDICT_DISPLAY_POINTS[analysis.verdict] ?? 0);
                        }, 0);
                        const preflopPts = lastFeedback.feedback.points;
                        const totalPts = preflopPts + postflopBonus;
                        const isPreflopCorrect = lastFeedback.feedback.type === 'best' || lastFeedback.feedback.type === 'correct';
                        return (
                          <div className="space-y-2">
                            {/* Preflop result */}
                            <div className={cn(
                              'p-2 rounded-lg text-center text-sm font-medium',
                              isPreflopCorrect ? 'bg-feedback-best/20 text-feedback-best' : 'bg-feedback-blunder/20 text-feedback-blunder'
                            )}>
                              Preflop: {lastFeedback.feedback.type === 'best' ? '✅ Melhor jogada' : 
                                lastFeedback.feedback.type === 'correct' ? '✅ Jogada correta' : 
                                `❌ ${lastFeedback.feedback.message}`}
                              <span className="ml-2">({preflopPts > 0 ? '+' : ''}{preflopPts} pts)</span>
                            </div>
                            {/* Postflop bonus */}
                            {postflopActions.length > 0 && (
                              <div className={cn(
                                'p-2 rounded-lg text-center text-sm font-medium',
                                postflopBonus > 0 ? 'bg-feedback-best/20 text-feedback-best' : postflopBonus < 0 ? 'bg-feedback-blunder/20 text-feedback-blunder' : 'bg-muted text-muted-foreground'
                              )}>
                                Pós-flop: {postflopBonus > 0 ? '✅' : postflopBonus < 0 ? '❌' : '➖'} {postflopBonus > 0 ? '+' : ''}{postflopBonus} pts
                              </div>
                            )}
                            {/* Total */}
                            <div className={cn(
                              'p-3 rounded-lg text-center font-bold',
                              totalPts > 0 ? 'bg-feedback-best/30 text-feedback-best' : totalPts < 0 ? 'bg-feedback-blunder/30 text-feedback-blunder' : 'bg-muted text-muted-foreground'
                            )}>
                              Total: {totalPts > 0 ? '+' : ''}{totalPts} pts
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Range Viewer Modal from summary */}
                {summaryRangeViewer?.open && handState && lastFeedback && (
                  <RangeViewerModal
                    open={summaryRangeViewer.open}
                    onClose={() => setSummaryRangeViewer(null)}
                    scenario={scenario}
                    position={handState.heroPosition}
                    stack={summaryRangeViewer.stack}
                    finalTable={finalTable}
                    heroHand={lastFeedback.handData?.hand || ''}
                    heroAction={lastFeedback.userAction}
                  />
                )}
              </>
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
        {lastFeedback && lastFeedback.handData && handState && <DecisionFeedback open={phase === 'feedback'} onClose={handleFeedbackClose} onNextHand={nextHand} userAction={lastFeedback.userAction} handData={lastFeedback.handData} feedback={lastFeedback.feedback} sessionScore={sessionScore} handsPlayed={handsPlayed} scenario={scenario} position={handState.heroPosition} stack={handState.heroStack} finalTable={finalTable} gameMode={getGameMode()} bountyMultiplier={getBountyMultiplier()} alreadyPlayed={isHandAlreadyPlayedState} isSimulation={scenario === 'simulation'} uniqueHandId={currentUniqueHandId || undefined} previousResult={previousHandResult ? {
        action: previousHandResult.action,
        feedback: previousHandResult.feedback as any,
        points: previousHandResult.points
      } : undefined} />}
      {needsOnboarding && <OnboardingTutorial onComplete={completeOnboarding} />}
      </div>
    </MainLayout>;
}
