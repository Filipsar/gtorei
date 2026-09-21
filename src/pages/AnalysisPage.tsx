import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getLevelName, getLevelProgress } from '@/data/localStorage';
import { POSITIONS } from '@/data/gtoRanges';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import {
  BarChart3, Target, Trophy, TrendingUp, TrendingDown, Minus, Zap, Eye, Info, Play
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';

// Abaixo disso a precisão é ruído: 3 mãos numa posição não dizem nada
const MIN_MAOS_RELEVANTE = 15;

const SCENARIO_LABELS: Record<string, string> = {
  openRaise: 'Open Raise',
  vsOpenRaise: 'Vs Open Raise',
  vs3bet: 'Vs 3-Bet',
  vsOpenShove: 'Vs Open Shove',
  multiway: 'Multiway',
  simulation: 'Simulação',
};

interface Breakdown {
  key: string;
  label: string;
  hands: number;
  accuracy: number;
}

interface MonthlyStats {
  totalHands: number;
  totalScore: number;
  averageAccuracy: number;
  bestStreak: number;
  feedbackDistribution: { best: number; correct: number; inaccuracy: number; mistake: number; blunder: number };
  positionStats: Record<string, { hands: number; accuracy: number }>;
  scenarioStats: Breakdown[];
  recentTrend: 'improving' | 'stable' | 'declining';
  sessions: { id: string; startedAt: string; handsPlayed: number; score: number; accuracy: number }[];
}

// Barra horizontal com rótulo e número na própria linha.
// A cor é reforço: quem identifica a linha é o texto.
function BarRow({
  label, pct, right, color, muted, hint,
}: {
  label: string;
  pct: number;
  right: string;
  color?: string;
  muted?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('w-28 sm:w-32 shrink-0 text-sm truncate', muted ? 'text-muted-foreground/70' : 'text-foreground')}>
        {label}
      </span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            backgroundColor: muted ? 'hsl(var(--muted-foreground) / 0.35)' : color ?? 'hsl(var(--primary))',
          }}
        />
      </div>
      <span className="w-24 shrink-0 text-right text-sm tabular-nums">
        <span className={cn('font-medium', muted ? 'text-muted-foreground' : 'text-foreground')}>{right}</span>
        {hint && <span className="block text-[11px] text-muted-foreground leading-tight">{hint}</span>}
      </span>
    </div>
  );
}

function EmptyState({ texto, onTreinar }: { texto: string; onTreinar: () => void }) {
  return (
    <div className="py-10 text-center">
      <p className="text-muted-foreground text-sm">{texto}</p>
      <Button size="sm" className="mt-4 gap-2" onClick={onTreinar}>
        <Play className="h-4 w-4" />
        Treinar agora
      </Button>
    </div>
  );
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const { user, profile: authProfile } = useAuth();
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const level = authProfile?.level ?? 1;
  const totalXp = authProfile?.total_xp ?? 0;
  const levelProgress = getLevelProgress(totalXp);

  useEffect(() => {
    if (!user?.id) return;
    fetchMonthlyStats(user.id);
  }, [user?.id]);

  async function fetchMonthlyStats(userId: string) {
    setLoading(true);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [sessionsRes, handsRes] = await Promise.all([
      supabase
        .from('training_sessions')
        .select('id, started_at, hands_played, score, accuracy')
        .eq('user_id', userId)
        .gte('started_at', monthStart)
        .order('started_at', { ascending: false })
        .limit(50),
      supabase
        .from('played_hands')
        .select('feedback, position, points, scenario')
        .eq('user_id', userId)
        .gte('played_at', monthStart),
    ]);

    const sessions = sessionsRes.data ?? [];
    const hands = handsRes.data ?? [];

    const feedbackDistribution = { best: 0, correct: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const posMap: Record<string, { hands: number; correct: number }> = {};
    POSITIONS.forEach(p => posMap[p] = { hands: 0, correct: 0 });
    const scenMap: Record<string, { hands: number; correct: number }> = {};

    let bestStreak = 0, currentStreak = 0;
    hands.forEach(h => {
      const fb = h.feedback as keyof typeof feedbackDistribution;
      const acertou = fb === 'best' || fb === 'correct';
      if (fb in feedbackDistribution) feedbackDistribution[fb]++;
      if (posMap[h.position]) {
        posMap[h.position].hands++;
        if (acertou) posMap[h.position].correct++;
      }
      if (h.scenario) {
        if (!scenMap[h.scenario]) scenMap[h.scenario] = { hands: 0, correct: 0 };
        scenMap[h.scenario].hands++;
        if (acertou) scenMap[h.scenario].correct++;
      }
      if (acertou) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    const correctCount = feedbackDistribution.best + feedbackDistribution.correct;
    const avgAcc = hands.length > 0 ? Math.round((correctCount / hands.length) * 100) : 0;

    const recent5 = sessions.slice(0, 5);
    const older5 = sessions.slice(5, 10);
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recent5.length >= 3 && older5.length >= 3) {
      const rAvg = recent5.reduce((a, s) => a + Number(s.accuracy), 0) / recent5.length;
      const oAvg = older5.reduce((a, s) => a + Number(s.accuracy), 0) / older5.length;
      if (rAvg > oAvg + 5) trend = 'improving';
      else if (rAvg < oAvg - 5) trend = 'declining';
    }

    const positionStats = Object.fromEntries(
      Object.entries(posMap).map(([pos, s]) => [pos, { hands: s.hands, accuracy: s.hands > 0 ? Math.round((s.correct / s.hands) * 100) : 0 }])
    );

    const scenarioStats: Breakdown[] = Object.entries(scenMap)
      .map(([key, s]) => ({
        key,
        label: SCENARIO_LABELS[key] ?? key,
        hands: s.hands,
        accuracy: Math.round((s.correct / s.hands) * 100),
      }))
      .sort((a, b) => b.hands - a.hands);

    const totalScore = sessions.reduce((a, s) => a + s.score, 0);

    setStats({
      totalHands: hands.length,
      totalScore,
      averageAccuracy: avgAcc,
      bestStreak,
      feedbackDistribution,
      positionStats,
      scenarioStats,
      recentTrend: trend,
      sessions: sessions.map(s => ({ id: s.id, startedAt: s.started_at, handsPlayed: s.hands_played, score: s.score, accuracy: Number(s.accuracy) })),
    });
    setLoading(false);
  }

  if (loading || !stats) {
    return (
      <MainLayout>
        <div className="p-8 flex items-center justify-center text-muted-foreground">
          Carregando estatísticas...
        </div>
      </MainLayout>
    );
  }

  const irTreinar = () => navigate('/treinar');

  // Precisão sessão a sessão, em ordem cronológica
  const accuracyOverTime = [...stats.sessions]
    .filter(s => s.handsPlayed >= 5)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .map((s, i) => ({
      i: i + 1,
      label: new Date(s.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      accuracy: Math.round(s.accuracy),
      hands: s.handsPlayed,
    }));

  const feedbackRows = [
    { key: 'best', label: 'Melhor jogada', value: stats.feedbackDistribution.best, color: 'hsl(var(--feedback-best))' },
    { key: 'correct', label: 'Correta', value: stats.feedbackDistribution.correct, color: 'hsl(var(--feedback-correct))' },
    { key: 'inaccuracy', label: 'Imprecisão', value: stats.feedbackDistribution.inaccuracy, color: 'hsl(var(--feedback-inaccuracy))' },
    { key: 'mistake', label: 'Erro', value: stats.feedbackDistribution.mistake, color: 'hsl(var(--feedback-mistake))' },
    { key: 'blunder', label: 'Erro grave', value: stats.feedbackDistribution.blunder, color: 'hsl(var(--feedback-blunder))' },
  ];

  const positionRows = POSITIONS
    .map(pos => ({
      key: pos,
      label: pos,
      hands: stats.positionStats[pos]?.hands || 0,
      accuracy: stats.positionStats[pos]?.accuracy || 0,
    }))
    .filter(p => p.hands > 0);

  const TrendIcon = stats.recentTrend === 'improving' ? TrendingUp :
                    stats.recentTrend === 'declining' ? TrendingDown : Minus;
  const trendColor = stats.recentTrend === 'improving' ? 'text-feedback-best' :
                     stats.recentTrend === 'declining' ? 'text-feedback-blunder' : 'text-muted-foreground';

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Vazamento: pior posição ou cenário com amostra suficiente
  const candidatosVazamento = [
    ...positionRows.filter(p => p.hands >= MIN_MAOS_RELEVANTE).map(p => ({ tipo: 'posição', nome: p.label, acc: p.accuracy, hands: p.hands })),
    ...stats.scenarioStats.filter(s => s.hands >= MIN_MAOS_RELEVANTE).map(s => ({ tipo: 'cenário', nome: s.label, acc: s.accuracy, hands: s.hands })),
  ];
  const vazamento = candidatosVazamento.length > 0
    ? candidatosVazamento.reduce((pior, c) => (c.acc < pior.acc ? c : pior))
    : null;

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Análise de Desempenho
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Desempenho de <span className="capitalize font-medium">{currentMonth}</span>
            <span className="inline-flex items-center gap-1 ml-2 text-xs">
              <Info className="h-3 w-3" />
              reinicia todo mês
            </span>
          </p>
        </div>

        {/* Números do mês */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Target className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Precisão</p>
              </div>
              <p className="text-3xl font-bold tabular-nums">{stats.averageAccuracy}%</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalHands} mãos no mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Trophy className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">XP no mês</p>
              </div>
              <p className="text-3xl font-bold tabular-nums text-primary">{stats.totalScore}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.sessions.length} sessões</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Zap className="h-4 w-4" />
                <p className="text-xs uppercase tracking-wide">Melhor sequência</p>
              </div>
              <p className="text-3xl font-bold tabular-nums">{stats.bestStreak}</p>
              <p className="text-xs text-muted-foreground mt-1">acertos seguidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendIcon className={cn('h-4 w-4', trendColor)} />
                <p className="text-xs uppercase tracking-wide">Tendência</p>
              </div>
              <p className={cn('text-2xl font-bold', trendColor)}>
                {stats.recentTrend === 'improving' ? 'Melhorando' :
                 stats.recentTrend === 'declining' ? 'Caindo' : 'Estável'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">últimas 5 sessões</p>
            </CardContent>
          </Card>
        </div>

        {/* Nível */}
        {authProfile && (
          <Card className="mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <h2 className="text-heading-sm truncate">{getLevelName(level)}</h2>
                    <p className="text-sm text-muted-foreground">Nível {level}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/ranking')} className="gap-2 shrink-0">
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver ranking</span>
                  </Button>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-primary tabular-nums">{totalXp}</p>
                  <p className="text-sm text-muted-foreground">XP total</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${levelProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {levelProgress.next === Infinity
                    ? 'Nível máximo atingido'
                    : `${levelProgress.next - totalXp} XP para o próximo nível`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evolução + decisões */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-heading-xs">Precisão por sessão</CardTitle>
              <p className="text-xs text-muted-foreground">
                {accuracyOverTime.length > 1
                  ? 'Cada ponto é uma sessão; a linha tracejada é sua média do mês'
                  : 'Aparece quando você tiver mais de uma sessão de 5+ mãos'}
              </p>
            </CardHeader>
            <CardContent>
              {accuracyOverTime.length > 1 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={accuracyOverTime} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelFormatter={(l) => `Sessão de ${l}`}
                      formatter={(value: number, _n, item: any) => [`${value}% em ${item?.payload?.hands ?? 0} mãos`, 'Precisão']}
                    />
                    <ReferenceLine
                      y={stats.averageAccuracy}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={accuracyOverTime.length <= 15 ? { r: 4, fill: 'hsl(var(--primary))' } : false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState texto="Ainda não há sessões suficientes para mostrar evolução." onTreinar={irTreinar} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-heading-xs">Como você decidiu</CardTitle>
              <p className="text-xs text-muted-foreground">Distribuição das {stats.totalHands} mãos do mês</p>
            </CardHeader>
            <CardContent>
              {stats.totalHands > 0 ? (
                <div className="space-y-3 py-2">
                  {feedbackRows.map(row => (
                    <BarRow
                      key={row.key}
                      label={row.label}
                      pct={(row.value / stats.totalHands) * 100}
                      color={row.color}
                      right={`${Math.round((row.value / stats.totalHands) * 100)}%`}
                      hint={`${row.value} mãos`}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState texto="Nenhuma mão jogada este mês." onTreinar={irTreinar} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Vazamento */}
        {vazamento && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Onde focar agora</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seu ponto mais fraco é {vazamento.tipo}{' '}
                    <span className="font-bold text-primary">{vazamento.nome}</span>: {' '}
                    <span className="font-bold text-foreground">{vazamento.acc}%</span> de precisão em {vazamento.hands} mãos.
                  </p>
                  <Button size="sm" className="mt-3 gap-2" onClick={irTreinar}>
                    <Play className="h-4 w-4" />
                    Treinar isso
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posição + cenário */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-heading-xs">Precisão por posição</CardTitle>
              <p className="text-xs text-muted-foreground">Cinza: menos de {MIN_MAOS_RELEVANTE} mãos, amostra pequena demais</p>
            </CardHeader>
            <CardContent>
              {positionRows.length > 0 ? (
                <div className="space-y-3 py-2">
                  {positionRows.map(p => (
                    <BarRow
                      key={p.key}
                      label={p.label}
                      pct={p.accuracy}
                      right={`${p.accuracy}%`}
                      hint={`${p.hands} mãos`}
                      muted={p.hands < MIN_MAOS_RELEVANTE}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState texto="Jogue algumas mãos para ver seu desempenho por posição." onTreinar={irTreinar} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-heading-xs">Precisão por cenário</CardTitle>
              <p className="text-xs text-muted-foreground">Cinza: menos de {MIN_MAOS_RELEVANTE} mãos, amostra pequena demais</p>
            </CardHeader>
            <CardContent>
              {stats.scenarioStats.length > 0 ? (
                <div className="space-y-3 py-2">
                  {stats.scenarioStats.map(s => (
                    <BarRow
                      key={s.key}
                      label={s.label}
                      pct={s.accuracy}
                      right={`${s.accuracy}%`}
                      hint={`${s.hands} mãos`}
                      muted={s.hands < MIN_MAOS_RELEVANTE}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState texto="Jogue algumas mãos para ver seu desempenho por cenário." onTreinar={irTreinar} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sessões recentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-heading-xs">Sessões recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.sessions.length > 0 ? (
              <div className="divide-y divide-border">
                {stats.sessions.slice(0, 6).map((session) => (
                  <div key={session.id} className="flex items-center justify-between py-3 first:pt-1">
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(session.startedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.handsPlayed} mãos · {session.accuracy}% de precisão
                      </p>
                    </div>
                    <p className={cn(
                      'text-lg font-bold tabular-nums',
                      session.score > 0 ? 'text-feedback-best' : session.score < 0 ? 'text-feedback-blunder' : 'text-muted-foreground'
                    )}>
                      {session.score > 0 ? '+' : ''}{session.score}
                      <span className="text-xs font-normal text-muted-foreground ml-1">XP</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState texto="Nenhuma sessão registrada este mês." onTreinar={irTreinar} />
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
