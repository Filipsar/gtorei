-- ============ B1: roles ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'farubini2@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- ============ B2: AI analysis daily usage ============
CREATE TABLE IF NOT EXISTS public.ai_analysis_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  used_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_day ON public.ai_analysis_usage (user_id, used_on);
GRANT ALL ON public.ai_analysis_usage TO service_role;
ALTER TABLE public.ai_analysis_usage ENABLE ROW LEVEL SECURITY;

-- ============ B3: profiles validation trigger ============
CREATE OR REPLACE FUNCTION public.validate_profile_changes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _bucket text := 'https://dejfimivoonbmgfxtbdf.supabase.co/storage/v1/object/public/profile-images/';
  _s text;
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF NEW.username IS NULL OR char_length(btrim(NEW.username)) < 2 OR char_length(btrim(NEW.username)) > 20 THEN
      RAISE EXCEPTION 'invalid_username';
    END IF;
    NEW.username := btrim(NEW.username);
  END IF;

  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url AND NEW.avatar_url IS NOT NULL THEN
    IF position(_bucket in NEW.avatar_url) = 1 THEN
      NULL;
    ELSIF char_length(NEW.avatar_url) <= 16 AND NEW.avatar_url NOT LIKE 'http%' AND NEW.avatar_url NOT LIKE 'data:%' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'invalid_avatar_url';
    END IF;
  END IF;

  IF NEW.banner_url IS DISTINCT FROM OLD.banner_url AND NEW.banner_url IS NOT NULL THEN
    IF position(_bucket in NEW.banner_url) <> 1 THEN RAISE EXCEPTION 'invalid_banner_url'; END IF;
  END IF;

  IF NEW.screenshot_urls IS DISTINCT FROM OLD.screenshot_urls AND NEW.screenshot_urls IS NOT NULL THEN
    IF array_length(NEW.screenshot_urls, 1) > 4 THEN RAISE EXCEPTION 'too_many_screenshots'; END IF;
    FOREACH _s IN ARRAY NEW.screenshot_urls LOOP
      IF position(_bucket in _s) <> 1 THEN RAISE EXCEPTION 'invalid_screenshot_url'; END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profiles_before_update ON public.profiles;
CREATE TRIGGER validate_profiles_before_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_changes();

-- ============ B4: handle_new_user username ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _name text;
BEGIN
  _name := btrim(coalesce(NEW.raw_user_meta_data->>'full_name', split_part(coalesce(NEW.email,''), '@', 1), ''));
  IF _name = '' THEN _name := 'Jogador'; END IF;
  _name := left(_name, 20);
  IF char_length(_name) < 2 THEN _name := 'Jogador'; END IF;
  INSERT INTO public.profiles (user_id, username) VALUES (NEW.id, _name);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============ B5: content checks ============
ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_content_len;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_content_len
  CHECK (char_length(content) BETWEEN 1 AND 2000) NOT VALID;

ALTER TABLE public.post_comments DROP CONSTRAINT IF EXISTS post_comments_content_len;
ALTER TABLE public.post_comments ADD CONSTRAINT post_comments_content_len
  CHECK (char_length(content) BETWEEN 1 AND 1000) NOT VALID;

ALTER TABLE public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_type_valid;
ALTER TABLE public.post_reactions ADD CONSTRAINT post_reactions_type_valid
  CHECK (reaction_type IN ('like','love','gg')) NOT VALID;