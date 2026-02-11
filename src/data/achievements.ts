// Definições de conquistas do GTORei

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: 'level' | 'streak' | 'volume' | 'accuracy';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Nível / XP
  { key: 'level_2', name: 'Amador', description: 'Atingir o nível Amador', icon: '🃏', category: 'level' },
  { key: 'level_3', name: 'Intermediário', description: 'Atingir o nível Intermediário', icon: '♠️', category: 'level' },
  { key: 'level_4', name: 'Avançado', description: 'Atingir o nível Avançado', icon: '♦️', category: 'level' },
  { key: 'level_5', name: 'Expert', description: 'Atingir o nível Expert', icon: '♣️', category: 'level' },
  { key: 'level_6', name: 'Mestre', description: 'Atingir o nível Mestre', icon: '👑', category: 'level' },
  { key: 'level_7', name: 'Lenda', description: 'Atingir o nível Lenda', icon: '🏆', category: 'level' },

  // Sequência (streak)
  { key: 'streak_5', name: 'Aquecendo', description: '5 acertos seguidos', icon: '🔥', category: 'streak' },
  { key: 'streak_10', name: 'Em Chamas', description: '10 acertos seguidos', icon: '💥', category: 'streak' },
  { key: 'streak_25', name: 'Imparável', description: '25 acertos seguidos', icon: '⚡', category: 'streak' },
  { key: 'streak_50', name: 'Máquina GTO', description: '50 acertos seguidos', icon: '🤖', category: 'streak' },

  // Volume
  { key: 'hands_10', name: 'Primeiro Passo', description: 'Jogar 10 mãos', icon: '👣', category: 'volume' },
  { key: 'hands_50', name: 'Dedicado', description: 'Jogar 50 mãos', icon: '💪', category: 'volume' },
  { key: 'hands_100', name: 'Centenário', description: 'Jogar 100 mãos', icon: '💯', category: 'volume' },
  { key: 'hands_500', name: 'Grinder', description: 'Jogar 500 mãos', icon: '🎰', category: 'volume' },
  { key: 'hands_1000', name: 'Maratonista', description: 'Jogar 1000 mãos', icon: '🏅', category: 'volume' },

  // Precisão
  { key: 'session_perfect', name: 'Sessão Perfeita', description: '100% de acurácia em uma sessão (mín. 10 mãos)', icon: '✨', category: 'accuracy' },
  { key: 'accuracy_90', name: 'Precisão Cirúrgica', description: '90%+ de acurácia em uma sessão (mín. 20 mãos)', icon: '🎯', category: 'accuracy' },
  { key: 'best_10', name: 'Dez Best', description: 'Obter 10 feedbacks "Best" em uma sessão', icon: '⭐', category: 'accuracy' },
];

export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.key === key);
}

export const CATEGORY_LABELS: Record<AchievementDef['category'], string> = {
  level: 'Nível',
  streak: 'Sequência',
  volume: 'Volume',
  accuracy: 'Precisão',
};
