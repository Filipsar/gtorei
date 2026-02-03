import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getUserStats, getUserProfile, getLevelName, getLevelProgress, getSessions } from '@/data/localStorage';
import { POSITIONS } from '@/data/gtoRanges';
import { 
  BarChart3, Target, Trophy, TrendingUp, TrendingDown, Minus, 
  Zap, CheckCircle2, AlertTriangle, XCircle, Skull 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { cn } from '@/lib/utils';

export default function AnalysisPage() {
  const stats = getUserStats();
  const profile = getUserProfile();
  const sessions = getSessions().slice(0, 10);
  const levelProgress = profile ? getLevelProgress(profile.totalScore) : { current: 0, next: 500, progress: 0 };

  // Prepare chart data
  const sessionChartData = sessions.map((s, idx) => ({
    name: `S${sessions.length - idx}`,
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

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Análise de Desempenho
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe seu progresso e identifique áreas de melhoria
          </p>
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
                  <p className="text-sm text-muted-foreground">Score Total</p>
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
        {profile && (
          <Card className="mb-6">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{getLevelName(profile.level)}</h2>
                  <p className="text-sm text-muted-foreground">
                    {stats.totalHands} mãos treinadas
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{profile.totalScore}</p>
                  <p className="text-sm text-muted-foreground">pontos totais</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Nível {profile.level}</span>
                  <span>{levelProgress.progress}%</span>
                </div>
                <Progress value={levelProgress.progress} className="h-3" />
                <p className="text-xs text-muted-foreground text-center">
                  {levelProgress.next === Infinity 
                    ? 'Nível máximo atingido!' 
                    : `${levelProgress.next - profile.totalScore} pontos para o próximo nível`}
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
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={250}>
                    <PieChart>
                      <Pie
                        data={feedbackChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
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
                  <div className="flex-1 space-y-2">
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
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
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
                      <p className="text-xs text-muted-foreground">pontos</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma sessão registrada ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
