// GTORei - Public API for Range Data
// Thin layer over the range engine, maintaining backward compatibility

export {
  type Suit, type Rank, type ActionType, type Position, type Scenario,
  type GameMode, type FeedbackType, type ActionFrequency, type HandData, type RangeData,
  RANKS, POSITIONS, STACK_SIZES, SCENARIOS,
} from './ranges/types';

export {
  calculateBountyAdjustment, calculateBountyMultiplier, calculateBountyEV,
  validateRanges,
} from './ranges/engine';

import { generateModeRange, interpolateRange } from './ranges/engine';
import type { GameMode, ActionType, HandData, Position, RangeData, Scenario, Rank } from './ranges/types';
import { RANKS } from './ranges/types';

// Helper para gerar nome da mão
export function getHandName(rank1: Rank, rank2: Rank, suited: boolean): string {
  if (rank1 === rank2) return `${rank1}${rank2}`;
  const idx1 = RANKS.indexOf(rank1);
  const idx2 = RANKS.indexOf(rank2);
  const highRank = idx1 < idx2 ? rank1 : rank2;
  const lowRank = idx1 < idx2 ? rank2 : rank1;
  return `${highRank}${lowRank}${suited ? 's' : 'o'}`;
}

// Cor para ação
export function getActionColor(action: ActionType): string {
  const colors: Record<ActionType, string> = {
    fold: 'poker-fold', call: 'poker-call', raise: 'poker-raise', allin: 'poker-allin',
  };
  return colors[action];
}

export function getFeedbackColor(feedback: import('./ranges/types').FeedbackType): string {
  const colors: Record<import('./ranges/types').FeedbackType, string> = {
    best: 'feedback-best', correct: 'feedback-correct',
    inaccuracy: 'feedback-inaccuracy', mistake: 'feedback-mistake', blunder: 'feedback-blunder',
  };
  return colors[feedback];
}

// ============================================================
// RANGE ACCESS (with caching)
// ============================================================

const rangeCache = new Map<string, RangeData>();

export function generateRange(
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  gameMode: GameMode = '8max',
  bountyMultiplier: number = 0
): RangeData {
  return generateModeRange(gameMode, scenario, position, stack, finalTable, bountyMultiplier);
}

export function getRange(
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  gameMode: GameMode = '8max',
  bountyMultiplier: number = 0,
  multiwayPlayers: number = 3
): RangeData {
  const key = `${gameMode}-${scenario}-${position}-${stack}-${finalTable}-${bountyMultiplier}-${multiwayPlayers}`;
  if (!rangeCache.has(key)) {
    rangeCache.set(key, interpolateRange(gameMode, scenario, position, stack, finalTable, bountyMultiplier, multiwayPlayers));
  }
  return rangeCache.get(key)!;
}

export function getHandData(
  hand: string,
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  gameMode: GameMode = '8max',
  bountyMultiplier: number = 0
): HandData | undefined {
  const range = getRange(scenario, position, stack, finalTable, gameMode, bountyMultiplier);
  return range.hands.find(h => h.hand === hand);
}

// ============================================================
// FEEDBACK SYSTEM
// ============================================================

const LEVEL_EV_PENALTY = [0, 0, 0.5, 1.0, 1.5, 2.0, 2.5];

export function calculateFeedback(
  userAction: ActionType,
  handData: HandData,
  level: number = 1
): { type: import('./ranges/types').FeedbackType; points: number; evLoss: number; message: string } {
  const gtoAction = handData.primaryAction;
  const gtoFrequency = handData.actions.find(a => a.action === gtoAction)?.frequency || 0;
  const userFrequency = handData.actions.find(a => a.action === userAction)?.frequency || 0;
  const gtoEv = handData.actions.find(a => a.action === gtoAction)?.ev || 0;
  const userEv = handData.actions.find(a => a.action === userAction)?.ev || 0;
  const evLoss = Math.max(0, gtoEv - userEv);

  const levelIndex = Math.min(level - 1, 6);
  const evPenaltyMultiplier = LEVEL_EV_PENALTY[levelIndex];
  const evPenalty = evLoss > 0 ? Math.round(evLoss * evPenaltyMultiplier) : 0;

  if (userAction === gtoAction && gtoFrequency >= 50) {
    return { type: 'best', points: 15, evLoss: 0, message: 'Jogada perfeita! 🎯' };
  }
  if (userAction === gtoAction) {
    return { type: 'correct', points: 12, evLoss: 0, message: 'Boa jogada! ✓' };
  }
  if (userFrequency >= 20) {
    const frequencyBonus = Math.min(12, Math.floor(userFrequency / 4));
    const basePoints = Math.max(8, frequencyBonus);
    const finalPoints = basePoints - evPenalty;
    return { type: 'correct', points: finalPoints, evLoss, message: evPenalty > 0 ? 'Jogada dentro do range GTO, mas com perda de EV.' : 'Jogada dentro do range GTO.' };
  }
  if (userFrequency >= 5) {
    const finalPoints = 6 - evPenalty;
    return { type: 'inaccuracy', points: Math.min(6, finalPoints), evLoss, message: 'Jogada aceitável, mas não ótima.' };
  }
  if (evLoss < 0.5) {
    const penalty = Math.floor(evLoss * 6);
    const basePoints = Math.max(2, 5 - penalty);
    const finalPoints = basePoints - evPenalty;
    return { type: 'mistake', points: Math.min(basePoints, finalPoints), evLoss, message: 'Erro. Frequência baixa no GTO.' };
  }

  const severePenalty = Math.min(50, Math.floor(evLoss * 20));
  const blunderEvPenalty = Math.round(evLoss * Math.max(1, evPenaltyMultiplier));
  return { type: 'blunder', points: -(severePenalty + blunderEvPenalty), evLoss, message: 'Erro grave! Essa não é uma jogada GTO.' };
}
