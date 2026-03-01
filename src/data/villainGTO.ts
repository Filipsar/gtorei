// GTORei - Villain GTO Decision Engine
// Makes optimal villain decisions based on board texture, ranges, pot odds, position, SPR, draws, and multi-street memory

import { CardType } from '@/components/poker/PlayingCard';
import { Position, POSITIONS } from './gtoRanges';
import { HandRank, HandEvaluation, evaluateHand } from './handEvaluator';
import { Street } from './handState';

// ============================================================
// BOARD TEXTURE ANALYSIS
// ============================================================

interface BoardTexture {
  isWet: boolean;
  isPaired: boolean;
  isMonotone: boolean;
  isTwoTone: boolean;
  hasHighCards: boolean;
  connectivity: number; // 0-1
  highestCard: string;
  flushDrawPossible: boolean;
  straightDrawPossible: boolean;
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

function analyzeBoard(board: CardType[]): BoardTexture {
  const ranks = board.map(c => c.rank);
  const suits = board.map(c => c.suit);
  
  const suitCounts: Record<string, number> = {};
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  
  const rankCounts: Record<string, number> = {};
  ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });
  const isPaired = Object.values(rankCounts).some(c => c >= 2);
  
  const highCards = ['A', 'K', 'Q'];
  const hasHighCards = ranks.some(r => highCards.includes(r));
  
  const values = ranks.map(r => RANK_VALUES[r] || 0).sort((a, b) => a - b);
  let gaps = 0;
  for (let i = 1; i < values.length; i++) {
    gaps += values[i] - values[i - 1] - 1;
  }
  const connectivity = Math.max(0, 1 - gaps / (values.length * 3));
  
  return {
    isWet: connectivity > 0.5 && !isPaired,
    isPaired,
    isMonotone: maxSuitCount >= 3,
    isTwoTone: maxSuitCount === 2,
    hasHighCards,
    connectivity,
    highestCard: ranks.reduce((a, b) => (RANK_VALUES[a] || 0) > (RANK_VALUES[b] || 0) ? a : b, '2'),
    flushDrawPossible: maxSuitCount >= 2,
    straightDrawPossible: connectivity > 0.3,
  };
}

// ============================================================
// DRAW DETECTION
// ============================================================

interface DrawInfo {
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  hasGutshot: boolean;
  hasComboDraws: boolean;
  outs: number;
}

function detectDraws(holeCards: CardType[], boardCards: CardType[]): DrawInfo {
  const allCards = [...holeCards, ...boardCards];
  let hasFlushDraw = false;
  let hasStraightDraw = false;
  let hasGutshot = false;
  let outs = 0;
  
  // Flush draw detection: hole card suits matching board suits to make 4 to flush
  const suitCounts: Record<string, number> = {};
  allCards.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
  
  for (const [suit, count] of Object.entries(suitCounts)) {
    if (count === 4 && holeCards.some(c => c.suit === suit)) {
      hasFlushDraw = true;
      outs += 9;
      break;
    }
  }
  
  // Straight draw detection
  const allValues = [...new Set(allCards.map(c => RANK_VALUES[c.rank] || 0))].sort((a, b) => a - b);
  // Add low ace
  if (allValues.includes(14)) allValues.unshift(1);
  
  // Count consecutive cards in windows of 5
  let maxConsecutive = 0;
  for (let target = 1; target <= 14; target++) {
    const window = [target, target + 1, target + 2, target + 3, target + 4];
    const matched = window.filter(v => allValues.includes(v > 14 ? v - 13 : v)).length;
    if (matched > maxConsecutive) maxConsecutive = matched;
  }
  
  if (maxConsecutive === 4) {
    // Check if hole cards contribute to the draw
    const holeValues = holeCards.map(c => RANK_VALUES[c.rank] || 0);
    const boardValues = boardCards.map(c => RANK_VALUES[c.rank] || 0);
    const holeContributes = holeValues.some(v => !boardValues.includes(v));
    if (holeContributes) {
      hasStraightDraw = true;
      outs += 8;
    }
  } else if (maxConsecutive === 3) {
    // Gutshot (4 outs)
    const holeValues = holeCards.map(c => RANK_VALUES[c.rank] || 0);
    const boardValues = boardCards.map(c => RANK_VALUES[c.rank] || 0);
    const holeContributes = holeValues.some(v => !boardValues.includes(v));
    if (holeContributes) {
      hasGutshot = true;
      outs += 4;
    }
  }
  
  const hasComboDraws = hasFlushDraw && (hasStraightDraw || hasGutshot);
  // Adjust for overlap
  if (hasComboDraws) outs = Math.min(outs, 15);
  
  return { hasFlushDraw, hasStraightDraw, hasGutshot, hasComboDraws, outs };
}

// ============================================================
// MULTI-STREET MEMORY
// ============================================================

export interface VillainMemory {
  streetActions: { street: Street; action: string; amount?: number }[];
  heroAggression: number; // 0-1 how aggressive hero has been
  villainHasShownStrength: boolean;
}

export function createVillainMemory(): VillainMemory {
  return {
    streetActions: [],
    heroAggression: 0.5,
    villainHasShownStrength: false,
  };
}

export function updateMemory(memory: VillainMemory, street: Street, action: string, isVillain: boolean, amount?: number): VillainMemory {
  const newMemory = { ...memory, streetActions: [...memory.streetActions, { street, action, amount }] };
  
  if (!isVillain) {
    // Track hero aggression
    const aggressiveActions = ['bet', 'raise', 'allin', '3-bet'];
    if (aggressiveActions.includes(action)) {
      newMemory.heroAggression = Math.min(1, memory.heroAggression + 0.15);
    } else if (action === 'check') {
      newMemory.heroAggression = Math.max(0, memory.heroAggression - 0.1);
    }
  } else {
    if (['bet', 'raise'].includes(action)) {
      newMemory.villainHasShownStrength = true;
    }
  }
  
  return newMemory;
}

// ============================================================
// HAND STRENGTH CLASSIFICATION (with draws)
// ============================================================

type HandStrength = 'nuts' | 'strong' | 'medium' | 'weak' | 'combo_draw' | 'flush_draw' | 'straight_draw' | 'gutshot' | 'air';

function calculateSPR(effectiveStack: number, pot: number): number {
  return pot > 0 ? effectiveStack / pot : Infinity;
}

function getHandStrengthCategory(eval_: HandEvaluation, draws: DrawInfo): HandStrength {
  const rank = eval_.rank;
  
  // Made hands first
  if (rank >= HandRank.FourOfAKind) return 'nuts';
  if (rank >= HandRank.Flush) return 'strong';
  if (rank >= HandRank.Straight) return 'strong';
  if (rank >= HandRank.ThreeOfAKind) return 'strong';
  if (rank >= HandRank.TwoPair) return 'medium';
  if (rank >= HandRank.OnePair) {
    if (eval_.kickers[0] >= 10) return 'medium';
    // Low pair + draw = upgrade
    if (draws.hasFlushDraw || draws.hasStraightDraw) return 'flush_draw';
    return 'weak';
  }
  
  // No made hand - classify by draws
  if (draws.hasComboDraws) return 'combo_draw';
  if (draws.hasFlushDraw) return 'flush_draw';
  if (draws.hasStraightDraw) return 'straight_draw';
  if (draws.hasGutshot) return 'gutshot';
  
  return 'air';
}

// ============================================================
// VILLAIN PREFLOP DECISION (GTO-based)
// ============================================================

export function makeVillainPreflopDecision(
  villainCards: CardType[],
  heroAction: string,
  pot: number,
  effectiveStack: number,
): { calls: boolean; description: string } {
  // Evaluate villain hand strength for preflop
  const v1 = RANK_VALUES[villainCards[0]?.rank] || 0;
  const v2 = RANK_VALUES[villainCards[1]?.rank] || 0;
  const highCard = Math.max(v1, v2);
  const lowCard = Math.min(v1, v2);
  const isPair = v1 === v2;
  const isSuited = villainCards[0]?.suit === villainCards[1]?.suit;
  
  // Calculate a hand quality score 0-1
  let quality = 0;
  
  if (isPair) {
    quality = 0.4 + (highCard / 14) * 0.6; // Pairs: 0.4-1.0
  } else {
    const gap = highCard - lowCard;
    const highBonus = highCard / 14;
    const connectedBonus = Math.max(0, 1 - gap / 5) * 0.15;
    const suitedBonus = isSuited ? 0.08 : 0;
    quality = highBonus * 0.5 + (lowCard / 14) * 0.2 + connectedBonus + suitedBonus;
  }
  
  // Adjust call threshold based on pot odds
  const potOdds = effectiveStack > 0 ? pot / (pot + effectiveStack) : 0.5;
  const callThreshold = Math.max(0.2, 0.5 - potOdds * 0.3);
  
  // Hero raised/3-bet → need stronger hand
  if (heroAction === 'raise' || heroAction === 'allin') {
    const adjustedThreshold = callThreshold + 0.15;
    if (quality >= adjustedThreshold) {
      return { calls: true, description: `Call` };
    }
    return { calls: false, description: 'Fold' };
  }
  
  // Standard call decision
  if (quality >= callThreshold) {
    return { calls: true, description: `Call` };
  }
  return { calls: false, description: 'Fold' };
}

// ============================================================
// VILLAIN POSTFLOP DECISION (main export)
// ============================================================

export interface VillainDecision {
  action: 'check' | 'bet' | 'call' | 'fold' | 'raise';
  betSizePct?: number;
  description: string;
}

export function makeVillainPostflopDecision(
  villainCards: CardType[],
  communityCards: CardType[],
  street: Street,
  pot: number,
  villainStack: number,
  heroStack: number,
  heroBetAmount: number,
  villainIsIP: boolean,
  previousActions: string[],
  memory?: VillainMemory,
): VillainDecision {
  const visibleCards = getVisibleCards(communityCards, street);
  if (visibleCards.length < 3) {
    return { action: 'check', description: 'Check' };
  }
  
  const board = analyzeBoard(visibleCards);
  const handEval = evaluateHand(villainCards, visibleCards);
  const draws = detectDraws(villainCards, visibleCards);
  const effectiveStack = Math.min(villainStack, heroStack);
  const spr = calculateSPR(effectiveStack, pot);
  const handStrength = getHandStrengthCategory(handEval, draws);
  
  // Memory adjustments
  const heroAggr = memory?.heroAggression ?? 0.5;
  const villainShownStrength = memory?.villainHasShownStrength ?? false;
  
  if (heroBetAmount > 0) {
    return respondToBet(handStrength, heroBetAmount, pot, effectiveStack, spr, board, villainIsIP, street, draws, heroAggr, villainShownStrength);
  }
  
  return decideWhenCheckedTo(handStrength, pot, effectiveStack, spr, board, villainIsIP, street, draws, heroAggr);
}

// ============================================================
// RESPOND TO BET (with draws + memory)
// ============================================================

function respondToBet(
  strength: HandStrength,
  betAmount: number,
  pot: number,
  effectiveStack: number,
  spr: number,
  board: BoardTexture,
  isIP: boolean,
  street: Street,
  draws: DrawInfo,
  heroAggression: number,
  villainShownStrength: boolean,
): VillainDecision {
  const potOdds = betAmount / (pot + betAmount);
  const isRiver = street === 'river';
  
  // On river, draws are dead
  const effectiveStrength = isRiver && ['combo_draw', 'flush_draw', 'straight_draw', 'gutshot'].includes(strength) 
    ? 'air' : strength;
  
  switch (effectiveStrength) {
    case 'nuts':
      if (Math.random() < 0.6 && effectiveStack > betAmount * 2.5) {
        const sizePct = spr < 3 ? 1.0 : 0.75;
        return { action: 'raise', betSizePct: sizePct, description: `Raise` };
      }
      return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      
    case 'strong':
      if (Math.random() < 0.2 && spr > 2) {
        return { action: 'raise', betSizePct: 0.66, description: `Raise` };
      }
      return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      
    case 'medium':
      // Against aggressive hero, call more tightly
      const medCallFreq = heroAggression > 0.7 ? 0.3 : 0.45;
      if (potOdds < 0.35) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      return Math.random() < medCallFreq 
        ? { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` }
        : { action: 'fold', description: 'Fold' };
      
    case 'combo_draw':
      // Combo draw: semi-bluff raise 35% IP, call most
      if (isIP && Math.random() < 0.35 && spr > 2) {
        return { action: 'raise', betSizePct: 0.75, description: 'Raise (semi-bluff)' };
      }
      if (potOdds < 0.35 || draws.outs >= 12) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      return Math.random() < 0.7 
        ? { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` }
        : { action: 'fold', description: 'Fold' };
      
    case 'flush_draw':
      // Flush draw: call with good odds, semi-bluff raise ~20% IP
      if (isIP && Math.random() < 0.2 && spr > 2.5) {
        return { action: 'raise', betSizePct: 0.66, description: 'Raise (semi-bluff)' };
      }
      if (potOdds < 0.30) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      return Math.random() < 0.6
        ? { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` }
        : { action: 'fold', description: 'Fold' };

    case 'straight_draw':
      if (isIP && Math.random() < 0.15 && spr > 3) {
        return { action: 'raise', betSizePct: 0.66, description: 'Raise (semi-bluff)' };
      }
      if (potOdds < 0.25) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      return Math.random() < 0.5
        ? { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` }
        : { action: 'fold', description: 'Fold' };
        
    case 'gutshot':
      // Gutshot: bluff raise ~15% IP, call with right odds
      if (isIP && Math.random() < 0.15 && spr > 3) {
        return { action: 'raise', betSizePct: 0.75, description: 'Raise (bluff)' };
      }
      if (potOdds < 0.2) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      return Math.random() < 0.25
        ? { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` }
        : { action: 'fold', description: 'Fold' };
      
    case 'weak':
      if (board.isWet && potOdds < 0.25 && Math.random() < 0.35) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      if (isIP && !board.isWet && Math.random() < 0.1) {
        return { action: 'raise', betSizePct: 0.75, description: 'Raise (bluff)' };
      }
      return Math.random() < 0.75 
        ? { action: 'fold', description: 'Fold' }
        : { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      
    case 'air':
      if (isIP && Math.random() < 0.08 && spr > 3) {
        return { action: 'raise', betSizePct: 0.75, description: 'Raise (bluff)' };
      }
      if (potOdds < 0.2 && Math.random() < 0.15) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      return { action: 'fold', description: 'Fold' };
  }
  
  return { action: 'fold', description: 'Fold' };
}

// ============================================================
// DECIDE WHEN CHECKED TO (with draws + adaptive sizing)
// ============================================================

function decideWhenCheckedTo(
  strength: HandStrength,
  pot: number,
  effectiveStack: number,
  spr: number,
  board: BoardTexture,
  isIP: boolean,
  street: Street,
  draws: DrawInfo,
  heroAggression: number,
): VillainDecision {
  const isRiver = street === 'river';
  
  // On river, draws are dead
  const effectiveStrength = isRiver && ['combo_draw', 'flush_draw', 'straight_draw', 'gutshot'].includes(strength) 
    ? 'air' : strength;
  
  // Adaptive bet sizing based on board + SPR
  const getAdaptiveSize = (baseSize: number): number => {
    let size = baseSize;
    if (board.isWet) size = Math.min(size + 0.15, 1.0);
    if (spr < 2) size = Math.min(size + 0.25, 1.5); // Push/fold territory
    if (board.isMonotone) size = Math.max(size - 0.1, 0.25);
    return size;
  };
  
  switch (effectiveStrength) {
    case 'nuts':
      if (Math.random() < 0.8) {
        const sizePct = getAdaptiveSize(spr > 4 ? 0.66 : 0.75);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check (trap)' };
      
    case 'strong':
      if (Math.random() < 0.65) {
        const sizePct = getAdaptiveSize(board.isWet ? 0.75 : 0.5);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'medium':
      if (Math.random() < 0.35 && isIP) {
        const sizePct = getAdaptiveSize(0.33);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
    
    case 'combo_draw':
      // Combo draw: bet 70% IP as semi-bluff
      if (Math.random() < (isIP ? 0.70 : 0.45)) {
        const sizePct = getAdaptiveSize(0.66);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
    
    case 'flush_draw':
      // Flush draw: bet 60% IP, 35% OOP
      if (Math.random() < (isIP ? 0.60 : 0.35)) {
        const sizePct = getAdaptiveSize(0.5);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'straight_draw':
      if (Math.random() < (isIP ? 0.45 : 0.25)) {
        const sizePct = getAdaptiveSize(0.5);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'gutshot':
      // Gutshot: occasional bluff
      if (isIP && Math.random() < 0.2 && !board.isPaired) {
        const sizePct = getAdaptiveSize(0.33);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'weak':
      if (isIP && board.hasHighCards && Math.random() < 0.2) {
        const sizePct = getAdaptiveSize(0.33);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'air': {
      const bluffFreq = isIP ? 0.25 : 0.15;
      // Against passive hero, bluff more
      const adjustedFreq = heroAggression < 0.3 ? bluffFreq + 0.1 : bluffFreq;
      if (Math.random() < adjustedFreq && !board.isPaired) {
        const sizePct = getAdaptiveSize(street === 'river' ? 0.66 : 0.5);
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
    }
  }
  
  return { action: 'check', description: 'Check' };
}

// ============================================================
// HELPERS
// ============================================================

function getVisibleCards(communityCards: CardType[], street: Street): CardType[] {
  switch (street) {
    case 'flop': return communityCards.slice(0, 3);
    case 'turn': return communityCards.slice(0, 4);
    case 'river':
    case 'showdown': return communityCards.slice(0, 5);
    default: return [];
  }
}
