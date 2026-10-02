import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, CalendarRange, Info, Loader2, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Comparação mês a mês do Dashboard do admin.
//
// Os números vêm da função admin_monthly_metrics (migration
// 20261002120000_admin_metricas_mensais.sql), que agrega no banco: o RLS não
// deixa o navegador ler as mãos dos outros jogadores. Enquanto a migration
// não estiver aplicada, a tela calcula sozinha só os cadastros, a partir da
// lista de jogadores que já carrega, e avisa que o resto depende dela.

const FUSO = 'America/Sao_Paulo';

type MonthRow = {
  mes: string; // AAAA-MM-01
  novos: number;
  total_usuarios: number;
  ativos: number;
  sessoes: number;
  maos: number;
  minutos: number;
  precisao: number | null;
};

type MetricKey =
  | 'novos' | 'total_usuarios' | 'ativos' | 'maos' | 'sessoes'
  | 'minutos' | 'precisao' | 'maosPorAtivo' | 'minutosPorAtivo';

type Metric = {
  key: MetricKey;
  title: string;
  hint: string;
  format: (v: number) => string;
  // precisão compara em pontos percentuais; o resto em variação percentual
  deltaInPoints?: boolean;
  needsRpc: boolean;
};

const formatMinutes = (m: number) => {
  const total = Math.round(m);
  if (total < 60) return `${total}min`;
  const h = Math.floor(total / 60);
  const min = total % 60;
  return min ? `${h}h ${min}min` : `${h}h`;
};

const inteiro = (v: number) => Math.round(v).toLocaleString('pt-BR');

const METRICS: Metric[] = [
  { key: 'novos', title: 'Novos cadastros', hint: 'contas criadas no mês', format: inteiro, needsRpc: false },
  { key: 'total_usuarios', title: 'Total de usuários', hint: 'acumulado até o fim do período', format: inteiro, needsRpc: false },
  { key: 'ativos', title: 'Jogadores ativos', hint: 'com pelo menos uma mão no mês', format: inteiro, needsRpc: true },
  { key: 'maos', title: 'Mãos jogadas', hint: 'todas as mãos gravadas', format: inteiro, needsRpc: true },
  { key: 'sessoes', title: 'Sessões', hint: 'sessões com pelo menos uma mão', format: inteiro, needsRpc: true },
  { key: 'minutos', title: 'Tempo de treino', hint: 'pausas acima de 5 min não contam', format: formatMinutes, needsRpc: true },
  {
    key: 'precisao', title: 'Precisão média', hint: 'mãos com pontuação positiva',
    format: (v) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`, deltaInPoints: true, needsRpc: true,
  },
  { key: 'maosPorAtivo', title: 'Mãos por jogador ativo', hint: 'mãos ÷ jogadores ativos', format: inteiro, needsRpc: true },
  { key: 'minutosPorAtivo', title: 'Tempo por jogador ativo', hint: 'tempo ÷ jogadores ativos', format: formatMinutes, needsRpc: true },
];

// Ano, mês e dia no fuso de Brasília, para bater com o banco
const partesSP = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { ano: get('year'), mes: get('month'), dia: get('day') };
};

const chaveMes = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, '0')}-01`;

const rotuloMes = (chave: string) => {
  const [a, m] = chave.split('-').map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${nome}/${String(a).slice(2)}`;
};

const valorDe = (row: MonthRow, key: MetricKey): number | null => {
  switch (key) {
    case 'maosPorAtivo': return row.ativos ? row.maos / row.ativos : null;
    case 'minutosPorAtivo': return row.ativos ? row.minutos / row.ativos : null;
    case 'precisao': return row.precisao === null ? null : Number(row.precisao);
    default: return Number(row[key]);
  }
};

// Sem a função no banco: cadastros por mês a partir da lista de jogadores
function cadastrosLocais(createdAt: string[], meses: number, ateDia: number | null): MonthRow[] {
  const hoje = partesSP(new Date());
  const linhas: MonthRow[] = [];
  const datas = createdAt.map((c) => partesSP(new Date(c)));
  for (let i = meses - 1; i >= 0; i--) {
    const ref = new Date(hoje.ano, hoje.mes - 1 - i, 1);
    const ano = ref.getFullYear(), mes = ref.getMonth() + 1;
    const noMes = (d: { ano: number; mes: number; dia: number }) =>
      d.ano === ano && d.mes === mes && (ateDia === null || d.dia <= ateDia);
    const atePeriodo = (d: { ano: number; mes: number; dia: number }) =>
      d.ano < ano || (d.ano === ano && d.mes < mes) || noMes(d);
    linhas.push({
      mes: chaveMes(ano, mes),
      novos: datas.filter(noMes).length,
      total_usuarios: datas.filter(atePeriodo).length,
      ativos: 0, sessoes: 0, maos: 0, minutos: 0, precisao: null,
    });
  }
  return linhas;
}

type Periodo = 'parcial' | 'inteiro';

export function MonthlyComparison({ createdAt }: { createdAt: string[] }) {
  const [anteriores, setAnteriores] = useState(3);
  const [periodo, setPeriodo] = useState<Periodo>('parcial');
  const [rows, setRows] = useState<MonthRow[] | null>(null);
  const [rpcDisponivel, setRpcDisponivel] = useState(true);
  const [carregando, setCarregando] = useState(true);

  const hoje = partesSP(new Date());
  const ultimoDiaDoMes = new Date(hoje.ano, hoje.mes, 0).getDate();
  // No último dia do mês "até o dia N" e "mês inteiro" dão o mesmo resultado
  const mesCompleto = hoje.dia >= ultimoDiaDoMes;
  const ateDia = periodo === 'parcial' && !mesCompleto ? hoje.dia : null;
  const meses = anteriores + 1;

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    supabase
      .rpc('admin_monthly_metrics', { _meses: meses, _ate_dia: ateDia })
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          // Antes da migration a função não existe: cai para o cálculo local
          setRpcDisponivel(false);
          setRows(cadastrosLocais(createdAt, meses, ateDia));
        } else {
          setRpcDisponivel(true);
          setRows((data ?? []) as MonthRow[]);
        }
        setCarregando(false);
      });
    return () => { cancelado = true; };
  }, [meses, ateDia, createdAt]);

  const visiveis = METRICS.filter((m) => rpcDisponivel || !m.needsRpc);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" /> Comparação mês a mês
          </h2>
          <p className="text-sm text-muted-foreground">
            {ateDia
              ? `Cada mês conta do dia 1 ao dia ${ateDia}, para o mês atual não sair em desvantagem.`
              : 'Cada mês conta inteiro. O mês atual ainda não terminou.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!mesCompleto && (
            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={periodo}
              onValueChange={(v) => v && setPeriodo(v as Periodo)}
              aria-label="Período de cada mês"
            >
              <ToggleGroupItem value="parcial">Até o dia {hoje.dia}</ToggleGroupItem>
              <ToggleGroupItem value="inteiro">Mês inteiro</ToggleGroupItem>
            </ToggleGroup>
          )}
          <Select value={String(anteriores)} onValueChange={(v) => setAnteriores(Number(v))}>
            <SelectTrigger className="h-9 w-[210px] text-sm" aria-label="Meses de comparação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Comparar com o mês anterior</SelectItem>
              <SelectItem value="3">Comparar com 3 meses</SelectItem>
              <SelectItem value="6">Comparar com 6 meses</SelectItem>
              <SelectItem value="12">Comparar com 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!rpcDisponivel && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Por enquanto só os cadastros. Jogadores ativos, mãos, sessões, tempo e precisão aparecem
            quando a migration <code className="text-foreground">20261002120000_admin_metricas_mensais</code> for
            aplicada no Supabase.
          </span>
        </div>
      )}

      {carregando || !rows ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((m) => (
            <MetricChart key={m.key} metric={m} rows={rows} />
          ))}
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

function Delta({ atual, base, emPontos, rotulo }: { atual: number | null; base: number | null; emPontos?: boolean; rotulo: string }) {
  if (atual === null || base === null) {
    return <span className="text-muted-foreground">sem base {rotulo}</span>;
  }
  const diff = emPontos ? atual - base : base === 0 ? null : ((atual - base) / base) * 100;
  if (diff === null) {
    return <span className="text-muted-foreground">sem base {rotulo}</span>;
  }
  const arred = Math.round(diff * 10) / 10;
  const Icone = arred > 0 ? ArrowUpRight : arred < 0 ? ArrowDownRight : Minus;
  const cor = arred > 0 ? 'hsl(var(--feedback-best))' : arred < 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))';
  const texto = `${arred > 0 ? '+' : ''}${arred.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${emPontos ? ' p.p.' : '%'}`;
  return (
    <span className="inline-flex items-center gap-1 text-foreground">
      <Icone className="h-3.5 w-3.5" style={{ color: cor }} aria-hidden />
      <span className="font-medium tabular-nums">{texto}</span>
      <span className="text-muted-foreground">{rotulo}</span>
    </span>
  );
}

function MetricChart({ metric, rows }: { metric: Metric; rows: MonthRow[] }) {
  const dados = useMemo(
    () => rows.map((r) => ({ mes: r.mes, label: rotuloMes(r.mes), valor: valorDe(r, metric.key) })),
    [rows, metric.key],
  );
  const atual = dados[dados.length - 1]?.valor ?? null;
  const anterior = dados.length > 1 ? dados[dados.length - 2].valor : null;
  const anterioresComValor = dados.slice(0, -1).map((d) => d.valor).filter((v): v is number => v !== null);
  const media = anterioresComValor.length
    ? anterioresComValor.reduce((s, v) => s + v, 0) / anterioresComValor.length
    : null;
  const mostrarMedia = dados.length > 2;

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
        <p className="text-2xl font-bold text-foreground tabular-nums">
          {atual === null ? '—' : metric.format(atual)}
        </p>
        <div className="flex flex-col gap-0.5 text-xs">
          <Delta atual={atual} base={anterior} emPontos={metric.deltaInPoints} rotulo="vs mês anterior" />
          {mostrarMedia && (
            <Delta atual={atual} base={media} emPontos={metric.deltaInPoints} rotulo={`vs média de ${dados.length - 1} meses`} />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={44}
              domain={metric.key === 'precisao' ? [0, 100] : [0, 'auto']}
              tickFormatter={(v: number) =>
                metric.key === 'minutos' ? `${Math.round(v / 60)}h`
                  : metric.key === 'minutosPorAtivo' ? `${Math.round(v)}min`
                  : v.toLocaleString('pt-BR')}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
              contentStyle={tooltipStyle}
              formatter={(v: number | null) => [v === null ? 'sem dado' : metric.format(v), metric.title]}
            />
            <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {dados.map((d, i) => (
                <Cell
                  key={d.mes}
                  fill={i === dados.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.45)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-muted-foreground">{metric.hint}</p>
      </CardContent>
    </Card>
  );
}
