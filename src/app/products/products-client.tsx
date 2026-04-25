"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

import type { Product as ProductType, ProductSize } from "@/types/product";
import {
  getProductCategoryDescription,
  getProductCategoryLabel,
} from "@/constants/productCategories";
import { ProductCard } from '../../components/ProductCard';

type ProductsClientProps = {
  initialProducts: ProductType[];
  totalCount?: number;
};

export default function ProductsClient({ initialProducts, totalCount: initialTotal }: ProductsClientProps) {
  const [products, setProducts] = useState<ProductType[]>(initialProducts ?? []);
  const [totalCount, setTotalCount] = useState<number>(initialTotal ?? initialProducts?.length ?? 0);
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [pathname, setPathname] = useState<string>("");
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSize, setSelectedSize] = useState<string>("all");
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  // Ordenamiento + precio + paginación en servidor
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);
      const params = new URLSearchParams(window.location.search);
      setSearchTerm(params.get("q") || "");
      setSelectedCategory(params.get("category") || "all");
      setSelectedSize(params.get("size") || "all");
      setSelectedColor(params.get("color") || "all");
      setSelectedModel(params.get("model") || "all");
      setSortBy(params.get("sort") || "relevance");
      setMinPrice(params.get("minPrice") || "");
      setMaxPrice(params.get("maxPrice") || "");
    }
  }, []);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).filter(Boolean),
    [products]
  );
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
        if (searchTerm) params.set('q', searchTerm);
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
        const items: ProductType[] = (data.items || []).map((it: any) => ({
          ...it,
          createdAt: it.createdAt ?? undefined,
          updatedAt: it.updatedAt ?? undefined,
        }));

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
    [searchTerm, selectedCategory, selectedSize, selectedColor, sortBy, minPrice, maxPrice]
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
    const q = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !q || product.name.toLowerCase().includes(q) || (product.description ?? "").toLowerCase().includes(q);
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesSize = selectedSize === "all" || (product.sizes?.includes(selectedSize as ProductSize) ?? false);
      const matchesColor = selectedColor === "all" || (product.colors?.includes(selectedColor as ProductSize) ?? false);
      const matchesModel = selectedModel === 'all' || product.name.toLowerCase().includes(selectedModel) || (product.description ?? "").toLowerCase().includes(selectedModel);
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
  }, [fetchProductsFromServer, areFiltersActive]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {selectedCategoryLabel && (
        <div className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Categoria activa</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{selectedCategoryLabel}</h2>
          {selectedCategoryDescription && <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{selectedCategoryDescription}</p>}
        </div>
      )}

      {/* Filtros Desktop */}
      <div className="hidden md:block sticky top-24 z-20 mb-12 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-grow min-w-[250px]">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input placeholder="Buscar producto..." value={searchTerm} onChange={handleSearchChange} className="w-full text-sm pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#0A2A66]" />
          </div>
          <FilterSelect label="Categorías" value={selectedCategory} onChange={(e) => handleFilterChange("category", e.target.value)} options={uniqueCategories} formatOptionLabel={getProductCategoryLabel} />
          <FilterSelect label="Medidas" value={selectedSize} onChange={(e) => handleFilterChange("size", e.target.value)} options={uniqueSizes} />
          <FilterSelect label="Compatibilidad" value={selectedColor} onChange={(e) => handleFilterChange("color", e.target.value)} options={uniqueColors} />
          <FilterSelect label="Modelo (sugerido)" value={selectedModel} onChange={(e) => handleFilterChange('model', e.target.value)} options={modelSuggestions} />
          <FilterSelect label="Ordenar" value={sortBy} onChange={(e) => handleSortChange(e.target.value)} options={['relevance','price-asc','price-desc','newest']} formatOptionLabel={(v)=> ({relevance:'Relevancia', 'price-asc':'Precio: menor a mayor','price-desc':'Precio: mayor a menor','newest':'Recientes'} as any)[v] || v} />
          <div className="flex items-center gap-2">
            <input type="number" placeholder="Mín" value={minPrice} onChange={(e)=>{ setMinPrice(e.target.value); }} onBlur={()=>handlePriceChange(minPrice, maxPrice)} className="w-20 text-sm pl-2 pr-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50" />
            <input type="number" placeholder="Máx" value={maxPrice} onChange={(e)=>{ setMaxPrice(e.target.value); }} onBlur={()=>handlePriceChange(minPrice, maxPrice)} className="w-20 text-sm pl-2 pr-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50" />
          </div>
          {areFiltersActive && <button onClick={handleResetFilters} className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"><ArrowPathIcon className="w-4 h-4" /> Limpiar</button>}
        </div>
      </div>

      {/* Filtros Móviles */}
      <div className="md:hidden mb-6 sticky top-[70px] z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input placeholder="Buscar producto..." value={searchTerm} onChange={handleSearchChange} className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-[#0A2A66] outline-none" />
          </div>
        </div>

        <button onClick={() => setShowMobileFilters(!showMobileFilters)} className="w-full flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-[#0A2A66]" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">{areFiltersActive ? "Filtros Aplicados" : "Filtrar y Ordenar"}</span>
          </div>
          <motion.div animate={{ rotate: showMobileFilters ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDownIcon className="w-5 h-5 text-slate-500" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showMobileFilters && (
            <motion.div key="mobile-filters-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
              <div className="p-4 grid grid-cols-1 gap-3 border-t border-slate-200 dark:border-slate-800">
                <FilterSelect label="Categoría" value={selectedCategory} onChange={(e) => handleFilterChange("category", e.target.value)} options={uniqueCategories} isMobile formatOptionLabel={getProductCategoryLabel} />
                <FilterSelect label="Medida" value={selectedSize} onChange={(e) => handleFilterChange("size", e.target.value)} options={uniqueSizes} isMobile />
                <FilterSelect label="Compatibilidad" value={selectedColor} onChange={(e) => handleFilterChange("color", e.target.value)} options={uniqueColors} isMobile />
                <FilterSelect label="Modelo (sugerido)" value={selectedModel} onChange={(e) => handleFilterChange('model', e.target.value)} options={modelSuggestions} isMobile />
                <div className="flex gap-2">
                  <input type="number" placeholder="Mín" value={minPrice} onChange={(e)=>setMinPrice(e.target.value)} onBlur={()=>handlePriceChange(minPrice, maxPrice)} className="w-1/2 p-3 rounded-lg border" />
                  <input type="number" placeholder="Máx" value={maxPrice} onChange={(e)=>setMaxPrice(e.target.value)} onBlur={()=>handlePriceChange(minPrice, maxPrice)} className="w-1/2 p-3 rounded-lg border" />
                </div>
                <FilterSelect label="Ordenar" value={sortBy} onChange={(e) => handleSortChange(e.target.value)} options={['relevance','price-asc','price-desc','newest']} isMobile formatOptionLabel={(v)=> ({relevance:'Relevancia', 'price-asc':'Precio: menor a mayor','price-desc':'Precio: mayor a menor','newest':'Recientes'} as any)[v] || v} />
                {areFiltersActive && <button onClick={handleResetFilters} className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 font-semibold"><ArrowPathIcon className="w-5 h-5" /> Limpiar filtros</button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {visibleProducts.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">Mostrando {products.length} de {totalCount} productos</div>
              <div className="text-sm text-slate-500">&nbsp;</div>
            </div>
            <motion.div key="product-grid" layout className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {visibleProducts.map((p, idx) => <ProductCard key={p.id} product={p} idx={idx} />)}
            </motion.div>
            {products.length < totalCount && (
              <div className="mt-6 flex justify-center">
                <button disabled={loadingMore} onClick={() => fetchProductsFromServer(page + 1, true)} className="px-5 py-3 rounded-xl bg-[#0A2A66] text-white font-semibold hover:opacity-90">{loadingMore ? 'Cargando...' : 'Cargar más'}</button>
              </div>
            )}
          </>
        ) : (
          <motion.div key="no-products-message" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="col-span-full flex flex-col items-center justify-center text-center py-20">
            <MagnifyingGlassIcon className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">No se encontraron productos</p>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">Prueba cambiando los filtros o la búsqueda para encontrar lo que necesitas</p>
            {areFiltersActive && <button onClick={handleResetFilters} className="mt-6 px-5 py-3 rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] text-white font-semibold flex items-center gap-2 mx-auto hover:opacity-90 transition-opacity"><ArrowPathIcon className="w-5 h-5" /> Limpiar filtros</button>}
          </motion.div>
        )}
      </AnimatePresence>
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
