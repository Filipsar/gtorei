import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import { ACHIEVEMENTS, CATEGORY_LABELS, AchievementDef } from '@/data/achievements';
import { cn } from '@/lib/utils';

export default function AchievementsPage() {
  const { isUnlocked, unlockedKeys } = useAchievements();

  const categories = ['level', 'streak', 'volume', 'accuracy'] as const;

  const totalUnlocked = unlockedKeys.size;
  const totalAchievements = ACHIEVEMENTS.length;
  const progressPercent = Math.round((totalUnlocked / totalAchievements) * 100);

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

        {/* Categories */}
        {categories.map(cat => {
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
                  return (
                    <Card
                      key={achievement.key}
                      className={cn(
                        'transition-all',
                        unlocked
                          ? 'border-primary/30 bg-primary/5'
                          : 'opacity-60 grayscale'
                      )}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn(
                          'text-3xl w-12 h-12 flex items-center justify-center rounded-lg',
                          unlocked ? 'bg-primary/10' : 'bg-muted'
                        )}>
                          {unlocked ? achievement.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{achievement.name}</p>
                          <p className="text-body-xs text-muted-foreground">{achievement.description}</p>
                        </div>
                        {unlocked && (
                          <Badge className="bg-primary/20 text-primary border-0 shrink-0">
                            ✓
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
}
