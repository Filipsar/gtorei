// Edge function: apaga a conta de quem pede, com tudo o que é dela.
//
// A Play Store exige que app com cadastro deixe excluir a conta pelo próprio
// app (e por um link na web); a LGPD dá o mesmo direito. A exclusão é
// definitiva: perfil, mãos, sessões, ranking, conquistas, posts, indicações,
// imagens do perfil e o login.
//
// Algumas tabelas antigas não têm chave estrangeira para auth.users, então
// apagar só o login deixaria linhas órfãs. Por isso cada tabela é limpa antes.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Tabela -> coluna com o id da conta. Ordem: filhos antes dos pais.
const TABELAS: Array<[string, string]> = [
  ['post_reactions', 'user_id'],
  ['post_comments', 'user_id'],
  ['community_posts', 'user_id'],
  ['favorites', 'user_id'],
  ['played_hands', 'user_id'],
  ['training_sessions', 'user_id'],
  ['rankings', 'user_id'],
  ['user_achievements', 'user_id'],
  ['ai_analysis_usage', 'user_id'],
  ['xp_bonus', 'user_id'],
  ['daily_challenge_claims', 'user_id'],
  ['referrals', 'referred_id'],
  ['referral_codes', 'user_id'],
  ['play_purchases', 'user_id'],
  ['supporters', 'user_id'],
  ['user_roles', 'user_id'],
  ['profiles', 'user_id'],
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'Serviço indisponível no momento.' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Entre na sua conta.' }, 401);
    const supabaseUser = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(authHeader.slice(7));
    const userId = claims?.claims?.sub;
    if (claimsError || !userId || claims?.claims?.role !== 'authenticated') return json({ error: 'Entre na sua conta.' }, 401);

    // A tela pede para digitar EXCLUIR: um clique sem querer não apaga nada
    const corpo = await req.json().catch(() => ({}));
    if (corpo?.confirmacao !== 'EXCLUIR') return json({ error: 'Confirmação ausente.' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Quem indicou esta conta perde o indicado; as indicações que ela fez
    // somem junto (referrer_id tem ON DELETE CASCADE)
    for (const [tabela, coluna] of TABELAS) {
      const { error } = await admin.from(tabela).delete().eq(coluna, userId);
      // Tabela que ainda não existe (migration não aplicada) não impede o resto
      if (error && error.code !== '42P01' && error.code !== 'PGRST205') throw new Error(`${tabela}: ${error.message}`);
    }

    // Imagens do perfil: pasta com o id da conta no bucket profile-images
    const { data: arquivos } = await admin.storage.from('profile-images').list(userId, { limit: 1000 });
    if (arquivos?.length) {
      await admin.storage.from('profile-images').remove(arquivos.map((a) => `${userId}/${a.name}`));
    }

    const { error: erroLogin } = await admin.auth.admin.deleteUser(userId);
    if (erroLogin) throw erroLogin;

    return json({ excluida: true });
  } catch (e) {
    console.error('delete-account falhou', e);
    return json({ error: 'Não foi possível excluir a conta agora. Tente de novo ou escreva para o suporte.' }, 500);
  }
});
