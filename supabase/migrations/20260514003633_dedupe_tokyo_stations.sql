/*
  # Deduplicate Tokyo Stations

  ## Summary
  Several Tokyo stations exist twice in `public.stations` because earlier seeds
  inserted both lowercase variants (e.g. "Chitose-funabashi") and title-case
  variants (e.g. "Chitose-Funabashi") for the same physical station. The
  station filter dropdown therefore shows the same station twice.

  This migration removes the lowercase duplicates, keeping the title-case row
  (which carries the corrected coordinates from the most recent fix migration).

  ## Changes
  1. Deletes the lowercase-name duplicate rows in `public.stations` where a
     title-case row with the same `name_jp` already exists in the same
     `area_key`. This is non-destructive to unique stations: only true
     duplicates are removed.

  ## Security
  No RLS policy changes; existing policies remain in effect.
*/

DELETE FROM public.stations s
WHERE s.area_key = 'tokyo'
  AND s.name <> initcap(s.name)
  AND EXISTS (
    SELECT 1 FROM public.stations t
    WHERE t.area_key = s.area_key
      AND t.name_jp = s.name_jp
      AND t.id <> s.id
      AND t.name = initcap(t.name)
  );
