import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type AreaKey = "ny" | "tokyo" | "kyoto" | "seoul" | "hawaii";

type AreaConfig = {
  key: AreaKey;
  label: string;
  center: { lat: number; lng: number };
  radius: number;
  fsqNear: string;
  rssFeeds: { name: string; url: string }[];
};

const AREAS: AreaConfig[] = [
  {
    key: "ny",
    label: "New York",
    center: { lat: 40.7831, lng: -73.9712 },
    radius: 20000,
    fsqNear: "New York, NY",
    rssFeeds: [
      { name: "Time Out New York", url: "https://www.timeout.com/newyork/feed.rss" },
      { name: "Eater NY", url: "https://ny.eater.com/rss/index.xml" },
    ],
  },
  {
    key: "tokyo",
    label: "Tokyo",
    center: { lat: 35.6762, lng: 139.6503 },
    radius: 25000,
    fsqNear: "Tokyo, Japan",
    rssFeeds: [
      { name: "Time Out Tokyo", url: "https://www.timeout.com/tokyo/feed.rss" },
      { name: "Tokyo Weekender", url: "https://www.tokyoweekender.com/feed/" },
    ],
  },
  {
    key: "kyoto",
    label: "Kyoto",
    center: { lat: 35.0116, lng: 135.7681 },
    radius: 15000,
    fsqNear: "Kyoto, Japan",
    rssFeeds: [
      { name: "Kyoto Journal", url: "https://kyotojournal.org/feed/" },
    ],
  },
  {
    key: "seoul",
    label: "Seoul",
    center: { lat: 37.5665, lng: 126.9780 },
    radius: 20000,
    fsqNear: "Seoul, South Korea",
    rssFeeds: [
      { name: "Time Out Seoul", url: "https://www.timeout.com/seoul/feed.rss" },
    ],
  },
  {
    key: "hawaii",
    label: "Hawaii",
    center: { lat: 21.3099, lng: -157.8581 },
    radius: 30000,
    fsqNear: "Honolulu, HI",
    rssFeeds: [
      { name: "Honolulu Magazine", url: "https://www.honolulumagazine.com/feed/" },
    ],
  },
];

const MAX_POOL_PER_AREA = 1000;
const WEEKLY_PICK_PER_AREA = 30;
const FSQ_QUERY_LIMIT = 50;

type TrendSpotRow = {
  external_id: string;
  source: string;
  area_key: string;
  city_name: string;
  name: string;
  description: string;
  category: string;
  lat: number | null;
  lng: number | null;
  address: string;
  image_url: string;
  website_url: string;
  trend_score: number;
  popularity: number;
  source_data: Record<string, unknown>;
  last_refreshed_at: string;
};

function mondayOfWeek(d = new Date()): string {
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setUTCDate(d.getUTCDate() + diff);
  return m.toISOString().slice(0, 10);
}

async function fetchFoursquare(area: AreaConfig, apiKey: string): Promise<TrendSpotRow[]> {
  const url = new URL("https://places-api.foursquare.com/places/search");
  url.searchParams.set("ll", `${area.center.lat},${area.center.lng}`);
  url.searchParams.set("radius", String(area.radius));
  url.searchParams.set("limit", String(FSQ_QUERY_LIMIT));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Places-Api-Version": "2025-06-17",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.error(`[fsq] ${area.key} status=${res.status}`);
      return [];
    }
    const data = await res.json();
    const now = new Date().toISOString();
    const nowMs = Date.now();
    const results: TrendSpotRow[] = (data.results ?? []).map((p: any) => {
      const lat = typeof p.latitude === "number" ? p.latitude : null;
      const lng = typeof p.longitude === "number" ? p.longitude : null;
      const refreshedMs = p.date_refreshed ? Date.parse(p.date_refreshed) : 0;
      const freshnessDays = refreshedMs ? Math.max(0, (nowMs - refreshedMs) / 86400000) : 365;
      const freshnessScore = Math.max(0, 100 - freshnessDays);
      const socialCount = p.social_media
        ? (p.social_media.instagram ? 1 : 0) +
          (p.social_media.twitter ? 1 : 0) +
          (p.social_media.facebook_id ? 1 : 0)
        : 0;
      const hasSite = p.website ? 1 : 0;
      const hasTel = p.tel ? 1 : 0;
      const completeness = socialCount * 15 + hasSite * 10 + hasTel * 5;
      return {
        external_id: String(p.fsq_place_id ?? ""),
        source: "foursquare",
        area_key: area.key,
        city_name: area.label,
        name: String(p.name ?? "").slice(0, 200),
        description: "",
        category: p.categories?.[0]?.name ?? "",
        lat,
        lng,
        address: p.location?.formatted_address ?? "",
        image_url: "",
        website_url: p.website ?? "",
        trend_score: freshnessScore + completeness,
        popularity: freshnessScore,
        source_data: p,
        last_refreshed_at: now,
      };
    });
    return results.filter((r) => r.external_id);
  } catch (err) {
    console.error(`[fsq] ${area.key} error`, err);
    return [];
  }
}

async function fetchGooglePlaces(area: AreaConfig, apiKey: string): Promise<TrendSpotRow[]> {
  const queries = [
    `trending restaurants and cafes in ${area.label}`,
    `popular new spots in ${area.label}`,
    `must visit places in ${area.label}`,
  ];
  const now = new Date().toISOString();
  const all: TrendSpotRow[] = [];
  const seen = new Set<string>();

  for (const textQuery of queries) {
    try {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.websiteUri,places.rating,places.userRatingCount,places.primaryType,places.primaryTypeDisplayName",
        },
        body: JSON.stringify({
          textQuery,
          pageSize: 20,
          locationBias: {
            circle: {
              center: { latitude: area.center.lat, longitude: area.center.lng },
              radius: Math.min(area.radius, 50000),
            },
          },
        }),
      });
      if (!res.ok) {
        console.error(`[gplaces] ${area.key} "${textQuery}" status=${res.status}`);
        continue;
      }
      const data = await res.json();
      for (const p of data.places ?? []) {
        const id = String(p.id ?? "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const rating = typeof p.rating === "number" ? p.rating : 0;
        const ratingCount = typeof p.userRatingCount === "number" ? p.userRatingCount : 0;
        const popScore = Math.log10(ratingCount + 1) * 40;
        const qualityScore = rating * 20;
        all.push({
          external_id: id,
          source: "google_places",
          area_key: area.key,
          city_name: area.label,
          name: String(p.displayName?.text ?? "").slice(0, 200),
          description: "",
          category: p.primaryTypeDisplayName?.text ?? p.primaryType ?? "",
          lat: typeof p.location?.latitude === "number" ? p.location.latitude : null,
          lng: typeof p.location?.longitude === "number" ? p.location.longitude : null,
          address: p.formattedAddress ?? "",
          image_url: "",
          website_url: p.websiteUri ?? "",
          trend_score: popScore + qualityScore,
          popularity: popScore,
          source_data: p,
          last_refreshed_at: now,
        });
      }
    } catch (err) {
      console.error(`[gplaces] ${area.key} "${textQuery}" error`, err);
    }
  }
  return all.filter((r) => r.external_id && r.name);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u3000\s]+/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchSpotInText(spotName: string, haystack: string): boolean {
  const n = normalizeText(spotName);
  const h = normalizeText(haystack);
  if (n.length < 3) return false;
  if (h.includes(n)) return true;
  const tokens = n.split(" ").filter((t) => t.length >= 4);
  if (tokens.length < 2) return false;
  const matched = tokens.filter((t) => h.includes(t)).length;
  return matched / tokens.length >= 0.7;
}

function parseRssItems(xml: string): { title: string; link: string; description: string; pubDate: string }[] {
  const items: { title: string; link: string; description: string; pubDate: string }[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/gi;
  const matches = xml.match(itemRe) ?? [];
  for (const m of matches) {
    const title = stripHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(m)?.[1] ?? "");
    const link = stripHtml(/<link[^>]*>([\s\S]*?)<\/link>/i.exec(m)?.[1] ?? "");
    const description = stripHtml(/<description[^>]*>([\s\S]*?)<\/description>/i.exec(m)?.[1] ?? "").slice(0, 300);
    const pubDate = stripHtml(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i.exec(m)?.[1] ?? "");
    if (title && link) items.push({ title, link, description, pubDate });
  }
  return items.slice(0, 20);
}

async function fetchRssMentions(area: AreaConfig): Promise<{ feed: string; items: ReturnType<typeof parseRssItems> }[]> {
  const out: { feed: string; items: ReturnType<typeof parseRssItems> }[] = [];
  for (const feed of area.rssFeeds) {
    try {
      const res = await fetch(feed.url, { headers: { "User-Agent": "MILZ-Trend-Bot/1.0" } });
      if (!res.ok) continue;
      const xml = await res.text();
      out.push({ feed: feed.name, items: parseRssItems(xml) });
    } catch (err) {
      console.error(`[rss] ${area.key} ${feed.name}`, err);
    }
  }
  return out;
}

async function upsertSpots(supabase: ReturnType<typeof createClient>, rows: TrendSpotRow[]) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("ai_trend_spots")
    .upsert(rows, { onConflict: "source,external_id" })
    .select("id,area_key,trend_score,external_id,source");
  if (error) throw error;
  return data ?? [];
}

async function prunePool(supabase: ReturnType<typeof createClient>, areaKey: string) {
  const { data, error } = await supabase
    .from("ai_trend_spots")
    .select("id")
    .eq("area_key", areaKey)
    .order("trend_score", { ascending: false })
    .order("last_refreshed_at", { ascending: false })
    .range(MAX_POOL_PER_AREA, MAX_POOL_PER_AREA + 10000);
  if (error) return;
  const toDelete = (data ?? []).map((r) => r.id);
  if (!toDelete.length) return;
  await supabase.from("ai_trend_spots").delete().in("id", toDelete);
}

async function buildWeekly(supabase: ReturnType<typeof createClient>, areaKey: string, weekStart: string) {
  const { data } = await supabase
    .from("ai_trend_spots")
    .select("id,trend_score")
    .eq("area_key", areaKey)
    .order("trend_score", { ascending: false })
    .limit(WEEKLY_PICK_PER_AREA);
  const rows = (data ?? []).map((r, idx) => ({
    week_start: weekStart,
    area_key: areaKey,
    spot_id: r.id,
    rank: idx + 1,
    trend_score: r.trend_score ?? 0,
    reason_text: "",
  }));
  if (!rows.length) return 0;
  await supabase.from("ai_trend_weekly").upsert(rows, { onConflict: "week_start,area_key,spot_id" });
  return rows.length;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const fsqKey = Deno.env.get("FOURSQUARE_API_KEY") ?? "";
    const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Supabase env missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const weekStart = mondayOfWeek();
    const report: Record<string, unknown> = { weekStart, areas: {} };

    for (const area of AREAS) {
      const summary: Record<string, unknown> = { sources: {} };

      let upserted: Awaited<ReturnType<typeof upsertSpots>> = [];
      const allRows: TrendSpotRow[] = [];
      if (fsqKey) {
        const fsqRows = await fetchFoursquare(area, fsqKey);
        summary.sources = { ...(summary.sources as object), foursquare: fsqRows.length };
        allRows.push(...fsqRows);
      } else {
        summary.sources = { ...(summary.sources as object), foursquare: "skipped: no key" };
      }
      if (googleKey) {
        const gRows = await fetchGooglePlaces(area, googleKey);
        summary.sources = { ...(summary.sources as object), google_places: gRows.length };
        allRows.push(...gRows);
      } else {
        summary.sources = { ...(summary.sources as object), google_places: "skipped: no key" };
      }
      upserted = await upsertSpots(supabase, allRows);

      const spotIndex = new Map<string, { id: string; name: string }>();
      for (const s of upserted as any[]) {
        const src = allRows.find((r) => r.external_id === s.external_id && r.source === s.source);
        if (src?.name) spotIndex.set(s.id, { id: s.id, name: src.name });
      }

      const rssGroups = await fetchRssMentions(area);
      let mentionInserts = 0;
      const mentionedSpotIds = new Map<string, number>();
      for (const g of rssGroups) {
        for (const item of g.items) {
          const hay = `${item.title} ${item.description}`;
          for (const spot of spotIndex.values()) {
            if (!matchSpotInText(spot.name, hay)) continue;
            const { error } = await supabase.from("ai_trend_mentions").insert({
              spot_id: spot.id,
              source_name: g.feed,
              source_type: "rss",
              url: item.link,
              title: item.title,
              excerpt: item.description,
              published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            });
            if (!error) {
              mentionInserts += 1;
              mentionedSpotIds.set(spot.id, (mentionedSpotIds.get(spot.id) ?? 0) + 1);
            }
          }
        }
      }
      summary.mentions = mentionInserts;

      for (const [spotId, count] of mentionedSpotIds) {
        const { data } = await supabase.from("ai_trend_spots").select("trend_score").eq("id", spotId).maybeSingle();
        const current = (data as any)?.trend_score ?? 0;
        await supabase.from("ai_trend_spots").update({ trend_score: current + count * 25 }).eq("id", spotId);
      }

      await prunePool(supabase, area.key);
      const weeklyCount = await buildWeekly(supabase, area.key, weekStart);
      summary.weekly_picks = weeklyCount;

      (report.areas as Record<string, unknown>)[area.key] = summary;
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("refresh-ai-trends error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
