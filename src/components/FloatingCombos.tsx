"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ComboCard from "@/components/ComboCard";
import Link from 'next/link';
import type { Combo } from "@/types/combo";
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface FloatingCombosProps {
  excludeProductId?: string | null;
  initialFilter?: "most_sold" | "max_savings" | "low_stock" | "featured";
  limit?: number;
}

export default function FloatingCombos({ excludeProductId, initialFilter = "most_sold", limit = 12 }: FloatingCombosProps) {
  const [open, setOpen] = useState(false);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [filter, setFilter] = useState<typeof initialFilter>(initialFilter);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/combos?limit=${limit}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Combo[];
        if (cancelled) return;
        // Excluir combos que contengan el producto actual (si aplica)
        const filtered = data.filter((c) => {
          if (!excludeProductId) return true;
          return !c.items.some((it) => String(it.productId) === String(excludeProductId) || it.product?.id === excludeProductId);
        });
        setCombos(filtered);
      } catch (err) {
        console.error("[FloatingCombos] error loading combos", err);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [excludeProductId, limit]);

  const sorted = useMemo(() => {
    if (!combos) return [] as Combo[];
    const copy = [...combos];
    switch (filter) {
      case "most_sold":
        return copy.sort((a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0));
      case "max_savings":
        return copy.sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price));
      case "low_stock":
        return copy.sort((a, b) => (a.stock ?? 9999) - (b.stock ?? 9999));
      case "featured":
        return copy.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
      default:
        return copy;
    }
  }, [combos, filter]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf = 0;
    const update = () => {
      const first = scroller.firstElementChild as HTMLElement | null;
      if (!first) return;
      const childWidth = first.offsetWidth + parseFloat(getComputedStyle(first).marginRight || '0');
      const idx = Math.round(scroller.scrollLeft / childWidth);
      setCurrentIndex(Math.max(0, Math.min(idx, sorted.length - 1)));
    };

    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(scroller);

    // initial update
    update();

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sorted.length]);

  const scrollToIndex = (index: number) => {
    const s = scrollerRef.current; if (!s) return;
    const first = s.firstElementChild as HTMLElement | null;
    if (!first) return;
    const childWidth = first.offsetWidth + parseFloat(getComputedStyle(first).marginRight || '0');
    const left = Math.max(0, Math.min(index, sorted.length - 1)) * childWidth;
    s.scrollTo({ left, behavior: 'smooth' });
  };

  const handlePrev = () => {
    const s = scrollerRef.current; if (!s) return; s.scrollBy({ left: -s.clientWidth * 0.7, behavior: 'smooth' });
  };
  const handleNext = () => {
    const s = scrollerRef.current; if (!s) return; s.scrollBy({ left: s.clientWidth * 0.7, behavior: 'smooth' });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 bottom-32 z-50 inline-flex items-center gap-2 rounded-full bg-[#0A2A66] text-white px-3 py-2 shadow-2xl hover:scale-[1.02] transition"
      >
        <SparklesIcon className="w-4 h-4" />
        <span className="text-sm font-semibold">Ver combos</span>
      </button>

      <aside
        className={`fixed right-4 z-50 transition-all duration-300 ${open ? "bottom-36 opacity-100 pointer-events-auto" : "bottom-24 opacity-0 pointer-events-none"}`}
      >
        <div className="w-[min(96vw,88rem)] md:w-[36rem] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-bold text-slate-900 dark:text-white">Combos recomendados</p>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                <FilterButton active={filter === 'most_sold'} onClick={() => setFilter('most_sold')}>Más vendido</FilterButton>
                <FilterButton active={filter === 'max_savings'} onClick={() => setFilter('max_savings')}>Mayor ahorro</FilterButton>
                <FilterButton active={filter === 'low_stock'} onClick={() => setFilter('low_stock')}>Últimas unidades</FilterButton>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                aria-label="Cerrar panel de combos"
              >
                ×
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden sm:block">
              <button onClick={handlePrev} aria-label="Anterior" className="p-2 rounded-full bg-white text-slate-700 shadow">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-hidden">
              <div ref={scrollerRef} className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2">
                {sorted.map((c, i) => (
                  <div key={c.id} className="snap-start w-[18rem] flex-shrink-0">
                    <ComboCard combo={c} idx={i} />
                  </div>
                ))}
              </div>
            </div>
            {/* Dots / indicators */}
            <div className="mt-2 flex items-center gap-2 justify-center">
              {sorted.map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  aria-label={`Ir al combo ${i + 1}`}
                  onClick={() => scrollToIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentIndex ? 'bg-[#0A2A66] scale-110' : 'bg-slate-300'}`}
                />
              ))}
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden sm:block">
              <button onClick={handleNext} aria-label="Siguiente" className="p-2 rounded-full bg-white text-slate-700 shadow">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link href="/combos" className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">Ver catálogo de combos</Link>
            <span className="text-xs text-slate-500">{combos.length} disponibles</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function FilterButton({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1 rounded-full font-semibold transition ${active ? 'bg-[#0A2A66] text-white' : 'text-slate-600 hover:bg-white/60'}`}
    >
      {children}
    </button>
  );
}
