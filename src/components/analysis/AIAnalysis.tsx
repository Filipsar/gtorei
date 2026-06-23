import { useRef, useState } from 'react';
import { Upload, FileText, Loader2, Brain, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { parseHandHistory, PLATFORM_INFO, type ParsedHand } from '@/utils/handHistoryParser';
import { supabase } from '@/integrations/supabase/client';
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

type Verdict = 'best' | 'correct' | 'inaccuracy' | 'mistake' | 'blunder';

interface HandAnalysis {
  handId: string;
  verdict: Verdict;
  summary: string;
  gtoPlay: string;
  evDelta: number;
}

interface AnalysisResult {
  hands: HandAnalysis[];
  overall: {
    leaks: string[];
    recommendations: string[];
    evTotal: number;
  };
}

const VERDICT_STYLE: Record<Verdict, { label: string; color: string; bg: string }> = {
  best: { label: 'Excelente', color: 'text-feedback-best', bg: 'bg-feedback-best/20' },
  correct: { label: 'Correto', color: 'text-feedback-correct', bg: 'bg-feedback-correct/20' },
  inaccuracy: { label: 'Inacurácia', color: 'text-feedback-inaccuracy', bg: 'bg-feedback-inaccuracy/20' },
  mistake: { label: 'Erro', color: 'text-feedback-mistake', bg: 'bg-feedback-mistake/20' },
  blunder: { label: 'Blunder', color: 'text-feedback-blunder', bg: 'bg-feedback-blunder/20' },
};

export function AIAnalysis() {
  const [parsed, setParsed] = useState<ParsedHand[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

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
      toast({ title: 'Nenhuma mão detectada', description: 'Verifique se o arquivo é um hand history válido.' });
      return;
    }
    setParsed(hands);
    setAnalysis(null);
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

  const runAnalysis = async () => {
    if (parsed.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-hand-history', {
        body: { hands: parsed },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalysis(data.analysis as AnalysisResult);
      toast({ title: 'Análise concluída!', description: 'Veja o resultado abaixo.' });
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

  const platform = parsed[0]?.platform;
  const platformInfo = platform ? PLATFORM_INFO[platform] : null;

  const chartData =
    analysis?.hands.map((h, i) => ({
      name: `#${i + 1}`,
      ev: Number((analysis.hands.slice(0, i + 1).reduce((acc, x) => acc + (x.evDelta || 0), 0)).toFixed(2)),
    })) ?? [];

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
              <Button onClick={runAnalysis} disabled={loading} className="w-full sm:w-auto">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado */}
      {analysis && (
        <>
          {/* EV chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-heading-xs">
                <span className="flex items-center gap-2">
                  {analysis.overall.evTotal >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-feedback-best" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-feedback-blunder" />
                  )}
                  EV Acumulado
                </span>
                <span
                  className={cn(
                    'text-lg font-bold',
                    analysis.overall.evTotal >= 0 ? 'text-feedback-best' : 'text-feedback-blunder'
                  )}
                >
                  {analysis.overall.evTotal >= 0 ? '+' : ''}
                  {analysis.overall.evTotal.toFixed(2)} bb
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    formatter={(v: number) => [`${v} bb`, 'EV']}
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
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.overall.leaks.map((l, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-feedback-blunder">•</span>
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.overall.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-foreground">Recomendações</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {analysis.overall.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

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
                  return (
                    <AccordionItem key={h.handId + i} value={`hand-${i}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', style.bg, style.color)}>
                            {style.label}
                          </span>
                          <span className="text-sm font-medium">Mão #{i + 1}</span>
                          {orig?.holeCards.length ? (
                            <span className="text-xs text-muted-foreground font-mono">
                              [{orig.holeCards.join(' ')}]
                            </span>
                          ) : null}
                          <span
                            className={cn(
                              'ml-auto text-xs font-semibold',
                              h.evDelta >= 0 ? 'text-feedback-best' : 'text-feedback-blunder'
                            )}
                          >
                            {h.evDelta >= 0 ? '+' : ''}
                            {h.evDelta.toFixed(2)} bb
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-sm">
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
        </>
      )}
    </div>
  );
}
