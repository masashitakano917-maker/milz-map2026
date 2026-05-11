/*
  # Place Translations Cache

  Stores shared translated content for admin_places fields per locale.
  Once one user triggers translation for a (place, locale), the result is cached
  globally so subsequent viewers can skip the AI call.

  1. New Tables
    - `place_translations`
      - `place_id` (uuid, FK to admin_places.id, on delete cascade)
      - `locale` (text, e.g. 'en', 'jp')
      - `fields` (jsonb) — map of field name -> translated string
      - `created_at`, `updated_at`

  2. Security
    - Enable RLS
    - SELECT allowed for authenticated users (shared cache)
    - INSERT/UPDATE allowed for authenticated users (client-driven upsert after edge fn returns)
    - DELETE restricted to service role (no policy)
*/

CREATE TABLE IF NOT EXISTS place_translations (
  place_id uuid NOT NULL REFERENCES admin_places(id) ON DELETE CASCADE,
  locale text NOT NULL,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (place_id, locale)
);

ALTER TABLE place_translations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'place_translations' AND policyname = 'Anyone authenticated can read translations'
  ) THEN
    CREATE POLICY "Anyone authenticated can read translations"
      ON place_translations FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'place_translations' AND policyname = 'Authenticated can insert translations'
  ) THEN
    CREATE POLICY "Authenticated can insert translations"
      ON place_translations FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'place_translations' AND policyname = 'Authenticated can update translations'
  ) THEN
    CREATE POLICY "Authenticated can update translations"
      ON place_translations FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS place_translations_locale_idx ON place_translations(locale);
