import { Gauge } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { DESCE_COM, JANELA, NIVEIS, SOBE_COM, type NivelDificuldade, type Preferencia } from '@/lib/dificuldade';

interface Props {
  preferencia: Preferencia;
  nivel: NivelDificuldade;
  acertosNaJanela: number;
  maosNaJanela: number;
  onMudar: (p: Preferencia) => void;
}

const xp = (m: number) => `XP ×${m.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}`;

/**
 * Mostra a dificuldade em vigor e deixa escolher. Fica visível no treino o
 * tempo todo: a pessoa sempre sabe que tipo de mão está vindo e por quê.
 */
export function DificuldadeControle({ preferencia, nivel, acertosNaJanela, maosNaJanela, onMudar }: Props) {
  const auto = preferencia === 'auto';
  const opcoes: { valor: Preferencia; titulo: string; detalhe: string }[] = [
    {
      valor: 'auto',
      titulo: 'Automática',
      detalhe: `Sobe com ${Math.round(SOBE_COM * 100)}% de acerto ou mais nas últimas ${JANELA} mãos; desce com ${Math.round(DESCE_COM * 100)}% ou menos.`,
    },
    ...NIVEIS.map((n) => ({ valor: n.id as Preferencia, titulo: `${n.nome} · ${xp(n.multiplicadorXp)}`, detalhe: n.descricao })),
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Dificuldade ${nivel.nome}${auto ? ', automática' : ''}, ${xp(nivel.multiplicadorXp)}. Abrir opções`}
        >
          <Gauge className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span className="font-medium">{nivel.nome}</span>
          {auto && <span className="text-muted-foreground">auto</span>}
          <span className="text-muted-foreground">· {xp(nivel.multiplicadorXp)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" align="start">
        <p className="font-semibold">Dificuldade do treino</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Muda só quais mãos aparecem: quanto mais difícil, mais mãos da borda da range, onde a decisão é apertada. A
          resposta certa de cada mão é a mesma em qualquer dificuldade. O XP ganho acompanha a dificuldade.
        </p>
        {auto && (
          <p className="mt-2 text-xs">
            Agora: <strong>{nivel.nome}</strong>. Nesta rodada, {acertosNaJanela} acertos em {maosNaJanela} de {JANELA} mãos.
          </p>
        )}
        <div role="radiogroup" aria-label="Escolher dificuldade" className="mt-3 space-y-1.5">
          {opcoes.map((o) => {
            const marcado = preferencia === o.valor;
            return (
              <button
                key={o.valor}
                type="button"
                role="radio"
                aria-checked={marcado}
                onClick={() => onMudar(o.valor)}
                className={cn(
                  'w-full rounded-md border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  marcado ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent',
                )}
              >
                <span className="block text-sm font-medium">{o.titulo}</span>
                <span className="block text-xs text-muted-foreground">{o.detalhe}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
