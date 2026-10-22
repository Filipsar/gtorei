import type { KeyboardEvent } from 'react';

/**
 * Props para um elemento que não é <button> nem <a> mas responde a clique:
 * entra no Tab, é anunciado como botão e abre com Enter ou Espaço, como um
 * botão de verdade. Preferir <button>/<Link> quando der; isto é para cartões
 * e células que já têm layout próprio.
 */
export function clicavel(acao: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: acao,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        acao();
      }
    },
  };
}
