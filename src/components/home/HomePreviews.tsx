// Prévias visuais da landing page. São representações do produto real, não mockups
// genéricos: a matriz abaixo é a range que o próprio solver do GTORei calculou.

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

// Range de all-in do BTN com 10bb em 8-max (32,0% das combos), gerada por
// scripts/build-pushfold.mjs. Uma letra por célula, linha a linha:
// 2 = all-in, 1 = misto, 0 = fold.
const BTN_10BB =
  '2222222222222222222111111022222211111002212221100000221122211000021011221110002000012211000200000021100020000000211002000000002100100000000020010000000000201000000000002';

function nomeDaMao(linha: number, coluna: number) {
  const alto = RANKS[Math.min(linha, coluna)];
  const baixo = RANKS[Math.max(linha, coluna)];
  if (linha === coluna) return alto + alto;
  return alto + baixo + (coluna > linha ? 's' : 'o');
}

const ESTILO_CELULA: Record<string, string> = {
  '2': 'bg-primary text-black/80',
  '1': 'bg-primary/35 text-foreground/80',
  '0': 'bg-muted/50 text-muted-foreground/60',
};

export function RangePreview() {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 sm:p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <span className="rounded bg-primary/15 px-2 py-0.5 font-semibold text-primary">BTN</span>
          <span className="text-muted-foreground">10bb · 8-max · all-in ou fold</span>
        </div>
        <span className="text-xs sm:text-sm font-bold tabular-nums text-primary">32,0%</span>
      </div>

      <div
        className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[2px]"
        role="img"
        aria-label="Matriz 13 por 13 com a range de all-in do botão com 10 big blinds: 32% das combinações"
      >
        {Array.from({ length: 169 }).map((_, i) => {
          const linha = Math.floor(i / 13);
          const coluna = i % 13;
          const acao = BTN_10BB[i];
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-[2px] text-[6px] font-semibold leading-none sm:text-[8px] ${ESTILO_CELULA[acao]}`}
            >
              {nomeDaMao(linha, coluna)}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-primary" /> All-in
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-primary/35" /> Misto
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-muted/50" /> Fold
        </span>
        <span className="ml-auto">calculado por EV, não copiado de tabela</span>
      </div>
    </div>
  );
}

export function VerdictPreview() {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-5 sm:p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Mão 24 de 312</span>
        <span>BTN · 12bb</span>
      </div>

      <div className="mb-5 flex items-center gap-2">
        <span className="rounded-lg border border-border bg-background px-3 py-2 text-xl font-bold">
          A<span className="text-destructive">♦</span>
        </span>
        <span className="rounded-lg border border-border bg-background px-3 py-2 text-xl font-bold">
          J<span className="text-muted-foreground">♣</span>
        </span>
      </div>

      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Sua ação</dt>
          <dd className="font-semibold">Call</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">Linha GTO</dt>
          <dd className="font-semibold text-primary">All-in</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <dt className="text-muted-foreground">EV perdido</dt>
          <dd className="font-bold tabular-nums text-destructive">−0,42 bb</dd>
        </div>
      </dl>

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Exemplo do veredicto que a análise devolve para cada mão do seu hand history.
      </p>
    </div>
  );
}
