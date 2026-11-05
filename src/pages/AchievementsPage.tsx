import { useEffect, useState } from 'react';
import { BlocoDeAnuncio } from '@/components/layout/BlocoDeAnuncio';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trophy, Lock, Info, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENTS, AVISO_DO_ALEATORIO, CATEGORY_LABELS, CATEGORY_ORDER, getAchievement } from '@/data/achievements';
import { AchievementIcon } from '@/components/achievements/AchievementIcon';
import { MAX_DESTAQUES, alternarDestaque, lerDestaques, salvarDestaques } from '@/lib/destaques';
import { cn } from '@/lib/utils';

export default function AchievementsPage() {
  const { user } = useAuth();
  const { isUnlocked, unlockedKeys } = useAchievements();
  // null: ainda carregando ou a coluna não existe no banco (sem botão de destaque)
  const [destaques, setDestaques] = useState<string[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    void lerDestaques(user.id).then(setDestaques);
  }, [user]);

  const totalUnlocked = unlockedKeys.size;
  const totalAchievements = ACHIEVEMENTS.length;
  const progressPercent = Math.round((totalUnlocked / totalAchievements) * 100);

  const alternar = async (chave: string) => {
    if (!user || destaques === null || salvando) return;
    const nova = alternarDestaque(destaques, chave);
    if (!nova) {
      toast.info(`Você já destacou ${MAX_DESTAQUES}. Tire uma para escolher outra.`);
      return;
    }
    const anterior = destaques;
    setDestaques(nova);
    setSalvando(true);
    const ok = await salvarDestaques(user.id, nova);
    setSalvando(false);
    if (!ok) {
      setDestaques(anterior);
      toast.error('Não deu para salvar o destaque. Tente de novo.');
    }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-heading-md sm:text-heading-lg text-foreground flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            Conquistas
          </h1>
          <p className="text-body-sm text-muted-foreground mt-1">
            {totalUnlocked}/{totalAchievements} desbloqueadas ({progressPercent}%)
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full bg-muted mb-6 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Destaques do perfil */}
        {destaques !== null && (
          <Card className="mb-6 border-primary/30">
            <CardContent className="p-4">
              <p className="font-medium text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" aria-hidden="true" />
                Em destaque no seu perfil ({destaques.length}/{MAX_DESTAQUES})
              </p>
              <p className="text-body-xs text-muted-foreground mt-1">
                Toque na estrela de uma conquista desbloqueada para mostrar no perfil. Até {MAX_DESTAQUES}.
              </p>
              {destaques.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {destaques.map((k) => {
                    const a = getAchievement(k);
                    return a ? (
                      <li key={k} className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1 pl-1.5 pr-3 text-sm">
                        <AchievementIcon achievement={k} className="h-5 w-5 text-primary" />
                        {a.name}
                      </li>
                    ) : null;
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Categories */}
        {CATEGORY_ORDER.map(cat => {
          const items = ACHIEVEMENTS.filter(a => a.category === cat);
          const catUnlocked = items.filter(a => isUnlocked(a.key)).length;

          return (
            <div key={cat} className="mb-6">
              <h2 className="text-heading-xs text-foreground mb-3 flex items-center gap-2">
                {CATEGORY_LABELS[cat]}
                <Badge variant="outline" className="text-body-xs">
                  {catUnlocked}/{items.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(achievement => {
                  const unlocked = isUnlocked(achievement.key);
                  const destacada = destaques?.includes(achievement.key) ?? false;
                  return (
                    <Card
                      key={achievement.key}
                      className={cn(
                        'transition-all',
                        unlocked ? 'border-primary/30 bg-primary/5' : 'opacity-60 grayscale'
                      )}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn(
                          'w-12 h-12 flex items-center justify-center rounded-lg shrink-0',
                          unlocked ? 'bg-primary/10 text-primary' : 'bg-muted'
                        )}>
                          {unlocked
                            ? <AchievementIcon achievement={achievement.key} className="h-7 w-7" />
                            : <Lock className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground flex items-center gap-1">
                            {achievement.name}
                            {achievement.soNoAleatorio && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={`Como ganhar ${achievement.name}`}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <Info className="h-4 w-4" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 text-sm">{AVISO_DO_ALEATORIO}</PopoverContent>
                              </Popover>
                            )}
                          </p>
                          <p className="text-body-xs text-muted-foreground">{achievement.description}</p>
                        </div>
                        {unlocked && destaques !== null ? (
                          <button
                            type="button"
                            onClick={() => void alternar(achievement.key)}
                            disabled={salvando}
                            aria-pressed={destacada}
                            aria-label={destacada ? `Tirar ${achievement.name} do destaque` : `Destacar ${achievement.name} no perfil`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                          >
                            <Star className={cn('h-5 w-5', destacada ? 'fill-primary text-primary' : 'text-muted-foreground')} />
                          </button>
                        ) : unlocked ? (
                          <Badge className="bg-primary/20 text-primary border-0 shrink-0">✓</Badge>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
        <BlocoDeAnuncio />
      </div>
    </MainLayout>
  );
}
