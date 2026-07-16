"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCartIcon, HeartIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

import type { Product as ProductType, ProductSize } from "@/types/product";
import type { FlashSale } from "@/types/flash-sale";
import { useCart } from "@/hooks/useCart";
import { useWishlist } from "@/hooks/useWishlist";
import { makeProductPlaceholder, BLUR_DATA_URL } from "@/lib/placeholder";
import { useShippingConfig } from "@/hooks/useShippingConfig";

interface ProductCardProps {
  product: ProductType;
  idx: number;
}

export const ProductCard = React.memo(function ProductCard({ product, idx }: ProductCardProps) {
  const { addToCart, openCartModal } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | undefined>(product.sizes?.[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product.colors?.[0]);
  const [validationError, setValidationError] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [added, setAdded] = useState(false);
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const { toggle: toggleWishlist, isLiked } = useWishlist();
  const liked = isLiked(product.id);
  const { freeShippingThreshold, minShippingRate, isFreeShippingAll } = useShippingConfig();

// ── Oferta Flash Activa (optimizado: fetch específico) ──────────────────────
   useEffect(() => {
     fetch(`/api/flash-sales/applicable?productId=${product.id}&category=${product.category}`)
       .then((r) => (r.ok ? r.json() : null))
       .then((sale: FlashSale | null) => setFlashSale(sale))
       .catch(() => {});
   }, [product.id, product.category]);

// Calcular precios según tipo de oferta (con soporte FIXED_PRICE multi-producto)
    
   const { displayPrice, originalPrice, hasDiscount, discountPercentage } = useMemo(() => {
     if (!flashSale) return { displayPrice: product.price, originalPrice: null, hasDiscount: false, discountPercentage: 0 };

     const mode = flashSale.mode;
     const safeDiscount = Math.min(99, Math.max(0, flashSale.discount));
     const factor = 1 - safeDiscount / 100;

     let dPrice = product.price;
     let oPrice: number | null = null;

     if (mode === "REAL") {
       dPrice = Math.ceil(product.price * factor);
       oPrice = product.price;
     } else if (mode === "ANCHOR") {
       dPrice = product.price;
       if (factor > 0) oPrice = Math.ceil(product.price / factor);
     } else if (mode === "FIXED_PRICE") {
       // Para FIXED_PRICE, buscar el targetPrice específico del producto
       let targetPrice = flashSale.targetPrice;
       if (!targetPrice && flashSale.products?.length) {
         const fpMatch = flashSale.products.find(p => p.productId === product.id);
         if (fpMatch) targetPrice = fpMatch.targetPrice;
       }
       if (targetPrice != null && Number.isFinite(targetPrice)) {
         dPrice = targetPrice;
         if (factor > 0) oPrice = Math.ceil(targetPrice / factor);
       }
     }

     return {
       displayPrice: dPrice,
       originalPrice: oPrice,
       hasDiscount: true,
       discountPercentage: safeDiscount,
     };
   }, [flashSale]);

  const hasFreeShipping = isFreeShippingAll || displayPrice >= freeShippingThreshold;

  const imageSrc = useMemo(
    () => product.images?.[0] ?? product.imageUrl ?? makeProductPlaceholder(product.name, product.id),
    [product.images, product.imageUrl, product.name, product.id]
  );
  const isDataUri = useMemo(() => typeof imageSrc === "string" && imageSrc.startsWith("data:"), [imageSrc]);
  const isNew = useMemo(
    () =>
      product.stock > 0 &&
      !!product.createdAt &&
      Date.now() - new Date(product.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
    [product.stock, product.createdAt]
  );
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const isOutOfStock = product.stock <= 0;

  useEffect(() => {
    if (quantity > (product.stock || 0)) setQuantity(Math.max(1, product.stock || 1));
  }, [product.stock, quantity]);

  const handleAddToCart = () => {
    if ((product.sizes?.length ?? 0) > 0 && !selectedSize) {
      setValidationError("Selecciona una medida.");
      return;
    }
    if ((product.colors?.length ?? 0) > 0 && !selectedColor) {
      setValidationError("Selecciona compatibilidad.");
      return;
    }
    setValidationError("");
    
    // Si hay descuento, el item del carrito debe heredar el precio final con descuento
    addToCart(
      { 
        ...product, 
        price: displayPrice,
        imageUrl: product.images?.[0] ?? "/placeholder.png" 
      },
      quantity,
      selectedSize as ProductSize,
      selectedColor
    );
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCartModal();
    }, 900);
  };

  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasColors = product.colors && product.colors.length > 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, delay: idx * 0.04, ease: "easeOut" }}
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 w-full"
    >
      {/* ── Imagen ──────────────────────────────── */}
      <Link
        href={`/products/${product.slug ?? product.id}`}
        className="relative block overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          unoptimized={isDataUri}
          placeholder={isDataUri ? "empty" : "blur"}
          blurDataURL={isDataUri ? undefined : BLUR_DATA_URL}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* Overlay gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges superiores izquierdos */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
          {hasDiscount && (
            <span className="bg-red-600 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-md animate-pulse">
              -{discountPercentage}%
            </span>
          )}
          {isNew && (
            <span className="bg-[#0A2A66] text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow">
              Nuevo
            </span>
          )}
          {isLowStock && (
            <span className="bg-amber-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow ring-1 ring-amber-300/40">
              ¡Últimas {product.stock}!
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-red-500 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow">
              Agotado
            </span>
          )}
        </div>

        {/* Botón favoritos */}
        <button
          type="button"
          aria-label={liked ? "Quitar de favoritos" : "Añadir a favoritos"}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 shadow border border-slate-200/80 dark:border-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
        >
          {liked ? (
            <HeartSolid className="w-4 h-4 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4 text-slate-500 dark:text-slate-400 hover:text-red-400 transition-colors" />
          )}
        </button>
      </Link>

      {/* ── Contenido ───────────────────────────── */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 gap-2 sm:gap-3">
        {/* Marca si existe */}
        {product.brand && (
          <span className="text-[10px] font-bold text-[#2E5FA7] dark:text-[#5B8DD9] uppercase tracking-wider">
            {product.brand}
          </span>
        )}

        {/* Nombre + precio */}
        <div className="space-y-1">
          <Link href={`/products/${product.slug ?? product.id}`}>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 text-xs sm:text-sm md:text-base hover:text-[#0A2A66] dark:hover:text-[#2E5FA7] transition-colors min-h-[2.5rem]">
              {product.name}
            </h3>
          </Link>
          
          {/* Precios (Display + original strikethrough si aplica) */}
          <div className="flex flex-wrap items-baseline gap-1.5 pt-0.5">
            <span className="text-base sm:text-lg md:text-xl font-extrabold text-[#0A2A66] dark:text-[#5B8DD9] leading-none">
              ${displayPrice.toLocaleString("es-CO")}
            </span>
            {originalPrice && originalPrice > displayPrice && (
              <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 line-through leading-none">
                ${originalPrice.toLocaleString("es-CO")}
              </span>
            )}
          </div>

          {/* Shipping badge */}
          {hasFreeShipping ? (
            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full mt-1">
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Envío gratis
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Envío desde ${minShippingRate.toLocaleString("es-CO")}
            </p>
          )}
        </div>

        {/* Opciones de medida (Solo se muestra si hay información) */}
        {hasSizes && (
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              Medida
            </p>
            <div className="flex flex-wrap gap-1">
              {product.sizes.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  title={s}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all truncate max-w-[100px] ${
                    selectedSize === s
                      ? "bg-[#0A2A66] text-white border-[#0A2A66] shadow-sm"
                      : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#0A2A66]"
                  }`}
                >
                  {s.length > 15 ? s.substring(0, 15) + "..." : s}
                </button>
              ))}
              {product.sizes.length > 3 && (
                <Link
                  href={`/products/${product.slug ?? product.id}`}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  +{product.sizes.length - 3} más
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Opciones de compatibilidad (Solo se muestra si hay información) */}
        {hasColors && (
          <div className="hidden sm:block">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
              Compatibilidad
            </p>
            <div className="flex flex-wrap gap-1">
              {product.colors.slice(0, 3).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  title={c}
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all truncate max-w-[100px] ${
                    selectedColor === c
                      ? "bg-[#2E5FA7] text-white border-[#2E5FA7] shadow-sm"
                      : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-[#2E5FA7]"
                  }`}
                >
                  {c.length > 15 ? c.substring(0, 15) + "..." : c}
                </button>
              ))}
              {product.colors.length > 3 && (
                <Link
                  href={`/products/${product.slug ?? product.id}`}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded-md border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  +{product.colors.length - 3} más
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {validationError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-[11px] font-medium"
            >
              {validationError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cantidad + botón */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 xl:flex-row xl:items-center">
          {/* Qty */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900 shrink-0 mx-auto w-full xl:w-auto">
            <button
              type="button"
              aria-label="Disminuir cantidad"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={isOutOfStock || quantity <= 1}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-8 text-center text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Aumentar cantidad"
              onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
              disabled={isOutOfStock || quantity >= (product.stock || 99)}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
            >
              +
            </button>
          </div>

          {/* CTA */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`w-full xl:flex-1 h-8 sm:h-9 flex items-center justify-center gap-1 rounded-lg text-xs font-bold transition-all duration-300 shadow-sm ${
              added
                ? "bg-green-500 text-white shadow-green-200 dark:shadow-green-900/20 scale-[0.97]"
                : isOutOfStock
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white hover:opacity-95 active:scale-[0.97]"
            }`}
          >
            {added ? (
              <>
                <CheckCircleIcon className="w-4.5 h-4.5 shrink-0" />
                <span>¡Añadido!</span>
              </>
            ) : isOutOfStock ? (
              <span>Agotado</span>
            ) : (
              <>
                <ShoppingCartIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Comprar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
});