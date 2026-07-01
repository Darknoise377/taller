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
import { VideoPlayer } from '@/components/VideoPlayer';
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  type SeasonalCampaignConfig,
  type SeasonalThemeKey,
} from '@/config/shippingRates';
import { getSeasonMeta } from '@/config/seasonTheme';

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

  const activeSeasonKey: SeasonalThemeKey =
    seasonalCampaign.enabled && seasonalCampaign.key ? seasonalCampaign.key : 'none';
  const activeVisual = getSeasonMeta(activeSeasonKey);
  const campaignTitle =
    seasonalCampaign.title.trim() ||
    (activeSeasonKey === 'mundial_2026' ? 'Temporada mundialista en toda la tienda' : 'Temporada especial activa');
  const campaignSubtitle =
    seasonalCampaign.subtitle.trim() ||
    'Promociones destacadas, piezas listas para despachar y atención prioritaria.';
  const campaignHref = seasonalCampaign.ctaHref.trim() || '/combos';
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
                  className={`mb-4 overflow-hidden rounded-2xl border backdrop-blur-md ${activeVisual.badgeBg} shadow-lg`}
                >
                  <div className="relative px-4 py-4 sm:px-5 sm:py-4">
                    <div
                      className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl ${activeVisual.glowPrimary}`}
                    />
                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-3 min-w-0">
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-2xl shadow-inner dark:bg-white/10"
                          aria-hidden
                        >
                          {activeVisual.icon}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`text-[10px] font-bold tracking-[0.2em] uppercase ${activeVisual.badgeText}`}
                          >
                            {activeVisual.label} · temporada activa
                          </p>
                          <h2 className="mt-0.5 text-base font-extrabold leading-snug text-[#081F4D] dark:text-white sm:text-lg">
                            {campaignTitle}
                          </h2>
                          <p className="mt-1 text-xs leading-relaxed text-[#0A2A66]/80 dark:text-white/70 sm:text-sm">
                            {campaignSubtitle}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={campaignHref}
                        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold shadow-md transition ${activeVisual.comboCta}`}
                      >
                        {campaignCtaLabel}
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Brand pill */}
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1, duration: 0.5 }}
                              className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-white/90 to-white/60 dark:from-white/15 dark:to-white/5 border border-[#2E5FA7]/20 dark:border-white/10 px-4 py-2 text-[11px] font-bold tracking-[0.2em] text-[#0A2A66] dark:text-slate-300 uppercase mb-6 backdrop-blur-md shadow-sm"
                            >
                              <div className="relative h-5 w-5 rounded-full overflow-hidden shrink-0 shadow-sm">
                                <Image src="/logo.png" alt="A&R" fill sizes="20px" className="object-cover" priority />
                              </div>
                              <span>Motoservicio A&amp;R <span className="opacity-60 font-medium px-1">·</span> La Ceja, Ant.</span>
                            </motion.div>

<h1 className="text-[2.75rem] sm:text-6xl lg:text-[4rem] font-extrabold leading-[1.05] tracking-tight text-[#081F4D] dark:text-white drop-shadow-sm">
  Repuestos para motos<br />
  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A2A66] to-[#5B9BD5] dark:from-[#5B9BD5] dark:to-[#8FA8CC]">
    Bajaj, KTM, Pulsar y más en La Ceja, Colombia
  </span>
</h1>

                            <p className="mt-6 text-base sm:text-lg text-[#0A2A66]/80 dark:text-slate-300/80 max-w-xl leading-relaxed font-medium">
                              Más de 10 años equipando motociclistas. Piezas originales y genéricas de alta calidad, con stock permanente y <strong className="text-[#0A2A66] dark:text-white">despachos inmediatos a todo Colombia</strong>.
                            </p>

              <div className="mt-5">
                <CountdownTimer />
              </div>

              <div className="mt-6 max-w-md">
                <HomeSearch products={searchCatalog} />
              </div>

              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4">
                              <Link
                                href="/products"
                                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] dark:from-white dark:to-slate-200 text-white dark:text-[#0A2A66] font-bold text-[15px] shadow-[0_8px_25px_-8px_rgba(10,42,102,0.5)] dark:shadow-[0_8px_25px_-8px_rgba(255,255,255,0.3)] hover:scale-[1.02] hover:shadow-[0_12px_30px_-10px_rgba(10,42,102,0.6)] active:scale-[0.98] transition-all duration-300 overflow-hidden"
                              >
                                <div className="absolute inset-0 bg-white/20 dark:bg-black/5 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 ease-out" />
                                <ShoppingCartIcon className="w-5 h-5 relative z-10" />
                                <span className="relative z-10">Explorar catálogo</span>
                              </Link>
                              <a
                                href="https://wa.me/573015271104?text=Hola,%20necesito%20un%20repuesto%20para%20mi%20moto"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border-2 border-[#0A2A66]/20 dark:border-white/20 text-[#0A2A66] dark:text-white font-bold text-[15px] bg-white/50 dark:bg-black/20 backdrop-blur-sm hover:bg-[#0A2A66]/5 dark:hover:bg-white/10 hover:border-[#0A2A66]/40 dark:hover:border-white/40 active:scale-[0.98] transition-all duration-300"
                              >
                                <ChatBubbleLeftRightIcon className="w-5 h-5 text-[#25D366]" />
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
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="bg-white dark:bg-[#060D1F] border-b border-slate-200 dark:border-slate-800"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-slate-100 dark:divide-slate-800">
                  {[
                    { icon: <TruckIcon className="w-6 h-6" />, label: "Envíos a todo Colombia", sub: "Despacho el mismo día hábil" },
                    { icon: <ShieldCheckIcon className="w-6 h-6" />, label: "Garantía en cada pieza", sub: "Originales y genéricas de calidad" },
                    { icon: <LockClosedIcon className="w-6 h-6" />, label: "Pago 100% seguro", sub: "Wompi · Transferencia · Contraentrega" },
                    { icon: <ChatBubbleLeftRightIcon className="w-6 h-6" />, label: "Soporte por WhatsApp", sub: "Respondemos en minutos" },
                  ].map(({ icon, label, sub }) => (
                    <div key={label} className="flex items-center gap-4 px-4 py-6 lg:px-8 lg:py-6 group">
                      <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#0A2A66]/5 dark:bg-[#2E5FA7]/10 flex items-center justify-center text-[#0A2A66] dark:text-[#5B9BD5] group-hover:scale-110 group-hover:bg-[#0A2A66]/10 dark:group-hover:bg-[#2E5FA7]/20 transition-all duration-300">
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">

        {/* ════════════════════════════════════════
            CATEGORÍAS
            ════════════════════════════════════════ */}
        <section id="categorias" className="scroll-mt-24">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
                  >
                    <div>
                      <div className="inline-flex items-center gap-2 mb-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#2E5FA7] animate-pulse" />
                        <p className="text-[11px] font-bold tracking-[0.2em] text-[#2E5FA7] dark:text-[#5B9BD5] uppercase">Explorar Catálogo</p>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        El repuesto exacto para tu moto
                      </h2>
                      <p className="text-base text-slate-500 dark:text-slate-400 mt-3 max-w-2xl leading-relaxed">
                        Navega por nuestras categorías principales. Stock garantizado y calidad verificada para que sigas rodando sin problemas.
                      </p>
                    </div>
            <Link
                          href="/products"
                          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-white transition-colors"
                        >
                          Ver todo el catálogo
                          <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                      </motion.div>

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
        <section id="destacados" className="scroll-mt-24">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
                  >
                    <div>
                      <div className="inline-flex items-center gap-2 mb-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0A2A66] dark:bg-white animate-pulse" />
                        <p className="text-[11px] font-bold tracking-[0.2em] text-[#0A2A66] dark:text-slate-300 uppercase">Top Ventas & Novedades</p>
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                        Productos Destacados
                      </h2>
                      <p className="text-base text-slate-500 dark:text-slate-400 mt-3 max-w-2xl leading-relaxed">
                        Las piezas más buscadas por nuestros clientes y las últimas novedades que acaban de llegar al taller.
                      </p>
                    </div>
            <Link
                          href="/products"
                          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-white transition-colors"
                        >
                          Ver todo el catálogo
                          <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                      </motion.div>
          <FeaturedProductsRow initialProducts={initialFeaturedProducts} />
        </section>

        {/* ════════════════════════════════════════
            COMBOS Y OFERTAS ESPECIALES
            ════════════════════════════════════════ */}
        <FeaturedCombosRow
          initialCombos={initialFeaturedCombos}
          seasonKey={activeSeasonKey}
          campaignCtaHref={campaignHref}
          campaignCtaLabel={campaignCtaLabel}
        />

        {/* ════════════════════════════════════════
                    VIDEO BANNER PROMOCIONAL
                    ════════════════════════════════════════ */}
                <section aria-label="Video promocional" className="py-10">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="relative group"
                  >
                    {/* Efecto de luz trasera (Glow) */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#0A2A66] to-[#5B9BD5] rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            
                    <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(10,42,102,0.3)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] border border-slate-200/50 dark:border-slate-800 bg-black">
                      {/* Inserta aquí la URL de tu video de Cloudinary */}
                      <VideoPlayer 
                        variant="banner" 
                        src="https://res.cloudinary.com/demo/video/upload/f_auto,q_auto/v1644342930/elephants.mp4" 
                        className="w-full h-[350px] md:h-[500px] object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                      />
              
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              
                      <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                        <p className="text-xs font-bold tracking-[0.2em] text-white/70 uppercase mb-3 drop-shadow-md">
                          Servicio Técnico Especializado
                        </p>
                        <h3 className="text-3xl md:text-5xl font-black text-white max-w-2xl leading-tight drop-shadow-lg">
                          Pasión por las dos ruedas.
                        </h3>
                      </div>
                    </div>
                  </motion.div>
                </section>

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
      <div className="relative w-full bg-white dark:bg-[#060D1F] select-none rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-md border border-slate-100 dark:border-slate-800/60">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="flex flex-col w-full h-full"
                >
                  {/* 1. SECCIÓN DE IMAGEN SUPERIOR (Atrapa el ojo) */}
                              <div className="relative w-full h-[280px] sm:h-[400px] md:h-[500px] lg:h-[550px] bg-slate-50 dark:bg-[#040914] group overflow-hidden">
                                {/* Fondo sutil */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 dark:to-black/40 z-0 pointer-events-none" />
              
                                {/* Píldora Novedad (Superpuesta en la foto) */}
                                <div className="absolute top-5 left-5 md:top-8 md:left-8 z-20">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md text-[#0A2A66] dark:text-[#5B9BD5] text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase shadow-sm border border-white/40 dark:border-white/10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0A2A66] dark:bg-[#5B9BD5] animate-pulse" />
                                    Destacado
                                  </div>
                                </div>

                                <Image
                                  src={slides[index].image}
                                  alt={slides[index].title}
                                  fill
                                  priority={index === 0}
                                  sizes="100vw"
                                  className="object-cover object-center group-hover:scale-105 transition-transform duration-[1.5s] ease-out z-10"
                                />
                              </div>

                              {/* 2. SECCIÓN DE TEXTO E INFORMACIÓN (Bloque inferior refinado) */}
                              <div className="w-full flex flex-col items-center text-center justify-center p-6 sm:p-8 md:p-10 z-20">
                                <div className="max-w-3xl flex flex-col items-center">
                                  {/* Título (Proporciones controladas y refinadas) */}
                                                  <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-snug">
                                                    {slides[index].title}
                                                  </h3>
                
                                                  {/* Descripción */}
                                                  <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-xl font-medium">
                                                    {slides[index].subtitle}
                                                  </p>

                                                  {/* Botón CTA */}
                                                  <div className="mt-6 sm:mt-7">
                                                    <Link
                                                      href={slides[index].cta.href}
                                                      className="group inline-flex w-full sm:w-auto justify-center items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] dark:from-[#2E5FA7] dark:to-[#5B9BD5] text-white font-bold text-sm shadow-[0_8px_20px_-6px_rgba(10,42,102,0.5)] hover:shadow-[0_15px_25px_-8px_rgba(10,42,102,0.6)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300"
                                                    >
                                      {slides[index].cta.label}
                                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                  </div>
                                </div>

                    {/* Controles de Slide (Dots) centrado */}
                    {slides.length > 1 && (
                      <div className="mt-10 flex items-center justify-center gap-2.5">
                        {slides.map((_, i) => (
                          <button
                            key={i}
                            aria-label={`Ir al slide ${i + 1}`}
                            onClick={() => handleIndicatorClick(i)}
                            className={`rounded-full transition-all duration-300 ${
                              i === index
                                ? "w-10 h-2 bg-[#0A2A66] dark:bg-[#5B9BD5]"
                                : "w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
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
      className="block group relative p-1.5 rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-[#060D1F] overflow-hidden shadow-[0_8px_30px_-12px_rgba(0,0,0,0.05)] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(10,42,102,0.15)] dark:hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.05)] hover:border-[#2E5FA7]/30 transition-all duration-500"
          >
            {/* Efecto de luz trasera (Glow) al hacer hover */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#2E5FA7]/0 to-[#2E5FA7]/5 dark:to-[#2E5FA7]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800/80 shadow-inner">
           <div className="absolute inset-0 bg-gradient-to-t from-[#07122E]/40 via-transparent to-transparent z-10" />
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

      <div className="relative p-4 z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-110 transition-transform duration-500 ${
                    config
                      ? `bg-gradient-to-br ${config.colorFrom} ${config.colorTo}`
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  {config?.icon ?? <GlobeAltIcon className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-800 dark:text-slate-100 capitalize text-[15px] truncate group-hover:text-[#0A2A66] dark:group-hover:text-[#5B9BD5] transition-colors">
                    {item.name.replace(/_/g, " ")}
                  </div>
                  <div className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    <span>{item.count ?? "0"} productos</span>
                    <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-[#2E5FA7]">→</span>
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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="group relative bg-white dark:bg-[#060D1F] p-7 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] overflow-hidden hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(10,42,102,0.1)] dark:hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.05)] transition-all duration-500"
    >
      {/* Efecto de luz (Glow) */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#2E5FA7]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col items-start gap-5">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#0A2A66] to-[#2E5FA7] dark:from-[#153B82] dark:to-[#5B9BD5] text-white shrink-0 shadow-lg shadow-[#0A2A66]/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
          {icon}
        </div>
        <div>
          <h5 className="text-[17px] font-extrabold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-[#0A2A66] dark:group-hover:text-[#5B9BD5] transition-colors">
            {title}
          </h5>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {description}
          </p>
        </div>
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

function FeaturedCombosRow({
  initialCombos,
  seasonKey,
  campaignCtaHref,
  campaignCtaLabel,
}: {
  initialCombos: Combo[];
  seasonKey: SeasonalThemeKey;
  campaignCtaHref: string;
  campaignCtaLabel: string;
}) {
  const combos = initialCombos;
  const theme = getSeasonMeta(seasonKey);
  const combosHref = seasonKey !== 'none' ? campaignCtaHref : '/combos';
  const combosCta =
    seasonKey !== 'none' && campaignCtaLabel !== 'Ver campaña'
      ? campaignCtaLabel
      : 'Ver todos los combos';

  const totalSavings = combos.reduce(
    (sum, c) => sum + Math.max(0, c.originalPrice - c.price),
    0,
  );
  const maxPct = combos.reduce((best, c) => {
    if (c.originalPrice <= 0) return best;
    const pct = Math.round(((c.originalPrice - c.price) / c.originalPrice) * 100);
    return Math.max(best, pct);
  }, 0);

  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n);

  if (combos.length === 0) return null;

  const [heroCombo, ...restCombos] = combos;

  return (
    <section id="combos" className="relative mt-4 scroll-mt-24">
      <div
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 sm:p-8 shadow-[0_24px_60px_-20px_rgba(10,42,102,0.35)] ${theme.comboGradient}`}
      >
        <div
          className={`pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full blur-3xl ${theme.comboGlow}`}
        />
        <div
          className={`pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full blur-3xl ${theme.glowSecondary}`}
        />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div
              className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${theme.comboBadge}`}
            >
              <FireIcon className="h-4 w-4 animate-pulse text-amber-300" />
              {seasonKey !== 'none' ? `${theme.label} · combos` : 'Oferta especial'}
            </div>
            <h2 className="text-2xl font-extrabold leading-tight text-white sm:text-4xl">
              Paquetes que te ahorran de verdad
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85 sm:text-base">
              Más piezas por menos plata. Cada combo incluye regalo sorpresa y despacho rápido a todo
              Colombia.
            </p>
            {totalSavings > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-xl bg-black/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                  Hasta {maxPct}% OFF
                </span>
                <span className="rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                  Ahorro combinado {formatCOP(totalSavings)}
                </span>
              </div>
            )}
          </div>
          <Link
            href={combosHref}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition ${theme.comboCta}`}
          >
            {combosCta}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Mobile: carrusel con snap */}
      <div className="mt-6 -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory no-scrollbar sm:hidden">
        {combos.map((combo, idx) => (
          <div key={combo.id} className="w-[min(88vw,20rem)] shrink-0 snap-center">
            <ComboCard combo={combo} idx={idx} showDescription />
          </div>
        ))}
      </div>

      {/* Desktop: combo destacado + rejilla */}
      <div className="mt-8 hidden gap-6 sm:grid lg:grid-cols-12">
        {heroCombo && (
          <div className="lg:col-span-5">
            <ComboCard combo={heroCombo} idx={0} showDescription />
          </div>
        )}
        {restCombos.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
            {restCombos.map((combo, idx) => (
              <ComboCard key={combo.id} combo={combo} idx={idx + 1} showDescription />
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400 sm:hidden">
        Desliza para ver más combos →
      </p>
    </section>
  );
}
