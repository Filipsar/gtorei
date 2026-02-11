import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACHIEVEMENTS, AchievementDef, getAchievement } from '@/data/achievements';
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

    const { error } = await supabase
      .from('user_achievements')
      .insert({ user_id: user.id, achievement_key: key });

    if (error) {
      // Likely already exists (unique constraint)
      if (error.code === '23505') return false;
      console.error('Error unlocking achievement:', error);
      return false;
    }

    setUnlockedKeys(prev => new Set([...prev, key]));

    // Show notification
    toast.success(`${achievement.icon} Conquista Desbloqueada!`, {
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
      for (let l = 2; l <= 7; l++) {
        if (stats.level >= l) toCheck.push(`level_${l}`);
      }
    }

    // Streak achievements
    if (stats.streak) {
      for (const threshold of [5, 10, 25, 50]) {
        if (stats.streak >= threshold) toCheck.push(`streak_${threshold}`);
      }
    }

    // Volume achievements
    if (stats.totalHands) {
      for (const threshold of [10, 50, 100, 500, 1000]) {
        if (stats.totalHands >= threshold) toCheck.push(`hands_${threshold}`);
      }
    }

    // Accuracy achievements
    if (stats.sessionAccuracy !== undefined && stats.sessionHands) {
      if (stats.sessionAccuracy === 100 && stats.sessionHands >= 10) {
        toCheck.push('session_perfect');
      }
      if (stats.sessionAccuracy >= 90 && stats.sessionHands >= 20) {
        toCheck.push('accuracy_90');
      }
    }

    if (stats.sessionBestCount && stats.sessionBestCount >= 10) {
      toCheck.push('best_10');
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
