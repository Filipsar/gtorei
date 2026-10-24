import { describe, expect, it } from 'vitest';
import { CHANCE_DE_MESA_FINAL, acertou, resumoLocal, sortearMesaFinal, type RespostaSimulado } from '@/lib/simulado';

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

describe('mesa final no simulado', () => {
  it('sai no sorteio: abaixo da chance é mesa final, acima não', () => {
    expect(sortearMesaFinal(false, () => CHANCE_DE_MESA_FINAL - 0.01)).toBe(true);
    expect(sortearMesaFinal(false, () => CHANCE_DE_MESA_FINAL)).toBe(false);
  });

  it('no Bounty é sempre ICM, como no resto do treino', () => {
    expect(sortearMesaFinal(true, () => 0.99)).toBe(true);
  });
});
