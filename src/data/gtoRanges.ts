// GTORei - Dados Mockados de Ranges GTO
// Estruturado para fácil substituição por dados reais futuramente

export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';

export type ActionType = 'fold' | 'call' | 'raise' | 'allin';
export type Position = 'UTG' | 'UTG1' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Scenario = 'openRaise' | 'vsOpenRaise' | 'vs3bet' | 'vsOpenShove' | 'simulation' | 'multiway';

export interface ActionFrequency {
  action: ActionType;
  frequency: number; // 0-100
  ev?: number; // Expected Value
}

export interface HandData {
  hand: string;
  actions: ActionFrequency[];
  primaryAction: ActionType;
  suited: boolean;
  pair: boolean;
}

export interface RangeData {
  scenario: Scenario;
  position: Position;
  stack: number;
  finalTable: boolean;
  hands: HandData[];
}

// Ranks array para criar a matriz
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Posições disponíveis
export const POSITIONS: Position[] = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// Cenários disponíveis
export const SCENARIOS: { id: Scenario; label: string; description: string }[] = [
  { id: 'openRaise', label: 'Open Raise', description: 'Primeiro a entrar no pote' },
  { id: 'vsOpenRaise', label: 'Vs Open Raise', description: 'Enfrentando um open raise' },
  { id: 'vs3bet', label: 'vs 3-bet', description: 'Enfrentando uma 3-bet após seu raise' },
  { id: 'vsOpenShove', label: 'Vs Open Shove', description: 'Enfrentando um all-in' },
  { id: 'simulation', label: 'Simulação', description: 'Jogue a mão até o final (flop, turn, river)' },
  { id: 'multiway', label: 'Multiway', description: 'Pote com múltiplos jogadores' },
];

// Stack sizes disponíveis
export const STACK_SIZES = [8, 9, 10, 12, 14, 17, 20, 25, 30, 35, 40, 50, 60, 80, 100];

// Helper para gerar nome da mão
export function getHandName(rank1: Rank, rank2: Rank, suited: boolean): string {
  if (rank1 === rank2) return `${rank1}${rank2}`;
  const ranks = RANKS;
  const idx1 = ranks.indexOf(rank1);
  const idx2 = ranks.indexOf(rank2);
  const highRank = idx1 < idx2 ? rank1 : rank2;
  const lowRank = idx1 < idx2 ? rank2 : rank1;
  return `${highRank}${lowRank}${suited ? 's' : 'o'}`;
}

// Calcular ajuste de bounty para ranges
// Bounty alto no oponente = ranges mais amplos (vale mais a pena eliminar)
// Bounty alto no herói = ranges mais conservadores (vale mais proteger seu bounty)
export function calculateBountyAdjustment(
  heroBounty: number,
  opponentBounty: number
): number {
  if (heroBounty <= 0) return 0;
  const ratio = opponentBounty / heroBounty;
  // ratio > 1: opponent worth more → widen range (+bonus)
  // ratio < 1: opponent worth less → tighten slightly
  // ratio = 1: neutral
  return Math.round((ratio - 1) * 15);
}

// Função para determinar a ação baseada na posição e força da mão
function getActionForHand(
  rank1: Rank,
  rank2: Rank,
  suited: boolean,
  position: Position,
  stack: number,
  scenario: Scenario,
  finalTable: boolean = false,
  bountyAdjustment: number = 0,
  playerCount: number = 8
): ActionFrequency[] {
  const ranks = RANKS;
  const idx1 = ranks.indexOf(rank1);
  const idx2 = ranks.indexOf(rank2);
  const isPair = rank1 === rank2;
  const highCardIdx = Math.min(idx1, idx2);
  const lowCardIdx = Math.max(idx1, idx2);
  const gap = lowCardIdx - highCardIdx;

  // Calcular força base da mão (0-100)
  let strength = 0;

  // Pares
  if (isPair) {
    strength = 85 - (highCardIdx * 5);
  } else {
    // Mãos não-pareadas
    strength = 70 - (highCardIdx * 3) - (lowCardIdx * 2) - (gap * 2);
    if (suited) strength += 10;
  }

  // Ajuste por posição (posições tardias são mais loose)
  const positionBonus: Record<Position, number> = {
    'UTG': 0, 'UTG1': 2, 'LJ': 5, 'HJ': 8,
    'CO': 12, 'BTN': 18, 'SB': 10, 'BB': 15
  };
  strength += positionBonus[position];

  // Ajuste por stack (stacks curtos favorecem all-in)
  if (stack <= 12) {
    strength += 5;
  }

  // Ajuste ICM para mesa final - ranges mais tight
  if (finalTable) {
    // ICM penaliza jogadas marginais: reduz força geral
    const icmPenalty = stack <= 15 ? 12 : stack <= 25 ? 8 : 5;
    strength -= icmPenalty;

    // Posições iniciais ficam ainda mais tight em mesa final
    if (['UTG', 'UTG1', 'LJ'].includes(position)) {
      strength -= 5;
    }

    // Pares baixos e mãos especulativas perdem valor com ICM
    if (!isPair && gap >= 4 && highCardIdx >= 4) {
      strength -= 6;
    }
  }

  // Shorthanded adjustment: boost Ax hands in HU (2) and Three Hand (3)
  if (playerCount <= 3) {
    const shortHandedBonus = playerCount === 2 ? 15 : 10;
    // General shorthanded boost: all hands play better with fewer opponents
    strength += Math.round(shortHandedBonus * 0.4);

    // Extra boost for Ax hands (suited and offsuit)
    const isAceHand = highCardIdx === 0 && !isPair;
    if (isAceHand) {
      if (suited) {
        // Ax suited: strong boost - these are premium shorthanded
        strength += shortHandedBonus;
      } else {
        // Ax offsuit: moderate boost
        strength += Math.round(shortHandedBonus * 0.6);
      }
    }
  }

  // Bounty adjustment (PKO)
  strength += bountyAdjustment;

  // Normalizar para 0-100
  strength = Math.max(0, Math.min(100, strength));

  // Determinar ações baseadas na força e cenário
  if (scenario === 'openRaise') {
    if (strength >= 75) {
      return [
        { action: 'raise', frequency: 100, ev: strength / 10 },
      ];
    } else if (strength >= 50) {
      const raiseFreq = Math.round((strength - 30) * 2);
      return [
        { action: 'raise', frequency: raiseFreq, ev: (strength - 30) / 10 },
        { action: 'fold', frequency: 100 - raiseFreq, ev: 0 },
      ];
    } else {
      return [
        { action: 'fold', frequency: 100, ev: 0 },
      ];
    }
  }

  if (scenario === 'vsOpenRaise') {
    if (strength >= 85) {
      return [
        { action: 'raise', frequency: 70, ev: strength / 8 },
        { action: 'call', frequency: 30, ev: strength / 12 },
      ];
    } else if (strength >= 65) {
      return [
        { action: 'call', frequency: 80, ev: strength / 15 },
        { action: 'raise', frequency: 20, ev: strength / 20 },
      ];
    } else if (strength >= 45) {
      return [
        { action: 'call', frequency: 50, ev: 0.5 },
        { action: 'fold', frequency: 50, ev: 0 },
      ];
    } else {
      return [
        { action: 'fold', frequency: 100, ev: 0 },
      ];
    }
  }

  if (scenario === 'vs3bet') {
    if (strength >= 90) {
      return [
        { action: 'allin', frequency: 60, ev: strength / 5 },
        { action: 'call', frequency: 40, ev: strength / 10 },
      ];
    } else if (strength >= 70) {
      return [
        { action: 'call', frequency: 70, ev: strength / 15 },
        { action: 'fold', frequency: 30, ev: 0 },
      ];
    } else if (strength >= 55) {
      return [
        { action: 'fold', frequency: 60, ev: 0 },
        { action: 'call', frequency: 40, ev: -1 },
      ];
    } else {
      return [
        { action: 'fold', frequency: 100, ev: 0 },
      ];
    }
  }

  if (scenario === 'vsOpenShove') {
    // Contra all-in, precisamos de mãos mais fortes
    const adjustedStrength = strength - 20;
    if (adjustedStrength >= 70) {
      return [
        { action: 'call', frequency: 100, ev: adjustedStrength / 8 },
      ];
    } else if (adjustedStrength >= 50) {
      return [
        { action: 'call', frequency: Math.round(adjustedStrength), ev: 1 },
        { action: 'fold', frequency: 100 - Math.round(adjustedStrength), ev: 0 },
      ];
    } else {
      return [
        { action: 'fold', frequency: 100, ev: 0 },
      ];
    }
  }

  return [{ action: 'fold', frequency: 100, ev: 0 }];
}

// Gerar range completo para um cenário
export function generateRange(
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  bountyAdjustment: number = 0,
  playerCount: number = 8
): RangeData {
  const hands: HandData[] = [];

  // Gerar todas as combinações
  for (let i = 0; i < RANKS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
      const rank1 = RANKS[i];
      const rank2 = RANKS[j];

      if (i === j) {
        const actions = getActionForHand(rank1, rank2, false, position, stack, scenario, finalTable, bountyAdjustment, playerCount);
        hands.push({
          hand: `${rank1}${rank2}`,
          actions,
          primaryAction: actions.reduce((a, b) => a.frequency > b.frequency ? a : b).action,
          suited: false,
          pair: true,
        });
      } else if (i < j) {
        const actions = getActionForHand(rank1, rank2, true, position, stack, scenario, finalTable, bountyAdjustment, playerCount);
        hands.push({
          hand: `${rank1}${rank2}s`,
          actions,
          primaryAction: actions.reduce((a, b) => a.frequency > b.frequency ? a : b).action,
          suited: true,
          pair: false,
        });
      } else {
        const actions = getActionForHand(rank1, rank2, false, position, stack, scenario, finalTable, bountyAdjustment, playerCount);
        hands.push({
          hand: `${rank2}${rank1}o`,
          actions,
          primaryAction: actions.reduce((a, b) => a.frequency > b.frequency ? a : b).action,
          suited: false,
          pair: false,
        });
      }
    }
  }

  return {
    scenario,
    position,
    stack,
    finalTable,
    hands,
  };
}

// Cache de ranges para performance
const rangeCache = new Map<string, RangeData>();

export function getRange(
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  bountyAdjustment: number = 0,
  playerCount: number = 8
): RangeData {
  const key = `${scenario}-${position}-${stack}-${finalTable}-${bountyAdjustment}-${playerCount}`;

  if (!rangeCache.has(key)) {
    rangeCache.set(key, generateRange(scenario, position, stack, finalTable, bountyAdjustment, playerCount));
  }

  return rangeCache.get(key)!;
}

// Obter dados de uma mão específica
export function getHandData(
  hand: string,
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  bountyAdjustment: number = 0,
  playerCount: number = 8
): HandData | undefined {
  const range = getRange(scenario, position, stack, finalTable, bountyAdjustment, playerCount);
  return range.hands.find(h => h.hand === hand);
}

// Obter cor para uma ação
export function getActionColor(action: ActionType): string {
  const colors: Record<ActionType, string> = {
    fold: 'poker-fold',
    call: 'poker-call',
    raise: 'poker-raise',
    allin: 'poker-allin',
  };
  return colors[action];
}

// Obter cor para feedback
export type FeedbackType = 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';

export function getFeedbackColor(feedback: FeedbackType): string {
  const colors: Record<FeedbackType, string> = {
    best: 'feedback-best',
    correct: 'feedback-correct',
    inaccuracy: 'feedback-inaccuracy',
    mistake: 'feedback-mistake',
    blunder: 'feedback-blunder',
  };
  return colors[feedback];
}

// Calcular feedback baseado na ação do usuário vs GTO
// Sistema de pontuação balanceado (redução de ~85%)
export function calculateFeedback(
  userAction: ActionType,
  handData: HandData
): { type: FeedbackType; points: number; evLoss: number; message: string } {
  const gtoAction = handData.primaryAction;
  const gtoFrequency = handData.actions.find(a => a.action === gtoAction)?.frequency || 0;
  const userFrequency = handData.actions.find(a => a.action === userAction)?.frequency || 0;
  const gtoEv = handData.actions.find(a => a.action === gtoAction)?.ev || 0;
  const userEv = handData.actions.find(a => a.action === userAction)?.ev || 0;
  const evLoss = Math.max(0, gtoEv - userEv);

  // BEST MOVE: Ação GTO primária com frequência >= 50%
  if (userAction === gtoAction && gtoFrequency >= 50) {
    return { type: 'best', points: 15, evLoss: 0, message: 'Jogada perfeita! 🎯' };
  }

  // CORRECT MOVE: Ação GTO ou frequência entre 20-50%
  if (userAction === gtoAction) {
    return { type: 'correct', points: 12, evLoss: 0, message: 'Boa jogada! ✓' };
  }

  if (userFrequency >= 20) {
    const frequencyBonus = Math.min(12, Math.floor(userFrequency / 4));
    return { type: 'correct', points: Math.max(8, frequencyBonus), evLoss, message: 'Jogada dentro do range GTO.' };
  }

  // INACCURACY: Frequência entre 5-20%
  if (userFrequency >= 5) {
    return { type: 'inaccuracy', points: 6, evLoss, message: 'Jogada aceitável, mas não ótima.' };
  }

  // MISTAKE: Frequência < 5% mas EV loss < 0.5 BB
  if (evLoss < 0.5) {
    const penalty = Math.floor(evLoss * 6);
    return { type: 'mistake', points: Math.max(2, 5 - penalty), evLoss, message: 'Erro. Frequência baixa no GTO.' };
  }

  // BLUNDER: Erro grave com EV loss >= 0.5 BB
  const severePenalty = Math.min(50, Math.floor(evLoss * 20));
  return { type: 'blunder', points: -severePenalty, evLoss, message: 'Erro grave! Essa não é uma jogada GTO.' };
}
