export default function ProductsLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Filter bar skeleton */}
      <div className="hidden md:block mb-12 p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-12 flex-grow min-w-[250px] rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-12 w-40 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-12 w-36 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="h-12 w-36 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>

      {/* Mobile search skeleton */}
      <div className="md:hidden mb-6">
        <div className="h-11 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Image skeleton */}
            <div className="aspect-square bg-slate-200 dark:bg-slate-800 animate-pulse" />
            {/* Content skeleton */}
            <div className="p-4 space-y-3">
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-8 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-10 w-full rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
