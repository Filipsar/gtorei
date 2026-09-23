import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PostflopActions } from '@/components/poker/PostflopActions';

/**
 * Regra: desistir só existe quando pagar custa alguma coisa.
 *
 * A barra mostrava Fold mesmo quando ninguém tinha apostado — jogar a mão fora
 * de graça, uma jogada que nunca é certa e que nenhuma sala oferece.
 */
describe('barra de ação do pós-flop', () => {
  it('sem aposta na frente, não oferece Fold', () => {
    render(<PostflopActions toCall={0} betAmount={3.3} heroStack={22.5} onAction={vi.fn()} />);

    expect(screen.queryByText('Fold')).not.toBeInTheDocument();
    expect(screen.getByText('Check')).toBeInTheDocument();
    expect(screen.getByText('Bet')).toBeInTheDocument();
    expect(screen.getByText('All-in')).toBeInTheDocument();
  });

  it('com aposta na frente, oferece Fold e mostra quanto custa pagar', () => {
    render(<PostflopActions toCall={4.5} betAmount={9} heroStack={22.5} onAction={vi.fn()} />);

    expect(screen.getByText('Fold')).toBeInTheDocument();
    expect(screen.getByText('Call')).toBeInTheDocument();
    expect(screen.getByText('4.5 BB')).toBeInTheDocument();
    expect(screen.queryByText('Check')).not.toBeInTheDocument();
  });

  it('mostra o valor da aposta e do all-in nos dois casos', () => {
    const { rerender } = render(
      <PostflopActions toCall={0} betAmount={3.3} heroStack={22.5} onAction={vi.fn()} />
    );
    expect(screen.getByText('3.3 BB')).toBeInTheDocument();
    expect(screen.getByText('22.5 BB')).toBeInTheDocument();

    rerender(<PostflopActions toCall={2} betAmount={6.6} heroStack={22.5} onAction={vi.fn()} />);
    expect(screen.getByText('6.6 BB')).toBeInTheDocument();
    expect(screen.getByText('22.5 BB')).toBeInTheDocument();
  });
});
