import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { RangeViewerModal } from '@/components/poker/RangeViewerModal';
import { DecisionFeedback } from '@/components/poker/DecisionFeedback';
import { getRange } from '@/data/gtoRanges';

/**
 * O gráfico de range precisa mostrar a mesma range que deu a nota da mão.
 *
 * Já não mostrava: a tela dizia "GTO: Fold", o jogador abria o gráfico e via
 * Call na mesma mão, e perdia pontos sem entender. O gráfico recalculava tudo
 * de novo e esquecia quatro coisas — o modo de jogo, o bounty, o stack efetivo
 * e a posição de quem tinha dado o all-in.
 */

const frequenciaDeCall = (
  range: ReturnType<typeof getRange>,
  mao: string
): number => range.hands.find((h) => h.hand === mao)?.actions.find((a) => a.action === 'call')?.frequency ?? 0;

describe('gráfico de range', () => {
  it('leva em conta quem deu o all-in', () => {
    // Pagar o all-in do UTG é bem diferente de pagar o all-in médio da mesa:
    // a range do UTG é a mais fechada de todas.
    const comVilao = getRange('vsOpenShove', 'LJ', 8, false, '8max', 0, 3, 'UTG');
    const semVilao = getRange('vsOpenShove', 'LJ', 8, false, '8max', 0, 3, undefined);

    const daNota = frequenciaDeCall(comVilao, 'KQs');
    const daMedia = frequenciaDeCall(semVilao, 'KQs');
    expect(daNota).not.toBe(daMedia);

    render(
      <RangeViewerModal
        open
        onClose={() => {}}
        scenario="vsOpenShove"
        position="LJ"
        stack={8}
        gameMode="8max"
        villainPosition="UTG"
        heroHand="KQs"
        heroAction="call"
      />
    );

    const bloco = screen.getByText('Sua Mão: KQs').closest('div')!.parentElement!;
    expect(within(bloco).getByText(`${daNota}%`)).toBeInTheDocument();
    expect(within(bloco).queryByText(`${daMedia}%`)).not.toBeInTheDocument();
  });

  it('usa a range recebida em vez de recalcular', () => {
    // Range inventada: se o componente recalcular, estes números somem
    const range = {
      scenario: 'vsOpenRaise' as const,
      position: 'BTN' as const,
      stack: 20,
      finalTable: false,
      hands: [
        {
          hand: 'KQs',
          actions: [
            { action: 'call' as const, frequency: 33, ev: 1 },
            { action: 'fold' as const, frequency: 67, ev: 0 },
          ],
          primaryAction: 'fold' as const,
          suited: true,
          pair: false,
        },
      ],
    };

    render(
      <RangeViewerModal
        open
        onClose={() => {}}
        scenario="vsOpenRaise"
        position="BTN"
        stack={20}
        heroHand="KQs"
        heroAction="call"
        range={range}
      />
    );

    const bloco = screen.getByText('Sua Mão: KQs').closest('div')!.parentElement!;
    expect(within(bloco).getByText('33%')).toBeInTheDocument();
    expect(within(bloco).getByText('67%')).toBeInTheDocument();
  });

  it('o "Ver Range" da tela de resultado abre a range que deu a nota', () => {
    const handData = {
      hand: 'KQs',
      actions: [
        { action: 'call' as const, frequency: 33, ev: 1 },
        { action: 'fold' as const, frequency: 67, ev: 0 },
      ],
      primaryAction: 'fold' as const,
      suited: true,
      pair: false,
    };

    render(
      <DecisionFeedback
        open
        onClose={() => {}}
        onNextHand={() => {}}
        userAction="call"
        handData={handData}
        feedback={{ type: 'mistake', points: -8, evLoss: 0.1, message: 'Erro.' }}
        sessionScore={0}
        handsPlayed={1}
        scenario="vsOpenRaise"
        position="BTN"
        stack={20}
        range={{ scenario: 'vsOpenRaise', position: 'BTN', stack: 20, finalTable: false, hands: [handData] }}
      />
    );

    fireEvent.click(screen.getByText('Ver Range'));

    const bloco = screen.getByText('Sua Mão: KQs').closest('div')!.parentElement!;
    expect(within(bloco).getByText('33%')).toBeInTheDocument();
  });
});
