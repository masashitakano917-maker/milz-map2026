/*
  # AI Trend Spots schema (external-source discovered spots)

  1. New Tables
    - `ai_trend_spots` — スポット本体(外部ソース由来)
      外部ID一意、各エリア最大1000件まで保持(rotating pool)
    - `ai_trend_weekly` — その週のTrend選出(週次ランキング)
    - `ai_trend_mentions` — RSS/メディア掲載の紐付け
    - `ai_editor_suggestions` — AI Trend → MILZ編集部昇格候補

  2. Scope
    - エリア: ny / tokyo / kyoto / seoul / hawaii
    - 各エリア最大1000件保持、週次で top ~30 件を weekly へ
    - ソース: foursquare / google / rss (mixed, dedup by external_id)

  3. Security
    - すべてのテーブルでRLS有効化
    - ai_trend_spots / ai_trend_weekly / ai_trend_mentions: public SELECT
    - 書き込みは service_role のみ(edge function 経由)
    - ai_editor_suggestions: 認証ユーザーが自分の提案をCRUD可、adminが全件閲覧可

  4. Notes
    - 明示的に "AI観測" であることをUIで示すため別系統のテーブルを使用
    - admin_places(MILZ編集部掲載)とは完全に分離
*/

-- ai_trend_spots
CREATE TABLE IF NOT EXISTS public.ai_trend_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  area_key TEXT NOT NULL,
  city_name TEXT DEFAULT '',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  address TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  website_url TEXT DEFAULT '',
  trend_score DOUBLE PRECISION DEFAULT 0,
  popularity DOUBLE PRECISION DEFAULT 0,
  mention_count INTEGER DEFAULT 0,
  source_data JSONB DEFAULT '{}'::jsonb,
  last_refreshed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_trend_spots_external_idx
  ON public.ai_trend_spots (source, external_id);
CREATE INDEX IF NOT EXISTS ai_trend_spots_area_score_idx
  ON public.ai_trend_spots (area_key, trend_score DESC);
CREATE INDEX IF NOT EXISTS ai_trend_spots_area_refreshed_idx
  ON public.ai_trend_spots (area_key, last_refreshed_at DESC);

ALTER TABLE public.ai_trend_spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AI trend spots are public readable" ON public.ai_trend_spots;
CREATE POLICY "AI trend spots are public readable"
  ON public.ai_trend_spots FOR SELECT
  USING (true);

-- ai_trend_weekly
CREATE TABLE IF NOT EXISTS public.ai_trend_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  area_key TEXT NOT NULL,
  spot_id UUID NOT NULL REFERENCES public.ai_trend_spots(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL DEFAULT 0,
  trend_score DOUBLE PRECISION DEFAULT 0,
  reason_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_trend_weekly_unique_idx
  ON public.ai_trend_weekly (week_start, area_key, spot_id);
CREATE INDEX IF NOT EXISTS ai_trend_weekly_lookup_idx
  ON public.ai_trend_weekly (area_key, week_start DESC, rank ASC);

ALTER TABLE public.ai_trend_weekly ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AI trend weekly is public readable" ON public.ai_trend_weekly;
CREATE POLICY "AI trend weekly is public readable"
  ON public.ai_trend_weekly FOR SELECT
  USING (true);

-- ai_trend_mentions
CREATE TABLE IF NOT EXISTS public.ai_trend_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID REFERENCES public.ai_trend_spots(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'rss',
  url TEXT DEFAULT '',
  title TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_trend_mentions_spot_idx
  ON public.ai_trend_mentions (spot_id, published_at DESC);

ALTER TABLE public.ai_trend_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AI trend mentions are public readable" ON public.ai_trend_mentions;
CREATE POLICY "AI trend mentions are public readable"
  ON public.ai_trend_mentions FOR SELECT
  USING (true);

-- ai_editor_suggestions
CREATE TABLE IF NOT EXISTS public.ai_editor_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trend_spot_id UUID REFERENCES public.ai_trend_spots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_editor_suggestions_user_idx
  ON public.ai_editor_suggestions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_editor_suggestions_status_idx
  ON public.ai_editor_suggestions (status, created_at DESC);

ALTER TABLE public.ai_editor_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own editor suggestions" ON public.ai_editor_suggestions;
CREATE POLICY "Users can read own editor suggestions"
  ON public.ai_editor_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Users can create editor suggestions" ON public.ai_editor_suggestions;
CREATE POLICY "Users can create editor suggestions"
  ON public.ai_editor_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update editor suggestions" ON public.ai_editor_suggestions;
CREATE POLICY "Admins can update editor suggestions"
  ON public.ai_editor_suggestions FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Users can delete own pending suggestions" ON public.ai_editor_suggestions;
CREATE POLICY "Users can delete own pending suggestions"
  ON public.ai_editor_suggestions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');
