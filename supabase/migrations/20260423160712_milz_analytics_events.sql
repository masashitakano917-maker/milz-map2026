/*
  # MILZ Analytics Events

  1. New Tables
    - `milz_events`
      - `id` (uuid, primary key)
      - `event_type` (text) - 'area_view' | 'video_play' | 'spot_view'
      - `user_id` (uuid, nullable) - null for anonymous visitors
      - `area_key` (text, nullable) - e.g. 'tokyo', 'kyoto'
      - `place_id` (uuid, nullable) - references admin_places
      - `place_name` (text, nullable) - denormalized for analytics convenience
      - `video_url` (text, nullable) - for video_play events
      - `session_id` (text, nullable) - ephemeral client-generated ID to dedupe bursts
      - `created_at` (timestamptz)
    - Indexes on created_at, event_type, area_key for fast aggregation

  2. Security
    - RLS enabled
    - Anyone (including anon) may INSERT events (public analytics collection)
    - Only admins can SELECT events (via admin-check policy)

  3. Notes
    - Event rows are append-only. No updates or deletes needed from clients.
    - Admin analytics queries aggregate by time-window in the dashboard.
*/

CREATE TABLE IF NOT EXISTS public.milz_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  area_key TEXT,
  place_id UUID,
  place_name TEXT,
  video_url TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS milz_events_created_at_idx ON public.milz_events (created_at DESC);
CREATE INDEX IF NOT EXISTS milz_events_type_created_idx ON public.milz_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS milz_events_area_idx ON public.milz_events (area_key, created_at DESC);
CREATE INDEX IF NOT EXISTS milz_events_place_idx ON public.milz_events (place_id, created_at DESC);

ALTER TABLE public.milz_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert events" ON public.milz_events;
CREATE POLICY "Anyone can insert events" ON public.milz_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view events" ON public.milz_events;
CREATE POLICY "Admins can view events" ON public.milz_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
