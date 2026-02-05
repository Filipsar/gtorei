import { supabase } from '@/integrations/supabase/client';

interface UpdateRankingParams {
  userId: string;
  xpEarned: number;
  handsPlayed: number;
  correctHands: number;
}

export async function updateUserRanking({
  userId,
  xpEarned,
  handsPlayed,
  correctHands,
}: UpdateRankingParams): Promise<void> {
  const now = new Date();
  
  // Calculate period starts
  const dailyStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
  const weekStart = getWeekStart(now).toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const periods = [
    { type: 'daily', start: dailyStart },
    { type: 'weekly', start: weekStart },
    { type: 'monthly', start: monthStart },
  ];

  for (const period of periods) {
    try {
      // Check if entry exists
      const { data: existing } = await supabase
        .from('rankings')
        .select('id, xp_earned, hands_played, accuracy')
        .eq('user_id', userId)
        .eq('period_type', period.type)
        .eq('period_start', period.start)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        const newHandsPlayed = existing.hands_played + handsPlayed;
        const oldCorrectHands = Math.round((existing.accuracy / 100) * existing.hands_played);
        const newCorrectHands = oldCorrectHands + correctHands;
        const newAccuracy = newHandsPlayed > 0 ? Math.round((newCorrectHands / newHandsPlayed) * 100) : 0;

        await supabase
          .from('rankings')
          .update({
            xp_earned: existing.xp_earned + xpEarned,
            hands_played: newHandsPlayed,
            accuracy: newAccuracy,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new entry
        const accuracy = handsPlayed > 0 ? Math.round((correctHands / handsPlayed) * 100) : 0;
        
        await supabase
          .from('rankings')
          .insert({
            user_id: userId,
            period_type: period.type,
            period_start: period.start,
            xp_earned: xpEarned,
            hands_played: handsPlayed,
            accuracy,
          });
      }
    } catch (error) {
      console.error(`Error updating ${period.type} ranking:`, error);
    }
  }
}

export async function updateUserProfile(
  userId: string,
  xpEarned: number,
  handsPlayed: number
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_xp, hands_played, level')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile) {
      const newTotalXp = profile.total_xp + xpEarned;
      const newLevel = calculateLevel(newTotalXp);

      await supabase
        .from('profiles')
        .update({
          total_xp: newTotalXp,
          hands_played: profile.hands_played + handsPlayed,
          level: newLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function calculateLevel(xp: number): number {
  const thresholds = [0, 150, 450, 1000, 2000, 4000, 8000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) {
      return i + 1;
    }
  }
  return 1;
}
