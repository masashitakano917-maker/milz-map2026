/*
  # Fix Seibu Shinjuku Line Station Coordinates

  ## Summary
  The previously seeded coordinates for several stations on the Seibu Shinjuku line
  (and a few nearby) did not match the actual station locations on the map.
  This migration updates the latitude/longitude for those stations so the
  filter-driven map navigation lands the user exactly where the station icon
  appears on the underlying basemap.

  ## Changes
  1. Updates `public.stations` rows for the following Tokyo stations
     (no schema changes, no destructive operations):
     - Numabukuro
     - Nakai
     - Nogata
     - Toritsu-Kasei
     - Saginomiya
     - Shimo-Igusa
     - Iogi
     - Kami-Igusa
     - Shin-Okubo (Seibu)

  ## Security
  No RLS policy changes; existing policies remain in effect.
*/

UPDATE public.stations SET lat = 35.7263, lng = 139.6679 WHERE area_key = 'tokyo' AND name = 'Numabukuro';
UPDATE public.stations SET lat = 35.7177, lng = 139.6864 WHERE area_key = 'tokyo' AND name = 'Nakai';
UPDATE public.stations SET lat = 35.7297, lng = 139.6549 WHERE area_key = 'tokyo' AND name = 'Nogata';
UPDATE public.stations SET lat = 35.7305, lng = 139.6471 WHERE area_key = 'tokyo' AND name = 'Toritsu-Kasei';
UPDATE public.stations SET lat = 35.7327, lng = 139.6391 WHERE area_key = 'tokyo' AND name = 'Saginomiya';
UPDATE public.stations SET lat = 35.7295, lng = 139.6311 WHERE area_key = 'tokyo' AND name = 'Shimo-Igusa';
UPDATE public.stations SET lat = 35.7271, lng = 139.6232 WHERE area_key = 'tokyo' AND name = 'Iogi';
UPDATE public.stations SET lat = 35.7256, lng = 139.6131 WHERE area_key = 'tokyo' AND name = 'Kami-Igusa';
UPDATE public.stations SET lat = 35.7015, lng = 139.7002 WHERE area_key = 'tokyo' AND name = 'Shin-Okubo (Seibu)';
