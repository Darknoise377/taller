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
import CountdownTimer from '@/components/CountdownTimer';
import RecentPurchases from '@/components/RecentPurchases';
import { ProductCard } from '@/components/ProductCard';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, latestProductsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products/latest"),
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
      } catch (err) {
        console.error("Error al cargar los datos de la página:", err);
        setCategories([]);
        setSliderProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060D1F] text-slate-900 dark:text-slate-100 antialiased">

      {/* ════════════════════════════════════════
          HERO — full-width, dark gradient band
          ════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#07122E] via-[#0A2A66] to-[#0D1F4E]">
        {/* Background texture rings */}
        <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#2E5FA7]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#0A2A66]/20 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* LEFT — copy + CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="order-1"
            >
              {/* Brand pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-[11px] font-bold tracking-[0.18em] text-white/70 uppercase mb-5">
                <div className="relative h-5 w-5 rounded-full overflow-hidden border border-white/20 bg-white/10 shrink-0">
                  <Image src="/logo.png" alt="A&R" fill sizes="20px" className="object-cover" priority />
                </div>
                Motoservicio A&amp;R · La Ceja, Ant.
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-[1.1] tracking-tight text-white">
                El repuesto exacto<br />
                <span className="text-[#5B9BD5]">para tu moto.</span>
              </h1>

              <p className="mt-4 text-base sm:text-lg text-white/60 max-w-lg leading-relaxed">
                15+ años en el mercado. Piezas originales y genéricas, stock permanente y despachos a todo Colombia.
              </p>

              <div className="mt-5">
                <CountdownTimer />
              </div>

              <div className="mt-6 max-w-md">
                <HomeSearch />
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#0A2A66] font-bold text-sm shadow-lg hover:bg-slate-100 transition-colors"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  Ver catálogo
                </Link>
                <a
                  href="https://wa.me/573015271104?text=Hola,%20necesito%20un%20repuesto%20para%20mi%20moto"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/25 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
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
                  { icon: <StarIcon className="w-4 h-4" />, text: "15+ años de experiencia" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-white/55 text-xs">
                    <span className="text-[#5B9BD5]">{icon}</span>
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
              <div className="rounded-2xl overflow-hidden shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)] border border-white/10">
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
          <FeaturedProductsRow />
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
          <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-[#060E20] via-[#07122E] to-[#0A1F4E] border border-white/8 shadow-[0_40px_100px_-40px_rgba(10,42,102,0.7)]">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="p-8 sm:p-12 flex flex-col justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] font-bold tracking-widest text-[#C7D2E0] uppercase mb-5 w-fit">
                  Asesoría personalizada
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-white">
                  ¿No encuentras<br />
                  <span className="text-[#5B9BD5]">el repuesto que buscas?</span>
                </h3>
                <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-md leading-relaxed">
                  Escríbenos por WhatsApp con el modelo de tu moto. Te cotizamos en minutos, sin compromiso.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
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
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#0A2A66] font-bold text-sm shadow-lg hover:bg-slate-100 transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Cotizar por WhatsApp
                  </a>
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                  >
                    <ShoppingCartIcon className="w-4 h-4" />
                    Ver catálogo
                  </Link>
                </div>
              </div>

              <div className="p-8 sm:p-12 flex flex-col justify-center gap-7 border-t lg:border-t-0 lg:border-l border-white/8">
                {[
                  { value: "15+", label: "años vendiendo repuestos", icon: <StarIcon className="w-5 h-5" /> },
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
                    <div className="w-12 h-12 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center text-[#5B9BD5] shrink-0">
                      {icon}
                    </div>
                    <div>
                      <div className="text-4xl font-extrabold text-white leading-none">{value}</div>
                      <div className="text-sm text-slate-400 mt-0.5">{label}</div>
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
          <div className="rounded-3xl bg-gradient-to-r from-[#07122E] via-[#0A2A66] to-[#153B82] p-8 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 shadow-[0_30px_80px_-30px_rgba(10,42,102,0.5)]">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">Catálogo completo en línea</p>
              <h4 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">
                Todo lo que tu moto necesita,<br className="hidden sm:block" /> disponible ahora
              </h4>
              <p className="mt-2 text-sm text-white/55">
                Stock permanente · Precios directos · Envíos a Colombia · Calle 27 #14-29, La Ceja
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-[#0A2A66] font-bold text-sm shadow-lg hover:bg-slate-100 transition-colors"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                Ver todos los productos
              </Link>
              <a
                href="https://wa.me/573015271104?text=Hola,%20quiero%20hacer%20un%20pedido"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-white/25 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
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
      <div className="relative h-[22rem] sm:h-[28rem] lg:h-[480px] select-none">
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
                className="bg-[#07122E]/70 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-xl shadow-lg"
              >
                <h3 className="text-base sm:text-xl md:text-3xl font-bold tracking-tight text-white leading-tight">
                  {slides[index].title}
                </h3>
                <p className="text-white/55 mt-1.5 leading-relaxed text-xs sm:text-sm line-clamp-2">
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


function CategoryCard({ item, config, highlight }: {
  item: CategoryItem;
  config?: { icon: React.ReactNode; colorFrom: string; colorTo: string };
  highlight?: boolean;
}) {
  const URGENCY_LABELS = ["Alta demanda 🔥", "Últimas unidades", "Muy buscado"];
  const urgencyLabel = highlight ? URGENCY_LABELS[Math.abs(item.name.charCodeAt(0)) % URGENCY_LABELS.length] : null;

  return (
    <Link
      href={`/products?category=${encodeURIComponent(item.slug)}`}
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

function FeaturedProductsRow() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products?limit=8&sort=newest")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const items: ProductType[] = (Array.isArray(data) ? data : (data.items ?? [])).map(
            (it: ProductType & Record<string, unknown>) => ({
              ...it,
              createdAt: typeof it.createdAt === "string" ? it.createdAt : undefined,
              updatedAt: typeof it.updatedAt === "string" ? it.updatedAt : undefined,
            })
          );
          setProducts(items);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {products.map((p, idx) => (
        <ProductCard key={p.id} product={p} idx={idx} />
      ))}
    </div>
  );
}
