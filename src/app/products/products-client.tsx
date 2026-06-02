"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDebounce } from "use-debounce";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import type { Product as ProductType, ProductSize } from "@/types/product";
import {
  PRODUCT_CATEGORIES,
  getProductCategoryDescription,
  getProductCategoryLabel,
} from "@/constants/productCategories";
import { ProductCard } from '../../components/ProductCard';
import FloatingCombos from '@/components/FloatingCombos';

type ProductsClientProps = {
  initialProducts: ProductType[];
  totalCount?: number;
  initialCategory?: string;
};

function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function ProductsClient({
  initialProducts,
  totalCount: initialTotal,
  initialCategory,
}: ProductsClientProps) {
  const [products, setProducts] = useState<ProductType[]>(initialProducts ?? []);
  const [totalCount, setTotalCount] = useState<number>(initialTotal ?? initialProducts?.length ?? 0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [pathname, setPathname] = useState<string>("");
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory ?? "all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  // Ordenamiento + precio + paginación en servidor
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // Debounce del término de búsqueda para evitar un fetch por cada pulsación
  const [debouncedSearchTerm] = useDebounce(searchTerm, 400);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q") || params.get("search") || params.get("model") || "";
      setSearchTerm(q);
      setSelectedCategory(params.get("category") || initialCategory || "all");
      setSelectedSize(params.get("size") || "all");
      setSelectedColor(params.get("color") || "all");
      setSelectedModel(params.get("model") || "all");
      setSortBy(params.get("sort") || "relevance");
      setMinPrice(params.get("minPrice") || "");
      setMaxPrice(params.get("maxPrice") || "");
    }
  }, [initialCategory]);

  const uniqueSizes = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.sizes ?? []))).filter(Boolean),
    [products]
  );
  const uniqueColors = useMemo(
    () => Array.from(new Set(products.flatMap((p) => p.colors ?? []))).filter(Boolean),
    [products]
  );

  const modelSuggestions = useMemo(() => {
    const counts = new Map<string, number>();
    const stopwords = new Set([
      'para','de','y','con','en','a','el','la','los','las','del','por','repuesto','kit','original','nuevo','usado','marca','medida'
    ]);
    products.forEach((p) => {
      const text = `${p.name} ${p.description || ''}`.toLowerCase();
      const tokens = text.match(/[a-z0-9áéíóúñü]+/gi) || [];
      tokens.forEach((t) => {
        if (t.length < 2) return;
        if (stopwords.has(t)) return;
        const n = counts.get(t) ?? 0;
        counts.set(t, n + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .slice(0, 12);
  }, [products]);

  // Fetch paginated products from API respecting current filters
  const fetchProductsFromServer = useCallback(
    async (p = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const params = new URLSearchParams();
        const effectiveQuery = debouncedSearchTerm || (selectedModel !== 'all' ? selectedModel : '');
        if (effectiveQuery) params.set('q', effectiveQuery);
        if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
        if (selectedSize && selectedSize !== 'all') params.set('size', selectedSize);
        if (selectedColor && selectedColor !== 'all') params.set('color', selectedColor);
        if (sortBy && sortBy !== 'relevance') params.set('sort', sortBy);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        params.set('page', String(p));
        params.set('limit', append ? '12' : '24');

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error('Error al cargar productos');
        const data = await res.json();
        const items: ProductType[] = (Array.isArray(data?.items) ? data.items : []).map((raw: unknown) => {
          const it = raw as ProductType & Record<string, unknown>;
          return {
            ...it,
            createdAt: typeof it.createdAt === 'string' ? it.createdAt : undefined,
            updatedAt: typeof it.updatedAt === 'string' ? it.updatedAt : undefined,
          };
        });

        if (append) {
          setProducts((prev) => [...prev, ...items]);
          setPage(p);
        } else {
          setProducts(items);
          setPage(1);
        }

        if (typeof data.total === 'number') setTotalCount(data.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearchTerm, selectedCategory, selectedSize, selectedColor, selectedModel, sortBy, minPrice, maxPrice]
  );

  // Cuando cambian filtros en la UI, pedimos página 1 al servidor
  useEffect(() => {
    // Evitar fetch en la primera renderización que ya trae `initialProducts`
    // Pero si los filtros cambian, recargar desde el servidor
    fetchProductsFromServer(1, false);
  }, [fetchProductsFromServer]);

  const updateURLParams = useCallback((paramsToUpdate: Record<string, string>) => {
    if (typeof window === "undefined") return;
    const currentParams = new URLSearchParams(window.location.search);
    Object.entries(paramsToUpdate).forEach(([key, value]) => {
      if (value === "" || value === "all") currentParams.delete(key);
      else currentParams.set(key, value);
    });
    setSearchTerm(currentParams.get("q") || "");
    setSelectedCategory(currentParams.get("category") || "all");
    setSelectedSize(currentParams.get("size") || "all");
    setSelectedColor(currentParams.get("color") || "all");
    setSelectedModel(currentParams.get('model') || 'all');
    setSortBy(currentParams.get('sort') || 'relevance');
    setMinPrice(currentParams.get('minPrice') || '');
    setMaxPrice(currentParams.get('maxPrice') || '');
    const newPath = currentParams.toString() ? `${pathname}?${currentParams.toString()}` : pathname;
    window.history.pushState({ path: newPath }, "", newPath);
  }, [pathname]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => updateURLParams({ q: e.target.value });
  const handleFilterChange = (type: "category" | "size" | "color" | "model", value: string) => updateURLParams({ [type]: value });
  const handleSortChange = (value: string) => updateURLParams({ sort: value });
  const handlePriceChange = (min: string, max: string) => updateURLParams({ minPrice: min, maxPrice: max });

  const filteredProducts = useMemo(() => {
    const q = normalizeForSearch(searchTerm);
    const modelQuery = normalizeForSearch(selectedModel === 'all' ? '' : selectedModel);
    return products.filter((product) => {
      const productText = normalizeForSearch(`${product.name} ${product.description ?? ''}`);
      const matchesQuery = !q || productText.includes(q);
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSize = selectedSize === "all" || (product.sizes?.includes(selectedSize as ProductSize) ?? false);
      const matchesColor = selectedColor === "all" || (product.colors?.includes(selectedColor as ProductSize) ?? false);
      const matchesModel = !modelQuery || productText.includes(modelQuery);
      const price = Number(product.price ?? 0);
      const minOk = !minPrice || price >= Number(minPrice);
      const maxOk = !maxPrice || price <= Number(maxPrice);
      return matchesQuery && matchesCategory && matchesSize && matchesColor && matchesModel && minOk && maxOk;
    });
  }, [products, searchTerm, selectedCategory, selectedSize, selectedColor, selectedModel, minPrice, maxPrice]);

  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'price-asc') return list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') return list.sort((a, b) => b.price - a.price);
    if (sortBy === 'newest') return list.sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0));
    return list; // relevance (default)
  }, [filteredProducts, sortBy]);

  const visibleProducts = sortedProducts;

  const areFiltersActive = useMemo(
    () =>
      !!searchTerm ||
      selectedCategory !== "all" ||
      selectedSize !== "all" ||
      selectedColor !== "all" ||
      selectedModel !== "all" ||
      !!minPrice || !!maxPrice || sortBy !== 'relevance',
    [searchTerm, selectedCategory, selectedSize, selectedColor, selectedModel, minPrice, maxPrice, sortBy]
  );

  const selectedCategoryLabel = useMemo(
    () => (selectedCategory !== "all" ? getProductCategoryLabel(selectedCategory) : null),
    [selectedCategory]
  );

  const selectedCategoryDescription = useMemo(
    () => (selectedCategory !== "all" ? getProductCategoryDescription(selectedCategory) : null),
    [selectedCategory]
  );

  const handleResetFilters = useCallback(() => {
    updateURLParams({ q: "", category: "all", size: "all", color: "all", model: 'all', minPrice: '', maxPrice: '', sort: 'relevance' });
    setShowMobileFilters(false);
  }, [updateURLParams]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (selectedCategory !== 'all') c++;
    if (selectedSize !== 'all') c++;
    if (selectedColor !== 'all') c++;
    if (selectedModel !== 'all') c++;
    if (minPrice || maxPrice) c++;
    if (sortBy !== 'relevance') c++;
    return c;
  }, [selectedCategory, selectedSize, selectedColor, selectedModel, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    if (!showMobileFilters) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showMobileFilters]);

  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      if (products.length === 0 || areFiltersActive) {
        fetchProductsFromServer(1, false);
      }
      return;
    }
    // Cuando cambian filtros después de la primera carga
    fetchProductsFromServer(1, false);
  }, [fetchProductsFromServer, areFiltersActive, products.length]);

  return (
    <div className="bg-gray-50 dark:bg-[#070617] min-h-screen">
      {/* ── Sticky search + category bar ─────────────────────────────── */}
      <div className="sticky top-[68px] z-30 bg-white/95 dark:bg-[#070617]/98 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search + controls row */}
          <div className="flex items-center gap-2 py-3">
            {/* Search input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                placeholder="Buscar repuesto, marca o modelo..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-[#0A2A66] dark:focus:border-[#2E5FA7] focus:bg-white dark:focus:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 outline-none transition-all placeholder-slate-400"
              />
            </div>
            {/* Desktop: sort */}
            <div className="relative hidden md:block">
              <select
                aria-label="Ordenar"
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="pl-3 pr-8 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border border-transparent text-slate-700 dark:text-slate-300 appearance-none cursor-pointer outline-none hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <option value="relevance">Relevancia</option>
                <option value="price-asc">Precio ↑</option>
                <option value="price-desc">Precio ↓</option>
                <option value="newest">Recientes</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
            {/* Mobile: filter button */}
            <button
              type="button"
              onClick={() => setShowMobileFilters(true)}
              className={`md:hidden flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                areFiltersActive
                  ? 'bg-[#0A2A66] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              {areFiltersActive ? `Filtros (${activeFilterCount})` : 'Filtros'}
            </button>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
            <button
              type="button"
              onClick={() => handleFilterChange('category', 'all')}
              className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                selectedCategory === 'all'
                  ? 'bg-[#0A2A66] text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleFilterChange('category', cat)}
                className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-[#0A2A66] text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {getProductCategoryLabel(cat)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Desktop: advanced filters row */}
        <div className="hidden md:flex flex-wrap items-center gap-2 mb-5">
          <FilterSelect label="Medida" value={selectedSize} onChange={(e) => handleFilterChange("size", e.target.value)} options={uniqueSizes} />
          <FilterSelect label="Compatibilidad" value={selectedColor} onChange={(e) => handleFilterChange("color", e.target.value)} options={uniqueColors} />
          <FilterSelect label="Modelo" value={selectedModel} onChange={(e) => handleFilterChange('model', e.target.value)} options={modelSuggestions} />
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 border border-transparent text-sm">
            <span className="text-slate-400 text-xs mr-1">$</span>
            <input
              type="number"
              placeholder="Mín"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              onBlur={() => handlePriceChange(minPrice, maxPrice)}
              className="w-16 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400"
            />
            <span className="text-slate-400 mx-1">—</span>
            <input
              type="number"
              placeholder="Máx"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              onBlur={() => handlePriceChange(minPrice, maxPrice)}
              className="w-16 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-400"
            />
          </div>
          {areFiltersActive && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Category description banner */}
        {selectedCategoryLabel && (
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-[#0A2A66]/8 to-[#2E5FA7]/5 dark:from-[#0A2A66]/25 dark:to-[#2E5FA7]/10 border border-[#0A2A66]/15 dark:border-[#2E5FA7]/20 px-5 py-4">
            <h2 className="font-bold text-base text-[#0A2A66] dark:text-slate-100">{selectedCategoryLabel}</h2>
            {selectedCategoryDescription && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{selectedCategoryDescription}</p>
            )}
          </div>
        )}

        {/* Results bar */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span className="font-black text-slate-900 dark:text-slate-100">{visibleProducts.length}</span>
              {' de '}
              <span className="font-bold">{totalCount}</span>
              {' productos'}
            </p>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A2A66]/10 dark:bg-[#2E5FA7]/20 text-[#0A2A66] dark:text-[#5B9BD5] text-xs font-semibold border border-[#0A2A66]/15 dark:border-[#2E5FA7]/25">
                &ldquo;{searchTerm}&rdquo;
                <button type="button" aria-label="Quitar búsqueda" onClick={() => updateURLParams({ q: '' })}><XMarkIcon className="w-3 h-3 hover:text-red-500" /></button>
              </span>
            )}
            {selectedSize !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A2A66]/10 dark:bg-[#2E5FA7]/20 text-[#0A2A66] dark:text-[#5B9BD5] text-xs font-semibold border border-[#0A2A66]/15 dark:border-[#2E5FA7]/25">
                Medida: {selectedSize}
                <button type="button" aria-label="Quitar medida" onClick={() => updateURLParams({ size: 'all' })}><XMarkIcon className="w-3 h-3 hover:text-red-500" /></button>
              </span>
            )}
            {selectedColor !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A2A66]/10 dark:bg-[#2E5FA7]/20 text-[#0A2A66] dark:text-[#5B9BD5] text-xs font-semibold border border-[#0A2A66]/15 dark:border-[#2E5FA7]/25">
                Comp.: {selectedColor}
                <button type="button" aria-label="Quitar compatibilidad" onClick={() => updateURLParams({ color: 'all' })}><XMarkIcon className="w-3 h-3 hover:text-red-500" /></button>
              </span>
            )}
            {sortBy !== 'relevance' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                {({ 'price-asc': 'Precio ↑', 'price-desc': 'Precio ↓', newest: 'Recientes' } as Record<string, string>)[sortBy] ?? sortBy}
                <button type="button" aria-label="Quitar orden" onClick={() => updateURLParams({ sort: 'relevance' })}><XMarkIcon className="w-3 h-3 hover:text-red-500" /></button>
              </span>
            )}
            {(minPrice || maxPrice) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0A2A66]/10 dark:bg-[#2E5FA7]/20 text-[#0A2A66] dark:text-[#5B9BD5] text-xs font-semibold border border-[#0A2A66]/15 dark:border-[#2E5FA7]/25">
                ${minPrice || '0'}–${maxPrice || '∞'}
                <button type="button" aria-label="Quitar precio" onClick={() => handlePriceChange('', '')}><XMarkIcon className="w-3 h-3 hover:text-red-500" /></button>
              </span>
            )}
            {areFiltersActive && (
              <button onClick={handleResetFilters} className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100 dark:border-red-900/30">
                <ArrowPathIcon className="w-3 h-3" />
                Limpiar todo
              </button>
            )}
          </div>
        )}

        {/* Skeleton — initial load */}
        {loading && products.length === 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse">
                <div className="aspect-square bg-slate-200 dark:bg-slate-700" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spinner — re-fetch with existing products */}
        {loading && products.length > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-3 mb-4">
            <span className="w-4 h-4 border-2 border-[#0A2A66] border-t-transparent rounded-full animate-spin" />
            Actualizando resultados...
          </div>
        )}

        <AnimatePresence mode="wait">
          {visibleProducts.length > 0 ? (
            <>
              <motion.div
                key="product-grid"
                layout
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
              >
                {visibleProducts.map((p, idx) => <ProductCard key={p.id} product={p} idx={idx} />)}
              </motion.div>
              {products.length < totalCount && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    disabled={loadingMore}
                    onClick={() => fetchProductsFromServer(page + 1, true)}
                    className="group flex items-center gap-2 px-8 py-3 rounded-2xl border-2 border-[#0A2A66] dark:border-[#2E5FA7] text-[#0A2A66] dark:text-[#5B9BD5] font-bold text-sm hover:bg-[#0A2A66] hover:text-white dark:hover:bg-[#2E5FA7] dark:hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingMore ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4" />
                        Ver más ({totalCount - products.length} productos)
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-400">{products.length} de {totalCount} productos</p>
                </div>
              )}
            </>
          ) : !loading ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
                <MagnifyingGlassIcon className="w-9 h-9 text-slate-400 dark:text-slate-600" />
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-slate-200">Sin resultados</p>
              <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm text-sm leading-relaxed">
                Prueba cambiando los filtros o el término de búsqueda.
              </p>
              {areFiltersActive && (
                <button
                  onClick={handleResetFilters}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-bold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Limpiar filtros
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* ── Mobile filter drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar filtros"
              className="md:hidden fixed inset-0 z-50 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
            />
            <motion.div
              key="mobile-filters-drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="md:hidden fixed inset-x-0 bottom-0 z-[60] rounded-t-3xl bg-white dark:bg-[#0b0a1f] shadow-2xl border-t border-slate-200 dark:border-slate-800"
            >
              <div className="flex justify-center pt-3">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Filtrar y ordenar</h3>
                <button
                  type="button"
                  aria-label="Cerrar filtros"
                  onClick={() => setShowMobileFilters(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[62vh] overflow-y-auto px-5 py-4 space-y-4">
                <FilterSelect label="Medida" value={selectedSize} onChange={(e) => handleFilterChange('size', e.target.value)} options={uniqueSizes} isMobile />
                <FilterSelect label="Compatibilidad" value={selectedColor} onChange={(e) => handleFilterChange('color', e.target.value)} options={uniqueColors} isMobile />
                <FilterSelect label="Modelo sugerido" value={selectedModel} onChange={(e) => handleFilterChange('model', e.target.value)} options={modelSuggestions} isMobile />
                <FilterSelect
                  label="Ordenar por"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  options={['relevance', 'price-asc', 'price-desc', 'newest']}
                  isMobile
                  formatOptionLabel={(v) =>
                    ({ relevance: 'Relevancia', 'price-asc': 'Menor precio', 'price-desc': 'Mayor precio', newest: 'Más recientes' } as Record<string, string>)[v] ?? v
                  }
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Rango de precio</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Mínimo"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      onBlur={() => handlePriceChange(minPrice, maxPrice)}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#0A2A66] dark:focus:border-[#2E5FA7]"
                    />
                    <input
                      type="number"
                      placeholder="Máximo"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      onBlur={() => handlePriceChange(minPrice, maxPrice)}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#0A2A66] dark:focus:border-[#2E5FA7]"
                    />
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                {areFiltersActive && (
                  <button
                    onClick={handleResetFilters}
                    className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowMobileFilters(false)}
                  className={`${areFiltersActive ? 'flex-1' : 'w-full'} py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white text-sm font-bold shadow-lg`}
                >
                  Ver {visibleProducts.length} productos
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    <FloatingCombos />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, isMobile = false, formatOptionLabel }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: string[]; isMobile?: boolean; formatOptionLabel?: (value: string) => string }) {
  const baseClasses = "w-full text-sm border focus:ring-2 focus:ring-[#0A2A66] outline-none";
  const desktopClasses = "sm:w-auto pl-4 pr-10 py-3 rounded-xl bg-white/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 appearance-none";
  const mobileClasses = "p-3 rounded-lg bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
  const styles = `${baseClasses} ${isMobile ? mobileClasses : desktopClasses}`;

  return (
    <div className="relative">
      <select aria-label={label} value={value} onChange={onChange} className={styles}>
        <option value="all">{label}</option>
        {options.map((o) => <option key={o} value={o}>{formatOptionLabel ? formatOptionLabel(o) : o}</option>)}
      </select>
      {!isMobile && <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
    </div>
  );
}
