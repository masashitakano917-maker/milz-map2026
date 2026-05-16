import { extractYouTubeVideoId } from './youtube';
import { parseUrlList } from './url';

export function isLikelyVideoUrl(url?: string | null): boolean {
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

export function preferPlayableVideoUrls(urls: string[]): string[] {
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

export function normalizeStoredVideoUrlList(raw?: string | null): string[] {
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
