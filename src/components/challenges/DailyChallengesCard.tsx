import { Link } from 'react-router-dom';
import { CalendarCheck, Check, Flame, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useDailyChallenges, type Desafio } from '@/hooks/useDailyChallenges';

interface Props {
  /** Compacto: uma linha por desafio, para o topo do treino */
  compacto?: boolean;
}

export function DailyChallengesCard({ compacto = false }: Props) {
  const { dados, indisponivel, resgatando, resgatar } = useDailyChallenges();

  if (indisponivel) return null;
  if (!dados) {
    return compacto ? null : (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const feitos = dados.desafios.filter((d) => d.resgatado).length;

  return (
    <Card className="border-primary/25">
      <CardContent className={cn(compacto ? 'p-4' : 'p-5 sm:p-6')}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Desafios de hoje</h2>
            <span className="text-body-xs text-muted-foreground tabular-nums">{feitos}/3</span>
          </div>
          <div className="flex items-center gap-3">
            {dados.sequencia_dias > 0 && (
              <span
                className="inline-flex items-center gap-1 text-body-xs font-medium text-primary"
                title="Dias seguidos com desafio resgatado"
              >
                <Flame className="h-4 w-4" />
                {dados.sequencia_dias} {dados.sequencia_dias === 1 ? 'dia' : 'dias'}
              </span>
            )}
            {compacto && (
              <Link to="/desafios" className="text-body-xs text-primary hover:underline">
                Ver tudo
              </Link>
            )}
          </div>
        </div>

        <ul className="space-y-3">
          {dados.desafios.map((d) => (
            <LinhaDesafio
              key={d.idx}
              desafio={d}
              compacto={compacto}
              resgatando={resgatando === d.idx}
              onResgatar={() => void resgatar(d.idx)}
            />
          ))}
        </ul>

        {!compacto && (
          <p className="text-body-xs text-muted-foreground mt-4">
            Os desafios trocam à meia-noite (horário de Brasília) e são os mesmos para todo mundo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LinhaDesafio({
  desafio: d,
  compacto,
  resgatando,
  onResgatar,
}: {
  desafio: Desafio;
  compacto: boolean;
  resgatando: boolean;
  onResgatar: () => void;
}) {
  const pct = Math.round((d.progresso / d.meta) * 100);
  const precisaoAbaixo = d.chave.startsWith('precisao') && d.progresso >= d.meta && !d.concluido;

  return (
    <li className={cn('rounded-lg border p-3', d.resgatado ? 'border-primary/30 bg-primary/5' : 'border-border')}>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn('font-medium leading-snug', d.resgatado && 'text-muted-foreground line-through')}>
              {d.titulo}
            </p>
            <span className="text-body-xs font-semibold text-primary shrink-0">+{d.xp} XP</span>
          </div>
          {!compacto && <p className="text-body-xs text-muted-foreground">{d.descricao}</p>}
          {!d.resgatado && (
            <div className="flex items-center gap-2 mt-2">
              <Progress value={pct} className="h-1.5 flex-1 bg-muted" aria-label={`${d.progresso} de ${d.meta}`} />
              <span className="text-body-xs text-muted-foreground tabular-nums shrink-0">
                {d.progresso}/{d.meta}
                {d.chave.startsWith('precisao') && ` · ${d.precisao}%`}
              </span>
            </div>
          )}
          {precisaoAbaixo && (
            <p className="text-body-xs text-muted-foreground mt-1">Falta subir o acerto do dia para 80%.</p>
          )}
        </div>
        {d.resgatado ? (
          <Check className="h-5 w-5 text-primary shrink-0" aria-label="Resgatado" />
        ) : d.concluido ? (
          <Button size="sm" onClick={onResgatar} disabled={resgatando} className="shrink-0">
            {resgatando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resgatar'}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
