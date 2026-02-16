// GTORei - Villain GTO Decision Engine
// Makes optimal villain decisions based on board texture, ranges, pot odds, position, SPR

import { CardType } from '@/components/poker/PlayingCard';
import { Position, POSITIONS } from './gtoRanges';
import { HandRank, HandEvaluation, evaluateHand } from './handEvaluator';
import { Street } from './handState';

// Board texture analysis
interface BoardTexture {
  isWet: boolean;       // Many draws possible
  isPaired: boolean;    // Board has a pair
  isMonotone: boolean;  // 3+ same suit
  isTwoTone: boolean;   // 2 same suit
  hasHighCards: boolean; // A, K, Q on board
  connectivity: number; // 0-1 how connected the board is
  highestCard: string;
}

function analyzeBoard(board: CardType[]): BoardTexture {
  const ranks = board.map(c => c.rank);
  const suits = board.map(c => c.suit);
  
  // Count suits
  const suitCounts: Record<string, number> = {};
  suits.forEach(s => { suitCounts[s] = (suitCounts[s] || 0) + 1; });
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  
  // Count ranks for pairing
  const rankCounts: Record<string, number> = {};
  ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });
  const isPaired = Object.values(rankCounts).some(c => c >= 2);
  
  // High cards
  const highCards = ['A', 'K', 'Q'];
  const hasHighCards = ranks.some(r => highCards.includes(r));
  
  // Connectivity (simplified)
  const rankValues: Record<string, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  const values = ranks.map(r => rankValues[r] || 0).sort((a, b) => a - b);
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
    highestCard: ranks.reduce((a, b) => (rankValues[a] || 0) > (rankValues[b] || 0) ? a : b, '2'),
  };
}

// Calculate SPR (Stack to Pot Ratio)
function calculateSPR(effectiveStack: number, pot: number): number {
  return pot > 0 ? effectiveStack / pot : Infinity;
}

// Villain GTO decision for postflop
export interface VillainDecision {
  action: 'check' | 'bet' | 'call' | 'fold' | 'raise';
  betSizePct?: number; // as fraction of pot
  description: string;
}

export function makeVillainPostflopDecision(
  villainCards: CardType[],
  communityCards: CardType[],
  street: Street,
  pot: number,
  villainStack: number,
  heroStack: number,
  heroBetAmount: number, // 0 if hero checked
  villainIsIP: boolean, // villain is in position
  previousActions: string[], // recent action context
): VillainDecision {
  const visibleCards = getVisibleCards(communityCards, street);
  if (visibleCards.length < 3) {
    return { action: 'check', description: 'Check' };
  }
  
  const board = analyzeBoard(visibleCards);
  const handEval = evaluateHand(villainCards, visibleCards);
  const effectiveStack = Math.min(villainStack, heroStack);
  const spr = calculateSPR(effectiveStack, pot);
  const handStrength = getHandStrengthCategory(handEval);
  
  // Hero bet → villain must call, raise, or fold
  if (heroBetAmount > 0) {
    return respondToBet(handStrength, heroBetAmount, pot, effectiveStack, spr, board, villainIsIP, street);
  }
  
  // Hero checked → villain can check or bet
  return decideWhenCheckedTo(handStrength, pot, effectiveStack, spr, board, villainIsIP, street);
}

type HandStrength = 'nuts' | 'strong' | 'medium' | 'weak' | 'air';

function getHandStrengthCategory(eval_: HandEvaluation): HandStrength {
  const rank = eval_.rank;
  if (rank >= HandRank.FourOfAKind) return 'nuts';
  if (rank >= HandRank.Flush) return 'strong';
  if (rank >= HandRank.ThreeOfAKind) return 'strong';
  if (rank >= HandRank.TwoPair) return 'medium';
  if (rank >= HandRank.OnePair) {
    // Top pair or overpair = medium, lower pairs = weak
    return eval_.kickers[0] >= 10 ? 'medium' : 'weak';
  }
  return 'air';
}

function respondToBet(
  strength: HandStrength,
  betAmount: number,
  pot: number,
  effectiveStack: number,
  spr: number,
  board: BoardTexture,
  isIP: boolean,
  street: Street,
): VillainDecision {
  const potOdds = betAmount / (pot + betAmount);
  
  switch (strength) {
    case 'nuts':
      // Raise for value ~60%, call ~40% (slow play)
      if (Math.random() < 0.6 && effectiveStack > betAmount * 2.5) {
        return { action: 'raise', betSizePct: 0.75, description: `Raise ${Math.round(pot * 0.75 + betAmount)}BB` };
      }
      return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      
    case 'strong':
      // Call most of the time, occasionally raise
      if (Math.random() < 0.2 && spr > 2) {
        return { action: 'raise', betSizePct: 0.66, description: `Raise` };
      }
      return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      
    case 'medium':
      // Call if good odds, fold to large bets
      if (potOdds < 0.35) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      // Fold to overbets with medium hands
      return Math.random() < 0.55 
        ? { action: 'fold', description: 'Fold' }
        : { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      
    case 'weak':
      // Mostly fold, some calls on wet boards (draws)
      if (board.isWet && potOdds < 0.25 && Math.random() < 0.35) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      // Bluff raise occasionally on dry boards IP
      if (isIP && !board.isWet && Math.random() < 0.1) {
        return { action: 'raise', betSizePct: 0.75, description: 'Raise (bluff)' };
      }
      return Math.random() < 0.75 
        ? { action: 'fold', description: 'Fold' }
        : { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      
    case 'air':
      // Fold most, bluff raise ~8%
      if (isIP && Math.random() < 0.08 && spr > 3) {
        return { action: 'raise', betSizePct: 0.75, description: 'Raise (bluff)' };
      }
      if (potOdds < 0.2 && Math.random() < 0.15) {
        return { action: 'call', description: `Call ${betAmount.toFixed(1)}BB` };
      }
      return { action: 'fold', description: 'Fold' };
  }
}

function decideWhenCheckedTo(
  strength: HandStrength,
  pot: number,
  effectiveStack: number,
  spr: number,
  board: BoardTexture,
  isIP: boolean,
  street: Street,
): VillainDecision {
  switch (strength) {
    case 'nuts':
      // Bet for value ~80%, trap ~20%
      if (Math.random() < 0.8) {
        const sizePct = spr > 4 ? 0.66 : 0.75;
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check (trap)' };
      
    case 'strong':
      // Bet ~65%
      if (Math.random() < 0.65) {
        const sizePct = board.isWet ? 0.75 : 0.5;
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'medium':
      // Bet ~35% for thin value, mostly check
      if (Math.random() < 0.35 && isIP) {
        return { action: 'bet', betSizePct: 0.33, description: `Bet ${Math.round(pot * 0.33 * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'weak':
      // Mostly check, small bluffs on scary boards IP
      if (isIP && board.hasHighCards && Math.random() < 0.2) {
        return { action: 'bet', betSizePct: 0.33, description: `Bet ${Math.round(pot * 0.33 * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
      
    case 'air':
      // Bluff ~25% IP, ~15% OOP on good bluff boards
      const bluffFreq = isIP ? 0.25 : 0.15;
      if (Math.random() < bluffFreq && !board.isPaired) {
        const sizePct = street === 'river' ? 0.66 : 0.5;
        return { action: 'bet', betSizePct: sizePct, description: `Bet ${Math.round(pot * sizePct * 10) / 10}BB` };
      }
      return { action: 'check', description: 'Check' };
  }
}

function getVisibleCards(communityCards: CardType[], street: Street): CardType[] {
  switch (street) {
    case 'flop': return communityCards.slice(0, 3);
    case 'turn': return communityCards.slice(0, 4);
    case 'river':
    case 'showdown': return communityCards.slice(0, 5);
    default: return [];
  }
}
