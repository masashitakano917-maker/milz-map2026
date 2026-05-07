/*
  # Fix: milz_admin_delete_user returns "user not found" incorrectly

  1. Problem
    - The list RPC sources from `auth.users` LEFT JOIN `public.profiles`, so it can
      display users who have no profile row yet. Delete then fails with
      "user not found" because it only checked `public.profiles`.

  2. Fix
    - Check existence against `auth.users` (the source of truth)
    - Derive admin status from `milz_is_admin(target_user_id)` so missing profiles
      are treated as non-admin (default) rather than "not found"
*/

CREATE OR REPLACE FUNCTION public.milz_admin_delete_user(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_in_auth boolean;
BEGIN
  IF NOT public.milz_is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id required';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete yourself';
  END IF;

  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) INTO exists_in_auth;

  IF NOT exists_in_auth THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  IF public.milz_is_admin(target_user_id) THEN
    RAISE EXCEPTION 'cannot delete another admin; demote first';
  END IF;

  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.milz_admin_delete_user(uuid) TO authenticated;
