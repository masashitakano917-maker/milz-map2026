/*
  # Stations master table + Tokyo seed

  1. New Tables
    - `stations`
      - `id` (uuid) primary key
      - `area_key` (text) city/area this station belongs to (e.g. 'tokyo', 'new-york')
      - `name` (text) station display name
      - `name_jp` (text) optional Japanese name
      - `lines` (text[]) railway lines serving this station
      - `lat` (double precision)
      - `lng` (double precision)
      - `display_order` (integer) for stable sorting
      - `created_at` (timestamptz)
    - Indexed by `area_key` for fast area lookups.
  2. Security
    - RLS enabled.
    - Public SELECT only (stations are public reference data). No INSERT/UPDATE/DELETE policies = writes locked to service role.
  3. Seed
    - 80+ major Tokyo stations: JR Yamanote loop + Tokyo Metro / Toei major transfer hubs.
*/

CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_key text NOT NULL,
  name text NOT NULL,
  name_jp text DEFAULT '',
  lines text[] DEFAULT '{}',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stations_area_key ON stations(area_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_area_name ON stations(area_key, name);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stations' AND policyname = 'Stations are publicly readable') THEN
    CREATE POLICY "Stations are publicly readable"
      ON stations FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO stations (area_key, name, name_jp, lines, lat, lng, display_order) VALUES
  ('tokyo','Tokyo','東京',ARRAY['JR Yamanote','JR Chuo','JR Keihin-Tohoku','Tokyo Metro Marunouchi'],35.6812,139.7671,1),
  ('tokyo','Kanda','神田',ARRAY['JR Yamanote','JR Chuo','Tokyo Metro Ginza'],35.6918,139.7712,2),
  ('tokyo','Akihabara','秋葉原',ARRAY['JR Yamanote','JR Sobu','Tokyo Metro Hibiya','Tsukuba Express'],35.6984,139.7731,3),
  ('tokyo','Okachimachi','御徒町',ARRAY['JR Yamanote','JR Keihin-Tohoku'],35.7077,139.7745,4),
  ('tokyo','Ueno','上野',ARRAY['JR Yamanote','Tokyo Metro Ginza','Tokyo Metro Hibiya'],35.7138,139.7774,5),
  ('tokyo','Uguisudani','鶯谷',ARRAY['JR Yamanote'],35.7207,139.7786,6),
  ('tokyo','Nippori','日暮里',ARRAY['JR Yamanote','Keisei Main','Nippori-Toneri Liner'],35.7281,139.7708,7),
  ('tokyo','Nishi-Nippori','西日暮里',ARRAY['JR Yamanote','Tokyo Metro Chiyoda'],35.7323,139.7668,8),
  ('tokyo','Tabata','田端',ARRAY['JR Yamanote','JR Keihin-Tohoku'],35.7381,139.7607,9),
  ('tokyo','Komagome','駒込',ARRAY['JR Yamanote','Tokyo Metro Namboku'],35.7365,139.7476,10),
  ('tokyo','Sugamo','巣鴨',ARRAY['JR Yamanote','Toei Mita'],35.7333,139.7393,11),
  ('tokyo','Otsuka','大塚',ARRAY['JR Yamanote','Toden Arakawa'],35.7315,139.7289,12),
  ('tokyo','Ikebukuro','池袋',ARRAY['JR Yamanote','Tokyo Metro Marunouchi','Tokyo Metro Yurakucho','Tokyo Metro Fukutoshin'],35.7295,139.7109,13),
  ('tokyo','Mejiro','目白',ARRAY['JR Yamanote'],35.7214,139.7063,14),
  ('tokyo','Takadanobaba','高田馬場',ARRAY['JR Yamanote','Tokyo Metro Tozai','Seibu Shinjuku'],35.7129,139.7038,15),
  ('tokyo','Shin-Okubo','新大久保',ARRAY['JR Yamanote'],35.7013,139.7003,16),
  ('tokyo','Shinjuku','新宿',ARRAY['JR Yamanote','JR Chuo','Tokyo Metro Marunouchi','Toei Shinjuku','Toei Oedo'],35.6896,139.7006,17),
  ('tokyo','Yoyogi','代々木',ARRAY['JR Yamanote','JR Sobu','Toei Oedo'],35.6830,139.7022,18),
  ('tokyo','Harajuku','原宿',ARRAY['JR Yamanote'],35.6702,139.7027,19),
  ('tokyo','Shibuya','渋谷',ARRAY['JR Yamanote','Tokyo Metro Ginza','Tokyo Metro Hanzomon','Tokyo Metro Fukutoshin','Tokyu Toyoko','Tokyu Den-en-toshi'],35.6580,139.7016,20),
  ('tokyo','Ebisu','恵比寿',ARRAY['JR Yamanote','Tokyo Metro Hibiya'],35.6467,139.7100,21),
  ('tokyo','Meguro','目黒',ARRAY['JR Yamanote','Tokyo Metro Namboku','Toei Mita'],35.6339,139.7157,22),
  ('tokyo','Gotanda','五反田',ARRAY['JR Yamanote','Toei Asakusa'],35.6263,139.7232,23),
  ('tokyo','Osaki','大崎',ARRAY['JR Yamanote','Rinkai'],35.6197,139.7286,24),
  ('tokyo','Shinagawa','品川',ARRAY['JR Yamanote','JR Tokaido','Keikyu Main'],35.6284,139.7387,25),
  ('tokyo','Takanawa Gateway','高輪ゲートウェイ',ARRAY['JR Yamanote','JR Keihin-Tohoku'],35.6355,139.7406,26),
  ('tokyo','Tamachi','田町',ARRAY['JR Yamanote','JR Keihin-Tohoku'],35.6457,139.7476,27),
  ('tokyo','Hamamatsucho','浜松町',ARRAY['JR Yamanote','Tokyo Monorail'],35.6554,139.7571,28),
  ('tokyo','Shimbashi','新橋',ARRAY['JR Yamanote','Tokyo Metro Ginza','Toei Asakusa','Yurikamome'],35.6659,139.7583,29),
  ('tokyo','Yurakucho','有楽町',ARRAY['JR Yamanote','Tokyo Metro Yurakucho'],35.6750,139.7629,30),
  ('tokyo','Ginza','銀座',ARRAY['Tokyo Metro Ginza','Tokyo Metro Marunouchi','Tokyo Metro Hibiya'],35.6719,139.7644,31),
  ('tokyo','Roppongi','六本木',ARRAY['Tokyo Metro Hibiya','Toei Oedo'],35.6628,139.7315,32),
  ('tokyo','Azabu-juban','麻布十番',ARRAY['Tokyo Metro Namboku','Toei Oedo'],35.6556,139.7363,33),
  ('tokyo','Omotesando','表参道',ARRAY['Tokyo Metro Ginza','Tokyo Metro Chiyoda','Tokyo Metro Hanzomon'],35.6655,139.7127,34),
  ('tokyo','Gaienmae','外苑前',ARRAY['Tokyo Metro Ginza'],35.6710,139.7175,35),
  ('tokyo','Aoyama-itchome','青山一丁目',ARRAY['Tokyo Metro Ginza','Tokyo Metro Hanzomon','Toei Oedo'],35.6726,139.7240,36),
  ('tokyo','Akasaka','赤坂',ARRAY['Tokyo Metro Chiyoda'],35.6720,139.7378,37),
  ('tokyo','Akasaka-mitsuke','赤坂見附',ARRAY['Tokyo Metro Ginza','Tokyo Metro Marunouchi'],35.6772,139.7370,38),
  ('tokyo','Toranomon','虎ノ門',ARRAY['Tokyo Metro Ginza'],35.6692,139.7497,39),
  ('tokyo','Toranomon Hills','虎ノ門ヒルズ',ARRAY['Tokyo Metro Hibiya'],35.6673,139.7491,40),
  ('tokyo','Kasumigaseki','霞ケ関',ARRAY['Tokyo Metro Marunouchi','Tokyo Metro Hibiya','Tokyo Metro Chiyoda'],35.6738,139.7519,41),
  ('tokyo','Hibiya','日比谷',ARRAY['Tokyo Metro Hibiya','Tokyo Metro Chiyoda','Toei Mita'],35.6745,139.7599,42),
  ('tokyo','Otemachi','大手町',ARRAY['Tokyo Metro Marunouchi','Tokyo Metro Tozai','Tokyo Metro Chiyoda','Tokyo Metro Hanzomon','Toei Mita'],35.6847,139.7637,43),
  ('tokyo','Nihombashi','日本橋',ARRAY['Tokyo Metro Ginza','Tokyo Metro Tozai','Toei Asakusa'],35.6831,139.7740,44),
  ('tokyo','Kayabacho','茅場町',ARRAY['Tokyo Metro Hibiya','Tokyo Metro Tozai'],35.6813,139.7793,45),
  ('tokyo','Ningyocho','人形町',ARRAY['Tokyo Metro Hibiya','Toei Asakusa'],35.6859,139.7827,46),
  ('tokyo','Tsukiji','築地',ARRAY['Tokyo Metro Hibiya'],35.6663,139.7707,47),
  ('tokyo','Tsukishima','月島',ARRAY['Tokyo Metro Yurakucho','Toei Oedo'],35.6651,139.7848,48),
  ('tokyo','Toyosu','豊洲',ARRAY['Tokyo Metro Yurakucho','Yurikamome'],35.6549,139.7966,49),
  ('tokyo','Monzen-nakacho','門前仲町',ARRAY['Tokyo Metro Tozai','Toei Oedo'],35.6720,139.7962,50),
  ('tokyo','Kiyosumi-shirakawa','清澄白河',ARRAY['Tokyo Metro Hanzomon','Toei Oedo'],35.6812,139.7993,51),
  ('tokyo','Asakusa','浅草',ARRAY['Tokyo Metro Ginza','Toei Asakusa','Tobu Skytree'],35.7119,139.7967,52),
  ('tokyo','Oshiage','押上',ARRAY['Tokyo Metro Hanzomon','Toei Asakusa','Tobu Skytree'],35.7099,139.8136,53),
  ('tokyo','Ryogoku','両国',ARRAY['JR Sobu','Toei Oedo'],35.6961,139.7935,54),
  ('tokyo','Kuramae','蔵前',ARRAY['Toei Asakusa','Toei Oedo'],35.7050,139.7905,55),
  ('tokyo','Ochanomizu','御茶ノ水',ARRAY['JR Chuo','JR Sobu','Tokyo Metro Marunouchi'],35.6995,139.7659,56),
  ('tokyo','Suidobashi','水道橋',ARRAY['JR Chuo','JR Sobu','Toei Mita'],35.7020,139.7538,57),
  ('tokyo','Iidabashi','飯田橋',ARRAY['JR Chuo','JR Sobu','Tokyo Metro Tozai','Tokyo Metro Yurakucho','Tokyo Metro Namboku','Toei Oedo'],35.7018,139.7451,58),
  ('tokyo','Kagurazaka','神楽坂',ARRAY['Tokyo Metro Tozai'],35.7013,139.7402,59),
  ('tokyo','Ichigaya','市ケ谷',ARRAY['JR Chuo','JR Sobu','Tokyo Metro Yurakucho','Tokyo Metro Namboku','Toei Shinjuku'],35.6939,139.7354,60),
  ('tokyo','Yotsuya','四ツ谷',ARRAY['JR Chuo','Tokyo Metro Marunouchi','Tokyo Metro Namboku'],35.6857,139.7296,61),
  ('tokyo','Shinjuku-sanchome','新宿三丁目',ARRAY['Tokyo Metro Marunouchi','Tokyo Metro Fukutoshin','Toei Shinjuku'],35.6907,139.7051,62),
  ('tokyo','Higashi-shinjuku','東新宿',ARRAY['Tokyo Metro Fukutoshin','Toei Oedo'],35.6954,139.7076,63),
  ('tokyo','Nakano-sakaue','中野坂上',ARRAY['Tokyo Metro Marunouchi','Toei Oedo'],35.6970,139.6881,64),
  ('tokyo','Nakano','中野',ARRAY['JR Chuo','Tokyo Metro Tozai'],35.7058,139.6654,65),
  ('tokyo','Koenji','高円寺',ARRAY['JR Chuo'],35.7058,139.6498,66),
  ('tokyo','Asagaya','阿佐ケ谷',ARRAY['JR Chuo'],35.7052,139.6357,67),
  ('tokyo','Ogikubo','荻窪',ARRAY['JR Chuo','Tokyo Metro Marunouchi'],35.7046,139.6201,68),
  ('tokyo','Kichijoji','吉祥寺',ARRAY['JR Chuo','Keio Inokashira'],35.7031,139.5797,69),
  ('tokyo','Shimokitazawa','下北沢',ARRAY['Odakyu Odawara','Keio Inokashira'],35.6612,139.6683,70),
  ('tokyo','Sangen-jaya','三軒茶屋',ARRAY['Tokyu Den-en-toshi','Tokyu Setagaya'],35.6434,139.6711,71),
  ('tokyo','Futako-tamagawa','二子玉川',ARRAY['Tokyu Den-en-toshi','Tokyu Oimachi'],35.6110,139.6278,72),
  ('tokyo','Jiyugaoka','自由が丘',ARRAY['Tokyu Toyoko','Tokyu Oimachi'],35.6076,139.6686,73),
  ('tokyo','Nakameguro','中目黒',ARRAY['Tokyu Toyoko','Tokyo Metro Hibiya'],35.6440,139.6990,74),
  ('tokyo','Daikanyama','代官山',ARRAY['Tokyu Toyoko'],35.6482,139.7028,75),
  ('tokyo','Ebisu-garden','恵比寿ガーデン',ARRAY['JR Yamanote'],35.6449,139.7134,76),
  ('tokyo','Waseda','早稲田',ARRAY['Tokyo Metro Tozai'],35.7054,139.7205,77),
  ('tokyo','Oimachi','大井町',ARRAY['JR Keihin-Tohoku','Tokyu Oimachi','Rinkai'],35.6063,139.7341,78),
  ('tokyo','Tennozu Isle','天王洲アイル',ARRAY['Tokyo Monorail','Rinkai'],35.6212,139.7503,79),
  ('tokyo','Daiba','台場',ARRAY['Yurikamome'],35.6295,139.7736,80),
  ('tokyo','Kasuga','春日',ARRAY['Toei Mita','Toei Oedo'],35.7079,139.7522,81),
  ('tokyo','Korakuen','後楽園',ARRAY['Tokyo Metro Marunouchi','Tokyo Metro Namboku'],35.7074,139.7521,82),
  ('tokyo','Nihonbashi-Kabutocho','兜町',ARRAY['Tokyo Metro Tozai'],35.6792,139.7782,83),
  ('tokyo','Sendagaya','千駄ケ谷',ARRAY['JR Sobu'],35.6809,139.7107,84),
  ('tokyo','Shinanomachi','信濃町',ARRAY['JR Sobu'],35.6806,139.7198,85)
ON CONFLICT (area_key, name) DO NOTHING;
