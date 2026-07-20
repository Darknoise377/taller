'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORY_DESCRIPTIONS,
  type ProductCategory,
} from '@/constants/productCategories';

// Category images mapping (uses same images as category cards)
const CATEGORY_IMAGES: Partial<Record<ProductCategory, string>> = {
  cilindros: '/categories/cilindros.jpg',
  llantas: '/categories/llantas.jpg',
  frenos: '/categories/frenos.jpg',
  aceites_lubricantes: '/categories/aceites.jpg',
  filtros: '/categories/filtros.jpg',
  baterias: '/categories/baterias.jpg',
  transmision: '/categories/transmision.jpg',
  suspension: '/categories/suspension.jpg',
  escape: '/categories/escape.jpg',
  electrico: '/categories/electrico.jpg',
  iluminacion: '/categories/iluminacion.jpg',
  carenaje: '/categories/carenaje.jpg',
  accesorios: '/categories/accesorios.jpg',
};

export default function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<ProductCategory | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  // Split categories into 2 columns
  const leftCategories = PRODUCT_CATEGORIES.slice(0, Math.ceil(PRODUCT_CATEGORIES.length / 2));
  const rightCategories = PRODUCT_CATEGORIES.slice(Math.ceil(PRODUCT_CATEGORIES.length / 2));

  return (
    <div
      ref={menuRef}
      className="relative hidden md:block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors pb-0.5 border-b-2 ${
          isOpen
            ? 'text-[#0A2A66] dark:text-white border-[#0A2A66] dark:border-white font-semibold'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border-transparent hover:border-slate-300 dark:hover:border-slate-600'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2A66] focus-visible:ring-offset-2 rounded`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Squares2X2Icon className="w-5 h-5" />
        Categorías
        <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Mega menu dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[680px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            <div className="grid grid-cols-[1fr_1fr_240px] divide-x divide-slate-100 dark:divide-slate-800">
              {/* Left column */}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
                  Categorías
                </p>
                <nav className="space-y-0.5">
                  {leftCategories.map((cat) => (
                    <Link
                      key={cat}
                      href={`/products/category/${cat}`}
                      onClick={() => setIsOpen(false)}
                      onMouseEnter={() => setHoveredCategory(cat)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        hoveredCategory === cat
                          ? 'bg-[#0A2A66]/5 dark:bg-[#2E5FA7]/10 text-[#0A2A66] dark:text-[#5B9BD5] font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#2E5FA7]/30 dark:bg-[#5B9BD5]/30 shrink-0" />
                      {PRODUCT_CATEGORY_LABELS[cat]}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Right column */}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-2">
                  Más categorías
                </p>
                <nav className="space-y-0.5">
                  {rightCategories.map((cat) => (
                    <Link
                      key={cat}
                      href={`/products/category/${cat}`}
                      onClick={() => setIsOpen(false)}
                      onMouseEnter={() => setHoveredCategory(cat)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        hoveredCategory === cat
                          ? 'bg-[#0A2A66]/5 dark:bg-[#2E5FA7]/10 text-[#0A2A66] dark:text-[#5B9BD5] font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#2E5FA7]/30 dark:bg-[#5B9BD5]/30 shrink-0" />
                      {PRODUCT_CATEGORY_LABELS[cat]}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* Preview panel */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex flex-col">
                {hoveredCategory ? (
                  <>
                    <div className="relative w-full h-28 rounded-xl overflow-hidden mb-3">
                      <Image
                        src={CATEGORY_IMAGES[hoveredCategory] || '/placeholder.png'}
                        alt={PRODUCT_CATEGORY_LABELS[hoveredCategory]}
                        fill
                        className="object-cover"
                        sizes="240px"
                      />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">
                      {PRODUCT_CATEGORY_LABELS[hoveredCategory]}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                      {PRODUCT_CATEGORY_DESCRIPTIONS[hoveredCategory]}
                    </p>
                    <Link
                      href={`/products/category/${hoveredCategory}`}
                      onClick={() => setIsOpen(false)}
                      className="mt-3 text-xs font-semibold text-[#2E5FA7] dark:text-[#5B9BD5] hover:underline"
                    >
                      Ver productos →
                    </Link>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Squares2X2Icon className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Pasa el mouse sobre una categoría para ver detalles
                    </p>
                  </div>
                )}

                {/* Quick link to all */}
                <Link
                  href="/products"
                  onClick={() => setIsOpen(false)}
                  className="mt-4 w-full py-2.5 text-center text-xs font-bold bg-[#0A2A66] dark:bg-[#2E5FA7] text-white rounded-lg hover:bg-[#081F4D] dark:hover:bg-[#5B9BD5] transition-colors"
                >
                  Ver todo el catálogo
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
