/*
  # Seed Seoul stations master data

  1. Purpose
    - Add 20 major Seoul subway stations to the existing `stations` table
    - Enables nearest-station lookup for AI Weekly Trend SPOTS in the Seoul area

  2. Data
    - 20 well-known stations covering popular districts (Hongdae, Gangnam, Itaewon,
      Myeongdong, Seongsu, Yeonnam, Yeouido, Jongno, etc.)
    - Each row includes English name, Korean name (stored in `name_jp` column for
      compatibility with the existing schema), line list, latitude, and longitude

  3. Safety
    - Uses ON CONFLICT DO NOTHING via id generation - re-running is safe
    - Only inserts; does not modify or delete existing rows
*/

INSERT INTO stations (area_key, name, name_jp, lines, lat, lng, display_order) VALUES
  ('seoul', 'Hongik University', '홍대입구', ARRAY['Line 2', 'Airport', 'Gyeongui'], 37.5572, 126.9245, 1),
  ('seoul', 'Gangnam', '강남', ARRAY['Line 2', 'Shinbundang'], 37.4979, 127.0276, 2),
  ('seoul', 'Itaewon', '이태원', ARRAY['Line 6'], 37.5345, 126.9947, 3),
  ('seoul', 'Myeongdong', '명동', ARRAY['Line 4'], 37.5636, 126.9869, 4),
  ('seoul', 'Seongsu', '성수', ARRAY['Line 2'], 37.5446, 127.0559, 5),
  ('seoul', 'Yeonnam', '연남', ARRAY['Gyeongui'], 37.5601, 126.9241, 6),
  ('seoul', 'Yeouido', '여의도', ARRAY['Line 5', 'Line 9'], 37.5219, 126.9245, 7),
  ('seoul', 'Jongno 3-ga', '종로3가', ARRAY['Line 1', 'Line 3', 'Line 5'], 37.5713, 126.9914, 8),
  ('seoul', 'Apgujeong', '압구정', ARRAY['Line 3'], 37.5273, 127.0286, 9),
  ('seoul', 'Apgujeong Rodeo', '압구정로데오', ARRAY['Suin-Bundang'], 37.5274, 127.0407, 10),
  ('seoul', 'Sinsa', '신사', ARRAY['Line 3', 'Shinbundang'], 37.5163, 127.0203, 11),
  ('seoul', 'Garosu-gil (Sinsa)', '가로수길', ARRAY['Line 3'], 37.5202, 127.0228, 12),
  ('seoul', 'Samgakji', '삼각지', ARRAY['Line 4', 'Line 6'], 37.5347, 126.9731, 13),
  ('seoul', 'Dongdaemun History & Culture Park', '동대문역사문화공원', ARRAY['Line 2', 'Line 4', 'Line 5'], 37.5653, 127.0078, 14),
  ('seoul', 'Euljiro 3-ga', '을지로3가', ARRAY['Line 2', 'Line 3'], 37.5663, 126.9919, 15),
  ('seoul', 'Hapjeong', '합정', ARRAY['Line 2', 'Line 6'], 37.5497, 126.9136, 16),
  ('seoul', 'Sangsu', '상수', ARRAY['Line 6'], 37.5478, 126.9226, 17),
  ('seoul', 'Konkuk University', '건대입구', ARRAY['Line 2', 'Line 7'], 37.5403, 127.0696, 18),
  ('seoul', 'Anguk', '안국', ARRAY['Line 3'], 37.5764, 126.9854, 19),
  ('seoul', 'Seoul Station', '서울역', ARRAY['Line 1', 'Line 4', 'Airport', 'Gyeongui'], 37.5546, 126.9707, 20)
ON CONFLICT DO NOTHING;
