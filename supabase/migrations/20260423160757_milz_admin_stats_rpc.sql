/*
  # Admin stats RPC

  1. New Functions
    - `milz_admin_stats(window_hours int)` returns a JSON object containing:
      - user_count: total registered users
      - new_users: users created within the window
      - area_views: array of {area_key, views} sorted desc
      - top_area: the most viewed area_key in the window
      - video_plays: total video_play events in the window
      - top_favorites_per_area: object keyed by area_key => array of {place_id, name, count} (top 10)

  2. Security
    - Function runs with SECURITY DEFINER so it can read auth.users count,
      but it checks that the caller's profile role is 'admin' before returning data.
    - Non-admins get an exception.
*/

CREATE OR REPLACE FUNCTION public.milz_admin_stats(window_hours integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(hours => window_hours);
  v_user_count integer;
  v_new_users integer;
  v_area_views jsonb;
  v_top_area text;
  v_video_plays integer;
  v_top_favs jsonb;
  v_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT count(*) INTO v_user_count FROM auth.users;

  SELECT count(*) INTO v_new_users FROM auth.users WHERE created_at >= since;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('area_key', area_key, 'views', views) ORDER BY views DESC), '[]'::jsonb)
    INTO v_area_views
  FROM (
    SELECT area_key, count(*)::int AS views
    FROM public.milz_events
    WHERE event_type = 'area_view'
      AND created_at >= since
      AND area_key IS NOT NULL
    GROUP BY area_key
  ) s;

  SELECT area_key INTO v_top_area
  FROM public.milz_events
  WHERE event_type = 'area_view' AND created_at >= since AND area_key IS NOT NULL
  GROUP BY area_key
  ORDER BY count(*) DESC
  LIMIT 1;

  SELECT count(*)::int INTO v_video_plays
  FROM public.milz_events
  WHERE event_type = 'video_play' AND created_at >= since;

  SELECT COALESCE(jsonb_object_agg(area_key, items), '{}'::jsonb)
    INTO v_top_favs
  FROM (
    SELECT
      area_key,
      jsonb_agg(jsonb_build_object('place_id', place_id, 'name', name, 'count', cnt) ORDER BY cnt DESC) AS items
    FROM (
      SELECT
        COALESCE(ap.area_key, 'unknown') AS area_key,
        f.place_id,
        ap.name,
        count(*)::int AS cnt,
        row_number() OVER (PARTITION BY COALESCE(ap.area_key, 'unknown') ORDER BY count(*) DESC) AS rn
      FROM public.favorites f
      JOIN public.admin_places ap ON ap.id = f.place_id
      WHERE f.created_at >= since
      GROUP BY ap.area_key, f.place_id, ap.name
    ) ranked
    WHERE rn <= 10
    GROUP BY area_key
  ) grouped;

  RETURN jsonb_build_object(
    'user_count', v_user_count,
    'new_users', COALESCE(v_new_users, 0),
    'area_views', v_area_views,
    'top_area', v_top_area,
    'video_plays', COALESCE(v_video_plays, 0),
    'top_favorites_per_area', v_top_favs,
    'window_hours', window_hours,
    'since', since
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.milz_admin_stats(integer) TO authenticated;
