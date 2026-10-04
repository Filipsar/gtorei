import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QUIZ, acaoNaPosicao } from '@/data/guiaIniciante';
import { PlayingCard } from './PlayingCard';

// Naipes só para desenhar as cartas; a resposta depende apenas da mão
function cartasDe(mao: string): [string, string] {
  const [a, b, tipo] = mao.split('');
  if (a === b) return [`${a}♠`, `${b}♥`];
  return tipo === 's' ? [`${a}♥`, `${b}♥`] : [`${a}♠`, `${b}♦`];
}

const NOME_POSICAO: Record<string, string> = {
  UTG: 'no UTG, o primeiro a falar',
  CO: 'no cutoff, uma antes do botão',
  BTN: 'no botão',
  SB: 'no small blind',
};

type Resposta = 'abrir' | 'fold';

export function QuickQuiz() {
  const [indice, setIndice] = useState(0);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [acertos, setAcertos] = useState(0);

  const terminou = indice >= QUIZ.length;

  if (terminou) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Resultado</p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">
          {acertos} de {QUIZ.length}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-body-sm text-muted-foreground">
          {acertos === QUIZ.length
            ? 'Todas certas. O treino do GTORei tem milhares de spots como esses, com stacks e situações diferentes.'
            : 'O treino do GTORei mostra a resposta e o motivo depois de cada mão, até a decisão ficar automática.'}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/treinar">Treinar grátis</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIndice(0);
              setResposta(null);
              setAcertos(0);
            }}
          >
            <RotateCcw className="mr-1 h-4 w-4" /> Refazer
          </Button>
        </div>
      </div>
    );
  }

  const q = QUIZ[indice];
  const certa: Resposta = acaoNaPosicao(q.posicao, q.mao) === 2 ? 'abrir' : 'fold';
  const acertou = resposta === certa;

  const responder = (r: Resposta) => {
    if (resposta) return;
    setResposta(r);
    if (r === certa) setAcertos((a) => a + 1);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Pergunta {indice + 1} de {QUIZ.length}
        </span>
        <span className="tabular-nums">
          {acertos} {acertos === 1 ? 'certa' : 'certas'}
        </span>
      </div>
      <div className="mb-4 flex gap-1" aria-hidden="true">
        {QUIZ.map((_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i < indice ? 'bg-primary' : i === indice ? 'bg-primary/50' : 'bg-muted')} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {cartasDe(q.mao).map((c) => (
            <PlayingCard key={c} carta={c} />
          ))}
        </div>
        <p className="text-center text-body-sm text-foreground sm:text-left">
          Torneio, 100 BB. Você está <strong>{NOME_POSICAO[q.posicao]}</strong> com <strong>{q.mao}</strong> e todos antes de você
          desistiram. Abre ou desiste?
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {(['abrir', 'fold'] as const).map((r) => (
          <Button
            key={r}
            variant={resposta === r ? 'default' : 'outline'}
            onClick={() => responder(r)}
            disabled={resposta !== null && resposta !== r}
            className="h-11"
          >
            {r === 'abrir' ? 'Abrir (raise)' : 'Fold'}
          </Button>
        ))}
      </div>

      {resposta && (
        <div
          className={cn(
            'mt-4 rounded-lg border p-4',
            acertou ? 'border-feedback-best/50 bg-feedback-best/10' : 'border-destructive/50 bg-destructive/10',
          )}
          role="status"
        >
          <p className="flex items-center gap-2 font-semibold text-foreground">
            {acertou ? (
              <CheckCircle2 className="h-5 w-5 text-feedback-best" aria-hidden="true" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
            )}
            {acertou ? 'Certo.' : `A resposta é ${certa === 'abrir' ? 'abrir' : 'fold'}.`}
          </p>
          <p className="mt-1.5 text-body-sm text-muted-foreground">{q.explicacao}</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => {
              setIndice((i) => i + 1);
              setResposta(null);
            }}
          >
            {indice === QUIZ.length - 1 ? 'Ver resultado' : 'Próxima'}
          </Button>
        </div>
      )}
    </div>
  );
}
