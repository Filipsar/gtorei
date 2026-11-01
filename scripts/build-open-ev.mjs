// Calcula as ranges de ABERTURA (primeiro a entrar no pote) por EV, com ante e
// com a opção de abrir pequeno, iterando melhor-resposta até o equilíbrio — o
// mesmo método do build-pushfold.mjs, com uma árvore maior.
//
// Por que existe: até 02/10/2026 a abertura com stack fundo era um corte fixo
// por posição sobre uma ordem de força, sem ante e calibrado em 30 BB. Em
// 100 BB o UTG abria 11,2% dos combos; solver de torneio com ante abre ~16%.
//
// Árvore (herói = primeiro a falar; todos antes dele foldaram):
//   herói:  fold | abre pequeno (r) | all-in (S)
//   contra o all-in, cada jogador atrás, em ordem: fold | paga
//   contra a abertura, cada jogador atrás, em ordem:
//       fold | paga (só o BB) | 3-bet pequeno (T) | 3-bet all-in (S)
//     herói contra o 3-bet pequeno: fold | paga | 4-bet all-in
//       quem deu 3-bet contra o 4-bet all-in: fold | paga
//     herói contra o 3-bet all-in: fold | paga
//
// Simplificações do modelo:
//   - chipEV, stacks iguais; ante de big blind = 1 BB, dinheiro morto;
//   - só o big blind paga a abertura; os demais dão 3-bet ou foldam. Sem pote
//     multiway, quem pagasse no meio da mesa levaria os blinds de graça (ver
//     podePagarAbertura). O primeiro que dá 3-bet fecha a ação;
//   - sem remoção de cartas;
//   - PÓS-FLOP NÃO É RESOLVIDO. Quando a mão vai ao flop sem all-in, cada lado
//     leva equity × realização × pote. A realização depende da mão (par,
//     suited, conectada e cartas altas realizam mais; offsuit baixa e
//     desconexa realiza menos) e da posição, e tende a 1 em stack curto, onde
//     a mão quase sempre termina em all-in. É isso que separa este cálculo de
//     um solver completo: a largura das ranges sai na faixa certa, a fronteira
//     mão a mão pode diferir.
//
// Erros que já apareceram aqui (02/10/2026):
//   - bônus de posição igual para toda mão, inclusive lixo: botão abria 98%;
//   - qualquer um podia pagar a abertura e os blinds de trás foldavam sempre:
//     com 20 BB o UTG abria 67%;
//   - um tamanho só de 3-bet, que virava all-in a partir de 30% do stack: o
//     botão abria 43,5% com 30 BB e 32,1% com 25 BB. Agora o vilão tem os dois
//     3-bets, e o cálculo escolhe;
//   - realização perto de 1 até ~38 BB: o BB defendia 95% contra o botão.
//
// LIMITAÇÃO CONHECIDA: entre 20 e 35 BB o CO e o BTN saem ~10 pontos mais
// apertados que um solver completo. Nessa faixa os blinds respondem com 3-bet
// all-in, e o modelo não dá ao SB o leque de opções que ele tem na prática
// (pagar, 3-bet pequeno com iniciativa, squeeze do BB atrás). Testado em
// 02/10: liberar o pagamento do SB ou dar bônus de iniciativa ao 3-bet
// pequeno mexe nesses números mas distorce outros; nenhum foi adotado.
//
// Uso: node scripts/build-open-ev.mjs [modo] [stack]
//   sem argumentos resolve tudo e grava scripts/.cache/open-ev.json
//   DEPURA=1 mostra o que cada vilão faz contra o primeiro herói da mesa
import { readFileSync, writeFileSync } from 'node:fs';

const cache = JSON.parse(readFileSync('scripts/.cache/equity-matrix.json', 'utf8'));
const HANDS = cache.hands;
const N = HANDS.length;
const EQ = Float64Array.from(cache.matrix); // EQ[i*N + j] = equity da mão i contra a mão j
const COMBOS = HANDS.map((h) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12));
const TOTAL_COMBOS = COMBOS.reduce((a, b) => a + b, 0); // 1326

// ── Parâmetros do modelo ───────────────────────────────────────────────────
// Cash (MODALIDADE=cash, 31/10/2026): sem ante, 6-max, 100 BB e rake sobre o
// pote disputado. Torneio continua igual (ante de 1 BB, sem rake).
const CASH = process.env.MODALIDADE === 'cash';
const ANTE = CASH ? 0 : 1;   // ante de big blind, em BB
// Rake de sala online de micro e low stakes: 5% do pote com teto de 3 BB, só
// em pote disputado (foi ao flop ou ao showdown). Pote levado no pré-flop sem
// disputa não paga ("no flop, no drop").
const RAKE = CASH ? 0.05 : 0;
const TETO_RAKE = CASH ? 3 : 0;
const semRake = (pote) => pote - Math.min(RAKE * pote, TETO_RAKE);
const POTE_INICIAL = 0.5 + 1 + ANTE;
// Multiplicam a jogabilidade da mão. Escolhidos para a realização MÉDIA bater
// com a literatura: quem abre e joga em posição realiza ~100-110% da equity
// (jogabilidade média da range ~0,92 x 1,12 ≈ 1,03); o BB defendendo fora de
// posição, ~70-80% (~0,85 x 0,85 ≈ 0,72). Com 1,0 / 0,82 o botão abria só 34%
// em 30 BB.
const REAL_EM_POSICAO = 1.12;
const REAL_FORA = 0.85;
const MARGEM = 0.08;         // BB: diferença de EV abaixo da qual a mão mistura
const MAX_ITER = 2000;
const GAP_ALVO = 0.004;      // fração de combos fora da melhor resposta para parar
// Passo da melhor-resposta: começa largo e encolhe (média de jogo fictício).
// Com passo fixo a range oscilava entre duas formas e não assentava.
const passo = (iter) => Math.max(0.01, 2 / (iter + 4));

const MESAS = CASH ? { '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] } : {
  '8max': ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  threehand: ['BTN', 'SB', 'BB'],
  hu: ['SB', 'BB'],
};
const STACKS = CASH ? [100] : [8, 9, 10, 12, 14, 17, 20, 25, 30, 35, 40, 50, 60, 80, 100];

const postado = (pos) => (pos === 'SB' ? 0.5 : pos === 'BB' ? 1 : 0);
const ehBlind = (pos) => pos === 'SB' || pos === 'BB';

// Quem tem posição no pós-flop entre o herói (abriu) e quem respondeu
function heroiEmPosicao(modo, heroi, vilao) {
  if (modo === 'hu') return heroi === 'SB'; // no heads-up o SB é o botão
  if (heroi === 'SB') return false;         // SB só enfrenta o BB, e fala antes
  return ehBlind(vilao);                    // fora dos blinds, quem fala depois tem posição
}

const tamanhoAbertura = (modo, heroi, S) =>
  Math.min(S, heroi === 'SB' && modo !== 'hu' ? 3 : S <= 25 ? 2 : 2.2);

// 3-bet pequeno: 3x em posição, 4x fora. Se custaria 40% do stack ou mais, não
// existe na prática (é shove), e o vilão só tem o 3-bet all-in.
function tamanho3bet(modo, heroi, vilao, r, S) {
  const t = (heroiEmPosicao(modo, heroi, vilao) ? 4 : 3) * r;
  return t < 0.4 * S ? t : null;
}

// 4-bet pequeno, só no cash (31/10/2026): 2,2x o 3-bet. Com 100 BB, contra
// o 3-bet ninguém empurra tudo; o 4-bet vai a ~22 BB e o all-in fica para o 5-bet.
const tamanho4bet = (T, S) => (CASH && T && 2.2 * T < 0.4 * S ? 2.2 * T : null);

// Só o big blind paga a abertura; os demais dão 3-bet ou foldam.
// Motivo: o modelo não tem pote multiway. Quando alguém no meio da mesa
// pagava, os blinds de trás eram tratados como se sempre foldassem, e os dois
// disputavam 2,5 BB de blinds e ante de graça. Com 20 BB isso fazia cada vilão
// pagar 69% e o UTG abrir 67%. O BB fecha a ação, então o pote dele está certo.
// Cash (31/10/2026, etapa 1): todo mundo pode pagar a abertura. O brinde que
// fazia o torneio travar isso (os blinds de trás foldando sempre) vira risco de
// squeeze: quem paga fora do BB perde o call se alguém atrás der 3-bet, com a
// chance tirada da frequência de 3-bet de quem fala depois (ver pSqueeze).
const podePagarAbertura = (vilao) => CASH || vilao === 'BB';

// ── Realização de equity ──────────────────────────────────────────────────
// Jogabilidade: quanto da equity crua a mão converte quando joga pós-flop.
// Valores de ordem de grandeza da literatura de realização de equity; não são
// tirados de nenhuma tabela proprietária.
const VALOR = '23456789TJQKA';
function jogabilidade(h) {
  const a = VALOR.indexOf(h[0]), b = VALOR.indexOf(h[1]); // a >= b
  if (h.length === 2) return 0.92 + 0.08 * (a / 12);       // pares: 22 0,92 ... AA 1,00
  const suited = h[2] === 's';
  const gap = a - b - 1;
  let p = suited ? 0.9 : 0.78;
  if (gap === 0) p += 0.06; else if (gap === 1) p += 0.04; else if (gap === 2) p += 0.02;
  if (b >= 8) p += 0.06;                          // as duas cartas T ou maior
  if (a === 12) p += 0.03;                        // ás: potencial de nuts
  // offsuit baixa e desconexa — menos ás com carta baixa, que tem valor de
  // showdown (sem esta exceção o botão abria J3s sempre e A5o só 63%)
  if (!suited && a < 12 && b <= 4 && gap >= 3) p -= 0.12;
  return Math.min(1.08, Math.max(0.55, p));
}
const JOGAB = HANDS.map(jogabilidade);
// Em stack curto quase toda mão termina em all-in e a equity crua vale inteira.
// O efeito da realização chega ao máximo em 20 BB: num pote de BTN contra BB
// com 30 BB a relação stack/pote ainda é ~5, e lixo fora de posição realiza
// mal. Com a rampa até 38 BB, o BB defendia 95% contra o botão em 30 BB.
const profundidade = (S) => Math.min(1, Math.max(0, (S - 8) / 12));
function realizacao(i, emPosicao, S) {
  const alvo = JOGAB[i] * (emPosicao ? REAL_EM_POSICAO : REAL_FORA);
  return 1 - (1 - alvo) * profundidade(S);
}
// Fatia do pote que a mão i leva indo ao flop com equity eq
const fatia = (eq, i, emPosicao, S) => Math.min(1, eq * realizacao(i, emPosicao, S));
// Pote de 4-bet pago (cash): com ~1,7 pote atrás a mão quase sempre termina em
// all-in no flop, e posição e jogabilidade valem pouco. A realização vai a 1
// conforme o SPR cai (cheia a partir de SPR 5). Sem isto o vilão em posição
// levava num pote de 4-bet a mesma vantagem de um pote simples, e o herói só
// dava 4-bet all-in, nunca o pequeno.
function fatiaSpr(eq, i, emPosicao, pote, atras) {
  const d = Math.min(1, Math.max(0, (atras / pote - 1) / 4));
  const alvo = JOGAB[i] * (emPosicao ? REAL_EM_POSICAO : REAL_FORA);
  return Math.min(1, eq * (1 - (1 - alvo) * d));
}

// ── Álgebra de ranges ─────────────────────────────────────────────────────
// ── Bloqueadores (cash, etapa 2, 31/10/2026) ───────────────────────────────
// COMPAT[i*N+j] = quantos combos da classe j sobram, em média, quando o herói
// tem um combo da classe i (sem carta repetida). Com isso a range do vilão é
// pesada pelo que a mão do herói bloqueia: com A5s, sobram menos AA e AK do
// outro lado. Sem bloqueador o modelo nunca blefava no 3-bet nem no 4-bet.
const NAIPES = 'shdc';
function combosDaClasse(h) {
  const a = h[0], b = h[1], out = [];
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
    if (h.length === 2) { if (x < y) out.push([a + NAIPES[x], b + NAIPES[y]]); }
    else if (h[2] === 's') { if (x === y) out.push([a + NAIPES[x], b + NAIPES[y]]); }
    else if (x !== y) out.push([a + NAIPES[x], b + NAIPES[y]]);
  }
  return out;
}
const COMBOS_DE = HANDS.map(combosDaClasse);
const COMPAT = new Float64Array(N * N);
if (process.env.MODALIDADE === 'cash') {
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    let soma = 0;
    for (const [c1, c2] of COMBOS_DE[i]) for (const [d1, d2] of COMBOS_DE[j]) if (c1 !== d1 && c1 !== d2 && c2 !== d1 && c2 !== d2) soma++;
    COMPAT[i * N + j] = soma / COMBOS_DE[i].length;
  }
}

/** Para cada mão i do jogador: fração da range "todo" do outro que está em "parte", contando os bloqueadores */
function fracVec(parte, todo) {
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let p = 0, q = 0;
    const base = i * N;
    for (let j = 0; j < N; j++) { const k = COMPAT[base + j]; if (todo[j] > 0) { q += todo[j] * k; p += parte[j] * k; } }
    out[i] = q > 1e-9 ? p / q : 0;
  }
  return out;
}

function eqVector(freq) {
  if (process.env.MODALIDADE === 'cash') return eqVectorBloq(freq);
  const out = new Float64Array(N);
  const w = new Float64Array(N);
  let peso = 0;
  for (let j = 0; j < N; j++) { w[j] = COMBOS[j] * freq[j]; peso += w[j]; }
  if (peso <= 1e-9) { out.fill(0.5); return out; }
  for (let i = 0; i < N; i++) {
    let soma = 0;
    const base = i * N;
    for (let j = 0; j < N; j++) { const wj = w[j]; if (wj > 0) soma += EQ[base + j] * wj; }
    out[i] = soma / peso;
  }
  return out;
}
// Equity da mão i contra a range, com os combos que a mão i deixa sobrar
function eqVectorBloq(freq) {
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let soma = 0, peso = 0;
    const base = i * N;
    for (let j = 0; j < N; j++) { const w = freq[j] * COMPAT[base + j]; if (w > 0) { soma += EQ[base + j] * w; peso += w; } }
    out[i] = peso > 1e-9 ? soma / peso : 0.5;
  }
  return out;
}
const largura = (freq) => { let s = 0; for (let j = 0; j < N; j++) s += freq[j] * COMBOS[j]; return s / TOTAL_COMBOS; };
const produto = (a, b) => { const o = new Float64Array(N); for (let i = 0; i < N; i++) o[i] = a[i] * b[i]; return o; };
const fracao = (parte, todo) => (todo > 1e-9 ? largura(parte) / todo : 0);

// Ordem de força só para o chute inicial
const EQ_VS_RANDOM = HANDS.map((_, i) => {
  let s = 0; for (let j = 0; j < N; j++) s += EQ[i * N + j] * COMBOS[j];
  return s / TOTAL_COMBOS;
});
const ORDEM = HANDS.map((_, i) => i).sort((a, b) => EQ_VS_RANDOM[b] - EQ_VS_RANDOM[a]);
function topo(pct) {
  const f = new Float64Array(N); let acc = 0;
  for (const i of ORDEM) { acc += COMBOS[i]; f[i] = acc / TOTAL_COMBOS <= pct ? 1 : 0; }
  return f;
}

// Melhor-resposta suave entre k ações: a melhor leva tudo, a não ser que a
// segunda esteja a menos de MARGEM; aí as duas dividem linearmente.
function alvo(evs) {
  let b = 0, s = -1;
  for (let a = 1; a < evs.length; a++) if (evs[a] > evs[b]) b = a;
  for (let a = 0; a < evs.length; a++) if (a !== b && (s < 0 || evs[a] > evs[s])) s = a;
  const out = new Array(evs.length).fill(0);
  const d = evs[b] - evs[s];
  if (d >= MARGEM) out[b] = 1;
  else { out[b] = 0.5 + d / (2 * MARGEM); out[s] = 1 - out[b]; }
  return out;
}

// Move a estratégia na direção da melhor resposta e devolve a distância entre
// as duas ANTES do passo: é essa distância que diz se chegou no equilíbrio.
let ALFA = 0.5;
function aproxima(atual, alvoV) {
  let gap = 0;
  for (let i = 0; i < N; i++) {
    const d = alvoV[i] - atual[i];
    gap += Math.abs(d) * COMBOS[i];
    atual[i] += ALFA * d;
  }
  return gap / TOTAL_COMBOS;
}

const NUNCA = -1e9; // EV de uma ação que não existe naquele nó

// ── Solver de uma mesa num stack ──────────────────────────────────────────
function resolver(modo, S) {
  const posicoes = MESAS[modo];
  const herois = posicoes.slice(0, -1); // o BB nunca é o primeiro a abrir
  const est = {};
  for (const p of herois) {
    est[p] = {
      R: S <= 10 ? new Float64Array(N) : topo(0.2), // abre pequeno
      J: S <= 10 ? topo(0.25) : new Float64Array(N), // all-in
      evR: new Float64Array(N), evJ: new Float64Array(N),
      vs: {},
    };
    for (const v of posicoes.slice(posicoes.indexOf(p) + 1)) {
      est[p].vs[v] = {
        cR: podePagarAbertura(v) ? topo(0.12) : new Float64Array(N), // paga a abertura
        tR: topo(0.03),   // 3-bet pequeno
        uR: topo(0.03),   // 3-bet all-in
        cJ: topo(0.12),   // paga o all-in do herói
        hC3: topo(0.06), hJ4: topo(0.03), // herói contra o 3-bet pequeno
        hCU: topo(0.06),                  // herói contra o 3-bet all-in
        vC4: topo(0.03),                  // vilão contra o 4-bet all-in
        // Cash: 4-bet pequeno do herói e o que vem depois
        hR4: topo(0.03),                  // herói dá 4-bet pequeno contra o 3-bet
        vC4s: topo(0.02), vJ5: topo(0.01), // vilão contra o 4-bet pequeno: paga ou 5-bet all-in
        hC5: topo(0.01),                  // herói paga o 5-bet all-in
      };
    }
  }

  let iter = 0, gapMedio = 0;
  for (; iter < MAX_ITER; iter++) {
    ALFA = passo(iter);
    let gap = 0, nos = 0;

    for (const p of herois) {
      const e = est[p];
      const ph = postado(p);
      const r = tamanhoAbertura(modo, p, S);
      const atras = posicoes.slice(posicoes.indexOf(p) + 1);

      // O que cada vilão faz (frequência agregada) e equities contra cada range
      // Chance de alguém atrás de v dar 3-bet (squeeze) depois que v paga: usa a
      // frequência de 3-bet de cada um contra este herói. Só conta no cash.
      const pSqueeze = (v) => {
        if (!CASH) return 0;
        let ninguem = 1;
        for (const w of atras.slice(atras.indexOf(v) + 1)) ninguem *= 1 - Math.min(1, largura(e.vs[w].tR) + largura(e.vs[w].uR));
        return 1 - ninguem;
      };
      const ctx = atras.map((v) => {
        const x = e.vs[v];
        const T = tamanho3bet(modo, p, v, r, S);
        const t4 = produto(x.tR, x.vC4);
        const lt = T ? largura(x.tR) : 0;
        return {
          v, pv: postado(v), ip: heroiEmPosicao(modo, p, v), morto: POTE_INICIAL - ph - postado(v), T, sq: pSqueeze(v),
          c: largura(x.cR), t: lt, u: largura(x.uR), j: largura(x.cJ),
          q4: T ? fracao(t4, lt) : 0,
          eqCR: eqVector(x.cR), eqCJ: eqVector(x.cJ), eqUR: eqVector(x.uR),
          eqTR: T ? eqVector(x.tR) : null, eqT4: T ? eqVector(t4) : null,
          ...(() => {
            const R4 = tamanho4bet(T, S);
            if (!R4) return { R4: null };
            const c4 = produto(x.tR, x.vC4s), j5 = produto(x.tR, x.vJ5);
            return { R4, vc4: fracVec(c4, x.tR), vj5: fracVec(j5, x.tR), eqC4s: eqVector(c4), eqJ5: eqVector(j5) };
          })(),
        };
      });

      // Herói: abertura e respostas aos 3-bets de cada vilão
      const alvoR = new Float64Array(N), alvoJ = new Float64Array(N);
      const alvoResp = ctx.map(() => ({ C3: new Float64Array(N), J4: new Float64Array(N), CU: new Float64Array(N), R4: new Float64Array(N), C5: new Float64Array(N) }));
      for (let i = 0; i < N; i++) {
        let evJ = 0, segue = 1;
        for (const c of ctx) {
          evJ += segue * c.j * (c.eqCJ[i] * semRake(2 * S + c.morto) - S);
          segue *= 1 - c.j;
        }
        evJ += segue * (POTE_INICIAL - ph);

        let evR = 0; segue = 1;
        ctx.forEach((c, k) => {
          const pago = (1 - c.sq) * (fatia(c.eqCR[i], i, c.ip, S) * semRake(2 * r + c.morto) - r) + c.sq * -r;
          // contra o 3-bet all-in
          const evCU = c.eqUR[i] * semRake(2 * S + c.morto) - S;
          alvoResp[k].CU[i] = alvo([-r, evCU])[1];
          const melhorU = Math.max(-r, evCU);
          // contra o 3-bet pequeno
          let melhor3 = 0;
          if (c.T) {
            const evC3 = fatia(c.eqTR[i], i, c.ip, S) * semRake(2 * c.T + c.morto) - c.T;
            // No cash com 100 BB o 4-bet é pequeno e o all-in fica para o 5-bet: com o
            // 4-bet all-in disponível o modelo empurrava AA a A5s 100% (a range que
            // paga o all-in sai apertada demais sem pós-flop resolvido)
            const evJ4 = c.R4 ? NUNCA : (1 - c.q4) * (c.T + c.morto) + c.q4 * (c.eqT4[i] * semRake(2 * S + c.morto) - S);
            let evR4 = NUNCA;
            if (c.R4) {
              const evPaga5 = c.eqJ5[i] * semRake(2 * S + c.morto) - S;
              alvoResp[k].C5[i] = alvo([-c.R4, evPaga5])[1];
              const vc4 = c.vc4[i], vj5 = c.vj5[i];
              evR4 = (1 - vc4 - vj5) * (c.T + c.morto)
                + vc4 * (fatiaSpr(c.eqC4s[i], i, c.ip, 2 * c.R4 + c.morto, S - c.R4) * semRake(2 * c.R4 + c.morto) - c.R4)
                + vj5 * Math.max(-c.R4, evPaga5);
            }
            const a = alvo([-r, evC3, evJ4, evR4]);
            alvoResp[k].C3[i] = a[1]; alvoResp[k].J4[i] = a[2]; alvoResp[k].R4[i] = a[3];
            melhor3 = Math.max(-r, evC3, evJ4, evR4);
          }
          evR += segue * (c.c * pago + c.t * melhor3 + c.u * melhorU);
          segue *= 1 - c.c - c.t - c.u;
        });
        evR += segue * (POTE_INICIAL - ph);

        const evF = -ph;
        const a = alvo([evF, evR, evJ]);
        alvoR[i] = a[1]; alvoJ[i] = a[2];
        e.evR[i] = evR - evF; e.evJ[i] = evJ - evF;
      }
      gap += aproxima(e.R, alvoR) + aproxima(e.J, alvoJ); nos += 2;
      ctx.forEach((c, k) => {
        const x = e.vs[c.v];
        gap += aproxima(x.hCU, alvoResp[k].CU); nos += 1;
        if (c.T) { gap += aproxima(x.hC3, alvoResp[k].C3) + aproxima(x.hJ4, alvoResp[k].J4); nos += 2; }
        if (c.R4) { gap += aproxima(x.hR4, alvoResp[k].R4) + aproxima(x.hC5, alvoResp[k].C5); nos += 2; }
        else x.hR4.fill(0);
      });

      // Vilões: cada um responde à range do herói
      const eqR = eqVector(e.R), eqJ = eqVector(e.J);
      const lR = largura(e.R);
      for (const c of ctx) {
        const x = e.vs[c.v];
        const rangeCU = produto(e.R, x.hCU);
        const pcu = fracao(rangeCU, lR);
        const eqCU = eqVector(rangeCU);
        let pf = 1, pc = 0, pj = 0, eqC3 = null, eqJ4 = null;
        let pr4 = 0, pc5 = 0, eqR4 = null, eqC5 = null;
        let pcV = null, pr4V = null; // cash: as mesmas frações, por mão do vilão
        if (c.T) {
          const rangeC3 = produto(e.R, x.hC3), rangeJ4 = produto(e.R, x.hJ4);
          pc = fracao(rangeC3, lR); pj = fracao(rangeJ4, lR);
          eqC3 = eqVector(rangeC3); eqJ4 = eqVector(rangeJ4);
          if (c.R4) {
            const rangeR4 = produto(e.R, x.hR4), rangeC5 = produto(rangeR4, x.hC5);
            pr4 = fracao(rangeR4, lR); pc5 = fracao(rangeC5, largura(rangeR4));
            eqR4 = eqVector(rangeR4); eqC5 = eqVector(rangeC5);
            if (CASH) { pcV = fracVec(rangeC3, e.R); pr4V = fracVec(rangeR4, e.R); }
          }
          pf = Math.max(0, 1 - pc - pj - pr4);
        }
        const alvoCR = new Float64Array(N), alvoTR = new Float64Array(N), alvoUR = new Float64Array(N);
        const alvoCJ = new Float64Array(N), alvoC4 = new Float64Array(N), alvoC4s = new Float64Array(N), alvoJ5 = new Float64Array(N);
        for (let i = 0; i < N; i++) {
          const evF = -c.pv;
          const evC = podePagarAbertura(c.v) ? (1 - c.sq) * (fatia(eqR[i], i, !c.ip, S) * semRake(2 * r + c.morto) - r) + c.sq * -r : NUNCA;
          // Cash com 100 BB: o 3-bet é pequeno; 3-bet all-in só existe quando o pequeno não cabe
          // (com ele, AA e KK dos blinds iam all-in 91-100% e o resto do cálculo entortava)
          const evU = CASH && c.T ? NUNCA : (1 - pcu) * (r + c.morto) + pcu * (eqCU[i] * semRake(2 * S + c.morto) - S);
          let ev3 = NUNCA;
          if (c.T) {
            const evPago3 = fatia(eqC3[i], i, !c.ip, S) * semRake(2 * c.T + c.morto) - c.T;
            const evPagaJ4 = eqJ4[i] * semRake(2 * S + c.morto) - S;
            alvoC4[i] = alvo([-c.T, evPagaJ4])[1];
            let melhorContra4 = 0;
            if (c.R4) {
              const evPaga4 = fatiaSpr(eqR4[i], i, !c.ip, 2 * c.R4 + c.morto, S - c.R4) * semRake(2 * c.R4 + c.morto) - c.R4;
              const evJ5 = (1 - pc5) * (c.R4 + c.morto) + pc5 * (eqC5[i] * semRake(2 * S + c.morto) - S);
              const a4 = alvo([-c.T, evPaga4, evJ5]);
              alvoC4s[i] = a4[1]; alvoJ5[i] = a4[2];
              melhorContra4 = Math.max(-c.T, evPaga4, evJ5);
            }
            if (pcV) {
              const pci = pcV[i], pr4i = pr4V[i], pfi = Math.max(0, 1 - pci - pr4i);
              ev3 = pfi * (r + c.morto) + pci * evPago3 + pr4i * melhorContra4;
            } else {
              ev3 = pf * (r + c.morto) + pc * evPago3 + pj * Math.max(-c.T, evPagaJ4) + pr4 * melhorContra4;
            }
          }
          const a = alvo([evF, evC, ev3, evU]);
          alvoCR[i] = a[1]; alvoTR[i] = a[2]; alvoUR[i] = a[3];
          alvoCJ[i] = alvo([evF, eqJ[i] * semRake(2 * S + c.morto) - S])[1];
        }
        gap += aproxima(x.cR, alvoCR) + aproxima(x.uR, alvoUR) + aproxima(x.cJ, alvoCJ); nos += 3;
        if (c.T) { gap += aproxima(x.tR, alvoTR) + aproxima(x.vC4, alvoC4); nos += 2; }
        else x.tR.fill(0);
        if (c.R4) { gap += aproxima(x.vC4s, alvoC4s) + aproxima(x.vJ5, alvoJ5); nos += 2; }
      }
    }

    gapMedio = gap / nos;
    if (iter > 40 && gapMedio < GAP_ALVO) break;
  }

  if (process.env.DEPURA) {
    const p = herois.includes(process.env.DEPURA) ? process.env.DEPURA : herois[0];
    const e = est[p], r = tamanhoAbertura(modo, p, S);
    const pct = (x) => (100 * x).toFixed(1).padStart(5) + '%';
    console.log(`  ${p} abre r=${r}: raise ${pct(largura(e.R))}, all-in ${pct(largura(e.J))}`);
    for (const [v, x] of Object.entries(e.vs)) {
      const T = tamanho3bet(modo, p, v, r, S);
      console.log(`    ${v.padEnd(5)} T=${T ? T.toFixed(1) : '—'}  paga ${pct(largura(x.cR))}  3-bet ${pct(largura(x.tR))}  3-bet all-in ${pct(largura(x.uR))}  paga all-in ${pct(largura(x.cJ))}`);
    }
    const idx = (h) => HANDS.indexOf(h);
    for (const h of ['72o', 'K5o', 'T9s', 'AA']) console.log(`    ${h}: EV abrir ${e.evR[idx(h)].toFixed(2)}  EV all-in ${e.evJ[idx(h)].toFixed(2)}`);
  }
  return { est, iter, gapMedio };
}

// ── Saída ─────────────────────────────────────────────────────────────────
// Ação com menos de 5% vira zero e o peso volta para as outras. É resíduo da
// média do jogo fictício (Q8s saía abrindo 1% de UTG com EV de -0,1 BB) e
// poluía a grade sem mudar decisão nenhuma.
const RESIDUO = 0.05;
function limpa(R, J) {
  for (let i = 0; i < N; i++) {
    let r = R[i], j = J[i], f = Math.max(0, 1 - r - j);
    if (r < RESIDUO) r = 0;
    if (j < RESIDUO) j = 0;
    if (f < RESIDUO) f = 0;
    const soma = r + j + f || 1;
    R[i] = r / soma; J[i] = j / soma;
  }
}
const freqB64 = (f) => Buffer.from(Uint8Array.from(f, (x) => Math.round(Math.max(0, Math.min(1, x)) * 100))).toString('base64');
const evB64 = (e) => Buffer.from(new Int8Array(Array.from(e, (x) => Math.max(-128, Math.min(127, Math.round(x * 10))))).buffer).toString('base64');

const saida = {
  abertura: {}, resposta: {}, vs3bet: {}, largura: {}, gap: {},
  parametros: { ANTE, RAKE, TETO_RAKE, REAL_EM_POSICAO, REAL_FORA, MARGEM },
};
const [soModo, soStack] = process.argv.slice(2);
const t0 = Date.now();
for (const modo of Object.keys(MESAS)) {
  if (soModo && modo !== soModo) continue;
  for (const S of STACKS) {
    if (soStack && S !== Number(soStack)) continue;
    const t1 = Date.now();
    const { est, iter, gapMedio } = resolver(modo, S);
    saida.gap[`${modo}|${S}`] = +(100 * gapMedio).toFixed(2);
    for (const [p, e] of Object.entries(est)) {
      limpa(e.R, e.J);
      const k = `${modo}|${p}|${S}`;
      saida.abertura[k] = { r: freqB64(e.R), j: freqB64(e.J), er: evB64(e.evR), ej: evB64(e.evJ) };
      saida.largura[k] = { abre: +(100 * (largura(e.R) + largura(e.J))).toFixed(1), allin: +(100 * largura(e.J)).toFixed(1) };
      // Respostas à abertura: guardadas para comparar; o app ainda não usa
      // (vsOpenRaise continua no modelo antigo por enquanto)
      for (const [v, x] of Object.entries(e.vs)) {
        saida.resposta[`${modo}|${v}|vs${p}|${S}`] = { c: freqB64(x.cR), t: freqB64(x.tR), u: freqB64(x.uR) };
        // Cash: o herói (p) contra o 3-bet pequeno de v: paga, 4-bet pequeno ou 4-bet all-in
        if (CASH && largura(x.tR) > 0) {
          saida.vs3bet[`${modo}|${p}|vs${v}|${S}`] = { c: freqB64(x.hC3), r: freqB64(x.hR4), j: freqB64(x.hJ4), abre: freqB64(e.R) };
        }
      }
    }
    console.log(`${modo} ${S}BB: ${iter} iterações, gap ${(100 * gapMedio).toFixed(2)}% dos combos, ${((Date.now() - t1) / 1000).toFixed(1)}s`);
  }
}

if (soModo) {
  for (const [k, v] of Object.entries(saida.largura)) console.log(k.padEnd(18), 'abre', String(v.abre).padStart(5) + '%', '  all-in', v.allin + '%');
  process.exit(0);
}

writeFileSync(CASH ? 'scripts/.cache/open-ev-cash.json' : 'scripts/.cache/open-ev.json', JSON.stringify(saida));
if (CASH) {
  for (const [k, v] of Object.entries(saida.largura)) console.log(k.padEnd(18), 'abre', String(v.abre).padStart(5) + '%');
  process.exit(0);
}
console.log(`\npronto em ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('\n% de combos que abrem (raise + all-in), 8-max');
console.log('pos   ' + STACKS.map((s) => String(s).padStart(6)).join(''));
for (const p of MESAS['8max'].slice(0, -1)) {
  console.log(p.padEnd(6) + STACKS.map((s) => String(saida.largura[`8max|${p}|${s}`].abre).padStart(6)).join(''));
}
console.log('\nparte em all-in:');
for (const p of MESAS['8max'].slice(0, -1)) {
  console.log(p.padEnd(6) + STACKS.map((s) => String(saida.largura[`8max|${p}|${s}`].allin).padStart(6)).join(''));
}
