"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { makeProductPlaceholder } from "@/lib/placeholder";

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
    <div className="mt-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch(input)}
            placeholder="Escribe modelo, por ejemplo: CR5, NKD, MAWI..."
            className="w-full rounded-full px-6 py-4 border border-slate-200 shadow-sm focus:outline-none"
          />
          <button
            aria-label="Buscar"
            onClick={() => doSearch(input)}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#0A2A66] text-white px-4 py-2 rounded-full"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-3">
          {filtered.map((s) => (
            <button
              key={s}
              onClick={() => doSearch(s)}
              className="flex flex-col items-center gap-2 text-xs"
              aria-label={`Buscar ${s}`}
            >
              <Image src={makeProductPlaceholder(s)} alt={s} width={64} height={64} className="w-16 h-16 rounded-md object-cover" unoptimized />
              <span className="truncate max-w-[72px] text-center">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
