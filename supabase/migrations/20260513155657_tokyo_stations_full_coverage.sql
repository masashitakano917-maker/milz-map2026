/*
  # Tokyo Stations - Comprehensive Coverage

  ## Summary
  Adds a broad set of additional Tokyo-area stations to the `stations` table so that
  filtering by station works across all major operators (Odakyu, Seibu Shinjuku,
  Seibu Ikebukuro, Tobu Tojo, Tobu Skytree, Keio, Keio Inokashira, Keikyu, Keisei,
  Tokyu Toyoko/Den-en-toshi/Oimachi/Meguro/Setagaya, Tokyo Metro, Toei, Tsukuba Express,
  Yurikamome, Rinkai, Tokyo Monorail, Nippori-Toneri Liner, Toden Arakawa).

  ## Changes
  1. New rows inserted into `public.stations` (no schema changes)
     - All inserts are idempotent via `ON CONFLICT DO NOTHING` using a
       (area_key, name) uniqueness check helper expression.
  2. No destructive operations — existing stations are preserved.

  ## Security
  No RLS policy changes; existing policies remain in effect.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'stations_area_name_unique'
  ) THEN
    CREATE UNIQUE INDEX stations_area_name_unique ON public.stations (area_key, name);
  END IF;
END $$;

INSERT INTO public.stations (area_key, name, name_jp, lines, lat, lng, display_order) VALUES
  -- Odakyu Odawara line (Shinjuku side, in Tokyo)
  ('tokyo','Sangubashi','参宮橋','{"Odakyu Odawara"}',35.6791,139.6890,500),
  ('tokyo','Yoyogi-Hachiman','代々木八幡','{"Odakyu Odawara"}',35.6707,139.6859,501),
  ('tokyo','Yoyogi-Uehara','代々木上原','{"Odakyu Odawara","Tokyo Metro Chiyoda"}',35.6688,139.6795,502),
  ('tokyo','Higashi-Kitazawa','東北沢','{"Odakyu Odawara"}',35.6671,139.6748,503),
  ('tokyo','Setagaya-Daita','世田谷代田','{"Odakyu Odawara"}',35.6571,139.6656,504),
  ('tokyo','Umegaoka','梅ケ丘','{"Odakyu Odawara"}',35.6516,139.6519,505),
  ('tokyo','Gotokuji','豪徳寺','{"Odakyu Odawara"}',35.6488,139.6403,506),
  ('tokyo','Kyodo','経堂','{"Odakyu Odawara"}',35.6481,139.6320,507),
  ('tokyo','Chitose-Funabashi','千歳船橋','{"Odakyu Odawara"}',35.6444,139.6131,508),
  ('tokyo','Soshigaya-Okura','祖師ヶ谷大蔵','{"Odakyu Odawara"}',35.6434,139.6020,509),
  ('tokyo','Seijogakuen-mae','成城学園前','{"Odakyu Odawara"}',35.6403,139.5921,510),
  ('tokyo','Kitami','喜多見','{"Odakyu Odawara"}',35.6373,139.5807,511),
  ('tokyo','Komae','狛江','{"Odakyu Odawara"}',35.6333,139.5727,512),
  -- Seibu Shinjuku line
  ('tokyo','Seibu-Shinjuku','西武新宿','{"Seibu Shinjuku"}',35.6963,139.6996,520),
  ('tokyo','Shin-Okubo (Seibu)','新大久保(西武)','{"Seibu Shinjuku"}',35.7008,139.7000,521),
  ('tokyo','Nakai','中井','{"Seibu Shinjuku","Toei Oedo"}',35.7167,139.6892,522),
  ('tokyo','Numabukuro','沼袋','{"Seibu Shinjuku"}',35.7245,139.6726,523),
  ('tokyo','Nogata','野方','{"Seibu Shinjuku"}',35.7283,139.6628,524),
  ('tokyo','Toritsu-Kasei','都立家政','{"Seibu Shinjuku"}',35.7314,139.6552,525),
  ('tokyo','Saginomiya','鷺ノ宮','{"Seibu Shinjuku"}',35.7338,139.6492,526),
  ('tokyo','Shimo-Igusa','下井草','{"Seibu Shinjuku"}',35.7314,139.6402,527),
  ('tokyo','Iogi','井荻','{"Seibu Shinjuku"}',35.7297,139.6326,528),
  ('tokyo','Kami-Igusa','上井草','{"Seibu Shinjuku"}',35.7287,139.6213,529),
  -- Seibu Ikebukuro line
  ('tokyo','Shiinamachi','椎名町','{"Seibu Ikebukuro"}',35.7322,139.7044,540),
  ('tokyo','Higashi-Nagasaki','東長崎','{"Seibu Ikebukuro"}',35.7345,139.6952,541),
  ('tokyo','Ekoda','江古田','{"Seibu Ikebukuro"}',35.7374,139.6770,542),
  ('tokyo','Sakuradai','桜台','{"Seibu Ikebukuro"}',35.7377,139.6700,543),
  ('tokyo','Nerima','練馬','{"Seibu Ikebukuro","Toei Oedo","Seibu Toshima"}',35.7373,139.6543,544),
  ('tokyo','Nakamurabashi','中村橋','{"Seibu Ikebukuro"}',35.7380,139.6398,545),
  ('tokyo','Fujimidai','富士見台','{"Seibu Ikebukuro"}',35.7384,139.6324,546),
  ('tokyo','Nerima-Takanodai','練馬高野台','{"Seibu Ikebukuro"}',35.7416,139.6235,547),
  ('tokyo','Shakujii-Koen','石神井公園','{"Seibu Ikebukuro"}',35.7445,139.6045,548),
  ('tokyo','Oizumi-Gakuen','大泉学園','{"Seibu Ikebukuro"}',35.7505,139.5859,549),
  ('tokyo','Hibarigaoka','ひばりヶ丘','{"Seibu Ikebukuro"}',35.7523,139.5493,550),
  -- Keio line
  ('tokyo','Sasazuka','笹塚','{"Keio","Toei Shinjuku"}',35.6722,139.6669,560),
  ('tokyo','Daita-bashi','代田橋','{"Keio"}',35.6704,139.6587,561),
  ('tokyo','Meidaimae','明大前','{"Keio","Keio Inokashira"}',35.6680,139.6493,562),
  ('tokyo','Shimo-takaido','下高井戸','{"Keio","Tokyu Setagaya"}',35.6681,139.6396,563),
  ('tokyo','Sakurajosui','桜上水','{"Keio"}',35.6677,139.6315,564),
  ('tokyo','Kami-Kitazawa','上北沢','{"Keio"}',35.6691,139.6213,565),
  ('tokyo','Hachimanyama','八幡山','{"Keio"}',35.6713,139.6118,566),
  ('tokyo','Roka-Koen','芦花公園','{"Keio"}',35.6712,139.6025,567),
  ('tokyo','Chitose-Karasuyama','千歳烏山','{"Keio"}',35.6709,139.5894,568),
  ('tokyo','Senkawa','仙川','{"Keio"}',35.6688,139.5807,569),
  ('tokyo','Tsutsujigaoka','つつじヶ丘','{"Keio"}',35.6630,139.5664,570),
  ('tokyo','Chofu','調布','{"Keio","Keio Sagamihara"}',35.6519,139.5439,571),
  -- Keio Inokashira line
  ('tokyo','Shimo-Kitazawa (Keio)','下北沢(井の頭)','{"Keio Inokashira"}',35.6614,139.6680,580),
  ('tokyo','Ikenoue','池ノ上','{"Keio Inokashira"}',35.6603,139.6726,581),
  ('tokyo','Komaba-Todaimae','駒場東大前','{"Keio Inokashira"}',35.6580,139.6804,582),
  ('tokyo','Shinsen','神泉','{"Keio Inokashira"}',35.6586,139.6921,583),
  ('tokyo','Eifukucho','永福町','{"Keio Inokashira"}',35.6788,139.6446,584),
  ('tokyo','Nishi-Eifuku','西永福','{"Keio Inokashira"}',35.6814,139.6362,585),
  ('tokyo','Hamadayama','浜田山','{"Keio Inokashira"}',35.6859,139.6307,586),
  ('tokyo','Takaido','高井戸','{"Keio Inokashira"}',35.6855,139.6193,587),
  ('tokyo','Fujimigaoka','富士見ヶ丘','{"Keio Inokashira"}',35.6873,139.6072,588),
  ('tokyo','Kugayama','久我山','{"Keio Inokashira"}',35.6885,139.5984,589),
  ('tokyo','Mitakadai','三鷹台','{"Keio Inokashira"}',35.6925,139.5876,590),
  ('tokyo','Inokashira-Koen','井の頭公園','{"Keio Inokashira"}',35.7008,139.5800,591),
  -- Tokyu Toyoko/Meguro/Den-en-toshi extras
  ('tokyo','Yutenji','祐天寺','{"Tokyu Toyoko"}',35.6358,139.6914,600),
  ('tokyo','Toritsu-Daigaku','都立大学','{"Tokyu Toyoko"}',35.6228,139.6841,601),
  ('tokyo','Gakugei-Daigaku','学芸大学','{"Tokyu Toyoko"}',35.6286,139.6873,602),
  ('tokyo','Den-en-chofu','田園調布','{"Tokyu Toyoko","Tokyu Meguro"}',35.5984,139.6679,603),
  ('tokyo','Tamagawa','多摩川','{"Tokyu Toyoko","Tokyu Meguro","Tokyu Tamagawa"}',35.5915,139.6688,604),
  ('tokyo','Musashi-Kosugi (Tokyu)','武蔵小杉(東急)','{"Tokyu Toyoko","Tokyu Meguro"}',35.5775,139.6580,605),
  ('tokyo','Fudomae','不動前','{"Tokyu Meguro"}',35.6258,139.7160,606),
  ('tokyo','Musashi-Koyama','武蔵小山','{"Tokyu Meguro"}',35.6147,139.7088,607),
  ('tokyo','Nishi-Koyama','西小山','{"Tokyu Meguro"}',35.6088,139.7033,608),
  ('tokyo','Senzoku','洗足','{"Tokyu Meguro"}',35.6037,139.6951,609),
  ('tokyo','Oookayama','大岡山','{"Tokyu Meguro","Tokyu Oimachi"}',35.6087,139.6840,610),
  ('tokyo','Komazawa-Daigaku','駒沢大学','{"Tokyu Den-en-toshi"}',35.6291,139.6618,611),
  ('tokyo','Sakura-shimmachi','桜新町','{"Tokyu Den-en-toshi"}',35.6291,139.6488,612),
  ('tokyo','Yoga','用賀','{"Tokyu Den-en-toshi"}',35.6290,139.6377,613),
  ('tokyo','Kaminoge','上野毛','{"Tokyu Oimachi"}',35.6126,139.6293,614),
  ('tokyo','Todoroki','等々力','{"Tokyu Oimachi"}',35.6071,139.6342,615),
  ('tokyo','Kuhonbutsu','九品仏','{"Tokyu Oimachi"}',35.6049,139.6488,616),
  -- Keikyu line (Tokyo)
  ('tokyo','Sengakuji','泉岳寺','{"Keikyu Main","Toei Asakusa"}',35.6390,139.7396,630),
  ('tokyo','Shimbamba','新馬場','{"Keikyu Main"}',35.6189,139.7398,631),
  ('tokyo','Aomono-Yokocho','青物横丁','{"Keikyu Main"}',35.6082,139.7434,632),
  ('tokyo','Tachiaigawa','立会川','{"Keikyu Main"}',35.5975,139.7441,633),
  ('tokyo','Omori-Kaigan','大森海岸','{"Keikyu Main"}',35.5872,139.7434,634),
  ('tokyo','Heiwajima','平和島','{"Keikyu Main"}',35.5797,139.7427,635),
  ('tokyo','Omori-machi','大森町','{"Keikyu Main"}',35.5732,139.7384,636),
  ('tokyo','Umeyashiki','梅屋敷','{"Keikyu Main"}',35.5694,139.7350,637),
  ('tokyo','Keikyu-Kamata','京急蒲田','{"Keikyu Main","Keikyu Airport"}',35.5612,139.7281,638),
  ('tokyo','Anamori-Inari','穴守稲荷','{"Keikyu Airport"}',35.5538,139.7427,639),
  ('tokyo','Tenkubashi','天空橋','{"Keikyu Airport","Tokyo Monorail"}',35.5483,139.7472,640),
  -- Keisei line (Tokyo)
  ('tokyo','Keisei-Ueno','京成上野','{"Keisei Main"}',35.7106,139.7762,650),
  ('tokyo','Shin-Bambacho','新馬場(京成)','{"Keisei Main"}',35.7299,139.7706,651),
  ('tokyo','Sendagi','千駄木','{"Tokyo Metro Chiyoda"}',35.7268,139.7619,652),
  ('tokyo','Aoto','青砥','{"Keisei Main","Keisei Oshiage"}',35.7503,139.8516,653),
  ('tokyo','Oshiage (Keisei)','押上(京成)','{"Keisei Oshiage","Tokyo Metro Hanzomon","Toei Asakusa","Tobu Skytree"}',35.7104,139.8138,654),
  -- Tobu Skytree / Tojo
  ('tokyo','Tokyo Skytree','とうきょうスカイツリー','{"Tobu Skytree"}',35.7100,139.8107,660),
  ('tokyo','Hikifune','曳舟','{"Tobu Skytree","Tobu Kameido"}',35.7195,139.8161,661),
  ('tokyo','Kanegafuchi','鐘ヶ淵','{"Tobu Skytree"}',35.7290,139.8154,662),
  ('tokyo','Horikiri','堀切','{"Tobu Skytree"}',35.7409,139.8159,663),
  ('tokyo','Ushida','牛田','{"Tobu Skytree"}',35.7395,139.8059,664),
  ('tokyo','Kita-Senju','北千住','{"JR Joban","Tokyo Metro Hibiya","Tokyo Metro Chiyoda","Tobu Skytree","Tsukuba Express"}',35.7497,139.8050,665),
  ('tokyo','Ikebukuro (Tobu)','池袋(東武)','{"Tobu Tojo"}',35.7295,139.7100,670),
  ('tokyo','Kita-Ikebukuro','北池袋','{"Tobu Tojo"}',35.7370,139.7113,671),
  ('tokyo','Shimo-Itabashi','下板橋','{"Tobu Tojo"}',35.7404,139.7080,672),
  ('tokyo','Oyama','大山','{"Tobu Tojo"}',35.7493,139.6989,673),
  ('tokyo','Naka-Itabashi','中板橋','{"Tobu Tojo"}',35.7553,139.6939,674),
  ('tokyo','Tokiwadai','ときわ台','{"Tobu Tojo"}',35.7626,139.6856,675),
  ('tokyo','Kami-Itabashi','上板橋','{"Tobu Tojo"}',35.7704,139.6740,676),
  ('tokyo','Tobu-Nerima','東武練馬','{"Tobu Tojo"}',35.7702,139.6635,677),
  -- Toei Mita line extras
  ('tokyo','Itabashi-Honcho','板橋本町','{"Toei Mita"}',35.7560,139.7024,690),
  ('tokyo','Motohasunuma','本蓮沼','{"Toei Mita"}',35.7674,139.7115,691),
  ('tokyo','Shimura-Sakaue','志村坂上','{"Toei Mita"}',35.7724,139.6948,692),
  ('tokyo','Nishidai','西台','{"Toei Mita"}',35.7843,139.6816,693),
  ('tokyo','Takashimadaira','高島平','{"Toei Mita"}',35.7889,139.6726,694),
  -- Toei Shinjuku line extras
  ('tokyo','Bakuro-Yokoyama','馬喰横山','{"Toei Shinjuku"}',35.6925,139.7826,700),
  ('tokyo','Hamacho','浜町','{"Toei Shinjuku"}',35.6886,139.7873,701),
  ('tokyo','Morishita','森下','{"Toei Shinjuku","Toei Oedo"}',35.6877,139.7972,702),
  ('tokyo','Kikukawa','菊川','{"Toei Shinjuku"}',35.6907,139.8049,703),
  ('tokyo','Sumiyoshi','住吉','{"Toei Shinjuku","Tokyo Metro Hanzomon"}',35.6953,139.8155,704),
  ('tokyo','Nishi-Ojima','西大島','{"Toei Shinjuku"}',35.6908,139.8246,705),
  -- Toei Asakusa line extras
  ('tokyo','Magome','馬込','{"Toei Asakusa"}',35.5862,139.7144,710),
  ('tokyo','Nakanobu','中延','{"Toei Asakusa","Tokyu Oimachi"}',35.6021,139.7176,711),
  ('tokyo','Togoshi','戸越','{"Toei Asakusa"}',35.6080,139.7176,712),
  -- Toden Arakawa line (selected)
  ('tokyo','Minowabashi','三ノ輪橋','{"Toden Arakawa"}',35.7290,139.7905,720),
  ('tokyo','Machiya-ekimae','町屋駅前','{"Toden Arakawa","Tokyo Metro Chiyoda","Keisei Main"}',35.7383,139.7794,721),
  ('tokyo','Otsuka-ekimae','大塚駅前','{"Toden Arakawa","JR Yamanote"}',35.7314,139.7286,722),
  ('tokyo','Waseda (Toden)','早稲田(都電)','{"Toden Arakawa"}',35.7062,139.7197,723),
  -- Tsukuba Express extras
  ('tokyo','Shin-Okachimachi','新御徒町','{"Tsukuba Express","Toei Oedo"}',35.7065,139.7795,730),
  ('tokyo','Asakusa (TX)','浅草(つくば)','{"Tsukuba Express"}',35.7115,139.7902,731),
  ('tokyo','Minami-Senju','南千住','{"JR Joban","Tokyo Metro Hibiya","Tsukuba Express"}',35.7332,139.7991,732),
  -- Yurikamome extras
  ('tokyo','Shiodome','汐留','{"Yurikamome","Toei Oedo"}',35.6649,139.7613,740),
  ('tokyo','Takeshiba','竹芝','{"Yurikamome"}',35.6584,139.7619,741),
  ('tokyo','Hinode','日の出','{"Yurikamome"}',35.6541,139.7607,742),
  ('tokyo','Shibaura-Futo','芝浦ふ頭','{"Yurikamome"}',35.6457,139.7585,743),
  ('tokyo','Odaiba-Kaihinkoen','お台場海浜公園','{"Yurikamome"}',35.6300,139.7733,744),
  ('tokyo','Aomi','青海','{"Yurikamome"}',35.6243,139.7790,745),
  ('tokyo','Telecom Center','テレコムセンター','{"Yurikamome"}',35.6195,139.7794,746),
  -- Rinkai line
  ('tokyo','Tokyo Teleport','東京テレポート','{"Rinkai"}',35.6293,139.7777,750),
  ('tokyo','Shin-Kiba','新木場','{"Rinkai","JR Keiyo","Tokyo Metro Yurakucho"}',35.6471,139.8266,751),
  -- Tokyo Metro extras
  ('tokyo','Korakuen (Namboku)','後楽園(南北)','{"Tokyo Metro Namboku"}',35.7079,139.7521,760),
  ('tokyo','Akabane-Iwabuchi','赤羽岩淵','{"Tokyo Metro Namboku"}',35.7820,139.7195,761),
  ('tokyo','Nishigahara','西ヶ原','{"Tokyo Metro Namboku"}',35.7488,139.7475,762),
  ('tokyo','Hon-Komagome','本駒込','{"Tokyo Metro Namboku"}',35.7280,139.7474,763),
  ('tokyo','Todaimae','東大前','{"Tokyo Metro Namboku"}',35.7218,139.7556,764),
  ('tokyo','Kiba','木場','{"Tokyo Metro Tozai"}',35.6692,139.8090,765),
  ('tokyo','Toyocho','東陽町','{"Tokyo Metro Tozai"}',35.6693,139.8204,766)
ON CONFLICT (area_key, name) DO NOTHING;
