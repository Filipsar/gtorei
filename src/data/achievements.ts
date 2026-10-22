// Definições de conquistas do GTORei

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  category: 'level' | 'streak' | 'volume' | 'accuracy' | 'challenge' | 'referral';
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

  // Desafios diários (concedidas pelo servidor ao resgatar: claim_daily_challenge)
  { key: 'desafio_1', name: 'Primeiro Desafio', description: 'Resgatar o primeiro desafio diário', category: 'challenge' },
  { key: 'desafio_10', name: 'Rotina', description: 'Resgatar 10 desafios diários', category: 'challenge' },
  { key: 'desafio_50', name: 'Disciplina', description: 'Resgatar 50 desafios diários', category: 'challenge' },
  { key: 'desafio_100', name: 'Cem Desafios', description: 'Resgatar 100 desafios diários', category: 'challenge' },
  { key: 'dia_perfeito', name: 'Dia Perfeito', description: 'Resgatar os 3 desafios do mesmo dia', category: 'challenge' },
  { key: 'desafio_seq_3', name: 'Constância', description: 'Desafio resgatado em 3 dias seguidos', category: 'challenge' },
  { key: 'desafio_seq_7', name: 'Semana Cheia', description: 'Desafio resgatado em 7 dias seguidos', category: 'challenge' },
  { key: 'desafio_seq_30', name: 'Mês de Ferro', description: 'Desafio resgatado em 30 dias seguidos', category: 'challenge' },

  // Indicação (concedidas pelo servidor quando o indicado completa 50 mãos)
  { key: 'indica_1', name: 'Primeiro Convite', description: '1 amigo indicado treinou 50 mãos', category: 'referral' },
  { key: 'indica_5', name: 'Anfitrião', description: '5 indicados válidos', category: 'referral' },
  { key: 'indica_15', name: 'Recrutador', description: '15 indicados válidos', category: 'referral' },
  { key: 'indica_40', name: 'Líder de Mesa', description: '40 indicados válidos', category: 'referral' },
  { key: 'indica_100', name: 'Embaixador GTORei', description: '100 indicados válidos', category: 'referral' },
];

export function getAchievement(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.key === key);
}

export const CATEGORY_LABELS: Record<AchievementDef['category'], string> = {
  level: 'Nível',
  streak: 'Sequência',
  volume: 'Volume',
  accuracy: 'Precisão',
  challenge: 'Desafios diários',
  referral: 'Indicação',
};
