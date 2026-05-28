import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env') });

const distDir = join(__dirname, '..', 'dist');
const templatePath = join(distDir, 'index.html');
const template = readFileSync(templatePath, 'utf8');

const SITE = 'https://milz-map.com';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

function toPlaceSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'spot';
}

const AREAS = [
  {
    slug: 'tokyo',
    title: '東京 旅行・観光ガイド｜Tokyo travel map — カフェ・レストラン・隠れスポット | MILZ',
    description:
      '東京の旅・旅行・観光に使える厳選マップ。渋谷・新宿・銀座・浅草・自由が丘などのカフェ、レストラン、ショップ、隠れスポットを区や駅(JR山手線・東京メトロ)から検索。お気に入り保存、AIが選ぶ東京トレンドも。Tokyo travel guide and curated city map.',
    h1: '東京 旅行・観光マップ / Tokyo curated travel map',
    locale: 'ja_JP',
    lang: 'ja',
    keywords:
      '東京, 東京 旅行, 東京 観光, 東京 マップ, 旅, 旅行, 観光, travel, Tokyo travel, Tokyo map, Tokyo guide, 渋谷 カフェ, 新宿 レストラン, 銀座, 浅草, 自由が丘, 中目黒, 代官山, 六本木, 吉祥寺, JR山手線, 東京メトロ, 東京 おすすめ, 東京 グルメ, 東京 スポット, curated Tokyo guide',
    geo: { lat: 35.6812, lng: 139.7671, name: 'Tokyo, Japan' },
    highlights: [
      'Shibuya', 'Shinjuku', 'Minato', 'Ginza', 'Asakusa', 'Nakameguro',
      'Jiyugaoka', 'Daikanyama', 'Roppongi', 'Kichijoji',
    ],
    topSpots: [
      { name: 'Fuglen Tokyo', category: 'Coffee Shop', area: 'Tomigaya, Shibuya' },
      { name: 'Den', category: 'Japanese Restaurant', area: 'Jingumae, Shibuya' },
      { name: 'Senso-ji', category: 'Buddhist Temple', area: 'Asakusa, Taito' },
      { name: 'teamLab Planets TOKYO DMM', category: 'Art Museum', area: 'Toyosu, Koto' },
      { name: 'Shibuya Sky', category: 'Observation Deck', area: 'Shibuya' },
      { name: 'Cafe Kitsune Aoyama', category: 'Coffee Shop', area: 'Minamiaoyama, Minato' },
      { name: 'Narisawa', category: 'French Restaurant', area: 'Minamiaoyama, Minato' },
      { name: 'Shinjuku Gyoen', category: 'Garden', area: 'Shinjuku' },
      { name: 'Meiji Jingu', category: 'Shinto Shrine', area: 'Yoyogi, Shibuya' },
      { name: 'Shinjuku Golden-Gai', category: 'Nightlife', area: 'Kabukicho, Shinjuku' },
    ],
  },
  {
    slug: 'new-york',
    title: 'New York travel guide & curated city map — Manhattan, Brooklyn | MILZ',
    description:
      'A curated New York travel guide and map covering Manhattan, Williamsburg, SoHo, Chelsea and the Upper East Side. Filter by borough or subway station, save favorites, discover AI-picked NYC trends. ニューヨーク 旅行・観光マップ。',
    h1: 'New York travel guide & curated map',
    locale: 'en_US',
    lang: 'en',
    keywords:
      'New York travel, NYC travel guide, New York map, Manhattan, Williamsburg, SoHo, Chelsea, Brooklyn, Upper East Side, Tribeca, DUMBO, NYC subway, things to do NYC, New York cafes, New York restaurants, ニューヨーク, ニューヨーク 旅行, ニューヨーク 観光, NY 旅行, travel, 旅, 旅行, 観光, curated NY guide',
    geo: { lat: 40.758, lng: -73.9855, name: 'New York, USA' },
    highlights: [
      'Manhattan', 'Williamsburg', 'SoHo', 'Chelsea', 'Upper East Side',
      'Greenpoint', 'Lower East Side', 'Midtown', 'Tribeca', 'DUMBO',
    ],
    topSpots: [
      { name: 'Gramercy Tavern', category: 'American Restaurant', area: 'Flatiron' },
      { name: 'Balthazar', category: 'French Restaurant', area: 'SoHo' },
      { name: 'The Dead Rabbit', category: 'Cocktail Bar', area: 'FiDi' },
      { name: 'Au Cheval', category: 'American Restaurant', area: 'Nolita' },
      { name: 'Cafe Sabarsky', category: 'Austrian Cafe', area: 'Upper East Side' },
      { name: 'The Modern', category: 'Fine Dining', area: 'Midtown (MoMA)' },
      { name: 'Union Square Cafe', category: 'American Restaurant', area: 'Union Square' },
      { name: 'One if by Land, Two if by Sea', category: 'American Restaurant', area: 'West Village' },
      { name: 'Bibble & Sip', category: 'Bakery & Cafe', area: 'Midtown' },
      { name: 'The Dutch', category: 'American Restaurant', area: 'SoHo' },
    ],
  },
  {
    slug: 'kyoto',
    title: '京都 旅行・観光ガイド｜Kyoto travel map — 寺社・町家・カフェ | MILZ',
    description:
      '京都の旅・旅行・観光に使える厳選マップ。祇園・東山・嵐山・中京・伏見などの寺社、町家カフェ、レストラン、隠れスポットを区や駅(JR・阪急・京阪)から検索。お気に入り保存、AIが選ぶ京都トレンドも。Kyoto travel guide with temples, tea houses and coffee.',
    h1: '京都 旅行・観光マップ / Kyoto curated travel map',
    locale: 'ja_JP',
    lang: 'ja',
    keywords:
      '京都, 京都 旅行, 京都 観光, 京都 マップ, 京都 おすすめ, 京都 グルメ, 京都 カフェ, 祇園, 東山, 嵐山, 中京, 伏見稲荷, 宇治, 下京, 阪急京都線, 京阪電車, 旅, 旅行, 観光, 国内旅行, travel, Kyoto travel, Kyoto guide, Kyoto map, temples Kyoto, tea house Kyoto, curated Kyoto guide',
    geo: { lat: 35.0116, lng: 135.7681, name: 'Kyoto, Japan' },
    highlights: [
      'Gion', 'Higashiyama', 'Arashiyama', 'Nakagyo', 'Sakyo',
      'Kamigyo', 'Fushimi', 'Uji', 'Shimogyo', 'Nishikyo',
    ],
    topSpots: [
      { name: '% Arabica Kyoto', category: 'Coffee Shop', area: 'Higashiyama' },
      { name: 'Cafe Bibliotic Hello!', category: 'Cafe', area: 'Nakagyo' },
      { name: 'Yasaka Shrine', category: 'Shrine', area: 'Higashiyama (Gion)' },
      { name: 'Kennin-ji', category: 'Buddhist Temple', area: 'Higashiyama' },
      { name: 'Fortune Garden Kyoto', category: 'Restaurant', area: 'Nakagyo' },
      { name: 'Ippodo Tea', category: 'Tea Room', area: 'Nakagyo' },
      { name: 'Nishiki Market', category: 'Market', area: 'Nakagyo' },
      { name: 'Walden Woods Kyoto', category: 'Coffee Shop', area: 'Shimogyo' },
      { name: 'La Madrague', category: 'Kissaten', area: 'Nakagyo' },
      { name: 'Kodai-ji', category: 'Buddhist Temple', area: 'Higashiyama' },
    ],
  },
  {
    slug: 'seoul',
    title: 'Seoul travel guide — Hongdae, Seongsu, Itaewon | ソウル 旅行マップ | MILZ',
    description:
      'Seoul travel guide and curated city map covering Hongdae, Seongsu, Itaewon, Gangnam and Ikseon-dong. Filter by district, save favorites, discover AI-picked Seoul trends. ソウルの旅・旅行・観光に使える厳選マップ。韓国旅行のカフェ、レストラン、ショッピング、隠れスポットを地区から検索。',
    h1: 'Seoul travel guide & curated map / ソウル 旅行マップ',
    locale: 'ko_KR',
    lang: 'en',
    keywords:
      'Seoul travel, Seoul guide, Seoul map, Hongdae, Seongsu, Itaewon, Gangnam, Ikseon-dong, Myeongdong, Yeonnam, Bukchon, Samcheong, Korea travel, Korean cafe, K-food, K-beauty, ソウル, ソウル 旅行, ソウル 観光, 韓国 旅行, 韓国 観光, 弘大, 聖水洞, 梨泰院, 江南, 旅, 旅行, 観光, travel, curated Seoul guide',
    geo: { lat: 37.5665, lng: 126.978, name: 'Seoul, South Korea' },
    highlights: [
      'Hongdae', 'Seongsu', 'Itaewon', 'Gangnam', 'Ikseon-dong',
      'Myeongdong', 'Yeonnam', 'Samcheong', 'Apgujeong', 'Bukchon',
    ],
    topSpots: [
      { name: 'Cafe Onion Anguk', category: 'Cafe', area: 'Jongno (Anguk)' },
      { name: 'Gyeongbokgung Palace', category: 'Cultural Landmark', area: 'Jongno' },
      { name: 'Jungsik Seoul', category: 'Modern Korean', area: 'Gangnam' },
      { name: 'Bukchon Hanok Village', category: 'Historical Village', area: 'Jongno' },
      { name: 'Gwangjang Market', category: 'Food Market', area: 'Jongno' },
      { name: 'N Seoul Tower', category: 'Observation Deck', area: 'Yongsan' },
      { name: 'Thanks Nature Cafe', category: 'Cafe', area: 'Hongdae, Mapo' },
      { name: 'Mingles', category: 'Modern Korean', area: 'Gangnam' },
      { name: 'Ikseon-dong Hanok Village', category: 'Cafe District', area: 'Jongno' },
      { name: 'Seoul Forest Park', category: 'Park', area: 'Seongdong (Seongsu)' },
    ],
  },
  {
    slug: 'hawaii',
    title: 'Hawaii travel guide — Oahu, Maui, Big Island | ハワイ 旅行マップ | MILZ',
    description:
      'Hawaii travel guide and curated map across Oahu, Maui and the Big Island. Discover beaches, cafes, restaurants, shopping and hidden spots. ハワイの旅・旅行・観光に使える厳選マップ。ワイキキ・カイルア・ノースショア・マウイ・ハワイ島のビーチ、カフェ、レストランを検索。',
    h1: 'Hawaii travel guide & curated map / ハワイ 旅行マップ',
    locale: 'en_US',
    lang: 'en',
    keywords:
      'Hawaii travel, Hawaii guide, Hawaii map, Oahu, Waikiki, North Shore, Haleiwa, Kailua, Maui, Big Island, Kona, Hilo, Lahaina, Wailea, Kaanapali, Ko Olina, Hawaii beaches, things to do Hawaii, Hawaii vacation, ハワイ, ハワイ 旅行, ハワイ 観光, ワイキキ, マウイ, ハワイ島, 海外旅行, リゾート, ビーチ, 旅, 旅行, 観光, travel, curated Hawaii guide',
    geo: { lat: 21.3069, lng: -157.8583, name: 'Honolulu, Hawaii, USA' },
    highlights: [
      'Waikiki', 'Kailua', 'North Shore', 'Lahaina', 'Wailea',
      'Kona', 'Hilo', 'Haleiwa', 'Kaanapali', 'Ko Olina',
    ],
    topSpots: [
      { name: 'Senia', category: 'Fine Dining', area: 'Chinatown, Honolulu' },
      { name: 'Duke\'s Waikiki', category: 'Seafood Restaurant', area: 'Waikiki' },
      { name: 'Pearl Harbor National Memorial', category: 'Memorial', area: 'Honolulu' },
      { name: 'The Pig and The Lady', category: 'Vietnamese Fusion', area: 'Kaimuki' },
      { name: 'Island Vintage Coffee', category: 'Coffee Shop', area: 'Waikiki' },
      { name: 'Kualoa Ranch', category: 'Nature Reserve', area: 'Kaneohe, Oahu' },
      { name: 'Hawaiʻi Volcanoes National Park', category: 'National Park', area: 'Big Island' },
      { name: 'Mud Hen Water', category: 'Modern Hawaiian', area: 'Kaimuki' },
      { name: 'Farm To Barn Cafe', category: 'Cafe', area: 'Haleiwa, North Shore' },
      { name: 'Hoomaluhia Botanical Garden', category: 'Botanical Garden', area: 'Kaneohe, Oahu' },
    ],
  },
];

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildAreaHtml = (area) => {
  const url = `${SITE}/${area.slug}/`;
  const ogImage = `${SITE}/og-image-milz-v2.png`;

  const jsonLdTravel = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: area.geo.name,
    url,
    description: area.description,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: area.geo.lat,
      longitude: area.geo.lng,
    },
    includesAttraction: area.highlights.map((h) => ({
      '@type': 'TouristAttraction',
      name: h,
    })),
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'MILZ', item: SITE },
      { '@type': 'ListItem', position: 2, name: area.geo.name, item: url },
    ],
  };

  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best spots in ${area.geo.name} — curated by MILZ`,
    description: `Top-rated cafes, restaurants, and attractions in ${area.geo.name}, hand-picked by MILZ editors.`,
    numberOfItems: area.topSpots.length,
    itemListElement: area.topSpots.map((spot, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Place',
        name: spot.name,
        description: `${spot.category} in ${spot.area}`,
      },
    })),
  };

  const headInjection = `
    <title>${escapeHtml(area.title)}</title>
    <meta name="description" content="${escapeHtml(area.description)}" />
    <meta name="keywords" content="${escapeHtml(area.keywords)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="MILZ" />
    <meta property="og:title" content="${escapeHtml(area.title)}" />
    <meta property="og:description" content="${escapeHtml(area.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="${area.locale}" />
    <meta property="og:image" content="${ogImage}" />
    <meta property="og:image:secure_url" content="${ogImage}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="2077" />
    <meta property="og:image:height" content="1382" />
    <meta property="og:image:alt" content="${escapeHtml(area.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(area.title)}" />
    <meta name="twitter:description" content="${escapeHtml(area.description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="geo.position" content="${area.geo.lat};${area.geo.lng}" />
    <meta name="geo.placename" content="${escapeHtml(area.geo.name)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLdTravel)}</script>
    <script type="application/ld+json">${JSON.stringify(jsonLdBreadcrumb)}</script>
    <script type="application/ld+json">${JSON.stringify(jsonLdItemList)}</script>
    <script>window.__MILZ_INITIAL_AREA__=${JSON.stringify(area.slug)};</script>
  `;

  const noscriptBlock = `
    <noscript>
      <header style="font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1.25rem;">
        <h1 style="font-size:1.75rem;font-weight:800;margin:0 0 .5rem;">${escapeHtml(area.h1)}</h1>
        <p style="color:#444;line-height:1.6;">${escapeHtml(area.description)}</p>
        <h2 style="font-size:1rem;font-weight:700;margin-top:1.5rem;">Featured neighborhoods</h2>
        <ul>${area.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>
      </header>
    </noscript>
  `;

  let html = template;
  html = html.replace(
    /<title>[\s\S]*?<\/title>[\s\S]*?<\/head>/,
    `${headInjection}\n  </head>`
  );
  html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>${noscriptBlock}`);
  html = html.replace(
    /<html lang="[^"]*"/,
    `<html lang="${area.lang}"`
  );
  return html;
};

for (const area of AREAS) {
  const html = buildAreaHtml(area);
  const outDir = join(distDir, area.slug);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  console.log(`prerendered /${area.slug}/`);
}

// --- Spot pages from Supabase ---

const AREA_GEO_MAP = Object.fromEntries(AREAS.map((a) => [a.slug, a]));

async function fetchAllSpots() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase env vars missing — skipping spot prerender');
    return [];
  }
  const spots = [];

  // admin_places
  const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_places?select=id,name,description,detailed_description,category,lat,lng,address,area_key,area_label,image_url,hours,rating,review_count`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (adminRes.ok) {
    const data = await adminRes.json();
    for (const row of data) {
      spots.push({ ...row, source: 'admin' });
    }
  }

  // ai_trend_spots
  const trendRes = await fetch(`${SUPABASE_URL}/rest/v1/ai_trend_spots?select=id,name,name_jp,description,category,lat,lng,address,area_key,city_name,website_url,image_url,trend_score&order=trend_score.desc`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (trendRes.ok) {
    const data = await trendRes.json();
    for (const row of data) {
      spots.push({ ...row, source: 'trend' });
    }
  }

  return spots;
}

function buildSpotHtml(spot) {
  const areaKey = spot.area_key || 'tokyo';
  const slug = toPlaceSlug(spot.name);
  const url = `${SITE}/${areaKey}/${slug}`;
  const ogImage = spot.image_url || `${SITE}/og-image-milz-v2.png`;
  const areaData = AREA_GEO_MAP[areaKey];
  const areaName = areaData ? areaData.geo.name : areaKey;
  const isJapanese = ['tokyo', 'kyoto'].includes(areaKey);
  const lang = isJapanese ? 'ja' : 'en';

  const title = `${spot.name}${spot.category ? ` — ${spot.category}` : ''} | ${areaName} | MILZ`;
  const desc = spot.detailed_description || spot.description || `${spot.name} in ${areaName}. Discover this spot on MILZ curated travel map.`;

  const jsonLdPlace = {
    '@context': 'https://schema.org',
    '@type': spot.category && /restaurant|dining|food|ramen|sushi|steak|mexican|italian|french|hawaiian|korean/i.test(spot.category) ? 'Restaurant' : 'LocalBusiness',
    name: spot.name,
    url,
    description: desc,
    ...(spot.address && { address: { '@type': 'PostalAddress', streetAddress: spot.address } }),
    ...(spot.lat && spot.lng && { geo: { '@type': 'GeoCoordinates', latitude: spot.lat, longitude: spot.lng } }),
    ...(spot.rating && { aggregateRating: { '@type': 'AggregateRating', ratingValue: spot.rating, bestRating: 5, ratingCount: spot.review_count || 1 } }),
    ...(spot.image_url && { image: spot.image_url }),
    ...(spot.hours && { openingHours: spot.hours }),
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'MILZ', item: SITE },
      { '@type': 'ListItem', position: 2, name: areaName, item: `${SITE}/${areaKey}/` },
      { '@type': 'ListItem', position: 3, name: spot.name, item: url },
    ],
  };

  const headInjection = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(desc.slice(0, 160))}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="place" />
    <meta property="og:site_name" content="MILZ" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(desc.slice(0, 160))}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${escapeHtml(ogImage)}" />
    <meta property="og:image:alt" content="${escapeHtml(spot.name)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc.slice(0, 160))}" />
    <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
    ${spot.lat && spot.lng ? `<meta name="geo.position" content="${spot.lat};${spot.lng}" />` : ''}
    <script type="application/ld+json">${JSON.stringify(jsonLdPlace)}</script>
    <script type="application/ld+json">${JSON.stringify(jsonLdBreadcrumb)}</script>
    <script>window.__MILZ_INITIAL_AREA__=${JSON.stringify(areaKey)};window.__MILZ_INITIAL_SPOT__=${JSON.stringify(spot.id)};</script>
  `;

  const noscriptBlock = `
    <noscript>
      <article style="font-family:system-ui;max-width:720px;margin:2rem auto;padding:0 1.25rem;">
        <nav style="font-size:0.75rem;color:#666;margin-bottom:1rem;">
          <a href="/" style="color:#333;">MILZ</a> &rsaquo;
          <a href="/${areaKey}/" style="color:#333;">${escapeHtml(areaName)}</a> &rsaquo;
          ${escapeHtml(spot.name)}
        </nav>
        <h1 style="font-size:1.75rem;font-weight:800;margin:0 0 .5rem;">${escapeHtml(spot.name)}</h1>
        ${spot.category ? `<p style="color:#666;font-size:0.875rem;margin:0 0 0.75rem;">${escapeHtml(spot.category)}${spot.address ? ` — ${escapeHtml(spot.address)}` : ''}</p>` : ''}
        <p style="color:#444;line-height:1.6;">${escapeHtml(desc)}</p>
        <p style="margin-top:1rem;"><a href="/${areaKey}/" style="color:#0066cc;">View all spots in ${escapeHtml(areaName)}</a></p>
      </article>
    </noscript>
  `;

  let html = template;
  html = html.replace(
    /<title>[\s\S]*?<\/title>[\s\S]*?<\/head>/,
    `${headInjection}\n  </head>`
  );
  html = html.replace(/<div id="root"><\/div>/, `<div id="root"></div>${noscriptBlock}`);
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  return html;
}

const spots = await fetchAllSpots();
const spotSitemapEntries = [];
const seenSlugs = new Set();

for (const spot of spots) {
  const areaKey = spot.area_key || 'tokyo';
  const slug = toPlaceSlug(spot.name);
  const uniqueKey = `${areaKey}/${slug}`;
  if (seenSlugs.has(uniqueKey)) continue;
  seenSlugs.add(uniqueKey);

  const html = buildSpotHtml(spot);
  const outDir = join(distDir, areaKey, slug);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  spotSitemapEntries.push({ loc: `${SITE}/${areaKey}/${slug}`, priority: '0.7', changefreq: 'weekly' });
}
console.log(`prerendered ${spotSitemapEntries.length} spot pages`);

// --- Sitemap ---

const today = new Date().toISOString().slice(0, 10);

const sitemapEntries = [
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'daily' },
  ...AREAS.map((a) => ({ loc: `${SITE}/${a.slug}/`, priority: '0.9', changefreq: 'weekly' })),
  ...spotSitemapEntries,
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>
`;
writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf8');
console.log(`sitemap.xml written (${sitemapEntries.length} URLs)`);
