import { CalendarDays, CalendarRange, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LinhaDesafio } from '@/components/challenges/DailyChallengesCard';
import { usePeriodChallenges, type Periodo } from '@/hooks/usePeriodChallenges';
import { diasRestantes } from '@/lib/periodo';

const TITULO: Record<Periodo, string> = { semana: 'Desafios da semana', mes: 'Desafios do mês' };
const ICONE: Record<Periodo, typeof CalendarDays> = { semana: CalendarDays, mes: CalendarRange };

const dataCurta = (iso: string) =>
  new Date(iso + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });

/** Desafios da semana e do mês, um cartão para cada */
export function PeriodChallengesCards() {
  const { dados, indisponivel, resgatando, resgatar } = usePeriodChallenges();

  if (indisponivel) return null;
  if (!dados) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {(['semana', 'mes'] as Periodo[]).map((periodo) => {
        const p = dados[periodo];
        const Icone = ICONE[periodo];
        const feitos = p.desafios.filter((d) => d.resgatado).length;
        const faltam = diasRestantes(p.fim);
        return (
          <Card key={periodo} className="border-primary/25">
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Icone className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h2 className="font-semibold">{TITULO[periodo]}</h2>
                  <span className="text-body-xs text-muted-foreground tabular-nums">{feitos}/3</span>
                </div>
                <span className="text-body-xs text-muted-foreground">
                  {dataCurta(p.inicio)} a {dataCurta(p.fim)} · {faltam === 1 ? 'último dia' : `faltam ${faltam} dias`}
                </span>
              </div>
              <ul className="space-y-3">
                {p.desafios.map((d) => (
                  <LinhaDesafio
                    key={d.idx}
                    desafio={d}
                    compacto={false}
                    resgatando={resgatando === `${periodo}#${d.idx}`}
                    onResgatar={() => void resgatar(periodo, d.idx)}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}
