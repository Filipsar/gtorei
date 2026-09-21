// Gera a ordenação de força das mãos a partir da matriz de equity.
// A fórmula antiga colocava Q8s e J8s à frente de 66 e 55, e KJo à frente de ATo.
import { readFileSync, writeFileSync } from 'node:fs';

const cache = JSON.parse(readFileSync('scripts/.cache/equity-matrix.json', 'utf8'));
const HANDS = cache.hands;
const N = HANDS.length;
const EQ = Float64Array.from(cache.matrix);
const RANKS = 'AKQJT98765432';

const combos = (h) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12);
const COMBOS = HANDS.map(combos);
const TOTAL = COMBOS.reduce((a, b) => a + b, 0);

function eqVector(freq) {
  const out = new Float64Array(N);
  const w = new Float64Array(N);
  let peso = 0;
  for (let j = 0; j < N; j++) { w[j] = COMBOS[j] * freq[j]; peso += w[j]; }
  for (let i = 0; i < N; i++) {
    let s = 0;
    const base = i * N;
    for (let j = 0; j < N; j++) if (w[j] > 0) s += EQ[base + j] * w[j];
    out[i] = s / peso;
  }
  return out;
}

const eqVsRandom = eqVector(new Float64Array(N).fill(1));
const ordemPorEquity = HANDS.map((_, i) => i).sort((a, b) => eqVsRandom[b] - eqVsRandom[a]);
const topPct = (pct) => {
  const f = new Float64Array(N);
  let acc = 0;
  for (const i of ordemPorEquity) { acc += COMBOS[i]; f[i] = acc / TOTAL <= pct ? 1 : 0; }
  return f;
};

// Contra quem continua no pote, não contra qualquer mão: é isso que separa
// uma mão que sobrevive de uma que só ganha de lixo.
const eqVsForte = eqVector(topPct(0.40));

function info(h) {
  const hi = RANKS.indexOf(h[0]);
  const lo = RANKS.indexOf(h[1]);
  return { hi, lo, gap: Math.abs(lo - hi) - 1, pair: h.length === 2, suited: h.endsWith('s') };
}

// Bônus em pontos de equity: jogabilidade que o confronto all-in não captura
function score(i) {
  const h = HANDS[i];
  const { gap, pair, suited, hi, lo } = info(h);
  let s = eqVsForte[i] * 100;
  if (pair) s += 2.2;              // valor de showdown e de fechar trinca
  if (suited) s += 2.0;            // flush e mais equity em multiway
  if (!pair) {
    if (gap === 0) s += 1.5;       // conectores
    else if (gap === 1) s += 0.9;
    else if (gap === 2) s += 0.4;
    else if (gap >= 4 && hi > 0) s -= 1.2; // lixo desconectado sem ás
    if (hi <= 4 && lo <= 4) s += 1.4;      // duas broadways: par mais forte e mais sequências
  }
  return s;
}

const ordem = HANDS.map((h, i) => ({ hand: h, s: score(i) }))
  .sort((a, b) => b.s - a.s)
  .map((x) => x.hand);

// Conferência contra referências conhecidas de range de abertura
const pos = (h) => ordem.indexOf(h);
const checks = [
  ['66 na frente de Q8s', pos('66') < pos('Q8s')],
  ['55 na frente de J8s', pos('55') < pos('J8s')],
  ['ATo na frente de KJo', pos('ATo') < pos('KJo')],
  ['AJo na frente de T9s', pos('AJo') < pos('T9s')],
  ['77 na frente de KTo', pos('77') < pos('KTo')],
  ['A5s na frente de K9o', pos('A5s') < pos('K9o')],
  ['76s na frente de Q7o', pos('76s') < pos('Q7o')],
  ['QJs na frente de A6s', pos('QJs') < pos('A6s')],
  ['JTs na frente de K5o', pos('JTs') < pos('K5o')],
  ['T9s na frente de J4o', pos('T9s') < pos('J4o')],
  ['AA em primeiro', ordem[0] === 'AA'],
];
let falhas = 0;
for (const [nome, ok] of checks) { if (!ok) falhas++; console.log(`${ok ? 'ok ' : 'FALHOU'} ${nome}`); }

console.log('\nTop 30:', ordem.slice(0, 30).join(' '));
const acumulado = [];
let acc = 0;
for (const h of ordem) { acc += combos(h); acumulado.push(acc / TOTAL); }
const corte = (pct) => ordem.filter((_, i) => acumulado[i] <= pct);
console.log('\nTop 15% (referência de UTG):', corte(0.15).join(' '));
console.log('\nTop 25%:', corte(0.25).join(' '));

writeFileSync(
  'src/data/ranges/handorder.generated.ts',
  '// ARQUIVO GERADO por scripts/build-hand-order.mjs — não editar à mão.\n' +
  '// Ordem de força derivada da matriz de equity (equity contra o top 40%,\n' +
  '// mais ajustes de jogabilidade: par, suited e conectividade).\n\n' +
  `export const HAND_ORDER: string[] = ${JSON.stringify(ordem)};\n\n` +
  '// Equity de cada mão contra uma mão aleatória, em %\n' +
  `export const EQUITY_VS_RANDOM: Record<string, number> = ${JSON.stringify(
    Object.fromEntries(HANDS.map((h, i) => [h, Number((eqVsRandom[i] * 100).toFixed(1))]))
  )};\n`
);
console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
