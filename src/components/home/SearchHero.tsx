'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import InstantSearch from '@/components/home/InstantSearch';
import QuickFilters from '@/components/home/QuickFilters';
import {
  TruckIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  SparklesIcon,
  GiftIcon,
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import type { HomeSearchCatalogItem } from '@/lib/seo/searchSuggestions';

interface SearchHeroProps {
  searchCatalog: HomeSearchCatalogItem[];
  onFilterChange: (filters: string[]) => void;
  activeFilters?: string[];
}

export default function SearchHero({
  searchCatalog,
  onFilterChange,
  activeFilters = [],
}: SearchHeroProps) {
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
      {/* ─── Hero Principal: Navidad Sobre Ruedas · Motoservicio A&R ─── */}
      <section
        ref={sectionRef}
        className="relative overflow-hidden bg-[#07122E] text-white pt-8 pb-12 sm:pt-12 sm:pb-16 border-b border-[#D6B46A]/25"
      >
        {/* Fondo fotográfico automotor cinematográfico con tratamiento nocturno */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <Image
            src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1600&auto=format&fit=crop&q=85"
            alt="Motoservicio A&R - Navidad Sobre Ruedas"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center md:object-right opacity-30 md:opacity-40 mix-blend-luminosity scale-105"
          />

          {/* Gradientes cinematográficos para contraste y jerarquía editorial */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#07122E] via-[#07122E]/90 to-[#07122E]/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07122E] via-transparent to-[#07122E]/80" />

          {/* Iluminación ambiental cálida (Azul Noche, Verde Pino & Oro Champán) */}
          <div className="absolute -top-24 right-1/4 w-[500px] h-[500px] bg-[#173D32]/35 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-12 w-[420px] h-[420px] bg-[#D6B46A]/12 rounded-full blur-3xl" />

          {/* Línea dorada superior de orfebrería festiva */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D6B46A]/60 to-transparent" />
        </div>

        {/* Contenido Editorial y Comercial */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Badge Oficial de Campaña */}
          <div className="flex justify-center md:justify-start">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#173D32]/85 border border-[#D6B46A]/45 shadow-[0_2px_12px_rgba(214,180,106,0.2)] backdrop-blur-md mb-5">
              <span className="w-2 h-2 rounded-full bg-[#D6B46A] animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#F5F1E8]">
                Campaña Navideña · Motoservicio A&amp;R
              </span>
            </div>
          </div>

          {/* Titular de Gran Impacto */}
          <div className="text-center md:text-left mb-6 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12]">
              Esta Navidad, tu moto en su{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D6B46A] via-[#FDF3D7] to-[#D6B46A] drop-shadow-sm">
                máxima potencia
              </span>
            </h1>

            <p className="mt-3.5 text-sm sm:text-base md:text-lg text-[#F5F1E8]/85 max-w-2xl leading-relaxed">
              Repuestos originales certificados, servicio técnico de precisión y combos especiales de mantenimiento con regalo sorpresa. Despachos rápidos y garantizados a toda Colombia.
            </p>

            {/* Accesos Rápidos de Conversión Directa */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
              <a
                href="#combos"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D6B46A] to-[#C49E4F] text-[#07122E] font-extrabold text-xs sm:text-sm shadow-[0_4px_20px_rgba(214,180,106,0.35)] hover:shadow-[0_6px_28px_rgba(214,180,106,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <GiftIcon className="w-4 h-4 text-[#07122E]" />
                Ver Combos con Regalo
              </a>
              <a
                href="#categorias"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#F5F1E8] font-semibold text-xs sm:text-sm border border-[#F5F1E8]/20 backdrop-blur-md transition-all active:scale-[0.98]"
              >
                <WrenchScrewdriverIcon className="w-4 h-4 text-[#D6B46A]" />
                Explorar por Categoría
              </a>
            </div>
          </div>

          {/* ── Caja Flotante de Búsqueda Escarchada de Lujo ── */}
          <div className="mt-8 rounded-2xl bg-white/95 dark:bg-[#10243B]/95 backdrop-blur-xl border border-[#D6B46A]/35 shadow-[0_12px_40px_rgba(7,18,46,0.4)] p-3.5 sm:p-5">
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-200/60 dark:border-white/10">
              <div className="flex items-center gap-2">
                <MagnifyingGlassIcon className="w-4 h-4 text-[#D6B46A]" />
                <span className="text-xs font-bold text-[#07122E] dark:text-[#F5F1E8]">
                  Buscador de Repuestos en Tiempo Real
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-[#D6B46A]/80 hidden sm:inline">
                Stock garantizado en La Ceja y envíos a Colombia
              </span>
            </div>

            <InstantSearch products={searchCatalog} />

            {/* Filtros rápidos debajo del buscador */}
            <div className="mt-3">
              <QuickFilters onFilterChange={onFilterChange} activeFilters={activeFilters} />
            </div>
          </div>

          {/* ── Propuestas de Valor (USPs) Automotrices Premium ── */}
          <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {[
              {
                icon: <TruckIcon className="w-4 h-4" />,
                title: 'Envíos a toda Colombia',
                desc: 'Despacho ágil y asegurado',
              },
              {
                icon: <ShieldCheckIcon className="w-4 h-4" />,
                title: 'Garantía Verificada',
                desc: 'Piezas originales y certificadas',
              },
              {
                icon: <LockClosedIcon className="w-4 h-4" />,
                title: 'Pago 100% Protegido',
                desc: 'Wompi, PSE y Contraentrega',
              },
              {
                icon: <CheckBadgeIcon className="w-4 h-4" />,
                title: 'Taller Especializado',
                desc: '+10 años en La Ceja, Antioquia',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-[#D6B46A]/20 backdrop-blur-sm text-left transition-colors hover:bg-white/10 hover:border-[#D6B46A]/40"
              >
                <span className="text-[#D6B46A] shrink-0 mt-0.5">{icon}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{title}</p>
                  <p className="text-[10px] text-[#F5F1E8]/60 truncate">{desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── Sticky Search Bar Compacta (Aparece al scrollear) ─── */}
      <div
        className={`fixed top-[58px] sm:top-[64px] left-0 right-0 z-40 bg-white/95 dark:bg-[#07122e]/95 backdrop-blur-md shadow-lg border-b border-[#D6B46A]/25 py-2 sm:py-3 transition-transform duration-300 ${
          showStickyBar ? 'translate-y-0' : '-translate-y-full'
        }`}
        aria-hidden={!showStickyBar}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          <InstantSearch products={searchCatalog} />
          {/* QuickFilters visibles en desktop, ocultos en móvil para no saturar altura */}
          <div className="mt-2 hidden sm:block">
            <QuickFilters onFilterChange={onFilterChange} activeFilters={activeFilters} />
          </div>
        </div>
      </div>
    </>
  );
}
