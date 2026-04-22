/*
  # MILZ full application schema

  1. New Tables
    - `profiles` - user profile and role
    - `admin_places` - registered map spots (name, coords, media, hours, badges...)
    - `favorites` - user favorites linking to admin_places
    - `ai_favorites` - AI-generated favorites saved by users
    - `ai_recommendation_metrics` - view/favorite counters for AI recommendations
    - `ai_cache` - cached AI responses per location/type/category
    - `admin_filter_options` - category and badge filter options

  2. Security
    - RLS enabled on all tables
    - profiles: public read, owner-only write
    - admin_places: public read; owner or admin role can write
    - favorites: owner-only all CRUD
    - ai_favorites: owner-only all CRUD
    - ai_cache / ai_recommendation_metrics: public read, authenticated write
    - admin_filter_options: public read, admin-only write

  3. Notes
    - Uses IF NOT EXISTS everywhere to be idempotent.
    - ai_favorites includes both favorite_key and canonical_key for upsert conflict target.
    - admin_places has wide set of optional columns used by the app.
*/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- admin_places
CREATE TABLE IF NOT EXISTS public.admin_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  milz_experience TEXT,
  category TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country TEXT,
  prefecture TEXT,
  municipality TEXT,
  address TEXT,
  website_url TEXT,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  pdfs JSONB DEFAULT '[]'::jsonb,
  rating DOUBLE PRECISION DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  hours TEXT,
  hours_label TEXT,
  phone TEXT,
  shorts_heading TEXT,
  badges TEXT[] DEFAULT '{}',
  area_key TEXT,
  area_label TEXT,
  from_spot_heading TEXT,
  from_spot_intro TEXT,
  from_spot_items JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='hours') THEN
    ALTER TABLE public.admin_places ADD COLUMN hours TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='phone') THEN
    ALTER TABLE public.admin_places ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='shorts_heading') THEN
    ALTER TABLE public.admin_places ADD COLUMN shorts_heading TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='hours_label') THEN
    ALTER TABLE public.admin_places ADD COLUMN hours_label TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='badges') THEN
    ALTER TABLE public.admin_places ADD COLUMN badges TEXT[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='area_key') THEN
    ALTER TABLE public.admin_places ADD COLUMN area_key TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='area_label') THEN
    ALTER TABLE public.admin_places ADD COLUMN area_label TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='from_spot_heading') THEN
    ALTER TABLE public.admin_places ADD COLUMN from_spot_heading TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='from_spot_intro') THEN
    ALTER TABLE public.admin_places ADD COLUMN from_spot_intro TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_places' AND column_name='from_spot_items') THEN
    ALTER TABLE public.admin_places ADD COLUMN from_spot_items JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

ALTER TABLE public.admin_places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read admin_places" ON public.admin_places;
CREATE POLICY "Public read admin_places" ON public.admin_places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin or owner insert admin_places" ON public.admin_places;
CREATE POLICY "Admin or owner insert admin_places" ON public.admin_places
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin or owner update admin_places" ON public.admin_places;
CREATE POLICY "Admin or owner update admin_places" ON public.admin_places
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin or owner delete admin_places" ON public.admin_places;
CREATE POLICY "Admin or owner delete admin_places" ON public.admin_places
  FOR DELETE TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  place_id UUID NOT NULL REFERENCES public.admin_places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
CREATE POLICY "Users can insert own favorites" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;
CREATE POLICY "Users can delete own favorites" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ai_favorites
CREATE TABLE IF NOT EXISTS public.ai_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_key TEXT NOT NULL,
  canonical_key TEXT,
  name TEXT NOT NULL,
  reason TEXT,
  category TEXT,
  details TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  area_key TEXT,
  city_name TEXT,
  translations JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ai_favorites' AND column_name='canonical_key') THEN
    ALTER TABLE public.ai_favorites ADD COLUMN canonical_key TEXT;
  END IF;
END $$;

UPDATE public.ai_favorites SET canonical_key = favorite_key WHERE canonical_key IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ai_favorites_user_canonical_key_unique_idx
  ON public.ai_favorites(user_id, canonical_key);
CREATE INDEX IF NOT EXISTS ai_favorites_user_id_idx ON public.ai_favorites(user_id);

ALTER TABLE public.ai_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ai favorites" ON public.ai_favorites;
CREATE POLICY "Users can view own ai favorites" ON public.ai_favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ai favorites" ON public.ai_favorites;
CREATE POLICY "Users can insert own ai favorites" ON public.ai_favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ai favorites" ON public.ai_favorites;
CREATE POLICY "Users can update own ai favorites" ON public.ai_favorites
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ai favorites" ON public.ai_favorites;
CREATE POLICY "Users can delete own ai favorites" ON public.ai_favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ai_recommendation_metrics
CREATE TABLE IF NOT EXISTS public.ai_recommendation_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE public.ai_recommendation_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ai metrics" ON public.ai_recommendation_metrics;
CREATE POLICY "Public read ai metrics" ON public.ai_recommendation_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated insert ai metrics" ON public.ai_recommendation_metrics;
CREATE POLICY "Authenticated insert ai metrics" ON public.ai_recommendation_metrics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update ai metrics" ON public.ai_recommendation_metrics;
CREATE POLICY "Authenticated update ai metrics" ON public.ai_recommendation_metrics
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ai_cache
CREATE TABLE IF NOT EXISTS public.ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  location_key TEXT NOT NULL,
  category TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, location_key, category)
);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ai_cache" ON public.ai_cache;
CREATE POLICY "Public read ai_cache" ON public.ai_cache FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated upsert ai_cache insert" ON public.ai_cache;
CREATE POLICY "Authenticated upsert ai_cache insert" ON public.ai_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated upsert ai_cache update" ON public.ai_cache;
CREATE POLICY "Authenticated upsert ai_cache update" ON public.ai_cache
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- admin_filter_options
CREATE TABLE IF NOT EXISTS public.admin_filter_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('category', 'badge')),
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(kind, name)
);

ALTER TABLE public.admin_filter_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read filter options" ON public.admin_filter_options;
CREATE POLICY "Public read filter options" ON public.admin_filter_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin insert filter options" ON public.admin_filter_options;
CREATE POLICY "Admin insert filter options" ON public.admin_filter_options
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Admin update filter options" ON public.admin_filter_options;
CREATE POLICY "Admin update filter options" ON public.admin_filter_options
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "Admin delete filter options" ON public.admin_filter_options;
CREATE POLICY "Admin delete filter options" ON public.admin_filter_options
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

INSERT INTO public.admin_filter_options (kind, name, sort_order) VALUES
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
