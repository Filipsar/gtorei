import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Award, TrendingUp, Calendar, CalendarDays, CalendarRange, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getLevelName } from '@/data/localStorage';

import levelIniciante from '@/assets/levels/Iniciante.png';
import levelAmador from '@/assets/levels/Amador.png';
import levelIntermediario from '@/assets/levels/Intermediario.png';
import levelAvancado from '@/assets/levels/Avancado.png';
import levelExpert from '@/assets/levels/Expert.png';
import levelMestre from '@/assets/levels/Mestre.png';
import levelLenda from '@/assets/levels/Lenda.png';

const LEVEL_IMAGES: Record<number, string> = {
  1: levelIniciante,
  2: levelAmador,
  3: levelIntermediario,
  4: levelAvancado,
  5: levelExpert,
  6: levelMestre,
  7: levelLenda,
};

const getLevelImage = (level: number) => LEVEL_IMAGES[level] || levelIniciante;

interface RankingEntry {
  id: string;
  user_id: string;
  xp_earned: number;
  hands_played: number;
  accuracy: number;
  profile: {
    username: string;
    avatar_url: string | null;
    level: number;
    total_xp: number;
  };
}
 
type PeriodType = 'daily' | 'weekly' | 'monthly';
 
export default function RankingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    fetchRankings();
  }, [period]);
 
  const fetchRankings = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let periodStart: Date;
      
      switch (period) {
        case 'daily':
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'weekly':
          const dayOfWeek = now.getDay();
          periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
          break;
        case 'monthly':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
      }

      const { data, error } = await supabase
        .from('rankings')
        .select(`
          id,
          user_id,
          xp_earned,
          hands_played,
          accuracy,
         profiles (
            username,
            avatar_url,
            level,
            total_xp
          )
        `)
        .eq('period_type', period)
        .eq('period_start', periodStart.toISOString().split('T')[0])
        .order('xp_earned', { ascending: false })
        .limit(100);

      if (error) throw error;

      const formattedData = (data || []).map((entry: any) => ({
        ...entry,
        profile: entry.profiles || { username: 'Anônimo', avatar_url: null, level: 1, total_xp: 0 },
      }));

      setRankings(formattedData);
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setLoading(false);
    }
  };
 
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-rank-first" />;
      case 2:
        return <Medal className="h-6 w-6 text-rank-second" />;
      case 3:
        return <Award className="h-6 w-6 text-rank-third" />;
      default:
        return <span className="w-6 text-center font-bold text-muted-foreground">{position}</span>;
    }
  };
 
  const getPeriodIcon = (p: PeriodType) => {
    switch (p) {
      case 'daily':
        return <Calendar className="h-4 w-4" />;
      case 'weekly':
        return <CalendarDays className="h-4 w-4" />;
      case 'monthly':
        return <CalendarRange className="h-4 w-4" />;
    }
  };
 
  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Ranking
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            Veja os melhores jogadores do período
          </p>
        </div>
 
        {/* Period Tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Diário</span>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Semanal</span>
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              <span className="hidden sm:inline">Mensal</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
 
        {/* Rankings List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-heading-xs flex items-center gap-2">
              {getPeriodIcon(period)}
              Top Jogadores - {period === 'daily' ? 'Hoje' : period === 'weekly' ? 'Esta Semana' : 'Este Mês'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                Carregando ranking...
              </div>
            ) : rankings.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-body-md">Nenhum jogador no ranking ainda.</p>
                <p className="text-body-sm mt-2">Seja o primeiro a treinar!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rankings.map((entry, index) => (
                  <div
                    key={entry.id}
                    onClick={() => navigate(`/perfil/${entry.user_id}`)}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer hover:ring-1 hover:ring-primary/30',
                      index < 3 ? 'bg-primary/5' : 'bg-muted/50',
                      user?.id === entry.user_id && 'ring-2 ring-primary/50'
                    )}
                  >
                    {/* Position */}
                    <div className="w-8 flex justify-center">
                      {getRankIcon(index + 1)}
                    </div>
 
                    {/* Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {entry.profile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
 
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <img src={getLevelImage(entry.profile.level)} alt="" className="w-5 h-5 object-contain" />
                        <p className="font-medium truncate">{entry.profile.username}</p>
                        {user?.id === entry.user_id && (
                          <Badge variant="outline" className="text-body-xs">Você</Badge>
                        )}
                      </div>
                      <p className="text-body-xs text-muted-foreground">
                        {getLevelName(entry.profile.level)} • {entry.hands_played} mãos • {entry.accuracy}% precisão
                      </p>
                    </div>
 
                    {/* XP */}
                    <div className="text-right">
                      <p className="font-bold text-primary flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {entry.xp_earned}
                      </p>
                      <p className="text-body-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
 
        {/* Scoring Info Card */}
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-heading-xs flex items-center gap-2">
              Como funciona a pontuação?
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center justify-center rounded-full w-6 h-6 bg-muted hover:bg-muted/80 transition-colors">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm space-y-3" side="top">
                  <p className="font-semibold text-foreground">Sistema de Pontuação</p>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Cada decisão no treino é avaliada pelo GTO e gera pontos:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><span className="text-green-500 font-medium">Best:</span> +15 pts base</li>
                      <li><span className="text-green-400 font-medium">Correct:</span> +10 pts base</li>
                      <li><span className="text-yellow-500 font-medium">Inaccuracy:</span> -3 pts base</li>
                      <li><span className="text-orange-500 font-medium">Mistake:</span> -8 pts base</li>
                      <li><span className="text-destructive font-medium">Blunder:</span> -30 pts base</li>
                    </ul>
                    <p className="pt-1">Os pontos são ajustados pelo seu <strong>Rank atual</strong>: ranks mais altos ganham menos pontos e perdem mais. Erros consecutivos dobram a penalidade.</p>
                    <p className="pt-1">⚡ <strong>Dificuldade progressiva:</strong> A partir do Intermediário, o sistema prioriza mãos marginais (decisões mais difíceis), aumentando a chance conforme o rank sobe.</p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Level Info Card */}
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-heading-xs">Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
             {[
                 { name: 'Iniciante', xp: '0', img: levelIniciante },
                 { name: 'Amador', xp: '150', img: levelAmador },
                 { name: 'Intermediário', xp: '1.000', img: levelIntermediario },
                 { name: 'Avançado', xp: '3.500', img: levelAvancado },
                 { name: 'Expert', xp: '8.000', img: levelExpert },
                 { name: 'Mestre', xp: '17.500', img: levelMestre },
                 { name: 'Lenda', xp: '25.000', img: levelLenda },
               ].map((level) => (
                 <div key={level.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                   <img src={level.img} alt={level.name} className="w-8 h-8 object-contain" />
                   <div>
                     <p className="text-body-sm font-medium">{level.name}</p>
                     <p className="text-body-xs text-muted-foreground">{level.xp}+ XP</p>
                   </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
