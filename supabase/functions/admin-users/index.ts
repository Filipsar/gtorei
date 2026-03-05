import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "farubini2@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the requesting user
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("total_xp", { ascending: false });

    if (profilesError) throw profilesError;

    // Fetch aggregated session data per user
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from("training_sessions")
      .select("user_id, hands_played, score, accuracy, started_at, ended_at");

    if (sessionsError) throw sessionsError;

    // Aggregate session stats per user
    const userStats: Record<string, {
      total_sessions: number;
      total_hands: number;
      total_score: number;
      avg_accuracy: number;
      total_time_minutes: number;
      last_active: string | null;
    }> = {};

    for (const session of sessions || []) {
      if (!userStats[session.user_id]) {
        userStats[session.user_id] = {
          total_sessions: 0,
          total_hands: 0,
          total_score: 0,
          avg_accuracy: 0,
          total_time_minutes: 0,
          last_active: null,
        };
      }
      const stats = userStats[session.user_id];
      stats.total_sessions++;
      stats.total_hands += session.hands_played || 0;
      stats.total_score += session.score || 0;
      stats.avg_accuracy += Number(session.accuracy) || 0;

      if (session.started_at && session.ended_at) {
        const start = new Date(session.started_at).getTime();
        const end = new Date(session.ended_at).getTime();
        stats.total_time_minutes += (end - start) / 60000;
      }

      if (!stats.last_active || (session.started_at && session.started_at > stats.last_active)) {
        stats.last_active = session.started_at;
      }
    }

    // Calculate average accuracy
    for (const uid of Object.keys(userStats)) {
      if (userStats[uid].total_sessions > 0) {
        userStats[uid].avg_accuracy = Math.round(
          userStats[uid].avg_accuracy / userStats[uid].total_sessions
        );
        userStats[uid].total_time_minutes = Math.round(userStats[uid].total_time_minutes);
      }
    }

    // Merge profiles with stats
    const result = (profiles || []).map((p) => ({
      user_id: p.user_id,
      username: p.username,
      avatar_url: p.avatar_url,
      level: p.level,
      total_xp: p.total_xp,
      hands_played: p.hands_played,
      created_at: p.created_at,
      ...(userStats[p.user_id] || {
        total_sessions: 0,
        total_hands: 0,
        total_score: 0,
        avg_accuracy: 0,
        total_time_minutes: 0,
        last_active: null,
      }),
    }));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
