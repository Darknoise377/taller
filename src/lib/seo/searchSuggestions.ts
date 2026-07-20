export type HomeSearchCatalogItem = {
  id: string;
  name: string;
  description: string;
  slug?: string;
  image?: string;
  price?: number;
  category?: string;
  brand?: string;
  tags?: string[];
};

const STOPWORDS = new Set([
  'para', 'de', 'y', 'con', 'en', 'a', 'el', 'la', 'los', 'las', 'del', 'por',
  'repuesto', 'kit', 'original', 'nuevo', 'usado', 'marca', 'medida', 'un', 'su',
  'este', 'esa', 'ese', 'eso', 'muy', 'como', 'más', 'pero', 'sus', 'fue', 'han',
]);

/** Builds popular search terms from product names/descriptions (for home search pills). */
export function buildPopularSearchTerms(
  products: Pick<HomeSearchCatalogItem, 'name' | 'description'>[],
  limit = 24,
): string[] {
  const counts = new Map<string, number>();

  for (const p of products) {
    const text = `${p.name} ${p.description || ''}`.toLowerCase();
    const tokens = text.match(/[a-z0-9áéíóúñü]+/gi) ?? [];
    for (const token of tokens) {
      if (token.length < 2 || STOPWORDS.has(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, limit);
}
