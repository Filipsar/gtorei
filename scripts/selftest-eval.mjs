// Autoteste: regras do avaliador + equities conhecidas.
import { evaluate7 } from './poker-eval.mjs';
import { equityVs, makeRng } from './equity.mjs';

const RANKS = '23456789TJQKA';
const SUITS = 'shdc';
const card = (str) => RANKS.indexOf(str[0]) * 4 + SUITS.indexOf(str[1]);
const hand = (...cs) => cs.map(card);

let falhas = 0;
function check(nome, cond, extra = '') {
  if (!cond) { falhas++; console.log(`FALHOU: ${nome} ${extra}`); }
  else console.log(`ok: ${nome}`);
}

// --- regras ---
const straightFlush = evaluate7(hand('9s', '8s', '7s', '6s', '5s', 'Ah', 'Kd'));
const quads = evaluate7(hand('9s', '9h', '9d', '9c', '5s', 'Ah', 'Kd'));
const full = evaluate7(hand('9s', '9h', '9d', '5c', '5s', 'Ah', 'Kd'));
const flush = evaluate7(hand('As', 'Js', '8s', '5s', '2s', '9h', 'Kd'));
const straight = evaluate7(hand('9s', '8h', '7d', '6c', '5s', 'Ah', 'Kd'));
const wheel = evaluate7(hand('As', '2h', '3d', '4c', '5s', 'Kh', 'Qd'));
const trips = evaluate7(hand('9s', '9h', '9d', 'Jc', '5s', 'Ah', '2d'));
const doisPares = evaluate7(hand('9s', '9h', '5d', '5c', 'Js', 'Ah', '2d'));
const par = evaluate7(hand('9s', '9h', '5d', '8c', 'Js', 'Ah', '2d'));
const cartaAlta = evaluate7(hand('9s', '7h', '5d', '8c', 'Js', 'Ah', '2d'));

check('straight flush > quadra', straightFlush > quads);
check('quadra > full house', quads > full);
check('full house > flush', full > flush);
check('flush > sequência', flush > straight);
check('sequência > trinca', straight > trips);
check('trinca > dois pares', trips > doisPares);
check('dois pares > par', doisPares > par);
check('par > carta alta', par > cartaAlta);
check('roda A2345 é sequência', wheel > par && wheel < flush);

// desempate por kicker
const kickerAlto = evaluate7(hand('9s', '9h', 'Ad', '8c', '5s', '3h', '2d'));
const kickerBaixo = evaluate7(hand('9s', '9h', 'Kd', '8c', '5s', '3h', '2d'));
check('kicker maior vence', kickerAlto > kickerBaixo);

// sequência mais alta vence
const seqAlta = evaluate7(hand('Ts', '9h', '8d', '7c', '6s', '2h', '3d'));
const seqBaixa = evaluate7(hand('9s', '8h', '7d', '6c', '5s', '2h', '3d'));
check('sequência mais alta vence', seqAlta > seqBaixa);

// --- equities conhecidas (referência de tabelas públicas) ---
const rng = makeRng(12345);
const N = 300000;
const casos = [
  ['AA', 'KK', 0.823, 0.02],
  ['AA', '72o', 0.879, 0.02],
  ['AKs', 'QQ', 0.462, 0.02],
  ['AKo', '22', 0.469, 0.02],
  ['AA', 'AKs', 0.871, 0.02],
  ['JTs', 'AKo', 0.417, 0.025],
];

console.log('\nEquities (Monte Carlo, %d amostras):', N);
for (const [a, b, esperado, tol] of casos) {
  const eq = equityVs(a, b, N, rng);
  const ok = Math.abs(eq - esperado) <= tol;
  if (!ok) falhas++;
  console.log(`${ok ? 'ok ' : 'FALHOU'} ${a} vs ${b}: ${(eq * 100).toFixed(1)}% (esperado ~${(esperado * 100).toFixed(1)}%)`);
}

console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
