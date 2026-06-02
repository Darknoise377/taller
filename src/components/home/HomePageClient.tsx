"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CubeTransparentIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  TruckIcon,
  StarIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import type { CategoryItem } from "@/types/product";
import type { Product as ProductType } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/constants/productCategories";
import HomeSearch from '@/components/HomeSearch';
import type { HomeSearchCatalogItem } from '@/lib/seo/searchSuggestions';
import CountdownTimer from '@/components/CountdownTimer';
import RecentPurchases from '@/components/RecentPurchases';
import { ProductCard } from '@/components/ProductCard';
import ComboCard from '@/components/ComboCard';
import { makeProductPlaceholder } from '@/lib/placeholder';
import type { Combo } from '@/types/combo';
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  type SeasonalCampaignConfig,
  type SeasonalThemeKey,
} from '@/config/shippingRates';

// TIPOS DE DATOS
interface SlideData {
  id: string;
  slug?: string;
  name: string;
  description: string;
  images: string[];
}

interface HeroSliderProps {
  products: SlideData[];
  isLoading: boolean;
}

// CONFIGURACIÓN DE CATEGORÍAS
const categoryConfig: Partial<Record<
  (typeof PRODUCT_CATEGORIES)[number],
  {
    icon: React.ReactNode;
    colorFrom: string;
    colorTo: string;
  }
>> = {
  cilindros: {
    icon: <CheckCircleIcon className="w-7 h-7" />,
    colorFrom: "from-[#0A2A66]",
    colorTo: "to-[#2E5FA7]",
  },
  llantas: {
    icon: <CheckCircleIcon className="w-7 h-7" />,
    colorFrom: "from-[#153B82]",
    colorTo: "to-[#5B7FB2]",
  },
  frenos: {
    icon: <CheckCircleIcon className="w-7 h-7" />,
    colorFrom: "from-[#0D3A8B]",
    colorTo: "to-[#6A8EC0]",
  },
  aceites_lubricantes: {
    icon: <CubeTransparentIcon className="w-7 h-7" />,
    colorFrom: "from-[#355C97]",
    colorTo: "to-[#8FA8CC]",
  },
  filtros: {
    icon: <CubeTransparentIcon className="w-7 h-7" />,
    colorFrom: "from-slate-500",
    colorTo: "to-[#5B7FB2]",
  },
  baterias: {
    icon: <ArrowRightIcon className="w-7 h-7" />,
    colorFrom: "from-[#2E5FA7]",
    colorTo: "to-[#8FA8CC]",
  },
  transmision: {
    icon: <ArrowRightIcon className="w-7 h-7" />,
    colorFrom: "from-[#081F4D]",
    colorTo: "to-[#2E5FA7]",
  },
  suspension: {
    icon: <CubeTransparentIcon className="w-7 h-7" />,
    colorFrom: "from-[#1E4F95]",
    colorTo: "to-[#7F96BB]",
  },
  escape: {
    icon: <CubeTransparentIcon className="w-7 h-7" />,
    colorFrom: "from-[#07122E]",
    colorTo: "to-[#355C97]",
  },
  electrico: {
    icon: <CheckCircleIcon className="w-7 h-7" />,
    colorFrom: "from-[#2E5FA7]",
    colorTo: "to-[#6A8EC0]",
  },
  iluminacion: {
    icon: <ArrowRightIcon className="w-7 h-7" />,
    colorFrom: "from-[#8FA8CC]",
    colorTo: "to-[#C7D2E0]",
  },
  carenaje: {
    icon: <CubeTransparentIcon className="w-7 h-7" />,
    colorFrom: "from-[#355C97]",
    colorTo: "to-[#2E5FA7]",
  },
  accesorios: {
    icon: <ShoppingCartIcon className="w-7 h-7" />,
    colorFrom: "from-[#0A2A66]",
    colorTo: "to-[#2E5FA7]",
  },
};

const seasonVisuals: Record<SeasonalThemeKey, {
  heroBg: string;
  badgeBg: string;
  badgeText: string;
  glowPrimary: string;
  glowSecondary: string;
  pulseOne: string;
  pulseTwo: string;
}> = {
  none: {
    heroBg: "bg-gradient-to-br from-[#e9f2ff] via-[#f8fbff] to-[#e3edff] dark:from-[#07122E] dark:via-[#0A2A66] dark:to-[#0D1F4E]",
    badgeBg: "bg-[#0A2A66]/10 dark:bg-white/10",
    badgeText: "text-[#0A2A66] dark:text-[#5B9BD5]",
    glowPrimary: "bg-[#2E5FA7]/15 dark:bg-[#2E5FA7]/10",
    glowSecondary: "bg-[#0A2A66]/10 dark:bg-[#0A2A66]/20",
    pulseOne: "bg-[#2E5FA7]/20 dark:bg-[#5B9BD5]/20",
    pulseTwo: "bg-[#0A2A66]/15 dark:bg-[#8FA8CC]/20",
  },
  mundial_2026: {
    heroBg: "bg-gradient-to-br from-[#fff8cf] via-[#ffe89b] to-[#cde2ff] dark:from-[#1d1300] dark:via-[#0b1f4f] dark:to-[#2a0810]",
    badgeBg: "bg-[#FCD116]/25 dark:bg-[#FCD116]/35",
    badgeText: "text-[#8B6A00] dark:text-[#FFE588]",
    glowPrimary: "bg-[#0038A8]/20 dark:bg-[#1A67FF]/25",
    glowSecondary: "bg-[#CE1126]/18 dark:bg-[#FF4B63]/24",
    pulseOne: "bg-[#FCD116]/35 dark:bg-[#FCD116]/30",
    pulseTwo: "bg-[#0038A8]/30 dark:bg-[#0038A8]/34",
  },
  halloween: {
    heroBg: "bg-gradient-to-br from-[#1b0d00] via-[#2c1507] to-[#3f1c08] dark:from-[#120700] dark:via-[#1f0d00] dark:to-[#2f1100]",
    badgeBg: "bg-[#FF7A00]/25 dark:bg-[#FF7A00]/35",
    badgeText: "text-[#FFD39D] dark:text-[#FFE6C7]",
    glowPrimary: "bg-[#FF7A00]/28 dark:bg-[#FF7A00]/28",
    glowSecondary: "bg-[#7A3AC9]/22 dark:bg-[#7A3AC9]/28",
    pulseOne: "bg-[#FF7A00]/32 dark:bg-[#FF7A00]/34",
    pulseTwo: "bg-[#7A3AC9]/32 dark:bg-[#7A3AC9]/34",
  },
  independencia: {
    heroBg: "bg-gradient-to-br from-[#fff6e6] via-[#ffe8d0] to-[#ffd8b6] dark:from-[#2A1500] dark:via-[#3A1E04] dark:to-[#5A2F0A]",
    badgeBg: "bg-[#F57C00]/15 dark:bg-[#F57C00]/25",
    badgeText: "text-[#C15E00] dark:text-[#FFC67B]",
    glowPrimary: "bg-[#F57C00]/20 dark:bg-[#F57C00]/25",
    glowSecondary: "bg-[#C62828]/15 dark:bg-[#C62828]/20",
    pulseOne: "bg-[#F57C00]/30 dark:bg-[#F57C00]/30",
    pulseTwo: "bg-[#C62828]/30 dark:bg-[#C62828]/30",
  },
  amor_amistad: {
    heroBg: "bg-gradient-to-br from-[#fff0f4] via-[#ffe4ec] to-[#fde0ff] dark:from-[#2B0D1F] dark:via-[#3B1232] dark:to-[#4A1642]",
    badgeBg: "bg-[#D81B60]/15 dark:bg-[#D81B60]/25",
    badgeText: "text-[#B0144E] dark:text-[#FF97C2]",
    glowPrimary: "bg-[#D81B60]/20 dark:bg-[#D81B60]/25",
    glowSecondary: "bg-[#8E24AA]/15 dark:bg-[#8E24AA]/20",
    pulseOne: "bg-[#D81B60]/30 dark:bg-[#D81B60]/30",
    pulseTwo: "bg-[#8E24AA]/30 dark:bg-[#8E24AA]/30",
  },
  black_week: {
    heroBg: "bg-gradient-to-br from-[#f3f4f6] via-[#e5e7eb] to-[#d1d5db] dark:from-[#050505] dark:via-[#0b0b0b] dark:to-[#171717]",
    badgeBg: "bg-black/10 dark:bg-white/10",
    badgeText: "text-black dark:text-white",
    glowPrimary: "bg-black/15 dark:bg-white/10",
    glowSecondary: "bg-slate-500/15 dark:bg-slate-300/10",
    pulseOne: "bg-black/20 dark:bg-white/20",
    pulseTwo: "bg-slate-500/30 dark:bg-slate-300/25",
  },
  navidad: {
    heroBg: "bg-gradient-to-br from-[#e8f7ea] via-[#fff3f3] to-[#ecf4ff] dark:from-[#06210F] dark:via-[#112f14] dark:to-[#3A0C0C]",
    badgeBg: "bg-[#1E8E3E]/18 dark:bg-[#1E8E3E]/30",
    badgeText: "text-[#0F5A24] dark:text-[#A7F0B3]",
    glowPrimary: "bg-[#1E8E3E]/24 dark:bg-[#1E8E3E]/30",
    glowSecondary: "bg-[#C62828]/22 dark:bg-[#E53935]/26",
    pulseOne: "bg-[#1E8E3E]/34 dark:bg-[#1E8E3E]/32",
    pulseTwo: "bg-[#C62828]/30 dark:bg-[#C62828]/34",
  },
};

export type HomePageClientProps = {
  initialCategories: CategoryItem[];
  initialSliderProducts: SlideData[];
  initialFeaturedProducts: ProductType[];
  initialFeaturedCombos: Combo[];
  searchCatalog: HomeSearchCatalogItem[];
};

// ==========================================
// COMPONENTE PRINCIPAL: Home
// ==========================================
export default function HomePageClient({
  initialCategories,
  initialSliderProducts,
  initialFeaturedProducts,
  initialFeaturedCombos,
  searchCatalog,
}: HomePageClientProps) {
  const [categories] = useState<CategoryItem[]>(initialCategories);
  const [sliderProducts] = useState<SlideData[]>(initialSliderProducts);
  const [seasonalCampaign, setSeasonalCampaign] = useState<SeasonalCampaignConfig>(
    DEFAULT_SEASONAL_CAMPAIGN,
  );
  const isLoading = false;

  useEffect(() => {
    fetch('/api/store-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const fromApi = data?.seasonalCampaign ?? data?.shippingRules?.seasonalCampaign;
        if (!fromApi || typeof fromApi !== 'object') return;
        setSeasonalCampaign((prev) => ({ ...prev, ...fromApi }));
      })
      .catch(() => {
        // Keep default visual if settings are unavailable.
      });
  }, []);

  const activeSeasonKey =
    seasonalCampaign.enabled && seasonalCampaign.key ? seasonalCampaign.key : 'none';
  const activeVisual = seasonVisuals[activeSeasonKey];
  const campaignTitle =
    seasonalCampaign.title.trim() ||
    (activeSeasonKey === 'mundial_2026' ? 'Temporada mundialista en toda la tienda' : 'Temporada especial activa');
  const campaignSubtitle =
    seasonalCampaign.subtitle.trim() ||
    'Promociones destacadas, piezas listas para despachar y atención prioritaria.';
  const campaignHref = seasonalCampaign.ctaHref.trim() || '/products';
  const campaignCtaLabel = seasonalCampaign.ctaLabel.trim() || 'Ver campaña';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060D1F] text-slate-900 dark:text-slate-100 antialiased">

      {/* ════════════════════════════════════════
          HERO — full-width, dark gradient band
          ════════════════════════════════════════ */}
      <section className={`relative overflow-hidden ${activeVisual.heroBg}`}>
        {/* Background texture rings */}
        <div className={`pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full ${activeVisual.glowPrimary} blur-3xl`} />
        <div className={`pointer-events-none absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full ${activeVisual.glowSecondary} blur-3xl`} />

        {activeSeasonKey !== 'none' && (
          <>
            <motion.div
              aria-hidden
              className={`pointer-events-none absolute top-16 right-[12%] w-16 h-16 rounded-full ${activeVisual.pulseOne}`}
              animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden
              className={`pointer-events-none absolute bottom-10 left-[10%] w-12 h-12 rounded-full ${activeVisual.pulseTwo}`}
              animate={{ y: [0, 10, 0], x: [0, -6, 0] }}
              transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </>
        )}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 lg:pt-6 lg:pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-10 items-start">

            {/* LEFT — copy + CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="order-1"
            >
              {activeSeasonKey !== 'none' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className={`mb-4 rounded-2xl border border-white/35 dark:border-white/10 ${activeVisual.badgeBg} backdrop-blur px-4 py-3`}
                >
                  <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
                    <div>
                      <p className={`text-xs font-bold tracking-[0.18em] uppercase ${activeVisual.badgeText}`}>
                        Campana de temporada
                      </p>
                      <h2 className="mt-1 text-base sm:text-lg font-extrabold text-[#081F4D] dark:text-white">
                        {campaignTitle}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#0A2A66]/75 dark:text-white/70 mt-0.5">
                        {campaignSubtitle}
                      </p>
                    </div>
                    <Link
                      href={campaignHref}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0A2A66] dark:bg-white text-white dark:text-[#0A2A66] text-xs font-bold hover:bg-[#081F4D] dark:hover:bg-slate-100 transition-colors"
                    >
                      {campaignCtaLabel}
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Brand pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/75 dark:bg-white/10 border border-[#2E5FA7]/20 dark:border-white/15 px-4 py-1.5 text-[11px] font-bold tracking-[0.18em] text-[#0A2A66]/75 dark:text-white/70 uppercase mb-5 backdrop-blur">
                <div className="relative h-5 w-5 rounded-full overflow-hidden border border-[#2E5FA7]/25 dark:border-white/20 bg-white/60 dark:bg-white/10 shrink-0">
                  <Image src="/logo.png" alt="A&R" fill sizes="20px" className="object-cover" priority />
                </div>
                Motoservicio A&amp;R · La Ceja, Ant.
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.1] tracking-tight text-[#081F4D] dark:text-white">
                El repuesto exacto<br />
                <span className="text-[#2E5FA7] dark:text-[#5B9BD5]">para tu moto.</span>
              </h1>

              <p className="mt-4 text-base sm:text-lg text-[#0A2A66]/75 dark:text-white/60 max-w-lg leading-relaxed">
                10+ años en el mercado. Piezas originales y genéricas, stock permanente y despachos a todo Colombia.
              </p>

              <div className="mt-5">
                <CountdownTimer />
              </div>

              <div className="mt-6 max-w-md">
                <HomeSearch products={searchCatalog} />
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#0A2A66] dark:bg-white text-white dark:text-[#0A2A66] font-bold text-sm shadow-lg hover:bg-[#081F4D] dark:hover:bg-slate-100 transition-colors"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  Ver catálogo
                </Link>
                <a
                  href="https://wa.me/573015271104?text=Hola,%20necesito%20un%20repuesto%20para%20mi%20moto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#0A2A66]/30 dark:border-white/25 text-[#0A2A66] dark:text-white font-semibold text-sm hover:bg-[#0A2A66]/10 dark:hover:bg-white/10 transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  Asesoría WhatsApp
                </a>
              </div>

              {/* Mini trust bar */}
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  { icon: <TruckIcon className="w-4 h-4" />, text: "Envíos a Colombia" },
                  { icon: <ShieldCheckIcon className="w-4 h-4" />, text: "Garantía incluida" },
                  { icon: <LockClosedIcon className="w-4 h-4" />, text: "Pago seguro Wompi" },
                  { icon: <StarIcon className="w-4 h-4" />, text: "10+ años de experiencia" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-[#0A2A66]/70 dark:text-white/55 text-xs">
                    <span className="text-[#2E5FA7] dark:text-[#5B9BD5]">{icon}</span>
                    {text}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* RIGHT — slider */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="order-2 w-full"
            >
              <div className="rounded-2xl overflow-hidden shadow-[0_35px_80px_-35px_rgba(10,42,102,0.35)] dark:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)] border border-[#2E5FA7]/15 dark:border-white/10">
                <HeroSlider products={sliderProducts} isLoading={isLoading} />
              </div>
              <div className="mt-3">
                <RecentPurchases products={sliderProducts} />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          TRUST BAR — horizontal strip
          ════════════════════════════════════════ */}
      <div className="bg-white dark:bg-[#08101E] border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-200 dark:divide-slate-800">
            {[
              { icon: <TruckIcon className="w-5 h-5" />, label: "Envíos a todo Colombia", sub: "Despacho el mismo día hábil" },
              { icon: <ShieldCheckIcon className="w-5 h-5" />, label: "Garantía en cada pieza", sub: "Originales y genéricas de calidad" },
              { icon: <LockClosedIcon className="w-5 h-5" />, label: "Pago 100% seguro", sub: "Wompi · Transferencia · Contraentrega" },
              { icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />, label: "Soporte por WhatsApp", sub: "Respondemos en minutos" },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-4">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-[#0A2A66]/10 dark:bg-[#2E5FA7]/15 flex items-center justify-center text-[#0A2A66] dark:text-[#5B9BD5]">
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">

        {/* ════════════════════════════════════════
            CATEGORÍAS
            ════════════════════════════════════════ */}
        <section id="categorias">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#2E5FA7] uppercase">Catálogo</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">
                Encuentra el repuesto que necesitas
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl">
                Stock permanente en todas las líneas. Busca por categoría o usa el buscador.
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-white transition-colors"
            >
              Ver todo el catálogo
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No hay categorías disponibles.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {categories.map((item, i) => (
                <CategoryCard
                  key={item.name}
                  item={item}
                  config={item.slug ? categoryConfig[item.slug as keyof typeof categoryConfig] : undefined}
                  highlight={i < 3}
                />
              ))}
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════
            PRODUCTOS DESTACADOS
            ════════════════════════════════════════ */}
        <section id="destacados">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#2E5FA7] uppercase">Novedades</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">
                Productos Destacados
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl">
                Los últimos repuestos en llegar a nuestro catálogo.
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-white transition-colors"
            >
              Ver todo el catálogo
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <FeaturedProductsRow initialProducts={initialFeaturedProducts} />
        </section>

        {/* ════════════════════════════════════════
            COMBOS Y OFERTAS ESPECIALES
            ════════════════════════════════════════ */}
        <FeaturedCombosRow initialCombos={initialFeaturedCombos} />

        {/* ════════════════════════════════════════
            BENEFICIOS
            ════════════════════════════════════════ */}
        <section>
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.18em] text-[#2E5FA7] uppercase">Ventajas</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 dark:text-white">
              ¿Por qué comprar con nosotros?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FeatureCard
              icon={<CheckCircleIcon className="w-6 h-6" />}
              title="Piezas originales y garantizadas"
              description="Stock permanente de repuestos originales y genéricas de calidad para todas las marcas."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-6 h-6" />}
              title="Compra 100% segura"
              description="Pago con Wompi, contraentrega o transferencia. Tu dinero protegido en todo momento."
            />
            <FeatureCard
              icon={<TruckIcon className="w-6 h-6" />}
              title="Envío rápido a Colombia"
              description="Despachamos el mismo día hábil. Recibe tu repuesto donde estés en el país."
            />
          </div>
        </section>

        {/* ════════════════════════════════════════
            CONVERSIÓN — dark CTA band
            ════════════════════════════════════════ */}
        <section>
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#e9f2ff] via-[#f6f9ff] to-[#e2ecff] dark:from-[#060E20] dark:via-[#07122E] dark:to-[#0A1F4E] border border-[#2E5FA7]/15 dark:border-white/8 shadow-[0_30px_80px_-35px_rgba(10,42,102,0.35)] dark:shadow-[0_40px_100px_-40px_rgba(10,42,102,0.7)]">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#2E5FA7]/25 dark:border-white/12 bg-white/70 dark:bg-white/6 px-3 py-1 text-[10px] font-bold tracking-widest text-[#2E5FA7] dark:text-[#C7D2E0] uppercase mb-5 w-fit">
                  Asesoría personalizada
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-[#081F4D] dark:text-white">
                  ¿No encuentras<br />
                  <span className="text-[#2E5FA7] dark:text-[#5B9BD5]">el repuesto que buscas?</span>
                </h3>
                <p className="mt-4 text-[#0A2A66]/75 dark:text-slate-300 text-sm sm:text-base max-w-md leading-relaxed">
                  Escríbenos por WhatsApp con el modelo de tu moto. Te cotizamos en minutos, sin compromiso.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-[#0A2A66]/80 dark:text-slate-300">
                  {[
                    "Cotización sin compromiso en minutos",
                    "Repuestos para todas las marcas y modelos",
                    "Envío a cualquier ciudad de Colombia",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <CheckCircleIcon className="w-4 h-4 text-[#5B9BD5] shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href="https://wa.me/573015271104?text=Hola,%20busco%20un%20repuesto%20para%20mi%20moto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0A2A66] dark:bg-white text-white dark:text-[#0A2A66] font-bold text-sm shadow-lg hover:bg-[#081F4D] dark:hover:bg-slate-100 transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Cotizar por WhatsApp
                  </a>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#0A2A66]/30 dark:border-white/20 text-[#0A2A66] dark:text-white font-semibold text-sm hover:bg-[#0A2A66]/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    Ver catálogo
                  </Link>
                </div>
              </div>

              <div className="p-8 sm:p-12 flex flex-col justify-center gap-7 border-t lg:border-t-0 lg:border-l border-[#2E5FA7]/20 dark:border-white/8">
                {[
                  { value: "10+", label: "años vendiendo repuestos", icon: <StarIcon className="w-5 h-5" /> },
                  { value: "5.000+", label: "referencias disponibles", icon: <CubeTransparentIcon className="w-5 h-5" /> },
                  { value: "100%", label: "garantía en cada pieza vendida", icon: <ShieldCheckIcon className="w-5 h-5" /> },
                ].map(({ value, label, icon }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex items-center gap-5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/80 dark:bg-white/8 border border-[#2E5FA7]/20 dark:border-white/10 flex items-center justify-center text-[#2E5FA7] dark:text-[#5B9BD5] shrink-0">
                      {icon}
                    </div>
                    <div>
                      <div className="text-4xl font-extrabold text-[#081F4D] dark:text-white leading-none">{value}</div>
                      <div className="text-sm text-[#0A2A66]/60 dark:text-slate-400 mt-0.5">{label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════
            CTA FINAL
            ════════════════════════════════════════ */}
        <section>
          <div className="rounded-3xl bg-gradient-to-r from-[#edf4ff] via-[#f9fbff] to-[#e8f0ff] dark:from-[#07122E] dark:via-[#0A2A66] dark:to-[#153B82] p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 border border-[#2E5FA7]/15 dark:border-transparent shadow-[0_24px_60px_-30px_rgba(10,42,102,0.35)] dark:shadow-[0_30px_80px_-30px_rgba(10,42,102,0.5)]">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#0A2A66]/45 dark:text-white/40 uppercase">Catálogo completo en línea</p>
              <h4 className="text-2xl sm:text-3xl font-extrabold text-[#081F4D] dark:text-white mt-1.5">
                Todo lo que tu moto necesita,<br className="hidden sm:block" /> disponible ahora
              </h4>
              <p className="mt-2 text-sm text-[#0A2A66]/70 dark:text-white/55">
                Stock permanente · Precios directos · Envíos a Colombia · Calle 27 #14-29, La Ceja
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#0A2A66] dark:bg-white text-white dark:text-[#0A2A66] font-bold text-sm shadow-lg hover:bg-[#081F4D] dark:hover:bg-slate-100 transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                Ver todos los productos
              </Link>
              <a
                href="https://wa.me/573015271104?text=Hola,%20quiero%20hacer%20un%20pedido"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#0A2A66]/30 dark:border-white/25 text-[#0A2A66] dark:text-white font-semibold text-sm hover:bg-[#0A2A66]/10 dark:hover:bg-white/10 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                Hacer pedido WhatsApp
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

/* ---------------------------
 * SUBCOMPONENTES
 * --------------------------- */

function HeroSlider({ products, isLoading }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const slides = products.map((product) => ({
    title: product.name,
    subtitle:
      (product.description?.substring(0, 80) || "") +
      (product.description?.length > 80 ? "..." : ""),
    cta: { label: "Ver producto", href: `/products/${product.slug ?? product.id}` },
    image: product.images?.[0] || makeProductPlaceholder(product.name),
  }));

  const startAutoplay = useCallback(() => {
    if (timerRef.current || slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
  }, [slides.length]);

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isLoading && slides.length > 0) startAutoplay();
    return () => stopAutoplay();
  }, [isLoading, slides.length, startAutoplay, stopAutoplay]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.touches[0].clientX;
    const delta = touchStart - touchEnd;

    if (Math.abs(delta) > 50 && !isAnimating) {
      setIsAnimating(true);
      stopAutoplay();
      setIndex((prev) =>
        delta > 0
          ? (prev + 1) % slides.length
          : (prev - 1 + slides.length) % slides.length
      );
      setTimeout(() => setIsAnimating(false), 400);
      startAutoplay();
    }
  };

  const handleIndicatorClick = (i: number) => {
    stopAutoplay();
    setIndex(i);
    startAutoplay();
  };

  if (isLoading) {
    return (
      <div className="relative rounded-2xl shadow-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 h-72 md:h-96 lg:h-[520px] flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">Cargando productos...</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="relative rounded-2xl shadow-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 h-72 md:h-96 lg:h-[520px] flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No hay productos destacados.</p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-[1.75rem] overflow-hidden shadow-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="relative h-[22rem] sm:h-[28rem] lg:h-[480px] select-none">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.98 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.div className="relative w-full h-full" whileHover={{ scale: 1.02 }} transition={{ duration: 0.9 }}>
              <Image
                src={slides[index].image}
                alt={slides[index].title}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover transition-transform duration-[1400ms]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#020817]/90 via-[#07122E]/45 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A2A66]/20 via-transparent to-transparent dark:from-[#0A2A66]/25" />

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8 lg:p-9">
                {slides.length > 1 && (
                  <div className="mb-4 sm:mb-5 flex items-center gap-2.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        aria-label={`Ir al slide ${i + 1}`}
                        onClick={() => handleIndicatorClick(i)}
                        className={`rounded-full transition-all duration-300 ${
                          i === index
                            ? "w-8 h-2 bg-gradient-to-r from-[#39C5F5] to-[#7B4CFF] shadow-md"
                            : "w-2.5 h-2.5 bg-white/35 hover:bg-white/55"
                        }`}
                      />
                    ))}
                  </div>
                )}

                <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#53BDF0] leading-tight drop-shadow-sm">
                    {slides[index].title}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-white/80 max-w-3xl line-clamp-2 sm:line-clamp-3">
                    {slides[index].subtitle}
                  </p>
                  <div className="mt-5">
                    <Link
                      href={slides[index].cta.href}
                      className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-[#39C5F5] to-[#7B4CFF] text-white font-bold text-base shadow-lg shadow-[#0A2A66]/45 transition-transform duration-300 hover:scale-[1.03]"
                    >
                      {slides[index].cta.label}
                      <ArrowRightIcon className="w-5 h-5" />
                    </Link>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}


function CategoryCard({ item, config, highlight }: {
  item: CategoryItem;
  config?: { icon: React.ReactNode; colorFrom: string; colorTo: string };
  highlight?: boolean;
}) {
  const URGENCY_LABELS = ["Alta demanda 🔥", "Últimas unidades", "Muy buscado"];
  const urgencyLabel = highlight ? URGENCY_LABELS[Math.abs(item.name.charCodeAt(0)) % URGENCY_LABELS.length] : null;

  return (
    <Link
      href={`/products/category/${encodeURIComponent(item.slug)}`}
      className="block group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1628] overflow-hidden shadow-sm hover:-translate-y-1.5 hover:shadow-2xl hover:border-[#2E5FA7]/50 dark:hover:border-[#2E5FA7]/40 transition-all duration-300"
    >
      <div className="relative w-full h-48 sm:h-56 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="absolute inset-0 bg-gradient-to-t from-[#07122E]/55 via-[#07122E]/10 to-transparent z-10" />
        <Image
          src={item.image || "/placeholder.png"}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
  
        {urgencyLabel && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
            <FireIcon className="w-3 h-3" />
            {urgencyLabel}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${
              config
                ? `bg-gradient-to-br ${config.colorFrom} ${config.colorTo}`
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            {config?.icon ?? <GlobeAltIcon className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-100 capitalize text-sm truncate">
              {item.name.replace(/_/g, " ")}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              {item.count ?? "0"} productos
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-[#0C1628] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-5 hover:shadow-xl hover:border-[#2E5FA7]/40 transition-all duration-300"
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] text-white shrink-0 shadow-md">
        {icon}
      </div>
      <div>
        <h5 className="font-semibold">{title}</h5>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

function FeaturedProductsRow({ initialProducts }: { initialProducts: ProductType[] }) {
  const [products] = useState<ProductType[]>(initialProducts);
  const isLoading = false;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const card = container.children[index] as HTMLElement | undefined;
    if (!card) return;
    container.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
    setActiveIndex(index);
  }, []);

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const firstCard = container.children[0] as HTMLElement | undefined;
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 12; // gap-3 = 12px
    const idx = Math.min(
      Math.round(container.scrollLeft / cardWidth),
      products.length - 1
    );
    setActiveIndex(Math.max(0, idx));
  }, [products.length]);

  if (isLoading) {
    return (
      <>
        {/* Mobile skeleton */}
        <div className="sm:hidden flex gap-3 overflow-hidden -mx-4 pl-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[72%] h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (products.length === 0) return null;

  return (
    <div>
      {/* ── Mobile Carousel ── */}
      <div className="sm:hidden relative -mx-4">
        {/* Prev button */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={() => scrollTo(Math.max(0, activeIndex - 1))}
            aria-label="Anterior"
            className="absolute left-1.5 top-[40%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-90"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        )}
        {/* Next button */}
        {activeIndex < products.length - 1 && (
          <button
            type="button"
            onClick={() => scrollTo(Math.min(products.length - 1, activeIndex + 1))}
            aria-label="Siguiente"
            className="absolute right-1.5 top-[40%] -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/95 dark:bg-slate-900/95 shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 transition active:scale-90"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        )}

        {/* Scroll container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto pl-4 pr-4 pb-1 no-scrollbar snap-x snap-mandatory"
        >
          {products.map((p, idx) => (
            <div key={p.id} className="snap-start shrink-0 w-[75%]">
              <ProductCard product={p} idx={idx} />
            </div>
          ))}
          {/* trailing spacer so last card isn't flush with edge */}
          <div className="shrink-0 w-3" aria-hidden />
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-1.5 mt-4">
          {products.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Ir al producto ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-5 h-2 bg-[#0A2A66] dark:bg-[#5B9BD5]"
                  : "w-2 h-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── Desktop Grid ── */}
      <div className="hidden sm:grid grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {products.map((p, idx) => (
          <ProductCard key={p.id} product={p} idx={idx} />
        ))}
      </div>
    </div>
  );
}

function FeaturedCombosRow({ initialCombos }: { initialCombos: Combo[] }) {
  const combos = initialCombos;
  const loading = false;

  if (combos.length === 0) return null;

  return (
    <section id="combos" className="mt-8">
      {/* Flash-sale header */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 dark:from-orange-600 dark:via-red-600 dark:to-rose-700 p-5 sm:p-6 mb-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FireIcon className="w-5 h-5 text-yellow-300 animate-pulse" />
              <p className="text-xs font-bold tracking-[0.18em] text-orange-100 uppercase">Oferta Relámpago</p>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Combos con Ahorro Real 🎁
            </h2>
            <p className="text-sm text-orange-100/80 mt-1 max-w-xl">
              Paquetes armados para darte más por menos. Cada combo incluye un regalo sorpresa.
            </p>
          </div>
          <Link
            href="/combos"
            className="shrink-0 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/30 transition-colors"
          >
            Ver todos los combos
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {combos.map((combo, idx) => (
            <ComboCard key={combo.id} combo={combo} idx={idx} showDescription />
          ))}
        </div>
      )}
    </section>
  );
}
