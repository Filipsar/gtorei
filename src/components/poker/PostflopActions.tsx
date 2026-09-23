import { ActionButton } from './ActionButton';

export type AcaoPostflop = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';

interface PostflopActionsProps {
  /** Quanto custa pagar. Zero significa que ninguém apostou e passar é de graça. */
  toCall: number;
  /** Quanto sai se apostar ou aumentar, já limitado pelo menor stack da mesa */
  betAmount: number;
  heroStack: number;
  onAction: (acao: AcaoPostflop) => void;
}

/**
 * Barra de ação do pós-flop.
 *
 * A regra que manda aqui é qual ação existe de verdade na mesa:
 *
 * - com aposta na frente, pagar custa dinheiro, então desistir é uma escolha
 *   real e o Fold aparece;
 * - sem aposta na frente, passar é de graça. Desistir seria jogar a mão fora
 *   sem precisar, e nenhuma sala oferece esse botão. Ele não é desenhado.
 *
 * O botão estava sendo desenhado nos dois casos, com o argumento de manter o
 * Fold sempre na primeira casa para a mão não errar o alvo. Só que oferecer uma
 * jogada que nunca é certa custa mais caro do que a posição fixa.
 */
export function PostflopActions({ toCall, betAmount, heroStack, onAction }: PostflopActionsProps) {
  const enfrentandoAposta = toCall > 0;
  const valorDaAposta = `${betAmount.toFixed(1)} BB`;
  const valorDoAllIn = heroStack > 0 ? `${heroStack.toFixed(1)} BB` : undefined;

  if (enfrentandoAposta) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <ActionButton variante="fold" rotulo="Fold" tecla="f" onClick={() => onAction('fold')} />
        <ActionButton
          variante="passiva"
          rotulo="Call"
          detalhe={`${toCall.toFixed(1)} BB`}
          tecla="c"
          onClick={() => onAction('call')}
        />
        <ActionButton
          variante="agressiva"
          rotulo="Raise"
          detalhe={valorDaAposta}
          tecla="r"
          onClick={() => onAction('raise')}
        />
        <ActionButton
          variante="allin"
          rotulo="All-in"
          detalhe={valorDoAllIn}
          tecla="a"
          onClick={() => onAction('allin')}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <ActionButton variante="passiva" rotulo="Check" tecla="c" onClick={() => onAction('check')} />
      <ActionButton
        variante="agressiva"
        rotulo="Bet"
        detalhe={valorDaAposta}
        tecla="b"
        onClick={() => onAction('bet')}
      />
      <ActionButton
        variante="allin"
        rotulo="All-in"
        detalhe={valorDoAllIn}
        tecla="a"
        onClick={() => onAction('allin')}
      />
    </div>
  );
}
