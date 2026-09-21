// Calcula ranges de push/fold por EV, iterando até o equilíbrio.
// Modelo: chipEV, stacks iguais, sem ante, um único pagador (simplificação padrão).
// Uso: node scripts/build-pushfold.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const cache = JSON.parse(readFileSync('scripts/.cache/equity-matrix.json', 'utf8'));
const HANDS = cache.hands;
const N = HANDS.length;
const EQ = Float64Array.from(cache.matrix); // EQ[i*N + j] = equity da mão i contra a mão j

const combos = (h) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12);
const COMBOS = HANDS.map(combos);
const TOTAL_COMBOS = COMBOS.reduce((a, b) => a + b, 0); // 1326

// HANDS vem em ordem de grade (AA, AKs, ... 32o, 22), não de força.
// Para o chute inicial das ranges é preciso ordenar por equity contra mão aleatória.
const EQ_VS_RANDOM = HANDS.map((_, i) => {
  let soma = 0, peso = 0;
  for (let j = 0; j < N; j++) { soma += EQ[i * N + j] * COMBOS[j]; peso += COMBOS[j]; }
  return soma / peso;
});
const ORDEM_FORCA = HANDS.map((h, i) => i).sort((a, b) => EQ_VS_RANDOM[b] - EQ_VS_RANDOM[a]);

// Mesas: quantos jogadores ainda agem depois do herói, e quais são
const MESAS = {
  '8max': ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  threehand: ['BTN', 'SB', 'BB'],
  hu: ['SB', 'BB'],
};

const STACKS = [8, 9, 10, 12, 14, 17, 20];
const MARGEM_MIX = 0.15; // bb: faixa onde a mão é jogada em frequência mista

// Equity de TODAS as mãos contra uma range, num passo só (produto matriz-vetor)
function eqVector(freq) {
  const out = new Float64Array(N);
  const w = new Float64Array(N);
  let peso = 0;
  for (let j = 0; j < N; j++) { w[j] = COMBOS[j] * freq[j]; peso += w[j]; }
  if (peso <= 0) { out.fill(0.5); return out; }
  for (let i = 0; i < N; i++) {
    let soma = 0;
    const base = i * N;
    for (let j = 0; j < N; j++) { const wj = w[j]; if (wj > 0) soma += EQ[base + j] * wj; }
    out[i] = soma / peso;
  }
  return out;
}

const larguraEmCombos = (freq) =>
  freq.reduce((acc, f, j) => acc + f * COMBOS[j], 0) / TOTAL_COMBOS;

// Frequência suave: 1 acima da margem, 0 abaixo, linear no meio
const freqDeMargem = (ev) => {
  if (ev >= MARGEM_MIX) return 1;
  if (ev <= -MARGEM_MIX) return 0;
  return (ev + MARGEM_MIX) / (2 * MARGEM_MIX);
};

// EV de pagar um all-in de S bb. postado = quanto o pagador já colocou (blind).
// morto = fichas mortas no pote que não são do herói nem do pagador.
function rangeDePagamento(S, postado, morto, rangeDoShover) {
  const freq = new Float64Array(N);
  const evs = new Float64Array(N);
  const eqs = eqVector(rangeDoShover);
  for (let i = 0; i < N; i++) {
    const eq = eqs[i];
    const pote = 2 * S + morto;
    const evCall = eq * pote - (S - postado) - postado; // resultado líquido do stack
    const evFold = -postado;
    evs[i] = evCall - evFold;
    freq[i] = freqDeMargem(evs[i]);
  }
  return { freq, evs };
}

// EV de dar all-in com N jogadores atrás
function rangeDeShove(S, heroPostado, jogadoresAtras) {
  const freq = new Float64Array(N);
  const evs = new Float64Array(N);

  const eqsPorJogador = jogadoresAtras.map((j) => eqVector(j.freq));
  for (let i = 0; i < N; i++) {
    let ev = 0;
    let probTodosFoldaram = 1;

    for (let jj = 0; jj < jogadoresAtras.length; jj++) {
      const j = jogadoresAtras[jj];
      const c = j.larguraChamada;
      const eq = eqsPorJogador[jj][i];
      const pote = 2 * S + j.morto;
      const evPago = eq * pote - S;
      ev += probTodosFoldaram * c * evPago;
      probTodosFoldaram *= 1 - c;
    }

    // Todos foldaram: herói leva os blinds que não são dele
    const blindsAlheios = jogadoresAtras.reduce((acc, j) => acc + j.postado, 0) +
      (heroPostado > 0 ? 1.5 - heroPostado - jogadoresAtras.reduce((a, j) => a + j.postado, 0) : 1.5 - jogadoresAtras.reduce((a, j) => a + j.postado, 0));
    ev += probTodosFoldaram * Math.max(0, blindsAlheios);

    const evFold = -heroPostado;
    evs[i] = ev - evFold;
    freq[i] = freqDeMargem(evs[i]);
  }
  return { freq, evs };
}

// Frequências 0..100 por mão -> base64
function freqBase64(freq) {
  const bytes = new Uint8Array(N);
  for (let i = 0; i < N; i++) bytes[i] = Math.round(Math.max(0, Math.min(1, freq[i])) * 100);
  return Buffer.from(bytes).toString('base64');
}

// EVs em décimos de bb, int8 -> base64
function evBase64(evs) {
  const bytes = new Int8Array(N);
  for (let i = 0; i < N; i++) bytes[i] = Math.max(-128, Math.min(127, Math.round(evs[i] * 10)));
  return Buffer.from(bytes.buffer).toString('base64');
}

const saida = { shove: {}, call: {}, largura: {} };

// Range inicial: top 15% por força
function topPct(pct) {
  const f = new Float64Array(N);
  let acc = 0;
  for (const i of ORDEM_FORCA) {
    acc += COMBOS[i];
    f[i] = acc / TOTAL_COMBOS <= pct ? 1 : 0;
  }
  return f;
}

const postadoDe = (pos) => (pos === 'SB' ? 0.5 : pos === 'BB' ? 1 : 0);

for (const [modo, posicoes] of Object.entries(MESAS)) {
  for (const S of STACKS) {
    const shovers = posicoes.slice(0, -1); // o último da ordem nunca abre all-in sem ação antes

    // chamadas[shover][pagador]: cada par tem a sua própria range.
    // Usar uma média de todos os shovers deixava o BB pagando apertado contra
    // o SB, e o SB abrindo 85% a 10bb — o mesmo spot dá 55% em heads-up.
    const chamadas = {};
    for (const sh of shovers) {
      chamadas[sh] = {};
      for (const pagador of posicoes.slice(posicoes.indexOf(sh) + 1)) {
        chamadas[sh][pagador] = topPct(0.15);
      }
    }

    // Melhor-resposta pura entra em ciclo (HU 10bb oscilava entre 87% e 45%);
    // o passo amortecido converge para o equilíbrio.
    const ALFA = 0.25;
    const mistura = (atual, alvo) => {
      let delta = 0;
      for (let i = 0; i < N; i++) {
        const novo = atual[i] + ALFA * (alvo[i] - atual[i]);
        delta += Math.abs(novo - atual[i]);
        atual[i] = novo;
      }
      return delta;
    };

    const shoves = {};
    for (const sh of shovers) shoves[sh] = { freq: topPct(0.30), evs: new Float64Array(N) };

    let iter = 0;
    for (; iter < 200; iter++) {
      let mudanca = 0;

      // 1) cada shover responde às ranges de pagamento que enfrenta
      for (const sh of shovers) {
        const heroPostado = postadoDe(sh);
        const atras = posicoes.slice(posicoes.indexOf(sh) + 1).map((jp) => {
          const postado = postadoDe(jp);
          const freq = chamadas[sh][jp];
          return { pos: jp, postado, freq, larguraChamada: larguraEmCombos(freq), morto: Math.max(0, 1.5 - postado - heroPostado) };
        });
        const alvo = rangeDeShove(S, heroPostado, atras);
        mudanca += mistura(shoves[sh].freq, alvo.freq);
        shoves[sh].evs = alvo.evs;
      }

      // 2) cada pagador responde ao shover específico
      for (const sh of shovers) {
        for (const pagador of Object.keys(chamadas[sh])) {
          const postado = postadoDe(pagador);
          const morto = Math.max(0, 1.5 - postado);
          const alvo = rangeDePagamento(S, postado, morto, shoves[sh].freq);
          mudanca += mistura(chamadas[sh][pagador], alvo.freq);
          chamadas[sh][pagador + '_evs'] = alvo.evs;
        }
      }

      if (mudanca < 0.02 * (shovers.length + Object.keys(chamadas).reduce((a,k)=>a+Object.keys(chamadas[k]).length,0))) break;
    }

    for (const sh of shovers) {
      const chave = `${modo}|${sh}|${S}`;
      saida.shove[chave] = { freq: freqBase64(shoves[sh].freq), ev: evBase64(shoves[sh].evs) };
      saida.largura[chave] = Number((larguraEmCombos(shoves[sh].freq) * 100).toFixed(1));
      for (const pagador of posicoes.slice(posicoes.indexOf(sh) + 1)) {
        const k = `${modo}|${pagador}|vs${sh}|${S}`;
        saida.call[k] = {
          freq: freqBase64(chamadas[sh][pagador]),
          ev: evBase64(chamadas[sh][pagador + '_evs'] || new Float64Array(N)),
        };
        saida.largura[`call|${k}`] = Number((larguraEmCombos(chamadas[sh][pagador]) * 100).toFixed(1));
      }
    }
  }
}

writeFileSync('scripts/.cache/pushfold.json', JSON.stringify(saida));

// --- Conferência contra spots conhecidos ---
const maosDe = (b64) => {
  const bytes = Buffer.from(b64, 'base64');
  return HANDS.filter((_, i) => bytes[i] >= 50);
};

console.log('--- Shove sem ação antes (largura em combos) ---');
for (const k of ['hu|SB|8', 'hu|SB|10', 'hu|SB|15', '8max|SB|10', '8max|BTN|10', '8max|CO|10', '8max|UTG|10', '8max|BTN|20', '8max|SB|20', '6max|BTN|10', 'threehand|BTN|10']) {
  if (saida.shove[k]) console.log(`  ${k}: ${saida.largura[k]}% (${maosDe(saida.shove[k].freq).length} mãos)`);
}

console.log('\n--- Pagar all-in ---');
for (const k of ['hu|BB|vsSB|10', '8max|BB|vsSB|10', '8max|BB|vsUTG|10', '8max|BB|vsBTN|10', '8max|BB|vsSB|20']) {
  if (saida.call[k]) console.log(`  ${k}: ${saida.largura['call|' + k]}% (${maosDe(saida.call[k].freq).length} mãos)`);
}

console.log('\nSB 10bb heads-up:', maosDe(saida.shove['hu|SB|10'].freq).join(' '));
console.log('\nBB paga vs SB 10bb (8max):', maosDe(saida.call['8max|BB|vsSB|10'].freq).join(' '));
console.log('\nUTG 10bb (8max):', maosDe(saida.shove['8max|UTG|10'].freq).join(' '));
