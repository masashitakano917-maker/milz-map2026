/*
  # Admin stats RPC v2

  Extends milz_admin_stats to return:
    - top_favorites: top 10 spots by admin_places favorites count (within window)
    - top_ai_favorites: top 10 AI recommendation favorites (from ai_favorites)
    - top_ai_trend_favorites: top 10 AI trend favorites (from ai_trend_favorites)
    - total_spots: total registered admin_places

  Security: same admin-only guard as before.
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
  v_total_spots integer;
  v_top_favs jsonb;
  v_top_ai_favs jsonb;
  v_top_ai_trend_favs jsonb;
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
  SELECT count(*) INTO v_total_spots FROM public.admin_places;

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

  -- Top 10 admin_places favorites (count across all users within window)
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_top_favs
  FROM (
    SELECT
      ap.id AS place_id,
      ap.name,
      COALESCE(ap.area_key, 'unknown') AS area_key,
      count(*)::int AS cnt
    FROM public.favorites f
    JOIN public.admin_places ap ON ap.id = f.place_id
    WHERE f.created_at >= since
    GROUP BY ap.id, ap.name, ap.area_key
    ORDER BY cnt DESC
    LIMIT 10
  ) r;

  -- Top 10 AI recommendation favorites (grouped by canonical key/name)
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_top_ai_favs
  FROM (
    SELECT
      COALESCE(af.canonical_key, af.favorite_key, af.name) AS key,
      MAX(af.name) AS name,
      COALESCE(MAX(af.area_key), 'unknown') AS area_key,
      count(*)::int AS cnt
    FROM public.ai_favorites af
    WHERE af.created_at >= since
    GROUP BY COALESCE(af.canonical_key, af.favorite_key, af.name)
    ORDER BY cnt DESC
    LIMIT 10
  ) r;

  -- Top 10 AI trend favorites (grouped by trend_spot_id or name)
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY cnt DESC), '[]'::jsonb)
    INTO v_top_ai_trend_favs
  FROM (
    SELECT
      COALESCE(atf.trend_spot_id::text, atf.name) AS key,
      MAX(atf.name) AS name,
      COALESCE(MAX(atf.area_key), 'unknown') AS area_key,
      count(*)::int AS cnt
    FROM public.ai_trend_favorites atf
    WHERE atf.created_at >= since
    GROUP BY COALESCE(atf.trend_spot_id::text, atf.name)
    ORDER BY cnt DESC
    LIMIT 10
  ) r;

  RETURN jsonb_build_object(
    'user_count', v_user_count,
    'new_users', COALESCE(v_new_users, 0),
    'area_views', v_area_views,
    'top_area', v_top_area,
    'video_plays', COALESCE(v_video_plays, 0),
    'total_spots', COALESCE(v_total_spots, 0),
    'top_favorites', v_top_favs,
    'top_ai_favorites', v_top_ai_favs,
    'top_ai_trend_favorites', v_top_ai_trend_favs,
    'window_hours', window_hours,
    'since', since
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.milz_admin_stats(integer) TO authenticated;
