/** UUID v4 regex */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true when `str` is a valid UUID v4 string. */
export function isUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

/**
 * Converts a product name + id suffix into a URL-safe slug.
 * Strips diacritics, lowercases, replaces spaces/special chars with hyphens.
 * Appends a 6-char hex suffix derived from the product id for uniqueness.
 *
 * @example generateProductSlug("Filtro de Aceite Moto", "550e8400-e29b-41d4-a716-446655440000")
 *          → "filtro-de-aceite-moto-550e84"
 */
export function generateProductSlug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')                     // decompose accented chars (á → a + ́)
    .replace(/[\u0300-\u036f]/g, '')      // remove diacritic marks (á→a, ñ→n, etc.)
    .replace(/[^a-z0-9\s-]/g, '')        // keep only alphanumeric, spaces, hyphens
    .trim()
    .replace(/[\s_]+/g, '-')             // spaces/underscores → hyphens
    .replace(/-+/g, '-')                 // collapse multiple hyphens
    .slice(0, 60)                        // max 60 chars
    .replace(/-$/, '');                  // remove trailing hyphen

  const suffix = id.replace(/-/g, '').slice(0, 6).toLowerCase();
  return `${base}-${suffix}`;
}
