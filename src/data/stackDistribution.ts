// GTORei - Distribuição Realista de Stacks por Modo
// Gera stacks variados para oponentes baseado no modo de jogo e stack do herói

import { Position, POSITIONS, STACK_SIZES } from './ranges/types';
import type { GameMode, Scenario } from './ranges/types';

export interface StackDistribution {
  hero: number;
  villain: number;
  all: Record<Position, number>;
  effectiveStack: number;
}

// Snap to nearest valid STACK_SIZE for range lookup
function snapToStack(value: number): number {
  let closest = STACK_SIZES[0];
  let minDiff = Math.abs(value - closest);
  for (const s of STACK_SIZES) {
    const diff = Math.abs(value - s);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest;
}

// Random float in range [min, max]
function randRange(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

// Position-based stack multiplier for 8-max (earlier positions tend to have deeper stacks)
const POSITION_STACK_RANGES: Record<Position, [number, number]> = {
  UTG:  [0.7, 1.3],
  UTG1: [0.6, 1.1],
  LJ:   [0.5, 1.0],
  HJ:   [0.45, 0.95],
  CO:   [0.4, 0.85],
  BTN:  [0.35, 0.8],
  SB:   [0.3, 0.7],
  BB:   [0.25, 0.65],
};

function generatePositionStack(heroStack: number, position: Position, mode: GameMode): number {
  let min: number, max: number;

  if (mode === 'hu') {
    // HU: villain gets 70-120% of hero stack
    min = heroStack * 0.7;
    max = heroStack * 1.2;
  } else if (mode === 'threehand') {
    const ranges: Record<string, [number, number]> = {
      BTN: [heroStack * 0.85, heroStack * 1.1],
      SB:  [heroStack * 0.6, heroStack * 0.85],
      BB:  [heroStack * 0.4, heroStack * 0.75],
    };
    const r = ranges[position] || [heroStack * 0.5, heroStack * 0.9];
    min = r[0];
    max = r[1];
  } else if (mode === 'bounty') {
    // Bounty: more short stacks, occasional big stacks
    const isShort = Math.random() < 0.5;
    if (isShort) {
      min = Math.max(8, heroStack * 0.3);
      max = Math.max(10, heroStack * 0.6);
    } else {
      min = heroStack * 0.7;
      max = heroStack * 1.4;
    }
  } else {
    // 8-max: position-based distribution
    const [multMin, multMax] = POSITION_STACK_RANGES[position];
    min = heroStack * multMin;
    max = heroStack * multMax;
  }

  // Clamp to valid range
  const raw = randRange(Math.max(8, min), Math.max(10, max));
  return snapToStack(raw);
}

/**
 * Gera distribuição de stacks para todos os jogadores na mesa.
 * O herói mantém o stack escolhido; vilões recebem stacks realistas.
 */
export function getStackDistribution(
  heroStack: number,
  heroPosition: Position,
  mode: GameMode,
  scenario: Scenario,
  villainPosition?: Position,
  availablePositions?: Position[]
): StackDistribution {
  const positions = availablePositions || POSITIONS;
  const all: Record<Position, number> = {} as Record<Position, number>;

  // Generate stacks for all positions
  for (const pos of positions) {
    if (pos === heroPosition) {
      all[pos] = heroStack;
    } else {
      all[pos] = generatePositionStack(heroStack, pos, mode);
    }
  }

  // Ensure minimum 1.5x difference between hero and main villain for interesting spots
  if (villainPosition && all[villainPosition]) {
    const ratio = heroStack / all[villainPosition];
    // If stacks are too similar (within 20%), add some variance
    if (ratio > 0.8 && ratio < 1.2 && Math.random() < 0.5) {
      // Make villain noticeably different
      const direction = Math.random() < 0.5 ? 'shorter' : 'deeper';
      if (direction === 'shorter') {
        all[villainPosition] = snapToStack(Math.max(8, heroStack * randRange(0.4, 0.7)));
      } else {
        all[villainPosition] = snapToStack(Math.min(100, heroStack * randRange(1.3, 1.8)));
      }
    }
  }

  // Apply scenario-specific adjustments to villain
  if (villainPosition && all[villainPosition]) {
    if (scenario === 'vsOpenShove') {
      // Shover tends to be shorter
      all[villainPosition] = snapToStack(Math.max(8, Math.min(all[villainPosition], heroStack * 0.8)));
    }
  }

  const villainStack = villainPosition ? all[villainPosition] : heroStack;
  const effectiveStack = Math.min(heroStack, villainStack);

  return {
    hero: heroStack,
    villain: villainStack,
    all,
    effectiveStack: snapToStack(effectiveStack),
  };
}
