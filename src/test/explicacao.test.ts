import { describe, expect, it } from 'vitest';
import { calculateFeedback, getRange, type ActionType } from '@/data/gtoRanges';
import { explicarJogada, fatiaQueJoga } from '@/lib/explicacao';

// O Rei explica a mão com a mesma range que dá a nota no TrainPage
function explicar(mao: string, acao: ActionType, posicao: 'BTN' | 'UTG' | 'BB' = 'BTN', stack = 40, cenario: 'openRaise' | 'vsOpenRaise' = 'openRaise') {
  const range = getRange(cenario, posicao, stack, false, '8max', 0, 3);
  const handData = range.hands.find((h) => h.hand === mao)!;
  const fb = calculateFeedback(acao, handData, 3);
  return { e: explicarJogada({ mao, posicao, stack, cenario, suaAcao: acao, handData, range, tipo: fb.type, evPerdido: fb.evLoss }), handData, range };
}

describe('explicação do Rei', () => {
  it('acerto: diz que a jogada é a principal e a fatia da range', () => {
    const { e } = explicar('AA', 'raise');
    expect(e.acertou).toBe(true);
    expect(e.titulo).toMatch(/certa/);
    expect(e.texto).toMatch(/AA/);
    expect(e.texto).toMatch(/abre cerca de \d+% das mãos, e AA está dentro/);
  });

  it('erro: aponta a jogada certa da mesma range que deu a nota', () => {
    const { e, handData } = explicar('72o', 'raise', 'UTG');
    expect(e.acertou).toBe(false);
    expect(handData.primaryAction).toBe('fold');
    expect(e.texto).toMatch(/o certo é fold/);
    expect(e.texto).toMatch(/72o fica de fora/);
  });

  it('não fala em solver: o motor do GTORei não é um', () => {
    for (const [m, a] of [['AA', 'raise'], ['72o', 'raise'], ['K9s', 'fold']] as const) {
      expect(explicar(m, a).e.texto.toLowerCase()).not.toContain('solver');
    }
  });

  it('fatia da range: UTG abre menos que o botão', () => {
    const utg = fatiaQueJoga(getRange('openRaise', 'UTG', 40, false, '8max', 0, 3));
    const btn = fatiaQueJoga(getRange('openRaise', 'BTN', 40, false, '8max', 0, 3));
    expect(utg).toBeGreaterThan(0);
    expect(btn).toBeGreaterThan(utg);
    expect(btn).toBeLessThanOrEqual(100);
  });
});
