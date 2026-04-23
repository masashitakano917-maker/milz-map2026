import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');
const templatePath = join(distDir, 'index.html');
const template = readFileSync(templatePath, 'utf8');

const SITE = 'https://milz-map2026.pages.dev';

const AREAS = [
  {
    slug: 'tokyo',
    title: 'Tokyo curated city map — cafes, restaurants, hidden spots | MILZ',
    description:
      'Explore a curated Tokyo map across Shibuya, Shinjuku, Ginza, Asakusa and Jiyugaoka. Filter by ward or JR / Tokyo Metro station, save favorites, and see AI-picked Tokyo trends.',
    h1: 'Tokyo curated city map',
    locale: 'ja_JP',
    lang: 'ja',
    keywords:
      'Tokyo map, Shibuya cafe, Shinjuku restaurant, Ginza, Asakusa, Jiyugaoka, JR Yamanote, Tokyo Metro, curated Tokyo guide',
    geo: { lat: 35.6812, lng: 139.7671, name: 'Tokyo, Japan' },
    highlights: [
      'Shibuya', 'Shinjuku', 'Minato', 'Ginza', 'Asakusa', 'Nakameguro',
      'Jiyugaoka', 'Daikanyama', 'Roppongi', 'Kichijoji',
    ],
  },
  {
    slug: 'new-york',
    title: 'New York curated city map — Manhattan & Brooklyn spots | MILZ',
    description:
      'A curated New York map covering Manhattan, Williamsburg, SoHo, Chelsea and the Upper East Side. Filter by borough or subway station, save favorites, discover AI-picked NY trends.',
    h1: 'New York curated city map',
    locale: 'en_US',
    lang: 'en',
    keywords:
      'New York map, Manhattan spots, Williamsburg, SoHo, Chelsea, Brooklyn cafes, NYC subway guide, curated NY guide',
    geo: { lat: 40.758, lng: -73.9855, name: 'New York, USA' },
    highlights: [
      'Manhattan', 'Williamsburg', 'SoHo', 'Chelsea', 'Upper East Side',
      'Greenpoint', 'Lower East Side', 'Midtown', 'Tribeca', 'DUMBO',
    ],
  },
  {
    slug: 'kyoto',
    title: 'Kyoto curated city map — temples, tea houses, coffee | MILZ',
    description:
      'A curated Kyoto map across Gion, Higashiyama, Arashiyama, Nakagyo and Fushimi. Filter by ward or JR / Hankyu / Keihan station, save favorites, and see AI-picked Kyoto trends.',
    h1: 'Kyoto curated city map',
    locale: 'ja_JP',
    lang: 'ja',
    keywords:
      'Kyoto map, Gion, Higashiyama, Arashiyama, Nakagyo, Fushimi Inari, Hankyu Kyoto, Keihan, curated Kyoto guide',
    geo: { lat: 35.0116, lng: 135.7681, name: 'Kyoto, Japan' },
    highlights: [
      'Gion', 'Higashiyama', 'Arashiyama', 'Nakagyo', 'Sakyo',
      'Kamigyo', 'Fushimi', 'Uji', 'Shimogyo', 'Nishikyo',
    ],
  },
  {
    slug: 'seoul',
    title: 'Seoul curated city map — Hongdae, Seongsu, Itaewon | MILZ',
    description:
      'A curated Seoul map spanning Hongdae, Seongsu, Itaewon, Gangnam and Ikseon-dong. Filter by district, save favorites, and see AI-picked Seoul trends.',
    h1: 'Seoul curated city map',
    locale: 'ko_KR',
    lang: 'en',
    keywords:
      'Seoul map, Hongdae, Seongsu, Itaewon, Gangnam, Ikseon-dong, curated Seoul guide',
    geo: { lat: 37.5665, lng: 126.978, name: 'Seoul, South Korea' },
    highlights: [
      'Hongdae', 'Seongsu', 'Itaewon', 'Gangnam', 'Ikseon-dong',
      'Myeongdong', 'Yeonnam', 'Samcheong', 'Apgujeong', 'Bukchon',
    ],
  },
  {
    slug: 'hawaii',
    title: 'Hawaii curated map — Oahu, Maui, Big Island spots | MILZ',
    description:
      'A curated Hawaii map across Oahu, Maui and the Big Island. Discover beaches, cafes, restaurants and hidden spots, save favorites, and see AI-picked Hawaii trends.',
    h1: 'Hawaii curated map',
    locale: 'en_US',
    lang: 'en',
    keywords:
      'Hawaii map, Oahu spots, Waikiki, North Shore, Maui, Big Island, Kailua, curated Hawaii guide',
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
  const ogImage =
    'https://images.pexels.com/photos/3879071/pexels-photo-3879071.jpeg?auto=compress&cs=tinysrgb&w=1200';

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
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
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
