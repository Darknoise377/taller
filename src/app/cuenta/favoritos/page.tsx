'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeartIcon } from '@heroicons/react/24/outline';
import { useWishlist } from '@/hooks/useWishlist';
import { productService } from '@/services/productService';
import type { Product } from '@/types/product';
import { formatCurrency } from '@/utils/formatCurrency';
import { makeProductPlaceholder } from '@/lib/placeholder';

export default function FavoritosPage() {
  const { items: wishlistIds, toggle } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.allSettled(wishlistIds.map((id) => productService.getProduct(id)))
      .then((results) => {
        const resolved = results
          .filter((r): r is PromiseFulfilledResult<Product> => r.status === 'fulfilled')
          .map((r) => r.value);
        setProducts(resolved);
      })
      .finally(() => setLoading(false));
  }, [wishlistIds]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <HeartIcon className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mis favoritos</h1>
        {products.length > 0 && (
          <span className="ml-auto text-sm text-gray-500 dark:text-slate-400">
            {products.length} {products.length === 1 ? 'producto' : 'productos'}
          </span>
        )}
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" aria-busy="true">
          {Array.from({ length: wishlistIds.length || 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-800 h-64" />
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <HeartIcon className="w-16 h-16 text-gray-300 dark:text-slate-700" />
          <p className="text-gray-500 dark:text-slate-400 text-lg">No tienes productos favoritos.</p>
          <Link
            href="/products"
            className="px-5 py-2.5 rounded-full bg-[#0A2A66] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Explorar productos
          </Link>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => {
            const imgSrc = product.images?.[0] ?? product.imageUrl ?? makeProductPlaceholder(product.name, product.id);
            return (
              <div
                key={product.id}
                className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
              >
                <Link href={`/products/${product.id}`} className="relative block aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <Image
                    src={imgSrc}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    unoptimized={imgSrc.startsWith('data:')}
                  />
                </Link>

                <div className="flex flex-col flex-1 p-4 gap-2">
                  <Link href={`/products/${product.id}`}>
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 text-sm hover:text-[#0A2A66] dark:hover:text-[#2E5FA7] transition-colors">
                      {product.name}
                    </h2>
                  </Link>
                  <p className="text-lg font-extrabold text-[#0A2A66] dark:text-[#5B8DD9]">
                    {formatCurrency(product.price, product.currency)}
                  </p>

                  {product.stock <= 0 && (
                    <span className="text-xs text-red-500 font-medium">Agotado</span>
                  )}

                  <div className="mt-auto flex items-center gap-2 pt-2">
                    <Link
                      href={`/products/${product.id}`}
                      className="flex-1 text-center py-2 px-4 rounded-full bg-[#0A2A66] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Ver producto
                    </Link>
                    <button
                      type="button"
                      aria-label="Quitar de favoritos"
                      onClick={() => toggle(product.id)}
                      className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <HeartIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
