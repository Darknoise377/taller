import { getBaseUrl } from '@/lib/site';

export function absoluteUrl(path: string): string {
  const base = getBaseUrl();
  if (path.startsWith('http')) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function toAbsoluteImageUrl(
  src: string | null | undefined,
  baseUrl = getBaseUrl(),
): string {
  if (!src) return absoluteUrl('/icon.svg');
  if (src.startsWith('http')) return src;
  return `${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`;
}
