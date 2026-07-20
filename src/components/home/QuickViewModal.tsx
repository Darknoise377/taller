'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ShoppingCartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import type { Product as ProductType } from '@/types/product';
import { useCart } from '@/hooks/useCart';
import { makeProductPlaceholder, BLUR_DATA_URL } from '@/lib/placeholder';

interface QuickViewModalProps {
  product: ProductType | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addToCart, openCartModal } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // Reset state when product changes
  React.useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes?.[0]);
      setSelectedColor(product.colors?.[0]);
      setQuantity(1);
      setAdded(false);
      setImageIndex(0);
    }
  }, [product]);

  const images = useMemo(() => {
    if (!product) return [];
    const imgs = product.images?.length
      ? product.images
      : [product.imageUrl ?? makeProductPlaceholder(product.name, product.id)];
    return imgs;
  }, [product]);

  if (!product) return null;

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleAddToCart = () => {
    addToCart(
      { ...product, imageUrl: images[0] ?? '/placeholder.png' },
      quantity,
      selectedSize,
      selectedColor,
    );
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      openCartModal();
      onClose();
    }, 900);
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Cerrar vista rápida"
            >
              <XMarkIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Image section */}
              <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 md:rounded-l-3xl overflow-hidden">
                <Image
                  src={images[imageIndex] || '/placeholder.png'}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />

                {/* Image navigation */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-black/50 rounded-full shadow hover:bg-white dark:hover:bg-black/70 transition-colors"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 dark:bg-black/50 rounded-full shadow hover:bg-white dark:hover:bg-black/70 transition-colors"
                      aria-label="Imagen siguiente"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                    {/* Dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setImageIndex(i)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            i === imageIndex
                              ? 'bg-white w-5'
                              : 'bg-white/50 hover:bg-white/80'
                          }`}
                          aria-label={`Ir a imagen ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1">
                  {isLowStock && (
                    <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Quedan {product.stock}
                    </span>
                  )}
                  {isOutOfStock && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      Agotado
                    </span>
                  )}
                </div>
              </div>

              {/* Info section */}
              <div className="p-6 md:p-8 flex flex-col gap-4">
                {/* Brand */}
                {product.brand && (
                  <span className="text-[11px] font-bold text-[#2E5FA7] dark:text-[#5B9BD5] uppercase tracking-wider">
                    {product.brand}
                  </span>
                )}

                {/* Name */}
                <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
                  {product.name}
                </h3>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {product.description}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-extrabold text-[#0A2A66] dark:text-[#5B9BD5]">
                    ${product.price.toLocaleString('es-CO')}
                  </span>
                </div>

                {/* Category */}
                <span className="inline-flex items-center text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full w-fit capitalize">
                  {product.category?.replace(/_/g, ' ')}
                </span>

                {/* Sizes */}
                {product.sizes?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                      Medida
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
                            selectedSize === s
                              ? 'bg-[#0A2A66] text-white border-[#0A2A66]'
                              : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#0A2A66]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {product.colors?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                      Compatibilidad
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
                            selectedColor === c
                              ? 'bg-[#2E5FA7] text-white border-[#2E5FA7]'
                              : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-[#2E5FA7]'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity + Add to cart */}
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
                  {/* Quantity */}
                  <div className="flex items-center rounded-xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={isOutOfStock || quantity <= 1}
                      className="w-10 h-10 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(product.stock || 99, q + 1))}
                      disabled={isOutOfStock || quantity >= (product.stock || 99)}
                      className="w-10 h-10 flex items-center justify-center text-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to cart button */}
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={handleAddToCart}
                    className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm ${
                      added
                        ? 'bg-green-500 text-white'
                        : isOutOfStock
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white hover:opacity-95 active:scale-[0.97]'
                    }`}
                  >
                    {added ? (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        Agregado al carrito
                      </>
                    ) : isOutOfStock ? (
                      'Agotado'
                    ) : (
                      <>
                        <ShoppingCartIcon className="w-5 h-5" />
                        Agregar al carrito
                      </>
                    )}
                  </button>
                </div>

                {/* View full details link */}
                <Link
                  href={`/products/${product.slug ?? product.id}`}
                  className="text-center text-sm font-medium text-[#2E5FA7] dark:text-[#5B9BD5] hover:underline"
                  onClick={onClose}
                >
                  Ver todos los detalles →
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
