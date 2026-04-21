-- MILZ additional schema for area filters, badges, and AI recommendation ranking

ALTER TABLE admin_places
  ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS area_key TEXT,
  ADD COLUMN IF NOT EXISTS area_label TEXT;

CREATE TABLE IF NOT EXISTS admin_filter_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('category', 'badge')),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kind, name)
);

ALTER TABLE admin_filter_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access filter options" ON admin_filter_options;
CREATE POLICY "Allow public read access filter options"
  ON admin_filter_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admins insert filter options" ON admin_filter_options;
CREATE POLICY "Allow admins insert filter options"
  ON admin_filter_options FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow admins update filter options" ON admin_filter_options;
CREATE POLICY "Allow admins update filter options"
  ON admin_filter_options FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow admins delete filter options" ON admin_filter_options;
CREATE POLICY "Allow admins delete filter options"
  ON admin_filter_options FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS ai_recommendation_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_key TEXT NOT NULL,
  city_name TEXT,
  recommendation_name TEXT NOT NULL,
  category TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  details TEXT,
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(area_key, city_name, recommendation_name)
);

ALTER TABLE ai_recommendation_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access ai metrics" ON ai_recommendation_metrics;
CREATE POLICY "Allow public read access ai metrics"
  ON ai_recommendation_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert ai metrics" ON ai_recommendation_metrics;
CREATE POLICY "Allow authenticated insert ai metrics"
  ON ai_recommendation_metrics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated update ai metrics" ON ai_recommendation_metrics;
CREATE POLICY "Allow authenticated update ai metrics"
  ON ai_recommendation_metrics FOR UPDATE USING (auth.uid() IS NOT NULL);

INSERT INTO admin_filter_options (kind, name, sort_order)
VALUES
  ('category', 'カフェ', 1),
  ('category', 'レストラン', 2),
  ('category', 'ショッピング', 3),
  ('category', 'エンターテイメント', 4),
  ('category', '公園・自然', 5),
  ('category', '神社・寺院', 6),
  ('category', 'その他', 7),
  ('badge', 'Yukie Fav', 1),
  ('badge', 'Pet Friendly', 2)
ON CONFLICT (kind, name) DO NOTHING;
