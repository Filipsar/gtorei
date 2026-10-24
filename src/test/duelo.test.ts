import { describe, expect, it } from 'vitest';
import {
  avaliarDecisao,
  comSinal,
  lerCartas,
  nomeDaMao,
  nomeDaJogada,
  posicaoDe,
  rotuloDaAcao,
  spotDaDecisao,
  type EstadoDaMao,
} from '@/lib/duelo';

const mao = (parcial: Partial<EstadoDaMao>): EstadoDaMao => ({
  stack: 20,
  sb: 'a',
  aposta_a: 0.5,
  aposta_b: 1,
  vez: 'a',
  prazo: null,
  aumentos: 0,
  acoes: [],
  ...parcial,
});

describe('duelo: cartas e posições', () => {
  it('lê as cartas do servidor e dá o nome da mão como nas ranges', () => {
    expect(lerCartas('AsKd')).toEqual([
      { rank: 'A', suit: 's' },
      { rank: 'K', suit: 'd' },
    ]);
    expect(lerCartas(null)).toEqual([]);
    expect(nomeDaMao(lerCartas('KdAd'))).toBe('AKs');
    expect(nomeDaMao(lerCartas('9hTc'))).toBe('T9o');
    expect(nomeDaMao(lerCartas('QsQh'))).toBe('QQ');
  });

  it('quem é o small blind é o SB; o outro é o BB', () => {
    expect(posicaoDe('a', 'a')).toBe('SB');
    expect(posicaoDe('b', 'a')).toBe('BB');
  });
});

describe('duelo: qual decisão tem nota GTO', () => {
  it('SB na primeira jogada: abertura do heads-up', () => {
    expect(spotDaDecisao(mao({}), 'a')).toEqual({ cenario: 'openRaise', posicao: 'SB', vilao: 'BB', stack: 20 });
  });

  it('BB contra o raise do SB e contra o all-in dele', () => {
    const vsRaise = mao({ vez: 'b', aumentos: 1, aposta_a: 2.5, acoes: [{ quem: 'a', acao: 'raise', para: 2.5 }] });
    expect(spotDaDecisao(vsRaise, 'b')?.cenario).toBe('vsOpenRaise');
    const vsShove = mao({ vez: 'b', aumentos: 1, aposta_a: 20, acoes: [{ quem: 'a', acao: 'allin', para: 20 }] });
    expect(spotDaDecisao(vsShove, 'b')?.cenario).toBe('vsOpenShove');
  });

  it('depois da 3-bet a decisão fica sem nota (o treino não tem essa range no HU)', () => {
    const vs3bet = mao({
      vez: 'a',
      aumentos: 2,
      aposta_a: 2.5,
      aposta_b: 7.5,
      acoes: [
        { quem: 'a', acao: 'raise', para: 2.5 },
        { quem: 'b', acao: 'raise', para: 7.5 },
      ],
    });
    expect(spotDaDecisao(vs3bet, 'a')).toBeNull();
  });

  it('AA abrindo do SB acerta; 72o pagando all-in de 20 BB erra', () => {
    const aa = avaliarDecisao({ cenario: 'openRaise', posicao: 'SB', vilao: 'BB', stack: 20 }, lerCartas('AsAh'), 'fold', 1);
    expect(aa?.acertou).toBe(false);
    expect(aa?.acaoCerta).not.toBe('fold');
    const lixo = avaliarDecisao({ cenario: 'vsOpenShove', posicao: 'BB', vilao: 'SB', stack: 20 }, lerCartas('7d2c'), 'call', 1);
    expect(lixo?.acertou).toBe(false);
    expect(lixo?.acaoCerta).toBe('fold');
    // Pontos dentro do que o servidor aceita
    expect(lixo!.pontos).toBeGreaterThanOrEqual(-300);
    expect(lixo!.pontos).toBeLessThanOrEqual(30);
  });
});

describe('duelo: textos da mesa', () => {
  it('botões dizem quanto cada jogada põe na mesa', () => {
    expect(rotuloDaAcao('raise', mao({}), 'a')).toEqual({ rotulo: 'Raise', detalhe: 'para 2,5 BB' });
    expect(rotuloDaAcao('allin', mao({}), 'a')).toEqual({ rotulo: 'All-in', detalhe: '20 BB' });
    const vsRaise = mao({ vez: 'b', aumentos: 1, aposta_a: 2.5 });
    expect(rotuloDaAcao('raise', vsRaise, 'b')).toEqual({ rotulo: '3-bet', detalhe: 'para 7,5 BB' });
    expect(rotuloDaAcao('call', vsRaise, 'b')).toEqual({ rotulo: 'Call', detalhe: '1,5 BB' });
  });

  it('a segunda subida aparece como 3-bet', () => {
    expect(nomeDaJogada({ quem: 'a', acao: 'raise', para: 2.5 }, 0)).toBe('Raise');
    expect(nomeDaJogada({ quem: 'b', acao: 'raise', para: 7.5 }, 1)).toBe('3-bet');
  });

  it('saldo com sinal', () => {
    expect(comSinal(7.5)).toBe('+7,5');
    expect(comSinal(-2)).toBe('-2');
    expect(comSinal(0)).toBe('0');
  });
});
