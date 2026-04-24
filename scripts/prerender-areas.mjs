import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const templatePath = join(distDir, 'index.html');
const template = readFileSync(templatePath, 'utf8');

const SITE = 'https://milz-map.com';

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
  },
];

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const buildAreaHtml = (area) => {
  const url = `${SITE}/${area.slug}/`;
  const ogImage = `${SITE}/og-image.png`;

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
    <meta property="og:image:width" content="3420" />
    <meta property="og:image:height" content="2214" />
    <meta property="og:image:alt" content="${escapeHtml(area.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(area.title)}" />
    <meta name="twitter:description" content="${escapeHtml(area.description)}" />
    <meta name="twitter:image" content="${ogImage}" />
    <meta name="geo.position" content="${area.geo.lat};${area.geo.lng}" />
    <meta name="geo.placename" content="${escapeHtml(area.geo.name)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLdTravel)}</script>
    <script type="application/ld+json">${JSON.stringify(jsonLdBreadcrumb)}</script>
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

const sitemapEntries = [
  { loc: `${SITE}/`, priority: '1.0' },
  ...AREAS.map((a) => ({ loc: `${SITE}/${a.slug}/`, priority: '0.9' })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (e) =>
      `  <url>\n    <loc>${e.loc}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`
  )
  .join('\n')}
</urlset>
`;
writeFileSync(join(distDir, 'sitemap.xml'), sitemap, 'utf8');
console.log('sitemap.xml written');
