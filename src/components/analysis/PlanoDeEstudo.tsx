import { Link } from 'react-router-dom';
import { BookOpen, Dumbbell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MATERIAL, type TemaDeEstudo } from '@/data/materialDidatico';
import { NOME_DO_SPOT } from '@/lib/spotsDoHeroi';
import type { Preset } from '@/data/trilha';
import { linkDoTreino } from '@/lib/treinoDaAnalise';

const NOME_DO_MODO: Record<string, string> = {
  rangeTraining: 'Torneio',
  hu: 'Heads-up',
  threeHand: '3-handed',
  bounty: 'Bounty',
  cash: 'Cash',
};

/** Texto curto do que o treino vai abrir: "Torneio · CO, BTN · 25 e 30 BB" */
export function descricaoDoTreino(p: Preset): string {
  const stacks = p.stacks.length > 1 ? `${p.stacks.slice(0, -1).join(', ')} e ${p.stacks.at(-1)} BB` : `${p.stacks[0]} BB`;
  return `${NOME_DO_MODO[p.modo] ?? p.modo} · ${p.posicoes.join(', ')} · ${stacks}`;
}

export function BotaoDeTreino({ treino, compacto = false }: { treino: Preset; compacto?: boolean }) {
  return (
    <Button asChild size="sm" variant={compacto ? 'outline' : 'default'} className={compacto ? 'h-7 px-2 text-xs' : undefined}>
      <Link to={linkDoTreino(treino)} title={descricaoDoTreino(treino)}>
        <Dumbbell className="h-3.5 w-3.5" aria-hidden="true" />
        Treinar
      </Link>
    </Button>
  );
}

export interface TemaDoPlano {
  tema: TemaDeEstudo;
  /** Quantas vezes o tema apareceu (leaks, recomendações e mãos com erro) */
  peso: number;
  treino: Preset | null;
  /** Mãos do relatório com erro nesse spot */
  erros: number;
}

interface Props {
  temas: TemaDoPlano[];
  aberto: string;
  onAbrir: (tema: string) => void;
}

/** Os temas que a análise apontou: material de estudo e o treino de cada um */
export function PlanoDeEstudo({ temas, aberto, onAbrir }: Props) {
  if (temas.length === 0) return null;
  return (
    <Card id="plano-de-estudo">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading-xs">
          <BookOpen className="h-5 w-5 text-primary" />
          Plano de Estudo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Os temas que apareceram na sua análise, do mais urgente ao menos. Leia o resumo e treine o spot com as
          posições e stacks das suas mãos.
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible value={aberto} onValueChange={onAbrir}>
          {temas.map(({ tema, treino, erros }, i) => {
            const m = MATERIAL[tema];
            return (
              <AccordionItem key={tema} value={tema} id={`tema-${tema}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-1 items-center gap-3 text-left">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{m.titulo}</span>
                      <span className="block text-xs text-muted-foreground">{m.resumo}</span>
                    </span>
                    {erros > 0 && (
                      <span className="ml-auto mr-2 shrink-0 text-xs font-semibold text-feedback-mistake">
                        {erros} {erros === 1 ? 'erro' : 'erros'}
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">{m.porQue}</p>
                  <div>
                    <h5 className="mb-1.5 font-semibold text-foreground">Na prática</h5>
                    <ul className="space-y-1.5 text-muted-foreground">
                      {m.naPratica.map((p) => (
                        <li key={p} className="flex gap-2">
                          <span className="text-primary" aria-hidden="true">
                            →
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="rounded-lg border border-feedback-mistake/30 bg-feedback-mistake/10 p-3 text-foreground">
                    <span className="font-semibold">Erro mais comum: </span>
                    {m.erroComum}
                  </p>
                  {treino ? (
                    <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-foreground">Treino recomendado: {NOME_DO_SPOT[treino.cenarios[0] as keyof typeof NOME_DO_SPOT]}</p>
                        <p className="text-xs text-muted-foreground">{descricaoDoTreino(treino)}</p>
                      </div>
                      <BotaoDeTreino treino={treino} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Este tema ainda não tem treino próprio no GTORei: use o resumo acima para revisar as suas mãos.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
