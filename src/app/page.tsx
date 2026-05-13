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
import type { CategoryItem } from "@/types/product";
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, latestProductsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products/latest"),
        ]);

        if (categoriesRes.ok) {
          const categoriesData: CategoryItem[] = await categoriesRes.json();
          setCategories(categoriesData);
        } else {
          console.error(
            "Error al obtener categorías:",
            categoriesRes.status,
            categoriesRes.statusText
          );
          setCategories([]);
        }

        if (latestProductsRes.ok) {
          const latestProductsData: SlideData[] = await latestProductsRes.json();
          setSliderProducts(latestProductsData);
        } else {
          console.error(
            "Error al obtener los últimos productos:",
            latestProductsRes.status,
            latestProductsRes.statusText
          );
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
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#070617] dark:text-slate-100 antialiased font-sans transition-colors duration-300">
      <main className="px-4 sm:px-6 lg:px-10 xl:px-12 pt-6 sm:pt-8 pb-14 sm:pb-16">
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
                  Rueda seguro. Repuestos originales y servicio técnico <span className="text-[#2E5FA7]">sin demoras.</span>
                </h1>

                <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                  Más de 15 años de experiencia. Mecánicos certificados, piezas garantizadas y despachos a todo el país desde La Ceja, Antioquia.
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

                  <Link
                    href="/contact"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border-2 border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#C7D2E0] font-semibold text-base hover:bg-[#0A2A66]/5 dark:hover:bg-white/5 transition-all"
                  >
                    <CalendarDaysIcon className="w-5 h-5" />
                    Agendar taller
                  </Link>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 p-3">
                    <WrenchScrewdriverIcon className="w-5 h-5 text-[#0A2A66] mb-2" />
                    <p className="text-sm font-semibold">Técnicos especializados</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Personal capacitado en todas las marcas.</p>
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
                { icon: <StarIcon className="w-5 h-5" />, label: "15+ años de experiencia", sub: "Mecánicos certificados" },
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
            <h3 className="text-2xl sm:text-3xl font-bold mt-1">Categorías organizadas para comprar más fácil</h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
              Presentamos las líneas principales del taller con una apariencia más ordenada, moderna y confiable.
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
              ¿Por qué elegir nuestra tienda?
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<CheckCircleIcon className="w-8 h-8" />}
              title="Repuestos disponibles"
              description="Amplio stock de piezas originales y genéricas para todas las marcas de motos."
            />
            <FeatureCard
              icon={<CubeTransparentIcon className="w-8 h-8" />}
              title="Servicio técnico"
              description="Mantenimiento preventivo, correctivo y diagnóstico profesional para tu moto."
            />
            <FeatureCard
              icon={<GlobeAltIcon className="w-8 h-8" />}
              title="Envío a todo el país"
              description="Despachamos tus repuestos con envío seguro a cualquier ciudad de Colombia."
            />
          </div>
        </section>

        {/* TALLER — RUPTURA DE PATRÓN */}
        <section className="mt-14 sm:mt-16">
          <div className="rounded-[28px] overflow-hidden border border-slate-800 bg-gradient-to-br from-[#05101F] via-[#07122E] to-[#0A1F4D] text-white shadow-[0_30px_80px_-30px_rgba(10,42,102,0.6)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Texto */}
              <div className="p-8 sm:p-10 flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-widest text-[#C7D2E0] uppercase mb-4 w-fit">
                  Taller Especializado
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
                  No dejes tu moto <br className="hidden sm:block" />
                  <span className="text-[#5B8FD9]">en manos de cualquiera.</span>
                </h2>
                <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-md">
                  Mantenimiento preventivo, correctivo y diagnóstico profesional. Cada pieza instalada con garantía. Tu moto sale rodando, no rodando a empujones.
                </p>
                <ul className="mt-5 space-y-2 text-sm text-slate-300">
                  {["Diagnóstico sin costo adicional", "Repuestos originales instalados en el acto", "Atención sin cita previa de lunes a sábado"].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-[#5B8FD9] flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-[#0A2A66] font-bold text-sm shadow-lg transition-transform hover:scale-[1.02]"
                  >
                    <CalendarDaysIcon className="w-4 h-4" />
                    Agendar servicio
                  </Link>
                  <a
                    href="https://wa.me/573015271104?text=Hola,%20quiero%20agendar%20un%20servicio%20de%20taller"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-all"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>

              {/* Panel de stats de autoridad */}
              <div className="p-8 sm:p-10 flex flex-col justify-center gap-6 border-t lg:border-t-0 lg:border-l border-white/10">
                {[
                  { value: "15+", label: "años de experiencia", icon: <StarIcon className="w-5 h-5" /> },
                  { value: "2.000+", label: "motos atendidas", icon: <WrenchScrewdriverIcon className="w-5 h-5" /> },
                  { value: "100%", label: "garantía en repuestos instalados", icon: <ShieldCheckIcon className="w-5 h-5" /> },
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
                <p className="text-xs font-semibold tracking-[0.18em] text-[#C7D2E0] uppercase">Tu moto en buenas manos</p>
                <h4 className="text-2xl sm:text-3xl font-bold mt-2">Visita nuestro taller o compra tus repuestos en línea</h4>
                <p className="mt-3 text-sm sm:text-base text-slate-200">
                  15+ años de experiencia respaldan nuestro trabajo. Calle 21 #14-29, La Ceja, Antioquia.
                </p>
              </div>
              <Link
                href="/products"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-full bg-white text-[#0A2A66] font-semibold shadow-lg transition-transform hover:scale-[1.02]"
              >
                Ver todos los productos
              </Link>
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

function CategoryCard({
  item,
  config,
  highlight = false,
}: {
  item: CategoryItem;
  config?: { icon: React.ReactNode; colorFrom: string; colorTo: string };
  highlight?: boolean;
}) {
  const URGENCY_LABELS = ["Alta demanda 🔥", "Últimas unidades", "Muy buscado"];
  const urgencyLabel = highlight ? URGENCY_LABELS[Math.abs(item.name.charCodeAt(0)) % URGENCY_LABELS.length] : null;

  return (
    <Link
      href={`/products?category=${encodeURIComponent(item.slug)}`}
      className="block group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/40 p-3 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
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
        <div className="absolute top-3 left-3 z-20 rounded-full bg-white/90 dark:bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-[#0A2A66]">
          {item.count ?? "0"} productos
        </div>
        {urgencyLabel && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
            <FireIcon className="w-3 h-3" />
            {urgencyLabel}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
              config
                ? `bg-gradient-to-br ${config.colorFrom} ${config.colorTo}`
                : "bg-slate-100 dark:bg-slate-800"
            }`}
          >
            {config?.icon ?? <GlobeAltIcon className="w-6 h-6" />}
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 capitalize text-sm sm:text-base">
              {item.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Explorar categoría →
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
      className="bg-white/90 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4 hover:shadow-lg transition-shadow"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white flex-shrink-0 shadow-md">
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