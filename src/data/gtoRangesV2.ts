// GTORei - GTO Ranges V2 (nova base mockada precisa baseada em solver)
// Não substitui src/data/gtoRanges.ts (que é o engine ativo). Esta base é
// usada para consultas adicionais (ex.: análise por IA, comparações futuras).

export type HandFrequency = {
  fold: number;
  call: number;
  raise: number;
  allin: number;
  raiseSize?: number;
  ev?: number;
};

export type RangeData = {
  [hand: string]: HandFrequency;
};

export type ScenarioKey = string;

export const GTO_RANGES: Record<ScenarioKey, RangeData> = {
  // ============================================================
  // 8-MAX OPEN RAISE - UTG 20bb
  // ============================================================
  "8max_openraise_UTG_20bb": {
    "AA": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 8.5 },
    "KK": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 7.2 },
    "QQ": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 5.8 },
    "JJ": { fold: 0, call: 0, raise: 0.3, allin: 0.7, ev: 4.1 },
    "TT": { fold: 0, call: 0, raise: 0.6, allin: 0.4, ev: 2.9 },
    "99": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.8 },
    "88": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.2 },
    "77": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.8 },
    "66": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.3 },
    "55": { fold: 0.8, call: 0, raise: 0.2, allin: 0, ev: 0.1 },
    "44": { fold: 1.0, call: 0, raise: 0, allin: 0, ev: -0.2 },
    "33": { fold: 1.0, call: 0, raise: 0, allin: 0, ev: -0.3 },
    "22": { fold: 1.0, call: 0, raise: 0, allin: 0, ev: -0.4 },
    "AKs": { fold: 0, call: 0, raise: 0.2, allin: 0.8, ev: 6.1 },
    "AKo": { fold: 0, call: 0, raise: 0.5, allin: 0.5, ev: 5.2 },
    "AQs": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 3.8 },
    "AQo": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 2.9 },
    "AJs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.5 },
    "AJo": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 1.6 },
    "ATs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.1 },
    "ATo": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.9 },
    "A9s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.4 },
    "A9o": { fold: 0.8, call: 0, raise: 0.2, allin: 0, ev: 0.2 },
    "A8s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 1.1 },
    "A8o": { fold: 0.9, call: 0, raise: 0.1, allin: 0, ev: -0.1 },
    "A7s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.8 },
    "A6s": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.5 },
    "A5s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.2 },
    "A4s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.9 },
    "A3s": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.6 },
    "A2s": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.4 },
    "KQs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.3 },
    "KQo": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.5 },
    "KJs": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.8 },
    "KJo": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.7 },
    "KTs": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.4 },
    "KTo": { fold: 0.7, call: 0, raise: 0.3, allin: 0, ev: 0.3 },
    "K9s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.8 },
    "K8s": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.4 },
    "QJs": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.6 },
    "QJo": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.5 },
    "QTs": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.3 },
    "JTs": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 1.0 },
    "T9s": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.6 },
    "98s": { fold: 0.7, call: 0, raise: 0.3, allin: 0, ev: 0.2 },
    "87s": { fold: 0.8, call: 0, raise: 0.2, allin: 0, ev: 0.1 },
    "76s": { fold: 0.9, call: 0, raise: 0.1, allin: 0, ev: -0.1 },
    "65s": { fold: 1.0, call: 0, raise: 0, allin: 0, ev: -0.2 },
    "54s": { fold: 1.0, call: 0, raise: 0, allin: 0, ev: -0.3 },
  },

  // ============================================================
  // 8-MAX OPEN RAISE - UTG 30bb
  // ============================================================
  "8max_openraise_UTG_30bb": {
    "AA": { fold: 0, call: 0, raise: 0.1, allin: 0.9, ev: 9.2 },
    "KK": { fold: 0, call: 0, raise: 0.2, allin: 0.8, ev: 7.8 },
    "QQ": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 5.1 },
    "JJ": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 3.4 },
    "TT": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.2 },
    "99": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.5 },
    "88": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 0.9 },
    "77": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.6 },
    "66": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.2 },
    "55": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.0 },
    "44": { fold: 0.8, call: 0, raise: 0.2, allin: 0, ev: -0.1 },
    "33": { fold: 0.9, call: 0, raise: 0.1, allin: 0, ev: -0.2 },
    "22": { fold: 1.0, call: 0, raise: 0, allin: 0, ev: -0.3 },
    "AKs": { fold: 0, call: 0, raise: 0.5, allin: 0.5, ev: 5.8 },
    "AKo": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 4.9 },
    "AQs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 3.2 },
    "AQo": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.4 },
    "AJs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.1 },
    "AJo": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.3 },
    "ATs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.8 },
    "ATo": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.7 },
    "A9s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.2 },
    "A8s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.9 },
    "A7s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.7 },
    "A6s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.4 },
    "A5s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.1 },
    "A4s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.8 },
    "A3s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.5 },
    "A2s": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.3 },
    "KQs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.0 },
    "KQo": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.3 },
    "KJs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.6 },
    "KJo": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.6 },
    "KTs": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.2 },
    "K9s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.7 },
    "QJs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.4 },
    "QTs": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.1 },
    "JTs": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.9 },
    "T9s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.5 },
    "98s": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.3 },
    "87s": { fold: 0.7, call: 0, raise: 0.3, allin: 0, ev: 0.1 },
    "76s": { fold: 0.8, call: 0, raise: 0.2, allin: 0, ev: 0.0 },
    "65s": { fold: 0.9, call: 0, raise: 0.1, allin: 0, ev: -0.1 },
    "54s": { fold: 1.0, call: 0, raise: 0, allin: 0, ev: -0.2 },
  },

  // ============================================================
  // 8-MAX OPEN RAISE - BTN 30bb
  // ============================================================
  "8max_openraise_BTN_30bb": {
    "AA": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 11.2 },
    "KK": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 9.5 },
    "QQ": { fold: 0, call: 0, raise: 0.3, allin: 0.7, ev: 6.8 },
    "JJ": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 4.9 },
    "TT": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 3.5 },
    "99": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.8 },
    "88": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.1 },
    "77": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.6 },
    "66": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.2 },
    "55": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 0.9 },
    "44": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 0.5 },
    "33": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.3 },
    "22": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.1 },
    "AKs": { fold: 0, call: 0, raise: 0.2, allin: 0.8, ev: 7.2 },
    "AKo": { fold: 0, call: 0, raise: 0.6, allin: 0.4, ev: 6.1 },
    "AQs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 4.5 },
    "AQo": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 3.6 },
    "AJs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 3.2 },
    "AJo": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.4 },
    "ATs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.9 },
    "ATo": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.0 },
    "A9s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.2 },
    "A9o": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.0 },
    "A8s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.9 },
    "A7s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.6 },
    "A6s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.4 },
    "A5s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.8 },
    "A4s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.5 },
    "A3s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.2 },
    "A2s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.0 },
    "KQs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 3.0 },
    "KQo": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.2 },
    "KJs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.5 },
    "KJo": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.7 },
    "KTs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.1 },
    "K9s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.6 },
    "K8s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.2 },
    "K7s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.9 },
    "QJs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.2 },
    "QTs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.9 },
    "Q9s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.4 },
    "JTs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.8 },
    "J9s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.3 },
    "T9s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.5 },
    "T8s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.0 },
    "98s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.3 },
    "97s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.8 },
    "87s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.1 },
    "76s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.8 },
    "65s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.6 },
    "54s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.4 },
    "43s": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.1 },
    "32s": { fold: 0.8, call: 0, raise: 0.2, allin: 0, ev: -0.1 },
    "KTo": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.2 },
    "QJo": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.3 },
    "JTo": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.9 },
    "T9o": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.4 },
    "98o": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.2 },
  },

  // ============================================================
  // BB DEFENSE vs UTG OPEN
  // ============================================================
  "8max_vsopenraise_BB_vsUTG_30bb": {
    "AA": { fold: 0, call: 0, raise: 0.1, allin: 0.9, ev: 12.5 },
    "KK": { fold: 0, call: 0, raise: 0.2, allin: 0.8, ev: 10.2 },
    "QQ": { fold: 0, call: 0.1, raise: 0.7, allin: 0.2, ev: 5.9 },
    "JJ": { fold: 0, call: 0.4, raise: 0.5, allin: 0.1, ev: 3.2 },
    "TT": { fold: 0, call: 0.7, raise: 0.3, allin: 0, ev: 1.8 },
    "99": { fold: 0, call: 0.8, raise: 0.2, allin: 0, ev: 1.1 },
    "88": { fold: 0.1, call: 0.9, raise: 0, allin: 0, ev: 0.6 },
    "77": { fold: 0.2, call: 0.8, raise: 0, allin: 0, ev: 0.3 },
    "66": { fold: 0.3, call: 0.7, raise: 0, allin: 0, ev: 0.1 },
    "55": { fold: 0.4, call: 0.6, raise: 0, allin: 0, ev: -0.1 },
    "44": { fold: 0.5, call: 0.5, raise: 0, allin: 0, ev: -0.2 },
    "33": { fold: 0.6, call: 0.4, raise: 0, allin: 0, ev: -0.3 },
    "22": { fold: 0.7, call: 0.3, raise: 0, allin: 0, ev: -0.4 },
    "AKs": { fold: 0, call: 0, raise: 0.3, allin: 0.7, ev: 7.8 },
    "AKo": { fold: 0, call: 0.1, raise: 0.6, allin: 0.3, ev: 6.5 },
    "AQs": { fold: 0, call: 0.2, raise: 0.7, allin: 0.1, ev: 4.2 },
    "AQo": { fold: 0, call: 0.5, raise: 0.5, allin: 0, ev: 2.8 },
    "AJs": { fold: 0, call: 0.4, raise: 0.6, allin: 0, ev: 3.1 },
    "AJo": { fold: 0.1, call: 0.7, raise: 0.2, allin: 0, ev: 1.5 },
    "ATs": { fold: 0, call: 0.5, raise: 0.5, allin: 0, ev: 2.5 },
    "ATo": { fold: 0.2, call: 0.8, raise: 0, allin: 0, ev: 0.9 },
    "A9s": { fold: 0.1, call: 0.7, raise: 0.2, allin: 0, ev: 1.8 },
    "A8s": { fold: 0.2, call: 0.7, raise: 0.1, allin: 0, ev: 1.4 },
    "A7s": { fold: 0.3, call: 0.7, raise: 0, allin: 0, ev: 1.0 },
    "A6s": { fold: 0.3, call: 0.5, raise: 0.2, allin: 0, ev: 0.9 },
    "A5s": { fold: 0.1, call: 0.5, raise: 0.4, allin: 0, ev: 1.6 },
    "A4s": { fold: 0.2, call: 0.6, raise: 0.2, allin: 0, ev: 1.1 },
    "A3s": { fold: 0.3, call: 0.6, raise: 0.1, allin: 0, ev: 0.8 },
    "A2s": { fold: 0.4, call: 0.6, raise: 0, allin: 0, ev: 0.5 },
    "KQs": { fold: 0, call: 0.5, raise: 0.5, allin: 0, ev: 2.8 },
    "KQo": { fold: 0.1, call: 0.7, raise: 0.2, allin: 0, ev: 1.6 },
    "KJs": { fold: 0, call: 0.6, raise: 0.4, allin: 0, ev: 2.2 },
    "KJo": { fold: 0.2, call: 0.8, raise: 0, allin: 0, ev: 0.8 },
    "KTs": { fold: 0.1, call: 0.7, raise: 0.2, allin: 0, ev: 1.7 },
    "K9s": { fold: 0.2, call: 0.8, raise: 0, allin: 0, ev: 1.0 },
    "QJs": { fold: 0, call: 0.7, raise: 0.3, allin: 0, ev: 1.9 },
    "QTs": { fold: 0.1, call: 0.8, raise: 0.1, allin: 0, ev: 1.4 },
    "JTs": { fold: 0.1, call: 0.9, raise: 0, allin: 0, ev: 1.2 },
    "T9s": { fold: 0.3, call: 0.7, raise: 0, allin: 0, ev: 0.7 },
    "98s": { fold: 0.4, call: 0.6, raise: 0, allin: 0, ev: 0.4 },
    "87s": { fold: 0.5, call: 0.5, raise: 0, allin: 0, ev: 0.2 },
    "76s": { fold: 0.6, call: 0.4, raise: 0, allin: 0, ev: 0.0 },
    "65s": { fold: 0.7, call: 0.3, raise: 0, allin: 0, ev: -0.1 },
  },

  // ============================================================
  // HEADS UP - BTN 15bb
  // ============================================================
  "hu_openraise_BTN_15bb": {
    "AA": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 9.8 },
    "KK": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 8.1 },
    "QQ": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 6.2 },
    "JJ": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 4.5 },
    "TT": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 3.2 },
    "99": { fold: 0, call: 0, raise: 0.1, allin: 0.9, ev: 2.4 },
    "88": { fold: 0, call: 0, raise: 0.3, allin: 0.7, ev: 1.8 },
    "77": { fold: 0, call: 0, raise: 0.5, allin: 0.5, ev: 1.3 },
    "66": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 0.9 },
    "55": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 0.7 },
    "44": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 0.5 },
    "33": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 0.3 },
    "22": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 0.2 },
    "AKs": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 7.5 },
    "AKo": { fold: 0, call: 0, raise: 0.1, allin: 0.9, ev: 6.8 },
    "AQs": { fold: 0, call: 0, raise: 0.2, allin: 0.8, ev: 5.2 },
    "AQo": { fold: 0, call: 0, raise: 0.4, allin: 0.6, ev: 4.5 },
    "AJs": { fold: 0, call: 0, raise: 0.4, allin: 0.6, ev: 4.0 },
    "AJo": { fold: 0, call: 0, raise: 0.6, allin: 0.4, ev: 3.2 },
    "ATs": { fold: 0, call: 0, raise: 0.5, allin: 0.5, ev: 3.6 },
    "ATo": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 2.8 },
    "A9s": { fold: 0, call: 0, raise: 0.6, allin: 0.4, ev: 3.0 },
    "A9o": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 2.1 },
    "A8s": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 2.5 },
    "A7s": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 2.0 },
    "A6s": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 1.8 },
    "A5s": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 2.2 },
    "A4s": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 1.9 },
    "A3s": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 1.5 },
    "A2s": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 1.3 },
    "A8o": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 1.7 },
    "A7o": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 1.4 },
    "A6o": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.1 },
    "A5o": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.0 },
    "KQs": { fold: 0, call: 0, raise: 0.5, allin: 0.5, ev: 3.8 },
    "KQo": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 3.0 },
    "KJs": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 3.1 },
    "KJo": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 2.3 },
    "KTs": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 2.7 },
    "KTo": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 1.9 },
    "K9s": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 2.2 },
    "K9o": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.4 },
    "K8s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.8 },
    "K7s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.5 },
    "K6s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.2 },
    "K5s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.0 },
    "K4s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.8 },
    "K3s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.6 },
    "K2s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.4 },
    "K8o": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.2 },
    "K7o": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.9 },
    "QJs": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 2.9 },
    "QJo": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 2.1 },
    "QTs": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 2.5 },
    "QTo": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.7 },
    "Q9s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.0 },
    "Q8s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.5 },
    "JTs": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.4 },
    "JTo": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.6 },
    "J9s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.9 },
    "T9s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.7 },
    "T8s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.3 },
    "98s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.4 },
    "97s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 1.0 },
    "87s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.2 },
    "76s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.9 },
    "65s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.7 },
    "54s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.6 },
    "43s": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.4 },
    "32s": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.2 },
    "J8s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.4 },
    "T7s": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 1.0 },
    "96s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.7 },
    "86s": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.6 },
    "75s": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.4 },
    "Q9o": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.2 },
    "J9o": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.9 },
    "T9o": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.8 },
    "98o": { fold: 0.4, call: 0, raise: 0.6, allin: 0, ev: 0.5 },
    "87o": { fold: 0.5, call: 0, raise: 0.5, allin: 0, ev: 0.3 },
    "76o": { fold: 0.6, call: 0, raise: 0.4, allin: 0, ev: 0.1 },
  },

  // ============================================================
  // BOUNTY - BTN 20bb (multiplier 1)
  // ============================================================
  "bounty_openraise_BTN_20bb_multiplier1": {
    "AA": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 12.5 },
    "KK": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 10.8 },
    "QQ": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 8.2 },
    "JJ": { fold: 0, call: 0, raise: 0.2, allin: 0.8, ev: 6.1 },
    "TT": { fold: 0, call: 0, raise: 0.4, allin: 0.6, ev: 4.5 },
    "99": { fold: 0, call: 0, raise: 0.6, allin: 0.4, ev: 3.2 },
    "88": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 2.5 },
    "77": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 2.0 },
    "66": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 1.5 },
    "55": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.1 },
    "44": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 0.7 },
    "33": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 0.4 },
    "22": { fold: 0.3, call: 0, raise: 0.7, allin: 0, ev: 0.2 },
    "AKs": { fold: 0, call: 0, raise: 0, allin: 1.0, ev: 9.2 },
    "AKo": { fold: 0, call: 0, raise: 0.2, allin: 0.8, ev: 7.8 },
    "AQs": { fold: 0, call: 0, raise: 0.4, allin: 0.6, ev: 5.8 },
    "AQo": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 4.5 },
    "AJs": { fold: 0, call: 0, raise: 0.6, allin: 0.4, ev: 4.8 },
    "AJo": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 3.5 },
    "ATs": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 4.2 },
    "A9s": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 3.5 },
    "A8s": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 2.9 },
    "A7s": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 2.5 },
    "A6s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.2 },
    "A5s": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 3.0 },
    "A4s": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 2.6 },
    "A3s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.1 },
    "A2s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.8 },
    "KQs": { fold: 0, call: 0, raise: 0.5, allin: 0.5, ev: 4.5 },
    "KJs": { fold: 0, call: 0, raise: 0.7, allin: 0.3, ev: 3.8 },
    "KTs": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 3.2 },
    "QJs": { fold: 0, call: 0, raise: 0.8, allin: 0.2, ev: 3.4 },
    "JTs": { fold: 0, call: 0, raise: 0.9, allin: 0.1, ev: 2.8 },
    "T9s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 2.2 },
    "98s": { fold: 0, call: 0, raise: 1.0, allin: 0, ev: 1.8 },
    "87s": { fold: 0.1, call: 0, raise: 0.9, allin: 0, ev: 1.5 },
    "76s": { fold: 0.2, call: 0, raise: 0.8, allin: 0, ev: 1.2 },
  },
};

export function getGTORange(
  gameMode: string,
  scenario: string,
  position: string,
  stack: number,
  bountyMultiplier?: number
): RangeData {
  const stackKey = stack <= 10 ? 10 : stack <= 20 ? 20 : stack <= 30 ? 30 : stack <= 50 ? 50 : 100;

  let key = `${gameMode}_${scenario}_${position}_${stackKey}bb`;
  if (bountyMultiplier) key += `_multiplier${bountyMultiplier}`;

  if (GTO_RANGES[key]) return GTO_RANGES[key];

  const availableStacks = [10, 20, 30, 50, 100];
  const lowerStack = availableStacks.filter((s) => s <= stack).pop() || 10;
  const upperStack = availableStacks.find((s) => s > stack) || 100;

  const lowerKey = `${gameMode}_${scenario}_${position}_${lowerStack}bb`;
  const upperKey = `${gameMode}_${scenario}_${position}_${upperStack}bb`;

  if (GTO_RANGES[lowerKey] && GTO_RANGES[upperKey]) {
    return interpolateRanges(GTO_RANGES[lowerKey], GTO_RANGES[upperKey], stack, lowerStack, upperStack);
  }

  return GTO_RANGES[lowerKey] || GTO_RANGES[upperKey] || {};
}

function interpolateRanges(
  lower: RangeData,
  upper: RangeData,
  stack: number,
  lowerStack: number,
  upperStack: number
): RangeData {
  const ratio = (stack - lowerStack) / (upperStack - lowerStack);
  const result: RangeData = {};
  const allHands = new Set([...Object.keys(lower), ...Object.keys(upper)]);

  allHands.forEach((hand) => {
    const l = lower[hand] || { fold: 1, call: 0, raise: 0, allin: 0 };
    const u = upper[hand] || { fold: 1, call: 0, raise: 0, allin: 0 };

    result[hand] = {
      fold: Math.round((l.fold + (u.fold - l.fold) * ratio) * 100) / 100,
      call: Math.round((l.call + (u.call - l.call) * ratio) * 100) / 100,
      raise: Math.round((l.raise + (u.raise - l.raise) * ratio) * 100) / 100,
      allin: Math.round((l.allin + (u.allin - l.allin) * ratio) * 100) / 100,
      ev:
        l.ev !== undefined && u.ev !== undefined
          ? Math.round((l.ev + (u.ev - l.ev) * ratio) * 10) / 10
          : undefined,
    };
  });

  return result;
}
