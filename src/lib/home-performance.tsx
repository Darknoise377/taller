/**
 * Performance utilities for the Home page.
 * - Preload hints for critical resources
 * - Image priority configuration
 * - Prefetch strategies
 */

/**
 * URLs that should be prefetched when the home page loads.
 * These are the most likely next navigations from the home.
 */
export const PREFETCH_ROUTES = [
  '/products',
  '/products/category/frenos',
  '/products/category/llantas',
  '/products/category/cilindros',
] as const;

/**
 * Skeleton component for product cards (lightweight placeholder).
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-200 dark:bg-slate-800" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton grid for loading states.
 */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Intersection Observer options optimized for different scenarios.
 */
export const OBSERVER_OPTIONS = {
  /** For lazy loading images - load slightly before visible */
  images: { rootMargin: '200px 0px', threshold: 0 },
  /** For infinite scroll - trigger when sentinel is near */
  infiniteScroll: { rootMargin: '400px 0px', threshold: 0.1 },
  /** For animations - trigger when element enters viewport */
  animations: { rootMargin: '-50px 0px', threshold: 0.2 },
} as const;

/**
 * Debounce utility for scroll handlers.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
