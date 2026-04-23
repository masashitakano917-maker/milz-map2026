/*
  # Kyoto & New York stations seed

  1. Purpose
    - Extend the `stations` master table to cover Kyoto and New York so the
      Station filter works there identically to Tokyo.

  2. Data added
    - ~25 Kyoto stations: JR, Hankyu, Keihan, Kyoto Subway (Karasuma / Tozai),
      Kintetsu and Randen coverage of central Kyoto + Fushimi / Arashiyama.
    - ~30 New York stations: Manhattan-centric subway hubs (1/2/3/4/5/6/7/A/C/
      E/L/N/Q/R/W) plus Grand Central, Penn, Atlantic-Barclays and major
      transfer points.

  3. Security
    - No schema changes. RLS policy from the original migration still applies
      (public SELECT, no writes from anon/authenticated).

  4. Notes
    - `name_jp` holds the Japanese form for Kyoto stations; left blank for NY.
    - `ON CONFLICT (area_key, name) DO NOTHING` keeps this idempotent.
*/

INSERT INTO stations (area_key, name, name_jp, lines, lat, lng, display_order) VALUES
  -- Kyoto
  ('kyoto','Kyoto','京都',ARRAY['JR Tokaido','JR Nara','JR Sagano','Kintetsu Kyoto','Karasuma Subway'],34.9859,135.7585,1),
  ('kyoto','Tambaguchi','丹波口',ARRAY['JR Sagano'],34.9909,135.7462,2),
  ('kyoto','Nijo','二条',ARRAY['JR Sagano','Tozai Subway'],35.0114,135.7424,3),
  ('kyoto','Enmachi','円町',ARRAY['JR Sagano'],35.0188,135.7391,4),
  ('kyoto','Hanazono','花園',ARRAY['JR Sagano'],35.0174,135.7201,5),
  ('kyoto','Uzumasa','太秦',ARRAY['JR Sagano'],35.0167,135.7067,6),
  ('kyoto','Saga-Arashiyama','嵯峨嵐山',ARRAY['JR Sagano'],35.0195,135.6824,7),
  ('kyoto','Tofukuji','東福寺',ARRAY['JR Nara','Keihan Main'],34.9796,135.7722,8),
  ('kyoto','Inari','稲荷',ARRAY['JR Nara'],34.9671,135.7727,9),
  ('kyoto','Gion-Shijo','祇園四条',ARRAY['Keihan Main'],35.0036,135.7722,10),
  ('kyoto','Sanjo','三条',ARRAY['Keihan Main','Tozai Subway'],35.0094,135.7720,11),
  ('kyoto','Demachiyanagi','出町柳',ARRAY['Keihan Main','Eizan Main'],35.0290,135.7719,12),
  ('kyoto','Shijo','四条',ARRAY['Karasuma Subway'],35.0023,135.7590,13),
  ('kyoto','Karasuma','烏丸',ARRAY['Hankyu Kyoto'],35.0022,135.7593,14),
  ('kyoto','Karasuma Oike','烏丸御池',ARRAY['Karasuma Subway','Tozai Subway'],35.0101,135.7595,15),
  ('kyoto','Marutamachi','丸太町',ARRAY['Karasuma Subway'],35.0198,135.7598,16),
  ('kyoto','Imadegawa','今出川',ARRAY['Karasuma Subway'],35.0289,135.7601,17),
  ('kyoto','Kitaoji','北大路',ARRAY['Karasuma Subway'],35.0432,135.7603,18),
  ('kyoto','Kitayama','北山',ARRAY['Karasuma Subway'],35.0497,135.7603,19),
  ('kyoto','Kokusaikaikan','国際会館',ARRAY['Karasuma Subway'],35.0623,135.7743,20),
  ('kyoto','Kawaramachi','河原町',ARRAY['Hankyu Kyoto'],35.0036,135.7689,21),
  ('kyoto','Katsura','桂',ARRAY['Hankyu Kyoto'],34.9806,135.7147,22),
  ('kyoto','Arashiyama','嵐山',ARRAY['Hankyu Arashiyama','Randen'],35.0129,135.6784,23),
  ('kyoto','Fushimi-Inari','伏見稲荷',ARRAY['Keihan Main'],34.9672,135.7718,24),
  ('kyoto','Momoyama','桃山',ARRAY['JR Nara'],34.9389,135.7730,25),
  ('kyoto','Uji','宇治',ARRAY['JR Nara','Keihan Uji'],34.8921,135.8064,26),
  -- New York
  ('new-york','Times Square - 42 St','',ARRAY['1','2','3','7','N','Q','R','W','S'],40.7560,-73.9870,1),
  ('new-york','Grand Central - 42 St','',ARRAY['4','5','6','7','S','Metro-North'],40.7527,-73.9772,2),
  ('new-york','Herald Square - 34 St','',ARRAY['B','D','F','M','N','Q','R','W'],40.7496,-73.9878,3),
  ('new-york','Penn Station - 34 St','',ARRAY['1','2','3','A','C','E','LIRR','Amtrak'],40.7506,-73.9936,4),
  ('new-york','Union Square - 14 St','',ARRAY['4','5','6','L','N','Q','R','W'],40.7359,-73.9911,5),
  ('new-york','14 St - 8 Av','',ARRAY['A','C','E','L'],40.7406,-74.0020,6),
  ('new-york','Columbus Circle - 59 St','',ARRAY['1','A','B','C','D'],40.7682,-73.9820,7),
  ('new-york','Lexington Av - 59 St','',ARRAY['4','5','6','N','R','W'],40.7628,-73.9676,8),
  ('new-york','Fulton St','',ARRAY['2','3','4','5','A','C','J','Z'],40.7104,-74.0088,9),
  ('new-york','World Trade Center','',ARRAY['1','E','PATH'],40.7126,-74.0103,10),
  ('new-york','Canal St','',ARRAY['4','6','J','N','Q','R','W','Z'],40.7188,-74.0008,11),
  ('new-york','Chambers St','',ARRAY['1','2','3','A','C','J','Z'],40.7146,-74.0090,12),
  ('new-york','Brooklyn Bridge - City Hall','',ARRAY['4','5','6'],40.7132,-74.0041,13),
  ('new-york','Atlantic Av - Barclays Ctr','',ARRAY['2','3','4','5','B','D','N','Q','R','W','LIRR'],40.6842,-73.9776,14),
  ('new-york','Jay St - MetroTech','',ARRAY['A','C','F','R'],40.6923,-73.9873,15),
  ('new-york','Bedford Av','',ARRAY['L'],40.7171,-73.9568,16),
  ('new-york','Court Sq','',ARRAY['7','E','M','G'],40.7470,-73.9452,17),
  ('new-york','Queensboro Plaza','',ARRAY['7','N','W'],40.7509,-73.9400,18),
  ('new-york','Flushing - Main St','',ARRAY['7'],40.7597,-73.8300,19),
  ('new-york','125 St','',ARRAY['4','5','6'],40.8043,-73.9374,20),
  ('new-york','86 St (Lexington)','',ARRAY['4','5','6','Q'],40.7790,-73.9559,21),
  ('new-york','72 St (Broadway)','',ARRAY['1','2','3'],40.7786,-73.9820,22),
  ('new-york','72 St (CPW)','',ARRAY['B','C'],40.7757,-73.9760,23),
  ('new-york','96 St (Broadway)','',ARRAY['1','2','3'],40.7938,-73.9723,24),
  ('new-york','59 St - Columbus Circle','',ARRAY['A','B','C','D','1'],40.7683,-73.9821,25),
  ('new-york','Roosevelt Island','',ARRAY['F','Tram'],40.7590,-73.9533,26),
  ('new-york','Hoyt - Schermerhorn','',ARRAY['A','C','G'],40.6884,-73.9854,27),
  ('new-york','Prospect Park','',ARRAY['B','Q','S'],40.6617,-73.9626,28),
  ('new-york','Coney Island - Stillwell','',ARRAY['D','F','N','Q'],40.5775,-73.9814,29),
  ('new-york','Jamaica - Sutphin Blvd','',ARRAY['E','J','Z','LIRR','AirTrain'],40.7003,-73.8074,30)
ON CONFLICT (area_key, name) DO NOTHING;
