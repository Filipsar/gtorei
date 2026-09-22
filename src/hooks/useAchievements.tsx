import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENTS, AchievementDef, getAchievement } from '@/data/achievements';
import { AchievementIcon } from '@/components/achievements/AchievementIcon';
import { toast } from 'sonner';

export function useAchievements() {
  const { user } = useAuth();
  const [unlockedKeys, setUnlockedKeys] = useState<Set<string>>(new Set());
  const loadedRef = useRef(false);

  // Load unlocked achievements
  useEffect(() => {
    if (!user) return;
    if (loadedRef.current) return;
    loadedRef.current = true;

    supabase
      .from('user_achievements')
      .select('achievement_key')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          setUnlockedKeys(new Set(data.map(d => d.achievement_key)));
        }
      });
  }, [user]);

  const unlock = useCallback(async (key: string) => {
    if (!user || unlockedKeys.has(key)) return false;
    
    const achievement = getAchievement(key);
    if (!achievement) return false;

    const { data, error } = await supabase.rpc('unlock_achievement', { _key: key });

    if (error) {
      console.error('Error unlocking achievement:', error);
      return false;
    }
    // RPC returns true only when server-side validation passed and the row exists.
    if (data !== true) return false;

    setUnlockedKeys(prev => new Set([...prev, key]));

    // Show notification
    toast.success('Conquista Desbloqueada!', {
      icon: <AchievementIcon achievement={achievement.key} className="h-5 w-5 text-primary" />,
      description: `${achievement.name}: ${achievement.description}`,
      duration: 5000,
      position: 'bottom-right',
    });

    return true;
  }, [user, unlockedKeys]);

  // Check achievements based on current stats
  const checkAchievements = useCallback(async (stats: {
    level?: number;
    streak?: number;
    totalHands?: number;
    sessionAccuracy?: number;
    sessionHands?: number;
    sessionBestCount?: number;
  }) => {
    if (!user) return;

    const toCheck: string[] = [];

    // Level achievements
    if (stats.level) {
      for (let l = 2; l <= 8; l++) {
        if (stats.level >= l) toCheck.push(`level_${l}`);
      }
    }

    // Streak achievements
    if (stats.streak) {
      for (const threshold of [5, 10, 25, 50, 100, 200]) {
        if (stats.streak >= threshold) toCheck.push(`streak_${threshold}`);
      }
    }

    // Volume achievements
    if (stats.totalHands) {
      for (const threshold of [10, 50, 100, 500, 1000, 2500, 5000, 10000]) {
        if (stats.totalHands >= threshold) toCheck.push(`hands_${threshold}`);
      }
    }

    // Accuracy achievements
    if (stats.sessionAccuracy !== undefined && stats.sessionHands) {
      if (stats.sessionAccuracy === 100 && stats.sessionHands >= 10) {
        toCheck.push('session_perfect');
      }
      if (stats.sessionAccuracy === 100 && stats.sessionHands >= 50) {
        toCheck.push('session_perfect_50');
      }
      if (stats.sessionAccuracy >= 90 && stats.sessionHands >= 20) {
        toCheck.push('accuracy_90');
      }
      if (stats.sessionAccuracy >= 95 && stats.sessionHands >= 100) {
        toCheck.push('accuracy_95');
      }
      if (stats.sessionAccuracy >= 98 && stats.sessionHands >= 50) {
        toCheck.push('accuracy_98');
      }
    }

    if (stats.sessionBestCount) {
      if (stats.sessionBestCount >= 10) toCheck.push('best_10');
      if (stats.sessionBestCount >= 25) toCheck.push('best_25');
      if (stats.sessionBestCount >= 50) toCheck.push('best_50');
    }

    // Unlock any new ones
    for (const key of toCheck) {
      if (!unlockedKeys.has(key)) {
        await unlock(key);
      }
    }
  }, [user, unlockedKeys, unlock]);

  return {
    unlockedKeys,
    achievements: ACHIEVEMENTS,
    unlock,
    checkAchievements,
    isUnlocked: (key: string) => unlockedKeys.has(key),
  };
}
