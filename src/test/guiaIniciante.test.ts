// O Guia do Iniciante mostra a abertura de cada posição com 100 BB sem
// carregar o motor de ranges (que pesa ~440 KB e deixaria a página lenta para
// quem chega pelo Google). Os dados ficam fixos em src/data/guiaIniciante.ts e
// este teste garante que continuam iguais ao motor.
//
// Se as ranges forem recalculadas e o teste quebrar, regere com:
//   GERAR_GUIA=1 npx vitest run src/test/guiaIniciante.test.ts
// e cole a saída em src/data/guiaIniciante.ts.
import { describe, it, expect } from 'vitest';
import { getRange } from '@/data/gtoRanges';
import type { Position } from '@/data/ranges/types';
import { ABERTURA_100BB, POSICOES_GUIA, QUIZ, RANKS, acaoNaPosicao, nomeDaMao, combosDaMao } from '@/data/guiaIniciante';

function calcular(posicao: Position) {
  const r = getRange('openRaise', posicao, 100, false, '8max', 0);
  const freq = new Map(
    r.hands.map((h) => [
      h.hand,
      h.actions.filter((a) => a.action === 'raise' || a.action === 'allin').reduce((t, a) => t + a.frequency, 0),
    ]),
  );
  let matriz = '';
  let abre = 0;
  for (let l = 0; l < 13; l++) {
    for (let c = 0; c < 13; c++) {
      const mao = nomeDaMao(l, c);
      const f = freq.get(mao) ?? 0;
      matriz += f >= 95 ? '2' : f > 0 ? '1' : '0';
      abre += (combosDaMao(mao) * f) / 100;
    }
  }
  return { pct: Math.round((1000 * abre) / 1326) / 10, matriz };
}

describe('Guia do Iniciante: abertura com 100 BB', () => {
  it('bate com o motor de ranges', () => {
    const atual = Object.fromEntries(POSICOES_GUIA.map((p) => [p, calcular(p)]));
    if (process.env.GERAR_GUIA) {
      console.log(JSON.stringify(atual, null, 2));
      return;
    }
    for (const p of POSICOES_GUIA) {
      expect(ABERTURA_100BB[p], p).toEqual(atual[p]);
    }
  });

  it('a matriz tem 169 casas e os nomes das mãos seguem a convenção do motor', () => {
    expect(RANKS).toHaveLength(13);
    expect(nomeDaMao(0, 0)).toBe('AA');
    expect(nomeDaMao(0, 1)).toBe('AKs');
    expect(nomeDaMao(1, 0)).toBe('AKo');
    expect(nomeDaMao(12, 11)).toBe('32o');
    for (const p of POSICOES_GUIA) expect(ABERTURA_100BB[p].matriz).toHaveLength(169);
  });

  it('as respostas do quiz não ficam em mão mista', () => {
    // Pergunta de sim/não com resposta "às vezes" confunde o iniciante
    for (const q of QUIZ) expect(acaoNaPosicao(q.posicao, q.mao), `${q.posicao} ${q.mao}`).not.toBe(1);
  });

  it('o quiz responde o que o texto explica', () => {
    const esperado: Record<string, 0 | 2> = { 'UTG AQo': 2, 'UTG K7o': 0, 'BTN A4s': 2, 'CO 72o': 0, 'SB K9o': 2 };
    for (const q of QUIZ) expect(acaoNaPosicao(q.posicao, q.mao), `${q.posicao} ${q.mao}`).toBe(esperado[`${q.posicao} ${q.mao}`]);
  });
});
