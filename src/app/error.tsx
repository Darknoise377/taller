"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console in dev; in prod you'd send to Sentry/similar
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-[#07122E]">
      {/* Large icon */}
      <div className="relative mb-8 select-none">
        <span className="text-[9rem] md:text-[13rem] font-black leading-none text-slate-100 dark:text-[#0A2A66]">
          500
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#2E5FA7] to-[#5B9BD5] bg-clip-text text-transparent">
          Error
        </span>
      </div>

      <div className="mb-4 text-5xl" aria-hidden="true">⚙️</div>

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
        Algo salió mal
      </h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-2 leading-relaxed">
        Ocurrió un error inesperado. Puedes intentar de nuevo o volver al inicio.
      </p>

      {/* Show digest in prod (safe), full message only in dev */}
      {(error.digest || process.env.NODE_ENV === "development") && (
        <p className="text-xs text-slate-400 dark:text-slate-600 mb-8 font-mono">
          {process.env.NODE_ENV === "development" ? error.message : `Código: ${error.digest}`}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-4">
        <button
          onClick={reset}
          className="px-6 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:opacity-90 transition-opacity shadow-lg"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="px-6 py-3 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0b0a1f] transition-colors"
        >
          Volver al Inicio
        </Link>
        <Link
          href="/products"
          className="px-6 py-3 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0b0a1f] transition-colors"
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  );
}
