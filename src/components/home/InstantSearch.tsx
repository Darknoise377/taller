'use client';

import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { HomeSearchCatalogItem } from '@/lib/seo/searchSuggestions';
import { makeProductPlaceholder } from '@/lib/placeholder';

interface InstantSearchProps {
  products: HomeSearchCatalogItem[];
}

interface SearchResult {
  item: HomeSearchCatalogItem;
  score?: number;
}

const MAX_RESULTS = 8;
const MAX_RECENT = 5;

export default function InstantSearch({ products }: InstantSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ar-recent-searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Fuse.js index
  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: 'name', weight: 0.5 },
        { name: 'category', weight: 0.2 },
        { name: 'brand', weight: 0.2 },
        { name: 'tags', weight: 0.1 },
      ],
      threshold: 0.35,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [products]);

  // Search results
  const results: SearchResult[] = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];
    return fuse.search(query).slice(0, MAX_RESULTS);
  }, [fuse, query]);

  // Popular terms (pre-computed)
  const popularTerms = useMemo(() => {
    const terms = new Set<string>();
    products.slice(0, 50).forEach((p) => {
      if (p.brand) terms.add(p.brand.toLowerCase());
      if (p.category) terms.add(p.category.replace(/_/g, ' '));
    });
    return Array.from(terms).slice(0, 8);
  }, [products]);

  const showDropdown = isFocused && (query.length >= 2 || recentSearches.length > 0);

  const doSearch = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    // Save to recent searches
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    try { localStorage.setItem('ar-recent-searches', JSON.stringify(updated)); } catch { /* ignore */ }

    // Analytics
    fetch('/api/analytics/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trimmed }),
    }).catch(() => {});

    setQuery('');
    setIsFocused(false);
    router.push(`/products?q=${encodeURIComponent(trimmed)}`);
  }, [recentSearches, router]);

  const goToProduct = useCallback((slug: string | undefined, id: string) => {
    setQuery('');
    setIsFocused(false);
    router.push(`/products/${slug ?? id}`);
  }, [router]);

  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    try { localStorage.removeItem('ar-recent-searches'); } catch { /* ignore */ }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (results.length > 0 && query.length >= 2) {
        doSearch(query);
      } else {
        doSearch(query);
      }
    }
    if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-white/40 pointer-events-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Busca por modelo, repuesto o marca: CR5, NKD, frenos..."
          className={`w-full rounded-2xl pl-12 pr-14 py-4 bg-white dark:bg-white/10 backdrop-blur-md border-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 text-sm sm:text-base focus:outline-none transition-all duration-300 ${
            isFocused
              ? 'border-[#0A2A66] dark:border-[#5B9BD5] shadow-lg shadow-[#0A2A66]/10 dark:shadow-[#5B9BD5]/10'
              : 'border-slate-200 dark:border-white/15 shadow-md'
          }`}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="instant-search-results"
          aria-label="Buscar productos"
        />

        {/* Clear / Search button */}
        {query ? (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => doSearch(query)}
          aria-label="Buscar"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0A2A66] dark:bg-[#2E5FA7] text-white p-2.5 rounded-xl hover:bg-[#081F4D] dark:hover:bg-[#5B9BD5] transition-colors shadow-sm"
        >
          <MagnifyingGlassIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            id="instant-search-results"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto"
            role="listbox"
          >
            {/* Product results */}
            {results.length > 0 && (
              <div className="p-2">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Productos
                </p>
                {results.map(({ item }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToProduct(item.slug, item.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
                    role="option"
                  >
                    <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <Image
                        src={item.image || makeProductPlaceholder(item.name, item.id)}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate group-hover:text-[#0A2A66] dark:group-hover:text-[#5B9BD5] transition-colors">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-[#0A2A66] dark:text-[#5B9BD5]">
                          ${item.price?.toLocaleString('es-CO')}
                        </span>
                        {item.brand && (
                          <span className="text-[10px] text-slate-400 capitalize">
                            {item.brand}
                          </span>
                        )}
                        {item.category && (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded capitalize">
                            {item.category.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Search all link */}
                <button
                  type="button"
                  onClick={() => doSearch(query)}
                  className="w-full px-3 py-3 mt-1 text-sm font-semibold text-[#2E5FA7] dark:text-[#5B9BD5] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-center"
                >
                  Ver todos los resultados para &quot;{query}&quot; →
                </button>
              </div>
            )}

            {/* No results */}
            {query.length >= 2 && results.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No se encontraron productos para &quot;{query}&quot;
                </p>
                <button
                  type="button"
                  onClick={() => doSearch(query)}
                  className="mt-2 text-sm font-medium text-[#2E5FA7] hover:underline"
                >
                  Buscar en todo el catálogo →
                </button>
              </div>
            )}

            {/* Recent searches */}
            {query.length < 2 && recentSearches.length > 0 && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5" />
                    Búsquedas recientes
                  </p>
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => doSearch(term)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <ClockIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{term}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular terms */}
            {query.length < 2 && (
              <div className="p-2">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                  Popular
                </p>
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {popularTerms.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => doSearch(term)}
                      className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-[#0A2A66]/10 hover:text-[#0A2A66] dark:hover:bg-[#2E5FA7]/20 dark:hover:text-[#5B9BD5] transition-colors capitalize"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
