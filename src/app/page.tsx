"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CubeTransparentIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  TruckIcon,
  StarIcon,
  FireIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import type { CategoryItem, Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/constants/productCategories";
import HomeSearch from '@/components/HomeSearch';
import CountdownTimer from '@/components/CountdownTimer';
import RecentPurchases from '@/components/RecentPurchases';
import { makeProductPlaceholder } from '@/lib/placeholder';

// TIPOS DE DATOS
interface SlideData {
  id: string;
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

// ==========================================
// COMPONENTE PRINCIPAL: Home
// ==========================================
export default function Home() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [sliderProducts, setSliderProducts] = useState<SlideData[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, latestProductsRes, productsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products/latest"),
          fetch("/api/products"),
        ]);

        if (categoriesRes.ok) {
          setCategories(await categoriesRes.json());
        } else {
          setCategories([]);
        }

        if (latestProductsRes.ok) {
          setSliderProducts(await latestProductsRes.json());
        } else {
          setSliderProducts([]);
        }

        if (productsRes.ok) {
          const prod: Product[] = await productsRes.json();
          setFeaturedProducts(prod.slice(0, 12));
        } else {
          setFeaturedProducts([]);
        }
      } catch (err) {
        console.error("Error al cargar los datos de la página:", err);
        setCategories([]);
        setSliderProducts([]);
        setFeaturedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const displayProducts = activeCategory
    ? featuredProducts.filter((p) => p.category === activeCategory)
    : featuredProducts;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070617] text-slate-900 dark:text-slate-100 antialiased font-sans">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-14">

        {/* ── HERO PANORÁMICO ── */}
        <section className="relative mt-2 grid grid-cols-1 lg:grid-cols-12 rounded-2xl overflow-hidden bg-gradient-to-r from-[#07122E] via-[#0A2A66] to-[#153B82] min-h-[240px] max-h-[380px] h-[38vh] lg:h-[42vh]">
          <div className="lg:col-span-5 flex flex-col justify-center px-7 py-7 z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] font-semibold tracking-widest text-white/70 uppercase mb-3 w-fit">
              Motoservicio A&amp;R · La Ceja, Antioquia
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-extrabold text-white leading-snug">
              Repuestos originales.<br />
              <span className="text-[#5B9BD5]">Compra fácil. Entrega rápida.</span>
            </h1>
            <p className="mt-2 text-sm text-white/65 max-w-xs hidden sm:block">
              15+ años en el mercado · Stock permanente · Envíos a todo Colombia
            </p>
            <div className="mt-3 max-w-sm">
              <HomeSearch />
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#0A2A66] font-bold text-sm shadow hover:bg-slate-100 transition-colors"
              >
                <ShoppingCartIcon className="w-4 h-4" />
                Ver catálogo
              </Link>
              <a
                href="https://wa.me/573015271104?text=Hola,%20necesito%20un%20repuesto%20para%20mi%20moto"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-7 h-full">
            <HeroSlider products={sliderProducts} isLoading={isLoading} />
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 overflow-hidden">
          {[
            { icon: <TruckIcon className="w-4 h-4" />, label: "Envíos a Colombia", sub: "Despacho el mismo día" },
            { icon: <ShieldCheckIcon className="w-4 h-4" />, label: "Garantía incluida", sub: "En cada repuesto" },
            { icon: <LockClosedIcon className="w-4 h-4" />, label: "Pago seguro", sub: "Wompi · Contraentrega" },
            { icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />, label: "Soporte WhatsApp", sub: "Respuesta inmediata" },
          ].map(({ icon, label, sub }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3">
              <div className="text-[#0A2A66] dark:text-[#5B9BD5] shrink-0">{icon}</div>
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</div>
                <div className="text-[10px] text-slate-400">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── CATÁLOGO: Sidebar + Grid ── */}
        <section className="mt-6 flex flex-col md:flex-row gap-5 items-start">

          {/* SIDEBAR */}
          <aside className="hidden md:flex flex-col w-48 shrink-0 sticky top-20 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 gap-0.5">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              Categorías
            </h3>
            <button
              onClick={() => setActiveCategory("")}
              className={`text-left text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                !activeCategory
                  ? "bg-[#0A2A66] text-white"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.slug)}
                className={`text-left text-sm px-3 py-2 rounded-lg capitalize font-medium transition-colors ${
                  activeCategory === cat.slug
                    ? "bg-[#0A2A66] text-white"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {cat.name.replace(/_/g, " ")}
              </button>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-xs text-[#2E5FA7] font-semibold hover:underline"
              >
                <ArrowRightIcon className="w-3 h-3" />
                Ver catálogo completo
              </Link>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold capitalize">
                {activeCategory ? activeCategory.replace(/_/g, " ") : "Repuestos destacados"}
              </h2>
              <Link href="/products" className="text-sm text-[#2E5FA7] font-semibold hover:underline">
                Ver todo →
              </Link>
            </div>

            {/* Filtro de categorías en móvil (scroll horizontal) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:hidden [-webkit-overflow-scrolling:touch]">
              <button
                onClick={() => setActiveCategory("")}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                  !activeCategory
                    ? "bg-[#0A2A66] text-white border-[#0A2A66]"
                    : "border-slate-300 text-slate-600 bg-white dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold border capitalize transition-colors ${
                    activeCategory === cat.slug
                      ? "bg-[#0A2A66] text-white border-[#0A2A66]"
                      : "border-slate-300 text-slate-600 bg-white dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                  }`}
                >
                  {cat.name.replace(/_/g, " ")}
                </button>
              ))}
            </div>

            {/* Grid de productos */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-56 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CubeTransparentIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay productos en esta categoría.</p>
                <Link href="/products" className="mt-3 inline-block text-sm text-[#2E5FA7] underline">
                  Ver todos los repuestos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {displayProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="mt-10 rounded-2xl bg-gradient-to-r from-[#07122E] via-[#0A2A66] to-[#153B82] px-7 py-7 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-white/50 uppercase">¿No encuentras tu repuesto?</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              Cotiza por WhatsApp. Respondemos en minutos.
            </h3>
            <p className="text-sm text-white/60 mt-1">Repuestos para todas las marcas · Envíos a todo Colombia</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <a
              href="https://wa.me/573015271104?text=Hola,%20busco%20un%20repuesto%20para%20mi%20moto"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white text-[#0A2A66] font-bold text-sm shadow hover:bg-slate-100 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              Cotizar ahora
            </a>
            <Link
              href="/products"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              <ShoppingCartIcon className="w-4 h-4" />
              Ver catálogo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
        {/* HERO + SLIDER (Rediseñado: layout más amplio, CTAs prominentes) */}
        <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
          <div className="absolute inset-0 -z-10 rounded-[32px] bg-gradient-to-r from-[#0A2A66]/5 via-[#2E5FA7]/5 to-transparent blur-2xl" />

          <div className="order-2 lg:order-1 lg:col-span-7">
            <div className="relative rounded-[28px] overflow-hidden shadow-[0_30px_90px_-40px_rgba(10,42,102,0.45)] border border-slate-200 dark:border-slate-800">
              <HeroSlider products={sliderProducts} isLoading={isLoading} />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/5 dark:to-black/10" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2 lg:col-span-5 flex items-center"
          >
            <div className="w-full">
              <div className="h-full rounded-[28px] p-6 sm:p-8 bg-white/95 dark:bg-[#071124]/95 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#2E5FA7]/20 bg-[#0A2A66]/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#0A2A66] dark:text-[#C7D2E0]">
                  MOTOSERVICIO A&amp;R
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-14 w-14 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
                    <Image
                      src="/logo.png"
                      alt="Logo A&R"
                      fill
                      sizes="56px"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Almacén y Taller Motoservicio A&amp;R
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      La Ceja, Antioquia • +57 301 527 1104
                    </p>
                  </div>
                </div>

                <h1 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-slate-950 dark:text-white">
                  El repuesto exacto para tu moto. <span className="text-[#2E5FA7]">Compra fácil, recíbelo rápido.</span>
                </h1>

                <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                  Más de 15 años en el mercado. Piezas originales y genéricas de calidad, stock permanente y despachos a todo Colombia desde La Ceja, Antioquia.
                </p>

                <div className="mt-4">
                  <CountdownTimer />
                </div>

                <div className="mt-5">
                  <HomeSearch />
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    href="/products"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-bold text-base shadow-lg focus:outline-none transition-transform hover:scale-[1.03] active:scale-100"
                  >
                    <ShoppingCartIcon className="w-5 h-5" />
                    Comprar repuestos
                  </Link>

                  <a
                    href="https://wa.me/573015271104?text=Hola,%20necesito%20un%20repuesto%20para%20mi%20moto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border-2 border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#C7D2E0] font-semibold text-base hover:bg-[#0A2A66]/5 dark:hover:bg-white/5 transition-all"
                  >
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    Asesoría por WhatsApp
                  </a>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-3">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-[#0A2A66] mb-2" />
                    <p className="text-sm font-semibold">Asesoría gratuita</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Te ayudamos a encontrar la pieza correcta.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-3">
                    <ShieldCheckIcon className="w-5 h-5 text-[#0A2A66] mb-2" />
                    <p className="text-sm font-semibold">Garantía en repuestos</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Piezas originales y genéricas de calidad.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-3">
                    <GlobeAltIcon className="w-5 h-5 text-[#0A2A66] mb-2" />
                    <p className="text-sm font-semibold">Envíos a Colombia</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Despachamos a cualquier ciudad del país.</p>
                  </div>
                </div>
                <RecentPurchases products={sliderProducts} />
              </div>
            </div>
          </motion.div>
        </section>

        {/* BARRA DE CONFIANZA */}
        <section className="mt-8 sm:mt-10">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 px-4 py-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />, label: "Soporte por WhatsApp", sub: "Respuesta rápida" },
                { icon: <LockClosedIcon className="w-5 h-5" />, label: "Pagos 100% seguros", sub: "Wompi · Contraentrega" },
                { icon: <TruckIcon className="w-5 h-5" />, label: "Envíos a todo el país", sub: "Colombia" },
                { icon: <StarIcon className="w-5 h-5" />, label: "15+ años en el mercado", sub: "Repuestos garantizados" },
              ].map(({ icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className="text-[#0A2A66] dark:text-[#C7D2E0]">{icon}</div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CATEGORÍAS */}
        <section id="categorias" className="mt-12 sm:mt-14">
          <div className="mb-6">
            <p className="text-sm font-semibold tracking-[0.16em] text-[#2E5FA7] uppercase">Catálogo destacado</p>
            <h3 className="text-2xl sm:text-3xl font-bold mt-1">Encuentra el repuesto que necesitas</h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
              Stock permanente en las principales líneas para motos de todas las marcas. Busca por categoría o usa el buscador.
            </p>
          </div>

          {isLoading ? (
            <p className="text-slate-500">Cargando categorías...</p>
          ) : categories.length === 0 ? (
            <p className="text-slate-500">No hay categorías disponibles.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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

        {/* BENEFICIOS */}
        <section className="mt-14 sm:mt-16">
          <div className="mb-6">
            <p className="text-sm font-semibold tracking-[0.16em] text-[#2E5FA7] uppercase">Ventajas</p>
            <h3 className="text-2xl sm:text-3xl font-bold mt-1">
              ¿Por qué comprar con nosotros?
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<CheckCircleIcon className="w-8 h-8" />}
              title="Piezas originales y garantizadas"
              description="Stock permanente de repuestos originales y genéricas de calidad para todas las marcas."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-8 h-8" />}
              title="Compra 100% segura"
              description="Pago con Wompi, contraentrega o transferencia. Tu dinero protegido en todo momento."
            />
            <FeatureCard
              icon={<TruckIcon className="w-8 h-8" />}
              title="Envío rápido a Colombia"
              description="Despachamos el mismo día hábil. Recibe tu repuesto donde estés en el país."
            />
          </div>
        </section>

        {/* CONVERSIÓN — ¿No encuentras tu repuesto? */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-[28px] overflow-hidden border border-slate-800 bg-gradient-to-br from-[#05101F] via-[#07122E] to-[#0A1F4D] text-white shadow-[0_30px_80px_-30px_rgba(10,42,102,0.6)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Texto */}
              <div className="p-8 sm:p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-widest text-[#C7D2E0] uppercase mb-4 w-fit">
                  Asesoría Personalizada
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                  ¿No encuentras <br className="hidden sm:block" />
                  <span className="text-[#5B8FD9]">el repuesto que buscas?</span>
                </h2>
                <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-md">
                  Escríbenos por WhatsApp con el modelo de tu moto y el repuesto que necesitas. Te respondemos de inmediato y te cotizamos sin compromiso.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  {["Cotización sin compromiso en minutos", "Repuestos para todas las marcas y modelos", "Envío a cualquier ciudad de Colombia"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-[#5B8FD9] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <a
                    href="https://wa.me/573015271104?text=Hola,%20busco%20un%20repuesto%20para%20mi%20moto"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-[#0A2A66] font-bold text-sm shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Cotizar por WhatsApp
                  </a>
                  <Link
                    href="/products"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-all"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    Ver catálogo completo
                  </Link>
                </div>
              </div>

              {/* Panel de cifras de ventas */}
              <div className="p-8 sm:p-10 flex flex-col justify-center gap-6 border-t lg:border-t-0 lg:border-l border-white/10">
                {[
                  { value: "15+", label: "años vendiendo repuestos", icon: <StarIcon className="w-5 h-5" /> },
                  { value: "5.000+", label: "referencias disponibles", icon: <CubeTransparentIcon className="w-5 h-5" /> },
                  { value: "100%", label: "garantía en cada pieza vendida", icon: <ShieldCheckIcon className="w-5 h-5" /> },
                ].map(({ value, label, icon }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-[#5B8FD9] flex-shrink-0">
                      {icon}
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white">{value}</div>
                      <div className="text-sm text-slate-400">{label}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-[28px] overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-[#07122E] via-[#0A2A66] to-[#153B82] text-white p-6 sm:p-8 shadow-[0_20px_70px_-30px_rgba(10,42,102,0.55)]">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold tracking-[0.18em] text-[#C7D2E0] uppercase">Catálogo completo en línea</p>
                <h4 className="text-2xl sm:text-3xl font-bold mt-2">Todo lo que tu moto necesita, disponible ahora</h4>
                <p className="mt-3 text-sm sm:text-base text-slate-200">
                  Stock permanente · Precios directos · Envío a todo Colombia. Calle 21 #14-29, La Ceja, Antioquia.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-white text-[#0A2A66] font-semibold shadow-lg transition-transform hover:scale-[1.02]"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  Ver todos los productos
                </Link>
                <a
                  href="https://wa.me/573015271104?text=Hola,%20quiero%20hacer%20un%20pedido"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full border border-white/30 text-white font-semibold hover:bg-white/10 transition-all"
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  Hacer pedido por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
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
    cta: { label: "Ver producto", href: `/products/${product.id}` },
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
        <p className="text-slate-500 animate-pulse">Cargando productos...</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="relative rounded-2xl shadow-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 h-72 md:h-96 lg:h-[520px] flex items-center justify-center">
        <p className="text-slate-500">No hay productos destacados.</p>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-b from-white/70 to-white/20 dark:from-[#081126]/60 dark:to-[#081126]/30 border border-slate-200 dark:border-slate-800"
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="relative h-[22rem] sm:h-96 lg:h-[520px] select-none">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.98 }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full flex flex-col lg:flex-row items-center"
          >
            <motion.div
              className="relative w-full h-3/5 lg:w-1/2 lg:h-full overflow-hidden flex items-center justify-center bg-white"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.8 }}
            >
              <Image
                src={slides[index].image}
                alt={slides[index].title}
                fill
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain transition-transform duration-[1200ms]"
              />
            </motion.div>

            <div className="w-full h-2/5 lg:w-1/2 lg:h-full p-4 sm:p-6 md:p-10 flex flex-col justify-center pb-8 lg:pb-4">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="bg-gradient-to-r from-[#0A2A66]/20 to-[#2E5FA7]/20 p-3 sm:p-4 rounded-xl backdrop-blur-md border border-white/10 shadow-lg"
              >
                <h3 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7]">
                  {slides[index].title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed text-xs sm:text-sm">
                  {slides[index].subtitle}
                </p>
                <div className="mt-4">
                  <Link
                    href={slides[index].cta.href}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:from-[#081F4D] hover:to-[#1E4F95] text-white font-semibold rounded-full shadow-lg transition-transform duration-300 hover:scale-[1.04]"
                  >
                    {slides[index].cta.label}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Ir al slide ${i + 1}`}
              onClick={() => handleIndicatorClick(i)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                i === index
                  ? "bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] scale-125 shadow-md"
                  : "bg-slate-400/40 dark:bg-slate-600/40 hover:scale-110"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const imageUrl =
    product.images?.[0] ?? product.imageUrl ?? makeProductPlaceholder(product.name);

  const priceStr = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(product.price);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 hover:border-[#2E5FA7] hover:shadow-lg transition-all duration-200"
    >
      {/* Imagen compacta */}
      <div className="w-full h-32 sm:h-36 bg-slate-100 dark:bg-slate-800 rounded-lg mb-3 overflow-hidden flex items-center justify-center flex-shrink-0">
        <Image
          src={imageUrl}
          alt={product.name}
          width={180}
          height={180}
          className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col">
        <span className="text-[10px] font-bold text-[#2E5FA7] uppercase tracking-wider">
          {product.category?.replace(/_/g, " ")}
        </span>
        <h4 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
          {product.name}
        </h4>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-base font-extrabold text-slate-900 dark:text-white">
            {priceStr}
          </span>
          {product.stock <= 5 && product.stock > 0 && (
            <span className="text-[10px] font-bold text-orange-500">
              ¡{product.stock} en stock!
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-3 w-full bg-[#0A2A66] group-hover:bg-[#2E5FA7] text-white text-xs font-bold py-2 rounded-lg transition-colors text-center">
        Ver producto
      </div>
    </Link>
  );
}