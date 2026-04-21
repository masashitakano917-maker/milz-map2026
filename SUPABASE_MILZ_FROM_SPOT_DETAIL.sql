ALTER TABLE admin_places
  ADD COLUMN IF NOT EXISTS from_spot_heading TEXT,
  ADD COLUMN IF NOT EXISTS from_spot_intro TEXT,
  ADD COLUMN IF NOT EXISTS from_spot_items JSONB DEFAULT '[]'::jsonb;
