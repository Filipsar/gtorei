import { readFileSync } from 'node:fs';
const cache = JSON.parse(readFileSync('scripts/.cache/equity-matrix.json', 'utf8'));
const HANDS = cache.hands, N = HANDS.length, EQ = cache.matrix;
const combos = (h) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12);
const COMBOS = HANDS.map(combos);
const TOTAL = COMBOS.reduce((a, b) => a + b, 0);

const idx = (h) => HANDS.indexOf(h);
console.log('total combos:', TOTAL, '| mãos:', N);
console.log('AA vs KK pela matriz:', EQ[idx('AA') * N + idx('KK')]);
console.log('32o vs AA pela matriz:', EQ[idx('32o') * N + idx('AA')]);

// range top X% por combos
function topPct(pct) {
  const f = new Float64Array(N);
  let acc = 0;
  for (let i = 0; i < N; i++) { acc += COMBOS[i]; f[i] = acc / TOTAL <= pct ? 1 : 0; }
  return f;
}
function eqVs(i, freq) {
  let s = 0, w = 0;
  for (let j = 0; j < N; j++) { if (!freq[j]) continue; const c = COMBOS[j] * freq[j]; s += EQ[i * N + j] * c; w += c; }
  return w > 0 ? s / w : 0.5;
}
const largura = (f) => f.reduce((a, v, j) => a + v * COMBOS[j], 0) / TOTAL;

const callBB = topPct(0.40);
console.log('\nlargura da range de pagamento usada:', (largura(callBB) * 100).toFixed(1) + '%');
for (const mao of ['AA', 'A5s', 'K9o', '72o', '32o']) {
  const i = idx(mao);
  const eq = eqVs(i, callBB);
  const S = 10, c = largura(callBB);
  const ev = (1 - c) * 1 + c * (eq * 2 * S - S);
  console.log(`${mao}: equity vs range ${(eq * 100).toFixed(1)}% | EV shove ${ev.toFixed(2)}bb | fold -0.50 | shove? ${ev > -0.5}`);
}

// A ordem das mãos no array é decrescente de força?
console.log('\nprimeiras 10 mãos do array:', HANDS.slice(0, 10).join(' '));
console.log('últimas 10:', HANDS.slice(-10).join(' '));
