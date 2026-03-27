// GTORei - Range System Types

export type Suit = 's' | 'h' | 'd' | 'c';
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2';
export type ActionType = 'fold' | 'call' | 'raise' | 'allin';
export type Position = 'UTG' | 'UTG1' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Scenario = 'openRaise' | 'vsOpenRaise' | 'vs3bet' | 'vsOpenShove' | 'simulation' | 'multiway';
export type GameMode = '8max' | '6max' | 'hu' | 'threehand' | 'bounty';
export type FeedbackType = 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';

export interface ActionFrequency {
  action: ActionType;
  frequency: number; // 0-100
  ev?: number;
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

export interface HandEntry {
  hand: string;
  highIdx: number;
  lowIdx: number;
  suited: boolean;
  pair: boolean;
  baseStrength: number;
}

export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
export const POSITIONS: Position[] = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const STACK_SIZES = [8, 9, 10, 12, 14, 17, 20, 25, 30, 35, 40, 50, 60, 80, 100];

export const SCENARIOS: { id: Scenario; label: string; description: string }[] = [
  { id: 'openRaise', label: 'Open Raise', description: 'Primeiro a entrar no pote' },
  { id: 'vsOpenRaise', label: 'Vs Open Raise', description: 'Enfrentando um open raise' },
  { id: 'vs3bet', label: 'vs 3-bet', description: 'Enfrentando uma 3-bet após seu raise' },
  { id: 'vsOpenShove', label: 'Vs Open Shove', description: 'Enfrentando um all-in' },
  { id: 'simulation', label: 'Simulação', description: 'Jogue a mão até o final (flop, turn, river)' },
  { id: 'multiway', label: 'Multiway', description: 'Pote com múltiplos jogadores' },
];
