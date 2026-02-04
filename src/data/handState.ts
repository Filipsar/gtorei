// GTORei - Sistema de Estado da Mão
// Gerencia o fluxo completo de uma mão de poker

import { ActionType, Position, Scenario, POSITIONS, RANKS, getHandData } from './gtoRanges';
import { CardType } from '@/components/poker/PlayingCard';

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
export function getVillainPosition(
  scenario: Scenario,
  heroPosition: Position
): Position | undefined {
  const positionOrder = POSITIONS;
  const heroIndex = positionOrder.indexOf(heroPosition);
  
  switch (scenario) {
    case 'vsOpenRaise':
    case 'simulation':
      // Villain abriu de uma posição anterior
      // Escolher uma posição aleatória antes do herói
      const earlierPositions = positionOrder.filter((_, i) => i < heroIndex && i >= 0);
      if (earlierPositions.length > 0) {
        return earlierPositions[Math.floor(Math.random() * earlierPositions.length)];
      }
      // Se herói está em UTG, não há posição anterior, usar CO
      return 'CO';
      
    case 'vs3bet':
      // Herói abriu, villain 3-betou de uma posição posterior
      const laterPositions = positionOrder.filter((_, i) => i > heroIndex);
      if (laterPositions.length > 0) {
        return laterPositions[Math.floor(Math.random() * laterPositions.length)];
      }
      return 'BB';
      
    case 'vsOpenShove':
      // Villain shovou de uma posição anterior
      const priorPositions = positionOrder.filter((_, i) => i < heroIndex);
      if (priorPositions.length > 0) {
        return priorPositions[Math.floor(Math.random() * priorPositions.length)];
      }
      return 'UTG';
    
    case 'multiway':
      // Multiway - retorna uma posição anterior aleatória
      const multiPositions = positionOrder.filter((_, i) => i < heroIndex && i >= 0);
      if (multiPositions.length > 0) {
        return multiPositions[Math.floor(Math.random() * multiPositions.length)];
      }
      return 'CO';
      
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
  heroCards: CardType[]
): HandState {
  const actions: ActionEntry[] = [];
  const activeBets: { position: Position; amount: number }[] = [];
  const foldedPositions: Position[] = [];
  let pot = 1.5; // SB (0.5) + BB (1)
  
  // Adicionar blinds
  actions.push({ position: 'SB', action: 'post_sb', amount: 0.5 });
  actions.push({ position: 'BB', action: 'post_bb', amount: 1 });
  
  const villainPosition = getVillainPosition(scenario, heroPosition);
  let villainAction: { action: string; amount: number } | undefined;
  let villainStack = heroStack; // Assumir mesmo stack
  
  // Marcar todos entre o opener e o herói como fold
  const positionOrder = POSITIONS;
  const heroIndex = positionOrder.indexOf(heroPosition);
  
  if ((scenario === 'vsOpenRaise' || scenario === 'simulation') && villainPosition) {
    const villainIndex = positionOrder.indexOf(villainPosition);
    const openSize = calculateOpenSize(heroStack);
    
    // Villain abre
    actions.push({ position: villainPosition, action: 'open', amount: openSize });
    activeBets.push({ position: villainPosition, amount: openSize });
    villainAction = { action: 'Raise', amount: openSize };
    pot += openSize;
    
    // Todos entre villain e hero foldam
    for (let i = villainIndex + 1; i < heroIndex; i++) {
      const pos = positionOrder[i];
      if (pos !== 'SB' && pos !== 'BB') {
        actions.push({ position: pos, action: 'fold' });
        foldedPositions.push(pos);
      }
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
    actions.push({ position: villainPosition, action: 'allin', amount: heroStack });
    activeBets.push({ position: villainPosition, amount: heroStack });
    villainAction = { action: 'All-in', amount: heroStack };
    pot += heroStack;
    
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
  };
}

// Processar ação do herói e avançar o estado
export function processHeroAction(
  state: HandState,
  action: ActionType,
  scenario: Scenario
): HandState {
  const newState = { ...state };
  
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
    
    // Em cenários VS, após call, lidamos o flop
    if (scenario !== 'openRaise') {
      return dealNextStreet(newState);
    }
  }
  
  if (action === 'raise') {
    const raiseAmount = state.pot * 2; // Raise de 2x pot simplificado
    newState.activeBets = [
      ...state.activeBets.filter(b => b.position !== state.heroPosition),
      { position: state.heroPosition, amount: raiseAmount }
    ];
    newState.pot = state.pot + raiseAmount;
    
    return simulateVillainResponse(newState, action, scenario);
  }
  
  return newState;
}

// Simular resposta do villain
function simulateVillainResponse(
  state: HandState,
  heroAction: ActionType,
  scenario: Scenario
): HandState {
  const newState = { ...state };
  
  // Simplificado: villain call 60% das vezes, fold 40%
  const villainCalls = Math.random() > 0.4;
  
  if (villainCalls) {
    newState.actions = [
      ...state.actions,
      { position: state.villainPosition!, action: 'call' }
    ];
    
    // Villain call - vamos ao flop
    return dealNextStreet(newState);
  } else {
    newState.actions = [
      ...state.actions,
      { position: state.villainPosition!, action: 'fold' }
    ];
    newState.isHandComplete = true;
    newState.result = 'hero_wins';
    return newState;
  }
}

// Lidar próxima street
function dealNextStreet(state: HandState): HandState {
  const newState = { ...state };
  
  // Gerar board se necessário
  if (state.communityCards.length === 0) {
    const deck = generateDeck();
    const usedCards = [...state.heroCards, ...(state.villainCards || [])];
    const availableCards = deck.filter(c => 
      !usedCards.some(used => used.rank === c.rank && used.suit === c.suit)
    );
    const shuffledDeck = shuffle(availableCards);
    newState.communityCards = shuffledDeck.slice(0, 5);
  }
  
  // Avançar street
  switch (state.street) {
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
      newState.street = 'showdown';
      newState.isHandComplete = true;
      // Simplificado: 50/50 quem ganha
      newState.result = Math.random() > 0.5 ? 'hero_wins' : 'villain_wins';
      break;
  }
  
  // Limpar apostas ativas ao mudar de street
  newState.activeBets = [];
  
  return newState;
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
