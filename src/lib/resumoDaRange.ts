// Quanto de uma range vai para cada ação, pesado por combos (1.326 no total).
// A aba Tabelas somava as 169 classes como se fossem iguais: AA (6 combos)
// pesava o mesmo que AKo (12), e o "% da range" não batia com a range.
import type { ActionType, HandData } from '@/data/gtoRanges';

export const TOTAL_DE_COMBOS = 1326;

export const combosDaMao = (h: { pair: boolean; suited: boolean }) => (h.pair ? 6 : h.suited ? 4 : 12);

export function resumoDaRange(hands: HandData[]): Record<ActionType, number> {
  const combos: Record<ActionType, number> = { fold: 0, call: 0, raise: 0, allin: 0 };
  for (const h of hands) for (const a of h.actions) combos[a.action] += (a.frequency / 100) * combosDaMao(h);
  return combos;
}
