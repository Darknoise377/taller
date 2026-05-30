'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  buildPopularSearchTerms,
  type HomeSearchCatalogItem,
} from '@/lib/seo/searchSuggestions';

type HomeSearchProps = {
  /** Precargado en el servidor; evita fetch a /api/products en el cliente. */
  products: HomeSearchCatalogItem[];
};

export default function HomeSearch({ products }: HomeSearchProps) {
  const [input, setInput] = useState('');
  const router = useRouter();

  const suggestions = useMemo(() => buildPopularSearchTerms(products), [products]);

  const filtered = useMemo(() => {
    if (!input) return suggestions.slice(0, 16);
    const needle = input.toLowerCase();
    return suggestions.filter((s) => s.includes(needle)).slice(0, 16);
  }, [suggestions, input]);

  const doSearch = (q: string) => {
    const query = q.trim();
    if (!query) return;
    router.push(`/products?q=${encodeURIComponent(query)}`);
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-white/40 pointer-events-none" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch(input)}
            placeholder="Busca por modelo o repuesto: CR5, NKD, frenos..."
            className="w-full rounded-2xl pl-11 pr-14 py-3.5 bg-white/80 dark:bg-white/10 backdrop-blur-md border border-slate-200/80 dark:border-white/20 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2A66]/30 dark:focus:ring-white/30 focus:bg-white dark:focus:bg-white/15 transition-all"
          />
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => doSearch(input)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#0A2A66] dark:bg-white text-white dark:text-[#0A2A66] p-2 rounded-xl hover:bg-[#081F4D] dark:hover:bg-slate-100 transition-colors shadow-sm"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-slate-500 dark:text-white/35 text-[11px] font-medium self-center shrink-0">
              Popular:
            </span>
            {filtered.slice(0, 14).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => doSearch(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/75 dark:bg-white/10 border border-slate-200/90 dark:border-white/15 text-slate-700 dark:text-white/65 text-[11px] font-medium hover:bg-white dark:hover:bg-white/20 hover:text-[#0A2A66] dark:hover:text-white hover:border-[#2E5FA7]/30 dark:hover:border-white/30 transition-all duration-200 capitalize"
                aria-label={`Buscar ${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
