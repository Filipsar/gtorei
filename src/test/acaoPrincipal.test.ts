import { describe, it, expect } from 'vitest';
import { getRange, STACK_SIZES, type GameMode, type Position, type Scenario, type HandData } from '@/data/gtoRanges';

/**
 * A ação principal (cor da matriz, "ação correta" do treino, nota) segue uma
 * regra só: fold é a principal se passar de 50%, ou se empatar/vencer a ação
 * de jogo mais frequente e essa não tiver EV positivo.
 *
 * Antes eram três regras de desempate, e a interpolação entre stacks dependia
 * da ordem do array. Em stacks fora da tabela — que aparecem no treino porque
 * o stack efetivo é o menor dos dois — o K7s do HU BB 11bb no vs3bet tinha
 * fold 44, call 37, all-in 19 e saía fold, enquanto K6s, mais fraca, saía call.
 */

const POSICOES: Record<GameMode, Position[]> = {
  '8max': ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  hu: ['SB', 'BB'],
  threehand: ['BTN', 'SB', 'BB'],
  bounty: ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
};
const CENARIOS: Scenario[] = ['openRaise', 'vsOpenRaise', 'vs3bet', 'vsOpenShove', 'simulation', 'multiway'];
// Tabela mais stacks interpolados
const STACKS = [...STACK_SIZES, 11, 13, 15, 16, 18, 19, 22, 27, 45, 70];

const freq = (h: HandData, acao: string) => h.actions.find((a) => a.action === acao)?.frequency ?? 0;

function* ranges() {
  for (const cenario of CENARIOS) {
    for (const modo of Object.keys(POSICOES) as GameMode[]) {
      for (const posicao of POSICOES[modo]) {
        for (const stack of STACKS) {
          for (const mesaFinal of [false, true]) {
            for (const bounty of modo === 'bounty' ? [0, 2] : [0]) {
              const rotulo = `${cenario} ${modo} ${posicao} ${stack}bb${mesaFinal ? ' mesa final' : ''}${bounty ? ` bounty ${bounty}x` : ''}`;
              yield { rotulo, range: getRange(cenario, posicao, stack, mesaFinal, modo, bounty) };
            }
          }
        }
      }
    }
  }
}

describe('ação principal', () => {
  it('vs3bet HU BB 11bb: K7s, T9s e K9o continuam, como K6s (o caso relatado)', () => {
    const range = getRange('vs3bet', 'BB', 11, false, 'hu', 0);
    for (const mao of ['K7s', 'T9s', 'K9o', 'K6s']) {
      expect(range.hands.find((h) => h.hand === mao)!.primaryAction, mao).toBe('call');
    }
  });

  it('onde a fold cresce ao descer na escala, nenhuma mão foldada fica acima de uma que continua', () => {
    // Ranges calculadas por EV não seguem a ordem de equity e ficam de fora
    // sozinhas: nelas a fold não é monótona.
    const quebradas: string[] = [];
    for (const { rotulo, range } of ranges()) {
      const h = range.hands;
      if (h.some((x, i) => i > 0 && freq(x, 'fold') < freq(h[i - 1], 'fold'))) continue;
      const ultimaQueContinua = h.map((x) => x.primaryAction !== 'fold').lastIndexOf(true);
      const buracos = h.slice(0, Math.max(0, ultimaQueContinua)).filter((x) => x.primaryAction === 'fold');
      if (buracos.length) quebradas.push(`${rotulo}: ${buracos.map((x) => x.hand).join(', ')} foldam acima de ${h[ultimaQueContinua].hand}`);
    }
    expect(quebradas).toEqual([]);
  });

  it('mão com fold até 50% e jogo de EV positivo nunca sai fold, na tabela ou interpolada', () => {
    // Pega o empate 50/50, que antes virava fold no heurístico e jogo no
    // push/fold, e a mistura de três ações da interpolação.
    const quebradas: string[] = [];
    for (const { rotulo, range } of ranges()) {
      for (const h of range.hands) {
        if (h.primaryAction !== 'fold' || freq(h, 'fold') > 50) continue;
        const jogos = h.actions.filter((a) => a.action !== 'fold' && a.frequency > 0);
        const maisFrequente = Math.max(...jogos.map((a) => a.frequency));
        const evDoMaisFrequente = Math.max(...jogos.filter((a) => a.frequency === maisFrequente).map((a) => a.ev ?? 0));
        if (freq(h, 'fold') < maisFrequente || evDoMaisFrequente > 0) {
          quebradas.push(`${rotulo} ${h.hand}: ${h.actions.map((a) => `${a.action} ${a.frequency}`).join(', ')}`);
          if (quebradas.length >= 20) break;
        }
      }
      if (quebradas.length >= 20) break;
    }
    expect(quebradas).toEqual([]);
  });
});
