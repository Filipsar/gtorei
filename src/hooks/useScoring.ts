 // Sistema de pontuação baseado em nível
 // Quanto maior o nível, menos pontos ganha e mais pontos perde
 // Erros consecutivos dobram a perda
 
 import { FeedbackType } from '@/data/gtoRanges';
 
 interface ScoringConfig {
   level: number;
   consecutiveErrors: number;
 }
 
 interface ScoringResult {
   points: number;
   newConsecutiveErrors: number;
 }
 
// Multiplicadores por nível (1 = Iniciante, 7 = Lenda)
const LEVEL_MULTIPLIERS = {
  gain: [1.3, 1.15, 1.0, 0.8, 0.6, 0.35, 0.2], // Iniciante ganha muito, Lenda ganha pouco
  loss: [0.3, 0.5, 0.8, 1.0, 1.4, 1.8, 2.5],    // Iniciante perde pouco, Lenda perde muito
};

// Base points for each feedback type
const BASE_POINTS: Record<FeedbackType, number> = {
  best: 15,
  correct: 10,
  inaccuracy: -3,
  mistake: -8,
  blunder: -30,
};
 
 export function calculatePoints(
   feedback: FeedbackType,
   evLoss: number,
   config: ScoringConfig
 ): ScoringResult {
   const levelIndex = Math.min(config.level - 1, 6);
   const gainMultiplier = LEVEL_MULTIPLIERS.gain[levelIndex];
   const lossMultiplier = LEVEL_MULTIPLIERS.loss[levelIndex];
 
   let basePoints = BASE_POINTS[feedback];
   let newConsecutiveErrors = config.consecutiveErrors;
 
   // Apply EV loss for blunders
   if (feedback === 'blunder') {
     basePoints = Math.min(-5, Math.round(-5 - evLoss * 10));
   }
 
   let points: number;
 
   if (basePoints >= 0) {
     // Positive feedback - apply gain multiplier
     points = Math.round(basePoints * gainMultiplier);
     newConsecutiveErrors = 0; // Reset consecutive errors
   } else {
     // Negative feedback - apply loss multiplier and consecutive error penalty
     const consecutiveMultiplier = config.consecutiveErrors > 0 ? 2 : 1;
     points = Math.round(basePoints * lossMultiplier * consecutiveMultiplier);
     newConsecutiveErrors = config.consecutiveErrors + 1;
   }
 
    // inaccuracy and mistake are already negative and handled by loss multiplier above
 
   return { points, newConsecutiveErrors };
 }
 
 export function getLevelPointsInfo(level: number) {
   const levelIndex = Math.min(level - 1, 6);
   const gainMultiplier = LEVEL_MULTIPLIERS.gain[levelIndex];
   const lossMultiplier = LEVEL_MULTIPLIERS.loss[levelIndex];
 
   return {
     gainMultiplier,
     lossMultiplier,
     description: `Nível ${level}: ${Math.round(gainMultiplier * 100)}% ganho / ${Math.round(lossMultiplier * 100)}% perda`,
   };
 }