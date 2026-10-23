import { Check, ClipboardCheck, Loader2, RotateCcw, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AchievementIcon } from '@/components/achievements/AchievementIcon';
import { getAchievement } from '@/data/achievements';
import { SCENARIOS } from '@/data/gtoRanges';
import { cn } from '@/lib/utils';
import {
  MINIMO_PARA_XP,
  acertou,
  resumoLocal,
  type RespostaSimulado,
  type ResultadoSimulado,
} from '@/lib/simulado';

interface Props {
  respostas: RespostaSimulado[];
  resultado: ResultadoSimulado | null;
  corrigindo: boolean;
  erro: string | null;
  onNovo: () => void;
  onSair: () => void;
}

const ACAO: Record<string, string> = { fold: 'Fold', call: 'Call', raise: 'Raise', allin: 'All-in', check: 'Check' };
const nomeAcao = (a: string) => ACAO[a] ?? a;
const nomeCenario = (s: string) => SCENARIOS.find((c) => c.id === s)?.label ?? s;

function nota(precisao: number) {
  if (precisao >= 90) return { titulo: 'Excelente', frase: 'Decisões de quem já domina as ranges.' };
  if (precisao >= 80) return { titulo: 'Muito bom', frase: 'Poucos erros. Veja abaixo onde eles estão.' };
  if (precisao >= 60) return { titulo: 'No caminho', frase: 'A base está aí. Os erros abaixo mostram o que estudar.' };
  return { titulo: 'Hora de revisar', frase: 'Use a correção abaixo e as Tabelas para firmar essas mãos.' };
}

/** Fim do simulado: a nota, o XP e a correção mão a mão */
export function SimuladoResultado({ respostas, resultado, corrigindo, erro, onNovo, onSair }: Props) {
  // Depois da correção vale a conta do servidor (a mesma que deu o XP); antes, a local
  const r = resultado && resultado.maos > 0
    ? { acertos: resultado.acertos, total: resultado.maos, precisao: Math.round(resultado.precisao) }
    : resumoLocal(respostas);
  const n = nota(r.precisao);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/30">
        <div className="bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium uppercase tracking-wider text-primary">Simulado corrigido</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{n.titulo}</h1>
          <p className="mt-1 text-muted-foreground">{n.frase}</p>

          <div className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-lg bg-background/60 p-3">
              <p className="text-2xl font-bold tabular-nums">{r.acertos}/{r.total}</p>
              <p className="text-xs text-muted-foreground">acertos</p>
            </div>
            <div className="rounded-lg bg-background/60 p-3">
              <p className="text-2xl font-bold tabular-nums">{r.precisao}%</p>
              <p className="text-xs text-muted-foreground">precisão</p>
            </div>
            <div className="rounded-lg bg-background/60 p-3">
              {corrigindo ? (
                <Loader2 className="mx-auto my-1.5 h-5 w-5 animate-spin text-primary" aria-label="Calculando XP" />
              ) : (
                <p className="text-2xl font-bold text-primary tabular-nums">+{resultado?.xp ?? 0}</p>
              )}
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </div>

          {!corrigindo && (
            <p className="mt-4 text-xs text-muted-foreground">
              {erro
                ? erro
                : r.total < MINIMO_PARA_XP
                  ? `O XP só vale a partir de ${MINIMO_PARA_XP} mãos. A correção abaixo vale do mesmo jeito.`
                  : resultado?.ja_pago
                    ? 'O XP deste simulado já tinha sido creditado.'
                    : resultado && resultado.multiplicador_precisao > 1
                      ? `Bônus de precisão: XP ×${String(resultado.multiplicador_precisao).replace('.', ',')}.`
                      : 'Acerte 80% ou mais para ganhar bônus de precisão.'}
            </p>
          )}

          {resultado?.conquistas?.length ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {resultado.conquistas.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium">
                  <AchievementIcon achievement={k} className="h-4 w-4 text-primary" />
                  {getAchievement(k)?.name}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button size="lg" onClick={onNovo}>
              <RotateCcw className="h-4 w-4" />
              Novo simulado
            </Button>
            <Button size="lg" variant="outline" onClick={onSair}>
              Voltar ao treino
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-3 text-heading-xs">Correção mão a mão</h2>
        <ol className="space-y-2">
          {respostas.map((resp, i) => {
            const ok = acertou(resp);
            return (
              <li key={i}>
                <Card className={cn(ok ? 'border-border' : 'border-destructive/40')}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        ok ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive',
                      )}
                      aria-label={ok ? 'Acertou' : 'Errou'}
                    >
                      {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        <span className="tabular-nums text-muted-foreground">{i + 1}.</span> {resp.mao}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                          · {resp.posicao} · {resp.stack} BB · {nomeCenario(resp.cenario)}
                        </span>
                      </p>
                      <p className="text-sm">
                        Você: <strong>{nomeAcao(resp.suaAcao)}</strong>
                        {!ok && (
                          <>
                            {' '}· Certo: <strong className="text-primary">{nomeAcao(resp.acaoCerta)}</strong>
                          </>
                        )}
                        {resp.feedback === 'best' && <span className="ml-1 text-xs text-primary">Best</span>}
                        {!ok && resp.evPerdido > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">(−{resp.evPerdido.toFixed(2)} BB de EV)</span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
