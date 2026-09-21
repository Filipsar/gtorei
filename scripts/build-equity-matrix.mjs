// Calcula a matriz de equity 169x169 e guarda em cache.
// Uso: node scripts/build-equity-matrix.mjs [amostras]
import { writeFileSync, mkdirSync } from 'node:fs';
import { ALL_HANDS } from './poker-eval.mjs';
import { equityVs, makeRng } from './equity.mjs';

const SAMPLES = Number(process.argv[2] || 2000);
const rng = makeRng(987654321);
const n = ALL_HANDS.length;
const matrix = new Float32Array(n * n);

const t0 = Date.now();
let feitos = 0;
const totalPares = (n * (n + 1)) / 2;

for (let i = 0; i < n; i++) {
  for (let j = i; j < n; j++) {
    const eq = equityVs(ALL_HANDS[i], ALL_HANDS[j], SAMPLES, rng);
    matrix[i * n + j] = eq;
    matrix[j * n + i] = 1 - eq;
    feitos++;
  }
  if (i % 20 === 0) {
    const pct = ((feitos / totalPares) * 100).toFixed(0);
    const seg = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`${pct}% (${feitos}/${totalPares} pares, ${seg}s)`);
  }
}

mkdirSync('scripts/.cache', { recursive: true });
writeFileSync(
  'scripts/.cache/equity-matrix.json',
  JSON.stringify({
    samples: SAMPLES,
    hands: ALL_HANDS,
    // arredonda para 4 casas para o arquivo não ficar gigante
    matrix: Array.from(matrix, (v) => Math.round(v * 10000) / 10000),
  })
);

console.log(`\nPronto em ${((Date.now() - t0) / 1000).toFixed(0)}s com ${SAMPLES} amostras por confronto.`);

// Sanidade: equity de cada mão contra uma mão aleatória
const vsRandom = ALL_HANDS.map((h, i) => {
  let soma = 0, peso = 0;
  for (let j = 0; j < n; j++) {
    const w = ALL_HANDS[j].length === 2 ? 6 : ALL_HANDS[j].endsWith('s') ? 4 : 12;
    soma += matrix[i * n + j] * w;
    peso += w;
  }
  return { hand: h, eq: soma / peso };
});
vsRandom.sort((a, b) => b.eq - a.eq);
console.log('Top 12 vs mão aleatória:', vsRandom.slice(0, 12).map((x) => `${x.hand} ${(x.eq * 100).toFixed(1)}`).join(', '));
console.log('Piores 6:', vsRandom.slice(-6).map((x) => `${x.hand} ${(x.eq * 100).toFixed(1)}`).join(', '));
