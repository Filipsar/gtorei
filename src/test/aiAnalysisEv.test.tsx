import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AnaliseDoHistorico } from '@/lib/historicoDeAnalises';

// Relatório como o da GGPoker de 02/11/2026: a IA deu EV positivo a jogada
// certa e deixou mãos de abertura sem veredito
const salva: AnaliseDoHistorico = {
  id: 'a1',
  criada_em: '2026-11-02T00:48:42Z',
  arquivo: 'torneio.txt',
  sala: 'GGPoker',
  maos_no_arquivo: 4,
  maos_analisadas: 4,
  ev_total: 27.4,
  resultado: {
    analise: {
      hands: [
        { handId: 'h1', verdict: 'best', summary: '', gtoPlay: '', evDelta: 11.4 },
        { handId: 'h2', verdict: 'mistake', summary: '', gtoPlay: '', evDelta: -8.5 },
        { handId: 'h3', verdict: 'inaccuracy', summary: '', gtoPlay: '', evDelta: -1.5 },
      ],
      overall: { leaks: [], recommendations: [], evTotal: 27.4 },
    },
    maos: ['h1', 'h2', 'h3', 'h4'].map((handId) => ({
      handId,
      cartas: ['As', 'Kd'],
      spots: ['openRaise' as const],
      posicao: 'BTN',
      stackBb: 30,
      modo: 'rangeTraining' as const,
    })),
    removidos: 0,
  },
};

// O gráfico (recharts) pede ResizeObserver, que o jsdom não tem
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= () => {};

vi.mock('@/lib/historicoDeAnalises', async (original) => ({
  ...(await original<typeof import('@/lib/historicoDeAnalises')>()),
  listarAnalises: async () => [salva],
}));

describe('relatório da análise com IA', () => {
  it('mostra o EV perdido mão a mão, não o total da IA', async () => {
    const { AIAnalysis } = await import('@/components/analysis/AIAnalysis');
    render(
      <MemoryRouter>
        <AIAnalysis />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByText('torneio.txt'));

    expect(await screen.findByText('EV Perdido')).toBeInTheDocument();
    expect(screen.getAllByText('-10.00 bb').length).toBeGreaterThan(0);
    expect(screen.queryByText(/27\.40/)).toBeNull();
    expect(screen.getByText(/1 mão ficou sem comentário da IA/)).toBeInTheDocument();
    expect(screen.getByText('0.00 bb')).toBeInTheDocument();
    // Renderiza a página inteira: com a suíte rodando em paralelo passa de 5 s
  }, 20000);
});
