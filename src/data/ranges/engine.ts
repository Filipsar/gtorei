// GTORei - Range Generation Engine
// Generates GTO ranges per game mode, scenario, position, and stack

import {
  ActionFrequency, ActionType, HandData, HandEntry,
  Position, RangeData, Scenario, GameMode, RANKS, STACK_SIZES
} from './types';
import { HAND_ORDER } from './handorder.generated';
import { PF_HANDS, PF_SHOVE, PF_CALL, PF_STACKS, decodePF } from './pushfold.generated';

// ============================================================
// HAND STRENGTH CALCULATION
// ============================================================

// A força vem da ordem calculada em handorder.generated.ts (equity contra o
// top 40% mais jogabilidade). A fórmula anterior punha Q8s e J8s à frente de
// 66 e 55, e KJo à frente de ATo.
const ORDER_INDEX = new Map(HAND_ORDER.map((h, i) => [h, i]));
function baseHandStrength(hand: string): number {
  const i = ORDER_INDEX.get(hand);
  if (i === undefined) return 0;
  return 100 - (i / (HAND_ORDER.length - 1)) * 100;
}

let _allHandsRaw: HandEntry[] | null = null;

function getAllHandsRaw(): HandEntry[] {
  if (_allHandsRaw) return _allHandsRaw;
  const hands: HandEntry[] = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      if (i === j) {
        hands.push({
          hand: `${RANKS[i]}${RANKS[j]}`,
          highIdx: i, lowIdx: i,
          suited: false, pair: true,
          baseStrength: baseHandStrength(`${RANKS[i]}${RANKS[j]}`),
        });
      } else if (i < j) {
        hands.push({
          hand: `${RANKS[i]}${RANKS[j]}s`,
          highIdx: i, lowIdx: j,
          suited: true, pair: false,
          baseStrength: baseHandStrength(`${RANKS[i]}${RANKS[j]}s`),
        });
      } else {
        hands.push({
          hand: `${RANKS[j]}${RANKS[i]}o`,
          highIdx: j, lowIdx: i,
          suited: false, pair: false,
          baseStrength: baseHandStrength(`${RANKS[j]}${RANKS[i]}o`),
        });
      }
    }
  }
  _allHandsRaw = hands;
  return hands;
}

function adjustStrengthForMode(h: HandEntry, gameMode: GameMode): number {
  let s = h.baseStrength;
  if (gameMode === 'hu') {
    if (h.suited) s += 4;
    if (h.highIdx === 0 && !h.pair) s += 6; // Ace-x
    if (h.pair) s += 4;
    s += 6; // General shorthanded boost
  } else if (gameMode === 'threehand') {
    if (h.suited) s += 3;
    if (h.highIdx === 0 && !h.pair) s += 4;
    if (h.pair) s += 3;
    s += 3;
  }
  return Math.max(0, Math.min(100, s));
}

const _sortedCache = new Map<GameMode, HandEntry[]>();

function getSortedHands(gameMode: GameMode): HandEntry[] {
  if (_sortedCache.has(gameMode)) return _sortedCache.get(gameMode)!;
  const raw = getAllHandsRaw();
  const adjusted = raw.map(h => ({
    ...h,
    baseStrength: adjustStrengthForMode(h, gameMode),
  }));
  adjusted.sort((a, b) => b.baseStrength - a.baseStrength);
  _sortedCache.set(gameMode, adjusted);
  return adjusted;
}

// ============================================================
// MODE CONFIGURATIONS
// Per-mode, per-position action percentages at 30BB base stack
// ============================================================

interface ScenarioPercent {
  raise?: number;
  call?: number;
  allin?: number;
}

type PositionScenarios = Partial<Record<Scenario, ScenarioPercent>>;
type ModeConfigMap = Partial<Record<Position, PositionScenarios>>;

const EIGHT_MAX_BASE: ModeConfigMap = {
  UTG:  { openRaise: { raise: 15 }, vsOpenRaise: { raise: 4, call: 4 },  vs3bet: { allin: 3, call: 5 },  vsOpenShove: { call: 8 },  simulation: { raise: 4, call: 4 },  multiway: { raise: 3, call: 3 } },
  UTG1: { openRaise: { raise: 18 }, vsOpenRaise: { raise: 4, call: 6 },  vs3bet: { allin: 3, call: 5 },  vsOpenShove: { call: 9 },  simulation: { raise: 4, call: 6 },  multiway: { raise: 3, call: 4 } },
  LJ:   { openRaise: { raise: 18 }, vsOpenRaise: { raise: 5, call: 8 },  vs3bet: { allin: 3, call: 6 },  vsOpenShove: { call: 10 }, simulation: { raise: 5, call: 8 },  multiway: { raise: 4, call: 6 } },
  HJ:   { openRaise: { raise: 22 }, vsOpenRaise: { raise: 6, call: 10 }, vs3bet: { allin: 4, call: 7 },  vsOpenShove: { call: 12 }, simulation: { raise: 6, call: 10 }, multiway: { raise: 5, call: 8 } },
  CO:   { openRaise: { raise: 28 }, vsOpenRaise: { raise: 8, call: 12 }, vs3bet: { allin: 5, call: 9 },  vsOpenShove: { call: 15 }, simulation: { raise: 8, call: 12 }, multiway: { raise: 6, call: 10 } },
  BTN:  { openRaise: { raise: 45 }, vsOpenRaise: { raise: 10, call: 18 },vs3bet: { allin: 5, call: 10 }, vsOpenShove: { call: 20 }, simulation: { raise: 10, call: 18 }, multiway: { raise: 8, call: 14 } },
  SB:   { openRaise: { raise: 40 }, vsOpenRaise: { raise: 10, call: 12 },vs3bet: { allin: 4, call: 8 },  vsOpenShove: { call: 18 }, simulation: { raise: 10, call: 12 }, multiway: { raise: 7, call: 10 } },
  BB:   { openRaise: { raise: 0 },  vsOpenRaise: { raise: 10, call: 25 },vs3bet: { allin: 5, call: 10 }, vsOpenShove: { call: 25 }, simulation: { raise: 10, call: 25 }, multiway: { raise: 6, call: 18 } },
};

// 6-max maps positions: UTG(6max)->LJ(8max), HJ->HJ, CO->CO, BTN->BTN, SB->SB, BB->BB
const SIX_MAX_BASE: ModeConfigMap = {
  UTG:  EIGHT_MAX_BASE.LJ!,   // 6max UTG ≈ 8max LJ (wider opening)
  HJ:   EIGHT_MAX_BASE.HJ!,
  CO:   EIGHT_MAX_BASE.CO!,
  BTN:  EIGHT_MAX_BASE.BTN!,
  SB:   EIGHT_MAX_BASE.SB!,
  BB:   EIGHT_MAX_BASE.BB!,
};

const MODE_CONFIGS: Record<GameMode, ModeConfigMap> = {
  '8max': EIGHT_MAX_BASE,
  '6max': SIX_MAX_BASE,
  hu: {
    SB: { openRaise: { raise: 70 }, vsOpenRaise: { raise: 0, call: 0 },  vs3bet: { allin: 10, call: 15 }, vsOpenShove: { call: 30 } },
    BB: { openRaise: { raise: 0 },  vsOpenRaise: { raise: 20, call: 45 },vs3bet: { allin: 8, call: 12 },  vsOpenShove: { call: 40 } },
  },
  threehand: {
    BTN: { openRaise: { raise: 50 }, vsOpenRaise: { raise: 0, call: 0 },  vs3bet: { allin: 7, call: 12 }, vsOpenShove: { call: 22 } },
    SB:  { openRaise: { raise: 35 }, vsOpenRaise: { raise: 15, call: 18 },vs3bet: { allin: 6, call: 10 }, vsOpenShove: { call: 25 } },
    BB:  { openRaise: { raise: 0 },  vsOpenRaise: { raise: 12, call: 28 },vs3bet: { allin: 6, call: 12 }, vsOpenShove: { call: 30 } },
  },
  bounty: { ...EIGHT_MAX_BASE },
};

// ============================================================
// STACK ADJUSTMENTS
// ============================================================

interface StackMult {
  open: number;
  call: number;
  raise3bet: number;
  allin: number;
}

function getStackMult(stack: number, gameMode: GameMode): StackMult {
  if (gameMode === 'hu') {
    if (stack <= 10) return { open: 0.78, call: 0.7, raise3bet: 0.2, allin: 3.5 };
    if (stack <= 15) return { open: 0.88, call: 0.8, raise3bet: 0.4, allin: 2.2 };
    if (stack <= 20) return { open: 0.95, call: 0.9, raise3bet: 0.7, allin: 1.5 };
    if (stack <= 30) return { open: 1.0, call: 1.0, raise3bet: 1.0, allin: 1.0 };
    if (stack <= 50) return { open: 1.05, call: 1.1, raise3bet: 1.1, allin: 0.5 };
    return { open: 1.1, call: 1.2, raise3bet: 1.2, allin: 0.3 };
  }
  if (stack <= 10) return { open: 1.2, call: 0.7, raise3bet: 0.4, allin: 2.5 };
  if (stack <= 14) return { open: 1.1, call: 0.8, raise3bet: 0.6, allin: 1.8 };
  if (stack <= 20) return { open: 1.05, call: 0.9, raise3bet: 0.8, allin: 1.3 };
  if (stack <= 30) return { open: 1.0, call: 1.0, raise3bet: 1.0, allin: 1.0 };
  if (stack <= 50) return { open: 0.95, call: 1.1, raise3bet: 1.1, allin: 0.6 };
  if (stack <= 80) return { open: 0.9, call: 1.15, raise3bet: 1.15, allin: 0.4 };
  return { open: 0.85, call: 1.2, raise3bet: 1.2, allin: 0.2 };
}

// ============================================================
// ICM ADJUSTMENTS
// ============================================================

function getICMMult(position: Position, stack: number): number {
  let m = 0.85;
  if (['UTG', 'UTG1', 'LJ'].includes(position)) m *= 0.85;
  if (stack >= 15 && stack <= 30) m *= 0.9;
  return m;
}

// ============================================================
// BOUNTY CALCULATIONS
// ============================================================

export function calculateBountyMultiplier(heroBounty: number, opponentBounty: number): number {
  if (heroBounty <= 0) return 1;
  return opponentBounty / heroBounty;
}

export function calculateBountyEV(
  handEquity: number,
  potSize: number,
  bountyValue: number,
  callAmount: number
): number {
  const potEV = handEquity * potSize - (1 - handEquity) * callAmount;
  const bountyEV = handEquity * bountyValue;
  return potEV + bountyEV;
}

// Backward compat: old-style bounty adjustment (strength modifier)
export function calculateBountyAdjustment(heroBounty: number, opponentBounty: number): number {
  if (heroBounty <= 0) return 0;
  const ratio = opponentBounty / heroBounty;
  return Math.round((ratio - 1) * 15);
}

function getBountyCallWidening(bountyMultiplier: number): number {
  const tiers = [
    { mult: 0.5, w: 5 },
    { mult: 1.0, w: 10 },
    { mult: 1.5, w: 18 },
    { mult: 2.0, w: 25 },
    { mult: 3.0, w: 35 },
  ];
  if (bountyMultiplier <= tiers[0].mult) return tiers[0].w;
  if (bountyMultiplier >= tiers[tiers.length - 1].mult) return tiers[tiers.length - 1].w;
  for (let i = 0; i < tiers.length - 1; i++) {
    if (bountyMultiplier >= tiers[i].mult && bountyMultiplier <= tiers[i + 1].mult) {
      const t = (bountyMultiplier - tiers[i].mult) / (tiers[i + 1].mult - tiers[i].mult);
      return tiers[i].w + t * (tiers[i + 1].w - tiers[i].w);
    }
  }
  return 10;
}

// ============================================================
// SCENARIO CONFIG RESOLUTION
// ============================================================

function getScenarioConfig(
  gameMode: GameMode,
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean,
  bountyMultiplier: number,
  multiwayPlayers: number = 3
): { raisePercent: number; callPercent: number; allinPercent: number } {
  const posScenarios = MODE_CONFIGS[gameMode]?.[position];
  // No pré-flop a simulação é o mesmo spot do vsOpenRaise: alguém abriu e o
  // herói responde. Onde o modo não declara simulation — hu e threehand nunca
  // declararam — a busca voltava vazia e a range saía 100% fold, marcando
  // qualquer raise ou call como erro. Agora a simulação herda o vsOpenRaise.
  const posConfig = posScenarios?.[scenario] ?? (scenario === 'simulation' ? posScenarios?.vsOpenRaise : undefined);
  let raisePercent = posConfig?.raise || 0;
  let callPercent = posConfig?.call || 0;
  let allinPercent = posConfig?.allin || 0;

  const sm = getStackMult(stack, gameMode);

  if (scenario === 'openRaise') {
    // HU/threehand short stack: convert raises to allins (push/fold)
    if ((gameMode === 'hu' || gameMode === 'threehand') && stack <= 17) {
      const pushRatio = Math.max(0, Math.min(1, (17 - stack) / 7));
      const totalOpen = raisePercent * sm.open;
      allinPercent = totalOpen * pushRatio;
      raisePercent = totalOpen * (1 - pushRatio);
    } else {
      raisePercent *= sm.open;
      // Standard short-stack allin shift
      if (stack <= 12) {
        const shift = raisePercent * 0.2;
        allinPercent += shift;
        raisePercent -= shift;
      }
    }
  } else if (scenario === 'vsOpenRaise' || scenario === 'simulation') {
    raisePercent *= sm.raise3bet;
    callPercent *= sm.call;
    // 3-bet shove range: at ≤40bb, convert a portion of raises to all-ins
    // Premium hands (AA, KK, QQ, AKs) should have all-in frequency
    if (stack <= 40) {
      // Progressive shove ratio: more all-ins at lower stacks
      const shoveRatio = Math.max(0, Math.min(0.6, (40 - stack) / 30));
      const shoveFromRaise = raisePercent * shoveRatio;
      allinPercent += shoveFromRaise;
      raisePercent -= shoveFromRaise;
      // At very short stacks (≤20bb), add extra all-in width
      if (stack <= 20) {
        const extraShove = raisePercent * 0.3;
        allinPercent += extraShove;
        raisePercent -= extraShove;
      }
    }
  } else if (scenario === 'multiway') {
    raisePercent *= sm.raise3bet;
    callPercent *= sm.call;
    // Tighten ranges based on number of players in pot
    // More players = tighter ranges (less raise, more fold)
    const tightenFactor = Math.max(0.4, 1 - (multiwayPlayers - 2) * 0.15);
    raisePercent *= tightenFactor;
    callPercent *= tightenFactor;
    allinPercent *= tightenFactor * 0.8; // all-in tightens even more
  } else if (scenario === 'vs3bet') {
    allinPercent *= sm.allin;
    callPercent *= sm.call;
  } else if (scenario === 'vsOpenShove') {
    callPercent *= sm.call;
  }

  // Bounty adjustments
  if (gameMode === 'bounty' && bountyMultiplier > 0) {
    const widening = getBountyCallWidening(bountyMultiplier);
    if (scenario === 'vsOpenShove') {
      callPercent += widening;
    } else {
      callPercent += widening * 0.3;
    }
  }

  // ICM adjustment
  if (finalTable) {
    const icm = getICMMult(position, stack);
    raisePercent *= icm;
    callPercent *= icm;
    allinPercent *= icm * 0.9;
  }

  // Clamp
  raisePercent = Math.max(0, Math.min(100, raisePercent));
  callPercent = Math.max(0, Math.min(100, callPercent));
  allinPercent = Math.max(0, Math.min(100, allinPercent));

  const total = raisePercent + callPercent + allinPercent;
  if (total > 100) {
    const scale = 100 / total;
    raisePercent *= scale;
    callPercent *= scale;
    allinPercent *= scale;
  }

  return { raisePercent, callPercent, allinPercent };
}

// ============================================================
// ACTION ASSIGNMENT
// ============================================================

function assignHandActions(
  percentileRank: number,
  raisePercent: number,
  callPercent: number,
  allinPercent: number,
  strength: number
): ActionFrequency[] {
  const allinEnd = allinPercent;
  const raiseEnd = allinEnd + raisePercent;
  const callEnd = raiseEnd + callPercent;
  const mix = 3; // mixing zone width in %

  let foldF = 0, callF = 0, raiseF = 0, allinF = 0;

  if (allinEnd > 0 && percentileRank < allinEnd) {
    if (percentileRank < allinEnd - mix) {
      allinF = 100;
    } else {
      const t = Math.max(0, (allinEnd - percentileRank) / mix);
      allinF = Math.round(t * 100);
      raiseF = raisePercent > 0 ? 100 - allinF : 0;
      if (raiseF === 0) foldF = 100 - allinF;
    }
  } else if (raiseEnd > 0 && percentileRank < raiseEnd) {
    if (percentileRank < raiseEnd - mix) {
      raiseF = 100;
    } else {
      const t = Math.max(0, (raiseEnd - percentileRank) / mix);
      raiseF = Math.round(t * 100);
      if (callPercent > 0) callF = 100 - raiseF;
      else foldF = 100 - raiseF;
    }
  } else if (callEnd > 0 && percentileRank < callEnd) {
    if (percentileRank < callEnd - mix) {
      callF = 100;
    } else {
      const t = Math.max(0, (callEnd - percentileRank) / mix);
      callF = Math.round(t * 100);
      foldF = 100 - callF;
    }
  } else {
    foldF = 100;
  }

  // Ensure sum = 100
  const sum = foldF + callF + raiseF + allinF;
  if (sum !== 100) foldF += 100 - sum;

  const normalizedStrength = (strength - 50) / 50; // -1 (muito fraca) a +1 (muito forte)
  const actions: ActionFrequency[] = [
    { action: 'allin', frequency: allinF, ev: normalizedStrength * 12 },
    { action: 'raise', frequency: raiseF, ev: normalizedStrength * 6 },
    { action: 'call', frequency: callF, ev: normalizedStrength * 3 },
    { action: 'fold', frequency: foldF, ev: 0 },
  ];
  if (actions.every(a => a.frequency === 0)) actions[3].frequency = 100;

  return actions;
}

// ============================================================
// RANGES CALCULADAS (push/fold de stack curto)
// ============================================================

function comboCount(h: { pair: boolean; suited: boolean }): number {
  return h.pair ? 6 : h.suited ? 4 : 12;
}

const MODE_KEY: Record<GameMode, string> = {
  '8max': '8max', '6max': '6max', hu: 'hu', threehand: 'threehand', bounty: '8max',
};

// Tabela tem stacks discretos; entre dois valores, interpola
function vizinhosDeStack(stack: number): { baixo: number; alto: number; peso: number } {
  const s = PF_STACKS;
  if (stack <= s[0]) return { baixo: s[0], alto: s[0], peso: 0 };
  if (stack >= s[s.length - 1]) return { baixo: s[s.length - 1], alto: s[s.length - 1], peso: 0 };
  for (let i = 0; i < s.length - 1; i++) {
    if (stack >= s[i] && stack <= s[i + 1]) {
      return { baixo: s[i], alto: s[i + 1], peso: (stack - s[i]) / (s[i + 1] - s[i]) };
    }
  }
  return { baixo: s[0], alto: s[0], peso: 0 };
}

function lerTabela(
  tabela: Record<string, { f: string; ev: string }>,
  chaves: string[]
): { freq: number[]; ev: number[] } | null {
  const existentes = chaves.map((k) => tabela[k]).filter(Boolean);
  if (existentes.length === 0) return null;
  const freq = new Array(PF_HANDS.length).fill(0);
  const ev = new Array(PF_HANDS.length).fill(0);
  for (const e of existentes) {
    const f = decodePF(e.f);
    const v = decodePF(e.ev, true);
    for (let i = 0; i < PF_HANDS.length; i++) {
      freq[i] += f[i] / existentes.length;
      ev[i] += v[i] / 10 / existentes.length;
    }
  }
  return { freq, ev };
}

// Devolve a range calculada por EV, ou null quando o caso sai do modelo
// (mesa final usa ICM, bounty muda os incentivos, stack alto não é push/fold)
function getSolvedRange(
  gameMode: GameMode,
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean,
  bountyMultiplier: number,
  villainPosition?: Position
): RangeData | null {
  if (finalTable || bountyMultiplier > 0) return null;
  if (stack > PF_STACKS[PF_STACKS.length - 1]) return null;
  if (scenario !== 'openRaise' && scenario !== 'vsOpenShove') return null;

  const modo = MODE_KEY[gameMode];
  const { baixo, alto, peso } = vizinhosDeStack(stack);

  const chavesPara = (s: number): string[] => {
    if (scenario === 'openRaise') return [`${modo}|${position}|${s}`];
    // Pagar all-in: se souber quem deu o all-in, usa o par exato;
    // senão, média de todos os agressores possíveis
    if (villainPosition) return [`${modo}|${position}|vs${villainPosition}|${s}`];
    return Object.keys(PF_CALL).filter((k) => k.startsWith(`${modo}|${position}|vs`) && k.endsWith(`|${s}`));
  };

  const tabela = scenario === 'openRaise' ? PF_SHOVE : PF_CALL;
  const a = lerTabela(tabela, chavesPara(baixo));
  const b = peso > 0 ? lerTabela(tabela, chavesPara(alto)) : a;
  if (!a || !b) return null;

  const acao: ActionType = scenario === 'openRaise' ? 'allin' : 'call';
  const porMao = new Map<string, { freq: number; ev: number }>();
  for (let i = 0; i < PF_HANDS.length; i++) {
    porMao.set(PF_HANDS[i], {
      freq: a.freq[i] * (1 - peso) + b.freq[i] * peso,
      ev: a.ev[i] * (1 - peso) + b.ev[i] * peso,
    });
  }

  const sorted = getSortedHands(gameMode);
  const hands: HandData[] = sorted.map((entry) => {
    const dado = porMao.get(entry.hand) ?? { freq: 0, ev: 0 };
    const f = Math.max(0, Math.min(100, Math.round(dado.freq)));
    const actions: ActionFrequency[] = [
      { action: acao, frequency: f, ev: Number(dado.ev.toFixed(2)) },
      { action: 'fold', frequency: 100 - f, ev: 0 },
    ];
    return {
      hand: entry.hand,
      actions,
      primaryAction: f >= 50 ? acao : 'fold',
      suited: entry.suited,
      pair: entry.pair,
    };
  });

  return { scenario, position, stack, finalTable, hands };
}

// ============================================================
// RANGE GENERATION
// ============================================================

export function generateModeRange(
  gameMode: GameMode,
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  bountyMultiplier: number = 0,
  multiwayPlayers: number = 3,
  villainPosition?: Position
): RangeData {
  // Stack curto sem bounty e fora de mesa final: usa a range calculada por EV
  const solved = getSolvedRange(gameMode, scenario, position, stack, finalTable, bountyMultiplier, villainPosition);
  if (solved) return solved;

  const config = getScenarioConfig(gameMode, scenario, position, stack, finalTable, bountyMultiplier, multiwayPlayers);
  const sorted = getSortedHands(gameMode);

  // O corte é por combos (1326), não por classes de mão (169): uma mão offsuit
  // vale 12 combos e um par vale 6, então cortar por classe deixava toda range
  // mais estreita do que o configurado (UTG saía 10,3% onde devia dar 15%).
  const totalCombos = sorted.reduce((acc, h) => acc + comboCount(h), 0);
  let acumulado = 0;

  const hands: HandData[] = sorted.map((entry) => {
    const c = comboCount(entry);
    const percentile = ((acumulado + c / 2) / totalCombos) * 100;
    acumulado += c;
    const actions = assignHandActions(
      percentile,
      config.raisePercent,
      config.callPercent,
      config.allinPercent,
      entry.baseStrength
    );
    return {
      hand: entry.hand,
      actions,
      primaryAction: actions.reduce((a, b) => a.frequency > b.frequency ? a : b).action,
      suited: entry.suited,
      pair: entry.pair,
    };
  });

  return { scenario, position, stack, finalTable, hands };
}

// ============================================================
// STACK INTERPOLATION
// ============================================================

function interpolateActions(a: ActionFrequency[], b: ActionFrequency[], weight: number): ActionFrequency[] {
  const types: ActionType[] = ['fold', 'call', 'raise', 'allin'];
  const result: ActionFrequency[] = [];

  for (const action of types) {
    const fA = a.find(x => x.action === action)?.frequency || 0;
    const fB = b.find(x => x.action === action)?.frequency || 0;
    const eA = a.find(x => x.action === action)?.ev || 0;
    const eB = b.find(x => x.action === action)?.ev || 0;
    const freq = Math.round(fA * (1 - weight) + fB * weight);
    const ev = eA * (1 - weight) + eB * weight;
    if (freq > 0) result.push({ action, frequency: freq, ev });
  }

  // Normalize
  const sum = result.reduce((s, a) => s + a.frequency, 0);
  if (sum !== 100 && result.length > 0) {
    result.sort((a, b) => b.frequency - a.frequency);
    result[0].frequency += 100 - sum;
  }
  return result.length > 0 ? result : [{ action: 'fold', frequency: 100, ev: 0 }];
}

export function interpolateRange(
  gameMode: GameMode,
  scenario: Scenario,
  position: Position,
  stack: number,
  finalTable: boolean = false,
  bountyMultiplier: number = 0,
  multiwayPlayers: number = 3,
  villainPosition?: Position
): RangeData {
  if (STACK_SIZES.includes(stack)) {
    return generateModeRange(gameMode, scenario, position, stack, finalTable, bountyMultiplier, multiwayPlayers, villainPosition);
  }

  let lower = STACK_SIZES[0];
  let upper = STACK_SIZES[STACK_SIZES.length - 1];
  for (let i = 0; i < STACK_SIZES.length - 1; i++) {
    if (stack >= STACK_SIZES[i] && stack <= STACK_SIZES[i + 1]) {
      lower = STACK_SIZES[i];
      upper = STACK_SIZES[i + 1];
      break;
    }
  }

  if (stack <= lower) return generateModeRange(gameMode, scenario, position, lower, finalTable, bountyMultiplier, multiwayPlayers, villainPosition);
  if (stack >= upper) return generateModeRange(gameMode, scenario, position, upper, finalTable, bountyMultiplier, multiwayPlayers, villainPosition);

  const weight = (stack - lower) / (upper - lower);
  const rL = generateModeRange(gameMode, scenario, position, lower, finalTable, bountyMultiplier, multiwayPlayers, villainPosition);
  const rU = generateModeRange(gameMode, scenario, position, upper, finalTable, bountyMultiplier, multiwayPlayers, villainPosition);

  const hands: HandData[] = rL.hands.map((hL, idx) => {
    const hU = rU.hands[idx];
    const actions = interpolateActions(hL.actions, hU.actions, weight);
    return {
      hand: hL.hand,
      actions,
      primaryAction: actions.reduce((a, b) => a.frequency > b.frequency ? a : b).action,
      suited: hL.suited,
      pair: hL.pair,
    };
  });

  return { scenario, position, stack, finalTable, hands };
}

// ============================================================
// VALIDATION
// ============================================================

export function validateRanges(gameMode: GameMode): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const positions: Position[] =
    gameMode === 'hu' ? ['SB', 'BB'] :
    gameMode === 'threehand' ? ['BTN', 'SB', 'BB'] :
    ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const scenarios: Scenario[] = ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove'];
  const testStacks = [10, 20, 30, 50];

  for (const sc of scenarios) {
    for (const pos of positions) {
      for (const stk of testStacks) {
        const range = generateModeRange(gameMode, sc, pos, stk);
        for (const hand of range.hands) {
          const total = hand.actions.reduce((sum, a) => sum + a.frequency, 0);
          if (Math.abs(total - 100) > 1) {
            errors.push(`${gameMode}/${sc}/${pos}/${stk}BB/${hand.hand}: sum=${total}`);
          }
        }
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

// Dev-mode auto-validation
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  setTimeout(() => {
    const modes: GameMode[] = ['8max', 'hu', 'threehand', 'bounty'];
    for (const mode of modes) {
      const result = validateRanges(mode);
      if (!result.valid) {
        console.error(`[GTORei] Range validation FAILED for ${mode}:`, result.errors.slice(0, 5));
      } else {
        console.log(`[GTORei] ✅ Ranges validated: ${mode}`);
      }
    }
  }, 2000);
}
