// Avaliador de mãos de 7 cartas e utilidades de equity.
// Cartas são inteiros 0..51: rank = c >> 2 (0 = deuce ... 12 = ás), naipe = c & 3.

export const RANK_CHARS = '23456789TJQKA';

// Categorias: 8 straight flush, 7 quadra, 6 full, 5 flush, 4 sequência,
// 3 trinca, 2 dois pares, 1 par, 0 carta alta.
function encode(cat, k1 = 0, k2 = 0, k3 = 0, k4 = 0, k5 = 0) {
  return ((((cat * 13 + k1) * 13 + k2) * 13 + k3) * 13 + k4) * 13 + k5;
}

function straightTop(mask) {
  for (let hi = 12; hi >= 4; hi--) {
    const need = (1 << hi) | (1 << (hi - 1)) | (1 << (hi - 2)) | (1 << (hi - 3)) | (1 << (hi - 4));
    if ((mask & need) === need) return hi;
  }
  const wheel = (1 << 12) | 1 | (1 << 1) | (1 << 2) | (1 << 3);
  if ((mask & wheel) === wheel) return 3; // 5-high (roda)
  return -1;
}

const rankCount = new Int8Array(13);
const suitRankMask = new Int16Array(4);
const suitCount = new Int8Array(4);

// Avalia as 7 cartas e devolve um número: maior é melhor.
export function evaluate7(cards) {
  rankCount.fill(0);
  suitRankMask.fill(0);
  suitCount.fill(0);
  let rankMask = 0;

  for (let i = 0; i < 7; i++) {
    const c = cards[i];
    const r = c >> 2;
    const s = c & 3;
    rankCount[r]++;
    suitCount[s]++;
    suitRankMask[s] |= 1 << r;
    rankMask |= 1 << r;
  }

  // Flush / straight flush
  for (let s = 0; s < 4; s++) {
    if (suitCount[s] >= 5) {
      const sm = suitRankMask[s];
      const sf = straightTop(sm);
      if (sf >= 0) return encode(8, sf);
      const top = [];
      for (let r = 12; r >= 0 && top.length < 5; r--) if (sm & (1 << r)) top.push(r);
      return encode(5, top[0], top[1], top[2], top[3], top[4]);
    }
  }

  // Trincas e pares
  let quad = -1, trips = -1, trips2 = -1, pair = -1, pair2 = -1;
  for (let r = 12; r >= 0; r--) {
    const n = rankCount[r];
    if (n === 4 && quad < 0) quad = r;
    else if (n === 3) {
      if (trips < 0) trips = r;
      else if (trips2 < 0) trips2 = r;
    } else if (n === 2) {
      if (pair < 0) pair = r;
      else if (pair2 < 0) pair2 = r;
    }
  }

  if (quad >= 0) {
    let k = -1;
    for (let r = 12; r >= 0; r--) if (r !== quad && rankCount[r] > 0) { k = r; break; }
    return encode(7, quad, k);
  }

  if (trips >= 0 && (pair >= 0 || trips2 >= 0)) {
    const second = trips2 >= 0 && trips2 > pair ? trips2 : pair;
    return encode(6, trips, second);
  }

  const st = straightTop(rankMask);
  if (st >= 0) return encode(4, st);

  if (trips >= 0) {
    const ks = [];
    for (let r = 12; r >= 0 && ks.length < 2; r--) if (r !== trips && rankCount[r] > 0) ks.push(r);
    return encode(3, trips, ks[0], ks[1]);
  }

  if (pair >= 0 && pair2 >= 0) {
    let k = -1;
    for (let r = 12; r >= 0; r--) if (r !== pair && r !== pair2 && rankCount[r] > 0) { k = r; break; }
    return encode(2, pair, pair2, k);
  }

  if (pair >= 0) {
    const ks = [];
    for (let r = 12; r >= 0 && ks.length < 3; r--) if (r !== pair && rankCount[r] > 0) ks.push(r);
    return encode(1, pair, ks[0], ks[1], ks[2]);
  }

  const hi = [];
  for (let r = 12; r >= 0 && hi.length < 5; r--) if (rankCount[r] > 0) hi.push(r);
  return encode(0, hi[0], hi[1], hi[2], hi[3], hi[4]);
}

// "AKs" / "AKo" / "AA" -> lista de combos específicos [c1, c2]
export function handCombos(hand) {
  const r1 = RANK_CHARS.indexOf(hand[0]);
  const r2 = RANK_CHARS.indexOf(hand[1]);
  const out = [];
  if (hand.length === 2) {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = s1 + 1; s2 < 4; s2++) out.push([r1 * 4 + s1, r2 * 4 + s2]);
  } else if (hand[2] === 's') {
    for (let s = 0; s < 4; s++) out.push([r1 * 4 + s, r2 * 4 + s]);
  } else {
    for (let s1 = 0; s1 < 4; s1++) for (let s2 = 0; s2 < 4; s2++) if (s1 !== s2) out.push([r1 * 4 + s1, r2 * 4 + s2]);
  }
  return out;
}

export const ALL_HANDS = (() => {
  const hands = [];
  for (let i = 12; i >= 0; i--) {
    for (let j = 12; j >= 0; j--) {
      const hi = Math.max(i, j), lo = Math.min(i, j);
      if (i === j) hands.push(`${RANK_CHARS[i]}${RANK_CHARS[i]}`);
      else if (i > j) hands.push(`${RANK_CHARS[hi]}${RANK_CHARS[lo]}s`);
      else hands.push(`${RANK_CHARS[hi]}${RANK_CHARS[lo]}o`);
    }
  }
  return [...new Set(hands)];
})();
