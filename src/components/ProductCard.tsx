// /components/ProductCard.tsx (o la ruta que prefieras)
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShoppingCartIcon, EyeIcon } from '@heroicons/react/24/outline';

import type { Product as ProductType, ProductSize } from '@/types/product';
import { useCart } from '@/hooks/useCart';
import { makeProductPlaceholder } from '@/lib/placeholder';

// --- PROPS DEL COMPONENTE ---
interface ProductCardProps {
  product: ProductType;
  idx: number; // Para la animación escalonada
}

// --- SUBCOMPONENTES INTERNOS ---

const SizeSelector = ({ sizes, selectedSize, onSelect }: { sizes: string[], selectedSize?: string, onSelect: (size: string) => void }) => (
  <div>
    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Medida:</span>
    <div className="flex flex-wrap gap-2 mt-1">
      {sizes.map((size) => (
        <button
          key={size}
          onClick={() => onSelect(size)}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors duration-200 ${
            selectedSize === size
              ? 'bg-[#0A2A66] text-white border-[#0A2A66]'
              : 'bg-transparent border-slate-300 dark:border-slate-700 hover:border-[#0A2A66]'
          }`}
        >
          {size}
        </button>
      ))}
    </div>
  </div>
);

const ColorSelector = ({ colors, selectedColor, onSelect }: { colors: string[], selectedColor?: string, onSelect: (color: string) => void }) => (
  <div>
    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Compatibilidad:</span>
    <div className="flex flex-wrap gap-2 mt-1">
      {colors.map((compatibility) => (
        <button
          key={compatibility}
          onClick={() => onSelect(compatibility)}
          aria-label={`Seleccionar compatibilidad ${compatibility}`}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors duration-200 ${
            selectedColor === compatibility
              ? 'bg-[#2E5FA7] text-white border-[#2E5FA7]'
              : 'bg-transparent border-slate-300 dark:border-slate-700 hover:border-[#2E5FA7]'
          }`}
        >
          {compatibility}
        </button>
      ))}
    </div>
  </div>
);


// --- COMPONENTE PRINCIPAL DE LA TARJETA ---
export function ProductCard({ product, idx }: ProductCardProps) {
  // --- LÓGICA INTERNA (Tomada del segundo componente) ---
  const { addToCart, openCartModal } = useCart();
  const [selectedSize, setSelectedSize] = useState<string | undefined>(product.sizes?.[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product.colors?.[0]);
  const [validationError, setValidationError] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  const imageSrc = product.images?.[0] ?? product.imageUrl ?? makeProductPlaceholder(product.name, product.id);
  const _isDataUri = typeof imageSrc === 'string' && imageSrc.startsWith('data:');

  useEffect(() => {
    // Ajusta la cantidad si el stock cambia o es menor
    if (product.stock <= 0) setQuantity(1);
    if (quantity > (product.stock || 0)) setQuantity(Math.max(1, product.stock || 1));
  }, [product.stock, quantity]);

  const handleAddToCart = () => {
    // Validamos que se hayan seleccionado las opciones si son requeridas
    if (((product.sizes?.length ?? 0) > 0 && !selectedSize) || ((product.colors?.length ?? 0) > 0 && !selectedColor)) {
      setValidationError("Selecciona medida y compatibilidad.");
      return;
    }
    if (quantity <= 0 || (product.stock && quantity > product.stock)) {
      setValidationError("Cantidad no disponible en stock.");
      return;
    }
    setValidationError("");
    addToCart({ ...product, imageUrl: product.images?.[0] ?? "/placeholder.png" }, quantity, selectedSize as ProductSize, selectedColor);
    openCartModal(); // Mejor UX al abrir el modal del carrito
  };

  const isAddDisabled = product.stock <= 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5, delay: idx * 0.05, ease: "easeInOut" }}
      className="group relative flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
    >
      {product.stock <= 0 && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
              Agotado
          </div>
      )}
      {product.stock > 0 && product.createdAt &&
        Date.now() - new Date(product.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000 && (
          <div className="absolute top-3 left-3 bg-[#0A2A66] text-white text-xs font-bold px-2 py-1 rounded-full z-10">
            Nuevo
          </div>
      )}

      <Link href={`/products/${product.id}`} className="block relative aspect-square w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 z-10 flex items-center justify-center">
            <EyeIcon className="w-10 h-10 text-white opacity-0 group-hover:opacity-80 transition-opacity duration-300 transform group-hover:scale-110" />
        </div>
        <Image
          src={imageSrc}
          alt={product.name}
          fill
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
          unoptimized={_isDataUri}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 min-h-[40px]">
            {product.name}
        </h3>

        <p className="text-2xl font-bold mt-2 text-[#0A2A66] dark:text-[#2E5FA7]">
            ${Number(product.price).toLocaleString("es-CO")}
        </p>
        
        <div className="mt-4 flex-grow space-y-3">
          {product.sizes && product.sizes.length > 0 && (
            <SizeSelector
              sizes={product.sizes as string[]}
              selectedSize={selectedSize}
              onSelect={setSelectedSize} // ¡Directo al estado local!
            />
          )}
          {product.colors && product.colors.length > 0 && (
            <ColorSelector
              colors={product.colors}
              selectedColor={selectedColor}
              onSelect={setSelectedColor} // ¡Directo al estado local!
            />
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            {validationError && (
              <p className="text-red-500 text-xs font-medium mb-2">{validationError}</p>
            )}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Disminuir cantidad"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={isAddDisabled || quantity <= 1}
                  className="px-3 py-1 rounded-md border bg-transparent text-sm hover:bg-slate-100 disabled:opacity-40"
                >
                  -
                </button>
                <div className="px-3 py-1 border rounded-md text-sm font-medium">{quantity}</div>
                <button
                  type="button"
                  aria-label="Aumentar cantidad"
                  onClick={() => setQuantity((q) => Math.min((product.stock || 9999), q + 1))}
                  disabled={isAddDisabled || (product.stock ? quantity >= product.stock : false)}
                  className="px-3 py-1 rounded-md border bg-transparent text-sm hover:bg-slate-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>

              <button
                disabled={isAddDisabled}
                onClick={handleAddToCart} // ¡Usa el handler local!
                className="ml-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all duration-200 shadow-md"
              >
                <ShoppingCartIcon className="w-5 h-5" />
                Añadir al Carrito
              </button>
            </div>
        </div>
      </div>
    </motion.article>
  );
}