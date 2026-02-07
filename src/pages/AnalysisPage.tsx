import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { getLevelName, getLevelProgress } from '@/data/localStorage';
import { POSITIONS } from '@/data/gtoRanges';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { 
  BarChart3, Target, Trophy, TrendingUp, TrendingDown, Minus, Zap, Eye, Info
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { cn } from '@/lib/utils';

interface MonthlyStats {
  totalHands: number;
  totalScore: number;
  averageAccuracy: number;
  bestStreak: number;
  feedbackDistribution: { best: number; correct: number; inaccuracy: number; mistake: number; blunder: number };
  positionStats: Record<string, { hands: number; accuracy: number }>;
  recentTrend: 'improving' | 'stable' | 'declining';
  sessions: { id: string; startedAt: string; handsPlayed: number; score: number; accuracy: number }[];
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
        .select('feedback, position, points')
        .eq('user_id', userId)
        .gte('played_at', monthStart),
    ]);

    const sessions = sessionsRes.data ?? [];
    const hands = handsRes.data ?? [];

    const feedbackDistribution = { best: 0, correct: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    const posMap: Record<string, { hands: number; correct: number }> = {};
    POSITIONS.forEach(p => posMap[p] = { hands: 0, correct: 0 });

    let bestStreak = 0, currentStreak = 0;
    hands.forEach(h => {
      const fb = h.feedback as keyof typeof feedbackDistribution;
      if (fb in feedbackDistribution) feedbackDistribution[fb]++;
      if (posMap[h.position]) {
        posMap[h.position].hands++;
        if (fb === 'best' || fb === 'correct') posMap[h.position].correct++;
      }
      if (fb === 'best' || fb === 'correct') {
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

    const totalScore = sessions.reduce((a, s) => a + s.score, 0);

    setStats({
      totalHands: hands.length,
      totalScore,
      averageAccuracy: avgAcc,
      bestStreak,
      feedbackDistribution,
      positionStats,
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

  const sessionChartData = stats.sessions.slice(0, 10).map((s, idx) => ({
    name: `S${stats.sessions.slice(0, 10).length - idx}`,
    score: s.score,
    accuracy: s.accuracy,
  })).reverse();

  const feedbackChartData = [
    { name: 'Best', value: stats.feedbackDistribution.best, color: 'hsl(142, 71%, 45%)' },
    { name: 'Correct', value: stats.feedbackDistribution.correct, color: 'hsl(142, 50%, 40%)' },
    { name: 'Inaccuracy', value: stats.feedbackDistribution.inaccuracy, color: 'hsl(45, 100%, 50%)' },
    { name: 'Mistake', value: stats.feedbackDistribution.mistake, color: 'hsl(25, 95%, 53%)' },
    { name: 'Blunder', value: stats.feedbackDistribution.blunder, color: 'hsl(0, 72%, 51%)' },
  ].filter(d => d.value > 0);

  const positionChartData = POSITIONS.map(pos => ({
    name: pos,
    accuracy: stats.positionStats[pos]?.accuracy || 0,
    hands: stats.positionStats[pos]?.hands || 0,
  }));

  const TrendIcon = stats.recentTrend === 'improving' ? TrendingUp : 
                    stats.recentTrend === 'declining' ? TrendingDown : Minus;
  const trendColor = stats.recentTrend === 'improving' ? 'text-feedback-best' :
                     stats.recentTrend === 'declining' ? 'text-feedback-blunder' : 'text-muted-foreground';

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Análise de Desempenho
          </h1>
          <p className="text-muted-foreground mt-1">
            Desempenho de <span className="capitalize font-medium">{currentMonth}</span>
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 w-fit">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>O desempenho é resetado mensalmente</span>
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">XP Total</p>
                  <p className="text-2xl font-bold">{stats.totalScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/20">
                  <Target className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precisão</p>
                  <p className="text-2xl font-bold">{stats.averageAccuracy}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-feedback-best/20">
                  <Zap className="h-5 w-5 text-feedback-best" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Melhor Streak</p>
                  <p className="text-2xl font-bold">{stats.bestStreak}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', 
                  stats.recentTrend === 'improving' ? 'bg-feedback-best/20' :
                  stats.recentTrend === 'declining' ? 'bg-feedback-blunder/20' : 'bg-muted'
                )}>
                  <TrendIcon className={cn('h-5 w-5', trendColor)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tendência</p>
                  <p className={cn('text-lg font-bold capitalize', trendColor)}>
                    {stats.recentTrend === 'improving' ? 'Melhorando' :
                     stats.recentTrend === 'declining' ? 'Declinando' : 'Estável'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Level progress */}
        {authProfile && (
          <Card className="mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold">{getLevelName(level)}</h2>
                    <p className="text-sm text-muted-foreground">
                      {stats.totalHands} mãos este mês
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/ranking')}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver Ranking</span>
                  </Button>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{totalXp}</p>
                  <p className="text-sm text-muted-foreground">
                    XP Total
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Nível {level}</span>
                  <span>{levelProgress.progress}%</span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full progress-animated transition-all duration-700 ease-out"
                    style={{ width: `${levelProgress.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {levelProgress.next === Infinity 
                    ? 'Nível máximo atingido!' 
                    : `${levelProgress.next - totalXp} XP para o próximo nível`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Score evolution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução do Score</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={sessionChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Jogue algumas sessões para ver estatísticas
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição de Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackChartData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-1/2 h-[200px] sm:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={feedbackChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {feedbackChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full sm:flex-1 space-y-2">
                    {feedbackChartData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm flex-1">{item.name}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhuma mão jogada ainda
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Position performance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Performance por Posição</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={positionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'accuracy' ? `${value}%` : value,
                    name === 'accuracy' ? 'Precisão' : 'Mãos'
                  ]}
                />
                <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sessões Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.sessions.length > 0 ? (
              <div className="space-y-3">
                {stats.sessions.slice(0, 5).map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(session.startedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {session.handsPlayed} mãos • {session.accuracy}% precisão
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-lg font-bold',
                        session.score >= 0 ? 'text-feedback-best' : 'text-feedback-blunder'
                      )}>
                        {session.score > 0 ? '+' : ''}{session.score}
                      </p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sessão registrada este mês
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
