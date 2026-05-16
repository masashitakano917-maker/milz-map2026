/*
  # Tighten profiles SELECT policy

  1. Security
    - The previous policy `Public profiles are viewable` on `profiles` granted
      SELECT to role `public` with `USING (true)`, exposing the `email` column
      to anonymous (anon) callers.
    - All current code paths that read `profiles` (admin views, signed-in user
      checks, role lookups) operate after authentication.
    - This migration replaces the public policy with one restricted to the
      `authenticated` role. Anonymous clients can no longer read profiles.

  2. Notes
    - No data is modified. Only the policy role scope changes.
    - If a future feature needs anonymous profile lookup, add a narrow policy
      that exposes only safe columns (e.g. via a view) instead of widening
      this policy.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Public profiles are viewable'
  ) THEN
    EXECUTE 'DROP POLICY "Public profiles are viewable" ON public.profiles';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Authenticated users can view profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can view profiles"
      ON public.profiles
      FOR SELECT
      TO authenticated
      USING (true)';
  END IF;
END $$;
