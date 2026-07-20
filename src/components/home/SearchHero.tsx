'use client';

import { useState, useEffect, useRef } from 'react';
import InstantSearch from '@/components/home/InstantSearch';
import QuickFilters from '@/components/home/QuickFilters';
import {
  TruckIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import type { HomeSearchCatalogItem } from '@/lib/seo/searchSuggestions';

interface SearchHeroProps {
  searchCatalog: HomeSearchCatalogItem[];
  onFilterChange: (filters: string[]) => void;
  activeFilters?: string[];
}

export default function SearchHero({ searchCatalog, onFilterChange, activeFilters = [] }: SearchHeroProps) {
  const [showStickyBar, setShowStickyBar] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* ─── Main Hero (in-flow, not sticky) ─── */}
      <section
        ref={sectionRef}
        className="relative bg-gradient-to-b from-slate-50 to-white dark:from-[#060D1F] dark:to-[#0A1530] py-8 md:py-12"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Encuentra el repuesto exacto
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A2A66] to-[#5B9BD5] dark:from-[#5B9BD5] dark:to-[#8FA8CC]">
                para tu moto
              </span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Más de 5.000 referencias disponibles. Stock real y despachos inmediatos.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <InstantSearch products={searchCatalog} />
          </div>

          {/* Filtros rápidos debajo del buscador */}
          <div className="mt-4 max-w-4xl mx-auto">
            <QuickFilters onFilterChange={onFilterChange} activeFilters={activeFilters} />
          </div>

          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl mx-auto">
            {[
              { icon: <TruckIcon className="w-4 h-4" />, text: 'Envío a toda Colombia' },
              { icon: <ShieldCheckIcon className="w-4 h-4" />, text: 'Garantía incluida' },
              { icon: <LockClosedIcon className="w-4 h-4" />, text: 'Pago 100% seguro' },
              { icon: <StarIcon className="w-4 h-4" />, text: '10+ años' },
            ].map(({ icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                <span className="text-[#2E5FA7] dark:text-[#5B9BD5] shrink-0">{icon}</span>
                <span className="truncate">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Sticky Search Bar (fixed, appears when hero scrolls out) ─── */}
      <div
        className={`fixed top-[64px] left-0 right-0 z-40 bg-white/95 dark:bg-[#060D1F]/95 backdrop-blur-md shadow-lg border-b border-slate-200/50 dark:border-slate-800/50 py-3 transition-transform duration-300 ${
          showStickyBar ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!showStickyBar}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <InstantSearch products={searchCatalog} />
          <div className="mt-2">
            <QuickFilters onFilterChange={onFilterChange} activeFilters={activeFilters} />
          </div>
        </div>
      </div>
    </>
  );
}
