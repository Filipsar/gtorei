import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Medal, Award, CalendarRange, Info, ChevronLeft, ChevronRight } from 'lucide-react';
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
import levelGTORei from '@/assets/levels/GTORei.png';

const LEVEL_IMAGES: Record<number, string> = {
  1: levelIniciante,
  2: levelAmador,
  3: levelIntermediario,
  4: levelAvancado,
  5: levelExpert,
  6: levelMestre,
  7: levelLenda,
  8: levelGTORei,
};

const getLevelImage = (level: number) => LEVEL_IMAGES[level] || levelIniciante;
const getLevelFxClass = (level: number) =>
  level === 8 ? 'led-pulse' : level === 7 ? 'fire-pulse' : '';

/** Milhar com ponto, como se escreve em português */
const formatarXp = (xp: number) => xp.toLocaleString('pt-BR');

/**
 * Cada degrau do pódio. A altura é por COLOCAÇÃO, não pela ordem em que as
 * colunas são desenhadas — trocar as duas coisas era o que deixava o segundo
 * lugar com o degrau mais alto que o do campeão.
 */
const PODIO: Record<number, {
  degrau: string;
  avatar: string;
  anel: string;
  texto: string;
  borda: string;
  faixa: string;
}> = {
  1: {
    degrau: 'h-20 sm:h-28',
    avatar: 'h-16 w-16 sm:h-20 sm:w-20',
    anel: 'ring-rank-first',
    texto: 'text-rank-first',
    borda: 'border-rank-first/40',
    faixa: 'from-rank-first/30 to-rank-first/5',
  },
  2: {
    degrau: 'h-14 sm:h-20',
    avatar: 'h-12 w-12 sm:h-14 sm:w-14',
    anel: 'ring-rank-second',
    texto: 'text-rank-second',
    borda: 'border-rank-second/40',
    faixa: 'from-rank-second/25 to-rank-second/5',
  },
  3: {
    degrau: 'h-10 sm:h-14',
    avatar: 'h-12 w-12 sm:h-14 sm:w-14',
    anel: 'ring-rank-third',
    texto: 'text-rank-third',
    borda: 'border-rank-third/40',
    faixa: 'from-rank-third/25 to-rank-third/5',
  },
};

/** Esquerda, meio, direita: o campeão fica no centro, entre o 2º e o 3º */
const ORDEM_NO_PODIO = [1, 0, 2];

const PONTUACAO = [
  { rotulo: 'Best', pts: '+15', classe: 'border-feedback-best/40 bg-feedback-best/10 text-feedback-best' },
  { rotulo: 'Correct', pts: '+10', classe: 'border-feedback-best/30 bg-feedback-best/5 text-feedback-best' },
  { rotulo: 'Inaccuracy', pts: '−3', classe: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500' },
  { rotulo: 'Mistake', pts: '−8', classe: 'border-orange-500/40 bg-orange-500/10 text-orange-500' },
  { rotulo: 'Blunder', pts: '−30', classe: 'border-destructive/40 bg-destructive/10 text-destructive' },
];

const NIVEIS = [
  { name: 'Iniciante', xp: '0', img: levelIniciante, fx: '' },
  { name: 'Amador', xp: '150', img: levelAmador, fx: '' },
  { name: 'Intermediário', xp: '1.000', img: levelIntermediario, fx: '' },
  { name: 'Avançado', xp: '3.500', img: levelAvancado, fx: '' },
  { name: 'Expert', xp: '8.000', img: levelExpert, fx: '' },
  { name: 'Mestre', xp: '17.500', img: levelMestre, fx: '' },
  { name: 'Lenda', xp: '100.000', img: levelLenda, fx: 'fire-pulse' },
  { name: 'GTO Rei', xp: '250.000', img: levelGTORei, fx: 'led-pulse' },
];

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
    const start = new Date(2026, 1, 1); // February 2026
    let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    while (cursor >= start) {
      opts.push({
        value: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`,
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
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
        .eq('period_start', `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`)
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

  const getRankIcon = (position: number, className = 'h-5 w-5') => {
    switch (position) {
      case 1:
        return <Trophy className={cn(className, 'text-rank-first')} />;
      case 2:
        return <Medal className={cn(className, 'text-rank-second')} />;
      case 3:
        return <Award className={cn(className, 'text-rank-third')} />;
      default:
        return (
          <span className="text-body-sm font-bold tabular-nums text-muted-foreground">
            {position}
          </span>
        );
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(rankings.length / ITEMS_PER_PAGE));
  const paginaAtual = rankings.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Cabeçalho com o seletor de mês ao lado: o seletor ocupava um cartão
            inteiro só para ele. */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
              <Trophy className="h-8 w-8 text-primary" />
              Ranking
            </h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Veja os melhores jogadores do período
            </p>
          </div>

          <Select
            value={`${selectedYear}-${selectedMonth}`}
            onValueChange={(v) => {
              const [y, m] = v.split('-').map(Number);
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
          >
            <SelectTrigger className="w-full sm:w-52" aria-label="Selecione o mês">
              <CalendarRange className="mr-2 h-4 w-4 shrink-0 text-primary" />
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
        </div>

        {/* Pódio */}
        {!loading && rankings.length > 0 && (
          <Card className="mb-4 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-heading-xs flex items-center gap-2">
                <Trophy className="h-4 w-4 text-rank-first" />
                Top 3 — {MONTH_NAMES[selectedMonth]} {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* items-end apoia as três colunas no mesmo chão. Sem isso cada
                  degrau começava numa altura, porque o avatar do campeão é
                  maior e empurrava a coluna dele para baixo. */}
              <div className="grid grid-cols-3 items-end gap-2 px-4 sm:gap-4 sm:px-6">
                {ORDEM_NO_PODIO.map((idx) => {
                  const entry = rankings[idx];
                  if (!entry) return <div key={idx} />;
                  const position = idx + 1;
                  const cfg = PODIO[position];
                  const ehVoce = user?.id === entry.user_id;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => navigate(`/perfil/${entry.user_id}`)}
                      className="group flex flex-col items-center focus-visible:outline-none"
                      aria-label={`${position}º lugar: ${entry.profile.username}, ${entry.xp_earned} XP`}
                    >
                      <div className="relative mb-2">
                        <Avatar
                          className={cn(
                            'ring-2 ring-offset-2 ring-offset-card transition-transform group-hover:scale-105',
                            cfg.avatar,
                            cfg.anel,
                          )}
                        >
                          <AvatarImage src={entry.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 font-bold text-primary">
                            {entry.profile.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute -bottom-1 -right-1 rounded-full border bg-card p-1',
                            cfg.borda,
                          )}
                        >
                          {getRankIcon(position, 'h-3.5 w-3.5')}
                        </span>
                      </div>

                      <div className="flex w-full items-center justify-center gap-1">
                        <img
                          src={getLevelImage(entry.profile.level)}
                          alt=""
                          className={cn(
                            'h-4 w-4 shrink-0 object-contain',
                            getLevelFxClass(entry.profile.level),
                          )}
                        />
                        <span className="truncate text-body-xs font-medium sm:text-body-sm">
                          {entry.profile.username}
                        </span>
                      </div>

                      <p className={cn('text-body-xs font-bold tabular-nums', cfg.texto)}>
                        {formatarXp(entry.xp_earned)} XP
                      </p>

                      {ehVoce && (
                        <Badge
                          variant="outline"
                          className="mt-1 h-4 border-primary/50 px-1.5 text-[10px] text-primary"
                        >
                          Você
                        </Badge>
                      )}

                      <div
                        className={cn(
                          'mt-2 flex w-full items-center justify-center rounded-t-lg border-x border-t bg-gradient-to-b text-lg font-bold',
                          cfg.degrau,
                          cfg.faixa,
                          cfg.borda,
                          cfg.texto,
                        )}
                      >
                        {position}º
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-xs flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              Top Jogadores — {isCurrentMonth ? 'Este Mês' : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                    <Skeleton className="h-5 w-12" />
                  </div>
                ))}
              </div>
            ) : rankings.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Trophy className="mx-auto mb-4 h-12 w-12 opacity-40" />
                <p className="text-body-md">Nenhum jogador no ranking ainda.</p>
                <p className="text-body-sm mt-2">Seja o primeiro a treinar!</p>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  {paginaAtual.map((entry, idx) => {
                    const posicao = currentPage * ITEMS_PER_PAGE + idx + 1;
                    const ehVoce = user?.id === entry.user_id;
                    const bordaDoTopo =
                      posicao === 1 ? 'border-l-rank-first' :
                      posicao === 2 ? 'border-l-rank-second' :
                      posicao === 3 ? 'border-l-rank-third' :
                      'border-l-transparent';

                    return (
                      <div
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/perfil/${entry.user_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/perfil/${entry.user_id}`);
                          }
                        }}
                        className={cn(
                          // Grade fixa: o nome é a única coluna que encolhe, então
                          // no celular ele corta em vez de empurrar o XP para baixo.
                          'grid cursor-pointer grid-cols-[1.75rem_auto_1fr_auto] items-center gap-2 rounded-lg border-l-2 p-2.5 transition-colors sm:gap-3 sm:p-3',
                          'bg-muted/40 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                          bordaDoTopo,
                          ehVoce && 'bg-primary/10 ring-1 ring-primary/40 hover:bg-primary/15',
                        )}
                      >
                        <div className="flex justify-center">{getRankIcon(posicao)}</div>

                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                          <AvatarImage src={entry.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-body-sm font-semibold text-primary">
                            {entry.profile.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={getLevelImage(entry.profile.level)}
                              alt=""
                              className={cn(
                                'h-4 w-4 shrink-0 object-contain',
                                getLevelFxClass(entry.profile.level),
                              )}
                            />
                            <p className="truncate font-medium leading-tight">
                              {entry.profile.username}
                            </p>
                            {ehVoce && (
                              <Badge
                                variant="outline"
                                className="h-4 shrink-0 border-primary/50 px-1.5 text-[10px] text-primary"
                              >
                                Você
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-body-xs text-muted-foreground">
                            {getLevelName(entry.profile.level)} · {entry.hands_played} mãos · {entry.accuracy}% precisão
                          </p>
                        </div>

                        <div className="shrink-0 pl-1 text-right">
                          <p className="font-bold leading-tight tabular-nums text-primary">
                            {formatarXp(entry.xp_earned)}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            XP
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {rankings.length > ITEMS_PER_PAGE && (
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
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
                      Página {currentPage + 1} de {totalPaginas}
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

        {/* Pontuação: o cartão tinha só o título e um ícone de informação, e
            parecia um cartão vazio. A tabela de pontos agora fica à vista. */}
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-xs flex items-center gap-2">
              Como funciona a pontuação?
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                    aria-label="Detalhes da pontuação"
                  >
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-3 text-sm" side="top">
                  <p className="font-semibold text-foreground">Sistema de Pontuação</p>
                  <div className="space-y-2 text-muted-foreground">
                    <p>Cada decisão no treino é avaliada pelo GTO e gera pontos:</p>
                    <ul className="list-disc space-y-1 pl-4">
                      <li><span className="font-medium text-green-500">Best:</span> +15 pts base</li>
                      <li><span className="font-medium text-green-400">Correct:</span> +10 pts base</li>
                      <li><span className="font-medium text-yellow-500">Inaccuracy:</span> -3 pts base</li>
                      <li><span className="font-medium text-orange-500">Mistake:</span> -8 pts base</li>
                      <li><span className="font-medium text-destructive">Blunder:</span> -30 pts base</li>
                    </ul>
                    <p className="pt-1">Os pontos são ajustados pelo seu <strong>Rank atual</strong>: ranks mais altos ganham menos pontos e perdem mais. Erros consecutivos dobram a penalidade.</p>
                    <p className="pt-1">⚡ <strong>Dificuldade progressiva:</strong> A partir do Intermediário, o sistema prioriza mãos marginais (decisões mais difíceis), aumentando a chance conforme o rank sobe.</p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {PONTUACAO.map((p) => (
                <span
                  key={p.rotulo}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-body-xs font-medium',
                    p.classe,
                  )}
                >
                  {p.rotulo}
                  <span className="tabular-nums opacity-80">{p.pts}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-body-xs text-muted-foreground">
              Pontos base. Ranks mais altos ganham menos e perdem mais, e erros seguidos dobram a penalidade.
            </p>
          </CardContent>
        </Card>

        {/* Ranks */}
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-heading-xs">Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {NIVEIS.map((level) => (
                <div
                  key={level.name}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 transition-colors hover:bg-muted/70"
                >
                  <img
                    src={level.img}
                    alt={level.name}
                    className={cn('h-8 w-8 shrink-0 object-contain', level.fx)}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium">{level.name}</p>
                    <p className="text-body-xs tabular-nums text-muted-foreground">{level.xp}+ XP</p>
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
