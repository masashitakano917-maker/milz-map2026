export function parseUrlList(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isLikelyImageUrl(url?: string | null): boolean {
  const value = (url || '').trim().toLowerCase();
  if (!value) return false;
  return (
    /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(value) ||
    value.startsWith('data:image/') ||
    value.includes('/images/') ||
    value.includes('imagekit') ||
    value.includes('imgix') ||
    value.includes('cloudinary')
  );
}
