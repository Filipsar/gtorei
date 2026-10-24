import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { PokerTable } from '@/components/poker/PokerTable';
import { ActionButtons } from '@/components/poker/ActionButtons';
import { PostflopActions } from '@/components/poker/PostflopActions';
import { useSupporter } from '@/hooks/useSupporter';
import { EVENTO_MAO_REGISTRADA } from '@/hooks/useDailyChallenges';
import { DailyChallengesCard } from '@/components/challenges/DailyChallengesCard';
import { ehApp, usarLayoutDoApp } from '@/lib/nativo/plataforma';
import { useDificuldade } from '@/hooks/useDificuldade';
import { ajustarPontos, limitarPontos, sortearMao } from '@/lib/dificuldade';
import { DificuldadeControle } from '@/components/poker/DificuldadeControle';
import { SimuladoResultado } from '@/components/train/SimuladoResultado';
import { LicaoResultado } from '@/components/train/LicaoResultado';
import { ReiComenta } from '@/components/train/ReiComenta';
import { licaoPorId, type Licao } from '@/data/trilha';
import { dueloPorId } from '@/data/duelo';
import { explicarJogada } from '@/lib/explicacao';
import { MAOS_POR_LICAO, proximaLicao, registrarResultado, type Estrelas } from '@/lib/trilha';
import { Chip, OpcaoGrande, Secao } from '@/components/train/ConfigUI';
import { ModeIcon } from '@/components/poker/ModeIcon';
import {
  CENARIOS_FORA_DO_SIMULADO,
  CENARIO_DA_SESSAO_SIMULADO,
  MINIMO_PARA_XP,
  REGRA_DO_XP,
  TAMANHOS_SIMULADO,
  acertou,
  type Formato,
  type RespostaSimulado,
  type ResultadoSimulado,
} from '@/lib/simulado';
import { DecisionFeedback } from '@/components/poker/DecisionFeedback';
import { ActionHistory, ActionEntry } from '@/components/poker/ActionHistory';
import { generateCardsFromHand, CardType, HandDisplay } from '@/components/poker/PlayingCard';
import { TrainingModeSelector } from '@/components/poker/TrainingModeSelector';
import {
  CENARIOS_APOIADOR,
  MODE_POSITIONS,
  MODOS_APOIADOR,
  ModeChoice,
  TrainingMode,
  cenariosDoModo,
  posicoesDoModo,
  posicoesInvalidas,
  sortearConfiguracaoDaMao,
  sortearModo,
} from '@/lib/sorteioDeMao';
import { BountyConfig, BountyTier, BOUNTY_TIERS, generateOpponentBounty } from '@/components/poker/BountyConfig';
import { calculateBountyMultiplier } from '@/data/gtoRanges';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { POSITIONS, SCENARIOS, STACK_SIZES, Position, Scenario, ActionType, RANKS, RangeData, getRange, getHandData, calculateFeedback, GameMode } from '@/data/gtoRanges';
import { getStackDistribution, StackDistribution } from '@/data/stackDistribution';
import { initializeHandState, getVillainPosition, getScenarioDescription, processHeroAction, processPostflopAction, avancarRua, HandState, Street } from '@/data/handState';
import { HAND_RANK_NAMES, HandEvaluation } from '@/data/handEvaluator';
import { createSession, getCurrentSession, updateCurrentSession, addHandToSession, endCurrentSession, getUserProfile, createUserProfile, addFavoriteHand, isHandFavorited, removeFavoriteHand, getFavoriteHands, calculateLevel } from '@/data/localStorage';
import { generateHandId, isHandAlreadyPlayed, getPlayedHandData, markHandAsPlayed, clearPlayedHandsSession } from '@/data/playedHandsTracker';
import { generateUniqueHandId } from '@/data/handIdGenerator';
import { useAchievements } from '@/hooks/useAchievements';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Play, Shuffle, Trophy, Target, Zap, Info, AlertTriangle, RefreshCw, Lock, Heart, ArrowLeft, BarChart3, ClipboardCheck, Loader2, X } from 'lucide-react';
import { RangeViewerModal } from '@/components/poker/RangeViewerModal';
import { OnboardingTutorial, useOnboardingStatus } from '@/components/onboarding/OnboardingTutorial';
import { LevelTest, useLevelTestStatus } from '@/components/onboarding/LevelTest';

import { useIsMobile } from '@/hooks/use-mobile';
import { analyzeStreetAction, getVerdictColor, getVerdictBgColor, StreetAnalysis, StreetActionData } from '@/data/postflopAnalysis';

type GamePhase = 'modeSelect' | 'config' | 'playing' | 'feedback' | 'review' | 'postflop' | 'transitioning' | 'simuladoResultado' | 'licaoResultado';

export default function TrainPage() {
  // Onboarding
  const { needsOnboarding, completeOnboarding } = useOnboardingStatus();
  const { needsLevelTest, completeLevelTest } = useLevelTestStatus();
  // No app quem apresenta o treino é a trilha: sem tutorial nem teste de nível por cima
  const semIntro = usarLayoutDoApp();


  // Mode state
  const [trainingMode, setTrainingMode] = useState<TrainingMode | null>(null);
  // No modo aleatório, trainingMode guarda o que saiu na mão atual
  const [modoAleatorio, setModoAleatorio] = useState(false);
  const { isSupporter, loading: carregandoApoio } = useSupporter();
  // Simulado: série sem resposta a cada mão, correção e XP no fim (src/lib/simulado.ts)
  const [formato, setFormato] = useState<Formato>('livre');
  const [tamanhoSimulado, setTamanhoSimulado] = useState<number>(20);
  const [respostasSimulado, setRespostasSimulado] = useState<RespostaSimulado[]>([]);
  const [resultadoSimulado, setResultadoSimulado] = useState<ResultadoSimulado | null>(null);
  const [corrigindoSimulado, setCorrigindoSimulado] = useState(false);
  const [erroSimulado, setErroSimulado] = useState<string | null>(null);
  // As mãos são gravadas sem esperar; a correção espera todas chegarem ao banco
  const gravacoesSimulado = useRef<PromiseLike<unknown>[]>([]);
  // nextHand é declarada depois de handleAction; o simulado chama por aqui
  const proximaMaoRef = useRef<() => void>(() => {});
  const emSimulado = formato === 'simulado';

  // Lição da trilha do app (?licao=id, src/data/trilha.ts): spot fixo, 10 mãos
  // com a resposta a cada uma, estrelas no fim
  const [searchParams] = useSearchParams();
  const licao = useMemo(() => licaoPorId(searchParams.get('licao')), [searchParams]);
  // Duelo do app (?duelo=curto|medio|fundo, src/data/duelo.ts): heads-up sem
  // fim marcado, com placar Você x Rei
  const duelo = useMemo(() => dueloPorId(searchParams.get('duelo')), [searchParams]);
  const preset = licao ?? duelo?.preset ?? null;
  const [placar, setPlacar] = useState({ voce: 0, rei: 0 });
  // No app o Rei comenta cada mão; o quadro completo abre em "Ver range"
  const comentarioDoRei = usarLayoutDoApp();
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const [respostasLicao, setRespostasLicao] = useState<RespostaSimulado[]>([]);
  const [fimDaLicao, setFimDaLicao] = useState<{ estrelas: Estrelas; liberou: Licao | null } | null>(null);
  // Ligado junto com a configuração da lição: a mesa abre no render seguinte,
  // quando startGame já enxerga o spot novo
  const [licaoPendente, setLicaoPendente] = useState<string | null>(null);

  const cenarioBloqueado = useCallback(
    (s: Scenario) => CENARIOS_APOIADOR.includes(s) && !isSupporter,
    [isSupporter]
  );
  // O que o sorteio pode trazer: além do bloqueio de apoiador, o simulado não
  // tem a Simulação (pós-flop com várias decisões por mão), e a lição só tem
  // os cenários dela
  const bloqueioDoSorteio = useCallback(
    (s: Scenario) =>
      cenarioBloqueado(s) ||
      (emSimulado && CENARIOS_FORA_DO_SIMULADO.includes(s)) ||
      (preset !== null && !preset.cenarios.includes(s)),
    [cenarioBloqueado, emSimulado, preset]
  );
  const modoBloqueado = useCallback(
    (m: ModeChoice) => MODOS_APOIADOR.includes(m) && !isSupporter,
    [isSupporter]
  );
  // Simulação com um terceiro jogador no pote (só faz sentido na simulação)
  const [simulacaoMultiway, setSimulacaoMultiway] = useState(false);
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
    // Guardada para o gráfico mostrar exatamente a range que deu a nota
    range: RangeData;
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
  const { user, profile, refreshProfile } = useAuth();
  const dificuldade = useDificuldade(user?.id, profile?.level || getUserProfile()?.level || 1);
  const supabaseSessionId = useRef<string | null>(null);
  // O .then() do supabase devolve PromiseLike, não Promise
  const sessionPromise = useRef<PromiseLike<string | null> | null>(null);
  const { checkAchievements } = useAchievements();

  // Ensure user profile exists
  useEffect(() => {
    if (!getUserProfile()) {
      createUserProfile('Jogador');
    }
  }, []);

  // When mode changes, reset positions to valid ones
  const handleModeSelect = (escolha: ModeChoice) => {
    if (modoBloqueado(escolha)) {
      // Enquanto a consulta de apoiador não volta, todo modo pago parece
      // trancado. Mandar para o apoio nesse instante jogaria um apoiador
      // fora da tela por causa da espera.
      if (!carregandoApoio) navigate('/apoiar');
      return;
    }

    // No aleatório o modo é sorteado de novo a cada mão; este é só o primeiro.
    const aleatorio = escolha === 'random';
    const mode = aleatorio ? sortearModo() : escolha;
    setModoAleatorio(aleatorio);
    setTrainingMode(mode);
    setSelectedPositions([MODE_POSITIONS[mode][0]]);
    // Bounty mode always has ICM
    setFinalTable(mode === 'bounty');

    // O aleatório não tem o que configurar: cenário, posição e fichas são
    // sorteados a cada mão. Então a mesa começa aqui mesmo.
    if (aleatorio) {
      startGame({ aleatorio: true, modo: mode });
      return;
    }

    setPhase('config');
  };

  // Get available positions for current mode
  const getAvailablePositions = (modo: TrainingMode | null = trainingMode): Position[] => {
    return posicoesDoModo(modo);
  };

  // Get available scenarios for current mode
  const getAvailableScenarios = (modo: TrainingMode | null = trainingMode): Scenario[] => {
    return cenariosDoModo(modo);
  };

  // Get current game mode
  const getGameMode = (modo: TrainingMode | null = trainingMode): GameMode => {
    const map: Record<TrainingMode, GameMode> = {
      rangeTraining: '8max', hu: 'hu', threeHand: 'threehand', bounty: 'bounty',
    };
    return modo ? map[modo] : '8max';
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
  const generateBounties = (modo: TrainingMode | null = trainingMode): Record<string, number> => {
    const bounties: Record<string, number> = {};
    // No aleatório o modo da mão não é o que está no estado ainda, então ele
    // vem por parâmetro — senão as recompensas sairiam para a mesa errada.
    const positions = getAvailablePositions(modo);
    for (const pos of positions) {
      bounties[pos] = generateOpponentBounty(heroBounty);
    }
    // Hero always has the selected bounty
    return bounties;
  };

  // A mão sai pela dificuldade em vigor (src/lib/dificuldade.ts), que aparece
  // na tela do treino. Antes o nível de XP decidia isso escondido.
  const generateRandomHand = useCallback((): string => sortearMao(dificuldade.efetiva), [dificuldade.efetiva]);

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
  /**
   * Sorteia a configuração de uma mão e já monta o estado dela.
   *
   * O início da sessão e a mão seguinte faziam isto em cópias separadas — e foi
   * assim que uma das duas ficou para trás. Agora é um caminho só.
   */
  const montarMao = useCallback((aleatorio: boolean, modo: TrainingMode) => {
    const { cenario, posicao, stack, multiway } = sortearConfiguracaoDaMao({
      modo,
      aleatorio,
      cenarioEscolhido: scenario,
      cenarioAleatorio: randomScenario,
      posicoesEscolhidas: selectedPositions,
      posicaoAleatoria: randomPosition,
      stacksEscolhidos: selectedStacks,
      stackAleatorio: randomStack,
      multiwayLigado: simulacaoMultiway,
      bloqueado: bloqueioDoSorteio,
    });

    const hand = generateRandomHand();
    const cards = generateCardsFromHand(hand);
    const assentos = MODE_POSITIONS[modo];

    const parcial = initializeHandState(cenario, posicao, stack, hand, cards, assentos, undefined, multiway);
    // Com o vilão conhecido, dá para distribuir os stacks da mesa
    const stackDist = getStackDistribution(stack, posicao, getGameMode(modo), cenario, parcial.villainPosition, assentos);
    // Remontada com o stack do vilão já valendo
    const estado = initializeHandState(cenario, posicao, stack, hand, cards, assentos, stackDist.villain, multiway);

    return { cenario, posicao, stack, hand, cards, stackDist, estado };
  }, [scenario, randomScenario, selectedPositions, randomPosition, selectedStacks, randomStack, simulacaoMultiway, bloqueioDoSorteio, generateRandomHand]);

  const startGame = useCallback((opcoes?: { aleatorio?: boolean; modo?: TrainingMode }) => {
    // No aleatório o modo sai aqui, e é ele que vale para a mão inteira. Quando
    // a chamada vem da escolha de modo, o primeiro sorteio já foi feito lá.
    const aleatorio = opcoes?.aleatorio ?? modoAleatorio;
    const modo = aleatorio ? (opcoes?.modo ?? sortearModo()) : (trainingMode ?? 'rangeTraining');
    const { cenario: selectedScenario, posicao: pos, stack: stk, hand, cards, stackDist, estado } =
      montarMao(aleatorio, modo);

    createSession({
      scenario: selectedScenario,
      position: aleatorio || randomPosition ? 'random' : pos,
      stack: aleatorio || randomStack ? 'random' : stk
    });

    // Persist session to Supabase (awaited before the first hand is recorded)
    if (user) {
      supabaseSessionId.current = null;
      sessionPromise.current = supabase
        .from('training_sessions')
        .insert({
          user_id: user.id,
          // claim_simulado só corrige sessão marcada assim
          scenario: emSimulado ? CENARIO_DA_SESSAO_SIMULADO : selectedScenario,
          position: pos,
          stack: stk,
        })
        .select('id')
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error creating session:', error);
            return null;
          }
          supabaseSessionId.current = data?.id ?? null;
          return supabaseSessionId.current;
        });
    }

    const handId = generateHandId(selectedScenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;

    if (aleatorio) {
      setTrainingMode(modo);
      // Bounty é sempre ICM: no aleatório a mesa alterna, então a regra
      // acompanha o modo que saiu em vez de ficar presa na primeira mão.
      setFinalTable(modo === 'bounty');
    }
    if (selectedScenario !== scenario) {
      setScenario(selectedScenario);
    }

    // Generate bounties for bounty mode
    if (modo === 'bounty') {
      const bounties = generateBounties(modo);
      // Hero bounty is always the selected one
      bounties[pos] = heroBounty;
      setCurrentBounties(bounties);
    }

    setCurrentStackDistribution(stackDist);
    setHandState({
      ...estado,
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
    setRespostasSimulado([]);
    setResultadoSimulado(null);
    setErroSimulado(null);
    gravacoesSimulado.current = [];
    setPhase('playing');
  }, [montarMao, scenario, randomPosition, randomStack, trainingMode, modoAleatorio, heroBounty, user, emSimulado]);

  // Lição ou duelo novo (ou o mesmo de novo): monta o spot e pede a mesa
  const chaveDoPreset = licao?.id ?? (duelo ? `duelo-${duelo.id}` : null);
  useEffect(() => {
    if (!preset || !chaveDoPreset) return;
    setFormato('livre');
    setModoAleatorio(false);
    setTrainingMode(preset.modo);
    setScenario(preset.cenarios[0]);
    setRandomScenario(preset.cenarios.length > 1);
    setSelectedPositions(preset.posicoes);
    setRandomPosition(false);
    setSelectedStacks(preset.stacks);
    setRandomStack(false);
    setSimulacaoMultiway(false);
    setFinalTable(false);
    setLicaoPendente(chaveDoPreset);
  }, [preset, chaveDoPreset]);

  useEffect(() => {
    if (!licaoPendente) return;
    setLicaoPendente(null);
    setRespostasLicao([]);
    setFimDaLicao(null);
    setPlacar({ voce: 0, rei: 0 });
    startGame();
  }, [licaoPendente, startGame]);

  // O painel do Rei fecha o quadro de detalhes junto quando a mão muda
  useEffect(() => {
    if (phase !== 'feedback') setDetalhesAbertos(false);
  }, [phase]);

  // Fecha a sessão no banco (o resumo dela é mantido pelo servidor)
  const encerrarSessaoNoBanco = useCallback(() => {
    endCurrentSession();
    if (user && supabaseSessionId.current) {
      supabase
        .from('training_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', supabaseSessionId.current)
        .then(({ error }) => {
          if (error) console.error('Error ending session:', error);
        });
    }
    supabaseSessionId.current = null;
    sessionPromise.current = null;
  }, [user]);

  // Record a scored hand on the server (XP, level, session stats and ranking)
  const recordHand = useCallback(async (params: {
    hand: string;
    scenario: string;
    position: string;
    stack: number;
    userAction: string;
    correctAction: string;
    feedback: string;
    points: number;
    evLoss: number;
    handCode?: string | null;
    gameMode?: string | null;
    villainPosition?: string | null;
    effectiveStack?: number | null;
  }) => {
    if (!user) return;
    let sessionId = supabaseSessionId.current;
    if (!sessionId && sessionPromise.current) {
      sessionId = await sessionPromise.current;
    }
    if (!sessionId) return;

    const { data, error } = await supabase.rpc('record_hand_result', {
      _session_id: sessionId,
      _hand: params.hand,
      _scenario: params.scenario,
      _position: params.position,
      _stack: Math.round(params.stack),
      _user_action: params.userAction,
      _correct_action: params.correctAction,
      _feedback: params.feedback,
      _points: Math.round(params.points),
      _ev_loss: params.evLoss ?? 0,
      _hand_code: params.handCode ?? null,
      _game_mode: params.gameMode ?? null,
      _villain_position: params.villainPosition ?? null,
      _effective_stack: params.effectiveStack ?? null,
    });

    if (error) {
      if (error.message?.includes('rate_limited')) {
        toast({
          title: 'Muitas mãos em pouco tempo',
          description: 'Aguarde alguns segundos antes de jogar a próxima mão.',
          variant: 'destructive',
        });
      } else {
        console.error('Error recording hand:', error);
      }
      return;
    }

    const result = data as { total_xp: number; level: number; hands_played: number } | null;
    if (result) {
      // O cartão de desafios do dia escuta isto para o progresso andar sozinho
      window.dispatchEvent(new Event(EVENTO_MAO_REGISTRADA));
      await refreshProfile();
      checkAchievements({
        totalHands: result.hands_played,
        level: result.level,
      });
    }
  }, [user, refreshProfile, checkAchievements]);

  // Fim do simulado: espera as mãos chegarem ao banco e pede a correção ao
  // servidor, que conta acertos e erros e paga o XP (claim_simulado)
  const terminarSimulado = useCallback(async (respostas: RespostaSimulado[]) => {
    setPhase('simuladoResultado');
    // Só agora o acerto entra na dificuldade automática: no meio da série, o
    // aviso de "você acertou X das últimas 20" entregaria a resposta
    for (const r of respostas) dificuldade.registrar(r.feedback === 'best' || r.feedback === 'correct');
    setRespostasSimulado(respostas);
    setResultadoSimulado(null);
    setErroSimulado(null);
    if (respostas.length < MINIMO_PARA_XP || !user) return;
    setCorrigindoSimulado(true);
    try {
      await Promise.all(gravacoesSimulado.current);
      const sessionId = supabaseSessionId.current ?? (sessionPromise.current ? await sessionPromise.current : null);
      if (!sessionId) throw new Error('sem_sessao');
      void supabase
        .from('training_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId)
        .then(() => undefined);
      supabaseSessionId.current = null;
      sessionPromise.current = null;

      const { data, error } = await supabase.rpc('claim_simulado', {
        _session_id: sessionId,
        _dificuldade: dificuldade.efetiva,
      });
      if (error) throw error;
      setResultadoSimulado(data as unknown as ResultadoSimulado);
      await refreshProfile();
      // Desafios do dia/semana/mês contam estas mãos
      window.dispatchEvent(new Event(EVENTO_MAO_REGISTRADA));
    } catch (e) {
      const msg = (e as { message?: string } | null)?.message ?? '';
      setErroSimulado(
        msg.includes('simulado_curto')
          ? 'Algumas mãos não chegaram ao servidor, e o XP só vale a partir de 10. A correção abaixo vale do mesmo jeito.'
          : 'Não deu para calcular o XP agora. A correção abaixo vale do mesmo jeito.',
      );
    } finally {
      setCorrigindoSimulado(false);
    }
    // App grátis: entre treinos é o lugar do anúncio de tela cheia
    if (ehApp() && !isSupporter) {
      void import('@/lib/nativo/anuncios').then(({ talvezMostrarIntersticial }) => talvezMostrarIntersticial());
    }
  }, [user, dificuldade, refreshProfile, isSupporter]);

  // Handle action
  const handleAction = useCallback((action: ActionType) => {
    if (!handState || !currentHandId) return;

    // Na lição e no duelo, mão repetida é comum (o spot é fixo) e conta do mesmo jeito
    if (isHandAlreadyPlayedState && !preset) {
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
    // Uma range só, usada para dar a nota e para desenhar o gráfico. Antes cada
    // lado calculava a sua, e o gráfico esquecia o modo de jogo, o bounty, o
    // stack efetivo e quem tinha dado o all-in — daí a tela dizer Fold e o
    // gráfico mostrar Call na mesma mão.
    const gradedRange = getRange(scenario, handState.heroPosition, effectiveStack, finalTable, gm, bm, 3, handState.villainPosition);
    const handData = gradedRange.hands.find(h => h.hand === handName);
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
    // Open Raise (e o open shove de stack curto, que é o mesmo cenário): metade
    // do ganho. É o cenário com mais fold óbvio, e rendia XP fácil (23/10/2026).
    // O simulado usa o mesmo peso no servidor (claim_simulado).
    if (scenario === 'openRaise' && feedback.points > 0) {
      feedback.points = Math.round(feedback.points * 0.5);
    }

    // XP ganho acompanha a dificuldade (mostrado no controle); perda não muda
    feedback.points = limitarPontos(ajustarPontos(feedback.points, dificuldade.efetiva));
    const pointsToAdd = isHandAlreadyPlayedState ? 0 : feedback.points;
    const isCorrect = feedback.type === 'best' || feedback.type === 'correct';

    // Lição da trilha: toda resposta conta para as estrelas, até mão repetida.
    // O XP segue a regra de sempre (mão repetida não dá ponto).
    if (licao && scenario !== 'simulation') {
      setRespostasLicao((antes) => [
        ...antes,
        {
          mao: handName,
          cenario: scenario,
          posicao: handState.heroPosition,
          stack: effectiveStack,
          suaAcao: action,
          acaoCerta: handData.primaryAction,
          feedback: feedback.type,
          evPerdido: feedback.evLoss,
        },
      ]);
    }
    // Duelo: acerto é ponto seu, erro é ponto do Rei
    if (duelo && scenario !== 'simulation') {
      setPlacar((p) => (isCorrect ? { ...p, voce: p.voce + 1 } : { ...p, rei: p.rei + 1 }));
    }

    // Simulado: nada de resposta agora. A mão vai para o banco com 0 ponto
    // (o XP sai no fim, de claim_simulado) e a próxima entra direto.
    if (emSimulado && scenario !== 'simulation') {
      const resposta: RespostaSimulado = {
        mao: handName,
        cenario: scenario,
        posicao: handState.heroPosition,
        stack: effectiveStack,
        suaAcao: action,
        acaoCerta: handData.primaryAction,
        feedback: feedback.type,
        evPerdido: feedback.evLoss,
      };
      markHandAsPlayed(currentHandId, action, 0, feedback.type);
      gravacoesSimulado.current.push(recordHand({
        hand: handName,
        scenario,
        position: handState.heroPosition,
        stack: handState.heroStack,
        userAction: action,
        correctAction: handData.primaryAction,
        feedback: feedback.type,
        points: 0,
        evLoss: feedback.evLoss,
        handCode: currentUniqueHandId,
        gameMode: gm,
        villainPosition: handState.villainPosition ?? null,
        effectiveStack,
      }));
      setHandsPlayed(prev => prev + 1);
      const todas = [...respostasSimulado, resposta];
      setRespostasSimulado(todas);
      if (todas.length >= tamanhoSimulado) void terminarSimulado(todas);
      else proximaMaoRef.current();
      return;
    }

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

      void recordHand({
        hand: handName,
        scenario,
        position: handState.heroPosition,
        stack: handState.heroStack,
        userAction: action,
        correctAction: handData.primaryAction,
        feedback: feedback.type,
        points: pointsToAdd,
        evLoss: feedback.evLoss,
        // Contexto do spot: é o que faz o ID da mão servir para alguma coisa
        // quando alguém relata um problema e manda o código.
        handCode: currentUniqueHandId,
        gameMode: gm,
        villainPosition: handState.villainPosition ?? null,
        effectiveStack,
      });
      setSessionScore(prev => prev + pointsToAdd);
      setHandsPlayed(prev => prev + 1);
      dificuldade.registrar(isCorrect);
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
      feedback,
      range: gradedRange
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
      } else if (newState.aguardandoAvanco) {
        // Ele pagou o pré-flop: mostra o call antes de o flop vir
        setPhase('transitioning');
        setTimeout(() => {
          setHandState(avancarRua(newState));
          setTimeout(() => setPhase('postflop'), 500);
        }, 1100);
      } else {
        setPhase('transitioning');
        setTimeout(() => {
          setPhase('postflop');
        }, 500);
      }
      return;
    }

    setPhase('feedback');
    // currentStackDistribution e currentUniqueHandId entram aqui porque são
    // lidos lá dentro: sem eles a função podia ficar com os valores da mão
    // anterior e gravar o stack efetivo — ou o ID — da mão errada.
  }, [handState, currentHandId, scenario, finalTable, isHandAlreadyPlayedState, trainingMode, heroBounty, currentBounties, user, handsPlayed, profile, checkAchievements, sessionScore, currentStackDistribution, currentUniqueHandId, recordHand, dificuldade.efetiva, dificuldade.registrar, emSimulado, respostasSimulado, tamanhoSimulado, terminarSimulado, licao, duelo, preset]);

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
    // Pré-flop (já com a dificuldade) + pós-flop pode passar de 30; o servidor recusa
    const totalPoints = limitarPontos(preflopPoints + postflopBonus);
    
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

    void recordHand({
      hand: handName,
      scenario,
      position: handState.heroPosition,
      stack: handState.heroStack,
      userAction: action,
      correctAction: pendingSimulationScore.handData?.primaryAction || 'fold',
      feedback: feedback.type,
      points: totalPoints,
      evLoss: feedback.evLoss,
      handCode: currentUniqueHandId,
      gameMode: getGameMode(),
      villainPosition: handState.villainPosition ?? null,
      effectiveStack: currentStackDistribution?.effectiveStack ?? handState.heroStack,
    });

    setSessionScore(prev => prev + totalPoints);
    setHandsPlayed(prev => prev + 1);
    dificuldade.registrar(isCorrect);
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

    setPendingSimulationScore(null);
  }, [pendingSimulationScore, handState, currentHandId, scenario, checkAchievements, calculatePostflopBonus, recordHand, currentStackDistribution, currentUniqueHandId, trainingMode, dificuldade.registrar]);

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
      } else if (newState.aguardandoAvanco) {
        setPhase('transitioning');
        setTimeout(() => {
          setHandState(avancarRua(newState));
          setTimeout(() => setPhase('postflop'), 500);
        }, 1100);
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
      } else if (newState.aguardandoAvanco) {
        // O vilão fechou a rua pagando ou dando check. A mão fica parada com a
        // ação e as fichas dele na mesa; só depois a carta seguinte vira.
        setTimeout(() => {
          setHandState(avancarRua(newState));
          setTimeout(() => setPhase('postflop'), 500);
        }, 1100);
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

  // Fim da lição: guarda as estrelas, fecha a sessão e mostra o resultado
  const terminarLicao = useCallback(() => {
    if (!licao) return;
    const acertos = respostasLicao.filter(acertou).length;
    const r = registrarResultado(user?.id, licao.id, acertos, respostasLicao.length);
    setFimDaLicao({ estrelas: r.estrelas, liberou: r.primeiraVez ? proximaLicao(licao.id) : null });
    encerrarSessaoNoBanco();
    setLastFeedback(null);
    setPhase('licaoResultado');
    // Mesma regra do fim de treino: tela cheia só entre treinos, e só no grátis
    if (ehApp() && !isSupporter) {
      void import('@/lib/nativo/anuncios').then(({ talvezMostrarIntersticial }) => talvezMostrarIntersticial());
    }
  }, [licao, respostasLicao, user, encerrarSessaoNoBanco, isSupporter]);

  // Next hand
  const nextHand = useCallback(() => {
    // Lição com as 10 respondidas: em vez da próxima mão, o resultado
    if (licao && respostasLicao.length >= MAOS_POR_LICAO) {
      terminarLicao();
      return;
    }
    // Mesma regra do começo da sessão: no aleatório, cada mão sorteia o modo
    const modo = modoAleatorio ? sortearModo() : (trainingMode ?? 'rangeTraining');
    const { cenario: selectedScenario, posicao: pos, stack: stk, hand, cards, stackDist, estado } =
      montarMao(modoAleatorio, modo);

    const handId = generateHandId(selectedScenario, pos, stk, getCardsString(cards));
    const alreadyPlayed = isHandAlreadyPlayed(handId);
    const previousResult = alreadyPlayed ? getPlayedHandData(handId) : null;

    if (modoAleatorio) {
      setTrainingMode(modo);
      // Bounty é sempre ICM, e no aleatório o modo muda a cada mão
      setFinalTable(modo === 'bounty');
    }
    if (selectedScenario !== scenario) {
      setScenario(selectedScenario);
    }

    // Regenerate bounties
    if (modo === 'bounty') {
      const bounties = generateBounties(modo);
      bounties[pos] = heroBounty;
      setCurrentBounties(bounties);
    }

    setCurrentStackDistribution(stackDist);
    setHandState({
      ...estado,
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
  }, [montarMao, scenario, trainingMode, modoAleatorio, heroBounty, licao, respostasLicao.length, terminarLicao]);
  proximaMaoRef.current = nextHand;

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
      // Mesmos parâmetros da nota. Sem eles o favorito guardava outra jogada
      // certa e, na revisão, mostrava um gráfico de outro spot.
      const gm = getGameMode();
      const bm = getBountyMultiplier();
      const effectiveStack = currentStackDistribution?.effectiveStack || handState.heroStack;
      const handData = getHandData(handName, scenario, handState.heroPosition, effectiveStack, finalTable, gm, bm, handState.villainPosition);
      addFavoriteHand({
        hand: handName,
        scenario,
        position: handState.heroPosition,
        stack: effectiveStack,
        finalTable,
        gameMode: gm,
        bountyMultiplier: bm,
        villainPosition: handState.villainPosition,
        correctAction: handData?.primaryAction || 'fold',
      });
      setIsCurrentHandFavorited(true);
      toast({
        title: 'Adicionado aos favoritos!',
        description: `${handName} em ${handState.heroPosition} foi salvo.`,
      });
    }
  }, [handState, scenario, finalTable, isCurrentHandFavorited, currentStackDistribution, trainingMode, currentBounties, heroBounty]);

  // End session
  const endSession = useCallback(() => {
    // Simulado encerrado antes do fim: corrige o que foi jogado
    if (emSimulado && respostasSimulado.length > 0) {
      endCurrentSession();
      void terminarSimulado(respostasSimulado);
      return;
    }
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

    // Close the Supabase session (stats are maintained server-side)
    if (user && supabaseSessionId.current) {
      supabase
        .from('training_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', supabaseSessionId.current)
        .then(({ error }) => {
          if (error) console.error('Error ending session:', error);
        });
      supabaseSessionId.current = null;
      sessionPromise.current = null;
    }

    // App grátis: anúncio de tela cheia só entre treinos, nunca no meio de uma
    // mão. A frequência (1 a cada 3 treinos, 4 min de intervalo) fica no módulo.
    if (ehApp() && !isSupporter && handsPlayed > 0) {
      void import('@/lib/nativo/anuncios').then(({ talvezMostrarIntersticial }) => talvezMostrarIntersticial());
    }

    // O aleatório não passa pela configuração, então não há para onde voltar
    // a não ser a escolha de modo.
    setPhase(modoAleatorio ? 'modeSelect' : 'config');
    setHandState(null);
    setLastFeedback(null);
    setCurrentHandId(null);
    setCurrentUniqueHandId(null);
    setIsHandAlreadyPlayedState(false);
    setPreviousHandResult(null);
    setCurrentStreak(0);
    setSessionBestCount(0);
  }, [user, handsPlayed, correctHandsCount, sessionScore, sessionBestCount, checkAchievements, modoAleatorio, isSupporter, emSimulado, respostasSimulado, terminarSimulado]);

  // Clear played hands session
  const handleClearSession = useCallback(() => {
    clearPlayedHandsSession();
    toast({
      title: "Sessão limpa!",
      description: "Todas as mãos podem ser jogadas novamente para ganhar pontos."
    });
  }, []);

  // Get invalid positions for current scenario
  const getInvalidPositions = (sc: Scenario): Position[] =>
    posicoesInvalidas(sc, trainingMode, simulacaoMultiway);

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
    const nome = (() => {
      switch (trainingMode) {
        case 'rangeTraining': return 'Treino de Range';
        case 'hu': return 'HU (1x1)';
        case 'threeHand': return 'Three Hand (1x1x1)';
        case 'bounty': return 'Modo Bounty';
        default: return '';
      }
    })();
    // No aleatório o nome sozinho enganaria: dá a entender que a sessão inteira
    // é daquele modo, quando ele vale só para a mão que está na tela.
    return modoAleatorio && nome ? `Aleatório · ${nome}` : nome;
  };

  // Fim da lição da trilha
  if (licao && phase === 'licaoResultado' && fimDaLicao) {
    return (
      <MainLayout>
        <LicaoResultado
          licao={licao}
          respostas={respostasLicao}
          estrelas={fimDaLicao.estrelas}
          liberou={fimDaLicao.liberou}
          xp={sessionScore}
          onContinuar={() => navigate('/trilha')}
          onRepetir={() => setLicaoPendente(licao.id)}
        />
      </MainLayout>
    );
  }

  // Lição pedida e mesa ainda montando: sem piscar a escolha de modo
  if (preset && (phase === 'modeSelect' || phase === 'config')) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Montando a lição">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Fim do simulado: correção e XP
  if (phase === 'simuladoResultado') {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
          <SimuladoResultado
            respostas={respostasSimulado}
            resultado={resultadoSimulado}
            corrigindo={corrigindoSimulado}
            erro={erroSimulado}
            onNovo={() => startGame()}
            onSair={() => setPhase('config')}
          />
        </div>
      </MainLayout>
    );
  }

  // Mode selection phase
  if (phase === 'modeSelect') {
    return (
      <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
                <Zap className="h-8 w-8 text-primary" />
                Treinar
              </h1>
              <p className="text-body-sm text-muted-foreground mt-1">
                Escolha como jogar. A dificuldade acompanha o seu acerto.
              </p>
            </div>
            <DificuldadeControle preferencia={dificuldade.preferencia} nivel={dificuldade.nivel} acertosNaJanela={dificuldade.acertosNaJanela} maosNaJanela={dificuldade.maosNaJanela} onMudar={dificuldade.mudarPreferencia} ocultarAcertos={emSimulado} />
          </div>
          <div className="mb-6">
            <DailyChallengesCard compacto />
          </div>
          <TrainingModeSelector
            onSelect={(m) => {
              setFormato('livre');
              handleModeSelect(m);
            }}
            onSimulado={() => {
              setFormato('simulado');
              handleModeSelect('rangeTraining');
            }}
            bloqueado={modoBloqueado}
          />
        </div>
        {needsOnboarding && !semIntro && <OnboardingTutorial onComplete={completeOnboarding} />}
        {!needsOnboarding && needsLevelTest && !semIntro && <LevelTest onComplete={completeLevelTest} onClose={completeLevelTest} />}

      </MainLayout>
    );
  }

  // Config phase
  if (phase === 'config') {
    const availableScenarios = getAvailableScenarios();
    const availablePositions = getAvailablePositions();
    const escolherFormato = (f: Formato) => {
      setFormato(f);
      // A Simulação não entra no simulado: troca por um cenário que entra
      if (f === 'simulado' && CENARIOS_FORA_DO_SIMULADO.includes(scenario)) handleScenarioChange('openRaise');
    };
    const nomeCenario = SCENARIOS.find(s => s.id === scenario)?.label;
    const resumo = [
      randomScenario ? 'Cenário aleatório' : nomeCenario,
      randomPosition ? 'posição aleatória' : selectedPositions.join(', '),
      randomStack ? 'stack aleatório' : `${selectedStacks.join(', ')} BB`,
      ...(trainingMode === 'bounty' ? [`bounty $${heroBounty}`] : []),
      ...(finalTable && trainingMode !== 'bounty' ? ['mesa final'] : []),
    ].join(' · ');

    return <MainLayout>
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
          {/* Topo: voltar, mesa escolhida e dificuldade */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPhase('modeSelect')} className="gap-1 text-muted-foreground -ml-2">
              <ArrowLeft className="h-4 w-4" />
              Mesas
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium">
              {trainingMode && <ModeIcon mode={trainingMode} className="h-4 w-4" />}
              {getModeLabel()}
            </span>
            <div className="ml-auto">
              <DificuldadeControle preferencia={dificuldade.preferencia} nivel={dificuldade.nivel} acertosNaJanela={dificuldade.acertosNaJanela} maosNaJanela={dificuldade.maosNaJanela} onMudar={dificuldade.mudarPreferencia} ocultarAcertos={emSimulado} />
            </div>
          </div>

          <h1 className="text-heading-md sm:text-heading-lg text-foreground">Monte seu treino</h1>
          <p className="text-body-sm text-muted-foreground mt-1 mb-6">Escolha o formato e o que treinar. Dá para marcar mais de uma posição e stack.</p>

          <div className="space-y-4">
            {/* Formato */}
            <Secao titulo="Formato">
              <div role="radiogroup" aria-label="Formato do treino" className="grid gap-3 sm:grid-cols-2">
                <OpcaoGrande
                  ativo={!emSimulado}
                  onClick={() => escolherFormato('livre')}
                  icone={<Zap className="h-5 w-5" />}
                  titulo="Treino livre"
                  descricao="Resposta e explicação depois de cada mão. Joga quanto quiser."
                />
                <OpcaoGrande
                  ativo={emSimulado}
                  onClick={() => escolherFormato('simulado')}
                  icone={<ClipboardCheck className="h-5 w-5" />}
                  titulo="Simulado"
                  selo="Novo"
                  descricao="Uma série sem resposta. A correção e o XP vêm no fim."
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {TAMANHOS_SIMULADO.map(t => (
                      <Chip key={t} ativo={tamanhoSimulado === t} onClick={() => setTamanhoSimulado(t)}>
                        {t} mãos
                      </Chip>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{REGRA_DO_XP}</p>
                </OpcaoGrande>
              </div>
            </Secao>

            {/* Bounty (só no modo bounty) */}
            {trainingMode === 'bounty' && (
              <BountyConfig selectedBounty={heroBounty} onBountyChange={setHeroBounty} />
            )}

            {/* Cenário */}
            <Secao titulo="Cenário" ajuda={emSimulado ? 'A Simulação (pós-flop) fica fora do simulado.' : undefined}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setRandomScenario(true)}
                  aria-pressed={randomScenario}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    randomScenario ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:border-primary/40',
                  )}
                >
                  <Shuffle className={cn('h-4 w-4 shrink-0', randomScenario ? 'text-primary' : 'text-muted-foreground')} />
                  <span>
                    <span className="block text-sm font-semibold">Aleatório</span>
                    <span className="block text-[11px] leading-tight text-muted-foreground">Um diferente a cada mão</span>
                  </span>
                </button>
                {SCENARIOS.filter(s => availableScenarios.includes(s.id)).map(s => {
                  const travado = cenarioBloqueado(s.id);
                  const fora = emSimulado && CENARIOS_FORA_DO_SIMULADO.includes(s.id);
                  const ativo = !randomScenario && scenario === s.id && !travado && !fora;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={ativo}
                      disabled={fora}
                      onClick={() => {
                        // Cadeado leva para o apoio em vez de só não responder
                        if (travado) return navigate('/apoiar');
                        setRandomScenario(false);
                        handleScenarioChange(s.id);
                      }}
                      className={cn(
                        'relative rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        ativo ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:border-primary/40',
                        fora && 'cursor-not-allowed opacity-40 hover:border-border',
                      )}
                    >
                      {travado && <Lock className="absolute right-2.5 top-2.5 h-3 w-3 text-primary" aria-label="Para apoiadores" />}
                      <span className="block text-sm font-semibold">{s.label}</span>
                      <span className="block text-[11px] leading-tight text-muted-foreground">
                        {travado ? 'Para apoiadores' : fora ? 'Fora do simulado' : s.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Multiway só existe na Simulação: é o único cenário que joga
                  o pós-flop, e é lá que ter um terceiro muda a decisão. */}
              {scenario === 'simulation' && !randomScenario && !emSimulado && !cenarioBloqueado('simulation') && availablePositions.length >= 3 && (
                <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/40 p-3">
                  <div>
                    <Label htmlFor="sim-multiway" className="text-sm font-medium">Pote multiway</Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Um terceiro jogador paga a abertura e vai ao flop com vocês. Ele pode
                      desistir no meio do caminho — e pode ganhar a mão no showdown.
                    </p>
                  </div>
                  <Switch id="sim-multiway" checked={simulacaoMultiway} onCheckedChange={setSimulacaoMultiway} />
                </div>
              )}
            </Secao>

            {/* Posição */}
            <Secao titulo="Posição">
              <div className="flex flex-wrap gap-2">
                <Chip ativo={randomPosition} onClick={() => setRandomPosition(!randomPosition)}>
                  <Shuffle className="h-3.5 w-3.5" /> Aleatória
                </Chip>
                {availablePositions.map(pos => {
                  const invalida = invalidPositions.includes(pos);
                  return (
                    <Chip
                      key={pos}
                      ativo={!randomPosition && selectedPositions.includes(pos) && !invalida}
                      desabilitado={invalida}
                      titulo={invalida ? 'Não existe neste cenário' : undefined}
                      className="min-w-[3.5rem]"
                      onClick={() => {
                        if (randomPosition) {
                          setRandomPosition(false);
                          setSelectedPositions([pos]);
                        } else togglePosition(pos);
                      }}
                    >
                      {pos}
                    </Chip>
                  );
                })}
              </div>
            </Secao>

            {/* Stack */}
            <Secao titulo="Stack (BB)">
              <div className="flex flex-wrap gap-2">
                <Chip ativo={randomStack} onClick={() => setRandomStack(!randomStack)}>
                  <Shuffle className="h-3.5 w-3.5" /> Aleatório
                </Chip>
                {STACK_SIZES.map(stk => (
                  <Chip
                    key={stk}
                    ativo={!randomStack && selectedStacks.includes(stk)}
                    className="min-w-[3rem] tabular-nums"
                    onClick={() => {
                      if (randomStack) {
                        setRandomStack(false);
                        setSelectedStacks([stk]);
                      } else toggleStack(stk);
                    }}
                  >
                    {stk}
                  </Chip>
                ))}
              </div>
            </Secao>

            {/* Mais opções */}
            <Secao titulo="Mais opções">
              <div className="divide-y divide-border">
                {trainingMode !== 'bounty' && (
                  <div className="flex items-center justify-between gap-4 pb-3">
                    <div>
                      <Label htmlFor="mesa-final" className="text-sm font-medium">Mesa final</Label>
                      <p className="text-xs text-muted-foreground">Ajustes de ICM de mesa final</p>
                    </div>
                    <Switch id="mesa-final" checked={finalTable} onCheckedChange={setFinalTable} />
                  </div>
                )}
                <div className={cn('flex items-center justify-between gap-4', trainingMode !== 'bounty' && 'pt-3')}>
                  <div>
                    <p className="text-sm font-medium">Mãos já jogadas</p>
                    <p className="text-xs text-muted-foreground">Mão repetida não vale ponto. Limpe para jogá-las de novo valendo.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearSession} className="shrink-0 gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Limpar
                  </Button>
                </div>
              </div>
            </Secao>
          </div>

          {/* Barra fixa: o resumo e o botão ficam sempre à mão */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{emSimulado ? `Simulado de ${tamanhoSimulado} mãos` : 'Treino livre'}</span>
                {' · '}
                {resumo}
              </p>
              <Button onClick={() => startGame()} size="lg" className="h-12 px-8 text-base font-bold bg-primary text-primary-foreground hover:bg-primary/90 glow-gold">
                <Play className="h-5 w-5" />
                {emSimulado ? 'Começar simulado' : 'Jogar'}
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>;
  }

  // Playing/feedback phase
  // A Simulação (pós-flop) tem fluxo próprio depois da nota: lá fica o quadro de sempre
  const reiNaMao = comentarioDoRei && scenario !== 'simulation';
  return <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col sm:block">
        {licao ? (
          // Lição: sair, o nome dela e quantas das 10 já foram. Ponto e
          // dificuldade ficam de fora para a tela ser só a mão.
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => {
                encerrarSessaoNoBanco();
                navigate('/trilha');
              }}
              aria-label="Sair da lição e voltar à trilha"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{licao.titulo}</p>
              {/* Barra própria: o trilho do Progress é azul e parecia cheio já no 0/10 */}
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${(100 * Math.min(respostasLicao.length, MAOS_POR_LICAO)) / MAOS_POR_LICAO}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums" aria-label={`${respostasLicao.length} de ${MAOS_POR_LICAO} mãos`}>
              {Math.min(respostasLicao.length, MAOS_POR_LICAO)}/{MAOS_POR_LICAO}
            </span>
          </div>
        ) : duelo ? (
          // Duelo: placar Você x Rei, que conta toda resposta (até mão repetida)
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => {
                encerrarSessaoNoBanco();
                if (placar.voce + placar.rei > 0) {
                  toast({ title: `Duelo encerrado: Você ${placar.voce} x ${placar.rei} Rei` });
                }
                navigate('/duelo');
              }}
              aria-label="Encerrar o duelo"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duelo · {duelo.titulo}</p>
              <p className="mt-0.5 flex items-center gap-2 text-lg font-bold tabular-nums" aria-live="polite">
                <span>Você {placar.voce}</span>
                <span className="text-muted-foreground" aria-hidden="true">×</span>
                <span>{placar.rei} Rei</span>
              </p>
            </div>
            <img src="/mascote/rei-avatar.webp" alt="" aria-hidden="true" width={192} height={256} className="h-11 w-auto shrink-0" />
          </div>
        ) : (
        <>
        {/* Header with session info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {emSimulado ? (
              // No simulado não aparece ponto nem acerto: só em que mão está
              <div className="flex items-center gap-3">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <span className="font-bold text-lg tabular-nums">
                  Mão {Math.min(respostasSimulado.length + 1, tamanhoSimulado)} de {tamanhoSimulado}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-bold text-lg">{sessionScore} pts</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Target className="h-4 w-4" />
                  <span>{handsPlayed} mãos</span>
                </div>
              </>
            )}
            {trainingMode && (
              <span className="text-body-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">{getModeLabel()}</span>
            )}
            <DificuldadeControle preferencia={dificuldade.preferencia} nivel={dificuldade.nivel} acertosNaJanela={dificuldade.acertosNaJanela} maosNaJanela={dificuldade.maosNaJanela} onMudar={dificuldade.mudarPreferencia} ocultarAcertos={emSimulado} />
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

        {/* Progress bar: no simulado, quantas mãos já foram; no livre, os pontos da sessão */}
        <div className="mb-6">
          <Progress
            value={emSimulado ? (100 * respostasSimulado.length) / tamanhoSimulado : Math.max(0, Math.min(100, sessionScore / 10))}
            className="h-2"
          />
        </div>
        </>
        )}

        {/* Already played warning */}
        {isHandAlreadyPlayedState && phase === 'playing' && !emSimulado && !preset && <div className="mb-4 p-3 rounded-lg bg-primary/20 border border-primary/30 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-primary font-medium">
                Mão já jogada nesta sessão
              </p>
              <p className="text-xs text-primary">
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
        {/* Game content */}
        {handState && <div className="flex flex-col flex-1 sm:flex-none sm:space-y-4">
            {/* Table centered */}
            <div className="flex-1 flex flex-col justify-center sm:flex-none sm:block">
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
              lastVillainAction={handState.lastVillainAction}
              villainCardsRevealed={handState.villainCardsRevealed}
              villainMucked={handState.villainMucked}
              extraOpponents={handState.extraOpponents}
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
            </div>{/* end centering wrapper */}

            {/* Hand info compact - between table and actions */}
            <Card className="mt-1 sm:mt-4">
              <CardContent className="p-1.5 sm:p-3">
                <div className="flex items-center justify-between gap-1">
                  <div className="grid grid-cols-4 gap-0.5 sm:flex sm:items-center sm:gap-4 flex-1">
                    <div className="text-center">
                      <p className="text-[9px] sm:text-xs text-muted-foreground leading-none">Pos</p>
                      <p className="text-xs sm:text-lg font-semibold leading-tight">{handState.heroPosition}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] sm:text-xs text-muted-foreground leading-none">Stack</p>
                      <p className="text-xs sm:text-lg font-semibold leading-tight">{handState.heroStack}<span className="text-[9px] sm:text-xs text-muted-foreground">BB</span></p>
                    </div>
                    {currentStackDistribution && currentStackDistribution.effectiveStack !== handState.heroStack ? (
                      <div className="text-center">
                        <p className="text-[9px] sm:text-xs text-muted-foreground leading-none">Efetivo</p>
                        <p className="text-xs sm:text-lg font-semibold text-secondary leading-tight">{currentStackDistribution.effectiveStack}<span className="text-[9px] sm:text-xs text-muted-foreground">BB</span></p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-[9px] sm:text-xs text-muted-foreground leading-none">Pot</p>
                        <p className="text-xs sm:text-lg font-semibold text-primary leading-tight">{handState.pot.toFixed(1)}<span className="text-[9px] sm:text-xs text-muted-foreground">BB</span></p>
                      </div>
                    )}
                    <div className="text-center min-w-0">
                      <p className="text-[9px] sm:text-xs text-muted-foreground leading-none">Cenário</p>
                      <p className="text-[10px] sm:text-sm font-medium leading-tight truncate">
                        {SCENARIOS.find(s => s.id === scenario)?.label}
                      </p>
                    </div>
                  </div>

                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="p-1.5 rounded-full hover:bg-muted transition-colors" aria-label="Informações da mão">
                        <Info className="h-5 w-5 text-primary" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-3" side="bottom" align="end">
                      {currentUniqueHandId && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-muted-foreground">ID</span>
                          <span className="text-xs font-mono text-foreground select-all">{currentUniqueHandId}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Street</span>
                        <span className="text-sm font-medium capitalize">{handState.street}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getScenarioDescription(scenario, handState.heroPosition, handState.villainPosition, handState.villainAction)}
                      </div>
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
                      {scenario !== 'openRaise' && handState.actions.length > 0 && (
                        <ActionHistory actions={handState.actions} street={handState.street} heroPosition={handState.heroPosition} />
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            {phase === 'playing' && (
              <>
                {/* Cartas do herói com faixa própria (py e shrink-0): sem folga, em
                    tela baixa ou com fonte grande do sistema, elas subiam na barra de
                    informações e desciam nos botões */}
                {handState.heroCards && handState.heroCards.length > 0 && (
                  <div className="flex shrink-0 justify-center py-2.5 sm:py-0">
                    <HandDisplay cards={handState.heroCards} size="sm" className="sm:hidden" />
                    <HandDisplay cards={handState.heroCards} size="md" className="hidden sm:flex" />
                  </div>
                )}
                <div className="shrink-0">
                  <ActionButtons onAction={handleAction} pot={handState.pot} stack={handState.heroStack} toCall={handState.villainAction?.amount} disabled={false} showRaiseSlider={false} scenario={scenario} />
                </div>
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
                    {/* Num pote de três, saber quantos ainda estão na mão muda a decisão */}
                    {handState.extraOpponents?.some(o => !o.folded) && (
                      <span className="text-primary">
                        <strong>{1 + handState.extraOpponents.filter(o => !o.folded).length} adversários</strong>
                      </span>
                    )}
                    <span>Pot: <strong className="text-primary">{handState.pot.toFixed(1)} BB</strong></span>
                  </div>
                </div>

                {/* Tamanho da aposta: régua colada na barra de ação, como nas salas */}
                <div className="flex items-center justify-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
                  {[
                    { label: '33%', value: 0.33 },
                    { label: '50%', value: 0.5 },
                    { label: '75%', value: 0.75 },
                    { label: 'Pot', value: 1.0 },
                  ].map(size => {
                    const betAmount = Math.min(
                      Math.round(handState.pot * size.value * 10) / 10,
                      Math.min(handState.heroStack, handState.villainStack || handState.heroStack)
                    );
                    const ativo = selectedBetSize === size.value;
                    return (
                      <button
                        key={size.label}
                        type="button"
                        onClick={() => setSelectedBetSize(size.value)}
                        aria-pressed={ativo}
                        aria-label={`${size.label} do pote, ${betAmount.toFixed(1)} BB`}
                        className={cn(
                          'flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          ativo
                            ? 'bg-primary text-primary-foreground shadow'
                            : 'text-muted-foreground hover:bg-background hover:text-foreground'
                        )}
                      >
                        {size.label}
                      </button>
                    );
                  })}
                  <span className="ml-1 min-w-[4rem] px-2 text-right text-sm font-bold tabular-nums text-primary">
                    {Math.min(
                      Math.round(handState.pot * selectedBetSize * 10) / 10,
                      Math.min(handState.heroStack, handState.villainStack || handState.heroStack)
                    ).toFixed(1)} BB
                  </span>
                </div>

                {/* Action buttons - adapt based on whether facing a villain bet */}
                <PostflopActions
                  toCall={handState.awaitingPostflopAction && handState.villainAction ? handState.villainAction.amount : 0}
                  betAmount={Math.min(
                    Math.round(handState.pot * selectedBetSize * 10) / 10,
                    Math.min(handState.heroStack, handState.villainStack || handState.heroStack)
                  )}
                  heroStack={handState.heroStack}
                  onAction={handlePostflopAction}
                />
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
                                        // O stack aqui é só o rótulo do cabeçalho: tem de ser o
                                        // mesmo da range que deu a nota, senão o gráfico diz
                                        // estar mostrando um spot e mostra outro.
                                        onClick={() => setSummaryRangeViewer({ open: true, stack: currentStackDistribution?.effectiveStack || handState.heroStack })}
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
                    gameMode={getGameMode()}
                    bountyMultiplier={getBountyMultiplier()}
                    villainPosition={handState.villainPosition}
                    range={lastFeedback.range}
                    heroHand={lastFeedback.handData?.hand || ''}
                    heroAction={lastFeedback.userAction}
                  />
                )}
              </>
            )}
            
            {/* Review mode - show hero cards, feedback summary, and next hand button */}
            {phase === 'review' && (
              <div className="space-y-3 mt-2">
                {/* Hero cards in review */}
                {handState.heroCards && handState.heroCards.length > 0 && !handState.isSimulation && (
                  <div className="flex justify-center">
                    <HandDisplay cards={handState.heroCards} size="sm" className="sm:hidden" />
                    <HandDisplay cards={handState.heroCards} size="md" className="hidden sm:flex" />
                  </div>
                )}

                {/* Feedback summary for non-simulation review */}
                {!handState.isSimulation && lastFeedback && lastFeedback.handData && (
                  <Card className={cn(
                    'border-2',
                    (lastFeedback.feedback.type === 'best' || lastFeedback.feedback.type === 'correct')
                      ? 'border-feedback-best bg-feedback-best/10'
                      : lastFeedback.feedback.type === 'inaccuracy'
                      ? 'border-feedback-inaccuracy bg-feedback-inaccuracy/10'
                      : 'border-feedback-blunder bg-feedback-blunder/10'
                  )}>
                    <CardContent className="p-4 space-y-3">
                      {/* Action comparison */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className={cn(
                          'p-2 rounded-lg text-center border',
                          (lastFeedback.feedback.type === 'best' || lastFeedback.feedback.type === 'correct')
                            ? 'border-feedback-best/50 bg-feedback-best/10'
                            : 'border-feedback-blunder/50 bg-feedback-blunder/10'
                        )}>
                          <p className="text-xs text-muted-foreground">Sua Jogada</p>
                          <p className="font-bold capitalize">
                            {lastFeedback.userAction === 'allin' ? 'All-in' : lastFeedback.userAction === 'call' && scenario === 'openRaise' ? 'Limp' : lastFeedback.userAction.charAt(0).toUpperCase() + lastFeedback.userAction.slice(1)}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg text-center border border-primary/50 bg-primary/10">
                          <p className="text-xs text-muted-foreground">Jogada GTO</p>
                          <p className="font-bold capitalize">
                            {lastFeedback.handData.primaryAction === 'allin' ? 'All-in' : lastFeedback.handData.primaryAction === 'call' && scenario === 'openRaise' ? 'Limp' : lastFeedback.handData.primaryAction.charAt(0).toUpperCase() + lastFeedback.handData.primaryAction.slice(1)}
                          </p>
                        </div>
                      </div>
                      {/* Points */}
                      <div className="text-center">
                        <span className={cn(
                          'text-lg font-bold',
                          lastFeedback.feedback.points >= 0 ? 'text-feedback-best' : 'text-feedback-blunder'
                        )}>
                          {lastFeedback.feedback.points > 0 ? '+' : ''}{lastFeedback.feedback.points} pts
                        </span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {lastFeedback.feedback.message}
                        </span>
                      </div>
                      {/* GTO Frequencies */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Frequências GTO:</p>
                        {(['allin', 'raise', 'call', 'fold'] as ActionType[]).map(actionType => {
                          const found = lastFeedback.handData!.actions.find(a => a.action === actionType);
                          const freq = found?.frequency || 0;
                          if (freq === 0) return null;
                          return (
                            <div key={actionType} className="flex items-center gap-2">
                              <span className="text-xs w-12 capitalize">
                                {actionType === 'allin' ? 'All-in' : actionType === 'call' && scenario === 'openRaise' ? 'Limp' : actionType.charAt(0).toUpperCase() + actionType.slice(1)}
                              </span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    actionType === 'fold' && 'bg-muted-foreground',
                                    actionType === 'call' && 'bg-secondary',
                                    actionType === 'raise' && 'bg-poker-raise',
                                    actionType === 'allin' && 'bg-poker-allin'
                                  )}
                                  style={{ width: `${freq}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8 text-right">{freq}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-center gap-4">
                  <Button
                    onClick={nextHand}
                    size="lg"
                    className="px-8 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Próxima Mão
                  </Button>
                </div>
              </div>
            )}
          </div>}

        {/* Feedback modal */}
        {/* App: o Rei comenta a mão; o quadro completo abre por cima em Ver range */}
        {reiNaMao && lastFeedback && lastFeedback.handData && handState && phase === 'feedback' && !detalhesAbertos && (
          <ReiComenta
            explicacao={explicarJogada({
              mao: lastFeedback.handData.hand,
              posicao: handState.heroPosition,
              stack: currentStackDistribution?.effectiveStack || handState.heroStack,
              cenario: scenario,
              suaAcao: lastFeedback.userAction,
              handData: lastFeedback.handData,
              range: lastFeedback.range,
              tipo: lastFeedback.feedback.type,
              evPerdido: lastFeedback.feedback.evLoss,
            })}
            pontos={isHandAlreadyPlayedState ? null : lastFeedback.feedback.points}
            onProxima={nextHand}
            onDetalhes={() => setDetalhesAbertos(true)}
          />
        )}
        {lastFeedback && lastFeedback.handData && handState && <DecisionFeedback open={phase === 'feedback' && (!reiNaMao || detalhesAbertos)} onClose={reiNaMao ? () => setDetalhesAbertos(false) : handleFeedbackClose} onNextHand={nextHand} userAction={lastFeedback.userAction} handData={lastFeedback.handData} feedback={lastFeedback.feedback} sessionScore={sessionScore} handsPlayed={handsPlayed} scenario={scenario} position={handState.heroPosition} stack={currentStackDistribution?.effectiveStack || handState.heroStack} finalTable={finalTable} gameMode={getGameMode()} bountyMultiplier={getBountyMultiplier()} villainPosition={handState.villainPosition} range={lastFeedback.range} alreadyPlayed={isHandAlreadyPlayedState} isSimulation={scenario === 'simulation'} uniqueHandId={currentUniqueHandId || undefined} previousResult={previousHandResult ? {
        action: previousHandResult.action,
        feedback: previousHandResult.feedback as any,
        points: previousHandResult.points
      } : undefined} />}
      {needsOnboarding && !semIntro && <OnboardingTutorial onComplete={completeOnboarding} />}
      {!needsOnboarding && needsLevelTest && !semIntro && <LevelTest onComplete={completeLevelTest} onClose={completeLevelTest} />}

      </div>
    </MainLayout>;
}
