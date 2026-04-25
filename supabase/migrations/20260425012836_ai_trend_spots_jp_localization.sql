/*
  # Add Japanese localization columns to ai_trend_spots

  1. Schema Changes
    - `ai_trend_spots`
      - Add `name_jp` (text, nullable) — Japanese (kanji/katakana) translation of the spot name
      - Add `address_jp` (text, nullable) — Japanese translation/normalization of the address
      - Add `category_jp` (text, nullable) — Japanese translation of the category
  2. Rationale
    - External data sources (Google Places, Foursquare) return romaji / English names and addresses
      even for Japanese locations. We precompute and persist Japanese variants so that the UI can
      display them consistently when the user selects the JP locale.
  3. Security
    - No RLS changes. The existing SELECT policy continues to apply.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_trend_spots' AND column_name = 'name_jp'
  ) THEN
    ALTER TABLE ai_trend_spots ADD COLUMN name_jp text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_trend_spots' AND column_name = 'address_jp'
  ) THEN
    ALTER TABLE ai_trend_spots ADD COLUMN address_jp text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_trend_spots' AND column_name = 'category_jp'
  ) THEN
    ALTER TABLE ai_trend_spots ADD COLUMN category_jp text;
  END IF;
END $$;
