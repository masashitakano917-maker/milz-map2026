/*
  # Admin: delete user RPC

  1. New function
    - `milz_admin_delete_user(target_user_id uuid)` lets an existing admin permanently delete
      another user account. Removes the row from `auth.users`, which cascades to `public.profiles`
      via the existing foreign key relationship.

  2. Security
    - SECURITY DEFINER + explicit caller admin check via `milz_is_admin`
    - Self-deletion is blocked to prevent accidental lockout
    - Deleting another admin is blocked to avoid accidental removal of peers
    - EXECUTE granted to the `authenticated` role only
*/

CREATE OR REPLACE FUNCTION public.milz_admin_delete_user(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role text;
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

  SELECT role INTO target_role FROM public.profiles WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  IF target_role = 'admin' THEN
    RAISE EXCEPTION 'cannot delete another admin; demote first';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.milz_admin_delete_user(uuid) TO authenticated;
