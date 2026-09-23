// GTORei - Sistema de Estado da Mão
// Gerencia o fluxo completo de uma mão de poker

import { ActionType, Position, Scenario, POSITIONS, RANKS, getHandData } from './gtoRanges';
import { CardType } from '@/components/poker/PlayingCard';
import { compareHands, evaluateHand, HandEvaluation } from './handEvaluator';
import { makeVillainPostflopDecision, makeVillainPreflopDecision, VillainDecision, VillainMemory, createVillainMemory, updateMemory } from './villainGTO';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface ActionEntry {
  position: Position;
  action: string;
  amount?: number;
  isHero?: boolean;
}

export interface HandState {
  street: Street;
  pot: number;
  communityCards: CardType[];
  actions: ActionEntry[];
  heroPosition: Position;
  heroCards: CardType[];
  heroStack: number;
  villainPosition?: Position;
  villainCards?: CardType[];
  villainStack?: number;
  villainAction?: { action: string; amount: number };
  foldedPositions: Position[];
  activeBets: { position: Position; amount: number }[];
  isHandComplete: boolean;
  result?: 'hero_wins' | 'villain_wins' | 'tie';
  heroEval?: HandEvaluation;
  villainEval?: HandEvaluation;
  isSimulation?: boolean;
  awaitingPostflopAction?: boolean;
  lastVillainAction?: string;
  villainMemory?: VillainMemory;
  /**
   * Adversários além do principal, só na simulação multiway.
   *
   * O que eles fazem e o que não fazem: eles pagam ou desistem no fim de cada
   * rua, contra o maior valor que entrou nela, e vão ao showdown se chegarem
   * lá. Não abrem aposta nem aumentam — quem faz isso é o adversário principal.
   * É uma simplificação assumida: ela deixa o pote, as desistências no meio do
   * caminho e o showdown de três reais, sem reescrever a rodada de apostas.
   */
  extraOpponents?: ExtraOpponent[];
  /** Maior valor que um jogador precisa pagar para seguir na rua atual */
  apostaDaRua?: number;
  /** Quem levou o pote, quando não foi o herói */
  showdownWinner?: Position;
}

export interface ExtraOpponent {
  position: Position;
  cards: CardType[];
  stack: number;
  folded: boolean;
  eval?: HandEvaluation;
}

// Gerar um deck completo
function generateDeck(): CardType[] {
  const suits: Array<'s' | 'h' | 'd' | 'c'> = ['s', 'h', 'd', 'c'];
  const deck: CardType[] = [];
  
  for (const rank of RANKS) {
    for (const suit of suits) {
      deck.push({ rank, suit });
    }
  }
  
  return deck;
}

// Embaralhar array
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Determinar posição do villain baseado no cenário
// IMPORTANTE: Respeita a ordem de ação pré-flop:
// UTG -> UTG1 -> LJ -> HJ -> CO -> BTN -> SB -> BB
// "Antes" = age antes (índice menor), "Depois" = age depois (índice maior)
/** Posições que podem abrir deixando pelo menos um pagador entre elas e o herói */
function aberturasComEspacoParaPagador(positionOrder: Position[], heroIndex: number): Position[] {
  return positionOrder.filter((_, i) => {
    if (i >= heroIndex) return false;
    return positionOrder.some((p, j) => j > i && j < heroIndex && p !== 'SB' && p !== 'BB');
  });
}

export function getVillainPosition(
  scenario: Scenario,
  heroPosition: Position,
  availablePositions?: Position[],
  precisaDePagador = false
): Position | undefined {
  const positionOrder = availablePositions || POSITIONS;
  const heroIndex = positionOrder.indexOf(heroPosition);

  switch (scenario) {
    case 'vsOpenRaise':
    case 'simulation': {
      // Villain abriu de uma posição que age ANTES do herói (índice menor)
      // Se herói é UTG (índice 0), NÃO há ninguém que age antes — cenário impossível
      const earlierPositions = positionOrder.filter((_, i) => i < heroIndex);
      if (earlierPositions.length === 0) {
        return undefined; // Cenário impossível para esta posição
      }
      // Na simulação multiway quem abre precisa deixar lugar para um pagador,
      // senão o pote chega ao flop com dois jogadores e não com três.
      if (precisaDePagador) {
        const comEspaco = aberturasComEspacoParaPagador(positionOrder, heroIndex);
        if (comEspaco.length > 0) {
          return comEspaco[Math.floor(Math.random() * comEspaco.length)];
        }
      }
      return earlierPositions[Math.floor(Math.random() * earlierPositions.length)];
    }
      
    case 'vs3bet': {
      // Herói abriu, villain 3-betou de uma posição que age DEPOIS (índice maior)
      // Se herói é BB (último), NÃO há ninguém depois — cenário impossível
      const laterPositions = positionOrder.filter((_, i) => i > heroIndex);
      if (laterPositions.length === 0) {
        return undefined; // Cenário impossível para esta posição
      }
      return laterPositions[Math.floor(Math.random() * laterPositions.length)];
    }
      
    case 'vsOpenShove': {
      // Villain shovou de uma posição que age ANTES do herói (índice menor)
      const priorPositions = positionOrder.filter((_, i) => i < heroIndex);
      if (priorPositions.length === 0) {
        return undefined; // Cenário impossível para esta posição
      }
      return priorPositions[Math.floor(Math.random() * priorPositions.length)];
    }
    
    case 'multiway': {
      // Pote multiway precisa de quem abriu E de quem pagou. Sortear qualquer
      // posição anterior não basta: se quem abre está logo na frente do herói,
      // não sobra ninguém para pagar e a mão vira um heads-up com outro nome —
      // era o que acontecia com o herói no LJ e a abertura no UTG1.
      //
      // Os blinds não entram como pagadores porque ainda não agiram: no preflop
      // eles falam depois do botão.
      const podeAbrir = aberturasComEspacoParaPagador(positionOrder, heroIndex);
      if (podeAbrir.length === 0) {
        return undefined;
      }
      return podeAbrir[Math.floor(Math.random() * podeAbrir.length)];
    }
      
    default:
      return undefined;
  }
}

// Calcular tamanho do raise baseado no cenário
export function calculateOpenSize(stack: number): number {
  // Open raise padrão: 2.5BB
  return Math.min(2.5, stack);
}

export function calculate3BetSize(openSize: number, stack: number): number {
  // 3-bet padrão: 3x o open raise
  return Math.min(openSize * 3, stack);
}

// Inicializar estado da mão para cenários VS
export function initializeHandState(
  scenario: Scenario,
  heroPosition: Position,
  heroStack: number,
  heroHand: string,
  heroCards: CardType[],
  availablePositions?: Position[],
  villainStackOverride?: number,
  /** Simulação com um terceiro jogador no pote, do flop em diante */
  multiway = false
): HandState {
  const actions: ActionEntry[] = [];
  const activeBets: { position: Position; amount: number }[] = [];
  const foldedPositions: Position[] = [];
  const extraPositions: Position[] = [];
  let pot = 1.5; // SB (0.5) + BB (1)

  // Adicionar blinds
  actions.push({ position: 'SB', action: 'post_sb', amount: 0.5 });
  actions.push({ position: 'BB', action: 'post_bb', amount: 1 });

  const querMultiway = multiway && scenario === 'simulation';
  const villainPosition = getVillainPosition(scenario, heroPosition, availablePositions, querMultiway);
  let villainAction: { action: string; amount: number } | undefined;
  let villainStack = villainStackOverride ?? heroStack;
  
  // Marcar todos entre o opener e o herói como fold
  const positionOrder = availablePositions || POSITIONS;
  const heroIndex = positionOrder.indexOf(heroPosition);
  
  if ((scenario === 'vsOpenRaise' || scenario === 'simulation') && villainPosition) {
    const villainIndex = positionOrder.indexOf(villainPosition);
    const openSize = calculateOpenSize(heroStack);
    
    // Villain abre
    actions.push({ position: villainPosition, action: 'open', amount: openSize });
    activeBets.push({ position: villainPosition, amount: openSize });
    villainAction = { action: 'Raise', amount: openSize };
    pot += openSize;

    // Na simulação multiway, um dos que estariam desistindo paga o open e vai
    // para o flop junto. É o que faz o pote ser de três em vez de dois.
    const candidatos = querMultiway
      ? positionOrder.filter((pos, i) => i > villainIndex && i < heroIndex && pos !== 'SB' && pos !== 'BB')
      : [];
    const pagador = candidatos.length > 0
      ? candidatos[Math.floor(Math.random() * candidatos.length)]
      : undefined;

    // Todos entre villain e hero foldam, menos o pagador do multiway
    for (let i = villainIndex + 1; i < heroIndex; i++) {
      const pos = positionOrder[i];
      if (pos === 'SB' || pos === 'BB') continue;
      if (pos === pagador) {
        actions.push({ position: pos, action: 'call', amount: openSize });
        activeBets.push({ position: pos, amount: openSize });
        pot += openSize;
        extraPositions.push(pos);
        continue;
      }
      actions.push({ position: pos, action: 'fold' });
      foldedPositions.push(pos);
    }
  } else if (scenario === 'vs3bet' && villainPosition) {
    const openSize = calculateOpenSize(heroStack);
    const threeBetSize = calculate3BetSize(openSize, heroStack);
    
    // Herói abre
    actions.push({ position: heroPosition, action: 'open', amount: openSize, isHero: true });
    activeBets.push({ position: heroPosition, amount: openSize });
    pot += openSize;
    
    // Todos entre herói e villain foldam
    const villainIndex = positionOrder.indexOf(villainPosition);
    for (let i = heroIndex + 1; i < villainIndex; i++) {
      const pos = positionOrder[i];
      actions.push({ position: pos, action: 'fold' });
      foldedPositions.push(pos);
    }
    
    // Villain 3-beta
    actions.push({ position: villainPosition, action: '3-bet', amount: threeBetSize });
    activeBets.push({ position: villainPosition, amount: threeBetSize });
    villainAction = { action: '3-bet', amount: threeBetSize };
    pot += threeBetSize;
  } else if (scenario === 'vsOpenShove' && villainPosition) {
    // Villain shova
    const villainShoveAmount = villainStack || heroStack;
    actions.push({ position: villainPosition, action: 'allin', amount: villainShoveAmount });
    activeBets.push({ position: villainPosition, amount: villainShoveAmount });
    villainAction = { action: 'All-in', amount: villainShoveAmount };
    pot += villainShoveAmount;
    
    // Todos entre villain e hero foldam
    const villainIndex = positionOrder.indexOf(villainPosition);
    for (let i = villainIndex + 1; i < heroIndex; i++) {
      const pos = positionOrder[i];
      if (pos !== 'SB' && pos !== 'BB') {
        actions.push({ position: pos, action: 'fold' });
        foldedPositions.push(pos);
      }
    }
  } else if (scenario === 'multiway' && villainPosition) {
    const villainIndex = positionOrder.indexOf(villainPosition);
    const openSize = calculateOpenSize(heroStack);
    
    // Villain abre
    actions.push({ position: villainPosition, action: 'open', amount: openSize });
    activeBets.push({ position: villainPosition, amount: openSize });
    villainAction = { action: 'Raise', amount: openSize };
    pot += openSize;
    
    // Adiciona 1-2 callers (multiway)
    const possibleCallers = positionOrder.filter((pos, i) => 
      i > villainIndex && i < heroIndex && pos !== 'SB' && pos !== 'BB'
    );
    const numCallers = Math.min(Math.floor(Math.random() * 2) + 1, possibleCallers.length);
    const callers = possibleCallers.slice(0, numCallers);
    
    for (let i = villainIndex + 1; i < heroIndex; i++) {
      const pos = positionOrder[i];
      if (pos !== 'SB' && pos !== 'BB') {
        if (callers.includes(pos)) {
          actions.push({ position: pos, action: 'call', amount: openSize });
          pot += openSize;
        } else {
          actions.push({ position: pos, action: 'fold' });
          foldedPositions.push(pos);
        }
      }
    }
  }
  
  // Gerar cartas do villain (serão reveladas no showdown)
  const deck = generateDeck();
  const usedCards = heroCards;
  const availableCards = deck.filter(c => 
    !usedCards.some(used => used.rank === c.rank && used.suit === c.suit)
  );
  const shuffledDeck = shuffle(availableCards);
  const villainCards = shuffledDeck.slice(0, 2);

  // Cartas dos extras saem do mesmo baralho, depois das do vilão, para não
  // existirem duas vezes na mesa
  const extraOpponents: ExtraOpponent[] = extraPositions.map((position, i) => ({
    position,
    cards: shuffledDeck.slice(2 + i * 2, 4 + i * 2),
    stack: (villainStackOverride ?? heroStack) - calculateOpenSize(heroStack),
    folded: false,
  }));

  const isSimulation = scenario === 'simulation';

  return {
    street: 'preflop',
    pot,
    communityCards: [],
    actions,
    heroPosition,
    heroCards,
    heroStack,
    villainPosition,
    villainCards,
    villainStack,
    villainAction,
    foldedPositions,
    activeBets,
    isHandComplete: false,
    isSimulation,
    awaitingPostflopAction: false,
    villainMemory: createVillainMemory(),
    extraOpponents: extraOpponents.length > 0 ? extraOpponents : undefined,
    apostaDaRua: 0,
  };
}

/** Quem ainda está na mão além do herói e do vilão principal */
function extrasAtivos(state: HandState): ExtraOpponent[] {
  return (state.extraOpponents || []).filter((o) => !o.folded);
}

/**
 * Fecha a rua para os adversários extras: cada um paga o que entrou nela ou
 * desiste. Roda uma vez por rua, no momento em que a rua se resolve — é o ponto
 * por onde toda a lógica de aposta já passou, então basta olhar quanto ficou.
 */
function resolverExtras(state: HandState): HandState {
  const ativos = extrasAtivos(state);
  if (ativos.length === 0) return state;

  const aPagar = state.apostaDaRua ?? 0;
  // Ninguém apostou: os extras passam junto e seguem na mão
  if (aPagar <= 0) return state;

  const novoState = { ...state };
  const acoes = [...state.actions];
  let pot = state.pot;

  const atualizados = (state.extraOpponents || []).map((oponente) => {
    if (oponente.folded) return oponente;

    const decisao = makeVillainPostflopDecision(
      oponente.cards,
      state.communityCards,
      state.street,
      pot,
      oponente.stack,
      state.heroStack,
      aPagar,
      false,
      [],
      createVillainMemory(),
    );

    // Eles não aumentam: um raise vira pagar. Quem conduz a aposta é o
    // adversário principal — está explicado no tipo ExtraOpponent.
    if (decisao.action === 'fold') {
      acoes.push({ position: oponente.position, action: 'fold' });
      return { ...oponente, folded: true };
    }

    const pago = Math.min(aPagar, oponente.stack);
    pot += pago;
    acoes.push({ position: oponente.position, action: 'call', amount: pago });
    return { ...oponente, stack: oponente.stack - pago };
  });

  novoState.extraOpponents = atualizados;
  novoState.actions = acoes;
  novoState.pot = pot;
  novoState.foldedPositions = [
    ...state.foldedPositions,
    ...atualizados.filter((o, i) => o.folded && !(state.extraOpponents || [])[i].folded).map((o) => o.position),
  ];
  return novoState;
}

/**
 * Showdown, de dois ou de três.
 *
 * Estava escrito em três lugares — no check-check do river, na virada da última
 * rua e no runout do all-in — e cada cópia sabia comparar só duas mãos. Agora é
 * um lugar só, e ele olha todo mundo que chegou ao fim.
 */
function resolverShowdown(state: HandState): HandState {
  const novoState = { ...state };
  novoState.street = 'showdown';
  novoState.isHandComplete = true;
  novoState.activeBets = [];

  if (!state.heroCards || !state.villainCards) {
    novoState.result = Math.random() > 0.5 ? 'hero_wins' : 'villain_wins';
    return novoState;
  }

  const cartas = novoState.communityCards.slice(0, 5);
  const principal = compareHands(state.heroCards, state.villainCards, cartas);
  novoState.heroEval = principal.heroEval;
  novoState.villainEval = principal.villainEval;

  const ativos = extrasAtivos(state);
  if (ativos.length === 0) {
    novoState.result = principal.winner;
    novoState.showdownWinner = principal.winner === 'villain_wins' ? state.villainPosition : undefined;
    return novoState;
  }

  // Com mais de um adversário, vence a maior pontuação da mesa
  const avaliados = ativos.map((o) => ({ oponente: o, avaliacao: evaluateHand(o.cards, cartas) }));
  novoState.extraOpponents = (state.extraOpponents || []).map((o) => {
    const achado = avaliados.find((a) => a.oponente.position === o.position);
    return achado ? { ...o, eval: achado.avaliacao } : o;
  });

  const melhorAdversario = [
    { posicao: state.villainPosition, score: principal.villainEval.score, avaliacao: principal.villainEval },
    ...avaliados.map((a) => ({ posicao: a.oponente.position, score: a.avaliacao.score, avaliacao: a.avaliacao })),
  ].reduce((melhor, atual) => (atual.score > melhor.score ? atual : melhor));

  if (principal.heroEval.score > melhorAdversario.score) {
    novoState.result = 'hero_wins';
  } else if (melhorAdversario.score > principal.heroEval.score) {
    novoState.result = 'villain_wins';
    // Mostra a mão que ganhou, que nem sempre é a do adversário principal
    novoState.villainEval = melhorAdversario.avaliacao;
    novoState.showdownWinner = melhorAdversario.posicao;
  } else {
    novoState.result = 'tie';
  }

  return novoState;
}

// Processar ação do herói e avançar o estado
export function processHeroAction(
  state: HandState,
  action: ActionType,
  scenario: Scenario
): HandState {
  const newState = { ...state, awaitingPostflopAction: false };
  
  // Adicionar ação do herói ao histórico
  newState.actions = [
    ...state.actions,
    { position: state.heroPosition, action, isHero: true }
  ];
  
  if (action === 'fold') {
    newState.isHandComplete = true;
    newState.result = 'villain_wins';
    return newState;
  }
  
  if (action === 'allin') {
    newState.activeBets = [
      ...state.activeBets.filter(b => b.position !== state.heroPosition),
      { position: state.heroPosition, amount: state.heroStack }
    ];
    newState.pot = state.pot + state.heroStack;
    newState.heroStack = 0;
    
    // Simular resposta do villain
    return simulateVillainResponse(newState, action, scenario);
  }
  
  if (action === 'call') {
    // Calcular quanto o herói precisa pagar
    const amountToCall = Math.max(
      ...state.activeBets.map(b => b.amount),
      0
    );
    newState.pot = state.pot + amountToCall;
    newState.heroStack = state.heroStack - amountToCall;
    
    // Em cenários VS ou simulação, após call, lidamos o flop
    if (scenario !== 'openRaise') {
      return dealNextStreet(newState);
    }
  }
  
  if (action === 'raise') {
    const raiseAmount = Math.min(state.pot * 2, state.heroStack); // Raise de 2x pot, limitado pelo stack
    newState.activeBets = [
      ...state.activeBets.filter(b => b.position !== state.heroPosition),
      { position: state.heroPosition, amount: raiseAmount }
    ];
    newState.pot = state.pot + raiseAmount;
    newState.heroStack = state.heroStack - raiseAmount;
    
    return simulateVillainResponse(newState, action, scenario);
  }
  
  return newState;
}

// Processar ação pós-flop do herói (check/bet/call/raise/fold/allin) para modo simulação
export function processPostflopAction(
  state: HandState,
  action: 'check' | 'bet' | 'fold' | 'allin' | 'call' | 'raise',
  betSizePct?: number // percentual do pot (0.33, 0.5, 0.75, 1.0)
): HandState {
  const newState = { ...state, awaitingPostflopAction: false };
  const effectiveStack = Math.min(state.heroStack, state.villainStack || state.heroStack);
  
  // Update memory with hero action
  newState.villainMemory = updateMemory(
    state.villainMemory || createVillainMemory(),
    state.street,
    action,
    false // hero action
  );
  
  newState.actions = [
    ...state.actions,
    { position: state.heroPosition, action, isHero: true }
  ];
  
  if (action === 'fold') {
    newState.isHandComplete = true;
    newState.result = 'villain_wins';
    return newState;
  }
  
  if (action === 'allin') {
    const allinAmount = Math.min(state.heroStack, state.villainStack || state.heroStack);
    newState.pot = state.pot + allinAmount;
    newState.heroStack = state.heroStack - allinAmount;
    newState.apostaDaRua = Math.max(state.apostaDaRua ?? 0, allinAmount);
    
    // Villain decides whether to call all-in using GTO
    const villainIsIP = isVillainInPosition(state);
    const decision = makeVillainPostflopDecision(
      state.villainCards || [],
      state.communityCards,
      state.street,
      newState.pot,
      state.villainStack || 0,
      0, // hero is all-in
      allinAmount,
      villainIsIP,
      [],
      newState.villainMemory,
    );
    
    if (decision.action === 'fold') {
      newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'fold' }];
      newState.isHandComplete = true;
      newState.result = 'hero_wins';
      newState.lastVillainAction = 'Fold';
      return newState;
    }
    
    // Villain calls all-in
    newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'call' }];
    newState.villainStack = (state.villainStack || 0) - allinAmount;
    newState.lastVillainAction = 'Call All-in';
    newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'call', true);
    return runoutToShowdown(newState);
  }
  
  if (action === 'bet') {
    const pct = betSizePct || 0.5;
    const rawBet = state.pot * pct;
    const betSize = Math.min(Math.round(rawBet * 10) / 10, effectiveStack);
    newState.pot = state.pot + betSize;
    newState.heroStack = state.heroStack - betSize;
    newState.apostaDaRua = Math.max(state.apostaDaRua ?? 0, betSize);
    
    // Villain GTO response to bet
    const villainIsIP = isVillainInPosition(state);
    const decision = makeVillainPostflopDecision(
      state.villainCards || [],
      state.communityCards,
      state.street,
      newState.pot,
      state.villainStack || 0,
      newState.heroStack,
      betSize,
      villainIsIP,
      [],
      newState.villainMemory,
    );
    
    if (decision.action === 'call') {
      const callAmount = Math.min(betSize, state.villainStack || 0);
      newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'call', amount: callAmount }];
      newState.pot += callAmount;
      newState.villainStack = (state.villainStack || 0) - callAmount;
      newState.activeBets = [];
      newState.lastVillainAction = `Call ${callAmount.toFixed(1)}BB`;
      newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'call', true, callAmount);
      return dealNextStreet(newState);
    } else if (decision.action === 'raise') {
      const raiseSize = Math.min((decision.betSizePct || 0.75) * newState.pot + betSize, state.villainStack || 0);
      newState.apostaDaRua = Math.max(newState.apostaDaRua ?? 0, raiseSize);
      newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'raise', amount: raiseSize }];
      newState.pot += raiseSize;
      newState.villainStack = (state.villainStack || 0) - raiseSize;
      newState.activeBets = [
        { position: state.villainPosition!, amount: raiseSize }
      ];
      newState.lastVillainAction = `Raise ${raiseSize.toFixed(1)}BB`;
      newState.villainAction = { action: 'Raise', amount: raiseSize };
      newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'raise', true, raiseSize);
      newState.awaitingPostflopAction = true;
      return newState;
    } else {
      // Villain folds
      newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'fold' }];
      newState.isHandComplete = true;
      newState.result = 'hero_wins';
      newState.activeBets = [];
      newState.lastVillainAction = 'Fold';
      newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'fold', true);
      return newState;
    }
  }
  
  // Call action (facing villain bet/raise)
  if (action === 'call') {
    const villainBet = state.activeBets.find(b => b.position === state.villainPosition);
    const callAmount = villainBet ? Math.min(villainBet.amount, state.heroStack) : 0;
    newState.pot = state.pot + callAmount;
    newState.heroStack = state.heroStack - callAmount;
    newState.activeBets = [];
    newState.lastVillainAction = undefined;
    newState.villainAction = undefined;
    
    const isRiver = state.street === 'river';
    if (isRiver) {
      return goToShowdown(newState);
    }
    return dealNextStreet(newState);
  }
  
  // Raise action (facing villain bet/raise)
  if (action === 'raise') {
    const pct = betSizePct || 0.75;
    const rawRaise = state.pot * pct;
    const effectiveStack = Math.min(state.heroStack, state.villainStack || state.heroStack);
    const raiseSize = Math.min(Math.round(rawRaise * 10) / 10, effectiveStack);
    newState.pot = state.pot + raiseSize;
    newState.heroStack = state.heroStack - raiseSize;
    newState.apostaDaRua = Math.max(state.apostaDaRua ?? 0, raiseSize);
    newState.activeBets = [{ position: state.heroPosition, amount: raiseSize }];
    newState.lastVillainAction = undefined;
    newState.villainAction = undefined;
    
    // Villain responds to raise
    const villainIsIP = isVillainInPosition(state);
    const decision = makeVillainPostflopDecision(
      state.villainCards || [],
      state.communityCards,
      state.street,
      newState.pot,
      state.villainStack || 0,
      newState.heroStack,
      raiseSize,
      villainIsIP,
      [],
      newState.villainMemory,
    );
    
    if (decision.action === 'call') {
      const callAmt = Math.min(raiseSize, state.villainStack || 0);
      newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'call', amount: callAmt }];
      newState.pot += callAmt;
      newState.villainStack = (state.villainStack || 0) - callAmt;
      newState.activeBets = [];
      newState.lastVillainAction = `Call ${callAmt.toFixed(1)}BB`;
      newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'call', true, callAmt);
      const isRiver = state.street === 'river';
      if (isRiver) return goToShowdown(newState);
      return dealNextStreet(newState);
    } else if (decision.action === 'fold') {
      newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'fold' }];
      newState.isHandComplete = true;
      newState.result = 'hero_wins';
      newState.lastVillainAction = 'Fold';
      newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'fold', true);
      return newState;
    } else {
      // Villain re-raises → all-in scenario, simplify to call
      const reraiseAmt = Math.min(state.villainStack || 0, newState.pot);
      newState.apostaDaRua = Math.max(newState.apostaDaRua ?? 0, reraiseAmt);
      newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'allin', amount: reraiseAmt }];
      newState.pot += reraiseAmt;
      newState.villainStack = 0;
      newState.lastVillainAction = `All-in ${reraiseAmt.toFixed(1)}BB`;
      newState.villainAction = { action: 'All-in', amount: reraiseAmt };
      newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'allin', true, reraiseAmt);
      newState.awaitingPostflopAction = true;
      return newState;
    }
  }
  
  // Check action
  const isRiver = state.street === 'river';
  
  const villainIsIP = isVillainInPosition(state);
  const decision = makeVillainPostflopDecision(
    state.villainCards || [],
    state.communityCards,
    state.street,
    state.pot,
    state.villainStack || 0,
    state.heroStack,
    0, // hero checked
    villainIsIP,
    [],
    newState.villainMemory,
  );
  
  if (decision.action === 'bet') {
    const rawBetSize = (decision.betSizePct || 0.5) * state.pot;
    const villainBetSize = Math.min(Math.round(rawBetSize * 10) / 10, state.villainStack || 0, state.heroStack);
    newState.apostaDaRua = Math.max(state.apostaDaRua ?? 0, villainBetSize);
    newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'bet', amount: villainBetSize }];
    newState.pot += villainBetSize;
    newState.villainStack = (state.villainStack || 0) - villainBetSize;
    newState.activeBets = [
      { position: state.villainPosition!, amount: villainBetSize }
    ];
    newState.lastVillainAction = `Bet ${villainBetSize.toFixed(1)}BB`;
    newState.villainAction = { action: 'Bet', amount: villainBetSize };
    newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'bet', true, villainBetSize);
    newState.awaitingPostflopAction = true;
    return newState;
  } else {
    // Villain checks back
    newState.actions = [...newState.actions, { position: state.villainPosition!, action: 'check' }];
    newState.lastVillainAction = 'Check';
    newState.villainMemory = updateMemory(newState.villainMemory, state.street, 'check', true);
    
    if (isRiver) {
      return goToShowdown(newState);
    }
    return dealNextStreet(newState);
  }
}

// Helper: is villain in position relative to hero
function isVillainInPosition(state: HandState): boolean {
  const villainIdx = POSITIONS.indexOf(state.villainPosition || 'UTG');
  const heroIdx = POSITIONS.indexOf(state.heroPosition);
  // Higher index = later position = in position postflop (except blinds act first)
  return villainIdx > heroIdx;
}

// Go directly to showdown (for river check-check)
function goToShowdown(state: HandState): HandState {
  // Os extras fecham a rua antes de virar as cartas
  return resolverShowdown(resolverExtras(state));
}

// Simular resposta do villain (GTO-based using real hand)
function simulateVillainResponse(
  state: HandState,
  heroAction: ActionType,
  scenario: Scenario
): HandState {
  const newState = { ...state };
  
  // Use GTO preflop decision based on villain's actual cards
  const effectiveStack = Math.min(state.heroStack, state.villainStack || state.heroStack);
  const decision = makeVillainPreflopDecision(
    state.villainCards || [],
    heroAction,
    state.pot,
    effectiveStack,
  );
  
  // Update memory
  const memory = updateMemory(
    state.villainMemory || createVillainMemory(),
    'preflop',
    decision.calls ? 'call' : 'fold',
    true
  );
  newState.villainMemory = memory;
  
  if (decision.calls) {
    newState.actions = [
      ...state.actions,
      { position: state.villainPosition!, action: 'call' }
    ];
    newState.lastVillainAction = 'Call';
    
    // Update villain stack for the call
    const callAmount = Math.max(...state.activeBets.map(b => b.amount), 0);
    newState.villainStack = (state.villainStack || effectiveStack) - callAmount;
    
    return dealNextStreet(newState);
  } else {
    newState.actions = [
      ...state.actions,
      { position: state.villainPosition!, action: 'fold' }
    ];
    newState.isHandComplete = true;
    newState.result = 'hero_wins';
    newState.lastVillainAction = 'Fold';
    return newState;
  }
}

// Lidar próxima street
function dealNextStreet(state: HandState): HandState {
  // Antes de virar a rua, cada adversário extra paga o que entrou nela ou sai
  const comExtras = resolverExtras(state);
  const newState = { ...comExtras };

  // Gerar board se necessário
  if (comExtras.communityCards.length === 0) {
    const deck = generateDeck();
    const usedCards = [
      ...comExtras.heroCards,
      ...(comExtras.villainCards || []),
      ...(comExtras.extraOpponents || []).flatMap((o) => o.cards),
    ];
    const availableCards = deck.filter(c =>
      !usedCards.some(used => used.rank === c.rank && used.suit === c.suit)
    );
    const shuffledDeck = shuffle(availableCards);
    newState.communityCards = shuffledDeck.slice(0, 5);
  }

  // O adversário principal desistir já encerra a mão antes de chegar aqui, e a
  // saída dos extras não encerra: ele continua no pote.

  // Avançar street
  switch (comExtras.street) {
    case 'preflop':
      newState.street = 'flop';
      break;
    case 'flop':
      newState.street = 'turn';
      break;
    case 'turn':
      newState.street = 'river';
      break;
    case 'river':
      return resolverShowdown(newState);
  }

  // Limpar apostas ativas e ação do vilão ao mudar de street
  newState.activeBets = [];
  newState.villainAction = undefined;
  newState.lastVillainAction = undefined;
  // Rua nova, aposta zerada: o que os extras devem é só o que entrar daqui
  newState.apostaDaRua = 0;

  // Em simulação, marcar que herói precisa agir no pós-flop
  if (comExtras.isSimulation && !newState.isHandComplete && newState.street !== 'preflop') {
    newState.awaitingPostflopAction = true;
  }

  return newState;
}

// Runout direto para showdown (all-in preflop/postflop)
function runoutToShowdown(state: HandState): HandState {
  const comExtras = resolverExtras(state);
  const newState = { ...comExtras };

  // Gerar board completo se necessário (completar até 5 cartas)
  if (comExtras.communityCards.length < 5) {
    const deck = generateDeck();
    const usedCards = [
      ...comExtras.heroCards,
      ...(comExtras.villainCards || []),
      ...(comExtras.extraOpponents || []).flatMap((o) => o.cards),
      ...comExtras.communityCards,
    ];
    const availableCards = deck.filter(c =>
      !usedCards.some(used => used.rank === c.rank && used.suit === c.suit)
    );
    const shuffledDeck = shuffle(availableCards);
    const remaining = 5 - comExtras.communityCards.length;
    newState.communityCards = [...comExtras.communityCards, ...shuffledDeck.slice(0, remaining)];
  }

  return resolverShowdown(newState);
}

// Função para obter descrição do cenário
export function getScenarioDescription(
  scenario: Scenario,
  heroPosition: Position,
  villainPosition?: Position,
  villainAction?: { action: string; amount: number }
): string {
  switch (scenario) {
    case 'openRaise':
      return `Você está em ${heroPosition}. Primeiro a entrar no pote.`;
    case 'vsOpenRaise':
      return `${villainPosition} abriu com raise de ${villainAction?.amount}BB. Você está em ${heroPosition}.`;
    case 'vs3bet':
      return `Você abriu em ${heroPosition}. ${villainPosition} fez 3-bet para ${villainAction?.amount}BB.`;
    case 'vsOpenShove':
      return `${villainPosition} foi all-in com ${villainAction?.amount}BB. Você está em ${heroPosition}.`;
    case 'simulation':
      return `Simulação completa. ${villainPosition} abriu com ${villainAction?.amount}BB. Jogue até o showdown!`;
    case 'multiway':
      return `Pote Multiway. ${villainPosition} abriu e há callers. Você está em ${heroPosition}.`;
    default:
      return '';
  }
}
