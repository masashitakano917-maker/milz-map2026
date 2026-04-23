/*
  # Enable realtime for AI Trend Favorites

  ## Overview
  Adds `ai_trend_favorites` to the `supabase_realtime` publication so the
  frontend realtime subscription on this table can receive INSERT/UPDATE/DELETE
  events. Without this, the list does not refresh when users save additional
  favorites in the same session.

  ## Changes
  - Adds `public.ai_trend_favorites` to the realtime publication, guarded by a
    DO block so re-runs are safe.

  ## Notes
  1. No data is modified.
  2. RLS policies on the table continue to restrict realtime events to the
     owning user.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ai_trend_favorites'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_trend_favorites';
  END IF;
END $$;
