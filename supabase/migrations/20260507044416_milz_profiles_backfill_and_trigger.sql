/*
  # Profiles backfill, auto-create trigger, and admin list hardening

  1. Changes
    - Backfill missing `public.profiles` rows from existing `auth.users`
    - Add trigger on `auth.users` insert to auto-create a corresponding profile
    - Rewrite `milz_admin_list_users` to source from `auth.users` (LEFT JOIN profiles)
      so every registered user appears even if no profile row exists yet

  2. Security
    - Trigger function is SECURITY DEFINER with a pinned search_path
    - `milz_admin_list_users` keeps the existing admin-only check

  3. Notes
    - Backfill uses `ON CONFLICT DO NOTHING` so it is idempotent
    - Default role for backfilled and future users is `user`
*/

INSERT INTO public.profiles (id, email, display_name, role, created_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS display_name,
  'user' AS role,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user',
    COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.milz_admin_list_users(search text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.milz_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  RETURN QUERY
    SELECT
      u.id,
      u.email::text AS email,
      COALESCE(p.display_name, u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) AS display_name,
      COALESCE(p.role, 'user') AS role,
      COALESCE(p.created_at, u.created_at) AS created_at
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE
      search IS NULL
      OR search = ''
      OR u.email ILIKE '%' || search || '%'
      OR COALESCE(p.display_name, '') ILIKE '%' || search || '%'
    ORDER BY
      CASE WHEN COALESCE(p.role, 'user') = 'admin' THEN 0 ELSE 1 END,
      COALESCE(p.created_at, u.created_at) DESC
    LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.milz_admin_list_users(text) TO authenticated;