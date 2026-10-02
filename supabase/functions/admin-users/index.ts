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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Missing env vars:", { hasUrl: !!supabaseUrl, hasAnon: !!anonKey, hasService: !!serviceRoleKey });
      return new Response(JSON.stringify({ error: "Server config error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the requesting user via getClaims
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = claimsData.claims.email;
    if (userEmail !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // O PostgREST devolve no máximo 1.000 linhas por consulta, sem erro: passado
    // disso a lista vinha cortada e os totais do admin paravam de crescer
    // (eram 994 sessões em 02/10/2026). Lê de 1.000 em 1.000 até acabar, com
    // ordem fixa para nenhuma linha pular ou repetir entre as páginas.
    const PAGINA = 1000;
    const lerTodas = async (tabela: string, colunas: string, ordem: string) => {
      const linhas: any[] = [];
      for (let de = 0; ; de += PAGINA) {
        const { data, error } = await supabaseAdmin
          .from(tabela)
          .select(colunas)
          .order(ordem, { ascending: true })
          .range(de, de + PAGINA - 1);
        if (error) throw error;
        linhas.push(...(data || []));
        if (!data || data.length < PAGINA) return linhas;
      }
    };

    // Mesmo limite no Auth: perPage acima de 1.000 é ignorado
    const lerTodosUsuarios = async () => {
      const usuarios: { id: string; email?: string }[] = [];
      for (let page = 1; ; page++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: PAGINA });
        if (error) throw error;
        usuarios.push(...(data?.users || []));
        if (!data?.users || data.users.length < PAGINA) return usuarios;
      }
    };

    // Run the three heavy queries in parallel
    const [authUsers, profilesAll, sessions] = await Promise.all([
      lerTodosUsuarios(),
      lerTodas("profiles", "*", "id"),
      lerTodas("training_sessions", "id, user_id, hands_played, score, accuracy, started_at, ended_at", "id"),
    ]);

    const emailMap: Record<string, string> = {};
    for (const u of authUsers) {
      emailMap[u.id] = u.email || '';
    }
    // A tela espera os perfis do maior para o menor XP
    const profiles = profilesAll.sort((a, b) => (b.total_xp ?? 0) - (a.total_xp ?? 0));


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
      email: emailMap[p.user_id] || '',
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
