// GTORei - Sistema de Rastreamento de Mãos Jogadas
// Impede que jogadores ganhem pontos rejogando a mesma mão

import { Scenario, Position, ActionType, FeedbackType } from './gtoRanges';

export interface PlayedHandEntry {
  handId: string;
  timestamp: string;
  action: ActionType;
  points: number;
  feedback: FeedbackType;
}

const STORAGE_KEY = 'gtorei_played_hands_session';

// Gerar ID único para uma mão
export function generateHandId(
  scenario: Scenario,
  position: Position,
  stack: number,
  heroCards: string // ex: "KsQh"
): string {
  return `${scenario}-${position}-${stack}BB-${heroCards}`;
}

// Obter todas as mãos jogadas na sessão atual
export function getPlayedHands(): Record<string, PlayedHandEntry> {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Verificar se uma mão já foi jogada
export function isHandAlreadyPlayed(handId: string): boolean {
  const playedHands = getPlayedHands();
  return handId in playedHands;
}

// Obter dados de uma mão já jogada
export function getPlayedHandData(handId: string): PlayedHandEntry | null {
  const playedHands = getPlayedHands();
  return playedHands[handId] || null;
}

// Registrar uma mão como jogada
export function markHandAsPlayed(
  handId: string,
  action: ActionType,
  points: number,
  feedback: FeedbackType
): void {
  const playedHands = getPlayedHands();
  playedHands[handId] = {
    handId,
    timestamp: new Date().toISOString(),
    action,
    points,
    feedback,
  };
  
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(playedHands));
  } catch (e) {
    console.error('Error saving played hand:', e);
  }
}

// Limpar sessão de mãos jogadas (para reset)
export function clearPlayedHandsSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

// Obter contagem de mãos jogadas na sessão
export function getPlayedHandsCount(): number {
  return Object.keys(getPlayedHands()).length;
}
