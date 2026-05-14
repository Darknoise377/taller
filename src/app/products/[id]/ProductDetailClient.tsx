// src/app/products/[id]/ProductDetailClient.tsx

"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShareIcon,
  StarIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useCart } from "@/context/CartContext";
import { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getProductCategoryLabel } from '@/constants/productCategories';
import { Facebook, Instagram } from 'lucide-react';
import ProductReviews from "@/components/ProductReviews";
import { BLUR_DATA_URL } from "@/lib/placeholder";

// --- Prop Interfaces ---
interface ProductDetailClientProps {
  product: Product;
  relatedProducts?: Product[];
}

interface ImageGalleryProps {
  images: string[];
  productName: string;
}

// --- Lightbox fullscreen ---
const Lightbox: React.FC<{
  images: string[];
  productName: string;
  initialIndex: number;
  onClose: () => void;
}> = ({ images, productName, initialIndex, onClose }) => {
  const [idx, setIdx] = useState(initialIndex);

  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* Imagen centrada */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={images[idx]}
          alt={`${productName} - vista ${idx + 1}`}
          fill
          className="object-contain"
          sizes="100vw"
          priority
        />

        {/* Cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar imagen"
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white transition"
        >
          <XMarkIcon className="w-7 h-7" />
        </button>

        {/* Flechas */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Imagen anterior"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white transition"
            >
              <ChevronLeftIcon className="w-7 h-7" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Imagen siguiente"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm text-white transition"
            >
              <ChevronRightIcon className="w-7 h-7" />
            </button>
          </>
        )}

        {/* Contador */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white" : "w-1.5 bg-white/40"}`}
              aria-label={`Imagen ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Galería de Imágenes ---
const ImageGallery: React.FC<ImageGalleryProps> = ({ images, productName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const prev = useCallback(() => setCurrentIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrentIndex((i) => (i + 1) % images.length), [images.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxOpen(true); }
  };

  return (
    <>
      {lightboxOpen && (
        <Lightbox
          images={images}
          productName={productName}
          initialIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* Mobile: imagen arriba, thumbnails abajo */}
      {/* Desktop: thumbnails verticales izquierda, imagen derecha */}
      <div className="w-full flex flex-col md:flex-row gap-3">
        {/* Thumbnails verticales SOLO en desktop */}
        {images.length > 1 && (
          <div className="hidden md:flex flex-col gap-2 shrink-0">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                aria-label={`Ver imagen ${i + 1}`}
                aria-current={currentIndex === i}
                className={cn(
                  "relative w-[72px] h-[72px] rounded-xl overflow-hidden border-2 transition-all bg-white dark:bg-slate-900",
                  currentIndex === i
                    ? "border-[#0A2A66] dark:border-[#2E5FA7] shadow-md"
                    : "border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-400"
                )}
              >
                <Image
                  src={img}
                  alt={`Miniatura ${i + 1} de ${productName}`}
                  fill
                  loading="lazy"
                  className="object-contain p-1"
                />
              </button>
            ))}
          </div>
        )}

        {/* Columna principal: imagen + thumbnails mobile */}
        <div className="flex flex-col gap-3 min-w-0 flex-1">
          {/* Imagen principal — usa w-full + aspect-square para NO hacer overflow */}
          <figure
            className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md cursor-zoom-in group"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onClick={() => setLightboxOpen(true)}
            onMouseEnter={() => setIsZooming(true)}
            onMouseLeave={() => setIsZooming(false)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoomPos({
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
              });
            }}
            aria-label={`Imagen de ${productName}. Toca para ver a pantalla completa.`}
          >
            <Image
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${productName} - vista ${currentIndex + 1}`}
              fill
              priority
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              className={cn(
                "object-contain p-2 transition-transform duration-200",
                isZooming && "scale-[1.7]"
              )}
              style={isZooming ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : undefined}
              sizes="(max-width: 768px) 100vw, 50vw"
            />

            {/* Hint fullscreen — visible en hover (desktop) y siempre en mobile */}
            <div className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-300 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-sm pointer-events-none">
              <MagnifyingGlassPlusIcon className="w-5 h-5" />
            </div>

            {/* Flechas — solo si hay varias imágenes */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  aria-label="Imagen anterior"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md hover:bg-white dark:hover:bg-slate-800 transition active:scale-95"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  aria-label="Imagen siguiente"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md hover:bg-white dark:hover:bg-slate-800 transition active:scale-95"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/20 backdrop-blur-sm rounded-full px-2 py-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                    aria-label={`Imagen ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === currentIndex ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            )}

            <figcaption className="sr-only">Vista {currentIndex + 1} de {images.length}</figcaption>
          </figure>

          {/* Thumbnails horizontales SOLO en mobile */}
          {images.length > 1 && (
            <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  aria-current={currentIndex === i}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all bg-white dark:bg-slate-900",
                    currentIndex === i
                      ? "border-[#0A2A66] dark:border-[#2E5FA7] shadow"
                      : "border-slate-200 dark:border-slate-700 opacity-55 hover:opacity-100"
                  )}
                >
                  <Image
                    src={img}
                    alt={`Miniatura ${i + 1} de ${productName}`}
                    fill
                    loading="lazy"
                    className="object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

/**
 * ✨ Componente Principal de la Página
 */
const ProductDetailClient: React.FC<ProductDetailClientProps> = ({ product, relatedProducts = [] }) => {
  const { addToCart } = useCart();
  const [selectedSize, setSelectedSize] = useState<Product["sizes"][number] | undefined>(product.sizes?.[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product.colors?.[0]);
  const [quantity, setQuantity] = useState<number>(1);
  const [validationMessage, setValidationMessage] = useState<string>("");
  const relatedScrollerRef = useRef<HTMLDivElement>(null);
  const [activeRelatedIndex, setActiveRelatedIndex] = useState(0);
  const autoScrollIntervalRef = useRef<number | null>(null);
  const resumeTimeoutRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef(false);
  const [recentlyViewed, setRecentlyViewed] = useState<{ id: string; name: string; imageUrl: string; price: number; currency: string }[]>([]);

  const images = useMemo(() => 
    product.images && product.images.length > 0 ? product.images : [product.imageUrl || "/placeholder.png"],
    [product.images, product.imageUrl]
  );
  
  const handleAddToCart = () => {
    if (product.stock <= 0) {
      setValidationMessage("Este producto está agotado.");
      return;
    }
    if (product.sizes.length > 0 && !selectedSize) {
      setValidationMessage("Selecciona una medida/referencia antes de anadir al carrito.");
      return;
    }
    if (product.colors.length > 0 && !selectedColor) {
      setValidationMessage("Selecciona una compatibilidad antes de anadir al carrito.");
      return;
    }

    setValidationMessage("");
    addToCart(product, quantity, selectedSize, selectedColor);
  };

  const lowStockThreshold = 5;

  useEffect(() => {
    setValidationMessage("");
  }, [selectedSize, selectedColor, quantity]);

  // Visto recientemente — guardar al entrar a la página
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ar-recently-viewed");
      const existing: { id: string; name: string; imageUrl: string; price: number; currency: string }[] = raw ? JSON.parse(raw) : [];
      const filtered = existing.filter((item) => item.id !== product.id);
      const updated = [
        { id: product.id, name: product.name, imageUrl: product.imageUrl || "/placeholder.png", price: Number(product.price), currency: product.currency || "COP" },
        ...filtered,
      ].slice(0, 6);
      localStorage.setItem("ar-recently-viewed", JSON.stringify(updated));
      setRecentlyViewed(filtered.slice(0, 4));
    } catch {
      // ignorar si localStorage no disponible
    }
  }, [product.id, product.name, product.imageUrl, product.price, product.currency]);

  useEffect(() => {
    if (relatedProducts.length <= 1) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;

    if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
    autoScrollIntervalRef.current = window.setInterval(() => {
      if (isUserInteractingRef.current) return;
      const scroller = relatedScrollerRef.current;
      if (!scroller) return;
      const cards = scroller.querySelectorAll("article");
      if (cards.length <= 1) return;
      setActiveRelatedIndex((prev) => {
        const next = (prev + 1) % cards.length;
        const target = cards[next] as HTMLElement;
        target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        return next;
      });
    }, 4500);

    return () => {
      if (autoScrollIntervalRef.current) clearInterval(autoScrollIntervalRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, [relatedProducts.length]);

  const pauseAutoScroll = () => {
    isUserInteractingRef.current = true;
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = window.setTimeout(() => {
      isUserInteractingRef.current = false;
    }, 6000);
  };

  const trackRelatedClick = (itemId: string, position: number) => {
    try {
      const key = `ctr_related_${product.id}`;
      const raw = localStorage.getItem(key);
      const data: Record<string, number> = raw ? JSON.parse(raw) : {};
      data[`item_${itemId}`] = (data[`item_${itemId}`] || 0) + 1;
      data[`pos_${position}`] = (data[`pos_${position}`] || 0) + 1;
      data._total = (data._total || 0) + 1;
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // ignorar si localStorage no disponible
    }
  };

  const scrollToRelatedIndex = (index: number) => {
    const scroller = relatedScrollerRef.current;
    if (!scroller) return;
    const cards = scroller.querySelectorAll("article");
    if (!cards[index]) return;
    (cards[index] as HTMLElement).scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActiveRelatedIndex(index);
  };

  const descriptionText =
    product.description?.trim() ||
    "Repuesto para moto de alta calidad. Revisa compatibilidad por marca, modelo y medida antes de comprar.";

  return (
    <div className="overflow-x-hidden bg-white text-slate-900 dark:bg-[#070617] dark:text-slate-100 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 pb-8 sm:pb-14">
        <nav aria-label="Miga de pan" className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href="/"
                className="hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded"
              >
                Inicio
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li>
              <Link
                href="/products"
                className="hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded"
              >
                Productos
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li>
              <Link
                href={`/products?category=${product.category}`}
                className="capitalize hover:text-slate-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617] rounded"
              >
                {getProductCategoryLabel(product.category)}
              </Link>
            </li>
            <li aria-hidden="true" className="text-slate-400">/</li>
            <li className="text-slate-700 dark:text-slate-200 line-clamp-1" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <article className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <ImageGallery images={images} productName={product.name} />

          <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 lg:sticky lg:top-24">
            <header>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {product.name}
              </h1>

              {/* Star Rating (visual display) */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center" aria-label="Calificación: 4.5 de 5 estrellas">
                  {[1, 2, 3, 4, 5].map((star) => (
                    star <= 4 ? (
                      <StarIconSolid key={star} className="w-5 h-5 text-amber-400" />
                    ) : (
                      <StarIcon key={star} className="w-5 h-5 text-amber-400/40" />
                    )
                  ))}
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">4.5 / 5</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">(Reseñas próximamente)</span>
              </div>

              {/* Detalles técnicos rápidos (SKU, categoría, etiquetas, diagrama) */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                <div>
                  <div className="text-xs text-slate-500">SKU</div>
                  <div className="font-medium mt-1 break-all">{product.sku ?? String(product.id)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Categoría</div>
                  <div className="font-medium mt-1">{getProductCategoryLabel(product.category)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Etiquetas</div>
                  <div className="mt-1 break-words">{product.tags && product.tags.length > 0 ? product.tags.join(', ') : <span className="text-slate-400">Sin etiquetas</span>}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Número en Diagrama</div>
                  <div className="font-medium mt-1 break-all">{product.diagramNumber ?? <span className="text-slate-400">—</span>}</div>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
                {descriptionText}
              </p>
            </header>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2" id="stock-status">
                {product.stock > 0 ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full",
                      product.stock <= lowStockThreshold
                        ? "text-yellow-900 bg-yellow-100 animate-pulse ring-1 ring-yellow-200/60"
                        : "text-green-900 bg-green-100"
                    )}
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {product.stock <= lowStockThreshold
                      ? `¡Últimas ${product.stock}!`
                      : "Disponible"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-900 bg-red-100 px-3 py-1 rounded-full">
                    <XCircleIcon className="w-5 h-5" />
                    Agotado
                  </span>
                )}
              </div>

              {/* Urgency callout — only when very low stock */}
              {product.stock > 0 && product.stock <= 3 && (
                <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-3.5 py-2.5">
                  <span className="text-lg leading-none" aria-hidden="true">🔥</span>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400 leading-snug">
                    ¡Alta demanda! Solo quedan <strong>{product.stock}</strong> {product.stock === 1 ? "unidad" : "unidades"} — compra antes que se agoten.
                  </p>
                </div>
              )}
            </div>

            {validationMessage && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 text-red-900 px-4 py-3 text-sm"
              >
                {validationMessage}
              </div>
            )}

            <div className="mt-6 border-t border-slate-200/80 dark:border-slate-800/80 pt-6 space-y-6">
              {product.sizes.length > 0 && (
                <section aria-label="Opciones de medida">
                  <h2 className="text-base font-semibold">
                    Medida / referencia:{" "}
                    <span className="font-normal text-slate-600 dark:text-slate-300">
                      {selectedSize ?? "Sin seleccionar"}
                    </span>
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        
                        className={cn(
                          "px-4 h-10 min-w-[44px] flex items-center justify-center rounded-lg text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617]",
                          selectedSize === s
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                            : "bg-transparent border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-200"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {product.colors.length > 0 && (
                <section aria-label="Opciones de compatibilidad">
                  <h2 className="text-base font-semibold">
                    Compatibilidad:{" "}
                    <span className="font-normal text-slate-600 dark:text-slate-300 capitalize">
                      {selectedColor ?? "Sin seleccionar"}
                    </span>
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {product.colors.map((compatibility) => (
                      <button
                        key={compatibility}
                        type="button"
                        onClick={() => setSelectedColor(compatibility)}
                        aria-label={`Seleccionar compatibilidad ${compatibility}`}
                        
                        className={cn(
                          "px-3 h-10 rounded-lg text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2E5FA7] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#070617]",
                          selectedColor === compatibility
                            ? "bg-[#2E5FA7] text-white border-[#2E5FA7]"
                            : "bg-transparent border-slate-300 dark:border-slate-700 hover:border-[#2E5FA7]"
                        )}
                      >
                        {compatibility}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section aria-label="Cantidad y compra" className="space-y-4">
                {/* Precio prominente en mobile */}
                <div className="rounded-2xl bg-[#0A2A66]/5 dark:bg-[#2E5FA7]/10 border border-[#0A2A66]/10 dark:border-[#2E5FA7]/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Precio unitario</p>
                  <p className="text-4xl font-extrabold text-[#0A2A66] dark:text-[#2E5FA7]">
                    {product.currency} {Number(product.price).toLocaleString("es-CO")}
                  </p>
                  {quantity > 1 && (
                    <p className="text-sm text-slate-500 mt-1">Total: {product.currency} {Number(product.price * quantity).toLocaleString("es-CO")}</p>
                  )}
                </div>

                {/* Qty + botón siempre visibles */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Disminuir cantidad"
                      className="px-4 py-3 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <span className="text-lg font-bold w-10 text-center" aria-live="polite">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      aria-label="Aumentar cantidad"
                      className="px-4 py-3 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
                      disabled={quantity >= product.stock}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={product.stock <= 0}
                    onClick={handleAddToCart}
                    aria-describedby="stock-status"
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-bold text-base shadow-lg shadow-[#0A2A66]/30 transition-all duration-200 hover:opacity-95 hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCartIcon className="w-5 h-5 shrink-0" />
                    {product.stock > 0 ? "Añadir al carrito" : "Agotado"}
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>💡</span> Confirma compatibilidad con tu moto antes de comprar.
                </p>

                {/* Trust strip */}
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="flex flex-col items-center gap-1 text-center">
                    <svg className="w-6 h-6 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Envío a Colombia</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">A toda la nación</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <svg className="w-6 h-6 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Calidad garantizada</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">Originales y genéricos</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <svg className="w-6 h-6 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 leading-tight">Pago seguro</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">PayU · Wompi</p>
                  </div>
                </div>

                {/* Share buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Compartir:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.share) {
                        navigator.share({
                          title: product.name,
                          text: `Mira este producto: ${product.name}`,
                          url: window.location.href,
                        });
                      } else {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Enlace copiado al portapapeles");
                      }
                    }}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label="Compartir producto"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Mira este producto: ${product.name} - ` + (typeof window !== "undefined" ? window.location.href : ""))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                    aria-label="Compartir por WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>
                  {/* Follow links */}
                  <div className="w-full sm:w-auto sm:ml-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Síguenos:</span>
                    <a
                      href="https://www.facebook.com/AlmacenyTallerAYR/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a
                      href="https://www.instagram.com/motoservicioayr/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a
                      href="https://www.tiktok.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="TikTok"
                    >
                      TikTok
                    </a>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </article>

        <ProductReviews productId={product.id} />
        
        {/* Productos Relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 sm:mt-28">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">También te podría interesar</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Complementa tu compra con repuestos de la misma categoría.
                </p>
              </div>
              <Link
                href="/products"
                className="text-sm font-semibold text-[#0A2A66] dark:text-[#2E5FA7] hover:underline"
              >
                Ver todo el catálogo
              </Link>
            </div>

            <div
              ref={relatedScrollerRef}
              className="md:hidden -mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
              onTouchStart={pauseAutoScroll}
              onScroll={(e) => {
                const target = e.currentTarget;
                const cardWidth = target.firstElementChild instanceof HTMLElement ? target.firstElementChild.offsetWidth + 16 : 1;
                const index = Math.round(target.scrollLeft / cardWidth);
                if (!Number.isNaN(index)) setActiveRelatedIndex(Math.max(0, Math.min(index, relatedProducts.length - 1)));
              }}
            >
              {relatedProducts.map((item, idx) => (
                <article
                  key={item.id}
                  className="snap-start snap-always min-w-[72%] bg-white/80 dark:bg-slate-900/50 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800"
                >
                  <Link href={`/products/${item.id}`} aria-label={`Ver detalles de ${item.name}`} onClick={() => trackRelatedClick(item.id, idx)}>
                    <div className="relative w-full aspect-square">
                      <Image
                        src={item.imageUrl || "/placeholder.png"}
                        alt={`Imagen de ${item.name}`}
                        fill
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="72vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 min-h-[40px]">
                        {item.name}
                      </h3>
                      <span className="text-[#0A2A66] dark:text-[#2E5FA7] font-bold mt-1 block">
                        {item.currency} {Number(item.price).toLocaleString("es-CO")}
                      </span>
                      <span className="mt-3 inline-flex items-center text-xs font-semibold text-[#0A2A66] dark:text-[#2E5FA7]">
                        Ver producto →
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            <div className="md:hidden mt-3 flex items-center justify-center gap-1.5">
              {relatedProducts.map((item, idx) => (
                <button
                  key={`dot-${item.id}`}
                  type="button"
                  onClick={() => scrollToRelatedIndex(idx)}
                  aria-label={`Ir al relacionado ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${activeRelatedIndex === idx ? 'w-6 bg-[#0A2A66] dark:bg-[#2E5FA7]' : 'w-1.5 bg-slate-300 dark:bg-slate-600'}`}
                />
              ))}
            </div>

            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((item, idx) => (
                <article key={item.id} className="bg-white/70 dark:bg-slate-900/40 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 transition-all hover:shadow-xl hover:-translate-y-1">
                  <Link href={`/products/${item.id}`} aria-label={`Ver detalles de ${item.name}`} onClick={() => trackRelatedClick(item.id, idx)}>
                    <div className="relative w-full aspect-square">
                      <Image
                        src={item.imageUrl || "/placeholder.png"}
                        alt={`Imagen de ${item.name}`}
                        fill
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold line-clamp-2 min-h-[40px]">{item.name}</h3>
                      <span className="text-[#0A2A66] dark:text-[#2E5FA7] font-bold mt-1 block">
                        {item.currency} {Number(item.price).toLocaleString("es-CO")}
                      </span>
                      <span className="mt-2 inline-flex items-center text-xs font-semibold text-[#0A2A66] dark:text-[#2E5FA7]">
                        Ver producto →
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Vistos recientemente */}
        {recentlyViewed.length > 0 && (
          <section className="mt-16 sm:mt-20" aria-label="Vistos recientemente">
            <h2 className="text-xl sm:text-2xl font-bold mb-5 text-slate-900 dark:text-slate-100">
              Vistos recientemente
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentlyViewed.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-contain p-2"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-slate-200">{item.name}</p>
                    <p className="text-sm font-bold text-[#0A2A66] dark:text-[#2E5FA7] mt-1">
                      {item.currency} {item.price.toLocaleString("es-CO")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetailClient;