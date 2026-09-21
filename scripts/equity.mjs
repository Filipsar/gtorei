// Monte Carlo de equity pré-flop entre duas classes de mão.
import { evaluate7, handCombos } from './poker-eval.mjs';

// PRNG determinístico (mulberry32) para o resultado ser reproduzível
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const board = new Int8Array(5);
const h1 = new Int8Array(7);
const h2 = new Int8Array(7);
const used = new Uint8Array(52);

// Equity da mão A contra a mão B (classes tipo "AKs"). Empate conta meio.
export function equityVs(handA, handB, samples, rng) {
  const combosA = handCombos(handA);
  const combosB = handCombos(handB);
  let win = 0, tie = 0, valid = 0;

  while (valid < samples) {
    const a = combosA[(rng() * combosA.length) | 0];
    const b = combosB[(rng() * combosB.length) | 0];
    if (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]) continue; // cartas repetidas

    used.fill(0);
    used[a[0]] = 1; used[a[1]] = 1; used[b[0]] = 1; used[b[1]] = 1;

    for (let i = 0; i < 5; i++) {
      let c;
      do { c = (rng() * 52) | 0; } while (used[c]);
      used[c] = 1;
      board[i] = c;
    }

    h1[0] = a[0]; h1[1] = a[1];
    h2[0] = b[0]; h2[1] = b[1];
    for (let i = 0; i < 5; i++) { h1[i + 2] = board[i]; h2[i + 2] = board[i]; }

    const s1 = evaluate7(h1);
    const s2 = evaluate7(h2);
    if (s1 > s2) win++;
    else if (s1 === s2) tie++;
    valid++;
  }

  return (win + tie / 2) / valid;
}
