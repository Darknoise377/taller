/**
 * Mercado Libre Colombia title sanitization & formatting utilities.
 * Pure functions: safe for both client and server components.
 */

export const MELI_FORBIDDEN_WORDS = /\b(oferta|descuento|gratis|promo|rebaja|sale|%off|envio gratis)\b/gi;

/** Removes prohibited words, URLs, phone numbers, email addresses, and prices. Max 60 chars. */
export function sanitizeTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\S+@\S+\.\S+/g, '')
    .replace(/\b\d[\d\s\-().]{6,}\d\b/g, '')
    .replace(MELI_FORBIDDEN_WORDS, '')
    .replace(/\$[\d.,]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .trimEnd();
}

/** Formats combo title for MeLi: ensures "Kit" or "Combo" prefix, cleans prohibited words, max 60 chars */
export function sanitizeComboTitle(raw: string): string {
  if (!raw) return '';
  let cleaned = sanitizeTitle(raw);
  if (!/^kit\b/i.test(cleaned) && !/^combo\b/i.test(cleaned)) {
    cleaned = `Kit ${cleaned}`;
  }
  return cleaned.slice(0, 60).trim();
}

/** Checks whether a title has prohibited promotional words */
export function hasForbiddenWords(text: string): boolean {
  if (!text) return false;
  return /\b(oferta|descuento|gratis|promo|rebaja|sale|%off|envio gratis)\b/i.test(text);
}
