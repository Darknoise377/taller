export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#070617]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <span className="text-slate-300">/</span>
          <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <span className="text-slate-300">/</span>
          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          {/* Image gallery skeleton */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="hidden md:flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-20 h-20 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
            <div className="w-full aspect-square rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>

          {/* Product info skeleton */}
          <div className="space-y-6 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="h-10 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="h-10 w-1/3 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
              <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-16 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-14 w-full rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
