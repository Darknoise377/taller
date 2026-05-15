"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCartIcon, HeartIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, HeartIcon as HeartSolid } from "@heroicons/react/24/solid";

import type { Product as ProductType, ProductSize } from "@/types/product";
import { useCart } from "@/hooks/useCart";
import { makeProductPlaceholder, BLUR_DATA_URL } from "@/lib/placeholder";

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
  const [liked, setLiked] = useState(false);

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
    addToCart(
      { ...product, imageUrl: product.images?.[0] ?? "/placeholder.png" },
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

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, delay: idx * 0.04, ease: "easeOut" }}
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* ── Imagen ──────────────────────────────── */}
      <Link
        href={`/products/${product.id}`}
        className="relative block overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          unoptimized={isDataUri}
          placeholder={isDataUri ? "empty" : "blur"}
          blurDataURL={isDataUri ? undefined : BLUR_DATA_URL}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Overlay gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isNew && (
            <span className="bg-[#0A2A66] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
              Nuevo
            </span>
          )}
          {isLowStock && (
            <span className="bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow animate-pulse ring-1 ring-amber-300/40">
              ¡Últimas {product.stock}!
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
              Agotado
            </span>
          )}
        </div>

        {/* Botón favoritos */}
        <button
          type="button"
          aria-label={liked ? "Quitar de favoritos" : "Añadir a favoritos"}
          onClick={(e) => { e.preventDefault(); setLiked(!liked); }}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 shadow border border-slate-200/80 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-10"
        >
          {liked ? (
            <HeartSolid className="w-4 h-4 text-red-500" />
          ) : (
            <HeartIcon className="w-4 h-4 text-slate-400 hover:text-red-400 transition-colors" />
          )}
        </button>
      </Link>

      {/* ── Contenido ───────────────────────────── */}
      <div className="flex flex-col flex-1 p-3 sm:p-4 gap-2 sm:gap-3">
        {/* Nombre + precio */}
        <div>
          <Link href={`/products/${product.id}`}>
            <h3 className="font-bold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2 text-sm sm:text-base hover:text-[#0A2A66] dark:hover:text-[#2E5FA7] transition-colors">
              {product.name}
            </h3>
          </Link>
          <p className="mt-1 text-lg sm:text-2xl font-extrabold text-[#0A2A66] dark:text-[#5B8DD9]">
            ${Number(product.price).toLocaleString("es-CO")}
          </p>
        </div>

        {/* Opciones de medida */}
        {product.sizes && product.sizes.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
              Medida
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    selectedSize === s
                      ? "bg-[#0A2A66] text-white border-[#0A2A66] shadow-sm"
                      : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#0A2A66] dark:hover:border-[#2E5FA7]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Opciones de compatibilidad */}
        {product.colors && product.colors.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">
              Compatibilidad
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    selectedColor === c
                      ? "bg-[#2E5FA7] text-white border-[#2E5FA7] shadow-sm"
                      : "bg-transparent border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2E5FA7]"
                  }`}
                >
                  {c}
                </button>
              ))}
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
              className="text-red-500 text-xs font-medium"
            >
              {validationError}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cantidad + botón */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Qty */}
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0">
            <button
              type="button"
              aria-label="Disminuir cantidad"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={isOutOfStock || quantity <= 1}
              className="w-9 h-10 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-7 text-center text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Aumentar cantidad"
              onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
              disabled={isOutOfStock || quantity >= (product.stock || 99)}
              className="w-9 h-10 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
            >
              +
            </button>
          </div>

          {/* CTA */}
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm ${
              added
                ? "bg-green-500 text-white shadow-green-200 dark:shadow-green-900 scale-[0.97]"
                : isOutOfStock
                ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white hover:opacity-90 hover:shadow-md active:scale-[0.97]"
            }`}
          >
            {added ? (
              <>
                <CheckCircleIcon className="w-4 h-4 shrink-0" />
                <span>¡Añadido!</span>
              </>
            ) : isOutOfStock ? (
              <span>Agotado</span>
            ) : (
              <>
                <ShoppingCartIcon className="w-4 h-4 shrink-0" />
                <span>Añadir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
});