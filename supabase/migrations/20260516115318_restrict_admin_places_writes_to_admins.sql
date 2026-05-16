/*
  # Restrict admin_places writes to admin role only

  1. Security
    - Existing INSERT/UPDATE/DELETE policies on `admin_places` allowed any
      authenticated user whose `auth.uid()` matched `created_by` to write to
      the table. Per product spec, only users with `profiles.role = 'admin'`
      may create, edit, or delete spots.
    - This migration drops the permissive policies and replaces them with
      admin-only equivalents. Public SELECT (read) is unchanged.

  2. Notes
    - No data is modified.
    - SELECT policy remains: public can read.
    - The existing `created_by` column is preserved for audit purposes.
*/

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_places'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.admin_places', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Admins can insert admin_places"
  ON public.admin_places
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can update admin_places"
  ON public.admin_places
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete admin_places"
  ON public.admin_places
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
