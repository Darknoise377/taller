"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CubeTransparentIcon,
  GlobeAltIcon,
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
  FireIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import type { CategoryItem } from "@/types/product";
import type { Product as ProductType } from "@/types/product";
import type { HomeSearchCatalogItem } from '@/lib/seo/searchSuggestions';
import type { Combo } from '@/types/combo';
import { ProductCard } from '@/components/ProductCard';
import ComboCard from '@/components/ComboCard';
import SearchHero from '@/components/home/SearchHero';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  type SeasonalCampaignConfig,
  type SeasonalThemeKey,
} from '@/config/shippingRates';
import { getSeasonMeta } from '@/config/seasonTheme';
import { PRODUCT_CATEGORIES } from "@/constants/productCategories";

// ── Lazy-loaded components (code splitting for below-the-fold) ──
const QuickViewModal = dynamic(() => import('@/components/home/QuickViewModal'), { ssr: false });
const BrandsStrip = dynamic(() => import('@/components/home/BrandsStrip'), { ssr: false });
const CompactBenefits = dynamic(() => import('@/components/home/CompactBenefits'), { ssr: false });
const RecommendationsSection = dynamic(() => import('@/components/home/RecommendationsSection'), { ssr: false });

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
    icon: <CheckCircleIcon className="w-6 h-6" />,
    colorFrom: "from-[#0A2A66]",
    colorTo: "to-[#2E5FA7]",
  },
  llantas: {
    icon: <CheckCircleIcon className="w-6 h-6" />,
    colorFrom: "from-[#153B82]",
    colorTo: "to-[#5B7FB2]",
  },
  frenos: {
    icon: <CheckCircleIcon className="w-6 h-6" />,
    colorFrom: "from-[#0D3A8B]",
    colorTo: "to-[#6A8EC0]",
  },
  aceites_lubricantes: {
    icon: <CubeTransparentIcon className="w-6 h-6" />,
    colorFrom: "from-[#355C97]",
    colorTo: "to-[#8FA8CC]",
  },
  filtros: {
    icon: <CubeTransparentIcon className="w-6 h-6" />,
    colorFrom: "from-slate-500",
    colorTo: "to-[#5B7FB2]",
  },
  baterias: {
    icon: <ArrowRightIcon className="w-6 h-6" />,
    colorFrom: "from-[#2E5FA7]",
    colorTo: "to-[#8FA8CC]",
  },
  transmision: {
    icon: <ArrowRightIcon className="w-6 h-6" />,
    colorFrom: "from-[#081F4D]",
    colorTo: "to-[#2E5FA7]",
  },
  suspension: {
    icon: <CubeTransparentIcon className="w-6 h-6" />,
    colorFrom: "from-[#1E4F95]",
    colorTo: "to-[#7F96BB]",
  },
  escape: {
    icon: <CubeTransparentIcon className="w-6 h-6" />,
    colorFrom: "from-[#07122E]",
    colorTo: "to-[#355C97]",
  },
  electrico: {
    icon: <CheckCircleIcon className="w-6 h-6" />,
    colorFrom: "from-[#2E5FA7]",
    colorTo: "to-[#6A8EC0]",
  },
  iluminacion: {
    icon: <ArrowRightIcon className="w-6 h-6" />,
    colorFrom: "from-[#8FA8CC]",
    colorTo: "to-[#C7D2E0]",
  },
  carenaje: {
    icon: <CubeTransparentIcon className="w-6 h-6" />,
    colorFrom: "from-[#355C97]",
    colorTo: "to-[#2E5FA7]",
  },
  accesorios: {
    icon: <ShoppingCartIcon className="w-6 h-6" />,
    colorFrom: "from-[#0A2A66]",
    colorTo: "to-[#2E5FA7]",
  },
};

export type HomePageClientProps = {
  initialCategories: CategoryItem[];
  initialFeaturedProducts: ProductType[];
  initialFeaturedCombos: Combo[];
  searchCatalog: HomeSearchCatalogItem[];
};

// ==========================================
// COMPONENTE PRINCIPAL: HomePageOptimized
// ==========================================
export default function HomePageOptimized({
  initialCategories,
  initialFeaturedProducts,
  initialFeaturedCombos,
  searchCatalog,
}: HomePageClientProps) {
  const [categories] = useState<CategoryItem[]>(initialCategories);
  const [seasonalCampaign, setSeasonalCampaign] = useState<SeasonalCampaignConfig>(
    DEFAULT_SEASONAL_CAMPAIGN,
  );
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<ProductType | null>(null);

  useEffect(() => {
    fetch('/api/store-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const fromApi = data?.seasonalCampaign ?? data?.shippingRules?.seasonalCampaign;
        if (!fromApi || typeof fromApi !== 'object') return;
        setSeasonalCampaign((prev) => ({ ...prev, ...fromApi }));
      })
      .catch(() => {/* Keep default visual if settings are unavailable */});
  }, []);

  const activeSeasonKey: SeasonalThemeKey =
    seasonalCampaign.enabled && seasonalCampaign.key ? seasonalCampaign.key : 'none';
  const campaignHref = seasonalCampaign.ctaHref.trim() || '/combos';
  const campaignCtaLabel = seasonalCampaign.ctaLabel.trim() || 'Ver campaña';

  // ── FILTRADO DE PRODUCTOS EN TIEMPO REAL ──
  const filteredProducts = useMemo(() => {
    if (activeFilters.length === 0) return initialFeaturedProducts;

    return initialFeaturedProducts.filter((product) => {
      return activeFilters.every((filter) => {
        switch (filter) {
          case 'envio-gratis':
            return product.price >= 100000; // Umbral de envío gratis
          case 'ofertas':
            return false; // Se filtraría con flash sales activas
          case 'nuevos':
            return product.createdAt
              ? Date.now() - new Date(product.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000
              : false;
          case 'en-stock':
            return product.stock > 0;
          case 'menos-50k':
            return product.price < 50000;
          case '50k-100k':
            return product.price >= 50000 && product.price <= 100000;
          case 'mas-100k':
            return product.price > 100000;
          case 'bajaj':
            return product.brand?.toLowerCase().includes('bajaj') ||
              product.name.toLowerCase().includes('bajaj') ||
              product.colors?.some(c => c.toLowerCase().includes('bajaj'));
          case 'ktm':
            return product.brand?.toLowerCase().includes('ktm') ||
              product.name.toLowerCase().includes('ktm') ||
              product.colors?.some(c => c.toLowerCase().includes('ktm'));
          case 'pulsar':
            return product.brand?.toLowerCase().includes('pulsar') ||
              product.name.toLowerCase().includes('pulsar') ||
              product.colors?.some(c => c.toLowerCase().includes('pulsar'));
          default:
            return true;
        }
      });
    });
  }, [initialFeaturedProducts, activeFilters]);

  // ── PAGINACIÓN INFINITA ──
  const { items: visibleProducts, hasMore, sentinelRef, isLoading } = useInfiniteScroll({
    initialItems: filteredProducts,
    pageSize: 8,
  });

  // Reset pagination when filters change
  useEffect(() => {
    // The hook auto-updates when initialItems (filteredProducts) changes
  }, [filteredProducts]);

  const handleFilterChange = useCallback((filters: string[]) => {
    setActiveFilters(filters);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#060D1F] text-slate-900 dark:text-slate-100">
      
      {/* ════════════════════════════════════════
          SEARCH HERO - Buscador como protagonista
          ════════════════════════════════════════ */}
      <SearchHero searchCatalog={searchCatalog} onFilterChange={handleFilterChange} activeFilters={activeFilters} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* ════════════════════════════════════════
            CATEGORÍAS - Promovidas arriba
            ════════════════════════════════════════ */}
        <section id="categorias">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2E5FA7] animate-pulse" />
                <p className="text-[10px] font-bold tracking-[0.2em] text-[#2E5FA7] dark:text-[#5B9BD5] uppercase">Explorar Catálogo</p>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Encuentra tu repuesto
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
                Stock garantizado y calidad verificada para todas las marcas
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-white transition-colors"
            >
              Ver todo
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.slice(0, 8).map((item, i) => (
              <CategoryCard
                key={item.name}
                item={item}
                config={item.slug ? categoryConfig[item.slug as keyof typeof categoryConfig] : undefined}
                highlight={i < 3}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* ════════════════════════════════════════
            PRODUCTOS DESTACADOS - Con filtros + paginación infinita
            ════════════════════════════════════════ */}
        <section id="destacados">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0A2A66] dark:bg-white animate-pulse" />
                <p className="text-[10px] font-bold tracking-[0.2em] text-[#0A2A66] dark:text-slate-300 uppercase">Top Ventas</p>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Productos Destacados
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {activeFilters.length > 0
                  ? `${visibleProducts.length} producto${visibleProducts.length !== 1 ? 's' : ''} encontrado${visibleProducts.length !== 1 ? 's' : ''}`
                  : 'Las piezas más buscadas y novedades recién llegadas'
                }
              </p>
            </div>
            <Link
              href="/products"
              className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2E5FA7] hover:text-[#0A2A66] dark:hover:text-white transition-colors"
            >
              Ver todo
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </motion.div>
          
          {/* Products grid with Quick View button */}
          {visibleProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {visibleProducts.map((product, idx) => (
                  <div key={product.id} className="relative group/card">
                    <ProductCard product={product} idx={idx} />
                    {/* Quick View overlay button */}
                    <button
                      type="button"
                      onClick={() => setQuickViewProduct(product)}
                      className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 shadow border border-slate-200/80 dark:border-slate-700 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 hover:scale-110"
                      aria-label={`Vista rápida: ${product.name}`}
                    >
                      <EyeIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Sentinel for infinite scroll */}
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="h-20 flex items-center justify-center"
                >
                  {isLoading && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <div className="w-5 h-5 border-2 border-[#2E5FA7] border-t-transparent rounded-full animate-spin" />
                      Cargando más productos...
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400">
                No se encontraron productos con los filtros seleccionados
              </p>
              <button
                type="button"
                onClick={() => setActiveFilters([])}
                className="mt-4 text-sm font-semibold text-[#2E5FA7] hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════
            COMBOS Y OFERTAS ESPECIALES
            ════════════════════════════════════════ */}
        {initialFeaturedCombos.length > 0 && (
          <section id="combos">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
            >
              <div>
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <p className="text-[10px] font-bold tracking-[0.2em] text-orange-600 dark:text-orange-400 uppercase">Ofertas Especiales</p>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Combos y Paquetes
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  Ahorra comprando kits completos
                </p>
              </div>
              <Link
                href={campaignHref}
                className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
              >
                {campaignCtaLabel}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {initialFeaturedCombos.slice(0, 6).map((combo, idx) => (
                <motion.div
                  key={combo.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <ComboCard combo={combo} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════
            MARCAS - Carousel horizontal
            ════════════════════════════════════════ */}
        <BrandsStrip />

        {/* ════════════════════════════════════════
            RECOMENDACIONES PERSONALIZADAS
            ════════════════════════════════════════ */}
        <RecommendationsSection allProducts={initialFeaturedProducts} maxItems={4} />

        {/* ════════════════════════════════════════
            BENEFICIOS COMPACTOS
            ════════════════════════════════════════ */}
        <CompactBenefits />

        {/* ════════════════════════════════════════
            CTA FINAL
            ════════════════════════════════════════ */}
        <section>
          <div className="rounded-3xl bg-gradient-to-r from-[#edf4ff] via-[#f9fbff] to-[#e8f0ff] dark:from-[#07122E] dark:via-[#0A2A66] dark:to-[#153B82] p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border border-[#2E5FA7]/15 dark:border-transparent shadow-xl">
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] text-[#0A2A66]/45 dark:text-white/40 uppercase">Catálogo completo</p>
              <h4 className="text-2xl sm:text-3xl font-extrabold text-[#081F4D] dark:text-white mt-1">
                Todo lo que tu moto necesita
              </h4>
              <p className="mt-2 text-sm text-[#0A2A66]/70 dark:text-white/55">
                Stock permanente · Precios directos · Envíos a Colombia
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0A2A66] dark:bg-white text-white dark:text-[#0A2A66] font-bold text-sm shadow-lg hover:bg-[#081F4D] dark:hover:bg-slate-100 transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                Ver productos
              </Link>
              <a
                href="https://wa.me/573015271104?text=Hola,%20quiero%20hacer%20un%20pedido"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#0A2A66]/30 dark:border-white/25 text-[#0A2A66] dark:text-white font-semibold text-sm hover:bg-[#0A2A66]/10 dark:hover:bg-white/10 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                WhatsApp
              </a>
            </div>
          </div>
        </section>

      </div>

      {/* ════════════════════════════════════════
          QUICK VIEW MODAL
          ════════════════════════════════════════ */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}

/* ---------------------------
 * SUBCOMPONENTES
 * --------------------------- */

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
      className="block group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#060D1F] overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-[#2E5FA7]/30 transition-all duration-300"
    >
      <div className="relative w-full h-32 sm:h-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#07122E]/40 via-transparent to-transparent z-10" />
        <Image
          src={item.image || "/placeholder.png"}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
  
        {urgencyLabel && (
          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md">
            <FireIcon className="w-3 h-3" />
            {urgencyLabel}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300 ${
              config
                ? `bg-gradient-to-br ${config.colorFrom} ${config.colorTo}`
                : "bg-slate-400 dark:bg-slate-700"
            }`}
          >
            {config?.icon ?? <GlobeAltIcon className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-100 capitalize text-sm truncate group-hover:text-[#0A2A66] dark:group-hover:text-[#5B9BD5] transition-colors">
              {item.name.replace(/_/g, " ")}
            </div>
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span>{item.count ?? "0"} productos</span>
              <span className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-[#2E5FA7]">→</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
