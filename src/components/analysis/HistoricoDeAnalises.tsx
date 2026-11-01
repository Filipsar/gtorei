import { useEffect, useState } from 'react';
import { History, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apagarAnalise, listarAnalises, type AnaliseDoHistorico } from '@/lib/historicoDeAnalises';

interface Props {
  /** Muda quando uma análise é gravada: a lista relê */
  versao: number;
  abertaId: string | null;
  onAbrir: (a: AnaliseDoHistorico) => void;
}

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export function HistoricoDeAnalises({ versao, abertaId, onAbrir }: Props) {
  const [lista, setLista] = useState<AnaliseDoHistorico[] | null | undefined>(undefined);

  useEffect(() => {
    let cancelado = false;
    void listarAnalises().then((l) => {
      if (!cancelado) setLista(l);
    });
    return () => {
      cancelado = true;
    };
  }, [versao]);

  const apagar = async (id: string) => {
    if (!window.confirm('Apagar esta análise do histórico?')) return;
    if (await apagarAnalise(id)) setLista((l) => l?.filter((a) => a.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading-xs">
          <History className="h-5 w-5 text-primary" />
          Histórico de Análises
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lista === undefined ? (
          <div className="flex justify-center py-6" role="status" aria-label="Carregando">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : lista === null ? (
          <p className="text-sm text-muted-foreground">O histórico de análises estará disponível em breve.</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            As suas análises ficam guardadas aqui (as 50 mais recentes), para rever o relatório e o plano de estudo
            quando quiser.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {lista.map((a) => {
              const ev = Number(a.ev_total ?? 0);
              return (
                <li key={a.id} className="flex items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => onAbrir(a)}
                    aria-current={abertaId === a.id ? 'true' : undefined}
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      abertaId === a.id && 'bg-primary/10',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.arquivo || 'Hand history'}</span>
                      <span className="block text-xs text-muted-foreground">
                        {dataCurta(a.criada_em)} · {a.maos_analisadas} de {a.maos_no_arquivo} mãos
                        {a.sala ? ` · ${a.sala}` : ''}
                      </span>
                    </span>
                    <span className={cn('shrink-0 text-xs font-semibold', ev >= 0 ? 'text-feedback-best' : 'text-feedback-blunder')}>
                      {ev >= 0 ? '+' : ''}
                      {ev.toFixed(2)} bb
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => void apagar(a.id)}
                    aria-label={`Apagar a análise de ${a.arquivo || 'hand history'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
