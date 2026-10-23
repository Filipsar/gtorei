import { describe, expect, it } from 'vitest';
import { acertou, resumoLocal, type RespostaSimulado } from '@/lib/simulado';

const resposta = (feedback: RespostaSimulado['feedback']): RespostaSimulado => ({
  mao: 'AKs',
  cenario: 'openRaise',
  posicao: 'BTN',
  stack: 30,
  suaAcao: 'raise',
  acaoCerta: 'raise',
  feedback,
  evPerdido: 0,
});

describe('simulado: conta local de acertos', () => {
  it('"Best" e "Correta" contam como acerto; o resto, não', () => {
    expect(acertou(resposta('best'))).toBe(true);
    expect(acertou(resposta('correct'))).toBe(true);
    expect(acertou(resposta('inaccuracy'))).toBe(false);
    expect(acertou(resposta('blunder'))).toBe(false);
  });

  it('resume acertos, erros e precisão arredondada', () => {
    const r = resumoLocal([resposta('best'), resposta('correct'), resposta('blunder')]);
    expect(r).toEqual({ total: 3, acertos: 2, erros: 1, precisao: 67 });
  });

  it('simulado vazio não divide por zero', () => {
    expect(resumoLocal([])).toEqual({ total: 0, acertos: 0, erros: 0, precisao: 0 });
  });
});
