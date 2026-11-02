import { anonimizarMaos } from '@/lib/anonimizarMaos';
import { useMemo, useRef, useState } from 'react';
import { Upload, FileText, Loader2, Brain, TrendingUp, TrendingDown, AlertCircle, BookOpen, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { detectPlatform, parseHandHistory, PLATFORM_INFO, type ParsedHand } from '@/utils/handHistoryParser';
import {
  contarSpots,
  escolherMaosParaAnalise,
  filtrarPorSpots,
  lerMaoDoHeroi,
  NOME_DO_SPOT,
  type SpotDoHeroi,
} from '@/lib/spotsDoHeroi';
import {
  CENARIO_DO_TEMA,
  montarTreino,
  resumirMao,
  TEMA_DO_SPOT,
  temasDoTexto,
  type MaoResumida,
} from '@/lib/treinoDaAnalise';
import type { TemaDeEstudo } from '@/data/materialDidatico';
import { evPerdido, perdaDaMao, salvarAnalise, type AnaliseDoHistorico, type AnalysisResult, type Verdict } from '@/lib/historicoDeAnalises';
import { supabase } from '@/integrations/supabase/client';
import { BotaoDeTreino, PlanoDeEstudo, type TemaDoPlano } from './PlanoDeEstudo';
import { HistoricoDeAnalises } from './HistoricoDeAnalises';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const VERDICT_STYLE: Record<Verdict, { label: string; color: string; bg: string }> = {
  best: { label: 'Excelente', color: 'text-feedback-best', bg: 'bg-feedback-best/20' },
  correct: { label: 'Correto', color: 'text-feedback-correct', bg: 'bg-feedback-correct/20' },
  inaccuracy: { label: 'Inacurácia', color: 'text-feedback-inaccuracy', bg: 'bg-feedback-inaccuracy/20' },
  mistake: { label: 'Erro', color: 'text-feedback-mistake', bg: 'bg-feedback-mistake/20' },
  blunder: { label: 'Blunder', color: 'text-feedback-blunder', bg: 'bg-feedback-blunder/20' },
};

// A função analyze-hand-history lê até 30 mãos e recusa pedido acima de
// 300 KB. Um arquivo de sessão do GG passa disso fácil, e antes ia inteiro.
const MAX_MAOS_NA_IA = 30;
const MAX_BYTES_DO_PEDIDO = 280_000;

/** Mãos que vão para a IA, com o spot de cada uma calculado aqui (a IA inventava) */
function montarPedido(maos: ParsedHand[]) {
  let escolhidas = escolherMaosParaAnalise(maos, MAX_MAOS_NA_IA);
  const montar = (lista: ParsedHand[]) =>
    anonimizarMaos(lista).map((m, i) => {
      const l = lerMaoDoHeroi(lista[i]);
      return {
        ...m,
        posicaoDoHeroi: l.posicao,
        spotsDoHeroi: l.spots.map((s) => NOME_DO_SPOT[s]),
        stackEfetivoBb: l.stackEfetivoBb,
      };
    });
  let corpo = montar(escolhidas);
  while (escolhidas.length > 1 && JSON.stringify({ hands: corpo }).length > MAX_BYTES_DO_PEDIDO) {
    escolhidas = escolhidas.slice(0, Math.floor(escolhidas.length * 0.8));
    corpo = montar(escolhidas);
  }
  return { escolhidas, corpo };
}

const COM_ERRO: Verdict[] = ['inaccuracy', 'mistake', 'blunder'];

/** Junta os itens de duas rodadas sem repetir o mesmo texto */
const juntarTextos = (a: string[], b: string[]) => [...new Set([...a, ...b])];

/**
 * Temas do plano de estudo: cada leak e recomendação conta 2, cada mão com
 * erro conta 1 no tema do spot dela. O treino sai das mãos com erro.
 */
function montarPlano(analise: AnalysisResult, maos: MaoResumida[]): TemaDoPlano[] {
  const comErro = new Set(analise.hands.filter((h) => COM_ERRO.includes(h.verdict)).map((h) => h.handId));
  const peso = new Map<TemaDeEstudo, number>();
  const erros = new Map<TemaDeEstudo, number>();
  const somar = (m: Map<TemaDeEstudo, number>, t: TemaDeEstudo, n: number) => m.set(t, (m.get(t) ?? 0) + n);
  for (const texto of [...analise.overall.leaks, ...analise.overall.recommendations]) {
    for (const t of temasDoTexto(texto)) somar(peso, t, 2);
  }
  for (const m of maos) {
    if (!comErro.has(m.handId)) continue;
    for (const s of m.spots) {
      const t = TEMA_DO_SPOT[s];
      if (t) {
        somar(peso, t, 1);
        somar(erros, t, 1);
      }
    }
  }
  // Tema de spot sem nenhuma mão no relatório não ganha treino (a IA às vezes
  // fala do que não aconteceu); o material continua
  const temMao = (t: TemaDeEstudo) => maos.some((m) => m.spots.some((s) => TEMA_DO_SPOT[s] === t));
  return [...peso.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tema, p]) => {
      const cenario = CENARIO_DO_TEMA[tema];
      return {
        tema,
        peso: p,
        erros: erros.get(tema) ?? 0,
        treino: cenario && temMao(tema) ? montarTreino(cenario, maos, comErro) : null,
      };
    });
}

export function AIAnalysis() {
  const [parsed, setParsed] = useState<ParsedHand[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [enviadas, setEnviadas] = useState(0);
  const [removidos, setRemovidos] = useState(0);
  // Mãos já analisadas (resumo de cada uma): "Analisar as próximas" pega o resto
  const [maosAnalisadas, setMaosAnalisadas] = useState<MaoResumida[]>([]);
  const [idSalvo, setIdSalvo] = useState<string | null>(null);
  const [versaoHistorico, setVersaoHistorico] = useState(0);
  const [temaAberto, setTemaAberto] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const relatorioRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.txt')) {
      toast({ title: 'Arquivo inválido', description: 'Envie um arquivo .txt do seu hand history.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo 5MB.' });
      return;
    }
    const text = await file.text();
    const hands = parseHandHistory(text);
    if (hands.length === 0) {
      const sala = detectPlatform(text.replace(/\r\n?/g, '\n'));
      toast({
        title: 'Nenhuma mão detectada',
        description:
          sala === 'unknown'
            ? 'Não reconhecemos a sala. Envie o .txt exportado do PokerStars, GGPoker, 888poker, ACR, PartyPoker ou Winamax.'
            : `O arquivo parece do ${PLATFORM_INFO[sala].name}, mas nenhuma mão foi lida. Exporte de novo o histórico como .txt.`,
      });
      return;
    }
    setParsed(hands);
    setAnalysis(null);
    setRemovidos(0);
    setMaosAnalisadas([]);
    setIdSalvo(null);
    setTemaAberto('');
    setFileName(file.name);
    toast({ title: 'Histórico carregado', description: `${hands.length} mão(s) detectada(s).` });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const jaAnalisadas = useMemo(() => new Set(maosAnalisadas.map((m) => m.handId)), [maosAnalisadas]);
  const restantes = useMemo(() => parsed.filter((h) => !jaAnalisadas.has(h.handId)), [parsed, jaAnalisadas]);
  const continuando = analysis !== null && maosAnalisadas.length > 0;

  const runAnalysis = async (continuar: boolean) => {
    const fila = continuar ? restantes : parsed;
    if (fila.length === 0) return;
    setLoading(true);
    try {
      const { escolhidas, corpo } = montarPedido(fila);
      const { data, error } = await supabase.functions.invoke('analyze-hand-history', {
        body: { hands: corpo },
      });
      if (error) {
        // Em resposta 4xx/5xx o supabase-js só diz "non-2xx status code"; a
        // mensagem útil (limite do dia, arquivo grande) vem no corpo
        const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(corpo?.error ?? 'Tente novamente.');
      }
      if (data?.error) throw new Error(data.error);
      const resultado = data.analysis as AnalysisResult;
      // Leak de spot que não está em nenhuma mão enviada é invenção da IA
      const presentes = new Set<SpotDoHeroi>(escolhidas.flatMap((m) => lerMaoDoHeroi(m).spots));
      const leaks = filtrarPorSpots(resultado.overall?.leaks ?? [], presentes);
      const recomendacoes = filtrarPorSpots(resultado.overall?.recommendations ?? [], presentes);
      const rodada: AnalysisResult = {
        hands: resultado.hands ?? [],
        overall: { evTotal: resultado.overall?.evTotal ?? 0, leaks: leaks.itens, recommendations: recomendacoes.itens },
      };
      // Continuação: as mãos novas entram depois das já vistas, o EV soma e os
      // leaks e recomendações das rodadas ficam juntos, os mais novos primeiro
      const base = continuar && analysis ? analysis : null;
      const juntas: AnalysisResult = base
        ? {
            hands: [...base.hands, ...rodada.hands],
            overall: {
              evTotal: Math.round((base.overall.evTotal + rodada.overall.evTotal) * 100) / 100,
              leaks: juntarTextos(rodada.overall.leaks, base.overall.leaks),
              recommendations: juntarTextos(rodada.overall.recommendations, base.overall.recommendations),
            },
          }
        : rodada;
      const maos = [...(base ? maosAnalisadas : []), ...escolhidas.map(resumirMao)];
      const totalRemovidos = (base ? removidos : 0) + leaks.removidos + recomendacoes.removidos;
      setAnalysis(juntas);
      setMaosAnalisadas(maos);
      setEnviadas(maos.length);
      setRemovidos(totalRemovidos);
      toast({
        title: base ? 'Mais mãos analisadas!' : 'Análise concluída!',
        description: base ? `${escolhidas.length} mão(s) novas no relatório.` : 'Veja o resultado abaixo.',
      });
      const id = await salvarAnalise(base ? idSalvo : null, {
        arquivo: fileName,
        sala: parsed[0] ? PLATFORM_INFO[parsed[0].platform].name : null,
        maosNoArquivo: parsed.length,
        relatorio: { analise: juntas, maos, removidos: totalRemovidos },
      });
      if (id) {
        setIdSalvo(id);
        setVersaoHistorico((v) => v + 1);
      }
    } catch (e) {
      toast({
        title: 'Erro na análise',
        description: e instanceof Error ? e.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirDoHistorico = (a: AnaliseDoHistorico) => {
    const r = a.resultado;
    setParsed([]);
    setFileName(a.arquivo ?? '');
    setAnalysis(r.analise);
    setMaosAnalisadas(r.maos ?? []);
    setEnviadas(r.maos?.length ?? a.maos_analisadas);
    setRemovidos(r.removidos ?? 0);
    setIdSalvo(a.id);
    setTemaAberto('');
    requestAnimationFrame(() => relatorioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const plano = useMemo(() => (analysis ? montarPlano(analysis, maosAnalisadas) : []), [analysis, maosAnalisadas]);
  const treinoDoTema = useMemo(() => new Map(plano.map((p) => [p.tema, p.treino])), [plano]);

  const estudar = (tema: TemaDeEstudo) => {
    setTemaAberto(tema);
    requestAnimationFrame(() => document.getElementById(`tema-${tema}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  /** Botões de treino e de estudo embaixo de um leak ou recomendação */
  const acoesDoItem = (texto: string) => {
    const temas = temasDoTexto(texto);
    if (temas.length === 0) return null;
    const treino = temas.map((t) => treinoDoTema.get(t)).find(Boolean) ?? null;
    return (
      <span className="mt-1.5 flex flex-wrap gap-1.5">
        {treino && <BotaoDeTreino treino={treino} compacto />}
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => estudar(temas[0])}>
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Estudar
        </Button>
      </span>
    );
  };

  const platform = parsed[0]?.platform;
  const platformInfo = platform ? PLATFORM_INFO[platform] : null;
  const spotsDoArquivo = useMemo(() => contarSpots(parsed), [parsed]);

  // EV perdido: só as perdas mão a mão (jogada certa vale 0), não o total da IA
  const perdido = analysis ? evPerdido(analysis) : 0;
  let somaDasPerdas = 0;
  const chartData =
    analysis?.hands.map((h, i) => {
      somaDasPerdas += perdaDaMao(h);
      return { name: `#${i + 1}`, ev: Math.round(somaDasPerdas * 100) / 100 || 0 };
    }) ?? [];
  // Mãos enviadas que a IA devolveu sem veredito (em geral folds que ela pulou)
  const comVeredito = new Set(analysis?.hands.map((h) => h.handId) ?? []);
  const semVeredito = maosAnalisadas.filter((m) => !comVeredito.has(m.handId)).length;

  return (
    <div className="space-y-6">
      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading-xs">
            <Brain className="h-5 w-5 text-primary" />
            Analisar com IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
          >
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-body-md font-medium">Solte seu arquivo .txt aqui ou clique para selecionar</p>
            <p className="text-body-sm text-muted-foreground mt-1">
              PokerStars, GGPoker, ACR, PartyPoker, 888Poker, Winamax
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={onChange}
            />
          </div>

          {parsed.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm truncate max-w-[220px]">{fileName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {platformInfo && (
                      <Badge variant="secondary" className="text-xs">
                        {platformInfo.logo} {platformInfo.name}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {parsed.length} mão(s)
                    </Badge>
                  </div>
                </div>
              </div>
              <Button onClick={() => void runAnalysis(false)} disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    {continuando ? 'Analisar de novo' : 'Analisar com IA'}
                  </>
                )}
              </Button>
            </div>
          )}

          {parsed.length > 0 && (
            <div className="mt-3 space-y-2">
              {spotsDoArquivo.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Spots de pré-flop em que você decidiu (lidos das ações do arquivo):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {spotsDoArquivo.map(({ spot, maos }) => (
                      <Badge key={spot} variant="outline" className="text-xs font-normal">
                        {NOME_DO_SPOT[spot]}: <span className="font-semibold ml-1">{maos}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {parsed.length > MAX_MAOS_NA_IA && (
                <p className="text-xs text-muted-foreground">
                  A IA analisa até {MAX_MAOS_NA_IA} mãos por vez. Das {parsed.length} do arquivo, vão primeiro as
                  em que você entrou no pote; depois, dá para continuar nas próximas.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      {analysis && (
        <div ref={relatorioRef} className="space-y-6 scroll-mt-4">
          {/* Continuar nas mãos que ficaram de fora */}
          {parsed.length > 0 && continuando && (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {maosAnalisadas.length} de {parsed.length} mãos do torneio enviadas à IA
                  {semVeredito > 0 && ` · ${semVeredito} sem comentário`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {restantes.length > 0
                    ? `Faltam ${restantes.length}. Cada rodada conta uma análise do seu limite do dia.`
                    : 'Todas as mãos do arquivo estão no relatório.'}
                </p>
              </div>
              {restantes.length > 0 && (
                <Button onClick={() => void runAnalysis(true)} disabled={loading} className="w-full sm:w-auto">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Analisar as próximas {Math.min(MAX_MAOS_NA_IA, restantes.length)}
                </Button>
              )}
            </div>
          )}
          {parsed.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Análise do histórico{fileName ? ` (${fileName})` : ''}. Para analisar mais mãos desse torneio, envie o
              arquivo de novo.
            </p>
          )}

          {/* EV chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-xs">
                <span className="flex items-center gap-2">
                  {perdido < 0 ? (
                    <TrendingDown className="h-5 w-5 text-feedback-blunder" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-feedback-best" />
                  )}
                  EV Perdido
                </span>
                <span className={cn('text-lg font-bold', perdido < 0 ? 'text-feedback-blunder' : 'text-feedback-best')}>
                  {perdido.toFixed(2)} bb
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Quanto as suas decisões custaram contra o GTO, somando mão a mão. Jogada certa vale 0: o resultado do
                pote não entra.
                {semVeredito > 0 &&
                  ` ${semVeredito} ${semVeredito === 1 ? 'mão ficou' : 'mãos ficaram'} sem comentário da IA e não ${semVeredito === 1 ? 'entra' : 'entram'} na conta.`}
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(v: number) => [`${v} bb`, 'EV perdido']}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="ev" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resumo geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-heading-xs">
                <AlertCircle className="h-5 w-5 text-primary" />
                Resumo Geral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.overall.leaks.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Principais Leaks</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {analysis.overall.leaks.map((l, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-feedback-blunder">•</span>
                        <span className="flex-1">
                          {l}
                          {acoesDoItem(l)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.overall.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Recomendações</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {analysis.overall.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">→</span>
                        <span className="flex-1">
                          {r}
                          {acoesDoItem(r)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Baseado em {enviadas} mão(s).
                {removidos > 0 &&
                  ` ${removidos === 1 ? 'Uma observação da IA saiu' : `${removidos} observações da IA saíram`}: falavam de um spot que não aparece nessas mãos.`}
              </p>
            </CardContent>
          </Card>

          <PlanoDeEstudo temas={plano} aberto={temaAberto} onAbrir={setTemaAberto} />

          {/* Mão por mão */}
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-xs">Análise Mão por Mão</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {analysis.hands.map((h, i) => {
                  const style = VERDICT_STYLE[h.verdict] ?? VERDICT_STYLE.correct;
                  const orig = parsed.find((p) => p.handId === h.handId);
                  // Do histórico não há arquivo: vale o resumo guardado da mão
                  const resumo = maosAnalisadas.find((m) => m.handId === h.handId);
                  const leitura = orig
                    ? lerMaoDoHeroi(orig)
                    : resumo
                      ? { spots: resumo.spots, posicao: resumo.posicao, stackEfetivoBb: resumo.stackBb }
                      : null;
                  const cartas = orig?.holeCards ?? resumo?.cartas ?? [];
                  return (
                    <AccordionItem key={h.handId + i} value={`hand-${i}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', style.bg, style.color)}>
                            {style.label}
                          </span>
                          <span className="text-sm font-medium">Mão #{i + 1}</span>
                          {cartas.length ? (
                            <span className="text-xs text-muted-foreground font-mono">[{cartas.join(' ')}]</span>
                          ) : null}
                          <span
                            className={cn(
                              'ml-auto text-xs font-semibold',
                              perdaDaMao(h) < 0 ? 'text-feedback-blunder' : 'text-feedback-best'
                            )}
                          >
                            {perdaDaMao(h).toFixed(2)} bb
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
                        {leitura && leitura.spots.length > 0 && (
                          <div>
                            <span className="text-muted-foreground font-medium">Spot: </span>
                            {leitura.spots.map((s) => NOME_DO_SPOT[s]).join(' → ')}
                            {leitura.posicao && ` · ${leitura.posicao}`}
                            {leitura.stackEfetivoBb !== null &&
                              ` · ${leitura.stackEfetivoBb.toLocaleString('pt-BR')} bb efetivos`}
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground font-medium">Decisão: </span>
                          {h.summary}
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium">GTO ideal: </span>
                          {h.gtoPlay}
                        </div>
                        {orig?.board && orig.board.length > 0 && (
                          <div>
                            <span className="text-muted-foreground font-medium">Board: </span>
                            <span className="font-mono">[{orig.board.join(' ')}]</span>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      )}

      <HistoricoDeAnalises versao={versaoHistorico} abertaId={idSalvo} onAbrir={abrirDoHistorico} />
    </div>
  );
}
