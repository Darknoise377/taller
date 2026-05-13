"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  CubeTransparentIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
  LockClosedIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import type { CategoryItem, Product } from "@/types/product";
import HomeSearch from '@/components/HomeSearch';
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
