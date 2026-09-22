// Definições de conquistas do GTORei

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  category: 'level' | 'streak' | 'volume' | 'accuracy';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Nível / XP
  { key: 'level_2', name: 'Amador', description: 'Atingir o nível Amador', category: 'level' },
  { key: 'level_3', name: 'Intermediário', description: 'Atingir o nível Intermediário', category: 'level' },
  { key: 'level_4', name: 'Avançado', description: 'Atingir o nível Avançado', category: 'level' },
  { key: 'level_5', name: 'Expert', description: 'Atingir o nível Expert', category: 'level' },
  { key: 'level_6', name: 'Mestre', description: 'Atingir o nível Mestre', category: 'level' },
  { key: 'level_7', name: 'Lenda', description: 'Atingir o nível Lenda', category: 'level' },
  { key: 'level_8', name: 'GTO Rei', description: 'Atingir o nível supremo GTO Rei', category: 'level' },

  // Sequência (streak)
  { key: 'streak_5', name: 'Aquecendo', description: '5 acertos seguidos', category: 'streak' },
  { key: 'streak_10', name: 'Em Chamas', description: '10 acertos seguidos', category: 'streak' },
  { key: 'streak_25', name: 'Imparável', description: '25 acertos seguidos', category: 'streak' },
  { key: 'streak_50', name: 'Máquina GTO', description: '50 acertos seguidos', category: 'streak' },
  { key: 'streak_100', name: 'Inabalável', description: '100 acertos seguidos', category: 'streak' },
  { key: 'streak_200', name: 'Sobrenatural', description: '200 acertos seguidos', category: 'streak' },

  // Volume
  { key: 'hands_10', name: 'Primeiro Passo', description: 'Jogar 10 mãos', category: 'volume' },
  { key: 'hands_50', name: 'Dedicado', description: 'Jogar 50 mãos', category: 'volume' },
  { key: 'hands_100', name: 'Centenário', description: 'Jogar 100 mãos', category: 'volume' },
  { key: 'hands_500', name: 'Grinder', description: 'Jogar 500 mãos', category: 'volume' },
  { key: 'hands_1000', name: 'Maratonista', description: 'Jogar 1000 mãos', category: 'volume' },
  { key: 'hands_2500', name: 'Profissional', description: 'Jogar 2.500 mãos', category: 'volume' },
  { key: 'hands_5000', name: 'Veterano', description: 'Jogar 5.000 mãos', category: 'volume' },
  { key: 'hands_10000', name: 'Ironman GTO', description: 'Jogar 10.000 mãos', category: 'volume' },

  // Precisão
  { key: 'session_perfect', name: 'Sessão Perfeita', description: '100% de acurácia em uma sessão (mín. 10 mãos)', category: 'accuracy' },
  { key: 'accuracy_90', name: 'Precisão Cirúrgica', description: '90%+ de acurácia em uma sessão (mín. 20 mãos)', category: 'accuracy' },
  { key: 'best_10', name: 'Dez Best', description: 'Obter 10 feedbacks "Best" em uma sessão', category: 'accuracy' },
  { key: 'session_perfect_50', name: 'Perfeição Estendida', description: '100% de acurácia em sessão de 50+ mãos', category: 'accuracy' },
  { key: 'accuracy_95', name: 'Sniper GTO', description: '95%+ de acurácia em sessão de 100+ mãos', category: 'accuracy' },
  { key: 'accuracy_98', name: 'Solver Humano', description: '98%+ de acurácia em sessão de 50+ mãos', category: 'accuracy' },
  { key: 'best_25', name: 'Vinte e Cinco Best', description: 'Obter 25 feedbacks "Best" em uma sessão', category: 'accuracy' },
  { key: 'best_50', name: 'Cinquenta Best', description: 'Obter 50 feedbacks "Best" em uma sessão', category: 'accuracy' },
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
