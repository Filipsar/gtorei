import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Bloco da configuração do treino: título, ajuda curta e o conteúdo */
export function Secao({ titulo, ajuda, acao, children }: { titulo: string; ajuda?: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</h2>
          {ajuda && <p className="mt-0.5 text-xs text-muted-foreground">{ajuda}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

/** Botão de seleção arredondado. aria-pressed diz ao leitor de tela se está marcado. */
export function Chip({
  ativo,
  onClick,
  desabilitado,
  travado,
  children,
  className,
  titulo,
}: {
  ativo: boolean;
  onClick: () => void;
  desabilitado?: boolean;
  travado?: boolean;
  children: ReactNode;
  className?: string;
  titulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado && !travado}
      aria-pressed={ativo}
      title={titulo}
      className={cn(
        'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ativo
          ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_14px_-4px_hsl(var(--primary)/0.7)]'
          : 'border-border bg-background/40 text-foreground hover:border-primary/50 hover:bg-primary/5',
        desabilitado && !travado && 'cursor-not-allowed opacity-40 hover:border-border hover:bg-background/40',
        travado && 'border-primary/30 text-muted-foreground',
        className,
      )}
    >
      {travado && <Lock className="h-3 w-3 text-primary" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Opção grande, para escolhas de peso (formato do treino) */
export function OpcaoGrande({
  ativo,
  onClick,
  icone,
  titulo,
  descricao,
  selo,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: ReactNode;
  titulo: string;
  descricao: string;
  selo?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        ativo ? 'border-primary bg-primary/10' : 'border-border bg-background/40 hover:border-primary/40',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={ativo}
        onClick={onClick}
        className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      >
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            ativo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {icone}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 font-semibold">
            {titulo}
            {selo && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                {selo}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{descricao}</span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 h-4 w-4 shrink-0 rounded-full border-2',
            ativo ? 'border-primary bg-primary shadow-[inset_0_0_0_2px_hsl(var(--background))]' : 'border-muted-foreground/50',
          )}
        />
      </button>
      {ativo && children && <div className="mt-3 pl-[3.25rem]">{children}</div>}
    </div>
  );
}
