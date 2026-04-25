import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Bookmark, Heart, Loader as Loader2, TrendingUp, Brain as Train } from 'lucide-react';
import { getSupabase } from './supabase';

type Locale = 'jp' | 'en';
type AreaKey = 'ny' | 'tokyo' | 'kyoto' | 'seoul' | 'hawaii';

type TrendSpot = {
  id: string;
  name: string;
  category: string;
  address: string;
  website_url: string;
  source: string;
  trend_score: number;
  area_key: string;
  city_name: string;
  lat: number | null;
  lng: number | null;
};

type WeeklyRow = {
  rank: number;
  trend_score: number;
  spot: TrendSpot | null;
};

type StationRow = {
  id: string;
  name: string;
  name_jp: string | null;
  lines: string[] | null;
  lat: number | null;
  lng: number | null;
};

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(m: number, locale: 'jp' | 'en'): string {
  if (m < 1000) return `${Math.round(m)}m`;
  const km = (m / 1000).toFixed(1);
  return locale === 'jp' ? `${km}km` : `${km} km`;
}

type Props = {
  areaKey: AreaKey;
  locale: Locale;
  userId?: string | null;
};

const AREA_LABEL: Record<Locale, Record<AreaKey, string>> = {
  en: {
    ny: 'New York',
    tokyo: 'Tokyo',
    kyoto: 'Kyoto',
    seoul: 'Seoul',
    hawaii: 'Hawaii',
  },
  jp: {
    ny: 'ニューヨーク',
    tokyo: '東京',
    kyoto: '京都',
    seoul: 'ソウル',
    hawaii: 'ハワイ',
  },
};

const CATEGORY_JP: Record<string, string> = {
  'Afghan Restaurant': 'アフガン料理',
  'American Restaurant': 'アメリカ料理',
  'Amusement Center': 'アミューズメント施設',
  'Art Gallery': 'アートギャラリー',
  'Art Museum': '美術館',
  'Asian Fusion Restaurant': 'アジアンフュージョン',
  'Bakery': 'ベーカリー',
  'Bar': 'バー',
  'BBQ Joint': 'バーベキュー',
  'Beach': 'ビーチ',
  'Beer Bar': 'ビアバー',
  'Bicycle Store': '自転車店',
  'Bookstore': '書店',
  'Breakfast Restaurant': '朝食レストラン',
  'Breakfast Spot': '朝食スポット',
  'Brewery': 'ブルワリー',
  'Brunch Restaurant': 'ブランチ',
  'Buddhist Temple': '寺院',
  'Bunsik Restaurant': '韓国軽食(粉食)',
  'Burger Joint': 'バーガー',
  'Cafe': 'カフェ',
  'Café': 'カフェ',
  'Cajun Restaurant': 'ケイジャン料理',
  'Camera Store': 'カメラ店',
  'Cantonese Restaurant': '広東料理',
  'Cemetery': '墓地',
  'Chinese Restaurant': '中華料理',
  'Church': '教会',
  'City Park': '都市公園',
  'Cocktail Bar': 'カクテルバー',
  'Coffee Shop': 'コーヒーショップ',
  'Concert Hall': 'コンサートホール',
  'Cuban Restaurant': 'キューバ料理',
  'Cultural landmark': '文化的名所',
  'Deli': 'デリ',
  'Dessert Shop': 'デザートショップ',
  'Discount Store': 'ディスカウントストア',
  'Dive Spot': 'ダイビングスポット',
  'Donut Shop': 'ドーナツショップ',
  'Electronics Store': '家電・電子機器店',
  'Farmers Market': 'ファーマーズマーケット',
  'Filipino Restaurant': 'フィリピン料理',
  'Fine Dining Restaurant': 'ファインダイニング',
  'Food Store': '食料品店',
  'Forest': '森林',
  'French Restaurant': 'フレンチ',
  'Fusion Restaurant': 'フュージョン料理',
  'Garden': '庭園',
  'Gelato Shop': 'ジェラート',
  'Government Office': '官公庁',
  'Grocery Store': '食料品店',
  'Gukbap Restaurant': 'クッパ専門店',
  'Halal Restaurant': 'ハラール料理',
  'Hamburger Restaurant': 'ハンバーガー',
  'Hawaiian Restaurant': 'ハワイ料理',
  'Hiking Trail': 'ハイキングコース',
  'Historic and Protected Site': '史跡・保護区',
  'Historical Landmark': '歴史的名所',
  'History Museum': '歴史博物館',
  'Hookah Bar': 'シーシャバー',
  'Hotel Bar': 'ホテルバー',
  'Ice Cream Parlor': 'アイスクリーム',
  'Indian Restaurant': 'インド料理',
  'Indie Movie Theater': 'インディー映画館',
  'Italian Restaurant': 'イタリアン',
  'Japanese Curry Restaurant': 'カレー店',
  'Japanese Restaurant': '和食',
  'Korean BBQ Restaurant': '韓国焼肉',
  'Korean Restaurant': '韓国料理',
  'Landmark': 'ランドマーク',
  'Latin American Restaurant': 'ラテンアメリカ料理',
  'Library': '図書館',
  'Lighthouse': '灯台',
  'Lodging': '宿泊施設',
  'Lounge': 'ラウンジ',
  'Market': 'マーケット',
  'Monument': 'モニュメント',
  'Mountain': '山',
  'Movie Theater': '映画館',
  'Museum': '博物館',
  'National Park': '国立公園',
  'Nature Preserve': '自然保護区',
  'New American Restaurant': 'ニューアメリカン',
  'Noodle Restaurant': '麺料理',
  'Observation Deck': '展望台',
  'Palace': '宮殿',
  'Park': '公園',
  'Pizzeria': 'ピッツェリア',
  'Plaza': '広場',
  'Pub': 'パブ',
  'Ramen Restaurant': 'ラーメン',
  'Restaurant': 'レストラン',
  'Rock Club': 'ロッククラブ',
  'Sake Bar': '日本酒バー',
  'Sauna': 'サウナ',
  'Scenic Lookout': '絶景スポット',
  'Scenic Spot': '景勝地',
  'Sculpture': '彫刻',
  'Seafood Restaurant': 'シーフード',
  'Shinto Shrine': '神社',
  'Shopping Mall': 'ショッピングモール',
  'Shrine': '神社',
  'Soba Restaurant': '蕎麦',
  'State or Provincial Park': '州立公園',
  'State Park': '州立公園',
  'Steakhouse': 'ステーキハウス',
  'Sushi Restaurant': '寿司',
  'Swimming Pool': 'プール',
  'Taco Restaurant': 'タコス',
  'Takoyaki Place': 'たこ焼き',
  'Tapas Restaurant': 'タパス',
  'Tea Room': '喫茶店',
  'Tempura Restaurant': '天ぷら',
  'Tonkatsu Restaurant': 'とんかつ',
  'Tour Agency': 'ツアー会社',
  'Tourist Attraction': '観光名所',
  'Vegan and Vegetarian Restaurant': 'ヴィーガン・ベジタリアン',
  'Vegan Restaurant': 'ヴィーガン',
  'Vietnamese Restaurant': 'ベトナム料理',
  'Wagashi Place': '和菓子',
  'Waterfront': 'ウォーターフロント',
  'Western Restaurant': '洋食',
  'Wine Bar': 'ワインバー',
  'Wine Store': 'ワインストア',
  'Yakitori Restaurant': '焼き鳥',
  'Zoo': '動物園',
};

const SOURCE_JP: Record<string, string> = {
  google_places: 'GOOGLE',
  foursquare: 'FOURSQUARE',
  rss: 'RSS',
  editorial: '編集部',
};

function localizeCategory(category: string | null | undefined, locale: Locale): string {
  if (!category) return '';
  if (locale === 'en') return category;
  return CATEGORY_JP[category] || category;
}

function localizeSource(source: string | null | undefined, locale: Locale): string {
  if (!source) return '';
  if (locale === 'en') return source;
  const key = source.toLowerCase();
  return SOURCE_JP[key] || source;
}

const COPY = {
  jp: {
    eyebrow: 'AI TREND SPOTS',
    title: 'AIが観測した今週の動き',
    subtitle: 'Google / Foursquare / 各都市メディアのRSSを横断して、AIが拾った話題のスポット。',
    disclaimer:
      'これはAIが観測した機械的な兆候であり、MILZ編集部の推薦ではありません。編集部が吟味したものだけがSPOTSに掲載されます。',
    weekLabel: '今週のピックアップ',
    scoreLabel: 'Trend Score',
    suggest: '編集部に推薦',
    suggested: '推薦済み',
    save: 'お気に入り',
    saved: '保存済み',
    signInToSave: 'ログインで保存',
    empty: 'この地域のAIトレンドはまだ取得されていません。',
    loading: '読み込み中',
    signInNeeded: 'ログインすると推薦できます',
  },
  en: {
    eyebrow: 'AI TREND SPOTS',
    title: 'Weekly signals observed by AI',
    subtitle: 'Spots picked up across Google, Foursquare, and city-media RSS feeds.',
    disclaimer:
      'These are algorithmic signals observed by AI — not MILZ editorial picks. Only spots vetted by our editors appear in SPOTS.',
    weekLabel: 'This week',
    scoreLabel: 'Trend Score',
    suggest: 'Suggest to editors',
    suggested: 'Suggested',
    save: 'Save',
    saved: 'Saved',
    signInToSave: 'Sign in to save',
    empty: 'No AI trend data yet for this region.',
    loading: 'Loading',
    signInNeeded: 'Sign in to suggest',
  },
} as const;

function startOfWeekISO(d = new Date()): string {
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const m = new Date(d);
  m.setUTCDate(d.getUTCDate() + diff);
  return m.toISOString().slice(0, 10);
}

export default function AITrendSpots({ areaKey, locale, userId }: Props) {
  const t = COPY[locale];
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<WeeklyRow[]>([]);
  const [suggestedIds, setSuggestedIds] = useState<Set<string>>(new Set());
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritingId, setFavoritingId] = useState<string | null>(null);
  const [stations, setStations] = useState<StationRow[]>([]);
  const weekStart = useMemo(() => startOfWeekISO(), []);

  const stationsSupported = areaKey !== 'hawaii';
  const stationsAreaKey = areaKey === 'ny' ? 'new-york' : areaKey;

  useEffect(() => {
    if (!stationsSupported) {
      setStations([]);
      return;
    }
    let active = true;
    (async () => {
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from('stations')
          .select('id, name, name_jp, lines, lat, lng')
          .eq('area_key', stationsAreaKey);
        if (error) throw error;
        if (!active) return;
        setStations((data as StationRow[]) || []);
      } catch {
        if (active) setStations([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [stationsAreaKey, stationsSupported]);

  const nearestStationFor = (spot: TrendSpot) => {
    if (!stationsSupported) return null;
    if (spot.lat == null || spot.lng == null) return null;
    let best: { station: StationRow; distance: number } | null = null;
    for (const s of stations) {
      if (s.lat == null || s.lng == null) continue;
      const d = haversineMeters(
        { lat: spot.lat, lng: spot.lng },
        { lat: s.lat, lng: s.lng }
      );
      if (!best || d < best.distance) best = { station: s, distance: d };
    }
    return best;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const supabase = getSupabase();
      try {
        const { data, error } = await supabase
          .from('ai_trend_weekly')
          .select(`
            rank,
            trend_score,
            spot:ai_trend_spots(id,name,category,address,website_url,source,trend_score,area_key,city_name,lat,lng)
          `)
          .eq('area_key', areaKey)
          .eq('week_start', weekStart)
          .order('rank', { ascending: true })
          .limit(30);

        if (error) throw error;
        if (!active) return;

        const mapped: WeeklyRow[] = (data ?? []).map((r: any) => ({
          rank: r.rank,
          trend_score: r.trend_score ?? 0,
          spot: Array.isArray(r.spot) ? r.spot[0] ?? null : r.spot ?? null,
        }));
        setRows(mapped);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [areaKey, weekStart]);

  useEffect(() => {
    if (!userId) {
      setSuggestedIds(new Set());
      setFavoriteIds(new Set());
      return;
    }
    let active = true;
    (async () => {
      const supabase = getSupabase();
      const [suggestions, favorites] = await Promise.all([
        supabase.from('ai_editor_suggestions').select('trend_spot_id').eq('user_id', userId),
        supabase.from('ai_trend_favorites').select('trend_spot_id').eq('user_id', userId),
      ]);
      if (!active) return;
      setSuggestedIds(new Set((suggestions.data ?? []).map((r: any) => r.trend_spot_id)));
      setFavoriteIds(new Set((favorites.data ?? []).map((r: any) => r.trend_spot_id)));
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  async function handleSuggest(spotId: string) {
    if (!userId) return;
    setSubmittingId(spotId);
    const supabase = getSupabase();
    const { error } = await supabase.from('ai_editor_suggestions').insert({
      user_id: userId,
      trend_spot_id: spotId,
      status: 'pending',
    });
    if (!error) {
      setSuggestedIds((prev) => new Set(prev).add(spotId));
    }
    setSubmittingId(null);
  }

  async function handleToggleFavorite(spot: TrendSpot, trendScore: number) {
    if (!userId) return;
    setFavoritingId(spot.id);
    const supabase = getSupabase();
    const already = favoriteIds.has(spot.id);
    if (already) {
      const { error } = await supabase
        .from('ai_trend_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('trend_spot_id', spot.id);
      if (!error) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(spot.id);
          return next;
        });
      }
    } else {
      const { error } = await supabase.from('ai_trend_favorites').insert({
        user_id: userId,
        trend_spot_id: spot.id,
        area_key: spot.area_key,
        city_name: spot.city_name,
        name: spot.name,
        category: spot.category,
        address: spot.address,
        website_url: spot.website_url,
        source: spot.source,
        lat: spot.lat,
        lng: spot.lng,
        trend_score: trendScore,
      });
      if (!error) {
        setFavoriteIds((prev) => new Set(prev).add(spot.id));
      }
    }
    setFavoritingId(null);
  }

  return (
    <section className="bg-white p-6 md:p-10 xl:p-16 rounded-[2rem] md:rounded-[3rem] border border-stone-100 shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-stone-400" />
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">
              {locale === 'jp' ? 'AI 週間トレンドスポット' : 'AI Weekly Trend SPOTS'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2">
            {AREA_LABEL[locale][areaKey]} · {t.weekLabel}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">{t.loading}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-stone-400 text-xs font-black uppercase tracking-[0.3em]">
          {t.empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {rows.map((row) => {
            const spot = row.spot;
            if (!spot) return null;
            const isSuggested = suggestedIds.has(spot.id);
            const isSubmitting = submittingId === spot.id;
            const isFavorited = favoriteIds.has(spot.id);
            const isFavoriting = favoritingId === spot.id;
            const nearest = nearestStationFor(spot);
            return (
              <motion.article
                key={spot.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: row.rank * 0.015 }}
                className="group bg-white border border-stone-100 rounded-2xl p-5 hover:border-stone-300 hover:shadow-sm transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[10px] font-black text-stone-300 tabular-nums tracking-[0.2em]">
                      {String(row.rank).padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-400 bg-stone-50 rounded-full px-2 py-1">
                      {localizeSource(spot.source, locale)}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-black leading-tight line-clamp-2">{spot.name}</h4>
                  {spot.category && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                      {localizeCategory(spot.category, locale)}
                    </p>
                  )}
                  {spot.address && (
                    <p className="text-xs text-stone-500 font-medium line-clamp-2">{spot.address}</p>
                  )}
                  {nearest && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 bg-stone-50 border border-stone-100 rounded-full px-2.5 py-1 w-fit">
                      <Train className="w-3 h-3 text-stone-400" />
                      <span className="truncate max-w-[140px]">
                        {locale === 'jp' && nearest.station.name_jp ? nearest.station.name_jp : nearest.station.name}
                      </span>
                      <span className="text-stone-400 tabular-nums">
                        · {formatDistance(nearest.distance, locale)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">
                      {t.scoreLabel}
                    </span>
                    <span className="text-xs font-black text-black tabular-nums">
                      {row.trend_score.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    {spot.website_url && (
                      <a
                        href={spot.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500 hover:text-black py-2 rounded-full border border-stone-200 hover:border-black transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(spot, row.trend_score)}
                      disabled={!userId || isFavoriting}
                      title={!userId ? t.signInToSave : undefined}
                      className={
                        'flex-1 inline-flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] py-2 rounded-full border transition-all disabled:cursor-not-allowed ' +
                        (isFavorited
                          ? 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-rose-500 hover:text-rose-500 disabled:opacity-40')
                      }
                    >
                      {isFavoriting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Heart className={'w-3 h-3 ' + (isFavorited ? 'fill-current' : '')} />
                      )}
                      {isFavorited ? t.saved : t.save}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSuggest(spot.id)}
                    disabled={!userId || isSuggested || isSubmitting}
                    title={!userId ? t.signInNeeded : undefined}
                    className={
                      'w-full inline-flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] py-2 rounded-full border transition-all disabled:cursor-not-allowed ' +
                      (isSuggested
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-black hover:text-black disabled:opacity-40')
                    }
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Bookmark className="w-3 h-3" />
                    )}
                    {isSuggested ? t.suggested : t.suggest}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
