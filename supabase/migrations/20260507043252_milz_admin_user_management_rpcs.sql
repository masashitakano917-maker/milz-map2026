/*
  # Admin User Management RPCs

  1. New Functions
    - `milz_is_admin(uid)` - helper returning whether a user has admin role
    - `milz_admin_list_users(search)` - returns profiles list (admin only)
    - `milz_admin_promote_user(target_email)` - grants admin role by email (admin only)
    - `milz_admin_demote_user(target_user_id)` - revokes admin role (admin only)

  2. Security
    - All functions are SECURITY DEFINER and explicitly verify the caller's admin status via `profiles.role = 'admin'`
    - Non-admin callers receive an exception
    - Callers cannot demote themselves to prevent accidental lockout
*/

CREATE OR REPLACE FUNCTION public.milz_is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'admin'
  );
$$;

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
    SELECT p.id, p.email, p.display_name, p.role, p.created_at
    FROM public.profiles p
    WHERE
      search IS NULL
      OR search = ''
      OR p.email ILIKE '%' || search || '%'
      OR COALESCE(p.display_name, '') ILIKE '%' || search || '%'
    ORDER BY
      CASE WHEN p.role = 'admin' THEN 0 ELSE 1 END,
      p.created_at DESC
    LIMIT 200;
END;
$$;

CREATE OR REPLACE FUNCTION public.milz_admin_promote_user(target_email text)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  IF NOT public.milz_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  normalized := lower(trim(target_email));

  IF normalized IS NULL OR normalized = '' THEN
    RAISE EXCEPTION 'email required';
  END IF;

  UPDATE public.profiles p
  SET role = 'admin'
  WHERE lower(p.email) = normalized;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found for email: %', normalized;
  END IF;

  RETURN QUERY
    SELECT p.id, p.email, p.display_name, p.role
    FROM public.profiles p
    WHERE lower(p.email) = normalized;
END;
$$;

CREATE OR REPLACE FUNCTION public.milz_admin_demote_user(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.milz_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot demote yourself';
  END IF;

  UPDATE public.profiles p
  SET role = 'user'
  WHERE p.id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  RETURN QUERY
    SELECT p.id, p.email, p.display_name, p.role
    FROM public.profiles p
    WHERE p.id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.milz_is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.milz_admin_list_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.milz_admin_promote_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.milz_admin_demote_user(uuid) TO authenticated;