"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Tag } from 'antd';
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
import { VideoPlayer } from "@/components/VideoPlayer";
import { BLUR_DATA_URL } from "@/lib/placeholder";
import FloatingCombos from '@/components/FloatingCombos';
import { FlashSale } from '@/types/flash-sale';
import { formatCurrency, formatCurrencyStrikethrough, calculateDisplayPrices } from '@/utils/formatCurrency';

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

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (diff > 50) {
      next(); // Deslizar a la izquierda -> Siguiente imagen
    } else if (diff < -50) {
      prev(); // Deslizar a la derecha -> Imagen anterior
    }
    touchStartX.current = null;
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
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);

  const images = useMemo(() => 
    product.images && product.images.length > 0 ? product.images : [product.imageUrl || "/placeholder.png"],
    [product.images, product.imageUrl]
  );

// Cargar oferta flash activa para este producto (optimizado: solo la oferta aplicable)
   useEffect(() => {
     fetch(`/api/flash-sales/applicable?productId=${product.id}&category=${product.category}`)
       .then(r => r.ok ? r.json() : null)
       .then((sale: FlashSale | null) => setFlashSale(sale))
       .catch(() => {});
   }, [product.id, product.category]);

// Calcular precios según tipo de oferta
   const { displayPrice, originalPrice } = useMemo(() => {
     if (!flashSale) return { displayPrice: product.price, originalPrice: null };

     // Para FIXED_PRICE, buscar el targetPrice específico del producto
     let targetPrice = flashSale.targetPrice;
     if (!targetPrice && flashSale.products?.length) {
       const fpMatch = flashSale.products.find(p => p.productId === product.id);
       if (fpMatch) targetPrice = fpMatch.targetPrice;
     }

     const result = calculateDisplayPrices({
       basePrice: product.price,
       discountPercentage: flashSale.discount,
       mode: flashSale.mode,
       targetPrice: targetPrice,
     });

     return { displayPrice: result.displayPrice, originalPrice: result.originalPrice };
   }, [flashSale, product.price, product.id]);

  const handleCopySku = () => {
    const textToCopy = product.sku || product.id;
    navigator.clipboard.writeText(textToCopy);
    toast.success("¡Referencia copiada al portapapeles!");
  };

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      const msg = "Este producto está agotado.";
      setValidationMessage(msg);
      toast.error(msg);
      return;
    }
    if (product.sizes.length > 0 && !selectedSize) {
      const msg = "Selecciona una medida/referencia antes de añadir al carrito.";
      setValidationMessage(msg);
      toast.error(msg);
      return;
    }
    if (product.colors.length > 0 && !selectedColor) {
      const msg = "Selecciona una compatibilidad antes de añadir al carrito.";
      setValidationMessage(msg);
      toast.error(msg);
      return;
    }

    setValidationMessage("");
    addToCart(product, quantity, selectedSize, selectedColor);
    toast.success("¡Producto añadido al carrito!");
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

  // Registrar visita a este producto en analytics
  useEffect(() => {
    fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `/products/${product.id}`,
        label: product.name,
      }),
    }).catch(() => {/* ignorar errores de analytics */});
  }, [product.id, product.name]);

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
        const cardWidth = (cards[0] as HTMLElement).offsetWidth + 12;
        scroller.scrollTo({
          left: next * cardWidth,
          behavior: "smooth",
        });
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
    if (cards.length === 0 || !cards[index]) return;
    const cardWidth = (cards[0] as HTMLElement).offsetWidth + 12;
    scroller.scrollTo({
      left: index * cardWidth,
      behavior: "smooth",
    });
    setActiveRelatedIndex(index);
  };

  const descriptionText =
    product.description?.trim() ||
    "Repuesto para moto de alta calidad. Revisa compatibilidad por marca, modelo y medida antes de comprar.";

  return (
    <div className="min-h-screen bg-white dark:bg-[#070617] text-slate-900 dark:text-slate-100 overflow-x-hidden">
      {/* Breadcrumb compacto */}
      <nav aria-label="Miga de pan" className="px-4 pt-3 pb-1 text-xs text-slate-400 dark:text-slate-500">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true" className="mx-0.5">/</li>
          <li>
            <Link href="/products" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Productos
            </Link>
          </li>
          <li aria-hidden="true" className="mx-0.5">/</li>
          <li>
            <Link href={`/products/category/${product.category}`} className="capitalize hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              {getProductCategoryLabel(product.category)}
            </Link>
          </li>
          <li aria-hidden="true" className="mx-0.5">/</li>
          <li className="text-slate-600 dark:text-slate-400 font-medium line-clamp-1 max-w-[140px]" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="max-w-7xl mx-auto pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-16">
        {/* Mobile: galería con espaciado recomendado y bordes pulidos */}
        <div className="md:hidden px-4 pt-3 sm:px-6">
          <ImageGallery images={images} productName={product.name} />
        </div>

        {/* Dos columnas en desktop */}
        <div className="lg:grid lg:grid-cols-[1fr_480px] lg:gap-10 xl:gap-14 lg:items-start lg:px-8 lg:pt-8">

          {/* Galería desktop */}
          <div className="hidden md:block px-6 pt-6 lg:px-0 lg:pt-0">
            <ImageGallery images={images} productName={product.name} />
          </div>

          {/* ===== INFO DEL PRODUCTO ===== */}
          <div className="px-4 md:px-6 lg:px-0 pt-5 lg:pt-0 space-y-4">

            {/* Chip de categoría + botón compartir */}
            <div className="flex items-center justify-between">
              <Link
                href={`/products/category/${product.category}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A2A66]/8 dark:bg-[#2E5FA7]/20 text-[#0A2A66] dark:text-[#5B9BD5] text-xs font-bold uppercase tracking-wide hover:bg-[#0A2A66]/15 transition-colors"
              >
                {getProductCategoryLabel(product.category)}
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({ title: product.name, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Enlace copiado");
                  }
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Compartir producto"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Título */}
            <h1 className="text-[1.65rem] sm:text-3xl font-extrabold tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex items-center" aria-label="Calificación: 4.5 de 5 estrellas">
                {[1, 2, 3, 4, 5].map((star) =>
                  star <= 4
                    ? <StarIconSolid key={star} className="w-4 h-4 text-amber-400" />
                    : <StarIcon key={star} className="w-4 h-4 text-amber-400/40" />
                )}
              </div>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">4.5</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">· Calidad verificada</span>
            </div>

            {/* Precio prominente */}
            <div className="flex items-baseline gap-3 py-1">
              {flashSale && originalPrice ? (
                <>
                  <Tag color="red" className="text-sm font-bold px-2 py-0.5">
                    -{flashSale.discount}%
                  </Tag>
                  <span className="text-lg text-slate-400 dark:text-slate-500 line-through">
                    {formatCurrencyStrikethrough(originalPrice, product.currency)}
                  </span>
                  <span className="text-4xl font-black text-[#0A2A66] dark:text-white tracking-tight">
                    {formatCurrency(displayPrice, product.currency)}
                  </span>
                </>
              ) : (
                <span className="text-4xl font-black text-[#0A2A66] dark:text-white tracking-tight">
                  {formatCurrency(product.price, product.currency)}
                </span>
              )}
            </div>

            {/* Badge de stock */}
            <div className="flex items-center gap-2" id="stock-status">
              {product.stock > 0 ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full",
                    product.stock <= lowStockThreshold
                      ? "text-orange-800 bg-orange-100 dark:bg-orange-500/20 dark:text-orange-300 animate-pulse"
                      : "text-emerald-800 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-300"
                  )}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {product.stock <= lowStockThreshold
                    ? `¡Solo quedan ${product.stock} unidades!`
                    : "Disponible · En stock"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-800 bg-red-100 dark:bg-red-500/20 dark:text-red-300 px-3 py-1.5 rounded-full">
                  <XCircleIcon className="w-4 h-4" /> Agotado
                </span>
              )}
            </div>

            {/* Urgencia */}
                        {product.stock > 0 && product.stock <= 3 && (
                          <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 rounded-xl px-3.5 py-2.5">
                            <span className="text-base shrink-0">🔥</span>
                            <p className="text-sm font-semibold text-red-700 dark:text-red-400 leading-snug">
                              ¡Alta demanda! Solo <strong>{product.stock}</strong> {product.stock === 1 ? "unidad" : "unidades"} disponibles.
                            </p>
                          </div>
                        )}

                        {/* Reproductor de Video de Cloudinary */}
                        {product.videoUrl && 
                         product.videoUrl !== "null" && 
                         product.videoUrl !== "undefined" && 
                         product.videoUrl.trim() !== "" && (
                          <div className="pt-2 pb-1">
                             <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Video del producto</h2>
                             <VideoPlayer 
                                src={product.videoUrl} 
                                poster={product.imageUrl || undefined}
                                className="w-full aspect-video shadow-md"
                             />
                          </div>
                        )}

                        {/* Mensaje de validación */}
            {validationMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 text-red-800 dark:text-red-400 px-4 py-3 text-sm font-medium"
              >
                {validationMessage}
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800" />

            {/* Medidas */}
            {product.sizes.length > 0 && (
              <section aria-label="Opciones de medida">
                <p className="text-sm font-semibold mb-2.5">
                  Medida / referencia:{" "}
                  <span className="font-bold text-[#0A2A66] dark:text-[#5B9BD5]">
                    {selectedSize ?? <span className="text-slate-400 font-normal">Selecciona</span>}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={cn(
                        "px-4 h-10 min-w-[44px] flex items-center justify-center rounded-xl text-sm font-semibold border-2 transition-all",
                        selectedSize === s
                          ? "bg-[#0A2A66] dark:bg-[#2E5FA7] text-white border-[#0A2A66] dark:border-[#2E5FA7] shadow-md"
                          : "border-slate-200 dark:border-slate-700 hover:border-[#0A2A66] dark:hover:border-[#2E5FA7]"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Compatibilidad */}
            {product.colors.length > 0 && (
              <section aria-label="Opciones de compatibilidad">
                <p className="text-sm font-semibold mb-2.5">
                  Compatibilidad:{" "}
                  <span className="font-bold text-[#0A2A66] dark:text-[#5B9BD5] capitalize">
                    {selectedColor ?? <span className="text-slate-400 font-normal">Selecciona</span>}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      aria-label={`Seleccionar compatibilidad ${c}`}
                      className={cn(
                        "px-3 h-10 rounded-xl text-sm font-semibold border-2 transition-all",
                        selectedColor === c
                          ? "bg-[#0A2A66] dark:bg-[#2E5FA7] text-white border-[#0A2A66] dark:border-[#2E5FA7] shadow-md"
                          : "border-slate-200 dark:border-slate-700 hover:border-[#0A2A66] dark:hover:border-[#2E5FA7]"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Desktop: cantidad + botón añadir */}
            <div className="hidden md:flex items-center gap-3 pt-2">
              <div className="flex items-center border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  className="px-4 py-3 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
                >
                  −
                </button>
                <span className="text-lg font-bold w-10 text-center" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  className="px-4 py-3 text-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={handleAddToCart}
                aria-describedby="stock-status"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-bold text-base shadow-lg shadow-[#0A2A66]/25 hover:opacity-95 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                {product.stock > 0 ? "Añadir al carrito" : "Agotado"}
              </button>
            </div>

            <p className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>💡</span> Confirma compatibilidad con tu moto antes de comprar.
            </p>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2 py-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col items-center text-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70">
                <svg className="w-6 h-6 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">Envío a Colombia</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">A toda la nación</p>
              </div>
              <div className="flex flex-col items-center text-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70">
                <svg className="w-6 h-6 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">Calidad garantizada</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Original y genérico</p>
              </div>
              <div className="flex flex-col items-center text-center gap-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70">
                <svg className="w-6 h-6 text-[#0A2A66] dark:text-[#2E5FA7]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 leading-tight">Pago seguro</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight">Wompi · PayU</p>
              </div>
            </div>

            {/* Descripción */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Descripción</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{descriptionText}</p>
            </div>

            {/* Ficha técnica */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3.5">Ficha Técnica</h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div>
                  <dt className="text-xs text-slate-400 dark:text-slate-500 font-medium">Referencia / SKU</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-1 flex items-center gap-1.5 select-all">
                    <span className="break-all">
                      {product.sku ?? `REF-${product.id.slice(0, 8).toUpperCase()}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySku}
                      title="Copiar referencia"
                      className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5" />
                      </svg>
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400 dark:text-slate-500 font-medium">Categoría</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-1 capitalize">{getProductCategoryLabel(product.category)}</dd>
                </div>
                {product.brand && (
                  <div>
                    <dt className="text-xs text-slate-400 dark:text-slate-500 font-medium">Marca</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{product.brand}</dd>
                  </div>
                )}
                {product.diagramNumber && (
                  <div>
                    <dt className="text-xs text-slate-400 dark:text-slate-500 font-medium">N° en diagrama</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-200 mt-1">{product.diagramNumber}</dd>
                  </div>
                )}
                {product.tags && product.tags.length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-1.5">Etiquetas</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {product.tags.map((tag) => (
                        <span key={tag} className="inline-block px-2.5 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">{tag}</span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Fila de compartir */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Compartir:</span>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({ title: product.name, text: `Mira este producto: ${product.name}`, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Enlace copiado al portapapeles");
                  }
                }}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                aria-label="Compartir producto"
              >
                <ShareIcon className="w-4 h-4" />
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Mira este producto: ${product.name} - ` + (typeof window !== "undefined" ? window.location.href : ""))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                aria-label="Compartir por WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/AlmacenyTallerAYR/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/motoservicioayr/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>

          </div>{/* fin info producto */}
        </div>{/* fin dos columnas */}

        {/* Reseñas */}
        <div className="px-4 md:px-8 mt-10">
          <ProductReviews productId={product.id} />
        </div>

        {/* Productos relacionados */}
        {relatedProducts.length > 0 && (
          <section className="mt-14 px-4 md:px-8" aria-label="Productos relacionados">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">También te podría interesar</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Complementa tu compra con más repuestos.</p>
              </div>
              <Link
                href="/products"
                className="text-sm font-bold text-[#0A2A66] dark:text-[#2E5FA7] hover:underline shrink-0"
              >
                Ver todo
              </Link>
            </div>

            {/* Scroll horizontal mobile */}
            <div
              ref={relatedScrollerRef}
              className="md:hidden -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
              onTouchStart={pauseAutoScroll}
              onScroll={(e) => {
                const target = e.currentTarget;
                const cardWidth = target.firstElementChild instanceof HTMLElement ? target.firstElementChild.offsetWidth + 12 : 1;
                const index = Math.round(target.scrollLeft / cardWidth);
                if (!Number.isNaN(index)) setActiveRelatedIndex(Math.max(0, Math.min(index, relatedProducts.length - 1)));
              }}
            >
              {relatedProducts.map((item, idx) => (
                <article
                  key={item.id}
                  className="snap-start snap-always flex-shrink-0 w-[46%] bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
                >
                  <Link href={`/products/${item.id}`} onClick={() => trackRelatedClick(item.id, idx)}>
                    <div className="relative aspect-square bg-slate-50 dark:bg-slate-800">
                      <Image
                        src={item.imageUrl || "/placeholder.png"}
                        alt={item.name}
                        fill
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="46vw"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug min-h-[40px]">{item.name}</p>
                      <p className="mt-1.5 text-base font-bold text-[#0A2A66] dark:text-[#5B9BD5]">{item.currency} {Number(item.price).toLocaleString("es-CO")}</p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {/* Dots indicadores */}
            <div className="md:hidden mt-3 flex justify-center gap-1.5">
              {relatedProducts.map((item, idx) => (
                <button
                  key={`dot-${item.id}`}
                  type="button"
                  onClick={() => scrollToRelatedIndex(idx)}
                  aria-label={`Relacionado ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all ${activeRelatedIndex === idx ? "w-6 bg-[#0A2A66] dark:bg-[#2E5FA7]" : "w-1.5 bg-slate-300 dark:bg-slate-600"}`}
                />
              ))}
            </div>

            {/* Grid desktop */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((item, idx) => (
                <article key={item.id} className="bg-white dark:bg-slate-900/60 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all">
                  <Link href={`/products/${item.id}`} onClick={() => trackRelatedClick(item.id, idx)}>
                    <div className="relative aspect-square">
                      <Image
                        src={item.imageUrl || "/placeholder.png"}
                        alt={item.name}
                        fill
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="25vw"
                      />
                    </div>
                    <div className="p-4">
                      <p className="font-semibold line-clamp-2 min-h-[40px] text-sm">{item.name}</p>
                      <p className="text-[#0A2A66] dark:text-[#2E5FA7] font-bold mt-1">{item.currency} {Number(item.price).toLocaleString("es-CO")}</p>
                      <span className="mt-2 inline-flex items-center text-xs font-semibold text-[#0A2A66] dark:text-[#2E5FA7]">Ver producto →</span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Vistos recientemente */}
        {recentlyViewed.length > 0 && (
          <section className="mt-10 px-4 md:px-8 pb-4" aria-label="Vistos recientemente">
            <h2 className="text-lg font-bold mb-4">Vistos recientemente</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {recentlyViewed.map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  className="group block rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-contain p-2 group-hover:scale-105 transition-transform"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium line-clamp-2 text-slate-800 dark:text-slate-200">{item.name}</p>
                    <p className="text-sm font-bold text-[#0A2A66] dark:text-[#2E5FA7] mt-0.5">{item.currency} {item.price.toLocaleString("es-CO")}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ===== BARRA STICKY INFERIOR — Solo móvil ===== */}
      <div className="md:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] inset-x-0 z-40 bg-white/96 dark:bg-[#070617]/96 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center gap-3 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        <div className="flex items-center border-2 border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Disminuir cantidad"
            className="px-3.5 py-2.5 text-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center font-bold text-base" aria-live="polite">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
            disabled={quantity >= product.stock}
            aria-label="Aumentar cantidad"
            className="px-3.5 py-2.5 text-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={product.stock <= 0}
          onClick={handleAddToCart}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-bold text-[15px] shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ShoppingCartIcon className="w-5 h-5 shrink-0" />
          <span className="whitespace-nowrap">
            {product.stock > 0
              ? `Añadir · $${Number(product.price).toLocaleString("es-CO")}`
              : "Agotado"}
          </span>
        </button>
      </div>

      {/* Floating combos panel (reusable) */}
      <FloatingCombos excludeProductId={product.id} />

    </div>
  );
};

export default ProductDetailClient;