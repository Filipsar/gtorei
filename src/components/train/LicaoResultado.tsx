import { useEffect } from 'react';
import { Check, ChevronRight, RotateCcw, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Licao } from '@/data/trilha';
import { ACERTOS_PARA_PASSAR, MAOS_POR_LICAO, type Estrelas } from '@/lib/trilha';
import type { RespostaSimulado } from '@/lib/simulado';
import { acertou } from '@/lib/simulado';
import { tocar } from '@/lib/sons';
import { cn } from '@/lib/utils';

const ACAO: Record<string, string> = { fold: 'Fold', call: 'Call', raise: 'Raise', allin: 'All-in', check: 'Check' };

interface Props {
  licao: Licao;
  respostas: RespostaSimulado[];
  estrelas: Estrelas;
  /** Primeira vez que passou: libera a próxima */
  liberou: Licao | null;
  xp: number;
  onContinuar: () => void;
  onRepetir: () => void;
}

/** Fim de uma lição da trilha: estrelas, acertos e onde errou */
export function LicaoResultado({ licao, respostas, estrelas, liberou, xp, onContinuar, onRepetir }: Props) {
  const acertos = respostas.filter(acertou).length;
  const passou = estrelas > 0;
  const erros = respostas.filter((r) => !acertou(r));
  // Mesa final passada fecha o nível: o Rei com o baú aberto. Três estrelas: troféu
  const fechouNivel = passou && !!licao.mesaFinal;
  const rei = !passou ? 'errou' : fechouNivel ? 'bau' : estrelas === 3 ? 'trofeu' : 'acertou';

  // O som das estrelas sai junto com a primeira que entra (atraso de 530 ms)
  useEffect(() => {
    if (!passou) return;
    const t = setTimeout(() => tocar('estrelas'), 530);
    return () => clearTimeout(t);
  }, [passou]);

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-4 pb-6 pt-8">
      <div className="flex-1">
        <img
          src={`/mascote/rei-${rei}.webp`}
          alt=""
          aria-hidden="true"
          width={400}
          height={420}
          className={cn('mx-auto w-auto', fechouNivel ? 'h-44' : 'h-36')}
        />
        <h1 className="mt-4 text-center text-2xl font-bold">{fechouNivel ? 'Nível concluído!' : passou ? 'Lição concluída!' : 'Quase lá'}</h1>
        <p className="mt-1 text-center text-muted-foreground">
          {passou
            ? licao.titulo
            : `Faltaram ${ACERTOS_PARA_PASSAR - acertos} acerto${ACERTOS_PARA_PASSAR - acertos > 1 ? 's' : ''} para passar.`}
        </p>

        {/* As estrelas ganhas estouram uma depois da outra; com "reduzir
            movimento" ligado elas só aparecem */}
        <div className="mt-5 flex items-end justify-center gap-3" role="img" aria-label={`${estrelas} de 3 estrelas`}>
          {[1, 2, 3].map((i) => {
            const ganha = i <= estrelas;
            return (
              <span key={i} className={cn('relative', i === 2 && '-translate-y-2')}>
                {ganha && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full bg-primary/40 blur-xl motion-safe:animate-estrela-entra"
                    style={{ animationDelay: `${250 + i * 280}ms` }}
                  />
                )}
                <Star
                  aria-hidden="true"
                  className={cn(
                    'relative',
                    i === 2 ? 'h-14 w-14' : 'h-11 w-11',
                    ganha ? 'fill-current text-primary motion-safe:animate-estrela-entra' : 'text-muted-foreground/40'
                  )}
                  style={ganha ? { animationDelay: `${250 + i * 280}ms` } : undefined}
                />
              </span>
            );
          })}
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Acertos</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {acertos}/{MAOS_POR_LICAO}
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">XP</dt>
            <dd className="mt-1 flex items-center justify-center gap-2 text-2xl font-bold tabular-nums text-primary">
              <img src="/trilha/pilha-alta.webp" alt="" aria-hidden="true" width={276} height={320} className="h-8 w-auto" />
              +{Math.max(0, xp)}
            </dd>
          </div>
        </dl>

        {liberou && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
            <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            Liberou: <strong>{liberou.titulo}</strong>
          </p>
        )}

        {erros.length > 0 && (
          <section className="mt-6" aria-labelledby="onde-errou">
            <h2 id="onde-errou" className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Onde errou
            </h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {erros.map((r, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <X className="h-4 w-4 shrink-0 text-red-400 [.light_&]:text-red-700" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <strong className="font-mono">{r.mao}</strong> · {r.posicao} · {Math.round(r.stack)} BB
                  </span>
                  <span className="text-right text-muted-foreground">
                    {ACAO[r.suaAcao] ?? r.suaAcao} → <strong className="text-foreground">{ACAO[r.acaoCerta] ?? r.acaoCerta}</strong>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-8 space-y-2">
        <Button className="h-12 w-full text-base font-bold" onClick={passou ? onContinuar : onRepetir}>
          {passou ? (
            <>
              Continuar <ChevronRight className="ml-1 h-5 w-5" aria-hidden="true" />
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-5 w-5" aria-hidden="true" /> Tentar de novo
            </>
          )}
        </Button>
        <Button variant="ghost" className="h-12 w-full" onClick={passou ? onRepetir : onContinuar}>
          {passou ? 'Jogar de novo' : 'Voltar à trilha'}
        </Button>
      </div>
    </div>
  );
}
