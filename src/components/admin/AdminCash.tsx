import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

// Onde os jogadores erram: Cash (beta), pela função admin_cash_erros, e treino de
// torneio, pela admin_treino_erros (migrations 20261031140000 e 20261108120000).
// Só números agregados: nenhum jogador aparece.

interface Linha {
  chave: string;
  maos: number;
  acerto?: number;
  ev_perdido?: number;
  certo?: string;
  mais_jogado?: string;
}
interface Resumo {
  maos: number;
  jogadores: number;
  acerto: number | null;
  por_cenario: Linha[];
  por_posicao: Linha[];
  por_vilao: Linha[];
  /** Só no treino de torneio (admin_treino_erros) */
  por_modo?: Linha[];
  por_stack?: Linha[];
  maos_mais_erradas: Linha[];
  trocas: Linha[];
}

const NOMES: Record<string, string> = {
  openRaise: 'Open raise',
  vsOpenRaise: 'Vs open raise',
  vsOpenShove: 'Vs all-in',
  vs3bet: 'Vs 3-bet',
  multiway: 'Multiway',
  '8max': 'Mesa de 8',
  threehand: '3-handed',
  hu: 'Heads-up',
  bounty: 'Bounty',
  outro: 'Sem modo gravado',
  allin: 'all-in',
};
const traduz = (s: string) =>
  s.replace(/\b(openRaise|vsOpenRaise|vsOpenShove|vs3bet|multiway|8max|threehand|hu|bounty|outro|allin)\b/g, (m) => NOMES[m] ?? m);

const PERIODOS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 90, rotulo: '90 dias' },
];

function Tabela({ titulo, linhas, extra }: { titulo: string; linhas: Linha[]; extra?: (l: Linha) => string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem mãos suficientes.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {linhas.map((l) => (
              <li key={l.chave} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate">{traduz(l.chave)}</span>
                  {extra && <span className="block text-xs text-muted-foreground">{extra(l)}</span>}
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {l.acerto !== undefined && (
                    <span className={cn('font-semibold', l.acerto < 60 ? 'text-feedback-blunder' : l.acerto < 80 ? 'text-feedback-inaccuracy' : 'text-feedback-best')}>
                      {l.acerto}%
                    </span>
                  )}
                  <span className="ml-2 text-xs text-muted-foreground">{l.maos} mãos</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const MODOS_DO_TREINO = [
  { valor: null, rotulo: 'Todos' },
  { valor: '8max', rotulo: 'Mesa de 8' },
  { valor: 'threehand', rotulo: '3-handed' },
  { valor: 'hu', rotulo: 'Heads-up' },
  { valor: 'bounty', rotulo: 'Bounty' },
] as const;

type Rpc = (f: string, a: object) => Promise<{ data: Resumo | null; error: { message: string } | null }>;

interface PainelProps {
  funcao: string;
  migration: string;
  titulo: string;
  descricao: string;
  /** Filtro por modo de jogo (só no treino de torneio) */
  comModos?: boolean;
}

function PainelDeErros({ funcao, migration, titulo, descricao, comModos }: PainelProps) {
  const [dias, setDias] = useState(30);
  const [modo, setModo] = useState<string | null>(null);
  const [dados, setDados] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setDados(null);
    setErro(null);
    const desde = new Date(Date.now() - dias * 86400000).toISOString();
    const args = comModos ? { _desde: desde, _modo: modo } : { _desde: desde };
    void (supabase.rpc as unknown as Rpc)(funcao, args).then(({ data, error }) => {
      if (cancelado) return;
      if (error) setErro(error.message.includes('function') ? `Aplique a migration ${migration}.` : error.message);
      else setDados(data);
    });
    return () => {
      cancelado = true;
    };
  }, [dias, modo, funcao, migration, comModos]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <Button key={p.dias} size="sm" variant={dias === p.dias ? 'default' : 'outline'} onClick={() => setDias(p.dias)}>
              {p.rotulo}
            </Button>
          ))}
        </div>
      </div>
      {comModos && (
        <div className="flex flex-wrap gap-2">
          {MODOS_DO_TREINO.map((m) => (
            <Button key={m.rotulo} size="sm" variant={modo === m.valor ? 'secondary' : 'ghost'} onClick={() => setModo(m.valor)}>
              {m.rotulo}
            </Button>
          ))}
        </div>
      )}

      {erro ? (
        <p className="text-sm text-destructive">{erro}</p>
      ) : !dados ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { rotulo: 'Mãos', valor: dados.maos.toLocaleString('pt-BR') },
              { rotulo: 'Jogadores', valor: dados.jogadores.toLocaleString('pt-BR') },
              { rotulo: 'Acerto', valor: dados.acerto === null ? '—' : `${dados.acerto}%` },
            ].map((c) => (
              <Card key={c.rotulo}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{c.rotulo}</p>
                  <p className="text-2xl font-bold tabular-nums">{c.valor}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tabela titulo="Por cenário (pior primeiro)" linhas={dados.por_cenario} extra={(l) => `EV perdido médio: ${l.ev_perdido ?? 0} BB`} />
            <Tabela titulo="Erros mais comuns" linhas={dados.trocas.map((l) => ({ ...l, chave: traduz(l.chave) }))} />
            {dados.por_stack && <Tabela titulo="Por stack (pior primeiro)" linhas={dados.por_stack} />}
            {dados.por_modo && !modo && <Tabela titulo="Por modo de jogo" linhas={dados.por_modo} />}
            <Tabela titulo="Por posição (pior primeiro)" linhas={dados.por_posicao} />
            <Tabela titulo="Por vilão (pior primeiro)" linhas={dados.por_vilao} />
          </div>
          <Tabela
            titulo="Mãos que mais erram (5 ou mais jogadas)"
            linhas={dados.maos_mais_erradas}
            extra={(l) => `Certo: ${traduz(l.certo ?? '')} · o que mais jogam: ${traduz(l.mais_jogado ?? '')}`}
          />
        </>
      )}
    </div>
  );
}

/** Cash (beta), pela função admin_cash_erros */
export function AdminCash() {
  return (
    <PainelDeErros
      funcao="admin_cash_erros"
      migration="20261031140000_cash_erros.sql"
      titulo="Cash (beta): onde os jogadores erram"
      descricao="Mãos do modo Cash. Acerto = melhor jogada ou jogada correta."
    />
  );
}

/** Treino de torneio (tudo menos Cash e Simulação), pela função admin_treino_erros */
export function AdminTreino() {
  return (
    <PainelDeErros
      funcao="admin_treino_erros"
      migration="20261108120000_admin_treino_erros.sql"
      titulo="Treino: onde os jogadores erram"
      descricao="Mãos do treino de torneio, sem Cash e sem Simulação. Acerto = melhor jogada ou jogada correta. Só números somados: nenhum jogador aparece."
      comModos
    />
  );
}
