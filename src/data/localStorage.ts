// GTORei - Sistema de Armazenamento Local
// Gerencia persistência de dados do usuário

import { ActionType, FeedbackType, Position, Scenario } from './gtoRanges';

// Tipos de dados persistentes
export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;
  level: number;
  totalScore: number;
  handsPlayed: number;
  createdAt: string;
  lastActive: string;
}

export interface TrainingSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  handsPlayed: number;
  score: number;
  accuracy: number;
  scenario: Scenario;
  position: Position | 'random';
  stack: number | 'random';
  hands: PlayedHand[];
}

export interface PlayedHand {
  id: string;
  hand: string;
  scenario: Scenario;
  position: Position;
  stack: number;
  userAction: ActionType;
  correctAction: ActionType;
  feedback: FeedbackType;
  points: number;
  evLoss: number;
  timestamp: string;
}

export interface UserSettings {
  difficulty: 'easy' | 'medium' | 'hard' | 'custom';
  timePerDecision: 'unlimited' | 30 | 15 | 7;
  soundEnabled: boolean;
  showHints: boolean;
  displayMode: 'detailed' | 'simplified';
}

export interface FavoriteScenario {
  id: string;
  name: string;
  scenario: Scenario;
  position: Position | 'random';
  stack: number | 'random';
  finalTable: boolean;
  createdAt: string;
}

export interface FavoriteHand {
  id: string;
  hand: string;
  scenario: Scenario;
  position: Position;
  stack: number;
  finalTable: boolean;
  correctAction: ActionType;
  createdAt: string;
}

// Keys do localStorage
const STORAGE_KEYS = {
  USER_PROFILE: 'gtorei_user_profile',
  SESSIONS: 'gtorei_sessions',
  SETTINGS: 'gtorei_settings',
  FAVORITES: 'gtorei_favorites',
  CURRENT_SESSION: 'gtorei_current_session',
  FAVORITE_HANDS: 'gtorei_favorite_hands',
} as const;

// Helpers para localStorage
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

// Gerar ID único
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// User Profile
export function getUserProfile(): UserProfile | null {
  return getItem<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null);
}

export function createUserProfile(username: string): UserProfile {
  const profile: UserProfile = {
    id: generateId(),
    username,
    level: 1,
    totalScore: 0,
    handsPlayed: 0,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.USER_PROFILE, profile);
  return profile;
}

export function updateUserProfile(updates: Partial<UserProfile>): UserProfile | null {
  const profile = getUserProfile();
  if (!profile) return null;

  const updated = { ...profile, ...updates, lastActive: new Date().toISOString() };
  setItem(STORAGE_KEYS.USER_PROFILE, updated);
  return updated;
}

// Sessions
export function getSessions(): TrainingSession[] {
  return getItem<TrainingSession[]>(STORAGE_KEYS.SESSIONS, []);
}

export function getSession(id: string): TrainingSession | undefined {
  return getSessions().find(s => s.id === id);
}

export function saveSession(session: TrainingSession): void {
  const sessions = getSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session);
  }

  // Manter apenas as últimas 100 sessões
  setItem(STORAGE_KEYS.SESSIONS, sessions.slice(0, 100));
}

export function createSession(config: {
  scenario: Scenario;
  position: Position | 'random';
  stack: number | 'random';
}): TrainingSession {
  const session: TrainingSession = {
    id: generateId(),
    startedAt: new Date().toISOString(),
    handsPlayed: 0,
    score: 0,
    accuracy: 0,
    ...config,
    hands: [],
  };
  setItem(STORAGE_KEYS.CURRENT_SESSION, session);
  return session;
}

export function getCurrentSession(): TrainingSession | null {
  return getItem<TrainingSession | null>(STORAGE_KEYS.CURRENT_SESSION, null);
}

export function updateCurrentSession(updates: Partial<TrainingSession>): TrainingSession | null {
  const session = getCurrentSession();
  if (!session) return null;

  const updated = { ...session, ...updates };
  setItem(STORAGE_KEYS.CURRENT_SESSION, updated);
  return updated;
}

export function endCurrentSession(): TrainingSession | null {
  const session = getCurrentSession();
  if (!session) return null;

  const ended = {
    ...session,
    endedAt: new Date().toISOString(),
    accuracy: session.handsPlayed > 0
      ? Math.round((session.hands.filter(h => h.feedback === 'best' || h.feedback === 'correct').length / session.handsPlayed) * 100)
      : 0,
  };

  saveSession(ended);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);

  // Atualizar perfil do usuário
  const profile = getUserProfile();
  if (profile) {
    updateUserProfile({
      totalScore: profile.totalScore + ended.score,
      handsPlayed: profile.handsPlayed + ended.handsPlayed,
      level: calculateLevel(profile.totalScore + ended.score),
    });
  }

  return ended;
}

export function addHandToSession(hand: Omit<PlayedHand, 'id' | 'timestamp'>): PlayedHand | null {
  const session = getCurrentSession();
  if (!session) return null;

  const playedHand: PlayedHand = {
    ...hand,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  updateCurrentSession({
    handsPlayed: session.handsPlayed + 1,
    score: session.score + hand.points,
    hands: [...session.hands, playedHand],
  });

  return playedHand;
}

// Settings
export function getSettings(): UserSettings {
  return getItem<UserSettings>(STORAGE_KEYS.SETTINGS, {
    difficulty: 'medium',
    timePerDecision: 'unlimited',
    soundEnabled: true,
    showHints: true,
    displayMode: 'detailed',
  });
}

export function updateSettings(updates: Partial<UserSettings>): UserSettings {
  const settings = getSettings();
  const updated = { ...settings, ...updates };
  setItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

// Favorites
export function getFavorites(): FavoriteScenario[] {
  return getItem<FavoriteScenario[]>(STORAGE_KEYS.FAVORITES, []);
}

export function addFavorite(favorite: Omit<FavoriteScenario, 'id' | 'createdAt'>): FavoriteScenario {
  const favorites = getFavorites();
  const newFavorite: FavoriteScenario = {
    ...favorite,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.FAVORITES, [newFavorite, ...favorites]);
  return newFavorite;
}

export function removeFavorite(id: string): void {
  const favorites = getFavorites();
  setItem(STORAGE_KEYS.FAVORITES, favorites.filter(f => f.id !== id));
}

// Favorite Hands
export function getFavoriteHands(): FavoriteHand[] {
  return getItem<FavoriteHand[]>(STORAGE_KEYS.FAVORITE_HANDS, []);
}

export function addFavoriteHand(hand: Omit<FavoriteHand, 'id' | 'createdAt'>): FavoriteHand {
  const favorites = getFavoriteHands();
  // Check if already exists
  const exists = favorites.some(f => 
    f.hand === hand.hand && 
    f.scenario === hand.scenario && 
    f.position === hand.position && 
    f.stack === hand.stack
  );
  if (exists) {
    return favorites.find(f => 
      f.hand === hand.hand && 
      f.scenario === hand.scenario && 
      f.position === hand.position && 
      f.stack === hand.stack
    )!;
  }
  
  const newFavorite: FavoriteHand = {
    ...hand,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.FAVORITE_HANDS, [newFavorite, ...favorites]);
  return newFavorite;
}

export function removeFavoriteHand(id: string): void {
  const favorites = getFavoriteHands();
  setItem(STORAGE_KEYS.FAVORITE_HANDS, favorites.filter(f => f.id !== id));
}

export function isHandFavorited(hand: string, scenario: Scenario, position: Position, stack: number): boolean {
  const favorites = getFavoriteHands();
  return favorites.some(f => 
    f.hand === hand && 
    f.scenario === scenario && 
    f.position === position && 
    f.stack === stack
  );
}

// Level calculation
// Iniciante: 0, Amador: 150, Intermediário: 1000, Avançado: 3500,
// Expert: 8000, Mestre: 17500, Lenda: 25000
export function calculateLevel(score: number): number {
  const thresholds = [0, 150, 1000, 3500, 8000, 17500, 25000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (score >= thresholds[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function getLevelName(level: number): string {
  const names = [
    'Iniciante',
    'Amador',
    'Intermediário',
    'Avançado',
    'Expert',
    'Mestre',
    'Lenda',
  ];
  return names[Math.min(level - 1, names.length - 1)];
}

export function getLevelProgress(score: number): { current: number; next: number; progress: number } {
  const thresholds = [0, 150, 1000, 3500, 8000, 17500, 25000, Infinity];
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (score < thresholds[i + 1]) {
      const current = thresholds[i];
      const next = thresholds[i + 1];
      const progress = next === Infinity ? 100 : Math.round(((score - current) / (next - current)) * 100);
      return { current, next, progress };
    }
  }
  return { current: 25000, next: Infinity, progress: 100 };
}

// Statistics
export interface UserStats {
  totalHands: number;
  totalScore: number;
  averageAccuracy: number;
  bestStreak: number;
  feedbackDistribution: Record<FeedbackType, number>;
  positionStats: Record<Position, { hands: number; accuracy: number }>;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export function getUserStats(): UserStats {
  const sessions = getSessions();
  const allHands = sessions.flatMap(s => s.hands);

  const feedbackDistribution: Record<FeedbackType, number> = {
    best: 0,
    correct: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  const positionStats: Record<Position, { hands: number; correct: number }> = {
    UTG: { hands: 0, correct: 0 },
    UTG1: { hands: 0, correct: 0 },
    LJ: { hands: 0, correct: 0 },
    HJ: { hands: 0, correct: 0 },
    CO: { hands: 0, correct: 0 },
    BTN: { hands: 0, correct: 0 },
    SB: { hands: 0, correct: 0 },
    BB: { hands: 0, correct: 0 },
  };

  let bestStreak = 0;
  let currentStreak = 0;

  allHands.forEach(hand => {
    feedbackDistribution[hand.feedback]++;

    if (positionStats[hand.position]) {
      positionStats[hand.position].hands++;
      if (hand.feedback === 'best' || hand.feedback === 'correct') {
        positionStats[hand.position].correct++;
      }
    }

    if (hand.feedback === 'best' || hand.feedback === 'correct') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });

  const correctHands = feedbackDistribution.best + feedbackDistribution.correct;
  const averageAccuracy = allHands.length > 0 ? Math.round((correctHands / allHands.length) * 100) : 0;

  // Calculate trend based on last 5 sessions
  const recentSessions = sessions.slice(0, 5);
  const olderSessions = sessions.slice(5, 10);

  let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (recentSessions.length >= 3 && olderSessions.length >= 3) {
    const recentAvg = recentSessions.reduce((a, s) => a + s.accuracy, 0) / recentSessions.length;
    const olderAvg = olderSessions.reduce((a, s) => a + s.accuracy, 0) / olderSessions.length;
    if (recentAvg > olderAvg + 5) recentTrend = 'improving';
    else if (recentAvg < olderAvg - 5) recentTrend = 'declining';
  }

  const positionStatsWithAccuracy = Object.fromEntries(
    Object.entries(positionStats).map(([pos, stats]) => [
      pos,
      {
        hands: stats.hands,
        accuracy: stats.hands > 0 ? Math.round((stats.correct / stats.hands) * 100) : 0,
      },
    ])
  ) as Record<Position, { hands: number; accuracy: number }>;

  const profile = getUserProfile();

  return {
    totalHands: profile?.handsPlayed || allHands.length,
    totalScore: profile?.totalScore || 0,
    averageAccuracy,
    bestStreak,
    feedbackDistribution,
    positionStats: positionStatsWithAccuracy,
    recentTrend,
  };
}
