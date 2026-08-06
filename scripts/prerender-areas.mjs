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

// ai_trend_spots stores "ny" but URL slugs use "new-york"
const AREA_KEY_TO_SLUG = { ny: 'new-york', tokyo: 'tokyo', kyoto: 'kyoto', seoul: 'seoul', hawaii: 'hawaii' };
const SLUG_TO_AREA_KEY = Object.fromEntries(Object.entries(AREA_KEY_TO_SLUG).map(([k, v]) => [v, k]));

function normalizeAreaSlug(areaKey) {
  return AREA_KEY_TO_SLUG[areaKey] || areaKey;
}

function toPlaceSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u3000-\u9fff\uac00-\ud7af]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'spot';
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── Area definitions ───

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
      { name: "Duke's Waikiki", category: 'Seafood Restaurant', area: 'Waikiki' },
      { name: 'Pearl Harbor National Memorial', category: 'Memorial', area: 'Honolulu' },
      { name: 'The Pig and The Lady', category: 'Vietnamese Fusion', area: 'Kaimuki' },
      { name: 'Island Vintage Coffee', category: 'Coffee Shop', area: 'Waikiki' },
      { name: 'Kualoa Ranch', category: 'Nature Reserve', area: 'Kaneohe, Oahu' },
      { name: 'Hawai\u02BBi Volcanoes National Park', category: 'National Park', area: 'Big Island' },
      { name: 'Mud Hen Water', category: 'Modern Hawaiian', area: 'Kaimuki' },
      { name: 'Farm To Barn Cafe', category: 'Cafe', area: 'Haleiwa, North Shore' },
      { name: 'Hoomaluhia Botanical Garden', category: 'Botanical Garden', area: 'Kaneohe, Oahu' },
    ],
  },
];

// ─── Shared styles for SSR content ───
// Visible to ALL crawlers (not just noscript). React mounts into #root and
// replaces this content once JS executes, so human visitors see the SPA.
const SSR_STYLES = `
  <style id="ssr-styles">
    .ssr-content{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:0 auto;padding:2rem 1.25rem;color:#222;line-height:1.7}
    .ssr-content h1{font-size:1.75rem;font-weight:800;margin:0 0 .75rem;line-height:1.2}
    .ssr-content h2{font-size:1.25rem;font-weight:700;margin:1.5rem 0 .5rem;line-height:1.3}
    .ssr-content p{margin:0 0 .75rem}
    .ssr-content a{color:#0066cc;text-decoration:none}
    .ssr-content a:hover{text-decoration:underline}
    .ssr-content .breadcrumb{font-size:.75rem;color:#666;margin-bottom:1rem}
    .ssr-content .meta{color:#666;font-size:.875rem;margin:0 0 .75rem}
    .ssr-content .badge{display:inline-block;background:#f5f5f4;border-radius:6px;padding:2px 8px;font-size:.75rem;color:#444;margin-right:4px}
    .ssr-content .spot-grid{list-style:none;padding:0;margin:1rem 0}
    .ssr-content .spot-grid li{padding:.5rem 0;border-bottom:1px solid #f0f0f0}
    .ssr-content .spot-grid li:last-child{border-bottom:none}
    .ssr-content .spot-name{font-weight:600;color:#111}
    .ssr-content .spot-cat{font-size:.8rem;color:#777;margin-left:.25rem}
    .ssr-content .spot-area{font-size:.75rem;color:#999}
    .ssr-content .hours-block{background:#fafaf9;border-radius:8px;padding:.75rem 1rem;font-size:.85rem;white-space:pre-line;margin:.75rem 0}
    .ssr-content .cta{display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:8px;font-size:.875rem;font-weight:600;margin-top:1rem;text-decoration:none}
  </style>
`;

// ─── Area page builder ───

const buildAreaHtml = (area, areaSpots) => {
  const url = `${SITE}/${area.slug}/`;
  const ogImage = `${SITE}/og-image-milz-v2.png`;

  const jsonLdTravel = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: area.geo.name,
    url,
    description: area.description,
    geo: { '@type': 'GeoCoordinates', latitude: area.geo.lat, longitude: area.geo.lng },
    includesAttraction: area.highlights.map((h) => ({ '@type': 'TouristAttraction', name: h })),
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'MILZ', item: SITE },
      { '@type': 'ListItem', position: 2, name: area.geo.name, item: url },
    ],
  };

  // Build ItemList from real DB spots if available, otherwise fall back to hardcoded topSpots
  const listSpots = areaSpots.length > 0 ? areaSpots.slice(0, 30) : area.topSpots;
  const jsonLdItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best spots in ${area.geo.name} — curated by MILZ`,
    description: `Top-rated cafes, restaurants, and attractions in ${area.geo.name}, hand-picked by MILZ editors.`,
    numberOfItems: listSpots.length,
    itemListElement: listSpots.map((spot, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Place',
        name: spot.name,
        description: `${spot.category || ''} in ${spot.area || spot.address || area.geo.name}`.trim(),
        ...(spot.url && { url: spot.url }),
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
    ${SSR_STYLES}
  `;

  // Build rich visible HTML for crawlers — listed inside #root so React replaces it
  const spotsForHtml = areaSpots.length > 0 ? areaSpots.slice(0, 50) : area.topSpots;
  const spotListHtml = spotsForHtml.map((s) => {
    const spotSlug = toPlaceSlug(s.name);
    const spotUrl = `/${area.slug}/${spotSlug}`;
    return `<li><a href="${spotUrl}" class="spot-name">${escapeHtml(s.name)}</a><span class="spot-cat">${escapeHtml(s.category || '')}</span><br><span class="spot-area">${escapeHtml(s.area || s.address || '')}</span></li>`;
  }).join('\n          ');

  const isJa = area.lang === 'ja';
  const ssrContent = `
    <div class="ssr-content" id="ssr-prerendered">
      <nav class="breadcrumb">
        <a href="/">MILZ</a> &rsaquo; ${escapeHtml(area.geo.name)}
      </nav>
      <h1>${escapeHtml(area.h1)}</h1>
      <p>${escapeHtml(area.description)}</p>
      <h2>${isJa ? '注目エリア' : 'Featured neighborhoods'}</h2>
      <p>${area.highlights.map((h) => `<span class="badge">${escapeHtml(h)}</span>`).join(' ')}</p>
      <h2>${isJa ? 'おすすめスポット一覧' : 'Curated spots'}</h2>
      <ul class="spot-grid">
        ${spotListHtml}
      </ul>
      <p>${isJa
        ? `MILZでは${escapeHtml(area.geo.name)}の厳選されたカフェ、レストラン、ショップ、観光スポットを地図上で探索できます。区や駅で絞り込み、お気に入りを保存して旅のプランに活用してください。`
        : `Explore curated cafes, restaurants, shops, and attractions in ${escapeHtml(area.geo.name)} on the MILZ interactive map. Filter by district or station, save your favorites, and plan your trip.`
      }</p>
      <a href="/" class="cta">${isJa ? 'MILZマップを開く' : 'Open MILZ Map'}</a>
    </div>
  `;

  let html = template;
  html = html.replace(
    /(<meta name="theme-color"[^>]*>)\s*[\s\S]*?(<script type="module")/,
    `$1\n${headInjection}\n    $2`
  );
  // Put SSR content INSIDE #root so React.createRoot replaces it
  html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*<noscript>/, `<div id="root">${ssrContent}</div>\n    <noscript>`);
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${area.lang}"`);
  return html;
};

// ─── Spot page builder ───

const AREA_GEO_MAP = Object.fromEntries(AREAS.map((a) => [a.slug, a]));

function buildSpotHtml(spot, relatedSpots = []) {
  const areaSlug = normalizeAreaSlug(spot.area_key || 'tokyo');
  const slug = toPlaceSlug(spot.name);
  const url = `${SITE}/${areaSlug}/${slug}`;
  const ogImage = spot.image_url || `${SITE}/og-image-milz-v2.png`;
  const areaData = AREA_GEO_MAP[areaSlug];
  const areaName = areaData ? areaData.geo.name : areaSlug;
  const isJapanese = ['tokyo', 'kyoto'].includes(areaSlug);
  const lang = isJapanese ? 'ja' : 'en';

  const title = `${spot.name}${spot.category ? ` — ${spot.category}` : ''} | ${areaName} | MILZ`;
  const desc = spot.detailed_description || spot.milz_experience || spot.description || `${spot.name} in ${areaName}. Discover this spot on MILZ curated travel map.`;

  // Determine schema type
  const isRestaurant = spot.category && /restaurant|dining|food|ramen|sushi|steak|mexican|italian|french|hawaiian|korean|izakaya|レストラン|居酒屋|焼肉|寿司/i.test(spot.category);
  const isCafe = spot.category && /cafe|coffee|カフェ|喫茶/i.test(spot.category);
  const schemaType = isRestaurant ? 'Restaurant' : isCafe ? 'CafeOrCoffeeShop' : 'LocalBusiness';

  const jsonLdPlace = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: spot.name,
    url,
    description: desc,
    ...(spot.address && { address: { '@type': 'PostalAddress', streetAddress: spot.address } }),
    ...(spot.lat && spot.lng && { geo: { '@type': 'GeoCoordinates', latitude: spot.lat, longitude: spot.lng } }),
    ...(spot.rating && { aggregateRating: { '@type': 'AggregateRating', ratingValue: spot.rating, bestRating: 5, ratingCount: spot.review_count || 1 } }),
    ...(spot.image_url && { image: spot.image_url }),
    ...(spot.hours && { openingHours: spot.hours }),
    ...(spot.phone && { telephone: spot.phone }),
    ...(spot.website_url && { sameAs: spot.website_url }),
    containedInPlace: { '@type': 'City', name: areaName },
  };

  const jsonLdBreadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'MILZ', item: SITE },
      { '@type': 'ListItem', position: 2, name: areaName, item: `${SITE}/${areaSlug}/` },
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
    <script>window.__MILZ_INITIAL_AREA__=${JSON.stringify(areaSlug)};window.__MILZ_INITIAL_SPOT__=${JSON.stringify(spot.id)};</script>
    ${SSR_STYLES}
  `;

  // Build rich visible HTML body
  const nameJp = spot.name_jp && spot.name_jp !== spot.name ? ` (${escapeHtml(spot.name_jp)})` : '';

  let detailsHtml = '';
  if (spot.category) {
    detailsHtml += `<span class="badge">${escapeHtml(spot.category)}</span> `;
  }
  if (spot.category_jp && spot.category_jp !== spot.category) {
    detailsHtml += `<span class="badge">${escapeHtml(spot.category_jp)}</span> `;
  }

  let infoHtml = '';
  if (spot.address) {
    const addrLabel = isJapanese ? '住所' : 'Address';
    infoHtml += `<p class="meta">${addrLabel}: ${escapeHtml(spot.address)}</p>`;
  }
  if (spot.address_jp && spot.address_jp !== spot.address) {
    infoHtml += `<p class="meta">${escapeHtml(spot.address_jp)}</p>`;
  }
  if (spot.phone) {
    infoHtml += `<p class="meta">TEL: ${escapeHtml(spot.phone)}</p>`;
  }
  if (spot.hours) {
    const hoursLabel = isJapanese ? '営業時間' : 'Hours';
    infoHtml += `<div class="hours-block"><strong>${hoursLabel}</strong><br>${escapeHtml(spot.hours)}</div>`;
  }
  if (spot.rating) {
    const stars = '\u2605'.repeat(Math.round(spot.rating)) + '\u2606'.repeat(5 - Math.round(spot.rating));
    infoHtml += `<p class="meta">${stars} ${spot.rating}/5</p>`;
  }

  let descriptionHtml = '';
  if (spot.detailed_description) {
    descriptionHtml += `<p>${escapeHtml(spot.detailed_description)}</p>`;
  } else if (spot.description) {
    descriptionHtml += `<p>${escapeHtml(spot.description)}</p>`;
  }
  if (spot.milz_experience) {
    const expLabel = isJapanese ? 'MILZ体験メモ' : 'MILZ experience note';
    descriptionHtml += `<h2>${expLabel}</h2><p>${escapeHtml(spot.milz_experience)}</p>`;
  }

  if (!descriptionHtml) {
    descriptionHtml = isJapanese
      ? `<p>${escapeHtml(spot.name)}は${escapeHtml(areaName)}にある${escapeHtml(spot.category || 'スポット')}です。MILZの厳選マップで詳細をチェックしてください。</p>`
      : `<p>${escapeHtml(spot.name)} is a ${escapeHtml(spot.category || 'spot')} in ${escapeHtml(areaName)}. Discover more details on the MILZ curated travel map.</p>`;
  }

  const ssrContent = `
    <div class="ssr-content" id="ssr-prerendered">
      <nav class="breadcrumb">
        <a href="/">MILZ</a> &rsaquo;
        <a href="/${areaSlug}/">${escapeHtml(areaName)}</a> &rsaquo;
        ${escapeHtml(spot.name)}
      </nav>
      <h1>${escapeHtml(spot.name)}${nameJp}</h1>
      <p>${detailsHtml}</p>
      ${infoHtml}
      ${descriptionHtml}
      ${spot.website_url ? `<p><a href="${escapeHtml(spot.website_url)}" rel="noopener">${isJapanese ? '公式サイト' : 'Official website'}</a></p>` : ''}
      ${relatedSpots.length > 0 ? `
      <h2>${isJapanese ? `${escapeHtml(areaName)}の他のスポット` : `More spots in ${escapeHtml(areaName)}`}</h2>
      <ul class="spot-grid">
        ${relatedSpots.map((rs) => `<li><a href="/${areaSlug}/${rs.slug}" class="spot-name">${escapeHtml(rs.name)}</a><span class="spot-cat">${escapeHtml(rs.category || '')}</span></li>`).join('\n        ')}
      </ul>` : ''}
      <a href="/${areaSlug}/" class="cta">${isJapanese ? `${escapeHtml(areaName)}の全スポットを見る` : `View all spots in ${escapeHtml(areaName)}`}</a>
    </div>
  `;

  let html = template;
  html = html.replace(
    /(<meta name="theme-color"[^>]*>)\s*[\s\S]*?(<script type="module")/,
    `$1\n${headInjection}\n    $2`
  );
  html = html.replace(/<div id="root">[\s\S]*?<\/div>\s*<noscript>/, `<div id="root">${ssrContent}</div>\n    <noscript>`);
  html = html.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  return html;
}

// ─── Fetch spots from Supabase ───

async function fetchAllSpots() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase env vars missing — skipping spot prerender');
    return [];
  }
  const spots = [];

  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_places?select=id,name,description,detailed_description,milz_experience,category,lat,lng,address,website_url,image_url,hours,hours_label,phone,rating,review_count,area_key,area_label,badges`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (adminRes.ok) {
    const data = await adminRes.json();
    for (const row of data) spots.push({ ...row, source: 'admin' });
  } else {
    console.warn('Failed to fetch admin_places:', adminRes.status);
  }

  const trendRes = await fetch(
    `${SUPABASE_URL}/rest/v1/ai_trend_spots?select=id,name,name_jp,description,category,category_jp,lat,lng,address,address_jp,area_key,city_name,website_url,image_url,trend_score&order=trend_score.desc`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (trendRes.ok) {
    const data = await trendRes.json();
    for (const row of data) spots.push({ ...row, source: 'trend' });
  } else {
    console.warn('Failed to fetch ai_trend_spots:', trendRes.status);
  }

  return spots;
}

// ─── Main ───

const spots = await fetchAllSpots();

// Group spots by area slug for area pages
const spotsByArea = {};
for (const spot of spots) {
  const areaSlug = normalizeAreaSlug(spot.area_key || 'tokyo');
  if (!spotsByArea[areaSlug]) spotsByArea[areaSlug] = [];
  spotsByArea[areaSlug].push(spot);
}

// Prerender area pages
for (const area of AREAS) {
  const areaSpots = (spotsByArea[area.slug] || []).map((s) => ({
    name: s.name,
    category: s.category || '',
    area: s.area_label || s.address || '',
    address: s.address || '',
    url: `/${area.slug}/${toPlaceSlug(s.name)}`,
  }));
  const html = buildAreaHtml(area, areaSpots);
  const outDir = join(distDir, area.slug);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  console.log(`prerendered /${area.slug}/ (${areaSpots.length} spots listed)`);
}

// Prerender individual spot pages
const spotSitemapEntries = [];
const seenSlugs = new Set();

// Pre-build per-area slug lists for related spots
const areaSpotSlugs = {};
for (const spot of spots) {
  const areaSlug = normalizeAreaSlug(spot.area_key || 'tokyo');
  const slug = toPlaceSlug(spot.name);
  if (!areaSpotSlugs[areaSlug]) areaSpotSlugs[areaSlug] = [];
  areaSpotSlugs[areaSlug].push({ name: spot.name, slug, category: spot.category || '' });
}

for (const spot of spots) {
  const areaSlug = normalizeAreaSlug(spot.area_key || 'tokyo');
  const slug = toPlaceSlug(spot.name);
  const uniqueKey = `${areaSlug}/${slug}`;
  if (seenSlugs.has(uniqueKey)) continue;
  seenSlugs.add(uniqueKey);

  // Pick up to 8 related spots from the same area (excluding self)
  const siblings = (areaSpotSlugs[areaSlug] || []).filter((s) => s.slug !== slug);
  const relatedSpots = siblings.sort(() => Math.random() - 0.5).slice(0, 8);

  const html = buildSpotHtml(spot, relatedSpots);
  const outDir = join(distDir, areaSlug, slug);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html, 'utf8');
  spotSitemapEntries.push({ loc: `${SITE}/${areaSlug}/${slug}`, priority: '0.7', changefreq: 'weekly' });
}
console.log(`prerendered ${spotSitemapEntries.length} spot pages`);

// ─── Sitemap ───

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
