"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type MinimalProduct = { id: string; name: string; description?: string };

export default function HomeSearch() {
  const [products, setProducts] = useState<MinimalProduct[]>([]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) return;
        // The API may return either an array of products (legacy) or an
        // object { items, total, page, limit }. Support both shapes.
        const json = await res.json();
        const data: MinimalProduct[] = Array.isArray(json) ? json : json?.items ?? [];
        if (!mounted) return;
        setProducts(data);
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const counts = new Map<string, number>();
    const stopwords = new Set([
      "para",
      "de",
      "y",
      "con",
      "en",
      "a",
      "el",
      "la",
      "los",
      "las",
      "del",
      "por",
      "repuesto",
      "kit",
      "original",
      "nuevo",
      "usado",
      "marca",
      "medida",
    ]);

    products.forEach((p) => {
      const text = `${p.name} ${p.description || ""}`.toLowerCase();
      const tokens = text.match(/[a-z0-9áéíóúñü]+/gi) || [];
      tokens.forEach((t) => {
        if (t.length < 2) return;
        if (stopwords.has(t)) return;
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });

    const top = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 24);
    setSuggestions(top);
  }, [products]);

  const filtered = useMemo(() => {
    if (!input) return suggestions.slice(0, 16);
    return suggestions.filter((s) => s.includes(input.toLowerCase())).slice(0, 16);
  }, [suggestions, input]);

  const doSearch = (q: string) => {
    if (!q) return;
    router.push(`/products?model=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      <div className="max-w-4xl mx-auto">
        {/* Input con diseño glass oscuro para el hero */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(input)}
            placeholder="Busca por modelo o repuesto: CR5, NKD, frenos..."
            className="w-full rounded-2xl pl-11 pr-14 py-3.5 bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-all"
          />
          <button
            aria-label="Buscar"
            onClick={() => doSearch(input)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white text-[#0A2A66] p-2 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Pills de búsquedas populares */}
        {filtered.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-white/35 text-[11px] font-medium self-center shrink-0">Popular:</span>
            {filtered.slice(0, 14).map((s) => (
              <button
                key={s}
                onClick={() => doSearch(s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white/65 text-[11px] font-medium hover:bg-white/20 hover:text-white hover:border-white/30 transition-all duration-200 capitalize"
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
