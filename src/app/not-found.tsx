import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Página No Encontrada | Taller A&R",
  description: "La página que buscas no existe. Explora nuestro catálogo de repuestos y accesorios para motos.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-[#07122E]">
      {/* Large 404 with brand overlay */}
      <div className="relative mb-8 select-none">
        <span className="text-[9rem] md:text-[13rem] font-black leading-none text-slate-100 dark:text-[#0A2A66]">
          404
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#2E5FA7] to-[#5B9BD5] bg-clip-text text-transparent">
          ¡Ups!
        </span>
      </div>

      {/* Moto icon */}
      <div className="mb-4 text-5xl" aria-hidden="true">🏍️</div>

      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
        Página no encontrada
      </h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
        Parece que esta ruta no existe o fue cambiada. Vuelve al inicio o explora nuestro catálogo de repuestos.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="px-6 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#0A2A66] to-[#2E5FA7] hover:opacity-90 transition-opacity shadow-lg"
        >
          Volver al Inicio
        </Link>
        <Link
          href="/products"
          className="px-6 py-3 text-sm font-semibold text-[#0A2A66] dark:text-slate-200 bg-slate-100 dark:bg-[#0A2A66]/40 rounded-xl hover:bg-slate-200 dark:hover:bg-[#0A2A66]/60 transition-colors border border-slate-200 dark:border-[#0A2A66]"
        >
          Ver Catálogo
        </Link>
      </div>
    </div>
  );
}
