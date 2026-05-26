"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ComboCard from "@/components/ComboCard";
import type { Combo } from "@/types/combo";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/combos")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCombos(data);
        else setError("No se pudieron cargar los combos.");
      })
      .catch(() => setError("Error de conexión."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-purple-600 py-16 px-4 text-white text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="inline-block bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            🎁 Combos y Ofertas Especiales
          </span>
          <h1 className="text-4xl md:text-5xl font-black mb-3 leading-tight">
            Combos con Regalo Sorpresa
          </h1>
          <p className="text-blue-100 text-lg max-w-xl mx-auto">
            Ahorra más comprando en combo. Cada combo incluye un regalo sorpresa que descubrirás al completar tu pedido.
          </p>
        </motion.div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-96 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-20 text-slate-500">
            <MagnifyingGlassIcon className="w-12 h-12" />
            <p className="text-lg">{error}</p>
          </div>
        )}

        {!loading && !error && combos.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-slate-500">
            <span className="text-6xl">🎁</span>
            <p className="text-xl font-semibold">Próximamente nuevos combos</p>
            <p className="text-slate-400">Estamos preparando ofertas increíbles para ti.</p>
          </div>
        )}

        {!loading && !error && combos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {combos.map((combo, idx) => (
              <ComboCard key={combo.id} combo={combo} idx={idx} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
