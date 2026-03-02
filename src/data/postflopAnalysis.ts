// GTORei - Post-Flop Analysis Engine
// Evaluates hero's post-flop decisions based on board texture, sizing, pot odds, and hand strength

import { CardType } from '@/components/poker/PlayingCard';
import { evaluateHand, HandRank } from './handEvaluator';

// ============================================================
// TYPES
// ============================================================

export type StreetVerdict = 'optimal' | 'good' | 'acceptable' | 'questionable' | 'bad';

export interface BoardTextureInfo {
  type: 'dry' | 'semi-wet' | 'wet';
  label: string;
  isPaired: boolean;
  isMonotone: boolean;
  isTwoTone: boolean;
  hasHighCards: boolean;
  connectivity: number;
  flushDrawPossible: boolean;
  straightDrawPossible: boolean;
}

export interface StreetAnalysis {
  street: string;
  verdict: StreetVerdict;
  verdictLabel: string;
  verdictEmoji: string;
  reasoning: string[];
  boardTexture?: BoardTextureInfo;
  handStrength?: string;
  potOdds?: number; // percentage
  betSizingAnalysis?: string;
}

// ============================================================
// BOARD TEXTURE
// ============================================================

const RANK_VALUES: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

function analyzeBoardTexture(board: CardType[]): BoardTextureInfo {
  if (board.length === 0) return { type: 'dry', label: '-', isPaired: false, isMonotone: false, isTwoTone: false, hasHighCards: false, connectivity: 0, flushDrawPossible: false, straightDrawPossible: false };

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

  const isMonotone = maxSuitCount >= 3;
  const isTwoTone = maxSuitCount === 2 && !isMonotone;
  const flushDrawPossible = maxSuitCount >= 2;
  const straightDrawPossible = connectivity > 0.3;

  let type: 'dry' | 'semi-wet' | 'wet' = 'dry';
  let label = 'Board Seco';
  if (isMonotone || (connectivity > 0.6 && !isPaired)) {
    type = 'wet';
    label = isMonotone ? 'Board Monotone (Wet)' : 'Board Conectado (Wet)';
  } else if (isTwoTone || connectivity > 0.3) {
    type = 'semi-wet';
    label = 'Board Semi-Wet';
  } else if (isPaired) {
    label = 'Board Pareado (Seco)';
  }

  return { type, label, isPaired, isMonotone, isTwoTone, hasHighCards, connectivity, flushDrawPossible, straightDrawPossible };
}

// ============================================================
// DRAW DETECTION FOR HERO
// ============================================================

function countHeroDraws(heroCards: CardType[], board: CardType[]): { hasFlushDraw: boolean; hasStraightDraw: boolean; outs: number } {
  const allCards = [...heroCards, ...board];
  
  // Flush draw
  const suitCounts: Record<string, number> = {};
  allCards.forEach(c => { suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1; });
  const hasFlushDraw = Object.values(suitCounts).some(c => c === 4);

  // Straight draw (open-ended)
  const values = [...new Set(allCards.map(c => RANK_VALUES[c.rank]))].sort((a, b) => a - b);
  let hasStraightDraw = false;
  for (let i = 0; i <= values.length - 4; i++) {
    if (values[i + 3] - values[i] <= 4) {
      hasStraightDraw = true;
      break;
    }
  }

  let outs = 0;
  if (hasFlushDraw) outs += 9;
  if (hasStraightDraw) outs += 8;
  if (hasFlushDraw && hasStraightDraw) outs = 15; // combo draw overlap

  return { hasFlushDraw, hasStraightDraw, outs };
}

// ============================================================
// HAND STRENGTH CLASSIFICATION
// ============================================================

function classifyHandStrength(heroCards: CardType[], board: CardType[]): { label: string; tier: number } {
  if (board.length === 0) return { label: '-', tier: 0 };
  
  const eval_ = evaluateHand(heroCards, board);
  
  switch (eval_.rank) {
    case HandRank.RoyalFlush:
    case HandRank.StraightFlush:
      return { label: 'Monster (Straight Flush+)', tier: 10 };
    case HandRank.FourOfAKind:
      return { label: 'Monster (Quadra)', tier: 9 };
    case HandRank.FullHouse:
      return { label: 'Mão Forte (Full House)', tier: 8 };
    case HandRank.Flush:
      return { label: 'Mão Forte (Flush)', tier: 7 };
    case HandRank.Straight:
      return { label: 'Mão Forte (Sequência)', tier: 6 };
    case HandRank.ThreeOfAKind:
      return { label: 'Mão Boa (Trinca)', tier: 5 };
    case HandRank.TwoPair:
      return { label: 'Mão Boa (Dois Pares)', tier: 4 };
    case HandRank.OnePair: {
      // Distinguish top pair, middle pair, bottom pair
      const boardValues = board.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
      const pairValue = eval_.kickers[0];
      if (pairValue >= boardValues[0]) return { label: 'Top Pair', tier: 3 };
      if (boardValues.length > 1 && pairValue >= boardValues[1]) return { label: 'Middle Pair', tier: 2 };
      return { label: 'Bottom Pair / Low Pair', tier: 1 };
    }
    default:
      return { label: 'High Card (Sem par)', tier: 0 };
  }
}

// ============================================================
// SIZING ANALYSIS
// ============================================================

function analyzeSizing(action: string, pot: number): { label: string; sizePct: number | null; isGood: boolean } {
  const lower = action.toLowerCase();
  
  if (lower === 'check' || lower === 'fold') {
    return { label: '-', sizePct: null, isGood: true };
  }

  // Extract bet amount from label like "Bet 3.5BB" or "All-in"
  const betMatch = lower.match(/bet\s+([\d.]+)/);
  if (betMatch && pot > 0) {
    const betAmount = parseFloat(betMatch[1]);
    const pct = (betAmount / pot) * 100;
    let label: string;
    let isGood = true;
    
    if (pct <= 25) { label = `Sizing pequeno (${pct.toFixed(0)}% pot)`; }
    else if (pct <= 40) { label = `Sizing 1/3 pot (${pct.toFixed(0)}%)`; isGood = true; }
    else if (pct <= 60) { label = `Sizing 1/2 pot (${pct.toFixed(0)}%)`; isGood = true; }
    else if (pct <= 85) { label = `Sizing 3/4 pot (${pct.toFixed(0)}%)`; isGood = true; }
    else if (pct <= 110) { label = `Sizing pot (${pct.toFixed(0)}%)`; isGood = true; }
    else { label = `Overbet (${pct.toFixed(0)}% pot)`; isGood = pct < 200; }
    
    return { label, sizePct: pct, isGood };
  }

  if (lower.includes('all-in')) {
    return { label: 'All-in', sizePct: null, isGood: true };
  }

  if (lower.includes('call')) {
    return { label: 'Call', sizePct: null, isGood: true };
  }

  return { label: action, sizePct: null, isGood: true };
}

// ============================================================
// POT ODDS CALCULATION
// ============================================================

function calculatePotOdds(callAmount: number, pot: number): number {
  if (pot <= 0 || callAmount <= 0) return 0;
  return (callAmount / (pot + callAmount)) * 100;
}

// ============================================================
// VERDICT ENGINE
// ============================================================

function getVerdict(tier: number, action: string, boardTexture: BoardTextureInfo, draws: { outs: number; hasFlushDraw: boolean; hasStraightDraw: boolean }, pot: number, villainAction?: string): { verdict: StreetVerdict; reasons: string[] } {
  const lower = action.toLowerCase();
  const reasons: string[] = [];
  let score = 50; // Start neutral

  // ---- FOLD analysis ----
  if (lower === 'fold') {
    if (tier >= 4) {
      reasons.push('Foldou com mão forte — jogada questionável');
      return { verdict: 'bad', reasons };
    }
    if (tier >= 2 && draws.outs > 0) {
      reasons.push('Foldou com draw — considere call com pot odds favoráveis');
      return { verdict: 'questionable', reasons };
    }
    if (tier <= 1 && draws.outs === 0) {
      reasons.push('Fold correto com mão fraca sem draws');
      return { verdict: 'good', reasons };
    }
    reasons.push('Fold aceitável nessa situação');
    return { verdict: 'acceptable', reasons };
  }

  // ---- CHECK analysis ----
  if (lower === 'check') {
    if (tier >= 6) {
      reasons.push('Check com mão muito forte — considere apostar para extrair valor');
      score -= 15;
    } else if (tier >= 3) {
      if (boardTexture.type === 'wet') {
        reasons.push('Check em board wet com mão boa — risco de dar carta grátis');
        score -= 10;
      } else {
        reasons.push('Check para controle de pote em board seco');
        score += 10;
      }
    } else if (tier <= 1 && draws.outs === 0) {
      reasons.push('Check correto — mão fraca sem draws');
      score += 15;
    } else if (draws.outs >= 8) {
      reasons.push('Check com draw forte — semi-bluff seria uma opção');
      score += 0;
    }
  }

  // ---- BET / RAISE / ALL-IN analysis ----
  if (lower.includes('bet') || lower.includes('raise') || lower.includes('all-in')) {
    if (tier >= 5) {
      reasons.push('Aposta de valor com mão forte ✓');
      score += 20;
    } else if (tier >= 3) {
      if (boardTexture.type === 'wet') {
        reasons.push('Bet de proteção em board wet — impede draws de ver carta grátis');
        score += 15;
      } else {
        reasons.push('Bet com mão média — sizing é importante aqui');
        score += 5;
      }
    } else if (draws.outs >= 8) {
      reasons.push('Semi-bluff com draw forte — jogada agressiva válida');
      score += 10;
    } else if (tier <= 1 && draws.outs < 4) {
      reasons.push('Bluff com mão fraca e poucos outs — alto risco');
      score -= 20;
      if (boardTexture.type === 'dry') {
        reasons.push('Board seco favorece bluffs em geral');
        score += 10;
      }
    }

    // Sizing context on bet
    const sizing = analyzeSizing(action, pot);
    if (sizing.sizePct !== null) {
      if (tier >= 5 && sizing.sizePct < 50) {
        reasons.push('Sizing pequeno com mão forte — poderia apostar mais para valor');
      } else if (tier <= 1 && sizing.sizePct > 80) {
        reasons.push('Overbet como bluff — polarizado, bom se equilibrado');
      }
    }
  }

  // ---- ALL-IN specifics ----
  if (lower.includes('all-in')) {
    if (tier >= 6) {
      reasons.push('All-in com mão premium — excelente');
      score += 15;
    } else if (tier <= 2 && draws.outs < 8) {
      reasons.push('All-in sem mão forte ou draw — muito arriscado');
      score -= 25;
    }
  }

  // Board texture context
  if (boardTexture.isMonotone && tier < 7) {
    reasons.push('Atenção: board monotone — flush possível');
  }
  if (boardTexture.isPaired && tier < 6) {
    reasons.push('Board pareado — full house possível para o adversário');
  }

  // Determine verdict from score
  let verdict: StreetVerdict;
  if (score >= 65) verdict = 'optimal';
  else if (score >= 50) verdict = 'good';
  else if (score >= 35) verdict = 'acceptable';
  else if (score >= 20) verdict = 'questionable';
  else verdict = 'bad';

  if (reasons.length === 0) {
    reasons.push('Jogada neutra');
  }

  return { verdict, reasons };
}

// ============================================================
// VERDICT DISPLAY
// ============================================================

const VERDICT_MAP: Record<StreetVerdict, { label: string; emoji: string }> = {
  optimal: { label: 'Ótima', emoji: '🎯' },
  good: { label: 'Boa', emoji: '✅' },
  acceptable: { label: 'Aceitável', emoji: '🟡' },
  questionable: { label: 'Questionável', emoji: '⚠️' },
  bad: { label: 'Ruim', emoji: '❌' },
};

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

export interface StreetActionData {
  street: string;
  heroAction: string;
  heroAmount?: number;
  villainAction?: string;
  villainAmount?: number;
  pot: number;
  effectiveStack?: number;
  boardCards?: CardType[];
  heroCards?: CardType[];
}

export function analyzeStreetAction(data: StreetActionData): StreetAnalysis {
  const { street, heroAction, villainAction, pot, boardCards, heroCards } = data;

  // Preflop is handled by GTO ranges, skip detailed analysis
  if (street.toLowerCase() === 'preflop') {
    return {
      street,
      verdict: 'good',
      verdictLabel: '-',
      verdictEmoji: '',
      reasoning: ['Avaliado pelo sistema de ranges GTO'],
    };
  }

  const board = boardCards || [];
  const hero = heroCards || [];

  const boardTexture = analyzeBoardTexture(board);
  const handStrength = classifyHandStrength(hero, board);
  const draws = countHeroDraws(hero, board);
  const sizing = analyzeSizing(heroAction, pot);

  const { verdict, reasons } = getVerdict(handStrength.tier, heroAction, boardTexture, draws, pot, villainAction);
  const { label: verdictLabel, emoji: verdictEmoji } = VERDICT_MAP[verdict];

  // Add draw info to reasoning
  if (draws.hasFlushDraw && !reasons.some(r => r.includes('flush'))) {
    reasons.push(`Flush draw detectado (${draws.outs} outs)`);
  }
  if (draws.hasStraightDraw && !reasons.some(r => r.includes('draw'))) {
    reasons.push(`Straight draw detectado`);
  }

  return {
    street,
    verdict,
    verdictLabel,
    verdictEmoji,
    reasoning: reasons,
    boardTexture,
    handStrength: handStrength.label,
    betSizingAnalysis: sizing.label !== '-' ? sizing.label : undefined,
  };
}

export function getVerdictColor(verdict: StreetVerdict): string {
  switch (verdict) {
    case 'optimal': return 'text-feedback-best';
    case 'good': return 'text-feedback-correct';
    case 'acceptable': return 'text-yellow-400';
    case 'questionable': return 'text-feedback-mistake';
    case 'bad': return 'text-feedback-blunder';
  }
}

export function getVerdictBgColor(verdict: StreetVerdict): string {
  switch (verdict) {
    case 'optimal': return 'bg-feedback-best/15';
    case 'good': return 'bg-feedback-correct/15';
    case 'acceptable': return 'bg-yellow-400/15';
    case 'questionable': return 'bg-feedback-mistake/15';
    case 'bad': return 'bg-feedback-blunder/15';
  }
}
