import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Award, TrendingUp, CalendarRange, Info, ChevronLeft, ChevronRight } from 'lucide-react';
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
 
type PeriodType = 'monthly';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function RankingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period] = useState<PeriodType>('monthly');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const ITEMS_PER_PAGE = 10;

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string; year: number; month: number }[] = [];
    const today = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      opts.push({
        value: `${d.getFullYear()}-${d.getMonth()}`,
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }
    return opts;
  }, []);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  useEffect(() => {
    setCurrentPage(0);
    fetchRankings();
  }, [period, selectedYear, selectedMonth]);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const periodStart = new Date(selectedYear, selectedMonth, 1);

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
 
        {/* Month Selector */}
        <Card className="mb-4">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-body-sm font-medium text-foreground flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              Selecione o mês:
            </label>
            <Select
              value={`${selectedYear}-${selectedMonth}`}
              onValueChange={(v) => {
                const [y, m] = v.split('-').map(Number);
                setSelectedYear(y);
                setSelectedMonth(m);
              }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Top 3 Podium */}
        {!loading && rankings.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-heading-xs flex items-center gap-2">
                <Trophy className="h-4 w-4 text-rank-first" />
                Top 3 - {MONTH_NAMES[selectedMonth]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[1, 0, 2].map((idx) => {
                  const entry = rankings[idx];
                  if (!entry) return <div key={idx} />;
                  const position = idx + 1;
                  const heights = ['h-28', 'h-36', 'h-24'];
                  const order = idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3';
                  return (
                    <div key={entry.id} className={cn('flex flex-col items-center', order)}>
                      <Avatar
                        className={cn(
                          'mb-2 cursor-pointer',
                          position === 1 ? 'h-16 w-16 ring-2 ring-rank-first' : 'h-12 w-12',
                          position === 2 && 'ring-2 ring-rank-second',
                          position === 3 && 'ring-2 ring-rank-third',
                        )}
                        onClick={() => navigate(`/perfil/${entry.user_id}`)}
                      >
                        <AvatarImage src={entry.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {entry.profile.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-body-xs sm:text-body-sm font-medium truncate max-w-full text-center">
                        {entry.profile.username}
                      </p>
                      <p className="text-body-xs text-primary font-bold">{entry.xp_earned} XP</p>
                      <div
                        className={cn(
                          'mt-2 w-full rounded-t-lg flex items-start justify-center pt-2 font-bold text-lg',
                          heights[idx],
                          position === 1 && 'bg-rank-first/20 text-rank-first',
                          position === 2 && 'bg-rank-second/20 text-rank-second',
                          position === 3 && 'bg-rank-third/20 text-rank-third',
                        )}
                      >
                        {position}º
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rankings List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-heading-xs flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Top Jogadores - {isCurrentMonth ? 'Este Mês' : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
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
              <>
              <div className="space-y-2">
                {rankings.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE).map((entry, idx) => {
                  const globalIndex = currentPage * ITEMS_PER_PAGE + idx;
                  return (
                  <div
                    key={entry.id}
                    onClick={() => navigate(`/perfil/${entry.user_id}`)}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer hover:ring-1 hover:ring-primary/30',
                      globalIndex < 3 ? 'bg-primary/5' : 'bg-muted/50',
                      user?.id === entry.user_id && 'ring-2 ring-primary/50'
                    )}
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(globalIndex + 1)}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {entry.profile.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
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
                    <div className="text-right">
                      <p className="font-bold text-primary flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {entry.xp_earned}
                      </p>
                      <p className="text-body-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                  );
                })}
              </div>
              {rankings.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 0}
                    className="flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-body-sm text-muted-foreground">
                    Página {currentPage + 1} de {Math.ceil(rankings.length / ITEMS_PER_PAGE)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={(currentPage + 1) * ITEMS_PER_PAGE >= rankings.length}
                    className="flex items-center gap-1"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              </>
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
