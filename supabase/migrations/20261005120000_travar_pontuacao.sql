-- =====================================================================
-- Trava XP, nível, ranking e estatísticas contra escrita direta do cliente
-- Escrito em 05/10/2026, na revisão de segurança. NÃO APLICADO: quem aplica é
-- o Filipe (SQL Editor do Supabase), depois de ler o efeito de cada bloco.
-- =====================================================================
--
-- O problema: toda a pontuação já é calculada no servidor (record_hand_result,
-- apply_ranking_delta, unlock_achievement, complete_level_test, todas SECURITY
-- DEFINER). Mas as políticas antigas de RLS ainda deixam o usuário logado
-- gravar direto nas tabelas, com a chave pública que está no site. Qualquer um
-- com o console do navegador consegue, por exemplo:
--
--   supabase.from('profiles').update({ total_xp: 999999, level: 8 }).eq('user_id', meuId)
--   supabase.from('rankings').update({ xp_earned: 999999 }).eq('user_id', meuId)
--
-- e aparecer em 1º no ranking, liberar conquistas de nível ou refazer o teste
-- de nivelamento (zerando level_test_completed_at). As conquistas em si já
-- estão protegidas (a política de INSERT foi removida em 06/07/2026), mas elas
-- leem profiles.level e profiles.hands_played, que hoje o usuário edita.
--
-- O app NÃO grava nenhuma dessas colunas direto (conferido no código em
-- 05/10/2026). O que ele grava direto, e continua podendo gravar:
--   profiles          -> username, avatar_url, banner_url, screenshot_urls
--                        (SettingsModal.tsx e ProfilePage.tsx)
--   training_sessions -> INSERT de user_id, scenario, position, stack ao
--                        começar o treino; UPDATE de ended_at ao terminar
--                        (TrainPage.tsx)
-- Funções SECURITY DEFINER rodam como dono das tabelas, então nada abaixo
-- afeta record_hand_result, apply_ranking_delta etc.
--
-- Efeito para o usuário: nenhum. Treino, perfil, ranking e conquistas seguem
-- iguais; só a escrita "por fora" passa a dar erro de permissão.
-- =====================================================================

BEGIN;

-- 1. profiles: só as colunas de aparência podem ser alteradas pelo usuário.
--    Privilégio por coluna: tira o UPDATE da tabela toda e devolve só estas.
--    total_xp, level, hands_played, consecutive_errors e
--    level_test_completed_at passam a ser escritas só pelas funções do servidor.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT  UPDATE (username, avatar_url, banner_url, screenshot_urls, updated_at)
  ON public.profiles TO authenticated;

--    O perfil é criado pelo gatilho handle_new_user no cadastro. Um INSERT
--    direto não tem uso legítimo e poderia criar um perfil já com XP alto.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
REVOKE INSERT ON public.profiles FROM authenticated, anon;

-- 2. rankings: escrito só por apply_ranking_delta (via record_hand_result).
DROP POLICY IF EXISTS "Users can insert own rankings" ON public.rankings;
DROP POLICY IF EXISTS "Users can update own rankings" ON public.rankings;
REVOKE INSERT, UPDATE, DELETE ON public.rankings FROM authenticated, anon;

-- 3. played_hands: escrito só por record_hand_result. Mãos inseridas à mão
--    mexeriam na precisão, nas sequências (conquistas streak_N) e no painel
--    do admin.
DROP POLICY IF EXISTS "Users can insert own hands" ON public.played_hands;
REVOKE INSERT, UPDATE, DELETE ON public.played_hands FROM authenticated, anon;

-- 4. training_sessions: o app cria a sessão e marca o fim; placar, mãos e
--    precisão são preenchidos por record_hand_result. started_at também sai
--    da mão do usuário: record_hand_result recusa sessão com mais de 24 h, e
--    um started_at no futuro driblaria isso.
REVOKE INSERT, UPDATE ON public.training_sessions FROM authenticated, anon;
GRANT  INSERT (user_id, scenario, position, stack) ON public.training_sessions TO authenticated;
GRANT  UPDATE (ended_at) ON public.training_sessions TO authenticated;

COMMIT;

-- =====================================================================
-- Conferência depois de aplicar (só leitura). Deve listar exatamente as
-- colunas liberadas acima para 'authenticated':
--
-- SELECT table_name, privilege_type, column_name
--   FROM information_schema.column_privileges
--  WHERE grantee = 'authenticated'
--    AND table_schema = 'public'
--    AND table_name IN ('profiles', 'training_sessions')
--    AND privilege_type IN ('INSERT', 'UPDATE')
--  ORDER BY 1, 2, 3;
--
-- E nenhuma política de INSERT/UPDATE em rankings e played_hands:
--
-- SELECT tablename, policyname, cmd FROM pg_policies
--  WHERE schemaname = 'public'
--    AND tablename IN ('profiles', 'rankings', 'played_hands', 'training_sessions')
--  ORDER BY 1, 3;
--
-- Para desfazer (volta ao estado de antes, inseguro):
--   GRANT INSERT, UPDATE ON public.profiles, public.rankings,
--     public.played_hands, public.training_sessions TO authenticated;
--   e recriar as políticas "Users can insert/update own ..." das migrations
--   de 05/02/2026 e 25/06/2026.
-- =====================================================================
