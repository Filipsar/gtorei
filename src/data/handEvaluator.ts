// GTORei - Hand Evaluator
// Evaluates 5-7 card poker hands and determines winners

import { CardType } from '@/components/poker/PlayingCard';

// Hand rankings (higher = better)
export enum HandRank {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export const HAND_RANK_NAMES: Record<HandRank, string> = {
  [HandRank.HighCard]: 'High Card',
  [HandRank.OnePair]: 'Par',
  [HandRank.TwoPair]: 'Dois Pares',
  [HandRank.ThreeOfAKind]: 'Trinca',
  [HandRank.Straight]: 'Sequência',
  [HandRank.Flush]: 'Flush',
  [HandRank.FullHouse]: 'Full House',
  [HandRank.FourOfAKind]: 'Quadra',
  [HandRank.StraightFlush]: 'Straight Flush',
  [HandRank.RoyalFlush]: 'Royal Flush',
};

export interface HandEvaluation {
  rank: HandRank;
  rankName: string;
  kickers: number[]; // For tiebreaking, highest first
  score: number; // Single comparable number
}

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function cardValue(card: CardType): number {
  return RANK_VALUES[card.rank] || 0;
}

// Generate all 5-card combinations from 5-7 cards
function combinations(cards: CardType[], k: number): CardType[][] {
  if (k === 0) return [[]];
  if (cards.length < k) return [];
  const [first, ...rest] = cards;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// Evaluate exactly 5 cards
function evaluate5(cards: CardType[]): HandEvaluation {
  const values = cards.map(cardValue).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  
  const isFlush = suits.every(s => s === suits[0]);
  
  // Check straight
  let isStraight = false;
  let straightHigh = 0;
  
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.length >= 5) {
    // Normal straight
    for (let i = 0; i <= unique.length - 5; i++) {
      if (unique[i] - unique[i + 4] === 4) {
        isStraight = true;
        straightHigh = unique[i];
        break;
      }
    }
    // Wheel (A-2-3-4-5)
    if (!isStraight && unique.includes(14) && unique.includes(5) && unique.includes(4) && unique.includes(3) && unique.includes(2)) {
      isStraight = true;
      straightHigh = 5;
    }
  }
  
  // Count ranks
  const counts: Record<number, number> = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  
  const groups = Object.entries(counts)
    .map(([v, c]) => ({ value: Number(v), count: c }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  
  let rank: HandRank;
  let kickers: number[];
  
  if (isStraight && isFlush) {
    rank = straightHigh === 14 ? HandRank.RoyalFlush : HandRank.StraightFlush;
    kickers = [straightHigh];
  } else if (groups[0].count === 4) {
    rank = HandRank.FourOfAKind;
    kickers = [groups[0].value, groups[1].value];
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    rank = HandRank.FullHouse;
    kickers = [groups[0].value, groups[1].value];
  } else if (isFlush) {
    rank = HandRank.Flush;
    kickers = values.slice(0, 5);
  } else if (isStraight) {
    rank = HandRank.Straight;
    kickers = [straightHigh];
  } else if (groups[0].count === 3) {
    rank = HandRank.ThreeOfAKind;
    kickers = [groups[0].value, ...groups.slice(1).map(g => g.value).slice(0, 2)];
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    rank = HandRank.TwoPair;
    const pairs = [groups[0].value, groups[1].value].sort((a, b) => b - a);
    const kicker = groups.find(g => g.count === 1)?.value || 0;
    kickers = [...pairs, kicker];
  } else if (groups[0].count === 2) {
    rank = HandRank.OnePair;
    kickers = [groups[0].value, ...groups.slice(1).map(g => g.value).slice(0, 3)];
  } else {
    rank = HandRank.HighCard;
    kickers = values.slice(0, 5);
  }
  
  // Compute single comparable score
  let score = rank * 1_000_000;
  for (let i = 0; i < kickers.length; i++) {
    score += kickers[i] * Math.pow(15, 4 - i);
  }
  
  return {
    rank,
    rankName: HAND_RANK_NAMES[rank],
    kickers,
    score,
  };
}

// Evaluate the best 5-card hand from 5-7 cards
export function evaluateHand(holeCards: CardType[], communityCards: CardType[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards];
  
  if (allCards.length < 5) {
    return { rank: HandRank.HighCard, rankName: 'High Card', kickers: [], score: 0 };
  }
  
  const combos = combinations(allCards, 5);
  let best: HandEvaluation | null = null;
  
  for (const combo of combos) {
    const evaluation = evaluate5(combo);
    if (!best || evaluation.score > best.score) {
      best = evaluation;
    }
  }
  
  return best!;
}

// Compare two hands: returns 'hero' | 'villain' | 'tie'
export function compareHands(
  heroCards: CardType[],
  villainCards: CardType[],
  communityCards: CardType[]
): { winner: 'hero_wins' | 'villain_wins' | 'tie'; heroEval: HandEvaluation; villainEval: HandEvaluation } {
  const heroEval = evaluateHand(heroCards, communityCards);
  const villainEval = evaluateHand(villainCards, communityCards);
  
  let winner: 'hero_wins' | 'villain_wins' | 'tie';
  if (heroEval.score > villainEval.score) {
    winner = 'hero_wins';
  } else if (villainEval.score > heroEval.score) {
    winner = 'villain_wins';
  } else {
    winner = 'tie';
  }
  
  return { winner, heroEval, villainEval };
}
