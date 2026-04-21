/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getSupabase, testSupabaseConnection, resetSupabaseClient } from './supabase';
import { 
  MapPin, 
  LogIn, 
  LogOut, 
  Plus, 
  X, 
  ExternalLink, 
  Navigation, 
  ShieldCheck, 
  User as UserIcon, 
  Loader2,
  Map as MapIcon,
  List as ListIcon,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Trash2,
  Utensils,
  ShoppingBag,
  MoreHorizontal,
  Heart,
  Sparkles,
  Globe,
  MapPinned,
  Send,
  TrendingUp,
  AlertCircle,
  Hash,
  Languages,
  Coffee,
  Gift,
  Ticket,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Copy,
  Trees,
  Train,
  ParkingCircle,
  School,
  Store,
  Pencil,
  FileText,
  Video,
  Play,
  ArrowLeft,
  ArrowUpRight,
  Star,
  Clock,
  Share2,
  Edit,
  Bookmark,
  MessageSquare,
  Award,
  Save,
  Upload,
  Layers3,
  Landmark,
} from 'lucide-react';

// DropZone component for drag & drop uploads
const DropZone = ({ onFilesDrop, label, className, icon: Icon = Upload, isLoading = false, accept = "*/*" }: { 
  onFilesDrop: (files: File[]) => void, 
  label: string, 
  className?: string,
  icon?: any,
  isLoading?: boolean,
  accept?: string
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files) as File[];
        if (files.length > 0) onFilesDrop(files);
      }}
      className={cn(
        "border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer relative min-h-[200px]",
        isDragging ? "border-black bg-stone-50 scale-[0.98]" : "border-stone-200 hover:border-stone-400",
        isLoading && "opacity-50 pointer-events-none",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="w-8 h-8 text-black animate-spin" />
      ) : (
        <Icon className={cn("w-8 h-8", isDragging ? "text-black" : "text-stone-300")} />
      )}
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black">{label}</p>
        <p className="text-[9px] text-stone-400 uppercase tracking-widest">Drag & Drop or Click to Upload</p>
      </div>
      <input 
        type="file" 
        ref={fileInputRef}
        className="hidden" 
        multiple 
        accept={accept}
        onChange={(e) => {
          const files = Array.from(e.target.files || []) as File[];
          if (files.length > 0) onFilesDrop(files);
          // Reset input so the same file can be selected again
          e.target.value = '';
        }}
      />
    </div>
  );
};

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Country, State, City } from 'country-state-city';
import { MAP_THEMES, TOKYO_ILLUSTRATION_THEME, isIllustrationTheme, type MapThemeKey } from './illustrationMaps';
import TokyoMiniatureMap, { type MapNavigator } from './TokyoMiniatureMap';
import MilzLanding from './MilzLanding';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseUrlList(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isLikelyVideoUrl(url?: string | null): boolean {
  const value = (url || '').trim().toLowerCase();
  if (!value) return false;
  if (extractYouTubeVideoId(value)) return true;
  return /\.(mp4|m4v|mov|webm|ogg)(\?|$)/i.test(value) || value.startsWith('data:video/');
}

function getVideoPreferenceScore(url: string) {
  const value = url.toLowerCase();
  if (/\.mp4(\?|$)/.test(value)) return 5;
  if (/\.m4v(\?|$)/.test(value)) return 4;
  if (/\.webm(\?|$)/.test(value)) return 3;
  if (/\.ogg(\?|$)/.test(value)) return 2;
  if (/\.mov(\?|$)/.test(value)) return 1;
  return 0;
}

function getVideoComparableStem(url?: string | null) {
  const raw = (url || '').trim();
  if (!raw) return '';
  const youtubeId = extractYouTubeVideoId(raw);
  if (youtubeId) return `youtube::${youtubeId}`;

  try {
    const parsed = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
    const filename = decodeURIComponent(parsed.pathname.split('/').pop() || '').toLowerCase();
    const withoutExt = filename.replace(/\.[^.]+$/, '');
    const afterCopy = withoutExt.includes('copy_') ? withoutExt.split('copy_').pop() || withoutExt : withoutExt;
    return afterCopy.replace(/^[0-9a-f-]{8,}-/i, '');
  } catch {
    const filename = raw.toLowerCase().split('/').pop() || raw.toLowerCase();
    const withoutExt = filename.replace(/\.[^.]+$/, '');
    const afterCopy = withoutExt.includes('copy_') ? withoutExt.split('copy_').pop() || withoutExt : withoutExt;
    return afterCopy.replace(/^[0-9a-f-]{8,}-/i, '');
  }
}

function preferPlayableVideoUrls(urls: string[]): string[] {
  const normalized = urls.filter(Boolean);
  const chosen = new Map<string, string>();
  const order: string[] = [];

  normalized.forEach((url) => {
    const stem = getVideoComparableStem(url) || url;
    const existing = chosen.get(stem);
    if (!existing) {
      chosen.set(stem, url);
      order.push(stem);
      return;
    }

    if (getVideoPreferenceScore(url) > getVideoPreferenceScore(existing)) {
      chosen.set(stem, url);
    }
  });

  return order.map((stem) => chosen.get(stem)!).filter(Boolean);
}

function normalizeStoredVideoUrlList(raw?: string | null): string[] {
  const urls = parseUrlList(raw)
    .map((value) => {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const videoId = extractYouTubeVideoId(trimmed);
      if (videoId) return `https://www.youtube.com/watch?v=${videoId}`;
      if (isLikelyVideoUrl(trimmed)) return trimmed;
      return null;
    })
    .filter((value): value is string => !!value);

  return preferPlayableVideoUrls(urls);
}

function isLikelyImageUrl(url?: string | null): boolean {
  const value = (url || '').trim().toLowerCase();
  if (!value) return false;
  return /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(value) || value.startsWith('data:image/') || value.includes('/images/') || value.includes('imagekit') || value.includes('imgix') || value.includes('cloudinary');
}

function extractYouTubeVideoId(value?: string | null): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return raw;
  }

  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] || null;
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      if (url.pathname.startsWith('/watch')) {
        return url.searchParams.get('v');
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/').filter(Boolean)[1] || null;
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/').filter(Boolean)[1] || null;
      }
      if (url.pathname.startsWith('/live/')) {
        return url.pathname.split('/').filter(Boolean)[1] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getYouTubeEmbedUrl(value?: string | null): string | null {
  const videoId = extractYouTubeVideoId(value);
  if (!videoId) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`;
}

function VideoEmbed({ url, title }: { url: string; title: string }) {
  const youtubeEmbedUrl = getYouTubeEmbedUrl(url);
  const isDirectVideo = isLikelyVideoUrl(url) && !youtubeEmbedUrl;

  if (isDirectVideo) {
    return (
      <video
        src={url}
        title={title}
        className="w-full h-full object-cover bg-black"
        controls
        playsInline
        preload="metadata"
      />
    );
  }

  if (youtubeEmbedUrl) {
    return (
      <div className="w-full h-full bg-stone-950 text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Video className="w-10 h-10 text-white/75" />
        <div className="space-y-1.5 max-w-[18rem]">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">MILZ VIDEO</p>
          <p className="text-sm font-semibold text-white/90">Legacy YouTube clip</p>
          <p className="text-xs leading-relaxed text-white/60">Upload MP4 or MOV into MILZ for direct playback. Existing YouTube clips can still open in a new tab.</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:border-white/45 hover:bg-white/5 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Open YouTube
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-stone-950 text-white flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Play className="w-10 h-10 text-white/80" />
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">MILZ VIDEO</p>
        <p className="text-sm font-semibold text-white/90">Video unavailable</p>
        <p className="text-xs text-white/60">Register an uploaded MP4 video to play it inside MILZ.</p>
      </div>
    </div>
  );
}

function inferMediaTypeFromUrl(url?: string | null): 'image' | 'video' {
  const value = (url || '').toLowerCase();
  if (!value) return 'image';
  if (extractYouTubeVideoId(value) || isLikelyVideoUrl(value)) {
    return 'video';
  }
  return 'image';
}

function DetailMiniMap({
  lat,
  lng,
  name,
  onOpenMap,
}: {
  lat: number;
  lng: number;
  name: string;
  onOpenMap: () => void;
}) {
  return (
    <div className="aspect-square border border-stone-200 overflow-hidden rounded-[28px] bg-stone-100 relative group">
      <MapContainer
        key={`${lat}-${lng}-${name}`}
        center={[lat, lng]}
        zoom={15}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        keyboard={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]}>
          <Popup>{name}</Popup>
        </Marker>
      </MapContainer>
      <div className="absolute inset-x-4 bottom-4 p-4 bg-white/92 backdrop-blur-sm border border-stone-200 rounded-2xl flex items-end justify-between gap-4 pointer-events-none">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-black">Mini Map</p>
          <p className="text-[10px] font-mono text-stone-500">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">Tap to open</span>
      </div>
      <button
        type="button"
        onClick={onOpenMap}
        className="absolute inset-0 z-[400]"
        aria-label={`Open ${name} on map`}
      />
    </div>
  );
}

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type UserRole = 'admin' | 'user';
type Tab = 'map' | 'list' | 'shorts' | 'ai' | 'profile';

interface Review {
  id: string;
  author_name: string;
  author_role?: string;
  author_photo?: string;
  rating: number;
  text: string;
  date: string;
  images?: string[];
}

interface FromSpotItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  media_url?: string;
  media_type?: 'image' | 'video';
}

interface Place {
  id: string;
  name: string;
  description?: string;
  detailed_description?: string;
  category: string;
  lat: number;
  lng: number;
  country?: string;
  prefecture?: string;
  municipality?: string;
  address?: string;
  website_url?: string;
  image_url?: string;
  images?: string[];
  videos?: string[];
  pdfs?: { name: string; url: string }[];
  milz_experience?: string;
  milz_experience_label?: string;
  milz_experience_heading?: string;
  reporter_name?: string;
  photos_heading?: string;
  shorts_heading?: string;
  menu_heading?: string;
  menu_description?: string;
  from_spot_heading?: string;
  from_spot_intro?: string;
  from_spot_items?: FromSpotItem[];
  visual_archive_label?: string;
  visual_archive_description?: string;
  back_to_map_label?: string;
  location_label?: string;
  hours_label?: string;
  contact_label?: string;
  created_by: string;
  created_at: string;
  rating?: number;
  review_count?: number;
  hours?: string;
  reviews?: Review[];
  badges?: string[];
  area_key?: string;
  area_label?: string;
}


interface Favorite {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
}

interface AIResults {
  meta?: {
    version?: number;
    source?: string;
  };
  recommendations?: {
    name: string;
    reason: string;
    details?: string;
    category: string;
    lat: number;
    lng: number;
    editorial_note?: string;
    best_time?: string;
    pros?: string[];
    cons?: string[];
    fit_tags?: string[];
    indoor_outdoor?: 'indoor' | 'outdoor' | 'mixed';
    weather_fit?: 'rain_ok' | 'clear_best' | 'all_weather';
    social_fit?: 'solo' | 'friends' | 'family' | 'mixed';
    energy?: 'quiet' | 'balanced' | 'lively';
  }[];
}

type AiRecommendationItem = NonNullable<AIResults['recommendations']>[number];

interface AiRecommendationVisual {
  imageUrl: string;
  source: 'place' | 'location-card';
}


interface TempAiPin {
  lat: number;
  lng: number;
  name: string;
}
interface AiFavoriteTranslation {
  name: string;
  reason: string;
  details?: string;
  category: string;
}


interface AiFavoriteItem {
  key: string;
  name: string;
  reason: string;
  category: string;
  lat: number;
  lng: number;
  created_at: string;
  translations?: Partial<Record<Locale, AiFavoriteTranslation>>;
  details?: string;
  area_key?: string;
  city_name?: string;
}

interface AiFavoriteRow {
  id?: string;
  user_id: string;
  favorite_key: string;
  canonical_key?: string | null;
  name: string;
  reason: string;
  category: string;
  details?: string | null;
  lat: number;
  lng: number;
  area_key?: string | null;
  city_name?: string | null;
  translations?: Partial<Record<Locale, AiFavoriteTranslation>> | null;
  created_at?: string;
  updated_at?: string;
}


interface ShortFeedItem {
  id: string;
  placeId: string;
  placeName: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  url: string;
  playbackType: 'direct' | 'youtube';
  embedUrl?: string;
  imageUrl?: string;
  address?: string;
  hours?: string;
  websiteUrl?: string;
}

type Locale = "jp" | "en";

const AI_FAVORITES_STORAGE_PREFIX = "milz_ai_favorites_";
const AUTH_METADATA_AI_FAVORITES_KEY = "milz_ai_favorites";
const AI_FAVORITES_TABLE = "ai_favorites";

type FilterOptionKind = 'category' | 'badge';

interface FilterOptionRecord {
  id: string;
  kind: FilterOptionKind;
  name: string;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
}

interface AreaCityOption {
  name: string;
  center: [number, number];
  zoom?: number;
}

interface AreaOption {
  key: string;
  label: string;
  countryCode: string;
  countryName: string;
  stateCode: string;
  stateName: string;
  center: [number, number];
  zoom?: number;
  cities: AreaCityOption[];
  aliases: string[];
}

interface AiRecommendationMetric {
  id?: string;
  area_key: string;
  city_name?: string | null;
  recommendation_name: string;
  category: string;
  lat: number;
  lng: number;
  view_count?: number;
  favorite_count?: number;
  details?: string;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_CATEGORY_OPTIONS = ['カフェ', 'レストラン', 'ショッピング', 'エンターテイメント', '公園・自然', '神社・寺院', 'その他'];
const DEFAULT_BADGE_OPTIONS = ['Yukie Fav', 'Pet Friendly'];

const SPECIAL_AREA_CITIES: Record<string, AreaCityOption[]> = {
  kyoto: [
    { name: 'Kamigyo', center: [35.0297, 135.7563], zoom: 14 },
    { name: 'Kita', center: [35.0518, 135.7525], zoom: 13 },
    { name: 'Sakyo', center: [35.0434, 135.7786], zoom: 13 },
    { name: 'Nakagyo', center: [35.0101, 135.7515], zoom: 14 },
    { name: 'Higashiyama', center: [34.9968, 135.7784], zoom: 14 },
    { name: 'Shimogyo', center: [34.9877, 135.7595], zoom: 14 },
    { name: 'Minami', center: [34.9769, 135.7463], zoom: 13 },
    { name: 'Ukyo', center: [35.0105, 135.6978], zoom: 13 },
    { name: 'Fushimi', center: [34.9362, 135.7614], zoom: 13 },
    { name: 'Yamashina', center: [34.9721, 135.8144], zoom: 13 },
    { name: 'Nishikyo', center: [34.9858, 135.6934], zoom: 13 },
  ],
};

const canonicalizeAreaCityKey = (value: string, areaKey: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/county/gi, '')
  .replace(/city/gi, '')
  .replace(/ward/gi, 'ku')
  .replace(/-shi/gi, '')
  .replace(/\sshi/gi, '')
  .replace(/-ku/gi, '')
  .replace(/\sku/gi, '')
  .replace(/[^a-z0-9]+/g, '')
  .trim() + `::${areaKey}`;

const formatGeneratedAreaCityName = (value: string, areaKey: string) => {
  const cleaned = value.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

  if (areaKey === 'tokyo' || areaKey === 'kyoto') {
    return cleaned
      .replace(/-shi$/i, '')
      .replace(/\s+shi$/i, '')
      .replace(/\s*ku$/i, '')
      .replace(/-ku$/i, '')
      .replace(/\s+to$/i, '')
      .trim();
  }

  return cleaned;
};

const buildAreaCityOptions = (area: AreaOption): AreaCityOption[] => {
  const merged = new Map<string, AreaCityOption>();

  const register = (city: AreaCityOption) => {
    const label = formatGeneratedAreaCityName(city.name, area.key);
    const key = canonicalizeAreaCityKey(label || city.name, area.key);
    if (!merged.has(key)) {
      merged.set(key, { ...city, name: label || city.name });
    }
  };

  area.cities.forEach(register);
  (SPECIAL_AREA_CITIES[area.key] || []).forEach(register);

  try {
    City.getCitiesOfState(area.countryCode, area.stateCode).forEach((city) => {
      const lat = Number(city.latitude);
      const lng = Number(city.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      register({ name: city.name, center: [lat, lng], zoom: area.zoom || 12 });
    });
  } catch (error) {
    console.warn(`Failed to build city list for ${area.label}`, error);
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const BASE_AREA_OPTIONS: AreaOption[] = [
  {
    key: 'new-york',
    label: 'New York',
    countryCode: 'US',
    countryName: 'United States',
    stateCode: 'NY',
    stateName: 'New York',
    center: [40.7128, -74.006],
    zoom: 12,
    aliases: ['new york', 'nyc', 'manhattan', 'brooklyn', 'queens', 'bronx', 'staten island'],
    cities: [
      { name: 'Manhattan', center: [40.7831, -73.9712], zoom: 13 },
      { name: 'Brooklyn', center: [40.6782, -73.9442], zoom: 12 },
      { name: 'Queens', center: [40.7282, -73.7949], zoom: 12 },
      { name: 'Bronx', center: [40.8448, -73.8648], zoom: 12 },
      { name: 'Staten Island', center: [40.5795, -74.1502], zoom: 12 },
    ],
  },
  {
    key: 'tokyo',
    label: 'Tokyo',
    countryCode: 'JP',
    countryName: 'Japan',
    stateCode: '13',
    stateName: 'Tokyo',
    center: [35.6762, 139.6503],
    zoom: 12,
    aliases: ['tokyo', '渋谷', '新宿', '港区', '世田谷', '目黒'],
    cities: [
      { name: 'Shibuya', center: [35.6595, 139.7005], zoom: 14 },
      { name: 'Shinjuku', center: [35.6938, 139.7034], zoom: 14 },
      { name: 'Minato', center: [35.6581, 139.7516], zoom: 14 },
      { name: 'Meguro', center: [35.6415, 139.6982], zoom: 14 },
      { name: 'Setagaya', center: [35.6466, 139.653], zoom: 13 },
    ],
  },
  {
    key: 'kyoto',
    label: 'Kyoto',
    countryCode: 'JP',
    countryName: 'Japan',
    stateCode: '26',
    stateName: 'Kyoto',
    center: [35.0116, 135.7681],
    zoom: 12,
    aliases: ['kyoto', '京都', '祇園', '東山', '伏見'],
    cities: [
      { name: 'Nakagyo', center: [35.0102, 135.751], zoom: 14 },
      { name: 'Shimogyo', center: [34.9875, 135.7594], zoom: 14 },
      { name: 'Higashiyama', center: [34.9965, 135.7788], zoom: 14 },
      { name: 'Sakyo', center: [35.0422, 135.7785], zoom: 13 },
      { name: 'Fushimi', center: [34.936, 135.7617], zoom: 13 },
    ],
  },
  {
    key: 'seoul',
    label: 'Seoul',
    countryCode: 'KR',
    countryName: 'South Korea',
    stateCode: '11',
    stateName: 'Seoul',
    center: [37.5665, 126.978],
    zoom: 12,
    aliases: ['seoul', '서울', 'gangnam', 'mapo', 'yongsan'],
    cities: [
      { name: 'Gangnam-gu', center: [37.5172, 127.0473], zoom: 14 },
      { name: 'Jongno-gu', center: [37.5735, 126.979], zoom: 14 },
      { name: 'Mapo-gu', center: [37.5663, 126.9019], zoom: 14 },
      { name: 'Yongsan-gu', center: [37.5326, 126.9905], zoom: 14 },
      { name: 'Seongsu', center: [37.5447, 127.0557], zoom: 14 },
    ],
  },
  {
    key: 'hawaii',
    label: 'Hawaii',
    countryCode: 'US',
    countryName: 'United States',
    stateCode: 'HI',
    stateName: 'Hawaii',
    center: [21.3069, -157.8583],
    zoom: 11,
    aliases: ['hawaii', 'honolulu', 'waikiki', 'maui', 'oahu'],
    cities: [
      { name: 'Honolulu', center: [21.3069, -157.8583], zoom: 13 },
      { name: 'Waikiki', center: [21.2767, -157.8275], zoom: 14 },
      { name: 'Kailua', center: [21.4022, -157.7394], zoom: 13 },
      { name: 'North Shore', center: [21.664, -158.051], zoom: 12 },
      { name: 'Hilo', center: [19.7076, -155.0885], zoom: 13 },
    ],
  },
];

const AREA_OPTIONS: AreaOption[] = BASE_AREA_OPTIONS.map((area) => ({
  ...area,
  cities: buildAreaCityOptions(area),
}));

const normalizeMapCoords = (latInput: number | string, lngInput: number | string) => {
  let lat = Number(latInput);
  let lng = Number(lngInput);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    [lat, lng] = [lng, lat];
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  return { lat, lng };
};

const createAiFavoriteSlug = (value?: string | null) => {
  const normalized = (value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/['’`´]/g, '')
    .replace(/[\s\-‐‑‒–—―_/.,()【】「」『』·・]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'spot';
};

const AI_FAVORITE_COORD_PRECISION = 5;

const createAiFavoriteKey = (rec: { lat: number; lng: number; name?: string; area_key?: string; city_name?: string }) => {
  const normalized = normalizeMapCoords(rec.lat, rec.lng);
  const lat = normalized?.lat ?? Number(rec.lat) ?? 0;
  const lng = normalized?.lng ?? Number(rec.lng) ?? 0;
  const areaKey = rec.area_key || inferAreaKeyFromCoords(lat, lng) || 'unknown';
  const cityKey = createAiFavoriteSlug(rec.city_name || 'all');
  return `ai::${areaKey}::${cityKey}::${lat.toFixed(AI_FAVORITE_COORD_PRECISION)}::${lng.toFixed(AI_FAVORITE_COORD_PRECISION)}`;
};

const createAiFavoriteClusterKey = (rec: { lat: number; lng: number; area_key?: string; city_name?: string }) => {
  return createAiFavoriteKey(rec);
};


const normalizeAiComparisonName = (value?: string | null) => {
  return (value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\s\-‐‑‒–—―_/.,()【】「」『』·・'’`´]/g, '');
};

const areAiFavoriteCitiesEquivalent = (left?: string | null, right?: string | null) => {
  const leftSlug = createAiFavoriteSlug(left || 'all');
  const rightSlug = createAiFavoriteSlug(right || 'all');
  if (leftSlug === 'all' || rightSlug === 'all') return true;
  return leftSlug === rightSlug;
};

const getDistanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aValue = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aValue), Math.sqrt(1 - aValue));
  return earthRadius * c;
};

const getAiFavoriteAllNames = (item: { name?: string; translations?: Partial<Record<Locale, AiFavoriteTranslation>> }) => {
  const names = new Set<string>();
  if (item.name) names.add(item.name);
  Object.values(item.translations || {}).forEach((translation) => {
    if (translation?.name) names.add(translation.name);
  });
  return Array.from(names);
};

const areAiFavoritesEquivalent = (
  left: { name?: string; lat: number; lng: number; area_key?: string; city_name?: string; category?: string; translations?: Partial<Record<Locale, AiFavoriteTranslation>> },
  right: { name?: string; lat: number; lng: number; area_key?: string; city_name?: string; category?: string; translations?: Partial<Record<Locale, AiFavoriteTranslation>> },
) => {
  const leftCoords = normalizeMapCoords(left.lat, left.lng);
  const rightCoords = normalizeMapCoords(right.lat, right.lng);
  if (!leftCoords || !rightCoords) return false;

  const leftArea = left.area_key || inferAreaKeyFromCoords(leftCoords.lat, leftCoords.lng) || 'unknown';
  const rightArea = right.area_key || inferAreaKeyFromCoords(rightCoords.lat, rightCoords.lng) || 'unknown';
  if (leftArea !== rightArea) return false;
  if (!areAiFavoriteCitiesEquivalent(left.city_name, right.city_name)) return false;

  const leftKey = createAiFavoriteClusterKey({ lat: leftCoords.lat, lng: leftCoords.lng, area_key: leftArea, city_name: left.city_name });
  const rightKey = createAiFavoriteClusterKey({ lat: rightCoords.lat, lng: rightCoords.lng, area_key: rightArea, city_name: right.city_name });
  if (leftKey === rightKey) return true;

  const distanceMeters = getDistanceMeters(leftCoords, rightCoords);
  const leftNames = getAiFavoriteAllNames(left).map(normalizeAiComparisonName).filter(Boolean);
  const rightNames = getAiFavoriteAllNames(right).map(normalizeAiComparisonName).filter(Boolean);
  const nameMatches = leftNames.some((name) => rightNames.includes(name));

  if (nameMatches && distanceMeters <= 40) {
    return true;
  }

  return false;
};

const findMatchingAiFavoriteItem = (
  items: AiFavoriteItem[],
  rec: { name?: string; lat: number; lng: number; area_key?: string; city_name?: string; category?: string; translations?: Partial<Record<Locale, AiFavoriteTranslation>> },
) => {
  return items.find((item) => areAiFavoritesEquivalent(item, rec)) || null;
};

const containsJapanese = (value: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(value);

const formatWebsiteLabel = (url?: string) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/$/, '');
    return `${parsed.hostname.replace(/^www\./, '')}${pathname && pathname !== '/' ? pathname : ''}`;
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
};

const guessAiFavoriteLocale = (item: { name?: string; reason?: string; category?: string }): Locale => {
  const sample = `${item.name || ''} ${item.reason || ''} ${item.category || ''}`;
  return containsJapanese(sample) ? 'jp' : 'en';
};

const getAiFavoriteDisplay = (item: AiFavoriteItem, locale: Locale): AiFavoriteTranslation => {
  const localized = item.translations?.[locale];
  if (localized?.name) return localized;

  const fallback = locale === 'jp' ? item.translations?.en : item.translations?.jp;
  if (fallback?.name) return fallback;

  return {
    name: item.name,
    reason: item.reason,
    details: item.details || item.reason,
    category: item.category,
  };
};

const mapAiFavoriteRowToItem = (row: Partial<AiFavoriteRow>): AiFavoriteItem | null => {
  if (!row?.name) return null;
  const normalized = normalizeMapCoords(row.lat as number, row.lng as number);
  if (!normalized) return null;

  const key = createAiFavoriteKey({
    name: row.name,
    lat: normalized.lat,
    lng: normalized.lng,
    area_key: row.area_key || undefined,
    city_name: row.city_name || undefined,
  });

  return {
    key,
    name: row.name,
    reason: row.reason || '',
    category: row.category || 'AI Recommendation',
    lat: normalized.lat,
    lng: normalized.lng,
    created_at: row.created_at || new Date().toISOString(),
    details: row.details || row.reason || '',
    area_key: row.area_key || undefined,
    city_name: row.city_name || undefined,
    translations: row.translations || undefined,
  };
};

const mapAiFavoriteItemToRow = (item: AiFavoriteItem, userId: string): AiFavoriteRow => ({
  user_id: userId,
  favorite_key: item.key,
  canonical_key: item.key,
  name: item.name,
  reason: item.reason,
  category: item.category,
  details: item.details || item.reason,
  lat: item.lat,
  lng: item.lng,
  area_key: item.area_key || null,
  city_name: item.city_name || null,
  translations: item.translations || null,
  created_at: item.created_at,
});

const mergeAiFavoriteItems = (items: any[]): AiFavoriteItem[] => {
  const merged: AiFavoriteItem[] = [];

  items.forEach((item) => {
    const normalized = normalizeMapCoords(item?.lat, item?.lng);
    if (!normalized || !item?.name) return;

    const candidate: AiFavoriteItem = {
      key: item?.canonical_key || createAiFavoriteKey({
        name: item?.name,
        lat: normalized.lat,
        lng: normalized.lng,
        area_key: item?.area_key || undefined,
        city_name: item?.city_name || undefined,
      }),
      name: item.name,
      reason: item?.reason || '',
      category: item?.category || 'AI Recommendation',
      lat: normalized.lat,
      lng: normalized.lng,
      created_at: item?.created_at || new Date().toISOString(),
      details: item?.details || item?.reason || '',
      area_key: item?.area_key || undefined,
      city_name: item?.city_name || undefined,
      translations: item?.translations || undefined,
    };

    const itemLocale = guessAiFavoriteLocale(item);
    const translation: AiFavoriteTranslation = {
      name: item.name,
      reason: item?.reason || '',
      category: item?.category || 'AI Recommendation',
      details: item?.details || item?.reason || '',
    };

    const existingIndex = merged.findIndex((entry) => areAiFavoritesEquivalent(entry, candidate));
    if (existingIndex === -1) {
      merged.push({
        ...candidate,
        translations: {
          ...(item?.translations || {}),
          [itemLocale]: translation,
        },
      });
      return;
    }

    const entry = merged[existingIndex];
    const mergedTranslations = {
      ...(entry.translations || {}),
      ...(item?.translations || {}),
      [itemLocale]: translation,
    };

    const newestCreatedAt = new Date(item?.created_at || 0).getTime() > new Date(entry.created_at || 0).getTime()
      ? item?.created_at || entry.created_at
      : entry.created_at;

    merged[existingIndex] = {
      ...entry,
      key: entry.key || candidate.key,
      created_at: newestCreatedAt,
      translations: mergedTranslations,
      name: entry.name || translation.name,
      reason: entry.reason || translation.reason,
      category: entry.category || translation.category,
      details: entry.details || translation.details || entry.reason,
      area_key: entry.area_key || item?.area_key || undefined,
      city_name: entry.city_name || item?.city_name || undefined,
    };
  });

  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

const findAreaOption = (areaKey?: string | null) => AREA_OPTIONS.find((item) => item.key === areaKey) || AREA_OPTIONS[0];

const createLocationFilterFromArea = (areaKey: string, cityName?: string) => {
  const area = findAreaOption(areaKey);
  const city = area.cities.find((item) => item.name === cityName) || area.cities[0] || null;
  return {
    areaKey: area.key,
    areaName: area.label,
    countryCode: area.countryCode,
    countryName: area.countryName,
    stateCode: area.stateCode,
    stateName: area.stateName,
    cityCode: city?.name || '',
    cityName: city?.name || '',
  };
};

const inferAreaKeyFromCoords = (lat?: number | null, lng?: number | null) => {
  const normalized = normalizeMapCoords(lat, lng);
  if (!normalized) return undefined;

  let nearest = AREA_OPTIONS[0];
  let nearestScore = Number.POSITIVE_INFINITY;

  AREA_OPTIONS.forEach((area) => {
    const score = Math.pow(normalized.lat - area.center[0], 2) + Math.pow(normalized.lng - area.center[1], 2);
    if (score < nearestScore) {
      nearest = area;
      nearestScore = score;
    }
  });

  return nearest?.key;
};

const inferAreaKeyFromText = (value?: string | null) => {
  const haystack = (value || '').toLowerCase();
  if (!haystack) return '';
  const matched = AREA_OPTIONS.find((area) => area.aliases.some((alias) => haystack.includes(alias.toLowerCase())));
  return matched?.key || '';
};

const resolvePlaceAreaKey = (place: Partial<Place>) => {
  return place.area_key || inferAreaKeyFromText([place.area_label, place.prefecture, place.country, place.address, place.municipality].filter(Boolean).join(' ')) || 'tokyo';
};

const resolvePlaceCityName = (place: Partial<Place>, areaKey?: string) => {
  const area = findAreaOption(areaKey || resolvePlaceAreaKey(place));
  const direct = place.municipality || '';
  if (direct && area.cities.some((city) => city.name.toLowerCase() === direct.toLowerCase())) return direct;
  const address = `${place.address || ''} ${place.municipality || ''}`.toLowerCase();
  return area.cities.find((city) => address.includes(city.name.toLowerCase()))?.name || direct || '';
};

const getAreaCityOptions = (areaKey?: string | null) => findAreaOption(areaKey).cities;

const normalizeNameForMatch = (value?: string | null) => {
  return (value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/['’`´]/g, '')
    .replace(/\b(the|tokyo|new york|kyoto|seoul|hawaii)\b/g, ' ')
    .replace(/[\s\-‐‑‒–—―_/.,()【】「」『』·・]+/g, ' ')
    .trim();
};

const truncateVisualText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
};

const escapeSvgText = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const getAiCardTheme = (category?: string) => {
  const normalized = category || 'その他';
  if (normalized.includes('カフェ')) return { start: '#f5efe6', end: '#ddd0c0', accent: '#72563a', line: '#d8c7b4' };
  if (normalized.includes('レストラン')) return { start: '#f6ece8', end: '#e6c7c0', accent: '#7d4345', line: '#ddc1ba' };
  if (normalized.includes('ショッピング')) return { start: '#eef1f4', end: '#d6dde6', accent: '#41566f', line: '#c9d3de' };
  if (normalized.includes('エンターテイメント')) return { start: '#ece9f7', end: '#d4cdee', accent: '#4d3b75', line: '#c8c0e4' };
  if (normalized.includes('公園') || normalized.includes('自然')) return { start: '#edf5ee', end: '#d4e6d7', accent: '#3e6a4a', line: '#c7ddcb' };
  if (normalized.includes('神社') || normalized.includes('寺院')) return { start: '#f5f1e8', end: '#e4dac6', accent: '#6f5a35', line: '#ddd0bc' };
  return { start: '#f3f0eb', end: '#ddd7cf', accent: '#4a4a4a', line: '#d2cbc2' };
};

const buildAiLocationCardImage = ({
  rec,
  areaLabel,
  cityLabel,
}: {
  rec: AiRecommendationItem;
  areaLabel: string;
  cityLabel: string;
}) => {
  const theme = getAiCardTheme(rec.category);
  const title = escapeSvgText(truncateVisualText(rec.name, 30));
  const category = escapeSvgText(truncateVisualText(rec.category || 'MILZ AI', 16));
  const subtitle = escapeSvgText(truncateVisualText(cityLabel ? `${areaLabel} · ${cityLabel}` : areaLabel, 28));
  const detail = escapeSvgText(truncateVisualText(rec.reason || rec.details || '', 46));
  const coords = `${Number(rec.lat).toFixed(4)}, ${Number(rec.lng).toFixed(4)}`;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" width="1200" height="760">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${theme.start}" />
        <stop offset="100%" stop-color="${theme.end}" />
      </linearGradient>
      <linearGradient id="shine" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.7" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect width="1200" height="760" rx="48" fill="url(#bg)" />
    <rect x="38" y="38" width="1124" height="684" rx="38" fill="none" stroke="#ffffff" stroke-opacity="0.55" />
    <path d="M120 610 C 260 480, 390 620, 540 520 S 880 390, 1050 470" fill="none" stroke="${theme.line}" stroke-width="20" stroke-linecap="round" opacity="0.65" />
    <path d="M130 190 C 280 130, 390 260, 555 220 S 850 105, 1035 180" fill="none" stroke="${theme.line}" stroke-width="12" stroke-linecap="round" opacity="0.45" />
    <path d="M170 330 C 310 290, 420 420, 600 400 S 870 250, 1030 315" fill="none" stroke="${theme.line}" stroke-width="8" stroke-linecap="round" opacity="0.4" />
    <circle cx="865" cy="245" r="146" fill="#ffffff" opacity="0.18" />
    <circle cx="918" cy="228" r="98" fill="#ffffff" opacity="0.12" />
    <rect x="92" y="92" width="210" height="52" rx="26" fill="#ffffff" fill-opacity="0.72" />
    <text x="197" y="126" text-anchor="middle" font-size="26" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="5" fill="${theme.accent}">MILZ AI</text>
    <text x="92" y="196" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="4" fill="${theme.accent}" opacity="0.72">${subtitle}</text>
    <text x="92" y="292" font-size="76" font-family="Inter, Arial, sans-serif" font-weight="900" fill="#111111">${title}</text>
    <text x="92" y="350" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="600" fill="#222222" opacity="0.82">${detail}</text>
    <rect x="92" y="420" width="208" height="54" rx="27" fill="#ffffff" fill-opacity="0.75" />
    <text x="196" y="455" text-anchor="middle" font-size="24" font-family="Inter, Arial, sans-serif" font-weight="800" letter-spacing="3" fill="${theme.accent}">${category}</text>
    <g transform="translate(905 468)">
      <circle cx="0" cy="0" r="86" fill="#ffffff" fill-opacity="0.82" />
      <circle cx="0" cy="-10" r="28" fill="${theme.accent}" />
      <path d="M0 78 C -34 48 -50 26 -50 -2 C -50 -34 -28 -58 0 -58 C 28 -58 50 -34 50 -2 C 50 26 34 48 0 78Z" fill="${theme.accent}" opacity="0.92" />
      <circle cx="0" cy="-2" r="12" fill="#ffffff" />
    </g>
    <text x="92" y="638" font-size="20" font-family="Inter, Arial, sans-serif" font-weight="700" letter-spacing="4" fill="${theme.accent}" opacity="0.72">LOCATION</text>
    <text x="92" y="676" font-size="28" font-family="Inter, Arial, sans-serif" font-weight="700" fill="#111111">${escapeSvgText(coords)}</text>
    <rect x="0" y="0" width="1200" height="760" rx="48" fill="url(#shine)" />
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const createAiRecommendationVisualKey = (rec: AiRecommendationItem, index: number) => `${createAiFavoriteKey({ name: rec.name, lat: rec.lat, lng: rec.lng })}::${index}`;

const uiCopy: Record<Locale, Record<string, string>> = {
  jp: {
    map: 'MAP',
    spots: 'SPOTS',
    shorts: 'SHORTS',
    ai: 'AI',
    profile: 'PROFILE',
    aiEyebrow: 'MILZ AI DISCOVERY',
    aiTitle: '選択した地域のおすすめを取得',
    aiSubtitle: 'MILZが地域ごとに厳選した候補をまとめます。',
    activeRegion: 'Active region',
    regionHint: 'REGIONを切り替えると、MAPとAIの対象地域も切り替わります。',
    currentScope: 'Current Scope',
    getRecommendations: 'おすすめを取得',
    recommendedSpots: 'AI Recommendations',
    itemsFound: 'items found',
    viewOnMap: 'View on MAP',
    saveAi: 'AI Save',
    savedAi: 'Saved',
    aiFavoritesTab: 'AI FAVORITES',
    noAiFavorites: 'AI Recommendationのお気に入りはまだありません。',
    openAiTabHint: 'AIタブで保存したおすすめがここに表示されます。',
    savedAt: 'Saved',
    aiGeneratedNote: 'AI recommendations are generated based on the selected scope. Accuracy may vary by region.',
    language: 'Language',
  },
  en: {
    map: 'MAP',
    spots: 'SPOTS',
    shorts: 'SHORTS',
    ai: 'AI',
    profile: 'PROFILE',
    aiEyebrow: 'MILZ AI DISCOVERY',
    aiTitle: 'Curated recommendations for your selected region',
    aiSubtitle: 'MILZ assembles trusted AI suggestions by region.',
    activeRegion: 'Active region',
    regionHint: 'Changing the region also updates the target area for MAP and AI.',
    currentScope: 'Current Scope',
    getRecommendations: 'Get Recommendations',
    recommendedSpots: 'AI Recommendations',
    itemsFound: 'items found',
    viewOnMap: 'View on MAP',
    saveAi: 'Save',
    savedAi: 'Saved',
    aiFavoritesTab: 'AI FAVORITES',
    noAiFavorites: 'No AI favorites saved yet.',
    openAiTabHint: 'Recommendations you save from the AI tab will appear here.',
    savedAt: 'Saved',
    aiGeneratedNote: 'AI recommendations are generated based on the selected scope. Accuracy may vary by region.',
    language: 'Language',
    shortsEmpty: 'No shorts have been registered yet.',
    shortsHint: 'Registered YouTube Shorts will appear here in a swipe-style feed.',
    openSpot: 'Spot Details',
    backToAi: 'Back to AI',
  },
};


const AI_RECOMMENDATION_POOL_SIZE = 30;
const AI_RECOMMENDATION_VISIBLE_COUNT = 10;
const AI_CACHE_SCHEMA_VERSION = 4;

type AiEditMode = 'family' | 'friends' | 'solo' | 'nature' | 'rain' | 'entertainment';
type AiCategoryKey = 'cafe' | 'restaurant' | 'shopping' | 'entertainment' | 'nature' | 'spiritual' | 'other';

interface AiUserProfile {
  topCategories: string[];
  quietLean: boolean;
  cityKeys: string[];
}

interface AiRecommendationEditorialMeta {
  why: string;
  bestTime: string;
  vibe: string;
}

interface AiCompareSummary {
  shared: string;
  leftPros: string[];
  leftCons: string[];
  rightPros: string[];
  rightCons: string[];
}

interface AiRecommendationTraits {
  isCafe: boolean;
  isRestaurant: boolean;
  isShopping: boolean;
  isEntertainment: boolean;
  isNature: boolean;
  isShrine: boolean;
  quietScore: number;
  indoorScore: number;
  dateScore: number;
  rainScore: number;
  familyScore: number;
  socialScore: number;
  entertainmentScore: number;
  natureScore: number;
  lingerScore: number;
  spaciousScore: number;
}

const AI_EDIT_OPTIONS: Array<{ key: AiEditMode; label: Record<Locale, string>; summary: Record<Locale, string> }> = [
  {
    key: 'family',
    label: { jp: 'Family', en: 'FAMILY' },
    summary: {
      jp: '家族で無理なく回れて、昼の過ごしやすさが出る候補を優先します。',
      en: 'Brings forward lower-friction picks that work better for family pacing.',
    },
  },
  {
    key: 'friends',
    label: { jp: 'Friends', en: 'FRIENDS' },
    summary: {
      jp: '会話が生まれやすく、複数人でテンポ良く回れる候補を優先します。',
      en: 'Pushes spots that are easier to share, compare, and move through with friends.',
    },
  },
  {
    key: 'solo',
    label: { jp: '一人時間', en: 'SOLO' },
    summary: {
      jp: '一人で整う、考える、少し距離を取るための候補を優先します。',
      en: 'Edits toward solo reset, reflection, and atmosphere-led stays.',
    },
  },
  {
    key: 'nature',
    label: { jp: '自然', en: 'NATURE' },
    summary: {
      jp: '緑、余白、空気感を感じやすい候補を強く優先します。',
      en: 'Strongly prioritizes green, open-air, and atmosphere-first picks.',
    },
  },
  {
    key: 'rain',
    label: { jp: '雨の日', en: 'RAIN' },
    summary: {
      jp: '屋内寄りで、雨の日でも体験が崩れにくい候補を優先します。',
      en: 'Re-edits toward indoor-leaning spots that still work well in the rain.',
    },
  },
  {
    key: 'entertainment',
    label: { jp: 'エンタメ', en: 'ENTERTAINMENT' },
    summary: {
      jp: '高揚感、話題性、遊びの密度が出る候補を優先します。',
      en: 'Raises higher-energy picks with stronger activity and talk value.',
    },
  },
];

const AI_MODE_CATEGORY_PLAN: Record<AiEditMode, { heroSlots: AiCategoryKey[]; preferred: AiCategoryKey[]; fallback: AiCategoryKey[]; maxPerCategory: Partial<Record<AiCategoryKey, number>>; }> = {
  family: {
    heroSlots: ['nature', 'nature', 'cafe', 'entertainment', 'nature', 'shopping', 'restaurant', 'cafe', 'entertainment', 'other'],
    preferred: ['nature', 'cafe', 'entertainment', 'shopping', 'restaurant', 'other'],
    fallback: ['spiritual'],
    maxPerCategory: { nature: 4, cafe: 3, entertainment: 2, shopping: 2, restaurant: 2, other: 1, spiritual: 1 },
  },
  friends: {
    heroSlots: ['restaurant', 'entertainment', 'shopping', 'restaurant', 'entertainment', 'cafe', 'shopping', 'restaurant', 'other', 'nature'],
    preferred: ['restaurant', 'entertainment', 'shopping', 'cafe', 'other', 'nature'],
    fallback: ['spiritual'],
    maxPerCategory: { restaurant: 4, entertainment: 3, shopping: 3, cafe: 2, other: 2, nature: 1, spiritual: 1 },
  },
  solo: {
    heroSlots: ['cafe', 'nature', 'spiritual', 'cafe', 'nature', 'other', 'cafe', 'spiritual', 'restaurant', 'other'],
    preferred: ['cafe', 'nature', 'spiritual', 'other', 'restaurant'],
    fallback: ['shopping', 'entertainment'],
    maxPerCategory: { cafe: 4, nature: 3, spiritual: 3, other: 2, restaurant: 1, shopping: 1, entertainment: 1 },
  },
  nature: {
    heroSlots: ['nature', 'nature', 'spiritual', 'nature', 'cafe', 'nature', 'spiritual', 'cafe', 'other', 'nature'],
    preferred: ['nature', 'spiritual', 'cafe', 'other'],
    fallback: ['restaurant'],
    maxPerCategory: { nature: 5, spiritual: 3, cafe: 2, other: 2, restaurant: 1, shopping: 0, entertainment: 0 },
  },
  rain: {
    heroSlots: ['cafe', 'shopping', 'restaurant', 'cafe', 'shopping', 'restaurant', 'entertainment', 'cafe', 'other', 'shopping'],
    preferred: ['cafe', 'shopping', 'restaurant', 'entertainment', 'other'],
    fallback: ['nature', 'spiritual'],
    maxPerCategory: { cafe: 4, shopping: 4, restaurant: 3, entertainment: 2, other: 2, nature: 1, spiritual: 1 },
  },
  entertainment: {
    heroSlots: ['entertainment', 'restaurant', 'shopping', 'entertainment', 'restaurant', 'shopping', 'cafe', 'entertainment', 'other', 'restaurant'],
    preferred: ['entertainment', 'restaurant', 'shopping', 'cafe', 'other'],
    fallback: ['nature'],
    maxPerCategory: { entertainment: 4, restaurant: 4, shopping: 3, cafe: 2, other: 2, nature: 1, spiritual: 0 },
  },
};

const normalizeAiText = (value?: string | null) => (value || '')
  .normalize('NFKC')
  .toLowerCase();

const countAiSignals = (blob: string, tokens: string[]) => tokens.reduce((sum, token) => sum + (blob.includes(token) ? 1 : 0), 0);

const containsJapaneseText = (value?: string) => Boolean(value && /[぀-ヿ㐀-鿿]/.test(value));

const hasMostlyTargetLocale = (results: AIResults | null | undefined, locale: Locale) => {
  const recs = results?.recommendations || [];
  if (!recs.length) return false;
  const sample = recs.slice(0, 5);
  const textBlob = sample.map((item) => [item.name, item.reason, item.details, item.editorial_note, item.best_time].filter(Boolean).join(' ')).join(' ');
  const hasJapanese = containsJapaneseText(textBlob);
  return locale === 'jp' ? hasJapanese : !hasJapanese;
};

const categorizeAiRecommendation = (rec: Pick<AiRecommendationItem, 'category' | 'reason' | 'details' | 'name' | 'editorial_note' | 'best_time' | 'fit_tags' | 'indoor_outdoor' | 'weather_fit' | 'social_fit' | 'energy'>): AiRecommendationTraits => {
  const category = normalizeAiText(rec.category);
  const blob = [
    rec.name,
    rec.reason,
    rec.details,
    rec.category,
    rec.editorial_note,
    rec.best_time,
    ...(rec.fit_tags || []),
    rec.indoor_outdoor,
    rec.weather_fit,
    rec.social_fit,
    rec.energy,
  ].map(normalizeAiText).join(' ');
  const indoorOutdoor = normalizeAiText(rec.indoor_outdoor);
  const weatherFit = normalizeAiText(rec.weather_fit);
  const socialFit = normalizeAiText(rec.social_fit);
  const energy = normalizeAiText(rec.energy);

  const isCafe = category.includes('カフェ') || blob.includes('coffee') || blob.includes('cafe') || blob.includes('喫茶');
  const isRestaurant = category.includes('レストラン') || blob.includes('dining') || blob.includes('bar') || blob.includes('food') || blob.includes('食');
  const isShopping = category.includes('ショッピング') || blob.includes('shop') || blob.includes('store') || blob.includes('market') || blob.includes('retail');
  const isEntertainment = category.includes('エンターテイメント') || blob.includes('nightlife') || blob.includes('music') || blob.includes('view') || blob.includes('sky') || blob.includes('museum') || blob.includes('gallery') || blob.includes('cinema') || blob.includes('design');
  const isNature = category.includes('公園') || category.includes('自然') || blob.includes('park') || blob.includes('garden') || blob.includes('green') || blob.includes('river') || blob.includes('forest');
  const isShrine = category.includes('神社') || category.includes('寺院') || blob.includes('temple') || blob.includes('shrine');

  const quietScore = countAiSignals(blob, ['quiet', 'calm', 'slow', 'still', '落ち着', '静', '余白', '空気', 'reset', 'reflect']) + (energy === 'quiet' ? 4 : 0) + (isCafe ? 1 : 0) + (isNature ? 2 : 0) + (isShrine ? 2 : 0);
  const indoorScore = countAiSignals(blob, ['indoor', 'inside', 'interior', 'gallery', 'hotel', 'shop', 'coffee', 'bar', 'restaurant', 'museum', 'covered', '屋内']) + (indoorOutdoor === 'indoor' ? 6 : indoorOutdoor === 'mixed' ? 2 : 0) + (isCafe ? 2 : 0) + (isRestaurant ? 2 : 0) + (isShopping ? 2 : 0) + (isEntertainment ? 1 : 0);
  const dateScore = countAiSignals(blob, ['date', 'romantic', 'night', 'cocktail', 'dinner', 'view', '夜景', 'デート']) + (socialFit === 'mixed' ? 1 : 0) + (isRestaurant ? 2 : 0) + (isEntertainment ? 2 : 0);
  const rainScore = countAiSignals(blob, ['rain', 'covered', 'hotel', 'interior', 'indoor', '雨', 'gallery', 'museum']) + (weatherFit === 'rain_ok' ? 8 : weatherFit === 'all_weather' ? 5 : 0) + indoorScore;
  const familyScore = countAiSignals(blob, ['family', 'kids', 'child', 'children', 'play', 'picnic', 'safe', '広場', '芝生', '家族']) + (socialFit === 'family' ? 7 : socialFit === 'mixed' ? 2 : 0) + (isNature ? 3 : 0) + (isEntertainment ? 1 : 0) + (isCafe ? 1 : 0);
  const socialScore = countAiSignals(blob, ['friends', 'group', 'share', 'conversation', 'bar', 'cocktail', 'dinner', 'market', 'walk', '会話', '複数']) + (socialFit === 'friends' ? 7 : socialFit === 'mixed' ? 3 : 0) + (energy === 'lively' ? 3 : 0) + (isRestaurant ? 2 : 0) + (isEntertainment ? 2 : 0) + (isShopping ? 2 : 0);
  const entertainmentScore = countAiSignals(blob, ['music', 'show', 'nightlife', 'view', 'sky', 'museum', 'gallery', 'live', 'event', '話題', '高揚']) + (energy === 'lively' ? 7 : energy === 'balanced' ? 2 : 0) + (isEntertainment ? 3 : 0) + (isShopping ? 1 : 0);
  const natureScore = countAiSignals(blob, ['park', 'garden', 'green', 'river', 'open', 'tree', '緑', '自然', '空気']) + (indoorOutdoor === 'outdoor' ? 5 : 0) + (weatherFit === 'clear_best' ? 2 : 0) + (isNature ? 3 : 0) + (isShrine ? 1 : 0);
  const lingerScore = countAiSignals(blob, ['linger', 'stay', 'sit', 'slow', 'quiet', 'coffee', 'long', '滞在', '余白']) + (socialFit === 'solo' ? 3 : 0) + (isCafe ? 3 : 0) + (isNature ? 1 : 0) + (isRestaurant ? 1 : 0);
  const spaciousScore = countAiSignals(blob, ['wide', 'large', 'open', 'spacious', 'green', 'park', '広い', '開放']) + (indoorOutdoor === 'outdoor' ? 2 : 0) + (isNature ? 2 : 0);

  return {
    isCafe,
    isRestaurant,
    isShopping,
    isEntertainment,
    isNature,
    isShrine,
    quietScore,
    indoorScore,
    dateScore,
    rainScore,
    familyScore,
    socialScore,
    entertainmentScore,
    natureScore,
    lingerScore,
    spaciousScore,
  };
};

const getAiCategoryKey = (category?: string | null): AiCategoryKey => {
  const normalized = normalizeAiText(category);
  if (normalized.includes('カフェ') || normalized.includes('coffee') || normalized.includes('cafe')) return 'cafe';
  if (normalized.includes('レストラン') || normalized.includes('restaurant')) return 'restaurant';
  if (normalized.includes('ショッピング') || normalized.includes('shopping')) return 'shopping';
  if (normalized.includes('エンターテイメント') || normalized.includes('entertainment')) return 'entertainment';
  if (normalized.includes('公園') || normalized.includes('自然') || normalized.includes('park') || normalized.includes('nature')) return 'nature';
  if (normalized.includes('神社') || normalized.includes('寺院') || normalized.includes('shrine') || normalized.includes('temple')) return 'spiritual';
  return 'other';
};

const getMoodCategoryWeight = (mode: AiEditMode, categoryKey: AiCategoryKey) => {
  const matrix: Record<AiEditMode, Record<AiCategoryKey, number>> = {
    family: { cafe: 1.14, restaurant: 1.02, shopping: 1.08, entertainment: 1.18, nature: 1.28, spiritual: 0.78, other: 0.96 },
    friends: { cafe: 1.05, restaurant: 1.24, shopping: 1.18, entertainment: 1.24, nature: 0.86, spiritual: 0.72, other: 0.94 },
    solo: { cafe: 1.24, restaurant: 0.86, shopping: 0.78, entertainment: 0.72, nature: 1.22, spiritual: 1.24, other: 1.02 },
    rain: { cafe: 1.22, restaurant: 1.1, shopping: 1.18, entertainment: 1.06, nature: 0.52, spiritual: 0.72, other: 1.02 },
    nature: { cafe: 0.98, restaurant: 0.78, shopping: 0.62, entertainment: 0.56, nature: 1.52, spiritual: 1.3, other: 0.96 },
    entertainment: { cafe: 0.92, restaurant: 1.14, shopping: 1.12, entertainment: 1.42, nature: 0.6, spiritual: 0.52, other: 0.96 },
  };
  return matrix[mode][categoryKey] ?? 1;
};

const deriveAiUserProfile = (places: Place[], favorites: Favorite[], aiFavorites: AiFavoriteItem[]): AiUserProfile => {
  const categoryCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const favoritePlacesById = new Map(places.map((place) => [place.id, place]));

  favorites.forEach((favorite) => {
    const place = favoritePlacesById.get(favorite.place_id);
    if (!place) return;
    const categoryKey = getAiCategoryKey(place.category);
    categoryCounts.set(categoryKey, (categoryCounts.get(categoryKey) || 0) + 1);
    const cityKey = normalizeAiText(resolvePlaceCityName(place, resolvePlaceAreaKey(place)) || place.address || '');
    if (cityKey) cityCounts.set(cityKey, (cityCounts.get(cityKey) || 0) + 1);
  });

  aiFavorites.forEach((favorite) => {
    const categoryKey = getAiCategoryKey(favorite.category);
    categoryCounts.set(categoryKey, (categoryCounts.get(categoryKey) || 0) + 1);
    const cityKey = normalizeAiText(favorite.city_name || '');
    if (cityKey) cityCounts.set(cityKey, (cityCounts.get(cityKey) || 0) + 1);
  });

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => key);

  const quietLean = ((categoryCounts.get('cafe') || 0) + (categoryCounts.get('nature') || 0) + (categoryCounts.get('spiritual') || 0)) >= ((categoryCounts.get('entertainment') || 0) + (categoryCounts.get('shopping') || 0) + (categoryCounts.get('restaurant') || 0));
  const cityKeys = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([key]) => key);

  return { topCategories, quietLean, cityKeys };
};

const scoreAiRecommendation = ({
  rec,
  mode,
  profile,
  areaKey,
  cityName,
  index,
}: {
  rec: AiRecommendationItem;
  mode: AiEditMode;
  profile: AiUserProfile;
  areaKey: string;
  cityName?: string;
  index: number;
}) => {
  const categoryKey = getAiCategoryKey(rec.category);
  const traits = categorizeAiRecommendation(rec);
  const blob = normalizeAiText([rec.name, rec.reason, rec.details, rec.category, rec.editorial_note, ...(rec.fit_tags || [])].join(' '));
  let score = 100 - index * 0.6;
  score *= getMoodCategoryWeight(mode, categoryKey);

  const modeBase: Record<AiEditMode, number> = {
    family:
      traits.familyScore * 10 +
      traits.spaciousScore * 4 +
      traits.rainScore * 2 +
      traits.socialScore * 1.5 +
      (traits.isNature ? 12 : 0) +
      (traits.isEntertainment ? 6 : 0) -
      (traits.isShrine ? 10 : 0),
    friends:
      traits.socialScore * 9 +
      traits.entertainmentScore * 5 +
      traits.dateScore * 3 +
      (traits.isRestaurant ? 8 : 0) +
      (traits.isShopping ? 5 : 0) -
      traits.quietScore * 0.8,
    solo:
      traits.quietScore * 9 +
      traits.lingerScore * 5 +
      traits.natureScore * 3 +
      (traits.isShrine ? 6 : 0) -
      (traits.isEntertainment ? 12 : 0) -
      (traits.socialScore > 8 ? 4 : 0),
    nature:
      traits.natureScore * 10 +
      traits.quietScore * 4 +
      traits.spaciousScore * 4 +
      (traits.isShrine ? 4 : 0) -
      (traits.isShopping ? 16 : 0) -
      (traits.isEntertainment ? 18 : 0),
    rain:
      traits.rainScore * 8 +
      traits.indoorScore * 4 +
      (traits.isCafe ? 5 : 0) +
      (traits.isShopping ? 6 : 0) +
      (traits.isRestaurant ? 4 : 0) -
      (traits.isNature ? 18 : 0),
    entertainment:
      traits.entertainmentScore * 10 +
      traits.socialScore * 4 +
      traits.dateScore * 3 +
      (traits.isShopping ? 4 : 0) +
      (traits.isRestaurant ? 4 : 0) -
      (traits.isNature ? 8 : 0) -
      (traits.isShrine ? 12 : 0),
  };
  score += modeBase[mode];

  if (profile.topCategories.includes(categoryKey)) score += 6;
  if (profile.quietLean && (traits.isCafe || traits.isNature || traits.isShrine) && ['solo', 'nature'].includes(mode)) score += 5;
  if (!profile.quietLean && (traits.isRestaurant || traits.isEntertainment || traits.isShopping) && ['friends', 'entertainment'].includes(mode)) score += 5;
  if (cityName && normalizeAiText(cityName) && blob.includes(normalizeAiText(cityName))) score += 5;
  if (profile.cityKeys.some((candidate) => candidate && blob.includes(candidate))) score += 3;
  if (areaKey && blob.includes(normalizeAiText(areaKey))) score += 2;

  return score;
};

const selectAiEditorialRecommendations = (
  scored: Array<{ rec: AiRecommendationItem; index: number; score: number; key: string; editorial: AiRecommendationEditorialMeta }>,
  mode: AiEditMode,
) => {
  const plan = AI_MODE_CATEGORY_PLAN[mode];
  const picked: typeof scored = [];
  const pickedKeys = new Set<string>();
  const categoryCounts = new Map<AiCategoryKey, number>();
  const maxFor = (categoryKey: AiCategoryKey) => plan.maxPerCategory[categoryKey] ?? 99;

  const isModeAllowed = (item: (typeof scored)[number]) => {
    const categoryKey = getAiCategoryKey(item.rec.category);
    const traits = categorizeAiRecommendation(item.rec);
    if (mode === 'nature') return categoryKey !== 'shopping' && categoryKey !== 'entertainment' && traits.natureScore >= 4;
    if (mode === 'rain') return traits.rainScore >= 6 || categoryKey === 'shopping' || categoryKey === 'cafe' || categoryKey === 'restaurant';
    if (mode === 'entertainment') return categoryKey !== 'spiritual' && traits.entertainmentScore >= 3;
    if (mode === 'solo') return !(categoryKey === 'entertainment' && traits.quietScore < 4);
    return true;
  };

  const canAdd = (item: (typeof scored)[number]) => {
    const categoryKey = getAiCategoryKey(item.rec.category);
    return isModeAllowed(item) && (categoryCounts.get(categoryKey) || 0) < maxFor(categoryKey);
  };

  const add = (item?: (typeof scored)[number]) => {
    if (!item || pickedKeys.has(item.key) || !canAdd(item)) return false;
    const categoryKey = getAiCategoryKey(item.rec.category);
    picked.push(item);
    pickedKeys.add(item.key);
    categoryCounts.set(categoryKey, (categoryCounts.get(categoryKey) || 0) + 1);
    return true;
  };

  const nextByCategory = (categoryKey: AiCategoryKey) => scored.find((item) => !pickedKeys.has(item.key) && getAiCategoryKey(item.rec.category) === categoryKey && canAdd(item));

  // Build the first 10 explicitly from the mode plan so each mode really changes the visible set.
  for (const categoryKey of plan.heroSlots) {
    if (picked.length >= AI_RECOMMENDATION_VISIBLE_COUNT) break;
    add(nextByCategory(categoryKey));
  }

  for (const categoryKey of plan.preferred) {
    if (picked.length >= AI_RECOMMENDATION_VISIBLE_COUNT) break;
    const candidates = scored.filter((item) => !pickedKeys.has(item.key) && getAiCategoryKey(item.rec.category) === categoryKey && canAdd(item));
    for (const candidate of candidates) {
      if (picked.length >= AI_RECOMMENDATION_VISIBLE_COUNT) break;
      add(candidate);
    }
  }

  const weightedFallback = scored
    .filter((item) => !pickedKeys.has(item.key) && isModeAllowed(item))
    .sort((a, b) => {
      const aCategory = getAiCategoryKey(a.rec.category);
      const bCategory = getAiCategoryKey(b.rec.category);
      const aPreferred = plan.preferred.includes(aCategory) ? 1 : 0;
      const bPreferred = plan.preferred.includes(bCategory) ? 1 : 0;
      if (bPreferred !== aPreferred) return bPreferred - aPreferred;
      return b.score - a.score || a.index - b.index;
    });

  for (const candidate of weightedFallback) {
    if (picked.length >= AI_RECOMMENDATION_VISIBLE_COUNT) break;
    add(candidate);
  }

  // Remainder keeps the same mode logic so the next page is still coherent.
  const remainder = scored.filter((item) => !pickedKeys.has(item.key) && isModeAllowed(item));
  for (const candidate of remainder) {
    if (picked.length >= AI_RECOMMENDATION_POOL_SIZE) break;
    add(candidate);
  }

  return picked;
};

const deriveAiBestTime = (rec: AiRecommendationItem, mode: AiEditMode, locale: Locale) => {
  if (rec.best_time?.trim()) return rec.best_time;
  const categoryKey = getAiCategoryKey(rec.category);
  if (mode === 'entertainment') return locale === 'jp' ? '夕方〜夜' : 'Late afternoon to night';
  if (mode === 'rain') return locale === 'jp' ? '雨の日の午後' : 'A rainy afternoon';
  if (mode === 'solo') return locale === 'jp' ? '人が増える前の時間帯' : 'Before the crowd builds';
  if (mode === 'family') return locale === 'jp' ? '昼前後' : 'Late morning to afternoon';
  if (mode === 'friends') return locale === 'jp' ? '午後〜夕方' : 'Afternoon to early evening';
  if (categoryKey === 'cafe') return locale === 'jp' ? '午前〜昼前' : 'Morning to late morning';
  if (categoryKey === 'restaurant') return locale === 'jp' ? '夕方〜夜' : 'Early evening to dinner';
  if (categoryKey === 'shopping') return locale === 'jp' ? '午後' : 'Mid-afternoon';
  if (categoryKey === 'entertainment') return locale === 'jp' ? '夕方以降' : 'Golden hour onward';
  if (categoryKey === 'nature' || categoryKey === 'spiritual') return locale === 'jp' ? '朝〜夕方手前' : 'Morning or late afternoon';
  return locale === 'jp' ? '午後〜夕方' : 'Afternoon';
};

const deriveAiVibe = (rec: AiRecommendationItem, locale: Locale) => {
  if (rec.fit_tags?.length) return rec.fit_tags.slice(0, 2).join(locale === 'jp' ? '・' : ' / ');
  const categoryKey = getAiCategoryKey(rec.category);
  const traits = categorizeAiRecommendation(rec);
  if (traits.isNature || traits.isShrine) return locale === 'jp' ? '空気感を整える場所' : 'Atmosphere-first reset';
  if (traits.isCafe) return locale === 'jp' ? '滞在で差が出る一杯' : 'A stay-over-a-sip type of stop';
  if (traits.isRestaurant) return locale === 'jp' ? '会話で良さが出る場所' : 'Better with conversation';
  if (traits.isEntertainment) return locale === 'jp' ? '高揚感を取りに行く候補' : 'For lift and energy';
  if (traits.isShopping) return locale === 'jp' ? '歩きながら体感するタイプ' : 'Works best while moving through it';
  if (categoryKey === 'other') return locale === 'jp' ? 'カテゴリーより体験重視' : 'More about feel than category';
  return locale === 'jp' ? 'MILZ基準の再編集候補' : 'A MILZ-edited pick';
};

const deriveAiWhyFits = ({ rec, mode, profile, locale }: { rec: AiRecommendationItem; mode: AiEditMode; profile: AiUserProfile; locale: Locale }) => {
  if (rec.editorial_note?.trim()) return rec.editorial_note;
  const categoryKey = getAiCategoryKey(rec.category);
  const traits = categorizeAiRecommendation(rec);
  if (mode === 'family') return locale === 'jp' ? `家族での移動が重くなりにくく、${traits.isNature ? '外で余白が取れる点' : '天候に左右されにくい点'}を見て優先しています。` : 'Raised for easier family pacing and lower-friction movement.';
  if (mode === 'friends') return locale === 'jp' ? '複数人で会話が生まれやすく、回遊しながら比較しやすい候補として上位化しています。' : 'Moved up for group conversation, shared reaction, and easier circulation.';
  if (mode === 'solo') return locale === 'jp' ? 'ひとりで長居した時に効いてくる、静けさと滞在価値のある候補として残しています。' : 'Kept high as a stronger solo stay with more quiet and longer-tail value.';
  if (mode === 'rain') return locale === 'jp' ? '雨でも体験が痩せにくい屋内寄りの構成として、安心して選びやすい位置に置いています。' : 'Placed high as an indoor-leaning pick that still holds its shape in the rain.';
  if (mode === 'entertainment') return locale === 'jp' ? '話題性、高揚感、寄り道の密度が出やすい候補として前に出しています。' : 'Moved forward for lift, novelty, and stronger activity density.';
  if (mode === 'nature') return locale === 'jp' ? '緑、余白、呼吸のしやすさが出る候補として優先しています。' : 'Boosted for green, breathing room, and open-air recovery.';
  if (profile.topCategories.includes(categoryKey)) {
    const categoryLabel = locale === 'jp'
      ? ({ cafe: 'カフェ', restaurant: 'レストラン', shopping: 'ショッピング', entertainment: 'エンタメ', nature: '自然系', spiritual: '寺社', other: '編集枠' } as Record<string, string>)[categoryKey]
      : ({ cafe: 'cafe', restaurant: 'restaurant', shopping: 'shopping', entertainment: 'entertainment', nature: 'nature', spiritual: 'spiritual', other: 'editorial' } as Record<string, string>)[categoryKey];
    return locale === 'jp'
      ? `保存傾向と照らすと${categoryLabel}寄りの感覚に接続しやすく、今回の条件でも筋が良いため残しています。`
      : `This stays because it connects cleanly to your saved ${categoryLabel}-leaning pattern.`;
  }
  return locale === 'jp'
    ? '30件の候補から、今回のモードに対して理由が立つものだけを上位に絞っています。'
    : 'Held high because it makes a clearer case for the current mode within the 30-pick pool.';
};

const buildAiCompareSummary = ({ left, right, locale }: { left: AiRecommendationItem; right: AiRecommendationItem; locale: Locale }): AiCompareSummary => {
  const leftTraits = categorizeAiRecommendation(left);
  const rightTraits = categorizeAiRecommendation(right);
  const shared = (() => {
    const quietDiff = leftTraits.quietScore - rightTraits.quietScore;
    const socialDiff = leftTraits.socialScore - rightTraits.socialScore;
    const weatherDiff = leftTraits.rainScore - rightTraits.rainScore;
    if (Math.abs(quietDiff) > 2 && Math.abs(socialDiff) > 2) {
      if (quietDiff > 0 && socialDiff < 0) {
        return locale === 'jp'
          ? `${left.name} は整える滞在向き、${right.name} は会話と回遊のテンポ向きです。`
          : `${left.name} leans toward reset and staying, while ${right.name} works better for circulation and conversation.`;
      }
      if (quietDiff < 0 && socialDiff > 0) {
        return locale === 'jp'
          ? `${right.name} は整える滞在向き、${left.name} は会話と回遊のテンポ向きです。`
          : `${right.name} leans toward reset and staying, while ${left.name} works better for circulation and conversation.`;
      }
    }
    if (Math.abs(weatherDiff) > 3) {
      return locale === 'jp'
        ? '片方は雨でも強く、もう片方は天気の良い日に魅力が伸びる組み合わせです。'
        : 'One stays stronger in the rain, while the other opens up more in better weather.';
    }
    return locale === 'jp'
      ? '同じエリアでも、使い方と良さの出方がかなり違う2件です。'
      : 'These two live in the same area, but reward very different ways of using the place.';
  })();

  const fallbackPros = (rec: AiRecommendationItem, traits: AiRecommendationTraits, other: AiRecommendationTraits) => {
    const items: Array<{ score: number; text: string }> = [];
    if (traits.quietScore >= other.quietScore + 2) items.push({ score: traits.quietScore, text: locale === 'jp' ? '静けさや余白を取りに行く時に向いています。' : 'Stronger when you want quiet and breathing room.' });
    if (traits.socialScore >= other.socialScore + 2) items.push({ score: traits.socialScore, text: locale === 'jp' ? '会話や複数人での回遊に向いています。' : 'Better for shared conversation and moving through with others.' });
    if (traits.rainScore >= other.rainScore + 3) items.push({ score: traits.rainScore, text: locale === 'jp' ? '雨の日でも体験が崩れにくいです。' : 'Holds together better in the rain.' });
    if (traits.entertainmentScore >= other.entertainmentScore + 2) items.push({ score: traits.entertainmentScore, text: locale === 'jp' ? '高揚感や話題性を作りやすいです。' : 'Creates more lift and talk value.' });
    if (traits.lingerScore >= other.lingerScore + 2) items.push({ score: traits.lingerScore, text: locale === 'jp' ? '短時間より、少し滞在した時に良さが出やすいです。' : 'Gets better when you stay a bit longer.' });
    if (traits.isNature) items.push({ score: 3, text: locale === 'jp' ? '緑や外気を感じながら体験しやすいです。' : 'Lets the green and open air do more of the work.' });
    if (traits.isCafe) items.push({ score: 2.5, text: locale === 'jp' ? '一杯そのものより、滞在の空気感で効いてきます。' : 'Works through the feel of staying, not just the drink.' });
    if (traits.isRestaurant) items.push({ score: 2.5, text: locale === 'jp' ? '食事と会話をセットで取りに行く時に強いです。' : 'Stronger when meal quality and conversation matter together.' });
    if (traits.isEntertainment) items.push({ score: 2.5, text: locale === 'jp' ? '記憶に残る体験や高揚感を作りやすいです。' : 'Better for memorable, higher-energy experiences.' });
    return Array.from(new Map(items.sort((a, b) => b.score - a.score).map((item) => [item.text, item])).values()).slice(0, 3).map((item) => item.text);
  };

  const fallbackCons = (rec: AiRecommendationItem, traits: AiRecommendationTraits, other: AiRecommendationTraits) => {
    const items: Array<{ score: number; text: string }> = [];
    if (traits.quietScore + 2 <= other.quietScore) items.push({ score: 5, text: locale === 'jp' ? '静かに整えたい日には、相手側の方が向いています。' : 'If you want a quieter reset, the other option fits better.' });
    if (traits.socialScore + 2 <= other.socialScore) items.push({ score: 5, text: locale === 'jp' ? '複数人での会話や回遊では、相手側の方が強いです。' : 'The other option is stronger for group talk and social pacing.' });
    if (traits.rainScore + 3 <= other.rainScore) items.push({ score: 4, text: locale === 'jp' ? '天候が悪い日は、相手側の方が崩れにくいです。' : 'In bad weather, the other option holds together better.' });
    if (traits.entertainmentScore + 2 <= other.entertainmentScore) items.push({ score: 4, text: locale === 'jp' ? '高揚感や話題性は、相手側の方が作りやすいです。' : 'The other option creates more lift and talk value.' });
    if (traits.isNature) items.push({ score: 2.5, text: locale === 'jp' ? '雨や夜だと魅力が少し落ちやすいです。' : 'Can lose some impact in rain or after dark.' });
    if (traits.isCafe) items.push({ score: 2.5, text: locale === 'jp' ? '長居しないと良さを取り切りにくいです。' : 'Harder to fully read if you only stop briefly.' });
    if (traits.isShopping) items.push({ score: 2.5, text: locale === 'jp' ? '静けさを重視する日には少し合いにくいです。' : 'Less suited to a quieter, slower mood.' });
    if (traits.isShrine) items.push({ score: 2.5, text: locale === 'jp' ? 'にぎやかな会話や回遊には少し振れにくいです。' : 'Less suited to louder, more social circulation.' });
    return Array.from(new Map(items.sort((a, b) => b.score - a.score).map((item) => [item.text, item])).values()).slice(0, 3).map((item) => item.text);
  };

  const normalizeLines = (lines?: string[]) => (lines || []).map((line) => line?.trim()).filter(Boolean).slice(0, 3) as string[];

  return {
    shared,
    leftPros: normalizeLines(left.pros).length ? normalizeLines(left.pros) : fallbackPros(left, leftTraits, rightTraits),
    leftCons: normalizeLines(left.cons).length ? normalizeLines(left.cons) : fallbackCons(left, leftTraits, rightTraits),
    rightPros: normalizeLines(right.pros).length ? normalizeLines(right.pros) : fallbackPros(right, rightTraits, leftTraits),
    rightCons: normalizeLines(right.cons).length ? normalizeLines(right.cons) : fallbackCons(right, rightTraits, leftTraits),
  };
};

// Custom Map Events Component
// Custom Map Events Component
const TOKYO_CENTER: [number, number] = [35.6812, 139.7671];
const DEFAULT_ZOOM = 13;

function MapEvents({ 
  user, 
  role, 
  activeTab, 
  setNewPlacePos, 
  setIsAdding, 
  setMapBounds, 
  mapRef,
  focusTarget,
  onFocusHandled,
}: { 
  user: any, 
  role: UserRole | null, 
  activeTab: Tab, 
  setNewPlacePos: (pos: { lat: number; lng: number } | null) => void, 
  setIsAdding: (val: boolean) => void, 
  setMapBounds: (bounds: L.LatLngBounds | null) => void, 
  mapRef: React.MutableRefObject<L.Map | null>,
  focusTarget: { lat: number; lng: number } | null,
  onFocusHandled: () => void,
}) {
  const map = useMap();
  
  const isFirstLoad = useRef(true);
  
  useEffect(() => {
    if (map) {
      mapRef.current = {
        flyTo: (coords, zoom, options) => map.flyTo(coords, zoom, options),
      };
      setMapBounds(map.getBounds());
    }
    return () => {
      mapRef.current = null;
    };
  }, [map, mapRef, setMapBounds]);

  useEffect(() => {
    if (!map || !focusTarget || activeTab !== 'map') return;
    map.flyTo([focusTarget.lat, focusTarget.lng], 16, { duration: 1.2 });
    onFocusHandled();
  }, [map, focusTarget, activeTab, onFocusHandled]);

  useMapEvents({
    click(e) {
      if (user && role === 'admin' && activeTab === 'map') {
        setNewPlacePos(e.latlng);
        setIsAdding(true);
      }
    },
    load() {
      setMapBounds(map.getBounds());
    },
    moveend() {
      setMapBounds(map.getBounds());
    }
  });
  return null;
}

const CATEGORY_CONFIG: Record<string, { icon: any, color: string, bg: string }> = {
  'レストラン': { icon: Utensils, color: '#000000', bg: '#FFFFFF' },
  'カフェ': { icon: Coffee, color: '#000000', bg: '#FFFFFF' },
  'ショッピング': { icon: ShoppingBag, color: '#000000', bg: '#FFFFFF' },
  'エンターテイメント': { icon: Ticket, color: '#000000', bg: '#FFFFFF' },
  '公園・自然': { icon: Trees, color: '#000000', bg: '#FFFFFF' },
  '神社・寺院': { icon: Landmark, color: '#000000', bg: '#FFFFFF' },
  'その他': { icon: MoreHorizontal, color: '#000000', bg: '#FFFFFF' },
  'restaurant': { icon: Utensils, color: '#000000', bg: '#FFFFFF' },
  'cafe': { icon: Coffee, color: '#000000', bg: '#FFFFFF' },
  'shopping': { icon: ShoppingBag, color: '#000000', bg: '#FFFFFF' },
  'entertainment': { icon: Ticket, color: '#000000', bg: '#FFFFFF' },
  'park': { icon: Trees, color: '#000000', bg: '#FFFFFF' },
  'temple': { icon: Landmark, color: '#000000', bg: '#FFFFFF' },
  'other': { icon: MoreHorizontal, color: '#000000', bg: '#FFFFFF' },
};

const CATEGORY_ICONS_SVG: Record<string, string> = {
  'カフェ・レストラン': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>',
  'レストラン': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>',
  'カフェ': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="5"></line><line x1="10" y1="2" x2="10" y2="5"></line><line x1="14" y1="2" x2="14" y2="5"></line></svg>',
  '公園・自然': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"></path><path d="M18 12v.2A3 3 0 0 1 16.9 18H13a3 3 0 0 1-1-5.8V12a3 3 0 0 1 6 0Z"></path><path d="M12 22v-3"></path><path d="M8 22v-2"></path><path d="M16 22v-2"></path></svg>',
  'ショッピング': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>',
  'エンターテイメント': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3Z"></path><path d="M7 6v12"></path><path d="M17 6v12"></path><path d="M2 12h5"></path><path d="M17 12h5"></path></svg>',
  '神社・寺院': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"></path><path d="M5 22V10l7-4 7 4v12"></path><path d="M9 10V6h6v4"></path><path d="M12 22v-6"></path><path d="M2 10h20"></path></svg>',
  'その他': '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
};

// Cache for icons to prevent re-creating them on every render
const iconCache: Record<string, L.DivIcon> = {};

const getCustomIcon = (category: string, mapStyle: string) => {
  const cacheKey = `${category}-${mapStyle}`;
  if (iconCache[cacheKey]) return iconCache[cacheKey];

  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['その他'];
  const iconSvg = CATEGORY_ICONS_SVG[category] || CATEGORY_ICONS_SVG['その他'];
  
  const isIllustrative = isIllustrationTheme(mapStyle as MapThemeKey);
  const bgColor = isIllustrative ? '#000000' : config.bg;
  const iconColor = isIllustrative ? '#FFFFFF' : config.color;
  const borderColor = isIllustrative ? '#000000' : 'white';
  const borderWidth = isIllustrative ? '2px' : '3px';
  const shadow = isIllustrative ? 'none' : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
  
  const html = `
    <div style="
      background-color: ${bgColor};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: ${borderWidth} solid ${borderColor};
      box-shadow: ${shadow};
      transition: all 0.3s ease;
      color: ${iconColor};
    ">
      ${iconSvg}
    </div>
  `;

  const icon = L.divIcon({
    html,
    className: 'custom-div-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
  
  iconCache[cacheKey] = icon;
  return icon;
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [isSavingProfileName, setIsSavingProfileName] = useState(false);
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState<Place[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [aiFavorites, setAiFavorites] = useState<AiFavoriteItem[]>([]);
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'jp';
    const stored = window.localStorage.getItem('milz_locale');
    return stored === 'en' ? 'en' : 'jp';
  });
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [isAdding, setIsAdding] = useState(false);
  const [newPlacePos, setNewPlacePos] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedBadge, setSelectedBadge] = useState<string | 'all'>('all');
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_CATEGORY_OPTIONS);
  const [badgeOptions, setBadgeOptions] = useState<string[]>(DEFAULT_BADGE_OPTIONS);
  const [filterOptionName, setFilterOptionName] = useState('');
  const [filterOptionKind, setFilterOptionKind] = useState<FilterOptionKind>('badge');
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [placeEditorAreaKey, setPlaceEditorAreaKey] = useState<string>('tokyo');
  const [placeEditorCityName, setPlaceEditorCityName] = useState<string>('Shibuya');
  const [placeEditorBadges, setPlaceEditorBadges] = useState<string[]>([]);
  const [selectedAiRecommendation, setSelectedAiRecommendation] = useState<AIResults['recommendations'] extends (infer T)[] ? T | null : any>(null);
  const [aiLeaderboard, setAiLeaderboard] = useState<AiRecommendationMetric[]>([]);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [selectedPlaceForDetail, setSelectedPlaceForDetail] = useState<Place | null>(null);

  const openPlaceDetail = React.useCallback((target: Place | string | null | undefined) => {
    if (!target) {
      setSelectedPlaceForDetail(null);
      return;
    }

    const resolved = typeof target === 'string'
      ? places.find((place) => place.id === target)
      : places.find((place) => place.id === target.id) || target;

    if (!resolved) return;

    setSelectedPlaceForDetail({
      ...resolved,
      images: [...(resolved.images || [])],
      videos: [...(resolved.videos || [])],
      pdfs: [...(resolved.pdfs || [])],
      reviews: [...(resolved.reviews || [])],
      badges: [...(resolved.badges || [])],
      from_spot_items: [...(resolved.from_spot_items || [])],
    });
  }, [places]);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editDetailForm, setEditDetailForm] = useState<Partial<Place>>({});
  const [isUpdatingDetail, setIsUpdatingDetail] = useState(false);
  const [isMapBoundsFilterEnabled, setIsMapBoundsFilterEnabled] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [listFilter, setListFilter] = useState<'all' | 'favorites' | 'ai_favorites'>('all');
  const [isFetching, setIsFetching] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapThemeKey>(() => {
    if (typeof window === 'undefined') return 'original';
    const saved = window.localStorage.getItem('milz_map_style');
    if (saved && saved in MAP_THEMES) {
      return saved as MapThemeKey;
    }
    return 'original';
  });
  const [showMapStyleMenu, setShowMapStyleMenu] = useState(false);
  const [expandedShortInfoId, setExpandedShortInfoId] = useState<string | null>(null);

  const detailViewOnMapLabel = locale === 'jp' ? '地図で見る' : 'View on Map';
  const detailMiniMapLabel = locale === 'jp' ? '同一ページで位置を確認できるミニマップです。' : 'Mini map for quick location context on the same page.';
  const fromSpotHeadingDefault = locale === 'jp' ? 'From the Spot' : 'From the Spot';
  const fromSpotIntroDefault = locale === 'jp'
    ? '店長インタビュー、スタッフ紹介、現場の空気感などを写真や動画と一緒に残せるセクションです。'
    : 'A place for interviews, staff notes, and on-site moments with photos or video.';

  const newPlacePosition = useMemo(() => newPlacePos ? [newPlacePos.lat, newPlacePos.lng] as L.LatLngExpression : null, [newPlacePos]);
  
  const newPlaceIcon = useMemo(() => {
    if (!newPlacePos) return null;
    return L.divIcon({
      html: `
        <div class="${cn(
          "w-10 h-10 flex items-center justify-center border-4 shadow-xl animate-bounce",
          isIllustrationTheme(mapStyle)
            ? "bg-black border-black"
            : "bg-emerald-500 border-white"
        )}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }, [mapStyle, newPlacePos]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('milz_map_style', mapStyle);
  }, [mapStyle]);

  useEffect(() => {
    setShowMapStyleMenu(false);
  }, [activeTab]);

  const activeMapTheme = MAP_THEMES[mapStyle];
  const activeIllustrationTheme = isIllustrationTheme(mapStyle) ? MAP_THEMES[mapStyle] as typeof TOKYO_ILLUSTRATION_THEME : null;

  useEffect(() => {
    if (!mapRef.current || !activeIllustrationTheme) return;
    const preset = { zoom: 15.05 };
    mapRef.current.flyTo(activeIllustrationTheme.center, preset.zoom, {
      animate: true,
      duration: 1.2,
    });
  }, [activeIllustrationTheme, mapStyle]);
  
  const [locationFilter, setLocationFilter] = useState(() => createLocationFilterFromArea('tokyo', 'Shibuya'));
  const areaOptions = AREA_OPTIONS;
  const areaCityOptions = useMemo(() => getAreaCityOptions(locationFilter.areaKey), [locationFilter.areaKey]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<AIResults | null>(null);
  const [aiResultsLocale, setAiResultsLocale] = useState<Locale | null>(null);
  const [aiResultsLocationKey, setAiResultsLocationKey] = useState<string>('tokyo::Shibuya');
  const [aiEditMode, setAiEditMode] = useState<AiEditMode>('family');
  const [aiEditPage, setAiEditPage] = useState(0);
  const [aiCompareKeys, setAiCompareKeys] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    onCancel?: () => void;
  } | null>(null);

  const showToast = React.useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    if (profileDisplayName.trim()) return;
    setProfileDisplayName(user.email.split('@')[0] || 'User');
  }, [user?.email, profileDisplayName]);

  useEffect(() => {
    if (!isAdding) return;

    if (editingPlace) {
      const nextAreaKey = resolvePlaceAreaKey(editingPlace);
      setPlaceEditorAreaKey(nextAreaKey);
      setPlaceEditorCityName(resolvePlaceCityName(editingPlace, nextAreaKey) || getAreaCityOptions(nextAreaKey)[0]?.name || '');
      setPlaceEditorBadges(editingPlace.badges || []);
      return;
    }

    setPlaceEditorAreaKey(locationFilter.areaKey || 'tokyo');
    setPlaceEditorCityName(locationFilter.cityName || getAreaCityOptions(locationFilter.areaKey || 'tokyo')[0]?.name || '');
    setPlaceEditorBadges([]);
  }, [isAdding, editingPlace, locationFilter.areaKey, locationFilter.cityName]);

  // Add to debug logs
  const addLog = React.useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  // Listen for Supabase diagnostic logs
  useEffect(() => {
    const handleDiagLog = (e: any) => {
      addLog(`Supabase: ${e.detail}`);
    };
    window.addEventListener('supabase-debug-log', handleDiagLog);
    return () => window.removeEventListener('supabase-debug-log', handleDiagLog);
  }, [addLog]);
  const [tempAiPin, setTempAiPin] = useState<TempAiPin | null>(null);
  const [pendingMapFocus, setPendingMapFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'signin'>('signin');
  const [selectedAuthRole, setSelectedAuthRole] = useState<UserRole>('admin');
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('masashi@milz.tech');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authEmailSent, setAuthEmailSent] = useState(false);
  const [landingAuthOpen, setLandingAuthOpen] = useState(false);

  useEffect(() => {
    if (activeTab !== 'map') {
      setTempAiPin(null);
    }
  }, [activeTab]);

  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [placeEditorVideosText, setPlaceEditorVideosText] = useState('');
  const isFetchingProfileRef = useRef(false);

  const mapRef = useRef<MapNavigator | null>(null);
  const t = (key: string) => uiCopy[locale][key] ?? key;
  const addSpotCopy = locale === 'jp'
    ? {
        editTitle: 'スポットを編集',
        addTitle: '新しいスポットを追加',
        selectOnMap: '地図をタップするか、下の住所検索で場所を指定してください。',
        or: 'または',
        enterAddress: '住所検索',
        enterAddressPlaceholder: '例: 東京都港区芝公園1-1-1',
        cancel: 'キャンセル',
        spotName: 'スポット名',
        spotNamePlaceholder: '例: Blue Bottle Coffee',
        mainPhoto: 'メイン写真',
        uploadHelp: 'このスポットのメイン画像をアップロードしてください。',
        editorialTip: '編集メモ:',
        editorialTipText: '色味の良い写真がMILZの雰囲気に合います。',
        category: 'カテゴリー / マーカー',
        categoryHint: '地図上のアイコンは、このカテゴリ設定にあわせて自動で切り替わります。',
        area: 'エリア',
        city: '市区町村',
        addressDetail: '住所詳細',
        addressDetailPlaceholder: '番地・建物名まで入力',
        addressDetailHint: '市区町村の次の住所まで入力してください。例: 神南1-19-11 パークウェースクエア2',
        website: 'Webサイト',
        badges: 'バッジ',
        shortDescription: '短い説明',
        shortDescriptionPlaceholder: '一文でまとめた紹介文...',
        editorialContent: '編集コンテンツ',
        milzExperience: 'Milz Experience（ストーリー）',
        milzExperiencePlaceholder: 'レポーターの視点で、この場所の魅力を書いてください。詳細画面の主な紹介文になります。',
        detailedDescription: '詳細説明（補足）',
        detailedDescriptionPlaceholder: '補足情報や背景など...',
        galleryPhotos: 'ギャラリー写真（URLをカンマ区切り）',
        galleryPhotosPlaceholder: 'https://url1.com, https://url2.com...',
        videos: 'ショート動画（MP4をドロップまたはURLを1行ずつ）',
        videosPlaceholder: 'MP4 をドロップ、または https://... を入力',
        pdfs: 'PDF資料（name|url をカンマ区切り）',
        pdfsPlaceholder: 'Menu|https://example.com/menu.pdf',
        publish: 'スポットを公開',
        update: 'スポットを更新',
      }
    : {
        editTitle: 'Edit Spot',
        addTitle: 'Add New Spot',
        selectOnMap: 'Tap anywhere on the map, or search by address below.',
        or: 'OR',
        enterAddress: 'Enter Address',
        enterAddressPlaceholder: 'e.g. 1-1-1 Shiba-koen, Minato-ku, Tokyo',
        cancel: 'Cancel',
        spotName: 'Spot Name',
        spotNamePlaceholder: 'e.g. Blue Bottle Coffee',
        mainPhoto: 'Main Photo',
        uploadHelp: 'Upload the primary image for this spot.',
        editorialTip: 'Editorial Tip:',
        editorialTipText: 'High quality color photos work best for the Milz aesthetic.',
        category: 'Category / Marker',
        categoryHint: 'Map markers automatically follow the selected category.',
        area: 'Area',
        city: 'City / Ward',
        addressDetail: 'Street Address',
        addressDetailPlaceholder: 'Enter street / building details',
        addressDetailHint: 'Please enter the street-level address after selecting the city or ward.',
        website: 'Website',
        badges: 'Badges',
        shortDescription: 'Short Description',
        shortDescriptionPlaceholder: 'A one-sentence summary...',
        editorialContent: 'Editorial Content',
        milzExperience: 'Milz Experience (The Story)',
        milzExperiencePlaceholder: "Write the reporter's curated impression here. This will be the main feature of the detail view.",
        detailedDescription: 'Detailed Description (Fallback)',
        detailedDescriptionPlaceholder: 'Additional background info...',
        galleryPhotos: 'Gallery Photos (Comma separated URLs)',
        galleryPhotosPlaceholder: 'https://url1.com, https://url2.com...',
        videos: 'Short videos (drop MP4 or paste URLs)',
        videosPlaceholder: 'Drop MP4 files or paste https://... one per line',
        pdfs: 'PDF Files (name|url, comma separated)',
        pdfsPlaceholder: 'Menu|https://example.com/menu.pdf',
        publish: 'Publish Spot',
        update: 'Update Spot',
      };
  const mapStyleOptions: { key: MapThemeKey; label: string }[] = [
    { key: 'original', label: 'Original' },
    { key: 'style2', label: 'Style2' },
    { key: 'style3', label: 'Style3' },
    { key: 'style4', label: 'Style4' },
  ];

  const isPlaceholder = (val: string) => {
    if (!val) return false;
    const placeholders = ['YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY', 'TODO_KEYHERE', 'ENTER_YOUR_'];
    return placeholders.some(p => val.toUpperCase().includes(p));
  };

  const [isConfigMissing, setIsConfigMissing] = useState(
    !import.meta.env.VITE_SUPABASE_URL || 
    !import.meta.env.VITE_SUPABASE_ANON_KEY ||
    isPlaceholder(import.meta.env.VITE_SUPABASE_URL) ||
    isPlaceholder(import.meta.env.VITE_SUPABASE_ANON_KEY)
  );

  // Auth and Role listener
  useEffect(() => {
    console.log('App: Initializing auth...', { isConfigMissing });
    
    if (isConfigMissing) {
      console.log('App: Config missing, stopping loading');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log('App: initAuth starting');
        const client = getSupabase();
        if (!client) {
          console.log('App: Supabase client not available');
          if (isMounted) setLoading(false);
          return;
        }
        
        const sessionPromise = client.auth.getSession();
        const sessionTimeout = new Promise((resolve) => 
          setTimeout(() => {
            console.warn('App: getSession timed out, proceeding with null session');
            resolve({ data: { session: null }, error: null });
          }, 10000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([sessionPromise, sessionTimeout]) as any;
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          console.log('App: Session found', session.user.email);
          setUser(session.user);
          // Immediate role override for admin
          if (session.user.email === 'masashi@milz.tech') {
            setRole('admin');
          }
          await fetchProfile(session.user.id, session.user.email);
        } else {
          console.log('App: No session found');
        }
      } catch (error) {
        console.error('App: Auth init error:', error);
      } finally {
        console.log('App: initAuth finished');
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const client = getSupabase();
    let subscription: any = null;
    
    if (client) {
      const { data } = client.auth.onAuthStateChange(async (event, session) => {
        console.log('App: Auth state change', event, session?.user?.email);
        if (isMounted) {
          if (session?.user) {
            setUser(session.user);
            // Immediate role override for admin
            if (session.user.email === 'masashi@milz.tech') {
              setRole('admin');
            }
            await fetchProfile(session.user.id, session.user.email);
          } else {
            setUser(null);
            setRole(null);
          }
          setLoading(false);
        }
      });
      subscription = data.subscription;
    }

    // Fallback: Ensure loading is disabled after a timeout
    const timer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('App: Initialization timeout, forcing loading off');
        setLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      if (subscription) subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [isConfigMissing]);

  const fetchProfile = async (userId: string, userEmail?: string) => {
    if (isFetchingProfileRef.current) return;
    isFetchingProfileRef.current = true;

    const tryRawProfileFetch = async () => {
      addLog('fetchProfile: Attempting Raw API fallback...');
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!url || !key) {
          addLog('fetchProfile: Raw API skipped (Config missing)');
          return;
        }

        const res = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}&select=role,display_name`, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const profile = data[0];
          if (profile) {
            addLog('fetchProfile: Raw API Success (Profile found)');
            let currentRole = profile.role as UserRole;
            const adminEmail = 'masashi@milz.tech';
            if (userEmail?.toLowerCase().trim() === adminEmail) {
              currentRole = 'admin';
            }
            setRole(currentRole);
          setProfileDisplayName(profile.display_name || email?.split('@')[0] || 'User');
            setProfileDisplayName(profile.display_name || userEmail?.split('@')[0] || 'User');
            return true;
          }
          addLog('fetchProfile: Raw API Success (No profile found)');
          return false;
        }
        addLog(`fetchProfile: Raw API Failed (${res.status})`);
        return false;
      } catch (e: any) {
        let msg = e.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchProfile: Raw API Exception: ${msg}`);
        return false;
      }
    };

    try {
      const email = userEmail?.toLowerCase().trim();
      console.log('App: fetchProfile', { userId, email });
      const client = getSupabase();
      if (!client) {
        addLog('fetchProfile: Client missing, trying raw fetch');
        await tryRawProfileFetch();
        isFetchingProfileRef.current = false;
        return;
      }
      
      const adminEmail = 'masashi@milz.tech';
      
      // Force state if email matches
      if (email === adminEmail) {
        console.log('App: Email matches admin, forcing state');
        setRole('admin');
      }

      const fetchPromise = client
        .from('profiles')
.select('role, display_name')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timed out (10s)')), 10000)
      );

      addLog('fetchProfile: Awaiting response from Supabase library...');
      try {
        const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
        const { data: profile, error } = result;

        if (error) {
          addLog(`fetchProfile: Library Error: ${error.message}`);
          await tryRawProfileFetch();
        } else if (profile) {
          let currentRole = profile.role as UserRole;
          console.log('App: Profile found in DB', { currentRole });
          
          // Force admin role if email matches adminEmail
          if (email === adminEmail && currentRole !== 'admin') {
            console.log('App: Forcing admin role update in DB for', email);
            currentRole = 'admin';
            await client.from('profiles').update({ role: 'admin' }).eq('id', userId);
          }
          setRole(currentRole);
        } else {
          // Create or update profile using upsert to avoid race conditions
          const roleToSet = (email === adminEmail) ? 'admin' : (pendingRole || 'user');
          console.log('App: Upserting profile with role', roleToSet);
          
          const { error: upsertError } = await client
            .from('profiles')
            .upsert({
              id: userId,
              email: email,
              display_name: email?.split('@')[0] || 'User',
              role: roleToSet,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
          
          if (!upsertError) {
            setRole(roleToSet);
            setProfileDisplayName(email?.split('@')[0] || 'User');
          } else {
            console.error('App: Profile upsert error:', upsertError);
            addLog(`fetchProfile: Error upserting profile: ${upsertError.message}`);
            await tryRawProfileFetch();
          }
          setPendingRole(null);
        }
      } catch (err: any) {
        let msg = err.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchProfile: Library Exception/Timeout: ${msg}`);
        await tryRawProfileFetch();
      }
    } catch (error: any) {
      console.error('App: Profile fetch error:', error);
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
      }
      addLog(`fetchProfile: Exception: ${msg}`);
    } finally {
      isFetchingProfileRef.current = false;
    }
  };

  const handleSaveProfileName = async () => {
    if (!user) return;
    const trimmedName = profileDisplayName.trim();

    if (!trimmedName) {
      showToast('表示名を入力してください。', 'error');
      return;
    }

    setIsSavingProfileName(true);

    try {
      const client = getSupabase();
      if (!client) throw new Error('Supabase client unavailable');

      const { error } = await client
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email?.toLowerCase().trim(),
          display_name: trimmedName,
          role: role || 'user',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;

      showToast('表示名を更新しました。', 'success');
    } catch (error: any) {
      console.error('Profile name save error:', error);
      showToast(error?.message || '表示名の更新に失敗しました。', 'error');
    } finally {
      setIsSavingProfileName(false);
    }
  };

  const normalizePlaces = React.useCallback((items: Place[] = []) => {
    return (items || []).map((p) => ({
      ...p,
      detailed_description: p.detailed_description || '',
      milz_experience: p.milz_experience || '',
      images: p.images || [],
      videos: p.videos || [],
      pdfs: p.pdfs || [],
      rating: p.rating || 4.5,
      review_count: p.review_count || 0,
      hours: p.hours || '',
      reviews: p.reviews || [],
      badges: p.badges || [],
      from_spot_items: p.from_spot_items || [],
      area_key: p.area_key || resolvePlaceAreaKey(p),
      area_label: p.area_label || findAreaOption(p.area_key || resolvePlaceAreaKey(p)).label,
      municipality: p.municipality || resolvePlaceCityName(p, p.area_key || resolvePlaceAreaKey(p)),
    }));
  }, []);

  const fetchFilterOptions = React.useCallback(async () => {
    const client = getSupabase();
    if (!client) {
      setCategoryOptions(DEFAULT_CATEGORY_OPTIONS);
      setBadgeOptions(DEFAULT_BADGE_OPTIONS);
      return;
    }

    setFilterOptionsLoading(true);
    try {
      const { data, error } = await client
        .from('admin_filter_options')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      const records = (data || []) as FilterOptionRecord[];
      const categories = records.filter((item) => item.kind === 'category').map((item) => item.name).filter(Boolean);
      const badges = records.filter((item) => item.kind === 'badge').map((item) => item.name).filter(Boolean);
      setCategoryOptions(categories.length ? categories : DEFAULT_CATEGORY_OPTIONS);
      setBadgeOptions(badges.length ? badges : DEFAULT_BADGE_OPTIONS);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
      setCategoryOptions(DEFAULT_CATEGORY_OPTIONS);
      setBadgeOptions(DEFAULT_BADGE_OPTIONS);
    } finally {
      setFilterOptionsLoading(false);
    }
  }, []);


  const handleCreateFilterOption = async () => {
    const name = filterOptionName.trim();
    if (!name) {
      showToast(locale === 'jp' ? '項目名を入力してください。' : 'Enter an option name.', 'error');
      return;
    }

    const client = getSupabase();
    if (!client) {
      showToast(locale === 'jp' ? 'DBに接続できません。' : 'Database connection is unavailable.', 'error');
      return;
    }

    try {
      const existingOptions = filterOptionKind === 'category' ? categoryOptions : badgeOptions;
      const { error } = await client.from('admin_filter_options').insert({
        kind: filterOptionKind,
        name,
        sort_order: existingOptions.length + 1,
        is_active: true,
      });
      if (error) throw error;
      setFilterOptionName('');
      fetchFilterOptions();
      showToast(locale === 'jp' ? 'フィルター項目を追加しました。' : 'Filter option added.', 'success');
    } catch (error: any) {
      console.error('Failed to create filter option:', error);
      showToast(error?.message || (locale === 'jp' ? 'フィルター項目の追加に失敗しました。' : 'Failed to add the filter option.'), 'error');
    }
  };

  const handleDeleteFilterOption = async (kind: FilterOptionKind, name: string) => {
    const client = getSupabase();
    if (!client) {
      showToast(locale === 'jp' ? 'DBに接続できません。' : 'Database connection is unavailable.', 'error');
      return;
    }

    try {
      const { error } = await client.from('admin_filter_options').delete().eq('kind', kind).eq('name', name);
      if (error) throw error;
      fetchFilterOptions();
      showToast(locale === 'jp' ? 'フィルター項目を削除しました。' : 'Filter option removed.', 'success');
    } catch (error: any) {
      console.error('Failed to delete filter option:', error);
      showToast(error?.message || (locale === 'jp' ? '削除に失敗しました。' : 'Failed to remove the filter option.'), 'error');
    }
  };

  const isFetchingRef = useRef(false);

  // Fetch places
  const fetchPlaces = React.useCallback(async () => {
    if (isFetchingRef.current) {
      addLog('fetchPlaces: Already in progress, skipping');
      return;
    }
    
    isFetchingRef.current = true;
    setIsFetching(true);
    addLog('fetchPlaces: Starting...');
    
    const tryRawFetch = async () => {
      addLog('fetchPlaces: Attempting Raw API fallback...');
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
          addLog('fetchPlaces: Raw API skipped (Config missing)');
          return false;
        }

        const res = await fetch(`${url}/rest/v1/admin_places?select=*&order=created_at.desc`, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          addLog(`fetchPlaces: Raw API Success (${data.length} items)`);
          setPlaces(normalizePlaces(data as Place[]));
          return true;
        }
        addLog(`fetchPlaces: Raw API Failed (${res.status})`);
        return false;
      } catch (e: any) {
        let msg = e.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchPlaces: Raw API Exception: ${msg}`);
        return false;
      }
    };

    try {
      const client = getSupabase();
      if (!client) {
        addLog('fetchPlaces: Client missing, trying raw fetch');
        await tryRawFetch();
        isFetchingRef.current = false;
        setIsFetching(false);
        return;
      }

      // 5s timeout for the library call, then fallback to raw fetch
      const fetchPromise = client
        .from('admin_places')
        .select('*')
        .order('created_at', { ascending: false });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Library call timed out (5s)')), 5000)
      );

      addLog('fetchPlaces: Awaiting response from Supabase library...');
      try {
        const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
        const { data, error } = result;
        
        if (error) {
          addLog(`fetchPlaces: Library Error ${error.code}: ${error.message}`);
          await tryRawFetch();
        } else if (data) {
          const processedData = normalizePlaces(data as Place[]);
          addLog(`fetchPlaces: Library Success (${data.length} items)`);
          setPlaces(processedData);
        }
      } catch (err: any) {
        let msg = err.message;
        if (msg === 'Failed to fetch') {
          msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
        }
        addLog(`fetchPlaces: Library Exception/Timeout: ${msg}`);
        await tryRawFetch();
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
      }
      addLog(`fetchPlaces: Global Exception: ${msg}`);
      await tryRawFetch();
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
    }
  }, [addLog]);

  useEffect(() => {
    if (isConfigMissing) return;

    fetchFilterOptions();

    if (!isFetchingRef.current) {
      fetchPlaces();
    }

    const client = getSupabase();
    if (!client) return;
    // Realtime subscription
    const channel = client
      .channel('admin_places_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_places' }, fetchPlaces)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isConfigMissing, fetchPlaces]);

  const fetchFavorites = React.useCallback(async () => {
    if (!user || isConfigMissing) {
      setFavorites([]);
      return;
    }
    try {
      const client = getSupabase();
      if (!client) return;
      const { data, error } = await client
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) setFavorites(data as Favorite[]);
    } catch (error) {
      console.error('Fetch favorites error:', error);
    }
  }, [user, isConfigMissing]);

  // Fetch favorites
  useEffect(() => {
    fetchFavorites();

    const client = getSupabase();
    if (!client || !user) return;
    const channel = client
      .channel('favorites_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` }, fetchFavorites)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, isConfigMissing, fetchFavorites]);

  const fetchAiFavorites = React.useCallback(async () => {
    if (!user?.id) {
      setAiFavorites([]);
      return;
    }

    const storageKey = `${AI_FAVORITES_STORAGE_PREFIX}${user.id}`;
    const client = getSupabase();

    const persistLocal = (items: AiFavoriteItem[]) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(items));
      }
    };

    const readLegacyItems = () => {
      const metadataItems = Array.isArray(user?.user_metadata?.[AUTH_METADATA_AI_FAVORITES_KEY])
        ? mergeAiFavoriteItems(user.user_metadata[AUTH_METADATA_AI_FAVORITES_KEY])
        : [];
      if (metadataItems.length > 0) return metadataItems;

      if (typeof window === 'undefined') return [] as AiFavoriteItem[];

      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [] as AiFavoriteItem[];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [] as AiFavoriteItem[];
        return mergeAiFavoriteItems(parsed);
      } catch (error) {
        console.error('Failed to parse legacy AI favorites:', error);
        return [] as AiFavoriteItem[];
      }
    };

    if (!client) {
      const fallbackItems = readLegacyItems();
      setAiFavorites(fallbackItems);
      persistLocal(fallbackItems);
      return;
    }

    try {
      const { data, error } = await client
        .from(AI_FAVORITES_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = ((data || []) as AiFavoriteRow[]).filter((row) => !!mapAiFavoriteRowToItem(row));
      const groups: Array<{ keepRow: AiFavoriteRow; rows: AiFavoriteRow[] }> = [];

      rows.forEach((row) => {
        const rowItem = mapAiFavoriteRowToItem(row);
        if (!rowItem) return;
        const existingGroup = groups.find((group) => {
          const keepItem = mapAiFavoriteRowToItem(group.keepRow);
          return keepItem ? areAiFavoritesEquivalent(keepItem, rowItem) : false;
        });
        if (existingGroup) {
          existingGroup.rows.push(row);
        } else {
          groups.push({ keepRow: row, rows: [row] });
        }
      });

      const dbItems = mergeAiFavoriteItems(rows)
        .filter((item): item is AiFavoriteItem => !!item);

      if (dbItems.length > 0) {
        setAiFavorites(dbItems);
        persistLocal(dbItems);

        const duplicateGroups = new Map<string, AiFavoriteRow[]>();
        rows.forEach((row) => {
          const item = mapAiFavoriteRowToItem(row);
          if (!item) return;
          const clusterKey = createAiFavoriteClusterKey(item);
          duplicateGroups.set(clusterKey, [...(duplicateGroups.get(clusterKey) || []), row]);
        });

        const duplicateIds = Array.from(duplicateGroups.values()).flatMap((groupRows) => groupRows.slice(1).map((row) => row.id).filter(Boolean)) as string[];
        if (duplicateIds.length > 0) {
          try {
            await Promise.all(Array.from(duplicateGroups.values()).map(async (groupRows) => {
              if (groupRows.length <= 1) return;
              const mergedItem = mergeAiFavoriteItems(groupRows)[0];
              const keepRow = groupRows[0];
              if (!mergedItem || !keepRow?.id) return;
              const payload = mapAiFavoriteItemToRow(mergedItem, user.id);
              const { id: _ignored, ...updatePayload } = payload as any;
              await client.from(AI_FAVORITES_TABLE).update(updatePayload).eq('id', keepRow.id);
            }));
            await client.from(AI_FAVORITES_TABLE).delete().in('id', duplicateIds);
          } catch (cleanupError) {
            console.error('Failed to clean duplicate AI favorites:', cleanupError);
          }
        }
        return;
      }

      const legacyItems = readLegacyItems();
      setAiFavorites(legacyItems);
      persistLocal(legacyItems);

      if (legacyItems.length > 0) {
        const payload = legacyItems.map((item) => mapAiFavoriteItemToRow(item, user.id));
        const { error: migrateError } = await client
          .from(AI_FAVORITES_TABLE)
          .upsert(payload, { onConflict: 'user_id,canonical_key' });

        if (migrateError) {
          console.error('Failed to migrate legacy AI favorites into ai_favorites:', migrateError);
        }
      }
    } catch (error) {
      console.error('Failed to load AI favorites:', error);
      const fallbackItems = readLegacyItems();
      setAiFavorites(fallbackItems);
      persistLocal(fallbackItems);
    }
  }, [user]);

  useEffect(() => {
    fetchAiFavorites();

    const client = getSupabase();
    if (!client || !user?.id) return;
    const channel = client
      .channel(`ai_favorites_changes_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: AI_FAVORITES_TABLE, filter: `user_id=eq.${user.id}` }, fetchAiFavorites)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user?.id, fetchAiFavorites]);

  const handleLogin = async () => {
    setAuthError('');
    setPendingRole(selectedAuthRole);
    try {
      const client = getSupabase();
      if (!client) return;
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        setAuthError(error.message);
        setPendingRole(null);
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const client = getSupabase();
      if (!client) return;
      if (authMode === 'signup') {
        setPendingRole(selectedAuthRole);
        setAuthEmailSent(false);
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              language: locale,
              requested_role: selectedAuthRole,
            },
          },
        });
        if (error) throw error;
        setAuthEmailSent(true);
        showToast(locale === 'jp' ? '確認メールを送信しました。メールをご確認ください。' : 'Check your email for confirmation!', 'info');
      } else {
        setAuthEmailSent(false);
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg === 'Failed to fetch') {
        msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URL設定やプロジェクトの状態を確認してください)';
      }
      setAuthError(msg);
      setAuthEmailSent(false);
      setPendingRole(null);
    }
  };

  const [modalAddress, setModalAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleModalAddressSearch = async () => {
    if (!modalAddress.trim()) return;
    setIsGeocoding(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast("Gemini APIキーが設定されていません。", "error");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find the latitude and longitude for: "${modalAddress}". Return ONLY a JSON object with "lat" and "lng" keys.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          }
        }
      });

      const coords = JSON.parse(response.text);
      if (coords.lat && coords.lng) {
        setNewPlacePos({ lat: coords.lat, lng: coords.lng });
        mapRef.current?.flyTo([coords.lat, coords.lng], 16);
      }
    } catch (error) {
      console.error('Modal geocoding error:', error);
      showToast(locale === 'jp' ? 'この住所から場所を見つけられませんでした。' : 'Could not find location for this address.', "error");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleLogout = async () => {
    console.log('App: handleLogout starting');
    // Force local state clear immediately to ensure UI responsiveness
    const clearLocalState = () => {
      setUser(null);
      setRole(null);
      setActiveTab('map');
      console.log('App: Local state cleared');
    };

    try {
      const client = getSupabase();
      if (client) {
        console.log('App: Calling Supabase signOut');
        // Use a timeout for signOut to prevent hanging
        const signOutPromise = client.auth.signOut();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timed out')), 10000)
        );
        
        await Promise.race([signOutPromise, timeoutPromise]);
      }
    } catch (error: any) {
      console.error('App: Logout error (ignoring for local state):', error);
      // We don't alert here to avoid blocking the user if the network is flaky
    } finally {
      clearLocalState();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToR2 = async (file: File): Promise<string | null> => {
    try {
      addLog(`uploadToR2: Uploading ${file.name} (${file.size} bytes)...`);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const text = await response.text();

      if (!response.ok) {
        console.error("Upload failed with response:", text);
        let errorMsg = 'Unknown server error';
        try {
          const errData = JSON.parse(text);
          errorMsg = errData.error || response.statusText;
        } catch (e) {
          if (text.includes('<title>Cookie check</title>')) {
            errorMsg = 'AI Studio authentication required. Please click "Authenticate in new window" in the preview or refresh the page.';
          } else {
            errorMsg = `Server returned non-JSON response: ${text.substring(0, 100)}...`;
          }
        }
        throw new Error(errorMsg);
      }

      try {
        const { publicUrl } = JSON.parse(text);
        if (!publicUrl) throw new Error("Server response missing publicUrl");
        return publicUrl;
      } catch (e: any) {
        console.error("Failed to parse success response:", text);
        throw new Error(`Server returned invalid JSON: ${e.message}`);
      }
    } catch (error: any) {
      console.error("R2 Upload Error:", error);
      addLog(`R2 Upload Error: ${error.message}`);
      throw error;
    }
  };

  const ensureMp4VideoFile = React.useCallback(async (file: File) => {
    const filename = (file.name || '').toLowerCase();
    const isMp4 = file.type === 'video/mp4' || filename.endsWith('.mp4');
    if (!isMp4) {
      throw new Error(locale === 'jp' ? '動画はMP4のみアップロードできます。MOVは一旦対象外です。' : 'Only MP4 videos can be uploaded right now. MOV is not supported in the web uploader yet.');
    }
    return file;
  }, [locale]);

  const validatePlayableVideoFile = React.useCallback(async (file: File) => {
    await new Promise<void>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');
      let settled = false;
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        video.src = '';
      };
      const finish = (handler: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        handler();
      };
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          finish(resolve);
          return;
        }
        finish(() => reject(new Error(locale === 'jp' ? '動画メタデータが不正です。MP4を書き出してから再アップしてください。' : 'Video metadata is invalid. Please export the clip as MP4 and upload it again.')));
      };
      video.onerror = () => finish(() => reject(new Error(locale === 'jp' ? 'このMP4はブラウザで再生できませんでした。H.264 / AAC のMP4で再書き出ししてください。' : 'This MP4 could not be played by the browser. Please export it again as H.264 / AAC MP4.')));
      video.src = objectUrl;
    });
  }, [locale]);

  const uploadVideoFilesToR2 = React.useCallback(async (files: File[]) => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const preparedFile = await ensureMp4VideoFile(file);
      await validatePlayableVideoFile(preparedFile);
      const uploadedUrl = await uploadToR2(preparedFile);
      if (uploadedUrl) uploadedUrls.push(uploadedUrl);
    }
    return uploadedUrls;
  }, [ensureMp4VideoFile, validatePlayableVideoFile]);

  const handlePlaceVideoFilesDrop = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploadedUrls = await uploadVideoFilesToR2(files);
      if (uploadedUrls.length === 0) {
        showToast(locale === 'jp' ? '動画のアップロードに失敗しました。' : 'Video upload failed.', 'error');
        return;
      }
      setPlaceEditorVideosText((prev) => {
        const next = normalizeStoredVideoUrlList([prev, ...uploadedUrls].filter(Boolean).join('\n'));
        return next.join('\n');
      });
      showToast(locale === 'jp' ? `MP4動画を${uploadedUrls.length}件アップロードしました。` : `Uploaded ${uploadedUrls.length} MP4 video(s).`, 'success');
    } catch (error: any) {
      showToast(error?.message || (locale === 'jp' ? '動画アップロードに失敗しました。' : 'Video upload failed.'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const closeAddModal = () => {
    setIsAdding(false);
    setNewPlacePos(null);
    setSelectedFile(null);
    setPreviewImage(null);
    setPlaceEditorVideosText('');
    setModalAddress('');
    setEditingPlace(null);
  };

  const handleEditPlace = (place: Place) => {
    setEditingPlace(place);
    setNewPlacePos({ lat: place.lat, lng: place.lng });
    setPreviewImage(place.image_url || null);
    setPlaceEditorVideosText((place.videos || []).join('\n'));
    setModalAddress(place.address || '');
    setIsAdding(true);
  };

  const handleStartAddSpot = () => {
    if (isAdding) {
      closeAddModal();
      return;
    }

    setEditingPlace(null);
    setSelectedFile(null);
    setPreviewImage(null);
    setPlaceEditorVideosText('');
    setModalAddress('');
    setNewPlacePos(null);
    setIsAdding(true);
    showToast('地図をタップして場所を指定してください。', 'info');
  };

  const handleDeletePlace = async (placeId: string) => {
    setConfirmModal({
      title: "スポットの削除",
      message: "このスポットを削除しますか？この操作は取り消せません。",
      onConfirm: async () => {
        setConfirmModal(null);
        const client = getSupabase();
        if (!client) return;

        try {
          const { error } = await client
            .from('admin_places')
            .delete()
            .eq('id', placeId);

          if (error) throw error;
          showToast("スポットを削除しました。", "success");
          fetchPlaces();
        } catch (error: any) {
          showToast("削除に失敗しました: " + error.message, "error");
        }
      }
    });
  };

  const handleUpdatePlaceInline = async () => {
    if (!selectedPlaceForDetail || isUpdatingDetail) return;
    setIsUpdatingDetail(true);
    
    const client = getSupabase();
    if (!client) {
      showToast("データベースに接続できません。", "error");
      setIsUpdatingDetail(false);
      return;
    }

    try {
      const sanitizedDetailForm = {
        ...editDetailForm,
        videos: normalizeStoredVideoUrlList((editDetailForm.videos || []).join('\n')),
        from_spot_items: (editDetailForm.from_spot_items || []).map((item) => {
          const mediaType = inferMediaTypeFromUrl(item.media_url);
          const hasValidVideo = mediaType === 'video' && (!!item.media_url && (isLikelyVideoUrl(item.media_url) || !!extractYouTubeVideoId(item.media_url)));
          const hasValidImage = mediaType === 'image' && (!!item.media_url && isLikelyImageUrl(item.media_url));
          return {
            ...item,
            media_type: mediaType,
            media_url: hasValidVideo || hasValidImage ? item.media_url : '',
          };
        }),
      };
      const { error } = await client
        .from('admin_places')
        .update(sanitizedDetailForm)
        .eq('id', selectedPlaceForDetail.id);

      if (error) throw error;

      showToast("スポットを更新しました！", "success");
      setIsEditingDetail(false);
      fetchPlaces();
      // Update local state for the detail view
      setSelectedPlaceForDetail({ ...selectedPlaceForDetail, ...sanitizedDetailForm } as Place);
    } catch (err: any) {
      showToast("更新に失敗しました: " + err.message, "error");
    } finally {
      setIsUpdatingDetail(false);
    }
  };

  const handleFilesDrop = async (files: File[], field: 'image_url' | 'images' | 'videos' | 'pdfs') => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      addLog(`handleFilesDrop: Starting upload for ${files.length} files to ${field}`);
      
      if (field === 'videos') {
        const uploadedUrls = await uploadVideoFilesToR2(files);
        setEditDetailForm((prev) => ({
          ...prev,
          videos: normalizeStoredVideoUrlList([...(prev.videos || []), ...uploadedUrls].join('\n')),
        }));
        showToast(
          locale === 'jp'
            ? `動画を${uploadedUrls.length}件アップロードしました。MOVは自動でMP4に変換されます。`
            : `Uploaded ${uploadedUrls.length} video(s). MOV files are converted to MP4 automatically.`,
          'success'
        );
        return;
      }

      const results = await Promise.allSettled(files.map(file => uploadToR2(file)));
      
      const validUrls: string[] = [];
      const errors: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validUrls.push(result.value);
        } else {
          const errorMsg = result.status === 'rejected' ? result.reason.message : 'Unknown error';
          errors.push(`${files[index].name}: ${errorMsg}`);
        }
      });

      if (validUrls.length === 0) {
        showToast(`アップロードに失敗しました。\n${errors.join('\n')}`, "error");
        return;
      }

      if (errors.length > 0) {
        showToast(`${validUrls.length}個成功、${errors.length}個失敗しました。`, "info");
      } else {
        showToast(`${validUrls.length}個のファイルをアップロードしました。`, "success");
      }

      if (field === 'image_url') {
        setEditDetailForm(prev => ({ ...prev, image_url: validUrls[0] }));
      } else if (field === 'pdfs') {
        const newPdfs = results
          .map((result, i) => {
            if (result.status === 'fulfilled' && result.value) {
              return { name: files[i].name, url: result.value };
            }
            return null;
          })
          .filter((p): p is { name: string; url: string } => !!p);

        setEditDetailForm(prev => ({
          ...prev,
          pdfs: [...(prev.pdfs || []), ...newPdfs] as any
        }));
      } else {
        setEditDetailForm(prev => ({
          ...prev,
          [field]: [...(prev[field] as string[] || []), ...validUrls]
        }));
      }
    } catch (err: any) {
      console.error("handleFilesDrop Error:", err);
      showToast(`アップロード中にエラーが発生しました: ${err.message}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleFromSpotMediaDrop = async (itemId: string, files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    const isVideoFile = file.type === 'video/mp4' || /\.mp4$/i.test(file.name || '');
    setUploading(true);
    try {
      const uploadedFile = isVideoFile ? await ensureMp4VideoFile(file) : file;
      const url = await uploadToR2(uploadedFile);
      const mediaType: 'image' | 'video' = isVideoFile ? 'video' : 'image';
      setEditDetailForm((prev) => ({
        ...prev,
        from_spot_items: (prev.from_spot_items || []).map((item) => (
          item.id === itemId ? { ...item, media_url: url, media_type: mediaType } : item
        )),
      }));
      showToast(
        locale === 'jp'
          ? (isVideoFile ? 'From the Spot の動画をアップロードしました。' : 'From the Spot の画像をアップロードしました。')
          : (isVideoFile ? 'Uploaded a From the Spot video.' : 'Uploaded a From the Spot image.'),
        'success'
      );
    } catch (error: any) {
      showToast(error?.message || (locale === 'jp' ? 'アップロードに失敗しました。' : 'Upload failed.'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddPlace = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting || uploading) {
      addLog('handleAddPlace: Already submitting/uploading, ignoring');
      return;
    }

    addLog('handleAddPlace: Triggered');
    
    if (!user) {
      showToast("ログインが必要です。", "error");
      return;
    }
    if (!newPlacePos) {
      showToast("地図上で場所を選択してください。", "error");
      return;
    }
    if (role !== 'admin') {
      showToast(`権限がありません。現在のロール: ${role}。管理者のみスポットを追加できます。`, "error");
      return;
    }

    setIsSubmitting(true);
    addLog('handleAddPlace: Starting process...');

    const formData = e ? new FormData(e.currentTarget as HTMLFormElement) : new FormData();
    const name = formData.get('name') as string || (document.querySelector('input[name="name"]') as HTMLInputElement)?.value;
    const description = formData.get('description') as string || (document.querySelector('textarea[name="description"]') as HTMLTextAreaElement)?.value;
    const category = (formData.get('category') as any) || (document.querySelector('select[name="category"]') as HTMLSelectElement)?.value || 'その他';
    const website_url = formData.get('website_url') as string || (document.querySelector('input[name="website_url"]') as HTMLInputElement)?.value;
    const address = formData.get('address') as string || (document.querySelector('input[name="address"]') as HTMLInputElement)?.value;
    const activeArea = findAreaOption(placeEditorAreaKey);
    const selectedEditorCity = placeEditorCityName || activeArea.cities[0]?.name || '';

    if (!name) {
      showToast(locale === 'jp' ? 'スポット名を入力してください。' : 'Please enter the spot name.', "error");
      setIsSubmitting(false);
      return;
    }

    if (!address?.trim()) {
      showToast(locale === 'jp' ? '市区町村の次の住所まで入力してください。' : 'Please enter the street-level address after the city/ward.', 'error');
      setIsSubmitting(false);
      return;
    }

    let image_url = editingPlace?.image_url || '';
    try {
      if (selectedFile) {
        addLog('handleAddPlace: Uploading image...');
        const uploadedUrl = await uploadToR2(selectedFile);
        if (uploadedUrl) {
          image_url = uploadedUrl;
          addLog('handleAddPlace: Image uploaded');
        }
      }
    } catch (err: any) {
      console.error('App: Upload process error', err);
      addLog(`handleAddPlace: Upload failed: ${err.message}`);
      showToast(`画像のアップロードに失敗しました: ${err.message}。画像なしで保存を試みます。`, "info");
    }

    const client = getSupabase();
    if (!client) {
      addLog('handleAddPlace: Client missing');
      showToast("データベースに接続できません。設定を確認してください。", "error");
      setIsSubmitting(false);
      return;
    }

    addLog('handleAddPlace: Processing spot...');
    
    const tryRawUpsert = async (data: any) => {
      addLog('handleAddPlace: Attempting Raw API fallback...');
      try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const method = editingPlace ? 'PATCH' : 'POST';
        const endpoint = editingPlace ? `${url}/rest/v1/admin_places?id=eq.${editingPlace.id}` : `${url}/rest/v1/admin_places`;
        
        const res = await fetch(endpoint, {
          method,
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          addLog('handleAddPlace: Raw API Success');
          return true;
        }
        addLog(`handleAddPlace: Raw API Failed (${res.status})`);
        return false;
      } catch (e: any) {
        addLog(`handleAddPlace: Raw API Exception: ${e.message}`);
        return false;
      }
    };

    try {
      const detailed_description = formData.get('detailed_description') as string || (document.querySelector('textarea[name="detailed_description"]') as HTMLTextAreaElement)?.value;
      const milz_experience = formData.get('milz_experience') as string || (document.querySelector('textarea[name="milz_experience"]') as HTMLTextAreaElement)?.value;
      const images_raw = formData.get('images') as string || (document.querySelector('textarea[name="images"]') as HTMLTextAreaElement)?.value;
      const videos_raw = placeEditorVideosText || formData.get('videos') as string || (document.querySelector('textarea[name="videos"]') as HTMLTextAreaElement)?.value;
      const pdfs_raw = formData.get('pdfs') as string || (document.querySelector('textarea[name="pdfs"]') as HTMLTextAreaElement)?.value;

      const images = parseUrlList(images_raw);
      const videos = normalizeStoredVideoUrlList(videos_raw);
      
      let pdfs = [];
      try {
        if (pdfs_raw) {
          // Try to parse as JSON if it looks like JSON
          if (pdfs_raw.trim().startsWith('[')) {
            pdfs = JSON.parse(pdfs_raw);
          } else {
            // Otherwise assume comma separated name|url pairs
            pdfs = pdfs_raw.split(',').map(s => {
              const [name, url] = s.split('|').map(p => p.trim());
              return name && url ? { name, url } : null;
            }).filter(Boolean);
          }
        }
      } catch (e) {
        console.error('PDF parse error', e);
      }

      const upsertData: any = {
        name,
        description,
        detailed_description,
        milz_experience,
        category,
        badges: placeEditorBadges,
        area_key: activeArea.key,
        area_label: activeArea.label,
        country: activeArea.countryName,
        prefecture: activeArea.stateName,
        municipality: selectedEditorCity || null,
        address: address?.trim() || null,
        lat: newPlacePos.lat,
        lng: newPlacePos.lng,
        website_url: website_url || null,
        image_url: image_url || null,
        images,
        videos,
        pdfs,
      };

      if (!editingPlace) {
        upsertData.created_by = user.id;
      }

      addLog(`handleAddPlace: Data: ${name}`);
      
      const clientToUse = getSupabase();
      if (!clientToUse) {
        addLog('handleAddPlace: Client missing, trying raw upsert');
        const success = await tryRawUpsert(upsertData);
        if (success) {
          showToast("スポットを保存しました！(Raw API)", "success");
          closeAddModal();
          fetchPlaces();
        } else {
          showToast("保存に失敗しました。", "error");
        }
        setIsSubmitting(false);
        return;
      }

      const query = editingPlace 
        ? clientToUse.from('admin_places').update(upsertData).eq('id', editingPlace.id)
        : clientToUse.from('admin_places').insert([upsertData]);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Library upsert timed out (5s)')), 5000)
      );

      addLog('handleAddPlace: Awaiting response from Supabase library...');
      try {
        const result = await Promise.race([query, timeoutPromise]) as any;
        const { error } = result;
        
        if (!error) {
          addLog('handleAddPlace: Library Success');
          showToast("スポットを保存しました！", "success");
          closeAddModal();
          fetchPlaces();
        } else {
          addLog(`handleAddPlace: Library Error ${error.code}: ${error.message}`);
          const success = await tryRawUpsert(upsertData);
          if (success) {
            showToast("スポットを保存しました！(Raw API Fallback)", "success");
            closeAddModal();
            fetchPlaces();
          } else {
            showToast(`保存エラー: ${error.message}`, "error");
          }
        }
      } catch (err: any) {
        addLog(`handleAddPlace: Library Exception/Timeout: ${err.message}`);
        const success = await tryRawUpsert(upsertData);
        if (success) {
          showToast("スポットを保存しました！(Raw API Fallback)", "success");
          closeAddModal();
          fetchPlaces();
        } else {
          showToast(`保存エラー: ${err.message}`, "error");
        }
      }
    } catch (err: any) {
      addLog(`handleAddPlace: Global Exception: ${err.message}`);
      console.error('handleAddPlace exception:', err);
      showToast("予期せぬエラーが発生しました: " + (err.message || JSON.stringify(err)), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleFavorite = async (placeId: string) => {
    if (!user) {
      showToast(locale === 'jp' ? 'ログインが必要です。' : 'Please sign in first.', 'error');
      return;
    }

    const client = getSupabase();
    if (!client) return;

    const existing = favorites.find(f => f.place_id === placeId);
    const previousFavorites = favorites;

    try {
      if (existing) {
        setFavorites((prev) => prev.filter((item) => item.id !== existing.id));

        const { error } = await client
          .from('favorites')
          .delete()
          .eq('id', existing.id)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const optimisticId = `optimistic-${placeId}-${Date.now()}`;
        setFavorites((prev) => [
          {
            id: optimisticId,
            user_id: user.id,
            place_id: placeId,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);

        const { error } = await client
          .from('favorites')
          .insert({
            user_id: user.id,
            place_id: placeId,
          });

        if (error) throw error;
      }

      await fetchFavorites();
    } catch (error) {
      console.error('Toggle favorite error:', error);
      setFavorites(previousFavorites);
      showToast(locale === 'jp' ? 'お気に入りの保存に失敗しました。' : 'Failed to update favorites.', 'error');
    }
  };


  const fetchAiLeaderboard = React.useCallback(async (areaKey?: string, cityName?: string, fallbackItems?: AIResults['recommendations']) => {
    const targetAreaKey = areaKey || locationFilter.areaKey;
    const targetCityName = cityName || locationFilter.cityName;
    const fallbackList = fallbackItems || [];
    const fallbackMap = new Map(fallbackList.map((item) => [createAiFavoriteKey({
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      area_key: targetAreaKey,
      city_name: targetCityName || undefined,
    }), item]));
    const merged = new Map<string, AiRecommendationMetric>();

    const addRow = (row: Partial<AiRecommendationMetric> & { recommendation_name: string; lat: number; lng: number }) => {
      const key = createAiFavoriteKey({ lat: row.lat, lng: row.lng });
      const inferredAreaKey = inferAreaKeyFromCoords(row.lat, row.lng);
      const canonicalAreaKey = inferredAreaKey || row.area_key || targetAreaKey;
      const canonicalCityName = row.city_name ?? null;
      if (canonicalAreaKey !== targetAreaKey) return;
      if (targetCityName && canonicalCityName && canonicalCityName !== targetCityName) return;

      const existing = merged.get(key);
      const next: AiRecommendationMetric = {
        id: existing?.id || row.id || key,
        area_key: canonicalAreaKey,
        city_name: canonicalCityName ?? existing?.city_name ?? targetCityName ?? null,
        recommendation_name: row.recommendation_name,
        category: row.category || existing?.category || 'AI Recommendation',
        lat: row.lat,
        lng: row.lng,
        view_count: Math.max(existing?.view_count || 0, row.view_count || 0),
        favorite_count: Math.max(existing?.favorite_count || 0, row.favorite_count || 0),
        details: row.details || existing?.details || '',
      };
      merged.set(key, next);
    };

    const client = getSupabase();
    if (client) {
      try {
        let query = client
          .from('ai_recommendation_metrics')
          .select('*')
          .eq('area_key', targetAreaKey)
          .order('favorite_count', { ascending: false })
          .order('view_count', { ascending: false })
          .limit(20);

        if (targetCityName) {
          query = query.eq('city_name', targetCityName);
        }

        const { data, error } = await query;
        if (error) throw error;
        ((data || []) as AiRecommendationMetric[]).forEach(addRow);
      } catch (error) {
        console.error('Failed to fetch AI leaderboard:', error);
      }
    }

    aiFavorites.forEach((item) => {
      const fallbackMatch = fallbackMap.get(item.key);
      const inferredAreaKey = inferAreaKeyFromCoords(item.lat, item.lng);
      const canonicalAreaKey = inferredAreaKey || item.area_key || (fallbackMatch ? targetAreaKey : undefined);
      const canonicalCityName = item.city_name || (fallbackMatch ? targetCityName : undefined);
      const areaMatches = canonicalAreaKey === targetAreaKey;
      const cityMatches = targetCityName
        ? (canonicalCityName ? canonicalCityName === targetCityName : Boolean(fallbackMatch))
        : true;

      if (!areaMatches || !cityMatches) return;

      addRow({
        recommendation_name: getAiFavoriteDisplay(item, locale).name,
        category: getAiFavoriteDisplay(item, locale).category,
        lat: item.lat,
        lng: item.lng,
        details: getAiFavoriteDisplay(item, locale).details || getAiFavoriteDisplay(item, locale).reason,
        favorite_count: (merged.get(item.key)?.favorite_count || 0) + 1,
        view_count: merged.get(item.key)?.view_count || 0,
        area_key: canonicalAreaKey || targetAreaKey,
        city_name: canonicalCityName || targetCityName || null,
      });
    });

    if (!merged.size) {
      fallbackList.slice(0, 5).forEach((item, index) => {
        addRow({
          recommendation_name: item.name,
          category: item.category,
          lat: item.lat,
          lng: item.lng,
          view_count: Math.max(5 - index, 1),
          favorite_count: 0,
          details: item.details || item.reason,
          area_key: targetAreaKey,
          city_name: targetCityName || null,
        });
      });
    }

    const ranked = Array.from(merged.values())
      .sort((a, b) => (b.favorite_count - a.favorite_count) || (b.view_count - a.view_count) || a.recommendation_name.localeCompare(b.recommendation_name))
      .slice(0, 5);

    setAiLeaderboard(ranked);
  }, [aiFavorites, aiResults?.recommendations, locale, locationFilter.areaKey, locationFilter.cityName]);

  const recordAiMetric = React.useCallback(async (rec: { name: string; category: string; lat: number; lng: number; details?: string }, action: 'view' | 'favorite') => {
    const client = getSupabase();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('ai_recommendation_metrics')
        .select('*')
        .eq('area_key', locationFilter.areaKey)
        .eq('city_name', locationFilter.cityName || null)
        .eq('recommendation_name', rec.name)
        .maybeSingle();

      if (error) throw error;

      const current = data as AiRecommendationMetric | null;
      const payload: AiRecommendationMetric = {
        area_key: locationFilter.areaKey,
        city_name: locationFilter.cityName || null,
        recommendation_name: rec.name,
        category: rec.category,
        lat: rec.lat,
        lng: rec.lng,
        details: rec.details || '',
        view_count: (current?.view_count || 0) + (action === 'view' ? 1 : 0),
        favorite_count: (current?.favorite_count || 0) + (action === 'favorite' ? 1 : 0),
      };

      if (current?.id) {
        await client.from('ai_recommendation_metrics').update(payload).eq('id', current.id);
      } else {
        await client.from('ai_recommendation_metrics').insert(payload);
      }

      fetchAiLeaderboard(locationFilter.areaKey, locationFilter.cityName);
    } catch (error) {
      console.error('Failed to record AI metric:', error);
    }
  }, [fetchAiLeaderboard, locationFilter.areaKey, locationFilter.cityName]);

  const upsertAiFavorite = React.useCallback(async (item: AiFavoriteItem) => {
    if (!user?.id) return false;

    const nextLocal = mergeAiFavoriteItems([item, ...aiFavorites.filter((existing) => !areAiFavoritesEquivalent(existing, item))]);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${AI_FAVORITES_STORAGE_PREFIX}${user.id}`, JSON.stringify(nextLocal));
    }

    const client = getSupabase();
    if (!client) return true;

    try {
      const payload = mapAiFavoriteItemToRow(item, user.id);
      const { error } = await client
        .from(AI_FAVORITES_TABLE)
        .upsert(payload, { onConflict: 'user_id,canonical_key' });

      if (error) {
        console.error('Failed to persist AI favorite:', error);
        return false;
      }
    } catch (error) {
      console.error('Failed to persist AI favorite:', error);
      return false;
    }

    return true;
  }, [aiFavorites, user?.id]);

  const removeAiFavorite = React.useCallback(async (target: AiFavoriteItem) => {
    if (!user?.id) return false;

    const localMatches = aiFavorites.filter((item) => areAiFavoritesEquivalent(item, target));
    const matchedKeys = new Set(localMatches.map((item) => item.key));
    matchedKeys.add(target.key);
    const nextLocal = aiFavorites.filter((item) => !matchedKeys.has(item.key) && !areAiFavoritesEquivalent(item, target));
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${AI_FAVORITES_STORAGE_PREFIX}${user.id}`, JSON.stringify(nextLocal));
    }

    const client = getSupabase();
    if (!client) return true;

    try {
      const { data, error } = await client
        .from(AI_FAVORITES_TABLE)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to load AI favorites before removal:', error);
        return false;
      }

      const matchedIds = ((data || []) as AiFavoriteRow[])
        .filter((row) => {
          const item = mapAiFavoriteRowToItem(row);
          return item ? areAiFavoritesEquivalent(item, target) : false;
        })
        .map((row) => row.id)
        .filter(Boolean) as string[];

      if (!matchedIds.length) return true;

      const { error: deleteError } = await client
        .from(AI_FAVORITES_TABLE)
        .delete()
        .in('id', matchedIds);

      if (deleteError) {
        console.error('Failed to remove AI favorite:', deleteError);
        return false;
      }
    } catch (error) {
      console.error('Failed to remove AI favorite:', error);
      return false;
    }

    return true;
  }, [aiFavorites, user?.id]);

  const handleSaveAiRecommendation = async (rec: { name: string; reason: string; details?: string; category: string; lat: number; lng: number }) => {
    if (!user) {
      showToast(locale === 'jp' ? 'ログインが必要です。' : 'Please sign in first.', 'error');
      return;
    }

    const normalized = normalizeMapCoords(rec.lat, rec.lng);
    if (!normalized) {
      showToast(locale === 'jp' ? '座標を読み取れませんでした。' : 'The map coordinates could not be read.', 'error');
      return;
    }

    const normalizedRec = {
      ...rec,
      lat: normalized.lat,
      lng: normalized.lng,
      area_key: locationFilter.areaKey,
      city_name: locationFilter.cityName || undefined,
    };
    const canonicalKey = createAiFavoriteKey({
      name: normalizedRec.name,
      lat: normalizedRec.lat,
      lng: normalizedRec.lng,
      area_key: locationFilter.areaKey,
      city_name: locationFilter.cityName || undefined,
    });
    const existingMatch = findMatchingAiFavoriteItem(aiFavorites, normalizedRec);
    const equivalentMatches = aiFavorites.filter((item) => areAiFavoritesEquivalent(item, normalizedRec));
    const exists = Boolean(existingMatch);
    const favoriteItem: AiFavoriteItem = {
      key: existingMatch?.key || canonicalKey,
      name: normalizedRec.name,
      reason: normalizedRec.reason,
      category: normalizedRec.category,
      details: normalizedRec.details || normalizedRec.reason,
      lat: normalizedRec.lat,
      lng: normalizedRec.lng,
      created_at: existingMatch?.created_at || new Date().toISOString(),
      area_key: existingMatch?.area_key || locationFilter.areaKey,
      city_name: existingMatch?.city_name || locationFilter.cityName || undefined,
      translations: {
        ...(existingMatch?.translations || equivalentMatches[0]?.translations || {}),
        [locale]: {
          name: normalizedRec.name,
          reason: normalizedRec.reason,
          details: normalizedRec.details || normalizedRec.reason,
          category: normalizedRec.category,
        },
      },
    };

    const previous = aiFavorites;
    const filteredBase = aiFavorites.filter((item) => !areAiFavoritesEquivalent(item, normalizedRec));
    const next = exists
      ? filteredBase
      : mergeAiFavoriteItems([favoriteItem, ...filteredBase]);
    setAiFavorites(next);

    const persisted = exists
      ? await removeAiFavorite(existingMatch!)
      : await upsertAiFavorite(favoriteItem);

    if (!persisted) {
      setAiFavorites(previous);
      if (typeof window !== 'undefined' && user?.id) {
        window.localStorage.setItem(`${AI_FAVORITES_STORAGE_PREFIX}${user.id}`, JSON.stringify(previous));
      }
      showToast(locale === 'jp' ? 'AIお気に入りの保存に失敗しました。' : 'Failed to save the AI favorite.', 'error');
      return;
    }

    if (!exists) {
      recordAiMetric(normalizedRec, 'favorite');
    }

    showToast(
      exists
        ? (locale === 'jp' ? 'AIおすすめを保存一覧から外しました。' : 'Removed from AI favorites.')
        : (locale === 'jp' ? 'AIおすすめを保存しました。' : 'Saved to AI favorites.'),
      'success'
    );
  };


  const isAiRecommendationSaved = React.useCallback((rec?: { name?: string; lat: number; lng: number; category?: string } | null) => {
    if (!rec) return false;
    return Boolean(findMatchingAiFavoriteItem(aiFavorites, {
      name: rec.name,
      lat: rec.lat,
      lng: rec.lng,
      area_key: locationFilter.areaKey,
      city_name: locationFilter.cityName || undefined,
      category: rec.category,
    }));
  }, [aiFavorites, locationFilter.areaKey, locationFilter.cityName]);

  const focusMapOnCoords = (coords: { lat: number; lng: number }) => {
    setPendingMapFocus(coords);
    openPlaceDetail(null);
    setActiveTab('map');
  };

  const handleAiViewOnMap = (rec: { name: string; lat: number; lng: number; category?: string; details?: string }) => {
    const normalized = normalizeMapCoords(rec.lat, rec.lng);
    if (!normalized) {
      showToast(locale === 'jp' ? '地図へ移動できる座標が見つかりませんでした。' : 'No valid coordinates were found for this recommendation.', 'error');
      return;
    }

    const target = { lat: normalized.lat, lng: normalized.lng };
    recordAiMetric({ name: rec.name, category: rec.category || 'AI Recommendation', lat: normalized.lat, lng: normalized.lng, details: rec.details }, 'view');
    const isSaved = Boolean(findMatchingAiFavoriteItem(aiFavorites, {
      name: rec.name,
      lat: target.lat,
      lng: target.lng,
      area_key: locationFilter.areaKey,
      city_name: locationFilter.cityName || undefined,
      category: rec.category,
    }));
    setTempAiPin(isSaved ? null : { ...target, name: rec.name });
    focusMapOnCoords(target);
  };

  const handlePlaceViewOnMap = (rec: { lat: number; lng: number }) => {
    const normalized = normalizeMapCoords(rec.lat, rec.lng);
    if (!normalized) {
      showToast(locale === 'jp' ? '地図へ移動できる座標が見つかりませんでした。' : 'No valid coordinates were found for this spot.', 'error');
      return;
    }

    setTempAiPin(null);
    focusMapOnCoords({ lat: normalized.lat, lng: normalized.lng });
  };
  const translateAiResults = React.useCallback(async ({ sourceResults, targetLocale, locationStr, ai }: { sourceResults: AIResults; targetLocale: Locale; locationStr: string; ai: GoogleGenAI }) => {
    const translationPrompt = `You are the MILZ bilingual editor. Convert the following MILZ AI recommendation pool for ${locationStr} into ${targetLocale === 'jp' ? 'natural Japanese' : 'natural English'}. Preserve the exact same 30 spots, the same order, the same category labels, and the same coordinates. Only rewrite the textual fields for the target language. Use established English place names when they exist. Return ONLY valid JSON matching the schema. Data: ${JSON.stringify(sourceResults)}`;

    const translationSchema = {
      type: Type.OBJECT,
      properties: {
        meta: {
          type: Type.OBJECT,
          properties: {
            version: { type: Type.NUMBER },
            source: { type: Type.STRING }
          },
          required: ['version', 'source']
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reason: { type: Type.STRING },
              details: { type: Type.STRING },
              editorial_note: { type: Type.STRING },
              best_time: { type: Type.STRING },
              fit_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              category: { type: Type.STRING },
              indoor_outdoor: { type: Type.STRING },
              weather_fit: { type: Type.STRING },
              social_fit: { type: Type.STRING },
              energy: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ['name', 'reason', 'details', 'editorial_note', 'best_time', 'fit_tags', 'pros', 'cons', 'category', 'indoor_outdoor', 'weather_fit', 'social_fit', 'energy', 'lat', 'lng']
          }
        }
      },
      required: ['meta', 'recommendations']
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: translationPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: translationSchema,
      }
    });

    const parsed = JSON.parse(response.text);
    const normalizedResults: AIResults = {
      meta: {
        version: AI_CACHE_SCHEMA_VERSION,
        source: `gemini-translate-${targetLocale}`
      },
      recommendations: (parsed?.recommendations || [])
        .slice(0, AI_RECOMMENDATION_POOL_SIZE)
        .map((item: any) => ({
          name: String(item?.name || '').trim(),
          reason: String(item?.reason || '').trim(),
          details: String(item?.details || '').trim(),
          editorial_note: String(item?.editorial_note || '').trim(),
          best_time: String(item?.best_time || '').trim(),
          fit_tags: Array.isArray(item?.fit_tags) ? item.fit_tags.map((tag: any) => String(tag).trim()).filter(Boolean).slice(0, 3) : [],
          pros: Array.isArray(item?.pros) ? item.pros.map((line: any) => String(line).trim()).filter(Boolean).slice(0, 3) : [],
          cons: Array.isArray(item?.cons) ? item.cons.map((line: any) => String(line).trim()).filter(Boolean).slice(0, 2) : [],
          category: String(item?.category || '').trim(),
          indoor_outdoor: ['indoor', 'outdoor', 'mixed'].includes(String(item?.indoor_outdoor || '')) ? item.indoor_outdoor : 'mixed',
          weather_fit: ['rain_ok', 'clear_best', 'all_weather'].includes(String(item?.weather_fit || '')) ? item.weather_fit : 'all_weather',
          social_fit: ['solo', 'friends', 'family', 'mixed'].includes(String(item?.social_fit || '')) ? item.social_fit : 'mixed',
          energy: ['quiet', 'balanced', 'lively'].includes(String(item?.energy || '')) ? item.energy : 'balanced',
          lat: Number(item?.lat),
          lng: Number(item?.lng),
        }))
        .filter((item: any) => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lng)),
    };

    return normalizedResults;
  }, []);

  const handleSearchLocation = async () => {
    const area = findAreaOption(locationFilter.areaKey);
    const selectedCity = area.cities.find((city) => city.name === locationFilter.cityName);
    const targetCenter = selectedCity?.center || area.center;
    const targetZoom = selectedCity?.zoom || area.zoom || 12;

    mapRef.current?.flyTo(targetCenter, targetZoom);
    setIsFiltering(false);
  };

  const handleAiRecommend = async () => {
    setAiLoading(true);
    
    try {
      const client = getSupabase();
      const { areaKey, areaName, countryName, stateName, cityName } = locationFilter as any;
      const locationStr = [areaName || stateName || countryName, cityName].filter(Boolean).join(' / ') || 'Tokyo / Shibuya';
      const type = 'recommend';
      const category = 'all';
      const locationCacheKey = `${areaKey || 'tokyo'}::${cityName || 'all'}::${locale}`;
      const alternateLocale: Locale = locale === 'jp' ? 'en' : 'jp';
      const alternateCacheKey = `${areaKey || 'tokyo'}::${cityName || 'all'}::${alternateLocale}`;
      const cacheLimit = 336;
      const isUsableAiCache = (cacheData: any, targetLocale: Locale) => {
        const updatedAt = new Date(cacheData.updated_at).getTime();
        const now = new Date().getTime();
        const diffHours = (now - updatedAt) / (1000 * 60 * 60);
        const cachedRecommendations = Array.isArray(cacheData.data?.recommendations) ? cacheData.data.recommendations : [];
        const cacheVersion = Number(cacheData.data?.meta?.version || 0);
        const hasRichEditorial = cachedRecommendations.length >= AI_RECOMMENDATION_POOL_SIZE && cachedRecommendations.every((item: any) => item?.details && item?.editorial_note && Array.isArray(item?.pros) && item.pros.length >= 2);
        const hasLocaleShape = hasMostlyTargetLocale(cacheData.data, targetLocale);
        return diffHours < cacheLimit && cacheVersion >= AI_CACHE_SCHEMA_VERSION && hasRichEditorial && hasLocaleShape;
      };

      // 1. キャッシュの確認
      let alternateValidCache: any = null;
      if (client) {
        const { data: cacheData, error: cacheError } = await client
          .from('ai_cache')
          .select('*')
          .eq('type', type)
          .eq('location_key', locationCacheKey)
          .eq('category', category)
          .maybeSingle();

        if (!cacheError && cacheData && isUsableAiCache(cacheData, locale)) {
          console.log(`Using cached ${type} for ${locationStr} (${locale})`);
          setAiResults(cacheData.data);
          setAiResultsLocale(locale);
          setAiResultsLocationKey(`${areaKey || locationFilter.areaKey}::${cityName || locationFilter.cityName || 'all'}`);
          fetchAiLeaderboard(areaKey || locationFilter.areaKey, cityName || locationFilter.cityName, cacheData.data?.recommendations || []);
          setAiLoading(false);
          return;
        }

        const { data: altData, error: altError } = await client
          .from('ai_cache')
          .select('*')
          .eq('type', type)
          .eq('location_key', alternateCacheKey)
          .eq('category', category)
          .maybeSingle();

        if (!altError && altData && isUsableAiCache(altData, alternateLocale)) {
          alternateValidCache = altData;
        }
      }

      // 2. キャッシュがない、または期限切れの場合はAIを呼び出す
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast("Gemini APIキーが設定されていません。", "error");
        return;
      }
      const ai = new GoogleGenAI({ apiKey });

      if (alternateValidCache?.data) {
        const translatedResults = await translateAiResults({
          sourceResults: alternateValidCache.data as AIResults,
          targetLocale: locale,
          locationStr,
          ai,
        });

        setAiResults(translatedResults);
        setAiResultsLocale(locale);
        setAiResultsLocationKey(`${areaKey || locationFilter.areaKey}::${cityName || locationFilter.cityName || 'all'}`);
        fetchAiLeaderboard(areaKey || locationFilter.areaKey, cityName || locationFilter.cityName, translatedResults.recommendations || []);

        if (client) {
          await client
            .from('ai_cache')
            .upsert({
              type,
              location_key: locationCacheKey,
              category,
              data: translatedResults,
              updated_at: new Date().toISOString()
            }, { onConflict: 'type,location_key,category' });
        }

        setAiLoading(false);
        return;
      }

      const outputLanguageInstruction = locale === 'jp'
        ? 'Write every text field in natural Japanese. Use commonly used local place names. Avoid generic wording such as 雰囲気が良い, 人気, おしゃれ by themselves. Be concrete about what the place feels like, when it works, and who it suits.'
        : 'Write every text field in natural English. Use commonly used local place names. Avoid vague copy like stylish or popular on its own. Be concrete about what the place feels like, when it works, and who it suits.';

      const cityHint = cityName ? `The city focus is "${cityName}".` : 'The city focus is broad within the selected area.';
      let prompt = `You are the MILZ city editor. Based on the location "${locationStr}", recommend exactly ${AI_RECOMMENDATION_POOL_SIZE} real spots in this area. ${cityHint} Build a diverse editorial pool that MILZ can later re-edit into different 10-pick sets for Family, Friends, Solo time, Nature, Rainy day, and Entertainment. Do NOT over-concentrate in one category. Keep the 30 spots intentionally mixed across at least cafes, restaurants, shopping, entertainment/culture, and park-nature-spiritual options. No single category should dominate the list. Avoid near-duplicates unless they are clearly different experiences. Use these category labels only: カフェ, レストラン, ショッピング, エンターテイメント, 公園・自然, 神社・寺院, その他. ${outputLanguageInstruction}

For each recommendation, return:
- name: real place name
- category: one of the fixed labels above
- reason: 30-70 characters in Japanese / 18-40 words in English. One sharp line only.
- details: a rich editorial explanation, around 110-180 Japanese characters / 70-120 words in English. This must be concrete, not generic. Mention atmosphere, how to use the place, what kind of visit it fits, and what makes it different from other spots nearby.
- editorial_note: 50-100 Japanese characters / 30-60 words in English. Explain specifically why MILZ would move this spot up for certain moods or situations.
- best_time: a concrete timing suggestion such as 雨の日の午後, 夕方〜夜, 朝の早い時間, etc.
- fit_tags: 2 or 3 short tags
- pros: exactly 3 short concrete strengths
- cons: exactly 2 short realistic tradeoffs
- indoor_outdoor: one of indoor, outdoor, mixed
- weather_fit: one of rain_ok, clear_best, all_weather
- social_fit: one of solo, friends, family, mixed
- energy: one of quiet, balanced, lively
- lat, lng: valid coordinates for the exact spot

Return ONLY valid JSON matching the schema.`;

      let responseSchema = {
        type: Type.OBJECT,
        properties: {
          meta: {
            type: Type.OBJECT,
            properties: {
              version: { type: Type.NUMBER },
              source: { type: Type.STRING }
            },
            required: ['version', 'source']
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
                details: { type: Type.STRING },
                editorial_note: { type: Type.STRING },
                best_time: { type: Type.STRING },
                fit_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                category: { type: Type.STRING },
                indoor_outdoor: { type: Type.STRING },
                weather_fit: { type: Type.STRING },
                social_fit: { type: Type.STRING },
                energy: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER }
              },
              required: ['name', 'reason', 'details', 'editorial_note', 'best_time', 'fit_tags', 'pros', 'cons', 'category', 'indoor_outdoor', 'weather_fit', 'social_fit', 'energy', 'lat', 'lng']
            }
          }
        },
        required: ['meta', 'recommendations']
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          tools: [{ googleSearch: {} }]
        }
      });

      const parsed = JSON.parse(response.text);
      const normalizedResults: AIResults = {
        meta: {
          version: AI_CACHE_SCHEMA_VERSION,
          source: 'gemini',
        },
        recommendations: (parsed?.recommendations || [])
          .slice(0, AI_RECOMMENDATION_POOL_SIZE)
          .map((item: any) => ({
            name: String(item?.name || '').trim(),
            reason: String(item?.reason || '').trim(),
            details: String(item?.details || '').trim(),
            editorial_note: String(item?.editorial_note || '').trim(),
            best_time: String(item?.best_time || '').trim(),
            fit_tags: Array.isArray(item?.fit_tags) ? item.fit_tags.map((tag: any) => String(tag).trim()).filter(Boolean).slice(0, 3) : [],
            pros: Array.isArray(item?.pros) ? item.pros.map((line: any) => String(line).trim()).filter(Boolean).slice(0, 3) : [],
            cons: Array.isArray(item?.cons) ? item.cons.map((line: any) => String(line).trim()).filter(Boolean).slice(0, 2) : [],
            category: String(item?.category || '').trim(),
            indoor_outdoor: ['indoor', 'outdoor', 'mixed'].includes(String(item?.indoor_outdoor || '')) ? item.indoor_outdoor : 'mixed',
            weather_fit: ['rain_ok', 'clear_best', 'all_weather'].includes(String(item?.weather_fit || '')) ? item.weather_fit : 'all_weather',
            social_fit: ['solo', 'friends', 'family', 'mixed'].includes(String(item?.social_fit || '')) ? item.social_fit : 'mixed',
            energy: ['quiet', 'balanced', 'lively'].includes(String(item?.energy || '')) ? item.energy : 'balanced',
            lat: Number(item?.lat),
            lng: Number(item?.lng),
          }))
          .filter((item: any) => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lng)),
      };

      setAiResults(normalizedResults);
      setAiResultsLocale(locale);
      setAiResultsLocationKey(`${areaKey || locationFilter.areaKey}::${cityName || locationFilter.cityName || 'all'}`);
      fetchAiLeaderboard(areaKey || locationFilter.areaKey, cityName || locationFilter.cityName, normalizedResults.recommendations || []);

      // 3. 結果をキャッシュに保存（upsert）
      if (client) {
        await client
          .from('ai_cache')
          .upsert({
            type,
            location_key: locationCacheKey,
            category,
            data: normalizedResults,
            updated_at: new Date().toISOString()
          }, { onConflict: 'type,location_key,category' });
      }

    } catch (error) {
      console.error('AI error:', error);
      showToast(locale === "jp" ? "AI生成中にエラーが発生しました。" : "An error occurred while generating AI recommendations.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'ai') return;
    const currentAiLocationKey = `${locationFilter.areaKey}::${locationFilter.cityName || 'all'}`;
    const leaderboardFallback = aiResultsLocationKey === currentAiLocationKey ? (aiResults?.recommendations || []) : [];
    fetchAiLeaderboard(locationFilter.areaKey, locationFilter.cityName, leaderboardFallback);
    if (!aiResults || !aiResultsLocale || aiResultsLocale === locale || aiLoading) return;
    handleAiRecommend();
  }, [activeTab, locale, locationFilter.areaKey, locationFilter.cityName, aiResults, aiResultsLocale, aiResultsLocationKey, aiLoading, fetchAiLeaderboard]);

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const haystack = [p.name, p.description, p.address, p.municipality, p.area_label].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      const placeAreaKey = resolvePlaceAreaKey(p);
      const placeCity = resolvePlaceCityName(p, placeAreaKey);
      const matchesArea = !locationFilter.areaKey || placeAreaKey === locationFilter.areaKey;
      const matchesCity = !locationFilter.cityName || !placeCity || placeCity === locationFilter.cityName || (p.address || '').toLowerCase().includes(locationFilter.cityName.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesBadge = selectedBadge === 'all' || (p.badges || []).includes(selectedBadge);
      const isInBounds = (activeTab === 'list' && listFilter === 'all' && isMapBoundsFilterEnabled && mapBounds)
        ? mapBounds.contains([p.lat, p.lng])
        : true;
      return matchesSearch && matchesArea && matchesCity && matchesCategory && matchesBadge && isInBounds;
    });
  }, [places, searchQuery, selectedCategory, selectedBadge, activeTab, listFilter, isMapBoundsFilterEnabled, mapBounds, locationFilter.areaKey, locationFilter.cityName]);

  const favoritePlaces = useMemo(() => {
    return places.filter(p => favorites.some(f => f.place_id === p.id));
  }, [places, favorites]);

  const visibleListPlaces = useMemo(() => {
    if (!(activeTab === 'list' && listFilter === 'all')) return filteredPlaces;
    return places.filter((p) => {
      const haystack = [p.name, p.description, p.address, p.municipality, p.area_label].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      const isInBounds = (isMapBoundsFilterEnabled && mapBounds)
        ? mapBounds.contains([p.lat, p.lng])
        : true;
      return matchesSearch && isInBounds;
    });
  }, [activeTab, listFilter, filteredPlaces, places, searchQuery, isMapBoundsFilterEnabled, mapBounds]);

  const aiFavoritePlaces = useMemo(() => {
    return aiFavorites.filter((item) => {
      const localized = getAiFavoriteDisplay(item, locale);
      const alternate = getAiFavoriteDisplay(item, locale === 'jp' ? 'en' : 'jp');
      const haystack = [
        localized.name,
        localized.reason,
        localized.details,
        localized.category,
        alternate.name,
        alternate.reason,
        alternate.details,
        alternate.category,
      ].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || localized.category === selectedCategory || alternate.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [aiFavorites, searchQuery, selectedCategory, locale]);

  const aiRecommendationVisuals = useMemo(() => {
    const visuals = new Map<string, AiRecommendationVisual>();
    const recommendations = aiResults?.recommendations || [];
    const fallbackAreaKey = locationFilter.areaKey || inferAreaKeyFromCoords(recommendations[0]?.lat, recommendations[0]?.lng) || 'tokyo';

    recommendations.forEach((rec, index) => {
      const recName = normalizeNameForMatch(rec.name);
      const areaKey = locationFilter.areaKey || inferAreaKeyFromCoords(rec.lat, rec.lng) || fallbackAreaKey;
      const area = findAreaOption(areaKey);
      const cityName = locationFilter.cityName || '';
      const matchingPlace = places.find((place) => {
        const placeAreaKey = resolvePlaceAreaKey(place);
        if (placeAreaKey !== areaKey) return false;
        const placeCityName = resolvePlaceCityName(place, placeAreaKey);
        if (cityName && placeCityName && placeCityName !== cityName) return false;
        const placeName = normalizeNameForMatch(place.name);
        if (!placeName || !recName) return false;
        return placeName === recName;
      });

      if (matchingPlace && (matchingPlace.image_url || matchingPlace.images?.[0])) {
        visuals.set(createAiRecommendationVisualKey(rec, index), {
          imageUrl: matchingPlace.image_url || matchingPlace.images?.[0] || '',
          source: 'place',
        });
        return;
      }

      visuals.set(createAiRecommendationVisualKey(rec, index), {
        imageUrl: buildAiLocationCardImage({
          rec,
          areaLabel: area.label,
          cityLabel: cityName || resolvePlaceCityName(matchingPlace || {}, areaKey),
        }),
        source: 'location-card',
      });
    });

    return visuals;
  }, [aiResults?.recommendations, places, locationFilter.areaKey, locationFilter.cityName]);

  const getAiDisplayKey = React.useCallback((rec: Pick<AiRecommendationItem, 'name' | 'lat' | 'lng'>) => createAiFavoriteKey({
    name: rec.name,
    lat: rec.lat,
    lng: rec.lng,
    area_key: locationFilter.areaKey,
    city_name: locationFilter.cityName || undefined,
  }), [locationFilter.areaKey, locationFilter.cityName]);

  const aiUserProfile = useMemo(() => deriveAiUserProfile(places, favorites, aiFavorites), [places, favorites, aiFavorites]);

  const aiScoredRecommendations = useMemo(() => {
    const pool = aiResults?.recommendations || [];
    const scored = pool
      .map((rec, index) => {
        const score = scoreAiRecommendation({
          rec,
          mode: aiEditMode,
          profile: aiUserProfile,
          areaKey: locationFilter.areaKey,
          cityName: locationFilter.cityName || undefined,
          index,
        });
        return {
          rec,
          index,
          score,
          key: getAiDisplayKey(rec),
          editorial: {
            why: deriveAiWhyFits({ rec, mode: aiEditMode, profile: aiUserProfile, locale }),
            bestTime: deriveAiBestTime(rec, aiEditMode, locale),
            vibe: deriveAiVibe(rec, locale),
          } as AiRecommendationEditorialMeta,
        };
      })
      .sort((a, b) => b.score - a.score || a.index - b.index);

    return selectAiEditorialRecommendations(scored, aiEditMode);
  }, [aiResults?.recommendations, aiEditMode, aiUserProfile, locationFilter.areaKey, locationFilter.cityName, locale, getAiDisplayKey]);

  const aiRecommendationPageCount = Math.max(1, Math.ceil(aiScoredRecommendations.length / AI_RECOMMENDATION_VISIBLE_COUNT));

  useEffect(() => {
    setAiEditPage(0);
    setAiCompareKeys([]);
  }, [aiEditMode, aiResultsLocationKey, locale]);

  const aiDisplayedRecommendations = useMemo(() => {
    const start = aiEditPage * AI_RECOMMENDATION_VISIBLE_COUNT;
    return aiScoredRecommendations.slice(start, start + AI_RECOMMENDATION_VISIBLE_COUNT);
  }, [aiScoredRecommendations, aiEditPage]);

  const aiComparedRecommendations = useMemo(() => aiScoredRecommendations.filter((item) => aiCompareKeys.includes(item.key)).slice(0, 2), [aiScoredRecommendations, aiCompareKeys]);

  const aiCompareSummary = useMemo(() => {
    if (aiComparedRecommendations.length !== 2) return null;
    return buildAiCompareSummary({
      left: aiComparedRecommendations[0].rec,
      right: aiComparedRecommendations[1].rec,
      locale,
    });
  }, [aiComparedRecommendations, locale]);

  const activeAiEditOption = useMemo(() => AI_EDIT_OPTIONS.find((option) => option.key === aiEditMode) || AI_EDIT_OPTIONS[0], [aiEditMode]);

  const toggleAiCompareSelection = React.useCallback((rec: AiRecommendationItem) => {
    const key = getAiDisplayKey(rec);
    setAiCompareKeys((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      if (prev.length >= 2) return [prev[1], key];
      return [...prev, key];
    });
  }, [getAiDisplayKey]);

  const selectedAiRecommendationVisual = useMemo(() => {
    if (!selectedAiRecommendation) return null;
    const recommendations = aiResults?.recommendations || [];
    const index = recommendations.findIndex((rec) => rec.name === selectedAiRecommendation.name && Number(rec.lat) === Number(selectedAiRecommendation.lat) && Number(rec.lng) === Number(selectedAiRecommendation.lng));
    const visualKey = createAiRecommendationVisualKey(selectedAiRecommendation, index >= 0 ? index : 0);
    return aiRecommendationVisuals.get(visualKey) || null;
  }, [selectedAiRecommendation, aiResults?.recommendations, aiRecommendationVisuals]);

  const shortsFeed = useMemo<ShortFeedItem[]>(() => {
    const items: ShortFeedItem[] = [];
    places.forEach((place) => {
      preferPlayableVideoUrls(place.videos || []).forEach((url, index) => {
        const embedUrl = getYouTubeEmbedUrl(url);
        const directVideo = isLikelyVideoUrl(url) && !embedUrl;
        if (!embedUrl && !directVideo) return;
        items.push({
          id: `${place.id}::${index}`,
          placeId: place.id,
          placeName: place.name,
          category: place.category,
          description: place.description || place.detailed_description || '',
          lat: place.lat,
          lng: place.lng,
          url,
          playbackType: directVideo ? 'direct' : 'youtube',
          embedUrl: embedUrl || undefined,
          imageUrl: place.image_url,
          address: place.address || [place.municipality, place.prefecture, place.country].filter(Boolean).join(', '),
          hours: place.hours,
          websiteUrl: place.website_url,
        });
      });
    });

    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor((Math.sin(i * 97.13 + shuffled.length) * 10000 % 1 + 1) % 1 * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [places]);

  if (isConfigMissing) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-12 shadow-2xl space-y-10 text-center border border-stone-200">
          <div className="w-24 h-24 bg-stone-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-black" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-black tracking-tighter uppercase">Configuration Required</h1>
            <p className="text-stone-500 font-medium leading-relaxed">
              Supabaseの接続設定が見つからないか、プレースホルダー（YOUR_SUPABASE_URLなど）のままになっています。AI Studioの左側にある「Settings」メニューから、正しい環境変数を設定してください。
            </p>
          </div>
          <div className="p-8 bg-stone-50 text-left space-y-4 border border-stone-200">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">必要な環境変数:</p>
            <div className="space-y-2 md:space-y-3 text-center xl:text-left">
              <code className="block text-xs font-mono text-stone-600 bg-white p-4 border border-stone-100">VITE_SUPABASE_URL</code>
              <code className="block text-xs font-mono text-stone-600 bg-white p-4 border border-stone-100">VITE_SUPABASE_ANON_KEY</code>
            </div>
          </div>
          <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">
            設定後、アプリが自動的に再読み込みされます。
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-emerald-600" />
        </motion.div>
      </div>
    );
  }

  // Login / Landing Screen
  if (!user) {
    return (
      <MilzLanding
        authOpen={landingAuthOpen}
        setAuthOpen={setLandingAuthOpen}
        authMode={authMode}
        setAuthMode={setAuthMode}
        selectedAuthRole={selectedAuthRole}
        setSelectedAuthRole={setSelectedAuthRole}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authError={authError}
        authEmailSent={authEmailSent}
        clearAuthEmailSent={() => setAuthEmailSent(false)}
        handleEmailAuth={handleEmailAuth}
      />
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white font-sans text-stone-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl z-[1001] border-b border-stone-100 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-5 md:px-6 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <h1 className="text-[2rem] md:text-3xl font-black tracking-tighter text-black uppercase leading-none">milz</h1>
              {role === 'admin' && (
                <div className="px-2 py-0.5 bg-stone-100 text-[7px] font-bold text-stone-500 flex items-center gap-1 uppercase tracking-[0.2em] rounded-full border border-stone-200">
                  <ShieldCheck className="w-2 h-2" />
                  Admin
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <div className="relative">
                <button 
                  onClick={() => setShowMapStyleMenu((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-full border border-stone-200 bg-stone-50 text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] md:tracking-[0.2em] text-stone-600 hover:text-black hover:bg-white transition-all"
                >
                  <Layers3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Map Style</span><span className="sm:hidden">Style</span>
                </button>
                <AnimatePresence>
                  {showMapStyleMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-stone-200 bg-white/95 backdrop-blur-xl shadow-2xl p-2"
                    >
                      {mapStyleOptions.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => {
                            setMapStyle(option.key);
                            setShowMapStyleMenu(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                            mapStyle === option.key ? "bg-black text-white" : "text-stone-500 hover:bg-stone-50 hover:text-black"
                          )}
                        >
                          <span>{option.label}</span>
                          {mapStyle === option.key && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                      <div className="mt-2 rounded-xl bg-stone-50 px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">
                        Current selection is saved as default.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex items-center rounded-full border border-stone-200 bg-stone-50 p-1 shadow-sm">
                <button
                  onClick={() => setLocale('jp')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    locale === 'jp' ? "bg-black text-white" : "text-stone-400 hover:text-black"
                  )}
                >
                  JP
                </button>
                <button
                  onClick={() => setLocale('en')}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                    locale === 'en' ? "bg-black text-white" : "text-stone-400 hover:text-black"
                  )}
                >
                  EN
                </button>
              </div>
              <div className="hidden sm:block h-4 w-px bg-stone-100" />
              <div className="relative">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className="w-9 h-9 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center hover:bg-stone-100 transition-all active:scale-95 overflow-hidden"
                >
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-stone-400" />
                  )}
                </button>
                {role === 'admin' && (
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-black rounded-full border border-white flex items-center justify-center">
                    <ShieldCheck className="w-1.5 h-1.5 text-white" />
                  </div>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 md:p-2.5 hover:bg-stone-50 rounded-full transition-all"
              >
                <LogOut className="w-4 h-4 text-stone-300 hover:text-stone-600 transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full relative"
            >
              {/* Map Controls */}
              <div className="absolute top-3 left-3 right-3 md:top-6 md:left-6 md:right-6 z-[1000] flex flex-col gap-3 md:gap-4 max-w-2xl mx-auto">
                <div className="flex gap-2">
                  <div className="flex-1 glass rounded-2xl shadow-xl flex items-center px-4 py-3 md:px-6 md:py-4">
                    <Search className="w-4 h-4 text-stone-400 mr-4" />
                    <input
                      type="text"
                      placeholder="Search spots..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm font-medium w-full placeholder:text-stone-300"
                    />
                  </div>
                  <button
                    onClick={() => setIsFiltering(!isFiltering)}
                    title="Filter & Settings"
                    className={cn(
                      "p-4 shadow-xl rounded-2xl glass transition-all active:scale-95",
                      isFiltering 
                        ? "bg-black text-white border-black" 
                        : "text-stone-400 hover:text-black"
                    )}
                  >
                    {isFiltering 
                      ? <X className="w-4 h-4" /> 
                      : (
                        <div className="relative">
                          <SlidersHorizontal className="w-4 h-4" />
                          {(locationFilter.areaKey !== 'tokyo' || locationFilter.cityName !== 'Shibuya' || selectedCategory !== 'all' || selectedBadge !== 'all') && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black rounded-full border-2 border-white" />
                          )}
                        </div>
                      )
                    }
                  </button>
                </div>

                <AnimatePresence>
                  {isFiltering && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white/90 backdrop-blur-md shadow-2xl border border-stone-200 p-5 md:p-8 space-y-6 md:space-y-8 rounded-[2rem] md:rounded-[2.5rem] max-h-[calc(100svh-10rem)] overflow-y-auto"
                    >
                      <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                          <SlidersHorizontal className="w-4 h-4 text-black" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Filter & Settings</span>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Area</p>
                          <div className="flex flex-wrap gap-2">
                            {areaOptions.map((area) => (
                              <button
                                key={area.key}
                                onClick={() => setLocationFilter(createLocationFilterFromArea(area.key, area.cities[0]?.name))}
                                className={cn(
                                  "px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] whitespace-nowrap transition-all rounded-full border",
                                  locationFilter.areaKey === area.key
                                    ? "bg-black text-white border-black"
                                    : "text-stone-400 border-stone-100 hover:border-stone-200"
                                )}
                              >
                                {area.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">City / Ward</p>
                          <select
                            value={locationFilter.cityName}
                            onChange={(e) => setLocationFilter((prev) => ({ ...prev, cityCode: e.target.value, cityName: e.target.value }))}
                            className="w-full px-4 py-4 bg-stone-50 border border-stone-200 text-sm focus:outline-none appearance-none font-medium"
                          >
                            {areaCityOptions.map((city) => (
                              <option key={city.name} value={city.name}>{city.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Categories</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setSelectedCategory('all')}
                              className={cn(
                                "px-6 py-3 text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all rounded-full border",
                                selectedCategory === 'all' ? "bg-black text-white border-black" : "text-stone-400 border-stone-100 hover:border-stone-200"
                              )}
                            >
                              All
                            </button>
                            {categoryOptions.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={cn(
                                  "px-6 py-3 text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap transition-all rounded-full border",
                                  selectedCategory === cat ? "bg-black text-white border-black" : "text-stone-400 border-stone-100 hover:border-stone-200"
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Badges</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setSelectedBadge('all')}
                              className={cn(
                                "px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap transition-all rounded-full border",
                                selectedBadge === 'all' ? "bg-black text-white border-black" : "text-stone-400 border-stone-100 hover:border-stone-200"
                              )}
                            >
                              All
                            </button>
                            {badgeOptions.map((badge) => (
                              <button
                                key={badge}
                                onClick={() => setSelectedBadge(badge)}
                                className={cn(
                                  "px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap transition-all rounded-full border",
                                  selectedBadge === badge ? "bg-black text-white border-black" : "text-stone-400 border-stone-100 hover:border-stone-200"
                                )}
                              >
                                {badge}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            onClick={() => {
                              setLocationFilter(createLocationFilterFromArea('tokyo', 'Shibuya'));
                              setSelectedCategory('all');
                              setSelectedBadge('all');
                              setIsFiltering(false);
                            }}
                            className="w-full py-3 text-[10px] font-black text-stone-400 hover:text-stone-900 transition-colors"
                          >
                            CLEAR ALL FILTERS
                          </button>
                          <button
                            onClick={handleSearchLocation}
                            disabled={loading}
                            className="w-full py-5 bg-black text-white font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            GO TO LOCATION
                          </button>
                        </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

              {activeIllustrationTheme ? (
                <TokyoMiniatureMap
                  apiKey={import.meta.env.VITE_MAPTILER_KEY}
                  styleVariant={mapStyle as any}
                  places={filteredPlaces}
                  tempAiPin={tempAiPin}
                  aiFavoritePins={aiFavorites.map((item) => ({ key: item.key, lat: item.lat, lng: item.lng, name: getAiFavoriteDisplay(item, locale).name }))}
                  newPlacePos={newPlacePos}
                  role={role}
                  activeTab={activeTab}
                  isAdding={isAdding}
                  setTempAiPin={setTempAiPin}
                  setNewPlacePos={setNewPlacePos}
                  setIsAdding={setIsAdding}
                  setMapBounds={setMapBounds}
                  mapRef={mapRef}
                  onSelectPlace={openPlaceDetail}
                  focusTarget={pendingMapFocus}
                  onFocusHandled={() => setPendingMapFocus(null)}
                />
              ) : (
                <MapContainer 
                  center={TOKYO_CENTER} 
                  zoom={DEFAULT_ZOOM} 
                  className={cn("h-full w-full transition-all duration-700")}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution={activeMapTheme.attribution}
                    url={activeMapTheme.url}
                    opacity={1}
                  />
                  <MapEvents 
                    user={user}
                    role={role}
                    activeTab={activeTab}
                    setNewPlacePos={setNewPlacePos}
                    setIsAdding={setIsAdding}
                    setMapBounds={setMapBounds}
                    mapRef={mapRef}
                    focusTarget={pendingMapFocus}
                    onFocusHandled={() => setPendingMapFocus(null)}
                  />
                  
                  {filteredPlaces.map((place) => (
                    <Marker 
                      key={place.id} 
                      position={[place.lat, place.lng]}
                      icon={getCustomIcon(place.category, mapStyle)}
                    >
                      <Popup className="custom-popup">
                        <div className="p-0 min-w-[260px] overflow-hidden">
                          {place.image_url && (
                            <div className="aspect-[16/10] w-full overflow-hidden relative group">
                              <img src={place.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                          )}
                          <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5">
                                <h3 className="font-serif italic text-xl text-black leading-tight m-0">{place.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-semibold text-stone-400 uppercase tracking-[0.1em]">
                                    {place.category}
                                  </span>
                                  {place.rating && (
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      <span className="text-[9px] font-bold">{place.rating}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button 
                                onClick={() => handleToggleFavorite(place.id)}
                                className={cn(
                                  "p-2.5 rounded-full transition-all active:scale-90 glass",
                                  favorites.some(f => f.place_id === place.id) ? "text-rose-500 border-rose-100 bg-rose-50/50" : "text-stone-300 hover:text-stone-600"
                                )}
                              >
                                <Heart className={cn("w-4 h-4", favorites.some(f => f.place_id === place.id) && "fill-current")} />
                              </button>
                            </div>
                            
                            <p className="text-[11px] text-stone-500 leading-relaxed font-normal line-clamp-2 m-0">{place.description}</p>
                            
                            <div className="pt-1">
                              <button 
                                type="button"
                                onClick={() => openPlaceDetail(place)}
                                className="w-full py-3 bg-black text-white text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl flex items-center justify-center gap-2 hover:bg-stone-800 transition-all active:scale-[0.98]"
                              >
                                Details
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}



                  {aiFavorites.map((item) => (
                    <Marker
                      key={item.key}
                      position={[item.lat, item.lng]}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: white; width: 32px; height: 32px; border-radius: 999px; display: flex; align-items: center; justify-content: center; border: 2px solid black; box-shadow: 0 6px 16px rgba(0,0,0,0.15);"><div style="color: black; font-size: 14px; font-weight: 700;">★</div></div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                      })}
                    >
                      <Popup>
                        <div className="p-2">
                          <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">AI Favorite</div>
                          <div className="font-black text-black uppercase tracking-tight">{getAiFavoriteDisplay(item, locale).name}</div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {tempAiPin && (
                    <Marker 
                      position={[tempAiPin.lat, tempAiPin.lng]}
                      icon={L.divIcon({
                        className: 'custom-div-icon',
                        html: `<div style="background-color: black; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-center; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transform: rotate(45deg);"><div style="transform: rotate(-45deg); color: white; font-size: 14px;">✨</div></div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                      })}
                    >
                      <Popup>
                        <div className="p-2">
                          <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">AI Recommendation</div>
                          <div className="font-black text-black uppercase tracking-tight">{tempAiPin.name}</div>
                          <button 
                            onClick={() => setTempAiPin(null)}
                            className="mt-2 text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                          >
                            Remove Pin
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {newPlacePos && newPlacePosition && newPlaceIcon && (
                    <Marker 
                      position={newPlacePosition} 
                      icon={newPlaceIcon}
                    />
                  )}
                </MapContainer>
              )}

            </motion.div>
          )}

          {activeTab === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full overflow-y-auto p-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:p-6 md:pb-44 space-y-4 md:space-y-6 bg-stone-50"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input 
                  type="text" 
                  placeholder="Search spots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:border-black outline-none transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-stone-200 rounded-xl shadow-sm">
                <button 
                  onClick={() => setListFilter('all')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black transition-all uppercase tracking-widest rounded-lg",
                    listFilter === 'all' ? "bg-black text-white" : "text-stone-400"
                  )}
                >
                  ALL SPOTS
                </button>
                <button 
                  onClick={() => setListFilter('favorites')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black transition-all uppercase tracking-widest rounded-lg",
                    listFilter === 'favorites' ? "bg-black text-white" : "text-stone-400"
                  )}
                >
                  FAVORITES
                </button>
                <button 
                  onClick={() => setListFilter('ai_favorites')}
                  className={cn(
                    "flex-1 py-2 text-[10px] font-black transition-all uppercase tracking-widest rounded-lg",
                    listFilter === 'ai_favorites' ? "bg-black text-white" : "text-stone-400"
                  )}
                >
                  {t('aiFavoritesTab')}
                </button>
              </div>

              {listFilter === 'all' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 md:px-6 bg-white border border-stone-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <MapIcon className="w-5 h-5 text-stone-400" />
                    <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Filter by map area</span>
                  </div>
                  <button 
                    onClick={() => setIsMapBoundsFilterEnabled(!isMapBoundsFilterEnabled)}
                    className={cn(
                      "w-12 h-6 transition-all relative rounded-full",
                      isMapBoundsFilterEnabled ? "bg-black" : "bg-stone-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white transition-all rounded-full",
                      isMapBoundsFilterEnabled ? "left-7" : "left-1"
                    )} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listFilter === 'ai_favorites' ? (
                  aiFavoritePlaces.length > 0 ? aiFavoritePlaces.map((item) => (
                    <motion.div
                      layout
                      key={item.key}
                      className="bg-white p-5 md:p-6 border border-stone-100 rounded-[1.75rem] group shadow-sm hover:shadow-xl transition-all duration-500"
                    >
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 min-w-0">
                            {(() => {
                              const localized = getAiFavoriteDisplay(item, locale);
                              return (
                                <>
                                  <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">{localized.category}</p>
                                  <h3 className="text-lg font-black text-black leading-tight">{localized.name}</h3>
                                </>
                              );
                            })()}
                          </div>
                          <button
                            onClick={() => handleSaveAiRecommendation(item)}
                            className="p-2.5 rounded-full transition-all active:scale-90 border text-rose-500 border-rose-100 bg-rose-50/50"
                            title={t('saveAi')}
                          >
                            <Heart className="w-4 h-4 fill-current" />
                          </button>
                        </div>

                        <p className="text-sm text-stone-500 leading-relaxed font-medium line-clamp-4">{getAiFavoriteDisplay(item, locale).reason}</p>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">{t('savedAt')} {new Date(item.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={() => handleAiViewOnMap(item)}
                            className="flex-1 px-4 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-stone-800 transition-all"
                          >
                            <MapPin className="w-3 h-3" />
                            {t('viewOnMap')}
                          </button>
                          <button
                            onClick={() => setActiveTab('ai')}
                            className="px-4 py-3 border border-stone-200 text-stone-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-black hover:text-black transition-all"
                          >
                            {t('backToAi')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-full bg-white border border-stone-100 rounded-[2rem] shadow-sm px-8 py-14 text-center space-y-3">
                      <Heart className="w-8 h-8 mx-auto text-stone-200" />
                      <p className="text-sm font-black text-stone-500 uppercase tracking-[0.2em]">{t('noAiFavorites')}</p>
                      <p className="text-sm text-stone-400">{t('openAiTabHint')}</p>
                    </div>
                  )
                ) : (
                  (listFilter === 'all' ? visibleListPlaces : favoritePlaces).map((place) => {
                    const isFav = favorites.some(f => f.place_id === place.id);
                    return (
                      <motion.div 
                        layout
                        key={place.id}
                        className="bg-white p-5 md:p-6 border border-stone-100 rounded-[1.75rem] group shadow-sm hover:shadow-xl transition-all duration-500"
                      >
                        <div className="flex gap-6">
                          <div className="w-24 h-24 flex items-center justify-center shrink-0 bg-stone-50 border border-stone-100 overflow-hidden rounded-2xl">
                            {place.image_url ? (
                              <img src={place.image_url} className="w-full h-full object-cover transition-all duration-500" referrerPolicy="no-referrer" />
                            ) : (
                              <MapPin className="w-8 h-8 text-stone-200" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">{place.category}</p>
                                <h3 className="text-lg font-black text-black leading-tight truncate">{place.name}</h3>
                              </div>
                              <button
                                onClick={() => handleToggleFavorite(place.id)}
                                className={cn(
                                  "p-2.5 rounded-full transition-all active:scale-90 border",
                                  isFav
                                    ? "text-rose-500 border-rose-100 bg-rose-50/50"
                                    : "text-stone-300 border-stone-100 hover:text-stone-600 hover:border-stone-200"
                                )}
                              >
                                <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
                              </button>
                            </div>

                            <p className="text-sm text-stone-500 leading-relaxed font-medium line-clamp-3">
                              {place.description || 'No description available.'}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                              {place.website_url ? (
                                <a
                                  href={place.website_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-[10px] font-black text-stone-400 hover:text-black uppercase tracking-widest"
                                >
                                  Visit Site
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest">No Link</span>
                              )}

                              <div className="ml-auto flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handlePlaceViewOnMap({ lat: place.lat, lng: place.lng })}
                                  className="px-4 py-3 border border-stone-200 text-stone-500 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 hover:border-black hover:text-black transition-all"
                                >
                                  <MapPin className="w-3 h-3" />
                                  {t('viewOnMap')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openPlaceDetail(place)}
                                  className="px-4 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 hover:bg-stone-800 transition-all"
                                >
                                  Details
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
                                      {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full overflow-y-auto bg-[#F8F8F7] relative z-10 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pb-40"
            >
              <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-12 space-y-6 md:space-y-12">
                {/* AI Discovery Header */}
                <div className="bg-white p-6 md:p-10 xl:p-16 rounded-[2rem] md:rounded-[3rem] border border-stone-100 shadow-sm space-y-4 md:space-y-6 relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">MILZ AI DISCOVERY</p>
                    <h2 className="text-3xl md:text-5xl font-black text-black leading-[1.05] md:leading-[1.1] tracking-tight max-w-2xl">
                      {t('aiTitle')}
                    </h2>
                    <p className="text-sm text-stone-400 font-medium max-w-2xl">
                      {t('aiSubtitle')}
                    </p>
                  </div>
                  <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-stone-50/50 to-transparent pointer-events-none" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Filter & Action */}
                  <div className="lg:col-span-8 space-y-8">
                    {/* Location Filter Card */}
                    <div className="bg-white p-5 md:p-8 xl:p-12 rounded-[2rem] md:rounded-[3rem] border border-stone-100 shadow-sm space-y-6 md:space-y-10">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">ロケーションフィルター</p>
                          <h3 className="text-2xl font-black text-black tracking-tight">Active region</h3>
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          Regionを切り替えると、MapとAIの対象地域も切り替わります。
                        </p>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-4">Area</label>
                        <div className="flex flex-wrap gap-3">
                          {areaOptions.map((area) => (
                            <button
                              key={area.key}
                              onClick={() => setLocationFilter(createLocationFilterFromArea(area.key, area.cities[0]?.name))}
                              className={cn(
                                "px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border",
                                locationFilter.areaKey === area.key
                                  ? "bg-black text-white border-black shadow-lg"
                                  : "bg-stone-50 text-stone-400 border-stone-100 hover:border-stone-300 hover:text-black"
                              )}
                            >
                              <MapPin className="w-3 h-3" />
                              {area.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-4">Area</label>
                          <select
                            value={locationFilter.areaKey}
                            onChange={(e) => setLocationFilter(createLocationFilterFromArea(e.target.value, getAreaCityOptions(e.target.value)[0]?.name))}
                            className="w-full px-5 py-4 md:px-8 md:py-5 bg-stone-50 border border-stone-100 rounded-[1.25rem] md:rounded-[1.5rem] outline-none focus:border-black appearance-none font-bold text-sm"
                          >
                            {areaOptions.map((area) => (
                              <option key={area.key} value={area.key}>{area.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-stone-400 uppercase tracking-widest ml-4">City / Ward</label>
                          <select
                            value={locationFilter.cityName}
                            onChange={(e) => setLocationFilter((prev) => ({ ...prev, cityCode: e.target.value, cityName: e.target.value }))}
                            className="w-full px-8 py-5 bg-stone-50 border border-stone-100 rounded-[1.5rem] outline-none focus:border-black appearance-none font-bold text-sm"
                          >
                            {areaCityOptions.map((city) => (
                              <option key={city.name} value={city.name}>{city.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <button 
                        onClick={handleAiRecommend}
                        disabled={aiLoading}
                        className="w-full p-6 md:p-10 bg-[#1A1A1A] text-white font-black rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center gap-3 md:gap-4 shadow-2xl active:scale-95 transition-all disabled:opacity-50 tracking-[0.25em] md:tracking-[0.4em] text-[11px] md:text-xs hover:bg-black group"
                      >
                        {aiLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                        Milz AI
                      </button>
                    </div>

                    {/* Results Area */}
                    {aiResults && (
                      <div className="space-y-8 pt-8">
                        {aiResults.recommendations && (
                          <section className="space-y-6">
                            <div className="flex flex-col gap-4 px-4">
                              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                                <div>
                                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-[0.4em]">{t('recommendedSpots')}</h3>
                                  <p className="mt-2 text-sm text-stone-500 font-medium">
                                    {activeAiEditOption.summary[locale]}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">
                                  <span className="rounded-full border border-stone-200 bg-white px-3 py-2">
                                    {locale === 'jp'
                                      ? `${Math.min(aiDisplayedRecommendations.length, AI_RECOMMENDATION_VISIBLE_COUNT)}件表示 / 全${aiScoredRecommendations.length}件候補`
                                      : `Showing ${Math.min(aiDisplayedRecommendations.length, AI_RECOMMENDATION_VISIBLE_COUNT)} of ${aiScoredRecommendations.length}`}
                                  </span>
                                  {aiRecommendationPageCount > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => setAiEditPage((prev) => (prev + 1) % aiRecommendationPageCount)}
                                      className="rounded-full border border-stone-200 bg-white px-4 py-2 text-black hover:border-black transition-all"
                                    >
                                      {locale === 'jp' ? '別の10件を見る' : 'More picks'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="rounded-[1.8rem] border border-stone-100 bg-white p-5 md:p-6 shadow-sm space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">AI EDIT MODE</div>
                                    <div className="mt-2 text-base md:text-lg font-black text-black tracking-tight">
                                      {locale === 'jp' ? '気分と保存傾向で10件に再編集' : 'Re-edited into 10 picks using mood + saved taste'}
                                    </div>
                                  </div>
                                  {aiComparedRecommendations.length > 0 && (
                                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">
                                      {locale === 'jp'
                                        ? `比較選択 ${aiComparedRecommendations.length}/2`
                                        : `Compare ${aiComparedRecommendations.length}/2`}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {AI_EDIT_OPTIONS.map((option) => (
                                    <button
                                      key={option.key}
                                      type="button"
                                      onClick={() => setAiEditMode(option.key)}
                                      className={cn(
                                        "rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                                        aiEditMode === option.key
                                          ? "border-black bg-black text-white"
                                          : "border-stone-200 bg-stone-50 text-stone-500 hover:border-black hover:text-black"
                                      )}
                                    >
                                      {option.label[locale]}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {aiCompareSummary && (
                                <div className="rounded-[1.8rem] border border-stone-100 bg-white p-5 md:p-6 shadow-sm space-y-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">AI COMPARE</div>
                                      <div className="mt-2 text-lg font-black text-black tracking-tight">
                                        {aiComparedRecommendations[0].rec.name} <span className="text-stone-300">vs</span> {aiComparedRecommendations[1].rec.name}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setAiCompareKeys([])}
                                      className="rounded-full border border-stone-200 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500 hover:border-black hover:text-black"
                                    >
                                      {locale === 'jp' ? '比較を解除' : 'Clear compare'}
                                    </button>
                                  </div>
                                  <p className="text-sm font-medium text-stone-500 leading-relaxed">{aiCompareSummary.shared}</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-[1.3rem] border border-stone-100 bg-stone-50 p-4 space-y-4">
                                      <div className="text-base font-black text-black tracking-tight">{aiComparedRecommendations[0].rec.name}</div>
                                      <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-400">Pro</div>
                                        <ul className="space-y-2 text-sm font-semibold text-stone-700 leading-relaxed">
                                          {aiCompareSummary.leftPros.map((item, idx) => (
                                            <li key={`left-pro-${idx}`} className="flex gap-2"><span className="text-black">+</span><span>{item}</span></li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-400">Con</div>
                                        <ul className="space-y-2 text-sm font-semibold text-stone-600 leading-relaxed">
                                          {aiCompareSummary.leftCons.map((item, idx) => (
                                            <li key={`left-con-${idx}`} className="flex gap-2"><span className="text-stone-400">−</span><span>{item}</span></li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                    <div className="rounded-[1.3rem] border border-stone-100 bg-stone-50 p-4 space-y-4">
                                      <div className="text-base font-black text-black tracking-tight">{aiComparedRecommendations[1].rec.name}</div>
                                      <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-400">Pro</div>
                                        <ul className="space-y-2 text-sm font-semibold text-stone-700 leading-relaxed">
                                          {aiCompareSummary.rightPros.map((item, idx) => (
                                            <li key={`right-pro-${idx}`} className="flex gap-2"><span className="text-black">+</span><span>{item}</span></li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-400">Con</div>
                                        <ul className="space-y-2 text-sm font-semibold text-stone-600 leading-relaxed">
                                          {aiCompareSummary.rightCons.map((item, idx) => (
                                            <li key={`right-con-${idx}`} className="flex gap-2"><span className="text-stone-400">−</span><span>{item}</span></li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {aiDisplayedRecommendations.map((item, visibleIndex) => {
                                const { rec, index, key, editorial } = item;
                                const visual = aiRecommendationVisuals.get(createAiRecommendationVisualKey(rec, index));
                                const isCompared = aiCompareKeys.includes(key);
                                const globalNumber = aiEditPage * AI_RECOMMENDATION_VISIBLE_COUNT + visibleIndex + 1;
                                return (
                                  <motion.div
                                    key={`${key}::${aiEditMode}::${aiEditPage}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: visibleIndex * 0.05 }}
                                    className="bg-white p-6 md:p-8 border border-stone-100 rounded-[2rem] md:rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-full group"
                                  >
                                    <div className="relative mb-6 overflow-hidden rounded-[1.6rem] border border-stone-100 bg-stone-50 aspect-[16/10]">
                                      {visual?.imageUrl && (
                                        <img
                                          src={visual.imageUrl}
                                          alt={rec.name}
                                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/88 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-stone-500 backdrop-blur-sm">
                                        {visual?.source === 'place' ? 'MILZ SPOT' : 'MILZ AI CARD'}
                                      </div>
                                    </div>
                                    <div className="flex items-start justify-between mb-5 gap-4">
                                      <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-300">#{String(globalNumber).padStart(2, '0')}</div>
                                        <h4 className="mt-2 text-xl font-black text-black leading-tight tracking-tight group-hover:text-stone-600 transition-colors">{rec.name}</h4>
                                      </div>
                                      <span className="text-[9px] font-black border border-stone-200 px-4 py-2 uppercase tracking-widest rounded-full bg-stone-50">
                                        {rec.category}
                                      </span>
                                    </div>
                                    <p className="text-sm text-stone-500 leading-relaxed font-medium mb-5">{rec.reason}</p>

                                    <div className="mb-5 rounded-[1.5rem] border border-stone-100 bg-stone-50 p-4 space-y-3">
                                      <div className="text-[9px] font-black uppercase tracking-[0.28em] text-stone-400">AI EDIT NOTE</div>
                                      <p className="text-sm font-semibold text-stone-700 leading-relaxed">{editorial.why}</p>
                                      <div className="flex flex-wrap gap-2">
                                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                                          {locale === 'jp' ? `おすすめ時間 · ${editorial.bestTime}` : `Best time · ${editorial.bestTime}`}
                                        </span>
                                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
                                          {editorial.vibe}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 mb-4">
                                      <button
                                        type="button"
                                        onClick={() => toggleAiCompareSelection(rec)}
                                        className={cn(
                                          "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] transition-colors",
                                          isCompared ? "text-black" : "text-stone-500 hover:text-black"
                                        )}
                                      >
                                        {isCompared ? <CheckCircle2 className="w-4 h-4" /> : <Layers3 className="w-4 h-4" />}
                                        {isCompared
                                          ? (locale === 'jp' ? '比較中' : 'Comparing')
                                          : (locale === 'jp' ? '比較に追加' : 'Add to compare')}
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedAiRecommendation(rec);
                                          recordAiMetric(rec, 'view');
                                        }}
                                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-stone-500 hover:text-black transition-colors"
                                      >
                                        <Info className="w-4 h-4" />
                                        More
                                      </button>
                                    </div>

                                    <div className="flex gap-3 mt-auto">
                                      <button
                                        onClick={() => handleAiViewOnMap(rec)}
                                        className="flex-1 py-4 bg-stone-50 hover:bg-black hover:text-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border border-stone-100"
                                      >
                                        <MapPin className="w-3 h-3" />
                                        {t('viewOnMap')}
                                      </button>
                                      <button
                                        onClick={() => handleSaveAiRecommendation(rec)}
                                        className={cn(
                                          "px-6 py-4 border rounded-2xl transition-all flex items-center justify-center",
                                          isAiRecommendationSaved(rec)
                                            ? "border-rose-200 bg-rose-50 text-rose-500"
                                            : "border-stone-100 hover:border-black hover:bg-rose-50 hover:text-rose-500 text-stone-400"
                                        )}
                                        title={t('saveAi')}
                                      >
                                        <Heart className={cn("w-4 h-4", isAiRecommendationSaved(rec) && "fill-current")} />
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </section>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Summary */}
                  <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-5 md:p-8 xl:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-stone-100 shadow-sm space-y-6 md:space-y-10 sticky top-20 md:top-24">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">AI RECOMMENDATION</p>
                        <h3 className="text-xl font-black text-black tracking-tight">Top 5 in MILZ AI</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[1.6rem] border border-stone-100 bg-stone-50 p-5">
                          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-stone-400">Active Area</div>
                          <div className="mt-2 text-lg font-black tracking-tight text-black">{locationFilter.areaName}</div>
                          <div className="mt-1 text-sm font-medium text-stone-500">{locationFilter.cityName}</div>
                        </div>

                        <div className="space-y-3">
                          {aiLeaderboard.length === 0 ? (
                            <div className="rounded-[1.6rem] border border-dashed border-stone-200 bg-stone-50 p-5 text-sm text-stone-500">
                              {locale === 'jp' ? 'ランキングデータはまだありません。Milz AIを実行するとここに人気順が表示されます。' : 'No ranking data yet. Run Milz AI and interactions will start appearing here.'}
                            </div>
                          ) : (
                            aiLeaderboard.map((item, index) => (
                              <button
                                key={`${item.recommendation_name}-${index}`}
                                onClick={() => handleAiViewOnMap({ name: item.recommendation_name, lat: item.lat, lng: item.lng, category: item.category, details: item.details })}
                                className="w-full text-left rounded-[1.6rem] border border-stone-100 bg-stone-50 p-5 hover:border-black transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-300">Top {index + 1}</div>
                                    <div className="mt-2 text-base font-black text-black leading-snug">{item.recommendation_name}</div>
                                    <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-stone-400">{item.category}</div>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="pt-6 border-t border-stone-50">
                        <p className="text-[9px] font-medium text-stone-300 leading-relaxed">
                          {t('aiGeneratedNote')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'shorts' && (
            <motion.div
              key="shorts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full overflow-y-auto bg-black text-white pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-44 snap-y snap-mandatory overscroll-y-contain"
            >
              {shortsFeed.length === 0 ? (
                <div className="h-full flex items-center justify-center px-6">
                  <div className="max-w-md w-full text-center space-y-4">
                    <Play className="w-10 h-10 mx-auto text-white/30" />
                    <h3 className="text-xl font-black uppercase tracking-[0.2em]">{t('shortsEmpty')}</h3>
                    <p className="text-sm text-white/60">{t('shortsHint')}</p>
                  </div>
                </div>
              ) : (
                shortsFeed.map((item) => {
                  const isPlaceFav = favorites.some((f) => f.place_id === item.placeId);
                  const websiteLabel = formatWebsiteLabel(item.websiteUrl);
                  const addressLabel = locale === 'jp' ? '住所' : 'Address';
                  const hoursLabel = locale === 'jp' ? '営業時間' : 'Hours';
                  const websiteText = locale === 'jp' ? '公式サイト' : 'Official Site';
                  const summaryLabel = locale === 'jp' ? '店舗メモ' : 'Spot Note';
                  const addressValue = item.address || (locale === 'jp' ? '住所情報はまだ登録されていません。' : 'Address details have not been added yet.');
                  const hoursValue = item.hours || (locale === 'jp' ? '営業時間は未登録です。' : 'Hours have not been added yet.');
                  const descriptionValue = item.description || (locale === 'jp' ? 'このSpotに登録されたショート動画です。' : 'A short video registered for this spot.');
                  const spotInfoLabel = locale === 'jp' ? '店舗情報' : 'Spot Info';
                  const isShortInfoOpen = expandedShortInfoId === item.id;

                  const compactInfoPanel = (
                    <div className="space-y-3">
                      <div className="space-y-2 text-center xl:text-left">
                        <div className="flex flex-wrap items-center justify-center xl:justify-start gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/45">
                          <span>MILZ SHORTS</span>
                          <span className="h-1 w-1 rounded-full bg-white/25" />
                          <span>{item.category}</span>
                        </div>
                        <h2 className="text-[2rem] sm:text-[2.4rem] xl:text-[3rem] font-black leading-[0.92] tracking-tight">{item.placeName}</h2>
                        <p className="text-[13px] leading-relaxed text-white/62">{descriptionValue}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-2">
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.26em] text-white/45">
                            <MapPin className="w-3.5 h-3.5" />
                            {addressLabel}
                          </div>
                          <p className="text-[13px] font-semibold leading-relaxed text-white/88 break-words">{addressValue}</p>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-2">
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.26em] text-white/45">
                            <Clock className="w-3.5 h-3.5" />
                            {hoursLabel}
                          </div>
                          <p className="text-[13px] font-semibold leading-relaxed text-white/88 whitespace-pre-line">{hoursValue}</p>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 space-y-2 sm:col-span-2">
                          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.26em] text-white/45">
                            <FileText className="w-3.5 h-3.5" />
                            {summaryLabel}
                          </div>
                          <p className="text-[13px] font-semibold leading-relaxed text-white/82">{descriptionValue}</p>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-4 flex flex-col gap-3 sm:col-span-2">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.26em] text-white/45">
                              <Globe className="w-3.5 h-3.5" />
                              {websiteText}
                            </div>
                            <p className="text-[13px] font-semibold text-white/88 break-all">
                              {websiteLabel || (locale === 'jp' ? '未登録' : 'Not added yet')}
                            </p>
                          </div>
                          {item.websiteUrl ? (
                            <a
                              href={item.websiteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-2 self-start px-4 py-2.5 rounded-full border border-white/15 text-[10px] font-black uppercase tracking-[0.22em] text-white hover:border-white/40 hover:bg-white/5 transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                              {websiteText}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <section
                      key={item.id}
                      className="min-h-[calc(100svh-7rem)] snap-start px-4 pt-4 pb-[calc(14.5rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pt-8 md:pb-44 flex items-start xl:items-center"
                    >
                      <div className="w-full max-w-[1280px] mx-auto">
                        <div className="relative flex flex-col items-center xl:min-h-[calc(100svh-12rem)] xl:justify-center">
                          <div className="w-full flex justify-center">
                            <div className="w-full max-w-[270px] sm:max-w-[310px] md:max-w-[340px] xl:max-w-[390px]">
                              <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-[0_35px_100px_rgba(0,0,0,0.45)] max-h-[calc(100svh-16.5rem)] sm:max-h-[calc(100svh-15rem)] xl:max-h-[calc(100svh-8rem)] mx-auto">
                                {item.playbackType === 'direct' ? (
                                  <video
                                    src={item.url}
                                    poster={item.imageUrl}
                                    className="w-full h-full object-cover"
                                    controls
                                    playsInline
                                    muted
                                    loop
                                    preload="metadata"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center gap-4 bg-stone-950">
                                    <Video className="w-10 h-10 text-white/70" />
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/40">Legacy YouTube</p>
                                      <p className="text-sm font-semibold text-white/90">Open externally</p>
                                      <p className="text-xs leading-relaxed text-white/60">For reliable in-app playback, upload MP4 into MILZ. Legacy YouTube clips open in a new tab.</p>
                                    </div>
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.22em] text-white hover:border-white/45 hover:bg-white/5 transition-all"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                      Open YouTube
                                    </a>
                                  </div>
                                )}
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/70 to-transparent" />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 space-y-1.5">
                                  <div className="inline-flex items-center rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-white/70 backdrop-blur-sm">
                                    {item.category}
                                  </div>
                                  <h3 className="text-xl md:text-2xl font-black leading-tight text-white">{item.placeName}</h3>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 w-full max-w-[680px] xl:hidden space-y-3">
                            <div className="space-y-2 text-center">
                              <div className="flex flex-wrap items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-white/45">
                                <span>MILZ SHORTS</span>
                                <span className="h-1 w-1 rounded-full bg-white/25" />
                                <span>{item.category}</span>
                              </div>
                              <h2 className="text-[2rem] sm:text-[2.35rem] font-black leading-[0.92] tracking-tight">{item.placeName}</h2>
                              <p className="text-[13px] leading-relaxed text-white/62">{descriptionValue}</p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                              <button
                                onClick={() => handleToggleFavorite(item.placeId)}
                                className={cn(
                                  "inline-flex items-center gap-2 px-5 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                                  isPlaceFav
                                    ? "border-rose-300 bg-rose-500/10 text-rose-200"
                                    : "border-white/15 text-white hover:border-white/40 hover:bg-white/5"
                                )}
                              >
                                <Heart className={cn("w-4 h-4", isPlaceFav && "fill-current")} />
                                {isPlaceFav ? 'Saved Spot' : 'Save Spot'}
                              </button>
                              <button
                                onClick={() => handlePlaceViewOnMap({ lat: item.lat, lng: item.lng })}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/15 text-[10px] font-black uppercase tracking-[0.22em] hover:border-white/40 hover:bg-white/5 transition-all"
                              >
                                <MapPinned className="w-4 h-4" />
                                {t('viewOnMap')}
                              </button>
                              <button
                                type="button"
                                onClick={() => openPlaceDetail(item.placeId)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-[0.22em] hover:bg-stone-100 transition-all"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                                {t('openSpot')}
                              </button>
                            </div>

                            <button
                              onClick={() => setExpandedShortInfoId((prev) => prev === item.id ? null : item.id)}
                              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-white/15 text-[10px] font-black uppercase tracking-[0.24em] text-white hover:border-white/40 hover:bg-white/5 transition-all"
                            >
                              <Info className="w-4 h-4" />
                              {spotInfoLabel}
                              <ChevronRight className={cn("w-4 h-4 transition-transform", isShortInfoOpen && "rotate-90")} />
                            </button>

                            <AnimatePresence initial={false}>
                              {isShortInfoOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: 12, height: 0 }}
                                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                                  exit={{ opacity: 0, y: 8, height: 0 }}
                                  transition={{ duration: 0.24, ease: 'easeOut' }}
                                  className="overflow-hidden"
                                >
                                  {compactInfoPanel}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="hidden xl:block absolute top-1/2 left-1/2 ml-[270px] -translate-y-1/2 w-[380px] max-w-[calc(100vw-48rem)]">
                            {compactInfoPanel}
                            <div className="flex flex-wrap items-center gap-3 pt-4">
                              <button
                                onClick={() => handleToggleFavorite(item.placeId)}
                                className={cn(
                                  "inline-flex items-center gap-2 px-5 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                                  isPlaceFav
                                    ? "border-rose-300 bg-rose-500/10 text-rose-200"
                                    : "border-white/15 text-white hover:border-white/40 hover:bg-white/5"
                                )}
                              >
                                <Heart className={cn("w-4 h-4", isPlaceFav && "fill-current")} />
                                {isPlaceFav ? 'Saved Spot' : 'Save Spot'}
                              </button>
                              <button
                                onClick={() => handlePlaceViewOnMap({ lat: item.lat, lng: item.lng })}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/15 text-[10px] font-black uppercase tracking-[0.22em] hover:border-white/40 hover:bg-white/5 transition-all"
                              >
                                <MapPinned className="w-4 h-4" />
                                {t('viewOnMap')}
                              </button>
                              <button
                                type="button"
                                onClick={() => openPlaceDetail(item.placeId)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-[0.22em] hover:bg-stone-100 transition-all"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                                {t('openSpot')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-full overflow-y-auto px-4 pt-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:px-8 md:pt-8 md:pb-44 bg-[#f3f1ec] relative z-10"
            >
              <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] items-start">
                  <section className="bg-white border border-stone-300/80 rounded-[2rem] shadow-[0_20px_70px_rgba(0,0,0,0.06)] p-5 md:p-10 xl:p-12 space-y-6 md:space-y-8">
                    <div className="space-y-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.32em] text-stone-400">S 04 — PROFILE</div>
                      <div className="space-y-2">
                        <h2 className="text-[2.3rem] sm:text-[2.8rem] md:text-[4.8rem] xl:text-[6rem] leading-[0.88] md:leading-[0.86] font-black uppercase tracking-[-0.06em] text-black break-words">
                          {(profileDisplayName || user.email?.split('@')[0] || 'MILZ').replace(/\.$/, '')}.
                        </h2>
                        <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-stone-500">— {locale === 'jp' ? 'MILZの読者' : 'A reader of MILZ'}</p>
                      </div>
                    </div>

                    <div className="border-t border-stone-300" />

                    <div className="space-y-6">
                      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-start border-b border-stone-200 pb-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Display Name</div>
                        <div className="space-y-3">
                          <input
                            value={profileDisplayName}
                            onChange={(e) => setProfileDisplayName(e.target.value)}
                            placeholder={locale === 'jp' ? '表示名を入力' : 'Enter your display name'}
                            className="w-full px-0 py-0 bg-transparent border-0 border-b border-stone-300 rounded-none outline-none focus:border-black transition-all text-lg md:text-xl font-semibold text-black placeholder:text-stone-300"
                          />
                          <p className="text-sm text-stone-500">{locale === 'jp' ? 'プロフィール上で表示される名前です。' : 'This name will be used across your profile.'}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-start border-b border-stone-200 pb-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Email</div>
                        <div className="text-base md:text-lg font-medium text-stone-700 break-all">{user.email}</div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-start border-b border-stone-200 pb-5">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Language</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setLocale('jp')}
                            className={cn(
                              "px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                              locale === 'jp' ? "bg-black text-white border-black" : "bg-white text-stone-500 border-stone-300 hover:border-black hover:text-black"
                            )}
                          >
                            JP
                          </button>
                          <button
                            onClick={() => setLocale('en')}
                            className={cn(
                              "px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                              locale === 'en' ? "bg-black text-white border-black" : "bg-white text-stone-500 border-stone-300 hover:border-black hover:text-black"
                            )}
                          >
                            EN
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Access</div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center rounded-full border border-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-black">{role === 'admin' ? 'Admin' : 'Member'}</span>
                          <span className="text-sm text-stone-500">UID: {user.id}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-stone-300 pt-6 flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleSaveProfileName}
                        disabled={isSavingProfileName}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-[0.24em] disabled:opacity-60"
                      >
                        {isSavingProfileName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {locale === 'jp' ? '保存' : 'Save'}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-stone-300 text-[10px] font-black uppercase tracking-[0.24em] text-stone-700 hover:border-black hover:text-black transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        {locale === 'jp' ? 'サインアウト' : 'Sign out'}
                      </button>
                    </div>
                  </section>

                  <aside className="space-y-4">
                    <div className="bg-white border border-stone-300/80 rounded-[2rem] p-5 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
                      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400 mb-4">Overview</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4 text-center">
                          <div className="text-2xl font-black tracking-tight text-black">{favorites.length}</div>
                          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Saved</div>
                        </div>
                        <div className="rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4 text-center">
                          <div className="text-2xl font-black tracking-tight text-black">{aiFavorites.length}</div>
                          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">AI</div>
                        </div>
                        <div className="rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4 text-center">
                          <div className="text-2xl font-black tracking-tight text-black">{places.length}</div>
                          <div className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-stone-400">Spots</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-300/80 rounded-[2rem] p-5 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Map Style</div>
                          <div className="mt-1 text-sm text-stone-500">{locale === 'jp' ? 'プロフィールからも標準スタイルを変更できます。' : 'Set your default map style from here.'}</div>
                        </div>
                        <Layers3 className="w-5 h-5 text-stone-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {mapStyleOptions.map((option) => (
                          <button
                            key={option.key}
                            onClick={() => setMapStyle(option.key)}
                            className={cn(
                              "rounded-[1.2rem] border p-4 text-left transition-all space-y-2",
                              mapStyle === option.key
                                ? "border-black bg-black text-white shadow-xl"
                                : "border-stone-200 bg-stone-50 text-black hover:border-black"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[10px] font-black uppercase tracking-[0.22em]">{option.label}</div>
                              {mapStyle === option.key && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                            <div className={cn("text-[10px] leading-relaxed", mapStyle === option.key ? "text-white/70" : "text-stone-500")}>
                              {option.key === 'original'
                                ? (locale === 'jp' ? 'クラシックな標準マップ' : 'Classic top-down map')
                                : option.key === 'style2'
                                  ? (locale === 'jp' ? '洗練されたトップビュー' : 'Refined top-view style')
                                  : option.key === 'style3'
                                    ? (locale === 'jp' ? 'やわらかな傾斜表現' : 'Soft tilted map style')
                                    : (locale === 'jp' ? 'ミニチュア感のある立体表現' : 'Miniature-inspired 3D look')}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <section className="bg-white border border-stone-300/80 rounded-[2rem] p-5 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Saved Spots</div>
                        <h3 className="mt-2 text-2xl font-black tracking-tight text-black">{locale === 'jp' ? 'お気に入りスポット' : 'Your saved spots'}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setListFilter('favorites');
                          setActiveTab('list');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-300 text-[10px] font-black uppercase tracking-[0.22em] text-stone-600 hover:border-black hover:text-black transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                        {locale === 'jp' ? '一覧を見る' : 'View all'}
                      </button>
                    </div>

                    {favoritePlaces.length === 0 ? (
                      <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                        {locale === 'jp' ? 'まだお気に入りスポットは保存されていません。' : 'No saved spots yet.'}
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {favoritePlaces.slice(0, 6).map((place) => (
                          <button
                            type="button"
                            key={place.id}
                            onClick={() => openPlaceDetail(place)}
                            className="group text-left rounded-[1.6rem] overflow-hidden border border-stone-200 bg-stone-50 hover:border-black transition-all"
                          >
                            <div className="aspect-[16/10] bg-stone-200 overflow-hidden">
                              {place.image_url || place.images?.[0] ? (
                                <img
                                  src={place.image_url || place.images?.[0]}
                                  alt={place.name}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200" />
                              )}
                            </div>
                            <div className="p-4 space-y-3">
                              <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">{place.category}</div>
                                <div className="mt-1 text-lg font-black tracking-tight text-black line-clamp-2">{place.name}</div>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-stone-500 line-clamp-1">{place.address || [place.municipality, place.prefecture].filter(Boolean).join(', ') || (locale === 'jp' ? '住所未登録' : 'Address unavailable')}</span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlaceViewOnMap({ lat: place.lat, lng: place.lng });
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 group-hover:text-black"
                                >
                                  <MapPinned className="w-4 h-4" />
                                  MAP
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="bg-white border border-stone-300/80 rounded-[2rem] p-5 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)] space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">AI Saved</div>
                        <h3 className="mt-2 text-2xl font-black tracking-tight text-black">{locale === 'jp' ? 'AI保存スポット' : 'AI saved places'}</h3>
                      </div>
                      <button
                        onClick={() => {
                          setListFilter('ai_favorites');
                          setActiveTab('list');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-300 text-[10px] font-black uppercase tracking-[0.22em] text-stone-600 hover:border-black hover:text-black transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                        {locale === 'jp' ? '一覧を見る' : 'View all'}
                      </button>
                    </div>

                    {aiFavorites.length === 0 ? (
                      <div className="rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                        {locale === 'jp' ? 'まだAI保存スポットはありません。' : 'No AI saves yet.'}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiFavorites.slice(0, 6).map((item) => {
                          const localized = getAiFavoriteDisplay(item, locale);
                          return (
                            <div key={item.key} className="rounded-[1.4rem] border border-stone-200 bg-stone-50 p-4 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">{localized.category}</div>
                                  <div className="mt-1 text-lg font-black tracking-tight text-black">{localized.name}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveAiRecommendation(item)}
                                    className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:bg-rose-100 transition-all"
                                    title={locale === 'jp' ? 'AI保存から削除' : 'Remove from AI saves'}
                                  >
                                    <Heart className="w-4 h-4 fill-current" />
                                  </button>
                                  <button
                                    onClick={() => handleAiViewOnMap({ name: localized.name, lat: item.lat, lng: item.lng, category: localized.category })}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-stone-300 text-[10px] font-black uppercase tracking-[0.2em] text-stone-600 hover:border-black hover:text-black transition-all"
                                  >
                                    <MapPinned className="w-4 h-4" />
                                    MAP
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm leading-relaxed text-stone-600">{localized.reason}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                {role === 'admin' && (
                  <details className="bg-white border border-stone-300/80 rounded-[2rem] p-5 md:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">Admin Utilities</div>
                        <div className="mt-2 text-2xl font-black tracking-tight text-black">{locale === 'jp' ? '管理者ツール' : 'Admin tools'}</div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-stone-400" />
                    </summary>

                    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.9fr)]">
                      <div className="space-y-6">
                        <section className="rounded-[1.8rem] border border-stone-200 bg-stone-50 p-5 md:p-6 space-y-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-stone-400">Filter DB</div>
                              <div className="mt-1 text-lg font-black tracking-tight text-black">{locale === 'jp' ? 'カテゴリー / バッジ管理' : 'Category / badge manager'}</div>
                            </div>
                            {filterOptionsLoading && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
                          </div>
                          <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-center">
                            <select
                              value={filterOptionKind}
                              onChange={(e) => setFilterOptionKind(e.target.value as FilterOptionKind)}
                              className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm font-semibold outline-none focus:border-black"
                            >
                              <option value="category">Category</option>
                              <option value="badge">Badge</option>
                            </select>
                            <input
                              value={filterOptionName}
                              onChange={(e) => setFilterOptionName(e.target.value)}
                              placeholder={locale === 'jp' ? '例: Yukie Fav / Pet Friendly' : 'Example: Yukie Fav / Pet Friendly'}
                              className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-white text-sm font-semibold outline-none focus:border-black"
                            />
                            <button
                              onClick={handleCreateFilterOption}
                              className="px-5 py-3 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.22em]"
                            >
                              Add
                            </button>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">Categories</div>
                              <div className="flex flex-wrap gap-2">
                                {categoryOptions.map((item) => (
                                  <button
                                    key={item}
                                    onClick={() => handleDeleteFilterOption('category', item)}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-stone-300 bg-white text-[10px] font-black uppercase tracking-[0.18em] text-stone-600 hover:border-black hover:text-black"
                                  >
                                    {item}
                                    <X className="w-3 h-3" />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">Badges</div>
                              <div className="flex flex-wrap gap-2">
                                {badgeOptions.map((item) => (
                                  <button
                                    key={item}
                                    onClick={() => handleDeleteFilterOption('badge', item)}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-stone-300 bg-white text-[10px] font-black uppercase tracking-[0.18em] text-stone-600 hover:border-black hover:text-black"
                                  >
                                    {item}
                                    <X className="w-3 h-3" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </section>

                        <div className="space-y-3">
                        <button
                          onClick={async () => {
                            addLog('Manual Connection Test: Starting...');
                            const diag = await testSupabaseConnection();
                            if (diag.success) {
                              addLog(`Manual Connection Test: Success (${diag.message})`);
                              showToast(`接続成功! (${diag.message})`, 'success');
                            } else {
                              addLog(`Manual Connection Test: Failed (${diag.message})`);
                              console.error('Connection Test Failed:', diag);
                              let msg = `接続失敗: ${diag.message}`;
                              if (diag.details) msg += `
詳細: ${diag.details}`;
                              if (diag.isTimeout) {
                                msg += `

【考えられる原因】
1. Supabaseプロジェクトが「Paused (停止中)」になっている（ダッシュボードでRestoreしてください）
2. ネットワーク環境（VPNや社内LAN）で通信が遮断されている
3. URLが間違っている（https://[ID].supabase.co である必要があります）`;
                              }
                              const url = import.meta.env.VITE_SUPABASE_URL || '';
                              if (url.includes('supabase.com/dashboard')) {
                                msg += `

⚠️ 注意: URLにダッシュボードのURLが設定されています。API URLを設定してください。`;
                              } else if (!url.startsWith('https://')) {
                                msg += `

⚠️ 注意: URLは https:// で始まる必要があります。`;
                              }
                              showToast(msg, 'error');
                            }
                          }}
                          className="w-full py-3 text-[10px] font-black text-stone-700 hover:text-black transition-colors uppercase tracking-[0.24em] border border-stone-300 rounded-xl bg-stone-50"
                        >
                          Test DB Connection
                        </button>
                        <button
                          onClick={async () => {
                            addLog('Raw Fetch Test: Starting...');
                            try {
                              const url = import.meta.env.VITE_SUPABASE_URL;
                              const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
                              if (!url || !key) {
                                addLog('Raw Fetch Test: Skipped (Config missing)');
                                showToast('設定が不足しています', 'error');
                                return;
                              }
                              const res = await fetch(`${url}/rest/v1/admin_places?select=*`, {
                                headers: {
                                  'apikey': key,
                                  'Authorization': `Bearer ${key}`
                                }
                              });
                              if (res.ok) {
                                const data = await res.json();
                                addLog(`Raw Fetch Test: Success (${data.length} items)`);
                                setPlaces(data);
                                showToast(`Raw Fetch成功: ${data.length}件`, 'success');
                              } else {
                                addLog(`Raw Fetch Test: Failed (${res.status})`);
                                showToast(`Raw Fetch失敗: ${res.status}`, 'error');
                              }
                            } catch (e: any) {
                              addLog(`Raw Fetch Test: Exception: ${e.message}`);
                              let msg = e.message;
                              if (msg === 'Failed to fetch') {
                                msg = 'Failed to fetch (Supabaseへの接続に失敗しました。URLが正しいか、プロジェクトが一時停止されていないか確認してください)';
                              }
                              showToast(`Raw Fetchエラー: ${msg}`, 'error');
                            }
                          }}
                          className="w-full py-3 text-[10px] font-black text-blue-700 hover:text-blue-800 transition-colors uppercase tracking-[0.24em] border border-blue-200 rounded-xl bg-blue-50"
                        >
                          Debug: Fetch with Raw API
                        </button>
                        <button
                          onClick={() => {
                            addLog('Manual Reset: Resetting client...');
                            resetSupabaseClient();
                            addLog('Manual Reset: Client recreated. Retrying fetch...');
                            fetchPlaces();
                            showToast('再初期化しました。', 'info');
                          }}
                          className="w-full py-3 text-[10px] font-black text-amber-700 hover:text-amber-800 transition-colors uppercase tracking-[0.24em] border border-amber-200 rounded-xl bg-amber-50"
                        >
                          Reset & Reconnect
                        </button>
                        <button
                          onClick={() => {
                            localStorage.clear();
                            sessionStorage.clear();
                            addLog('Manual Reset: Storage cleared. Reloading...');
                            showToast('キャッシュをクリアしました。', 'info');
                            window.location.reload();
                          }}
                          className="w-full py-3 text-[10px] font-black text-rose-700 hover:text-rose-800 transition-colors uppercase tracking-[0.24em] border border-rose-200 rounded-xl bg-rose-50"
                        >
                          Clear Cache & Session
                        </button>
                        <button
                          onClick={() => window.location.reload()}
                          className="w-full py-3 text-[10px] font-black text-stone-700 hover:text-black transition-colors uppercase tracking-[0.24em] border border-stone-300 rounded-xl bg-stone-50"
                        >
                          Refresh Application
                        </button>
                        <button
                          onClick={() => setShowSqlModal(true)}
                          className="w-full py-3 text-[10px] font-black text-stone-700 hover:text-black transition-colors uppercase tracking-[0.24em] border border-stone-300 rounded-xl bg-stone-50"
                        >
                          View SQL Setup Script
                        </button>
                        <button
                          onClick={() => setShowConfigModal(true)}
                          className="w-full py-3 text-[10px] font-black text-stone-700 hover:text-black transition-colors uppercase tracking-[0.24em] border border-stone-300 rounded-xl bg-stone-50"
                        >
                          Check Config URL & Key
                        </button>
                        <button
                          onClick={() => {
                            console.log('App: Manual Role Refresh');
                            fetchProfile(user.id, user.email);
                          }}
                          className="w-full py-3 text-[10px] font-black text-stone-700 hover:text-black transition-colors uppercase tracking-[0.24em] border border-stone-300 rounded-xl bg-stone-50"
                        >
                          Refresh Permissions
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Debug Logs</h3>
                          <button onClick={() => setDebugLogs([])} className="text-[10px] font-black text-stone-400 hover:text-stone-600 uppercase">Clear</button>
                        </div>
                        <div className="bg-stone-900 p-4 h-72 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1 text-left rounded-xl">
                          {debugLogs.length === 0 ? (
                            <div className="text-stone-600 italic">No logs yet...</div>
                          ) : (
                            debugLogs.map((log, i) => (
                              <div key={i} className="border-b border-stone-800 pb-1 last:border-0">{log}</div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button (Admin Only) */}
        {role === 'admin' && activeTab === 'map' && (
          <button 
            onClick={handleStartAddSpot}
            className="absolute bottom-8 right-8 w-16 h-16 bg-stone-900 text-white shadow-2xl rounded-full flex items-center justify-center z-[1001] active:scale-95 transition-all hover:scale-110"
          >
            {isAdding ? <X className="w-8 h-8" /> : <Plus className="w-8 h-8" />}
          </button>
        )}
      </main>

      {/* Navigation */}
      <div className="fixed bottom-2 md:bottom-5 left-3 right-3 md:left-4 md:right-4 z-[1001] pointer-events-none">
        <nav className="max-w-2xl mx-auto bg-white/90 backdrop-blur-xl border border-stone-200/70 shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[1.4rem] md:rounded-[1.8rem] pointer-events-auto overflow-hidden">
          <div className="px-3 md:px-5 py-2 md:py-2.5 flex items-center justify-between gap-1 md:gap-2">
            <button 
              onClick={() => setActiveTab('map')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all group flex-1",
                activeTab === 'map' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-1.5 md:p-1.5 rounded-[0.95rem] md:rounded-[1rem] transition-all",
                activeTab === 'map' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <MapIcon className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.22em]">{t('map')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all group flex-1",
                activeTab === 'list' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-1.5 md:p-1.5 rounded-[0.95rem] md:rounded-[1rem] transition-all",
                activeTab === 'list' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <ListIcon className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.22em]">{t('spots')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('shorts')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all group flex-1",
                activeTab === 'shorts' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-1.5 md:p-1.5 rounded-[0.95rem] md:rounded-[1rem] transition-all",
                activeTab === 'shorts' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <Play className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.22em]">{t('shorts')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all group flex-1",
                activeTab === 'ai' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-1.5 md:p-1.5 rounded-[0.95rem] md:rounded-[1rem] transition-all",
                activeTab === 'ai' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.22em]">{t('ai')}</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all group flex-1",
                activeTab === 'profile' ? "text-black" : "text-stone-300 hover:text-stone-500"
              )}
            >
              <div className={cn(
                "p-1.5 md:p-1.5 rounded-[0.95rem] md:rounded-[1rem] transition-all",
                activeTab === 'profile' ? "bg-stone-50" : "group-hover:bg-stone-50/50"
              )}>
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.22em]">{t('profile')}</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Add Spot Modal */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[2000] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-lg p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-black uppercase tracking-tighter">
                  {editingPlace ? addSpotCopy.editTitle : addSpotCopy.addTitle}
                </h2>
                <button onClick={closeAddModal} className="p-2 hover:bg-stone-100 transition-colors">
                  <X className="w-6 h-6 text-black" />
                </button>
              </div>

              {!newPlacePos ? (
                <div className="space-y-6">
                  <div className="p-12 border border-stone-200 text-center space-y-4">
                    <div className="w-16 h-16 bg-stone-50 flex items-center justify-center mx-auto">
                      <MapPinned className="w-8 h-8 text-stone-300" />
                    </div>
                    <p className="text-stone-500 font-medium text-sm">{addSpotCopy.selectOnMap}</p>
                  </div>

                  <div className="relative flex items-center">
                    <div className="flex-1 h-px bg-stone-100"></div>
                    <span className="px-4 text-[10px] font-black text-stone-300 uppercase tracking-widest">{addSpotCopy.or}</span>
                    <div className="flex-1 h-px bg-stone-100"></div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.enterAddress}</label>
                      <div className="flex gap-0">
                        <input 
                          type="text"
                          value={modalAddress}
                          onChange={(e) => setModalAddress(e.target.value)}
                          placeholder={addSpotCopy.enterAddressPlaceholder}
                          className="flex-1 px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium"
                          onKeyDown={(e) => e.key === 'Enter' && handleModalAddressSearch()}
                        />
                        <button
                          onClick={handleModalAddressSearch}
                          disabled={isGeocoding}
                          className="px-8 bg-black text-white font-black text-xs active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={closeAddModal}
                    className="w-full py-4 text-[10px] font-black text-stone-400 hover:text-black transition-colors uppercase tracking-widest"
                  >
                    {addSpotCopy.cancel}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddPlace} className="space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.spotName}</label>
                      <input 
                        name="name"
                        required
                        defaultValue={editingPlace?.name}
                        placeholder={addSpotCopy.spotNamePlaceholder}
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.mainPhoto}</label>
                      <div className="flex items-center gap-6">
                        <div className="relative w-32 h-32 bg-stone-50 border border-stone-200 flex items-center justify-center group overflow-hidden">
                          {previewImage ? (
                            <img src={previewImage} className="w-full h-full object-cover transition-all" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-stone-200" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 text-[11px] text-stone-400 font-medium leading-relaxed">
                          {addSpotCopy.uploadHelp} <br/>
                          <span className="text-black">{addSpotCopy.editorialTip}</span> {addSpotCopy.editorialTipText}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.category}</label>
                        <select 
                          name="category"
                          defaultValue={editingPlace?.category || 'その他'}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium appearance-none"
                        >
                          {categoryOptions.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-stone-400 leading-relaxed px-1">{addSpotCopy.categoryHint}</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.area}</label>
                        <select
                          value={placeEditorAreaKey}
                          onChange={(e) => {
                            const nextArea = e.target.value;
                            setPlaceEditorAreaKey(nextArea);
                            setPlaceEditorCityName(getAreaCityOptions(nextArea)[0]?.name || '');
                          }}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium appearance-none"
                        >
                          {areaOptions.map((area) => (
                            <option key={area.key} value={area.key}>{area.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.city}</label>
                        <select
                          value={placeEditorCityName}
                          onChange={(e) => setPlaceEditorCityName(e.target.value)}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium appearance-none"
                        >
                          {getAreaCityOptions(placeEditorAreaKey).map((city) => (
                            <option key={city.name} value={city.name}>{city.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.addressDetail}</label>
                        <input 
                          name="address"
                          required
                          defaultValue={editingPlace?.address || modalAddress || ''}
                          placeholder={addSpotCopy.addressDetailPlaceholder}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium"
                        />
                        <p className="text-[10px] text-stone-400 leading-relaxed px-1">{addSpotCopy.addressDetailHint}</p>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.website}</label>
                        <input 
                          name="website_url"
                          defaultValue={editingPlace?.website_url || ''}
                          placeholder="https://..."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.badges}</label>
                      <div className="flex flex-wrap gap-2">
                        {badgeOptions.map((badge) => {
                          const isActive = placeEditorBadges.includes(badge);
                          return (
                            <button
                              key={badge}
                              type="button"
                              onClick={() => setPlaceEditorBadges((prev) => prev.includes(badge) ? prev.filter((item) => item !== badge) : [...prev, badge])}
                              className={cn(
                                "px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.18em] transition-all",
                                isActive ? "bg-black text-white border-black" : "bg-white text-stone-500 border-stone-200 hover:border-black hover:text-black"
                              )}
                            >
                              {badge}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.shortDescription}</label>
                      <textarea 
                        name="description"
                        rows={2}
                        defaultValue={editingPlace?.description || ''}
                        placeholder={addSpotCopy.shortDescriptionPlaceholder}
                        className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                      />
                    </div>

                    <div className="space-y-8 pt-8 border-t border-stone-100">
                      <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em] px-1">{addSpotCopy.editorialContent}</h3>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.milzExperience}</label>
                        <textarea 
                          name="milz_experience"
                          rows={6}
                          defaultValue={editingPlace?.milz_experience || ''}
                          placeholder={addSpotCopy.milzExperiencePlaceholder}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none leading-relaxed"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.detailedDescription}</label>
                        <textarea 
                          name="detailed_description"
                          rows={4}
                          defaultValue={editingPlace?.detailed_description || ''}
                          placeholder={addSpotCopy.detailedDescriptionPlaceholder}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.galleryPhotos}</label>
                        <textarea 
                          name="images"
                          rows={2}
                          defaultValue={editingPlace?.images?.join(', ') || ''}
                          placeholder={addSpotCopy.galleryPhotosPlaceholder}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{addSpotCopy.videos}</label>
                        <DropZone
                          label={locale === 'jp' ? 'MP4 をドロップでアップロード' : 'Drop MP4 to upload'}
                          onFilesDrop={handlePlaceVideoFilesDrop}
                          isLoading={uploading}
                          icon={Video}
                          className="min-h-[180px]"
                          accept="video/*,.mov,.mp4,.m4v,.webm"
                        />
                        <textarea 
                          name="videos"
                          rows={4}
                          value={placeEditorVideosText}
                          onChange={(e) => setPlaceEditorVideosText(e.target.value)}
                          placeholder={addSpotCopy.videosPlaceholder}
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                        <p className="px-1 text-[11px] leading-relaxed text-stone-500">
                          {locale === 'jp'
                            ? 'MOV はブラウザ内で MP4 に変換してから R2 へ保存します。既存の YouTube URL も残せますが、MILZ内再生はアップロード動画が推奨です。'
                            : 'MP4 files are uploaded directly to R2. Legacy YouTube URLs can stay here, but uploaded MP4 files are recommended for in-app playback.'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Menu Items (Name|URL, comma separated - PDF or Jpeg)</label>
                        <textarea 
                          name="pdfs"
                          rows={2}
                          defaultValue={editingPlace?.pdfs?.map(p => `${p.name}|${p.url}`).join(', ') || ''}
                          placeholder="Lunch Menu|https://url.com/menu.pdf, Dinner Menu|https://url.com/menu.jpg..."
                          className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <button 
                      type="submit"
                      disabled={isSubmitting || uploading}
                      className="w-full py-6 bg-black text-white font-black text-xs tracking-[0.3em] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {(isSubmitting || uploading) ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          PROCESSING...
                        </>
                      ) : (editingPlace ? addSpotCopy.update : addSpotCopy.publish)}
                    </button>
                    {!editingPlace && (
                      <button 
                        type="button"
                        onClick={() => setNewPlacePos(null)}
                        className="w-full py-4 text-[10px] font-black text-stone-400 hover:text-black transition-all"
                      >
                        CANCEL
                      </button>
                    )}
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Place Detail Modal */}
        <AnimatePresence>
          {selectedPlaceForDetail && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/90 backdrop-blur-xl z-[3000] overflow-y-auto no-scrollbar"
            >
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="min-h-screen bg-[#fcfcfb] text-[#1c1917]"
              >
                {/* Hero Section */}
                <div className="relative h-[80vh] w-full bg-stone-900 overflow-hidden">
                  <img 
                    src={(isEditingDetail ? editDetailForm.image_url : selectedPlaceForDetail.image_url) || selectedPlaceForDetail.images?.[0] || 'https://picsum.photos/seed/luxury/1920/1080'} 
                    className="w-full h-full object-cover opacity-60 scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                  
                  {/* Close Button */}
                  <button 
                    onClick={() => setSelectedPlaceForDetail(null)}
                    className="absolute top-8 right-8 w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center z-10 hover:bg-white/20 transition-all active:scale-95"
                  >
                    <X className="w-8 h-8" />
                  </button>

                  {/* Actions Overlay */}
                  <div className="absolute top-8 left-8 flex gap-4 z-10">
                    <button 
                      onClick={() => {
                        const isFav = favorites.some(f => f.place_id === selectedPlaceForDetail.id);
                        handleToggleFavorite(selectedPlaceForDetail.id);
                      }}
                      className={cn(
                        "w-16 h-16 backdrop-blur-md border rounded-full flex items-center justify-center transition-all active:scale-95",
                        favorites.some(f => f.place_id === selectedPlaceForDetail.id)
                          ? "bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20"
                          : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                      )}
                    >
                      <Heart className={cn("w-8 h-8", favorites.some(f => f.place_id === selectedPlaceForDetail.id) && "fill-current")} />
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        showToast("Link copied to clipboard", "success");
                      }}
                      className="w-16 h-16 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
                    >
                      <Share2 className="w-8 h-8" />
                    </button>
                    {role === 'admin' && (
                      <>
                        <button 
                          onClick={() => {
                            if (isEditingDetail) {
                              handleUpdatePlaceInline();
                            } else {
                              setEditDetailForm(selectedPlaceForDetail);
                              setIsEditingDetail(true);
                            }
                          }}
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl z-20",
                            isEditingDetail ? "bg-emerald-500 text-white" : "bg-black text-white hover:bg-stone-800"
                          )}
                          disabled={isUpdatingDetail}
                        >
                          {isUpdatingDetail ? (
                            <Loader2 className="w-8 h-8 animate-spin" />
                          ) : isEditingDetail ? (
                            <Save className="w-8 h-8" />
                          ) : (
                            <Pencil className="w-8 h-8" />
                          )}
                        </button>
                        {isEditingDetail && (
                          <button 
                            onClick={() => setIsEditingDetail(false)}
                            className="w-16 h-16 bg-white text-black border border-stone-200 rounded-full flex items-center justify-center hover:bg-stone-50 transition-all active:scale-95 shadow-2xl z-20"
                          >
                            <X className="w-8 h-8" />
                          </button>
                        )}
                        {!isEditingDetail && (
                          <button 
                            onClick={() => {
                              handleDeletePlace(selectedPlaceForDetail.id);
                              openPlaceDetail(null);
                            }}
                            className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 transition-all active:scale-95 shadow-2xl z-20"
                          >
                            <Trash2 className="w-8 h-8" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {/* Hero Content - Centered & Bold */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    {isEditingDetail ? (
                      <div className="space-y-4 w-full max-w-2xl z-10">
                        <input 
                          type="text"
                          value={editDetailForm.category || ''}
                          onChange={(e) => setEditDetailForm({ ...editDetailForm, category: e.target.value })}
                          className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-[0.5em] text-center w-full py-2 outline-none focus:border-white/40"
                          placeholder="CATEGORY"
                        />
                        <input 
                          type="text"
                          value={editDetailForm.name || ''}
                          onChange={(e) => setEditDetailForm({ ...editDetailForm, name: e.target.value })}
                          className="bg-transparent text-6xl md:text-8xl font-serif font-light text-white leading-none tracking-tight text-center w-full outline-none border-b border-white/20 focus:border-white/60"
                          placeholder="SPOT NAME"
                        />
                        <div className="flex justify-center pt-4">
                          <DropZone 
                            label="Hero Background" 
                            onFilesDrop={(files) => handleFilesDrop(files, 'image_url')}
                            isLoading={uploading}
                            className="bg-white/5 border-white/10 text-white w-64 min-h-[100px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-[10px] font-black text-white uppercase tracking-[0.5em] opacity-80">
                          {selectedPlaceForDetail.category} • {selectedPlaceForDetail.address?.split(',')[0]}
                        </div>
                        <h1 className="text-6xl md:text-8xl font-serif font-light text-white leading-none tracking-tight">
                          {selectedPlaceForDetail.name}
                        </h1>
                      </>
                    )}
                    <div className="w-24 h-[1px] bg-white/50" />
                  </div>
                </div>

                {/* Content Grid */}
                <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 lg:grid-cols-12 gap-20">
                  
                  {/* Left Column: Story & Experience */}
                  <div className="lg:col-span-8 space-y-32">
                    
                    {/* Milz Experience Section */}
                    <section className="space-y-12">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">01</span>
                        {isEditingDetail ? (
                          <input 
                            type="text"
                            value={editDetailForm.milz_experience_heading || 'Milz Experience'}
                            onChange={(e) => setEditDetailForm({ ...editDetailForm, milz_experience_heading: e.target.value })}
                            className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                          />
                        ) : (
                          <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                            {selectedPlaceForDetail.milz_experience_heading || 'Milz Experience'}
                          </h2>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
                        <div className="md:col-span-2 space-y-6">
                          {isEditingDetail ? (
                            <textarea 
                              value={editDetailForm.milz_experience_label || 'A curated impression by our lead reporter on the ground.'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, milz_experience_label: e.target.value })}
                              className="w-full bg-stone-50 border border-stone-200 p-4 text-sm font-bold text-black uppercase tracking-widest leading-relaxed outline-none focus:border-black transition-all resize-none"
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm font-bold text-black uppercase tracking-widest leading-relaxed">
                              {selectedPlaceForDetail.milz_experience_label || 'A curated impression by our lead reporter on the ground.'}
                            </p>
                          )}
                          <div className="pt-6 border-t border-stone-100">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Reporter</p>
                            {isEditingDetail ? (
                              <input 
                                type="text"
                                value={editDetailForm.reporter_name || 'MILZ Editorial Team'}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, reporter_name: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 p-2 text-sm font-bold text-black outline-none focus:border-black transition-all"
                              />
                            ) : (
                              <p className="text-sm font-bold text-black">{selectedPlaceForDetail.reporter_name || 'MILZ Editorial Team'}</p>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-3">
                          {isEditingDetail ? (
                            <textarea 
                              value={editDetailForm.milz_experience || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, milz_experience: e.target.value })}
                              className="w-full h-64 bg-stone-50 border border-stone-200 p-6 text-xl font-serif text-stone-800 leading-[1.6] italic outline-none focus:border-black transition-all resize-none"
                              placeholder="Describe the MILZ experience..."
                            />
                          ) : (
                            <p className="text-2xl font-serif text-stone-800 leading-[1.6] italic">
                              {selectedPlaceForDetail.milz_experience || selectedPlaceForDetail.detailed_description || selectedPlaceForDetail.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Photos Section */}
                    <section className="space-y-12">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">02</span>
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.photos_heading || 'Photos'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, photos_heading: e.target.value })}
                              className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                            />
                          ) : (
                            <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                              {selectedPlaceForDetail.photos_heading || 'Photos'}
                            </h2>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                          {selectedPlaceForDetail.images?.length || 0} Captures
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {isEditingDetail && (
                          <div className="col-span-2 md:col-span-1">
                            <DropZone 
                              label="Add Gallery Photos" 
                              onFilesDrop={(files) => handleFilesDrop(files, 'images')}
                              isLoading={uploading}
                              className="h-full min-h-[200px]"
                              accept="image/*,video/*,.mov,.mp4,.m4v,.webm"
                            />
                          </div>
                        )}
                        {(isEditingDetail ? editDetailForm.images : selectedPlaceForDetail.images)?.map((img, i) => (
                          <div key={i} className={cn(
                            "relative overflow-hidden bg-stone-100 group cursor-zoom-in",
                            i % 3 === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"
                          )}>
                            <img 
                              src={img} 
                              className="w-full h-full object-cover transition-all duration-1000 scale-105 group-hover:scale-100" 
                              referrerPolicy="no-referrer" 
                            />
                            {isEditingDetail && (
                              <button 
                                onClick={() => {
                                  const newImages = (editDetailForm.images || []).filter((_, idx) => idx !== i);
                                  setEditDetailForm({ ...editDetailForm, images: newImages });
                                }}
                                className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Short Videos Section */}
                    {(isEditingDetail || (selectedPlaceForDetail.videos && selectedPlaceForDetail.videos.length > 0)) && (
                      <section className="space-y-12">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">03</span>
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.shorts_heading || 'Shorts'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, shorts_heading: e.target.value })}
                              className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                            />
                          ) : (
                            <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                              {selectedPlaceForDetail.shorts_heading || 'Shorts'}
                            </h2>
                          )}
                        </div>
                        <div className="space-y-6">
                          {isEditingDetail && (
                            <div className="space-y-4">
                              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">{locale === 'jp' ? 'Short動画（MOV / MP4をドロップまたはURL入力）' : 'Short videos (drop MOV / MP4 or paste URLs)'}</label>
                              <DropZone
                                label={locale === 'jp' ? 'MP4 をドロップでアップロード' : 'Drop MP4 to upload'}
                                onFilesDrop={(files) => handleFilesDrop(files, 'videos')}
                                isLoading={uploading}
                                icon={Video}
                                className="min-h-[180px]"
                                accept="video/*,.mov,.mp4,.m4v,.webm"
                              />
                              <textarea
                                value={(editDetailForm.videos || []).join('\n')}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, videos: normalizeStoredVideoUrlList(e.target.value) })}
                                rows={4}
                                placeholder={locale === 'jp' ? 'アップロード済みMP4 URL または既存のYouTube URLを1行ずつ' : 'Uploaded MP4 URLs or legacy YouTube URLs, one per line'}
                                className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none"
                              />
                              <p className="px-1 text-[11px] leading-relaxed text-stone-500">{locale === 'jp' ? 'MP4をそのままアップロードして、R2から直接再生します。' : 'MP4 files are uploaded directly to R2 and played from there.'}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {preferPlayableVideoUrls(((isEditingDetail ? editDetailForm.videos : selectedPlaceForDetail.videos) || []).filter((video) => isLikelyVideoUrl(video) || !!extractYouTubeVideoId(video))).map((video, i) => {
                              const youtubeEmbedUrl = getYouTubeEmbedUrl(video);
                              return (
                                <div key={i} className="aspect-[9/16] bg-black relative group overflow-hidden rounded-[28px]">
                                  <VideoEmbed url={video} title={`${selectedPlaceForDetail.name} video ${i + 1}`} />
                                  {isEditingDetail && (
                                    <button 
                                      onClick={() => {
                                        const newVideos = (editDetailForm.videos || []).filter((_, idx) => idx !== i);
                                        setEditDetailForm({ ...editDetailForm, videos: newVideos });
                                      }}
                                      className="absolute top-4 right-4 w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all z-10"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                  {youtubeEmbedUrl && (
                                    <a
                                      href={video}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/70 text-white text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm z-10"
                                    >
                                      Open YouTube
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </section>
                    )}

                    {/* From the Spot Section */}
                    {(isEditingDetail || (selectedPlaceForDetail.from_spot_items && selectedPlaceForDetail.from_spot_items.length > 0)) && (
                      <section className="space-y-12">
                        <div className="flex items-center justify-between gap-6 flex-wrap">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">05</span>
                            {isEditingDetail ? (
                              <input
                                type="text"
                                value={editDetailForm.from_spot_heading || fromSpotHeadingDefault}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, from_spot_heading: e.target.value })}
                                className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                              />
                            ) : (
                              <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                                {selectedPlaceForDetail.from_spot_heading || fromSpotHeadingDefault}
                              </h2>
                            )}
                          </div>
                          {isEditingDetail && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextItems = [...(editDetailForm.from_spot_items || []), {
                                  id: crypto.randomUUID(),
                                  title: locale === 'jp' ? '新しいストーリー' : 'New story',
                                  subtitle: locale === 'jp' ? 'Manager Interview' : 'Manager Interview',
                                  description: '',
                                  media_url: '',
                                  media_type: 'image',
                                } as FromSpotItem];
                                setEditDetailForm({ ...editDetailForm, from_spot_items: nextItems });
                              }}
                              className="px-5 py-3 rounded-full border border-black text-[10px] font-black uppercase tracking-[0.25em] hover:bg-black hover:text-white transition-all"
                            >
                              {locale === 'jp' ? 'セクション追加' : 'Add story'}
                            </button>
                          )}
                        </div>

                        <div className="max-w-3xl">
                          {isEditingDetail ? (
                            <textarea
                              value={editDetailForm.from_spot_intro || fromSpotIntroDefault}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, from_spot_intro: e.target.value })}
                              className="w-full bg-stone-50 border border-stone-200 p-5 text-sm text-stone-600 leading-relaxed font-medium outline-none focus:border-black transition-all resize-none rounded-2xl"
                              rows={3}
                            />
                          ) : (
                            <p className="text-sm text-stone-500 leading-relaxed font-medium">
                              {selectedPlaceForDetail.from_spot_intro || fromSpotIntroDefault}
                            </p>
                          )}
                        </div>

                        <div className="space-y-8">
                          {(isEditingDetail ? editDetailForm.from_spot_items : selectedPlaceForDetail.from_spot_items)?.map((item, index) => {
                            const mediaType = item.media_type || inferMediaTypeFromUrl(item.media_url);
                            return (
                              <div key={item.id || index} className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-stone-200 rounded-[28px] p-6 md:p-8 bg-white">
                                <div className="space-y-4">
                                  {isEditingDetail ? (
                                    <>
                                      <div className="grid grid-cols-1 gap-3">
                                        <input
                                          type="text"
                                          value={item.title || ''}
                                          onChange={(e) => setEditDetailForm({
                                            ...editDetailForm,
                                            from_spot_items: (editDetailForm.from_spot_items || []).map((entry) => entry.id === item.id ? { ...entry, title: e.target.value } : entry),
                                          })}
                                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-black transition-all text-lg font-black"
                                          placeholder={locale === 'jp' ? '見出し' : 'Story title'}
                                        />
                                        <input
                                          type="text"
                                          value={item.subtitle || ''}
                                          onChange={(e) => setEditDetailForm({
                                            ...editDetailForm,
                                            from_spot_items: (editDetailForm.from_spot_items || []).map((entry) => entry.id === item.id ? { ...entry, subtitle: e.target.value } : entry),
                                          })}
                                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-black transition-all text-sm font-semibold"
                                          placeholder={locale === 'jp' ? '店長インタビュー / スタッフ紹介 など' : 'Manager interview / Staff pick'}
                                        />
                                      </div>
                                      <textarea
                                        value={item.description || ''}
                                        onChange={(e) => setEditDetailForm({
                                          ...editDetailForm,
                                          from_spot_items: (editDetailForm.from_spot_items || []).map((entry) => entry.id === item.id ? { ...entry, description: e.target.value } : entry),
                                        })}
                                        className="w-full min-h-[180px] bg-stone-50 border border-stone-200 rounded-2xl p-4 text-sm text-stone-700 leading-relaxed outline-none focus:border-black transition-all resize-none"
                                        placeholder={locale === 'jp' ? '現場の言葉や説明を入力' : 'Describe what is happening on-site.'}
                                      />
                                      <div className="grid grid-cols-1 gap-3">
                                        <DropZone
                                          label={locale === 'jp' ? '写真 / MP4 をアップロード' : 'Upload image / MP4'}
                                          onFilesDrop={(files) => handleFromSpotMediaDrop(item.id, files)}
                                          isLoading={uploading}
                                          className="min-h-[160px]"
                                          accept="image/*,video/*,.mov,.mp4,.m4v,.webm"
                                        />
                                        <input
                                          type="text"
                                          value={item.media_url || ''}
                                          onChange={(e) => setEditDetailForm({
                                            ...editDetailForm,
                                            from_spot_items: (editDetailForm.from_spot_items || []).map((entry) => entry.id === item.id ? { ...entry, media_url: e.target.value, media_type: inferMediaTypeFromUrl(e.target.value) } : entry),
                                          })}
                                          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:border-black transition-all text-xs font-medium"
                                          placeholder={locale === 'jp' ? '画像URL / MP4 URL / 既存YouTube URL' : 'Image URL / MP4 URL / legacy YouTube URL'}
                                        />
                                      </div>
                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setEditDetailForm({
                                            ...editDetailForm,
                                            from_spot_items: (editDetailForm.from_spot_items || []).filter((entry) => entry.id !== item.id),
                                          })}
                                          className="px-4 py-2 rounded-full border border-rose-200 text-rose-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-50 transition-all"
                                        >
                                          {locale === 'jp' ? '削除' : 'Remove'}
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="space-y-3">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">{item.subtitle || (locale === 'jp' ? 'FROM THE SPOT' : 'FROM THE SPOT')}</p>
                                        <h3 className="text-3xl font-serif font-light tracking-tight text-black">{item.title}</h3>
                                      </div>
                                      <p className="text-base leading-relaxed text-stone-600 whitespace-pre-line">{item.description}</p>
                                    </>
                                  )}
                                </div>
                                <div className="space-y-4">
                                  {item.media_url ? (
                                    mediaType === 'video' ? (
                                      <div className="aspect-[4/5] rounded-[28px] overflow-hidden bg-black">
                                        <VideoEmbed url={item.media_url} title={item.title || `from-spot-${index + 1}`} />
                                      </div>
                                    ) : (
                                      <div className="aspect-[4/5] rounded-[28px] overflow-hidden bg-stone-100">
                                        <img src={item.media_url} alt={item.title || `from-spot-${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      </div>
                                    )
                                  ) : (
                                    <div className="aspect-[4/5] rounded-[28px] border border-dashed border-stone-200 bg-stone-50 flex flex-col items-center justify-center gap-3 text-center px-6">
                                      <MessageSquare className="w-8 h-8 text-stone-300" />
                                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-stone-400">{locale === 'jp' ? '現場の写真またはYouTube動画を追加' : 'Add an image or YouTube video'}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}

                    {/* Menu Section */}
                    <section className="space-y-12">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-400">04</span>
                        {isEditingDetail ? (
                          <input 
                            type="text"
                            value={editDetailForm.menu_heading || 'Menu & Offerings'}
                            onChange={(e) => setEditDetailForm({ ...editDetailForm, menu_heading: e.target.value })}
                            className="bg-transparent text-4xl font-serif font-light tracking-tight text-black outline-none border-b border-stone-200 focus:border-black"
                          />
                        ) : (
                          <h2 className="text-4xl font-serif font-light tracking-tight text-black">
                            {selectedPlaceForDetail.menu_heading || 'Menu & Offerings'}
                          </h2>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                        <div className="space-y-10">
                          <div className="space-y-4">
                            {isEditingDetail ? (
                              <textarea 
                                value={editDetailForm.menu_description || 'Explore the seasonal offerings and signature selections curated for the MILZ experience. Our reporters have verified the current menu availability.'}
                                onChange={(e) => setEditDetailForm({ ...editDetailForm, menu_description: e.target.value })}
                                className="w-full bg-stone-50 border border-stone-200 p-4 text-sm text-stone-500 leading-relaxed font-medium outline-none focus:border-black transition-all resize-none"
                                rows={4}
                              />
                            ) : (
                              <p className="text-sm text-stone-500 leading-relaxed font-medium">
                                {selectedPlaceForDetail.menu_description || 'Explore the seasonal offerings and signature selections curated for the MILZ experience. Our reporters have verified the current menu availability.'}
                              </p>
                            )}
                            <div className="w-12 h-[1px] bg-stone-200" />
                          </div>
                          <div className="space-y-4">
                            {isEditingDetail ? (
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Digital Assets (Name|URL, comma separated)</p>
                                  <textarea 
                                    value={editDetailForm.pdfs?.map(p => `${p.name}|${p.url}`).join(', ') || ''}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const parsed = raw.split(',').map(s => {
                                        const [name, url] = s.split('|').map(p => p.trim());
                                        return name && url ? { name, url } : null;
                                      }).filter(Boolean);
                                      setEditDetailForm({ ...editDetailForm, pdfs: parsed as any });
                                    }}
                                    className="w-full px-6 py-4 bg-stone-50 border border-stone-200 outline-none focus:border-black transition-all font-medium resize-none text-xs"
                                    placeholder="Lunch Menu|https://url.com/menu.pdf, Dinner Menu|https://url.com/menu.jpg..."
                                    rows={4}
                                  />
                                </div>
                                
                                <div className="space-y-4">
                                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Upload Menu (PDF/Image)</p>
                                  <DropZone 
                                    label="Upload Menu Files" 
                                    onFilesDrop={(files) => handleFilesDrop(files, 'pdfs')}
                                    isLoading={uploading}
                                    className="min-h-[150px]"
                                    accept="application/pdf,image/*"
                                  />
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  {editDetailForm.pdfs?.map((pdf, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl">
                                      <div className="flex items-center gap-4 overflow-hidden">
                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                                          {pdf.url.toLowerCase().endsWith('.pdf') ? <FileText className="w-4 h-4 text-stone-400" /> : <ImageIcon className="w-4 h-4 text-stone-400" />}
                                        </div>
                                        <span className="text-xs font-bold truncate">{pdf.name}</span>
                                      </div>
                                      <button 
                                        onClick={() => {
                                          const newPdfs = (editDetailForm.pdfs || []).filter((_, idx) => idx !== i);
                                          setEditDetailForm({ ...editDetailForm, pdfs: newPdfs });
                                        }}
                                        className="w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-all"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                <div className="p-6 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                                  <p className="text-[9px] text-stone-400 uppercase tracking-widest leading-relaxed">
                                    Tip: You can upload files directly or paste links in the text area above using the Name|URL format.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <>
                                {selectedPlaceForDetail.pdfs?.map((pdf, i) => {
                                  const isPdf = pdf.url.toLowerCase().endsWith('.pdf');
                                  return (
                                    <a 
                                      key={i}
                                      href={pdf.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between p-8 border border-stone-200 hover:border-black transition-all group relative overflow-hidden"
                                    >
                                      <div className="flex items-center gap-6 z-10">
                                        <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center group-hover:bg-black transition-colors">
                                          {isPdf ? (
                                            <FileText className="w-5 h-5 text-stone-400 group-hover:text-white" />
                                          ) : (
                                            <ImageIcon className="w-5 h-5 text-stone-400 group-hover:text-white" />
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-xs font-black uppercase tracking-[0.2em] block">{pdf.name}</span>
                                          <span className="text-[9px] text-stone-400 uppercase tracking-widest block">{isPdf ? 'PDF Document' : 'Image File'}</span>
                                        </div>
                                      </div>
                                      <ArrowUpRight className="w-5 h-5 text-stone-300 group-hover:text-black transition-all z-10" />
                                      <div className="absolute inset-0 bg-stone-50 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                    </a>
                                  );
                                })}
                                {(!selectedPlaceForDetail.pdfs || selectedPlaceForDetail.pdfs.length === 0) && (
                                  <div className="p-12 border border-dashed border-stone-200 rounded-2xl text-center space-y-4">
                                    <Utensils className="w-8 h-8 text-stone-200 mx-auto" />
                                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">No digital menu available</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="aspect-[4/5] bg-stone-50 border border-stone-200 rounded-3xl relative overflow-hidden group">
                          <img 
                            src={selectedPlaceForDetail.image_url} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-1000 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
                              <Search className="w-8 h-8 text-white" />
                            </div>
                            <div className="space-y-2">
                              {isEditingDetail ? (
                                <>
                                  <input 
                                    type="text"
                                    value={editDetailForm.visual_archive_label || 'Visual Archive'}
                                    onChange={(e) => setEditDetailForm({ ...editDetailForm, visual_archive_label: e.target.value })}
                                    className="bg-transparent text-[10px] font-black uppercase tracking-[0.4em] text-black text-center w-full outline-none border-b border-black/20 focus:border-black"
                                  />
                                  <input 
                                    type="text"
                                    value={editDetailForm.visual_archive_description || 'Explore the visual identity of this establishment.'}
                                    onChange={(e) => setEditDetailForm({ ...editDetailForm, visual_archive_description: e.target.value })}
                                    className="bg-transparent text-xs font-medium text-black/60 italic text-center w-full outline-none border-b border-black/20 focus:border-black"
                                  />
                                </>
                              ) : (
                                <>
                                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-black">
                                    {selectedPlaceForDetail.visual_archive_label || 'Visual Archive'}
                                  </p>
                                  <p className="text-xs font-medium text-black/60 italic">
                                    {selectedPlaceForDetail.visual_archive_description || 'Explore the visual identity of this establishment.'}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Footer Action */}
                    <div className="pt-32 pb-20 text-center space-y-8">
                      <div className="w-px h-24 bg-stone-200 mx-auto" />
                      <button 
                        onClick={() => setSelectedPlaceForDetail(null)}
                        className="group inline-flex flex-col items-center gap-6"
                      >
                        <div className="w-20 h-20 bg-stone-50 border border-stone-200 rounded-full flex items-center justify-center group-hover:bg-black group-hover:border-black transition-all duration-500">
                          <ArrowLeft className="w-8 h-8 text-stone-400 group-hover:text-white transition-colors" />
                        </div>
                        {isEditingDetail ? (
                          <input 
                            type="text"
                            value={editDetailForm.back_to_map_label || 'Back to Map'}
                            onChange={(e) => setEditDetailForm({ ...editDetailForm, back_to_map_label: e.target.value })}
                            className="bg-transparent text-[10px] font-black uppercase tracking-[0.5em] text-stone-400 text-center w-full outline-none border-b border-stone-200 focus:border-black"
                          />
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-stone-400 group-hover:text-black transition-colors">
                            {selectedPlaceForDetail.back_to_map_label || 'Back to Map'}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Info & Actions */}
                  <div className="lg:col-span-4 space-y-12">
                    <div className="sticky top-10 space-y-12">
                      
                      {/* Quick Info */}
                      <div className="space-y-8 p-10 border border-stone-200 rounded-3xl bg-white">
                        <div className="space-y-2">
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.location_label || 'Location'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, location_label: e.target.value })}
                              className="bg-transparent text-[10px] font-black text-stone-400 uppercase tracking-widest w-full outline-none border-b border-stone-100 focus:border-black"
                            />
                          ) : (
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              {selectedPlaceForDetail.location_label || 'Location'}
                            </p>
                          )}
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.address || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, address: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm font-bold text-black outline-none focus:border-black transition-all"
                              placeholder="Full Address"
                            />
                          ) : (
                            <p className="text-sm font-bold text-black leading-relaxed">
                              {selectedPlaceForDetail.address || 'Address not provided'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.hours_label || 'Hours'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, hours_label: e.target.value })}
                              className="bg-transparent text-[10px] font-black text-stone-400 uppercase tracking-widest w-full outline-none border-b border-stone-100 focus:border-black"
                            />
                          ) : (
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              {selectedPlaceForDetail.hours_label || 'Hours'}
                            </p>
                          )}
                          {isEditingDetail ? (
                            <textarea 
                              value={editDetailForm.hours || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, hours: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm font-bold text-black outline-none focus:border-black transition-all resize-none"
                              rows={3}
                              placeholder="Mon-Sun: 10:00 - 22:00"
                            />
                          ) : (
                            <p className="text-sm font-bold text-black whitespace-pre-line leading-relaxed">
                              {selectedPlaceForDetail.hours || 'Mon-Sun: 10:00 - 22:00'}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.contact_label || 'Contact'}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, contact_label: e.target.value })}
                              className="bg-transparent text-[10px] font-black text-stone-400 uppercase tracking-widest w-full outline-none border-b border-stone-100 focus:border-black"
                            />
                          ) : (
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                              {selectedPlaceForDetail.contact_label || 'Contact'}
                            </p>
                          )}
                          {isEditingDetail ? (
                            <input 
                              type="text"
                              value={editDetailForm.website_url || ''}
                              onChange={(e) => setEditDetailForm({ ...editDetailForm, website_url: e.target.value })}
                              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm font-bold text-black outline-none focus:border-black transition-all"
                              placeholder="https://website.com"
                            />
                          ) : (
                            <a href={selectedPlaceForDetail.website_url} target="_blank" className="text-sm font-bold text-black hover:underline block truncate">
                              {selectedPlaceForDetail.website_url?.replace('https://', '') || 'Official Website'}
                            </a>
                          )}
                        </div>
                        
                        {!isEditingDetail && (
                          <div className="pt-8 border-t border-stone-100 space-y-4">
                            <button className="w-full py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-stone-800 transition-colors rounded-xl">
                              Book Experience
                            </button>
                            <button 
                              onClick={() => {
                                handlePlaceViewOnMap({ lat: selectedPlaceForDetail.lat, lng: selectedPlaceForDetail.lng });
                              }}
                              className="w-full py-5 bg-white border border-black text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 rounded-xl"
                            >
                              <Navigation className="w-4 h-4" />
                              {detailViewOnMapLabel}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Map Preview */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4 px-1">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Mini Map</p>
                            <p className="text-xs text-stone-500 mt-1">{detailMiniMapLabel}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePlaceViewOnMap({ lat: selectedPlaceForDetail.lat, lng: selectedPlaceForDetail.lng })}
                            className="text-[10px] font-black uppercase tracking-[0.25em] text-black hover:text-stone-500 transition-colors"
                          >
                            {detailViewOnMapLabel}
                          </button>
                        </div>
                        <DetailMiniMap
                          lat={selectedPlaceForDetail.lat}
                          lng={selectedPlaceForDetail.lng}
                          name={selectedPlaceForDetail.name}
                          onOpenMap={() => handlePlaceViewOnMap({ lat: selectedPlaceForDetail.lat, lng: selectedPlaceForDetail.lng })}
                        />
                      </div>

                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Config Check Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-stone-100 rounded-[2.5rem]"
            >
              <div className="p-10 border-b border-stone-100 flex items-center justify-between">
                <h2 className="text-2xl font-serif font-light text-stone-900 tracking-tight">Supabase Config</h2>
                <button 
                  onClick={() => setShowConfigModal(false)}
                  className="p-3 hover:bg-stone-50 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-stone-900" />
                </button>
              </div>
              
              <div className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] px-1">Supabase URL</label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-5 bg-stone-50 border border-stone-100 font-mono text-xs break-all text-stone-600 rounded-2xl">
                        {import.meta.env.VITE_SUPABASE_URL || 'MISSING'}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(import.meta.env.VITE_SUPABASE_URL || '');
                          showToast('URLをコピーしました', "success");
                        }}
                        className="p-5 bg-stone-900 text-white hover:bg-black transition-all rounded-2xl active:scale-95"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] px-1">Anon Key (Publishable)</label>
                    <div className="p-5 bg-stone-50 border border-stone-100 font-mono text-xs break-all text-stone-600 rounded-2xl">
                      {import.meta.env.VITE_SUPABASE_ANON_KEY ? 
                        (import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + '...' + import.meta.env.VITE_SUPABASE_ANON_KEY.substring(import.meta.env.VITE_SUPABASE_ANON_KEY.length - 10)) : 
                        'MISSING'}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-stone-50 border border-stone-100 flex gap-4 rounded-2xl">
                  <Info className="w-5 h-5 text-stone-900 shrink-0" />
                  <div className="text-[10px] text-stone-600 leading-relaxed font-medium uppercase tracking-widest">
                    URLは "https://[PROJECT_ID].supabase.co"、<br/>
                    Keyは "eyJ..." で始まる長い文字列である必要があります。
                  </div>
                </div>
              </div>
              
              <div className="p-10 bg-white border-t border-stone-100">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="w-full py-6 bg-stone-900 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black transition-all rounded-2xl active:scale-95 shadow-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SQL Setup Modal */}
      <AnimatePresence>
        {showSqlModal && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-stone-100 rounded-[2.5rem]"
            >
              <div className="p-10 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-serif font-light text-stone-900 tracking-tight">Supabase SQL Setup</h2>
                  <p className="text-[10px] text-stone-400 mt-2 uppercase tracking-[0.3em] font-black">Paste this into Supabase SQL Editor</p>
                </div>
                <button 
                  onClick={() => setShowSqlModal(false)}
                  className="p-3 hover:bg-stone-50 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-stone-900" />
                </button>
              </div>
              
              <div className="p-10 overflow-y-auto bg-stone-50 no-scrollbar">
                <div className="bg-stone-900 p-10 relative group rounded-3xl overflow-hidden">
                  <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`-- 1. 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. プロフィールテーブルの作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. スポットテーブルの作成
CREATE TABLE IF NOT EXISTS admin_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  milz_experience TEXT,
  category TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country TEXT,
  prefecture TEXT,
  municipality TEXT,
  address TEXT,
  website_url TEXT,
  image_url TEXT,
  images TEXT[],
  videos TEXT[],
  pdfs JSONB,
  rating DOUBLE PRECISION DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. お気に入りテーブルの作成
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  place_id UUID REFERENCES admin_places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- 5. RLSの有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 6. ポリシーの作成 (profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. ポリシーの作成 (admin_places)
DROP POLICY IF EXISTS "Allow public read access" ON admin_places;
CREATE POLICY "Allow public read access" ON admin_places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON admin_places;
CREATE POLICY "Allow authenticated insert" ON admin_places FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to update" ON admin_places;
CREATE POLICY "Allow admins to update" ON admin_places FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to delete" ON admin_places;
CREATE POLICY "Allow admins to delete" ON admin_places FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

-- 8. ポリシーの作成 (favorites)
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);`}
                  </pre>
                  <button
                    onClick={() => {
                      const text = `-- 1. 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. プロフィールテーブルの作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. スポットテーブルの作成
CREATE TABLE IF NOT EXISTS admin_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  detailed_description TEXT,
  milz_experience TEXT,
  category TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  country TEXT,
  prefecture TEXT,
  municipality TEXT,
  address TEXT,
  website_url TEXT,
  image_url TEXT,
  images TEXT[],
  videos TEXT[],
  pdfs JSONB,
  rating DOUBLE PRECISION DEFAULT 4.5,
  review_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. お気に入りテーブルの作成
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  place_id UUID REFERENCES admin_places(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

-- 5. RLSの有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 6. ポリシーの作成 (profiles)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 7. ポリシーの作成 (admin_places)
DROP POLICY IF EXISTS "Allow public read access" ON admin_places;
CREATE POLICY "Allow public read access" ON admin_places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON admin_places;
CREATE POLICY "Allow authenticated insert" ON admin_places FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to update" ON admin_places;
CREATE POLICY "Allow admins to update" ON admin_places FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

DROP POLICY IF EXISTS "Allow admins to delete" ON admin_places;
CREATE POLICY "Allow admins to delete" ON admin_places FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
  OR auth.uid() = created_by
);

-- 8. ポリシーの作成 (favorites)
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);`;
                      navigator.clipboard.writeText(text).then(() => {
                        showToast('コピーしました！', "success");
                      }).catch(() => {
                        showToast('コピーに失敗しました。', "error");
                      });
                    }}
                    className="absolute top-4 right-4 p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[10px] font-bold uppercase tracking-widest transition-colors opacity-0 group-hover:opacity-100 rounded-lg"
                  >
                    Copy
                  </button>
                </div>

                <div className="mt-4 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-xs text-emerald-800 leading-relaxed">
                      <p className="font-black uppercase tracking-tight mb-1">Recommended Test Accounts</p>
                      <p>SupabaseのAuthenticationメニューから、以下のユーザーを作成しておくとスムーズです：</p>
                      <ul className="list-disc list-inside mt-1 font-mono">
                        <li>Admin: masashi@milz.tech (PW: password123)</li>
                        <li>User: user@example.com (PW: password123)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="text-xs text-amber-800 leading-relaxed">
                      <p className="font-black uppercase tracking-tight mb-1">Important Note</p>
                      <p>もし既にテーブルを作成済みの場合は、一度テーブルを削除（DROP TABLE admin_places;）してから再実行するか、不足しているカラムを追加してください。</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-8 bg-white border-t border-stone-200">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="w-full py-6 bg-stone-900 text-white font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black transition-all rounded-2xl active:scale-95 shadow-xl"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* AI Recommendation Detail Modal */}
        {selectedAiRecommendation && (
          <div className="fixed inset-0 z-[3100] bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="w-full max-w-2xl rounded-[2rem] bg-white border border-stone-100 shadow-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.28em] text-stone-400">AI Recommendation</div>
                  <h3 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-black">{selectedAiRecommendation.name}</h3>
                  <div className="mt-3 inline-flex rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-stone-500">{selectedAiRecommendation.category}</div>
                </div>
                <button
                  onClick={() => setSelectedAiRecommendation(null)}
                  className="p-3 rounded-full border border-stone-200 text-stone-500 hover:text-black hover:border-black transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {selectedAiRecommendationVisual?.imageUrl && (
                  <div className="relative overflow-hidden rounded-[1.75rem] border border-stone-100 bg-stone-50 aspect-[16/10]">
                    <img
                      src={selectedAiRecommendationVisual.imageUrl}
                      alt={selectedAiRecommendation.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/88 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-stone-500 backdrop-blur-sm">
                      {selectedAiRecommendationVisual.source === 'place' ? 'MILZ SPOT' : 'MILZ AI CARD'}
                    </div>
                  </div>
                )}
                <p className="text-base md:text-lg font-semibold text-stone-700 leading-relaxed">{selectedAiRecommendation.reason}</p>
                <div className="rounded-[1.5rem] border border-stone-100 bg-stone-50 p-5 md:p-6 text-sm md:text-[15px] leading-relaxed text-stone-600 whitespace-pre-line">
                  {selectedAiRecommendation.details || selectedAiRecommendation.reason}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleAiViewOnMap(selectedAiRecommendation)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-[0.22em]"
                >
                  <MapPin className="w-4 h-4" />
                  {t('viewOnMap')}
                </button>
                <button
                  onClick={() => handleSaveAiRecommendation(selectedAiRecommendation)}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-3 rounded-full border text-[10px] font-black uppercase tracking-[0.22em] transition-all",
                    isAiRecommendationSaved(selectedAiRecommendation)
                      ? "border-rose-200 bg-rose-50 text-rose-500"
                      : "border-stone-300 text-stone-700 hover:border-black hover:text-black"
                  )}
                >
                  <Heart className={cn("w-4 h-4", isAiRecommendationSaved(selectedAiRecommendation) && "fill-current")} />
                  {isAiRecommendationSaved(selectedAiRecommendation)
                    ? (locale === 'jp' ? 'AI保存済み' : 'AI Saved')
                    : t('saveAi')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[3000] px-10 py-5 shadow-2xl flex items-center gap-4 min-w-[320px] border border-stone-800 rounded-full"
            style={{
              backgroundColor: '#1c1917',
              color: 'white'
            }}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-stone-400" />}
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">{toast.message}</span>
          </motion.div>
        )}

        {/* Custom Confirm Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 backdrop-blur-sm bg-black/60">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white w-full max-w-sm shadow-2xl overflow-hidden border border-stone-100 rounded-[2.5rem]"
            >
              <div className="p-12 text-center space-y-8">
                <div className="w-24 h-24 bg-stone-50 border border-stone-100 flex items-center justify-center mx-auto rounded-full">
                  <AlertCircle className="w-12 h-12 text-stone-900" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-serif font-light text-stone-900 tracking-tight">{confirmModal.title}</h3>
                  <p className="text-[10px] text-stone-400 leading-relaxed font-black uppercase tracking-widest">{confirmModal.message}</p>
                </div>
              </div>
              <div className="p-10 bg-white flex gap-4 border-t border-stone-100">
                <button
                  onClick={() => {
                    if (confirmModal.onCancel) confirmModal.onCancel();
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-6 bg-stone-50 text-stone-900 font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-stone-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-6 bg-stone-900 text-white font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
