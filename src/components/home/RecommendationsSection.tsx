'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { ProductCard } from '@/components/ProductCard';
import type { Product as ProductType } from '@/types/product';

interface RecommendationsSectionProps {
  /** All available products to generate recommendations from */
  allProducts: ProductType[];
  /** Maximum number of recommendations to show */
  maxItems?: number;
}

/**
 * Generates personalized recommendations based on:
 * 1. Recently viewed products (from localStorage)
 * 2. Popular products (by soldCount)
 * 3. Category affinity
 */
export default function RecommendationsSection({
  allProducts,
  maxItems = 4,
}: RecommendationsSectionProps) {
  const recommendations = useMemo(() => {
    if (allProducts.length === 0) return [];

    // Try to get recently viewed from localStorage
    let recentlyViewed: string[] = [];
    try {
      const stored = localStorage?.getItem('ar-recently-viewed');
      if (stored) recentlyViewed = JSON.parse(stored);
    } catch { /* SSR or no localStorage */ }

    // Find category affinity from recently viewed products
    const viewedProducts = allProducts.filter((p) => recentlyViewed.includes(p.id));
    const categoryAffinity = new Map<string, number>();
    viewedProducts.forEach((p) => {
      categoryAffinity.set(p.category, (categoryAffinity.get(p.category) || 0) + 1);
    });

    // Score each product
    const scored = allProducts
      .filter((p) => !recentlyViewed.includes(p.id) && p.stock > 0)
      .map((product) => {
        let score = 0;

        // Category affinity score (strongest signal)
        const catScore = categoryAffinity.get(product.category) || 0;
        score += catScore * 10;

        // Recency score (newer products score higher)
        if (product.createdAt) {
          const daysOld = (Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld < 7) score += 8;
          else if (daysOld < 30) score += 5;
          else if (daysOld < 90) score += 2;
        }

        // Popularity score
        if (product.soldCount) {
          score += Math.min(product.soldCount, 20);
        }

        // Brand affinity
        const viewedBrands = new Set(viewedProducts.map((p) => p.brand).filter(Boolean));
        if (product.brand && viewedBrands.has(product.brand)) {
          score += 5;
        }

        // Price similarity (±30% of average viewed price)
        if (viewedProducts.length > 0) {
          const avgPrice = viewedProducts.reduce((s, p) => s + p.price, 0) / viewedProducts.length;
          const priceDiff = Math.abs(product.price - avgPrice) / avgPrice;
          if (priceDiff < 0.3) score += 3;
        }

        return { product, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxItems)
      .map(({ product }) => product);

    // If no personalized recommendations, fall back to popular/new items
    if (scored.length < maxItems) {
      const fallback = allProducts
        .filter((p) => p.stock > 0 && !scored.includes(p))
        .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
        .slice(0, maxItems - scored.length);
      return [...scored, ...fallback];
    }

    return scored;
  }, [allProducts, maxItems]);

  if (recommendations.length === 0) return null;

  return (
    <section id="recomendados">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
      >
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <SparklesIcon className="w-4 h-4 text-purple-500" />
            <p className="text-[10px] font-bold tracking-[0.2em] text-purple-600 dark:text-purple-400 uppercase">
              Para ti
            </p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Recomendados
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Basado en tus intereses y lo más popular
          </p>
        </div>
        <Link
          href="/products"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
        >
          Ver más
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {recommendations.map((product, idx) => (
          <ProductCard key={product.id} product={product} idx={idx} />
        ))}
      </div>
    </section>
  );
}
