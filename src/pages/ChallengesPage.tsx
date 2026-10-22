import { Link } from 'react-router-dom';
import { CalendarCheck, Zap } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/seo/SEO';
import { AchievementIcon } from '@/components/achievements/AchievementIcon';
import { DailyChallengesCard } from '@/components/challenges/DailyChallengesCard';
import { PeriodChallengesCards } from '@/components/challenges/PeriodChallengesCard';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENTS } from '@/data/achievements';
import { cn } from '@/lib/utils';

export default function ChallengesPage() {
  const { isUnlocked } = useAchievements();
  const conquistas = ACHIEVEMENTS.filter((a) => a.category === 'challenge');

  return (
    <MainLayout>
      <SEO title="Desafios — GTORei" description="Desafios do dia, da semana e do mês no treino." path="/desafios" noindex />
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
              <CalendarCheck className="h-8 w-8 text-primary" />
              Desafios
            </h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              Metas do dia, da semana e do mês. Cumpra no treino e resgate o XP aqui.
            </p>
          </div>
          <Button asChild>
            <Link to="/treinar">
              <Zap className="h-4 w-4" />
              Ir para o treino
            </Link>
          </Button>
        </div>

        <DailyChallengesCard />
        <PeriodChallengesCards />

        <div>
          <h2 className="text-heading-xs mb-3">Conquistas de desafio</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {conquistas.map((c) => {
              const feita = isUnlocked(c.key);
              return (
                <Card key={c.key} className={cn(feita ? 'border-primary/30 bg-primary/5' : 'opacity-70')}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className={cn(
                        'h-11 w-11 shrink-0 rounded-lg flex items-center justify-center',
                        feita ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <AchievementIcon achievement={c.key} className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{c.name}</p>
                      <p className="text-body-xs text-muted-foreground">{c.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
